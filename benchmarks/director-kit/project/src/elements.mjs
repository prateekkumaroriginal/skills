// The video's recurring elements, drawn as custom kinds. Shared by look frame, style frames, motion tests and the video.
import { createCanvas } from '@napi-rs/canvas';
import { kind, font, fallbackFonts, txt, measure, lineHeight, icon, rr, fillStroke, dropShadow, opaque } from './graph.mjs';

font('Body', 400, 'lexend-latin-400-normal.woff2');
font('Body', 700, 'lexend-latin-700-normal.woff2');
font('DejaVu Sans', 400, 'DejaVuSans.ttf'); // bundled, so every machine draws the same glyphs for → ★ ✓
fallbackFonts('DejaVu Sans');

// Palette: each colour carries one meaning for the whole video.
export const C = {
  bg: '#FBF5EA',      // warm paper stage
  panel: '#FFFFFF',   // cards, chip bodies
  ink: '#1E2235',     // reading text
  muted: '#5E6273',   // secondary text
  line: '#DCCFB9',    // hairlines, idle outlines
  cpu: '#C84B1E',     // CPU: chip, its workers, its labels
  cpuSoft: '#FCE3D6',
  gpu: '#0F8C76',     // GPU: chip, its workers, its labels
  gpuSoft: '#D2EEE7',
  light: '#F2B21B',   // light / "work being done" / emphasis
  lightSoft: '#FFF0C2',
  ai: '#6B4FD6',      // AI: chat, number table
  aiSoft: '#E6E0FA',
  aiInk: '#3A2896',   // numbers in the AI table
  dark: '#2A2E44',    // device bezels
};
// Type scale (px at 1080p). Nothing that is read is under 28.
export const T = { title: 80, head: 56, label: 52, body: 40, small: 36, counter: 72, big: 120 };

const shadow = { y: 14, blur: 34, color: 'rgba(60,40,10,.16)' };

// ---------- chip: a rounded square with pins; children (workers) sit inside its body ----------
// w, h, color, soft, label, sub (optional second line)
kind('chip', {
  box: n => ({ w: n.w, h: n.h }),
  inset: n => 0,
  paint(ctx, n, w, h) {
    const pin = 14, gap = 34, pl = 22;
    ctx.fillStyle = n.color;
    for (let x = 40; x < w - 40; x += gap) { rr(ctx, x, -pl, pin, pl + 6, 4); ctx.fill(); rr(ctx, x, h - 6, pin, pl + 6, 4); ctx.fill(); }
    for (let y = 40; y < h - 40; y += gap) { rr(ctx, -pl, y, pl + 6, pin, 4); ctx.fill(); rr(ctx, w - 6, y, pl + 6, pin, 4); ctx.fill(); }
    dropShadow(ctx, w, h, 28, shadow, true);
    fillStroke(ctx, w, h, 28, C.panel, 6, n.color);
    // label band
    rr(ctx, 6, 6, w - 12, 84, [22, 22, 0, 0]); ctx.fillStyle = n.soft; ctx.fill();
    txt(ctx, n.label, w / 2, 49, T.label, 700, 'Body', n.color, 'center');
  },
});

