// The video's scenes for the canvas renderer: the counterpart of index.html.
// render.mjs calls build() once per worker, then for each frame seeks the timeline and calls draw(ctx, t).
// Replace the fonts, colours and scene content with this video's own; keep build() returning { seq, draw }.
import { TIMING, font, fallbackFonts, node, pathNode, background, draw as drawTree } from './graph.mjs';

// Fonts come only from assets/fonts. One call per weight used.
font('Body', 500, 'REPLACE-500.woff2');
font('Body', 700, 'REPLACE-700.woff2');
fallbackFonts('Noto Sans', 'DejaVu Sans'); // for glyphs the font lacks (✕, ✓)

const C = { bg: '#0B1020', ink: '#EEF1FA', muted: '#A9B2D4', accent: '#F5B942' };

// Start time (s) of the nth occurrence of a word in a narration passage, from audio/timing.json.
function K(p, w, n = 1) {
  const hits = TIMING.words.filter(x => x.p === p && x.w === w);
  if (!hits[n - 1]) throw new Error(`keyword ${p}:${w}#${n} not found`);
  return hits[n - 1].s;
}

export function build() {
  const seq = [];
  // One segment of the sequence: keyframes for a node, starting at absolute time t (seconds).
  const at = (el, kf, t, o = {}) => seq.push([el, kf, { at: t, duration: 0.4, ease: 'easeInOut', ...o }]);
  // Entrance: grow from 0.82x with a slight overshoot.
  const pop = (el, t, d = 0.4) => at(el, { opacity: [0, 1], scale: [0.82, 1] }, t, { duration: d, ease: 'backOut' });
  // Emphasis: brief scale pulse and back.
  const pulse = (el, t, a = 0.06) => at(el, { scale: [1, 1 + a, 1] }, t, { duration: 0.28, ease: 'easeOut' });
  // Camera: centre the view on (cx, cy) at zoom z.
  const cam = (t, d, cx, cy, z) => at(world, { x: 960 - cx * z, y: 540 - cy * z, scale: z }, t, { duration: d });
  // Changing text: a value { v } in the sequence, formatted into the node's text from time t.
  const count = (el, a, b, t, d, fmt) => { const v = { v: a }; el.textFrom(v, fmt, t); at(v, { v: [a, b] }, t, { duration: d, ease: 'easeOut' }); };
  const typed = (el, str, t, d) => { const v = { v: 0 }; el.textFrom(v, x => str.slice(0, Math.round(x)), t); at(v, { v: [0, str.length] }, t, { duration: d, ease: 'linear' }); };

  // The camera moves world: x, y and scale around its top-left corner.
  const world = node('group', null, 0, 0, { w: 1920, h: 1080, ox: 0, oy: 0 });
  const bg = background(ctx => { ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 1920, 1080); });

  // Scenes go here, in time order. Example:
  //   const card = node('box', world, 660, 390, { w: 600, h: 300, radius: 24, fill: '#161E3A', borderWidth: 1.5, borderColor: '#2E3A6B',
  //                                               shadow: { y: 24, blur: 60, color: 'rgba(0,0,0,.5)' } });
  //   const title = node('text', card, 300, 120, { text: 'Hello', size: 64, weight: 700, color: C.ink, align: 'center' });
  //   pop(card, K(1, 'language'));
  //   cam(K(1, 'language') - 0.2, 0.9, 960, 540, 1);

  return { seq, draw: (ctx, t) => drawTree(ctx, world, t, bg) };
}
