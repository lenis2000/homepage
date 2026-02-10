# Talk/Slide Infrastructure

Slides live in `/talk/<name>/index.html` (URL: `/talk/<name>/`).

## Approved (Frozen) Slides
- Files with `<!-- APPROVED: Do not modify without explicit user request -->` (HTML) or `// APPROVED: ...` (JS) at the top are frozen — do NOT edit them unless the user explicitly asks

**Key files:**
- `/js/slide-engine.js` - Navigation, hash routing, simulation lifecycle
- `/css/slides.css` - UVA-branded slide styles
- `/_layouts/slides.html` - Jekyll layout for slides

**Creating a new talk:**
1. Create folder: `/talk/my-talk/index.html`
2. Use front matter: `layout: slides`, `title: "Talk Title"`
3. Each slide is a `<section class="slide" id="unique-id" data-title="Menu Title">`

**Slide classes:**
- `.slide` - Base slide
- `.slide-center` - Center content vertically and horizontally
- `.slide-top` - Align content to top
- `.slide-simulation` - For slides with interactive simulations
- `.slide-columns` - Two-column grid layout

## Responsive Design (1920x1080 projector)

Use `vh`, `vw`, and `clamp()` for consistent sizing. No manual zoom adjustment needed.

| Element | Size | Notes |
|---------|------|-------|
| **Title slide h1** | `clamp(2.5rem, 3.5vw, 4rem)` | Main talk title |
| **Part headers (I, II, III)** | `clamp(3rem, 5vw, 5.5rem)` | Large section dividers |
| **Slide titles (h2.slide-title)** | `clamp(1rem, 1.5vw, 1.4rem)` | Standard slide header |
| **Body text (STANDARD)** | `clamp(1.2rem, 2.2vw, 1.8rem)` | Use this for most text |
| **Highlighted/question text** | `clamp(1.5rem, 2.8vw, 2.2rem)` | Important callouts |
| **Formula text** | `clamp(1.5rem, 2.5vw, 2rem)` | Math formulas |
| **Captions/labels** | `clamp(0.75rem, 1vw, 1rem)` | Small text under images |
| **Input labels** | `clamp(0.9rem, 1.5vw, 1.1rem)` | Form controls |
| Grid images (2x2) | `height: 22vh` | |
| Single feature image | `height: 50vh` | |
| Simulation canvas | `height: 55vh; width: auto` | |
| Grid gaps | `clamp(0.5rem, 1vw, 1rem)` | |
| Margins | `margin-top: 2vh` | Use vh/vw |

## Shaded Content Panes

For theorems, definitions, callouts:
```html
<div style="background: #f5f5f5; border-left: 4px solid var(--slide-accent); padding: 1vh 1.5vw; font-size: clamp(1.2rem, 2.2vw, 1.8rem); text-align: left;">
    <strong style="color: var(--slide-accent);">Theorem [Author Year]:</strong><br>
    Statement text here with <strong>emphasis</strong> as needed.
</div>
```

For multiple panes side-by-side:
```html
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2vw; text-align: left;">
    <div style="background: #f5f5f5; border-left: 4px solid var(--slide-accent); padding: 1vh 1.5vw; font-size: clamp(1.2rem, 2.2vw, 1.8rem);">
        Left pane content
    </div>
    <div style="background: #f5f5f5; border-left: 4px solid var(--slide-accent); padding: 1vh 1.5vw; font-size: clamp(1.2rem, 2.2vw, 1.8rem);">
        Right pane content
    </div>
</div>
```

## Navigation & Keyboard Shortcuts

- Arrow keys, Space, PageDown/Up for next/prev
- Cmd+Left/Right (Mac) or Home/End for first/last slide
- G to open jump menu (type number + Enter)
- P to show build order overlay (fragments/simulations per slide)
- F for fullscreen
- Escape to close any overlay
- Direct arrows (◀ ▶) in footer skip fragments/sims

## Fragments (PowerPoint-style reveals)

```html
<li class="fragment">Appears on arrow/click</li>
<li class="fragment fade-up">Fades up</li>
<li class="fragment fade-down">Fades down</li>
<li class="fragment zoom-in">Zooms in</li>
```

