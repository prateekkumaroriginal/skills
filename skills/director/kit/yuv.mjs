// RGBA -> YUV 4:2:0, BT.601 limited range (what ffmpeg produces from RGB by default), chroma from 2x2 averages.
// convert(u, out, y0, y1, x0, x1) converts rows y0..y1 and columns x0..x1 (both even) of the frame u (a Uint32Array
// over the canvas's RGBA bytes, little-endian) into out: Y, then U and V as planes (yuv420p) or interleaved (nv12,
// what the GPU encoders take).
export function converter(Wd, Ht, nv12) {
  const CW = Wd >> 1, YS = Wd * Ht, VO = nv12 ? 1 : CW * (Ht >> 1), CS = nv12 ? 2 : 1;
  return function convert(u, out, y0, y1, x0, x1) {
    for (let y = y0; y < y1; y += 2) {
      let i = y * Wd + x0, c = YS + ((y >> 1) * CW + (x0 >> 1)) * CS; const end = y * Wd + x1;
      for (; i < end; i += 2, c += CS) {
        const p0 = u[i], p1 = u[i + 1], p2 = u[i + Wd], p3 = u[i + Wd + 1];
        const r0 = p0 & 255, g0 = (p0 >> 8) & 255, b0 = (p0 >> 16) & 255;
        const r1 = p1 & 255, g1 = (p1 >> 8) & 255, b1 = (p1 >> 16) & 255;
        const r2 = p2 & 255, g2 = (p2 >> 8) & 255, b2 = (p2 >> 16) & 255;
        const r3 = p3 & 255, g3 = (p3 >> 8) & 255, b3 = (p3 >> 16) & 255;
        out[i] = ((66 * r0 + 129 * g0 + 25 * b0 + 128) >> 8) + 16;
        out[i + 1] = ((66 * r1 + 129 * g1 + 25 * b1 + 128) >> 8) + 16;
        out[i + Wd] = ((66 * r2 + 129 * g2 + 25 * b2 + 128) >> 8) + 16;
        out[i + Wd + 1] = ((66 * r3 + 129 * g3 + 25 * b3 + 128) >> 8) + 16;
        const R = r0 + r1 + r2 + r3, G = g0 + g1 + g2 + g3, B = b0 + b1 + b2 + b3;
        out[c] = ((-38 * R - 74 * G + 112 * B + 512) >> 10) + 128; out[c + VO] = ((112 * R - 94 * G - 18 * B + 512) >> 10) + 128;
      }
    }
  };
}
// Convert the part of the frame in `rows` (bands from graph.mjs: 8 rows each, with a span of columns).
export function convertRows(convert, u, out, rows, Wd, Ht) {
  const { x0, x1 } = rows;
  for (let i = 0; i < x0.length; i++) if (x1[i] > x0[i]) convert(u, out, i * 8, Math.min(Ht, i * 8 + 8), x0[i] & ~1, Math.min(Wd, (x1[i] + 1) & ~1));
}
