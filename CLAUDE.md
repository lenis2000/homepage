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

**Simulation integration:**
```javascript
window.slideEngine.registerSimulation('slide-id', {
    isRunning: false,
    pause() { /* stop animation */ },
    resume() { /* restart if was running */ }
});
```

**Demo:** `/talk/demo/` shows all features
