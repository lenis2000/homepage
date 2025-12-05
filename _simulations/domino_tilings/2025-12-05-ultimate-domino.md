---
title: Ultimate Domino Tiling Generator - Draw Any Region
model: domino-tilings
permalink: domino-draw/
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-05-ultimate-domino.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-05-ultimate-domino.cpp'
    txt: 'C++ code for the simulation (compiled to WebAssembly)'
---

<details id="about-simulation-details">
<summary>About this simulation</summary>
<div class="content" style="padding: 16px; background: white; border-top: 1px solid #e0e0e0;">

<p>This simulator generates <strong>random domino tilings</strong> of arbitrary regions on the square lattice using <strong>uniform</strong> distribution.</p>

<p><strong>How to use:</strong></p>
<ul>
  <li><strong>Draw mode</strong>: Click or drag on the grid to add cells to your region</li>
  <li><strong>Erase mode</strong>: Remove cells from your region</li>
  <li><strong>Rectangle preset</strong>: Quickly generate a rectangular region</li>
  <li><strong>Aztec Diamond preset</strong>: Generate the classic Aztec diamond shape</li>
  <li><strong>Scale Up/Down</strong>: Double or halve the size of your current region</li>
  <li><strong>Make Tileable</strong>: If your region is invalid, this adds cells to make it tileable</li>
</ul>

<p>A region is <strong>tileable</strong> (valid) if and only if it has equal numbers of black and white cells AND a perfect matching exists. The simulator uses <strong>Hopcroft-Karp algorithm</strong> to find a perfect matching.</p>

<p><strong>Sampling methods:</strong></p>
<ul>
  <li><strong>Glauber dynamics</strong> (Start/Stop): Markov chain Monte Carlo that performs local 2x2 plaquette flips. Converges to the uniform distribution over time.</li>
  <li><strong>Perfect Sample (CFTP)</strong>: <strong>Coupling From The Past</strong> algorithm that produces an <em>exact</em> sample from the uniform distribution using height function monotone coupling.</li>
</ul>

<p><strong>Drawing & Editing Tools:</strong></p>
<ul>
  <li><strong>Lasso Selection</strong>: Click multiple points to define a polygon, then fill or erase.</li>
  <li><strong>Undo/Redo</strong>: Full history support for shape modifications.</li>
</ul>

<p><strong>Color Scheme:</strong> Four colors for four domino types based on orientation (horizontal/vertical) and starting cell color (black/white).</p>

