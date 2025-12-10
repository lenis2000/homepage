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

<h4>What is this?</h4>
<p>This simulator generates <strong>random dimer coverings</strong> (perfect matchings) on the <strong>triangular lattice</strong> using Glauber dynamics (Markov Chain Monte Carlo).</p>

<p>The triangular lattice is <strong>non-bipartite</strong> (cannot be 2-colored), unlike the square lattice (domino tilings) or hexagonal lattice (lozenge tilings).
CFTP (Coupling From The Past) is not directly applicable due to lack of monotone coupling.</p>

<h4>How to use</h4>
<p><strong>Drawing tools:</strong></p>
<ul>
  <li><strong>Pan</strong>: Click and drag to move the view. Scroll to zoom in/out.</li>
  <li><strong>Draw</strong>: Click or drag on lattice vertices to add them to your region</li>
  <li><strong>Erase</strong>: Click or drag to remove vertices from your region</li>
  <li><strong>Lasso Fill/Erase</strong>: Click to place polygon vertices. Close the loop by clicking near the start, pressing Enter, or Cmd/Ctrl+click (adds final vertex then closes).</li>
  <li><strong>Make Coverable</strong>: Attempts to add vertices to enable a perfect matching</li>
</ul>

<p><strong>Presets:</strong> Parallelogram, Triangle</p>

<p><strong>View options:</strong></p>
<ul>
  <li><strong>Show grid</strong>: Display the underlying triangular lattice</li>
  <li><strong>Show vertices</strong>: Display lattice points in the region</li>
  <li><strong>Show boundary</strong>: Highlight the boundary of the region</li>
  <li><strong>Color by orientation</strong>: Color dimers by their direction (3 colors for 3 edge orientations)</li>
  <li><strong>Dimer width</strong>: Adjust the thickness of dimer lines</li>
</ul>

<h4>Double dimer model</h4>
<p>Enable <strong>Double dimer</strong> to superimpose two independent dimer configurations (blue and red). Each configuration evolves via its own independent Glauber dynamics.</p>

<p>The superposition of two perfect matchings decomposes into disjoint <strong>alternating cycles</strong> (loops that alternate between the two configurations). Double edges (where both configurations agree) appear as cycles of length 2.</p>

<p>Use <strong>Min loop</strong> to filter and display only cycles of at least the specified length, hiding double edges and short loops to reveal the large-scale loop structure.</p>

<h4>Local moves (Kenyon-Rémila)</h4>
<p>The simulator uses <strong>lozenge moves</strong> (3 types), <strong>triangle moves</strong> (2 types), and <strong>butterfly moves</strong> (3 types):</p>

<p><strong>Lozenge moves (4-cycle):</strong> Each lozenge is a parallelogram of 4 vertices. If two opposite edges are covered by dimers, flip to cover the other two.</p>
<ul>
  <li><strong>Type 0 (up-right)</strong>: (n,j) → (n+1,j) → (n+1,j+1) → (n,j+1)</li>
  <li><strong>Type 1 (up)</strong>: (n,j) → (n,j+1) → (n-1,j+2) → (n-1,j+1)</li>
  <li><strong>Type 2 (up-left)</strong>: (n,j) → (n-1,j+1) → (n-2,j+1) → (n-1,j)</li>
</ul>

<p><strong>Triangle moves (6-cycle):</strong> Each triangle has 6 boundary edges covered by 3 dimers. Rotate the 3 dimers to the other alternating pattern.</p>
<ul>
  <li><strong>Type 0 (up-left)</strong>: (n,j) → (n+2,j) → (n,j+2)</li>
  <li><strong>Type 1 (down-right)</strong>: (n,j) → (n+2,j) → (n+2,j-2)</li>
</ul>

<p><strong>Butterfly moves (8-cycle):</strong> Each butterfly has 8 boundary edges covered by 4 dimers. Rotate the 4 dimers to the other alternating pattern.</p>
<ul>
  <li><strong>Type 0</strong>: (1,0)-(2,0)-(3,-1)-(3,0)-(3,1)-(2,1)-(1,2)-(1,1)</li>
  <li><strong>Type 1</strong>: (0,0)-(-1,1)-(-2,2)-(-2,1)-(-3,1)-(-3,0)-(-2,0)-(-1,0)</li>
  <li><strong>Type 2</strong>: (0,0)-(1,0)-(2,0)-(1,1)-(1,2)-(0,2)-(-1,2)-(0,1)</li>
</ul>

<p><strong>Move selection:</strong> Each step picks a random vertex, then selects one of 8 move types uniformly at random: lozenge (3/8), triangle (2/8), butterfly (3/8). The move is attempted anchored at that vertex and accepted via Metropolis-Hastings when using periodic weights.</p>

