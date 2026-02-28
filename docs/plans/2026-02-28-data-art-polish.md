# Data Art Competition Polish — Penrose Triangle Lozenge Tiling

## Overview
- Polish the interactive Penrose triangle data art piece (`data-art/triangle.html`) for the UVA "Data Is ART" competition (deadline: March 1, 2026)
- The piece uses MCMC-sampled lozenge tilings that anneal from chaos into an impossible Penrose triangle
- Compete for $2,500 grand prize against professional artists/designers (2024 finalists included Emmy-winning composers, Forbes 30 Under 30 data scientists, MFA candidates)
- The piece must read as **gallery art**, not a tech demo
- Judging criteria: Creativity, Aesthetics, Storytelling, Innovative integration of data

## Context
- Single file: `data-art/triangle.html` (inline CSS + JS, depends on WASM via `/js/2025-11-28-ultimate-lozenge.js`)
- Current state: functional Penrose triangle with hook screen, chaos→order animation, entropy slider, audio sonification
- Color palette: Escher grayscale (`#F5F5F5`, `#D0D0D0`, `#A8A8A8`)
- Animation: 4s chaos + 15s cubic annealing
- Concept: "Does Chaos hide the Truth?" → impossible geometry emerges from probability

## Development Approach
- No unit tests — use **agent-browser** visual verification at each step
- Verify at 1920x1080 (gallery display resolution)
- Each change must maintain the WASM integration and animation pipeline
- Changes are CSS, canvas rendering JS, or HTML structure only
- Keep the philosophical concept intact — polish the execution, not the idea

## Validation
- Start local server: `python3 -m http.server 8768` from project root
- Use agent-browser to take screenshots at hook, chaos, mid-anneal, and frozen phases
- Visual inspection replaces unit tests

## Progress Tracking
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix

## Implementation Steps

### Task 1: Elevate the hook screen typography and atmosphere
- [ ] Replace Georgia serif with a more distinctive display font — use a system font stack that reads as contemporary art (e.g., `'Didot', 'Bodoni MT', 'Noto Serif Display', Georgia, serif`)
- [ ] Increase the question text size and add letter-spacing for gallery presence
- [ ] Add a subtle atmospheric element — faint animated particle field, slow gradient pulse, or barely-perceptible lozenge shapes in the background
- [ ] Refine the "Click to enter" hint — make it feel like a gallery invitation, not a website CTA
- [ ] Verify with agent-browser: hook screen should arrest attention at 1920x1080

### Task 2: Refine the color palette for visual impact
- [ ] Replace flat Escher grayscale with a more sophisticated palette — consider: warm grays with subtle color temperature shifts per lozenge type, or a restrained palette with one accent direction (e.g., cool blue-grays for two types, warm amber for the third)
- [ ] Ensure the three lozenge types remain clearly distinguishable while feeling like a unified palette
- [ ] Add subtle gradient or lighting effect to individual lozenges for depth (simulating the 3D cube illusion more convincingly)
- [ ] Refine boundary stroke — the white 2px boundary may be too harsh; consider a softer treatment
- [ ] Verify with agent-browser: frozen Penrose triangle should feel dimensional and gallery-worthy

### Task 3: Polish the chaos→order animation arc
- [ ] During chaos phase, add subtle visual energy — slight color vibration, or brief flash of warm color that cools as order emerges
- [ ] Improve the annealing visual — consider the background transitioning from pure black to a very subtle dark tone as the piece "warms up"
- [ ] Tune the animation timing: evaluate whether 4s chaos + 15s annealing is optimal (compare 3+12 and 5+18 if needed)
- [ ] Add a very subtle vignette effect around the edges of the canvas to focus attention on the triangle
- [ ] Verify with agent-browser: the full animation arc from chaos to frozen should feel like a revelation

### Task 4: Refine the frozen state and UI elements
- [ ] Improve the caption "Local Truth, Global Paradox" — evaluate typography, position, and whether the text is strong enough
- [ ] Refine the entropy slider design — make it feel like a minimal gallery control, not a web UI widget
- [ ] Consider adding a subtle title/attribution line (artist name, piece title) in very small text, gallery-style
- [ ] Ensure the frozen Penrose triangle rendering is pixel-perfect — no aliasing seams between lozenges, clean edges
- [ ] Verify with agent-browser: the final state should look exhibition-ready

### Task 5: Display resilience and responsive behavior
- [ ] Test and fix at common display resolutions: 1920x1080, 2560x1440, 1280x720
- [ ] Ensure the piece scales properly — the triangle should be centered and well-proportioned at all sizes
- [ ] Verify the animation loops or can be restarted — a gallery display needs to work for months
- [ ] Add a subtle auto-restart: after the interactive phase runs for e.g. 2 minutes with no interaction, smoothly return to hook screen
- [ ] Verify with agent-browser at multiple viewports

### Task 6: Audio and performance polish
- [ ] Evaluate the sonification — is the pentatonic mapping effective? Consider a simpler, more ambient sound design (single sustained tone that shifts pitch with order/entropy)
- [ ] Ensure the piece runs smoothly at 60fps during the animation phase
- [ ] Verify no memory leaks from repeated plays (WASM module re-creation)
- [ ] Optimize canvas rendering if needed — the 3072 triangles should render without jank
- [ ] Verify with agent-browser: smooth animation, no visual glitches

### Task 7: Final competition readiness
- [ ] Set a proper page title (not "Truth" — something like the actual piece name)
- [ ] Add meta tags for proper social sharing if submitted as URL
- [ ] Create/verify the piece has a strong opening when viewed for the first time
- [ ] Do a final comprehensive visual review at 1920x1080 with agent-browser
- [ ] Ensure the piece is self-contained and works at the hosted URL

## Post-Completion
*Items requiring manual action — not for ralphex*

**Submission materials:**
- Write descriptive explanation: data source (probability distributions on lozenge tilings), visualization technique (MCMC sampling + simulated annealing on triangular lattice), narrative (impossible geometry emerges from probabilistic truth)
- Take high-resolution screenshots for static submission format
- Submit via dataisart@virginia.edu by March 1, 2026