// ---------- worker: a friendly figure. big = CPU style (face + clipboard), else a tiny GPU worker ----------
// s (height px), color, big, hat (chef hat), lit (0..1: glows yellow while working)
kind('worker', {
  box: n => ({ w: n.s * 0.8, h: n.s }),
  paint(ctx, n, w, h) { paintWorker(ctx, w, h, n.color, n.big, n.lit ?? 0, n.hat, n.tool); },
});
function paintWorker(ctx, w, h, color, big, lit = 0, hat = false, tool = null) {
  const s = h, cx = w / 2, hr = s * 0.2, hy = s * 0.26;
  const body = color;
  if (lit > 0) { // working: a warm halo behind the figure
    ctx.save(); ctx.globalAlpha *= lit; ctx.fillStyle = C.light; ctx.beginPath(); ctx.ellipse(cx, s * 0.56, s * 0.44, s * 0.47, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  // body (shoulders)
  ctx.fillStyle = body; rr(ctx, cx - s * 0.36, s * 0.5, s * 0.72, s * 0.5, [s * 0.3, s * 0.3, s * 0.08, s * 0.08]); ctx.fill();
  // head
  ctx.beginPath(); ctx.arc(cx, hy, hr, 0, Math.PI * 2); ctx.fillStyle = big ? '#F6D2B4' : body; ctx.fill();
  if (big) {
    ctx.lineWidth = Math.max(2, s * 0.03); ctx.strokeStyle = body; ctx.stroke();
    ctx.fillStyle = C.ink; const e = hr * 0.38;
    ctx.beginPath(); ctx.arc(cx - e, hy - hr * 0.08, s * 0.022, 0, 7); ctx.arc(cx + e, hy - hr * 0.08, s * 0.022, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, hy + hr * 0.12, hr * 0.42, 0.2 * Math.PI, 0.8 * Math.PI); ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, s * 0.022); ctx.lineCap = 'round'; ctx.stroke();
    if (!hat) { // clipboard
      ctx.save(); ctx.translate(cx + s * 0.1, s * 0.58); ctx.rotate(-0.12);
      fillStroke(ctx, s * 0.26, s * 0.32, s * 0.03, '#FFFFFF', Math.max(2, s * 0.02), C.ink);
      ctx.fillStyle = C.ink; for (let i = 0; i < 3; i++) { rr(ctx, s * 0.05, s * (0.08 + i * 0.07), s * 0.16, s * 0.025, 2); ctx.fill(); }
      ctx.restore();
    }
  }
  if (hat) { // chef hat
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, s * 0.02);
    ctx.beginPath(); ctx.ellipse(cx, hy - hr * 1.75, hr * 1.05, hr * 0.62, 0, 0, 7); ctx.fill(); ctx.stroke();
    rr(ctx, cx - hr * 0.75, hy - hr * 1.5, hr * 1.5, hr * 0.62, 4); ctx.fill(); ctx.stroke();
  }
  if (tool === 'knife') { ctx.fillStyle = '#9AA0B4'; rr(ctx, cx + s * 0.25, s * 0.45, s * 0.07, s * 0.3, 3); ctx.fill(); }
}

// ---------- crowd: a grid of tiny GPU workers drawn as one node (many workers, cheap) ----------
// cols, rows, s (worker height), gapX, gapY, color, lit (0..1: fraction of rows lit, top to bottom), litAll (0..1 glow for all)
kind('crowd', {
  box: n => ({ w: n.cols * (n.s * 0.8 + n.gapX) - n.gapX, h: n.rows * (n.s + n.gapY) - n.gapY }),
  paint(ctx, n) {
    const cw = n.s * 0.8 + n.gapX, ch = n.s + n.gapY;
    const spr = workerSprite(n.s, n.color, 0), sprL = workerSprite(n.s, n.color, 1);
    const litRows = (n.lit ?? 0) * n.rows, shownRows = (n.shown ?? 1) * n.rows;
    for (let r = 0; r < n.rows; r++) {
      const vis = Math.min(1, Math.max(0, shownRows - r)); if (vis <= 0) break;
      ctx.save(); ctx.globalAlpha *= vis;
      const fr = Math.max(n.litAll ?? 0, Math.min(1, Math.max(0, litRows - r)));
      for (let c = 0; c < n.cols; c++) {
        const wv = (n.wave ?? -1) >= -0.5 ? Math.max(0, 1 - Math.abs(c / Math.max(1, n.cols - 1) - n.wave) / (n.band ?? 0.12)) : 0;
        const f = Math.max(fr, wv);
        ctx.drawImage(spr, c * cw, r * ch);
        if (f > 0) { ctx.save(); ctx.globalAlpha *= f; ctx.drawImage(sprL, c * cw, r * ch); ctx.restore(); }
      }
      ctx.restore();
    }
  },
});
const sprites = new Map();
function workerSprite(s, color, lit) {
  const k = `${s}|${color}|${lit}`; if (sprites.has(k)) return sprites.get(k);
  const c = createCanvas(Math.ceil(s * 0.8), Math.ceil(s)); paintWorker(c.getContext('2d'), s * 0.8, s, color, false, lit); sprites.set(k, c); return c;
}

