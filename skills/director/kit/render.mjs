// Render the page in headless Chromium frame by frame and encode with the narration.
//   node src/render.mjs cuts/cut-01.mp4 [--from 0] [--to 10] [--fps 30] [--page index.html] [--workers N]
//   node src/render.mjs OUTDIR --stills 1.5,3,7.25          (full-size PNGs, one per time)
// The page must define build() (lay out everything once) and render(t) (show time t in seconds).
// audio/timing.json is exposed to the page as window.TIMING.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const out = path.resolve(args[0]);
const fps = Number(opt('fps', 30));
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio/timing.json'), 'utf8'));
const from = Number(opt('from', 0));
const to = Number(opt('to', timing.duration));
const stills = opt('stills', null);

// Chromium from Playwright's cache; install it once with `npx playwright-core install chromium`.
const cache = path.join(os.homedir(), '.cache/ms-playwright');
const exe = (fs.existsSync(cache) ? fs.readdirSync(cache) : [])
  .filter(d => d.startsWith('chromium-')).sort().reverse()
  .flatMap(d => ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe'].map(p => path.join(cache, d, p)))
  .find(fs.existsSync);
// One headless Chromium with the page built and ready to seek. Video renders run several in parallel.
async function openPage() {
  const browser = await chromium.launch({
    ...(exe ? { executablePath: exe } : {}),
    args: ['--allow-file-access-from-files', '--font-render-hinting=none'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exit(1); });
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.addInitScript(t => { window.TIMING = t; }, timing);
  await page.goto('file://' + path.join(HERE, opt('page', 'index.html')));
  // load every @font-face before laying out, so text measures the same on every machine
  await page.evaluate(async () => {
    await Promise.all([...document.fonts].map(f => f.load().catch(() => { throw new Error('font failed: ' + f.family + ' ' + f.weight); })));
    await document.fonts.ready;
    build();
  });
  // CDP's capture with optimizeForSpeed is lossless PNG and about 3x faster than page.screenshot()
  const cdp = await page.context().newCDPSession(page);
  const shot = async t => {
    await page.evaluate(tt => render(tt), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    return Buffer.from(data, 'base64');
  };
  return { browser, shot };
}

if (stills) {
  fs.mkdirSync(out, { recursive: true });
  const { browser, shot } = await openPage();
  for (const t of stills.split(',').map(Number))
    fs.writeFileSync(path.join(out, `t${t.toFixed(2).padStart(7, '0')}.png`), await shot(t));
  await browser.close();
  process.exit(0);
}

// Every frame depends only on its time, so the frames are split into one contiguous run per worker.
// Each worker encodes its run to a segment; the segments are joined without re-encoding and muxed with the narration.
// Output goes to a .part file renamed at the end, so an interrupted render never looks like a finished cut.
const part = out.replace(/(\.\w+)$/, '.part$1');
const segDir = part + '.segs';
fs.rmSync(segDir, { recursive: true, force: true });
fs.mkdirSync(segDir, { recursive: true });
const audio = path.join(ROOT, 'audio/narration.m4a');
const n = Math.round((to - from) * fps);
const workers = Math.max(1, Math.min(Number(opt('workers', Math.min(8, Math.floor(os.cpus().length / 2)))), Math.ceil(n / fps)));
const run = (cmd, a) => new Promise((res, rej) => {
  const p = spawn(cmd, a, { stdio: ['pipe', 'inherit', 'inherit'] });
  p.on('close', c => c === 0 ? res() : rej(new Error(cmd + ' exited ' + c)));
  return p;
});
const t0 = Date.now();
let done = 0;
const progress = setInterval(() => console.log(`frame ${done}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`), 5000);
async function worker(w) {
  const a = Math.floor(n * w / workers), b = Math.floor(n * (w + 1) / workers);
  const { browser, shot } = await openPage();
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-tune', 'animation', '-threads', '2',
    path.join(segDir, `seg${String(w).padStart(3, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let i = a; i < b; i++) {
    const buf = await shot(from + i / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    done++;
  }
  ff.stdin.end();
  const code = await closed;
  await browser.close();
  if (code !== 0) throw new Error(`ffmpeg failed on segment ${w}`);
}
try {
  await Promise.all([...Array(workers).keys()].map(worker));
  clearInterval(progress);
  const list = path.join(segDir, 'list.txt');
  fs.writeFileSync(list, fs.readdirSync(segDir).filter(f => f.endsWith('.mp4')).sort().map(f => `file '${f}'`).join('\n'));
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list,
    ...(from > 0 ? ['-ss', String(from)] : []), '-i', audio, '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', part]);
} catch (e) {
  clearInterval(progress);
  console.error(e.message, '- partial output left in', segDir);
  process.exit(1);
}
fs.rmSync(segDir, { recursive: true, force: true });
fs.renameSync(part, out);
console.log(`wrote ${out}  (${n} frames, ${workers} workers, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
