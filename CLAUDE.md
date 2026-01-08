- color patterns are defined in @js/colorschemes.js and used in lozenge drawing files. this file contains the links to the files which use these color patterns.
- for cpp compile look at their preambles

## Interactive Talk/Slide Infrastructure

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

**Responsive design for projector (1920x1080 at 100% zoom):**

Use `vh`, `vw`, and `clamp()` for consistent sizing across all slides. No manual zoom adjustment needed.

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

**Shaded content panes (for theorems, definitions, callouts):**
```html
<div style="background: #f5f5f5; border-left: 4px solid var(--slide-accent); padding: 1vh 1.5vw; font-size: clamp(1.2rem, 2.2vw, 1.8rem); text-align: left;">
    <strong style="color: var(--slide-accent);">Theorem [Author Year]:</strong><br>
    Statement text here with <strong>emphasis</strong> as needed.
</div>
```
- Light gray background (`#f5f5f5`)
- Orange accent border on left (`4px solid var(--slide-accent)`)
- Standard body text size
- Left-justified text
- For multiple panes side-by-side, use grid:
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

**Navigation:**
- Arrow keys, Space, PageDown/Up for next/prev
- G to open jump menu (type number + Enter to jump)
- F for fullscreen
- Hash routing: `#slide-id` links directly to slides

**Fragments (PowerPoint-style reveals):**
```html
<li class="fragment">Appears on arrow/click</li>
<li class="fragment fade-up">Fades up</li>
<li class="fragment fade-down">Fades down</li>
<li class="fragment zoom-in">Zooms in</li>
```
Fragments reveal in order. Going back hides them in reverse.

**Fragment vs Simulation ordering:**
The slide-engine processes fragments BEFORE simulations on the same arrow press. To have a simulation start before text appears:
1. Remove `class="fragment"` from the text element
2. Use `opacity: 0` and `transition: opacity 0.3s` for the hidden state
3. Use `onStep` API in the simulation to show the text on a later step:
```javascript
window.slideEngine.registerSimulation('my-slide', {
    start, pause,
    steps: 2,
    onStep(step) {
        if (step === 1) start();  // Arrow 1: start animation
        if (step === 2) document.getElementById('my-text').style.opacity = '1';  // Arrow 2: show text
    },
    onStepBack(step) {
        if (step === 0) { pause(); document.getElementById('my-text').style.opacity = '0'; }
        if (step === 1) document.getElementById('my-text').style.opacity = '0';
    }
}, 1);
```

**Canvas vs SVG for simulations:**
- **Canvas**: Use for animation (fast). Use 2x resolution for crisp rendering on retina/projectors.
- **SVG**: Use for static export only. DOM manipulation is too slow for animation (~70ms/frame).

Canvas setup for 1920x1080 projector (55vh height):
```html
<canvas id="my-sim" width="1600" height="1200" style="height: 55vh; width: auto;"></canvas>
```
```javascript
const canvas = document.getElementById('my-sim');
const ctx = canvas.getContext('2d');
const displayWidth = 800, displayHeight = 600;  // 55vh at 1080p
const dpr = 2;  // 2x for crisp rendering
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);  // Scale context
// Draw at display coordinates (800x600), canvas is 1600x1200
```

**Simulation integration (SlideSimulation helper):**
```javascript
// Basic simulation with start/pause
const sim = SlideSimulation.create({
    canvasId: 'my-canvas',
    slideId: 'my-slide',
    step: 1,                    // Start on 1st arrow press (0=auto-start)

    particles: [],              // Custom state (merged into sim object)

    init(ctx, canvas) { /* setup */ },
    update(dt) { /* physics - dt is delta time in seconds */ },
    draw(ctx, canvas) { /* render */ },

    onStart() { /* optional: called when started */ },
    onPause() { /* optional: called when paused */ }
});

// sim.start(), sim.pause(), sim.toggle(), sim.reset() available
// Click on canvas toggles automatically
```

**Multi-phase simulations (onStep API):**
```javascript
// For simulations with multiple phases (e.g., sample → transform → 3D)
SlideSimulation.create({
    canvasId: 'phase-canvas',
    slideId: 'my-slide',
    steps: 3,                   // Total number of arrow-activated steps

    phase: 0,                   // Track current phase

    onStep(step) {
        // Called when arrow advances to step N (1, 2, 3...)
        if (step === 1) { this.startSampling(); }
        if (step === 2) { this.freezeAndShow(); }
        if (step === 3) { this.transformTo3D(); }
    },

    onStepBack(step) {
        // Called when going backward to step N (2, 1, 0...)
        if (step === 0) { this.reset(); }
        if (step === 1) { this.resumeSampling(); }
        if (step === 2) { this.backTo2D(); }
    },

    init(ctx, canvas) { /* setup */ },
    update(dt) { /* physics */ },
    draw(ctx, canvas) { /* render */ }
});
```

