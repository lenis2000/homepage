# T-embedding Random Shuffled Sampler Optimization

## Overview

Optimize only the randomly shuffled domino sampler embedded in the arbitrary-weight T-embedding page. Do **not** optimize or rewrite the T-embedding recurrence, origami rendering, stepwise construction, Mathematica verification, or the main T-embedding visualization except where a shared helper is strictly needed by the random sampler.

The target standards are the current `/domino/` sampler after the `awesome-domino-sampler` work and the RSK sampler at `http://localhost:4000/simulations/2025-12-04-rsk-sampling/`. Use `/domino/` as the primary reference for the WASM shuffling core, robust error handling, and stale-WASM tests; use the RSK sampler as the primary reference for elapsed-time UI, progressive canvas cache behavior, pan/zoom feel, and crisp pixelated rendering. In particular:

- `s/domino.cpp`: flat matrices, Xoshiro256++, `PackedDecisionPyramid`, ping-pong shuffling buffers, malloc-owned JSON/error strings, no stale `n=500` hard cap.
- `s/domino.md`: null-pointer / `{error: ...}` handling, 2D-first rendering decisions, exact small rendering, and current `/domino/` sampler UX.
- `_simulations/domino_tilings/2025-12-04-RSK-sampling.md`: elapsed-time display in seconds, progressive lo-res → hi-res canvas cache, no-smoothing pixelized cached draws, and polished pan/zoom interaction.
- `tools/test-domino.mjs`: source checks plus browser/WASM smoke tests that verify generated JS matches C++ expectations.
- `docs/plans/completed/2026-06-04-domino-master-sampler-optimization.md`: completed master-sampler plan and validation style.

## Runner Note

The repository `.ralphex/` directory now only contains progress files, not custom data-art prompts. Run this plan with the normal ralphex pipeline. Do not edit `data-art/triangle.html`.

If using Docker, use the repository-specific image from `Dockerfile.ralphex-homepage`; it includes Ruby/Bundler/Jekyll, Emscripten, Chromium, and agent-browser:

```sh
docker build -t ralphex-homepage:latest -f Dockerfile.ralphex-homepage .
RALPHEX_IMAGE=ralphex-homepage:latest ralphex-dk docs/plans/2026-06-04-temb-random-shuffled-sampler-optimization.md
```

## Context

- T-embedding page random sampler section:
  - `_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md`
  - `_simulations/domino_tilings/2025-12-11-t-embedding-shuffling.cpp`
  - generated WASM bundle `js/2025-12-11-t-embedding-shuffling.js`
- Gold-standard references:
  - `/domino/` source: `s/domino.md`, `s/domino.cpp`, `tools/test-domino.mjs`
  - RSK sampler: `http://localhost:4000/simulations/2025-12-04-rsk-sampling/`, source `_simulations/domino_tilings/2025-12-04-RSK-sampling.md`
  - `_simulations/domino_tilings/double-dimer-cli.cpp` only where it has T-embedding-specific presets not present in `/domino/`

## Scope Guard

Only work on these page features:

- `#sample-canvas` random domino sampler display.
- `#sample-btn`, `#sample-N-input`, `#sample-border-input`, palette/grayscale controls, and sample 2D pan/zoom controls.
- Sample double-dimer checkbox, min-loop filtering, and double-dimer loop drawing.
- Sample 3D toggle and sample 3D domino view.
- Height-function pane generated from the random sample/double dimer.
- The shuffling WASM module loaded from `2025-12-11-t-embedding-shuffling.js`.

Do **not** change mathematical T-embedding computation or its primary rendering pipeline. Spot-check those unrelated features at the end.

## Success Criteria

- Random sampler status includes elapsed time in seconds next to the progress text, exactly in the RSK/domino style, e.g. `(1.23s)`.
- Random sampler instrumentation records weight generation/conversion, heap copy, WASM shuffling, UTF8 conversion, JSON parse, 2D render, double-dimer loop processing, height-function pane render, and sample 3D render.
- Shuffling WASM is rebuilt from C++ and uses the `/domino/` packed-decision architecture: flat matrices, Xoshiro256++, deterministic rolling square-move values/exponents, packed Bernoulli decisions, and ping-pong shuffling buffers.
- Double-dimer mode produces two independent configurations from the same weight realization. If using packed decisions, generate two independent decision pyramids in the same probability pass; do **not** reuse one decision pyramid for both samples.
- `#sample-canvas` stays interactive at N=330 in single and double-dimer modes.
- 2D canvas rendering uses the same pixelization as the RSK and `/domino/` samplers: `imageSmoothingEnabled = false` for cached image draws and CSS `image-rendering: crisp-edges; image-rendering: pixelated;`.
- Double-dimer loop filtering does not recompute all loop data on every pan/zoom redraw.
- Sample 3D is opt-in/visible-only and uses merged geometry instead of one mesh per domino.
- Main T-embedding/origami/stepwise functionality remains visually and behaviorally unchanged.

