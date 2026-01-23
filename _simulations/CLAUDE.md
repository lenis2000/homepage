# Simulations

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
Reference working implementation: `domino_tilings/2025-11-18-double-dimer-gamma.cpp`

**Double dimer height function:** The XOR loops of two tilings are exactly the level curves where height difference h₁ - h₂ = 0.

## Triangular Lattice Dimer Simulations

**Coordinate system:**
- Vertex (n, j) maps to Cartesian: x = n + 0.5 * j, y = j * sqrt(3)/2
- 6 neighbors per vertex: directions 0-5 with `dir_dn = [1, 0, -1, -1, 0, 1]`, `dir_dj = [0, 1, 1, 0, -1, -1]`

**Triangle centers (for probe points):**
- Type A (up triangles): (n + 1/3, j + 1/3)
- Type B (down triangles): (n + 2/3, j + 2/3)
- Use `screenToTriangleCenter()` for snapping clicks to triangle centers

**Double dimer loop analysis:**
- `distinctCycles` stores alternating cycles from XOR of two configurations
- Ray casting (`isPointInsideLoop`) tests point containment in loops
- Loops traced by alternating between config0 and config1 edges

**Fractal dimension via box counting:**
```cpp
// Use 6 scales from maxDim/2 to maxDim/64
// Linear regression: log(N) = -D * log(epsilon) + c
// Fractal dimension D = -slope
double slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
return -slope;
```

**Key WASM functions for loop analysis:**
- `_findLoopContainingPoint(n, j)` - returns index of loop with nearest edge to point
- `_getLoopInfo(index)` - returns JSON with edges, diameter, centerX/Y, fractalDim
- `_getLoopEdgeIndices(index)` - returns edge indices for highlighting
- `_computeLoopFractalDimension(index)` - returns fractal dimension

**Loop selection: nearest edge algorithm** (not point-inside-polygon):
```cpp
// Point to segment distance (clamped to segment endpoints)
double t = std::max(0.0, std::min(1.0, ((px - x1) * dx + (py - y1) * dy) / lenSq));
double projX = x1 + t * dx;
double projY = y1 + t * dy;
return (px - projX) * (px - projX) + (py - projY) * (py - projY);
```

Reference: `misc/2025-12-08-triangular-dimers.cpp`

**Forced interface (two holes) pattern:**
To create a canonical interface path between two points in the double dimer model:
1. Remove 2 vertices from config2 (mark as "holes")
2. Create near-perfect matching on remaining vertices using greedy + augmenting paths
3. Modify all flip functions to skip moves involving hole vertices
4. The XOR of config1 (perfect) and config2 (near-perfect with 2 holes) forms a path connecting the holes

```cpp
// Helper to check if move involves hole vertices
inline bool involvesHole(int v0, int v1, int v2, int v3) {
    return v0 == holeVertex1 || v0 == holeVertex2 ||
           v1 == holeVertex1 || v1 == holeVertex2 ||
           v2 == holeVertex1 || v2 == holeVertex2 ||
           v3 == holeVertex1 || v3 == holeVertex2;
}
```

**Fractal dimension sampling with histogram:**
- `_getFractalSamples()` returns JSON array of all samples
- Draw histogram in JavaScript canvas with bins, mean line, and axis labels

## WASM Integration Patterns

**Non-modularized WASM with cwrap (common pattern in simulations):**

When using `Module.onRuntimeInitialized`, manually bind ALL exported functions:
```javascript
Module.onRuntimeInitialized = function() {
    wasmReady = true;
    wasmModule = {
        _myFunction: Module.cwrap('myFunction', 'number', ['number', 'number']),
        _anotherFunc: Module.cwrap('anotherFunc', 'string', ['number']),
        // ... ALL functions must be listed here!
    };
};
```

**Common bug:** Adding new C++ functions but forgetting to add them to the `wasmModule` object causes "not a function" errors at runtime.

**Float coordinates for click handling:**
Use floating-point lattice coordinates when finding nearest edges (not snapped integers):
```javascript
function screenToLatticeFloat(sx, sy) {
    const x = (sx - rect.width / 2) / viewScale + viewOffsetX;
    const y = viewOffsetY - (sy - rect.height / 2) / viewScale;
    const j = y / SQRT3_2;
    const n = x - 0.5 * j;
    return { n, j };  // No rounding!
}
```

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

## URL State Serialization (Share Links)