// ---------- tablet: dark bezel; children sit inside the screen (inset by the bezel) ----------
kind('tablet', {
  box: n => ({ w: n.w, h: n.h }),
  inset: n => n.bezel ?? 26,
  paint(ctx, n, w, h) {
    dropShadow(ctx, w, h, 44, { y: 22, blur: 50, color: 'rgba(40,30,10,.25)' }, true);
    fillStroke(ctx, w, h, 44, C.dark);
    const b = n.bezel ?? 26; rr(ctx, b, b, w - 2 * b, h - 2 * b, 18); ctx.fillStyle = n.screen ?? '#FFFFFF'; ctx.fill();
  },
  clip(ctx, n, w, h) { const b = n.bezel ?? 26; rr(ctx, b, b, w - 2 * b, h - 2 * b, 18); return true; },
});

// ---------- photo: the family picture, painted procedurally ----------
// w, h, dark (0..1 how dark the unbrightened part is), lit (0..1 fraction brightened, left to right), litEdge (show the moving edge)
kind('photo', {
  box: n => ({ w: n.w, h: n.h }),
  paint(ctx, n, w, h) {
    ctx.drawImage(photoSprite(w, h), 0, 0);
    const d = n.dark ?? 0;
    if (d <= 0.001) { if ((n.flash ?? 0) > 0) { ctx.save(); ctx.globalAlpha *= n.flash; ctx.fillStyle = 'rgba(255,236,160,.55)'; ctx.fillRect(0, 0, w, h); ctx.restore(); } return; }
    const lx = (n.lit ?? 0) * w;
    ctx.fillStyle = `rgba(38,28,18,${0.6 * d})`; ctx.fillRect(lx, 0, w - lx, h);
    if ((n.flash ?? 0) > 0) { ctx.save(); ctx.globalAlpha *= n.flash; ctx.fillStyle = 'rgba(255,236,160,.55)'; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    if ((n.litEdge ?? 0) > 0 && lx > 0 && lx < w) { ctx.fillStyle = C.light; ctx.globalAlpha *= n.litEdge; ctx.fillRect(lx - 3, 0, 6, h); }
  },
});
const photoCache = new Map();
export function photoSprite(w, h) {
  const k = `${w}x${h}`; if (photoCache.has(k)) return photoCache.get(k);
  const c = createCanvas(Math.ceil(w), Math.ceil(h)), x = c.getContext('2d'); paintFamily(x, w, h); photoCache.set(k, c); return c;
}
export function paintFamily(x, w, h) {
  const u = w / 640; x.save(); x.scale(u, u); const H = h / u;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9ED4F0'); g.addColorStop(1, '#E4F4FB'); x.fillStyle = g; x.fillRect(0, 0, 640, H);
  x.fillStyle = '#FFD45C'; x.beginPath(); x.arc(540, 80, 46, 0, 7); x.fill();
  x.fillStyle = '#FFFFFF'; for (const [cx, cy] of [[120, 70], [170, 60], [210, 74]]) { x.beginPath(); x.arc(cx, cy, 26, 0, 7); x.fill(); }
  x.fillStyle = '#86C878'; x.beginPath(); x.moveTo(0, H * 0.7); x.quadraticCurveTo(200, H * 0.52, 400, H * 0.66); x.quadraticCurveTo(540, H * 0.74, 640, H * 0.6); x.lineTo(640, H); x.lineTo(0, H); x.fill();
  x.fillStyle = '#66AE5E'; x.beginPath(); x.moveTo(0, H * 0.84); x.quadraticCurveTo(320, H * 0.74, 640, H * 0.86); x.lineTo(640, H); x.lineTo(0, H); x.fill();
  kid(x, 245, H * 0.98, 1.0, '#F2C4A0', '#6B4128', '#E8574F', -1);
  kid(x, 400, H * 0.98, 0.86, '#B97F55', '#22160F', '#3F7FE0', 1);
  x.restore();
}
function kid(x, cx, base, sc, skin, hair, shirt, wave) {
  x.save(); x.translate(cx, base); x.scale(sc, sc);
  // arms
  x.strokeStyle = skin; x.lineWidth = 18; x.lineCap = 'round';
  x.beginPath(); x.moveTo(-50 * wave, -170); x.lineTo(-95 * wave, -255); x.stroke();
  x.beginPath(); x.moveTo(50 * wave, -165); x.lineTo(80 * wave, -100); x.stroke();
  // body
  x.fillStyle = shirt; rr(x, -62, -195, 124, 200, [50, 50, 10, 10]); x.fill();
  // head
  x.fillStyle = skin; x.beginPath(); x.arc(0, -250, 58, 0, 7); x.fill();
  x.fillStyle = hair; x.beginPath(); x.arc(0, -262, 60, Math.PI * 1.02, Math.PI * 1.98); x.fill();
  x.fillStyle = '#1E2235'; x.beginPath(); x.arc(-20, -250, 6, 0, 7); x.arc(20, -250, 6, 0, 7); x.fill();
  x.strokeStyle = '#1E2235'; x.lineWidth = 5; x.beginPath(); x.arc(0, -238, 22, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
  x.fillStyle = 'rgba(232,90,90,.35)'; x.beginPath(); x.arc(-36, -232, 10, 0, 7); x.arc(36, -232, 10, 0, 7); x.fill();
  x.restore();
}

// ---------- pill: a rounded label with optional icon. text, color (fill), fg, size, icon ----------
kind('pill', {
  box: n => { const s = n.fs ?? T.body; return { w: measure(n.text, s, 700) + s * 1.3 + (n.icon ? s * 1.25 : 0), h: s * 1.9 }; },
  ax: (n, w) => (n.align === 'center' ? w / 2 : 0),
  paint(ctx, n, w, h) {
    const s = n.fs ?? T.body;
    if (n.shadow !== false) dropShadow(ctx, w, h, h / 2, { y: 6, blur: 16, color: 'rgba(60,40,10,.18)' });
    fillStroke(ctx, w, h, h / 2, n.color, n.borderWidth ?? 0, n.borderColor);
    let x = s * 0.65; if (n.icon) { icon(ctx, n.icon, x, h / 2 - s * 0.5, s, n.fg ?? '#fff', 2.4); x += s * 1.25; }
    txt(ctx, n.text, x, h / 2, s, 700, 'Body', n.fg ?? '#fff');
  },
});

// ---------- card: white rule card with a coloured left edge. lines (array), color, size, w ----------
kind('card', {
  box: n => { const s = n.fs ?? T.body, lh = lineHeight(s, 700) * 1.15; return { w: n.w ?? Math.max(...n.lines.map(l => measure(l, s, 700))) + 2.4 * s, h: n.lines.length * lh + 1.3 * s }; },
  ax: (n, w) => (n.align === 'center' ? w / 2 : 0),
  paint(ctx, n, w, h) {
    const s = n.fs ?? T.body, lh = lineHeight(s, 700) * 1.15;
    dropShadow(ctx, w, h, 20, shadow, true); fillStroke(ctx, w, h, 20, C.panel, 3, n.border ?? C.line);
    rr(ctx, 0, 0, 14, h, [20, 0, 0, 20]); ctx.fillStyle = n.color; ctx.fill();
    n.lines.forEach((l, i) => txt(ctx, l, 1.2 * s, 0.65 * s + lh * (i + 0.5), s, i === 0 && n.lines.length > 1 ? 700 : 700, 'Body', i === 0 ? C.ink : C.muted));
  },
});

// ---------- bubble: a chat bubble. text, color, fg, size, tail ('left'|'right') ----------
kind('bubble', {
  box: n => { const s = n.fs ?? T.body; return { w: measure(n.text, s, 400) + 1.6 * s, h: s * 2.2 }; },
  paint(ctx, n, w, h) {
    dropShadow(ctx, w, h, 28, shadow, opaque(n.color ?? C.panel)); fillStroke(ctx, w, h, 28, n.color ?? C.panel, n.borderWidth ?? 0, n.borderColor);
    ctx.fillStyle = n.color ?? C.panel; ctx.beginPath();
    if (n.tail === 'right') { ctx.moveTo(w - 50, h - 2); ctx.lineTo(w - 10, h + 22); ctx.lineTo(w - 22, h - 2); }
    else { ctx.moveTo(50, h - 2); ctx.lineTo(10, h + 22); ctx.lineTo(22, h - 2); }
    ctx.fill();
    txt(ctx, n.text, 0.8 * (n.fs ?? T.body), h / 2, n.fs ?? T.body, 400, 'Body', n.fg ?? C.ink);
  },
});

// ---------- pixels: the photo seen as a grid of coloured squares. w, h, cell, gap, sx, sy, sw (source window in photo px of a 640-wide photo) ----------
// pick (index of highlighted cell or -1), ring (0..1)
kind('pixels', {
  box: n => ({ w: n.w, h: n.h }),
  paint(ctx, n, w, h) {
    const cols = Math.round(w / n.cell), rows = Math.round(h / n.cell);
    const sw = n.sw, shh = Math.round(n.sw * rows / cols);
    const k = `${n.sx},${n.sy},${sw},${shh}`; const src = pixCache.get(k) ?? pixCache.set(k, photoSprite(640, 400).getContext('2d').getImageData(n.sx, n.sy, sw, shh).data).get(k);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const px = Math.min(sw - 1, Math.floor((c + 0.5) * sw / cols)), py = Math.min(shh - 1, Math.floor((r + 0.5) * shh / rows)), i = (py * sw + px) * 4;
      ctx.fillStyle = `rgb(${src[i]},${src[i + 1]},${src[i + 2]})`;
      rr(ctx, c * n.cell + n.gap / 2, r * n.cell + n.gap / 2, n.cell - n.gap, n.cell - n.gap, n.cell * 0.12); ctx.fill();
    }
  },
});
const pixCache = new Map();
let PH = null; const photoData = () => PH ??= photoSprite(640, 400).getContext('2d').getImageData(0, 0, 640, 400).data;
// colour of one cell of a pixels node, for its RGB readout
export function pixelColor(n, c, r) {
  const cols = Math.round(n.w / n.cell), rows = Math.round(n.h / n.cell);
  const shh = Math.round(n.sw * rows / cols);
  const px = Math.floor((c + 0.5) * n.sw / cols), py = Math.floor((r + 0.5) * shh / rows);
  const d = photoSprite(640, 400).getContext('2d').getImageData(n.sx + px, n.sy + py, 1, 1).data; return [d[0], d[1], d[2]];
}

// ---------- numtable: the AI's table of numbers. cols, rows, cell, wave (0..1 sweep left→right lighting columns), seed ----------
kind('numtable', {
  box: n => ({ w: n.cols * n.cell * 1.25, h: n.rows * n.cell }),
  paint(ctx, n, w, h) {
    const cw = n.cell * 1.25; let s = n.seed ?? 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const wave = n.wave ?? -1, band = 0.18;
    ctx.font = `700 ${n.cell * 0.55}px Body`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let r = 0; r < n.rows; r++) for (let c = 0; c < n.cols; c++) {
      const v = String(1 + Math.floor(rnd() * 9));
      const f = c / Math.max(1, n.cols - 1), on = wave >= 0 ? Math.max(0, 1 - Math.abs(f - wave) / band) : 0;
      rr(ctx, c * cw + 3, r * n.cell + 3, cw - 6, n.cell - 6, 8); ctx.fillStyle = on > 0.35 ? C.light : C.aiSoft; ctx.fill();
      ctx.fillStyle = on > 0.35 ? C.ink : C.aiInk; ctx.fillText(v, c * cw + cw / 2, r * n.cell + n.cell / 2 + 1);
    }
  },
});