**Fragment vs Simulation ordering:**
The slide-engine processes fragments BEFORE simulations on the same arrow press. To have a simulation start before text appears:
1. Remove `class="fragment"` from the text element
2. Use `opacity: 0` and `transition: opacity 0.3s` for the hidden state
3. Use `onStep` API in the simulation to show the text on a later step

## Simulation Integration

**Canvas vs SVG:**
- **Canvas**: Use for animation (fast). Use 2x resolution for crisp rendering.
- **SVG**: Use for static export only. DOM manipulation is too slow (~70ms/frame).

**Basic simulation with SlideSimulation helper:**
```javascript
const sim = SlideSimulation.create({
    canvasId: 'my-canvas',
    slideId: 'my-slide',
    step: 1,                    // Start on 1st arrow press (0=auto-start)
    particles: [],              // Custom state (merged into sim object)
    init(ctx, canvas) { /* setup */ },
    update(dt) { /* physics - dt is delta time in seconds */ },
    draw(ctx, canvas) { /* render */ },
    onStart() { /* optional */ },
    onPause() { /* optional */ }
});
```

**Multi-phase simulations (onStep API):**
```javascript
SlideSimulation.create({
    canvasId: 'phase-canvas',
    slideId: 'my-slide',
    steps: 3,
    phase: 0,
    onStep(step) {
        if (step === 1) { this.startSampling(); }
        if (step === 2) { this.freezeAndShow(); }
        if (step === 3) { this.transformTo3D(); }
    },
    onStepBack(step) {
        if (step === 0) { this.reset(); }
        if (step === 1) { this.resumeSampling(); }
        if (step === 2) { this.backTo2D(); }
    },
    init(ctx, canvas) { /* setup */ },
    update(dt) { /* physics */ },
    draw(ctx, canvas) { /* render */ }
});
```

**CRITICAL: Each step must fully establish its own state.** Do NOT assume incremental changes. The slide engine may restore to any step when navigating.

**Slide lifecycle hooks:**
```javascript
window.slideEngine.registerSimulation('slide-id', {
    start() { /* start animation */ },
    pause() { /* stop animation */ },
    onSlideEnter() { /* called when navigating TO this slide */ },
    onSlideLeave() { /* called when navigating AWAY from this slide */ }
}, 0);
```

## Three.js in Slides

**Lazy WebGL Loading (required for 3+ Three.js slides):**

Browsers limit WebGL contexts to ~8-16. Create on slide enter, dispose on leave:

```javascript
let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;

function initThreeJS() {
    if (renderer) return;
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    meshGroup = new THREE.Group();
    scene.add(meshGroup);
    // ... add lights, set camera position
}

function disposeThreeJS() {
    if (!renderer) return;
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    if (meshGroup) {
        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }
    }
    renderer.dispose();
    renderer = null; scene = null; camera = null; controls = null; meshGroup = null;
}

// Register with slide engine
window.slideEngine.registerSimulation('my-slide', {
    start, pause,
    onSlideEnter() { initThreeJS(); },
    onSlideLeave() { disposeThreeJS(); }
}, 0);
```

**Metallic Style for Dark Background (from `/talk/visual/`):**
```javascript
// Dark background
scene.background = new THREE.Color(0x1a1a2e);

// Rich lighting setup
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const hemi = new THREE.HemisphereLight(0x6666aa, 0x222244, 0.25);
hemi.position.set(0, 20, 0);
scene.add(hemi);
const directional = new THREE.DirectionalLight(0xffffff, 1.2);
directional.position.set(15, 20, 5);
scene.add(directional);
const fill = new THREE.DirectionalLight(0xffffff, 0.3);
fill.position.set(-10, 5, -5);
scene.add(fill);

// Metallic material with blue tint
const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    flatShading: true,
    roughness: 0.3,
    metalness: 0.35,
    color: 0xddeeff  // Subtle blue tint
});

// Subtle dark edges
const edgesMaterial = new THREE.LineBasicMaterial({
    color: 0x444466, linewidth: 1, opacity: 0.6, transparent: true
});

// White lozenges for metallic look
const colors = { gray1: '#FFFFFF', gray2: '#FFFFFF', gray3: '#FFFFFF' };
```

