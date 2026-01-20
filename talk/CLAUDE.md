# Talk/Slide Infrastructure

Slides live in `/talk/<name>/index.html` (URL: `/talk/<name>/`).

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
