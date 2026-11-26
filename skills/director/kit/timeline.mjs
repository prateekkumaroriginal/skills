// A seekable timeline with Motion's sequence semantics, for plain objects in Node.
// Segment: [target, { prop: value | [keyframes] }, { at, duration, ease, times }].
// Mirrors Motion 14's createAnimationsFromSequence: each segment erases the target-prop's keyframes strictly inside
// its own time range, adds its own, and the merged track is sorted by time; between neighbouring keyframes the value
// is interpolated with the earlier keyframe's easing (also across gaps between segments). null keyframes take the
// previous keyframe's value (the target's initial value at the start). Easing and interpolation come from Motion.
globalThis.NodeList ??= class {}; globalThis.Element ??= class {};
const M = await import('motion');

const EASE = { linear: x => x, easeIn: M.easeIn, easeOut: M.easeOut, easeInOut: M.easeInOut, backOut: M.backOut, backIn: M.backIn, backInOut: M.backInOut, circIn: M.circIn, circOut: M.circOut, circInOut: M.circInOut, anticipate: M.anticipate };
const easeFn = e => typeof e === 'function' ? e : Array.isArray(e) && typeof e[0] === 'number' ? M.cubicBezier(...e) : EASE[e] || (() => { throw new Error('unknown ease ' + e); })();
const isEaseList = e => Array.isArray(e) && typeof e[0] !== 'number';
const segEase = (e, i) => isEaseList(e) ? e[((i % e.length) + e.length) % e.length] : e;

// Returns { seek(t), spans, duration }. spans are [start, end] intervals in which some value changes;
// outside them every frame equals the one before, which the renderer reuses.
export function timeline(seq) {
  const tracks = new Map(); // target -> prop -> { init, kfs: [{ at, value, ease }] }
  const spans = [];
  for (const [target, kf, o] of seq) {
    if (o.repeat || o.repeatDelay) throw new Error('repeat is not supported by the canvas timeline: write the repeats as keyframes');
    if (typeof o.at !== 'number') throw new Error('every segment needs a numeric at');
    const d = o.duration ?? 0.3, start = o.at + (o.delay || 0), end = start + d, ease = o.ease ?? 'easeInOut';
    spans.push([start, end]);
    for (const [prop, v] of Object.entries(kf)) {
      const frames = Array.isArray(v) ? (v.length === 1 ? [null, v[0]] : v) : [null, v];
      const times = o.times ?? frames.map((_, i) => i / (frames.length - 1));
      if (!tracks.has(target)) tracks.set(target, new Map());
      const props = tracks.get(target);
      if (!props.has(prop)) props.set(prop, { init: target[prop], kfs: [] });
      const tr = props.get(prop);
      tr.kfs = tr.kfs.filter(k => !(k.at > start && k.at < end));
      frames.forEach((value, i) => tr.kfs.push({ value, at: start + (end - start) * times[i], ease: segEase(ease, i) }));
    }
  }
  for (const props of tracks.values()) for (const tr of props.values()) {
    const k = tr.kfs.map((x, i) => ({ ...x, i }));
    k.sort((a, b) => a.at - b.at || (a.value === null ? 1 : b.value === null ? -1 : 0) || a.i - b.i);
    let prev = tr.init;
    for (const x of k) { if (x.value === null) x.value = prev; prev = x.value; x.fn = easeFn(x.ease); }
    for (let i = 0; i < k.length - 1; i++) k[i].mix = k[i].value === k[i + 1].value ? null : M.mix(k[i].value, k[i + 1].value);
    tr.kfs = k;
    // a value also drifts between segments when one ends where the next doesn't start
    for (let i = 0; i < k.length - 1; i++) if (k[i].mix) spans.push([k[i].at, k[i + 1].at]);
  }
  // Seek: write every animated property's value at time t into its target.
  // dirty (a Map), when given, collects the targets whose value changed: target -> its opacity before, if that changed.
  function seek(t, dirty) {
    for (const [target, props] of tracks) for (const [prop, tr] of props) {
      const k = tr.kfs; let v;
      if (t <= k[0].at) v = k[0].value;
      else if (t >= k[k.length - 1].at) v = k[k.length - 1].value;
      else {
        let lo = 0, hi = k.length - 1; // last keyframe with at <= t
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (k[m].at <= t) lo = m; else hi = m; }
        const a = k[lo], b = k[lo + 1], span = b.at - a.at;
        v = !a.mix || span <= 0 ? (span <= 0 ? b.value : a.value) : a.mix(a.fn((t - a.at) / span));
      }
      if (target[prop] !== v) {
        if (dirty) { if (prop === 'opacity') dirty.set(target, target.opacity); else if (!dirty.has(target)) dirty.set(target, undefined); }
        target[prop] = v;
      }
    }
  }
  return { seek, spans, duration: Math.max(0, ...spans.map(s => s[1])) };
}