**Pattern for shareable URLs:** Encode simulation state in URL parameters for sharing:
```javascript
// URL-safe base64 encoding/decoding (avoids +/= issues in URLs)
function toUrlSafeBase64(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromUrlSafeBase64(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
}
```

**WASM timing for URL loading:** State must be loaded AFTER `Module.onRuntimeInitialized`:
```javascript
Module.onRuntimeInitialized = function() {
    wasmReady = true;
    sim = new Sampler();

    // Load state from URL AFTER WASM is ready
    if (loadStateFromUrl()) {
        updateRegion();  // This requires wasmReady=true
    } else {
        draw();
    }
};
```

**Triangle types in lozenge simulations:** Use numeric types `1` (up/black) and `2` (down/white), not strings 'A'/'B':
```javascript
// Correct - numeric types
activeTriangles.set(key, { n: nNum, j: jNum, type: 1 });  // or type: 2
// When parsing from URL:
const type = parseInt(typeStr);
if (type === 1 || type === 2) { ... }
```

## UI/UX Patterns for Simulation Pages

### Page Layout Structure (CSS Phases)

**Phase 1 - Two-Column Desktop Layout:**
```css
.simulation-layout { display: flex; max-width: 1400px; }
.controls-panel { width: 340px; position: sticky; top: 80px; }
.visualization-panel { flex: 1 1 auto; }
```

**Phase 2 - Collapsible Accordion Sections:**
Use `<details class="control-section">` with `<summary>` for collapsible sections. Summary headers are UPPERCASE, 12px, 600 weight.

**Phase 3 - Visual Enhancements:**
- Palette picker grid: `.palette-picker` with `.palette-item` swatches
- FAB: `.sample-fab` with orange gradient, mobile-only

**Phase 4 - 3D Controls:** Conditional visibility based on view mode

**Phase 5 - Export Section Grouping:**
```html
<div class="export-group">
  <span class="export-group-label">Images</span>
  <button class="btn-utility">PNG</button>
</div>
<div class="export-divider"></div>
```

**Phase 6 - WCAG AA Contrast Fixes:** Explicit colors for stat labels and kbd elements

### Mobile Bottom Sheet Drawer
```css
@media (max-width: 991px) {
  .controls-panel {
    position: fixed; bottom: 0;
    transform: translateY(calc(100% - 60px));
  }
  .controls-panel.expanded { transform: translateY(0); }
}
```
Include drawer handle with swipe hint: `.drawer-handle` and `.drawer-handle-hint`

### Button Hierarchy
- `.btn-action` - Orange gradient, primary actions (Sample, Generate)
- `.btn-utility` - Neutral, for export/secondary actions

### Stats Bar Pattern
```html
<div class="stats-inline">
  <div class="stat"><span class="stat-label">Vertices</span><span class="stat-value" id="count">0</span></div>
</div>
```

**Help button placement:** Place `?` button in the view overlay (next to 3D/2D toggle), not hidden in collapsed sections. Users expect help to be visible.

**Combined Help modal:** Include both drawing tools help AND keyboard shortcuts in one modal with section headers:
```html
<h4 style="margin: 12px 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666;">Drawing Tools</h4>
<!-- tool icons and descriptions -->
<h4 style="margin: 16px 0 8px 0; ...">Keyboard Shortcuts</h4>
<!-- kbd shortcuts -->
```

**FAB state changes:** When app state changes (e.g., Glauber dynamics starts), update FAB icon and tooltip:
```javascript
// When Glauber starts
fabBtn.innerHTML = '⏸';
fabBtn.setAttribute('data-tooltip', 'Stop (G)');
// When Glauber stops
fabBtn.innerHTML = '▶';
fabBtn.setAttribute('data-tooltip', 'Sample (S)');
```

**FAB tooltip CSS:** Use `::before` pseudo-element with `data-tooltip` attribute:
```css
.sample-fab::before {
  content: attr(data-tooltip);
  position: absolute;
  right: 100%;
  margin-right: 12px;
  /* ... positioning and styling */
  opacity: 0;
  visibility: hidden;
}
.sample-fab:hover::before {
  opacity: 1;
  visibility: visible;
}
```

**kbd element contrast:** Use explicit color values, not CSS variables, for reliable contrast in light mode:
```css
.keyboard-help-content kbd {
  background: #e8e8e8;
  border: 1px solid #bbb;
  color: #333;
  box-shadow: 0 1px 0 #999;
}
[data-theme="dark"] .keyboard-help-content kbd {
  background: #444;
  border-color: #666;
  color: #e8e8e8;
  box-shadow: 0 1px 0 #222;
}
```
