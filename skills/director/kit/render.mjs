// Render the page in headless Chromium frame by frame and encode with the narration.
//   node src/render.mjs cuts/cut-01.mp4 [--from 0] [--to 10] [--fps 30] [--page index.html]
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

if (stills) {
  fs.mkdirSync(out, { recursive: true });
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate(tt => render(tt), t);
    await page.screenshot({ path: path.join(out, `t${t.toFixed(2).padStart(7, '0')}.png`) });
  }
  await browser.close();
  process.exit(0);
}

// Write to a .part file and rename at the end, so an interrupted render never looks like a finished cut.
const part = out.replace(/(\.\w+)$/, '.part$1');
const audio = path.join(ROOT, 'audio/narration.m4a');
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  ...(from > 0 ? ['-ss', String(from)] : []), '-i', audio, '-map', '0:v', '-map', '1:a',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-tune', 'animation',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', part], { stdio: ['pipe', 'inherit', 'inherit'] });
const n = Math.round((to - from) * fps);
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  await page.evaluate(tt => render(tt), from + i / fps);
  const buf = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 150 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
const code = await new Promise(r => ff.on('close', r));
await browser.close();
if (code !== 0) { console.error('ffmpeg failed; partial file left at', part); process.exit(1); }
fs.renameSync(part, out);
console.log('wrote', out);
