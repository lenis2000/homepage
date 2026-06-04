# T-embedding Random Shuffled Sampler Optimization

## Overview

Optimize only the randomly shuffled domino sampler embedded in the arbitrary-weight T-embedding page. Do not optimize or rewrite the T-embedding recurrence, origami rendering, stepwise construction, Mathematica verification, or main T-embedding visualization except where a shared helper is strictly needed by the random sampler.

The goal is to bring this sampler up to the same standard as the optimized `/domino/` master sampler: faster WASM shuffling, faster heap transfer, cached 2D canvas rendering, precomputed double-dimer loop data, and batched sample 3D geometry.

## Runner Note

This repository currently has a local `.ralphex/` setup customized for a single-file data-art project. Before executing this plan with ralphex, temporarily remove or rename `.ralphex/prompts/task.txt`, and run with `--external-review-tool=none --skip-finalize` unless the local config has been reset. This plan must not edit `data-art/triangle.html`.

## Context

- T-embedding page random sampler section:
  - `_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md`
  - `_simulations/domino_tilings/2025-12-11-t-embedding-shuffling.cpp`
  - generated WASM bundle `js/2025-12-11-t-embedding-shuffling.js`
- Reference implementations with good optimizations:
  - `s/domino.md`
  - `s/domino.cpp`
  - `_simulations/domino_tilings/2025-12-04-RSK-sampling.md`
  - `_simulations/domino_tilings/double-dimer-cli.cpp`
  - `_simulations/domino_tilings/matrix_optimized.h`

## Scope Guard

Only work on these page features:

- `#sample-canvas` random domino sampler display.
- `#sample-btn`, `#sample-N-input`, `#sample-border-input`, palette/grayscale controls, sample 2D pan/zoom controls.
- Sample double-dimer checkbox, min-loop filtering, double-dimer loop drawing.
- Sample 3D toggle and sample 3D domino view.
- Height-function pane that is generated from the random sample/double dimer.
- The shuffling WASM module loaded from `2025-12-11-t-embedding-shuffling.js`.

Do not change mathematical T-embedding computation or its primary rendering pipeline.

## Success Criteria

- Random shuffled sampler timing is visible through opt-in console/status instrumentation for weight generation, heap copy, WASM shuffling, JSON parse, 2D render, loop processing, and sample 3D render.
- Shuffling WASM is faster than baseline and preserves existing exported function names/signatures.
- `#sample-canvas` stays interactive at N=330 in single and double-dimer modes.
- Double-dimer loop filtering does not recompute all loop data on every pan/zoom redraw.
- Sample 3D uses merged geometry instead of one mesh per domino.
- Main T-embedding/origami/stepwise functionality remains visually and behaviorally unchanged.

## Validation Commands

- `bundle exec jekyll build`
- `test -f js/2025-12-11-t-embedding-shuffling.js`

## Implementation Steps

### Task 1: Add random-sampler-only profiling and baselines

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md`
- Optional create: `docs/plans/benchmarks/temb-random-shuffled-sampler-baseline.md`

Instrument the sampler before changing it.

- [ ] Add timing around `generateRandomSample()`: weight generation/conversion, heap copy, WASM shuffling, UTF8 conversion, JSON parse, 2D render, double-dimer loop processing, height-function pane render, and sample 3D render.
- [ ] Expose a dev-only `window.tembShuffledSamplerBenchmark(options)` helper for N=100, N=200, and N=330 in single and double-dimer modes.
- [ ] Record representative baseline numbers in a benchmark markdown file or a clearly marked comment block.
- [ ] Verify the page still loads, computes the initial T-embedding, and generates the initial random sample.

### Task 2: Optimize T-embedding shuffling WASM core

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-11-t-embedding-shuffling.cpp`
- Regenerate: `js/2025-12-11-t-embedding-shuffling.js`

Apply the same shuffling-core improvements used by the optimized master sampler / double-dimer CLI.

- [ ] Port or share the flat row-major matrix classes, Xoshiro256++ RNG, rolling probability pyramid, and ping-pong `aztecgen` implementation from `double-dimer-cli.cpp` or the optimized `/domino/` sampler.
- [ ] Preserve all exported function names and signatures: `simulateAztecWithWeightMatrix`, `simulateAztecGammaDirect`, `simulateAztecPeriodicDirect`, `simulateAztecIIDDirect`, `simulateAztecDoubleDimer`, `freeString`, `getProgress`, `malloc`, and `free`.
- [ ] Deduplicate JSON serialization for single and double-dimer output via a shared helper.
- [ ] Ensure `simulateAztecDoubleDimer` computes probabilities once and generates two independent configurations from the same probability pyramid.
- [ ] Keep maximum-N behavior consistent with current UI caps unless benchmarks justify raising caps.
- [ ] Recompile using the preamble command in `2025-12-11-t-embedding-shuffling.cpp` and move the generated JS to `js/`.
- [ ] Smoke-test single and double-dimer calls for N=50 and N=150, including at least one non-uniform weight preset.

