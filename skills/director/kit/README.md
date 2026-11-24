# Renderer kit

Copy this folder to the project's `src/`, then run `npm install` there. Install FFmpeg as well.

The renderer draws every frame with Skia in Node worker threads and streams them to one x264 process. Every element is drawn in code: each node sits at an explicit `left`/`top`, and anything sized by its text is measured with `measure()`.

| File | Job |
|---|---|
| `scene.mjs` | The video's scenes. `build()` returns `{ seq, draw }`. |
| `graph.mjs` | Scene graph: nodes, built-in kinds, fonts, icons, painting helpers. |
| `timeline.mjs` | Seeks the Motion sequence in Node with Motion's easing and keyframe-merging rules. |
| `render.mjs` | Renders `cuts/cut-NN.mp4` with `audio/narration.m4a`, or full-size stills with `--stills`. Frames are drawn by parallel workers (`--workers`), and a frame where nothing changes repeats the previous one. `--scene` renders another scene module in `src/`, such as the motion tests. |
| `sheet.sh` | Builds a contact sheet of stills, 1568 px wide and labelled with times. |
| `beats.py` | Fills keyword times from `timing.json` into `beat-sheet.template.md` and writes `beat-sheet.md`. |
| `build_icons.mjs` | Bundles the SVG icons in `assets/icons/` into `icons.js`. |

## The scene contract

`render.mjs` imports `scene.mjs` in each worker and calls `build()` once. For every frame it seeks the timeline built from `seq` to `t` and calls `draw(ctx, t)`. `TIMING` holds `audio/timing.json`. Every frame must depend only on `t`, so a still at 12.5 s is the same whether or not 12.4 s was drawn before it:

- Make all motion part of the one sequence `seq`. Each worker draws its own frames from a fresh `build()`, and frames outside every segment repeat the previous one, so anything changing outside the sequence is lost.
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

Give the video's recurring elements (a chip, a token, a cache cell) their own kind instead of rebuilding them from boxes: `kind(name, { box: n => ({ w, h }), paint(ctx, n, w, h) })`, with optional `inset`, `clip` and `ax`, as documented in `graph.mjs`. Size a kind from its text in `box()` so it grows when its text changes. Paint with the exported helpers: `txt`, `icon`, `fillStroke`, `dropShadow`, `glow`, `spreadRing`.

- **Fonts**: register every weight with `font()`. Glyphs the font lacks (✕, ✓) come from `fallbackFonts()`.
- **Shadows and blurs** are the slowest things to draw. `dropShadow` blurs once per box size and reuses the result; prefer it to a live `glow` on anything that stays on screen.
- **Opacity on a node with children** blends the whole group, which costs one full-frame layer while the opacity is below 1. When a dim lasts long, dim the leaves rather than their container.

## Looking at frames

```sh
src/sheet.sh cuts/_check 2,4.5,7,9.5,12,14.5    # cuts/_check/sheet.jpg, plus full-size t*.png
```

The sheet is sized to the resolution an image is read at. For small text or overlaps, crop the full-size PNG of that moment instead of reading the sheet.
