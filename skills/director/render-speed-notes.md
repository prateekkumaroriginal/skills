# Render speed: what was tried and did not help

A record of the attempts to make the kit's renderer faster that were measured and then dropped, so the next attempt starts from them. What did work is in the [kit README](kit/README.md) under "How a render stays fast".

## Where the numbers come from

- **Video:** the 253 s explainer that `benchmarks/director-kit` in the skills repository renders: 7,593 frames at 1920×1080 and 30 fps, of which about 4,540 are drawn and the rest are holds.
- **Machine:** a laptop with a Core Ultra 7 255U (14 threads), Ubuntu 24.04, Node 24, `@napi-rs/canvas` 0.1.65, FFmpeg 6.1.
- **Noise:** the same render drifts by several seconds between sessions on this laptop (21 to 31 s for the current renderer). A difference under about 10% is not a result.

"Frames/s" below is total throughput across all worker processes.

## Drawing

| Tried | Result | Why |
|---|---|---|
| Draw each frame in cache-sized horizontal bands | Half the speed: 181 → 93 frames/s (10 processes, 4 bands) | The scene is walked once per band. |
| Redraw only a clip rectangle around what changed | +24% drawing (232 → 288 frames/s, 8 processes), about +10% end to end, and not exact | Skia flattens a curve differently when a clip cuts through it. Edge pixels differed on 1,463 of 4,708 moving frames and stale pixels were left on 144. |
| The same, with the rectangle grown to whole elements | Exact, but the rectangle covered 91% of the frame | Camera moves and large slides touch nearly everything. |
| Copy the background with `drawImage(canvas)` | 13.6 ms per frame | It snapshots and blends the whole canvas. `putImageData` takes about 1 ms and a flat `fillRect` 0.6 ms. |
| `putImageData` with dirty-rectangle arguments | Crashes canvas 0.1.65 (`free(): invalid pointer`) | A bug in that version of the library. |
| Draw a covered shadow as strips around the box | Seams of 1 to 2 brightness levels where strips meet | The kit draws the shadow sprite once through an even-odd clip instead. |
| Fill a flat background instead of copying its pixels | +20% drawing on a quiet machine, nothing measurable under load | Kept, because it is exact and costs nothing. |

The plates in the kit replaced the clip-rectangle idea. They repaint whole nodes and never clip through a shape, which is why they stay exact.

## Workers

| Tried | Result | Why |
|---|---|---|
| More worker processes | Flat from 6 to 14 workers; 12 workers took 38 s against about 27 s with 7 | Full-frame pixel work stops scaling at about 4 processes (memory bandwidth, roughly 24 GB/s here). Pure computation scaled to 12. |
| Parallel encoding alone, with every frame still drawn in full | About 1.2× over the original renderer | Drawing, not encoding, was most of the time. |

## Encoding

| Tried | Result | Why |
|---|---|---|
| x264 with more than one thread per encoder | Slower: `threads=2` gave 35.6 s against about 27 s | A multi-threaded x264 uses about twice the CPU per frame. One such encoder reached 405 frames/s where twelve single-threaded ones reached 720. |
| Let ffmpeg convert RGBA to YUV | About 3× the CPU of converting in the worker | |
| Let ffmpeg repeat held frames (`tpad=stop_mode=clone`) instead of piping each one | No difference (295–349 against 330–380 frames/s) | x264 spends as much on a held frame as on a moving one. Writing held frames as skip slices (`h264.mjs`) is what removed that cost. |
| GPU encoders | Small gain: VAAPI 8 to 18% over x264 on this laptop, Quick Sync 8% on a Core i5-1155G7 Windows laptop | Drawing stays on the CPU. Files are about half the size, with lower quality on still frames (51–57 dB PSNR against 51–63 dB for x264). |
| Encode the narration to AAC while rendering | Under load the audio encode alone took 20 to 31 s | The kit copies narration that is already AAC. |

## Runtime and power

| Tried | Result |
|---|---|
| Bun instead of Node (1.3.13 and 1.4.5 against Node 24) | No measurable gain: 25.2–29.2 s against 26.1–31.1 s over the runs, and all three within 2 s of each other in the last round. The kit runs unchanged under Bun and `verify.mjs` passes. |
| Mains power instead of battery | No gain seen in two benchmark runs (27.7 s on mains, 24.3 s on battery a day later). Too few runs to rule it out. |

## Not tried

- **Drawing on the GPU**, through a Skia GPU backend or another canvas library. This is the one change that could give a multiple.
- **The `performance` power profile.** Every run used `balanced`.
- **Excluding the project folder from antivirus scanning.** Bitdefender used 2 to 5 cores during renders on this laptop.
- **CABAC skip slices.** The held-frame writer handles CAVLC only, so the kit forces CAVLC on every encoder.

## How to measure the next attempt

- **Compare in turn.** Run old and new alternately at least twice; a single timing on a laptop means little.
- **Iterate on a short section** (`--from 0 --to 20`) and keep full renders for the final check.
- **Keep drawing exact.** `node src/verify.mjs` must report every frame identical to a full draw.
