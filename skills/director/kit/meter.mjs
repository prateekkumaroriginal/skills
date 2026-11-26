// A 2D context that paints through to a real one and measures where the paint lands.
// graph.mjs paints every node through a Meter: begin() before a node, end() after it gives the node's box on the
// frame in device pixels, [x0, y0, x1, y1]. The renderer uses the boxes to know which part of a frame changed and
// which unchanged nodes can stay in a cached picture. A box may be too large, never too small: curves count their
// control points, strokes their widest join, shadows their blur, and anything the Meter doesn't know how to
// measure (a filter, a blend mode, a method not listed here) counts as the whole frame.
const PLAIN = ['createConicGradient', 'createImageData', 'createLinearGradient', 'createPattern', 'createRadialGradient', 'getContextAttributes',
  'getImageData', 'getLineDash', 'setLineDash', 'isPointInPath', 'isPointInStroke', 'measureText', 'getTransform'];
const widths = new Map();

export class Meter {
  constructor(ctx, W, H) {
    this.c = ctx; this.W = W; this.H = H; this.stack = [];
    this.a = 1; this.b = 0; this.cc = 0; this.d = 1; this.e = 0; this.f = 0; // transform
    this.lw = 1; this.join = 'miter'; this.miter = 10; this.sb = 0; this.sx = 0; this.sy = 0; this.shadow = false;
    this.odd = false; this.fnt = '10px sans-serif'; this.align = 'start'; this.base = 'alphabetic';
    this.px0 = 1e9; this.py0 = 1e9; this.px1 = -1e9; this.py1 = -1e9; // current path, device space
    this.begin();
  }
  get canvas() { return this.c.canvas; }
  // ----- the box of what was painted since begin()
  begin() { this.x0 = 1e9; this.y0 = 1e9; this.x1 = -1e9; this.y1 = -1e9; this.all = false; }
  end() {
    if (this.all) return [0, 0, this.W, this.H];
    const x0 = Math.max(0, Math.floor(this.x0) - 2), y0 = Math.max(0, Math.floor(this.y0) - 2), x1 = Math.min(this.W, Math.ceil(this.x1) + 2), y1 = Math.min(this.H, Math.ceil(this.y1) + 2);
    return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : null;
  }
  _dev(x0, y0, x1, y1) { // a painted device-space rectangle, and its shadow
    if (this.odd) { this.all = true; return; }
    if (!(x0 <= x1 && y0 <= y1)) { if (x0 !== x0 || y0 !== y0 || x1 !== x1 || y1 !== y1) this.all = true; return; }
    if (x0 < this.x0) this.x0 = x0; if (y0 < this.y0) this.y0 = y0; if (x1 > this.x1) this.x1 = x1; if (y1 > this.y1) this.y1 = y1;
    if (this.shadow && (this.sb || this.sx || this.sy)) {
      const p = 2 * this.sb + 3; x0 += this.sx - p; x1 += this.sx + p; y0 += this.sy - p; y1 += this.sy + p;
      if (x0 < this.x0) this.x0 = x0; if (y0 < this.y0) this.y0 = y0; if (x1 > this.x1) this.x1 = x1; if (y1 > this.y1) this.y1 = y1;
    }
  }
  _rect(x, y, w, h, pad) { // a user-space rectangle
    const { a, b, cc: c, d, e, f } = this, X0 = x, X1 = x + w, Y0 = y, Y1 = y + h;
    const ax = a * X0 + c * Y0 + e, ay = b * X0 + d * Y0 + f, bx = a * X1 + c * Y0 + e, by = b * X1 + d * Y0 + f;
    const cx = a * X0 + c * Y1 + e, cy = b * X0 + d * Y1 + f, dx = a * X1 + c * Y1 + e, dy = b * X1 + d * Y1 + f;
    this._dev(Math.min(ax, bx, cx, dx) - pad, Math.min(ay, by, cy, dy) - pad, Math.max(ax, bx, cx, dx) + pad, Math.max(ay, by, cy, dy) + pad);
  }
  _scale() { return Math.max(Math.hypot(this.a, this.b), Math.hypot(this.cc, this.d)); }
  _strokePad() { return this.lw * 0.5 * (this.join === 'miter' ? Math.max(1.5, this.miter) : 1.5) * this._scale(); }
  _pt(x, y) { // a point of the current path
    const X = this.a * x + this.cc * y + this.e, Y = this.b * x + this.d * y + this.f;
    if (X !== X || Y !== Y) { this.px0 = NaN; return; }
    if (X < this.px0) this.px0 = X; if (X > this.px1) this.px1 = X; if (Y < this.py0) this.py0 = Y; if (Y > this.py1) this.py1 = Y;
  }
  _path(p, pad) {
    if (p && typeof p === 'object') { const q = p.getBounds(); this._rect(q[0], q[1], q[2] - q[0], q[3] - q[1], pad); }
    else this._dev(this.px0 - pad, this.py0 - pad, this.px1 + pad, this.py1 + pad);
  }
  // ----- state
  save() { this.stack.push([this.a, this.b, this.cc, this.d, this.e, this.f, this.lw, this.join, this.miter, this.sb, this.sx, this.sy, this.shadow, this.odd, this.fnt, this.align, this.base, this.flt, this.gco]); this.c.save(); }
  restore() {
    const s = this.stack.pop();
    if (s) [this.a, this.b, this.cc, this.d, this.e, this.f, this.lw, this.join, this.miter, this.sb, this.sx, this.sy, this.shadow, this.odd, this.fnt, this.align, this.base, this.flt, this.gco] = s;
    this.c.restore();
  }
  translate(x, y) { this.e += this.a * x + this.cc * y; this.f += this.b * x + this.d * y; this.c.translate(x, y); }
  scale(x, y) { this.a *= x; this.b *= x; this.cc *= y; this.d *= y; this.c.scale(x, y); }
  rotate(r) { const s = Math.sin(r), k = Math.cos(r), { a, b, cc: c, d } = this; this.a = a * k + c * s; this.b = b * k + d * s; this.cc = c * k - a * s; this.d = d * k - b * s; this.c.rotate(r); }
  transform(a2, b2, c2, d2, e2, f2) {
    const { a, b, cc: c, d, e, f } = this;
    this.a = a * a2 + c * b2; this.b = b * a2 + d * b2; this.cc = a * c2 + c * d2; this.d = b * c2 + d * d2; this.e = a * e2 + c * f2 + e; this.f = b * e2 + d * f2 + f;
    this.c.transform(a2, b2, c2, d2, e2, f2);
  }
  setTransform(a, b, c, d, e, f) {
    if (a === undefined) { a = 1; b = 0; c = 0; d = 1; e = 0; f = 0; } else if (typeof a === 'object') ({ a, b, c, d, e, f } = a);
    this.a = a; this.b = b; this.cc = c; this.d = d; this.e = e; this.f = f; this.c.setTransform(a, b, c, d, e, f);
  }
  resetTransform() { this.setTransform(1, 0, 0, 1, 0, 0); }
  get lineWidth() { return this.c.lineWidth; } set lineWidth(v) { this.c.lineWidth = v; this.lw = this.c.lineWidth; }
  get lineJoin() { return this.c.lineJoin; } set lineJoin(v) { this.c.lineJoin = v; this.join = this.c.lineJoin; }
  get miterLimit() { return this.c.miterLimit; } set miterLimit(v) { this.c.miterLimit = v; this.miter = this.c.miterLimit; }
  get shadowBlur() { return this.c.shadowBlur; } set shadowBlur(v) { this.c.shadowBlur = v; this.sb = +v || 0; }
  get shadowOffsetX() { return this.c.shadowOffsetX; } set shadowOffsetX(v) { this.c.shadowOffsetX = v; this.sx = +v || 0; }
  get shadowOffsetY() { return this.c.shadowOffsetY; } set shadowOffsetY(v) { this.c.shadowOffsetY = v; this.sy = +v || 0; }
  get shadowColor() { return this.c.shadowColor; } set shadowColor(v) { this.c.shadowColor = v; this.shadow = !/^(transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/.test(v); }
  get filter() { return this.c.filter; } set filter(v) { this.c.filter = v; this.flt = v && v !== 'none'; this.odd = this.flt || this.gco; }
  get globalCompositeOperation() { return this.c.globalCompositeOperation; } set globalCompositeOperation(v) { this.c.globalCompositeOperation = v; this.gco = v !== 'source-over'; this.odd = this.flt || this.gco; }
  get font() { return this.c.font; } set font(v) { this.c.font = v; this.fnt = v; }
  get textAlign() { return this.c.textAlign; } set textAlign(v) { this.c.textAlign = v; this.align = v; }
  get textBaseline() { return this.c.textBaseline; } set textBaseline(v) { this.c.textBaseline = v; this.base = v; }
  // ----- the current path
  beginPath() { this.px0 = 1e9; this.py0 = 1e9; this.px1 = -1e9; this.py1 = -1e9; this.c.beginPath(); }
  closePath() { this.c.closePath(); }
  moveTo(x, y) { this._pt(x, y); this.c.moveTo(x, y); }
  lineTo(x, y) { this._pt(x, y); this.c.lineTo(x, y); }
  quadraticCurveTo(a, b, x, y) { this._pt(a, b); this._pt(x, y); this.c.quadraticCurveTo(a, b, x, y); }
  bezierCurveTo(a, b, c, d, x, y) { this._pt(a, b); this._pt(c, d); this._pt(x, y); this.c.bezierCurveTo(a, b, c, d, x, y); }
  arcTo(a, b, c, d, r) { this._pt(a, b); this._pt(c, d); this.c.arcTo(a, b, c, d, r); }
  _box(x, y, w, h) { this._pt(x, y); this._pt(x + w, y); this._pt(x, y + h); this._pt(x + w, y + h); }
  arc(x, y, r, ...o) { this._box(x - r, y - r, 2 * r, 2 * r); this.c.arc(x, y, r, ...o); }
  ellipse(x, y, rx, ry, ...o) { const r = Math.max(Math.abs(rx), Math.abs(ry)); this._box(x - r, y - r, 2 * r, 2 * r); this.c.ellipse(x, y, rx, ry, ...o); }
  rect(x, y, w, h) { this._box(x, y, w, h); this.c.rect(x, y, w, h); }
  roundRect(x, y, w, h, r) { this._box(x, y, w, h); this.c.roundRect(x, y, w, h, r); }
  clip(...a) { this.c.clip(...a); } // clipping only ever shrinks what is painted
  // ----- painting
  fill(...a) { this._path(a[0], 0); this.c.fill(...a); }
  stroke(...a) { this._path(a[0], this._strokePad()); this.c.stroke(...a); }
  fillRect(x, y, w, h) { this._rect(x, y, w, h, 0); this.c.fillRect(x, y, w, h); }
  clearRect(x, y, w, h) { this._rect(x, y, w, h, 0); this.c.clearRect(x, y, w, h); }
  strokeRect(x, y, w, h) { this._rect(x, y, w, h, this._strokePad()); this.c.strokeRect(x, y, w, h); }
  _text(s, x, y, pad) {
    const k = this.fnt + '\n' + s; let w = widths.get(k);
    if (w === undefined) { if (widths.size > 20000) widths.clear(); w = this.c.measureText(s).width; widths.set(k, w); }
    const size = +(/([\d.]+)px/.exec(this.fnt)?.[1] ?? 100), al = this.align;
    const l = al === 'center' ? x - w / 2 : al === 'right' || al === 'end' ? x - w : x;
    this._rect(l - size * 0.5, y - size * 2, w + size, size * 4, pad);
  }
  fillText(s, x, y, ...o) { this._text(String(s), x, y, 0); this.c.fillText(s, x, y, ...o); }
  strokeText(s, x, y, ...o) { this._text(String(s), x, y, this._strokePad()); this.c.strokeText(s, x, y, ...o); }
  drawImage(img, ...a) {
    if (a.length >= 8) this._rect(a[4], a[5], a[6], a[7], 0); else this._rect(a[0], a[1], a[2] ?? img.width, a[3] ?? img.height, 0);
    this.c.drawImage(img, ...a);
  }
  putImageData(d, x, y, ...o) { this._dev(x, y, x + d.width, y + d.height); this.c.putImageData(d, x, y, ...o); }
}
// Everything else a context has: plain reads pass through; any other method may paint anywhere.
export function complete(ctx) {
  for (let o = ctx; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) for (const k of Object.getOwnPropertyNames(o)) {
    if (k in Meter.prototype || k === 'constructor' || k.startsWith('_')) continue;
    const d = Object.getOwnPropertyDescriptor(o, k);
    if (typeof d.value === 'function') Object.defineProperty(Meter.prototype, k, { value: PLAIN.includes(k) ? function (...a) { return this.c[k](...a); } : function (...a) { this.all = true; return this.c[k](...a); } });
    else Object.defineProperty(Meter.prototype, k, { get() { return this.c[k]; }, set(v) { this.c[k] = v; } });
  }
}
