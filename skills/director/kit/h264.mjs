// H.264 bitstream surgery: put frames that repeat the previous one into an Annex B stream without encoding them.
// The encoder only gets the frames that change. holds(stream, gaps) adds, after encoded frame j, gaps[j] pictures
// made of one P slice in which every macroblock is skipped ("same as the previous picture", about 10 bytes), and
// renumbers the pictures that follow. The result is an ordinary constant-frame-rate stream.
// Needs: progressive frames, one reference frame, no B-frames, picture order count type 0 or 2, CAVLC.
class Bits { // reader over an RBSP (emulation prevention already removed)
  constructor(b) { this.b = b; this.p = 0; }
  u(n) { let v = 0; for (let i = 0; i < n; i++, this.p++) v = v * 2 + ((this.b[this.p >> 3] >> (7 - (this.p & 7))) & 1); return v; }
  ue() { let z = 0; while (!this.u(1)) z++; return (2 ** z) - 1 + this.u(z); }
  se() { const k = this.ue(); return k & 1 ? (k + 1) / 2 : -k / 2; }
}
class Out { // bit writer
  constructor() { this.a = []; this.cur = 0; this.n = 0; }
  u(n, v) { for (let i = n - 1; i >= 0; i--) { this.cur = (this.cur << 1) | (Math.floor(v / 2 ** i) & 1); if (++this.n === 8) { this.a.push(this.cur); this.cur = 0; this.n = 0; } } }
  ue(v) { const x = v + 1, len = Math.floor(Math.log2(x)); this.u(len, 0); this.u(len + 1, x); }
  se(v) { this.ue(v > 0 ? 2 * v - 1 : -2 * v); }
  align(bit) { while (this.n) this.u(1, bit); }
}
const unescape = b => { const o = []; for (let i = 0; i < b.length; i++) { if (i >= 2 && b[i] === 3 && !b[i - 1] && !b[i - 2]) continue; o.push(b[i]); } return Buffer.from(o); };
const escape = b => { const o = []; let z = 0; for (const x of b) { if (z >= 2 && x <= 3) { o.push(3); z = 0; } o.push(x); z = x ? 0 : z + 1; } return Buffer.from(o); };

