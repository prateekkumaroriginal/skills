# Renderer kit

Copy this folder to the project's `src/`, then run `npm install` there. Install FFmpeg as well.

Keep `@napi-rs/canvas` pinned at 0.1.65. Version 1.0.13 leaks a full frame (8 MB at 1080p) of native memory on every `data()` call, even with forced GC, so a long render fills RAM and stalls in swap. Frames from 0.1.65 match 1.0.13 (SSIM 0.993 or higher).

The renderer draws with Skia in parallel worker processes and encodes H.264 inside each worker. Every element is drawn in code: each node sits at an explicit `left`/`top`, and anything sized by its text is measured with `measure()`.

| File | Job |
|---|---|
| `scene.mjs` | The video's scenes. `build()` returns `{ seq, draw }`. |
| `graph.mjs` | Scene graph: nodes, built-in kinds, fonts, icons, painting helpers, and the draw modes the renderer uses. |
| `timeline.mjs` | Seeks the Motion sequence in Node with Motion's easing and keyframe-merging rules. |
| `render.mjs` | Renders `cuts/cut-NN.mp4` with `audio/narration.m4a`, or full-size stills with `--stills`. `--scene` renders another scene module in `src/`, such as the motion tests. Options are listed at the top of the file. |
| `plates.mjs`, `meter.mjs` | Draw only what changes: `meter.mjs` measures where each node paints, `plates.mjs` plans which nodes to keep as a cached picture. |
| `encoder.mjs`, `yuv.mjs`, `h264.mjs`, `native/` | Encoding: colour conversion, the in-process encoder (`native/enc.node`) with an ffmpeg fallback, and writing held frames straight into the stream. |
| `verify.mjs` | Checks that every frame the renderer draws equals a full redraw. |
| `sheet.sh` | Builds a contact sheet of stills, 1568 px wide and labelled with times. |
| `beats.py` | Fills keyword times from `timing.json` into `beat-sheet.template.md` and writes `beat-sheet.md`. |
| `build_icons.mjs` | Bundles the SVG icons in `assets/icons/` into `icons.js`. |

## How a render stays fast

- **A frame where nothing changes is never drawn or encoded.** It goes into the H.264 stream as a picture that repeats the previous one (about 10 bytes), so the file still has a constant frame rate.
- **A frame that changes repaints only the nodes that change.** The rest sit in a cached picture (a plate). Only the part of the frame those nodes touch is converted to YUV.
- **Camera moves are the expensive frames**: every node under the moving group is repainted on each of them. Hold the camera still whenever the scene allows.
- **The result is the same picture as a full redraw**, pixel for pixel. This relies on each node's paint depending only on that node (and its ancestors' transform and opacity). After adding a custom kind, run `node src/verify.mjs`; it reports any frame that differs.
- **`native/enc.node` is compiled for this machine.** Rebuild it with `src/native/build.sh` after an FFmpeg or Node upgrade. Without it the renderer pipes frames to `ffmpeg`, which is slower.
- **`--enc vaapi`** encodes on the GPU (Linux, Intel or AMD). It is a little faster and the files are about half the size, at slightly lower quality than the default x264 settings. `--enc videotoolbox` (macOS), `nvenc`, `qsv` and `amf` exist but are untested.

## The scene contract

`render.mjs` imports `scene.mjs` in each worker and calls `build()` once. For every frame that changes it seeks the timeline built from `seq` to `t` and calls `draw(ctx, t)`. `TIMING` holds `audio/timing.json`. Every frame must depend only on `t`, so a still at 12.5 s is the same whether or not 12.4 s was drawn before it:

- Make all motion part of the one sequence `seq`, and animate nodes (or the values given to `textFrom`). Each worker draws its own frames from a fresh `build()`; frames outside every segment repeat the previous one, and inside a segment only the animated nodes are repainted, so anything changing outside the sequence is lost. Animating any other object makes every frame of that segment a full redraw.
- Give each segment a numeric `at` and no `repeat`; write a repeat out as keyframes.
- Keep wall-clock time, `Math.random()` and network requests out of the scene.

