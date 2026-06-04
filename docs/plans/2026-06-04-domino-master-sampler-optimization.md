# Domino Master Sampler Optimization

## Overview

Make `/domino/` the fast, polished master Aztec diamond sampler. Use the best ideas already present in the q-RSK sampler and the optimized double-dimer CLI: lower-allocation shuffling, better frontend orchestration, cached 2D drawing, and batched 3D geometry.

This plan is intentionally scoped only to `/domino/`. Do not touch the T-embedding arbitrary-weights page in this plan.

## Runner Note

The repository-local `.ralphex/` overrides have been reset to defaults for this work. Execute this plan with the normal ralphex pipeline; do not use stale data-art review prompts or scripts. This plan must not edit `data-art/triangle.html`.

## Docker Tool Requirements

If executing with ralphex Docker, the image must include Ruby/Bundler/Jekyll for `bundle exec jekyll build`, Emscripten `emcc`/`em++` for regenerating `s/domino.js`, and a headless browser for `/domino/` smoke tests. It should also have bash, git, make, node, python3, and C++/native build deps for Ruby gems.

Use the repository-specific image from `Dockerfile.ralphex-homepage`:

```sh
docker build -t ralphex-homepage:latest -f Dockerfile.ralphex-homepage .
RALPHEX_IMAGE=ralphex-homepage:latest ralphex-dk docs/plans/2026-06-04-domino-master-sampler-optimization.md
```

As of 2026-06-04, `ralphex-homepage:latest` includes Ruby/Bundler/Jekyll, Emscripten `emcc`/`em++`, Alpine Chromium, and `agent-browser`; `AGENT_BROWSER_EXECUTABLE_PATH` is preset to `/usr/bin/chromium-browser`.

## Context

- Master sampler page:
  - `s/domino.md`
  - `s/domino.cpp`
  - generated WASM bundle `s/domino.js`
- Reference implementations with good optimizations:
  - `_simulations/domino_tilings/2025-12-04-RSK-sampling.md`
  - `_simulations/domino_tilings/2025-12-04-RSK-sampling.cpp`
  - `_simulations/domino_tilings/double-dimer-cli.cpp`
  - `_simulations/domino_tilings/matrix_optimized.h`
  - completed plan `docs/plans/completed/2026-02-28-rsk-sampling-bugfix-performance.md`

## Success Criteria

- `/domino/` sampling and display have opt-in timings for sampling, JSON parse, 2D render, height computation, and 3D render.
- `/domino/` WASM shuffling is substantially faster than baseline, with fewer allocations and no regressions up to existing UI caps.
- `/domino/` 2D view defaults to a fast, crisp HiDPI canvas path for large tilings; pan and zoom use cached rendering rather than full per-domino redraws.
- `/domino/` 3D view uses batched geometry or vertex colors rather than one Three.js mesh/material per domino.
- Existing controls, IDs, exports, palette behavior, Glauber controls, URL behavior, and keyboard shortcuts continue to work.

## Validation Commands

- `bundle exec jekyll build`
- `test -f s/domino.js`

## Implementation Steps

### Task 1: Add `/domino/` profiling harness and collect baselines

**Files:**
- Modify: `s/domino.md`
- Optional create: `docs/plans/benchmarks/domino-master-sampler-baseline.md`

Add lightweight instrumentation before optimizing so later tasks can prove real improvements.

- [ ] Add timing around WASM call, UTF8 conversion, JSON parse, 2D render, height-function computation, and 3D render. Keep it console/status only; do not add new keyboard shortcuts.
- [ ] Expose a dev-only `window.dominoSamplerBenchmark(options)` helper that samples n=100, n=200, n=300 in 3D and n=300, n=500 in 2D, returning structured timings.
- [ ] Record representative baseline numbers in a small benchmark markdown file or a clearly marked comment block.
- [ ] Verify `/domino/` still loads and samples once after instrumentation.

### Task 2: Optimize `/domino/` C++ shuffling core

**Files:**
- Modify: `s/domino.cpp`
- Regenerate: `s/domino.js`

Port the allocation and RNG improvements from `double-dimer-cli.cpp` and the RSK optimization work into the master sampler.

- [ ] Replace nested `vector<vector<...>>` matrices used in the shuffling/probability pipeline with flat row-major matrix classes, keeping a small compatibility layer where Glauber code needs current state access.
- [ ] Replace `std::mt19937` in the hot shuffling path with compact Xoshiro256++ RNG and fast `next_double()`, while keeping deterministic/frozen paths unchanged.
- [ ] Replace `d3p()` plus `probs2()` full intermediate storage with a rolling `computeProbabilityPyramid()` routine: keep only current/next square-move value/exponent matrices and write probability matrices directly in creation order.
- [ ] Replace `delslide()` and `create()` returning fresh matrices with in-place `delslideInPlace()` and `createStepInPlace()` using preallocated ping-pong `MatrixInt` buffers.
- [ ] Pre-reserve probability pyramid matrices and domino JSON output capacity; use a shared `appendDominoJSON()` helper for `simulateAztec`, `simulateAztec6x2`, frozen horizontal/vertical output, and Glauber output where practical.
- [ ] Preserve `g_conf`, `g_W`, `g_N`, and all exported function names so Glauber dynamics and JS bindings remain compatible.
- [ ] Recompile using the preamble command in `s/domino.cpp` and confirm `s/domino.js` is updated.
- [ ] Smoke-test uniform n=50, 2x2 n=50, 3x3 n=50, 6x2 n=50, frozenH/frozenV n=50.

