# T-embedding random shuffled sampler baseline

Date: 2026-06-04

Environment: local `_site` from `bundle exec jekyll build`, served by `tools/test-temb-shuffling.mjs` at a loopback URL, headless Chromium, default 2D sample view. The smoke path loaded the page, computed the initial T-embedding, and generated the initial random sample before the benchmark helper ran.

Command:

```sh
TEMB_SHUFFLED_BENCHMARK=1 node tools/test-temb-shuffling.mjs
```

Default `window.tembShuffledSamplerBenchmark({ stopOnError: false, restore: true })` cases:

| N | mode | status | weight generation/conversion | heap copy | WASM shuffling | UTF8 conversion | JSON parse | 2D render | double-dimer loop processing | sample 3D render | total |
|---:|:---|:---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | single | ok | 36.1 ms | 1.1 ms | 1094.5 ms | 1.9 ms | 1.9 ms | 4.2 ms | n/a | 0.0 ms | 1140.7 ms |
| 100 | double dimer | ok | 44.6 ms | 0.8 ms | 1744.8 ms | 1.1 ms | 3.5 ms | 104.5 ms | 23.6 ms | 0.0 ms | 1899.6 ms |
| 200 | single | ok | 121.0 ms | 1.8 ms | 2589.2 ms | 3.8 ms | 7.7 ms | 66.3 ms | n/a | 0.0 ms | 2790.7 ms |
| 200 | double dimer | ok | 148.8 ms | 2.9 ms | 3714.7 ms | 35.1 ms | 14.0 ms | 421.5 ms | 120.4 ms | 0.0 ms | 4337.6 ms |
| 330 | single | ok | 439.0 ms | 3.1 ms | 5293.3 ms | 12.1 ms | 24.0 ms | 211.7 ms | n/a | 0.0 ms | 5985.2 ms |
| 330 | double dimer | ok | 416.7 ms | 3.5 ms | 7142.0 ms | 22.6 ms | 41.0 ms | 1144.7 ms | 307.1 ms | 0.0 ms | 8771.8 ms |

Height-function pane render timings were not captured in the default benchmark because the height-function pane was inactive. Sample 3D timings were zero because the default benchmark kept the sampler in the visible 2D view.

## Post-optimization verification

Date: 2026-06-04

Environment: same command and headless Chromium path as above, after the optimized shuffling core, bulk heap transfer, cached 2D renderer, precomputed double-dimer loops, and batched sample 3D changes were in place.

Default `window.tembShuffledSamplerBenchmark({ stopOnError: false, restore: true })` cases:

| N | mode | status | cache hit | weight generation/conversion | heap copy | WASM shuffling | UTF8 conversion | JSON parse | 2D render | double-dimer loop processing | sample 3D render | total |
|---:|:---|:---|:---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | single | ok | no | 65.3 ms | 0.0 ms | 125.8 ms | 1.8 ms | 6.1 ms | 76.0 ms | n/a | n/a | 278.7 ms |
| 100 | double dimer | ok | yes | 0.3 ms | 0.0 ms | 245.9 ms | 1.6 ms | 6.1 ms | 83.5 ms | 45.0 ms | n/a | 338.3 ms |
| 200 | single | ok | no | 281.0 ms | 0.0 ms | 398.6 ms | 2.9 ms | 11.4 ms | 133.8 ms | n/a | n/a | 828.4 ms |
| 200 | double dimer | ok | yes | 0.3 ms | 0.0 ms | 675.6 ms | 5.9 ms | 14.3 ms | 214.5 ms | 95.0 ms | n/a | 911.3 ms |
| 330 | single | ok | yes | 0.1 ms | 1.2 ms | 934.4 ms | 10.1 ms | 25.1 ms | 250.6 ms | n/a | n/a | 1222.2 ms |
| 330 | double dimer | ok | yes | 0.1 ms | 0.1 ms | 1899.8 ms | 13.2 ms | 47.1 ms | 920.9 ms | 400.9 ms | n/a | 2883.2 ms |

The cache-hit values reflect the default helper's sequential case order and deterministic weight cache reuse. Height-function and sample 3D timing buckets stayed inactive in the default benchmark by design; separate browser smoke checks exercised both panes.