**CRITICAL: Each step must fully establish its own state.**

Do NOT assume incremental changes from the previous step. The slide engine may restore to any step when navigating (forward, backward, or jumping). Each `onStep(N)` and `onStepBack(N)` must set ALL state needed for that step and redraw completely.

```javascript
// BAD - assumes step 2 already set the grid size
onStepBack(step) {
    if (step === 3) {
        currentPath = generateRandomPath(12, 9);  // Wrong! currentA/currentB may be 120/90
        drawPath();
    }
}

// GOOD - each step fully establishes its state
onStepBack(step) {
    if (step === 3) {
        setParams(12, 9);  // Sets currentA, currentB, clears path, redraws
    }
}
```

**Lifecycle methods on sim object:**
Inside any custom method, you can call:
- `this.start()` / `this.pause()` / `this.toggle()` - control animation
- `this.draw()` - manually redraw (useful after state changes when paused)
- `this.init()` - reinitialize
- `this.reset()` - pause + reinitialize + redraw
- `this.canvas`, `this.ctx` - access canvas and 2D context

**Phase control buttons (clickable UI):**
```html
<div style="position: relative; display: inline-block;">
    <canvas id="my-canvas" width="400" height="300"></canvas>
    <div id="phase-controls" style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px;"></div>
</div>
```
```javascript
createPhaseButtons() {
    const container = document.getElementById('phase-controls');
    for (let i = 0; i <= this.steps; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.style.cssText = 'width: 28px; height: 28px; border-radius: 4px; font-weight: bold; cursor: pointer;';
        btn.addEventListener('click', () => this.goToPhase(i));
        container.appendChild(btn);
    }
},

goToPhase(targetPhase) {
    while (this.phase < targetPhase) { this.phase++; this.applyPhase(this.phase); }
    while (this.phase > targetPhase) { this.applyPhaseBack(this.phase - 1); this.phase--; }
    this.updatePhaseButtons();
}
```

**Multiple sims on one slide (legacy step system):**
```javascript
// Sim 1 starts on 1st arrow, Sim 2 starts on 2nd arrow
SlideSimulation.create({ canvasId: 'sim1', slideId: 'my-slide', step: 1, ... });
SlideSimulation.create({ canvasId: 'sim2', slideId: 'my-slide', step: 2, ... });
```

**Manual registration (low-level):**
```javascript
window.slideEngine.registerSimulation('slide-id', {
    start() { /* start animation */ },
    pause() { /* stop animation */ }
}, 1); // step: 0=auto, 1+=Nth arrow
```

**Slide lifecycle hooks:**
```javascript
window.slideEngine.registerSimulation('slide-id', {
    start() { /* start animation */ },
    pause() { /* stop animation */ },
    onSlideEnter() { /* called when navigating TO this slide */ },
    onSlideLeave() { /* called when navigating AWAY from this slide */ }
}, 0);
```

**Modularized WASM (recommended for multi-slide simulations):**

Compile WASM with `MODULARIZE` and unique `EXPORT_NAME` to create isolated instances per slide:

```bash
emcc simulation.cpp -o simulation.js \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='MySimModule' \
  -s "EXPORTED_FUNCTIONS=[...]" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','setValue','getValue']" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -O3
```

Each slide creates its own instance - completely isolated state, no conflicts:
```javascript
// Title slide - its own WASM instance
const titleWasm = await LozengeModule();
const initFromTriangles = titleWasm.cwrap('initFromTriangles', 'number', ['number', 'number']);

// Thank You slide - separate WASM instance
const thankYouWasm = await LozengeModule();
const initFromTriangles2 = thankYouWasm.cwrap('initFromTriangles', 'number', ['number', 'number']);

// No state conflicts! Each instance has its own memory.
```

**Benefits:**
- No reinit dance between slides
- No `onSlideEnter`/`onSlideLeave` for state management
- Simpler code, fewer bugs
- Can run different simulations simultaneously

**Memory usage:** Each instance has its own WASM memory (~32MB default). For many slides, consider lazy loading:
```javascript
let wasm = null;
onSlideEnter() {
    if (!wasm) wasm = await LozengeModule();
    // ... init
}
```

