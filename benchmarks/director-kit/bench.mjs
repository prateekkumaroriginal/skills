// Benchmark for the director skill's render kit: renders one fixed video and records the machine and the time.
//   npm install && node bench.mjs [--runs 2] [--quick] [--cpu-only] [--gpu nvenc,qsv] [--workers N] [--kit ../../skills/director/kit]
//   node bench.mjs --table      rebuild RESULTS.md from results/*.json
// The video is "The Two Brains Inside Your Computer", a 4 min 13 s explainer: 7,593 frames at 1920x1080, 30 fps, with a
// silent narration track. --quick renders its first 60 s.
// It is rendered with x264 and, where the machine has one the kit can use, with a GPU encoder. Each is rendered
// --runs times; the best time counts. The output is then checked: it must decode and have every frame.
// Recorded: operating system, CPU, thread count, memory, GPUs, power source, Node, FFmpeg and kit versions, and the
// results. Nothing that identifies the machine or its user (no host name, user name, paths or serial numbers).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = k => args.includes('--' + k);
const sh = (cmd, a, o = {}) => { try { const r = spawnSync(cmd, a, { encoding: 'utf8', timeout: 20000, windowsHide: true, ...o }); return r.status === 0 ? (r.stdout || '').trim() : ''; } catch { return ''; } };
const WORK = path.join(HERE, 'work'), RESULTS = path.join(HERE, 'results');

// ---------- the results table ----------
function table() {
  const rows = fs.readdirSync(RESULTS).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(path.join(RESULTS, f), 'utf8')));
  const cell = r => r ? (r.error ? 'failed' : `${r.best.toFixed(1)} s (${r.xRealtime.toFixed(1)}×)${r.valid ? '' : ' ⚠ invalid output'}`) : '';
  const lines = ['# Results', '', 'Time to render the benchmark video, best run, and how many times faster than the video plays. Lower time is better.', 'Rebuilt by `node bench.mjs --table` from `results/*.json`.', '',
    '| Date | CPU | Threads | RAM | OS | GPU | Power | Video | x264 | GPU encoder | Kit |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const d of rows) {
    const c = d.config, x = d.results.find(r => r.encoder === 'x264'), g = d.results.find(r => r.encoder !== 'x264' && !r.error) ?? d.results.find(r => r.encoder !== 'x264');
    lines.push(`| ${d.date} | ${c.cpu} | ${c.threads} | ${c.memoryGB} GB | ${c.os} ${c.arch} | ${c.gpu.join('; ') || 'none found'} | ${c.power} | ${d.video.seconds} s | ${cell(x)}${x && !x.error ? ` ${x.path}` : ''} | ${g ? `${g.encoder}: ${cell(g)}` : 'none'} | ${d.kit} |`);
  }
  fs.writeFileSync(path.join(HERE, 'RESULTS.md'), lines.join('\n') + '\n');
}
if (has('table')) { table(); console.log('wrote RESULTS.md'); process.exit(0); }

// ---------- what is needed ----------
const encoders = sh('ffmpeg', ['-hide_banner', '-encoders']);
if (!encoders.includes('libx264')) { console.error('FFmpeg with libx264 is needed on the PATH (ffmpeg and ffprobe).\n  macOS: brew install ffmpeg    Windows: winget install Gyan.FFmpeg    Linux: sudo apt install ffmpeg'); process.exit(1); }
if (!fs.existsSync(path.join(HERE, 'node_modules', '@napi-rs', 'canvas'))) { console.error('Run "npm install" in this folder first.'); process.exit(1); }
const KIT = path.resolve(HERE, opt('kit', '../../skills/director/kit'));
if (!fs.existsSync(path.join(KIT, 'render.mjs'))) { console.error(`The render kit was not found at ${KIT}; pass --kit <folder>.`); process.exit(1); }

