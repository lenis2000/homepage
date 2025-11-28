---
title: Ultimate Lozenge Tiling Generator - Draw Any Region
model: lozenge-tilings
permalink: lozenge-draw/
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.cpp'
    txt: 'C++ code for the simulation (compiled to WebAssembly)'
---

<details id="about-simulation-details">
<summary>About this simulation</summary>
<div class="content" style="padding: 16px; background: white; border-top: 1px solid #e0e0e0;">

<p>This simulator generates <strong>uniformly random lozenge tilings</strong> of arbitrary polygonal regions on the triangular lattice.</p>

<p><strong>How to use:</strong></p>
<ul>
  <li><strong>Draw mode</strong>: Click or drag on the triangular grid to add triangles to your region</li>
  <li><strong>Erase mode</strong>: Remove triangles from your region</li>
  <li><strong>Hexagon preset</strong>: Quickly generate a standard hexagonal region with sides (a,b,c,a,b,c)</li>
  <li><strong>2x Region</strong>: Double the size of your current region while preserving its shape</li>
  <li><strong>Make Tileable</strong>: If your region is invalid (unequal black/white triangles), this removes the minimum number of triangles to make it tileable using maximum bipartite matching</li>
</ul>

<p>A region is <strong>tileable</strong> (valid) if and only if it has equal numbers of black and white triangles AND they can be perfectly matched. The simulator uses <strong>Dinic's maximum flow algorithm</strong> to find a perfect matching when one exists.</p>

<p><strong>Sampling methods:</strong></p>
<ul>
  <li><strong>Glauber dynamics</strong> (Start/Stop): Markov chain Monte Carlo that performs local "flips" of three lozenges around hexagonal vertices. Converges to the uniform distribution over time. The <strong>q parameter</strong> biases the distribution toward higher (q&gt;1) or lower (q&lt;1) volume configurations.</li>
  <li><strong>Perfect Sample (CFTP)</strong>: <strong>Coupling From The Past</strong> algorithm that produces an <em>exact</em> sample from the uniform (or q-weighted) distribution in finite time, with no burn-in period required. It works by running coupled Markov chains backward in time until they coalesce.</li>
</ul>