**Smooth OrbitControls with Damping:**
```javascript
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.8;
controls.panSpeed = 0.8;
controls.zoomSpeed = 1.2;

// REQUIRED: Continuous render loop for damping to work
function renderLoop() {
    if (!renderer || !camera || !controls) return;
    controls.update();
    renderer.render(scene, camera);
    renderLoopId = requestAnimationFrame(renderLoop);
}
renderLoop();
```

**Camera Position Debugging:**
```javascript
controls.addEventListener('change', () => {
    console.log('Camera pos:', camera.position.x.toFixed(1), camera.position.y.toFixed(1), camera.position.z.toFixed(1),
                '| Target:', controls.target.x.toFixed(1), controls.target.y.toFixed(1), controls.target.z.toFixed(1));
});
```

**Debugging workflow for slides:**
1. Add console.log statements to the specific slide being worked on
2. User tests the slide, looks at console output, reports values
3. Use values to fix camera positions, parameters, etc.
4. Remove logging from that slide when done
5. Repeat for next slide - keep logs scoped to current work

**Slow Step-by-Step Animation:**
```javascript
const SLOW_STEP_DELAY = 800;  // ms between steps

async function doSlowAnimationStep() {
    if (!isRunning) return;
    const stepped = await wasmInterface.stepForward();
    buildGeometry();
    if (isRunning && stepped) {
        animationId = setTimeout(doSlowAnimationStep, SLOW_STEP_DELAY);
    }
}
// In pause(): use clearTimeout(animationId) not cancelAnimationFrame
```

## WASM Integration

**Modularized WASM (recommended for multi-slide simulations):**
```bash
emcc simulation.cpp -o simulation.js \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='MySimModule' \
  -s "EXPORTED_FUNCTIONS=[...]" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','setValue','getValue']" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -O3
```

Each slide creates its own instance - completely isolated state, no conflicts.

**Dynamic Loading with Multiple WASM + WebGPU Modules:**

When a talk needs multiple WASM modules and WebGPU engines, use Promise.all and .finally() to ensure everything loads before simulations initialize:

```javascript
// In index.html <script> block
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Load all WASM modules first, then WebGPU engine, then signal ready
Promise.all([
    loadScript('/talk/visual/sim/visual-lozenge.js'),  // LozengeModule
    loadScript('/talk/visual/sim/q-partition-cftp.js') // QPartitionModule
]).then(() => {
    loadScript('/js/webgpu-qpartition-engine.js')      // WebGPUQPartitionEngine
        .catch(e => console.log('WebGPU engine not available'))
        .finally(() => window.dispatchEvent(new Event('wasm-loaded')));
});
```

**Simulation files must wait for wasm-loaded event:**
```javascript
function initMySimulation() {
    (async function() {
        if (typeof MyWasmModule === 'undefined') {
            console.error('MyWasmModule not loaded');
            return;
        }
        // Check WebGPU engine exists before using
        if (typeof WebGPUEngine !== 'undefined' && WebGPUEngine.isAvailable()) {
            // Use GPU path
        }
        // ... rest of simulation
    })();
}

// Initialize when WASM is loaded
if (typeof MyWasmModule !== 'undefined') {
    initMySimulation();
} else {
    window.addEventListener('wasm-loaded', initMySimulation, { once: true });
}
```

**Available WASM modules:**
- `LozengeModule` - 3D lozenge tiling (visual-lozenge.js, visual-lozenge-threaded.js)
- `QPartitionModule` - 2D lattice path CFTP (q-partition-cftp.js)

**Available WebGPU engines:**
- `WebGPULozengeEngine` - /js/webgpu-lozenge-engine.js (3D Glauber dynamics)
- `WebGPUQPartitionEngine` - /js/webgpu-qpartition-engine.js (2D path sampling)

**Non-modularized WASM with cwrap:**
```javascript
Module.onRuntimeInitialized = function() {
    wasmReady = true;
    wasmModule = {
        _myFunction: Module.cwrap('myFunction', 'number', ['number', 'number']),
        // ... ALL functions must be listed here!
    };
};
```

## Lozenge Tiling WASM

**WASM Modes (`2025-06-08-q-vol-3d.cpp`):**
- Mode 5 = `Q_HAHN` - real q parameter (0 < q < 1)
- Mode 7 = `IMAGINARY_Q_RACAH` - imaginary q-Racah with κ parameter