<p><em>Future features (greyed out)</em>: 3D height function view, periodic weights, GPU acceleration, multi-threading.</p>

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
  #domino-canvas {
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
  #domino-canvas.panning {
    cursor: grab;
  }
  #domino-canvas.panning:active {
    cursor: grabbing;
  }
  [data-theme="dark"] #domino-canvas {
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
  .control-group button:disabled:hover {
    background: #e0e0e0;
    border-color: #ccc;
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
    background: #a5d6a7;
    border-color: #a5d6a7;
    color: white;
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
  .tool-btn {
    width: 36px;
    height: 30px;
    padding: 0;
    font-size: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .tool-btn.active {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
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
  .greyed-out {
    opacity: 0.4;
    pointer-events: none;
  }
  .greyed-out * {
    cursor: not-allowed !important;
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
  [data-theme="dark"] .control-group {
    background-color: #2d2d2d;
    border-color: #444;
  }
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
  [data-theme="dark"] .control-group button:disabled {
    background-color: #2a2a2a;
    border-color: #444;
    color: #666;
  }
  [data-theme="dark"] .status-valid { background: #1b5e20; color: #a5d6a7; }
  [data-theme="dark"] .status-invalid { background: #b71c1c; color: #ffcdd2; }
  [data-theme="dark"] .status-empty { background: #e65100; color: #ffe0b2; }
  details summary {
    cursor: pointer;
    padding: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    font-weight: 500;
  }
  details .content {
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-top: none;
    border-radius: 0 0 4px 4px;
  }
</style>

<!-- Main controls -->
<div style="max-width: 900px; margin: 0 auto; padding: 8px;">

<!-- Preset Shapes -->
<div class="control-group">
  <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
    <button id="rectangleBtn">Rectangle</button>
    <span class="param-group"><span class="param-label">W</span><input type="number" class="param-input" id="rectWidthInput" value="8" min="2" max="100"></span>
    <span class="param-group"><span class="param-label">H</span><input type="number" class="param-input" id="rectHeightInput" value="6" min="2" max="100"></span>
    <button id="aztecBtn">Aztec Diamond</button>
    <span class="param-group"><span class="param-label">n</span><input type="number" class="param-input" id="aztecNInput" value="4" min="1" max="50"></span>
  </div>
</div>

<!-- Simulation Controls -->
<div class="control-group">
  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
    <button id="startStopBtn" class="primary" disabled>Start Glauber</button>
    <button id="cftpBtn" class="cftp" title="Coupling From The Past - Perfect Sample" disabled>Perfect Sample</button>
    <button id="cftpStopBtn" style="display: none; background: #dc3545; color: white; border-color: #dc3545;">Stop CFTP</button>
    <button id="scaleUpBtn" title="Double the region size">Scale Up Region</button>
    <button id="scaleDownBtn" title="Halve the region size">Scale Down Region</button>
    <div style="display: flex; align-items: center; gap: 6px;">
      <span style="font-size: 12px; color: #666;">Speed</span>
      <input type="range" id="speedSlider" min="0" max="100" value="29" style="width: 100px;">
      <input type="number" id="speedInput" class="param-input" value="100" min="1" max="100000000" style="width: 80px;">
      <span style="font-size: 11px; color: #888;">/s</span>
    </div>
  </div>
</div>

<!-- Future: Periodic Weights (greyed out) -->
<details id="periodic-weights-details" class="greyed-out">
<summary>Periodic Weights (coming soon)</summary>
<div class="content">
  <p style="font-size: 12px; color: #888;">Periodic q-weighting will be available in a future update.</p>
</div>
</details>

<!-- Stats Row -->
<div class="control-group">
  <div class="stats-inline">
    <div class="stat"><span class="stat-label">Vertices</span><span class="stat-value" id="cellsCount">0</span></div>
    <div class="stat"><span class="stat-label">Dominoes</span><span class="stat-value" id="dominoesCount">0</span></div>
    <div class="stat"><span class="stat-label">Steps</span><span class="stat-value" id="stepsCount">0</span></div>
    <div class="stat"><span class="stat-label">Flips</span><span class="stat-value" id="flipsCount">0</span></div>
    <div class="stat" id="cftpStatus" style="display: none;"><span class="stat-label">CFTP</span><span class="stat-value" id="cftpEpochs">0</span></div>
  </div>
</div>

</div>

<!-- Canvas -->
<canvas id="domino-canvas"></canvas>

<!-- Controls below canvas -->
<div style="max-width: 900px; margin: 0 auto; padding: 8px;">

<!-- Drawing Tools -->
<div class="control-group">
  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
    <button id="handTool" class="tool-btn" title="Pan (drag to move view)">&#x1F91A;</button>
    <button id="drawTool" class="tool-btn active" title="Draw cells">&#x270F;&#xFE0F;</button>
    <button id="eraseTool" class="tool-btn" title="Erase cells">&#x1F9F9;</button>
    <span style="color: #ccc;">|</span>
    <button id="lassoFillTool" class="tool-btn" title="Lasso fill">&#x2B55;+</button>
    <button id="lassoEraseTool" class="tool-btn" title="Lasso erase">&#x2B55;-</button>
    <span style="color: #ccc;">|</span>
    <button id="clearBtn">Clear</button>
    <button id="undoBtn" title="Undo (Ctrl+Z)">Undo</button>
    <button id="redoBtn" title="Redo (Ctrl+Y)">Redo</button>
    <button id="repairBtn" title="Add cells to make region tileable" disabled>Make Tileable</button>
    <span id="statusBadge" class="status-empty">Empty</span>
  </div>
</div>

<!-- View Controls -->
<div class="control-group">
  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
    <button id="zoomInBtn">+</button>
    <button id="zoomOutBtn">−</button>
    <button id="resetViewBtn">Reset View</button>
    <label style="font-size: 12px; display: flex; align-items: center; gap: 4px;">
      <input type="checkbox" id="showGridCheckbox" checked>
      Grid
    </label>
    <!-- Future: 3D view (greyed out) -->
    <span class="greyed-out" style="font-size: 12px; display: flex; align-items: center; gap: 4px;">
      <input type="checkbox" id="show3DCheckbox" disabled>
      3D View (coming soon)
    </span>
  </div>
</div>

<!-- Display Options -->
<div class="control-group">
  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
    <div style="display: flex; align-items: center; gap: 4px;">
      <button id="prevPaletteBtn" style="padding: 0 8px;">&#9664;</button>
      <select id="paletteSelect" style="padding: 4px 8px; font-size: 12px; min-width: 120px;"></select>
      <button id="nextPaletteBtn" style="padding: 0 8px;">&#9654;</button>
    </div>
    <button id="permuteColorsBtn">Permute</button>
    <div style="display: flex; align-items: center; gap: 4px;">
      <span style="font-size: 12px; color: #555;">Border:</span>
      <input type="number" id="borderSlider" value="1" min="0" max="5" step="0.5" class="param-input" style="width: 50px;">
    </div>
  </div>
</div>

<!-- Export -->
<div class="control-group">
  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
    <button id="exportPngBtn">PNG</button>
    <span style="font-size: 11px; color: #666;">Quality:</span>
    <input type="range" id="qualitySlider" min="1" max="4" value="2" style="width: 60px;">
    <button id="exportJsonBtn">Export Shape</button>
    <button id="importJsonBtn">Import Shape</button>
    <input type="file" id="importJsonInput" accept=".json" style="display: none;">
  </div>
</div>

</div>

<!-- Load ColorSchemes -->
<script src="/js/colorschemes.js"></script>

<!-- Load WASM Module -->
<script src="/js/2025-12-05-ultimate-domino.js"></script>

<script>
(function() {
    'use strict';

    // ========================================================================
    // State
    // ========================================================================

    const activeCells = new Map();  // key: "x,y" -> {x, y}
    let isValid = false;
    let dominoes = [];
    let totalSteps = 0;
    let flipCount = 0;

    // View state
    let zoom = 1.0;
    let panX = 0, panY = 0;
    let cellSize = 30;

    // Drawing state
    let currentTool = 'draw';
    let isDrawing = false;
    let isPanning = false;
    let lastPanX = 0, lastPanY = 0;
    let lassoPoints = [];
    let isLassoing = false;

    // Undo/Redo
    const undoStack = [];
    const redoStack = [];
    const MAX_UNDO = 50;

    // Animation
    let animationId = null;
    let isRunning = false;
    let stepsPerSecond = 100;

    // CFTP
    let isCFTPRunning = false;
    let cftpEpochs = 0;

    // Colors
    let colorPaletteIndex = 0;
    let colorPermutation = 0;
    const colorPalettes = window.ColorSchemes || [
        { name: 'Domino Default', colors: ['#FFCD00', '#228B22', '#0057B7', '#DC143C'] }
    ];

    // Find Domino Default palette
    for (let i = 0; i < colorPalettes.length; i++) {
        if (colorPalettes[i].name === 'Domino Default') {
            colorPaletteIndex = i;
            break;
        }
    }

    // ========================================================================
    // DOM Elements
    // ========================================================================

    const canvas = document.getElementById('domino-canvas');
    const ctx = canvas.getContext('2d');

    const el = {
        rectangleBtn: document.getElementById('rectangleBtn'),
        rectWidthInput: document.getElementById('rectWidthInput'),
        rectHeightInput: document.getElementById('rectHeightInput'),
        aztecBtn: document.getElementById('aztecBtn'),
        aztecNInput: document.getElementById('aztecNInput'),
        startStopBtn: document.getElementById('startStopBtn'),
        cftpBtn: document.getElementById('cftpBtn'),
        cftpStopBtn: document.getElementById('cftpStopBtn'),
        scaleUpBtn: document.getElementById('scaleUpBtn'),
        scaleDownBtn: document.getElementById('scaleDownBtn'),
        speedSlider: document.getElementById('speedSlider'),
        speedInput: document.getElementById('speedInput'),
        cellsCount: document.getElementById('cellsCount'),
        dominoesCount: document.getElementById('dominoesCount'),
        stepsCount: document.getElementById('stepsCount'),
        flipsCount: document.getElementById('flipsCount'),
        cftpStatus: document.getElementById('cftpStatus'),
        cftpEpochs: document.getElementById('cftpEpochs'),
        handTool: document.getElementById('handTool'),
        drawTool: document.getElementById('drawTool'),
        eraseTool: document.getElementById('eraseTool'),
        lassoFillTool: document.getElementById('lassoFillTool'),
        lassoEraseTool: document.getElementById('lassoEraseTool'),
        clearBtn: document.getElementById('clearBtn'),
        undoBtn: document.getElementById('undoBtn'),
        redoBtn: document.getElementById('redoBtn'),
        repairBtn: document.getElementById('repairBtn'),
        statusBadge: document.getElementById('statusBadge'),
        zoomInBtn: document.getElementById('zoomInBtn'),
        zoomOutBtn: document.getElementById('zoomOutBtn'),
        resetViewBtn: document.getElementById('resetViewBtn'),
        showGridCheckbox: document.getElementById('showGridCheckbox'),
        paletteSelect: document.getElementById('paletteSelect'),
        prevPaletteBtn: document.getElementById('prevPaletteBtn'),
        nextPaletteBtn: document.getElementById('nextPaletteBtn'),
        permuteColorsBtn: document.getElementById('permuteColorsBtn'),
        borderSlider: document.getElementById('borderSlider'),
        exportPngBtn: document.getElementById('exportPngBtn'),
        qualitySlider: document.getElementById('qualitySlider'),
        exportJsonBtn: document.getElementById('exportJsonBtn'),
        importJsonBtn: document.getElementById('importJsonBtn'),
        importJsonInput: document.getElementById('importJsonInput')
    };

    // ========================================================================
    // WASM Interface
    // ========================================================================

    let wasmReady = false;
    let sim = null;

    class DominoSampler {
        constructor() {
            this.initFromVerticesWasm = Module.cwrap('initFromVertices', 'number', ['number', 'number']);
            this.performGlauberStepsWasm = Module.cwrap('performGlauberSteps', 'number', ['number']);
            this.exportEdgesWasm = Module.cwrap('exportEdges', 'number', []);
            this.getTotalStepsWasm = Module.cwrap('getTotalSteps', 'number', []);
            this.getFlipCountWasm = Module.cwrap('getFlipCount', 'number', []);
            this.freeStringWasm = Module.cwrap('freeString', null, ['number']);
            this.initCFTPWasm = Module.cwrap('initCFTP', null, []);
            this.stepCFTPWasm = Module.cwrap('stepCFTP', 'number', []);
            this.finalizeCFTPWasm = Module.cwrap('finalizeCFTP', 'number', []);
            this.repairRegionWasm = Module.cwrap('repairRegion', 'number', []);
        }

        initFromVertices(verticesArray) {
            if (verticesArray.length === 0) {
                return { status: 'empty', vertexCount: 0 };
            }

            const dataPtr = Module._malloc(verticesArray.length * 2 * 4);
            for (let i = 0; i < verticesArray.length; i++) {
                Module.setValue(dataPtr + i * 8, verticesArray[i].x, 'i32');
                Module.setValue(dataPtr + i * 8 + 4, verticesArray[i].y, 'i32');
            }

            const resultPtr = this.initFromVerticesWasm(dataPtr, verticesArray.length);
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            Module._free(dataPtr);

            const result = JSON.parse(jsonStr);
            // Convert edges to dominoes with type for rendering
            if (result.edges) {
                result.dominoes = this.edgesToDominoes(result.edges);
            }
            return result;
        }

        step(numSteps) {
            const resultPtr = this.performGlauberStepsWasm(numSteps);
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            const result = JSON.parse(jsonStr);
            // Convert edges to dominoes with type for rendering
            if (result.edges) {
                result.dominoes = this.edgesToDominoes(result.edges);
            }
            return result;
        }

        getEdges() {
            const resultPtr = this.exportEdgesWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            return JSON.parse(jsonStr);
        }

        initCFTP() {
            this.initCFTPWasm();
        }

        stepCFTP() {
            return this.stepCFTPWasm();
        }

        finalizeCFTP() {
            const resultPtr = this.finalizeCFTPWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            const result = JSON.parse(jsonStr);
            // Convert edges to dominoes with type for rendering
            if (result.edges) {
                result.dominoes = this.edgesToDominoes(result.edges);
            }
            return result;
        }

        repair() {
            const resultPtr = this.repairRegionWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            return JSON.parse(jsonStr);
        }

        // Convert edges {x1,y1,x2,y2} to dominoes with type for coloring
        // Type 0: horizontal, starts at black vertex (x+y even)
        // Type 1: horizontal, starts at white vertex (x+y odd)
        // Type 2: vertical, starts at black vertex (x+y even)
        // Type 3: vertical, starts at white vertex (x+y odd)
        edgesToDominoes(edges) {
            return edges.map(e => {
                const isHorizontal = (e.y1 === e.y2);
                // Get the "starting" vertex (leftmost for horizontal, bottom for vertical)
                let startX, startY;
                if (isHorizontal) {
                    startX = Math.min(e.x1, e.x2);
                    startY = e.y1;
                } else {
                    startX = e.x1;
                    startY = Math.min(e.y1, e.y2);
                }
                const isBlack = (startX + startY) % 2 === 0;
                let type;
                if (isHorizontal) {
                    type = isBlack ? 0 : 1;
                } else {
                    type = isBlack ? 2 : 3;
                }
                return { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, type };
            });
        }
    }

    Module.onRuntimeInitialized = function() {
        wasmReady = true;
        sim = new DominoSampler();
        console.log('WASM module loaded');
        draw();
    };

    // ========================================================================
    // Coordinate Conversion
    // ========================================================================

    function screenToCell(sx, sy) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const cx = (sx - rect.left) * dpr;
        const cy = (sy - rect.top) * dpr;

        const centerX = canvas.width / 2 + panX * zoom;
        const centerY = canvas.height / 2 + panY * zoom;
        const size = cellSize * zoom;

        const x = Math.floor((cx - centerX) / size);
        const y = Math.floor((cy - centerY) / size);

        return { x, y };
    }

    function cellToScreen(x, y) {
        const centerX = canvas.width / 2 + panX * zoom;
        const centerY = canvas.height / 2 + panY * zoom;
        const size = cellSize * zoom;

        return {
            x: centerX + x * size,
            y: centerY + y * size
        };
    }

    // ========================================================================
    // State Management
    // ========================================================================

    function saveState() {
        const state = new Map(activeCells);
        undoStack.push(state);
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack.length = 0;
    }

    function undo() {
        if (undoStack.length === 0) return;
        redoStack.push(new Map(activeCells));
        const state = undoStack.pop();
        activeCells.clear();
        for (const [k, v] of state) {
            activeCells.set(k, v);
        }
        updateRegion();
    }

    function redo() {
        if (redoStack.length === 0) return;
        undoStack.push(new Map(activeCells));
        const state = redoStack.pop();
        activeCells.clear();
        for (const [k, v] of state) {
            activeCells.set(k, v);
        }
        updateRegion();
    }

    function updateRegion() {
        if (!wasmReady) return;

        const verticesArray = Array.from(activeCells.values());
        const result = sim.initFromVertices(verticesArray);

        if (result.status === 'valid') {
            isValid = true;
            dominoes = result.dominoes || [];
            totalSteps = 0;
            flipCount = 0;
            el.statusBadge.className = 'status-valid';
            el.statusBadge.textContent = 'Valid';
            el.startStopBtn.disabled = false;
            el.cftpBtn.disabled = false;
            el.repairBtn.disabled = true;
        } else if (result.status === 'empty') {
            isValid = false;
            dominoes = [];
            el.statusBadge.className = 'status-empty';
            el.statusBadge.textContent = 'Empty';
            el.startStopBtn.disabled = true;
            el.cftpBtn.disabled = true;
            el.repairBtn.disabled = true;
        } else {
            isValid = false;
            dominoes = [];
            el.statusBadge.className = 'status-invalid';
            el.statusBadge.textContent = `Invalid (${result.reason || 'no matching'})`;
            el.startStopBtn.disabled = true;
            el.cftpBtn.disabled = true;
            el.repairBtn.disabled = false;
        }

        updateStats();
        draw();
    }

    function updateStats() {
        el.cellsCount.textContent = activeCells.size;
        el.dominoesCount.textContent = dominoes.length;
        el.stepsCount.textContent = totalSteps.toLocaleString();
        el.flipsCount.textContent = flipCount.toLocaleString();
    }

    // ========================================================================
    // Drawing
    // ========================================================================

    function getColors() {
        const palette = colorPalettes[colorPaletteIndex];
        const colors = [...palette.colors];

        // Apply permutation
        const perms = [
            [0, 1, 2, 3],
            [1, 0, 3, 2],
            [2, 3, 0, 1],
            [3, 2, 1, 0],
            [0, 2, 1, 3],
            [1, 3, 0, 2]
        ];
        const perm = perms[colorPermutation % perms.length];

        return perm.map(i => colors[i]);
    }

    function draw() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2 + panX * zoom;
        const centerY = canvas.height / 2 + panY * zoom;
        const size = cellSize * zoom;

        const showGrid = el.showGridCheckbox.checked;
        const borderWidth = parseFloat(el.borderSlider.value) * zoom;
        const colors = getColors();

        // Calculate visible range
        const minVisX = Math.floor(-centerX / size) - 1;
        const maxVisX = Math.ceil((canvas.width - centerX) / size) + 1;
        const minVisY = Math.floor(-centerY / size) - 1;
        const maxVisY = Math.ceil((canvas.height - centerY) / size) + 1;

        // Draw grid
        if (showGrid && size > 5) {
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 0.5;

            for (let x = minVisX; x <= maxVisX; x++) {
                ctx.beginPath();
                ctx.moveTo(centerX + x * size, 0);
                ctx.lineTo(centerX + x * size, canvas.height);
                ctx.stroke();
            }

            for (let y = minVisY; y <= maxVisY; y++) {
                ctx.beginPath();
                ctx.moveTo(0, centerY + y * size);
                ctx.lineTo(canvas.width, centerY + y * size);
                ctx.stroke();
            }
        }

        // Draw active cells (if not valid, show as grey checkerboard)
        if (!isValid) {
            for (const [key, cell] of activeCells) {
                const sx = centerX + cell.x * size;
                const sy = centerY + cell.y * size;
                const isBlack = (cell.x + cell.y) % 2 === 0;
                ctx.fillStyle = isBlack ? '#b0b0b0' : '#d0d0d0';
                ctx.fillRect(sx, sy, size, size);

                if (borderWidth > 0) {
                    ctx.strokeStyle = '#666';
                    ctx.lineWidth = borderWidth;
                    ctx.strokeRect(sx, sy, size, size);
                }
            }
        }

        // Draw dominoes
        if (isValid && dominoes.length > 0) {
            for (const d of dominoes) {
                const sx1 = centerX + d.x1 * size;
                const sy1 = centerY + d.y1 * size;
                const sx2 = centerX + d.x2 * size;
                const sy2 = centerY + d.y2 * size;

                const minX = Math.min(sx1, sx2);
                const minY = Math.min(sy1, sy2);
                const width = (d.x1 === d.x2) ? size : size * 2;
                const height = (d.y1 === d.y2) ? size : size * 2;

                ctx.fillStyle = colors[d.type];
                ctx.fillRect(minX, minY, width, height);

                if (borderWidth > 0) {
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = borderWidth;
                    ctx.strokeRect(minX, minY, width, height);
                }
            }
        }

        // Draw lasso
        if (lassoPoints.length > 0) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();

            const firstCell = lassoPoints[0];
            const first = cellToScreen(firstCell.x + 0.5, firstCell.y + 0.5);
            ctx.moveTo(first.x, first.y);

            for (let i = 1; i < lassoPoints.length; i++) {
                const cell = lassoPoints[i];
                const pos = cellToScreen(cell.x + 0.5, cell.y + 0.5);
                ctx.lineTo(pos.x, pos.y);
            }

            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // ========================================================================
    // Preset Shapes
    // ========================================================================

    function generateRectangle(width, height) {
        saveState();
        activeCells.clear();

        const offsetX = -Math.floor(width / 2);
        const offsetY = -Math.floor(height / 2);

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const cx = offsetX + x;
                const cy = offsetY + y;
                activeCells.set(`${cx},${cy}`, { x: cx, y: cy });
            }
        }

        updateRegion();
    }

    function generateAztecDiamond(n) {
        saveState();
        activeCells.clear();

        // Aztec diamond of order n has 2n rows
        // Row k (from top, 0-indexed) has width 2*min(k+1, 2n-k)
        for (let row = 0; row < 2 * n; row++) {
            const width = 2 * Math.min(row + 1, 2 * n - row);
            const startX = -width / 2;

            for (let i = 0; i < width; i++) {
                const x = Math.floor(startX + i);
                const y = row - n;
                activeCells.set(`${x},${y}`, { x, y });
            }
        }

        updateRegion();
    }

    // ========================================================================
    // Event Handlers
    // ========================================================================

    function handleMouseDown(e) {
        const cell = screenToCell(e.clientX, e.clientY);

        if (currentTool === 'hand' || e.button === 1 || (e.button === 0 && e.altKey)) {
            isPanning = true;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            canvas.classList.add('panning');
            return;
        }

        if (currentTool === 'lassoFill' || currentTool === 'lassoErase') {
            lassoPoints.push(cell);
            draw();
            return;
        }

        isDrawing = true;
        saveState();

        if (currentTool === 'draw') {
            const key = `${cell.x},${cell.y}`;
            if (!activeCells.has(key)) {
                activeCells.set(key, cell);
            }
        } else if (currentTool === 'erase') {
            activeCells.delete(`${cell.x},${cell.y}`);
        }

        updateRegion();
    }

    function handleMouseMove(e) {
        if (isPanning) {
            const dx = e.clientX - lastPanX;
            const dy = e.clientY - lastPanY;
            panX += dx / zoom;
            panY += dy / zoom;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            draw();
            return;
        }

        if (!isDrawing) return;

        const cell = screenToCell(e.clientX, e.clientY);

        if (currentTool === 'draw') {
            const key = `${cell.x},${cell.y}`;
            if (!activeCells.has(key)) {
                activeCells.set(key, cell);
                updateRegion();
            }
        } else if (currentTool === 'erase') {
            const key = `${cell.x},${cell.y}`;
            if (activeCells.has(key)) {
                activeCells.delete(key);
                updateRegion();
            }
        }
    }

    function handleMouseUp(e) {
        isPanning = false;
        isDrawing = false;
        canvas.classList.remove('panning');
    }

    function handleWheel(e) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        zoom = Math.max(0.1, Math.min(10, zoom * factor));
        draw();
    }

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

    function completeLasso(fill) {
        if (lassoPoints.length < 3) {
            lassoPoints = [];
            draw();
            return;
        }

        saveState();

        // Find bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of lassoPoints) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }

        // Check each cell in bounding box
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                if (pointInPolygon(x + 0.5, y + 0.5, lassoPoints)) {
                    const key = `${x},${y}`;
                    if (fill) {
                        activeCells.set(key, { x, y });
                    } else {
                        activeCells.delete(key);
                    }
                }
            }
        }

        lassoPoints = [];
        updateRegion();
    }

    // ========================================================================
    // Simulation Loop
    // ========================================================================

    function startGlauber() {
        if (!isValid || isRunning) return;

        isRunning = true;
        el.startStopBtn.textContent = 'Stop Glauber';
        el.cftpBtn.disabled = true;

        function loop() {
            if (!isRunning) return;

            const stepsPerFrame = Math.ceil(stepsPerSecond / 60);
            const result = sim.step(stepsPerFrame);

            dominoes = result.dominoes;
            totalSteps = result.totalSteps;
            flipCount = result.flipCount;

            updateStats();
            draw();

            animationId = requestAnimationFrame(loop);
        }

        loop();
    }

    function stopGlauber() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        el.startStopBtn.textContent = 'Start Glauber';
        el.cftpBtn.disabled = !isValid;
    }

    async function runCFTP() {
        if (!isValid || isCFTPRunning) return;

        isCFTPRunning = true;
        el.cftpBtn.style.display = 'none';
        el.cftpStopBtn.style.display = '';
        el.cftpStatus.style.display = '';
        el.startStopBtn.disabled = true;
        cftpEpochs = 0;

        sim.initCFTP();

        while (isCFTPRunning) {
            const coalesced = sim.stepCFTP();
            cftpEpochs++;
            el.cftpEpochs.textContent = cftpEpochs;

            if (coalesced === 0) {
                // Success!
                const result = sim.finalizeCFTP();
                dominoes = result.dominoes;
                totalSteps = result.totalSteps || 0;
                flipCount = result.flipCount || 0;
                break;
            }

            // Yield to UI
            await new Promise(resolve => setTimeout(resolve, 0));
            draw();
        }

        isCFTPRunning = false;
        el.cftpBtn.style.display = '';
        el.cftpStopBtn.style.display = 'none';
        el.startStopBtn.disabled = !isValid;

        updateStats();
        draw();
    }

    function stopCFTP() {
        isCFTPRunning = false;
    }

    // ========================================================================
    // Export/Import
    // ========================================================================

    function exportPng() {
        const quality = parseInt(el.qualitySlider.value);
        const scale = quality;

        const exportCanvas = document.createElement('canvas');
        const rect = canvas.getBoundingClientRect();
        exportCanvas.width = rect.width * scale;
        exportCanvas.height = rect.height * scale;

        const exportCtx = exportCanvas.getContext('2d');
        const oldZoom = zoom;
        const oldPanX = panX;
        const oldPanY = panY;

        // Temporarily draw at higher resolution
        const origCanvas = canvas;
        const origCtx = ctx;

        // Save current canvas state
        const centerX = exportCanvas.width / 2 + panX * zoom * scale / (window.devicePixelRatio || 1);
        const centerY = exportCanvas.height / 2 + panY * zoom * scale / (window.devicePixelRatio || 1);
        const size = cellSize * zoom * scale / (window.devicePixelRatio || 1);
        const colors = getColors();
        const borderWidth = parseFloat(el.borderSlider.value) * zoom * scale / (window.devicePixelRatio || 1);

        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Draw dominoes
        if (isValid && dominoes.length > 0) {
            for (const d of dominoes) {
                const sx1 = centerX + d.x1 * size;
                const sy1 = centerY + d.y1 * size;
                const sx2 = centerX + d.x2 * size;
                const sy2 = centerY + d.y2 * size;

                const minX = Math.min(sx1, sx2);
                const minY = Math.min(sy1, sy2);
                const width = (d.x1 === d.x2) ? size : size * 2;
                const height = (d.y1 === d.y2) ? size : size * 2;

                exportCtx.fillStyle = colors[d.type];
                exportCtx.fillRect(minX, minY, width, height);

                if (borderWidth > 0) {
                    exportCtx.strokeStyle = '#000';
                    exportCtx.lineWidth = borderWidth;
                    exportCtx.strokeRect(minX, minY, width, height);
                }
            }
        }

        // Download
        const link = document.createElement('a');
        link.download = 'domino-tiling.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }

    function exportJson() {
        const data = {
            vertices: Array.from(activeCells.values()),
            edges: dominoes.map(d => ({x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2}))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = 'domino-region.json';
        link.href = URL.createObjectURL(blob);
        link.click();
    }

    function importJson(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                // Support both old (cells) and new (vertices) format
                const verts = data.vertices || data.cells;
                if (verts && Array.isArray(verts)) {
                    saveState();
                    activeCells.clear();
                    for (const v of verts) {
                        activeCells.set(`${v.x},${v.y}`, v);
                    }
                    updateRegion();
                }
            } catch (err) {
                console.error('Invalid JSON file', err);
            }
        };
        reader.readAsText(file);
    }

    // ========================================================================
    // Initialize
    // ========================================================================

    function initPaletteSelect() {
        el.paletteSelect.innerHTML = '';
        for (let i = 0; i < colorPalettes.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = colorPalettes[i].name;
            if (i === colorPaletteIndex) option.selected = true;
            el.paletteSelect.appendChild(option);
        }
    }

    function setTool(tool) {
        currentTool = tool;
        el.handTool.classList.toggle('active', tool === 'hand');
        el.drawTool.classList.toggle('active', tool === 'draw');
        el.eraseTool.classList.toggle('active', tool === 'erase');
        el.lassoFillTool.classList.toggle('active', tool === 'lassoFill');
        el.lassoEraseTool.classList.toggle('active', tool === 'lassoErase');

        if (tool !== 'lassoFill' && tool !== 'lassoErase') {
            lassoPoints = [];
            draw();
        }
    }

    function setupEventListeners() {
        // Canvas events
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        canvas.addEventListener('dblclick', (e) => {
            if (currentTool === 'lassoFill') {
                completeLasso(true);
            } else if (currentTool === 'lassoErase') {
                completeLasso(false);
            }
        });

        // Preset buttons
        el.rectangleBtn.addEventListener('click', () => {
            generateRectangle(parseInt(el.rectWidthInput.value), parseInt(el.rectHeightInput.value));
        });

        el.aztecBtn.addEventListener('click', () => {
            generateAztecDiamond(parseInt(el.aztecNInput.value));
        });

        // Simulation controls
        el.startStopBtn.addEventListener('click', () => {
            if (isRunning) {
                stopGlauber();
            } else {
                startGlauber();
            }
        });

        el.cftpBtn.addEventListener('click', runCFTP);
        el.cftpStopBtn.addEventListener('click', stopCFTP);

        el.scaleUpBtn.addEventListener('click', () => {
            if (!wasmReady || activeCells.size === 0) return;
            // Scale up: double each cell into 2x2 block
            saveState();
            const newCells = new Map();
            for (const [key, cell] of activeCells) {
                const nx = cell.x * 2;
                const ny = cell.y * 2;
                newCells.set(`${nx},${ny}`, {x: nx, y: ny});
                newCells.set(`${nx+1},${ny}`, {x: nx+1, y: ny});
                newCells.set(`${nx},${ny+1}`, {x: nx, y: ny+1});
                newCells.set(`${nx+1},${ny+1}`, {x: nx+1, y: ny+1});
            }
            activeCells.clear();
            for (const [k, v] of newCells) activeCells.set(k, v);
            updateRegion();
        });

        el.scaleDownBtn.addEventListener('click', () => {
            if (!wasmReady || activeCells.size === 0) return;
            // Scale down: keep only cells where both coords are even, then divide by 2
            saveState();
            const newCells = new Map();
            for (const [key, cell] of activeCells) {
                if (cell.x % 2 === 0 && cell.y % 2 === 0) {
                    const nx = cell.x / 2;
                    const ny = cell.y / 2;
                    newCells.set(`${nx},${ny}`, {x: nx, y: ny});
                }
            }
            activeCells.clear();
            for (const [k, v] of newCells) activeCells.set(k, v);
            updateRegion();
        });

        // Speed control - logarithmic slider with synchronized input
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

        // Tool buttons
        el.handTool.addEventListener('click', () => setTool('hand'));
        el.drawTool.addEventListener('click', () => setTool('draw'));
        el.eraseTool.addEventListener('click', () => setTool('erase'));
        el.lassoFillTool.addEventListener('click', () => setTool('lassoFill'));
        el.lassoEraseTool.addEventListener('click', () => setTool('lassoErase'));

        el.clearBtn.addEventListener('click', () => {
            saveState();
            activeCells.clear();
            updateRegion();
        });

        el.undoBtn.addEventListener('click', undo);
        el.redoBtn.addEventListener('click', redo);

        el.repairBtn.addEventListener('click', () => {
            if (!wasmReady) return;
            const result = sim.repair();
            if (result.vertices && result.vertices.length > 0) {
                saveState();
                for (const v of result.vertices) {
                    activeCells.set(`${v.x},${v.y}`, v);
                }
                updateRegion();
            }
        });

        // View controls
        el.zoomInBtn.addEventListener('click', () => {
            zoom = Math.min(10, zoom * 1.2);
            draw();
        });

        el.zoomOutBtn.addEventListener('click', () => {
            zoom = Math.max(0.1, zoom / 1.2);
            draw();
        });

        el.resetViewBtn.addEventListener('click', () => {
            zoom = 1.0;
            panX = 0;
            panY = 0;
            draw();
        });

        el.showGridCheckbox.addEventListener('change', draw);

        // Display options
        el.paletteSelect.addEventListener('change', () => {
            colorPaletteIndex = parseInt(el.paletteSelect.value);
            draw();
        });

        el.prevPaletteBtn.addEventListener('click', () => {
            colorPaletteIndex = (colorPaletteIndex - 1 + colorPalettes.length) % colorPalettes.length;
            el.paletteSelect.value = colorPaletteIndex;
            draw();
        });

        el.nextPaletteBtn.addEventListener('click', () => {
            colorPaletteIndex = (colorPaletteIndex + 1) % colorPalettes.length;
            el.paletteSelect.value = colorPaletteIndex;
            draw();
        });

        el.permuteColorsBtn.addEventListener('click', () => {
            colorPermutation = (colorPermutation + 1) % 6;
            draw();
        });

        el.borderSlider.addEventListener('input', draw);

        // Export
        el.exportPngBtn.addEventListener('click', exportPng);
        el.exportJsonBtn.addEventListener('click', exportJson);
        el.importJsonBtn.addEventListener('click', () => el.importJsonInput.click());
        el.importJsonInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importJson(e.target.files[0]);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        });

        // Window resize
        window.addEventListener('resize', draw);
    }

    initPaletteSelect();
    setupEventListeners();
    draw();

})();
</script>