// ---------- game: the grandchildren's game screen (car on a hilly road). w, h, carX (0..1), score ----------
kind('game', {
  box: n => ({ w: n.w, h: n.h }),
  paint(ctx, n, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#FFB86B'); g.addColorStop(1, '#FFE3B3'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFF2C4'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.25, h * 0.11, 0, 7); ctx.fill();
    ctx.fillStyle = '#7A5CC4'; ctx.beginPath(); ctx.moveTo(0, h * 0.62); for (let i = 0; i <= 8; i++) ctx.lineTo(w * i / 8, h * (0.5 + 0.1 * Math.sin(i * 1.7))); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    const road = x => h * (0.78 + 0.05 * Math.sin(x / w * 6));
    ctx.fillStyle = '#3B8F5A'; ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += 8) ctx.lineTo(x, road(x) - 10); ctx.lineTo(w, h); ctx.fill();
    ctx.strokeStyle = '#3A3F55'; ctx.lineWidth = h * 0.05; ctx.beginPath(); for (let x = 0; x <= w; x += 8) x ? ctx.lineTo(x, road(x)) : ctx.moveTo(x, road(x)); ctx.stroke();
    const cx = (n.carX ?? 0.35) * w, cy = road(cx); ctx.save(); ctx.translate(cx, cy - h * 0.05);
    ctx.rotate(Math.atan2(road(cx + 10) - road(cx - 10), 20));
    const s = h * 0.12; ctx.fillStyle = '#E8423A'; rr(ctx, -s, -s * 0.55, s * 2, s * 0.6, s * 0.2); ctx.fill(); rr(ctx, -s * 0.5, -s * 0.95, s * 1.1, s * 0.5, s * 0.2); ctx.fill();
    ctx.fillStyle = '#BFE6FF'; rr(ctx, -s * 0.35, -s * 0.85, s * 0.8, s * 0.3, s * 0.1); ctx.fill();
    ctx.fillStyle = '#1E2235'; for (const wx of [-s * 0.55, s * 0.55]) { ctx.beginPath(); ctx.arc(wx, 0, s * 0.24, 0, 7); ctx.fill(); }
    ctx.restore();
    if (n.score != null) { rr(ctx, 20, 20, 210, 64, 32); ctx.fillStyle = 'rgba(30,34,53,.75)'; ctx.fill(); txt(ctx, '★ ' + Math.round(n.score), 50, 52, 36, 700, 'Body', '#FFE27A'); }
  },
});

