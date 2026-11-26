# Results

Time to render the benchmark video, best run, and how many times faster than the video plays. Lower time is better.
Rebuilt by `node bench.mjs --table` from `results/*.json`.

| Date | CPU | Threads | RAM | OS | GPU | Power | Video | x264 | GPU encoder | Kit |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-26 | Intel(R) Core(TM) Ultra 7 255U | 14 | 31 GB | Ubuntu 24.04.2 LTS x64 | Intel Corporation Arrow Lake-U [Intel Graphics] | mains, balanced profile | 253.1 s | 27.7 s (9.2×) in-process | vaapi: 25.5 s (9.9×) | 0a65e8f |