**Imaginary q-Racah Initialization:**
```javascript
// Mode 7 expects negative q encoding κ²
const kappasq = kappa_i * kappa_i;
wasmInterface.setImaginaryQ(imaginary_q);  // Set q ∈ (0,1)
await wasmInterface.initializeTiling(N, T, 0, 7, -kappasq);  // Pass -κ²
```

**exportPaths returns object, not array:**
```javascript
const result = JSON.parse(jsonStr);
this.paths = result.paths;  // Extract .paths from {paths: [...], n, t, s}
```

**Demo:** `/talk/demo/` shows all features

## Font Sizing Rules (STRICT)

**Always use these standard sizes - do not invent custom sizes:**

| Element | Size | When to use |
|---------|------|-------------|
| Body text | `clamp(1.2rem, 2.2vw, 1.8rem)` | Most text, explanations, descriptions |
| Formula text | `clamp(1.5rem, 2.5vw, 2rem)` | Math formulas (when space allows) |
| Narrow-column formulas | `clamp(1.2rem, 2vw, 1.6rem)` | Formulas in ≤42vw columns |
| Captions/labels | `clamp(0.75rem, 1vw, 1rem)` | Figure captions, small annotations |
| References/citations | `clamp(1.2rem, 2.2vw, 1.8rem)` + `color: var(--slide-muted)` | Bibliography lists |

**Citation styling:**
- Inline citations: `<span style="color: var(--slide-muted);">[Author Year]</span>`
- Theorem attributions: `<strong style="color: var(--slide-accent);">[Author Year]</strong>`
- Reference lists: Standard body font + `var(--slide-muted)` color

## Canvas Element Sizing

**Canvas attributes vs CSS style:**
- `width="1200" height="800"` - Pixel buffer resolution (ALWAYS pixels, defines drawing quality)
- `style="height: 60vh; width: auto"` - Display size (use vh/vw for responsive sizing)

**Common pattern:**
```html
<canvas id="my-canvas" width="1200" height="800" style="height: 55vh; width: auto;"></canvas>
```

To make canvas narrower: reduce the `width` attribute (e.g., `width="700"`), not the CSS.

## Two-Column Layouts

**User preference: Narrow text LEFT, Wide image RIGHT**

```html
<div style="display: grid; grid-template-columns: 30vw 62vw; gap: 2vw; margin-top: 2vh;">
    <div><!-- Left column: NARROW text panes --></div>
    <div><!-- Right column: WIDE image/figure --></div>
</div>
```

**Long formulas go BELOW the image** (full width), not crammed into narrow columns.

Avoid complex flexbox with `align-items: center` when simple grid alignment works.

## Adaptive Pane Sizing

**Size panes to fit content - don't force uniform grids:**
- Text-only panes can be NARROW (left column ~30vw)
- Images get the WIDE column (right ~60vw)
- Long formulas go BELOW in full-width panes, NOT in narrow side columns

**Example layout:**
```html
<!-- Top: narrow text left, wide image right -->
<div style="grid-template-columns: 30vw 62vw;">
    <div><!-- text panes stacked vertically --></div>
    <div><!-- big image --></div>
</div>

<!-- Bottom: full-width formula panes -->
<div style="grid-template-columns: 1fr 1fr; margin-top: 2vh;">
    <div><!-- formula 1 --></div>
    <div><!-- formula 2 --></div>
</div>
```

## Default 3D Lighting Preset (lpetrov.cc/lozenge style)

```javascript
// White background
scene.background = new THREE.Color(0xffffff);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 10, 15);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
fillLight.position.set(-10, -5, -10);
scene.add(fillLight);

// Material
const material = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    flatShading: true,
    roughness: 0.5,
    metalness: 0.15,
    vertexColors: true
});
```

## Camera Zoom Animations

**Use ABSOLUTE zoom values, not relative:**
```javascript
// GOOD: Absolute zoom level
const minZoom = 0.5; // Always zoom out to this fixed level

// BAD: Relative calculation (compounds errors)
const minZoom = Math.min(startZoom, targetZoom) * 0.3;
```