<p>The simulation runs entirely in your browser using WebAssembly.</p>

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
  #lozenge-canvas {
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
  #lozenge-canvas.panning {
    cursor: grab;
  }
  #lozenge-canvas.panning:active {
    cursor: grabbing;
  }
  [data-theme="dark"] #lozenge-canvas {
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
  .control-group button.primary {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
  }
  .control-group button.primary:hover {
    background: #45a049;
  }
  .control-group button.primary:disabled {
    background: #ccc;
    border-color: #ccc;
    cursor: not-allowed;
  }
  .control-group button.running {
    background: linear-gradient(135deg, #ff5722, #ff9800);
    color: white;
    border-color: #ff5722;
  }
  .control-group button.cftp {
    background: linear-gradient(135deg, #9c27b0, #7b1fa2);
    color: white;
    border-color: #9c27b0;
  }
  .control-group button.cftp:hover {
    background: linear-gradient(135deg, #7b1fa2, #6a1b9a);
  }
  .control-group button.cftp:disabled {
    background: #ccc;
    border-color: #ccc;
    cursor: not-allowed;
  }
  /* Tool toggle buttons */
  .tool-toggle {
    display: inline-flex;
    border: 2px solid #1976d2;
    border-radius: 6px;
    overflow: hidden;
  }
  .tool-toggle button {
    border: none;
    border-radius: 0;
    height: 32px;
    padding: 0 16px;
    font-weight: 500;
    background: white;
    color: #1976d2;
  }
  .tool-toggle button.active {
    background: #1976d2;
    color: white;
  }
  .tool-toggle button:hover:not(.active) {
    background: #e3f2fd;
  }
  /* View toggle buttons */
  .view-toggle {
    display: inline-flex;
    border: 2px solid #1976d2;
    border-radius: 6px;
    overflow: hidden;
  }
  .view-toggle button {
    border: none;
    border-radius: 0;
    height: 32px;
    padding: 0 16px;
    font-weight: 500;
    background: white;
    color: #1976d2;
  }
  .view-toggle button.active {
    background: #1976d2;
    color: white;
  }
  .view-toggle button:hover:not(.active) {
    background: #e3f2fd;
  }
  .stats-inline {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 12px;
  }
  .stats-inline .stat {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .stats-inline .stat-label {
    color: #888;
    text-transform: uppercase;
    font-size: 10px;
  }
  .stats-inline .stat-value {
    color: #1976d2;
    font-weight: 600;
    font-family: 'SF Mono', Monaco, monospace;
  }
  .status-valid {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 12px;
  }
  .status-invalid {
    background: #ffebee;
    color: #c62828;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 12px;
  }
  .status-empty {
    background: #fff3e0;
    color: #e65100;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 12px;
  }
  select {
    height: 30px;
    padding: 0 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    background: white;
    cursor: pointer;
  }
  input[type="range"] {
    height: 4px;
    border-radius: 2px;
    background: #d0d0d0;
    appearance: none;
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4CAF50, #66BB6A);
    cursor: pointer;
  }
  .color-legend {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .color-box {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid rgba(0,0,0,0.1);
  }
  details {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
    margin: 8px auto;
    max-width: 900px;
  }
  details > summary {
    padding: 8px 12px;
    background: #f5f5f5;
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
  }
  details > .content {
    padding: 10px 12px;
    background: white;
  }
  [data-theme="dark"] .control-group {
    background-color: #2d2d2d;
    border-color: #444;
  }
  [data-theme="dark"] .control-group-title,
  [data-theme="dark"] .param-label {
    color: #bbb;
  }
  [data-theme="dark"] .param-input,
  [data-theme="dark"] select,
  [data-theme="dark"] .control-group button {
    background-color: #3a3a3a;
    border-color: #555;
    color: #ddd;
  }
  [data-theme="dark"] .status-valid { background: #1b5e20; color: #a5d6a7; }
  [data-theme="dark"] .status-invalid { background: #b71c1c; color: #ffcdd2; }
  [data-theme="dark"] .status-empty { background: #e65100; color: #ffe0b2; }
  @media (max-width: 767px) {
    #lozenge-canvas { height: 450px; }
    .param-group { margin-right: 8px; margin-bottom: 6px; }
    .param-input { width: 40px; }
  }
</style>

<script src="/js/colorschemes.js"></script>
<script src="/js/2025-11-28-ultimate-lozenge.js"></script>

<!-- Main controls -->
<div style="max-width: 900px; margin: 0 auto; padding: 8px;">

<!-- Drawing Tools -->
<div class="control-group">
  <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
    <div class="tool-toggle">
      <button id="drawBtn" class="active">Draw</button>
      <button id="eraseBtn">Erase</button>
    </div>
    <button id="resetBtn">Clear</button>
    <button id="undoBtn" title="Undo (Ctrl+Z)">Undo</button>
    <button id="redoBtn" title="Redo (Ctrl+Y)">Redo</button>
    <button id="redoBoundaryBtn" title="Recalculate boundary">Redo Boundary</button>
    <span id="statusBadge" class="status-empty">Empty</span>
  </div>
</div>

<!-- View Controls -->
<div class="control-group">
  <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
    <button id="zoomInBtn" title="Zoom In">+</button>
    <button id="zoomOutBtn" title="Zoom Out">−</button>
    <button id="panLeftBtn" title="Pan Left">←</button>
    <button id="panRightBtn" title="Pan Right">→</button>
    <button id="panUpBtn" title="Pan Up">↑</button>
    <button id="panDownBtn" title="Pan Down">↓</button>
    <button id="resetViewBtn" title="Reset View">Reset View</button>
  </div>
</div>

<!-- Preset Shapes -->
<div class="control-group">
  <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
    <button id="hexagonBtn">Hexagon</button>
    <span class="param-group"><span class="param-label">a</span><input type="number" class="param-input" id="hexAInput" value="4" min="1" max="30"></span>
    <span class="param-group"><span class="param-label">b</span><input type="number" class="param-input" id="hexBInput" value="3" min="1" max="30"></span>
    <span class="param-group"><span class="param-label">c</span><input type="number" class="param-input" id="hexCInput" value="5" min="1" max="30"></span>
  </div>
</div>

<!-- Display Options -->
<div class="control-group">
  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
    <div class="view-toggle">
      <button id="lozengeViewBtn" class="active">Lozenge</button>
      <button id="dimerViewBtn">Dimer</button>
    </div>
    <div style="display: flex; align-items: center; gap: 4px;">
      <button id="prev-palette" style="padding: 0 8px;">&#9664;</button>
      <select id="palette-select" style="width: 120px;"></select>
      <button id="next-palette" style="padding: 0 8px;">&#9654;</button>
    </div>
    <button id="permuteColors" title="Permute colors">Permute</button>
    <div style="display: flex; align-items: center; gap: 4px;">
      <span style="font-size: 12px; color: #555;">Outline:</span>
      <input type="number" id="outlineWidthPct" value="0.1" min="0" max="10" step="0.1" class="param-input" style="width: 50px;">
      <span style="font-size: 11px; color: #888;">%</span>
    </div>
    <div style="display: flex; align-items: center; gap: 4px;">
      <span style="font-size: 12px; color: #555;">Border:</span>
      <input type="number" id="borderWidthPct" value="1" min="0" max="50" step="0.5" class="param-input" style="width: 50px;">
      <span style="font-size: 11px; color: #888;">%</span>
    </div>
  </div>
</div>

<!-- Simulation Controls -->
<div class="control-group">
  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
    <button id="startStopBtn" class="primary" disabled>Start</button>
    <button id="cftpBtn" class="cftp" title="Coupling From The Past - Perfect Sample" disabled>Perfect Sample</button>
    <button id="doubleMeshBtn" title="Double the region size">2x Region</button>
    <button id="repairBtn" title="Remove unmatched triangles to restore tileability" disabled>Make Tileable</button>
    <div style="display: flex; align-items: center; gap: 6px;">
      <span style="font-size: 12px; color: #666;">Speed</span>
      <input type="range" id="speedSlider" min="0" max="100" value="29" style="width: 100px;">
      <input type="number" id="speedInput" class="param-input" value="100" min="1" max="100000000" style="width: 80px;">
      <span style="font-size: 11px; color: #888;">/s</span>
    </div>
    <span class="param-group"><span class="param-label">q</span><input type="number" class="param-input" id="qInput" value="1" min="0" max="10" step="0.01" style="width: 60px;"></span>
  </div>
</div>

<!-- Stats Row -->
<div class="control-group">
  <div class="stats-inline">
    <div class="stat"><span class="stat-label">Black</span><span class="stat-value" id="blackCount">0</span></div>
    <div class="stat"><span class="stat-label">White</span><span class="stat-value" id="whiteCount">0</span></div>
    <div class="stat"><span class="stat-label">Dimers</span><span class="stat-value" id="dimerCount">0</span></div>
    <div class="stat"><span class="stat-label">Steps</span><span class="stat-value" id="stepCount">0</span></div>
    <div class="stat"><span class="stat-label">Volume</span><span class="stat-value" id="volume">0</span></div>
    <div class="stat"><span class="stat-label">CFTP</span><span class="stat-value" id="cftpSteps">-</span></div>
  </div>
</div>

</div>

<!-- Canvas -->
<canvas id="lozenge-canvas"></canvas>

<!-- Export & Legend -->
<details>
  <summary>Export & Legend</summary>
  <div class="content">
    <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
      <button id="export-png">PNG</button>
      <button id="export-pdf">PDF</button>
      <span style="font-size: 11px; color: #666;">Quality:</span>
      <input type="range" id="export-quality" min="0" max="100" value="85" style="width: 60px;">
      <span id="export-quality-val" style="font-size: 11px; color: #1976d2;">85</span>
      <span style="border-left: 1px solid #ddd; height: 20px;"></span>
      <div class="color-legend">
        <span class="legend-item"><span class="color-box" id="swatch-type0"></span>T0</span>
        <span class="legend-item"><span class="color-box" id="swatch-type1"></span>T1</span>
        <span class="legend-item"><span class="color-box" id="swatch-type2"></span>T2</span>
        <span id="palette-name-display" style="font-weight: 500;"></span>
      </div>
    </div>
  </div>
</details>

<script>
Module.onRuntimeInitialized = function() {
    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);

    function getVertex(n, j) {
        return { x: n, y: slope * n + j * deltaC };
    }

    // ========================================================================
    // UNDO/REDO SYSTEM
    // ========================================================================
    class UndoStack {
        constructor() {
            this.undoStack = [];
            this.redoStack = [];
            this.maxSize = 100;
        }

        push(state) {
            this.undoStack.push(JSON.stringify(state));
            this.redoStack = [];
            if (this.undoStack.length > this.maxSize) {
                this.undoStack.shift();
            }
        }

        undo(currentState) {
            if (this.undoStack.length === 0) return null;
            this.redoStack.push(JSON.stringify(currentState));
            return JSON.parse(this.undoStack.pop());
        }

        redo(currentState) {
            if (this.redoStack.length === 0) return null;
            this.undoStack.push(JSON.stringify(currentState));
            return JSON.parse(this.redoStack.pop());
        }

        canUndo() { return this.undoStack.length > 0; }
        canRedo() { return this.redoStack.length > 0; }
        clear() { this.undoStack = []; this.redoStack = []; }
    }

    // ========================================================================
    // WASM INTERFACE
    // ========================================================================
    class UltimateLozengeSampler {
        constructor() {
            this.boundaries = [];
            this.dimers = [];
            this.blackTriangles = [];
            this.whiteTriangles = [];
            this.isValid = false;

            this.initFromTrianglesWasm = Module.cwrap('initFromTriangles', 'number', ['number', 'number']);
            this.performGlauberStepsWasm = Module.cwrap('performGlauberSteps', 'number', ['number']);
            this.exportDimersWasm = Module.cwrap('exportDimers', 'number', []);
            this.getAcceptRateWasm = Module.cwrap('getAcceptRate', 'number', []);
            this.setQBiasWasm = Module.cwrap('setQBias', null, ['number']);
            this.runCFTPWasm = Module.cwrap('runCFTP', 'number', []);
            this.initCFTPWasm = Module.cwrap('initCFTP', 'number', []);
            this.stepCFTPWasm = Module.cwrap('stepCFTP', 'number', []);
            this.finalizeCFTPWasm = Module.cwrap('finalizeCFTP', 'number', []);
            this.repairRegionWasm = Module.cwrap('repairRegion', 'number', []);
            this.freeStringWasm = Module.cwrap('freeString', null, ['number']);

            this.totalSteps = 0;
            this.flipCount = 0;
        }

        setQBias(q) { this.setQBiasWasm(q); }

        initFromTriangles(trianglesMap) {
            // Convert Map to flat array [n, j, type, n, j, type, ...]
            const arr = [];
            for (const [key, tri] of trianglesMap) {
                arr.push(tri.n, tri.j, tri.type);
            }

            if (arr.length === 0) {
                this.isValid = false;
                this.boundaries = [];
                this.dimers = [];
                this.blackTriangles = [];
                this.whiteTriangles = [];
                return { status: 'empty', blackCount: 0, whiteCount: 0 };
            }

            const dataPtr = Module._malloc(arr.length * 4);
            // Write array to WASM memory using setValue
            for (let i = 0; i < arr.length; i++) {
                Module.setValue(dataPtr + i * 4, arr[i], 'i32');
            }

            const ptr = this.initFromTrianglesWasm(dataPtr, arr.length);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            Module._free(dataPtr);

            const result = JSON.parse(jsonStr);
            this.isValid = result.status === 'valid';
            this.totalSteps = 0;
            this.flipCount = 0;

            if (this.isValid) {
                this.refreshDimers();
            } else {
                this.dimers = [];
            }

            return result;
        }

        step(numSteps) {
            const ptr = this.performGlauberStepsWasm(numSteps);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            const result = JSON.parse(jsonStr);
            this.totalSteps = result.totalSteps || 0;
            this.flipCount = result.flipCount || 0;
            this.refreshDimers();
            return result;
        }

        initCFTP() {
            const ptr = this.initCFTPWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        stepCFTP() {
            const ptr = this.stepCFTPWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        finalizeCFTP() {
            const ptr = this.finalizeCFTPWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            this.refreshDimers();
            return JSON.parse(jsonStr);
        }

        repair() {
            const ptr = this.repairRegionWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            const result = JSON.parse(jsonStr);
            this.isValid = result.status === 'valid';
            this.refreshDimers();
            return result;
        }

        refreshDimers() {
            const ptr = this.exportDimersWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            const result = JSON.parse(jsonStr);
            this.boundaries = result.boundaries || [];
            this.dimers = result.dimers;
            this.blackTriangles = result.black;
            this.whiteTriangles = result.white;
        }

        getTotalSteps() { return this.totalSteps; }
        getFlipCount() { return this.flipCount; }
        getAcceptRate() { return this.getAcceptRateWasm(); }
    }

    // ========================================================================
    // PRESET SHAPES
    // ========================================================================
    // Helper: point in polygon test (ray casting)
    function pointInPolygonPreset(x, y, polygon) {
        if (polygon.length < 3) return false;
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

    // Get triangle centroids
    function getRightTriangleCentroid(n, j) {
        const v1 = getVertex(n, j);
        const v2 = getVertex(n, j - 1);
        const v3 = getVertex(n + 1, j - 1);
        return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
    }

    function getLeftTriangleCentroid(n, j) {
        const v1 = getVertex(n, j);
        const v2 = getVertex(n + 1, j);
        const v3 = getVertex(n + 1, j - 1);
        return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
    }

    // Generate triangles inside a polygon boundary
    function generateTrianglesInPolygon(boundary) {
        const triangles = new Map();

        // Find bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of boundary) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }

        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {
                // Check black triangle (right-facing)
                const rc = getRightTriangleCentroid(n, j);
                if (pointInPolygonPreset(rc.x, rc.y, boundary)) {
                    const blackKey = `${n},${j},1`;
                    triangles.set(blackKey, { n, j, type: 1 });
                }

                // Check white triangle (left-facing)
                const lc = getLeftTriangleCentroid(n, j);
                if (pointInPolygonPreset(lc.x, lc.y, boundary)) {
                    const whiteKey = `${n},${j},2`;
                    triangles.set(whiteKey, { n, j, type: 2 });
                }
            }
        }
        return triangles;
    }

    function generateHexagon(a, b, c) {
        // Generate hexagon boundary with sides a, b, c, a, b, c
        // Directions on triangular lattice: (dn, dj) pairs
        const directions = [
            [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]
        ];
        const sideLengths = [a, b, c, a, b, c];

        const boundary = [];
        let n = 0, j = 0;

        for (let dir = 0; dir < 6; dir++) {
            const [dn, dj] = directions[dir];
            for (let step = 0; step < sideLengths[dir]; step++) {
                boundary.push(getVertex(n, j));
                n += dn;
                j += dj;
            }
        }

        return generateTrianglesInPolygon(boundary);
    }

    // Convert world coordinates to lattice (n, j) - boundary vertices are at integer lattice points
    function worldToLattice(x, y) {
        const n = Math.round(x);
        const j = Math.round((y - slope * n) / deltaC);
        return { n, j };
    }

    // Scale mesh by scaling ALL boundaries (including holes) ensuring INTEGER LATTICE alignment
    function doubleMesh(triangles) {
        if (triangles.size === 0) return new Map();

        // 1. Safety Check: We need valid boundaries from the WASM engine
        // The simulation MUST be valid (have boundaries) to be scaled.
        if (!sim.boundaries || sim.boundaries.length === 0) {
            console.warn('No valid boundary available. The shape must be valid (tilable) to be doubled.');
            return triangles;
        }

        // 2. Topology Analysis: Distinguish Outer Boundary from Holes
        // We assume the Outer Boundary is the one with the largest bounding box diagonal.
        let outerIdx = 0;
        let maxDiag = -1;

        // Convert all boundaries from World (x,y) to Lattice (n,j) integers
        const latticeBoundaries = sim.boundaries.map(b => b.map(v => worldToLattice(v.x, v.y)));

        latticeBoundaries.forEach((b, i) => {
            let mn = Infinity, mxn = -Infinity, mj = Infinity, mxj = -Infinity;
            for(const v of b) {
                mn = Math.min(mn, v.n); mxn = Math.max(mxn, v.n);
                mj = Math.min(mj, v.j); mxj = Math.max(mxj, v.j);
            }
            const diag = (mxn - mn) ** 2 + (mxj - mj) ** 2;
            if (diag > maxDiag) {
                maxDiag = diag;
                outerIdx = i;
            }
        });

        // 3. Integer Anchoring: Calculate the Scaling Origin
        // CRITICAL: We calculate the centroid, but ROUND it to the nearest integer.
        // This ensures that Integer + (Integer - Integer)*2 = Integer.
        const outerLattice = latticeBoundaries[outerIdx];
        let cenN = 0, cenJ = 0;
        for (const v of outerLattice) { cenN += v.n; cenJ += v.j; }

        const anchorN = Math.round(cenN / outerLattice.length);
        const anchorJ = Math.round(cenJ / outerLattice.length);

        // 4. Transformation: Scale all boundaries relative to the Anchor
        const scaledBoundaries = latticeBoundaries.map(b => {
             // Scale in Lattice Space, then convert to World Space for the point-in-poly check
             return b.map(v => {
                 // The scaling formula: New = Anchor + (Old - Anchor) * 2
                 const newN = anchorN + (v.n - anchorN) * 2;
                 const newJ = anchorJ + (v.j - anchorJ) * 2;
                 return getVertex(newN, newJ);
             });
        });

        const scaledOuter = scaledBoundaries[outerIdx];
        const scaledHoles = scaledBoundaries.filter((_, i) => i !== outerIdx);

        // 5. Rasterization: Fill the new geometry
        // Determine the scan range (Bounding Box of the new scaled outer boundary)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of scaledOuter) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }

        const newTriangles = new Map();

        // Add padding to ensuring we catch the jagged edges of the boundary
        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;

        // Heuristic for J range based on C++ slope constants
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {

                // --- Check Type 1 (Black/Right-Facing) ---
                const rc = getRightTriangleCentroid(n, j);
                if (pointInPolygonPreset(rc.x, rc.y, scaledOuter)) {
                    // Inclusion Logic: Must be in Outer AND NOT in any Hole
                    let inHole = false;
                    for (const hole of scaledHoles) {
                        if (pointInPolygonPreset(rc.x, rc.y, hole)) {
                            inHole = true;
                            break;
                        }
                    }
                    if (!inHole) {
                        const key = `${n},${j},1`;
                        newTriangles.set(key, { n, j, type: 1 });
                    }
                }

                // --- Check Type 2 (White/Left-Facing) ---
                const lc = getLeftTriangleCentroid(n, j);
                if (pointInPolygonPreset(lc.x, lc.y, scaledOuter)) {
                    let inHole = false;
                    for (const hole of scaledHoles) {
                        if (pointInPolygonPreset(lc.x, lc.y, hole)) {
                            inHole = true;
                            break;
                        }
                    }
                    if (!inHole) {
                        const key = `${n},${j},2`;
                        newTriangles.set(key, { n, j, type: 2 });
                    }
                }
            }
        }

        return newTriangles;
    }

    // ========================================================================
    // RENDERER
    // ========================================================================
    class LozengeRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.outlineWidthPct = 0.1;
            this.borderWidthPct = 1;
            this.showDimerView = false;
            this.currentPaletteIndex = 0;
            this.colorPermutation = 0;
            this.colorPalettes = window.ColorSchemes || [{ name: 'UVA', colors: ['#E57200', '#232D4B', '#F9DCBF', '#002D62'] }];
            this.gridSize = 100;
            // Pan and zoom state
            this.zoom = 1;
            this.panX = 0; // In world coordinates
            this.panY = 0;
            this.minZoom = 0.02;
            this.maxZoom = 10;
            this.setupCanvas();
        }

        setupCanvas() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.scale(dpr, dpr);
            this.displayWidth = rect.width;
            this.displayHeight = rect.height;
        }

        getCurrentPalette() { return this.colorPalettes[this.currentPaletteIndex]; }

        getPermutedColors() {
            const palette = this.getCurrentPalette();
            const permutations = [
                [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]
            ];
            const perm = permutations[this.colorPermutation || 0];
            return [palette.colors[perm[0]], palette.colors[perm[1]], palette.colors[perm[2]]];
        }

        toCanvas(x, y, centerX, centerY, scale) {
            return [centerX + x * scale, centerY - y * scale];
        }

        fromCanvas(cx, cy, centerX, centerY, scale) {
            const x = (cx - centerX) / scale;
            const y = (centerY - cy) / scale;
            return { x, y };
        }

        getTransform(activeTriangles) {
            // Base scale: fit a reasonable view (e.g., 20 units across)
            const baseViewSize = 20; // World units visible at zoom=1
            const baseScale = Math.min(this.displayWidth, this.displayHeight) / baseViewSize;
            const scale = baseScale * this.zoom;

            // Center position (incorporating pan)
            const centerX = this.displayWidth / 2 - this.panX * scale;
            const centerY = this.displayHeight / 2 + this.panY * scale;

            return { centerX, centerY, scale };
        }

        // Zoom centered on a point (in canvas coordinates)
        zoomAt(canvasX, canvasY, factor) {
            const { centerX, centerY, scale } = this.getTransform();

            // Convert canvas point to world coordinates before zoom
            const worldX = (canvasX - centerX) / scale;
            const worldY = (centerY - canvasY) / scale;

            // Apply zoom
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
            const actualFactor = newZoom / this.zoom;
            this.zoom = newZoom;

            // Adjust pan so the world point stays at the same canvas position
            const newScale = scale * actualFactor;
            this.panX = (this.displayWidth / 2 - canvasX) / newScale + worldX;
            this.panY = (canvasY - this.displayHeight / 2) / newScale + worldY;
        }

        // Pan by canvas delta
        pan(deltaCanvasX, deltaCanvasY) {
            const { scale } = this.getTransform();
            this.panX -= deltaCanvasX / scale;
            this.panY += deltaCanvasY / scale;
        }

        resetView() {
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
        }

        // Fit view to show all active triangles with padding
        fitToRegion(activeTriangles) {
            if (activeTriangles.size === 0) {
                this.resetView();
                return;
            }

            // Calculate bounding box in world coords
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            for (const [key, tri] of activeTriangles) {
                let verts;
                if (tri.type === 1) {
                    verts = [getVertex(tri.n, tri.j), getVertex(tri.n, tri.j - 1), getVertex(tri.n + 1, tri.j - 1)];
                } else {
                    verts = [getVertex(tri.n, tri.j), getVertex(tri.n + 1, tri.j), getVertex(tri.n + 1, tri.j - 1)];
                }
                for (const v of verts) {
                    minX = Math.min(minX, v.x);
                    maxX = Math.max(maxX, v.x);
                    minY = Math.min(minY, v.y);
                    maxY = Math.max(maxY, v.y);
                }
            }

            // Add padding
            const padding = 2;
            minX -= padding;
            maxX += padding;
            minY -= padding;
            maxY += padding;

            // Calculate center and zoom
            const centerWorldX = (minX + maxX) / 2;
            const centerWorldY = (minY + maxY) / 2;
            const rangeX = maxX - minX;
            const rangeY = maxY - minY;

            // Fit to canvas
            const baseViewSize = 20;
            const neededZoomX = this.displayWidth / rangeX / (Math.min(this.displayWidth, this.displayHeight) / baseViewSize);
            const neededZoomY = this.displayHeight / rangeY / (Math.min(this.displayWidth, this.displayHeight) / baseViewSize);
            this.zoom = Math.min(neededZoomX, neededZoomY);

            // Set pan to center the region
            this.panX = centerWorldX;
            this.panY = centerWorldY;
        }

        getLozengeVertices(dimer) {
            const { bn, bj, t } = dimer;
            if (t === 0) {
                return [getVertex(bn, bj), getVertex(bn + 1, bj), getVertex(bn + 1, bj - 1), getVertex(bn, bj - 1)];
            } else if (t === 1) {
                return [getVertex(bn, bj), getVertex(bn + 1, bj - 1), getVertex(bn + 1, bj - 2), getVertex(bn, bj - 1)];
            } else {
                return [getVertex(bn - 1, bj), getVertex(bn, bj), getVertex(bn + 1, bj - 1), getVertex(bn, bj - 1)];
            }
        }

        draw(sim, activeTriangles, isValid) {
            const ctx = this.ctx;
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

            ctx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
            ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

            const { centerX, centerY, scale } = this.getTransform(activeTriangles);

            // Draw background grid
            this.drawBackgroundGrid(ctx, centerX, centerY, scale, isDarkMode);

            // Draw active triangles (if not showing dimers or if invalid)
            if (!isValid || this.showDimerView) {
                this.drawActiveTriangles(ctx, activeTriangles, centerX, centerY, scale, isValid);
            }

            // Draw dimers/lozenges if valid
            if (isValid && sim.dimers.length > 0) {
                if (this.showDimerView) {
                    this.drawDimerView(ctx, sim, centerX, centerY, scale);
                } else {
                    this.drawLozengeView(ctx, sim, centerX, centerY, scale);
                }
            }

            // Draw all boundaries (outer + holes + disconnected)
            if (sim.boundaries && sim.boundaries.length > 0) {
                for (const boundary of sim.boundaries) {
                    this.drawBoundary(ctx, boundary, centerX, centerY, scale);
                }
            }
        }

        drawBackgroundGrid(ctx, centerX, centerY, scale, isDarkMode) {
            // Dynamically calculate visible range based on current view
            // Sample all corners and edges of canvas to find world bounds
            const corners = [
                this.fromCanvas(0, 0, centerX, centerY, scale),
                this.fromCanvas(this.displayWidth, 0, centerX, centerY, scale),
                this.fromCanvas(0, this.displayHeight, centerX, centerY, scale),
                this.fromCanvas(this.displayWidth, this.displayHeight, centerX, centerY, scale),
                this.fromCanvas(this.displayWidth / 2, 0, centerX, centerY, scale),
                this.fromCanvas(this.displayWidth / 2, this.displayHeight, centerX, centerY, scale),
                this.fromCanvas(0, this.displayHeight / 2, centerX, centerY, scale),
                this.fromCanvas(this.displayWidth, this.displayHeight / 2, centerX, centerY, scale),
            ];

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const c of corners) {
                minX = Math.min(minX, c.x);
                maxX = Math.max(maxX, c.x);
                minY = Math.min(minY, c.y);
                maxY = Math.max(maxY, c.y);
            }

            // Add generous margin that scales with view size
            const viewRange = Math.max(maxX - minX, maxY - minY);
            const margin = Math.ceil(viewRange * 0.5) + 10;

            minX -= margin;
            maxX += margin;
            minY -= margin;
            maxY += margin;

            // Calculate n and j ranges for the triangular lattice
            const minN = Math.floor(minX) - 5;
            const maxN = Math.ceil(maxX) + 5;
            const minJ = Math.floor(minY / deltaC) - Math.ceil(viewRange) - 5;
            const maxJ = Math.ceil(maxY / deltaC) + Math.ceil(viewRange) + 5;

            ctx.strokeStyle = isDarkMode ? 'rgba(100, 100, 100, 0.2)' : 'rgba(200, 200, 200, 0.5)';
            ctx.lineWidth = 0.5;

            // Vertical lines (n = const)
            for (let n = minN; n <= maxN; n++) {
                const y1 = slope * n + minJ * deltaC;
                const y2 = slope * n + maxJ * deltaC;
                const [x1c, y1c] = this.toCanvas(n, y1, centerX, centerY, scale);
                const [x2c, y2c] = this.toCanvas(n, y2, centerX, centerY, scale);
                ctx.beginPath(); ctx.moveTo(x1c, y1c); ctx.lineTo(x2c, y2c); ctx.stroke();
            }

            // +slope lines (j = const in lattice coords)
            for (let j = minJ; j <= maxJ; j++) {
                const [x1c, y1c] = this.toCanvas(minN, slope * minN + j * deltaC, centerX, centerY, scale);
                const [x2c, y2c] = this.toCanvas(maxN, slope * maxN + j * deltaC, centerX, centerY, scale);
                ctx.beginPath(); ctx.moveTo(x1c, y1c); ctx.lineTo(x2c, y2c); ctx.stroke();
            }

            // -slope lines
            for (let j = minJ; j <= maxJ; j++) {
                const [x1c, y1c] = this.toCanvas(minN, -slope * minN + j * deltaC, centerX, centerY, scale);
                const [x2c, y2c] = this.toCanvas(maxN, -slope * maxN + j * deltaC, centerX, centerY, scale);
                ctx.beginPath(); ctx.moveTo(x1c, y1c); ctx.lineTo(x2c, y2c); ctx.stroke();
            }
        }

        drawActiveTriangles(ctx, activeTriangles, centerX, centerY, scale, isValid) {
            for (const [key, tri] of activeTriangles) {
                let verts;
                if (tri.type === 1) {
                    // Black (right-facing): (n,j), (n,j-1), (n+1,j-1)
                    verts = [getVertex(tri.n, tri.j), getVertex(tri.n, tri.j - 1), getVertex(tri.n + 1, tri.j - 1)];
                } else {
                    // White (left-facing): (n,j), (n+1,j), (n+1,j-1)
                    verts = [getVertex(tri.n, tri.j), getVertex(tri.n + 1, tri.j), getVertex(tri.n + 1, tri.j - 1)];
                }

                const canvasVerts = verts.map(v => this.toCanvas(v.x, v.y, centerX, centerY, scale));

                // Color: blue for black, orange for white; red tint if invalid
                if (!isValid) {
                    ctx.fillStyle = 'rgba(200, 50, 50, 0.4)';
                } else {
                    ctx.fillStyle = tri.type === 1 ? 'rgba(50, 100, 200, 0.3)' : 'rgba(200, 150, 50, 0.3)';
                }

                ctx.beginPath();
                ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
                ctx.lineTo(canvasVerts[1][0], canvasVerts[1][1]);
                ctx.lineTo(canvasVerts[2][0], canvasVerts[2][1]);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = tri.type === 1 ? '#3366cc' : '#cc9933';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        drawLozengeView(ctx, sim, centerX, centerY, scale) {
            const colors = this.getPermutedColors();
            const dimerCount = sim.dimers.length || 1;
            const refDimerCount = 100;
            const outlineWidth = this.outlineWidthPct * (refDimerCount / dimerCount) * 0.1;

            for (const dimer of sim.dimers) {
                const verts = this.getLozengeVertices(dimer);
                const canvasVerts = verts.map(v => this.toCanvas(v.x, v.y, centerX, centerY, scale));
                ctx.fillStyle = colors[dimer.t];
                ctx.beginPath();
                ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
                for (let i = 1; i < canvasVerts.length; i++) ctx.lineTo(canvasVerts[i][0], canvasVerts[i][1]);
                ctx.closePath();
                ctx.fill();
                if (outlineWidth > 0) {
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = outlineWidth;
                    ctx.stroke();
                }
            }
        }

        drawDimerView(ctx, sim, centerX, centerY, scale) {
            // Draw dimer edges
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            for (const dimer of sim.dimers) {
                const bc = sim.blackTriangles.find(b => b.n === dimer.bn && b.j === dimer.bj);
                const wc = sim.whiteTriangles.find(w => w.n === dimer.wn && w.j === dimer.wj);
                if (bc && wc) {
                    const [bcx, bcy] = this.toCanvas(bc.cx, bc.cy, centerX, centerY, scale);
                    const [wcx, wcy] = this.toCanvas(wc.cx, wc.cy, centerX, centerY, scale);
                    ctx.beginPath(); ctx.moveTo(bcx, bcy); ctx.lineTo(wcx, wcy); ctx.stroke();
                }
            }
        }

        drawBoundary(ctx, boundary, centerX, centerY, scale) {
            if (boundary.length < 2) return;
            ctx.strokeStyle = '#000';
            // Scale border width based on percentage (similar to outline scaling)
            const borderWidth = this.borderWidthPct * scale * 0.1;
            ctx.lineWidth = Math.max(0.5, borderWidth);
            ctx.beginPath();
            const [sx, sy] = this.toCanvas(boundary[0].x, boundary[0].y, centerX, centerY, scale);
            ctx.moveTo(sx, sy);
            for (let i = 1; i < boundary.length; i++) {
                const [px, py] = this.toCanvas(boundary[i].x, boundary[i].y, centerX, centerY, scale);
                ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        setPalette(index) {
            this.currentPaletteIndex = ((index % this.colorPalettes.length) + this.colorPalettes.length) % this.colorPalettes.length;
            this.colorPermutation = 0;
            this.updateLegend();
        }

        nextPalette() { this.setPalette(this.currentPaletteIndex + 1); }
        prevPalette() { this.setPalette(this.currentPaletteIndex - 1); }

        permuteColors() {
            this.colorPermutation = ((this.colorPermutation || 0) + 1) % 6;
            this.updateLegend();
        }

        updateLegend() {
            const colors = this.getPermutedColors();
            const palette = this.getCurrentPalette();
            document.getElementById('swatch-type0').style.backgroundColor = colors[0];
            document.getElementById('swatch-type1').style.backgroundColor = colors[1];
            document.getElementById('swatch-type2').style.backgroundColor = colors[2];
            document.getElementById('palette-name-display').textContent = palette.name;
        }
    }

    // ========================================================================
    // MAIN APPLICATION
    // ========================================================================
    const canvas = document.getElementById('lozenge-canvas');
    const sim = new UltimateLozengeSampler();
    const renderer = new LozengeRenderer(canvas);
    const undoStack = new UndoStack();

    let activeTriangles = new Map();
    let isDrawing = false;
    let currentTool = 'draw';
    let running = false;
    let stepsPerSecond = 100;
    let animationId = null;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let currentFps = 0;
    let isValid = false;

    const el = {
        drawBtn: document.getElementById('drawBtn'),
        eraseBtn: document.getElementById('eraseBtn'),
        resetBtn: document.getElementById('resetBtn'),
        undoBtn: document.getElementById('undoBtn'),
        redoBtn: document.getElementById('redoBtn'),
        statusBadge: document.getElementById('statusBadge'),
        hexagonBtn: document.getElementById('hexagonBtn'),
        hexAInput: document.getElementById('hexAInput'),
        hexBInput: document.getElementById('hexBInput'),
        hexCInput: document.getElementById('hexCInput'),
        lozengeViewBtn: document.getElementById('lozengeViewBtn'),
        dimerViewBtn: document.getElementById('dimerViewBtn'),
        paletteSelect: document.getElementById('palette-select'),
        outlineWidthPct: document.getElementById('outlineWidthPct'),
        speedSlider: document.getElementById('speedSlider'),
        speedInput: document.getElementById('speedInput'),
        startStopBtn: document.getElementById('startStopBtn'),
        cftpBtn: document.getElementById('cftpBtn'),
        repairBtn: document.getElementById('repairBtn'),
        qInput: document.getElementById('qInput'),
        blackCount: document.getElementById('blackCount'),
        whiteCount: document.getElementById('whiteCount'),
        dimerCount: document.getElementById('dimerCount'),
        stepCount: document.getElementById('stepCount'),
        volume: document.getElementById('volume'),
        cftpSteps: document.getElementById('cftpSteps'),
    };

    function initPaletteSelector() {
        renderer.colorPalettes.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.name;
            el.paletteSelect.appendChild(opt);
        });
        el.paletteSelect.value = renderer.currentPaletteIndex;
        renderer.updateLegend();
    }

    function formatNumber(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toString();
    }

    function updateUI() {
        // Count triangles
        let blackCount = 0, whiteCount = 0;
        for (const [key, tri] of activeTriangles) {
            if (tri.type === 1) blackCount++;
            else whiteCount++;
        }

        el.blackCount.textContent = blackCount;
        el.whiteCount.textContent = whiteCount;
        el.dimerCount.textContent = isValid ? sim.dimers.length : 0;
        el.stepCount.textContent = formatNumber(sim.getTotalSteps());

        // Status badge
        if (activeTriangles.size === 0) {
            el.statusBadge.textContent = 'Empty';
            el.statusBadge.className = 'status-empty';
        } else if (isValid) {
            el.statusBadge.textContent = 'Valid';
            el.statusBadge.className = 'status-valid';
        } else {
            el.statusBadge.textContent = 'Invalid';
            el.statusBadge.className = 'status-invalid';
        }

        // Enable/disable simulation buttons
        el.startStopBtn.disabled = !isValid;
        el.cftpBtn.disabled = !isValid;

        // Enable repair button only if Invalid and Not Empty
        el.repairBtn.disabled = isValid || activeTriangles.size === 0;
    }

    function draw() {
        renderer.draw(sim, activeTriangles, isValid);
    }

    // Track if simulation should auto-restart when shape becomes valid
    let wasRunningBeforeInvalid = false;

    function reinitialize() {
        const wasRunning = running;

        // Stop animation loop temporarily
        if (animationId) {
            cancelAnimationFrame(animationId);
            clearTimeout(animationId);
            animationId = null;
        }

        const result = sim.initFromTriangles(activeTriangles);
        const wasValid = isValid;
        isValid = result.status === 'valid';

        if (result.volume !== undefined) {
            el.volume.textContent = formatNumber(result.volume);
        }

        // Track if we should auto-restart when valid again
        if (wasRunning && !isValid) {
            wasRunningBeforeInvalid = true;
            running = false;
            el.startStopBtn.textContent = 'Start';
            el.startStopBtn.classList.remove('running');
        }

        // Auto-restart if shape became valid and we were running before
        if (isValid && wasRunningBeforeInvalid) {
            wasRunningBeforeInvalid = false;
            running = true;
            el.startStopBtn.textContent = 'Stop';
            el.startStopBtn.classList.add('running');
            lastFrameTime = performance.now();
            frameCount = 0;
            loop();
        } else if (isValid && wasRunning) {
            // Continue running if still valid
            running = true;
            loop();
        }

        updateUI();
        draw();
    }

    function saveState() {
        const state = [];
        for (const [key, tri] of activeTriangles) {
            state.push({ n: tri.n, j: tri.j, type: tri.type });
        }
        undoStack.push(state);
    }

    function loadState(state) {
        activeTriangles.clear();
        for (const tri of state) {
            const key = `${tri.n},${tri.j},${tri.type}`;
            activeTriangles.set(key, { n: tri.n, j: tri.j, type: tri.type });
        }
        reinitialize();
    }

    // ========================================================================
    // MOUSE/TOUCH INTERACTION
    // ========================================================================
    let isPanning = false;
    let lastPanX = 0;
    let lastPanY = 0;

    // Helper: Check which triangle contains world point (x,y)
    // Returns {n, j, type} or null
    function getTriangleFromWorld(x, y) {
        // Convert world coords to lattice basis guess
        const n = Math.floor(x);
        const j = Math.floor((y - slope * n) / deltaC);

        // Check neighborhood candidates (n,j) for exact inclusion
        // We check a 1-ring around the estimate to be safe
        const candidates = [
            { n, j }, { n, j: j + 1 }, { n: n + 1, j }, { n: n - 1, j },
            { n, j: j - 1 }, { n: n + 1, j: j - 1 }, { n: n - 1, j: j + 1 }
        ];

        for (const { n: cn, j: cj } of candidates) {
            // Check Black (Type 1)
            const v1 = getVertex(cn, cj);
            const v2 = getVertex(cn, cj - 1);
            const v3 = getVertex(cn + 1, cj - 1);
            if (pointInTriangle(x, y, v1, v2, v3)) return { n: cn, j: cj, type: 1 };

            // Check White (Type 2)
            const w1 = getVertex(cn, cj);
            const w2 = getVertex(cn + 1, cj);
            const w3 = getVertex(cn + 1, cj - 1);
            if (pointInTriangle(x, y, w1, w2, w3)) return { n: cn, j: cj, type: 2 };
        }
        return null;
    }

    // Refactored mouse handler to use the helper
    function getTriangleAtPoint(mx, my) {
        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
        const { x, y } = renderer.fromCanvas(mx, my, centerX, centerY, scale);
        return getTriangleFromWorld(x, y);
    }

    function pointInTriangle(px, py, v1, v2, v3) {
        const d1 = sign(px, py, v1.x, v1.y, v2.x, v2.y);
        const d2 = sign(px, py, v2.x, v2.y, v3.x, v3.y);
        const d3 = sign(px, py, v3.x, v3.y, v1.x, v1.y);
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        return !(hasNeg && hasPos);
    }

    function sign(px, py, x1, y1, x2, y2) {
        return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    }

    function handleDraw(tri) {
        // Add the specific triangle that was clicked
        const key = `${tri.n},${tri.j},${tri.type}`;
        if (!activeTriangles.has(key)) {
            activeTriangles.set(key, { n: tri.n, j: tri.j, type: tri.type });
            return true;
        }
        return false;
    }

    function handleErase(tri) {
        // Remove the specific triangle that was clicked
        const key = `${tri.n},${tri.j},${tri.type}`;
        if (activeTriangles.has(key)) {
            activeTriangles.delete(key);
            return true;
        }
        return false;
    }

    function handleInput(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX || e.touches[0].clientX) - rect.left;
        const my = (e.clientY || e.touches[0].clientY) - rect.top;

        const tri = getTriangleAtPoint(mx, my);
        if (!tri) return;

        let changed = false;
        const tool = getEffectiveTool();
        if (tool === 'draw') {
            changed = handleDraw(tri);
        } else {
            changed = handleErase(tri);
        }

        if (changed) {
            reinitialize();
        }
    }

    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        renderer.zoomAt(mx, my, zoomFactor);
        draw();
    }, { passive: false });

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Track if cmd/meta is held for temporary tool switch
    let cmdHeld = false;

    document.addEventListener('keydown', (e) => {
        if (e.metaKey || e.ctrlKey) cmdHeld = true;
    });
    document.addEventListener('keyup', (e) => {
        if (!e.metaKey && !e.ctrlKey) cmdHeld = false;
    });

    function getEffectiveTool() {
        // Cmd-hold temporarily switches draw<->erase
        if (cmdHeld) {
            return currentTool === 'draw' ? 'erase' : 'draw';
        }
        return currentTool;
    }

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Right-click or middle-click = pan
        if (e.button === 2 || e.button === 1) {
            isPanning = true;
            lastPanX = mx;
            lastPanY = my;
            canvas.classList.add('panning');
            return;
        }

        // Left-click = draw/erase
        isDrawing = true;
        saveState();
        handleInput(e);
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (isPanning) {
            const dx = mx - lastPanX;
            const dy = my - lastPanY;
            renderer.pan(dx, dy);
            lastPanX = mx;
            lastPanY = my;
            draw();
            return;
        }

        if (isDrawing) handleInput(e);
    });

    canvas.addEventListener('mouseup', (e) => {
        isDrawing = false;
        isPanning = false;
        canvas.classList.remove('panning');
    });

    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
        isPanning = false;
        canvas.classList.remove('panning');
    });

    // Touch: two-finger pinch to zoom, single finger to draw
    let touchStartDist = 0;
    let touchStartZoom = 1;

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            // Two-finger: start pinch zoom
            const t1 = e.touches[0], t2 = e.touches[1];
            touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            touchStartZoom = renderer.zoom;
            isPanning = true;
            lastPanX = (t1.clientX + t2.clientX) / 2;
            lastPanY = (t1.clientY + t2.clientY) / 2;
        } else {
            isDrawing = true;
            saveState();
            handleInput(e);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();

        if (e.touches.length === 2) {
            const t1 = e.touches[0], t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
            const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

            // Pinch zoom
            if (touchStartDist > 0) {
                const newZoom = touchStartZoom * (dist / touchStartDist);
                renderer.zoom = Math.max(renderer.minZoom, Math.min(renderer.maxZoom, newZoom));
            }

            // Pan with midpoint
            const rawMidX = (t1.clientX + t2.clientX) / 2;
            const rawMidY = (t1.clientY + t2.clientY) / 2;
            if (isPanning) {
                const dx = rawMidX - lastPanX;
                const dy = rawMidY - lastPanY;
                renderer.pan(dx, dy);
            }
            lastPanX = rawMidX;
            lastPanY = rawMidY;
            draw();
            return;
        }

        if (isDrawing) handleInput(e);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            isDrawing = false;
            isPanning = false;
            touchStartDist = 0;
        } else if (e.touches.length === 1) {
            // Switched from two-finger to one
            isPanning = false;
            touchStartDist = 0;
        }
    });

    // ========================================================================
    // UI EVENT HANDLERS
    // ========================================================================
    el.drawBtn.addEventListener('click', () => {
        currentTool = 'draw';
        el.drawBtn.classList.add('active');
        el.eraseBtn.classList.remove('active');
    });

    el.eraseBtn.addEventListener('click', () => {
        currentTool = 'erase';
        el.eraseBtn.classList.add('active');
        el.drawBtn.classList.remove('active');
    });

    el.resetBtn.addEventListener('click', () => {
        saveState();
        activeTriangles.clear();
        reinitialize();
    });

    el.undoBtn.addEventListener('click', () => {
        const state = undoStack.undo(Array.from(activeTriangles.values()));
        if (state) loadState(state);
    });

    el.redoBtn.addEventListener('click', () => {
        const state = undoStack.redo(Array.from(activeTriangles.values()));
        if (state) loadState(state);
    });

    document.getElementById('doubleMeshBtn').addEventListener('click', () => {
        if (activeTriangles.size === 0) return;
        saveState();
        activeTriangles = doubleMesh(activeTriangles);
        reinitialize();
        renderer.fitToRegion(activeTriangles);
        draw();
    });

    el.repairBtn.addEventListener('click', () => {
        saveState();
        const result = sim.repair();

        // Update activeTriangles based on the C++ result
        activeTriangles.clear();

        // Rebuild from sim properties updated by refreshDimers inside repair
        for (const t of sim.blackTriangles) {
            activeTriangles.set(`${t.n},${t.j},1`, { n: t.n, j: t.j, type: 1 });
        }
        for (const t of sim.whiteTriangles) {
            activeTriangles.set(`${t.n},${t.j},2`, { n: t.n, j: t.j, type: 2 });
        }

        isValid = result.status === 'valid';
        updateUI();
        draw();
    });

    document.getElementById('redoBoundaryBtn').addEventListener('click', () => {
        if (activeTriangles.size === 0) return;
        reinitialize();
        draw();
    });

    // Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', () => {
        renderer.zoomAt(renderer.displayWidth / 2, renderer.displayHeight / 2, 1.3);
        draw();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        renderer.zoomAt(renderer.displayWidth / 2, renderer.displayHeight / 2, 0.7);
        draw();
    });

    document.getElementById('resetViewBtn').addEventListener('click', () => {
        renderer.resetView();
        draw();
    });

    // Pan controls
    const panAmount = 50; // pixels
    document.getElementById('panLeftBtn').addEventListener('click', () => {
        renderer.pan(panAmount, 0);
        draw();
    });
    document.getElementById('panRightBtn').addEventListener('click', () => {
        renderer.pan(-panAmount, 0);
        draw();
    });
    document.getElementById('panUpBtn').addEventListener('click', () => {
        renderer.pan(0, panAmount);
        draw();
    });
    document.getElementById('panDownBtn').addEventListener('click', () => {
        renderer.pan(0, -panAmount);
        draw();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            el.undoBtn.click();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
            e.preventDefault();
            el.redoBtn.click();
        }
    });

    // Preset buttons
    el.hexagonBtn.addEventListener('click', () => {
        saveState();
        const a = parseInt(el.hexAInput.value) || 4;
        const b = parseInt(el.hexBInput.value) || 3;
        const c = parseInt(el.hexCInput.value) || 5;
        activeTriangles = generateHexagon(a, b, c);
        reinitialize();
    });

    // View toggle
    el.lozengeViewBtn.addEventListener('click', () => {
        renderer.showDimerView = false;
        el.lozengeViewBtn.classList.add('active');
        el.dimerViewBtn.classList.remove('active');
        draw();
    });

    el.dimerViewBtn.addEventListener('click', () => {
        renderer.showDimerView = true;
        el.dimerViewBtn.classList.add('active');
        el.lozengeViewBtn.classList.remove('active');
        draw();
    });

    // Palette
    el.paletteSelect.addEventListener('change', (e) => {
        renderer.setPalette(parseInt(e.target.value));
        draw();
    });

    document.getElementById('prev-palette').addEventListener('click', () => {
        renderer.prevPalette();
        el.paletteSelect.value = renderer.currentPaletteIndex;
        draw();
    });

    document.getElementById('next-palette').addEventListener('click', () => {
        renderer.nextPalette();
        el.paletteSelect.value = renderer.currentPaletteIndex;
        draw();
    });

    document.getElementById('permuteColors').addEventListener('click', () => {
        renderer.permuteColors();
        draw();
    });

    el.outlineWidthPct.addEventListener('input', (e) => {
        renderer.outlineWidthPct = parseFloat(e.target.value) || 0;
        draw();
    });

    document.getElementById('borderWidthPct').addEventListener('input', (e) => {
        renderer.borderWidthPct = parseFloat(e.target.value) || 0;
        draw();
    });

    // Simulation controls - logarithmic slider with synchronized input
    // Slider 0-100 maps to speed 1 - 100,000,000 (logarithmic)
    function sliderToSpeed(sliderVal) {
        // 0 -> 1, 100 -> 100M (10^8)
        return Math.round(Math.pow(10, sliderVal * 0.08));
    }

    function speedToSlider(speed) {
        // Inverse: log10(speed) / 0.08
        if (speed <= 1) return 0;
        return Math.round(Math.log10(speed) / 0.08);
    }

    function updateSpeedFromSlider(sliderVal) {
        stepsPerSecond = sliderToSpeed(sliderVal);
        el.speedSlider.value = sliderVal;
        el.speedInput.value = stepsPerSecond;
    }

    function updateSpeedFromInput(speed) {
        stepsPerSecond = Math.max(1, Math.min(100000000, parseInt(speed) || 100));
        el.speedInput.value = stepsPerSecond;
        el.speedSlider.value = speedToSlider(stepsPerSecond);
    }

    el.speedSlider.addEventListener('input', (e) => updateSpeedFromSlider(parseInt(e.target.value)));
    el.speedInput.addEventListener('input', (e) => updateSpeedFromInput(e.target.value));

    el.qInput.addEventListener('change', (e) => {
        const q = parseFloat(e.target.value) || 1;
        e.target.value = Math.max(0, Math.min(10, q));
        sim.setQBias(parseFloat(e.target.value));
    });

    function loop() {
        if (!running) return;
        const now = performance.now();
        frameCount++;
        if (now - lastFrameTime >= 1000) {
            currentFps = frameCount * 1000 / (now - lastFrameTime);
            frameCount = 0;
            lastFrameTime = now;
        }

        const stepsPerFrame = stepsPerSecond <= 60 ? 1 : Math.ceil(stepsPerSecond / 60);
        const result = sim.step(stepsPerFrame);
        draw();
        el.stepCount.textContent = formatNumber(sim.getTotalSteps());
        if (result.volume !== undefined) el.volume.textContent = formatNumber(result.volume);

        if (running) {
            if (stepsPerSecond <= 60) {
                animationId = setTimeout(() => requestAnimationFrame(loop), 1000 / stepsPerSecond);
            } else {
                animationId = requestAnimationFrame(loop);
            }
        }
    }

    el.startStopBtn.addEventListener('click', () => {
        if (!isValid) return;
        running = !running;
        el.startStopBtn.textContent = running ? 'Stop' : 'Start';
        el.startStopBtn.classList.toggle('running', running);
        if (running) {
            lastFrameTime = performance.now();
            frameCount = 0;
            loop();
        } else {
            if (animationId) {
                cancelAnimationFrame(animationId);
                clearTimeout(animationId);
                animationId = null;
            }
        }
    });

    el.cftpBtn.addEventListener('click', () => {
        if (!isValid) return;
        if (running) {
            running = false;
            el.startStopBtn.textContent = 'Start';
            el.startStopBtn.classList.remove('running');
            if (animationId) {
                cancelAnimationFrame(animationId);
                clearTimeout(animationId);
                animationId = null;
            }
        }

        const originalText = el.cftpBtn.textContent;
        el.cftpBtn.disabled = true;
        el.cftpBtn.textContent = 'Init...';
        el.cftpSteps.textContent = 'init';

        setTimeout(() => {
            sim.initCFTP();

            function cftpStep() {
                const res = sim.stepCFTP();
                if (res.status === 'in_progress') {
                    el.cftpSteps.textContent = 'T=' + res.T + ' @' + res.step;
                    el.cftpBtn.textContent = res.T + ':' + res.step;
                    setTimeout(cftpStep, 0);
                } else if (res.status === 'coalesced') {
                    const finalRes = sim.finalizeCFTP();
                    draw();
                    el.cftpSteps.textContent = res.T;
                    if (finalRes.volume !== undefined) el.volume.textContent = formatNumber(finalRes.volume);
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                } else if (res.status === 'timeout') {
                    el.cftpSteps.textContent = 'timeout';
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                } else if (res.status === 'not_coalesced') {
                    el.cftpSteps.textContent = 'T=' + res.T;
                    el.cftpBtn.textContent = 'T=' + res.T;
                    setTimeout(cftpStep, 0);
                } else {
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                }
            }

            setTimeout(cftpStep, 0);
        }, 10);
    });

    // Export
    document.getElementById('export-quality').addEventListener('input', (e) => {
        document.getElementById('export-quality-val').textContent = e.target.value;
    });

    function getExportScale() {
        return 1 + (parseInt(document.getElementById('export-quality').value) / 100) * 3;
    }

    function createExportCanvas() {
        const baseWidth = 900, baseHeight = 600, scale = getExportScale();
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = baseWidth * scale;
        exportCanvas.height = baseHeight * scale;
        const exportCtx = exportCanvas.getContext('2d');
        exportCtx.scale(scale, scale);
        const origCtx = renderer.ctx, origW = renderer.displayWidth, origH = renderer.displayHeight;
        renderer.ctx = exportCtx;
        renderer.displayWidth = baseWidth;
        renderer.displayHeight = baseHeight;
        renderer.draw(sim, activeTriangles, isValid);
        renderer.ctx = origCtx;
        renderer.displayWidth = origW;
        renderer.displayHeight = origH;
        return exportCanvas;
    }

    document.getElementById('export-png').addEventListener('click', () => {
        createExportCanvas().toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'ultimate_lozenge.png';
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    });

    document.getElementById('export-pdf').addEventListener('click', () => {
        if (!window.jspdf) {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            s.onload = exportPDF;
            document.head.appendChild(s);
        } else {
            exportPDF();
        }

        function exportPDF() {
            const exportCanvas = createExportCanvas();
            const imgData = exportCanvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: exportCanvas.width > exportCanvas.height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [exportCanvas.width, exportCanvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, exportCanvas.width, exportCanvas.height);
            pdf.save('ultimate_lozenge.pdf');
        }
    });

    // Initialize
    window.addEventListener('resize', () => {
        renderer.setupCanvas();
        draw();
    });

    initPaletteSelector();
    updateUI();
    draw();

    console.log('Ultimate Lozenge Tiling ready (WASM with Dinic\'s Algorithm)');
};
</script>