// ---------- rack: a server rack of GPU boards. w, h, lit (0..1 LED glow) ----------
kind('rack', {
  box: n => ({ w: n.w, h: n.h }),
  paint(ctx, n, w, h) {
    fillStroke(ctx, w, h, 10, C.dark);
    const k = 8, bh = (h - 20) / k;
    for (let i = 0; i < k; i++) {
      rr(ctx, 8, 10 + i * bh + 3, w - 16, bh - 6, 5); ctx.fillStyle = '#3A3F5C'; ctx.fill();
      ctx.fillStyle = (n.lit ?? 0) > 0 ? mixHex('#5A6080', C.gpu, n.lit) : '#5A6080';
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(w - 22 - j * 14, 10 + i * bh + bh / 2, Math.max(2.5, bh * 0.1), 0, 7); ctx.fill(); }
    }
    if (n.tag) { rr(ctx, w / 2 - 34, -30, 68, 40, 10); ctx.fillStyle = C.cpu; ctx.fill(); txt(ctx, 'CPU', w / 2, -10, 22, 700, 'Body', '#FFFFFF', 'center'); }
  },
});

// ---------- ribbon: "Best result ever" banner. text, color ----------
kind('ribbon', {
  box: n => ({ w: measure(n.text, T.label, 700) + 120, h: 84 }),
  paint(ctx, n, w, h) {
    ctx.fillStyle = mixHex(n.color, '#000000', 0.25);
    for (const s of [-1, 1]) { ctx.beginPath(); const x0 = s < 0 ? 0 : w, d = s * 46; ctx.moveTo(x0 - d * 0.2, 14); ctx.lineTo(x0 + d, 14); ctx.lineTo(x0 + d * 0.6, h / 2 + 14); ctx.lineTo(x0 + d, h + 14); ctx.lineTo(x0 - d * 0.2, h + 14); ctx.fill(); }
    rr(ctx, 0, 0, w, h, 10); ctx.fillStyle = n.color; ctx.fill();
    txt(ctx, n.text, w / 2, h / 2, T.label, 700, 'Body', n.fg ?? C.ink, 'center');
  },
});

