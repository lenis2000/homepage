# RSK Sampling: Bug Fix and Performance Optimization

## Overview
Fix intermittent sampling failure with non-unit x,y parameters (x=2, y=1 causes "Sample Error!" at n=200) and achieve 5x+
performance improvement through C++ memory optimization, 3D geometry batching, and efficient large-n canvas rendering.

## Context
- Files involved:
  - `_simulations/domino_tilings/2025-12-04-RSK-sampling.cpp` (C++ WASM source, 412 lines)
  - `_simulations/domino_tilings/2025-12-04-RSK-sampling.md` (HTML/JS frontend, ~5300 lines)
  - `js/2025-12-04-RSK-sampling.js` (compiled WASM output)
- Related patterns: `_simulations/CLAUDE.md` for WASM integration conventions
- Dependencies: Boost.Multiprecision (C++), Three.js (3D), D3.js (SVG), Emscripten (WASM)

## Bug Analysis
The growth diagram stores the FULL (n+1)x(n+1) grid of Partition vectors in memory. For n=200 with biased parameters (x=2, y=1
gives Bernoulli p=2/3), partitions grow larger than with uniform parameters, causing:
1. **Memory pressure**: The tau grid with larger partitions uses 15-30MB. Occasional large random realizations push memory usage
higher, risking WASM OOM which causes the Promise rejection caught by JS as "Error!".
2. **Wasted computation**: The infinity sentinel value `1000000000` used for `nu_bar_{k-1}` when k=0 forces an expensive `pow(q,
~10^9)` call through Boost.Multiprecision on every k=0 island, when mathematically the denominator is simply 1.0.
3. **No error diagnostics**: The C++ code can return `{"error":"..."}` JSON, but the JS code never checks for it - it blindly
calls `JSON.parse()` and if parsing fails (e.g. null pointer from malloc failure), shows only "Error!" with no details.

## Development Approach
- Testing approach: Manual testing via browser after WASM compilation
- Test cases: n=200 x=2 y=1 q=0.95 (bug repro), n=500 x=1 y=1 (performance), n=1000 (stress)
- Recompile WASM after C++ changes via emcc command in file preamble

## Implementation Steps

### Task 1: Fix C++ sampling - memory optimization and sentinel fix

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-04-RSK-sampling.cpp`

The key optimization is refactoring the growth diagram from a full (n+1)x(n+1) grid to a 2-row rolling buffer. This reduces
memory from O(n^2 * partition_size) to O(n * partition_size) - roughly 50-200x less memory for n=200.

- [x] Fix infinity sentinel in `sampleVHq`: when k=0, compute `f_k = oneMinusQtoN(q, lam_0 - mu_0 + 1)` directly (denominator is 1.0) instead of calling computeF with nu_bar_k_minus_1=10^9. This avoids an expensive Boost pow(q, ~10^9) call
- [x] Add early-return optimization in `oneMinusQtoN`: for n > 1000 with any q < 1, return 1.0 directly (since q^1000 < 10^-22 for q <= 0.95)
- [x] Refactor `aztecDiamondSample` to use 2-row rolling buffer: replace `vector<vector<Partition>> tau(n+1, vector<Partition>(n+1))` with two vectors `prevRow` and `currRow`, each of size n+1. Extract boundary partitions (tau[i][n+1-i] and tau[i][n-i]) into a boundary cache during the main loop
- [x] Reconstruct the output partition sequence from the boundary cache instead of the full tau grid. Output order: empty, boundaryA[n], boundaryB[n-1], boundaryA[n-1], ..., boundaryB[1], boundaryA[1], empty
- [x] Pre-allocate partition vectors in the rolling buffer to avoid repeated heap allocation: reserve capacity for the expected maximum partition size (e.g., n/2 parts)
- [x] Reuse partition vectors via `swap()` instead of copy when moving data between rows
- [x] Recompile WASM and test: n=200 x=2 y=1 q=0.95 should complete without error 10/10 times

### Task 2: JavaScript error handling and robustness

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-04-RSK-sampling.md`

- [x] In `aztecDiamondSample`: check if ptr from sampleAztecRSK is 0 (null) before calling UTF8ToString - throw descriptive error if null
- [x] In `aztecDiamondSample`: after JSON.parse, check if result has `error` property (C++ error response) - throw error with the message
- [x] Improve catch block: show descriptive error including the caught error message, not just "Error!". Include suggestion to reduce n or check parameters
- [x] Add try-catch around `renderParticles()` and `update3DView()` calls in sample button handlers to prevent cascading failures
- [x] Clear timing display on error (currently shows stale timing from previous successful run)

### Task 3: 3D rendering performance - geometry batching

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-04-RSK-sampling.md`

Current bottleneck: each domino creates 5 Three.js objects (BufferGeometry + Material + Mesh + EdgesGeometry + LineSegments). For
n=100 this means 50,000 objects and 20,000+ draw calls.

- [x] Refactor `renderDominoes()`: collect all vertex/index data for each of the 4 domino color types into typed arrays, then create ONE merged BufferGeometry per type
- [x] Create 4 shared materials (one per color type) instead of N individual materials
- [x] Create 4 edge geometries (one per type) from the merged vertex data
- [x] Result: 8 total Three.js objects (4 meshes + 4 edges) regardless of domino count, instead of 2N objects
- [x] Remove per-domino `await new Promise(r => setTimeout(r, 0))` yield since batch creation is fast
- [x] Test: n=200 should show smooth 60fps rotation in 3D panel

### Task 4: 2D canvas zoom/pan performance for large n

**Files:**
- Modify: `_simulations/domino_tilings/2025-12-04-RSK-sampling.md`

Current bottleneck: every zoom/pan gesture triggers full `renderCanvas()` which loops over all dominoes. For n=500 (250K dominoes
x 2 draws = 500K canvas ops per frame), this drops below 15fps.

- [x] Batch canvas drawing by color: group dominoes by fill color, call `ctx.fillStyle` once per group, use `ctx.rect()` to accumulate rects then `ctx.fill()` once per color
- [x] Implement cached rendering for zoom/pan: render the full tiling to an OffscreenCanvas once, then during zoom/pan draw the cached image with `ctx.drawImage()` (only re-render when tiling data changes)
- [x] Optimize `computeDominoes`: replace string-key object lookups (`pointLookup["x,y"]`) with integer-keyed Map for O(1) neighbor lookups
- [x] Optimize `generateLatticePoints`: replace per-point object allocation with typed arrays for coordinates
- [x] Test: n=500 should show smooth zoom/pan at 30+ fps

### Task 5: Verify all improvements

- [x] Bug fix: sample 10 times with n=200, x=2, y=1, q=0.95 (both high-precision and fast mode) - all should succeed
- [x] Bug fix: sample with n=200, x=10, y=0.1, q=0.99 - should succeed
- [x] Performance: sample n=500 with default params - C++ sampling should complete in < 3s
- [x] 3D rendering: open 3D panel with n=200, verify smooth rotation and correct coloring
- [x] 2D zoom: with n=500 on canvas renderer, zoom in/out and pan - should be fluid
- [x] Edge cases: n=1, n=1000, q=0, q=0.999 - no crashes
