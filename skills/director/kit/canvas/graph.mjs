// A small retained scene graph drawn with Skia (@napi-rs/canvas): the canvas counterpart of index.html.
// Nodes have the same props Motion animates in the HTML kit (x, y, scale, scaleY, rotate, opacity) plus left/top,
// and children are positioned inside their parent. Built-in kinds: group, box, text, icon, path, dot, image.
// Add the video's own elements with kind(name, { box, paint }); see README.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, Path2D, Image } from '@napi-rs/canvas';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); // project folder
export const TIMING = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio/timing.json'), 'utf8'));
export const W = 1920, H = 1080;

// ---------- fonts and text ----------
// Register a font file from assets/fonts under a family name, one call per weight.
export function font(family, weight, file) {
  const f = path.join(ROOT, 'assets/fonts', file);
  if (!fs.existsSync(f)) throw new Error('font not found: ' + f);
  GlobalFonts.registerFromPath(f, family);
}
let FALLBACK = ''; // families tried for glyphs the font lacks, such as ✕ or ✓
export const fallbackFonts = (...fams) => { FALLBACK = fams.map(f => `, "${f}"`).join(''); };
export const fontStr = (size, weight = 400, family = 'Body') => `${weight} ${size}px ${family}${FALLBACK}`;
const mctx = createCanvas(4, 4).getContext('2d');
const metricCache = new Map();
function metrics(family, weight) {
  const k = family + weight; if (metricCache.has(k)) return metricCache.get(k);
  mctx.font = `${weight} 100px ${family}`; const m = mctx.measureText('Hg');
  const r = { asc: m.fontBoundingBoxAscent / 100, desc: m.fontBoundingBoxDescent / 100 }; metricCache.set(k, r); return r;
}
// CSS line-height: normal for this font, in px
export const lineHeight = (size, weight = 400, family = 'Body') => { const m = metrics(family, weight); return (m.asc + m.desc) * size; };
export const measure = (s, size, weight = 400, family = 'Body') => { mctx.font = fontStr(size, weight, family); return mctx.measureText(String(s)).width; };
// Draw text with its line box centred vertically on cy (as CSS centres a single line).
export function txt(ctx, s, x, cy, size, weight = 400, family = 'Body', color = '#fff', align = 'left') {
  const m = metrics(family, weight);
  ctx.font = fontStr(size, weight, family); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(s), x, cy - (m.asc + m.desc) * size / 2 + m.asc * size);
}

// ---------- icons (src/icons.js from build_icons.mjs) ----------
const iconsFile = path.join(ROOT, 'src/icons.js');
const ICONS = fs.existsSync(iconsFile) ? new Function(fs.readFileSync(iconsFile, 'utf8') + ';return ICONS')() : {};
const iconCache = new Map();
function iconPaths(name) {
  if (iconCache.has(name)) return iconCache.get(name);
  if (!ICONS[name]) throw new Error('icon not in icons.js: ' + name);
  const out = [];
  for (const m of ICONS[name].matchAll(/<(\w+)([^>]*)\/>/g)) {
    const a = Object.fromEntries([...m[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(x => [x[1], x[2]]));
    const p = new Path2D();
    if (m[1] === 'path') p.addPath(new Path2D(a.d));
    else if (m[1] === 'circle') p.arc(+a.cx, +a.cy, +a.r, 0, Math.PI * 2);
    else if (m[1] === 'ellipse') p.ellipse(+a.cx, +a.cy, +a.rx, +a.ry, 0, 0, Math.PI * 2);
    else if (m[1] === 'rect') p.roundRect(+(a.x || 0), +(a.y || 0), +a.width, +a.height, +(a.rx || 0));
    else if (m[1] === 'line') { p.moveTo(+a.x1, +a.y1); p.lineTo(+a.x2, +a.y2); }
    else if (m[1] === 'polyline' || m[1] === 'polygon') { const n = a.points.trim().split(/[\s,]+/).map(Number); p.moveTo(n[0], n[1]); for (let i = 2; i < n.length; i += 2) p.lineTo(n[i], n[i + 1]); if (m[1] === 'polygon') p.closePath(); }
    out.push(p);
  }
  iconCache.set(name, out); return out;
}
// Stroke a 24-unit icon at (x, y), size px square (the .ico style: stroke 2.2, round caps and joins).
export function icon(ctx, name, x, y, size, color, lineWidth = 2.2) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const p of iconPaths(name)) ctx.stroke(p);
  ctx.restore();
}