### Task 3: Tighten `/domino/` JS sampling orchestration and error handling

**Files:**
- Modify: `s/domino.md`

Make the frontend avoid unnecessary work and fail descriptively.

- [ ] In `updateVisualization()`, check for null WASM pointers before `UTF8ToString`, parse C++ `{error: ...}` responses explicitly, and clear stale status/timing on failure.
- [ ] Split sampling, parsing, 2D rendering, height computation, and 3D rendering into clearly named functions so visible-view decisions happen before expensive work.
- [ ] If the active view is 2D or `No 3D` is checked, skip height-map computation and all Three.js geometry work entirely.
- [ ] If the active view is 3D and `n > 300`, show the existing large-tiling message without creating/discarding WebGL objects.
- [ ] In Glauber updates, update only the visible view; invalidate the 2D canvas cache when the domino configuration changes, and avoid hidden 3D rebuilds.
- [ ] Throttle progress/status updates to animation frames or coarse intervals so status text does not become a bottleneck for large n.
- [ ] Preserve all existing controls, IDs, button behavior, export behavior, palette behavior, and existing keyboard shortcuts, but do not add new shortcuts.

### Task 4: Replace `/domino/` large 2D SVG drawing with a fast polished canvas path

**Files:**
- Modify: `s/domino.md`

Keep SVG/TikZ/PDF export capability, but make the interactive 2D display canvas-first for speed and visual quality.

- [ ] Add a HiDPI `<canvas>` inside `#aztec-2d-canvas` while preserving the existing `#aztec-svg-2d` element for export/small-overlay compatibility.
- [ ] Implement a `Domino2DCanvasRenderer` with persistent viewport state, device-pixel-ratio scaling, `requestAnimationFrame` scheduling, and explicit cache invalidation when dominoes/colors/overlays change.
- [ ] Render the full tiling once to an `OffscreenCanvas` or hidden canvas at model coordinates; during pan/zoom draw the cached bitmap with `drawImage()` rather than looping over all dominoes.
- [ ] Batch initial canvas drawing by fill/stroke style: one path per color or grayscale bucket, one stroke pass when borders are enabled.
- [ ] Port existing 2D overlays to canvas or hybrid overlay rendering: checkerboard, paths, dimers, and height labels for n <= 30. Keep overlay drawing disabled or simplified automatically when n is too large.
- [ ] Improve 2D visual polish: crisp HiDPI output, better centered initial fit, dark-mode background/border variables, optional small border gap that does not create blurry seams, and palette/grayscale updates without full DOM rebuilds.
- [ ] Keep PNG export working from the canvas; keep PDF/TikZ export by generating from cached domino data or the preserved SVG path.
- [ ] Verify n=500 pan/zoom is fluid and that switching 3D -> 2D reuses cached domino data without resampling.

### Task 5: Batch `/domino/` 3D height-surface rendering

**Files:**
- Modify: `s/domino.md`

Remove the object-per-domino Three.js bottleneck.

- [ ] Replace per-domino `BufferGeometry`, `MeshStandardMaterial`, and `Mesh` creation with one or a few merged `BufferGeometry` objects using typed arrays for positions, indices, normals, and vertex colors.
- [ ] Use vertex colors for height gradients so gradient coloring does not require one material per domino.
- [ ] Use shared materials for colored, grayscale, and monochrome modes; update material/vertex-color data on palette changes rather than rebuilding the whole scene unless necessary.
- [ ] Use `Uint32Array` indices when needed and keep `OES_element_index_uint` support for WebGL1 fallback.
- [ ] Dispose old merged geometries/materials correctly before replacing them; preserve the user's camera/controls target on resample unless a first render or explicit reset requires recentering.
- [ ] Keep abort/cancel behavior responsive by checking the existing abort signal between major phases, not inside per-domino mesh creation.
- [ ] Verify n=200 and n=300 3D views rotate smoothly and object count is nearly constant rather than proportional to the number of dominoes.

### Task 6: Final `/domino/` verification and cleanup

**Files:**
- Modify as needed: `s/domino.md`, `s/domino.cpp`, `s/domino.js`
- Optional update: benchmark markdown from Task 1

Validate correctness, performance, and visual quality after all optimizations.

- [ ] Run `bundle exec jekyll build` and fix any warnings/errors caused by these edits.
- [ ] Use a local server and browser to test `/domino/`: uniform, 2x2, 3x3, 6x2, frozen horizontal, frozen vertical, 2D/3D switching, palette changes, grayscale, checkerboard, paths, dimers, height labels, PNG/PDF/TikZ/CSV/JSON/export buttons, and Glauber start/stop.
- [ ] Run the benchmark helper from Task 1 and record before/after numbers for the main cases.
- [ ] Remove noisy debug logging while keeping the useful opt-in benchmark helper.
- [ ] Confirm generated bundle `s/domino.js` is committed with `s/domino.cpp`.
