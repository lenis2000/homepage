# Factorial Schur exact sampler: workerized WASM, presets, and visual polish

## Overview

Make `/factorial/` a robust, fast, and beautiful exact sampler for the factorial Schur process. The current page is a useful proof-of-concept, but it has three serious problems:

1. The default rainbow path rendering is visually bad and hard to read.
2. Pan/zoom redraws directly from mouse events and feels rough; dense grids/labels make large samples unpleasant.
3. The exact sampler is synchronous JavaScript, so large systems can freeze the browser tab.

This plan replaces the hot exact reverse-Cauchy/Yang--Baxter sampler with workerized WASM, redesigns the frontend around a polished canvas renderer and better controls, and adds presets including the old screenshot preset from Leonid's note.

## Runner Note

Run this with the normal ralphex pipeline, preferably in Docker with Codex as requested by LP:

```sh
docker build -t ralphex-homepage:latest -f Dockerfile.ralphex-homepage .
RALPHEX_IMAGE=ralphex-homepage:latest ralphex-dk --codex docs/plans/2026-06-05-factorial-ybe-wasm-polish.md
```

The repository image should include Ruby/Bundler/Jekyll, Emscripten, Node, and Chromium. Do not add keyboard shortcuts unless LP explicitly asks; use visible buttons and controls instead.

## Context and references to inspect first

Current page and exact sampler:

- `factorial/index.html`
- `js/factorial-ybe-sampler.js`

Old Glauber/WASM implementation still useful as a source of parsing/build patterns, but do not revive the old Glauber UI:

- Current stale generated files: `js/factorial-glauber.js`, `js/factorial-wasm.js`
- Removed source can be inspected with git history:
  - `git show ff0ce2343^:factorial/index.html`
  - `git show ff0ce2343^:factorial/factorial-glauber.cpp`
  - `git show ff0ce2343^:factorial/build.sh`

Performance/design references already used elsewhere in this repo:

- `/domino/` optimized sampler: `s/domino.md`, `s/domino.cpp`, `tools/test-domino.mjs`
- T-embedding random sampler plan/tests: `docs/plans/completed/2026-06-04-temb-random-shuffled-sampler-optimization.md`, `tools/test-temb-shuffling.mjs`
- RSK sampler visual/canvas patterns: `_simulations/domino_tilings/2025-12-04-RSK-sampling.md`
- Homepage visual style: `css/main.css`, existing UVA navy/orange conventions

Old screenshot/preset reference:

- `/Users/leo/notes/content/2026-06/2026-06-05-sampling-algorithm-for-factorial-schur-processes/old_buggy_sampler.png`
- The screenshot used approximately:
  - `N = 12`, `M = 50`, `q = 0.2`, `alpha = beta = gamma = 1`
  - `x = 1,1` in the old UI, visually intended as all ones
  - `w = q^(-50+i)`
  - `y = q^(i-50)`
- The exact sampler requires strict `w_j > x_i`; the screenshot has the last value `w_50 = 1`, so a production preset should be an epsilon-safe visual equivalent, e.g. `x = 1^12`, `w = 1.001*q^(-50+i)`, `y = q^(i-50)`, with a note explaining the strict inequality adjustment.

## Scope guard

Only work on `/factorial/` and its direct support files. Do not change unrelated simulation pages. Preserve the current exact-sampler mathematical semantics: reverse Cauchy sequence from the frozen RHS and local Bernoulli split

```text
(x + y_k) / (w + y_k),    (w - x) / (w + y_k).
```

Preserve existing public controls/IDs where practical (`fs-N`, `fs-M`, `fs-q`, `fs-alpha`, `fs-beta`, `fs-gamma`, `fs-x`, `fs-w`, `fs-y`, `fs-sample-btn`, `fs-canvas`, etc.) so tests and links do not break. It is fine to wrap them in a better layout and add new controls.

## Success criteria