## Validation Commands

- `bundle exec jekyll build`
- `test -f js/2025-12-11-t-embedding-shuffling.js`
- Add and run a focused smoke test, preferably `node tools/test-temb-shuffling.mjs`, modeled on `tools/test-domino.mjs`.

## Implementation Steps

### Task 0: Read the current master sampler before editing

**Files:**
- Read only: `s/domino.cpp`, `s/domino.md`, `tools/test-domino.mjs`, `_simulations/domino_tilings/2025-12-04-RSK-sampling.md`

- [x] Inspect the `awesome-domino-sampler` changes in git history and copy the proven core/error/test patterns rather than inventing a parallel architecture.
- [x] Inspect `_simulations/domino_tilings/2025-12-04-RSK-sampling.md` and copy its elapsed-seconds display and pixelated/progressive canvas cache behavior for the sample canvas.
- [x] Identify the exact functions in the T-embedding page that correspond to `/domino/`'s sampling/parsing phases and the RSK sampler's canvas rendering/status phases.
- [x] Confirm the starting working tree is clean before ralphex begins code edits.

### Task 1: Add random-sampler-only profiling, visible seconds, and baselines

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md`
- Optional create: `docs/plans/benchmarks/temb-random-shuffled-sampler-baseline.md`

Instrument the sampler before changing it.

- [x] Add a timing span next to the sampler progress/status text, following the RSK page exactly: `(<seconds>.toFixed(2)s)`. Clear it when a new sample starts or sampling fails.
- [x] Add timing around `generateRandomSample()` phases: control read, weight generation/conversion, heap copy, WASM shuffling, UTF8 conversion, JSON parse, 2D render, double-dimer loop processing, height-function pane render, and sample 3D render.
- [x] Expose a dev-only `window.tembShuffledSamplerBenchmark(options)` helper for N=100, N=200, and N=330 in single and double-dimer modes. It should restore controls after running.
- [x] Record representative baseline numbers in a benchmark markdown file or a clearly marked comment block.
- [x] Verify the page still loads, computes the initial T-embedding, and generates the initial random sample.

### Task 2: Optimize the T-embedding shuffling WASM core

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-11-t-embedding-shuffling.cpp`
- Regenerate: `js/2025-12-11-t-embedding-shuffling.js`

Port the `/domino/` C++ sampler core patterns, not the old full probability-pyramid approach.

- [x] Replace nested `vector<vector<...>>` matrices in the shuffling path with a flat row-major `FlatMatrix<T>` class compatible with the existing code.
- [x] Replace `std::mt19937` in the hot shuffling path with Xoshiro256++ and fast `next_double()`.
- [x] Replace `d3pslim()` + `probsslim()` full intermediate storage with a rolling square-move pass that keeps only current/next value and exponent matrices.
- [x] Store Bernoulli shuffling outcomes in a compact `PackedDecisionPyramid` (`uint32_t`/bit-packed), as in `/domino/`, instead of storing one `double` probability per square per level.
- [x] For single samples, compute one packed decision pyramid and feed it to ping-pong `aztecgen`.
- [x] For double dimer, compute two independent packed decision pyramids from the same weight realization in one rolling probability pass (two RNG draws per square when needed), then run `aztecgen` twice. Do not generate identical samples by sharing decisions.
- [x] Replace `delslide()` and `createslim()` fresh allocations with in-place `delslideInPlace()` and `createStepInPlace()` using preallocated ping-pong `MatrixInt` buffers.
- [x] Preserve exported function names/signatures: `simulateAztecWithWeightMatrix`, `simulateAztecGammaDirect`, `simulateAztecPeriodicDirect`, `simulateAztecIIDDirect`, `simulateAztecDoubleDimer`, `freeString`, `getProgress`, `malloc`, and `free`.
- [x] Return malloc-owned C strings and encode C++ failures as `{"error":"..."}` JSON. Compile with exception support if needed, as `/domino/` now does.
- [x] Deduplicate JSON serialization for single and double-dimer output via shared helpers.
- [x] Keep the UI maximum N at 330 unless this task explicitly verifies a safe increase; remove stale internal caps that contradict the UI.
- [x] Recompile using the preamble command in `2025-12-11-t-embedding-shuffling.cpp`, updated with any required flags, and move the generated JS to `js/`.
- [x] Smoke-test single and double-dimer calls for N=50 and N=150, including at least one non-uniform weight preset.

