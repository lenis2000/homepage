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

<p><strong>Domino tilings</strong> are coverings of a region on the square lattice by 1×2 or 2×1 dominoes (dimers), where each cell is covered by exactly one domino. They arise in statistical mechanics as dimer models, in combinatorics through connections to Young tableaux and the RSK correspondence, and in probability theory where random tilings exhibit fascinating limit shapes and fluctuations.</p>

<p>This simulator generates <strong>uniformly random domino tilings</strong> of arbitrary regions that you draw.</p>

<p><strong>How to use:</strong></p>
<ul>
  <li><strong>Draw mode</strong>: Click or drag on the grid to add cells to your region</li>
  <li><strong>Erase mode</strong>: Remove cells from your region (or hold Shift while drawing)</li>
  <li><strong>Lasso</strong>: Click points to define a polygon, then fill or erase the interior. Supports <strong>Snap to Grid</strong> for precise lattice alignment.</li>
  <li><strong>Rectangle/Aztec Diamond</strong>: Quick presets for common shapes</li>
  <li><strong>Scale Up/Down</strong>: Double or halve the region size</li>
  <li><strong>Smooth Scale Up</strong>: Scale preserving boundary slopes (Aztec→Aztec)</li>
  <li><strong>Make Tileable</strong>: Automatically add cells to make an invalid region tileable</li>
  <li><strong>Undo/Redo</strong>: Full history support for shape modifications</li>
</ul>

<p>A region is <strong>tileable</strong> if it has equal numbers of black and white cells (checkerboard coloring) and admits a perfect matching. The <strong>Hopcroft-Karp algorithm</strong> verifies this and finds an initial tiling.</p>

<p><strong>Sampling methods:</strong></p>
<ul>
  <li><strong>Glauber dynamics</strong>: Markov chain Monte Carlo with local 2×2 plaquette flips. Converges to the uniform distribution; good for watching the mixing process. Works for all regions.</li>
  <li><strong>Perfect Sample (CFTP)</strong>: <strong>Coupling From The Past</strong> produces an <em>exact</em> sample from the uniform distribution using monotone coupling on height functions. No burn-in needed. <em>Only available for simply-connected regions (no holes).</em></li>
</ul>

<p><strong>Visualization Modes:</strong></p>
<ul>
  <li><strong>2D Domino</strong>: Standard flat tiling view with four colors for domino types.</li>
  <li><strong>2D Dimer</strong>: Displays the underlying matching on the dual graph as edges.</li>
  <li><strong>3D Height Function</strong>: Renders the tiling as a stepped surface in 3D space. Supports rotation, panning, zooming, perspective/orthographic toggle, and multiple visual presets (Default, Clean, Mathematical, Dramatic, Playful).</li>
  <li><strong>Color Palettes</strong>: Multiple color schemes available, with permutation support to cycle colors.</li>
</ul>

<p><strong>Sampling & Analysis:</strong></p>
<ul>
  <li><strong>Double Dimer</strong>: Superimposes two independent CFTP samples to form loops. Includes a <strong>Min Loop Size</strong> filter to analyze loop statistics.</li>
  <li><strong>Fluctuations</strong>: Visualizes the height difference between two perfect samples (scaled by √2), approximating the Gaussian Free Field.</li>
</ul>

<p><strong>Data Export:</strong></p>
<ul>
  <li><strong>PNG</strong>: Export high-quality images with adjustable quality settings.</li>
  <li><strong>JSON</strong>: Import/Export the region shape for sharing or later use.</li>
</ul>

