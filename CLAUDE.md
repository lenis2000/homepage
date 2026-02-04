# Homepage Project

- Color patterns are defined in `js/colorschemes.js` and used in lozenge/domino drawing files. This file contains links to the files which use these color patterns.
- For cpp compile, look at their preambles
- Simulation-specific documentation is in `_simulations/CLAUDE.md`

## Paper Posts & S3 Storage

### Adding a New Paper
1. Create `_posts/papers/YYYY-MM-DD-slug.md` with front matter (see existing posts for template)
2. Upload PDF to S3: `aws s3 cp paper.pdf s3://lpetrov.cc.storage/papers/NN-slug.pdf`
3. PDF naming: `{cv-number}-{slug}.pdf` (e.g., `50-colored-interlacing-genocchi.pdf`)
4. Commit and push — GitHub Actions builds Jekyll and deploys site to `s3://lpetrov.cc` with CloudFront invalidation

### Paper Post Front Matter Template
```yaml
layout: post
title: "Paper Title"
arXiv: YYMM.NNNNN [math.XX]
coauthors:
  - name: Coauthor Name
    web: https://...       # optional, use 'noweb: true' if no website
  - name: Leonid Petrov
categories: blog math preprint   # use 'paper' once published
journal-ref: ...                 # add when published
journal-web: https://...         # DOI link
journal-year: YYYY               # publication year (extracted from journal-ref)
image: __STORAGE_URL__/img/papers/image.png   # optional
show-date: true
pdf: NN-slug.pdf
post-pdf: true
pages: NN
cv-number: NN
published: true
simulations: simulations/YYYY-MM-DD-slug/    # optional
```

### journal-year Field
- Every published paper post should have a `journal-year:` field with the publication year
- For preprints, add commented-out placeholder: `# journal-year:`
- This field is used by the coauthors sidebar on the research page
- The post date corresponds to the arXiv submission date, NOT the journal publication date

