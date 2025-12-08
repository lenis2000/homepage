---
title: Triangular Lattice Dimer Sampler
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-12-08-triangular-dimers.md'
    txt: 'This simulation is interactive, written in JavaScript'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-12-08-triangular-dimers.cpp'
    txt: 'C++ code for the simulation (compiled to WebAssembly)'
---

<details id="about-simulation-details">
<summary>About / Help</summary>
<div class="content" style="padding: 16px; background: white; border-top: 1px solid #e0e0e0;">

<p>This simulator generates <strong>random dimer coverings</strong> (perfect matchings) on the <strong>triangular lattice</strong>.</p>

<p><strong>Key difference from lozenge/domino tilings:</strong> The triangular lattice is <strong>non-bipartite</strong>, which means:</p>
<ul>
  <li>No standard height function exists (only height mod 2)</li>
  <li>Correlations decay exponentially with very short correlation length (&lt; 1 lattice constant)</li>
  <li>No arctic circle phenomenon or interesting limit shapes for uniform measure</li>
  <li>CFTP (Coupling From The Past) is not directly applicable</li>
</ul>

<p><strong>Drawing tools:</strong></p>
<ul>
  <li><strong>Pan</strong>: Click and drag to pan the view. Scroll to zoom.</li>
  <li><strong>Draw</strong>: Click or drag on lattice vertices to add them to your region</li>
  <li><strong>Erase</strong>: Click or drag to remove vertices from your region</li>
  <li><strong>Lasso Fill/Erase</strong>: Click to place polygon vertices. Close the loop by clicking near the start point, pressing Enter, or Cmd/Ctrl+click.</li>
  <li><strong>Make Coverable</strong>: Adds minimum vertices to make region have a perfect matching</li>
</ul>

<p><strong>Presets:</strong> Parallelogram, Hexagon, Triangle (up/down facing)</p>

<p>A region has a <strong>perfect matching</strong> if and only if it has an even number of vertices AND the induced subgraph admits one. The simulator uses augmenting path algorithms to find an initial matching.</p>

<p><strong>Glauber dynamics:</strong> The simulator uses local Markov chain Monte Carlo moves:</p>
<ul>
  <li><strong>4-cycle (rhombus) moves</strong>: Flip two dimers around a parallelogram</li>
  <li><strong>6-cycle (hexagon) moves</strong>: Rotate three dimers around a hexagon</li>
</ul>
<p>Based on <a href="https://link.springer.com/article/10.1007/s00454-016-9807-1">Kenyon-Rémila theory</a>, these two move types are sufficient for ergodicity on parallelogram regions.</p>

<p><strong>References:</strong></p>
<ul>
  <li><a href="https://arxiv.org/abs/cond-mat/0206159">Fendley, Moessner, Sondhi: Classical dimers on the triangular lattice</a></li>
  <li><a href="https://arxiv.org/abs/2304.10930">Local dimer dynamics in higher dimensions</a> - proves 4+6 cycles suffice</li>
</ul>

</div>
</details>

---

