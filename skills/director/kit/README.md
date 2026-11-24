# Renderer kit

Copy this folder to the project's `src/`, then run `npm install` there. If Playwright has no Chromium yet, run `npx playwright-core install chromium` once. Install FFmpeg as well.

| File | Job |
|---|---|
| `index.html` | The video page. Write the scenes here, or in scripts it loads. |
| `render.mjs` | Renders `cuts/cut-NN.mp4` with `audio/narration.m4a`, or full-size stills with `--stills`. Video frames are split across parallel browsers (`--workers`, default half the CPU cores up to 8). |
| `sheet.sh` | Builds a contact sheet of stills, 1568 px wide and labelled with times. |
| `beats.py` | Fills keyword times from `timing.json` into `beat-sheet.template.md` and writes `beat-sheet.md`. |
| `build_icons.mjs` | Bundles the SVG icons in `assets/icons/` into `icons.js`. |

## The page contract

`render.mjs` loads the page and waits for every `@font-face`. It then calls `build()` once and `render(t)` once per frame. `window.TIMING` holds `audio/timing.json`. Every frame must depend only on `t`, so a still at 12.5 s is the same whether or not 12.4 s was drawn before it:

- Make all motion part of the single paused Motion sequence that `render(t)` seeks. Parallel workers rely on this: each draws its own run of frames from a fresh page.
- Keep wall-clock timers, `Math.random()` and network requests off the page.
- Give every loop a finite `repeat` count.

## Motion sequences

Each segment is `[element, keyframes, { at, duration, ease }]`. `at` is an absolute time in seconds; take it from `K(passage, word)`.

- **Before its first segment starts, an element shows that segment's first keyframe.** It shows it from time 0. Hidden things therefore start with a hidden first keyframe, such as `opacity: [0, …]`. An emphasis ring starts with `opacity: [0, 0.9, 0.9, 0]` and `times: [0, 0.01, …]`. If it starts at `0.9`, it is visible from the first frame.
- **Motion writes the whole `transform` property.** Position elements with `left`/`top` and margins, and use Motion's `x`, `y`, `scale` and `rotate` only for movement.
- **Text that changes, such as a typewriter or counter, needs a `motionValue` in the sequence.** Its `change` handler writes the text, as `typed()` in `index.html` does.
- **For an arc or a bounce, use keyframe arrays with `times`.** Passing `ease` as an array sets one easing per segment.

## Looking at frames

```sh
src/sheet.sh cuts/_check 2,4.5,7,9.5,12,14.5    # cuts/_check/sheet.jpg, plus full-size t*.png
```

The sheet is sized to the resolution an image is read at. For small text or overlaps, crop the full-size PNG of that moment instead of reading the sheet.