// ---------- painting helpers for custom kinds ----------
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
// Fill a rounded box and stroke its border inside the box (CSS box-sizing: border-box).
export function fillStroke(ctx, w, h, r, fill, bw = 0, border = null, dashed = false) {
  if (fill) { rr(ctx, 0, 0, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  if (bw && border) {
    const rin = Array.isArray(r) ? r.map(v => Math.max(0, v - bw / 2)) : Math.max(0, r - bw / 2);
    rr(ctx, bw / 2, bw / 2, w - bw, h - bw, rin); ctx.strokeStyle = border; ctx.lineWidth = bw;
    if (dashed) ctx.setLineDash([bw * 3, bw * 2]); ctx.stroke(); if (dashed) ctx.setLineDash([]);
  }
}
// box-shadow: 0 0 0 s color (a ring outside the box)
export function spreadRing(ctx, w, h, r, s, color) { rr(ctx, -s / 2, -s / 2, w + s, h + s, r + s / 2); ctx.strokeStyle = color; ctx.lineWidth = s; ctx.stroke(); }
// box-shadow: 0 0 blur color. Canvas shadows are in device space, so offset and blur follow the current transform.
export function glow(ctx, w, h, r, blur, color) {
  const m = ctx.getTransform();
  ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur * Math.hypot(m.a, m.b); ctx.shadowOffsetX = 20000 * m.a; ctx.shadowOffsetY = 20000 * m.b;
  rr(ctx, -20000, 0, w, h, r); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
}
// box-shadow: dx dy blur color, blurred once per box size and reused as a sprite (blurs are the slowest thing to draw).
const shadowCache = new Map();
export function dropShadow(ctx, w, h, r, { x = 0, y = 0, blur = 0, color = 'rgba(0,0,0,.5)' }) {
  const k = `${w}x${h}x${JSON.stringify(r)}x${blur}x${color}`; let sp = shadowCache.get(k);
  const pad = Math.ceil(blur * 1.5) + 2;
  if (!sp) {
    sp = createCanvas(Math.ceil(w + 2 * pad), Math.ceil(h + 2 * pad)); const c = sp.getContext('2d');
    c.shadowColor = color; c.shadowBlur = blur; c.shadowOffsetX = 20000;
    rr(c, pad - 20000, pad, w, h, r); c.fillStyle = '#000'; c.fill(); shadowCache.set(k, sp);
  }
  ctx.drawImage(sp, -pad + x, -pad + y);
}
// Pre-rendered static background (gradients, dot grids): draw(ctx) runs once.
export function background(draw) { const c = createCanvas(W, H); draw(c.getContext('2d')); return c; }
export function image(file) { const img = new Image(); img.src = fs.readFileSync(path.join(ROOT, 'assets', file)); return img; }

// ---------- nodes ----------
let NOW = 0;
export class N {
  constructor(kind, parent, left = 0, top = 0, o = {}) {
    if (!KINDS[kind]) throw new Error('unknown kind ' + kind);
    Object.assign(this, { kind, left, top, x: 0, y: 0, scale: 1, scaleY: 1, rotate: 0, opacity: 1, ox: 0.5, oy: 0.5, z: 0, children: [], parent }, o);
    if (parent) parent.children.push(this);
  }
  // Text that changes over time: each source is { mv, fmt, start }; the most recently started one writes the text.
  textFrom(mv, fmt, start) { (this.texts ??= []).push({ mv, fmt, start }); return this; }
  get text() {
    if (!this.texts) return this._text ?? '';
    let best = null; for (const s of this.texts) if (s.start <= NOW + 1e-9 && (!best || s.start >= best.start)) best = s;
    best ??= this.texts[0]; return best.fmt(best.mv.v);
  }
  set text(v) { this._text = v; }
  // laid-out size, for placing other nodes against this one (e.g. right-aligning a bubble)
  size() { return KINDS[this.kind].box(this); }
}
// Kind definition: box(n) -> { w, h } (also the transform-origin box), paint(ctx, n, w, h) in local coordinates,
// optional inset(n) (children's offset, like a CSS border), clip(ctx, n, w, h) (path to clip children to),
// after(ctx, n, w, h) (painted over the children) and ax(n, w) (how far left of `left` the box starts, for centred text).
const KINDS = {};
export const kind = (name, def) => { KINDS[name] = def; };
export const node = (kindName, parent, left, top, o) => new N(kindName, parent, left, top, o);

kind('group', { box: n => ({ w: n.w ?? 0, h: n.h ?? 0 }) });
// box: w, h, radius (number or [tl, tr, br, bl]), fill, borderWidth, borderColor, dashed,
// shadow { x, y, blur, color }, glow { blur, color }, clip (children clipped to the box)
kind('box', {
  box: n => ({ w: n.w, h: n.h }),
  inset: n => n.borderWidth ?? 0,
  paint(ctx, n, w, h) {
    const r = n.radius ?? 0;
    if (n.shadow) dropShadow(ctx, w, h, r, n.shadow);
    if (n.glow) glow(ctx, w, h, typeof r === 'number' ? r : r[0], n.glow.blur, n.glow.color);
    fillStroke(ctx, w, h, r, n.fill, n.borderWidth ?? 0, n.borderColor, n.dashed);
  },
  clip(ctx, n, w, h) { if (!n.clip) return false; const b = n.borderWidth ?? 0, r = n.radius ?? 0; rr(ctx, b, b, w - 2 * b, h - 2 * b, typeof r === 'number' ? Math.max(0, r - b) : r); return true; },
});
// text: text, size, weight, family, color, align ('left' | 'center' | 'right': where `left` sits on the line)
kind('text', {
  box: n => ({ w: measure(n.text, n.size ?? 32, n.weight ?? 400, n.family ?? 'Body'), h: lineHeight(n.size ?? 32, n.weight ?? 400, n.family ?? 'Body') }),
  ax: (n, w) => ({ center: w / 2, right: w })[n.align] ?? 0,
  paint(ctx, n, w, h) { txt(ctx, n.text, 0, h / 2, n.size ?? 32, n.weight ?? 400, n.family ?? 'Body', n.color ?? '#fff'); },
});
// icon: icon (name in icons.js), size, color, lineWidth
kind('icon', { box: n => ({ w: n.size ?? 32, h: n.size ?? 32 }), paint(ctx, n, w) { icon(ctx, n.icon, 0, 0, w, n.color ?? '#fff', n.lineWidth); } });
// image: img (from image('file.png')), w, h
kind('image', { box: n => ({ w: n.w ?? n.img.width, h: n.h ?? n.img.height }), paint(ctx, n, w, h) { ctx.drawImage(n.img, 0, 0, w, h); } });
// dot: cx, cy, r, color. Move it with x/y.
kind('dot', { box: () => ({ w: 0, h: 0 }), paint(ctx, n) { ctx.beginPath(); ctx.arc(n.cx ?? 0, n.cy ?? 0, n.r, 0, Math.PI * 2); ctx.fillStyle = n.color; ctx.fill(); } });
// path: d (SVG path data: M L H V C Q Z, absolute or relative), color, width, cap, progress (0..1 of its length drawn)
kind('path', {
  box: () => ({ w: 0, h: 0 }),
  paint(ctx, n) {
    ctx.strokeStyle = n.color; ctx.lineWidth = n.width ?? 4; ctx.lineCap = n.cap ?? 'round'; ctx.lineJoin = 'round';
    const p = n.progress ?? 1; if (p <= 0) return;
    if (p < 1) { const L = n.length; ctx.setLineDash([L, L]); ctx.lineDashOffset = L * (1 - p); }
    ctx.stroke(n.p2d); ctx.setLineDash([]);
  },
});
// A path node with length and pointAt(l) for moving things along it.
export function pathNode(parent, d, o = {}) {
  const n = new N('path', parent, 0, 0, { p2d: new Path2D(d), ox: 0, oy: 0, ...o });
  const pts = flatten(d), lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  n.length = lens[lens.length - 1];
  n.pointAt = l => {
    let i = lens.findIndex(x => x >= l); if (i <= 0) return pts[Math.max(0, i)] ?? pts[pts.length - 1];
    const f = (l - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
    return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f };
  };
  return n;
}
function flatten(d) {
  const tok = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+)(?:e-?\d+)?/g); let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0; const pts = [];
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; pts.push({ x, y }); cmd = rel ? 'l' : 'L'; }
    else if (C === 'L') { x = ox + num(); y = oy + num(); pts.push({ x, y }); }
    else if (C === 'H') { x = ox + num(); pts.push({ x, y }); }
    else if (C === 'V') { y = oy + num(); pts.push({ x, y }); }
    else if (C === 'C' || C === 'Q') {
      const c = C === 'C' ? [ox + num(), oy + num(), ox + num(), oy + num()] : [ox + num(), oy + num()];
      const ex = ox + num(), ey = oy + num(), x0 = x, y0 = y;
      for (let k = 1; k <= 48; k++) {
        const t = k / 48, u = 1 - t;
        pts.push(C === 'C'
          ? { x: u ** 3 * x0 + 3 * u * u * t * c[0] + 3 * u * t * t * c[2] + t ** 3 * ex, y: u ** 3 * y0 + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t ** 3 * ey }
          : { x: u * u * x0 + 2 * u * t * c[0] + t * t * ex, y: u * u * y0 + 2 * u * t * c[1] + t * t * ey });
      }
      x = ex; y = ey;
    } else if (C === 'Z') { x = sx; y = sy; pts.push({ x, y }); }
    else throw new Error('path command not supported for length: ' + cmd);
  }
  return pts;
}