**Multi-phase zoom animation (zoom out → move → zoom in):**
```javascript
function setZoomPosition(idx, animate = false) {
    const zp = zoomPositions[idx];
    if (!animate) {
        // Immediate jump
        camera.position.set(zp.pos.x, zp.pos.y, zp.pos.z);
        controls.target.set(zp.target.x, zp.target.y, zp.target.z);
        camera.zoom = zp.zoom;
        camera.updateProjectionMatrix();
        controls.update();
        return;
    }

    // Animated: zoom out to absolute 0.5, move, zoom in
    const minZoom = 0.5; // ABSOLUTE value
    // ... animation code with three phases
}
```

## UVA Colors for Lozenge Types

Color lozenges by face normal direction:
```javascript
const UVA_ORANGE = new THREE.Color('#E57200');
const UVA_BLUE = new THREE.Color('#232D4B');
const UVA_CREAM = new THREE.Color('#F9DCBF');

// Determine type by dominant normal component
const absX = Math.abs(nx), absY = Math.abs(ny), absZ = Math.abs(nz);
let color;
if (absX >= absY && absX >= absZ) color = UVA_ORANGE;
else if (absY >= absX && absY >= absZ) color = UVA_BLUE;
else color = UVA_CREAM;
```

## Modular Talk Structure

For talks with many slides, use Jekyll includes and separate JS files:

```
/talk/my-talk/
├── index.html          # Skeleton: WASM loader + {% include %} + <script defer>
├── js/
│   ├── shared/         # Shared helpers (copy from /talk/visual/js/shared/)
│   ├── slide1-sim.js
│   └── slide2-sim.js
└── images/

/_includes/talk/my-talk/
├── slide1.html         # Just the <section> HTML
└── slide2.html
```

**index.html structure:**
```html
---
layout: slides
title: "My Talk"
---
<script src="/js/three.min.js"></script>
<script>/* WASM loader with Promise.all */</script>

{% include talk/my-talk/slide1.html %}
{% include talk/my-talk/slide2.html %}

<script src="js/slide1-sim.js" defer></script>
<script src="js/slide2-sim.js" defer></script>
```

**Pitfall: JS overwrites HTML content**

When simulations modify DOM dynamically (e.g., `insightEl.innerHTML = '...'` for different steps), editing the HTML include alone won't show changes. The JS sets content on:
- `reset()` - restore initial state
- `onStep(n)` - change content for step n
- `onStepBack(n)` - restore when going back

Must update the JS file, not just the HTML include

## Talk Structure

- Each talk lives at `/talk/<name>/index.html` with slides in `_includes/talk/<name>/*.html`
- **Waterfall talk** (`/talk/waterfall/`): Multiple variants (applied-math, pure-math colloquium). ~18 slides per variant. Slides in `_includes/talk/waterfall/*.html`, each with `id` matching URL hash.
- **Visual talk** (`/talk/visual/`): PWA with service worker + loading bar. ~23 slides across 3 parts (Counting/Randomness, Random Surfaces, How to Make Pictures) plus title/closing.
- Both talks share WASM modules from `/talk/visual/sim/` and WebGPU engines from `/js/`

## Pane Colors

- **Orange/accent panes**: `background: #f5f5f5; border-left: 4px solid var(--slide-accent);` with `color: var(--slide-accent);` for titles
- **Blue/navy panes**: `background: #e3f2fd; border-left: 4px solid var(--slide-navy);` with `color: var(--slide-navy);` for titles
- **Yellow/warning panes**: `background: #fff3e0; border-left: 4px solid #E57200;` with `color: #E57200;` for titles
- **Alternating pane colors**: When a slide has multiple content panes, alternate border/title colors between accent (orange) and navy (blue) for visual variety. Reference: `complex-burgers.html` (5 panes: accent, navy, accent, navy, accent). For two-column layouts, continue the alternation across columns.

## Citation Style

- **Inline citations** (after pane titles): `<strong style="color: var(--slide-accent);">Title</strong> <span style="color: var(--slide-muted);">[Author Year]</span>`
- **Inline citations** (within text): `<span style="color: var(--slide-muted);">[Author Year]</span>`
- **References section**: `<strong style="color: var(--slide-accent);">References:</strong>` followed by citations in muted color (inherited from parent div with `color: var(--slide-muted);`)

## Simulation JS Files

- Located in `talk/waterfall/js/*.js`
- Each slide with interactive content has a corresponding JS file (e.g., `spectral-transversal-sim.js`)
- Use IIFE pattern `(function() { ... })();` for encapsulation
- Register with slide engine via `window.slideEngine.registerSimulation(slideId, {...}, 0)`