- `/factorial/` no longer freezes the main browser thread on large samples. Sampling runs in a Web Worker using WASM; cancel/reset/new sample can terminate a stale worker.
- The old screenshot fan preset is available as a named preset and produces the same qualitative fan shape, but with strict valid parameters.
- Default path rendering is not rainbow. Use a beautiful single-palette/tonal rendering by default, with the middle row and exits highlighted intentionally. If a legacy multicolor mode remains, it must be advanced/secondary, not the default.
- Pan/zoom is smooth and anchored under the pointer; pointer drag uses `requestAnimationFrame`, not direct redraw on every mousemove. Touch/pinch should work on mobile.
- Dense views use semantic zoom / level-of-detail: grid and row labels fade or disappear when too dense, and labels do not clutter the picture.
- Large systems remain responsive in the UI. Target cases:
  - default small sample: instant
  - old screenshot preset `N=12, M=50`: under about 1s on a typical laptop, visually clean
  - stress preset around `N=80, M=120`: no main-thread freeze; reasonable completion or clear progress/cancel behavior
- WASM and JS outputs agree on small deterministic test cases.
- Browser smoke tests verify preset loading, sampling, nonblank canvas rendering, worker/WASM path use, and no console errors.
- `bundle exec jekyll build` succeeds.

## Validation commands

Run at the end, and during development as relevant:

```sh
bash factorial/build-ybe.sh
node tools/test-factorial-ybe.mjs
bundle exec jekyll build
test -f js/factorial-ybe-wasm.js
test -f js/factorial-ybe-worker.js
```

If Chromium is available, the Node test should include browser smoke tests. If not, it should clearly skip only the browser part and still run source/WASM checks.

## Implementation steps

### Task 0: Baseline, invariants, and reference audit

**Files:**
- Read: `factorial/index.html`, `js/factorial-ybe-sampler.js`
- Read: `s/domino.cpp`, `s/domino.md`, `tools/test-domino.mjs`
- Read: `_simulations/domino_tilings/2025-12-04-RSK-sampling.md`
- Optional read via git: old `factorial/factorial-glauber.cpp` and `factorial/build.sh`
- Optional create: `docs/plans/benchmarks/factorial-ybe-baseline.md`

Before changing architecture, document the current behavior and performance.

- [x] Identify the exact hot path causing tab freezes: `sampleMany()` / `sampleRows()` / `swapAdjacentRows()` / per-column `localForward()` in synchronous JS.
- [x] Record baseline timings for default sample, old screenshot-like parameters, and one larger stress case. If a case freezes, record that qualitatively instead of waiting forever.
- [x] Record current mathematical invariants to preserve:
  - row order after all swaps is `w_1,...,w_M,x_N,...,x_1`;
  - `mu[j]` has length `N` for `j=0..M`;
  - `lam[j]` has length `j` for `j=0..N`;
  - `lam[N] = mu[M]`;
  - partitions are weakly decreasing and nonnegative;
  - row interlacing holds on both sides.
- [x] Add a small deterministic JS reference hook if needed for tests. It can be dev-only, but must allow seeded randomness so C++/WASM can be checked on tiny systems.
- [x] Confirm which stale old files are unused (`js/factorial-glauber.js`, `js/factorial-wasm.js`). Do not delete them until a source search and browser smoke test confirm `/factorial/` does not load them.

### Task 1: Implement workerized WASM exact sampler

**Files:**
- Create: `factorial/factorial-ybe-sampler.cpp`
- Create: `factorial/build-ybe.sh`
- Generate: `js/factorial-ybe-wasm.js`
- Create: `js/factorial-ybe-worker.js`
- Modify: `js/factorial-ybe-sampler.js`

Move the exact reverse-Cauchy sampler into C++/WASM and run it off the main thread.