### Task 3: Optimize JS heap transfer, caching, and error handling

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md`

Make the random sampler frontend avoid repeated expensive work.

- [ ] Replace per-element WASM heap copying in `runShufflingWithWeights()` with `shufflingModule.HEAPF64.set(eklpWeights, weightsPtr >> 3)` when the source is a `Float64Array`; keep a fallback for plain arrays.
- [ ] Cache generated EKLP weight typed arrays by `(N, preset, seed, preset parameters)` when current controls imply reuse, while still regenerating when random-weight semantics require a new realization.
- [ ] Check null pointers and `{error: ...}` JSON responses from the shuffling module, and show useful status text instead of just `Error`.
- [ ] Split `generateRandomSample()` into named phases: read controls, get/generate weights, run shuffling, parse result, update sample state, render visible sample views.
- [ ] Avoid updating sample 3D or height-function pane when those panes are hidden/inactive.
- [ ] Preserve all random sampler controls, IDs, event handlers, export behavior, palette behavior, and current Enter-to-sample behavior.

### Task 4: Add cached fast 2D rendering and precomputed double-dimer loops

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md`

Make `#sample-canvas` canvas-first and pan/zoom-friendly.

- [ ] Implement a `SampleDomino2DCanvasRenderer` with persistent viewport state, HiDPI device-pixel-ratio handling, `requestAnimationFrame` scheduling, and explicit cache invalidation.
- [ ] Render standard domino samples once into an `OffscreenCanvas` or hidden canvas in model coordinates; pan/zoom should redraw the cached bitmap using `drawImage()`.
- [ ] Batch initial standard domino drawing by palette color or grayscale bucket, with a single border/stroke pass when borders are enabled.
- [ ] Precompute double-dimer edge maps, loop IDs, loop sizes, and filtered drawable edge lists only when sample configurations or `minLoopLength` changes.
- [ ] Render double-dimer loops from precomputed drawable data; pan/zoom must not rebuild edge maps or redo BFS.
- [ ] Keep PNG export working and visually matching the on-screen sample canvas.
- [ ] Verify N=330 single mode and double-dimer mode remain interactive in 2D.

### Task 5: Batch the random sampler's 3D and height-function displays

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md`

Optimize sample 3D only; do not change main T-embedding 3D/origami rendering.

- [ ] Replace sample 3D per-domino `BufferGeometry`, material, and mesh creation with merged typed-array geometry and shared materials.
- [ ] Use vertex colors or shared color attributes so palette/grayscale changes do not require thousands of materials.
- [ ] Dispose old sample 3D geometries/materials correctly and preserve the user's sample 3D camera where possible.
- [ ] Avoid rendering sample 3D while the sample view is in 2D mode.
- [ ] If the double-dimer height-function pane is active, avoid recomputing height differences unless the underlying two configurations changed.
- [ ] Verify sample 3D is smooth for moderate N and does not affect the main T-embedding 3D view.

### Task 6: Final random-sampler verification and cleanup

**Files:**
- Modify as needed: files touched by earlier tasks
- Optional update: benchmark markdown from Task 1

Validate the sampler and protect the T-embedding page from collateral changes.

- [ ] Run `bundle exec jekyll build` and fix any warnings/errors caused by these edits.
- [ ] Use a local server and browser to test the random sampler: single sample, double dimer, min-loop filtering, palette/grayscale, pan/zoom, PNG export, sample 3D toggle, and height-function pane.
- [ ] Also spot-check unrelated T-embedding functionality: compute T-embedding, 2D/3D main toggle, origami checkbox, stepwise section for small n, and Mathematica verification for small n.
- [ ] Run the benchmark helper from Task 1 and record before/after numbers for N=100, N=200, and N=330 cases.
- [ ] Remove noisy debug logging while keeping useful opt-in benchmark helpers.
- [ ] Confirm generated bundle `js/2025-12-11-t-embedding-shuffling.js` is committed with its C++ source.
