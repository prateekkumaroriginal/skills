// Plans what to redraw for a run of frames and draws them (the three modes of draw() in graph.mjs).
// The run is scanned first: for every frame, the nodes that change. It is then cut into windows. In a window, the
// nodes that change in any of its frames are dynamic and all others static: its first frame paints the static nodes
// into a plate, and every later frame puts the plate back where the dynamic nodes painted and paints only those.
// The cut that costs the least painting is found from the time each node last took to paint.
const CAPTURE = 1.5, RESTORE = 0.3; // ms: taking a plate; putting it back for one frame
export function plates(tl, draw, G) {
  const { plate } = G, dirty = new Map(); let Cs = null, plan = null;
  // times: the frames of the run, in order.
  function scan(times) {
    const n = times.length, N = plate.nodes.length; Cs = [];
    for (let j = 0; j < n; j++) { dirty.clear(); tl.seek(times[j], dirty); Cs.push(G.changed(dirty, times[j])); }
    Cs[0] = 1; plan = new Array(n).fill(null);
    const cost = plate.cost; let full = 0; if (cost) for (const c of cost) full += c;
    if (!N || !(full > 0)) return;
    const live = []; for (let j = 0; j < n; j++) if (Cs[j] !== 0) live.push(j);
    // best[a]: least painting for the frames live[a..]; a window covers live[a..end[a]] (end[a] = a: no plate)
    const m = live.length, best = new Float64Array(m + 1), end = new Int32Array(m), D = new Uint8Array(N);
    for (let a = m - 1; a >= 0; a--) {
      best[a] = full + best[a + 1]; end[a] = a; D.fill(0); let costD = 0;
      for (let b = a + 1; b < m; b++) {
        const c = Cs[live[b]]; if (c === 1) break;
        for (let i = 0; i < N; i++) if (c[i] && !D[i]) { D[i] = 1; costD += cost[i]; }
        const v = full + CAPTURE + (b - a) * (costD + RESTORE) + best[b + 1];
        if (v < best[a]) { best[a] = v; end[a] = b; }
      }
    }
    for (let a = 0; a < m; a = end[a] + 1) {
      if (end[a] === a) continue;
      const w = { first: live[a], D: new Uint8Array(N), built: false, dead: false };
      for (let b = a + 1; b <= end[a]; b++) { const c = Cs[live[b]]; for (let i = 0; i < N; i++) if (c[i]) w.D[i] = 1; }
      for (let b = a; b <= end[a]; b++) plan[live[b]] = w;
    }
  }
  // Draw frame j of the scanned run (the timeline is at its time t). False: it is the same as the frame before.
  // Afterwards plate.rows holds the part of the picture that differs from the previous frame.
  function frame(ctx, j, t) {
    const c = Cs[j]; if (c === 0) return false;
    G.clearBands(plate.rows); plate.C = c === 1 ? null : c;
    const w = plan[j];
    const q = performance.now(); let kind = 0;
    if (!w || w.dead) { plate.mode = 0; draw(ctx, t); }
    else {
      plate.mode = kind = w.built ? 2 : 1; if (!w.built) G.dynamic(w.D);
      for (let tries = 0; ; tries++) {
        draw(ctx, t);
        if (!plate.conflicts.length) { w.built = true; break; }
        if (tries === 4) { w.dead = true; plate.mode = 0; draw(ctx, t); break; }
        G.promote(w.D, plate.conflicts); plate.mode = 1; frame.rebuilds++;
      }
    }
    plate.mode = 0; plate.C = null; frame.stats[kind * 2]++; frame.stats[kind * 2 + 1] += performance.now() - q;
    return true;
  }
  frame.rebuilds = 0; frame.stats = [0, 0, 0, 0, 0, 0];
  return { scan, frame };
}