function parseSps(rbsp) {
  const r = new Bits(rbsp), s = { profile: r.u(8) }; r.u(16); s.id = r.ue(); s.chroma = 1; s.separate = 0;
  if ([100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135].includes(s.profile)) {
    s.chroma = r.ue(); if (s.chroma === 3) s.separate = r.u(1); r.ue(); r.ue(); r.u(1);
    if (r.u(1)) throw new Error('scaling matrices in the SPS are not supported');
  }
  s.frameNumBits = r.ue() + 4; s.pocType = r.ue();
  if (s.pocType === 0) s.pocBits = r.ue() + 4; else if (s.pocType === 1) throw new Error('picture order count type 1 is not supported');
  s.refs = r.ue(); r.u(1); s.mbs = (r.ue() + 1) * (r.ue() + 1); s.frameOnly = r.u(1);
  return s;
}
function parsePps(rbsp) {
  const r = new Bits(rbsp), p = { id: r.ue(), sps: r.ue(), cabac: r.u(1), bottomPoc: r.u(1), groups: r.ue() };
  p.refL0 = r.ue() + 1; r.ue(); p.weighted = r.u(1); r.u(2); p.qp = 26 + r.se(); r.se(); r.se(); p.deblockCtl = r.u(1); r.u(1); p.redundant = r.u(1);
  return p;
}
// One picture that repeats the previous one: a P slice with every macroblock skipped.
function skipSlice(sps, pps, idx) {
  const o = new Out();
  o.ue(0); o.ue(5); o.ue(pps.id); o.u(sps.frameNumBits, idx % 2 ** sps.frameNumBits);
  if (sps.pocType === 0) o.u(sps.pocBits, (2 * idx) % 2 ** sps.pocBits);
  o.u(1, 0); o.u(1, 0); // default reference count, default reference order
  if (pps.weighted) { o.ue(0); if (sps.chroma) o.ue(0); for (let i = 0; i < pps.refL0; i++) { o.u(1, 0); if (sps.chroma) o.u(1, 0); } }
  o.u(1, 0); // sliding-window reference marking
  if (pps.cabac) o.ue(0);
  o.se(0); if (pps.deblockCtl) o.ue(1);
  if (pps.cabac) throw new Error('CABAC streams are not supported');
  o.ue(sps.mbs); o.u(1, 1); o.align(0);
  return Buffer.concat([Buffer.from([0, 0, 0, 1, 0x41]), escape(o.a)]);
}
// stream: Annex B from the encoder, one picture per frame it was given. gaps[j]: pictures to add after picture j.
// Pictures after the first gaps.length are dropped.
export function holds(stream, gaps) {
  const parts = [], SC = Buffer.from([0, 0, 1]); let sps = null, pps = null, idx = 0, pic = -1, pend = 0, made = null;
  const flush = () => { for (; pend > 0; pend--) parts.push(skipSlice(sps, pps, ++idx)); };
  let at = stream.indexOf(SC);
  while (at >= 0) {
    let next = stream.indexOf(SC, at + 3); const end = next < 0 ? stream.length : (stream[next - 1] === 0 ? next - 1 : next);
    const start = at > 0 && stream[at - 1] === 0 ? at - 1 : at, h = at + 3, type = stream[h] & 31;
    if (type === 7) sps = parseSps(unescape(stream.subarray(h + 1, end)));
    else if (type === 8) pps = parsePps(unescape(stream.subarray(h + 1, end)));
    if (type === 1 || type === 5) {
      if (!sps.frameOnly || sps.refs > 1 || pps.groups || pps.redundant || pps.bottomPoc || sps.separate) throw new Error('this H.264 stream layout is not supported for held frames');
      // the header fields sit in the first bytes; unescape a prefix that ends well past them
      let raw = h + 1, z = 0; const pre = [];
      while (raw < end && pre.length < 12) { const x = stream[raw++]; if (z >= 2 && x === 3) { z = 0; continue; } pre.push(x); z = x ? 0 : z + 1; }
      const r = new Bits(pre), first = r.ue(), st = r.ue(); r.ue();
      if (first === 0) { flush(); if (++pic >= gaps.length) break; idx = type === 5 ? 0 : idx + 1; pend = gaps[pic]; }
      if (type === 1) {
        if (st % 5 !== 0) throw new Error('only I and P pictures are supported for held frames');
        const set = (pos, bits, v) => { for (let i = 0; i < bits; i++) { const p = pos + i, bit = Math.floor(v / 2 ** (bits - 1 - i)) & 1; pre[p >> 3] = (pre[p >> 3] & ~(0x80 >> (p & 7))) | (bit ? 0x80 >> (p & 7) : 0); } };
        set(r.p, sps.frameNumBits, idx % 2 ** sps.frameNumBits);
        if (sps.pocType === 0) set(r.p + sps.frameNumBits, sps.pocBits, (2 * idx) % 2 ** sps.pocBits);
        if (r.p + sps.frameNumBits + (sps.pocBits ?? 0) > 80) throw new Error('slice header too long');
        // re-escape the prefix; its last two bytes are untouched, so the rest of the unit stays valid as it is
        parts.push(stream.subarray(start, h + 1), escape(pre), stream.subarray(raw, end));
      } else parts.push(stream.subarray(start, end));
    } else { if (pic >= 0 && pend) flush(); parts.push(stream.subarray(start, end)); }
    at = next;
  }
  flush();
  if (pic < gaps.length - 1) throw new Error(`the encoder returned ${pic + 1} pictures for ${gaps.length} frames`);
  return Buffer.concat(parts);
}
