// The Two Brains Inside Your Computer — all scenes as one Motion sequence pinned to narration keywords (beat-sheet.md).
import { TIMING, node, background, draw as drawTree } from './graph.mjs';
import { C, T, calm, pixelColor } from './elements.mjs';

function K(p, w, n = 1) {
  const hits = TIMING.words.filter(x => x.p === p && x.w === w);
  if (!hits[n - 1]) throw new Error(`keyword ${p}:${w}#${n} not found`);
  return hits[n - 1].s;
}

export function build() {
  const seq = [];
  const at = (el, kf, t, o = {}) => seq.push([el, kf, { at: t, duration: 0.4, ease: 'easeInOut', ...o }]);
  // verbs (style.md Motion)
  const pop = (el, t, d = 0.35) => at(el, { opacity: [0, 1], scale: [0.82, 1] }, t, { duration: d, ease: 'backOut' });
  const popTo = (el, t, s, d = 0.35) => at(el, { opacity: [0, 1], scale: [s * 0.82, s] }, t, { duration: d, ease: 'backOut' });
  const out = (el, t, d = 0.22) => at(el, { opacity: 0 }, t, { duration: d, ease: 'easeIn' });
  const shrinkOut = (el, t, s = 1, d = 0.22) => at(el, { opacity: [1, 0], scale: [s, s * 0.9] }, t, { duration: d, ease: 'easeIn' });
  const open = (el, t, s = 1) => at(el, { opacity: [0, 1], scale: [0.7 * s, s] }, t, { duration: 0.5, ease: 'backOut' });
  const hop = (els, t, st = 0.07) => els.forEach((w, i) => at(w, { opacity: [0, 1], y: [30, 0] }, t + i * st, { duration: 0.35, ease: 'backOut' }));
  const pulse = (el, t, s = 1, a = 0.06) => at(el, { scale: [s, s * (1 + a), s] }, t, { duration: 0.4, ease: 'easeOut' });
  const dim = (el, t, v = 0.35) => at(el, { opacity: v }, t, { duration: 0.3 });
  const move = (el, t, d, kf, ease = 'easeInOut') => at(el, kf, t, { duration: d, ease });
  const set = (el, t, kf) => at(el, kf, t, { duration: 0.01, ease: 'linear' }); // only while el is hidden
  const draw = (el, t, d = 0.65) => at(el, { progress: [0, 1] }, t, { duration: d, ease: 'easeInOut' });
  const ringIn = (el, t) => at(el, { opacity: [0, 1], scale: [1.25, 1] }, t, { duration: 0.3, ease: 'easeOut' });
  const count = (el, a, b, t, d, fmt) => { const v = { v: a }; el.textFrom(v, fmt, t); at(v, { v: [a, b] }, t, { duration: d, ease: 'circOut' }); };
  const stage = (el, steps) => steps.forEach(([t, str]) => { el.textFrom({ v: 0 }, () => str, t); if (t > 0) seq.push([{ tick: 0 }, { tick: [0, 1] }, { at: t - 0.02, duration: 0.1 }]); });
  const cam = (t, d, cx, cy, z) => at(world, { x: 960 - cx * z, y: 540 - cy * z, scale: z }, t, { duration: d });
  const cap = (text, cx, cy, o = {}) => node('pill', overlay, cx, cy, { text, color: C.panel, fg: C.ink, borderWidth: 3, borderColor: C.line, align: 'center', opacity: 0, ...o });

  const bg = background(ctx => { ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 1920, 1080); });
  const root = node('group', null, 0, 0, { w: 1920, h: 1080 });
  const world = node('group', root, 0, 0, { w: 1920, h: 1080, ox: 0, oy: 0 });
  const overlay = node('group', root, 0, 0, { w: 1920, h: 1080 });

  // ================= shared actors =================
  // tablet: 960×640 centred at (960,520); its screen holds photo / game / chat side by side
  const tablet = node('tablet', world, 480, 200, { w: 960, h: 640, opacity: 0 });
  const SW = 908, SH = 588;
  const photo = node('photo', tablet, 0, 0, { w: SW, h: SH, opacity: 0, dark: 0, lit: 0, litEdge: 0 });
  const game = node('game', tablet, SW, 0, { w: SW, h: SH, carX: 0.12, score: 0 });
  const chat = node('group', tablet, SW, 0, { w: SW, h: SH });
  node('box', chat, 0, 0, { w: SW, h: SH, fill: '#FFFFFF' });
  const bubble = node('bubble', chat, 120, 250, { text: 'What should I cook tonight?', color: C.aiSoft, ox: 0, oy: 1, opacity: 0 });
  // pixel grid over the boy's face (photo units: 640 wide → 1.41875 px per unit)
  const PU = SW / 640;
  const pix = node('pixels', tablet, 187.6, 111.9, { w: 320, h: 180, cell: 20, gap: 1.6, sx: 132, sy: 79, sw: 225, opacity: 0 });
  const pixRing = node('ring', tablet, 187.6 + 5 * 20 - 3, 111.9 + 5 * 20 - 3, { w: 26, h: 26, radius: 5, width: 1.6, opacity: 0 });

  // CPU chip 640×400 with 8 workers; GPU chip 560×350 with a crowd
  const cpu = node('chip', world, 1060, 260, { w: 640, h: 400, color: C.cpu, soft: C.cpuSoft, label: 'CPU', opacity: 0 });
  const cpuW = [...Array(8)].map((_, i) => node('worker', cpu, 50 + (i % 4) * 140, 112 + Math.floor(i / 4) * 135, { s: 112, color: C.cpu, big: true, opacity: 0, lit: 0 }));
  const gpu = node('chip', world, 1170, 150, { w: 560, h: 350, color: C.gpu, soft: C.gpuSoft, label: 'GPU', opacity: 0 });
  const crowd = node('crowd', gpu, 32, 100, { cols: 20, rows: 8, s: 28, gapX: 2.4, gapY: 2.5, color: C.gpu, shown: 0, lit: 0, litAll: 0, wave: -1, band: 0.16 });

  // ================= Scene 1 — two helpers on one tablet =================
  const t1 = K(1, 'family');
  at(tablet, { opacity: [0, 1], scale: [0.85, 1] }, t1, { duration: 0.5, ease: 'backOut' });
  at(photo, { opacity: [0, 1] }, K(1, 'photo'), { duration: 0.4 });
  move(photo, K(1, 'game'), 0.6, { x: -SW }); move(game, K(1, 'game'), 0.6, { x: -SW });
  move(game, K(1, 'ai'), 0.6, { x: -2 * SW }); move(chat, K(1, 'ai'), 0.6, { x: -SW });
  at(bubble, { opacity: [0, 1], scale: [0.5, 1] }, K(1, 'ai') + 0.5, { duration: 0.45, ease: 'backOut' });
  const tTwo = K(1, 'two');
  move(tablet, tTwo - 0.2, 0.7, { y: -170, scale: 0.55 });
  move(chat, tTwo - 0.2, 0.6, { x: 0 }); move(photo, tTwo - 0.2, 0.6, { x: 0 });
  const c1 = node('chip', world, 560, 640, { w: 330, h: 230, color: C.cpu, soft: C.cpuSoft, label: 'CPU', opacity: 0 });
  const g1 = node('chip', world, 990, 600, { w: 420, h: 300, color: C.gpu, soft: C.gpuSoft, label: 'GPU', opacity: 0 });
  open(c1, tTwo + 0.4); open(g1, tTwo + 0.55);
  const title = node('text', overlay, 960, 34, { text: 'The two brains inside your computer', size: T.title, weight: 700, color: C.ink, align: 'center', opacity: 0 });
  at(title, { opacity: [0, 1], y: [12, 0] }, K(1, 'helpers') + 0.2, { duration: 0.5, ease: 'easeOut' });

  // ================= Scene 2 — a picture is made of tiny dots =================
  const t2 = K(2, 'first') - 0.3;
  at(title, { opacity: 0, y: -20 }, t2, { duration: 0.25, ease: 'easeIn' });
  at(c1, { opacity: 0, y: 60 }, t2, { duration: 0.25, ease: 'easeIn' }); at(g1, { opacity: 0, y: 60 }, t2 + 0.05, { duration: 0.25, ease: 'easeIn' });
  move(tablet, t2 + 0.25, 0.7, { y: 0, scale: 1 });
  move(chat, t2 + 0.25, 0.6, { x: 0 }); move(photo, t2 + 0.25, 0.6, { x: 0 }); set(game, t2 + 0.25, { x: SW });
  // push in on the boy's face: world (853.6, 427.9) at 6×
  const FX = 506 + 245 * PU, FY = 226 + 142.3 * PU;
  cam(K(2, 'zoom'), 1.8, FX, FY, 6);
  at(pix, { opacity: [0, 1] }, K(2, 'tiny'), { duration: 0.3, ease: 'linear' });
  at(photo, { opacity: 0 }, K(2, 'tiny') + 0.15, { duration: 0.25, ease: 'linear' });
  ringIn(pixRing, K(2, 'pixels'));
  const pixPill = node('pill', overlay, 660, 470, { text: 'pixel', color: C.light, fg: C.ink, align: 'center', opacity: 0 });
  pop(pixPill, K(2, 'pixels') + 0.1);
  const [pr, pg, pb] = pixelColor(pix, 5, 5);
  const rgbCard = node('box', overlay, 1060, 300, { w: 420, h: 330, radius: 20, fill: C.panel, borderWidth: 3, borderColor: C.line, shadow: { y: 14, blur: 34, color: 'rgba(60,40,10,.16)' }, opacity: 0 });
  node('text', rgbCard, 36, 56, { text: 'This dot is:', size: T.small, weight: 700, color: C.muted });
  const rgbRows = [['red', pr, '#D9483B', K(2, 'red')], ['green', pg, '#2E9B4F', K(2, 'green')], ['blue', pb, '#2F6FD6', K(2, 'blue')]].map(([name, v, col, t], i) => {
    const r = node('group', rgbCard, 36, 112 + i * 70, { w: 340, h: 60, opacity: 0 });
    node('box', r, 0, 8, { w: 44, h: 44, radius: 10, fill: col });
    node('text', r, 64, 30, { text: `${name}  ${v}`, size: T.body, weight: 700, color: C.ink });
    at(r, { opacity: [0, 1], x: [-30, 0] }, t, { duration: 0.35, ease: 'easeOut' });
    return r;
  });
  at(rgbCard, { opacity: [0, 1], x: [-120, 0] }, K(2, 'numbers') - 0.2, { duration: 0.45, ease: 'easeOut' });
  const tFill = K(2, 'fills') - 0.3;
  shrinkOut(pixPill, tFill); out(rgbCard, tFill); out(pixRing, tFill);
  at(photo, { opacity: 1 }, tFill + 0.2, { duration: 0.3, ease: 'linear' }); at(pix, { opacity: 0 }, tFill + 0.45, { duration: 0.25, ease: 'linear' });
  cam(tFill + 0.2, 1.4, 960, 540, 1);
  const dots = node('text', overlay, 960, 900, { text: 'about 2,000,000 dots', size: T.counter, weight: 700, color: C.ink, align: 'center', opacity: 0 });
  count(dots, 0, 2000000, K(2, 'two') - 0.1, 1.2, v => `about ${calm(v, 50000)} dots`);
  at(dots, { opacity: [0, 1] }, K(2, 'two') - 0.1, { duration: 0.3 });

  // ================= Scene 3 — meet the CPU =================
  const t3 = K(3, 'the') - 0.2;
  out(dots, t3);
  move(tablet, t3, 0.8, { x: -460, scale: 0.55 });
  open(cpu, K(3, 'cpu')); dim(tablet, K(3, 'cpu') + 0.3, 0.35);
  const cpuCap = cap('Central Processing Unit', 1380, 690, { color: C.cpuSoft, fg: C.cpu, borderWidth: 0 });
  pop(cpuCap, K(3, 'central'));
  hop(cpuW, K(3, 'team'));
  cpuW.forEach((w, i) => pulse(w, K(3, 'clever') + i * 0.03, 1, 0.08));
  const steps = ['step 1', 'step 2', 'step 3'].map((s, i) => node('pill', overlay, 1100 + i * 190, 800, { text: s, icon: 'check', color: C.cpu, fs: T.small, opacity: 0 }));
  [K(3, 'step'), K(3, 'step', 2), K(3, 'fast')].forEach((t, i) => pop(steps[i], t));
  const jobs = [['mail', 'email'], ['spell-check', 'spelling'], ['signpost', 'deciding']].map(([ic, s], i) => node('pill', overlay, 1060 + i * 225, 800, { text: s, icon: ic, color: C.cpuSoft, fg: C.cpu, fs: T.small, opacity: 0, shadow: false }));
  steps.forEach((s, i) => out(s, K(3, 'email') - 0.3 + i * 0.03));
  [K(3, 'email'), K(3, 'spelling'), K(3, 'deciding')].forEach((t, i) => pop(jobs[i], t));
  pulse(cpu, K(3, 'anything'), 1, 0.04); pulse(cpu, K(3, 'home'), 1, 0.04);
  const cpuCount = cap('4 to 24 workers in a home computer', 1380, 150, { fs: T.small });
  pop(cpuCount, K(3, 'four'));
  jobs.forEach(j => dim(j, K(3, 'four'), 0.4));

  // ================= Scene 4 — brighten the photo, CPU style =================
  const t4 = K(4, 'now') - 0.2;
  [cpuCap, cpuCount, ...jobs].forEach((e, i) => out(e, t4 + i * 0.03));
  at(tablet, { opacity: 1, x: -340, y: 40, scale: 0.8 }, t4 + 0.15, { duration: 0.8 });
  move(cpu, t4 + 0.15, 0.8, { x: 60, y: 10, scale: 0.85 });
  at(photo, { dark: [0, 1] }, K(4, 'dark'), { duration: 0.6 });
  const btn = node('pill', overlay, 620, 900, { text: 'Brighten', icon: 'sun', color: C.light, fg: C.ink, align: 'center', opacity: 0 });
  pop(btn, K(4, 'brighten') - 0.1); at(btn, { scale: [1, 0.88, 1] }, K(4, 'brighten') + 0.35, { duration: 0.3, ease: 'easeOut' });
  const rule = node('pill', overlay, 960, 40, { text: 'For every dot: add a little light', icon: 'sun', color: C.light, fg: C.ink, align: 'center', opacity: 0 });
  at(rule, { opacity: [0, 1], y: [-80, 0] }, K(4, 'for'), { duration: 0.45, ease: 'easeOut' });
  shrinkOut(btn, K(4, 'for') + 0.6);
  cpuW.forEach((w, i) => at(w, { lit: [0, 1] }, K(4, 'cpu') + i * 0.04, { duration: 0.3, ease: 'easeOut' }));
  const arr1 = node('arrow', world, 1155, 420, { dx: -135, dy: 90, bend: -0.3, color: C.cpu, progress: 0 });
  draw(arr1, K(4, 'cpu') + 0.2);
  at(photo, { litEdge: [0, 1] }, K(4, 'take'), { duration: 0.2 });
  const crawlEnd = K(8, 'so');
  at(photo, { lit: [0, 0.15] }, K(4, 'take'), { duration: 10, ease: 'linear' });
  at(photo, { lit: [0.15, 0.22] }, K(4, 'take') + 10, { duration: crawlEnd - K(4, 'take') - 10, ease: 'linear' });
  const eight = node('pill', overlay, 1440, 680, { text: '8 at a time', color: C.cpu, align: 'center', opacity: 0 });
  pop(eight, K(4, 'only'));
  const twoM = node('pill', overlay, 620, 880, { text: '2,000,000 dots', color: C.panel, fg: C.ink, borderWidth: 3, borderColor: C.line, align: 'center', opacity: 0 });
  pop(twoM, K(4, 'two')); pulse(twoM, K(4, 'long'), 1, 0.08);

  // ================= Scenes 5–6 — meet the GPU =================
  const t5 = K(5, 'enter') - 0.4;
  out(arr1, t5); out(twoM, t5); out(eight, t5 + 0.05);
  // CPU side compresses to the left half: chip top-left (centre 470,325), tablet bottom-left (centre 470,755)
  move(cpu, t5 + 0.1, 0.8, { x: -910, y: -135, scale: 0.78 });
  move(tablet, t5 + 0.1, 0.8, { x: -490, y: 235, scale: 0.62 });
  open(gpu, K(5, 'gpu'));
  at(cpu, { opacity: 0.5 }, K(5, 'gpu') + 0.2, { duration: 0.3 }); at(tablet, { opacity: 0.5 }, K(5, 'gpu') + 0.2, { duration: 0.3 });
  const gpuCap = cap('Graphics Processing Unit', 1450, 520, { color: C.gpuSoft, fg: C.gpu, borderWidth: 0 });
  pop(gpuCap, K(5, 'graphics'));
  pulse(cpu, K(5, 'few'), 0.78, 0.05);
  at(crowd, { shown: [0, 1] }, K(5, 'thousands'), { duration: 0.8, ease: 'linear' });
  out(gpuCap, K(5, 'sixteen') - 0.4);
  const gpuCount = node('text', overlay, 1450, 545, { text: '', size: T.head, weight: 700, color: C.gpu, align: 'center', opacity: 0 });
  count(gpuCount, 0, 16000, K(5, 'sixteen'), 1.4, v => `A big GPU: over ${calm(v, 500)}`);
  at(gpuCount, { opacity: [0, 1] }, K(5, 'sixteen'), { duration: 0.3 });
  const gpuCount2 = node('text', overlay, 1450, 610, { text: 'tiny workers', size: T.head, weight: 700, color: C.gpu, align: 'center', opacity: 0 });
  at(gpuCount2, { opacity: [0, 1] }, K(5, 'sixteen') + 0.6, { duration: 0.3 });
  // "none is very smart … all follow the same instruction": push toward the GPU, the instruction travels in, then every worker lights at once
  out(gpuCount, K(6, 'on') - 0.1); out(gpuCount2, K(6, 'on') - 0.1);
  dim(cpu, K(6, 'on') - 0.1, 0.3); dim(tablet, K(6, 'on') - 0.1, 0.3);
  cam(K(6, 'own') - 0.2, 1.0, 1300, 380, 1.1);
  const ins = node('pill', overlay, 960, 40, { text: 'add a little light', icon: 'sun', color: C.light, fg: C.ink, fs: T.small, align: 'center', opacity: 0 });
  at(ins, { opacity: [0, 1, 1, 0], x: [0, 180, 0, 0], y: [0, 160, 420, 440], scale: [1, 1, 0.8, 0.3] }, K(6, 'instruction') - 0.3, { duration: 1.0, times: [0, 0.35, 0.85, 1], ease: 'easeInOut' });
  at(crowd, { litAll: [0, 1, 1, 0] }, K(6, 'same', 2), { duration: 1.1, times: [0, 0.15, 0.6, 1], ease: 'easeOut' });
  cam(K(6, 'same', 2) + 0.3, 1.0, 960, 540, 1);

  // ================= Scene 6 — the GPU does it, all at once =================
  const t7 = K(7, 'gpu') - 0.3;
  at(cpu, { opacity: 1 }, t7, { duration: 0.3 }); at(tablet, { opacity: 1 }, t7, { duration: 0.3 });
  const gph = node('photo', world, 1170, 580, { w: 560, h: 350, dark: 1, flash: 0, opacity: 0 });
  pop(gph, K(7, 'gpu'));
  const gridL = node('pixels', world, 1170, 580, { w: 560, h: 350, cell: 35, gap: 3, sx: 0, sy: 0, sw: 640, opacity: 0 });
  at(gridL, { opacity: [0, 0.35] }, K(7, 'dot'), { duration: 0.3 });
  pulse(rule, K(7, 'instruction'), 1, 0.08);
  out(gridL, K(7, 'brighten') - 0.1, 0.2);
  [[K(7, 'brighten'), 0.66], [K(7, 'wave'), 0.33], [K(7, 'wave', 2), 0]].forEach(([t, d]) => {
    at(gph, { dark: d }, t, { duration: 0.4, ease: 'easeOut' });
    at(gph, { flash: [0, 1, 0] }, t, { duration: 0.45, times: [0, 0.3, 1], ease: 'easeOut' });
    at(crowd, { lit: [0, 1, 0] }, t - 0.05, { duration: 0.6, times: [0, 0.7, 1], ease: 'easeInOut' });
  });
  const gRing = node('ring', world, 1158, 568, { w: 584, h: 374, radius: 26, opacity: 0 });
  ringIn(gRing, K(7, 'done'));
  const done = node('pill', overlay, 1450, 890, { text: 'Done!', icon: 'check', color: C.gpu, align: 'center', opacity: 0 });
  pop(done, K(7, 'done') + 0.1);
  const vs = node('text', overlay, 960, 700, { text: 'vs', size: T.title, weight: 700, color: C.ink, align: 'center', opacity: 0 });
  pop(vs, K(7, 'done') + 0.25);
  // stadium analogy
  const tS = K(7, 'stadium') - 0.15;
  at(world, { opacity: 0 }, tS, { duration: 0.35 }); [rule, done, vs].forEach(e => out(e, tS, 0.35));
  const stadBg = node('box', overlay, 470, 190, { w: 980, h: 660, radius: 30, fill: C.bg, borderWidth: 3, borderColor: C.line, shadow: { y: 18, blur: 40, color: 'rgba(60,40,10,.18)' }, opacity: 0 });
  const stad = node('stadium', overlay, 528, 226, { cols: 16, rows: 8, s: 54, flip: 0, opacity: 0 });
  at(stadBg, { opacity: [0, 1], scale: [0.85, 1] }, tS + 0.1, { duration: 0.5, ease: 'backOut' });
  at(stad, { opacity: [0, 1], scale: [0.85, 1] }, tS + 0.1, { duration: 0.5, ease: 'backOut' });
  at(stad, { flip: [0, 1] }, K(7, 'cards') - 0.1, { duration: 1.7, ease: 'easeInOut' });

  // ================= Scene 7 — why we still need the CPU =================
  const t8 = K(8, 'so') - 0.3;
  shrinkOut(stad, t8 - 0.3, 1, 0.6); shrinkOut(stadBg, t8 - 0.3, 1, 0.6);
  [gph, gRing, tablet].forEach(e => set(e, t8, { opacity: 0 })); at(world, { opacity: 1 }, t8 + 0.3, { duration: 0.4 });
  at(photo, { dark: 0, lit: 0, litEdge: 0 }, t8 + 0.5, { duration: 0.01 });
  cpuW.forEach(w => at(w, { lit: 0 }, t8, { duration: 0.3 }));
  move(cpu, t8 + 0.3, 0.8, { x: -820, y: -40, scale: 0.9 });   // centre (560, 420)
  move(gpu, t8 + 0.3, 0.8, { x: -90, y: 95 });                  // centre (1360, 420)
  const noPlan = cap("Can't plan or decide", 1360, 640, { color: C.gpuSoft, fg: C.gpu, borderWidth: 0 });
  pulse(gpu, K(8, 'simple'), 1, 0.05);
  pop(noPlan, K(8, 'plan'));
  pulse(cpu, K(8, 'cpu'), 0.9); dim(gpu, K(8, 'cpu') + 0.1, 0.4); dim(noPlan, K(8, 'cpu') + 0.1, 0.4);
  const runs = cap('Runs the computer', 560, 640, { color: C.cpuSoft, fg: C.cpu, borderWidth: 0 });
  pop(runs, K(8, 'runs'));
  const arr2 = node('arrow', world, 870, 300, { dx: 200, dy: 0, bend: 0.25, color: C.cpu, progress: 0 });
  draw(arr2, K(8, 'hands'));
  at(gpu, { opacity: 1 }, K(8, 'hands'), { duration: 0.3 });
  const job = node('pill', world, 870, 195, { text: 'big, repetitive job', color: C.cpu, fs: T.small, align: 'center', opacity: 0 });
  at(job, { opacity: [0, 1, 1, 0], x: [0, 125, 250, 280], y: [0, -50, 0, 30], scale: [0.8, 1, 1, 0.5] }, K(8, 'big'), { duration: 1.6, times: [0, 0.4, 0.85, 1], ease: 'easeInOut' });
  // kitchen
  const tK = K(8, 'like') - 0.2;
  [cpu, gpu, noPlan, runs, arr2].forEach((e, i) => out(e, tK + i * 0.03, 0.3));
  const chef = node('worker', world, 260, 330, { s: 320, color: C.cpu, big: true, hat: true, opacity: 0 });
  hop([chef], K(8, 'chef') - 0.15);
  const chefCap = cap('Plans, decides', 388, 720, { color: C.cpu, fg: '#FFFFFF', borderWidth: 0 });
  pop(chefCap, K(8, 'plans'));
  const helpers = [...Array(18)].map((_, i) => node('worker', world, 820 + (i % 6) * 150, 300 + Math.floor(i / 6) * 150, { s: 120, color: C.gpu, tool: 'knife', opacity: 0 }));
  hop(helpers, K(8, 'helpers') - 0.1, 0.03);
  const helpCap = cap('Repeats one step on lots of things', 1260, 800, { color: C.gpu, fg: '#FFFFFF', borderWidth: 0 });
  pop(helpCap, K(8, 'chops'));
  const carrots = [...Array(14)].map((_, i) => node('icon', world, 820 + i * 62, 900, { icon: 'carrot', size: 56, color: C.cpu, opacity: 0 }));
  carrots.forEach((c, i) => at(c, { opacity: [0, 1], y: [-40, 0] }, K(8, 'mountain') - 0.2 + i * 0.04, { duration: 0.3, ease: 'backOut' }));
  helpers.forEach((h, i) => at(h, { y: [0, 8, 0, 8, 0] }, K(8, 'mountain') + 0.2, { duration: 0.8, ease: 'easeInOut' }));

  // ================= Scene 8 — games =================
  const t9 = K(9, 'video') - 0.3;
  [chef, chefCap, helpCap, ...helpers, ...carrots].forEach((e, i) => out(e, t9 + Math.min(i, 10) * 0.01, 0.3));
  set(tablet, t9, { x: 0, y: -50, scale: 0.8 }); set(photo, t9, { x: -SW }); set(game, t9, { x: -SW }); set(chat, t9, { x: 0 });
  at(tablet, { opacity: [0, 1], scale: [0.68, 0.8] }, t9 + 0.3, { duration: 0.5, ease: 'backOut' });
  at(game, { carX: [0.08, 0.92] }, K(9, 'paints') - 0.2, { duration: 7, ease: 'linear' });
  const sixty = cap('60 new pictures every second', 960, 790);
  pop(sixty, K(9, 'sixty'));
  // GPU on the right (centre 1650,470 at 0.6), CPU on the left (centre 280,470 at 0.6)
  set(gpu, K(9, 'colour') - 0.4, { x: 200, y: 145, scale: 0.6 }); set(cpu, K(9, 'colour') - 0.4, { x: -1100, y: 10, scale: 0.6 });
  pulse(tablet, K(9, 'colour'), 0.8, 0.03);
  open(cpu, K(9, 'cpu') - 0.1, 0.6);
  const rules = cap('game rules', 280, 640, { color: C.cpuSoft, fg: C.cpu, borderWidth: 0 });
  pop(rules, K(9, 'decides'));
  const arr3 = node('arrow', world, 500, 470, { dx: 90, dy: 0, bend: 0.3, color: C.cpu, progress: 0 });
  draw(arr3, K(9, 'button') - 0.2, 0.5);
  at(game, { score: [0, 1] }, K(9, 'button') + 0.1, { duration: 0.2, ease: 'linear' });
  pulse(tablet, K(9, 'button') + 0.1, 0.8, 0.02);
  open(gpu, K(9, 'gpu') - 0.15, 0.6); dim(cpu, K(9, 'gpu') - 0.2, 0.4); dim(rules, K(9, 'gpu') - 0.2, 0.4);
  const arr4 = node('arrow', world, 1460, 470, { dx: -90, dy: 0, bend: 0.3, color: C.gpu, progress: 0 });
  at(crowd, { wave: [-0.3, 1.3] }, K(9, 'paints', 2) - 0.2, { duration: 1.2, ease: 'easeInOut' });
  draw(arr4, K(9, 'paints', 2) + 0.4, 0.5);

  // ================= Scene 9 — the day game chips became AI chips =================
  const t10 = K(10, 'then') - 0.3;
  [tablet, gpu, cpu, sixty, rules, arr3, arr4].forEach((e, i) => out(e, t10 + i * 0.03, 0.3));
  const year = node('pill', overlay, 960, 380, { text: '2012', icon: 'calendar', color: C.panel, fg: C.ink, borderWidth: 3, borderColor: C.line, fs: T.counter, align: 'center', opacity: 0 });
  pop(year, K(10, '2012') - 0.1, 0.45);
  move(year, K(10, 'researchers') - 0.5, 0.7, { y: -330, scale: 0.7 });
  const thumbs = ['cat', 'car', 'flower-2', 'sailboat'].map((ic, i) => node('thumb', world, 150 + (i % 2) * 160, 330 + Math.floor(i / 2) * 160, { icon: ic, s: 140, opacity: 0 }));
  thumbs.forEach((th, i) => pop(th, K(10, 'researchers') + 0.1 + i * 0.25));
  thumbs.forEach((th, i) => pulse(th, K(10, 'photos') + i * 0.08, 1, 0.08));
  const million = node('text', overlay, 380, 690, { text: '', size: T.head, weight: 700, color: C.ink, align: 'center', opacity: 0 });
  count(million, 0, 1.2, K(10, 'million') - 0.2, 1.0, v => `${v.toFixed(1)} million photos`);
  at(million, { opacity: [0, 1] }, K(10, 'million') - 0.2, { duration: 0.3 });
  const cards = [0, 1].map(i => node('gpucard', world, 760, 320 + i * 190, { w: 400, h: 150, opacity: 0 }));
  cards.forEach((c, i) => pop(c, K(10, 'two') + i * 0.15));
  const gamesCap = cap('2 GPUs made for video games', 960, 690, { fs: T.small });
  pop(gamesCap, K(10, 'video') - 0.1);
  thumbs.forEach((th, i) => {
    const tx = 960 - (th.left + 70), ty = 395 + (i % 2) * 190 - (th.top + 70);
    at(th, { x: [0, tx * 0.5, tx], y: [0, ty - 120, ty], scale: [1, 0.8, 0.2], opacity: [1, 1, 0] }, K(10, 'games') + 0.2 + i * 0.18, { duration: 0.8, times: [0, 0.5, 1], ease: 'easeInOut' });
  });
  out(million, K(10, 'after'));
  const week = cap('5 to 6 days', 960, 800, { icon: 'calendar' });
  out(gamesCap, K(10, 'week') - 0.3); pop(week, K(10, 'week'));
  const results = [['cat', 'cat ✓'], ['sailboat', 'boat ✓']].map(([ic, lab], i) => {
    const g = node('group', world, 1290, 300 + i * 200, { w: 360, h: 140, opacity: 0 });
    node('thumb', g, 0, 0, { icon: ic, s: 140 });
    node('pill', g, 170, 32, { text: lab, color: C.gpu });
    at(g, { opacity: [0, 1], x: [-150, 0] }, K(10, 'recognised') + i * 0.2, { duration: 0.45, ease: 'easeOut' });
    return g;
  });
  const ribbon = node('ribbon', overlay, 1220, 740, { text: 'Best result ever', color: C.light, opacity: 0, oy: 0 });
  at(ribbon, { opacity: [0, 1, 1], y: [-120, 10, 0], rotate: [-8, 2, 0] }, K(10, 'better'), { duration: 0.6, times: [0, 0.7, 1], ease: 'easeOut' });
  cards.forEach((c, i) => pulse(c, K(10, 'chip') + i * 0.1, 1, 0.06));
  const toAI = node('pill', overlay, 960, 930, { text: 'Built for games → perfect for AI', color: C.ai, align: 'center', opacity: 0 });
  pop(toAI, K(10, 'perfect') - 0.3);

  // ================= Scene 10 — what's inside an AI =================
  const t11 = K(11, 'so') - 0.3;
  [year, week, ribbon, toAI, ...cards, ...results].forEach((e, i) => out(e, t11 + i * 0.02, 0.3));
  set(tablet, t11, { x: 0, y: -50, scale: 0.8, opacity: 0 }); set(game, t11, { x: -2 * SW }); set(chat, t11, { x: -SW });
  at(tablet, { opacity: [0, 1], scale: [0.68, 0.8] }, t11 + 0.3, { duration: 0.5, ease: 'backOut' });
  pulse(bubble, K(11, 'talking'), 1, 0.08);
  cam(K(11, 'inside') - 0.2, 1.0, 933, 400, 1.35);
  const table = node('numtable', world, 120, 200, { cols: 16, rows: 5, cell: 84, wave: -1, opacity: 0, ox: 0.3, oy: 0.4 });
  at(tablet, { scale: 0.4, opacity: 0 }, K(11, 'enormous') - 0.1, { duration: 0.8, ease: 'easeInOut' });
  at(table, { opacity: [0, 1], scale: [0.35, 1] }, K(11, 'enormous') + 0.2, { duration: 0.9, ease: 'easeOut' });
  cam(K(11, 'enormous'), 1.0, 960, 540, 1);
  const bill = cap('An AI is billions of numbers', 960, 700);
  pop(bill, K(11, 'billions'));
  const n175 = node('text', overlay, 960, 820, { text: '', size: T.counter, weight: 700, color: C.ai, align: 'center', opacity: 0 });
  count(n175, 0, 175, K(11, 'hundred') - 0.1, 1.1, v => `${Math.round(v / 5) * 5} billion numbers`);
  at(n175, { opacity: [0, 1] }, K(11, 'hundred') - 0.1, { duration: 0.3 });
  pop(node('text', overlay, 960, 905, { text: 'in one well-known AI', size: T.small, weight: 700, color: C.muted, align: 'center', opacity: 0 }), K(11, 'hundred') - 0.1);
  const wellLbl = overlay.children[overlay.children.length - 1];

  // ================= Scene 11 — every word is a giant sum (climax) =================
  const t12 = K(12, 'your') - 0.3;
  [bill, n175, wellLbl].forEach(e => out(e, t12));
  const q = node('bubble', overlay, 120, 70, { text: 'What should I cook tonight?', color: C.aiSoft, ox: 0, oy: 1, opacity: 0 });
  at(q, { opacity: [0, 1], scale: [0.5, 1] }, K(12, 'question') - 0.2, { duration: 0.45, ease: 'backOut' });
  const qNums = node('numtable', overlay, 780, 76, { cols: 6, rows: 1, cell: 70, opacity: 0, seed: 3 });
  at(qNums, { opacity: [0, 1], x: [-200, 0] }, K(12, 'numbers') - 0.1, { duration: 0.5, ease: 'easeOut' });
  const sumBox = node('box', overlay, 410, 420, { w: 1100, h: 200, radius: 24, fill: C.panel, borderWidth: 4, borderColor: C.ai, shadow: { y: 18, blur: 40, color: 'rgba(60,40,10,.2)' }, opacity: 0, ox: 0, oy: 0 });
  const sumTxt = node('text', sumBox, 546, 38, { text: '', size: 100, weight: 700, color: C.ink, align: 'center' });
  stage(sumTxt, [[0, ''], [K(12, 'multiply'), '2 × 3'], [K(12, 'numbers', 2), '2 × 3 + 4 × 5'], [K(12, 'up'), '2 × 3 + 4 × 5 = 26']]);
  const tSum = K(12, 'sum') - 0.2;
  dim(world, tSum, 0.25); dim(q, tSum, 0.25); dim(qNums, tSum, 0.25);
  at(sumBox, { opacity: [0, 1], scale: [0.85, 1], x: [45, 0], y: [10, 0] }, tSum + 0.1, { duration: 0.4, ease: 'backOut' });
  pulse(sumTxt, K(12, 'up') + 0.1, 1, 0.08);
  pulse(table, K(12, 'answer'), 1, 0.02);
  const tW = K(12, 'write') - 0.2;
  move(sumBox, tW, 0.7, { x: 1440 - 410, y: -390, scale: 0.4 });
  at(world, { opacity: 1 }, tW, { duration: 0.4 }); out(q, tW); out(qNums, tW);
  at(table, { wave: [-0.25, 1.25] }, K(12, 'does'), { duration: K(12, 'table') - K(12, 'does') + 0.3, ease: 'easeInOut' });
  const words = ['How', 'about', 'soup?'].map((w, i) => node('pill', overlay, 620 + i * 230, 110, { text: w, color: C.ai, align: 'center', opacity: 0 }));
  const rise = (el, t) => at(el, { opacity: [0, 1, 1], y: [90, -10, 0], scale: [0.6, 1.1, 1] }, t, { duration: 0.7, times: [0, 0.7, 1], ease: 'easeOut' });
  rise(words[0], K(12, 'table') + 0.1);
  const each = cap('Each word = the same simple sums, billions of times', 960, 930);
  pop(each, K(12, 'billions'));
  out(each, K(13, 'just') - 0.3, 0.3);
  at(table, { wave: [-0.25, 1.25] }, K(13, 'it') - 0.1, { duration: K(13, 'word') - K(13, 'it') + 0.3, ease: 'easeInOut' });
  rise(words[1], K(13, 'word') + 0.2);
  // the GPU crowd returns beneath the table; camera pushes in; table and crowd light together
  const tC = K(13, 'photo') - 0.2;
  dim(sumBox, tC, 0.3);
  const big = node('crowd', world, 258, 1100, { cols: 40, rows: 4, s: 44, gapX: 3.2, gapY: 6, color: C.gpu, wave: -1, band: 0.16 });
  move(big, tC, 0.9, { y: -460 }, 'easeOut');
  const bigLbl = node('text', world, 240, 650, { text: 'GPU', size: T.label, weight: 700, color: C.gpu, align: 'right', opacity: 0 });
  at(bigLbl, { opacity: [0, 1] }, tC + 0.6, { duration: 0.3 });
  cam(tC + 0.1, 1.0, 960, 530, 1.12);
  [words[0], words[1]].forEach(w => dim(w, tC, 0.5));
  const tT = K(13, 'thousands') - 0.1, dW = K(13, 'together') - tT + 0.5;
  at(table, { wave: [-0.25, 1.25] }, tT, { duration: dW, ease: 'linear' });
  at(big, { wave: [-0.25, 1.25] }, tT, { duration: dW, ease: 'linear' });
  set(table, tT - 0.05, { band: 0.2 });
  rise(words[2], tT + dW - 0.2);
  const why = node('pill', overlay, 960, 935, { text: "That's why AI runs on GPUs", color: C.gpu, align: 'center', opacity: 0 });
  pop(why, K(13, 'ai') - 0.15, 0.45);
  cam(K(13, 'gpus') + 0.3, 1.2, 960, 540, 1);

  // ================= Scene 12 — teaching an AI takes thousands of GPUs =================
  const t14 = K(14, 'teaching') - 0.4;
  [table, big, bigLbl].forEach(e => out(e, t14, 0.35)); [sumBox, why, ...words].forEach(e => out(e, t14, 0.35));
  const hall = node('building', world, 60, 330, { w: 1440, h: 650, opacity: 0 });
  const racks = [...Array(9)].map((_, i) => node('rack', world, 130 + i * 150, 560, { w: 118, h: 380, lit: i === 4 ? 0 : 1, opacity: 0 }));
  const tags = racks.map(r => node('pill', world, r.left + 59, r.top - 78, { text: 'CPU', color: C.cpu, fs: T.small, align: 'center', shadow: false, opacity: 0 }));
  const RC = racks[4], rcx = RC.left + 59, rcy = RC.top + 190;
  at(world, { x: 960 - rcx * 2.2, y: 540 - rcy * 2.2, scale: 2.2 }, t14 + 0.4, { duration: 0.01, ease: 'linear' });
  pop(RC, K(14, 'teaching') + 0.1, 0.4);
  at(RC, { lit: [0, 1] }, K(14, 'bigger'), { duration: 0.4 });
  racks.forEach((r, i) => { if (i !== 4) at(r, { opacity: [0, 1], y: [40, 0] }, K(14, 'linked') + 0.1 + Math.abs(i - 4) * 0.2, { duration: 0.35, ease: 'easeOut' }); });
  cam(K(14, 'linked'), 1.6, 960, 540, 1);
  const n16 = node('text', overlay, 960, 40, { text: '', size: T.counter, weight: 700, color: C.ink, align: 'center', opacity: 0 });
  count(n16, 0, 16000, K(14, 'sixteen'), 1.4, v => `${calm(v, 500)} GPUs`);
  at(n16, { opacity: [0, 1] }, K(14, 'sixteen'), { duration: 0.3 });
  const n16b = node('text', overlay, 960, 122, { text: 'whole GPU chips, each with thousands of workers', size: T.small, weight: 700, color: C.muted, align: 'center', opacity: 0 });
  at(n16b, { opacity: [0, 1] }, K(14, 'gpus') - 0.1, { duration: 0.3 });
  at(hall, { opacity: [0, 1], scale: [0.96, 1] }, K(14, 'giant'), { duration: 0.5, ease: 'easeOut' });
  const weeks = cap('for weeks', 960, 190, { icon: 'calendar' });
  pop(weeks, K(14, 'weeks') - 0.1);
  tags.forEach((tg, i) => pop(tg, K(14, 'cpu') + 0.2 + i * 0.04));
  const org = node('worker', world, 1610, 540, { s: 190, color: C.cpu, big: true, opacity: 0 });
  hop([org], K(14, 'cpu'));
  const orgCap = cap('organising the work', 1690, 760, { color: C.cpu, fg: '#FFFFFF', borderWidth: 0, fs: T.small });
  pop(orgCap, K(14, 'organised'));
  racks.forEach(r => dim(r, K(14, 'organised'), 0.55));
  // special parts for AI sums inside the GPU
  const t15 = K(14, "today's") - 0.3;
  [hall, ...racks, ...tags, org, orgCap, n16, n16b, weeks].forEach((e, i) => out(e, t15 + Math.min(i, 12) * 0.01, 0.3));
  set(gpu, t15, { x: -490, y: 215, scale: 1.4 }); set(crowd, t15, { litAll: 0, lit: 0, wave: -1 });
  open(gpu, t15 + 0.3, 1.4);
  const blk = node('box', gpu, 370, 96, { w: 168, h: 238, radius: 14, fill: C.lightSoft, borderWidth: 5, borderColor: C.light, opacity: 0 });
  node('text', blk, 79, 80, { text: 'AI', size: T.label, weight: 700, color: C.ink, align: 'center' });
  node('text', blk, 79, 140, { text: 'sums', size: T.small, weight: 700, color: C.ink, align: 'center' });
  at(blk, { opacity: [0, 1], scale: [0.8, 1] }, K(14, 'parts') - 0.1, { duration: 0.4, ease: 'backOut' });
  const partsCap = node('pill', overlay, 960, 900, { text: 'parts built just for AI sums', color: C.light, fg: C.ink, align: 'center', opacity: 0 });
  pop(partsCap, K(14, 'built'));
  cam(K(14, 'parts'), 1.0, 1204, 596, 1.15);

  // ================= Scene 13 — two brains, one team =================
  const t16 = K(15, 'so') - 0.2;
  out(blk, t16); out(partsCap, t16);
  cam(t16, 1.0, 960, 540, 1);
  move(gpu, t16 + 0.2, 0.9, { x: -70, y: 125, scale: 1 });           // centre (1380, 450)
  set(cpu, t16, { x: -840, y: -10, scale: 1, opacity: 0 }); cpuW.forEach(w => set(w, t16, { lit: 0 }));
  open(cpu, K(15, 'two') - 0.1);                                        // centre (540, 450)
  pulse(cpu, K(15, 'cpu')); dim(gpu, K(15, 'cpu'), 0.4);
  const capA = cap('A few clever workers', 540, 690, { color: C.cpuSoft, fg: C.cpu, borderWidth: 0 });
  const capB = cap('One step at a time', 540, 790, { color: C.cpuSoft, fg: C.cpu, borderWidth: 0 });
  pop(capA, K(15, 'few')); pop(capB, K(15, 'step'));
  cpuW.forEach((w, i) => at(w, { lit: [0, 1, 0] }, K(15, 'step') + i * 0.12, { duration: 0.5, ease: 'easeInOut' }));
  at(gpu, { opacity: 1 }, K(15, 'gpu') - 0.1, { duration: 0.3 }); pulse(gpu, K(15, 'gpu')); dim(cpu, K(15, 'gpu') - 0.1, 0.4);
  const capC = cap('Thousands of simple workers', 1380, 690, { color: C.gpuSoft, fg: C.gpu, borderWidth: 0 });
  const capD = cap('All at once', 1380, 790, { color: C.gpuSoft, fg: C.gpu, borderWidth: 0 });
  pop(capC, K(15, 'thousands')); pop(capD, K(15, 'all'));
  at(crowd, { litAll: [0, 1, 1, 0] }, K(15, 'all'), { duration: 1.0, times: [0, 0.15, 0.6, 1], ease: 'easeOut' });
  const uses = [['photos', 'sun'], ['games', 'gamepad-2'], ['AI', 'sparkles']].map(([t, ic], i) => node('pill', overlay, 1060 + i * 235, 885, { text: t, icon: ic, color: C.gpu, fs: T.small, opacity: 0 }));
  [K(15, 'photos'), K(15, 'games'), K(15, 'ai')].forEach((t, i) => pop(uses[i], t - 0.05));
  at(cpu, { opacity: 1 }, K(15, 'plans') - 0.1, { duration: 0.3 });
  cpuW.forEach((w, i) => at(w, { lit: [0, 1] }, K(15, 'plans') + i * 0.03, { duration: 0.3 }));
  at(crowd, { wave: [-0.25, 1.25] }, K(15, 'paints') - 0.1, { duration: 1.0, ease: 'easeInOut' });
  const tT2 = K(15, 'together', 2) - 0.1;
  [capA, capB, capC, capD, ...uses].forEach(e => dim(e, tT2, 0.35));
  const link = node('link', world, 885, 450, { dx: 190, color: C.light, width: 14, progress: 0 });
  draw(link, tT2, 0.5);
  const team = node('pill', world, 980, 140, { text: 'One team', color: C.light, fg: C.ink, align: 'center', opacity: 0 });
  pop(team, tT2 + 0.3);
  const tEnd = K(15, 'bring') - 0.2;
  [capA, capB, capC, capD, ...uses].forEach((e, i) => out(e, tEnd + i * 0.02, 0.3));
  const finale = node('photo', world, 720, 700, { w: 480, h: 300, opacity: 0 });
  at(finale, { opacity: [0, 1], scale: [0.6, 1] }, K(15, 'screen') - 0.3, { duration: 0.6, ease: 'backOut' });
  cam(K(15, 'screen'), 2.0, 960, 560, 0.96);

  return { seq, draw: (ctx, t) => drawTree(ctx, root, t, bg) };
}