<p><strong>Performance:</strong> The simulation runs entirely in your browser. When available, it uses <strong>WebGPU</strong> compute shaders for parallel CFTP and Double Dimer sampling. On systems without WebGPU, it falls back to <strong>WebAssembly</strong>.</p>

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
  #three-container {
    width: 100%;
    max-width: 900px;
    height: 600px;
    border: 1px solid #ccc;
    display: none;
    margin: 0 auto;
    background: #f0f0f0;
    border-radius: 6px;
  }
  #three-container canvas {
    width: 100% !important;
    height: 100% !important;
    display: block;
  }
  [data-theme="dark"] #three-container {
    background: #1a1a1a;
    border-color: #444;
  }
  .view-toggle {
    display: inline-flex;
    border: 2px solid #1976d2;
    border-radius: 6px;
    overflow: hidden;
  }
  .view-toggle button {
    border: none;
    border-radius: 0;
    height: 28px;
    padding: 0 12px;
    font-weight: 500;
    background: white;
    color: #1976d2;
    cursor: pointer;
    font-size: 12px;
  }
  .view-toggle button.active {
    background: #1976d2;
    color: white;
  }
  .view-toggle button:hover:not(.active) {
    background: #e3f2fd;
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
    <button id="doubleDimerBtn" class="cftp" title="Double Dimer - Two independent CFTP samples" disabled>Double Dimer</button>
    <span id="doubleDimerProgress" style="font-size: 12px; color: #666;"></span>
    <span style="display: none;" id="minLoopGroup">
      <label for="minLoopInput" style="font-size: 12px; color: #555;">min loop:</label>
      <input type="number" id="minLoopInput" value="2" min="2" max="99" style="width: 3.5em; padding: 2px 4px; font-size: 11px;">
    </span>
    <button id="fluctuationsBtn" class="cftp" title="Height Fluctuations Visualization" style="display: none;">Fluctuations</button>
    <button id="resampleBtn" style="display: none; background: #6c757d; color: white; border-color: #6c757d;">Resample</button>
    <span class="param-group"><span class="param-label">k</span><input type="number" class="param-input" id="scaleKInput" value="2" min="2" max="10"></span>
    <button id="scaleUpBtn" title="Scale the region by k×k blocks">Scale k×k</button>
    <button id="smoothScaleBtn" title="Scale up preserving boundary slopes (Aztec→Aztec)">Smooth Scale Up</button>
    <button id="scaleDownBtn" title="Halve the region size">Scale Down</button>
    <div style="display: flex; align-items: center; gap: 6px;">
      <span style="font-size: 12px; color: #666;">Speed</span>
      <input type="range" id="speedSlider" min="0" max="100" value="29" style="width: 100px;">
      <input type="number" id="speedInput" class="param-input" value="100" min="1" max="100000000" style="width: 80px;">
      <span style="font-size: 11px; color: #888;">/s</span>
    </div>
  </div>
</div>

<!-- Stats Row -->
<div class="control-group">
  <div class="stats-inline">
    <div class="stat"><span class="stat-label">Vertices</span><span class="stat-value" id="cellsCount">0</span></div>
    <div class="stat"><span class="stat-label">Dominoes</span><span class="stat-value" id="dominoesCount">0</span></div>
    <div class="stat"><span class="stat-label">Steps</span><span class="stat-value" id="stepsCount">0</span></div>
    <div class="stat"><span class="stat-label">Flips</span><span class="stat-value" id="flipsCount">0</span></div>
    <div class="stat" id="cftpStatus" style="display: none;"><span class="stat-label">CFTP</span><span class="stat-value" id="cftpSteps">0</span></div>
    <div class="stat" id="gpuIndicator" style="display: none;"><span style="color: #2e8b57; font-size: 0.9em;">🚀 GPU</span></div>
  </div>
</div>

</div>

<!-- Canvas Container with overlay -->
<div id="canvas-container" style="position: relative; max-width: 900px; margin: 0 auto;">
  <!-- View Toggle overlay -->
  <div id="view-overlay" style="position: absolute; top: 8px; right: 8px; z-index: 100; display: flex; align-items: center; gap: 6px;">
    <div class="view-toggle">
      <button id="toggle3DBtn" title="Toggle 2D/3D view">3D</button>
      <button id="perspectiveBtn" title="Toggle perspective/isometric" style="display: none;">🎯</button>
      <button id="preset3DBtn" title="Cycle 3D visual preset" style="display: none;">☀️</button>
    </div>
    <div class="view-toggle">
      <button id="dominoViewBtn" class="active" title="Domino view">▭</button>
      <button id="dimerViewBtn" title="Dimer view">•-•</button>
    </div>
  </div>

  <!-- Canvas -->
  <canvas id="domino-canvas"></canvas>

  <!-- 3D Container -->
  <div id="three-container"></div>
</div>

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
    <button id="lassoSnapBtn" class="tool-btn active" title="Snap lasso to grid">📐</button>
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
    <span style="color: #ccc;">|</span>
    <button id="rotateLeftBtn" title="Rotate Left (3D)" disabled>↺</button>
    <button id="rotateRightBtn" title="Rotate Right (3D)" disabled>↻</button>
    <button id="autoRotateBtn" title="Toggle auto-rotation (3D)" disabled>⟳</button>
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

<!-- Load Three.js for 3D visualization -->
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"></script>

<!-- Load WASM Module -->
<script src="/js/2025-12-05-ultimate-domino.js"></script>

<!-- WebGPU Engine (checks for WebGPU support at runtime) -->
<script src="/js/webgpu-domino-engine.js"></script>

<script>
(function() {
    'use strict';

    // ========================================================================
    // State
    // ========================================================================

    const activeCells = new Map();  // key: "x,y" -> {x, y}
    let isValid = false;
    let hasHoles = false;  // Track if region has holes (non-simply-connected)
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
    let isShiftDraw = false;  // Track if shift was held when drawing started
    let isPanning = false;
    let lastPanX = 0, lastPanY = 0;
    let lassoPoints = [];
    let isLassoing = false;
    let lassoShiftMode = false;  // Track if shift was held when lasso started
    let lassoCursor = null;  // Current cursor position for lasso preview

    // Undo/Redo
    const undoStack = [];
    const redoStack = [];
    const MAX_UNDO = 50;

    // Animation
    let animationId = null;
    let isRunning = false;
    let stepsPerSecond = 100;

    // Touch state for mobile/tablet
    let touchState = {
        lastTouches: [],
        initialPinchDist: 0,
        initialZoom: 1,
        isPinching: false,
        isTouchPanning: false,
        touchStartX: 0,
        touchStartY: 0
    };

    // CFTP
    let isCFTPRunning = false;
    let cftpEpochs = 0;

    // WebGPU
    let gpuEngine = null;
    let useWebGPU = false;

    // Double Dimer / Fluctuations state
    let doubleDimerCancelled = false;
    let storedSamples = null;  // {sample0, sample1} - the two independent samples
    let rawFluctuations = null;  // Map<"x,y" -> fluctuation value>
    let inDoubleDimerMode = false;
    let inFluctuationMode = false;

    // 3D View
    let is3DView = false;
    let renderer3D = null;
    let threeContainer = null;

    // Dimer view (show edges instead of colored dominoes)
    let showDimerView = false;

    // 3D Vertex heights per domino type (4 types x 6 vertices)
    // Horizontal: 0=UR, 1=UM, 2=UL, 3=LL, 4=LM, 5=LR
    // Vertical: 0=TR, 1=MR, 2=BR, 3=BL, 4=ML, 5=TL
    const vertexHeights = {
        0: [1, 2, 1, 0, -1, 0],    // Horiz type 0
        1: [0, -1, 0, 1, 2, 1],    // Horiz type 1
        2: [-1, -2, -1, 0, 1, 0],  // Vert type 2
        3: [0, 1, 0, -1, -2, -1]   // Vert type 3
    };

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
        scaleKInput: document.getElementById('scaleKInput'),
        scaleDownBtn: document.getElementById('scaleDownBtn'),
        smoothScaleBtn: document.getElementById('smoothScaleBtn'),
        speedSlider: document.getElementById('speedSlider'),
        speedInput: document.getElementById('speedInput'),
        cellsCount: document.getElementById('cellsCount'),
        dominoesCount: document.getElementById('dominoesCount'),
        stepsCount: document.getElementById('stepsCount'),
        flipsCount: document.getElementById('flipsCount'),
        cftpStatus: document.getElementById('cftpStatus'),
        cftpSteps: document.getElementById('cftpSteps'),
        handTool: document.getElementById('handTool'),
        drawTool: document.getElementById('drawTool'),
        eraseTool: document.getElementById('eraseTool'),
        lassoFillTool: document.getElementById('lassoFillTool'),
        lassoEraseTool: document.getElementById('lassoEraseTool'),
        lassoSnapBtn: document.getElementById('lassoSnapBtn'),
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
        importJsonInput: document.getElementById('importJsonInput'),
        toggle3DBtn: document.getElementById('toggle3DBtn'),
        perspectiveBtn: document.getElementById('perspectiveBtn'),
        preset3DBtn: document.getElementById('preset3DBtn'),
        dominoViewBtn: document.getElementById('dominoViewBtn'),
        dimerViewBtn: document.getElementById('dimerViewBtn'),
        rotateLeftBtn: document.getElementById('rotateLeftBtn'),
        rotateRightBtn: document.getElementById('rotateRightBtn'),
        autoRotateBtn: document.getElementById('autoRotateBtn'),
        doubleDimerBtn: document.getElementById('doubleDimerBtn'),
        doubleDimerProgress: document.getElementById('doubleDimerProgress'),
        minLoopGroup: document.getElementById('minLoopGroup'),
        minLoopInput: document.getElementById('minLoopInput'),
        fluctuationsBtn: document.getElementById('fluctuationsBtn'),
        resampleBtn: document.getElementById('resampleBtn')
    };

    // Get 3D container
    threeContainer = document.getElementById('three-container');

    // ========================================================================
    // WASM Interface
    // ========================================================================

    let wasmReady = false;
    let sim = null;

    class DominoSampler {
        constructor() {
            this.initFromVerticesWasm = Module.cwrap('initFromVertices', 'number', ['number', 'number']);
            this.performGlauberStepsWasm = Module.cwrap('performGlauberSteps', 'number', ['number']);
            this.performGlauberStepsBinaryWasm = Module.cwrap('performGlauberStepsBinary', 'number', ['number']);
            this.exportEdgesWasm = Module.cwrap('exportEdges', 'number', []);
            this.getTotalStepsWasm = Module.cwrap('getTotalSteps', 'number', []);
            this.getFlipCountWasm = Module.cwrap('getFlipCount', 'number', []);
            this.freeStringWasm = Module.cwrap('freeString', null, ['number']);
            this.initCFTPWasm = Module.cwrap('initCFTP', 'number', []);
            this.stepCFTPWasm = Module.cwrap('stepCFTP', 'number', []);
            this.finalizeCFTPWasm = Module.cwrap('finalizeCFTP', 'number', []);
            this.getCFTPMinStateWasm = Module.cwrap('getCFTPMinState', 'number', []);
            this.getCFTPMaxStateWasm = Module.cwrap('getCFTPMaxState', 'number', []);
            this.getMinTilingWasm = Module.cwrap('getMinTiling', 'number', []);
            this.getMaxTilingWasm = Module.cwrap('getMaxTiling', 'number', []);
            this.getHeightsWasm = Module.cwrap('getHeights', 'number', []);
            this.repairRegionWasm = Module.cwrap('repairRegion', 'number', []);
            this.getRegionMaskWasm = Module.cwrap('getRegionMask', 'number', []);
            // Fluctuations CFTP (double dimer sampling)
            this.initFluctuationsCFTPWasm = Module.cwrap('initFluctuationsCFTP', 'number', []);
            this.stepFluctuationsCFTPWasm = Module.cwrap('stepFluctuationsCFTP', 'number', []);
            this.exportFluctuationSampleWasm = Module.cwrap('exportFluctuationSample', 'number', ['number']);
            this.loadDimersForLoopsWasm = Module.cwrap('loadDimersForLoops', 'number', ['string', 'string']);
            this.filterLoopsBySizeWasm = Module.cwrap('filterLoopsBySize', 'number', ['number']);
            // Hole winding functions
            this.getAllHolesInfoWasm = Module.cwrap('getAllHolesInfo', 'number', []);
            this.adjustHoleWindingWasm = Module.cwrap('adjustHoleWindingExport', 'number', ['number', 'number']);
            this.initHoleWindingsWasm = Module.cwrap('initHoleWindingsExport', null, []);
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

        // Fast binary version - reads directly from WASM memory, no JSON parsing
        // Returns: { dominoes: [{x1,y1,x2,y2,type},...], totalSteps, flipCount }
        stepBinary(numSteps) {
            // Check if binary export is available (requires recompiled WASM)
            if (!this.performGlauberStepsBinaryWasm) {
                console.warn("Binary export not available, falling back to JSON");
                return this.step(numSteps);
            }

            const ptr = this.performGlauberStepsBinaryWasm(numSteps);
            if (!ptr) {
                console.warn("Binary export returned null, falling back to JSON");
                return this.step(numSteps);
            }

            // Buffer format: [count, totalSteps_lo, totalSteps_hi, flipCount_lo, flipCount_hi, x1,y1,x2,y2,type, ...]
            // Access WASM memory - try multiple methods for compatibility
            let heap = Module.HEAP32;
            if (!heap && Module.HEAPU8) {
                heap = new Int32Array(Module.HEAPU8.buffer);
            }
            if (!heap && Module.wasmMemory) {
                heap = new Int32Array(Module.wasmMemory.buffer);
            }
            if (!heap) {
                console.warn("Cannot access WASM memory, falling back to JSON");
                return this.step(numSteps);
            }

            const base = ptr >> 2;  // Convert byte offset to int32 offset

            const count = heap[base];
            const totalStepsLo = heap[base + 1] >>> 0;  // unsigned
            const totalStepsHi = heap[base + 2] >>> 0;
            const flipCountLo = heap[base + 3] >>> 0;
            const flipCountHi = heap[base + 4] >>> 0;

            const totalSteps = totalStepsLo + totalStepsHi * 0x100000000;
            const flipCount = flipCountLo + flipCountHi * 0x100000000;

            const dominoes = new Array(count);
            let offset = base + 5;
            for (let i = 0; i < count; i++) {
                dominoes[i] = {
                    x1: heap[offset],
                    y1: heap[offset + 1],
                    x2: heap[offset + 2],
                    y2: heap[offset + 3],
                    type: heap[offset + 4]
                };
                offset += 5;
            }

            return { dominoes, totalSteps, flipCount };
        }

        getEdges() {
            const resultPtr = this.exportEdgesWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            return JSON.parse(jsonStr);
        }

        initCFTP() {
            const resultPtr = this.initCFTPWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            return JSON.parse(jsonStr);
        }

        stepCFTP() {
            const resultPtr = this.stepCFTPWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            return JSON.parse(jsonStr);
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

        getCFTPMinState() {
            const resultPtr = this.getCFTPMinStateWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            const result = JSON.parse(jsonStr);
            if (result.edges) {
                result.dominoes = this.edgesToDominoes(result.edges);
            }
            return result;
        }

        getCFTPMaxState() {
            const resultPtr = this.getCFTPMaxStateWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            const result = JSON.parse(jsonStr);
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

        getMinTiling() {
            const resultPtr = this.getMinTilingWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            const result = JSON.parse(jsonStr);
            if (result.edges) {
                result.dominoes = this.edgesToDominoes(result.edges);
            }
            return result;
        }

        getMaxTiling() {
            const resultPtr = this.getMaxTilingWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            const result = JSON.parse(jsonStr);
            if (result.edges) {
                result.dominoes = this.edgesToDominoes(result.edges);
            }
            return result;
        }

        getHeights() {
            const resultPtr = this.getHeightsWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            return JSON.parse(jsonStr);
        }

        getRegionMask() {
            const resultPtr = this.getRegionMaskWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            const result = JSON.parse(jsonStr);

            if (result.status !== 'ok') return result;

            // Decode base64 mask to Uint8Array
            const base64 = result.mask;
            const binaryStr = atob(base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            result.maskBytes = bytes;
            return result;
        }

        // Fluctuations CFTP methods
        initFluctuationsCFTP() {
            const resultPtr = this.initFluctuationsCFTPWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            return JSON.parse(jsonStr);
        }

        stepFluctuationsCFTP() {
            const resultPtr = this.stepFluctuationsCFTPWasm();
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            return JSON.parse(jsonStr);
        }

        exportFluctuationSample(pairIdx) {
            const resultPtr = this.exportFluctuationSampleWasm(pairIdx);
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            const result = JSON.parse(jsonStr);
            if (result.edges) {
                result.dominoes = this.edgesToDominoes(result.edges);
            }
            return result;
        }

        loadDimersForLoops(json0, json1) {
            const resultPtr = this.loadDimersForLoopsWasm(json0, json1);
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            return JSON.parse(jsonStr);
        }

        filterLoopsBySize(minSize) {
            const resultPtr = this.filterLoopsBySizeWasm(minSize);
            const jsonStr = Module.UTF8ToString(resultPtr);
            this.freeStringWasm(resultPtr);
            return JSON.parse(jsonStr);
        }

        // Hole winding functions
        getAllHolesInfo() {
            const ptr = this.getAllHolesInfoWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        adjustHoleWinding(holeIdx, delta) {
            const ptr = this.adjustHoleWindingWasm(holeIdx, delta);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        initHoleWindings() {
            this.initHoleWindingsWasm();
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

        // Initialize WebGPU engine if available
        if (navigator.gpu && window.WebGPUDominoEngine) {
            (async () => {
                try {
                    gpuEngine = new WebGPUDominoEngine();
                    const initPromise = gpuEngine.init();
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('WebGPU init timeout')), 3000)
                    );
                    await Promise.race([initPromise, timeoutPromise]);
                    if (gpuEngine.isReady) {
                        useWebGPU = true;
                        console.log('WebGPU Domino Engine ready');
                        // Show GPU indicator
                        const gpuIndicator = document.getElementById('gpuIndicator');
                        if (gpuIndicator) gpuIndicator.style.display = '';
                    }
                } catch (e) {
                    console.warn('WebGPU initialization failed:', e);
                    gpuEngine = null;
                    useWebGPU = false;
                }
            })();
        }
    };

    // ========================================================================
    // Coordinate Conversion
    // ========================================================================

    function screenToCell(sx, sy) {
        const rect = canvas.getBoundingClientRect();
        // Use CSS coordinates (no dpr multiplication) since draw() uses ctx.scale
        const cx = sx - rect.left;
        const cy = sy - rect.top;

        const centerX = rect.width / 2 + panX * zoom;
        const centerY = rect.height / 2 + panY * zoom;
        const size = cellSize * zoom;

        const x = Math.floor((cx - centerX) / size);
        const y = Math.floor((cy - centerY) / size);

        return { x, y };
    }

    function cellToScreen(x, y) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2 + panX * zoom;
        const centerY = rect.height / 2 + panY * zoom;
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
            el.startStopBtn.disabled = false;
            el.repairBtn.disabled = true;
            clearDoubleDimerState();

            // Check for holes - disable CFTP for non-simply-connected regions
            const holesInfo = sim.getAllHolesInfo();
            hasHoles = holesInfo.holes && holesInfo.holes.length > 0;
            el.cftpBtn.disabled = hasHoles;
            el.doubleDimerBtn.disabled = hasHoles;
            if (hasHoles) {
                el.statusBadge.className = 'status-valid';
                el.statusBadge.textContent = 'Valid (has holes)';
                el.cftpBtn.textContent = 'CFTP N/A (holes)';
                el.cftpBtn.title = 'CFTP not implemented for regions with holes';
                el.doubleDimerBtn.textContent = 'Double Dimer N/A';
                el.doubleDimerBtn.title = 'Double Dimer not implemented for regions with holes';
            } else {
                el.statusBadge.className = 'status-valid';
                el.statusBadge.textContent = 'Valid';
                el.cftpBtn.textContent = 'Perfect Sample';
                el.cftpBtn.title = 'Coupling From The Past - Perfect Sample';
                el.doubleDimerBtn.textContent = 'Double Dimer';
                el.doubleDimerBtn.title = 'Double Dimer - Two independent CFTP samples';
            }
        } else if (result.status === 'empty') {
            isValid = false;
            hasHoles = false;
            dominoes = [];
            el.statusBadge.className = 'status-empty';
            el.statusBadge.textContent = 'Empty';
            el.startStopBtn.disabled = true;
            el.cftpBtn.disabled = true;
            el.doubleDimerBtn.disabled = true;
            el.repairBtn.disabled = true;
            clearDoubleDimerState();
        } else {
            isValid = false;
            hasHoles = false;
            dominoes = [];
            el.statusBadge.className = 'status-invalid';
            el.statusBadge.textContent = `Invalid (${result.reason || 'no matching'})`;
            el.startStopBtn.disabled = true;
            el.cftpBtn.disabled = true;
            el.doubleDimerBtn.disabled = true;
            el.repairBtn.disabled = false;
            clearDoubleDimerState();
        }

        updateStats();
        draw();
        update3DView();  // Update 3D when region changes
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

    function resetView(skipDraw = false) {
        if (activeCells.size === 0) {
            zoom = 1.0;
            panX = 0;
            panY = 0;
            if (!skipDraw) draw();
            return;
        }

        // Find bounds of active cells
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const [key, cell] of activeCells) {
            minX = Math.min(minX, cell.x);
            maxX = Math.max(maxX, cell.x + 1);  // +1 for cell width
            minY = Math.min(minY, cell.y);
            maxY = Math.max(maxY, cell.y + 1);  // +1 for cell height
        }

        const rect = canvas.getBoundingClientRect();
        const canvasW = rect.width;
        const canvasH = rect.height;

        // Calculate required zoom to fit all cells with minimal padding
        const regionW = (maxX - minX) * cellSize;
        const regionH = (maxY - minY) * cellSize;
        const padding = 0.94;  // 94% of canvas - 3% margin on each side

        const zoomX = (canvasW * padding) / regionW;
        const zoomY = (canvasH * padding) / regionH;
        zoom = Math.min(zoomX, zoomY, 4.0);  // Cap at 4x zoom

        // Center the region
        const centerCellX = (minX + maxX) / 2;
        const centerCellY = (minY + maxY) / 2;
        panX = -centerCellX * cellSize;
        panY = -centerCellY * cellSize;

        if (!skipDraw) draw();
    }

    // Helper: redraw appropriate view based on current mode
    function redrawView() {
        if (inDoubleDimerMode) renderDoubleDimers();
        else if (inFluctuationMode) renderFluctuations();
        else if (showDimerView) renderDimerView();
        else draw();
    }

    function draw() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Scale context to handle DPR - all coordinates now in CSS pixels
        ctx.scale(dpr, dpr);

        ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);

        const centerX = rect.width / 2 + panX * zoom;
        const centerY = rect.height / 2 + panY * zoom;
        const size = cellSize * zoom;

        const showGrid = el.showGridCheckbox.checked;
        const borderWidth = parseFloat(el.borderSlider.value) * zoom;
        const colors = getColors();

        // Calculate visible range (use rect dimensions since we scaled by dpr)
        const minVisX = Math.floor(-centerX / size) - 1;
        const maxVisX = Math.ceil((rect.width - centerX) / size) + 1;
        const minVisY = Math.floor(-centerY / size) - 1;
        const maxVisY = Math.ceil((rect.height - centerY) / size) + 1;

        // Draw grid
        if (showGrid && size > 5) {
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 0.5;

            for (let x = minVisX; x <= maxVisX; x++) {
                ctx.beginPath();
                ctx.moveTo(centerX + x * size, 0);
                ctx.lineTo(centerX + x * size, rect.height);
                ctx.stroke();
            }

            for (let y = minVisY; y <= maxVisY; y++) {
                ctx.beginPath();
                ctx.moveTo(0, centerY + y * size);
                ctx.lineTo(rect.width, centerY + y * size);
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
            const isFillMode = (currentTool === 'lassoFill') !== lassoShiftMode;
            ctx.strokeStyle = isFillMode ? '#00cc00' : '#ff00ff';
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

            // Draw line to cursor if lassoing
            if (lassoCursor && isLassoing) {
                const cursorPos = cellToScreen(lassoCursor.x + 0.5, lassoCursor.y + 0.5);
                ctx.lineTo(cursorPos.x, cursorPos.y);

                // Draw dashed line back to start if we have enough points
                if (lassoPoints.length >= 2) {
                    ctx.setLineDash([2, 4]);
                    ctx.lineTo(first.x, first.y);
                }
            }

            ctx.stroke();
            ctx.setLineDash([]);

            // Draw start point marker
            ctx.fillStyle = isFillMode ? '#00cc00' : '#ff00ff';
            ctx.beginPath();
            ctx.arc(first.x, first.y, 6, 0, Math.PI * 2);
            ctx.fill();

            // Draw waypoint markers
            for (let i = 1; i < lassoPoints.length; i++) {
                const cell = lassoPoints[i];
                const pos = cellToScreen(cell.x + 0.5, cell.y + 0.5);
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ========================================================================
    // Hole Winding Controls (removed - CFTP disabled for non-simply-connected regions)
    // ========================================================================

    // Refresh dominoes from current WASM state
    function refreshDimers() {
        if (!sim) return;
        const resultPtr = sim.exportEdgesWasm();
        const jsonStr = Module.UTF8ToString(resultPtr);
        sim.freeStringWasm(resultPtr);
        const result = JSON.parse(jsonStr);
        if (result.edges) {
            dominoes = sim.edgesToDominoes(result.edges);
        }
    }

    // ========================================================================
    // 3D Renderer
    // ========================================================================

    // 3D Visual Presets
    const VISUAL_PRESETS_3D = [
        {
            name: 'Default',
            icon: '☀️',
            background: 0xffffff,
            ambient: { intensity: 0.4 },
            hemisphere: { sky: 0xffffff, ground: 0x444444, intensity: 0.3 },
            directional: { intensity: 0.6, position: [10, 10, 15] },
            fill: { intensity: 0.25, position: [-10, -5, -10] },
            material: { type: 'standard', roughness: 0.5, metalness: 0.15, flatShading: true },
            edges: { color: 0x000000, opacity: 0.5 }
        },
        {
            name: 'Clean',
            icon: '✨',
            background: 0xfafafa,
            ambient: { intensity: 0.5 },
            hemisphere: { sky: 0xffffff, ground: 0xeeeeee, intensity: 0.2 },
            directional: { intensity: 0.7, position: [5, 15, 10] },
            fill: { intensity: 0.3, position: [-8, 5, -8] },
            material: { type: 'phong', shininess: 60, flatShading: true },
            edges: { color: 0x333333, opacity: 0.3 }
        },
        {
            name: 'Mathematical',
            icon: '📐',
            background: 0xffffff,
            ambient: { intensity: 0.6 },
            hemisphere: { sky: 0xffffff, ground: 0xffffff, intensity: 0.2 },
            directional: { intensity: 0.4, position: [0, 20, 0] },
            fill: { intensity: 0.2, position: [0, -10, 0] },
            material: { type: 'lambert', flatShading: true },
            edges: { color: 0x000000, opacity: 1.0 }
        },
        {
            name: 'Dramatic',
            icon: '🎭',
            background: 0x1a1a2e,
            ambient: { intensity: 0.35 },
            hemisphere: { sky: 0x6666aa, ground: 0x222244, intensity: 0.25 },
            directional: { intensity: 1.2, position: [15, 20, 5] },
            fill: { intensity: 0.3, position: [-10, 5, -5] },
            material: { type: 'standard', roughness: 0.3, metalness: 0.5, flatShading: true },
            edges: { color: 0x222222, opacity: 0.6 }
        },
        {
            name: 'Playful',
            icon: '🎨',
            background: 0xf0f8ff,
            ambient: { intensity: 0.5 },
            hemisphere: { sky: 0xaaddff, ground: 0xffddaa, intensity: 0.4 },
            directional: { intensity: 0.5, position: [10, 15, 10] },
            fill: { intensity: 0.35, position: [-10, 10, -5] },
            material: { type: 'phong', shininess: 100, flatShading: false },
            edges: { color: 0x444444, opacity: 0.2 }
        }
    ];

    class Domino3DRenderer {
        constructor(container) {
            this.container = container;
            this.autoRotate = false;
            this.lastDominoCount = 0;
            this.currentPresetIndex = 0;
            this.usePerspective = false;

            // Three.js setup
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xffffff);

            // Orthographic camera (top-down initially)
            const w = container.clientWidth || 900;
            const h = container.clientHeight || 600;
            const frustum = 100;
            const aspect = w / h;

            this.camera = new THREE.OrthographicCamera(
                -frustum * aspect / 2, frustum * aspect / 2,
                frustum / 2, -frustum / 2,
                1, 1000
            );
            this.camera.position.set(0, 130, 0);
            this.camera.lookAt(0, 0, 0);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(w, h);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.getContext().getExtension('OES_element_index_uint');
            container.appendChild(this.renderer.domElement);

            // Controls
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.25;
            this.controls.touches = { ONE: THREE.TOUCH.ROTATE };

            // Lighting - store references for preset changes
            this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
            this.scene.add(this.ambientLight);

            this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
            this.hemiLight.position.set(0, 20, 0);
            this.scene.add(this.hemiLight);

            this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
            this.directionalLight.position.set(10, 10, 15);
            this.scene.add(this.directionalLight);

            this.fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
            this.fillLight.position.set(-10, -5, -10);
            this.scene.add(this.fillLight);

            // Group for dominoes
            this.dominoGroup = new THREE.Group();
            this.scene.add(this.dominoGroup);

            // Handle resize
            window.addEventListener('resize', () => this.handleResize());

            // Apply default preset
            this.applyPreset(0);

            // Start animation loop
            this.animate();
        }

        applyPreset(index) {
            this.currentPresetIndex = index % VISUAL_PRESETS_3D.length;
            const preset = VISUAL_PRESETS_3D[this.currentPresetIndex];

            // Background
            this.scene.background = new THREE.Color(preset.background);

            // Lights
            this.ambientLight.intensity = preset.ambient.intensity;
            this.hemiLight.color.setHex(preset.hemisphere.sky);
            this.hemiLight.groundColor.setHex(preset.hemisphere.ground);
            this.hemiLight.intensity = preset.hemisphere.intensity;
            this.directionalLight.intensity = preset.directional.intensity;
            this.directionalLight.position.set(...preset.directional.position);
            this.fillLight.intensity = preset.fill.intensity;
            this.fillLight.position.set(...preset.fill.position);
        }

        cyclePreset() {
            this.applyPreset(this.currentPresetIndex + 1);
            return VISUAL_PRESETS_3D[this.currentPresetIndex];
        }

        getCurrentPreset() {
            return VISUAL_PRESETS_3D[this.currentPresetIndex];
        }

        togglePerspective() {
            this.usePerspective = !this.usePerspective;
            const w = this.container.clientWidth || 900;
            const h = this.container.clientHeight || 600;

            // Save current camera target
            const target = this.controls.target.clone();

            if (this.usePerspective) {
                // Switch to perspective camera
                this.camera = new THREE.PerspectiveCamera(60, w / h, 1, 2000);
                this.camera.position.set(60, 80, 100);
            } else {
                // Switch back to orthographic camera
                const frustum = 100;
                const aspect = w / h;
                this.camera = new THREE.OrthographicCamera(
                    -frustum * aspect / 2, frustum * aspect / 2,
                    frustum / 2, -frustum / 2,
                    1, 1000
                );
                this.camera.position.set(0, 130, 0);
            }

            this.camera.lookAt(target);
            this.controls.dispose();
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.copy(target);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.25;
            this.controls.touches = { ONE: THREE.TOUCH.ROTATE };

            return this.usePerspective;
        }

        handleResize() {
            if (!this.container) return;
            const w = this.container.clientWidth;
            const h = this.container.clientHeight;
            const aspect = w / h;

            if (this.usePerspective) {
                this.camera.aspect = aspect;
            } else {
                const frustum = 100;
                this.camera.left = -frustum * aspect / 2;
                this.camera.right = frustum * aspect / 2;
                this.camera.top = frustum / 2;
                this.camera.bottom = -frustum / 2;
            }
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            this.controls.update();

            if (this.autoRotate && this.dominoGroup) {
                this.dominoGroup.rotation.y += 0.005;
            }

            this.renderer.render(this.scene, this.camera);

            // Call onAnimate callback if set (for updating hole positions)
            if (this.onAnimate) {
                this.onAnimate();
            }
        }

        rotateHorizontal(angleDegrees) {
            const angleRadians = angleDegrees * Math.PI / 180;
            const target = this.controls.target;
            const offset = new THREE.Vector3();
            offset.subVectors(this.camera.position, target);

            // Rotate around Y-axis
            const axis = new THREE.Vector3(0, 1, 0);
            offset.applyAxisAngle(axis, angleRadians);

            this.camera.position.copy(target).add(offset);
            this.camera.lookAt(target);
            this.controls.update();
        }

        setAutoRotate(enabled) {
            this.autoRotate = enabled;
        }

        zoomIn() {
            if (this.usePerspective) {
                // Perspective: dolly camera towards target
                const direction = new THREE.Vector3();
                direction.subVectors(this.camera.position, this.controls.target);
                direction.multiplyScalar(0.8);  // Move closer
                this.camera.position.copy(this.controls.target).add(direction);
                this.controls.update();
            } else {
                // Orthographic: reduce frustum size
                const factor = 0.8;
                this.camera.left *= factor;
                this.camera.right *= factor;
                this.camera.top *= factor;
                this.camera.bottom *= factor;
                this.camera.updateProjectionMatrix();
            }
        }

        zoomOut() {
            if (this.usePerspective) {
                // Perspective: dolly camera away from target
                const direction = new THREE.Vector3();
                direction.subVectors(this.camera.position, this.controls.target);
                direction.multiplyScalar(1.25);  // Move further
                this.camera.position.copy(this.controls.target).add(direction);
                this.controls.update();
            } else {
                // Orthographic: increase frustum size
                const factor = 1.25;
                this.camera.left *= factor;
                this.camera.right *= factor;
                this.camera.top *= factor;
                this.camera.bottom *= factor;
                this.camera.updateProjectionMatrix();
            }
        }

        resetView() {
            if (this.dominoGroup) {
                this.dominoGroup.rotation.set(0, 0, 0);
            }

            // Get bounding box of the model
            const box = new THREE.Box3();
            if (this.dominoGroup && this.dominoGroup.children.length > 0) {
                box.setFromObject(this.dominoGroup);
            } else {
                // Default box if no geometry
                box.set(new THREE.Vector3(-50, -50, -50), new THREE.Vector3(50, 50, 50));
            }

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 100;

            const w = this.container.clientWidth || 900;
            const h = this.container.clientHeight || 600;
            const aspect = w / h;

            if (this.usePerspective) {
                // Position camera to fit the bounding sphere
                const fov = this.camera.fov * (Math.PI / 180);
                const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;
                this.camera.position.set(
                    center.x + distance * 0.5,
                    center.y + distance,
                    center.z + distance * 0.8
                );
                this.camera.lookAt(center);
            } else {
                // Orthographic: set frustum to fit the model with padding
                const frustum = maxDim * 1.2;
                this.camera.left = -frustum * aspect / 2;
                this.camera.right = frustum * aspect / 2;
                this.camera.top = frustum / 2;
                this.camera.bottom = -frustum / 2;
                this.camera.position.set(center.x, center.y + maxDim * 2, center.z);
                this.camera.lookAt(center);
                this.camera.updateProjectionMatrix();
            }
            this.controls.target.copy(center);
            this.controls.update();
        }

        // Convert world coordinates to screen coordinates (for hole UI overlay)
        worldToScreen3D(x, y, h = 0) {
            // In domino 3D, x/y are cell coords, h is height
            // The 3D scene uses: pos.x = cell x, pos.y = height, pos.z = cell y
            const pos3d = new THREE.Vector3(x, h, y);
            pos3d.project(this.camera);
            const rect = this.container.getBoundingClientRect();
            return {
                x: (pos3d.x * 0.5 + 0.5) * rect.width,
                y: (-pos3d.y * 0.5 + 0.5) * rect.height
            };
        }

        // Calculate height function from dominoes
        // Edge weights derived from vertex height offsets
        calculateHeightFunction(dominoes) {
            if (!dominoes || dominoes.length === 0) return new Map();

            // Build adjacency graph with height increments
            const adj = new Map();

            function addEdge(v1, v2, dh) {
                const v1Key = `${v1[0]},${v1[1]}`;
                const v2Key = `${v2[0]},${v2[1]}`;

                if (!adj.has(v1Key)) adj.set(v1Key, []);
                if (!adj.has(v2Key)) adj.set(v2Key, []);

                adj.get(v1Key).push([v2Key, dh]);
                adj.get(v2Key).push([v1Key, -dh]);
            }

            // Process each domino using actual vertex offsets
            // Horizontal vertex indices: 0=UR, 1=UM, 2=UL, 3=LL, 4=LM, 5=LR
            // Vertical vertex indices: 0=TR, 1=MR, 2=BR, 3=BL, 4=ML, 5=TL
            for (const d of dominoes) {
                const isHorizontal = (d.y1 === d.y2);
                const x = Math.min(d.x1, d.x2);
                const y = Math.min(d.y1, d.y2);
                const type = d.type;
                const h = vertexHeights[type];

                if (isHorizontal) {
                    // Horizontal domino spans (x,y) to (x+2,y+1)
                    const TL = [x, y+1], TM = [x+1, y+1], TR = [x+2, y+1];
                    const BL = [x, y], BM = [x+1, y], BR = [x+2, y];

                    // Horizontal edges using offset differences
                    // Top row: UL(2) -> UM(1) -> UR(0)
                    addEdge(TL, TM, h[1] - h[2]);  // UL -> UM
                    addEdge(TM, TR, h[0] - h[1]);  // UM -> UR
                    // Bottom row: LL(3) -> LM(4) -> LR(5)
                    addEdge(BL, BM, h[4] - h[3]);  // LL -> LM
                    addEdge(BM, BR, h[5] - h[4]);  // LM -> LR
                    // Vertical edges: UL-LL, UM-LM, UR-LR
                    addEdge(TL, BL, h[3] - h[2]);  // UL -> LL
                    addEdge(TM, BM, h[4] - h[1]);  // UM -> LM
                    addEdge(TR, BR, h[5] - h[0]);  // UR -> LR
                } else {
                    // Vertical domino spans (x,y) to (x+1,y+2)
                    const TL = [x, y+2], TR = [x+1, y+2];
                    const ML = [x, y+1], MR = [x+1, y+1];
                    const BL = [x, y], BR = [x+1, y];

                    // Vertical edges using offset differences
                    // Left col: TL(5) -> ML(4) -> BL(3)
                    addEdge(TL, ML, h[4] - h[5]);  // TL -> ML
                    addEdge(ML, BL, h[3] - h[4]);  // ML -> BL
                    // Right col: TR(0) -> MR(1) -> BR(2)
                    addEdge(TR, MR, h[1] - h[0]);  // TR -> MR
                    addEdge(MR, BR, h[2] - h[1]);  // MR -> BR
                    // Horizontal edges: TL-TR, ML-MR, BL-BR
                    addEdge(TL, TR, h[0] - h[5]);  // TL -> TR
                    addEdge(ML, MR, h[1] - h[4]);  // ML -> MR
                    addEdge(BL, BR, h[2] - h[3]);  // BL -> BR
                }
            }

            // BFS to compute heights from bottom-left vertex
            const verts = Array.from(adj.keys()).map(k => {
                const [gx, gy] = k.split(',').map(Number);
                return { k, gx, gy };
            });

            if (verts.length === 0) return new Map();

            // Find bottom-left vertex as root
            const root = verts.reduce((a, b) =>
                (a.gy < b.gy) || (a.gy === b.gy && a.gx <= b.gx) ? a : b
            ).k;

            const heights = new Map([[root, 0]]);
            const queue = [root];

            while (queue.length > 0) {
                const v = queue.shift();
                for (const [w, dh] of adj.get(v) || []) {
                    if (!heights.has(w)) {
                        heights.set(w, heights.get(v) + dh);
                        queue.push(w);
                    }
                }
            }

            return heights;
        }

        renderDominoes(dominoes, colors) {
            // Clear previous geometry
            while (this.dominoGroup.children.length > 0) {
                const child = this.dominoGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                this.dominoGroup.remove(child);
            }

            if (!dominoes || dominoes.length === 0) return;

            // Calculate base height function for positioning
            const heightMap = this.calculateHeightFunction(dominoes);

            // Create mesh for each domino
            for (const d of dominoes) {
                try {
                    const isHorizontal = (d.y1 === d.y2);
                    const x = Math.min(d.x1, d.x2);
                    const y = Math.min(d.y1, d.y2);
                    const type = d.type;

                    // Get vertex height offsets from sliders
                    const hOffsets = vertexHeights[type];

                    // Get base height from height map (corner position)
                    // Subtract reference corner offset so baseH + offset[3] = heightMap value
                    const baseKey = `${x},${y}`;
                    const heightAtRef = heightMap.has(baseKey) ? heightMap.get(baseKey) : 0;
                    const baseH = heightAtRef - hOffsets[3];

                    // Build 6 vertices with positions and heights
                    // Heights = baseH + offset from slider
                    let pts;
                    if (isHorizontal) {
                        // Horizontal: 2(UL)--1(UM)--0(UR) / 3(LL)--4(LM)--5(LR)
                        pts = [
                            [x+2, y+1, baseH + hOffsets[0]],  // 0: UR
                            [x+1, y+1, baseH + hOffsets[1]],  // 1: UM
                            [x,   y+1, baseH + hOffsets[2]],  // 2: UL
                            [x,   y,   baseH + hOffsets[3]],  // 3: LL
                            [x+1, y,   baseH + hOffsets[4]],  // 4: LM
                            [x+2, y,   baseH + hOffsets[5]]   // 5: LR
                        ];
                    } else {
                        // Vertical: 5(TL)--0(TR) / 4(ML)--1(MR) / 3(BL)--2(BR)
                        pts = [
                            [x+1, y+2, baseH + hOffsets[0]],  // 0: TR
                            [x+1, y+1, baseH + hOffsets[1]],  // 1: MR
                            [x+1, y,   baseH + hOffsets[2]],  // 2: BR
                            [x,   y,   baseH + hOffsets[3]],  // 3: BL
                            [x,   y+1, baseH + hOffsets[4]],  // 4: ML
                            [x,   y+2, baseH + hOffsets[5]]   // 5: TL
                        ];
                    }

                    // Build vertices array (x, height, z) where z=y in 2D
                    const vertices = [];
                    for (const [px, py, h] of pts) {
                        vertices.push(px, h * 0.5, py);
                    }

                    // Create geometry: 1 rectangle (4 corners) + 2 vertical triangles (at midpoints)
                    const geom = new THREE.BufferGeometry();
                    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

                    // Indices: rectangle uses corners (0,2,3,5), triangles use edges with midpoints
                    const indices = isHorizontal
                        // Horiz: rect[2,0,5,3] + top tri[2,1,0] + bottom tri[3,4,5]
                        ? [2,0,5, 2,5,3, 2,1,0, 3,4,5]
                        // Vert: rect[5,0,2,3] + left tri[5,4,3] + right tri[0,1,2]
                        : [5,0,2, 5,2,3, 5,4,3, 0,1,2];

                    geom.setIndex(indices);
                    geom.computeVertexNormals();

                    // Material with color based on current preset
                    const color = colors[type] || '#888888';
                    const preset = this.getCurrentPreset();
                    const matSettings = preset.material;
                    let mat;
                    if (matSettings.type === 'standard') {
                        mat = new THREE.MeshStandardMaterial({
                            color: color,
                            side: THREE.DoubleSide,
                            flatShading: matSettings.flatShading,
                            roughness: matSettings.roughness,
                            metalness: matSettings.metalness
                        });
                    } else if (matSettings.type === 'phong') {
                        mat = new THREE.MeshPhongMaterial({
                            color: color,
                            side: THREE.DoubleSide,
                            flatShading: matSettings.flatShading,
                            shininess: matSettings.shininess
                        });
                    } else {
                        mat = new THREE.MeshLambertMaterial({
                            color: color,
                            side: THREE.DoubleSide,
                            flatShading: matSettings.flatShading
                        });
                    }

                    const mesh = new THREE.Mesh(geom, mat);
                    this.dominoGroup.add(mesh);

                    // Add edges based on preset
                    const edges = new THREE.EdgesGeometry(geom, 15);
                    const lineMat = new THREE.LineBasicMaterial({
                        color: preset.edges.color,
                        linewidth: 1,
                        opacity: preset.edges.opacity,
                        transparent: preset.edges.opacity < 1
                    });
                    const wireframe = new THREE.LineSegments(edges, lineMat);
                    this.dominoGroup.add(wireframe);
                } catch (e) {
                    console.error('Error creating 3D domino mesh:', e);
                }
            }

            // Center and scale only when domino count changes (not on slider updates)
            const currentCount = dominoes.length;
            if (this.dominoGroup.children.length > 0 && currentCount !== this.lastDominoCount) {
                this.lastDominoCount = currentCount;

                // Center based on X/Z only (ignore Y so height changes don't shift view)
                const box = new THREE.Box3().setFromObject(this.dominoGroup);
                const center = box.getCenter(new THREE.Vector3());
                center.y = 0;  // Don't center on Y axis
                this.dominoGroup.position.set(-center.x, 0, -center.z);

                // Scale to fit view based on X/Z extent only
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.z);
                if (maxDim > 0) {
                    const scale = 80 / maxDim;
                    this.dominoGroup.scale.setScalar(scale);
                }

                this.controls.target.set(0, 0, 0);
            }
        }
    }

    // ========================================================================
    // 3D View Management
    // ========================================================================

    function setViewMode(use3D) {
        is3DView = use3D;

        // Toggle canvas visibility
        canvas.style.display = use3D ? 'none' : 'block';
        threeContainer.style.display = use3D ? 'block' : 'none';

        // Update button text
        el.toggle3DBtn.textContent = use3D ? '2D' : '3D';

        // Show/hide 3D option buttons
        el.perspectiveBtn.style.display = use3D ? 'inline-block' : 'none';
        el.preset3DBtn.style.display = use3D ? 'inline-block' : 'none';

        // Enable/disable rotation buttons
        el.rotateLeftBtn.disabled = !use3D;
        el.rotateRightBtn.disabled = !use3D;
        el.autoRotateBtn.disabled = !use3D;

        // Disable dimer view buttons in 3D mode
        el.dominoViewBtn.disabled = use3D;
        el.dimerViewBtn.disabled = use3D;
        el.dominoViewBtn.style.opacity = use3D ? '0.5' : '1';
        el.dimerViewBtn.style.opacity = use3D ? '0.5' : '1';

        // Initialize 3D renderer if needed
        if (use3D && !renderer3D && threeContainer) {
            renderer3D = new Domino3DRenderer(threeContainer);
            // Set up callback to update hole positions during animation
            renderer3D.onAnimate = updateHoleOverlayPositions;
        }

        // Render 3D if we have valid dominoes
        if (use3D && renderer3D && isValid && dominoes.length > 0) {
            const colors = getColors();
            renderer3D.renderDominoes(dominoes, colors);
            renderer3D.resetView();
        }
    }

    function update3DView() {
        if (is3DView && renderer3D && isValid && dominoes.length > 0) {
            const colors = getColors();
            renderer3D.renderDominoes(dominoes, colors);
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
            const lassoSnap = el.lassoSnapBtn.classList.contains('active');

            // Click-based lasso: click to add points, click near start to close
            if (!isLassoing) {
                // Start new lasso
                isLassoing = true;
                lassoShiftMode = e.shiftKey;
                lassoPoints = [cell];
                lassoCursor = null;
                draw();
            } else {
                const lastPoint = lassoPoints[lassoPoints.length - 1];

                // Apply direction snapping if enabled
                let pointToAdd = cell;
                if (lassoSnap && lassoPoints.length > 0) {
                    pointToAdd = snapDirectionToGrid(lastPoint, cell);
                }

                // Cmd/Ctrl-click: add point and complete immediately
                if (e.metaKey || e.ctrlKey) {
                    if (pointToAdd.x !== lastPoint.x || pointToAdd.y !== lastPoint.y) {
                        lassoPoints.push(pointToAdd);
                    }
                    if (lassoPoints.length >= 3) {
                        completeLasso();
                    } else {
                        lassoPoints = [];
                        isLassoing = false;
                        lassoCursor = null;
                        draw();
                    }
                    return;
                }

                // Check if clicking near start point to close
                const startPoint = lassoPoints[0];
                const distToStart = Math.hypot(pointToAdd.x - startPoint.x, pointToAdd.y - startPoint.y);
                if (lassoPoints.length >= 3 && distToStart < 1.5) {
                    // Close the lasso
                    completeLasso();
                } else {
                    // Add waypoint (avoid duplicates)
                    if (pointToAdd.x !== lastPoint.x || pointToAdd.y !== lastPoint.y) {
                        lassoPoints.push(pointToAdd);
                    }
                    draw();
                }
            }
            return;
        }

        isDrawing = true;
        isShiftDraw = e.shiftKey;  // Remember shift state at start of drag
        saveState();

        // Shift+click = erase, regardless of current tool
        const effectiveTool = isShiftDraw ? 'erase' : currentTool;

        if (effectiveTool === 'draw') {
            const key = `${cell.x},${cell.y}`;
            if (!activeCells.has(key)) {
                activeCells.set(key, cell);
            }
        } else if (effectiveTool === 'erase') {
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
            redrawView();
            return;
        }

        // Update lasso cursor preview
        if (isLassoing) {
            const cell = screenToCell(e.clientX, e.clientY);
            const lassoSnap = el.lassoSnapBtn.classList.contains('active');

            if (lassoSnap && lassoPoints.length > 0) {
                const lastPoint = lassoPoints[lassoPoints.length - 1];
                lassoCursor = snapDirectionToGrid(lastPoint, cell);
            } else {
                lassoCursor = cell;
            }
            draw();
            return;
        }

        if (!isDrawing) return;

        const cell = screenToCell(e.clientX, e.clientY);

        // Use the shift state from when drawing started
        const effectiveTool = isShiftDraw ? 'erase' : currentTool;

        if (effectiveTool === 'draw') {
            const key = `${cell.x},${cell.y}`;
            if (!activeCells.has(key)) {
                activeCells.set(key, cell);
                updateRegion();
            }
        } else if (effectiveTool === 'erase') {
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
        redrawView();
    }

    // ========================================================================
    // Touch Event Handlers (iOS/mobile support)
    // ========================================================================

    function getTouchDistance(t1, t2) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchCenter(t1, t2) {
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
        };
    }

    function handleTouchStart(e) {
        const touches = e.touches;

        if (touches.length === 1) {
            // Single finger - draw/pan depending on tool
            const touch = touches[0];
            touchState.touchStartX = touch.clientX;
            touchState.touchStartY = touch.clientY;

            if (currentTool === 'hand') {
                // Pan mode
                touchState.isTouchPanning = true;
                touchState.lastTouches = [{ x: touch.clientX, y: touch.clientY }];
                canvas.classList.add('panning');
            } else if (currentTool === 'draw' || currentTool === 'erase') {
                // Drawing mode - treat like mouse down
                isDrawing = true;
                isShiftDraw = false;
                saveState();
                const cell = screenToCell(touch.clientX, touch.clientY);
                const key = `${cell.x},${cell.y}`;

                if (currentTool === 'draw') {
                    if (!activeCells.has(key)) {
                        activeCells.set(key, cell);
                    }
                } else {
                    activeCells.delete(key);
                }
                updateRegion();
            } else if (currentTool === 'lassoFill' || currentTool === 'lassoErase') {
                // Lasso mode
                const cell = screenToCell(touch.clientX, touch.clientY);
                if (!isLassoing) {
                    isLassoing = true;
                    lassoShiftMode = false;
                    lassoPoints = [cell];
                    lassoCursor = null;
                    draw();
                } else {
                    // Add point or close lasso
                    const startPoint = lassoPoints[0];
                    const distToStart = Math.hypot(cell.x - startPoint.x, cell.y - startPoint.y);
                    if (lassoPoints.length >= 3 && distToStart < 1.5) {
                        completeLasso();
                    } else {
                        const lastPoint = lassoPoints[lassoPoints.length - 1];
                        if (cell.x !== lastPoint.x || cell.y !== lastPoint.y) {
                            lassoPoints.push(cell);
                        }
                        draw();
                    }
                }
            }
        } else if (touches.length === 2) {
            // Two fingers - pinch to zoom or two-finger pan
            e.preventDefault();
            touchState.isPinching = true;
            touchState.isTouchPanning = false;
            isDrawing = false;  // Cancel any drawing

            touchState.initialPinchDist = getTouchDistance(touches[0], touches[1]);
            touchState.initialZoom = zoom;
            touchState.lastTouches = [
                { x: touches[0].clientX, y: touches[0].clientY },
                { x: touches[1].clientX, y: touches[1].clientY }
            ];
            canvas.classList.add('panning');
        }
    }

    function handleTouchMove(e) {
        const touches = e.touches;

        if (touchState.isPinching && touches.length === 2) {
            e.preventDefault();

            // Pinch zoom
            const currentDist = getTouchDistance(touches[0], touches[1]);
            const scale = currentDist / touchState.initialPinchDist;
            zoom = Math.max(0.1, Math.min(10, touchState.initialZoom * scale));

            // Two-finger pan
            const currentCenter = getTouchCenter(touches[0], touches[1]);
            const lastCenter = getTouchCenter(
                { clientX: touchState.lastTouches[0].x, clientY: touchState.lastTouches[0].y },
                { clientX: touchState.lastTouches[1].x, clientY: touchState.lastTouches[1].y }
            );

            panX += (currentCenter.x - lastCenter.x) / zoom;
            panY += (currentCenter.y - lastCenter.y) / zoom;

            touchState.lastTouches = [
                { x: touches[0].clientX, y: touches[0].clientY },
                { x: touches[1].clientX, y: touches[1].clientY }
            ];

            redrawView();
        } else if (touches.length === 1) {
            const touch = touches[0];

            if (touchState.isTouchPanning) {
                // Single finger pan (hand tool)
                e.preventDefault();
                const dx = touch.clientX - touchState.lastTouches[0].x;
                const dy = touch.clientY - touchState.lastTouches[0].y;
                panX += dx / zoom;
                panY += dy / zoom;
                touchState.lastTouches = [{ x: touch.clientX, y: touch.clientY }];
                redrawView();
            } else if (isDrawing) {
                // Drawing/erasing
                e.preventDefault();
                const cell = screenToCell(touch.clientX, touch.clientY);
                const key = `${cell.x},${cell.y}`;

                if (currentTool === 'draw') {
                    if (!activeCells.has(key)) {
                        activeCells.set(key, cell);
                        updateRegion();
                    }
                } else if (currentTool === 'erase') {
                    if (activeCells.has(key)) {
                        activeCells.delete(key);
                        updateRegion();
                    }
                }
            } else if (isLassoing) {
                // Update lasso cursor preview
                const cell = screenToCell(touch.clientX, touch.clientY);
                lassoCursor = cell;
                draw();
            }
        }
    }

    function handleTouchEnd(e) {
        const touches = e.touches;

        if (touches.length === 0) {
            // All fingers lifted
            touchState.isPinching = false;
            touchState.isTouchPanning = false;
            isDrawing = false;
            canvas.classList.remove('panning');
        } else if (touches.length === 1 && touchState.isPinching) {
            // One finger lifted during pinch - transition to single finger mode
            touchState.isPinching = false;
            const touch = touches[0];
            touchState.lastTouches = [{ x: touch.clientX, y: touch.clientY }];

            // Start panning with remaining finger
            touchState.isTouchPanning = true;
        }
    }

    function handleTouchCancel(e) {
        touchState.isPinching = false;
        touchState.isTouchPanning = false;
        isDrawing = false;
        canvas.classList.remove('panning');
    }

    // Snap to nearest integer lattice point along an integer slope direction
    function snapDirectionToGrid(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;

        if (dx === 0 && dy === 0) {
            return { x: from.x, y: from.y };
        }

        // Find the closest integer point (nx, ny) from 'from' in the direction of 'to'
        // We want nx = from.x + k*sx, ny = from.y + k*sy for some integer k and coprime (sx, sy)

        // Round to nearest integer point
        const targetX = Math.round(to.x);
        const targetY = Math.round(to.y);

        const rdx = targetX - from.x;
        const rdy = targetY - from.y;

        if (rdx === 0 && rdy === 0) {
            return { x: from.x, y: from.y };
        }

        // The point (targetX, targetY) is already on the integer lattice
        return { x: targetX, y: targetY };
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

    function completeLasso() {
        if (lassoPoints.length < 3) {
            lassoPoints = [];
            isLassoing = false;
            draw();
            return;
        }

        saveState();

        // Determine fill mode: shift inverts the tool's default
        let fill;
        if (currentTool === 'lassoFill') {
            fill = !lassoShiftMode;  // shift makes it erase
        } else {
            fill = lassoShiftMode;   // shift makes it fill
        }

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
        isLassoing = false;
        lassoShiftMode = false;
        lassoCursor = null;
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
            const result = sim.stepBinary(stepsPerFrame);  // Use fast binary transfer

            dominoes = result.dominoes;
            totalSteps = result.totalSteps;
            flipCount = result.flipCount;

            updateStats();
            draw();
            update3DView();  // Live 3D updates during Glauber

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
        el.cftpBtn.disabled = !isValid || hasHoles;
        el.doubleDimerBtn.disabled = !isValid || hasHoles;
    }

    function formatNumber(n) {
        // Convert BigInt to Number if needed
        const num = typeof n === 'bigint' ? Number(n) : n;
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
    }

    // GPU CFTP implementation (uses CPU for extremal tilings, GPU for CFTP steps)
    async function runGPU_CFTP(cftpStartTime, originalText) {
        // Get region mask from WASM
        const maskResult = sim.getRegionMask();
        if (maskResult.status !== 'ok') {
            console.error('Failed to get region mask:', maskResult);
            el.cftpSteps.textContent = 'error';
            return false;
        }

        const { maskBytes, minX, maxX, minY, maxY } = maskResult;

        // Initialize CPU CFTP to get correct extremal tilings (min-cut/max-flow)
        el.cftpSteps.textContent = 'CPU extremal';
        el.cftpBtn.textContent = 'CPU ext';
        const cpuInit = sim.initCFTP();
        if (cpuInit.status === 'error') {
            console.error('CPU CFTP init failed:', cpuInit.reason);
            el.cftpSteps.textContent = 'error';
            return false;
        }

        // Get extremal tilings from CPU
        const minState = sim.getCFTPMinState();
        const maxState = sim.getCFTPMaxState();
        console.log('[JS GPU-CFTP] minState edges:', minState.edges?.length || 0);
        console.log('[JS GPU-CFTP] maxState edges:', maxState.edges?.length || 0);
        if (minState.edges && maxState.edges) {
            const minHoriz = minState.edges.filter(e => e.y1 === e.y2).length;
            const minVert = minState.edges.filter(e => e.x1 === e.x2).length;
            const maxHoriz = maxState.edges.filter(e => e.y1 === e.y2).length;
            const maxVert = maxState.edges.filter(e => e.x1 === e.x2).length;
            console.log(`[JS GPU-CFTP] MIN: horiz=${minHoriz}, vert=${minVert}`);
            console.log(`[JS GPU-CFTP] MAX: horiz=${maxHoriz}, vert=${maxVert}`);
            if (minState.edges.length === maxState.edges.length) {
                const same = minState.edges.every((e, i) => {
                    const m = maxState.edges[i];
                    return e.x1 === m.x1 && e.y1 === m.y1 && e.x2 === m.x2 && e.y2 === m.y2;
                });
                console.log(`[JS GPU-CFTP] MIN == MAX? ${same}`);
            }
        }
        if (!minState.edges || !maxState.edges) {
            console.error('Failed to get extremal tilings from CPU');
            el.cftpSteps.textContent = 'error';
            return false;
        }

        // Initialize GPU buffers
        el.cftpSteps.textContent = 'GPU init';
        el.cftpBtn.textContent = 'GPU init';
        const initOk = await gpuEngine.initCFTP(maskBytes, minX, maxX, minY, maxY);
        if (!initOk) {
            console.error('GPU CFTP init failed');
            el.cftpSteps.textContent = 'GPU error';
            return false;
        }

        // Upload CPU-computed extremal tilings to GPU
        await gpuEngine.uploadExtremalTilings(minState.edges, maxState.edges);

        // Epoch doubling loop
        let T = 1;
        const maxEpochs = 30;
        let totalSteps = 0;
        const checkInterval = 1000;

        for (let epoch = 0; epoch < maxEpochs && isCFTPRunning; epoch++) {
            // Reset chains to CPU-computed extremal tilings
            await gpuEngine.resetCFTPChainsWithTilings(minState.edges, maxState.edges);

            el.cftpSteps.textContent = `GPU T=${T}`;
            el.cftpBtn.textContent = `GPU:${T}`;

            const result = await gpuEngine.stepCFTP(T, checkInterval);
            totalSteps += result.stepsRun;

            if (result.coalesced) {
                dominoes = await gpuEngine.finalizeCFTP();
                const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                el.cftpSteps.textContent = `${formatNumber(totalSteps)} GPU (${elapsed}s)`;
                return true;
            }

            T *= 2;

            // Yield to UI
            await new Promise(r => setTimeout(r, 0));
        }

        if (!isCFTPRunning) {
            const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
            el.cftpSteps.textContent = `stopped (${elapsed}s)`;
        } else {
            const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
            el.cftpSteps.textContent = `timeout (${elapsed}s)`;
        }
        return false;
    }

    // CPU CFTP implementation (original WASM path)
    async function runCPU_CFTP(cftpStartTime, originalText) {
        let lastDrawnBlock = -1;

        const initResult = sim.initCFTP();
        console.log('[JS CPU-CFTP] initResult:', initResult);
        if (initResult.status === 'error') {
            console.error('CFTP init error:', initResult.reason);
            el.cftpSteps.textContent = 'error';
            return false;
        }

        // Log extremal tilings info
        const minState = sim.getCFTPMinState();
        const maxState = sim.getCFTPMaxState();
        console.log('[JS CPU-CFTP] minState edges:', minState.edges?.length || 0);
        console.log('[JS CPU-CFTP] maxState edges:', maxState.edges?.length || 0);
        if (minState.edges && maxState.edges) {
            const minHoriz = minState.edges.filter(e => e.y1 === e.y2).length;
            const minVert = minState.edges.filter(e => e.x1 === e.x2).length;
            const maxHoriz = maxState.edges.filter(e => e.y1 === e.y2).length;
            const maxVert = maxState.edges.filter(e => e.x1 === e.x2).length;
            console.log(`[JS CPU-CFTP] MIN: horiz=${minHoriz}, vert=${minVert}`);
            console.log(`[JS CPU-CFTP] MAX: horiz=${maxHoriz}, vert=${maxVert}`);
        }

        el.cftpSteps.textContent = 'T=' + initResult.T;
        el.cftpBtn.textContent = 'T=' + initResult.T;

        while (isCFTPRunning) {
            const res = sim.stepCFTP();

            if (res.status === 'in_progress') {
                el.cftpSteps.textContent = 'T=' + res.T + ' @' + res.sweep;
                el.cftpBtn.textContent = res.T + ':' + res.sweep;

                if (res.T >= 4096) {
                    const currentBlock = Math.floor(res.sweep / 4096);
                    if (currentBlock > lastDrawnBlock) {
                        lastDrawnBlock = currentBlock;
                        const maxData = sim.getCFTPMaxState();
                        if (maxData.dominoes && maxData.dominoes.length > 0) {
                            dominoes = maxData.dominoes;
                            draw();
                        }
                    }
                }
            } else if (res.status === 'coalesced') {
                const finalResult = sim.finalizeCFTP();
                dominoes = finalResult.dominoes || [];
                const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                const totalStepsDisplay = res.totalSteps || res.totalSweeps || 0;
                el.cftpSteps.textContent = formatNumber(totalStepsDisplay) + ' (' + elapsed + 's)';
                return true;
            } else if (res.status === 'not_coalesced') {
                el.cftpSteps.textContent = 'T=' + res.nextT;
                el.cftpBtn.textContent = 'T=' + res.nextT;
                lastDrawnBlock = -1;

                if (res.prevT >= 4096) {
                    const maxData = sim.getCFTPMaxState();
                    if (maxData.dominoes && maxData.dominoes.length > 0) {
                        dominoes = maxData.dominoes;
                        draw();
                    }
                }
            } else if (res.status === 'timeout') {
                const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                el.cftpSteps.textContent = 'timeout (' + elapsed + 's)';
                return false;
            } else {
                const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                el.cftpSteps.textContent = 'error (' + elapsed + 's)';
                console.error('CFTP error:', res);
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Handle cancellation
        if (!isCFTPRunning) {
            const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
            el.cftpSteps.textContent = 'stopped (' + elapsed + 's)';
        }
        return false;
    }

    async function runCFTP() {
        if (!isValid || isCFTPRunning) return;

        isCFTPRunning = true;
        const originalText = el.cftpBtn.textContent;
        el.cftpBtn.disabled = true;
        el.cftpBtn.textContent = 'Init...';
        el.cftpStopBtn.style.display = '';
        el.cftpStatus.style.display = '';
        el.startStopBtn.disabled = true;
        el.cftpSteps.textContent = 'init';

        const cftpStartTime = performance.now();

        // Try GPU path first if available, otherwise fall back to CPU
        if (useWebGPU && gpuEngine && gpuEngine.isReady) {
            await runGPU_CFTP(cftpStartTime, originalText);
        } else {
            await runCPU_CFTP(cftpStartTime, originalText);
        }

        isCFTPRunning = false;
        el.cftpBtn.style.display = '';
        el.cftpBtn.textContent = originalText;
        el.cftpBtn.disabled = hasHoles;
        el.cftpStopBtn.style.display = 'none';
        el.startStopBtn.disabled = !isValid;

        updateStats();
        draw();
        update3DView();  // Update 3D after CFTP
    }

    function stopCFTP() {
        isCFTPRunning = false;
    }

    // ========================================================================
    // Double Dimer / Fluctuations
    // ========================================================================

    function computeHeightFunction(edges) {
        if (!edges || edges.length === 0) return new Map();
        const heights = new Map();
        const edgeSet = new Set();
        for (const e of edges) {
            const x = Math.min(e.x1, e.x2), y = Math.min(e.y1, e.y2);
            edgeSet.add(`${x},${y},${e.x1===e.x2?1:0}`);
        }
        // Start from a vertex of an actual cell (bottom-left corner of first cell)
        let startX, startY;
        for (const [key] of activeCells) {
            const [x, y] = key.split(',').map(Number);
            if (startX === undefined || y < startY || (y === startY && x < startX)) {
                startX = x; startY = y;
            }
        }
        if (startX === undefined) return new Map();
        heights.set(`${startX},${startY}`, 0);
        const queue = [[startX, startY]], visited = new Set([`${startX},${startY}`]);
        while (queue.length > 0) {
            const [cx, cy] = queue.shift(), h = heights.get(`${cx},${cy}`);
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nx = cx + dx, ny = cy + dy, nkey = `${nx},${ny}`;
                if (visited.has(nkey)) continue;
                let adj = false;
                for (let ax = nx-1; ax <= nx; ax++) for (let ay = ny-1; ay <= ny; ay++)
                    if (activeCells.has(`${ax},${ay}`)) adj = true;
                if (!adj) continue;
                let dh = 0;
                if (dx === 1) { dh = edgeSet.has(`${cx},${cy-1},1`) ? ((cx+cy-1)%2===0?-1:1) : ((cx+cy-1)%2===0?1:-1); }
                else if (dx === -1) { dh = edgeSet.has(`${cx-1},${cy-1},1`) ? ((cx-1+cy-1)%2===0?1:-1) : ((cx-1+cy-1)%2===0?-1:1); }
                else if (dy === 1) { dh = edgeSet.has(`${cx-1},${cy},0`) ? ((cx-1+cy)%2===0?-1:1) : ((cx-1+cy)%2===0?1:-1); }
                else { dh = edgeSet.has(`${cx-1},${cy-1},0`) ? ((cx-1+cy-1)%2===0?1:-1) : ((cx-1+cy-1)%2===0?-1:1); }
                heights.set(nkey, h + dh); visited.add(nkey); queue.push([nx, ny]);
            }
        }
        return heights;
    }

    // GPU Double Dimer implementation (4 chains for 2 independent samples)
    // Uses CPU for extremal tilings, GPU for CFTP steps
    async function runGPU_DoubleDimer(t0, restoreFluctuations) {
        // Get region mask from WASM
        const maskResult = sim.getRegionMask();
        if (maskResult.status !== 'ok') {
            console.error('Failed to get region mask:', maskResult);
            el.doubleDimerProgress.textContent = 'error';
            return false;
        }

        const { maskBytes, minX, maxX, minY, maxY } = maskResult;

        // Initialize CPU CFTP to get correct extremal tilings
        el.doubleDimerProgress.textContent = 'CPU extremal';
        const cpuInit = sim.initCFTP();
        if (cpuInit.status === 'error') {
            console.error('CPU CFTP init failed:', cpuInit.reason);
            el.doubleDimerProgress.textContent = 'error';
            return false;
        }

        // Get extremal tilings from CPU
        const minState = sim.getCFTPMinState();
        const maxState = sim.getCFTPMaxState();
        if (!minState.edges || !maxState.edges) {
            console.error('Failed to get extremal tilings from CPU');
            el.doubleDimerProgress.textContent = 'error';
            return false;
        }

        // Initialize GPU Double Dimer CFTP (4 chains)
        el.doubleDimerProgress.textContent = 'GPU init';
        const initOk = await gpuEngine.initDoubleDimerCFTP(maskBytes, minX, maxX, minY, maxY);
        if (!initOk) {
            console.error('GPU Double Dimer init failed');
            el.doubleDimerProgress.textContent = 'GPU error';
            return false;
        }

        // Epoch doubling loop
        let T = 1;
        const maxEpochs = 30;
        const checkInterval = 1000;

        for (let epoch = 0; epoch < maxEpochs && !doubleDimerCancelled; epoch++) {
            // Reset all 4 chains to CPU-computed extremal tilings
            await gpuEngine.resetDoubleDimerChainsWithTilings(minState.edges, maxState.edges);

            el.doubleDimerProgress.textContent = `GPU T=${T}`;

            const result = await gpuEngine.stepDoubleDimerCFTP(T, checkInterval);

            if (result.pair0Coalesced && result.pair1Coalesced) {
                // Both pairs coalesced - get results
                const samples = await gpuEngine.finalizeDoubleDimerCFTP();

                // Convert dominoes to edges format for compatibility
                const edges0 = dominoesToEdges(samples.sample0);
                const edges1 = dominoesToEdges(samples.sample1);

                storedSamples = {
                    sample0: edges0,
                    sample1: edges1,
                    dominoes0: samples.sample0,
                    dominoes1: samples.sample1
                };

                const h0 = computeHeightFunction(edges0);
                const h1 = computeHeightFunction(edges1);
                rawFluctuations = new Map();
                for (const [k, v0] of h0) rawFluctuations.set(k, (v0 - (h1.get(k)||0)) / Math.sqrt(2));

                el.doubleDimerProgress.textContent = `GPU (${((performance.now()-t0)/1000).toFixed(2)}s)`;
                el.minLoopGroup.style.display = el.fluctuationsBtn.style.display = el.resampleBtn.style.display = '';
                resetView(true);

                if (restoreFluctuations) {
                    inFluctuationMode = true; inDoubleDimerMode = false;
                    renderFluctuations();
                } else {
                    inDoubleDimerMode = true; inFluctuationMode = false;
                    renderDoubleDimers();
                }
                return true;
            }

            T *= 2;
            await new Promise(r => setTimeout(r, 0));
        }

        el.doubleDimerProgress.textContent = doubleDimerCancelled ? 'stopped' : 'timeout';
        return false;
    }

    // Convert dominoes array to edges format (includes dir for WASM parser compatibility)
    function dominoesToEdges(dominoes) {
        return dominoes.map(d => ({
            x1: d.x1, y1: d.y1,
            x2: d.x2, y2: d.y2,
            dir: (d.x1 === d.x2) ? 1 : 0  // 0=horizontal, 1=vertical
        }));
    }

    // CPU Double Dimer implementation (original WASM path)
    async function runCPU_DoubleDimer(t0, restoreFluctuations) {
        if (sim.initFluctuationsCFTP().status === 'error') {
            el.doubleDimerProgress.textContent = 'error';
            return false;
        }

        while (!doubleDimerCancelled) {
            const res = sim.stepFluctuationsCFTP();
            if (res.status === 'in_progress') {
                el.doubleDimerProgress.textContent = `T=${res.maxT} (${res.done}/2)`;
            } else if (res.status === 'coalesced') {
                const s0 = sim.exportFluctuationSample(0), s1 = sim.exportFluctuationSample(1);
                storedSamples = { sample0: s0.edges, sample1: s1.edges, dominoes0: s0.dominoes, dominoes1: s1.dominoes };
                const h0 = computeHeightFunction(s0.edges), h1 = computeHeightFunction(s1.edges);
                rawFluctuations = new Map();
                for (const [k, v0] of h0) rawFluctuations.set(k, (v0 - (h1.get(k)||0)) / Math.sqrt(2));
                el.doubleDimerProgress.textContent = `Done (${((performance.now()-t0)/1000).toFixed(2)}s)`;
                el.minLoopGroup.style.display = el.fluctuationsBtn.style.display = el.resampleBtn.style.display = '';
                resetView(true);
                if (restoreFluctuations) {
                    inFluctuationMode = true; inDoubleDimerMode = false;
                    renderFluctuations();
                } else {
                    inDoubleDimerMode = true; inFluctuationMode = false;
                    renderDoubleDimers();
                }
                return true;
            } else {
                if (res.status === 'timeout') el.doubleDimerProgress.textContent = 'timeout';
                return false;
            }
            await new Promise(r => setTimeout(r, 0));
        }
        return false;
    }

    async function runDoubleDimer(restoreFluctuations = false, forceResample = false) {
        if (!isValid || isCFTPRunning) return;
        if (storedSamples && !forceResample) { inDoubleDimerMode = true; inFluctuationMode = false; renderDoubleDimers(); return; }
        isCFTPRunning = true; doubleDimerCancelled = false;
        el.doubleDimerBtn.disabled = el.cftpBtn.disabled = el.startStopBtn.disabled = true;
        el.doubleDimerProgress.textContent = 'init...';
        const t0 = performance.now();

        // Try GPU path first if available, otherwise fall back to CPU
        if (useWebGPU && gpuEngine && gpuEngine.isReady) {
            await runGPU_DoubleDimer(t0, restoreFluctuations);
        } else {
            await runCPU_DoubleDimer(t0, restoreFluctuations);
        }

        resetDoubleDimerUI();
    }

    function resetDoubleDimerUI() { isCFTPRunning = false; el.startStopBtn.disabled = !isValid; el.doubleDimerBtn.disabled = el.cftpBtn.disabled = !isValid || hasHoles; }

    function renderDoubleDimers() {
        if (!storedSamples) return;
        const minLoop = parseInt(el.minLoopInput.value) || 2;
        const json0 = JSON.stringify(storedSamples.sample0);
        const json1 = JSON.stringify(storedSamples.sample1);
        sim.loadDimersForLoops(json0, json1);
        const f = sim.filterLoopsBySize(minLoop);
        const e0 = f.indices0.map(i => storedSamples.sample0[i]), e1 = f.indices1.map(i => storedSamples.sample1[i]);
        const s0 = new Set(e0.map(e => `${Math.min(e.x1,e.x2)},${Math.min(e.y1,e.y2)},${e.x1===e.x2?1:0}`));
        const s1 = new Set(e1.map(e => `${Math.min(e.x1,e.x2)},${Math.min(e.y1,e.y2)},${e.x1===e.x2?1:0}`));

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const cw = rect.width, ch = rect.height;
        // Match draw() coordinate system: centerX + x * size, centerY + y * size
        const ez = zoom * cellSize, ox = cw/2 + panX * zoom, oy = ch/2 + panY * zoom;

        // Clear canvas
        ctx.fillStyle = isDark ? '#1a1a1a' : '#fff';
        ctx.fillRect(0, 0, cw, ch);

        // Fill cells with light background
        ctx.fillStyle = isDark ? '#2a2a2a' : '#f5f5f5';
        for (const [,c] of activeCells) {
            ctx.fillRect(ox + c.x * ez, oy + c.y * ez, ez, ez);
        }

        // Draw grid lines
        ctx.strokeStyle = isDark ? '#444' : '#ddd';
        ctx.lineWidth = 1;
        for (const [,c] of activeCells) {
            const cx = ox + c.x * ez, cy = oy + c.y * ez;
            ctx.strokeRect(cx, cy, ez, ez);
        }

        // Draw boundary
        ctx.strokeStyle = isDark ? '#888' : '#333';
        ctx.lineWidth = 2;
        for (const [,c] of activeCells) {
            const cx = ox + c.x * ez, cy = oy + c.y * ez;
            if (!activeCells.has(`${c.x-1},${c.y}`)) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + ez); ctx.stroke(); }
            if (!activeCells.has(`${c.x+1},${c.y}`)) { ctx.beginPath(); ctx.moveTo(cx + ez, cy); ctx.lineTo(cx + ez, cy + ez); ctx.stroke(); }
            if (!activeCells.has(`${c.x},${c.y-1}`)) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + ez, cy); ctx.stroke(); }
            if (!activeCells.has(`${c.x},${c.y+1}`)) { ctx.beginPath(); ctx.moveTo(cx, cy + ez); ctx.lineTo(cx + ez, cy + ez); ctx.stroke(); }
        }

        // Draw double dimer edges
        const all = new Map();
        for (const e of e0) all.set(`${Math.min(e.x1,e.x2)},${Math.min(e.y1,e.y2)},${e.x1===e.x2?1:0}`, e);
        for (const e of e1) all.set(`${Math.min(e.x1,e.x2)},${Math.min(e.y1,e.y2)},${e.x1===e.x2?1:0}`, e);
        ctx.lineWidth = Math.max(3, ez * 0.12);
        for (const [k, e] of all) {
            ctx.strokeStyle = (s0.has(k) && s1.has(k)) ? (isDark?'#fff':'#000') : s0.has(k) ? '#F44336' : '#2196F3';
            ctx.beginPath(); ctx.moveTo(ox+(e.x1+.5)*ez, oy+(e.y1+.5)*ez); ctx.lineTo(ox+(e.x2+.5)*ez, oy+(e.y2+.5)*ez); ctx.stroke();
        }
    }

    function renderFluctuations() {
        if (!rawFluctuations) return;
        // Auto-scale based on data range
        let minF = Infinity, maxF = -Infinity;
        for (const [,v] of rawFluctuations) { minF = Math.min(minF, v); maxF = Math.max(maxF, v); }
        const range = Math.max(Math.abs(minF), Math.abs(maxF)) || 1;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const cw = rect.width, ch = rect.height;
        ctx.fillStyle = isDark ? '#1a1a1a' : '#fff';
        ctx.fillRect(0, 0, cw, ch);
        // Match draw() coordinate system: centerX + x * size, centerY + y * size
        const ez = zoom * cellSize, ox = cw/2 + panX * zoom, oy = ch/2 + panY * zoom;
        for (const [key] of activeCells) {
            const [x,y] = key.split(',').map(Number);
            let sum=0, cnt=0;
            // Look up fluctuations at cell corners (vertices)
            for (let dx=0;dx<=1;dx++) for (let dy=0;dy<=1;dy++) { const fk=`${x+dx},${y+dy}`; if(rawFluctuations.has(fk)){sum+=rawFluctuations.get(fk);cnt++;} }
            const avg = cnt>0 ? sum/cnt : 0;
            let r,g,b;
            if (avg >= 0) { const t=Math.min(1,avg/range); r=255; g=b=Math.round(255*(1-t)); }
            else { const t=Math.min(1,-avg/range); r=g=Math.round(255*(1-t)); b=255; }
            ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(ox+x*ez, oy+y*ez, ez, ez);
        }
        ctx.strokeStyle = isDark ? '#fff' : '#000'; ctx.lineWidth = 2;
        for (const [,c] of activeCells) {
            const cx = ox+c.x*ez, cy = oy+c.y*ez;
            if (!activeCells.has(`${c.x-1},${c.y}`)) { ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx,cy+ez); ctx.stroke(); }
            if (!activeCells.has(`${c.x+1},${c.y}`)) { ctx.beginPath(); ctx.moveTo(cx+ez,cy); ctx.lineTo(cx+ez,cy+ez); ctx.stroke(); }
            if (!activeCells.has(`${c.x},${c.y-1}`)) { ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+ez,cy); ctx.stroke(); }
            if (!activeCells.has(`${c.x},${c.y+1}`)) { ctx.beginPath(); ctx.moveTo(cx,cy+ez); ctx.lineTo(cx+ez,cy+ez); ctx.stroke(); }
        }
    }

    function renderDimerView() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const cw = rect.width, ch = rect.height;
        // Match draw() coordinate system: centerX + x * size, centerY + y * size
        const ez = zoom * cellSize, ox = cw/2 + panX * zoom, oy = ch/2 + panY * zoom;

        // Clear canvas
        ctx.fillStyle = isDark ? '#1a1a1a' : '#fff';
        ctx.fillRect(0, 0, cw, ch);

        // Fill cells with light background
        ctx.fillStyle = isDark ? '#2a2a2a' : '#f5f5f5';
        for (const [,c] of activeCells) {
            ctx.fillRect(ox + c.x * ez, oy + c.y * ez, ez, ez);
        }

        // Draw grid lines
        ctx.strokeStyle = isDark ? '#444' : '#ddd';
        ctx.lineWidth = 1;
        for (const [,c] of activeCells) {
            const cx = ox + c.x * ez, cy = oy + c.y * ez;
            ctx.strokeRect(cx, cy, ez, ez);
        }

        // Draw boundary
        ctx.strokeStyle = isDark ? '#888' : '#333';
        ctx.lineWidth = 2;
        for (const [,c] of activeCells) {
            const cx = ox + c.x * ez, cy = oy + c.y * ez;
            if (!activeCells.has(`${c.x-1},${c.y}`)) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + ez); ctx.stroke(); }
            if (!activeCells.has(`${c.x+1},${c.y}`)) { ctx.beginPath(); ctx.moveTo(cx + ez, cy); ctx.lineTo(cx + ez, cy + ez); ctx.stroke(); }
            if (!activeCells.has(`${c.x},${c.y-1}`)) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + ez, cy); ctx.stroke(); }
            if (!activeCells.has(`${c.x},${c.y+1}`)) { ctx.beginPath(); ctx.moveTo(cx, cy + ez); ctx.lineTo(cx + ez, cy + ez); ctx.stroke(); }
        }

        // Draw dimer edges from current domino state
        ctx.strokeStyle = isDark ? '#fff' : '#000';
        ctx.lineWidth = Math.max(3, ez * 0.12);
        for (const d of dominoes) {
            // Draw line from center of cell1 to center of cell2
            const x1 = ox + (d.x1 + 0.5) * ez, y1 = oy + (d.y1 + 0.5) * ez;
            const x2 = ox + (d.x2 + 0.5) * ez, y2 = oy + (d.y2 + 0.5) * ez;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
    }

    function clearDoubleDimerState() {
        storedSamples = rawFluctuations = null; inDoubleDimerMode = inFluctuationMode = false;
        el.minLoopGroup.style.display = el.fluctuationsBtn.style.display = el.resampleBtn.style.display = 'none';
        el.doubleDimerProgress.textContent = '';
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
        // Clear any in-progress lasso when switching tools
        if (lassoPoints.length > 0 || isLassoing) {
            lassoPoints = [];
            isLassoing = false;
            lassoCursor = null;
        }

        currentTool = tool;
        el.handTool.classList.toggle('active', tool === 'hand');
        el.drawTool.classList.toggle('active', tool === 'draw');
        el.eraseTool.classList.toggle('active', tool === 'erase');
        el.lassoFillTool.classList.toggle('active', tool === 'lassoFill');
        el.lassoEraseTool.classList.toggle('active', tool === 'lassoErase');

        draw();
    }

    function setupEventListeners() {
        // Canvas events
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        // Touch events for iOS/mobile
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

        // Preset buttons
        el.rectangleBtn.addEventListener('click', () => {
            generateRectangle(parseInt(el.rectWidthInput.value), parseInt(el.rectHeightInput.value));
            resetView();
        });

        el.aztecBtn.addEventListener('click', () => {
            generateAztecDiamond(parseInt(el.aztecNInput.value));
            resetView();
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

        // Double Dimer / Fluctuations
        el.doubleDimerBtn.addEventListener('click', () => runDoubleDimer());
        el.fluctuationsBtn.addEventListener('click', () => {
            if (!rawFluctuations) return;
            inFluctuationMode = true;
            inDoubleDimerMode = false;
            renderFluctuations();
        });
        el.minLoopInput.addEventListener('change', () => {
            if (inDoubleDimerMode) renderDoubleDimers();
        });
        el.resampleBtn.addEventListener('click', () => {
            const wasInFluctuationMode = inFluctuationMode;
            // Don't clear state yet - runDoubleDimer will handle it after new samples are ready
            runDoubleDimer(wasInFluctuationMode, true);  // forceResample=true
        });

        el.scaleUpBtn.addEventListener('click', () => {
            if (!wasmReady || activeCells.size === 0) return;
            const k = parseInt(el.scaleKInput.value, 10) || 2;
            // Scale up: each cell becomes k×k block
            saveState();
            const newCells = new Map();
            for (const [key, cell] of activeCells) {
                const nx = cell.x * k;
                const ny = cell.y * k;
                for (let dx = 0; dx < k; dx++) {
                    for (let dy = 0; dy < k; dy++) {
                        newCells.set(`${nx+dx},${ny+dy}`, {x: nx+dx, y: ny+dy});
                    }
                }
            }
            activeCells.clear();
            for (const [key, v] of newCells) activeCells.set(key, v);
            updateRegion();
            resetView();
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
            resetView();
        });

        // Smooth Scale: scale by 2 while preserving boundary slopes
        // For Aztec diamonds: uses L1-distance to compute proper scaling

        // Smooth Scale: scale by 2 while preserving boundary slopes
        // Universal algorithm: trace boundary as unit edges, double each run's length
        el.smoothScaleBtn.addEventListener('click', () => {
            if (!wasmReady || activeCells.size === 0) return;

            saveState();
            const originalCellCount = activeCells.size;

            // Step 1: Collect ALL boundary unit edges
            const cellSet = new Set(activeCells.keys());
            const edges = [];
            for (const [key, cell] of activeCells) {
                const {x, y} = cell;
                if (!cellSet.has(`${x},${y-1}`)) edges.push({x1: x, y1: y, x2: x+1, y2: y});
                if (!cellSet.has(`${x+1},${y}`)) edges.push({x1: x+1, y1: y, x2: x+1, y2: y+1});
                if (!cellSet.has(`${x},${y+1}`)) edges.push({x1: x+1, y1: y+1, x2: x, y2: y+1});
                if (!cellSet.has(`${x-1},${y}`)) edges.push({x1: x, y1: y+1, x2: x, y2: y});
            }

            if (edges.length === 0) return;

            // Step 2: Build edge map
            const edgeMap = new Map();
            for (const e of edges) {
                const key = `${e.x1},${e.y1}`;
                if (!edgeMap.has(key)) edgeMap.set(key, []);
                edgeMap.get(key).push(e);
            }

            // Step 3: Trace ALL boundary loops as sequences of directed unit edges
            const allLoops = [];
            const usedEdges = new Set();

            for (const startEdge of edges) {
                const startEdgeKey = `${startEdge.x1},${startEdge.y1}-${startEdge.x2},${startEdge.y2}`;
                if (usedEdges.has(startEdgeKey)) continue;

                const loop = [];
                let currentKey = `${startEdge.x1},${startEdge.y1}`;
                const loopStart = currentKey;

                while (true) {
                    const available = edgeMap.get(currentKey);
                    if (!available) break;

                    const nextEdge = available.find(edge => {
                        const ek = `${edge.x1},${edge.y1}-${edge.x2},${edge.y2}`;
                        return !usedEdges.has(ek);
                    });
                    if (!nextEdge) break;

                    usedEdges.add(`${nextEdge.x1},${nextEdge.y1}-${nextEdge.x2},${nextEdge.y2}`);

                    // Record direction: R, L, D, U
                    const dx = nextEdge.x2 - nextEdge.x1;
                    const dy = nextEdge.y2 - nextEdge.y1;
                    const dir = dx === 1 ? 'R' : dx === -1 ? 'L' : dy === 1 ? 'D' : 'U';

                    loop.push({x: nextEdge.x1, y: nextEdge.y1, dir});
                    currentKey = `${nextEdge.x2},${nextEdge.y2}`;

                    if (currentKey === loopStart) break;
                }

                if (loop.length >= 4) allLoops.push(loop);
            }

            if (allLoops.length === 0) {
                console.log('No loops found, falling back to 2x2');
                const newCells = new Map();
                for (const [key, cell] of activeCells) {
                    const nx = cell.x * 2, ny = cell.y * 2;
                    newCells.set(`${nx},${ny}`, {x: nx, y: ny});
                    newCells.set(`${nx+1},${ny}`, {x: nx+1, y: ny});
                    newCells.set(`${nx},${ny+1}`, {x: nx, y: ny+1});
                    newCells.set(`${nx+1},${ny+1}`, {x: nx+1, y: ny+1});
                }
                activeCells.clear();
                for (const [k, v] of newCells) activeCells.set(k, v);
                updateRegion();
                resetView();
                return;
            }

            // Step 4: Group into runs, identify staircases vs flats, scale appropriately
            const allScaledPolygons = allLoops.map((loop, loopIdx) => {
                // Group into runs
                const runs = [];
                let currentDir = loop[0].dir;
                let runStart = {x: loop[0].x, y: loop[0].y};
                let runLength = 1;

                for (let i = 1; i < loop.length; i++) {
                    if (loop[i].dir === currentDir) {
                        runLength++;
                    } else {
                        runs.push({startX: runStart.x, startY: runStart.y, dir: currentDir, length: runLength});
                        currentDir = loop[i].dir;
                        runStart = {x: loop[i].x, y: loop[i].y};
                        runLength = 1;
                    }
                }
                runs.push({startX: runStart.x, startY: runStart.y, dir: currentDir, length: runLength});

                // Merge first and last run if same direction (wrap-around)
                if (runs.length > 1 && runs[0].dir === runs[runs.length - 1].dir) {
                    runs[0].length += runs[runs.length - 1].length;
                    runs[0].startX = runs[runs.length - 1].startX;
                    runs[0].startY = runs[runs.length - 1].startY;
                    runs.pop();
                }

                // Identify staircase sections: consecutive length-1 runs with perpendicular directions
                // Mark each run as part of a staircase or not
                const isHorizontal = d => d === 'R' || d === 'L';
                const isVertical = d => d === 'U' || d === 'D';
                const isPerpendicular = (d1, d2) => (isHorizontal(d1) && isVertical(d2)) || (isVertical(d1) && isHorizontal(d2));

                // Find staircase segments: maximal sequences of length-1 runs with alternating H/V
                const segments = [];
                let i = 0;
                while (i < runs.length) {
                    if (runs[i].length === 1) {
                        // Potential start of staircase
                        let j = i;
                        while (j < runs.length && runs[j].length === 1 &&
                               (j === i || isPerpendicular(runs[j-1].dir, runs[j].dir))) {
                            j++;
                        }
                        // Check wrap-around for staircase continuation
                        let staircaseLen = j - i;
                        if (j === runs.length && i === 0) {
                            // Don't double-count wrap-around, handled separately
                        }
                        if (staircaseLen >= 2) {
                            // It's a staircase section
                            segments.push({type: 'staircase', start: i, end: j, runs: runs.slice(i, j)});
                        } else {
                            // Single length-1 run, treat as flat
                            segments.push({type: 'flat', start: i, end: j, runs: runs.slice(i, j)});
                        }
                        i = j;
                    } else {
                        // Flat section (run length > 1)
                        // Short flats (length 2-3) are corners - keep same length
                        // Long flats (length > 3) get doubled
                        const segType = runs[i].length <= 3 ? 'corner' : 'flat';
                        segments.push({type: segType, start: i, end: i + 1, runs: [runs[i]]});
                        i++;
                    }
                }

                // Count segment types
                let staircaseRuns = 0, cornerRuns = 0, flatRuns = 0;
                for (const seg of segments) {
                    if (seg.type === 'staircase') staircaseRuns += seg.runs.length;
                    else if (seg.type === 'corner') cornerRuns += seg.runs.length;
                    else flatRuns += seg.runs.length;
                }
                console.log(`Loop ${loopIdx}: ${loop.length} edges → ${runs.length} runs (${staircaseRuns} staircase, ${cornerRuns} corner, ${flatRuns} flat)`);

                // Generate scaled polygon
                const scaledPoly = [];
                let cx = runs[0].startX * 2;
                let cy = runs[0].startY * 2;

                for (const seg of segments) {
                    if (seg.type === 'staircase') {
                        // Staircase: repeat the ENTIRE alternating pattern twice
                        // Original: R D R D → Scaled: R D R D R D R D
                        for (let repeat = 0; repeat < 2; repeat++) {
                            for (const run of seg.runs) {
                                const dx = run.dir === 'R' ? 1 : run.dir === 'L' ? -1 : 0;
                                const dy = run.dir === 'D' ? 1 : run.dir === 'U' ? -1 : 0;
                                scaledPoly.push({x: cx, y: cy});
                                cx += dx;
                                cy += dy;
                            }
                        }
                    } else if (seg.type === 'corner') {
                        // Corner (short flat): keep SAME length - these are polygon vertices
                        for (const run of seg.runs) {
                            const dx = run.dir === 'R' ? 1 : run.dir === 'L' ? -1 : 0;
                            const dy = run.dir === 'D' ? 1 : run.dir === 'U' ? -1 : 0;
                            for (let k = 0; k < run.length; k++) {
                                scaledPoly.push({x: cx, y: cy});
                                cx += dx;
                                cy += dy;
                            }
                        }
                    } else {
                        // Flat (long): double the LENGTH of each run
                        for (const run of seg.runs) {
                            const dx = run.dir === 'R' ? 1 : run.dir === 'L' ? -1 : 0;
                            const dy = run.dir === 'D' ? 1 : run.dir === 'U' ? -1 : 0;
                            const newLen = run.length * 2;
                            for (let k = 0; k < newLen; k++) {
                                scaledPoly.push({x: cx, y: cy});
                                cx += dx;
                                cy += dy;
                            }
                        }
                    }
                }

                console.log(`Loop ${loopIdx}: scaled to ${scaledPoly.length} vertices`);
                return scaledPoly;
            });

            // Step 5: Find bounding box
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            for (const poly of allScaledPolygons) {
                for (const v of poly) {
                    minX = Math.min(minX, v.x);
                    maxX = Math.max(maxX, v.x);
                    minY = Math.min(minY, v.y);
                    maxY = Math.max(maxY, v.y);
                }
            }

            // Step 6: Fill using even-odd rule
            function countAllCrossings(px, py) {
                let total = 0;
                for (const poly of allScaledPolygons) {
                    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                        const xi = poly[i].x, yi = poly[i].y;
                        const xj = poly[j].x, yj = poly[j].y;
                        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                            total++;
                        }
                    }
                }
                return total;
            }

            activeCells.clear();
            for (let x = Math.floor(minX); x < Math.ceil(maxX); x++) {
                for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
                    if (countAllCrossings(x + 0.5, y + 0.5) % 2 === 1) {
                        activeCells.set(`${x},${y}`, {x, y});
                    }
                }
            }

            console.log('Smooth scale:', allLoops.length, 'boundary loops');
            console.log('Original cells:', originalCellCount, '→ New cells:', activeCells.size);
            console.log('Ratio:', (activeCells.size / originalCellCount).toFixed(2), '(should be ~4.00)');

            // Make tileable after scaling
            doRepair();
            console.log('After repair:', activeCells.size, 'cells');

            updateRegion();
            resetView();
        });

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
        el.lassoSnapBtn.addEventListener('click', () => {
            el.lassoSnapBtn.classList.toggle('active');
        });

        el.clearBtn.addEventListener('click', () => {
            saveState();
            activeCells.clear();
            // Reset view to default
            zoom = 1.0;
            panX = 0;
            panY = 0;
            updateRegion();
        });

        el.undoBtn.addEventListener('click', undo);
        el.redoBtn.addEventListener('click', redo);

        // Repair function - makes region tileable by adding cells
        function doRepair() {
            if (!wasmReady) return;
            const MAX_REPAIR_ITERATIONS = 1000;
            let totalAdded = 0;
            for (let i = 0; i < MAX_REPAIR_ITERATIONS; i++) {
                const verticesArray = Array.from(activeCells.values());
                const initResult = sim.initFromVertices(verticesArray);
                if (initResult.status === 'valid') {
                    if (totalAdded > 0) console.log('Repair: added', totalAdded, 'cells');
                    return;
                }
                const result = sim.repair();
                if (result.vertices && result.vertices.length > 0) {
                    for (const v of result.vertices) {
                        activeCells.set(`${v.x},${v.y}`, v);
                    }
                    totalAdded += result.vertices.length;
                } else {
                    const dx = [1, -1, 0, 0];
                    const dy = [0, 0, 1, -1];
                    let addedAny = false;
                    for (const [key, cell] of activeCells) {
                        for (let d = 0; d < 4; d++) {
                            const nx = cell.x + dx[d];
                            const ny = cell.y + dy[d];
                            const nkey = `${nx},${ny}`;
                            if (!activeCells.has(nkey)) {
                                activeCells.set(nkey, {x: nx, y: ny});
                                totalAdded++;
                                addedAny = true;
                                break;
                            }
                        }
                        if (addedAny) break;
                    }
                    if (!addedAny) {
                        console.log('Repair stuck after adding', totalAdded, 'cells');
                        return;
                    }
                }
            }
            console.log('Repair max iterations, added', totalAdded, 'cells');
        }

        el.repairBtn.addEventListener('click', () => {
            if (!wasmReady) return;
            saveState();
            doRepair();
            updateRegion();
        });

        // View controls
        el.zoomInBtn.addEventListener('click', () => {
            if (is3DView && renderer3D) {
                renderer3D.zoomIn();
            } else {
                zoom = Math.min(10, zoom * 1.2);
                redrawView();
            }
        });

        el.zoomOutBtn.addEventListener('click', () => {
            if (is3DView && renderer3D) {
                renderer3D.zoomOut();
            } else {
                zoom = Math.max(0.1, zoom / 1.2);
                redrawView();
            }
        });

        el.resetViewBtn.addEventListener('click', () => {
            if (is3DView && renderer3D) {
                renderer3D.resetView();
                update3DView();
            } else {
                resetView(true);
                redrawView();
            }
        });

        el.showGridCheckbox.addEventListener('change', draw);

        // Display options
        el.paletteSelect.addEventListener('change', () => {
            colorPaletteIndex = parseInt(el.paletteSelect.value);
            draw();
            update3DView();
        });

        el.prevPaletteBtn.addEventListener('click', () => {
            colorPaletteIndex = (colorPaletteIndex - 1 + colorPalettes.length) % colorPalettes.length;
            el.paletteSelect.value = colorPaletteIndex;
            draw();
            update3DView();
        });

        el.nextPaletteBtn.addEventListener('click', () => {
            colorPaletteIndex = (colorPaletteIndex + 1) % colorPalettes.length;
            el.paletteSelect.value = colorPaletteIndex;
            draw();
            update3DView();
        });

        el.permuteColorsBtn.addEventListener('click', () => {
            colorPermutation = (colorPermutation + 1) % 6;
            draw();
            update3DView();
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

        // 3D View Controls
        el.toggle3DBtn.addEventListener('click', () => {
            const switching3D = !is3DView;
            setViewMode(switching3D);
            // Reset 2D view when switching back to 2D
            if (!switching3D) {
                resetView();
            }
        });

        el.perspectiveBtn.addEventListener('click', () => {
            if (renderer3D) {
                const isPerspective = renderer3D.togglePerspective();
                el.perspectiveBtn.textContent = isPerspective ? '📐' : '🎯';
                el.perspectiveBtn.title = isPerspective ? 'Perspective view (click for isometric)' : 'Isometric view (click for perspective)';
                renderer3D.resetView();
            }
        });

        el.preset3DBtn.addEventListener('click', () => {
            if (renderer3D) {
                const preset = renderer3D.cyclePreset();
                el.preset3DBtn.textContent = preset.icon;
                el.preset3DBtn.title = `Style: ${preset.name}`;
                // Re-render with new preset materials
                if (isValid && dominoes.length > 0) {
                    const colors = getColors();
                    renderer3D.renderDominoes(dominoes, colors);
                    renderer3D.resetView();
                }
            }
        });

        // Domino/Dimer view toggle
        el.dominoViewBtn.addEventListener('click', () => {
            showDimerView = false;
            // If in double dimer mode, copy one sample to dominoes before clearing
            if (storedSamples && storedSamples.dominoes0) {
                dominoes = storedSamples.dominoes0;
            }
            clearDoubleDimerState();  // Exit double dimer mode if active
            el.dominoViewBtn.classList.add('active');
            el.dimerViewBtn.classList.remove('active');
            redrawView();
        });

        el.dimerViewBtn.addEventListener('click', () => {
            showDimerView = true;
            // If in double dimer mode, copy one sample to dominoes before clearing
            if (storedSamples && storedSamples.dominoes0) {
                dominoes = storedSamples.dominoes0;
            }
            clearDoubleDimerState();  // Exit double dimer mode if active
            el.dimerViewBtn.classList.add('active');
            el.dominoViewBtn.classList.remove('active');
            redrawView();
        });

        el.rotateLeftBtn.addEventListener('click', () => {
            if (renderer3D && is3DView) {
                renderer3D.rotateHorizontal(-15);
                updateHoleOverlayPositions();
            }
        });

        el.rotateRightBtn.addEventListener('click', () => {
            if (renderer3D && is3DView) {
                renderer3D.rotateHorizontal(15);
                updateHoleOverlayPositions();
            }
        });

        el.autoRotateBtn.addEventListener('click', () => {
            if (renderer3D && is3DView) {
                renderer3D.autoRotate = !renderer3D.autoRotate;
                el.autoRotateBtn.classList.toggle('active', renderer3D.autoRotate);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            // Escape to cancel lasso
            if (e.key === 'Escape') {
                if (lassoPoints.length > 0 || isLassoing) {
                    lassoPoints = [];
                    isLassoing = false;
                    lassoCursor = null;
                    draw();
                }
                return;
            }

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
    draw();  // Draw empty canvas

})();
</script>
