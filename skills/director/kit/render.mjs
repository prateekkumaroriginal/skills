// Render the scenes and encode them with the narration.
//   node src/render.mjs cuts/cut-01.mp4 [--from 0] [--to 10] [--fps 30] [--workers N] [--preset ultrafast] [--crf 16]
//   node src/render.mjs OUTDIR --stills 1.5,3,7.25          (full-size PNGs, one per time)
//   [--scene scene.mjs]  scene module in src/, e.g. motion-tests.mjs
// Without audio/narration.m4a (look frame, style frames, motion tests) the video gets a silent track;
// without audio/timing.json, --to defaults to the end of the last animation.
// Worker threads seek the timeline, draw each frame with Skia and convert it to yuv420p; the main thread feeds the
// frames in order to one x264 process. A frame where no value changes since the previous one repeats it.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = HERE, ROOT = path.resolve(HERE, '..');
const Wd = 1920, Ht = 1080;

async function load(sceneRel) {
  const { createCanvas } = await import('@napi-rs/canvas');
  const { timeline } = await import('./timeline.mjs');
  const { build } = await import(pathToFileURL(path.resolve(SRC, sceneRel)).href);
  const { seq, draw } = build(); const tl = timeline(seq);
  const cv = createCanvas(Wd, Ht);
  return { tl, cv, ctx: cv.getContext('2d'), draw };
}