// ---------- ring: an emphasis ring around a box. w, h, color, width ----------
kind('ring', {
  box: n => ({ w: n.w, h: n.h }),
  paint(ctx, n, w, h) { rr(ctx, 0, 0, w, h, n.radius ?? Math.min(w, h) / 2); ctx.strokeStyle = n.color ?? C.light; ctx.lineWidth = n.width ?? 8; ctx.stroke(); },
});

// ---------- arrow: a thick curved hand-off arrow from (0,0) to (dx,dy), bending by bend. progress 0..1 ----------
kind('arrow', {
  box: () => ({ w: 0, h: 0 }),
  paint(ctx, n) {
    const p = n.progress ?? 1; if (p <= 0) return;
    const dx = n.dx, dy = n.dy, mx = dx / 2 - dy * (n.bend ?? 0.2), my = dy / 2 + dx * (n.bend ?? 0.2);
    const pt = t => ({ x: 2 * (1 - t) * t * mx + t * t * dx, y: 2 * (1 - t) * t * my + t * t * dy });
    ctx.strokeStyle = n.color; ctx.lineWidth = n.width ?? 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0);
    const N = 40; for (let i = 1; i <= N * p; i++) { const q = pt(i / N); ctx.lineTo(q.x, q.y); } ctx.stroke();
    const e = pt(p), b = pt(Math.max(0, p - 0.04)), a = Math.atan2(e.y - b.y, e.x - b.x), L = (n.width ?? 10) * 2.6;
    ctx.fillStyle = n.color; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * L * 0.6, e.y + Math.sin(a) * L * 0.6);
    ctx.lineTo(e.x + Math.cos(a + 2.4) * L, e.y + Math.sin(a + 2.4) * L); ctx.lineTo(e.x + Math.cos(a - 2.4) * L, e.y + Math.sin(a - 2.4) * L); ctx.fill();
  },
});

