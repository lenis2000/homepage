# Homepage Project

- Color patterns are defined in `js/colorschemes.js` and used in lozenge/domino drawing files. This file contains links to the files which use these color patterns.
- For cpp compile, look at their preambles
- Simulation-specific documentation is in `_simulations/CLAUDE.md`

## Talk Slides (waterfall talk)

- Slides are in `_includes/talk/waterfall/*.html`
- Each slide is a separate HTML file with `id` matching the URL hash (e.g., `#spectral-projection` → `spectral-projection.html`)

### Pane Colors
- **Orange/accent panes**: `background: #f5f5f5; border-left: 4px solid var(--slide-accent);` with `color: var(--slide-accent);` for titles
- **Blue/navy panes**: `background: #e3f2fd; border-left: 4px solid var(--slide-navy);` with `color: var(--slide-navy);` for titles
- **Yellow/warning panes**: `background: #fff3e0; border-left: 4px solid #E57200;` with `color: #E57200;` for titles

### Citation Style
- **Inline citations** (after pane titles): `<strong style="color: var(--slide-accent);">Title</strong> <span style="color: var(--slide-muted);">[Author Year]</span>`
- **Inline citations** (within text): `<span style="color: var(--slide-muted);">[Author Year]</span>`
- **References section**: `<strong style="color: var(--slide-accent);">References:</strong>` followed by citations in muted color (inherited from parent div with `color: var(--slide-muted);`)

### Simulation JS Files
- Located in `talk/waterfall/js/*.js`
- Each slide with interactive content has a corresponding JS file (e.g., `spectral-transversal-sim.js`)
- Use IIFE pattern `(function() { ... })();` for encapsulation
- Register with slide engine via `window.slideEngine.registerSimulation(slideId, {...}, 0)`

### 3D Lozenge Tiling Simulations
- Use Three.js for 3D rendering with OrbitControls for camera interaction
- WASM sampling via Mode 7 (`IMAGINARY_Q_RACAH`) with `setImaginaryQ(q)` and `initializeTiling(N, T, 0, 7, -kappasq)`
- Standard parameters: N=80, T=160, S=80, κ=3
- Camera logging pattern for debugging: `controls.addEventListener('change', () => console.log(...))`
- Dispose WebGL on slide leave to avoid context limits

### Slice Visualizations
- **Diagonal slice**: Plane equation `x/S + y/(T-S) = 1`, find path intersections
- **Horizontal slice**: Extract path at z=N/2, the contour at that height level
- For rotated 2D plots, use uniform scaling (same scale for both axes) to preserve aspect ratio
- 45° clockwise rotation: `rotX = (x + y) / sqrt(2)`, `rotY = (y - x) / sqrt(2)`

### Slide Layout Patterns
- Dense formula slides: Use 2-column grid `grid-template-columns: 38vw 56vw` for text left, formulas right
- Compact padding for formula panes: `padding: 0.6vh 1vw`
- Smaller formula font: `font-size: clamp(1rem, 1.7vw, 1.35rem)`

### KaTeX Limitations (slides use KaTeX, not MathJax)
- `\widetilde` not supported → use `\tilde`
- `\begin{cases}` doesn't render well → use HTML table with individual `\(...\)` formulas
- `\Bigl{` doesn't render → use HTML `{` character with large font-size or SVG curly brace
- For tall curly braces in piecewise definitions, use SVG:
  ```html
  <svg width="20" height="120" viewBox="0 0 20 120" style="display: block;">
      <path d="M18 2 Q8 2 8 20 L8 50 Q8 60 2 60 Q8 60 8 70 L8 100 Q8 118 18 118" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>
  ```

### Slide Build Order Pattern
- Hidden elements: `opacity: 0; transition: opacity 0.3s;`
- Add IDs to elements for step-based reveals (e.g., `id="st-converge"`)
- JS helpers: `showElement(id)` sets opacity to 1, `hideElement(id)` sets to 0
- Register with `steps: N`, implement `onStep(step)` and `onStepBack(step)`
- In `reset()`, hide all step-dependent elements

### 2D Canvas Pan/Zoom
- Track state: `{ scale, offsetX, offsetY, isDragging, lastX, lastY }`
- Wheel event needs `{ passive: false }` to allow `preventDefault()`
- Apply transform when drawing: multiply base scale/offset by zoom state

### Camera Zoom Animations
- Use `easeInOutCubic` for smooth animation: `t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2`
- Store initial/target positions as constants
- Animate with `requestAnimationFrame` loop using elapsed time
- Typical duration: 1500-3000ms for slow, deliberate zoom
- Can synchronize 3D (Three.js) and 2D (canvas) camera animations

### WASM Initialization Pattern
- **Critical**: Check `Module.calledRun` in addition to `Module.cwrap` existence
- Listen for `wasm-loaded` event dispatched after WASM modules load
- Pattern:
  ```javascript
  function tryInitWasm() {
      if (typeof Module !== 'undefined' && typeof Module.cwrap === 'function' && Module.calledRun) {
          if (wasmInterface.initialize()) { wasmReady = true; }
      }
  }
  tryInitWasm();
  if (!wasmReady) {
      window.addEventListener('wasm-loaded', tryInitWasm, { once: true });
  }
  ```
- Without `Module.calledRun` check, Firefox may fail with "function is not a function" errors

### Async Loading Guards
- Always guard after async operations (OBJ loading, WASM calls) since Three.js may be disposed mid-load
- Pattern: `if (!meshGroup) return;` after await statements
- Animation loops need guards: `if (!camera || !controls) { isAnimating = false; return; }`

### Service Worker & Offline Caching
- Service worker at `/talk/waterfall/sw.js` with scope `/talk/waterfall/`
- Precaches WASM, JS, images, OBJ models, fonts, KaTeX
- Bump `CACHE_NAME` version (e.g., `waterfall-talk-v4`) when updating cached assets
- Self-hosted assets (no CDN dependencies):
  - Unna font: `/fonts/unna-*.woff2`
  - KaTeX 0.16.9: `/katex-0.16.9/`

### User Preferences
- Don't run Jekyll builds - user handles deployment
- Prefer static KaTeX formulas in HTML over dynamic JS rendering
- Keep dynamic value displays (e.g., computed q-binomial values) separate from static formulas