if (!isMainThread) {
  const { tl, cv, ctx, draw } = await load(workerData.scene);
  // RGBA -> yuv420p, BT.601 limited range (what ffmpeg produces from RGB by default), chroma from 2x2 averages;
  // one pass over row pairs with 32-bit reads (little-endian RGBA). Doing it here spreads it over the workers.
  function toI420(px) {
    if (px.byteOffset % 4) px = new Uint8Array(px);
    const u = new Uint32Array(px.buffer, px.byteOffset, Wd * Ht);
    const ab = new ArrayBuffer(Wd * Ht * 3 / 2), Y = new Uint8Array(ab, 0, Wd * Ht), U = new Uint8Array(ab, Wd * Ht, Wd * Ht / 4), V = new Uint8Array(ab, Wd * Ht * 5 / 4, Wd * Ht / 4);
    let c = 0;
    for (let y = 0; y < Ht; y += 2) {
      let i = y * Wd; const end = i + Wd;
      for (; i < end; i += 2, c++) {
        const p0 = u[i], p1 = u[i + 1], p2 = u[i + Wd], p3 = u[i + Wd + 1];
        const r0 = p0 & 255, g0 = (p0 >> 8) & 255, b0 = (p0 >> 16) & 255;
        const r1 = p1 & 255, g1 = (p1 >> 8) & 255, b1 = (p1 >> 16) & 255;
        const r2 = p2 & 255, g2 = (p2 >> 8) & 255, b2 = (p2 >> 16) & 255;
        const r3 = p3 & 255, g3 = (p3 >> 8) & 255, b3 = (p3 >> 16) & 255;
        Y[i] = ((66 * r0 + 129 * g0 + 25 * b0 + 128) >> 8) + 16;
        Y[i + 1] = ((66 * r1 + 129 * g1 + 25 * b1 + 128) >> 8) + 16;
        Y[i + Wd] = ((66 * r2 + 129 * g2 + 25 * b2 + 128) >> 8) + 16;
        Y[i + Wd + 1] = ((66 * r3 + 129 * g3 + 25 * b3 + 128) >> 8) + 16;
        const R = r0 + r1 + r2 + r3, G = g0 + g1 + g2 + g3, B = b0 + b1 + b2 + b3;
        U[c] = ((-38 * R - 74 * G + 112 * B + 512) >> 10) + 128; V[c] = ((112 * R - 94 * G - 18 * B + 512) >> 10) + 128;
      }
    }
    return ab;
  }
  parentPort.on('message', ({ i, t }) => {
    tl.seek(t); draw(ctx, t);
    const ab = toI420(cv.data());
    parentPort.postMessage({ i, ab }, [ab]);
  });
} else {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const out = path.resolve(args[0]);
  const scene = opt('scene', 'scene.mjs');
  const fps = Number(opt('fps', 30));
  const timingFile = path.join(ROOT, 'audio/timing.json');
  const timing = fs.existsSync(timingFile) ? JSON.parse(fs.readFileSync(timingFile, 'utf8')) : null;
  const t0 = performance.now();

  if (opt('stills', null)) {
    const { tl, cv, ctx, draw } = await load(scene);
    fs.mkdirSync(out, { recursive: true });
    for (const t of opt('stills').split(',').map(Number)) {
      tl.seek(t); draw(ctx, t);
      fs.writeFileSync(path.join(out, `t${t.toFixed(2).padStart(7, '0')}.png`), cv.toBuffer('image/png'));
    }
    process.exit(0);
  }

  const { tl } = await load(scene);
  const from = Number(opt('from', 0)), to = Number(opt('to', timing?.duration || tl.duration));
  const n = Math.round((to - from) * fps);
  // frames where something changes since the previous frame; the rest repeat it
  const moving = [], movingSet = new Set();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    if (i === 0 || tl.spans.some(([a, b]) => a <= t && b > t - 1 / fps)) { moving.push(i); movingSet.add(i); }
  }
  // Workers: the CPU's threads minus four (x264, the main thread and the system); a few more or fewer can be faster.
  const W = Number(opt('workers', Math.max(1, Math.min(8, os.cpus().length - 4))));
  // Write to a .part file and rename at the end, so an interrupted render never looks like a finished cut.
  const part = out.replace(/(\.\w+)$/, '.part$1');
  const audio = path.join(ROOT, 'audio/narration.m4a');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${Wd}x${Ht}`, '-r', String(fps), '-i', '-',
    ...(fs.existsSync(audio) ? [...(from > 0 ? ['-ss', String(from)] : []), '-i', audio] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']),
    '-map', '0:v', '-map', '1:a',
    // ultrafast keeps x264 ahead of the workers. At crf 16 it looks the same as slower presets (SSIM 0.999 to a
    // lossless encode for both ultrafast and medium); its files are about twice the size.
    '-c:v', 'libx264', '-preset', opt('preset', 'ultrafast'), '-crf', opt('crf', '16'), '-tune', 'animation',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', part], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  const write = buf => ff.stdin.write(buf) ? null : new Promise(r => ff.stdin.once('drain', r));

  const ready = new Map(); let next = 0, prev = null, mi = 0, inflight = 0, held = 0, lastLog = t0;
  const workers = [...Array(W)].map(() => new Worker(new URL(import.meta.url), { workerData: { scene } }));
  let wake; const woken = () => new Promise(r => { wake = r; });
  const dispatch = w => {
    if (mi >= moving.length || inflight >= W * 3) return;
    const i = moving[mi++]; inflight++; w.postMessage({ i, t: from + i / fps });
  };
  for (const w of workers) {
    w.on('message', ({ i, ab }) => { inflight--; ready.set(i, Buffer.from(ab)); dispatch(w); wake?.(); });
    w.on('error', e => { console.error(e); process.exit(1); });
    dispatch(w); dispatch(w);
  }
  while (next < n) {
    if (ready.has(next)) { prev = ready.get(next); ready.delete(next); }
    else if (prev && !movingSet.has(next)) held++;
    else { await woken(); for (const w of workers) dispatch(w); continue; }
    const p = write(prev); if (p) await p;
    next++;
    if (performance.now() - lastLog > 5000) { lastLog = performance.now(); console.log(`frame ${next}/${n}  ${((lastLog - t0) / 1000).toFixed(0)}s`); }
  }
  ff.stdin.end();
  const code = await closed;
  for (const w of workers) w.terminate();
  if (code !== 0) { console.error('ffmpeg failed; partial file left at', part); process.exit(1); }
  fs.renameSync(part, out);
  const s = (performance.now() - t0) / 1000;
  console.log(`wrote ${out} (${n} frames, ${held} reused holds, ${W} workers, ${s.toFixed(1)}s = ${((to - from) / s).toFixed(1)}x realtime)`);
}
