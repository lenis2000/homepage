# Domino master sampler baseline

Date: 2026-06-04

Environment: local `_site` served at `http://127.0.0.1:4000/domino/`, headless Chromium, default 2D view with `No 3D (faster)` checked. The page loaded into 2D by default and completed the initial `n=12` sample.

Default `window.dominoSamplerBenchmark()` cases:

| n | status | WASM call | UTF8 conversion | JSON parse | 2D render | total |
|---:|:---|---:|---:|---:|---:|---:|
| 100 | ok | 648.7 ms | 1.6 ms | 2.3 ms | 100.1 ms | 809.4 ms |
| 200 | ok | 1693.6 ms | 18.6 ms | 7.9 ms | 324.0 ms | 2104.3 ms |
| 300 | ok | 3085.6 ms | 5.3 ms | 16.7 ms | 676.0 ms | 3839.5 ms |
| 500 | error | n/a | n/a | n/a | n/a | 3175.3 ms |

The `n=500` default case currently aborts in the unoptimized WASM path with `Aborted(). Build with -sASSERTIONS for more info.` It is retained in the benchmark helper defaults so later optimization tasks can prove the high-end 2D case is fixed instead of silently lowering the target.

## After optimization verification

Date: 2026-06-04

Environment: local `_site` built with a localhost URL override and served at `http://127.0.0.1:4100/domino/`, headless Chromium, default 2D view with `No 3D (faster)` checked. The opt-in 3D smoke used SwiftShader only to verify reachability in headless Chromium; the benchmark below used the default 2D cases and did not benchmark 3D.

Default `window.dominoSamplerBenchmark({ stopOnError: false, restore: true })` cases after the sampler and canvas optimizations:

| n | status | WASM call | UTF8 conversion | JSON parse | 2D render | total |
|---:|:---|---:|---:|---:|---:|---:|
| 100 | ok | 663.6 ms | 1.6 ms | 5.0 ms | 357.6 ms | 1081.4 ms |
| 200 | ok | 1493.3 ms | 18.4 ms | 13.3 ms | 622.2 ms | 2202.8 ms |
| 300 | ok | 2352.6 ms | 13.7 ms | 20.8 ms | 121.9 ms | 2565.4 ms |
| 500 | ok | 5983.9 ms | 118.7 ms | 49.4 ms | 609.6 ms | 6818.0 ms |

The `n=500` default case now completes successfully in the default 2D path. Height-function and 3D render timings were skipped for all default benchmark cases because the benchmark intentionally keeps the 2D pane active with `No 3D` enabled.
