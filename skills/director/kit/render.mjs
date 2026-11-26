// Render the scenes and encode them with the narration.
//   node src/render.mjs cuts/cut-01.mp4 [--from 0] [--to 10] [--fps 30] [--workers N] [--gop 60]
//       [--enc x264|vaapi|videotoolbox|nvenc|qsv|amf] [--preset ultrafast] [--crf 16] [--tune animation] [--qp 18]
//       [--bitrate 12M] [--device /dev/dri/renderD128] [--pipe]
//   node src/render.mjs OUTDIR --stills 1.5,3,7.25          (full-size PNGs, one per time)
//   [--scene scene.mjs]  scene module in src/, e.g. motion-tests.mjs
// Without audio/narration.m4a (look frame, style frames, motion tests) the video gets a silent track;
// without audio/timing.json, --to defaults to the end of the last animation.
//
// The video is cut into jobs of --gop frames that change. Each worker process takes jobs, seeks the timeline and
// draws with Skia only the nodes that change, on top of a plate of the ones that don't (plates.mjs). The part of the
// picture they touch is converted to YUV and encoded inside the worker (encoder.mjs), every job starting on a
// keyframe. A frame that repeats the previous one is never drawn or encoded: it is written into the H.264 stream
// directly as a picture of skipped macroblocks (h264.mjs), so the file keeps a constant frame rate. The jobs are
// joined without re-encoding.
//   --enc vaapi  encodes on the Intel/AMD GPU instead of x264 (Linux): a little faster, smaller files, slightly lower quality at --qp 18.
//   --enc qsv    encodes with Intel Quick Sync, through ffmpeg (run on Windows 11 with Iris Xe graphics).
//   --enc videotoolbox (macOS), nvenc, amf: the other GPU encoders, through ffmpeg. Their settings come from the
//                FFmpeg documentation and have not been run on such a machine yet; a stream the renderer can't use stops the render.
//   --pipe       encodes through an ffmpeg process, as happens by itself when native/enc.node can't be loaded.
//   PROF=1       prints where the time went.
import { spawn, spawnSync, fork } from 'node:child_process';
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
  return { tl, cv, ctx: cv.getContext('2d'), draw, G: await import('./graph.mjs') };
}