- [ ] Build a C++ implementation of the current exact sampler, not the old Glauber chain.
- [ ] Use Xoshiro256++ RNG and explicit seed inputs. Use the proven RNG pattern from `s/domino.cpp`.
- [ ] Replace JS `Set` levels with compact flat/bit-packed level storage. Suggested structure: one bitset per level over `1..columnCap`, plus helpers `occ(level,column)`, `setOcc(level,column)`, and active max support. Avoid per-column allocations.
- [ ] Avoid recomputing the full local weight enumeration for every cell. Precompute the finite admissible local transition table keyed by boundary bits and input triple; at runtime use direct deterministic outputs or the Bernoulli split with the current `x,w,y_k`. Keep a slow assertion/debug path only if useful.
- [ ] Scan only to the actual active support plus the needed tail condition. Never blindly run to `columnCap` unless the sampler genuinely has not reached its forced tail.
- [ ] Export a C ABI similar to:
  - `_sampleFactorialYBE(N, M, xPtr, wPtr, yPtr, yLen, columnCap, seedLo, seedHi)` returning malloc-owned JSON `char*`;
  - `_freeString(ptr)`;
  - `_getProgress()`;
  - `_malloc`, `_free` for typed-array transfer.
- [ ] Return JSON with at least `{ N, M, mu, lam, lambda, stats, levels? }`, plus enough data for the renderer without recomputing partitions in JS. Include row-swap count, local move count, random choice count, max position, elapsed or C++ timing if convenient.
- [ ] Return structured errors as `{"error":"..."}` and ensure all C++ exceptions are caught and converted to JSON.
- [ ] Compile with Emscripten as a modular worker-compatible single-file bundle, e.g. `MODULARIZE=1`, `EXPORT_NAME=createFactorialYBEModule`, `ENVIRONMENT=web,worker`, `ALLOW_MEMORY_GROWTH=1`, `SINGLE_FILE=1`, `-O3`, `-fexceptions`.
- [ ] Implement `js/factorial-ybe-worker.js` that loads the WASM module, receives typed-array parameters, calls the C++ sampler, parses JSON/errors, and posts results back to the main thread.
- [ ] Transfer large `Float64Array` buffers to the worker to avoid copies where practical. If transferring would detach arrays still needed by the UI, clone intentionally and document that choice.
- [ ] Main thread must remain responsive while sampling. New sample/reset/cancel should terminate the current worker or ignore stale response IDs.
- [ ] Keep the old JS sampler only as a small-system debug/reference fallback. The visible `Sample exactly` button should use workerized WASM by default when available; do not silently fall back to slow JS for large systems.

### Task 2: Robust JS orchestration, parameter parsing, and failure handling

**Files:**
- Modify: `js/factorial-ybe-sampler.js`
- Modify: `factorial/index.html`

Make the frontend durable under bad parameters and repeated user actions.

- [ ] Split current monolithic JS into named sections/functions: control read, parameter expansion, validation, worker request, result normalization, stats update, render invalidation.
- [ ] Keep the parameter expression syntax currently advertised, and improve it where needed:
  - expressions like `q^(-50+i)` must work;
  - repeat syntax should support useful constants such as `1^N`, `1^M` if straightforward;
  - finite lists should fail with a clear message if too short, unless an explicit repeat/cycle syntax is documented.
- [ ] Evaluate `y` to the required `columnCap` or a safe inferred length before transfer to WASM. Check for non-finite values and for local positivity `w_j + y_k > 0`, `x_i + y_k >= 0` over the range that will be used.
- [ ] Strictly validate all `w_j > x_i`. If a preset needs an epsilon adjustment, make that explicit in the preset description.
- [ ] Add structured status states: ready, validating, sampling, rendering, done, canceled, error.
- [ ] Add visible elapsed time in seconds and phase text, following the polished style of the RSK/domino pages.
- [ ] Disable only the controls that must not be edited during an active worker run, but keep Cancel/Reset available.
- [ ] Guard against stale worker results by request ID. A slow old sample must not overwrite a newer sample.
- [ ] Null-check all WASM pointers in the worker before `UTF8ToString`, always call `freeString()` in `finally`, and surface C++ `{error: ...}` messages clearly.
- [ ] Do not use `innerHTML` with untrusted parameter/error text. Use `textContent` for statuses and summaries.
- [ ] Add a dev-only benchmark helper, e.g. `window.factorialYBEBenchmark(options)`, that runs default, old preset, and stress cases, returns structured timings, and restores controls afterward.

