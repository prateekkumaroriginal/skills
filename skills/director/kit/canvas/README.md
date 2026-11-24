# Canvas renderer

Draws the video with Skia in Node worker threads, with no browser. A 2:27 explainer renders in about 30 s (4.5–6.8× real time on a 14-thread laptop); the HTML renderer takes about 0.8× real time. The cost is that every element is drawn in code. There is no CSS layout, flexbox or text wrapping: each node sits at an explicit `left`/`top`, and anything sized by its text is measured with `measure()`.

| File | Job |
|---|---|
| `scene.mjs` | The video's scenes. `build()` returns `{ seq, draw }`. |
| `graph.mjs` | Scene graph: nodes, built-in kinds, fonts, icons, painting helpers. |
| `timeline.mjs` | Seeks the Motion sequence in Node with Motion's own easing and keyframe-merging rules. |
| `render.mjs` | Renders `cuts/cut-NN.mp4`, or stills with `--stills`. Takes `--from`, `--to`, `--fps`, `--workers` and `--stills` like the HTML `render.mjs`, plus `--scene`, `--preset` and `--crf`. |

```sh
RENDER=canvas/render.mjs src/sheet.sh cuts/_check 2,4.5,7   # contact sheet + full-size PNGs
node src/canvas/render.mjs cuts/cut-01.mp4
```

The default x264 preset is `ultrafast`, which keeps encoding ahead of the drawing; its files are about 3× larger. Render the delivered cut with `--preset medium`.

## Nodes

`node(kind, parent, left, top, props)` adds a node. Children are positioned inside their parent, offset by the parent's border, as in CSS. Motion animates the same props as in the HTML kit: `x`, `y`, `scale`, `scaleY`, `rotate` and `opacity`, about the box centre (`ox`, `oy`, as fractions of the box), plus any other numeric or colour prop a kind reads.

| Kind | Props |
|---|---|
| `group` | `w`, `h` (only for the transform origin). `filter` (CSS filter string) rasterizes the subtree once and reuses it, so animate the group itself, never its children. |
| `box` | `w`, `h`, `radius` (number or `[tl, tr, br, bl]`), `fill`, `borderWidth`, `borderColor`, `dashed`, `shadow {x, y, blur, color}`, `glow {blur, color}`, `clip` |
| `text` | `text`, `size`, `weight`, `family`, `color`, `align` (where `left` sits on the line) |
| `icon` | `icon` (name in `src/icons.js`), `size`, `color`, `lineWidth` |
| `path` | `pathNode(parent, d, {color, width, progress})`: animate `progress` 0→1 to draw it on; `length` and `pointAt(l)` move things along it |
| `dot`, `image` | `cx, cy, r, color`; `img` from `image('file.png')` in `assets/`, `w`, `h` |

Give the video's recurring elements (a chip, a token, a cache cell) their own kind instead of rebuilding them from boxes: `kind(name, { box: n => ({ w, h }), paint(ctx, n, w, h) })`, with optional `inset`, `clip` and `ax`, as documented in `graph.mjs`. Size a kind from its text in `box()` so it grows when its text changes. Paint with the exported helpers: `txt`, `icon`, `fillStroke`, `dropShadow`, `glow`, `spreadRing`.

## Matching the HTML look

- **Shadows and blurs** are the slowest things to draw. `dropShadow` blurs once per box size and reuses the sprite; prefer it to a live `glow` on anything that stays on screen.
- **Opacity on a node with children** blends the whole group, as CSS does. That costs one full-frame layer while the opacity is below 1, so dim leaves rather than whole containers when a dim lasts long.
- **Fonts**: register every weight with `font()`. Glyphs the font lacks (✕, ✓) come from `fallbackFonts()`, not from the OS automatically.
- **Changing text** uses `textFrom(value, fmt, start)`; the most recently started source writes the text. `count` and `typed` in `scene.mjs` wrap it.
- **Moving between keyframes:** values keep interpolating between one segment's end and the next segment's start, and a later segment erases earlier keyframes inside its time range. This is the same as Motion; `timeline.mjs` documents it. Segments need a numeric `at` and no `repeat`; write repeats out as keyframes.
- **Colour props** interpolate with Motion's `mix`, so keyframes can be any CSS colour.
