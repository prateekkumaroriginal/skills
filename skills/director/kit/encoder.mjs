// A render worker's encoder: the changed part of each frame in, one H.264 stream per job out.
//   convert(px, rows)  bring the encoder's YUV frame up to date with the canvas pixels px, in the bands `rows`
//   send(key)          encode the frame as it stands; key: it is the first of a job
//   endJob(meta)       the frames sent since the last endJob are one job; onJob(meta, stream) follows once it is encoded
//   close()            finish; resolves when every job has been handed to onJob
// Two ways to run the same encoders:
//   native  native/enc.node holds libavcodec in the worker itself: the conversion is compiled code and a frame goes
//           to the encoder without leaving the process. Each job starts on a forced keyframe.
//   pipe    an ffmpeg process fed raw frames through a pipe, kept for the life of the worker (starting one per job
//           costs more than it looks: ffmpeg opens some 400 files, and a virus scanner checks each). It makes a
//           keyframe every `gop` pictures and every job is padded to `gop` pictures, so its output is cut at the
//           keyframes (each starts with an SPS) to get the jobs back. Used when enc.node can't be loaded.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { converter, convertRows } from './yuv.mjs';

export function nativeEncoder() { try { return createRequire(import.meta.url)('./native/enc.node'); } catch { return null; } }

export function openEncoder({ Wd, Ht, fps, nv12, gop, codec, device, nativeOpts, ffArgs, pipe, onJob, onError }) {
  const N = pipe ? null : nativeEncoder();
  if (N) {
    const h = N.open(codec, Wd, Ht, fps, device ?? '', nativeOpts), pk = [], jobs = []; let count = 0;
    const route = () => { while (jobs.length && pk.length >= jobs[0].count) { const j = jobs.shift(); onJob(j.meta, Buffer.concat(pk.splice(0, j.count))); } };
    return {
      native: true,
      convert(px, rows) { N.convert(h, px, rows.x0, rows.x1); },
      send(key) { for (const p of N.encode(h, key)) pk.push(p); count++; route(); },
      endJob(meta) { jobs.push({ meta, count }); count = 0; route(); },
      async close() { for (const p of N.flush(h)) pk.push(p); route(); if (jobs.length) onError('the encoder returned fewer pictures than frames'); },
    };
  }
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'pipe', 'inherit'] });
  let broken = false, wake = null, sent = 0; ff.stdin.on('error', () => { broken = true; wake?.(); }); ff.stdin.on('drain', () => wake?.());
  const jobs = [], SC = Buffer.from([0, 0, 1]); let buf = Buffer.alloc(0), seen = 0;
  ff.stdout.on('data', d => {
    buf = buf.length ? Buffer.concat([buf, d]) : d;
    for (;;) { // an SPS after the start of the buffer begins the next job
      const at = buf.indexOf(SC, seen); if (at < 0 || at + 3 >= buf.length) { seen = Math.max(0, at < 0 ? buf.length - 2 : at); break; }
      const cut = at > 0 && buf[at - 1] === 0 ? at - 1 : at; seen = at + 3;
      if ((buf[at + 3] & 31) !== 7 || cut === 0) continue;
      if (jobs.length) onJob(jobs.shift(), buf.subarray(0, cut)); buf = buf.subarray(cut); seen = at - cut + 3;
    }
  });
  const closed = new Promise(r => ff.on('close', code => { if (code !== 0 || broken) onError('the encoder stopped'); else if (buf.length && jobs.length) onJob(jobs.shift(), buf); r(); }));
  const convert = converter(Wd, Ht, nv12), yuv = Buffer.alloc(Wd * Ht * 3 / 2);
  const write = async () => { if (!broken && !ff.stdin.write(yuv)) await new Promise(r => { wake = r; }); };
  return {
    native: false,
    convert(px, rows) { if (px.byteOffset % 4) px = Buffer.from(px); convertRows(convert, new Uint32Array(px.buffer, px.byteOffset, Wd * Ht), yuv, rows, Wd, Ht); },
    async send() { sent++; await write(); },
    async endJob(meta) { for (; sent < gop; sent++) await write(); sent = 0; jobs.push(meta); }, // holds() drops the padding
    async close() { ff.stdin.end(); await closed; },
  };
}