### Task 3: Beautiful path renderer and smooth viewport

**Files:**
- Modify: `factorial/index.html`
- Modify: `js/factorial-ybe-sampler.js`
- Optional create: `js/factorial-ybe-renderer.js` if splitting improves maintainability

Replace the ugly rainbow path display with a polished canvas visualization.

- [ ] Default rendering must be single-palette/tonal, not rainbow. Suggested default: deep UVA navy paths with index-dependent opacity/lightness, amber/orange accent for the middle sampled `lambda` row, soft cream/blue stack backgrounds.
- [ ] If retaining multicolor paths, put them behind an advanced `Path style: legacy colors` option. It must not be default.
- [ ] Precompute path geometry from `mu/lam`/levels once per sample. Store arrays of model-space segments or polylines; do not derive positions repeatedly during every draw.
- [ ] Implement a `FactorialPathCanvasRenderer` with:
  - HiDPI setup;
  - persistent viewport `{scale, tx, ty}` in model coordinates;
  - pointer events with pointer capture for drag;
  - wheel zoom anchored under cursor;
  - pinch zoom on touch devices;
  - `requestAnimationFrame` draw scheduling;
  - clamped min/max zoom;
  - fit/reset methods;
  - no direct heavy draw from `mousemove`/`touchmove` handlers.
- [ ] Add visible zoom controls in the canvas toolbar: Fit, 100%, +, −, and maybe a compact minimap/overview if simple. Do not add keyboard shortcuts.
- [ ] Use semantic zoom/LOD:
  - dense grid hidden or very faint when cells are too small;
  - row labels hidden/condensed when overlapping;
  - labels rendered only near visible rows/columns;
  - path endpoints/particles simplified at low zoom;
  - optional hover/selection details only if cheap and tasteful.
- [ ] Cache static background/grid layers separately from path layers where useful. Use `OffscreenCanvas` or a hidden canvas when available, with normal canvas fallback.
- [ ] Make initial fit beautiful: center the arctic/fan region, not a huge empty rectangle; include reasonable padding; do not bury the picture at the bottom of the viewport.
- [ ] Render the sampled `lambda` signature/middle row in a visually meaningful way: subtle horizontal rule, highlighted particles, or a small summary panel.
- [ ] Maintain accessibility: canvas `aria-label`, textual `lambda` summary, readable focus states, high contrast in light/dark mode.
- [ ] The design should fit the homepage style: Franklin Gothic, UVA navy/orange, clean cards, subtle borders, dark-mode variables.

### Task 4: Redesign controls and add presets

**Files:**
- Modify: `factorial/index.html`
- Modify: `js/factorial-ybe-sampler.js`

Make the controls feel intentional and reduce manual parameter pain.

- [ ] Replace the stacked utilitarian controls with a two-column simulation layout on desktop: sticky control panel on the left, large canvas/results panel on the right. On mobile, controls should collapse above/below the canvas cleanly; do not implement a fragile custom drawer unless it is tested.
- [ ] Use collapsible sections:
  - Presets and size;
  - Spectral parameters;
  - Sampling/run controls;
  - View/style controls;
  - Model explanation.
- [ ] Add a preset selector with named presets and short descriptions. Required presets:
  - `Default balanced`: current safe small default or a better nontrivial small default.
  - `Old buggy sampler fan (epsilon-safe)`: `N=12`, `M=50`, `q=0.2`, `alpha=1`, `beta=1`, `gamma=1`, `x=1^12`, `w=1.001*q^(-50+i)`, `y=q^(i-50)`, with description noting original screenshot had `w_50=x=1` and this preset nudges `w` for strict validity.
  - `Uniform / Schur-like`: constant-ish safe values.
  - `Near frozen`: a low-activity case that often returns small `lambda`.
  - `Large stress`: a case large enough to prove the worker/WASM path does not freeze the UI.