## 3D Lozenge Tiling Simulations

- Use Three.js for 3D rendering with OrbitControls for camera interaction
- WASM sampling via Mode 7 (`IMAGINARY_Q_RACAH`) with `setImaginaryQ(q)` and `initializeTiling(N, T, 0, 7, -kappasq)`
- Standard parameters: N=80, T=160, S=80, κ=3
- Camera logging pattern for debugging: `controls.addEventListener('change', () => console.log(...))`
- Dispose WebGL on slide leave to avoid context limits

## Slice Visualizations

- **Diagonal slice**: Plane equation `x/S + y/(T-S) = 1`, find path intersections
- **Horizontal slice**: Extract path at z=N/2, the contour at that height level
- For rotated 2D plots, use uniform scaling (same scale for both axes) to preserve aspect ratio
- 45° clockwise rotation: `rotX = (x + y) / sqrt(2)`, `rotY = (y - x) / sqrt(2)`

## Slide Layout Patterns

- Dense formula slides: Use 2-column grid `grid-template-columns: 38vw 56vw` for text left, formulas right
- Compact padding for formula panes: `padding: 0.6vh 1vw`
- Smaller formula font: `font-size: clamp(1rem, 1.7vw, 1.35rem)`

## KaTeX Limitations (slides use KaTeX, not MathJax)

- `\widetilde` not supported → use `\tilde`
- `\begin{cases}` doesn't render well → use HTML table with individual `\(...\)` formulas
- `\Bigl{` doesn't render → use HTML `{` character with large font-size or SVG curly brace
- For tall curly braces in piecewise definitions, use SVG:
  ```html
  <svg width="20" height="120" viewBox="0 0 20 120" style="display: block;">
      <path d="M18 2 Q8 2 8 20 L8 50 Q8 60 2 60 Q8 60 8 70 L8 100 Q8 118 18 118" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>
  ```

## 2D Canvas Pan/Zoom

- Track state: `{ scale, offsetX, offsetY, isDragging, lastX, lastY }`
- Wheel event needs `{ passive: false }` to allow `preventDefault()`
- Apply transform when drawing: multiply base scale/offset by zoom state

## Async Loading Guards

- Always guard after async operations (OBJ loading, WASM calls) since Three.js may be disposed mid-load
- Pattern: `if (!meshGroup) return;` after await statements
- Animation loops need guards: `if (!camera || !controls) { isAnimating = false; return; }`

## Service Worker & Offline Caching (per-talk PWA)

- Each talk has its own service worker and manifest:
  - Waterfall: `sw.js` at `/talk/waterfall/sw.js`, cache `waterfall-talk-vN`
  - Visual: `sw.js` at `/talk/visual/sw.js`, cache `visual-talk-vN`, manifest at `/talk/visual/manifest.json`
- Precaches WASM, JS, images, OBJ models, fonts, KaTeX
- Bump `CACHE_NAME` version when updating cached assets
- Since `slides.html` layout has no slot for extra `<head>` tags, inject manifest link and theme-color meta via JS in `index.html`
- Self-hosted assets (no CDN dependencies):
  - Unna font: `/fonts/unna-*.woff2`
  - KaTeX 0.16.9: `/katex-0.16.9/`

## WebGPU Lazy Initialization (Race Condition Fix)

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

## WASM Initialization Pattern

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

## Slide Reuse Across Talks

- Same slide HTML/JS can be used in multiple talks (e.g., pure math colloquium vs applied math colloquium)
- Comment out slides in `index.html` with `<!-- -->` to disable for a specific talk variant
- Comment out both the `{% include %}` and the `<script>` tag
- Keep files intact so they can be re-enabled by uncommenting

## Talk Variant File Naming

- Variant-specific slides use a suffix: `-applied` (applied math colloquium), `-colloquium` (general colloquium), `-intro` (specialized/pure math talk)
- Examples: `part3-applied.html`, `summary-colloquium.html`, `part3-intro.html`
- Generic slides shared across all variants have no suffix (e.g., `q-volume.html`, `energy.html`)
- Part intro slides for the applied variant: `part{N}-applied.html` with IDs `part{N}-applied`

## Part Intro Slide Pattern