export function mixHex(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// ---------- stadium: tiny figures each holding a card; raised cards together show the family photo. cols, rows, s, flip (0..1, wave left→right) ----------
kind('stadium', {
  box: n => ({ w: n.cols * n.s, h: n.rows * n.s * 1.25 }),
  paint(ctx, n) {
    const ph = photoData();
    const flip = (n.flip ?? 0) * (n.cols + 4);
    for (let r = 0; r < n.rows; r++) for (let c = 0; c < n.cols; c++) {
      const x = c * n.s, y = r * n.s * 1.25, f = Math.min(1, Math.max(0, flip - c - (n.rows - r) * 0.2));
      ctx.fillStyle = C.gpu; ctx.beginPath(); ctx.arc(x + n.s / 2, y + n.s * 1.0, n.s * 0.2, 0, 7); ctx.fill();
      const px = Math.floor((c + 0.5) / n.cols * 640), py = Math.floor((r + 0.5) / n.rows * 400), i = (py * 640 + px) * 4;
      const col = f > 0 ? mixHex('#E4DACA', '#' + [ph[i], ph[i + 1], ph[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''), f) : '#E4DACA';
      const lift = f * n.s * 0.18;
      rr(ctx, x + n.s * 0.08, y + n.s * 0.08 - lift, n.s * 0.84, n.s * 0.74, n.s * 0.08); ctx.fillStyle = col; ctx.fill();
      if (f < 1) { ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
  },
});

// ---------- gpucard: a gaming graphics card (2012). w, h, label ----------
kind('gpucard', {
  box: n => ({ w: n.w, h: n.h }),
  paint(ctx, n, w, h) {
    dropShadow(ctx, w, h, 16, shadow);
    ctx.fillStyle = '#C9A227'; for (let x = 30; x < w * 0.6; x += 18) { rr(ctx, x, h - 4, 10, 16, 2); ctx.fill(); }
    fillStroke(ctx, w, h, 16, C.dark);
    ctx.fillStyle = '#3A3F5C'; for (const fx of [w * 0.3, w * 0.7]) { ctx.beginPath(); ctx.arc(fx, h * 0.5, h * 0.3, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#5A6080'; ctx.lineWidth = 4; for (const fx of [w * 0.3, w * 0.7]) for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(fx, h * 0.5); ctx.lineTo(fx + Math.cos(a) * h * 0.26, h * 0.5 + Math.sin(a) * h * 0.26); ctx.stroke(); }
    rr(ctx, w / 2 - 92, h * 0.5 - 32, 184, 64, 32); ctx.fillStyle = C.gpu; ctx.fill();
    icon(ctx, 'gamepad-2', w / 2 - 74, h * 0.5 - 18, 36, '#FFFFFF', 2.4);
    txt(ctx, n.label ?? 'GPU', w / 2 + 22, h * 0.5, T.small, 700, 'Body', '#FFFFFF', 'center');
  },
});

// ---------- thumb: a small photo card with an icon (the 2012 photo stream). icon, color, s, tag (label shown under it, optional) ----------
kind('thumb', {
  box: n => ({ w: n.s, h: n.s }),
  paint(ctx, n, w, h) {
    dropShadow(ctx, w, h, 14, { y: 6, blur: 14, color: 'rgba(60,40,10,.18)' }, true);
    fillStroke(ctx, w, h, 14, '#FFFFFF', 3, C.line);
    rr(ctx, 8, 8, w - 16, h - 16, 10); ctx.fillStyle = n.tint ?? C.lightSoft; ctx.fill();
    icon(ctx, n.icon, w * 0.2, h * 0.2, w * 0.6, n.color ?? C.ink, 2.2);
  },
});

// ---------- link: a straight rounded bar between two points, drawn on by progress. dx, color, width ----------
kind('link', {
  box: () => ({ w: 0, h: 0 }),
  paint(ctx, n) { const p = n.progress ?? 1; if (p <= 0) return; ctx.strokeStyle = n.color ?? C.light; ctx.lineWidth = n.width ?? 12; ctx.lineCap = 'round'; ctx.setLineDash(n.dash ?? []); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(n.dx * p, (n.dy ?? 0) * p); ctx.stroke(); ctx.setLineDash([]); },
});
// ---------- building: a big hall outline with a pitched roof, drawn around racks. w, h ----------
kind('building', {
  box: n => ({ w: n.w, h: n.h }),
  paint(ctx, n, w, h) {
    const r = h * 0.2; ctx.fillStyle = '#F1E7D6'; ctx.strokeStyle = C.muted; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(w * 0.5, 0); ctx.lineTo(w, r); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill(); ctx.stroke();
  },
});
// round a counter value to a calm step, e.g. calm(12345, 500) -> "12,500"
export const calm = (v, step) => (Math.round(v / step) * step).toLocaleString('en-US');
