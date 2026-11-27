# Results

Time to render the benchmark video, best run, and how many times faster than the video plays. Lower time is better.
Rebuilt by `node bench.mjs --table` from `results/*.json`.

| Date | CPU | Threads | RAM | OS | GPU | Power | Video | x264 | GPU encoder | Kit |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-26 | Intel(R) Core(TM) Ultra 7 255U | 14 | 31 GB | Ubuntu 24.04.2 LTS x64 | Intel Corporation Arrow Lake-U [Intel Graphics] | battery, balanced profile | 253.1 s | 24.3 s (10.4×) in-process | vaapi: 20.0 s (12.7×) | 934c979 |
| 2026-11-26 | Intel(R) Core(TM) Ultra 7 255U | 14 | 31 GB | Ubuntu 24.04.2 LTS x64 | Intel Corporation Arrow Lake-U [Intel Graphics] | mains, balanced profile | 253.1 s | 27.7 s (9.2×) in-process | vaapi: 25.5 s (9.9×) | 2efe828 |
| 2026-11-26 | 11th Gen Intel(R) Core(TM) i5-1155G7 @ 2.50GHz | 8 | 16 GB | Windows 11 Home Single Language x64 | Intel(R) Iris(R) Xe Graphics | battery | 253.1 s | 47.8 s (5.3×) ffmpeg pipe | qsv: 43.8 s (5.8×) | 5369cdb |
| 2026-11-26 | 11th Gen Intel(R) Core(TM) i5-1155G7 @ 2.50GHz | 8 | 16 GB | Windows 11 Home Single Language x64 | Intel(R) Iris(R) Xe Graphics | battery | 253.1 s | 26.6 s (9.5×) ffmpeg pipe | failed (nvenc, qsv, amf) | 934c979 |
| 2026-11-27 | Apple M4 Pro | 12 | 24 GB | macOS 15.3.1 arm64 | none found | battery | 253.1 s | 6.6 s (38.1×) ffmpeg pipe | failed (videotoolbox) | c35c287 |
| 2026-11-27 | Intel(R) Core(TM) Ultra 7 255U | 14 | 31 GB | Ubuntu 24.04.2 LTS x64 | Intel Corporation Arrow Lake-U [Intel Graphics] | battery, performance profile | 253.1 s | 14.7 s (17.2×) in-process | vaapi: 14.9 s (16.9×) | c35c287 |