## Motion sequences

Each segment is `[node, keyframes, { at, duration, ease, times }]`. `at` is an absolute time in seconds; take it from `K(passage, word)`.

- **Before its first segment starts, a node shows that segment's first keyframe.** It shows it from time 0. Hidden things therefore start with a hidden first keyframe, such as `opacity: [0, …]`. An emphasis ring starts with `opacity: [0, 0.9, 0.9, 0]` and `times: [0, 0.01, …]`. If it starts at `0.9`, it is visible from the first frame.
- **Values keep moving between segments.** A prop interpolates from one segment's last keyframe to the next segment's first, with the earlier segment's easing. A later segment erases the earlier keyframes inside its own time range.
- **Position with `left`/`top`; move with `x`, `y`, `scale`, `rotate`.** Transforms apply about the box centre (`ox`, `oy`, as fractions of the box).
- **Text that changes, such as a typewriter or counter, uses `textFrom(value, fmt, start)`.** The most recently started source writes the text; `count` and `typed` in `scene.mjs` wrap it.
- **For an arc or a bounce, use keyframe arrays with `times`.** Passing `ease` as an array sets one easing per keyframe interval.
- **Colour props** interpolate with Motion's `mix`, so keyframes can be any CSS colour string.

## Nodes

`node(kind, parent, left, top, props)` adds a node. Children are positioned inside their parent, offset by the parent's border.

| Kind | Props |
|---|---|
| `group` | `w`, `h` (only for the transform origin). `filter` (a CSS filter string) rasterizes the subtree once and reuses it, so animate the group itself, never its children. |
| `box` | `w`, `h`, `radius` (number or `[tl, tr, br, bl]`), `fill`, `borderWidth`, `borderColor`, `dashed`, `shadow {x, y, blur, color}`, `glow {blur, color}`, `clip` |
| `text` | `text`, `size`, `weight`, `family`, `color`, `align` (where `left` sits on the line) |
| `icon` | `icon` (name in `icons.js`), `size`, `color`, `lineWidth` |
| `path` | `pathNode(parent, d, {color, width, progress})`: animate `progress` 0→1 to draw it on; `length` and `pointAt(l)` move things along it |
| `dot`, `image` | `cx, cy, r, color`; `img` from `image('file.png')` in `assets/`, `w`, `h` |

Give the video's recurring elements (a chip, a token, a cache cell) their own kind instead of rebuilding them from boxes: `kind(name, { box: n => ({ w, h }), paint(ctx, n, w, h) })`, with optional `inset`, `clip` and `ax`, as documented in `graph.mjs`. Size a kind from its text in `box()` so it grows when its text changes. Paint with the exported helpers: `txt`, `icon`, `fillStroke`, `dropShadow`, `glow`, `spreadRing`. A kind's `paint` reads only its own node `n` and draws only through the `ctx` it is given; the renderer measures what it paints to know which part of the frame changed.

- **Fonts**: register every weight with `font()`. Glyphs the font lacks (✕, ✓) come from `fallbackFonts()`.
- **Shadows and blurs** are the slowest things to draw. `dropShadow` blurs once per box size and reuses the result; prefer it to a live `glow` on anything that stays on screen. Pass `covered = true` when the kind fills the same box with an opaque colour straight after: only the visible rim of the shadow is then drawn.
- **Opacity on a node with children** multiplies down the tree: each child is drawn at its parent's opacity. Where children overlap, a faded child underneath shows through the one on top. Text on a card's box looks the same, but a cover that hides another child, or overlapping opaque cards fading together, does not. Give those groups `layer: true`. They are then composited as one image, which costs a full-frame layer on every frame while their opacity is below 1.

## Looking at frames

```sh
src/sheet.sh cuts/_check 2,4.5,7,9.5,12,14.5    # cuts/_check/sheet.jpg, plus full-size t*.png
```

The sheet is sized to the resolution an image is read at. For small text or overlaps, crop the full-size PNG of that moment instead of reading the sheet.