<style>
  .control-group {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 8px;
  }
  .control-group-title {
    font-size: 11px;
    font-weight: 600;
    color: #666;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  #dimer-canvas {
    width: 100%;
    max-width: 900px;
    height: 600px;
    border: 1px solid #ccc;
    display: block;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 6px;
    cursor: crosshair;
  }
  #dimer-canvas.panning {
    cursor: grab;
  }
  #dimer-canvas.panning:active {
    cursor: grabbing;
  }
  [data-theme="dark"] #dimer-canvas {
    background: #1a1a1a;
    border-color: #444;
  }
  .param-input {
    width: 50px;
    height: 28px;
    text-align: center;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    font-family: 'SF Mono', Monaco, monospace;
  }
  .param-input:focus {
    outline: none;
    border-color: #4CAF50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }
  .param-label {
    font-size: 13px;
    color: #555;
    margin-right: 4px;
    font-weight: 500;
  }
  .param-group {
    display: inline-flex;
    align-items: center;
    margin-right: 12px;
  }
  .control-group button {
    height: 30px;
    padding: 0 14px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    background: white;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .control-group button:hover {
    background: #f5f5f5;
    border-color: #999;
  }
  .control-group button:disabled {
    background: #e0e0e0;
    border-color: #ccc;
    color: #999;
    cursor: not-allowed;
  }
  .control-group button.primary {
    background: #4CAF50;
    color: white;
    border-color: #45a049;
  }
  .control-group button.primary:hover {
    background: #45a049;
  }
  .control-group button.danger {
    background: #f44336;
    color: white;
    border-color: #d32f2f;
  }
  .control-group button.danger:hover {
    background: #d32f2f;
  }
  .control-group button.active {
    background: #2196F3;
    color: white;
    border-color: #1976D2;
  }
  .status-bar {
    margin-top: 8px;
    padding: 8px 12px;
    background: #f9f9f9;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 12px;
    color: #666;
  }
  .tool-btn {
    min-width: 36px;
    padding: 0 8px !important;
  }
</style>

<!-- Control Groups -->
<div class="control-group">
  <div class="control-group-title">Presets</div>
  <span class="param-group">
    <span class="param-label">Size:</span>
    <input type="number" id="preset-size" class="param-input" value="6" min="2" max="30">
  </span>
  <button id="btn-parallelogram">Parallelogram</button>
  <button id="btn-hexagon">Hexagon</button>
  <button id="btn-triangle-up">Triangle ▲</button>
  <button id="btn-triangle-down">Triangle ▼</button>
  <button id="btn-make-coverable">Make Coverable</button>
  <button id="btn-clear" class="danger">Clear</button>
</div>

<div class="control-group">
  <div class="control-group-title">Simulation</div>
  <button id="btn-start" class="primary">Start Glauber</button>
  <button id="btn-stop" disabled>Stop</button>
  <div style="display: inline-flex; align-items: center; gap: 6px; margin-left: 12px;">
    <span style="font-size: 12px; color: #666;">Speed</span>
    <input type="range" id="speed-slider" min="0" max="100" value="25" style="width: 100px;">
    <input type="number" id="speed-input" class="param-input" value="100" min="1" max="100000000" style="width: 80px;">
    <span style="font-size: 11px; color: #888;">/s</span>
  </div>
</div>

<div class="control-group">
  <div class="control-group-title">Drawing Tools</div>
  <button id="btn-pan" class="tool-btn active">Pan</button>
  <button id="btn-draw" class="tool-btn">Draw</button>
  <button id="btn-erase" class="tool-btn">Erase</button>
  <button id="btn-lasso-fill" class="tool-btn">Lasso Fill</button>
  <button id="btn-lasso-erase" class="tool-btn">Lasso Erase</button>
</div>

<div class="control-group">
  <div class="control-group-title">View</div>
  <button id="btn-zoom-in" class="tool-btn">+</button>
  <button id="btn-zoom-out" class="tool-btn">−</button>
  <button id="btn-reset-view">Reset View</button>
  <label style="margin-left: 12px;">
    <input type="checkbox" id="show-grid" checked> Grid
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="show-vertices"> Vertices
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="show-boundary" checked> Boundary
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="color-by-orientation" checked> Color by orientation
  </label>
  <span style="margin-left: 12px; display: inline-flex; align-items: center; gap: 4px;">
    <span style="font-size: 12px; color: #666;">Dimer width</span>
    <input type="range" id="edge-width-slider" min="1" max="100" value="50" style="width: 80px;">
  </span>
</div>

<canvas id="dimer-canvas"></canvas>

<div class="status-bar">
  <span id="status-text">Draw a region or use a preset to begin</span>
</div>

<!-- Load dependencies -->
<script src="/js/2025-12-08-triangular-dimers.js"></script>

<script>
(function() {
    'use strict';

    // ========================================================================
    // CONSTANTS
    // ========================================================================
    const SQRT3 = Math.sqrt(3);
    const SQRT3_2 = SQRT3 / 2;

    // 6 neighbor directions for triangular lattice
    const DIR_DN = [1, 0, -1, -1, 0, 1];
    const DIR_DJ = [0, 1, 1, 0, -1, -1];

    // ========================================================================
    // STATE
    // ========================================================================
    const activeVertices = new Map(); // key -> {n, j}
    let currentDimers = []; // Array of {n1, j1, n2, j2}
    let boundaryEdges = []; // Array of {n1, j1, n2, j2} for boundary outline
    let isValid = false;
    let isRunning = false;
    let animationId = null;

    // View state
    let viewOffsetX = 0;
    let viewOffsetY = 0;
    let viewScale = 30; // pixels per unit
    let isPanning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Drawing state
    let currentTool = 'pan'; // 'pan', 'draw', 'erase', 'lasso-fill', 'lasso-erase'
    let lassoPoints = []; // Screen coordinates for lasso polygon

    // Speed control (steps per second)
    let stepsPerSecond = 100;
    let lastFrameTime = 0;

    // ========================================================================
    // CANVAS SETUP
    // ========================================================================
    const canvas = document.getElementById('dimer-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    }

    // ========================================================================
    // COORDINATE TRANSFORMATIONS
    // ========================================================================
    function latticeToScreen(n, j) {
        const x = n + 0.5 * j;
        const y = j * SQRT3_2;
        return {
            x: canvas.width / (2 * (window.devicePixelRatio || 1)) + (x - viewOffsetX) * viewScale,
            y: canvas.height / (2 * (window.devicePixelRatio || 1)) + (viewOffsetY - y) * viewScale
        };
    }

    function screenToLattice(sx, sy) {
        const rect = canvas.getBoundingClientRect();
        const x = (sx - rect.width / 2) / viewScale + viewOffsetX;
        const y = viewOffsetY - (sy - rect.height / 2) / viewScale;
        const j = y / SQRT3_2;
        const n = x - 0.5 * j;
        return { n: Math.round(n), j: Math.round(j) };
    }

    function vertexKey(n, j) {
        return `${n},${j}`;
    }

    // ========================================================================
    // BOUNDARY COMPUTATION
    // ========================================================================
    function computeBoundary() {
        boundaryEdges = [];
        if (activeVertices.size === 0) return;

        // For each vertex, check all 6 edges
        // An edge is on the boundary if exactly one endpoint is in the region
        for (const [key, v] of activeVertices) {
            for (let d = 0; d < 6; d++) {
                const nn = v.n + DIR_DN[d];
                const nj = v.j + DIR_DJ[d];
                const neighborKey = vertexKey(nn, nj);

                // If neighbor is NOT in region, this edge is on boundary
                if (!activeVertices.has(neighborKey)) {
                    boundaryEdges.push({
                        n1: v.n, j1: v.j,
                        n2: nn, j2: nj
                    });
                }
            }
        }
    }

    // ========================================================================
    // DRAWING
    // ========================================================================
    function draw() {
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        // Clear
        ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // Draw grid if enabled
        if (document.getElementById('show-grid').checked) {
            drawGrid();
        }

        // Draw boundary if enabled
        if (document.getElementById('show-boundary').checked) {
            drawBoundary();
        }

        // Draw dimers
        drawDimers();

        // Draw vertices if enabled
        if (document.getElementById('show-vertices').checked) {
            drawVertices();
        }

        // Draw lasso polygon if in progress
        if (lassoPoints.length > 0) {
            drawLasso();
        }
    }

    function drawGrid() {
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const margin = 2;
        const topLeft = screenToLattice(0, 0);
        const bottomRight = screenToLattice(w, h);

        const minJ = Math.floor(Math.min(topLeft.j, bottomRight.j)) - margin;
        const maxJ = Math.ceil(Math.max(topLeft.j, bottomRight.j)) + margin;
        const minN = Math.floor(Math.min(topLeft.n, bottomRight.n)) - margin;
        const maxN = Math.ceil(Math.max(topLeft.n, bottomRight.n)) + margin;

        ctx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#333' : '#e0e0e0';
        ctx.lineWidth = 0.5;

        for (let j = minJ; j <= maxJ; j++) {
            for (let n = minN; n <= maxN; n++) {
                const p = latticeToScreen(n, j);
                const neighbors = [
                    { dn: 1, dj: 0 },
                    { dn: 0, dj: 1 },
                    { dn: -1, dj: 1 }
                ];
                for (const nb of neighbors) {
                    const p2 = latticeToScreen(n + nb.dn, j + nb.dj);
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
    }

    function drawBoundary() {
        if (boundaryEdges.length === 0) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.strokeStyle = isDark ? '#ff6b6b' : '#d32f2f';
        // Scale boundary width with zoom
        ctx.lineWidth = Math.max(1, Math.min(6, viewScale * 0.1));
        ctx.lineCap = 'round';

        for (const edge of boundaryEdges) {
            const p1 = latticeToScreen(edge.n1, edge.j1);
            const p2 = latticeToScreen(edge.n2, edge.j2);
            // Draw at midpoint towards outside (half edge)
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(midX, midY);
            ctx.stroke();
        }
    }

    function drawVertices() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        // Scale vertex size with zoom - smaller when zoomed out
        const vertexRadius = Math.max(1, Math.min(6, viewScale * 0.12));

        // Skip drawing if too zoomed out (vertices would be too small anyway)
        if (vertexRadius < 1.5) return;

        for (const [key, v] of activeVertices) {
            const p = latticeToScreen(v.n, v.j);
            ctx.beginPath();
            ctx.arc(p.x, p.y, vertexRadius, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? '#888' : '#666';
            ctx.fill();
        }
    }

    // 3 colors for 3 edge orientations (like lozenge types)
    const DIMER_COLORS = ['#E57200', '#232D4B', '#2E8B57']; // Orange, Navy, Green

    function getEdgeOrientation(dn, dj) {
        // 3 edge orientations in triangular lattice:
        // Type 0: horizontal (dn=±1, dj=0)
        // Type 1: upper-right diagonal (dn=0, dj=±1)
        // Type 2: upper-left diagonal (dn=∓1, dj=±1)
        if (dj === 0) return 0;  // horizontal
        if (dn === 0) return 1;  // vertical-ish
        return 2;                 // diagonal
    }

    function drawDimers() {
        if (currentDimers.length === 0) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const colorByOrientation = document.getElementById('color-by-orientation').checked;
        const defaultColor = isDark ? '#ffffff' : '#000000';

        // Width slider: 1-100 with exponential scaling for more extreme ends
        const widthSlider = parseInt(document.getElementById('edge-width-slider').value) || 50;
        // Exponential: 1->0.02, 50->1, 100->5
        const widthMultiplier = Math.pow(10, (widthSlider - 50) / 30);

        // Scale dimer width with zoom and slider
        ctx.lineWidth = Math.max(0.2, Math.min(20, viewScale * 0.15 * widthMultiplier));
        ctx.lineCap = 'round';

        for (const d of currentDimers) {
            const p1 = latticeToScreen(d.n1, d.j1);
            const p2 = latticeToScreen(d.n2, d.j2);

            if (colorByOrientation) {
                const dn = d.n2 - d.n1;
                const dj = d.j2 - d.j1;
                const orientation = getEdgeOrientation(dn, dj);
                ctx.strokeStyle = DIMER_COLORS[orientation];
            } else {
                ctx.strokeStyle = defaultColor;
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }

    function drawLasso() {
        if (lassoPoints.length < 1) return;

        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
        for (let i = 1; i < lassoPoints.length; i++) {
            ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
        }
        ctx.stroke();

        ctx.setLineDash([]);

        // Draw points
        ctx.fillStyle = '#2196F3';
        for (const p of lassoPoints) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ========================================================================
    // LASSO TOOL
    // ========================================================================
    function pointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    function applyLasso(isFill) {
        if (lassoPoints.length < 3) {
            lassoPoints = [];
            draw();
            return;
        }

        // Find bounding box in lattice coords
        const rect = canvas.getBoundingClientRect();
        let minN = Infinity, maxN = -Infinity;
        let minJ = Infinity, maxJ = -Infinity;

        for (const p of lassoPoints) {
            const lp = screenToLattice(p.x, p.y);
            minN = Math.min(minN, lp.n);
            maxN = Math.max(maxN, lp.n);
            minJ = Math.min(minJ, lp.j);
            maxJ = Math.max(maxJ, lp.j);
        }

        // Expand a bit
        minN -= 2; maxN += 2;
        minJ -= 2; maxJ += 2;

        // Check all lattice points in bounding box
        for (let n = minN; n <= maxN; n++) {
            for (let j = minJ; j <= maxJ; j++) {
                const screenPos = latticeToScreen(n, j);
                if (pointInPolygon(screenPos.x, screenPos.y, lassoPoints)) {
                    const key = vertexKey(n, j);
                    if (isFill) {
                        if (!activeVertices.has(key)) {
                            activeVertices.set(key, { n, j });
                        }
                    } else {
                        activeVertices.delete(key);
                    }
                }
            }
        }

        lassoPoints = [];
        reinitialize();
    }

    // ========================================================================
    // MAKE COVERABLE
    // ========================================================================
    function makeCoverable() {
        if (activeVertices.size === 0) return;

        // If odd number of vertices, we need to add one
        // Strategy: find an unmatched vertex and add a neighbor
        // For now, simple approach: if odd, add a neighbor to any boundary vertex

        if (activeVertices.size % 2 === 1) {
            // Find a vertex on the boundary (has a neighbor not in region)
            for (const [key, v] of activeVertices) {
                for (let d = 0; d < 6; d++) {
                    const nn = v.n + DIR_DN[d];
                    const nj = v.j + DIR_DJ[d];
                    const neighborKey = vertexKey(nn, nj);
                    if (!activeVertices.has(neighborKey)) {
                        activeVertices.set(neighborKey, { n: nn, j: nj });
                        reinitialize();
                        return;
                    }
                }
            }
        }

        // Even number but no matching exists - try to expand
        // Keep adding boundary vertices until matching exists
        let attempts = 0;
        const maxAttempts = 100;

        while (!isValid && attempts < maxAttempts) {
            attempts++;
            // Find vertices that couldn't be matched (degree 0 or isolated)
            // Simple heuristic: add all neighbors of boundary vertices
            const toAdd = [];
            for (const [key, v] of activeVertices) {
                for (let d = 0; d < 6; d++) {
                    const nn = v.n + DIR_DN[d];
                    const nj = v.j + DIR_DJ[d];
                    const neighborKey = vertexKey(nn, nj);
                    if (!activeVertices.has(neighborKey)) {
                        toAdd.push({ n: nn, j: nj, key: neighborKey });
                    }
                }
            }

            if (toAdd.length === 0) break;

            // Add one vertex at a time
            const v = toAdd[0];
            activeVertices.set(v.key, { n: v.n, j: v.j });

            // Try to initialize
            reinitialize();
        }

        updateStatus(isValid ?
            `Made coverable with ${activeVertices.size} vertices` :
            `Could not make coverable after ${attempts} attempts`);
    }

    // ========================================================================
    // WASM INTERFACE
    // ========================================================================
    let wasmReady = false;
    let wasmModule = null;

    function initFromVertices(vertices) {
        if (!wasmReady) return false;

        const vertexStr = Array.from(vertices.values())
            .map(v => `${v.n},${v.j}`)
            .join(';');

        const result = wasmModule._initFromVertices(vertexStr);
        if (result < 0) {
            if (result === -1) updateStatus('Error: No vertices');
            else if (result === -2) updateStatus('Error: Odd number of vertices (need even for matching)');
            else if (result === -3) updateStatus('Error: No perfect matching exists');
            isValid = false;
            currentDimers = [];
            return false;
        }

        isValid = true;
        updateStatus(`Initialized with ${result} vertices`);
        fetchDimers();
        return true;
    }

    function fetchDimers() {
        if (!wasmReady || !isValid) return;

        const dimerStr = wasmModule._exportDimers();
        currentDimers = [];

        if (dimerStr && dimerStr.length > 0) {
            const parts = dimerStr.split(';');
            for (const part of parts) {
                const coords = part.split(',').map(Number);
                if (coords.length === 4) {
                    currentDimers.push({
                        n1: coords[0], j1: coords[1],
                        n2: coords[2], j2: coords[3]
                    });
                }
            }
        }
    }

    if (typeof Module !== 'undefined') {
        Module.onRuntimeInitialized = function() {
            wasmReady = true;
            wasmModule = {
                _initFromVertices: Module.cwrap('initFromVertices', 'number', ['string']),
                _performGlauberSteps: Module.cwrap('performGlauberSteps', null, ['number']),
                _exportDimers: Module.cwrap('exportDimers', 'string', []),
                _getTotalSteps: Module.cwrap('getTotalSteps', 'number', []),
                _getFlipCount: Module.cwrap('getFlipCount', 'number', []),
                _getAcceptRate: Module.cwrap('getAcceptRate', 'number', []),
                _getVertexCount: Module.cwrap('getVertexCount', 'number', [])
            };
            updateStatus('WASM loaded. Draw a region or use a preset.');
        };
    }

    // ========================================================================
    // PRESETS
    // ========================================================================
    function createParallelogram(size) {
        activeVertices.clear();
        for (let n = 0; n < size; n++) {
            for (let j = 0; j < size; j++) {
                const key = vertexKey(n, j);
                activeVertices.set(key, { n, j });
            }
        }
        reinitialize();
        fitView();
    }

    function createHexagon(size) {
        activeVertices.clear();
        for (let n = -size; n <= size; n++) {
            for (let j = -size; j <= size; j++) {
                if (Math.abs(n) + Math.abs(j) + Math.abs(n + j) <= 2 * size) {
                    const key = vertexKey(n, j);
                    activeVertices.set(key, { n, j });
                }
            }
        }
        reinitialize();
        fitView();
    }

    function createTriangleUp(size) {
        activeVertices.clear();
        // Upward-facing triangle: n >= 0, j >= 0, n + j <= size
        for (let n = 0; n <= size; n++) {
            for (let j = 0; j <= size - n; j++) {
                const key = vertexKey(n, j);
                activeVertices.set(key, { n, j });
            }
        }
        reinitialize();
        fitView();
    }

    function createTriangleDown(size) {
        activeVertices.clear();
        // Downward-facing triangle: n <= 0, j <= 0, n + j >= -size
        for (let n = -size; n <= 0; n++) {
            for (let j = -size - n; j <= 0; j++) {
                const key = vertexKey(n, j);
                activeVertices.set(key, { n, j });
            }
        }
        reinitialize();
        fitView();
    }

    function reinitialize() {
        stopSimulation();
        computeBoundary();
        if (activeVertices.size === 0) {
            isValid = false;
            currentDimers = [];
            updateStatus('Draw a region or use a preset');
        } else {
            initFromVertices(activeVertices);
        }
        draw();
    }

    function fitView() {
        if (activeVertices.size === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const v of activeVertices.values()) {
            const x = v.n + 0.5 * v.j;
            const y = v.j * SQRT3_2;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        viewOffsetX = (minX + maxX) / 2;
        viewOffsetY = (minY + maxY) / 2;

        const rect = canvas.getBoundingClientRect();
        const padding = 50;
        const scaleX = (rect.width - 2 * padding) / (maxX - minX + 1);
        const scaleY = (rect.height - 2 * padding) / (maxY - minY + 1);
        viewScale = Math.min(scaleX, scaleY, 50);
    }

    // ========================================================================
    // SIMULATION
    // ========================================================================
    function startSimulation() {
        if (!isValid || isRunning) return;
        isRunning = true;
        lastFrameTime = 0; // Reset frame timer
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-stop').disabled = false;
        animationId = requestAnimationFrame(animate);
    }

    function stopSimulation() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-stop').disabled = true;
    }

    function animate(currentTime) {
        if (!isRunning) return;

        // Calculate steps based on elapsed time
        if (lastFrameTime === 0) lastFrameTime = currentTime;
        const deltaTime = (currentTime - lastFrameTime) / 1000; // seconds
        lastFrameTime = currentTime;

        const stepsThisFrame = Math.max(1, Math.round(stepsPerSecond * deltaTime));
        wasmModule._performGlauberSteps(stepsThisFrame);
        fetchDimers();

        const totalSteps = wasmModule._getTotalSteps();
        const flipCount = wasmModule._getFlipCount();
        const acceptRate = wasmModule._getAcceptRate();

        updateStatus(`Steps: ${totalSteps.toLocaleString()} | Flips: ${flipCount.toLocaleString()} | Accept: ${(acceptRate * 100).toFixed(1)}% | Speed: ${stepsPerSecond.toLocaleString()}/s`);

        draw();
        animationId = requestAnimationFrame(animate);
    }

    // Logarithmic slider conversion (0-100 -> 1 to 100,000,000)
    function sliderToSpeed(sliderVal) {
        return Math.round(Math.pow(10, sliderVal * 0.08));
    }

    function speedToSlider(speed) {
        if (speed <= 1) return 0;
        return Math.round(Math.log10(speed) / 0.08);
    }

    function updateSpeedFromSlider(sliderVal) {
        stepsPerSecond = sliderToSpeed(sliderVal);
        document.getElementById('speed-slider').value = sliderVal;
        document.getElementById('speed-input').value = stepsPerSecond;
    }

    function updateSpeedFromInput(speed) {
        stepsPerSecond = Math.max(1, Math.min(100000000, parseInt(speed) || 100));
        document.getElementById('speed-input').value = stepsPerSecond;
        document.getElementById('speed-slider').value = speedToSlider(stepsPerSecond);
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================
    function updateStatus(text) {
        document.getElementById('status-text').textContent = text;
    }

    function setTool(tool) {
        currentTool = tool;
        lassoPoints = [];
        document.getElementById('btn-pan').classList.toggle('active', tool === 'pan');
        document.getElementById('btn-draw').classList.toggle('active', tool === 'draw');
        document.getElementById('btn-erase').classList.toggle('active', tool === 'erase');
        document.getElementById('btn-lasso-fill').classList.toggle('active', tool === 'lasso-fill');
        document.getElementById('btn-lasso-erase').classList.toggle('active', tool === 'lasso-erase');
        canvas.classList.toggle('panning', tool === 'pan');
        draw();
    }

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        lastMouseX = e.clientX - rect.left;
        lastMouseY = e.clientY - rect.top;

        if (currentTool === 'pan') {
            isPanning = true;
        } else if (currentTool === 'draw' || currentTool === 'erase') {
            handleDrawErase(lastMouseX, lastMouseY);
        } else if (currentTool === 'lasso-fill' || currentTool === 'lasso-erase') {
            handleLassoClick(lastMouseX, lastMouseY, e.metaKey || e.ctrlKey);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isPanning) {
            const dx = x - lastMouseX;
            const dy = y - lastMouseY;
            viewOffsetX -= dx / viewScale;
            viewOffsetY += dy / viewScale;
            lastMouseX = x;
            lastMouseY = y;
            draw();
        } else if (e.buttons === 1 && (currentTool === 'draw' || currentTool === 'erase')) {
            handleDrawErase(x, y);
        }
    });

    canvas.addEventListener('mouseup', () => {
        isPanning = false;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        viewScale = Math.max(5, Math.min(100, viewScale * zoomFactor));
        draw();
    });

    function handleDrawErase(x, y) {
        const lattice = screenToLattice(x, y);
        const key = vertexKey(lattice.n, lattice.j);

        if (currentTool === 'draw') {
            if (!activeVertices.has(key)) {
                activeVertices.set(key, { n: lattice.n, j: lattice.j });
                reinitialize();
            }
        } else if (currentTool === 'erase') {
            if (activeVertices.has(key)) {
                activeVertices.delete(key);
                reinitialize();
            }
        }
    }

    function handleLassoClick(x, y, forceClose = false) {
        // Check if clicking near the start to close the polygon, or force close with Cmd/Ctrl
        if (lassoPoints.length >= 3) {
            const dist = Math.hypot(x - lassoPoints[0].x, y - lassoPoints[0].y);
            if (dist < 15 || forceClose) {
                applyLasso(currentTool === 'lasso-fill');
                return;
            }
        }

        lassoPoints.push({ x, y });
        draw();
    }

    // Keyboard shortcut to close lasso
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && lassoPoints.length >= 3) {
            applyLasso(currentTool === 'lasso-fill');
        } else if (e.key === 'Escape') {
            lassoPoints = [];
            draw();
        }
    });

    // Button events
    document.getElementById('btn-parallelogram').addEventListener('click', () => {
        const size = parseInt(document.getElementById('preset-size').value) || 6;
        createParallelogram(size);
    });

    document.getElementById('btn-hexagon').addEventListener('click', () => {
        const size = parseInt(document.getElementById('preset-size').value) || 6;
        createHexagon(size);
    });

    document.getElementById('btn-triangle-up').addEventListener('click', () => {
        const size = parseInt(document.getElementById('preset-size').value) || 6;
        createTriangleUp(size);
    });

    document.getElementById('btn-triangle-down').addEventListener('click', () => {
        const size = parseInt(document.getElementById('preset-size').value) || 6;
        createTriangleDown(size);
    });

    document.getElementById('btn-make-coverable').addEventListener('click', makeCoverable);

    document.getElementById('btn-clear').addEventListener('click', () => {
        activeVertices.clear();
        reinitialize();
    });

    document.getElementById('btn-start').addEventListener('click', startSimulation);
    document.getElementById('btn-stop').addEventListener('click', stopSimulation);

    document.getElementById('speed-slider').addEventListener('input', (e) => updateSpeedFromSlider(parseInt(e.target.value)));
    document.getElementById('speed-input').addEventListener('change', (e) => updateSpeedFromInput(e.target.value));

    document.getElementById('btn-pan').addEventListener('click', () => setTool('pan'));
    document.getElementById('btn-draw').addEventListener('click', () => setTool('draw'));
    document.getElementById('btn-erase').addEventListener('click', () => setTool('erase'));
    document.getElementById('btn-lasso-fill').addEventListener('click', () => setTool('lasso-fill'));
    document.getElementById('btn-lasso-erase').addEventListener('click', () => setTool('lasso-erase'));

    document.getElementById('show-grid').addEventListener('change', draw);
    document.getElementById('show-vertices').addEventListener('change', draw);
    document.getElementById('show-boundary').addEventListener('change', draw);
    document.getElementById('color-by-orientation').addEventListener('change', draw);
    document.getElementById('edge-width-slider').addEventListener('input', draw);

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        viewScale = Math.min(100, viewScale * 1.25);
        draw();
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        viewScale = Math.max(5, viewScale / 1.25);
        draw();
    });

    document.getElementById('btn-reset-view').addEventListener('click', () => {
        fitView();
        draw();
    });

    // Initialize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

})();
</script>
