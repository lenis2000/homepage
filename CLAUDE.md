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

**Keyboard shortcuts:**
- Arrow keys, Space, PageDown/Up for next/prev
- Cmd+Left/Right (Mac) or Home/End for first/last slide
- G to open jump menu (type number + Enter)
- F for fullscreen
- Direct arrows (◀ ▶) in footer skip fragments/sims

**Demo:** `/talk/demo/` shows all features
