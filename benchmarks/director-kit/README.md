# Director kit benchmark

Measures how fast a machine renders a video with the [director skill's render kit](../../skills/director/kit/README.md), and records the machine's configuration next to the time.

The video is fixed: "The Two Brains Inside Your Computer", a 4 min 13 s explainer drawn entirely in code. It is 7,593 frames at 1920×1080 and 30 fps, of which about 4,500 are animated and the rest are holds, with a silent narration track.

## Run it

Needs [Node.js](https://nodejs.org) 20 or newer and FFmpeg with libx264 on the `PATH` (`ffmpeg` and `ffprobe`).

| System | FFmpeg |
|---|---|
| macOS | `brew install ffmpeg` |
| Windows | `winget install Gyan.FFmpeg` |
| Linux | `sudo apt install ffmpeg` (or your distribution's package) |

```sh
git clone https://github.com/prateekkumaroriginal/skills
cd skills/benchmarks/director-kit
npm install
node bench.mjs
```

A run takes from one to several minutes. Close other heavy programs first, and on a laptop plug it in: the power source changes the result more than anything else.

| Option | Effect |
|---|---|
| `--runs N` | Render each encoder N times (default 2). The best time counts. |
| `--quick` | Render only the first 60 s of the video. |
| `--cpu-only` | Skip the GPU encoder. |
| `--gpu nvenc,qsv` | The GPU encoders to try, in order, instead of the system's defaults. |
| `--workers N` | Worker processes (default: half the CPU threads). |
| `--kit FOLDER` | Benchmark another copy of the kit. |
| `--table` | Only rebuild `RESULTS.md` from `results/*.json`. |

## What it measures

- **x264**: the kit's default. Drawing and encoding both run on the CPU.
- **GPU encoder**: drawing stays on the CPU (the kit draws with Skia's CPU rasterizer) and H.264 encoding moves to the GPU. The benchmark tries the encoders the system could have (VAAPI on Linux, VideoToolbox on macOS, NVENC, Quick Sync or AMF on Windows) and uses the first that renders three seconds correctly. A machine without one records x264 only.

The time is the whole `render.mjs` command, from start to the finished MP4. After the timed runs the output is checked: it must decode without errors and contain every frame.

## What it records

One JSON file per run in `results/`, and a row in [RESULTS.md](RESULTS.md):

- **Configuration**: operating system and architecture, CPU model, thread count, memory, GPU names, power source, and the Node, FFmpeg, canvas and kit versions.
- **Result**: per encoder, each run's time, the best time, speed relative to the video's length, frames per second, file size, and whether the output was valid.

Nothing else is recorded: no host name, user name, file paths or serial numbers. Nothing is uploaded; to share a result, commit the JSON file and `RESULTS.md`.

## Limits

- **Tested on Linux only so far** (x86-64, Intel graphics). The kit and this benchmark are written to run on macOS and Windows, but neither has been run there yet.
- **Only the VAAPI GPU encoder is tested.** The VideoToolbox, NVENC, Quick Sync and AMF settings come from the FFmpeg documentation. If one produces a stream the kit can't use, the benchmark records that encoder as failed and keeps the x264 result.
- **The kit's in-process encoder is built for Linux x86-64 with FFmpeg 6.1.** Elsewhere the kit pipes frames to an `ffmpeg` process, which is slower. The result says which path ran ("in-process" or "ffmpeg pipe").
- **Fonts are bundled**, so every machine draws the same picture: Lexend (SIL Open Font License) and DejaVu Sans; icons are from Lucide (ISC). Their licences are next to the files in `project/assets/`.