- [ ] Applying a preset should update all relevant controls: `N`, `M`, q/alpha/beta/gamma, x/w/y expressions, column cap, cell size/view fit, and notes.
- [ ] Preset descriptions should explain what visual behavior to expect, not just list numbers.
- [ ] Improve parameter summaries: show first/last values, min/max, and any dangerous values near equality `w_j ≈ x_i`.
- [ ] Add a clear validation panel for strict inequalities and positivity. It should say what failed and how to fix it.
- [ ] Keep advanced raw x/w/y entry available, but do not make it the first thing users see.
- [ ] Preserve existing IDs where practical so browser tests can interact with controls.

### Task 5: Tests, smoke checks, and stale-file cleanup

**Files:**
- Create: `tools/test-factorial-ybe.mjs`
- Modify/create as needed: `factorial/build-ybe.sh`, `factorial/index.html`, `js/factorial-ybe-sampler.js`, `js/factorial-ybe-worker.js`
- Optional delete after confirming unused: `js/factorial-glauber.js`, `js/factorial-wasm.js`

Add automated protection so this page does not regress.

- [ ] Add source checks:
  - page loads the worker/WASM files, not stale old Glauber files;
  - generated `js/factorial-ybe-wasm.js` contains the expected exported C++ function names;
  - no old hard-coded small caps contradict the UI;
  - no hot sampler path uses synchronous `Math.random` except the explicit debug/reference fallback.
- [ ] Add C++/WASM smoke tests callable from Node or browser:
  - default small sample returns valid JSON and invariants;
  - old fan preset returns valid nonnegative interlacing data;
  - invalid equality/positivity cases return structured errors.
- [ ] Add JS-vs-WASM deterministic cross-check for tiny cases where feasible (`N,M <= 3`, fixed x/w/y, fixed seed). If exact sample paths differ because RNG ordering differs, at least compare invariants and aggregate sanity; preferably align RNG draws so outputs match.
- [ ] Add browser smoke using Chromium DevTools Protocol, modeled on `tools/test-domino.mjs` or `tools/test-temb-shuffling.mjs`:
  - serve the site locally;
  - load `/factorial/`;
  - click/apply default preset and sample;
  - apply old fan preset and sample;
  - verify canvas is nonblank;
  - verify worker/WASM path was used (`window` diagnostic or status text);
  - verify no console errors;
  - verify Cancel/Reset during a large sample does not leave stale UI.
- [ ] Add visual screenshot helper in the smoke test or as a manual command. Store temporary screenshots in `/tmp` or `~/scratch`, not `~/Downloads`, and do not commit them.
- [ ] If `rg` confirms `js/factorial-glauber.js` and `js/factorial-wasm.js` are no longer referenced, remove them to avoid future confusion. If keeping them for historical reasons, add a clear comment/test ensuring `/factorial/` does not load them.

### Task 6: Final visual QA and documentation polish

**Files:**
- Modify: `factorial/index.html`
- Modify: `js/factorial-ybe-sampler.js`
- Modify: any new docs/benchmark notes created above

Finish with visual review, not just code tests.

- [ ] Run `/factorial/` locally and inspect at desktop width around 1920×1080.
- [ ] Capture screenshots for default preset, old fan preset, and large stress/pending state. Use `/tmp` or `~/scratch` only.
- [ ] Check light and dark mode if the site supports both.
- [ ] Check mobile/narrow layout: controls should not crush the canvas or create horizontal page scrolling.
- [ ] Confirm pan/zoom feels smooth: wheel anchored under cursor, drag does not lag, fit button recenters the meaningful region.
- [ ] Confirm multicolor is not the default and the default view is aesthetically coherent.
- [ ] Confirm all controls still work: apply preset, edit parameters manually, apply/reset, sample once, sample many if retained, cancel/reset, fit/zoom buttons, square/non-square cells if retained.
- [ ] Run final validation commands:

```sh
bash factorial/build-ybe.sh
node tools/test-factorial-ybe.mjs
bundle exec jekyll build
```

- [ ] Commit changes with a concise signed-off message such as `Improve factorial sampler performance and UI`.