// ---------- the project: the kit plus the benchmark's scene ----------
fs.rmSync(WORK, { recursive: true, force: true });
fs.cpSync(KIT, path.join(WORK, 'src'), { recursive: true });
fs.cpSync(path.join(HERE, 'project'), WORK, { recursive: true });
fs.mkdirSync(path.join(WORK, 'cuts'), { recursive: true });
const OUT = path.join(WORK, 'cuts', 'bench.mp4'), RENDER = path.join(WORK, 'src', 'render.mjs');
const ENV = { ...process.env, DISABLE_SYSTEM_FONTS_LOAD: '1' }; // only the bundled fonts: the same picture on every machine
delete ENV.VO_DIR; delete ENV.RENDER_FONTS;
const quick = has('quick'), seconds = quick ? 60 : JSON.parse(fs.readFileSync(path.join(WORK, 'audio', 'timing.json'), 'utf8')).duration, frames = Math.round(seconds * 30);
const clean = s => String(s).split(WORK).join('.').split(HERE).join('.').split(os.homedir()).join('~').replace(/ @ 0x[0-9a-f]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);

function render(encoder, to) {
  const a = [RENDER, OUT, '--enc', encoder, ...(to ? ['--to', String(to)] : []), ...(opt('workers') ? ['--workers', opt('workers')] : [])];
  const t0 = performance.now(), r = spawnSync(process.execPath, a, { encoding: 'utf8', env: ENV, timeout: 3600000, windowsHide: true }), s = (performance.now() - t0) / 1000;
  const m = /\((\d+) frames, (\d+) (?:held|reused holds), (\d+) workers/.exec(r.stdout || '');
  if (r.status !== 0 || !m) return { error: clean((r.stderr || '') + ' ' + (r.stdout || '')) || `exit ${r.status}` };
  return { s, frames: +m[1], held: +m[2], workers: +m[3] };
}
// the file must decode without errors and hold every frame
function valid(n) {
  const count = sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=nb_frames', '-of', 'csv=p=0', OUT]);
  const dec = spawnSync('ffmpeg', ['-v', 'error', '-xerror', '-i', OUT, '-f', 'null', '-'], { encoding: 'utf8', timeout: 600000, windowsHide: true });
  return +count === n && dec.status === 0;
}

// ---------- the machine ----------
function machine() {
  const p = os.platform(); let osName = `${os.type()} ${os.release()}`, gpu = [], power = 'unknown';
  if (p === 'linux') {
    osName = /PRETTY_NAME="?([^"\n]+)/.exec(sh('cat', ['/etc/os-release']))?.[1] ?? osName;
    gpu = sh('lspci', []).split('\n').filter(l => /VGA|3D|Display/i.test(l)).map(l => l.replace(/^\S+\s+[^:]+:\s*/, '').replace(/\s*\(rev .*\)$/, ''));
    try {
      const dir = '/sys/class/power_supply', sup = fs.readdirSync(dir), rd = f => { try { return fs.readFileSync(f, 'utf8').trim(); } catch { return ''; } };
      const bat = sup.some(s => rd(`${dir}/${s}/type`) === 'Battery'), ac = sup.some(s => rd(`${dir}/${s}/type`) === 'Mains' && rd(`${dir}/${s}/online`) === '1');
      power = !bat ? 'mains (no battery)' : ac ? 'mains' : 'battery';
      const prof = rd('/sys/firmware/acpi/platform_profile'); if (prof) power += `, ${prof} profile`;
    } catch {}
  } else if (p === 'darwin') {
    osName = `macOS ${sh('sw_vers', ['-productVersion'])}`;
    try { gpu = JSON.parse(sh('system_profiler', ['SPDisplaysDataType', '-json'])).SPDisplaysDataType.map(g => g.sppci_model).filter(Boolean); } catch {}
    const b = sh('pmset', ['-g', 'batt']); power = /AC Power/.test(b) ? (/InternalBattery/.test(b) ? 'mains' : 'mains (no battery)') : /Battery Power/.test(b) ? 'battery' : 'unknown';
  } else if (p === 'win32') {
    osName = os.version();
    const ps = c => sh('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', c]);
    gpu = ps('Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const st = ps('(Get-CimInstance Win32_Battery | Select-Object -First 1).BatteryStatus'); power = st === '' ? 'mains (no battery)' : st === '1' ? 'battery' : 'mains';
  }
  let canvas = ''; try { canvas = JSON.parse(fs.readFileSync(path.join(HERE, 'node_modules', '@napi-rs', 'canvas', 'package.json'), 'utf8')).version; } catch {}
  return { os: osName, arch: os.arch(), cpu: (os.cpus()[0]?.model ?? 'unknown').replace(/\s+/g, ' ').trim(), threads: os.availableParallelism(), memoryGB: Math.round(os.totalmem() / 2 ** 30),
    gpu, power, node: process.version, ffmpeg: /ffmpeg version (\S+)/.exec(sh('ffmpeg', ['-version']))?.[1] ?? 'unknown', canvas };
}
const config = machine();
let kit = sh('git', ['-C', KIT, 'rev-parse', '--short', 'HEAD']) || 'unknown'; if (kit !== 'unknown' && sh('git', ['-C', KIT, 'status', '--porcelain', '.'])) kit += '+changes';
// does the kit's in-process encoder load here, or does it go through an ffmpeg process?
const native = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(WORK, 'src', 'native', 'enc.node'))})`], { windowsHide: true }).status === 0;

// ---------- the runs ----------
const runs = Math.max(1, +opt('runs', 2)), results = [];
console.log(`${config.cpu}, ${config.threads} threads, ${config.memoryGB} GB, ${config.os} ${config.arch}, ${config.power}`);
console.log(`GPU: ${config.gpu.join('; ') || 'none found'}\nvideo: ${seconds} s, ${frames} frames at 1920x1080; kit ${kit}; ${runs} run${runs > 1 ? 's' : ''} per encoder\n`);
function bench(encoder) {
  const times = []; let last = null;
  for (let i = 0; i < runs; i++) {
    const r = render(encoder, quick ? 60 : 0); if (r.error) return { encoder, error: r.error };
    last = r; times.push(+r.s.toFixed(2)); console.log(`  ${encoder} run ${i + 1}: ${r.s.toFixed(1)} s`);
  }
  const best = Math.min(...times);
  return { encoder, path: (encoder === 'x264' || encoder === 'vaapi') && native ? 'in-process' : 'ffmpeg pipe', workers: last.workers, runs: times, best, xRealtime: +(seconds / best).toFixed(2), fps: +(frames / best).toFixed(1),
    framesDrawn: last.frames - last.held, framesHeld: last.held, fileMB: +(fs.statSync(OUT).size / 2 ** 20).toFixed(1), valid: last.frames === frames && valid(frames) };
}
results.push(bench('x264'));
if (!has('cpu-only')) {
  // the GPU encoders this system could have; the first that renders three seconds correctly is benchmarked
  // (--gpu names them instead, in the order to try)
  const cand = opt('gpu')?.split(',') ?? { linux: ['vaapi', 'nvenc', 'qsv', 'amf'], darwin: ['videotoolbox'], win32: ['nvenc', 'qsv', 'amf'] }[os.platform()] ?? [];
  let found = false;
  for (const e of cand) {
    if (!encoders.includes(`h264_${e}`)) continue;
    const t = render(e, 3);
    if (t.error || !valid(90)) { results.push({ encoder: e, error: t.error ?? 'the output did not decode or lacked frames' }); console.log(`  ${e}: not usable here`); continue; }
    results.push(bench(e)); found = true; break;
  }
  if (!found && !results.some(r => r.encoder !== 'x264')) console.log('  no GPU encoder that FFmpeg and the kit share on this system');
}

// ---------- the record ----------
const date = new Date().toISOString().slice(0, 10);
const record = { benchmark: 'director-kit', version: 1, date, kit, video: { seconds, frames, size: '1920x1080', fps: 30 }, config, results };
fs.mkdirSync(RESULTS, { recursive: true });
const slug = `${date}-${os.platform()}-${config.cpu.toLowerCase().replace(/\(r\)|\(tm\)|cpu|processor|@.*$/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}${quick ? '-quick' : ''}`;
let file = path.join(RESULTS, `${slug}.json`); for (let i = 2; fs.existsSync(file); i++) file = path.join(RESULTS, `${slug}-${i}.json`);
fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n'); table();
fs.rmSync(WORK, { recursive: true, force: true });
console.log('');
for (const r of results) console.log(r.error ? `${r.encoder}: failed (${r.error.slice(0, 120)})` : `${r.encoder} (${r.path}): ${r.best.toFixed(1)} s = ${r.xRealtime.toFixed(1)}x realtime, ${r.fps} frames/s, ${r.fileMB} MB${r.valid ? '' : '  OUTPUT INVALID'}`);
console.log(`\nrecorded in ${path.relative(process.cwd(), file)} and RESULTS.md`);