**Legacy approach (single shared Module):**
If using non-modularized WASM with global `Module`, reinit at moment of use and re-export data after reinit. See `/talk/visual/` history for examples.

**Lazy WebGL Loading (required for 3+ Three.js slides):**

Browsers limit WebGL contexts to ~8-16. Creating renderers at load time exhausts this limit. Use lazy loading to create context on slide enter and dispose on leave:

```javascript
// ===== THREE.JS (LAZY LOADED) =====
let scene = null;
let renderer = null;
let camera = null;
let controls = null;
let meshGroup = null;

function initThreeJS() {
    if (renderer) return;  // Already initialized

    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    meshGroup = new THREE.Group();
    scene.add(meshGroup);
    // ... add lights, set camera position, etc.

    controls.addEventListener('change', () => {
        if (!isRunning && renderer) renderer.render(scene, camera);
    });
}

function disposeThreeJS() {
    if (!renderer) return;

    // Cancel any animations
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    isRunning = false;

    // Dispose meshes
    if (meshGroup) {
        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }
    }

    // Release WebGL context
    renderer.dispose();
    renderer = null;
    scene = null;
    camera = null;
    controls = null;
    meshGroup = null;
}

// Add guards to all functions that use Three.js objects
function animate() {
    if (!isRunning || !renderer || !camera || !controls) return;
    // ... animation logic
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(animate);
}

function buildGeometry() {
    if (!meshGroup) return;
    // ... geometry building
}

// Register with slide engine
window.slideEngine.registerSimulation('my-slide', {
    start, pause,
    onSlideEnter() {
        initThreeJS();  // Create WebGL context
        // ... reset camera, render
    },
    onSlideLeave() {
        disposeThreeJS();  // Release WebGL context
    }
}, 0);
```

**Key points:**
- Only 1 WebGL context active at a time (or 2-3 for adjacent slides)
- Scales to unlimited Three.js slides
- Must add guards (`if (!renderer) return;`) to all functions using Three.js
- Don't create renderer at script load time - wait for `onSlideEnter`

**Keyboard shortcuts:**
- Arrow keys, Space, PageDown/Up for next/prev
- Cmd+Left/Right (Mac) or Home/End for first/last slide
- G to open jump menu (type number + Enter)
- P to show build order overlay (fragments/simulations per slide)
- F for fullscreen
- Escape to close any overlay
- Direct arrows (◀ ▶) in footer skip fragments/sims

**Demo:** `/talk/demo/` shows all features

## Domino Tiling Simulations

**EKLP Matrix Edge Weight Convention:**
The EKLP matrix for Aztec diamond is 2N × 2N. For gamma-distributed weights (Duits-Van Peski model):
- Even rows (i % 2 == 0), even cols (j % 2 == 0) → Γ(β)
- Even rows (i % 2 == 0), odd cols (j % 2 == 1) → Γ(α)
- Odd rows → 1.0

**Edge type mapping:**
- `alpha` edges → even row, odd col → Γ(α)
- `beta` edges → even row, even col → Γ(β)
- `gamma`, `delta` edges → odd rows → 1.0

**Critical: Alpha edges are TOP of black face (black face BELOW the edge), not bottom:**
```javascript
// CORRECT - alpha edge detection
const faceY = Math.floor(midY);  // Face BELOW the horizontal edge
const isBlack = ((faceX + faceY) % 2) !== 0;
```
Reference working implementation: `_simulations/domino_tilings/2025-11-18-double-dimer-gamma.cpp`

**Double dimer height function:** The XOR loops of two tilings are exactly the level curves where height difference h₁ - h₂ = 0.

## Three.js in Simulations

**Container visibility timing:** When showing a hidden container, use `setTimeout(fn, 50)` before initializing Three.js - `clientWidth/clientHeight` are 0 immediately after `display: block`.

**Animation loop required:** OrbitControls need a render loop to work properly:
```javascript
function animate() {
    if (!animating) return;
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
```

**Grid step detection:** Domino height functions have vertex grids with step 2, not 1. Detect actual step from coordinates:
```javascript
const xCoords = [...new Set(vertices.map(v => v.gx))].sort((a, b) => a - b);
let stepX = 2;
for (let i = 1; i < xCoords.length; i++) {
    const diff = xCoords[i] - xCoords[i-1];
    if (diff > 0) stepX = Math.min(stepX, diff);
}
```