<p>See <a href="https://www.sciencedirect.com/science/article/pii/0012365X9500288U">Kenyon &amp; Rémila (1996)</a> for ergodicity proofs.</p>

<p><strong>Note on topological sectors:</strong> For domains with holes or periodic boundary conditions, the configuration space splits into disjoint sectors, which Glauber cannot mix between.</p>

<h4>References</h4>
<ul>
  <li>C. Kenyon, E. Rémila: <a href="https://www.sciencedirect.com/science/article/pii/0012365X9500288U">Perfect matchings in the triangular lattice</a>, Discrete Math. 152 (1996) — ergodicity via 4+6+8 cycles</li>
  <li>I. Hartarsky, L. Lichev, F. Toninelli: <a href="https://arxiv.org/abs/2304.10930">Local dimer dynamics in higher dimensions</a>, Ann. Inst. Henri Poincaré D (2024) — 4+6 cycles suffice for parallelograms</li>
  <li>P. Fendley, R. Moessner, S.L. Sondhi: <a href="https://arxiv.org/abs/cond-mat/0206159">Classical dimers on the triangular lattice</a>, Phys. Rev. B 66 (2002)</li>
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
  .status-bar.warning {
    background: #fff3cd;
    border-color: #ffc107;
    color: #856404;
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
  <button id="btn-triangle-up">Triangle</button>
  <button id="btn-make-coverable">Make Coverable</button>
  <button id="btn-scale-up">Scale ×2</button>
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
    <input type="checkbox" id="show-coords"> Coords
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="show-boundary" checked> Boundary
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="color-by-orientation" checked> Color by orientation
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="double-dimer"> Double dimer
  </label>
  <span id="min-loop-container" style="display: none; margin-left: 8px;">
    <span style="font-size: 12px; color: #666;">Min loop:</span>
    <input type="number" id="min-loop-size" class="param-input" value="2" min="2" style="width: 50px;">
  </span>
  <span style="margin-left: 12px; display: inline-flex; align-items: center; gap: 4px;">
    <span style="font-size: 12px; color: #666;">Dimer width</span>
    <input type="range" id="edge-width-slider" min="1" max="100" value="50" style="width: 80px;">
  </span>
</div>

<div class="control-group">
  <div class="control-group-title">Periodic Edge Weights</div>
  <label style="display: inline-flex; align-items: center; gap: 4px;">
    <input type="checkbox" id="use-periodic-weights">
    <span style="font-size: 12px; color: #555;">Enable periodic weights</span>
  </label>
  <span class="param-group" style="margin-left: 12px;">
    <span class="param-label">k:</span>
    <select id="periodic-k" class="param-input" style="width: 50px;">
      <option value="1">1</option>
      <option value="2" selected>2</option>
      <option value="3">3</option>
      <option value="4">4</option>
    </select>
  </span>
  <span class="param-group">
    <span class="param-label">l:</span>
    <select id="periodic-l" class="param-input" style="width: 50px;">
      <option value="1" selected>1</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
    </select>
  </span>
  <div id="weight-diagram-container" style="margin-top: 8px; display: none;">
    <div style="font-size: 11px; color: #666; margin-bottom: 4px;">
      k×l fundamental domain with 3 edge types per cell:
      <span style="color: #E57200;">━ horiz</span>,
      <span style="color: #232D4B;">╱ diag1</span>,
      <span style="color: #2E8B57;">╲ diag2</span>
    </div>
    <div id="weight-diagram" style="display: inline-block;"></div>
  </div>
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
    let currentDimers2 = []; // Second configuration for double dimer model
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

    // Periodic weights state
    let currentPeriodicK = 2;
    let currentPeriodicL = 1;
    let currentEdgeWeights = null; // [k][l][3] array

    // Initialize default weights for k=2, l=1
    function initDefaultWeights(k, l) {
        const weights = [];
        for (let ni = 0; ni < k; ni++) {
            weights[ni] = [];
            for (let ji = 0; ji < l; ji++) {
                if (k === 2 && l === 1) {
                    // Default non-uniform weights
                    if (ni === 0) {
                        weights[ni][ji] = [1.0, 2.0, 0.5];  // horiz, diag1, diag2
                    } else {
                        weights[ni][ji] = [0.5, 1.0, 2.0];
                    }
                } else {
                    weights[ni][ji] = [1.0, 1.0, 1.0];  // uniform
                }
            }
        }
        return weights;
    }

    currentEdgeWeights = initDefaultWeights(2, 1);

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
    // BOUNDARY COMPUTATION & HOLE DETECTION
    // ========================================================================
    let hasHoles = false;  // Track if domain has topological holes

    function computeBoundary() {
        boundaryEdges = [];
        hasHoles = false;
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

        // Detect holes by counting boundary connected components
        // More than 1 component means there are holes
        hasHoles = detectHoles();
    }

    // Detect holes by counting connected components of the boundary
    // Uses the inside vertices (n1,j1) of boundary edges
    function detectHoles() {
        if (boundaryEdges.length === 0) return false;

        // Build adjacency for boundary traversal
        // Two boundary edges are connected if they share a vertex
        const edgeMap = new Map();  // vertex key -> list of boundary edges using it

        for (let i = 0; i < boundaryEdges.length; i++) {
            const e = boundaryEdges[i];
            // Use the vertex inside the region (n1, j1)
            const k1 = vertexKey(e.n1, e.j1);
            if (!edgeMap.has(k1)) edgeMap.set(k1, []);
            edgeMap.get(k1).push(i);
        }

        // Count connected components using BFS on boundary edges
        const visited = new Set();
        let components = 0;

        for (let startIdx = 0; startIdx < boundaryEdges.length; startIdx++) {
            if (visited.has(startIdx)) continue;

            components++;
            const queue = [startIdx];
            visited.add(startIdx);

            while (queue.length > 0) {
                const idx = queue.shift();
                const e = boundaryEdges[idx];

                // Find adjacent boundary edges (share a vertex)
                const k1 = vertexKey(e.n1, e.j1);
                const neighbors = edgeMap.get(k1) || [];

                for (const nIdx of neighbors) {
                    if (!visited.has(nIdx)) {
                        visited.add(nIdx);
                        queue.push(nIdx);
                    }
                }

                // Also check neighbors of the inside vertex in other directions
                for (let d = 0; d < 6; d++) {
                    const nn = e.n1 + DIR_DN[d];
                    const nj = e.j1 + DIR_DJ[d];
                    const nk = vertexKey(nn, nj);
                    if (activeVertices.has(nk)) {
                        const adjEdges = edgeMap.get(nk) || [];
                        for (const nIdx of adjEdges) {
                            if (!visited.has(nIdx)) {
                                visited.add(nIdx);
                                queue.push(nIdx);
                            }
                        }
                    }
                }
            }
        }

        // More than 1 component means holes exist
        return components > 1;
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

        // Draw coordinates if enabled
        if (document.getElementById('show-coords').checked) {
            drawCoords();
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

    function drawCoords() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        // Only draw if zoomed in enough
        if (viewScale < 15) return;

        const fontSize = Math.max(8, Math.min(14, viewScale * 0.35));
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = isDark ? '#aaa' : '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw coords for all visible grid points, not just active vertices
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

        for (let j = minJ; j <= maxJ; j++) {
            for (let n = minN; n <= maxN; n++) {
                const p = latticeToScreen(n, j);
                ctx.fillText(`${n},${j}`, p.x, p.y - fontSize * 0.8);
            }
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
        const doubleDimerEnabled = document.getElementById('double-dimer').checked;
        const defaultColor = isDark ? '#ffffff' : '#000000';

        // Width slider: 1-100 with exponential scaling for more extreme ends
        const widthSlider = parseInt(document.getElementById('edge-width-slider').value) || 50;
        // Exponential: 1->0.02, 50->1, 100->5
        const widthMultiplier = Math.pow(10, (widthSlider - 50) / 30);

        // Scale dimer width with zoom and slider
        ctx.lineWidth = Math.max(0.2, Math.min(20, viewScale * 0.15 * widthMultiplier));
        ctx.lineCap = 'round';

        // Double dimer colors (blue and red)
        const dimer1Color = '#0066CC';
        const dimer2Color = '#CC3300';

        // Get loop filter if double dimer is enabled
        let filteredIndices0 = null;
        let filteredIndices1 = null;
        if (doubleDimerEnabled && wasmReady) {
            const minLoop = parseInt(document.getElementById('min-loop-size').value) || 2;
            const filterResult = wasmModule._filterLoopsBySize(minLoop);
            if (filterResult) {
                try {
                    const parsed = JSON.parse(filterResult);
                    filteredIndices0 = new Set(parsed.indices0);
                    filteredIndices1 = new Set(parsed.indices1);
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        for (let i = 0; i < currentDimers.length; i++) {
            // Skip if filtering and this edge is not in the filtered set
            if (filteredIndices0 && !filteredIndices0.has(i)) continue;

            const d = currentDimers[i];
            const p1 = latticeToScreen(d.n1, d.j1);
            const p2 = latticeToScreen(d.n2, d.j2);

            if (doubleDimerEnabled) {
                ctx.strokeStyle = dimer1Color;
            } else if (colorByOrientation) {
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

        // Draw second configuration if double dimer is enabled
        if (doubleDimerEnabled && currentDimers2.length > 0) {
            ctx.strokeStyle = dimer2Color;
            for (let i = 0; i < currentDimers2.length; i++) {
                // Skip if filtering and this edge is not in the filtered set
                if (filteredIndices1 && !filteredIndices1.has(i)) continue;

                const d = currentDimers2[i];
                const p1 = latticeToScreen(d.n1, d.j1);
                const p2 = latticeToScreen(d.n2, d.j2);

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
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
    // SCALE UP
    // ========================================================================
    function scaleUp() {
        if (activeVertices.size === 0) return;

        // Collect current vertices
        const currentVerts = Array.from(activeVertices.values());

        // Clear and rebuild at 2x scale
        activeVertices.clear();

        // For each original vertex (n, j), add vertices at:
        // (2n, 2j), (2n+1, 2j), (2n, 2j+1), (2n+1, 2j+1)
        // This fills in a 2x2 parallelogram for each original vertex
        for (const v of currentVerts) {
            const n2 = v.n * 2;
            const j2 = v.j * 2;
            for (let dn = 0; dn <= 1; dn++) {
                for (let dj = 0; dj <= 1; dj++) {
                    const key = vertexKey(n2 + dn, j2 + dj);
                    if (!activeVertices.has(key)) {
                        activeVertices.set(key, { n: n2 + dn, j: j2 + dj });
                    }
                }
            }
        }

        reinitialize();
        fitView();
        updateStatus(`Scaled region to ${activeVertices.size} vertices`);
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
            currentDimers2 = [];
            return false;
        }

        isValid = true;
        if (hasHoles) {
            updateStatus(`Initialized with ${result} vertices. ⚠️ Domain has holes - Glauber cannot mix topological sectors!`, true);
        } else {
            updateStatus(`Initialized with ${result} vertices`);
        }
        fetchDimers();
        // Only initialize second config if double dimer is enabled
        if (document.getElementById('double-dimer').checked) {
            wasmModule._resetDimers2();
            fetchDimers2();
        } else {
            currentDimers2 = [];
        }
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

    function fetchDimers2() {
        if (!wasmReady || !isValid) return;

        const dimerStr = wasmModule._exportDimers2();
        currentDimers2 = [];

        if (dimerStr && dimerStr.length > 0) {
            const parts = dimerStr.split(';');
            for (const part of parts) {
                const coords = part.split(',').map(Number);
                if (coords.length === 4) {
                    currentDimers2.push({
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
                _performGlauberSteps2: Module.cwrap('performGlauberSteps2', null, ['number']),
                _exportDimers2: Module.cwrap('exportDimers2', 'string', []),
                _resetDimers2: Module.cwrap('resetDimers2', null, []),
                _clearDimers2: Module.cwrap('clearDimers2', null, []),
                _getDebugWeights: Module.cwrap('getDebugWeights', 'string', []),
                _filterLoopsBySize: Module.cwrap('filterLoopsBySize', 'string', ['number']),
                _getTotalSteps: Module.cwrap('getTotalSteps', 'number', []),
                _getFlipCount: Module.cwrap('getFlipCount', 'number', []),
                _getLozengeFlips: Module.cwrap('getLozengeFlips', 'number', []),
                _getTriangleFlips: Module.cwrap('getTriangleFlips', 'number', []),
                _getButterflyFlips: Module.cwrap('getButterflyFlips', 'number', []),
                _getAcceptRate: Module.cwrap('getAcceptRate', 'number', []),
                _getVertexCount: Module.cwrap('getVertexCount', 'number', []),
                _setUsePeriodicWeights: Module.cwrap('setUsePeriodicWeights', null, ['number']),
                _getUsePeriodicWeights: Module.cwrap('getUsePeriodicWeights', 'number', []),
                _getPeriodicK: Module.cwrap('getPeriodicK', 'number', []),
                _getPeriodicL: Module.cwrap('getPeriodicL', 'number', []),
                _setSeed: Module.cwrap('setSeed', null, ['number'])
            };
            // Seed RNG with random value so each page load is different
            const randomSeed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
            wasmModule._setSeed(randomSeed);
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

    function reinitialize() {
        stopSimulation();
        computeBoundary();
        if (activeVertices.size === 0) {
            isValid = false;
            currentDimers = [];
            currentDimers2 = [];
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

        // Run second Glauber if double dimer mode is enabled
        const doubleDimerEnabled = document.getElementById('double-dimer').checked;
        if (doubleDimerEnabled) {
            wasmModule._performGlauberSteps2(stepsThisFrame);
            fetchDimers2();
        }

        const totalSteps = wasmModule._getTotalSteps();
        const flipCount = wasmModule._getFlipCount();
        const lozengeFlips = wasmModule._getLozengeFlips();
        const triangleFlips = wasmModule._getTriangleFlips();
        const butterflyFlips = wasmModule._getButterflyFlips();
        const acceptRate = wasmModule._getAcceptRate();

        updateStatus(`Steps: ${totalSteps.toLocaleString()} | L: ${lozengeFlips.toLocaleString()} | T: ${triangleFlips.toLocaleString()} | B: ${butterflyFlips.toLocaleString()} | Accept: ${(acceptRate * 100).toFixed(1)}%`);

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
    function updateStatus(text, isWarning = false) {
        const statusBar = document.querySelector('.status-bar');
        document.getElementById('status-text').textContent = text;
        statusBar.classList.toggle('warning', isWarning);
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
        // Check if clicking near the start to close the polygon
        if (lassoPoints.length >= 3) {
            const dist = Math.hypot(x - lassoPoints[0].x, y - lassoPoints[0].y);
            if (dist < 15) {
                applyLasso(currentTool === 'lasso-fill');
                return;
            }
        }

        // Add the point
        lassoPoints.push({ x, y });
        draw();

        // If Cmd/Ctrl was held, close after adding this point
        if (forceClose && lassoPoints.length >= 3) {
            applyLasso(currentTool === 'lasso-fill');
        }
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

    document.getElementById('btn-triangle-up').addEventListener('click', () => {
        const size = parseInt(document.getElementById('preset-size').value) || 6;
        createTriangleUp(size);
    });

    document.getElementById('btn-make-coverable').addEventListener('click', makeCoverable);
    document.getElementById('btn-scale-up').addEventListener('click', scaleUp);

    document.getElementById('btn-clear').addEventListener('click', () => {
        activeVertices.clear();
        reinitialize();
        // Reset view
        viewOffsetX = 0;
        viewOffsetY = 0;
        viewScale = 30;
        draw();
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
    document.getElementById('show-coords').addEventListener('change', draw);
    document.getElementById('show-boundary').addEventListener('change', draw);
    document.getElementById('color-by-orientation').addEventListener('change', draw);
    document.getElementById('edge-width-slider').addEventListener('input', draw);
    document.getElementById('double-dimer').addEventListener('change', () => {
        const doubleDimerEnabled = document.getElementById('double-dimer').checked;
        document.getElementById('min-loop-container').style.display = doubleDimerEnabled ? '' : 'none';
        if (wasmReady && isValid) {
            if (doubleDimerEnabled) {
                // Start fresh second config from current first config
                wasmModule._resetDimers2();
                fetchDimers2();
            } else {
                // Clear second config
                wasmModule._clearDimers2();
                currentDimers2 = [];
            }
        }
        draw();
    });
    document.getElementById('min-loop-size').addEventListener('change', draw);

    // ========================================================================
    // PERIODIC WEIGHTS
    // ========================================================================

    function buildFundamentalDomainSVG(k, l, weights) {
        const svgNS = "http://www.w3.org/2000/svg";
        const sqrt3_2 = Math.sqrt(3) / 2;

        // Layout parameters - scale based on k and l to keep labels readable
        const baseScale = 100;  // pixels per unit
        const scale = Math.max(70, baseScale - Math.max(k, l) * 8);  // reduce scale for larger domains
        const padding = 60;
        const vertexRadius = 5;
        const edgeWidth = 4;

        // Edge colors (same as in main drawing)
        const edgeColors = ['#E57200', '#232D4B', '#2E8B57'];

        // Calculate bounds - show the k×l domain plus one extra row/col for context
        const minN = -1, maxN = k;
        const minJ = -1, maxJ = l;

        // Convert lattice coords to SVG coords
        function toSVG(n, j) {
            const x = (n + 0.5 * j - minN - 0.5 * minJ) * scale + padding;
            const y = ((maxJ - j) * sqrt3_2) * scale + padding;  // flip y so j increases upward
            return { x, y };
        }

        // Calculate SVG dimensions
        const width = (maxN - minN + 0.5 * (maxJ - minJ) + 1) * scale + 2 * padding;
        const height = (maxJ - minJ + 1) * sqrt3_2 * scale + 2 * padding;

        // Create SVG element
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", width);
        svg.setAttribute("height", height);
        svg.style.display = "block";
        svg.style.margin = "8px auto";
        svg.style.background = "#fafafa";
        svg.style.borderRadius = "4px";
        svg.style.border = "1px solid #ddd";

        // Draw background edges (lighter, for context)
        for (let j = minJ; j <= maxJ; j++) {
            for (let n = minN; n <= maxN; n++) {
                const p = toSVG(n, j);
                // Only draw edges going "forward" to avoid duplicates
                // Horizontal: (n,j) -> (n+1,j)
                if (n < maxN) {
                    const p2 = toSVG(n + 1, j);
                    const line = document.createElementNS(svgNS, "line");
                    line.setAttribute("x1", p.x);
                    line.setAttribute("y1", p.y);
                    line.setAttribute("x2", p2.x);
                    line.setAttribute("y2", p2.y);
                    line.setAttribute("stroke", "#ddd");
                    line.setAttribute("stroke-width", 1);
                    svg.appendChild(line);
                }
                // Diag1: (n,j) -> (n,j+1)
                if (j < maxJ) {
                    const p2 = toSVG(n, j + 1);
                    const line = document.createElementNS(svgNS, "line");
                    line.setAttribute("x1", p.x);
                    line.setAttribute("y1", p.y);
                    line.setAttribute("x2", p2.x);
                    line.setAttribute("y2", p2.y);
                    line.setAttribute("stroke", "#ddd");
                    line.setAttribute("stroke-width", 1);
                    svg.appendChild(line);
                }
                // Diag2: (n,j) -> (n-1,j+1)
                if (j < maxJ && n > minN) {
                    const p2 = toSVG(n - 1, j + 1);
                    const line = document.createElementNS(svgNS, "line");
                    line.setAttribute("x1", p.x);
                    line.setAttribute("y1", p.y);
                    line.setAttribute("x2", p2.x);
                    line.setAttribute("y2", p2.y);
                    line.setAttribute("stroke", "#ddd");
                    line.setAttribute("stroke-width", 1);
                    svg.appendChild(line);
                }
            }
        }

        // Draw fundamental domain boundary (subtle dashed parallelogram)
        // The domain contains vertices (0..k-1) × (0..l-1)
        // Draw a tight boundary around these vertices with some padding
        const pad = 0.25;  // padding around vertices
        const boundaryCorners = [
            toSVG(-pad, -pad),
            toSVG(k - 1 + pad, -pad),
            toSVG(k - 1 + pad, l - 1 + pad),
            toSVG(-pad, l - 1 + pad)
        ];
        const boundary = document.createElementNS(svgNS, "polygon");
        boundary.setAttribute("points", boundaryCorners.map(c => `${c.x},${c.y}`).join(" "));
        boundary.setAttribute("fill", "rgba(100, 149, 237, 0.08)");
        boundary.setAttribute("stroke", "#7090c0");
        boundary.setAttribute("stroke-width", 1.5);
        boundary.setAttribute("stroke-dasharray", "6,4");
        svg.appendChild(boundary);

        // Draw colored edges within the fundamental domain
        // Each edge type is drawn as short segments from domain vertices
        const edgeLen = 0.5;  // length of edge indicator (fraction of full edge)
        const labelData = [];  // Store label info to draw last (on top)

        for (let j = 0; j < l; j++) {
            for (let n = 0; n < k; n++) {
                const p = toSVG(n, j);
                const w = weights[n]?.[j] || [1, 1, 1];

                // Horizontal edge indicator: towards (n+1,j), type 0
                const p_horiz = toSVG(n + edgeLen, j);
                const lineH = document.createElementNS(svgNS, "line");
                lineH.setAttribute("x1", p.x);
                lineH.setAttribute("y1", p.y);
                lineH.setAttribute("x2", p_horiz.x);
                lineH.setAttribute("y2", p_horiz.y);
                lineH.setAttribute("stroke", edgeColors[0]);
                lineH.setAttribute("stroke-width", edgeWidth);
                lineH.setAttribute("stroke-linecap", "round");
                svg.appendChild(lineH);
                // Label below the horizontal edge (in its own space)
                labelData.push({
                    x: p.x + scale * 0.25,
                    y: p.y + 22,
                    anchor: "middle",
                    color: edgeColors[0],
                    text: w[0]
                });

                // Diag1 edge indicator: towards (n,j+1), type 1
                const p_diag1 = toSVG(n, j + edgeLen);
                const lineD1 = document.createElementNS(svgNS, "line");
                lineD1.setAttribute("x1", p.x);
                lineD1.setAttribute("y1", p.y);
                lineD1.setAttribute("x2", p_diag1.x);
                lineD1.setAttribute("y2", p_diag1.y);
                lineD1.setAttribute("stroke", edgeColors[1]);
                lineD1.setAttribute("stroke-width", edgeWidth);
                lineD1.setAttribute("stroke-linecap", "round");
                svg.appendChild(lineD1);
                // Label above diag1 - stagger y based on n to avoid collision with neighbor
                labelData.push({
                    x: p.x + scale * 0.15,
                    y: p.y - scale * sqrt3_2 * 0.35 - 10,
                    anchor: "middle",
                    color: edgeColors[1],
                    text: w[1]
                });

                // Diag2 edge indicator: towards (n-1,j+1), type 2
                const p_diag2 = toSVG(n - edgeLen, j + edgeLen);
                const lineD2 = document.createElementNS(svgNS, "line");
                lineD2.setAttribute("x1", p.x);
                lineD2.setAttribute("y1", p.y);
                lineD2.setAttribute("x2", p_diag2.x);
                lineD2.setAttribute("y2", p_diag2.y);
                lineD2.setAttribute("stroke", edgeColors[2]);
                lineD2.setAttribute("stroke-width", edgeWidth);
                lineD2.setAttribute("stroke-linecap", "round");
                svg.appendChild(lineD2);
                // Label above diag2 - higher up than diag1 to separate them
                labelData.push({
                    x: p.x - scale * 0.15,
                    y: p.y - scale * sqrt3_2 * 0.55 - 10,
                    anchor: "middle",
                    color: edgeColors[2],
                    text: w[2]
                });
            }
        }

        // Draw vertices
        for (let j = minJ; j <= maxJ; j++) {
            for (let n = minN; n <= maxN; n++) {
                const p = toSVG(n, j);
                const inDomain = (n >= 0 && n < k && j >= 0 && j < l);
                const circle = document.createElementNS(svgNS, "circle");
                circle.setAttribute("cx", p.x);
                circle.setAttribute("cy", p.y);
                circle.setAttribute("r", inDomain ? vertexRadius : vertexRadius * 0.6);
                circle.setAttribute("fill", inDomain ? "#333" : "#bbb");
                svg.appendChild(circle);
            }
        }

        // Draw weight labels last so they appear on top, with white background bubbles
        for (const lbl of labelData) {
            // Create a group for background + text
            const g = document.createElementNS(svgNS, "g");

            // Create text first to measure it
            const text = document.createElementNS(svgNS, "text");
            text.setAttribute("x", lbl.x);
            text.setAttribute("y", lbl.y);
            text.setAttribute("text-anchor", lbl.anchor);
            text.setAttribute("font-size", "13px");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("fill", lbl.color);
            text.textContent = lbl.text;

            // Estimate text width (roughly 8px per character for this font size)
            const textLen = String(lbl.text).length * 8;
            const padX = 4, padY = 3;
            let rectX = lbl.x - padX;
            if (lbl.anchor === "middle") rectX = lbl.x - textLen/2 - padX;
            else if (lbl.anchor === "end") rectX = lbl.x - textLen - padX;

            // White background rounded rect
            const bg = document.createElementNS(svgNS, "rect");
            bg.setAttribute("x", rectX);
            bg.setAttribute("y", lbl.y - 11);
            bg.setAttribute("width", textLen + padX * 2);
            bg.setAttribute("height", 16);
            bg.setAttribute("rx", 3);
            bg.setAttribute("ry", 3);
            bg.setAttribute("fill", "white");
            bg.setAttribute("stroke", lbl.color);
            bg.setAttribute("stroke-width", "1");
            bg.setAttribute("opacity", "0.95");

            g.appendChild(bg);
            g.appendChild(text);
            svg.appendChild(g);
        }

        return svg;
    }

    function buildWeightDiagram() {
        const container = document.getElementById('weight-diagram');
        const k = currentPeriodicK;
        const l = currentPeriodicL;

        container.innerHTML = '';

        // Create a flex wrapper to put weights on left, SVG on right
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'flex-start';
        wrapper.style.gap = '20px';
        wrapper.style.flexWrap = 'wrap';

        // Build a grid of input cells (on the left)
        const gridContainer = document.createElement('div');
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = `repeat(${k}, auto)`;
        gridContainer.style.gap = '8px';

        const edgeColors = ['#E57200', '#232D4B', '#2E8B57'];
        const edgeLabels = ['━', '╱', '╲'];

        // Iterate j from l-1 down to 0 so (0,l-1) is top-left visually
        for (let ji = l - 1; ji >= 0; ji--) {
            for (let ni = 0; ni < k; ni++) {
                const cellDiv = document.createElement('div');
                cellDiv.style.border = '1px solid #ddd';
                cellDiv.style.padding = '6px';
                cellDiv.style.borderRadius = '4px';
                cellDiv.style.background = '#fff';

                const header = document.createElement('div');
                header.style.fontSize = '10px';
                header.style.color = '#888';
                header.style.textAlign = 'center';
                header.style.marginBottom = '4px';
                header.textContent = `(${ni},${ji})`;
                cellDiv.appendChild(header);

                for (let t = 0; t < 3; t++) {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.alignItems = 'center';
                    row.style.gap = '4px';
                    row.style.marginTop = '2px';

                    const label = document.createElement('span');
                    label.style.color = edgeColors[t];
                    label.style.fontWeight = 'bold';
                    label.style.width = '16px';
                    label.textContent = edgeLabels[t];
                    row.appendChild(label);

                    const input = document.createElement('input');
                    input.type = 'number';
                    input.className = 'param-input';
                    input.style.width = '55px';
                    input.style.fontSize = '11px';
                    input.min = '0.001';
                    input.max = '1000';
                    input.step = '0.1';
                    input.value = currentEdgeWeights[ni]?.[ji]?.[t] ?? 1;
                    input.dataset.n = ni;
                    input.dataset.j = ji;
                    input.dataset.t = t;
                    input.addEventListener('change', updateEdgeWeights);
                    row.appendChild(input);

                    cellDiv.appendChild(row);
                }

                gridContainer.appendChild(cellDiv);
            }
        }

        wrapper.appendChild(gridContainer);

        // Add the SVG diagram of the fundamental domain (on the right)
        const svg = buildFundamentalDomainSVG(k, l, currentEdgeWeights);
        svg.style.margin = '0';  // Remove auto margin since we're using flex
        wrapper.appendChild(svg);

        container.appendChild(wrapper);
    }

    function updateEdgeWeights() {
        if (!wasmReady) return;

        const k = currentPeriodicK;
        const l = currentPeriodicL;

        // Collect weights from inputs
        const inputs = document.querySelectorAll('#weight-diagram input[data-n]');
        inputs.forEach(input => {
            const ni = parseInt(input.dataset.n);
            const ji = parseInt(input.dataset.j);
            const t = parseInt(input.dataset.t);
            const val = Math.max(0.001, parseFloat(input.value) || 1);
            input.value = val;
            if (!currentEdgeWeights[ni]) currentEdgeWeights[ni] = [];
            if (!currentEdgeWeights[ni][ji]) currentEdgeWeights[ni][ji] = [1, 1, 1];
            currentEdgeWeights[ni][ji][t] = val;
        });

        // Send to WASM as flat array: [n0j0t0, n0j0t1, n0j0t2, n0j1t0, ...]
        const flatArray = [];
        for (let ni = 0; ni < k; ni++) {
            for (let ji = 0; ji < l; ji++) {
                for (let t = 0; t < 3; t++) {
                    flatArray.push(currentEdgeWeights[ni]?.[ji]?.[t] ?? 1);
                }
            }
        }

        // Allocate memory and copy values
        const dataPtr = Module._malloc(flatArray.length * 8);  // 8 bytes per double
        for (let i = 0; i < flatArray.length; i++) {
            Module.setValue(dataPtr + i * 8, flatArray[i], 'double');
        }

        // Call WASM function
        Module._setPeriodicEdgeWeights(dataPtr, k, l);

        // Free memory
        Module._free(dataPtr);

        // Update the SVG diagram to show new weights
        const container = document.getElementById('weight-diagram');
        const oldSvg = container.querySelector('svg');
        if (oldSvg) {
            const newSvg = buildFundamentalDomainSVG(k, l, currentEdgeWeights);
            newSvg.style.margin = '0';  // Remove auto margin since we're using flex
            oldSvg.parentNode.replaceChild(newSvg, oldSvg);
        }
    }

    // Periodic weights event handlers
    document.getElementById('use-periodic-weights').addEventListener('change', (e) => {
        const enabled = e.target.checked;
        if (wasmReady) {
            wasmModule._setUsePeriodicWeights(enabled ? 1 : 0);
        }
        document.getElementById('weight-diagram-container').style.display = enabled ? 'block' : 'none';
        if (enabled) {
            buildWeightDiagram();
            updateEdgeWeights();
        }
    });

    document.getElementById('periodic-k').addEventListener('change', (e) => {
        currentPeriodicK = parseInt(e.target.value);
        currentEdgeWeights = initDefaultWeights(currentPeriodicK, currentPeriodicL);
        if (document.getElementById('use-periodic-weights').checked) {
            buildWeightDiagram();
            updateEdgeWeights();
        }
    });

    document.getElementById('periodic-l').addEventListener('change', (e) => {
        currentPeriodicL = parseInt(e.target.value);
        currentEdgeWeights = initDefaultWeights(currentPeriodicK, currentPeriodicL);
        if (document.getElementById('use-periodic-weights').checked) {
            buildWeightDiagram();
            updateEdgeWeights();
        }
    });

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