if (process.env.RENDER_WORKER) {
  // The first message names the scene (so loading starts at once), the second describes the render; the rest are
  // jobs, taken one at a time.
  const inbox = []; let got = null; process.on('message', m => { inbox.push(m); got?.(); });
  const take = async () => { while (!inbox.length) await new Promise(r => { got = r; }); return inbox.shift(); };
  const { tl, cv, ctx, draw, G } = await load((await take()).scene);
  const workerData = await take();
  const { plates } = await import('./plates.mjs'), { holds } = await import('./h264.mjs');
  const { fps, from } = workerData, moving = Buffer.from(workerData.moving, 'base64');
  tl.seek(from); draw(ctx, from); // the first draw numbers the nodes in paint order
  const pl = plates(tl, draw, G);
  const { openEncoder } = await import('./encoder.mjs');
  // The encoder is opened for the first job (a worker that gets none never opens one).
  let enc = null;
  const open = () => openEncoder({ Wd, Ht, ...workerData.enc,
    onJob: (job, stream) => {
      try { fs.writeFileSync(job.file, holds(stream, job.gaps)); process.send({ done: job.id }); }
      catch (e) { process.send({ error: `job ${job.id}: ${e.message}` }); }
    },
    onError: error => process.send({ error }) });
  // One job: frames i0..i1. Only frames that differ from the one before are drawn, and only the nodes that change
  // in them (plates.mjs); only the part of the picture they touch is converted to YUV again.
  const P = [0, 0, 0, 0, 0, 0];
  const run = async ({ id, i0, i1, file }) => {
    enc ??= open();
    const idx = [i0]; for (let i = i0 + 1; i < i1; i++) if (moving[i]) idx.push(i);
    const times = idx.map(i => from + i / fps);
    const q9 = performance.now(); pl.scan(times); P[1] += performance.now() - q9;
    let drawn = 0; const gaps = []; // gaps[k]: held frames after the k-th encoded one
    for (let j = 0; j < idx.length; j++) {
      const q0 = performance.now(), gap = (j + 1 < idx.length ? idx[j + 1] : i1) - idx[j] - 1; tl.seek(times[j]);
      if (pl.frame(ctx, j, times[j])) {
        const q1 = performance.now(); enc.convert(cv.data(), G.plate.rows);
        drawn++; P[0] += q1 - q0; P[2] += performance.now() - q1; P[4]++;
      } else if (enc.native) { gaps[gaps.length - 1] += gap + 1; continue; } // it looks the same as the frame before: held too
      gaps.push(gap);
      const q3 = performance.now(); await enc.send(gaps.length === 1); P[3] += performance.now() - q3; P[5]++;
    }
    await enc.endJob({ id, file, gaps });
    process.send({ fed: id, drawn, P });
  };
  for (;;) { const m = await take(); if (m.end) { await enc?.close(); process.send({ closed: true }); break; } await run(m); }
} else {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const out = path.resolve(args[0]);
  const scene = opt('scene', 'scene.mjs');
  const fps = Number(opt('fps', 30));
  const timingFile = path.join(ROOT, process.env.VO_DIR || 'audio', 'timing.json');
  const timing = fs.existsSync(timingFile) ? JSON.parse(fs.readFileSync(timingFile, 'utf8')) : null;
  const t0 = performance.now();

  // System fonts: one list from fontconfig, so no process has to read every font file (see graph.mjs).
  if (!process.env.DISABLE_SYSTEM_FONTS_LOAD) {
    const fc = spawnSync('fc-list', ['--format', '%{family}\t%{file}\n'], { encoding: 'utf8' });
    if (fc.status === 0 && fc.stdout) {
      const fonts = {};
      for (const line of fc.stdout.split('\n')) { const [fams, file] = line.split('\t'); if (file) for (const f of fams.split(',')) (fonts[f.trim().toLowerCase()] ??= []).push(file); }
      for (const f in fonts) fonts[f].sort();
      for (const g of ['sans-serif', 'serif', 'monospace', 'system-ui']) { const m = spawnSync('fc-match', ['--format', '%{file}', g], { encoding: 'utf8' }); if (m.status === 0 && m.stdout) fonts[g] = [m.stdout]; }
      process.env.RENDER_FONTS = path.join(os.tmpdir(), `render-fonts-${process.pid}.json`); fs.writeFileSync(process.env.RENDER_FONTS, JSON.stringify(fonts));
      process.env.DISABLE_SYSTEM_FONTS_LOAD = '1'; process.on('exit', () => fs.rmSync(process.env.RENDER_FONTS, { force: true }));
    }
  }

  if (opt('stills', null)) {
    const { tl, cv, ctx, draw } = await load(scene);
    fs.mkdirSync(out, { recursive: true });
    for (const t of opt('stills').split(',').map(Number)) {
      tl.seek(t); draw(ctx, t);
      fs.writeFileSync(path.join(out, `t${t.toFixed(2).padStart(7, '0')}.png`), cv.toBuffer('image/png'));
    }
    process.exit(0);
  }

  // Workers: half the CPU threads (more is slower on a laptop: the cores share one power budget and one memory bus).
  // They start loading the scene while this process does.
  const W = Number(opt('workers', Math.max(1, os.availableParallelism() >> 1)));
  const workers = [...Array(W)].map(() => { const w = fork(fileURLToPath(import.meta.url), [], { env: { ...process.env, RENDER_WORKER: '1' } }); w.send({ scene }); return w; });
  const fail = msg => { console.error(msg); for (const w of workers) w.kill(); process.exit(1); };
  const { tl } = await load(scene); const T = { load: performance.now() - t0 };
  const from = Number(opt('from', 0)), to = Number(opt('to', timing?.duration || tl.duration));
  const n = Math.round((to - from) * fps);
  // frames where something changes since the previous frame; the rest repeat it
  const moving = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    if (i === 0 || tl.spans.some(([a, b]) => a <= t && b > t - 1 / fps)) moving[i] = 1;
  }
  // Jobs: runs of frames holding --gop frames that change (the first of them a keyframe), plus the held frames
  // between them.
  const gop = Math.max(1, Number(opt('gop', 60)));
  // Write to a .part file and rename at the end, so an interrupted render never looks like a finished cut.
  const part = out.replace(/(\.\w+)$/, '.part$1');
  const tmp = out.replace(/(\.\w+)$/, '') + '.chunks';
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const chunks = [];
  for (let i = 0, c = null; i < n; i++) {
    if (i === 0 || (moving[i] && c.cost === gop)) chunks.push(c = { id: chunks.length, i0: i, i1: i, cost: 0, file: path.join(tmp, `${String(chunks.length).padStart(5, '0')}.h264`) });
    c.cost += i === c.i0 || moving[i]; c.i1 = i + 1;
  }
  // The encoder: x264, or h264_vaapi on the GPU. One reference frame, no B-frames and CAVLC are what h264.mjs needs
  // to add the held frames to the stream. encoder.mjs runs it inside the worker (native/enc.node) or, without that,
  // as an ffmpeg process that makes a keyframe exactly every `gop` pictures.
  const tune = opt('tune', ''), encoder = opt('enc', 'x264'), vaapi = encoder === 'vaapi', hw = encoder !== 'x264', device = opt('device', '/dev/dri/renderD128');
  const raw = ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', hw ? 'nv12' : 'yuv420p', '-s', `${Wd}x${Ht}`, '-r', String(fps), '-i', '-'];
  const tail = ['-g', String(gop), '-keyint_min', String(gop), '-bf', '0', '-flush_packets', '1', '-f', 'h264', 'pipe:1'];
  // x264: ultrafast at crf 16 looks the same as slower presets (SSIM 0.999 to a lossless encode for both ultrafast
  // and medium); its files are about twice the size.
  const x = { preset: opt('preset', 'ultrafast'), crf: opt('crf', '16'), ...(tune ? { tune } : {}), threads: '1', refs: '1', coder: 'vlc', sc_threshold: '0' };
  const qp = opt('qp', '18'), v = { qp, coder: 'cavlc' };
  const flags = o => Object.entries(o).flatMap(([k, val]) => ['-' + k, val]), dict = o => Object.entries(o).map(([k, val]) => `${k}=${val}`).join(':');
  const codecs = {
    x264: [...raw, '-c:v', 'libx264', ...flags(x), ...tail],
    vaapi: ['-vaapi_device', device, ...raw, '-vf', 'hwupload', '-c:v', 'h264_vaapi', ...flags(v), ...tail],
    videotoolbox: [...raw, '-c:v', 'h264_videotoolbox', '-profile:v', 'baseline', '-coder', 'cavlc', '-b:v', opt('bitrate', '12M'), '-allow_sw', '0', ...tail],
    nvenc: [...raw, '-c:v', 'h264_nvenc', '-rc', 'constqp', '-qp', qp, '-coder', 'cavlc', '-refs', '1', '-strict_gop', '1', ...tail],
    qsv: [...raw, '-c:v', 'h264_qsv', '-global_quality', qp, '-cavlc', '1', '-refs', '1', '-idr_interval', '0', '-bsf:v', 'filter_units=remove_types=6', ...tail],
    amf: [...raw, '-c:v', 'h264_amf', '-rc', 'cqp', '-qp_i', qp, '-qp_p', qp, '-coder', 'cavlc', '-refs', '1', '-header_spacing', String(gop), ...tail],
  };
  if (!codecs[encoder]) fail(`unknown --enc ${encoder}: use one of ${Object.keys(codecs).join(', ')}`);
  // only x264 and vaapi can run inside the worker
  const enc = { fps, nv12: hw, gop, device, pipe: args.includes('--pipe') || (hw && !vaapi), codec: vaapi ? 'h264_vaapi' : 'libx264',
    nativeOpts: vaapi ? dict({ ...v, async_depth: '4' }) : dict({ ...x, 'forced-idr': '1' }), ffArgs: codecs[encoder] };
  // The narration, cut to the video's length while the frames render. AAC from the start of the file is copied as
  // it is; anything else is encoded.
  const audio = path.join(ROOT, process.env.VO_DIR || 'audio', 'narration.m4a');
  const aFile = path.join(tmp, 'audio.m4a');
  const run = a => new Promise(r => spawn('ffmpeg', a, { stdio: ['ignore', 'inherit', 'inherit'] }).on('close', r));
  const has = fs.existsSync(audio);
  const isAac = has && from === 0 && await new Promise(r => { let o = ''; const p = spawn('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', audio]); p.stdout.on('data', d => { o += d; }); p.on('close', () => r(o.trim() === 'aac')); p.on('error', () => r(false)); });
  const audioDone = run(['-y', '-v', 'error', ...(has ? [...(from > 0 ? ['-ss', String(from)] : []), '-i', audio] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']),
    '-t', String(n / fps), '-vn', ...(isAac ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '192k']), aFile]);

  // Join: the jobs are one H.264 stream when put end to end. ffmpeg wraps it with the narration while the frames
  // render, taking each job as soon as every job before it is written. Room for the index is reserved at the start
  // of the file (what +faststart gives, without rewriting the file at the end).
  let muxAt = 0, mux = null, pumping = false, muxClosed; const muxed = new Promise(r => { muxClosed = r; });
  const pump = async () => {
    if (!mux || pumping) return; pumping = true;
    while (muxAt < chunks.length && chunks[muxAt].ready) if (!mux.stdin.write(fs.readFileSync(chunks[muxAt++].file))) await new Promise(r => mux.stdin.once('drain', r));
    pumping = false; if (muxAt === chunks.length) mux.stdin.end();
  };
  const join = extra => ['-y', '-v', 'error', '-r', String(fps), '-f', 'h264', '-i', 'pipe:0', '-i', aFile, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-video_track_timescale', '15360', ...extra, part];
  audioDone.then(code => {
    if (code !== 0) fail('ffmpeg failed on the narration');
    T.audio = performance.now() - t0;
    mux = spawn('ffmpeg', join(['-moov_size', String(65536 + n * 24 + Math.ceil(n / fps * 48000 / 1024) * 16)]), { stdio: ['pipe', 'inherit', 'inherit'] });
    mux.on('close', muxClosed); mux.stdin.on('error', () => {}); pump();
  });
  // Jobs go out in video order. (With the ffmpeg-pipe encoder the last job may be short: nothing follows it.)
  const queue = [...chunks];
  let done = 0, drawn = 0, left = chunks.length, open = 0, lastLog = t0; let finish; const all = new Promise(r => { finish = r; });
  const job = { fps, from, moving: Buffer.from(moving).toString('base64'), enc };
  for (const w of workers) {
    const next = () => w.send(queue.shift() ?? { end: true });
    open++; w.send(job);
    w.on('message', m => {
      if (m.error) fail(`${m.error}; jobs left in ${tmp}`);
      if (m.fed !== undefined) { T.firstJob ??= performance.now() - t0; w.P = m.P; drawn += m.drawn; next(); }
      if (m.done !== undefined) {
        done += chunks[m.done].i1 - chunks[m.done].i0; left--; chunks[m.done].ready = true; pump();
        if (performance.now() - lastLog > 5000) { lastLog = performance.now(); console.log(`frame ${done}/${n}  ${((lastLog - t0) / 1000).toFixed(0)}s`); }
      }
      if (m.closed && --open === 0) { if (left) fail('the encoders stopped before every job was written'); finish(); }
    });
    w.on('error', e => fail(e)); w.on('exit', code => { if (left > 0) fail(`a render worker stopped (exit ${code})`); });
    next();
  }
  await all; T.lastJob = performance.now() - t0;
  for (const w of workers) w.kill();
  if (process.env.PROF) { const S = [0, 0, 0, 0, 0, 0]; for (const w of workers) if (w.P) w.P.forEach((v, i) => S[i] += v); console.log(`in the workers: scan ${(S[1] / 1000).toFixed(1)}s; per drawn frame: draw ${(S[0] / S[4]).toFixed(1)} ms, to YUV ${(S[2] / S[4]).toFixed(1)} ms; encode ${(S[3] / S[5]).toFixed(1)} ms per frame`); }
  if (await muxed !== 0) {
    // the reserved room was too small (or the join failed): do it again the slow way, from the job files
    const m2 = spawn('ffmpeg', join(['-movflags', '+faststart']), { stdio: ['pipe', 'inherit', 'inherit'] }); m2.stdin.on('error', () => {});
    const closed = new Promise(r => m2.on('close', r));
    for (const c of chunks) if (!m2.stdin.write(fs.readFileSync(c.file))) await new Promise(r => m2.stdin.once('drain', r));
    m2.stdin.end();
    if (await closed !== 0) fail(`ffmpeg failed joining the jobs; they are left in ${tmp}`);
  }
  T.joined = performance.now() - t0; if (process.env.PROF) console.log('reached at (s):', Object.entries(T).map(([k, v]) => `${k} ${(v / 1000).toFixed(1)}`).join(', '));
  fs.renameSync(part, out); fs.rmSync(tmp, { recursive: true, force: true });
  const s = (performance.now() - t0) / 1000;
  console.log(`wrote ${out} (${n} frames, ${n - drawn} held, ${workers.length} workers, ${s.toFixed(1)}s = ${((to - from) / s).toFixed(1)}x realtime)`);
}