// ---------- drawing ----------
const layers = [];
const layer = d => layers[d] ??= createCanvas(W, H);
function drawNode(ctx, n, depth) {
  const a = n.opacity; if (!(a > 0.002)) return;
  const k = KINDS[n.kind]; const { w, h } = k.box(n);
  ctx.save();
  ctx.translate(n.left - (k.ax?.(n, w) ?? 0), n.top);
  if (n.x || n.y || n.scale !== 1 || n.scaleY !== 1 || n.rotate) {
    const ox = n.ox * w, oy = n.oy * h;
    ctx.translate(ox + n.x, oy + n.y); if (n.rotate) ctx.rotate(n.rotate * Math.PI / 180); ctx.scale(n.scale, n.scale * n.scaleY); ctx.translate(-ox, -oy);
  }
  // A filtered subtree (filter: 'brightness(0.4)', 'blur(4px)') must not change inside: it is rasterized and
  // filtered once, then reused as an image. Animate the node itself (x, y, scale, opacity), not its children.
  if (n.filter) {
    if (!n._sprite) {
      const raw = createCanvas(W, H), rc = raw.getContext('2d');
      k.paint?.(rc, n, w, h); for (const ch of n.children) drawNode(rc, ch, depth + 1);
      n._sprite = createCanvas(W, H); const sc = n._sprite.getContext('2d'); sc.filter = n.filter; sc.drawImage(raw, 0, 0);
    }
    ctx.globalAlpha *= a; ctx.drawImage(n._sprite, 0, 0); ctx.restore(); return;
  }
  // CSS opacity on an element with children composites the group: draw it into a layer, then blend the layer.
  const grouped = a < 0.998 && n.children.length > 0;
  let c = ctx;
  if (grouped) {
    c = layer(depth).getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    c.setTransform(ctx.getTransform()); c.globalAlpha = 1;
  } else ctx.globalAlpha *= a;
  k.paint?.(c, n, w, h);
  if (n.children.length) {
    c.save();
    if (k.clip?.(c, n, w, h)) c.clip();
    const b = k.inset?.(n) ?? 0; if (b) c.translate(b, b);
    const kids = n.children.some(x => x.z) ? [...n.children].sort((p, q) => p.z - q.z) : n.children;
    for (const ch of kids) drawNode(c, ch, depth + 1);
    c.restore();
  }
  k.after?.(c, n, w, h);
  if (grouped) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= a; ctx.drawImage(layer(depth), 0, 0); }
  ctx.restore();
}
// Draw the frame at time t (after the timeline has been seeked to t): background image, then the node tree.
export function draw(ctx, root, t, bg = null) {
  NOW = t;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  if (bg) ctx.drawImage(bg, 0, 0); else ctx.clearRect(0, 0, W, H);
  drawNode(ctx, root, 0);
}
