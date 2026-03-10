# Refactor data-art/triangle.html into Modular Structure

## Overview

Refactor the 2,146-line monolithic `data-art/triangle.html` into a modular directory structure following the talk organization pattern (`talk/visual/`, `talk/waterfall/`). Create a dedicated, smaller WASM module instead of depending on the full ultimate-lozenge (215KB). Extract inline CSS and JS into separate files organized by concern.

## Context

- Files involved:
  - `data-art/triangle.html` (current monolith, 2,146 lines / 90KB)
  - `/js/2025-11-28-ultimate-lozenge.js` (current dependency, 215KB non-modularized WASM)
  - `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.cpp` (3,105 lines, source for current WASM)
  - `talk/visual/sim/src/visual-lozenge.cpp` (3,163 lines, talk's smaller WASM copy — pattern to follow)
- Related patterns: `talk/visual/` directory structure (index.html + js/shared/ + js/*-sim.js + sim/src/)
- Dependencies: Three.js (`/js/three.min.js`), OrbitControls (`/js/OrbitControls.js`), JetBrains Mono font

## Current State

- triangle.html is a single file with ~200 lines CSS, ~30 lines HTML, ~1900 lines inline JS
- Uses non-modularized WASM via global `Module.onRuntimeInitialized`
- WASM functions actually used: initFromTriangles, performGlauberSteps, exportDimers, setQBias, setHoleBaseHeight, getHoleCount, getAllHolesInfo, adjustHoleWindingExport, freeString, initCFTP, stepCFTP, finalizeCFTP
- NOT used (can strip): periodic weights, random sweeps, fluctuations CFTP, grid data export, loop detection, repair region, batch runCFTP, CFTP max/min dimers, seedRNG, setDimers, vertical cut info
- 7 states: HOOK -> LOADING -> FLYING_CUBES -> ASSEMBLY -> TRANSFORMING -> FROZEN -> TEXT_SCREEN

## Target Directory Structure

```
data-art/triangle/
├── index.html              # Entry point (permalink: /triangle/)
├── css/
│   └── triangle.css        # Extracted styles
├── js/
│   ├── config.js           # Constants, colors, timing, base shape geometry
│   ├── geometry.js         # Lattice geometry helpers, shape scaling
│   ├── wasm-interface.js   # Modularized WASM loading + SimulatorInterface class
│   ├── sonification.js     # Audio sonification class
│   ├── hook.js             # Hook screen background particle animation
│   ├── surface.js          # Three.js surface mesh building from dimers
│   ├── phases.js           # All phase logic (flying cubes, assembly, annealing, frozen orbit, text screen)
│   └── main.js             # State machine, render loop, initialization, click handlers
└── sim/
    ├── src/
    │   └── triangle-lozenge.cpp   # Stripped-down WASM source (~1500 lines)
    └── triangle-lozenge.js        # Compiled modularized WASM (target: <100KB)
```

## Development Approach

- No unit tests — use agent-browser visual verification (same as the previous data-art-polish plan)
- Verify at 1920x1080 after each task
- Each task must maintain the full animation pipeline working
- Incremental extraction: move code piece by piece, testing between each move

## Implementation Steps

### Task 1: Create directory structure and stripped-down WASM source

**Files:**
- Create: `data-art/triangle/sim/src/triangle-lozenge.cpp`
- Reference: `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.cpp`

- [ ] Create the `data-art/triangle/` directory tree (css/, js/, sim/src/)
- [ ] Copy ultimate-lozenge.cpp to triangle-lozenge.cpp
- [ ] Strip out unused exported functions: periodic weights (setPeriodicQBias, setPeriodicK, setUsePeriodicWeights), random sweeps, batch runCFTP, CFTP max/min dimer export, repairRegion, setDimers, getVerticalCutInfo, getHardwareConcurrency, fluctuations CFTP (4 functions), grid data export (4 functions), loop detection (3 functions), seedRNG
- [ ] Remove the C++ implementation code backing those functions (not just the exports)
- [ ] Update the compile command in the file header: MODULARIZE=1, EXPORT_NAME='TriangleLozenge', only needed exported functions
- [ ] Compile the stripped WASM module
- [ ] Verify compiled JS size is meaningfully smaller than 215KB

### Task 2: Extract CSS and create entry point skeleton

**Files:**
- Create: `data-art/triangle/css/triangle.css`
- Create: `data-art/triangle/index.html`

- [ ] Extract all inline CSS from triangle.html into `css/triangle.css`
- [ ] Create `index.html` with Jekyll front matter (`layout: null`, `permalink: /triangle/`), HTML structure, and script/link tags loading all modules
- [ ] Load Three.js and OrbitControls from /js/
- [ ] Load the new modularized WASM from sim/triangle-lozenge.js
- [ ] Load all JS modules with defer
- [ ] Verify the HTML structure matches the original (hook-screen, canvas, vignette, caption, text-screen, attribution, loading, hook-bg)

### Task 3: Extract JS modules — config, geometry, WASM interface

**Files:**
- Create: `data-art/triangle/js/config.js`
- Create: `data-art/triangle/js/geometry.js`
- Create: `data-art/triangle/js/wasm-interface.js`

- [ ] Extract config.js: LOZENGE_COLORS_3D, SCALE_ITERATIONS, STEPS_PER_FRAME, CUBE_SIZE, BASE_SHAPE, timing constants (FLYING_DURATION, ASSEMBLY_DURATION, etc.), Q values, state enum — expose as `window.TriangleConfig`
- [ ] Extract geometry.js: getVertex, getTriangleCentroid, pointInPolygon, doubleMeshWithBoundaries — expose as `window.TriangleGeometry`
- [ ] Extract wasm-interface.js: SimulatorInterface class rewritten to use modularized WASM (`const mod = await TriangleLozenge()`) instead of global Module — expose as `window.SimulatorInterface`
- [ ] Verify these modules load and initialize without errors in browser console

### Task 4: Extract JS modules — hook, sonification, surface

**Files:**
- Create: `data-art/triangle/js/hook.js`
- Create: `data-art/triangle/js/sonification.js`
- Create: `data-art/triangle/js/surface.js`

- [ ] Extract hook.js: hook background particle animation (drifting lozenges on canvas) — expose as `window.HookBackground`
- [ ] Extract sonification.js: Sonifier class (Web Audio API drone + entropy mapping) — expose as `window.Sonifier`
- [ ] Extract surface.js: Three.js surface mesh building from dimers (dimer-to-3D conversion, height function computation, mesh geometry updates) — expose as `window.SurfaceBuilder`

### Task 5: Extract JS modules — phases and main

**Files:**
- Create: `data-art/triangle/js/phases.js`
- Create: `data-art/triangle/js/main.js`

- [ ] Extract phases.js: all phase-specific logic (flying cubes creation/physics/animation, assembly convergence, annealing with MCMC, frozen camera orbit with 2 rotations, text screen line-by-line reveal) — expose as `window.TrianglePhases`
- [ ] Extract main.js: state machine, render loop (requestAnimationFrame with dt clamping), click handlers, Three.js scene/renderer/camera/controls initialization and disposal, phase transition orchestration, auto-restart timer
- [ ] Verify the full animation pipeline works: hook screen click -> loading -> flying cubes -> assembly -> annealing -> frozen orbit -> text screen -> auto-restart

### Task 6: Visual verification and cleanup

**Files:**
- Remove: `data-art/triangle.html` (old monolith)

- [ ] Start local server and test at 1920x1080 with agent-browser
- [ ] Verify hook screen renders correctly (background particles, question text, hint)
- [ ] Verify flying cubes phase (3,072 cubes tumbling)
- [ ] Verify assembly phase (cubes converge to lattice positions)
- [ ] Verify annealing phase (chaos-to-order with entropy slider, 3D surface)
- [ ] Verify frozen orbit phase (camera rotates around surface)
- [ ] Verify text screen phase (code reveals line by line)
- [ ] Verify auto-restart after idle timeout
- [ ] Remove old `data-art/triangle.html`
- [ ] Test at 1280x720 and 2560x1440 for responsive behavior