### S3 Buckets
- **Site**: `s3://lpetrov.cc` (deployed by GitHub Actions, don't push PDFs here)
- **Storage**: `s3://lpetrov.cc.storage` — paper PDFs go to `papers/` prefix, served at `https://storage.lpetrov.cc`

### Current Paper Count
- Latest cv-number: 50 (as of Feb 2026)

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

### WebGPU Lazy Initialization (Race Condition Fix)
- WebGPU engine scripts may not be loaded when defer'd simulation scripts run
- Do NOT check WebGPU availability at init time — it may not exist yet
- Use lazy init pattern: attempt GPU init in `onSlideEnter()` with a guard flag
- Pattern:
  ```javascript
  let gpuEngine = null;
  let gpuInitAttempted = false;
  async function tryInitGPU() {
      if (gpuInitAttempted) return;
      gpuInitAttempted = true;
      if (typeof WebGPUQPartitionEngine !== 'undefined' && WebGPUQPartitionEngine.isAvailable()) {
          gpuEngine = new WebGPUQPartitionEngine();
          await gpuEngine.init();
      }
  }
  // Call in onSlideEnter(), NOT at module load time
  ```

### Slide Reuse Across Talks
- Same slide HTML/JS can be used in multiple talks (e.g., pure math colloquium vs applied math colloquium)
- Comment out slides in `index.html` with `<!-- -->` to disable for a specific talk variant
- Comment out both the `{% include %}` and the `<script>` tag
- Keep files intact so they can be re-enabled by uncommenting

### Element ID Namespacing for Coexisting Slides
- When two slides share similar content, prefix IDs to avoid DOM conflicts
- Example: `#random-path` uses `local-view-canvas`, `#random-path-gaussian` uses `rpg-local-view-canvas`
- Convention: use slide-specific prefix (e.g., `rpg-` for random-path-gaussian)

### Accumulative Sampling for Histograms
- For progressive histogram reveals, accumulate samples across steps rather than resetting
- Use target counts and compute `needed = target - currentCount` to add the difference
- Example: targets [1000, 2000, 3000, 4000, 5000] with initial 20 from CFTP → adds 980, 1000, 1000, 1000, 1000
- Avoids jarring reset-and-resample on each step

### Multi-Material Mesh Disposal
When using multi-material meshes (e.g., Minecraft mode with material arrays), disposal must handle arrays:
```javascript
if (Array.isArray(child.material)) {
    child.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
} else {
    child.material.dispose();
}
```

### Alternative Rendering Modes (LEGO, Minecraft)
- Use a `renderMode` variable (`'standard'`, `'lego'`, `'minecraft'`) to switch geometry builders
- `regenerate()` checks `renderMode` and calls the appropriate builder
- Reference implementations for LEGO (`dimersToLego3D`) and Minecraft (`dimersToMinecraft3D`) are in `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.md`
- LEGO: `MeshStandardMaterial` with `roughness: 0.35, metalness: 0.0`, `InstancedMesh` for studs, brick merging via edge adjacency
- Minecraft: Procedural 16×16 textures with `NearestFilter`, `MeshLambertMaterial`, union-find for block grouping

### Lozenge 3D Camera Convention
- Use `camera.up.set(0, 0, 1)` (Z-up) for lozenge tilings, matching the ultimate lozenge simulation
- `to3D(n, j, h)` maps to `{ x: h, y: -n - h, z: j - h }`
- Dynamic `centerCamera(heights)` computes bounding box and positions camera at `center - size*3` along X, `center + size*1.5` along Y and Z

### Coauthors Sidebar (research page)
- Auto-generated from paper/preprint post front matter via Liquid in `research/research.html`
- Sorted by last name using `LastName^FullName^Year` entries
- Shows: `[count] Name (≤year)` — year is journal-year if available, else arXiv year
- Includes a "Solo" entry for sole-authored papers
- Uses `{%- -%}` whitespace-stripping Liquid tags to prevent unwanted line breaks
- Uses `&nbsp;` for spaces inside stripped blocks (regular spaces get eaten)
- Styled with `list-group-sm` / `list-group-item` to match other sidebar sections

### arXiv Submission Workflow
- Create `arXiv_vN/` folder with flat structure (no subdirectories)
- Copy: `.tex`, `.bib`, `.bbl`, and all referenced images
- Update `\includegraphics` paths if they reference subdirectories
- Create `abstract.txt` with plain text title, authors, and abstract (keep `$...$` math)
- Use single hyphens in abstract (arXiv style), not `--` em-dashes

### Mathematical Content Sourcing
- **NEVER invent mathematical content** — user is a working mathematician and will catch errors
- When slide content involves specific theorems/equations from papers, verify against the actual paper source
- Fetch arXiv TeX sources: `https://arxiv.org/e-print/{id}` returns gzipped TeX (may be `.tar.gz` or plain `.tex.gz`)
- If the original variational principle / theorem was already correct, don't rewrite it — only fix the parts that were actually wrong
- Maintain **notation consistency across slides** — if one slide says "maximizes ∬σ(∇h)", other slides should use the same sign convention

### Pre-sampled Image Badge
For static pre-computed images (when live simulation is too slow):
```html
<div style="position: relative;">
    <img src="images/example.png" alt="Description" style="max-height: 34vh; max-width: 100%; object-fit: contain;">
    <div style="position: absolute; top: 0.5vh; right: 0.5vw; background: rgba(229, 114, 0, 0.9); color: white; padding: 0.3vh 0.6vw; border-radius: 3px; font-size: clamp(0.7rem, 1.2vw, 1rem); font-weight: bold;">pre-sampled</div>
</div>
```
Images stored in `talk/waterfall/images/`

### Variable Naming in Slides
- Avoid variable names that read badly in text context (e.g., "3d sides" reads like "3D" → use "3k sides" instead)

### User Preferences
- Don't run Jekyll builds - user handles deployment
- Prefer static KaTeX formulas in HTML over dynamic JS rendering
- Keep dynamic value displays (e.g., computed q-binomial values) separate from static formulas
- Avoid redundant status text — show sample counts in ONE place (e.g., under histogram only, not also under the path canvas)
- When switching rendering modes (LEGO, Minecraft), do NOT announce the mode in descriptions — just silently change the visual style while keeping the mathematical description unchanged
- Grid column widths are per-slide — adjust to fit content (e.g., `52vw 40vw` for text-heavy left, `42vw 50vw` for balanced)
