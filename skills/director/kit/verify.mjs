// Checks that the renderer's shortcuts change nothing: every frame drawn the way render.mjs draws it (only the nodes
// that change, on top of a plate; only the changed part converted to YUV) against the same frame painted in full.
//   node src/verify.mjs [--scene scene.mjs] [--from 0] [--to END] [--fps 30] [--gop 60]
// Run it after adding a custom kind or a new scene. A kind that paints outside what meter.mjs can measure, or that
// reads something other than its own node, shows up here as frames that differ.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import * as G from './graph.mjs';
import { plates } from './plates.mjs';
import { converter, convertRows } from './yuv.mjs';
import { timeline } from './timeline.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const SRC = path.dirname(fileURLToPath(import.meta.url)), W = G.W, H = G.H;
const { build } = await import(pathToFileURL(path.resolve(SRC, opt('scene', 'scene.mjs'))).href);
const { seq, draw } = build(), tl = timeline(seq);
const fps = +opt('fps', 30), from = +opt('from', 0), to = +opt('to', G.TIMING.duration || tl.duration), gop = +opt('gop', 60), n = Math.round((to - from) * fps);
const A = createCanvas(W, H), B = createCanvas(W, H), a = A.getContext('2d'), b = B.getContext('2d');
const view = px => new Uint32Array(px.buffer, px.byteOffset, W * H);
const moving = i => tl.spans.some(([s, e]) => s <= from + i / fps && e > from + (i - 1) / fps);
tl.seek(from); draw(a, from);
const pl = plates(tl, draw, G), conv = converter(W, H, false), yA = Buffer.alloc(W * H * 1.5), yB = Buffer.alloc(W * H * 1.5);
const jobs = []; for (let i = 0, c = 0, cur = null; i < n; i++) { if (i === 0 || (moving(i) && c === gop)) { jobs.push(cur = []); c = 0; } if (i === 0 || moving(i)) { cur.push(i); c++; } }
let drawn = 0, same = 0, bad = 0, badY = 0, tp = 0, tf = 0, area = 0; const where = [];
for (const idx of jobs) {
  const times = idx.map(i => from + i / fps); pl.scan(times);
  for (let j = 0; j < times.length; j++) {
    tl.seek(times[j]);
    let q = performance.now(); const did = pl.frame(b, j, times[j]); tp += performance.now() - q;
    if (!did) same++; else { drawn++; convertRows(conv, view(B.data()), yB, G.plate.rows, W, H); for (let k = 0; k < G.plate.rows.x0.length; k++) area += Math.max(0, G.plate.rows.x1[k] - G.plate.rows.x0[k]) * 8; }
    const keep = G.plate.cost.slice(); q = performance.now(); draw(a, times[j]); tf += performance.now() - q; G.plate.cost.set(keep);
    conv(view(A.data()), yA, 0, H, 0, W);
    const p = Buffer.compare(A.data(), B.data()) !== 0, y = Buffer.compare(yA, yB) !== 0;
    if (p) bad++; if (y) badY++; if ((p || y) && where.length < 10) where.push(times[j].toFixed(3) + (did ? '' : ' (taken as unchanged)'));
  }
}
const st = pl.frame.stats;
console.log(`${n} frames, ${jobs.flat().length} in animation: ${drawn} drawn, ${same} unchanged`);
console.log(`drawn in full: ${st[0]} frames; plates taken: ${st[2]} (${pl.frame.rebuilds} retaken after a paint-order conflict); drawn on a plate: ${st[4]}`);
console.log(`time per frame: ${(tp / (drawn || 1)).toFixed(2)} ms planned, ${(tf / (drawn + same || 1)).toFixed(2)} ms in full; ${(100 * area / (drawn || 1) / W / H).toFixed(0)}% of the picture converted per frame`);
console.log(bad || badY ? `DIFFERENT: ${bad} frames with wrong pixels, ${badY} with wrong YUV; first at t = ${where.join(', ')}` : 'identical: every frame matches the full draw, pixels and YUV');
process.exit(bad || badY ? 1 : 0);