### Task 3: Optimize JS heap transfer, caching, and error handling

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md`

Make the random sampler frontend avoid repeated expensive work.

- [x] Replace per-element WASM heap copying in `runShufflingWithWeights()` with `shufflingModule.HEAPF64.set(eklpWeights, weightsPtr >> 3)` when the source is a `Float64Array`; keep a fallback for plain arrays.
- [x] Cache generated EKLP weight typed arrays by `(N, preset, seed, preset parameters)` when controls imply reuse, while still regenerating when random-weight semantics require a new realization.
- [x] Check null pointers before `UTF8ToString`, always call `freeString()` in a `finally`, parse `{error: ...}` JSON responses, and show useful status text instead of a generic `Error`.
- [x] Split `generateRandomSample()` into named phases: read controls, get/generate weights, run shuffling, parse result, update sample state, render visible sample views.
- [x] Avoid updating sample 3D or the height-function pane when those panes are hidden/inactive.
- [x] Preserve all random sampler controls, IDs, event handlers, export behavior, palette behavior, and current Enter-to-sample behavior.

### Task 4: Add cached crisp 2D rendering and precomputed double-dimer loops

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md`

Make `#sample-canvas` canvas-first and pan/zoom-friendly, matching the visual sharpness of RSK and `/domino/`.

- [x] Add CSS to `#sample-canvas`: `image-rendering: crisp-edges; image-rendering: pixelated;`.
- [x] Implement a `SampleDomino2DCanvasRenderer` with persistent viewport state, HiDPI device-pixel-ratio handling, `requestAnimationFrame` scheduling, and explicit cache invalidation.
- [x] For small samples, draw directly/exactly to the visible canvas so N=6/12 examples are not blurry.
- [x] For larger samples, render once into an `OffscreenCanvas` or hidden canvas and draw the cached bitmap with `ctx.imageSmoothingEnabled = false`; pan/zoom must not loop over all dominoes.
- [x] If adopting the RSK progressive cache pattern, do a quick 1x cache first and then swap in a higher-resolution cache asynchronously; keep smoothing disabled for both draws.
- [x] Batch initial standard domino drawing by palette color or grayscale bucket, with a single border/stroke pass when borders are enabled.
- [x] Precompute double-dimer edge maps, loop IDs, loop sizes, and filtered drawable edge lists only when sample configurations or `minLoopLength` changes.
- [x] Render double-dimer loops from precomputed drawable data; pan/zoom must not rebuild edge maps or redo BFS.
- [x] Keep PNG export working and visually matching the on-screen sample canvas.
- [x] Verify N=330 single mode and double-dimer mode remain interactive in 2D.

### Task 5: Batch the random sampler's 3D and height-function displays

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md`

Optimize sample 3D only; do not change main T-embedding 3D/origami rendering.

- [x] Replace sample 3D per-domino `BufferGeometry`, material, and mesh creation with merged typed-array geometry and shared materials.
- [x] Use vertex colors or shared color attributes so palette/grayscale changes do not require thousands of materials.
- [x] Dispose old sample 3D geometries/materials correctly and preserve the user's sample 3D camera where possible.
- [x] Avoid initializing or rendering sample 3D while the sample view is in 2D mode.
- [x] If the double-dimer height-function pane is active, cache height differences and avoid recomputing unless the underlying two configurations changed.
- [x] Verify sample 3D is smooth for moderate N and does not affect the main T-embedding 3D view.

### Task 6: Add focused smoke tests and stale-WASM guards

**Files:**
- Create or modify: `tools/test-temb-shuffling.mjs`
- Modify as needed: `Makefile` or README if adding a make target

Mirror the protection added for `/domino/`.

- [ ] Add source checks that the T-embedding shuffling C++ contains `PackedDecisionPyramid`, no stale internal cap below the UI max, and the generated JS does not contain removed stale error strings.
- [ ] Add a standalone WASM smoke test for `simulateAztecWithWeightMatrix` and `simulateAztecDoubleDimer` at small N; verify domino counts and that double-dimer configurations are not accidentally identical for a generic random seed.
- [ ] If practical, add a browser smoke test that loads the page, triggers a sample, and verifies non-blank `#sample-canvas` without touching the main T-embedding pipeline.
- [ ] Keep the test dependency-free like `tools/test-domino.mjs` and make it work with `CHROME_BIN`, `CHROMIUM_BIN`, or macOS Chrome paths.

### Task 7: Final random-sampler verification and cleanup

**Files:**
- Modify as needed: files touched by earlier tasks
- Optional update: benchmark markdown from Task 1

Validate the sampler and protect the T-embedding page from collateral changes.

- [ ] Run `bundle exec jekyll build` and fix any warnings/errors caused by these edits.
- [ ] Use a local server and browser to test the random sampler: single sample, double dimer, min-loop filtering, palette/grayscale, pan/zoom, PNG export, sample 3D toggle, and height-function pane.
- [ ] Also spot-check unrelated T-embedding functionality: compute T-embedding, 2D/3D main toggle, origami checkbox, stepwise section for small n, and Mathematica verification for small n.
- [ ] Run the benchmark helper from Task 1 and record before/after numbers for N=100, N=200, and N=330 cases.
- [ ] Remove noisy debug logging while keeping useful opt-in benchmark helpers and visible elapsed seconds.
- [ ] Confirm generated bundle `js/2025-12-11-t-embedding-shuffling.js` is committed with its C++ source.