- Style: `slide-center` class, Part number in large font + subtitle in uppercase muted color
- For italic lowercase *q* inside uppercase headings: `<span style="text-transform: none; font-style: italic;">q</span>`
- Template:
  ```html
  <section class="slide slide-center" id="partN-applied" data-title="Part N: Title">
      <h2 style="font-size: clamp(3rem, 5vw, 5.5rem);">Part N</h2>
      <h3 style="font-size: clamp(2rem, 3.5vw, 3.5rem); color: var(--slide-muted); text-transform: uppercase; letter-spacing: 0.05em;">Subtitle Here</h3>
  </section>
  ```

## Element ID Namespacing for Coexisting Slides

- When two slides share similar content, prefix IDs to avoid DOM conflicts
- Example: `#random-path` uses `local-view-canvas`, `#random-path-gaussian` uses `rpg-local-view-canvas`
- Convention: use slide-specific prefix (e.g., `rpg-` for random-path-gaussian)

## Accumulative Sampling for Histograms

- For progressive histogram reveals, accumulate samples across steps rather than resetting
- Use target counts and compute `needed = target - currentCount` to add the difference
- Example: targets [1000, 2000, 3000, 4000, 5000] with initial 20 from CFTP → adds 980, 1000, 1000, 1000, 1000
- Avoids jarring reset-and-resample on each step

## Multi-Material Mesh Disposal

When using multi-material meshes (e.g., Minecraft mode with material arrays), disposal must handle arrays:
```javascript
if (Array.isArray(child.material)) {
    child.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
} else {
    child.material.dispose();
}
```

## Alternative Rendering Modes (LEGO, Minecraft)

- Use a `renderMode` variable (`'standard'`, `'lego'`, `'minecraft'`) to switch geometry builders
- `regenerate()` checks `renderMode` and calls the appropriate builder
- Reference implementations for LEGO (`dimersToLego3D`) and Minecraft (`dimersToMinecraft3D`) are in `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.md`
- LEGO: `MeshStandardMaterial` with `roughness: 0.35, metalness: 0.0`, `InstancedMesh` for studs, brick merging via edge adjacency
- Minecraft: Procedural 16×16 textures with `NearestFilter`, `MeshLambertMaterial`, union-find for block grouping

## Lozenge 3D Camera Convention

- Use `camera.up.set(0, 0, 1)` (Z-up) for lozenge tilings, matching the ultimate lozenge simulation
- `to3D(n, j, h)` maps to `{ x: h, y: -n - h, z: j - h }`
- Dynamic `centerCamera(heights)` computes bounding box and positions camera at `center - size*3` along X, `center + size*1.5` along Y and Z

## Camera Zoom Animations

- Use `easeInOutCubic` for smooth animation: `t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2`
- Store initial/target positions as constants
- Animate with `requestAnimationFrame` loop using elapsed time
- Typical duration: 1500-3000ms for slow, deliberate zoom
- Can synchronize 3D (Three.js) and 2D (canvas) camera animations

## Mathematical Content Sourcing

- **NEVER invent mathematical content** — user is a working mathematician and will catch errors
- When slide content involves specific theorems/equations from papers, verify against the actual paper source
- Fetch arXiv TeX sources: `https://arxiv.org/e-print/{id}` returns gzipped TeX (may be `.tar.gz` or plain `.tex.gz`)
- If the original variational principle / theorem was already correct, don't rewrite it — only fix the parts that were actually wrong
- Maintain **notation consistency across slides** — if one slide says "maximizes ∬σ(∇h)", other slides should use the same sign convention

## Pre-sampled Image Badge

For static pre-computed images (when live simulation is too slow):
```html
<div style="position: relative;">
    <img src="images/example.png" alt="Description" style="max-height: 34vh; max-width: 100%; object-fit: contain;">
    <div style="position: absolute; top: 0.5vh; right: 0.5vw; background: rgba(229, 114, 0, 0.9); color: white; padding: 0.3vh 0.6vw; border-radius: 3px; font-size: clamp(0.7rem, 1.2vw, 1rem); font-weight: bold;">pre-sampled</div>
</div>
```
Images stored in `talk/waterfall/images/`

## Variable Naming in Slides

- Avoid variable names that read badly in text context (e.g., "3d sides" reads like "3D" → use "3k sides" instead)
