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
  <li><strong>Scale Up Region</strong>: Double the size of your current region while preserving its shape</li>
  <li><strong>Make Tileable</strong>: If your region is invalid, this adds the minimum number of triangles from the exterior boundary to make it tileable. For each unmatched triangle, it finds an adjacent exterior neighbor of the opposite color.</li>
</ul>

<p>A region is <strong>tileable</strong> (valid) if and only if it has equal numbers of black and white triangles AND they can be perfectly matched. The simulator uses <strong>Dinic's maximum flow algorithm</strong> to find a perfect matching when one exists.</p>

<p><strong>Sampling methods:</strong></p>
<ul>
  <li><strong>Glauber dynamics</strong> (Start/Stop): Markov chain Monte Carlo that performs local "flips" of three lozenges around hexagonal vertices. Converges to the uniform distribution over time. The <strong>q parameter</strong> biases the distribution toward higher (q&gt;1) or lower (q&lt;1) volume configurations.</li>
  <li><strong>Perfect Sample (CFTP)</strong>: <strong>Coupling From The Past</strong> algorithm that produces an <em>exact</em> sample from the uniform (or q-weighted) distribution in finite time, with no burn-in period required. It works by running coupled Markov chains backward in time until they coalesce. Early coalescence detection checks every 1000 steps for faster termination.</li>
</ul>

<p><strong>Periodic Weights:</strong></p>
<p>Enable <strong>periodic weights</strong> to use position-dependent q values arranged in a k×k matrix (k=1,2,3,4,5). At position (n,j) on the triangular lattice, the flip probability uses q<sub>n mod k, j mod k</sub>. Two presets are provided:</p>
<ul>
  <li><strong>2×2</strong>: Default preset with values [[1, 100], [0.003333, 3]]</li>
  <li><strong>Nienhuis 3×3</strong>: Based on <a href="https://iopscience.iop.org/article/10.1088/0305-4470/17/18/025" target="_blank">Nienhuis (1984)</a> sublattice pattern with q values following (n-j) mod 3</li>
</ul>

<p>The simulation runs entirely in your browser using WebAssembly with optimized Glauber dynamics using pre-computed caches and Lemire's fast bounded random.</p>

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
  #three-container {
    width: 100%;
    max-width: 900px;
    height: 600px;
    border: 1px solid #ccc;
    display: none;
    margin: 0 auto;
    background: #ffffff;
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
<script src="/js/three.min.js"></script>
<script src="/js/OrbitControls.js"></script>
<script src="/js/2025-11-28-ultimate-lozenge.js"></script>

<!-- Main controls -->
<div style="max-width: 900px; margin: 0 auto; padding: 8px;">

<!-- Preset Shapes -->
<div class="control-group">
  <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
    <button id="hexagonBtn">Hexagon</button>
    <span class="param-group"><span class="param-label">a</span><input type="number" class="param-input" id="hexAInput" value="4" min="1" max="30"></span>
    <span class="param-group"><span class="param-label">b</span><input type="number" class="param-input" id="hexBInput" value="3" min="1" max="30"></span>
    <span class="param-group"><span class="param-label">c</span><input type="number" class="param-input" id="hexCInput" value="5" min="1" max="30"></span>
  </div>
</div>

<!-- Simulation Controls -->
<div class="control-group">
  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
    <button id="startStopBtn" class="primary" disabled>Start</button>
    <button id="cftpBtn" class="cftp" title="Coupling From The Past - Perfect Sample" disabled>Perfect Sample</button>
    <button id="cftpStopBtn" style="display: none; background: #dc3545; color: white; border-color: #dc3545;">Stop CFTP</button>
    <button id="doubleMeshBtn" title="Double the region size">Scale Up Region</button>
    <button id="halveMeshBtn" title="Halve the region size">Scale Down Region</button>
    <div style="display: flex; align-items: center; gap: 6px;">
      <span style="font-size: 12px; color: #666;">Speed</span>
      <input type="range" id="speedSlider" min="0" max="100" value="29" style="width: 100px;">
      <input type="number" id="speedInput" class="param-input" value="100" min="1" max="100000000" style="width: 80px;">
      <span style="font-size: 11px; color: #888;">/s</span>
    </div>
    <span class="param-group"><span class="param-label">q</span><input type="number" class="param-input" id="qInput" value="1" min="0" max="10" step="0.01" style="width: 60px;"></span>
  </div>
</div>

<!-- Periodic Weights -->
<details id="periodic-weights-details">
<summary>Periodic Weights</summary>
<div class="content">
  <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 8px;">
    <div style="display: flex; align-items: center; gap: 4px;">
      <input type="checkbox" id="usePeriodicWeightsCheckbox">
      <label for="usePeriodicWeightsCheckbox" style="font-size: 12px; color: #555;">Enable periodic weights</label>
    </div>
    <div style="display: flex; align-items: center; gap: 4px;">
      <label for="periodicKSelect" style="font-size: 12px; color: #555;">Period k:</label>
      <select id="periodicKSelect" style="padding: 2px 6px; font-size: 12px;">
        <option value="1">1</option>
        <option value="2" selected>2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
    </div>
    <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
      <span style="font-size: 12px; color: #555;">Presets:</span>
      <button id="preset2x2Btn" style="padding: 2px 8px; font-size: 11px; border: 1px solid #999; border-radius: 3px; background: #f5f5f5; cursor: pointer;">Charlier-Duits-Kuijlaars 2x2</button>
      <span id="duits2x2Container" style="display: none; align-items: center; gap: 4px;">
        <label for="duitsAlpha" style="font-size: 11px; color: #555;">α:</label>
        <input type="number" id="duitsAlpha" value="2" step="0.1" min="0.01" style="width: 50px; padding: 2px 4px; font-size: 11px; border: 1px solid #999; border-radius: 3px;">
        <a href="https://onlinelibrary.wiley.com/doi/full/10.1111/sapm.12339" target="_blank" style="font-size: 11px;">[paper]</a>
      </span>
      <button id="presetNienhuis3x3Btn" style="padding: 2px 8px; font-size: 11px; border: 1px solid #999; border-radius: 3px; background: #f5f5f5; cursor: pointer;">Nienhuis-Hilhorst-Blöte 3x3</button>
      <span id="nienhuis3x3AlphaContainer" style="display: none; align-items: center; gap: 4px;">
        <label for="nienhuis3x3Alpha" style="font-size: 11px; color: #555;">α:</label>
        <input type="number" id="nienhuis3x3Alpha" value="2" min="0.01" step="0.1" style="width: 60px; padding: 2px 4px; font-size: 11px; border: 1px solid #999; border-radius: 3px;">
        <a href="https://iopscience.iop.org/article/10.1088/0305-4470/17/18/025" target="_blank" style="font-size: 11px;">[paper]</a>
      </span>
    </div>
  </div>
  <div id="periodicWeightsMatrix" style="display: inline-grid; gap: 4px;"></div>
  <div style="font-size: 13px; color: #333; margin-top: 8px;">
    At position (n,j), uses q<sub>n mod k, j mod k</sub> · <strong>Product: <span id="periodicQProduct">1</span></strong>
  </div>
</div>
</details>

<!-- Stats Row -->
<div class="control-group">
  <div class="stats-inline">
    <div class="stat"><span class="stat-label">Black</span><span class="stat-value" id="blackCount">0</span></div>
    <div class="stat"><span class="stat-label">White</span><span class="stat-value" id="whiteCount">0</span></div>
    <div class="stat"><span class="stat-label">Dimers</span><span class="stat-value" id="dimerCount">0</span></div>
    <div class="stat"><span class="stat-label">Steps</span><span class="stat-value" id="stepCount">0</span></div>
    <div class="stat"><span class="stat-label">CFTP</span><span class="stat-value" id="cftpSteps">-</span></div>
  </div>
</div>

</div>

<!-- Canvas Container with overlay -->
<div id="canvas-container" style="position: relative; max-width: 900px; margin: 0 auto;">
  <!-- View Toggle overlay -->
  <div id="view-overlay" style="position: absolute; top: 8px; right: 8px; z-index: 100;">
    <button id="toggle3DBtn" style="padding: 4px 12px; border: 2px solid #1976d2; border-radius: 6px; background: white; color: #1976d2; font-weight: 500; cursor: pointer;">3D</button>
  </div>

  <!-- Canvas -->
  <canvas id="lozenge-canvas"></canvas>

  <!-- 3D Container -->
  <div id="three-container"></div>
</div>

<!-- Controls below canvas -->
<div style="max-width: 900px; margin: 0 auto; padding: 8px;">

<!-- Drawing Tools -->
<div class="control-group">
  <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
    <div class="tool-toggle">
      <button id="drawBtn" class="active">Draw</button>
      <button id="eraseBtn">Erase</button>
    </div>
    <div class="tool-toggle">
      <button id="lassoFillBtn" title="Click to add points, click near start to close">Lasso Fill</button>
      <button id="lassoEraseBtn" title="Click to add points, click near start to close">Lasso Erase</button>
      <button id="lassoSnapBtn" class="active" title="Snap to triangular grid">Snap</button>
    </div>
    <button id="resetBtn">Clear</button>
    <button id="undoBtn" title="Undo (Ctrl+Z)">Undo</button>
    <button id="redoBtn" title="Redo (Ctrl+Y)">Redo</button>
    <button id="repairBtn" title="Add triangles to make region tileable" disabled>Make Tileable</button>
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
    <div style="display: flex; align-items: center; gap: 4px;">
      <input type="checkbox" id="autoRotateCheckbox">
      <label for="autoRotateCheckbox" style="font-size: 12px; color: #555;">Auto-rotate (3D)</label>
    </div>
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
    <div style="display: flex; align-items: center; gap: 4px;">
      <input type="checkbox" id="showGridCheckbox" checked>
      <label for="showGridCheckbox" style="font-size: 12px; color: #555;">Grid</label>
    </div>
    <div style="display: flex; align-items: center; gap: 4px;">
      <input type="checkbox" id="rotateCheckbox">
      <label for="rotateCheckbox" style="font-size: 12px; color: #555;">Rotate Canvas 90°</label>
    </div>
  </div>
</div>

<!-- Limit Shape -->
<div class="control-group">
  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
    <button id="averageBtn" class="cftp" disabled>Get Averaged Sample</button>
    <span class="param-group"><span class="param-label">Samples</span><input type="number" class="param-input" id="avgSamplesInput" value="10" min="1" max="1000" style="width: 60px;"></span>
    <button id="avgStopBtn" style="display: none; background: #dc3545; color: white; border-color: #dc3545;">Stop</button>
    <span id="avgProgress" style="font-size: 12px; color: #666;"></span>
    <button id="fluctuationsBtn" class="cftp" disabled>Fluctuations</button>
    <span id="fluctProgress" style="font-size: 12px; color: #666;"></span>
    <span style="display: flex; align-items: center; gap: 2px;">
      <label for="fluctScaleInput" style="font-size: 12px; color: #555;">×</label>
      <input type="number" id="fluctScaleInput" value="10" min="1" max="100" step="1" style="width: 50px; padding: 2px 4px; font-size: 11px;">
    </span>
  </div>
</div>

<!-- Export -->
<div class="control-group">
  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
    <button id="export-png">PNG</button>
    <span style="font-size: 11px; color: #666;">Quality:</span>
    <input type="range" id="export-quality" min="0" max="100" value="85" style="width: 60px;">
    <span id="export-quality-val" style="font-size: 11px; color: #1976d2;">85</span>
    <button id="export-pdf">PDF</button>
    <button id="export-height-csv">Height CSV</button><button id="height-csv-info" style="padding: 0 6px; margin-left: -12px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 50%; font-size: 11px; cursor: pointer;">?</button>
    <button id="export-height-mma">Copy Height as Mathematica Array</button><button id="height-mma-info" style="padding: 0 6px; margin-left: -12px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 50%; font-size: 11px; cursor: pointer;">?</button>
    <button id="export-json">Export Shape</button>
    <button id="import-json">Import Shape</button>
    <input type="file" id="import-json-file" accept=".json" style="display: none;">
  </div>
  <div id="height-csv-info-box" style="display: none; margin-top: 8px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: monospace; white-space: pre-wrap; max-width: 600px;">Height CSV Coordinates:

• n, j: Integer lattice coordinates on the triangular grid
• x, y: World coordinates (floating point)
• h: Height function value at vertex (n, j)

Coordinate System:
  The angle between n and j axes is 60°

  n-direction: horizontal + slight upward tilt
    (vector: (1, 1/√3), angle 30° from horizontal)

  j-direction: purely vertical
    (vector: (0, 2/√3))

Conversion to world (x, y):
  x = n
  y = n/√3 + j × 2/√3

Triangles indexed by (n, j, type):
  Type 1 (black ▶): vertices (n,j), (n,j-1), (n+1,j-1)
  Type 2 (white ◀): vertices (n,j), (n+1,j), (n+1,j-1)

The height h is defined on vertices of the triangular lattice
(equivalently, faces of the dual hexagonal grid).</div>
  <div id="height-mma-info-box" style="display: none; margin-top: 8px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: monospace; white-space: pre-wrap; max-width: 600px;">Mathematica Plotting Code:

After pasting, assign to A and run:

pts2D = A[[All, {1, 2}]];
mesh = DelaunayMesh[pts2D];
Graphics3D[{EdgeForm[Black],
  GraphicsComplex[
    MapThread[Append, {pts2D, A[[All, 3]]}],
    {Polygon[MeshCells[mesh, 2][[All, 1]]]}]
}, Boxed -> False]</div>
</div>

</div>

<script>
Module.onRuntimeInitialized = function() {
    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);

    function getVertex(n, j) {
        return { x: n, y: slope * n + j * deltaC };
    }

    // ========================================================================
    // HEIGHT FUNCTION COMPUTATION
    // ========================================================================
    function computeHeightFunction(dimers) {
        // Vertex keys for each dimer type
        const getVertexKeys = (dimer) => {
            const { bn, bj, t } = dimer;
            if (t === 0) {
                return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
            } else if (t === 1) {
                return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
            } else {
                return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
            }
        };

        // Height patterns (relative z-heights of the 4 vertices)
        const getHeightPattern = (t) => {
            if (t === 0) return [0, 0, 0, 0];
            if (t === 1) return [1, 0, 0, 1];
            return [1, 1, 0, 0];
        };

        // Build Vertex-to-Dimer Map
        const vertexToDimers = new Map();
        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            for (const [n, j] of verts) {
                const key = `${n},${j}`;
                if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                vertexToDimers.get(key).push(dimer);
            }
        }

        // BFS to calculate Height Function h(n,j)
        const heights = new Map();
        if (dimers.length > 0) {
            const firstDimer = dimers[0];
            const firstVerts = getVertexKeys(firstDimer);
            const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
            heights.set(startKey, 0);

            const queue = [startKey];
            const visited = new Set();

            while (queue.length > 0) {
                const currentKey = queue.shift();
                if (visited.has(currentKey)) continue;
                visited.add(currentKey);

                const currentH = heights.get(currentKey);
                const [cn, cj] = currentKey.split(',').map(Number);

                for (const dimer of vertexToDimers.get(currentKey) || []) {
                    const verts = getVertexKeys(dimer);
                    const pattern = getHeightPattern(dimer.t);

                    // Find index of current vertex in this dimer
                    let myIdx = -1;
                    for (let i = 0; i < 4; i++) {
                        if (verts[i][0] === cn && verts[i][1] === cj) {
                            myIdx = i;
                            break;
                        }
                    }

                    if (myIdx >= 0) {
                        for (let i = 0; i < 4; i++) {
                            const [vn, vj] = verts[i];
                            const vkey = `${vn},${vj}`;
                            if (!heights.has(vkey)) {
                                const newH = currentH + (pattern[i] - pattern[myIdx]);
                                heights.set(vkey, newH);
                                queue.push(vkey);
                            }
                        }
                    }
                }
            }
        }

        return heights;
    }

    // ========================================================================
    // RECONSTRUCT DIMERS FROM HEIGHT FUNCTION
    // ========================================================================
    function reconstructDimersFromHeights(heights, blackTriangles, whiteTriangles) {
        // Build set of white triangles for lookup
        const whiteSet = new Set();
        for (const w of whiteTriangles) {
            whiteSet.add(`${w.n},${w.j}`);
        }

        const dimers = [];

        // For each black triangle, determine which white neighbor it pairs with
        for (const black of blackTriangles) {
            const bn = black.n;
            const bj = black.j;

            // Get heights at relevant vertices
            const getH = (n, j) => heights.get(`${n},${j}`) || 0;

            // Check each possible dimer type
            // Type 0: pairs with white (bn, bj)
            // Vertices: [bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]
            // All should have same height (pattern [0,0,0,0])
            const h0_v0 = getH(bn, bj);
            const h0_v1 = getH(bn + 1, bj);
            const h0_v2 = getH(bn + 1, bj - 1);
            const h0_v3 = getH(bn, bj - 1);
            const err0 = whiteSet.has(`${bn},${bj}`) ?
                Math.abs(h0_v0 - h0_v1) + Math.abs(h0_v1 - h0_v2) + Math.abs(h0_v2 - h0_v3) : Infinity;

            // Type 1: pairs with white (bn, bj-1)
            // Vertices: [bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]
            // Pattern [1, 0, 0, 1]: v0,v3 are 1 higher than v1,v2
            const h1_v0 = getH(bn, bj);
            const h1_v1 = getH(bn + 1, bj - 1);
            const h1_v2 = getH(bn + 1, bj - 2);
            const h1_v3 = getH(bn, bj - 1);
            const err1 = whiteSet.has(`${bn},${bj - 1}`) ?
                Math.abs(h1_v0 - h1_v3) + Math.abs(h1_v1 - h1_v2) + Math.abs((h1_v0 - h1_v1) - 1) : Infinity;

            // Type 2: pairs with white (bn-1, bj)
            // Vertices: [bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]
            // Pattern [1, 1, 0, 0]: v0,v1 are 1 higher than v2,v3
            const h2_v0 = getH(bn - 1, bj);
            const h2_v1 = getH(bn, bj);
            const h2_v2 = getH(bn + 1, bj - 1);
            const h2_v3 = getH(bn, bj - 1);
            const err2 = whiteSet.has(`${bn - 1},${bj}`) ?
                Math.abs(h2_v0 - h2_v1) + Math.abs(h2_v2 - h2_v3) + Math.abs((h2_v0 - h2_v2) - 1) : Infinity;

            // Choose type with minimum error
            let bestType = 0;
            let minErr = err0;
            if (err1 < minErr) { bestType = 1; minErr = err1; }
            if (err2 < minErr) { bestType = 2; minErr = err2; }

            // Determine white triangle coords based on type
            let wn, wj;
            if (bestType === 0) { wn = bn; wj = bj; }
            else if (bestType === 1) { wn = bn; wj = bj - 1; }
            else { wn = bn - 1; wj = bj; }

            dimers.push({ bn, bj, wn, wj, t: bestType });
        }

        return dimers;
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
            this.setPeriodicQBiasWasm = Module.cwrap('setPeriodicQBias', null, ['number', 'number']);
            this.setPeriodicKWasm = Module.cwrap('setPeriodicK', null, ['number']);
            this.setUsePeriodicWeightsWasm = Module.cwrap('setUsePeriodicWeights', null, ['number']);
            this.runCFTPWasm = Module.cwrap('runCFTP', 'number', []);
            this.initCFTPWasm = Module.cwrap('initCFTP', 'number', []);
            this.stepCFTPWasm = Module.cwrap('stepCFTP', 'number', []);
            this.finalizeCFTPWasm = Module.cwrap('finalizeCFTP', 'number', []);
            this.exportCFTPMaxDimersWasm = Module.cwrap('exportCFTPMaxDimers', 'number', []);
            this.exportCFTPMinDimersWasm = Module.cwrap('exportCFTPMinDimers', 'number', []);
            this.repairRegionWasm = Module.cwrap('repairRegion', 'number', []);
            this.freeStringWasm = Module.cwrap('freeString', null, ['number']);

            this.totalSteps = 0;
            this.flipCount = 0;
        }

        setQBias(q) { this.setQBiasWasm(q); }
        setPeriodicQBias(values, k) {
            // values is a flat array of k*k doubles
            const dataPtr = Module._malloc(values.length * 8);
            for (let i = 0; i < values.length; i++) {
                Module.setValue(dataPtr + i * 8, values[i], 'double');
            }
            this.setPeriodicQBiasWasm(dataPtr, k);
            Module._free(dataPtr);
        }
        setPeriodicK(k) { this.setPeriodicKWasm(k); }
        setUsePeriodicWeights(use) { this.setUsePeriodicWeightsWasm(use ? 1 : 0); }

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

        getCFTPMaxDimers() {
            const ptr = this.exportCFTPMaxDimersWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        getCFTPMinDimers() {
            const ptr = this.exportCFTPMinDimersWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
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

    // Snap world coordinates to nearest lattice vertex
    function snapToLattice(worldPos) {
        const lattice = worldToLattice(worldPos.x, worldPos.y);
        return getVertex(lattice.n, lattice.j);
    }

    // Snap direction to nearest triangular grid axis if within threshold
    // Returns a snapped endpoint given start and raw end positions
    function snapDirectionToGrid(startPos, endPos, angleThreshold = 15) {
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01) return endPos;

        // Current angle in degrees
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // Grid directions in world coordinates (6 directions)
        // n-axis: (1, slope), j-axis: (0, deltaC), diagonal: (1, slope - deltaC)
        const gridAngles = [
            Math.atan2(slope, 1) * 180 / Math.PI,           // +n direction
            Math.atan2(-slope, -1) * 180 / Math.PI,         // -n direction
            90,                                              // +j direction (straight up)
            -90,                                             // -j direction (straight down)
            Math.atan2(slope - deltaC, 1) * 180 / Math.PI,  // +n-j diagonal
            Math.atan2(deltaC - slope, -1) * 180 / Math.PI  // -n+j diagonal
        ];

        // Find closest grid angle
        let closestAngle = angle;
        let minDiff = Infinity;
        for (const ga of gridAngles) {
            let diff = Math.abs(angle - ga);
            if (diff > 180) diff = 360 - diff;
            if (diff < minDiff) {
                minDiff = diff;
                closestAngle = ga;
            }
        }

        // Only snap if within threshold
        if (minDiff <= angleThreshold) {
            const radians = closestAngle * Math.PI / 180;
            return {
                x: startPos.x + dist * Math.cos(radians),
                y: startPos.y + dist * Math.sin(radians)
            };
        }

        return endPos;
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

    // Scale mesh DOWN using segment-based boundary halving
    // Instead of scaling vertices (which causes distortion), we:
    // 1. Parse boundary into directional segments
    // 2. Remove length-1 segments, halve the rest
    // 3. Reconstruct and rasterize
    function halveMesh(triangles) {
        if (triangles.size === 0) return new Map();

        if (!sim.boundaries || sim.boundaries.length === 0) {
            console.warn('No valid boundary available. The shape must be valid (tilable) to be halved.');
            return triangles;
        }

        // Convert all boundaries from World (x,y) to Lattice (n,j) integers
        const latticeBoundaries = sim.boundaries.map(b => b.map(v => worldToLattice(v.x, v.y)));

        // Find outer boundary (largest bounding box diagonal)
        let outerIdx = 0;
        let maxDiag = -1;
        latticeBoundaries.forEach((b, i) => {
            let mn = Infinity, mxn = -Infinity, mj = Infinity, mxj = -Infinity;
            for (const v of b) {
                mn = Math.min(mn, v.n); mxn = Math.max(mxn, v.n);
                mj = Math.min(mj, v.j); mxj = Math.max(mxj, v.j);
            }
            const diag = (mxn - mn) ** 2 + (mxj - mj) ** 2;
            if (diag > maxDiag) { maxDiag = diag; outerIdx = i; }
        });

        // Process a single boundary into halved segments
        function halveBoundary(latticePoints) {
            if (latticePoints.length < 2) return [];

            // 1. Parse into segments (runs of consecutive same-direction edges)
            const segments = [];
            let i = 0;
            while (i < latticePoints.length) {
                const curr = latticePoints[i];
                const next = latticePoints[(i + 1) % latticePoints.length];
                const dn = next.n - curr.n;
                const dj = next.j - curr.j;

                // Count consecutive edges in same direction
                let length = 1;
                let k = i + 1;
                while (k < latticePoints.length) {
                    const p1 = latticePoints[k];
                    const p2 = latticePoints[(k + 1) % latticePoints.length];
                    if (p2.n - p1.n === dn && p2.j - p1.j === dj) {
                        length++;
                        k++;
                    } else break;
                }
                segments.push({ dn, dj, length });
                i = k;
            }

            // 2. Halve segments: remove length-1, halve others with round()
            const halvedSegments = [];
            for (const seg of segments) {
                if (seg.length >= 2) {
                    halvedSegments.push({
                        dn: seg.dn,
                        dj: seg.dj,
                        length: Math.round(seg.length / 2)
                    });
                }
                // length-1 segments are dropped
            }

            if (halvedSegments.length === 0) return [];

            // 3. Find centroid of original to anchor the halved boundary
            let cenN = 0, cenJ = 0;
            for (const v of latticePoints) { cenN += v.n; cenJ += v.j; }
            const anchorN = Math.round(cenN / latticePoints.length);
            const anchorJ = Math.round(cenJ / latticePoints.length);

            // 4. Reconstruct boundary vertices from halved segments
            const newVertices = [];
            let n = anchorN, j = anchorJ;
            for (const seg of halvedSegments) {
                for (let m = 0; m < seg.length; m++) {
                    newVertices.push(getVertex(n, j));
                    n += seg.dn;
                    j += seg.dj;
                }
            }
            return newVertices;
        }

        const scaledBoundaries = latticeBoundaries.map(halveBoundary);
        const scaledOuter = scaledBoundaries[outerIdx];
        const scaledHoles = scaledBoundaries.filter((_, i) => i !== outerIdx && scaledBoundaries[i].length > 0);

        if (scaledOuter.length < 3) {
            console.warn('Region too small to halve (all segments were length 1).');
            return triangles;
        }

        // Rasterization: Fill the new geometry
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of scaledOuter) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }

        const newTriangles = new Map();

        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {

                // Check Type 1 (Black/Right-Facing)
                const rc = getRightTriangleCentroid(n, j);
                if (pointInPolygonPreset(rc.x, rc.y, scaledOuter)) {
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

                // Check Type 2 (White/Left-Facing)
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
            this.showGrid = true;
            this.rotated = false;
            this.usePeriodicWeights = false;
            this.periodicK = 2;
            this.periodicQ = [
                [1, 100],
                [0.003333, 3]
            ];
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
            if (this.rotated) {
                return [centerX + y * scale, centerY + x * scale];
            }
            return [centerX + x * scale, centerY - y * scale];
        }

        fromCanvas(cx, cy, centerX, centerY, scale) {
            if (this.rotated) {
                const y = (cx - centerX) / scale;
                const x = (cy - centerY) / scale;
                return { x, y };
            }
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
            // Skip coloring triangles in dimer view for large polygons (>1000 black triangles)
            const skipTriangleColoring = this.showDimerView && sim.blackTriangles && sim.blackTriangles.length > 1000;
            if (!isValid || (this.showDimerView && !skipTriangleColoring)) {
                this.drawActiveTriangles(ctx, activeTriangles, centerX, centerY, scale, isValid);
            }

            // Draw dimers/lozenges if valid
            if (isValid && sim.dimers.length > 0) {
                if (this.showDimerView) {
                    this.drawDimerView(ctx, sim, centerX, centerY, scale, activeTriangles);
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
            if (!this.showGrid) return;

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

        drawDimerView(ctx, sim, centerX, centerY, scale, activeTriangles) {
            // Draw dimer edges
            ctx.strokeStyle = '#000';
            // Use thinner lines for large polygons (>1000 black triangles)
            const isLargePolygon = sim.blackTriangles && sim.blackTriangles.length > 1000;
            ctx.lineWidth = isLargePolygon ? 1 : 3;
            for (const dimer of sim.dimers) {
                const bc = sim.blackTriangles.find(b => b.n === dimer.bn && b.j === dimer.bj);
                const wc = sim.whiteTriangles.find(w => w.n === dimer.wn && w.j === dimer.wj);
                if (bc && wc) {
                    const [bcx, bcy] = this.toCanvas(bc.cx, bc.cy, centerX, centerY, scale);
                    const [wcx, wcy] = this.toCanvas(wc.cx, wc.cy, centerX, centerY, scale);
                    ctx.beginPath(); ctx.moveTo(bcx, bcy); ctx.lineTo(wcx, wcy); ctx.stroke();
                }
            }

            // Draw periodic weights at face centers if enabled
            if (this.usePeriodicWeights && activeTriangles) {
                // Collect unique vertices from active triangles
                const vertices = new Map();
                for (const [key, tri] of activeTriangles) {
                    // Each triangle has 3 vertices
                    const addVertex = (n, j) => {
                        const vkey = `${n},${j}`;
                        if (!vertices.has(vkey)) {
                            vertices.set(vkey, { n, j });
                        }
                    };
                    if (tri.type === 1) {
                        addVertex(tri.n, tri.j);
                        addVertex(tri.n, tri.j - 1);
                        addVertex(tri.n + 1, tri.j - 1);
                    } else {
                        addVertex(tri.n, tri.j);
                        addVertex(tri.n + 1, tri.j);
                        addVertex(tri.n + 1, tri.j - 1);
                    }
                }

                // Skip drawing q-labels if too many vertices
                if (vertices.size > 100) return;

                // Draw q values at each vertex
                const fontSize = Math.max(12, Math.min(24, scale * 0.7));
                ctx.font = `${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                ctx.fillStyle = isDark ? '#fff' : '#000';

                for (const [vkey, v] of vertices) {
                    const k = this.periodicK;
                    const ni = ((v.n % k) + k) % k;
                    const ji = ((v.j % k) + k) % k;
                    const q = this.periodicQ[ni][ji];
                    const worldX = v.n;
                    const worldY = v.n / Math.sqrt(3) + v.j * 2 / Math.sqrt(3);
                    const [cx, cy] = this.toCanvas(worldX, worldY, centerX, centerY, scale);
                    ctx.fillText(q.toString(), cx, cy);
                }
            }
        }

        // Draw double dimer configuration (both min and max) for CFTP visualization
        drawDoubleDimerView(ctx, sim, minDimers, maxDimers, centerX, centerY, scale) {
            const isLargePolygon = sim.blackTriangles && sim.blackTriangles.length > 1000;
            const lineWidth = isLargePolygon ? 1 : 3;

            // Create maps for fast lookup
            const minSet = new Set(minDimers.map(d => `${d.bn},${d.bj},${d.wn},${d.wj}`));
            const maxSet = new Set(maxDimers.map(d => `${d.bn},${d.bj},${d.wn},${d.wj}`));

            // Combine all dimers
            const allDimers = new Map();
            for (const d of minDimers) {
                const key = `${d.bn},${d.bj},${d.wn},${d.wj}`;
                allDimers.set(key, d);
            }
            for (const d of maxDimers) {
                const key = `${d.bn},${d.bj},${d.wn},${d.wj}`;
                allDimers.set(key, d);
            }

            // Draw dimers with different styles
            for (const [key, dimer] of allDimers) {
                const inMin = minSet.has(key);
                const inMax = maxSet.has(key);

                const bc = sim.blackTriangles.find(b => b.n === dimer.bn && b.j === dimer.bj);
                const wc = sim.whiteTriangles.find(w => w.n === dimer.wn && w.j === dimer.wj);
                if (bc && wc) {
                    const [bcx, bcy] = this.toCanvas(bc.cx, bc.cy, centerX, centerY, scale);
                    const [wcx, wcy] = this.toCanvas(wc.cx, wc.cy, centerX, centerY, scale);

                    if (inMin && inMax) {
                        // Coalesced dimers - solid black
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = lineWidth;
                        ctx.setLineDash([]);
                    } else if (inMax) {
                        // Only in max (upper bound) - blue
                        ctx.strokeStyle = '#2196F3';
                        ctx.lineWidth = lineWidth;
                        ctx.setLineDash([]);
                    } else {
                        // Only in min (lower bound) - red
                        ctx.strokeStyle = '#F44336';
                        ctx.lineWidth = lineWidth;
                        ctx.setLineDash([]);
                    }

                    ctx.beginPath();
                    ctx.moveTo(bcx, bcy);
                    ctx.lineTo(wcx, wcy);
                    ctx.stroke();
                }
            }
            ctx.setLineDash([]);
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

        drawLasso(ctx, lassoPoints, centerX, centerY, scale, isFillMode, cursorPos = null) {
            if (lassoPoints.length === 0) return;

            const [sx, sy] = this.toCanvas(lassoPoints[0].x, lassoPoints[0].y, centerX, centerY, scale);

            // Draw existing points
            ctx.strokeStyle = isFillMode ? '#4CAF50' : '#f44336';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            for (let i = 1; i < lassoPoints.length; i++) {
                const [px, py] = this.toCanvas(lassoPoints[i].x, lassoPoints[i].y, centerX, centerY, scale);
                ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Draw preview line to cursor
            if (cursorPos && lassoPoints.length >= 1) {
                const lastPt = lassoPoints[lassoPoints.length - 1];
                const [lx, ly] = this.toCanvas(lastPt.x, lastPt.y, centerX, centerY, scale);
                const [cx, cy] = this.toCanvas(cursorPos.x, cursorPos.y, centerX, centerY, scale);
                ctx.strokeStyle = isFillMode ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.lineTo(cx, cy);
                // Also show line back to start if we have 2+ points
                if (lassoPoints.length >= 2) {
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(sx, sy);
                }
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Fill with semi-transparent color
            if (lassoPoints.length >= 3) {
                ctx.fillStyle = isFillMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)';
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                for (let i = 1; i < lassoPoints.length; i++) {
                    const [px, py] = this.toCanvas(lassoPoints[i].x, lassoPoints[i].y, centerX, centerY, scale);
                    ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
            }

            // Draw start point indicator
            ctx.fillStyle = isFillMode ? '#4CAF50' : '#f44336';
            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fill();
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
            // Legend removed from UI
        }
    }

    // ========================================================================
    // 3D RENDERER
    // ========================================================================
    class Lozenge3DRenderer {
        constructor(container) {
            this.container = container;
            this.colorPalettes = window.ColorSchemes || [{ name: 'UVA', colors: ['#E57200', '#232D4B', '#F9DCBF', '#002D62'] }];
            this.currentPaletteIndex = 0;
            this.colorPermutation = 0;
            this.autoRotate = false;
            this.cameraInitialized = false;

            // Three.js setup
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xffffff);

            // Camera with Z-up
            this.camera = new THREE.PerspectiveCamera(
                45,
                container.clientWidth / container.clientHeight,
                0.1,
                10000
            );
            this.camera.up.set(0, 0, 1);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(this.renderer.domElement);

            // Orbit controls
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enablePan = true;
            this.controls.panSpeed = 1.0;
            // Slower zoom for smoother experience
            this.controls.zoomSpeed = 0.5;
            // Better touch/trackpad support
            this.controls.enableZoom = true;
            this.controls.screenSpacePanning = true;
            // Touch gestures: one finger rotate, two finger zoom/pan
            this.controls.touches = {
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.DOLLY_PAN
            };

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            this.scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.position.set(10, 10, 15);
            this.scene.add(directionalLight);

            // Group for meshes
            this.meshGroup = new THREE.Group();
            this.scene.add(this.meshGroup);

            // Handle window resize
            window.addEventListener('resize', () => this.handleResize());

            // Start animation loop
            this.animate();
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

        setPalette(index) {
            this.currentPaletteIndex = ((index % this.colorPalettes.length) + this.colorPalettes.length) % this.colorPalettes.length;
            this.colorPermutation = 0;
        }

        permuteColors() {
            this.colorPermutation = ((this.colorPermutation || 0) + 1) % 6;
        }

        setAutoRotate(enabled) {
            this.autoRotate = enabled;
            this.controls.autoRotate = enabled;
            this.controls.autoRotateSpeed = 2.0;
        }

        handleResize() {
            if (!this.container) return;
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        }

        dimersTo3D(dimers, boundaries) {
            // Clear existing geometry
            while (this.meshGroup.children.length > 0) {
                const child = this.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                this.meshGroup.remove(child);
            }

            if (!dimers || dimers.length === 0) return;

            const colors = this.getPermutedColors();

            // Vertex keys for each dimer type
            const getVertexKeys = (dimer) => {
                const { bn, bj, t } = dimer;
                if (t === 0) {
                    return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
                } else if (t === 1) {
                    return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
                } else {
                    return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
                }
            };

            // Height patterns (relative z-heights of the 4 vertices)
            const getHeightPattern = (t) => {
                if (t === 0) return [0, 0, 0, 0];
                if (t === 1) return [1, 0, 0, 1];
                return [1, 1, 0, 0];
            };

            // 1. Build Vertex-to-Dimer Map
            const vertexToDimers = new Map();
            for (const dimer of dimers) {
                const verts = getVertexKeys(dimer);
                for (const [n, j] of verts) {
                    const key = `${n},${j}`;
                    if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                    vertexToDimers.get(key).push(dimer);
                }
            }

            // 2. BFS to calculate Height Function h(n,j)
            const heights = new Map();
            if (dimers.length > 0) {
                const firstDimer = dimers[0];
                const firstVerts = getVertexKeys(firstDimer);
                const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
                heights.set(startKey, 0);

                const queue = [startKey];
                const visited = new Set();

                while (queue.length > 0) {
                    const currentKey = queue.shift();
                    if (visited.has(currentKey)) continue;
                    visited.add(currentKey);

                    const currentH = heights.get(currentKey);
                    const [cn, cj] = currentKey.split(',').map(Number);

                    for (const dimer of vertexToDimers.get(currentKey) || []) {
                        const verts = getVertexKeys(dimer);
                        const pattern = getHeightPattern(dimer.t);

                        // Find index of current vertex in this dimer
                        let myIdx = -1;
                        for (let i = 0; i < 4; i++) {
                            if (verts[i][0] === cn && verts[i][1] === cj) {
                                myIdx = i;
                                break;
                            }
                        }

                        if (myIdx >= 0) {
                            for (let i = 0; i < 4; i++) {
                                const [vn, vj] = verts[i];
                                const vkey = `${vn},${vj}`;
                                if (!heights.has(vkey)) {
                                    const newH = currentH + (pattern[i] - pattern[myIdx]);
                                    heights.set(vkey, newH);
                                    queue.push(vkey);
                                }
                            }
                        }
                    }
                }
            }

            // 3. Coordinate Transformation
            // Maps abstract lattice (n, j, h) to Cartesian (x, y, z)
            // Using x = n - h and y = j + h ensures that the "vertical drop" vector (1, -1)
            // maps to a constant (x, y) position, creating perfect vertical walls.
            // Height is negated (z = -h) to match 2D "empty room" interpretation.
            const to3D = (n, j, h) => {
                return {
                    x: h,
                    y: -n - h,
                    z: j - h
                };
            };

            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const normals = [];
            const vertexColors = [];
            const indices = [];

            const addQuad = (v1, v2, v3, v4, color) => {
                const baseIndex = vertices.length / 3;
                vertices.push(v1.x, v1.y, v1.z);
                vertices.push(v2.x, v2.y, v2.z);
                vertices.push(v3.x, v3.y, v3.z);
                vertices.push(v4.x, v4.y, v4.z);

                // Compute flat normal
                const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
                const edge2 = { x: v4.x - v1.x, y: v4.y - v1.y, z: v4.z - v1.z }; // Use v4 for consistent winding
                const nx = edge1.y * edge2.z - edge1.z * edge2.y;
                const ny = edge1.z * edge2.x - edge1.x * edge2.z;
                const nz = edge1.x * edge2.y - edge1.y * edge2.x;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

                for (let i = 0; i < 4; i++) {
                    normals.push(nx / len, ny / len, nz / len);
                }

                const c = new THREE.Color(color);
                for (let i = 0; i < 4; i++) {
                    vertexColors.push(c.r, c.g, c.b);
                }

                indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
                indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
            };

            // 4. Generate Geometry
            for (const dimer of dimers) {
                const verts = getVertexKeys(dimer);
                const v3d = verts.map(([n, j]) => {
                    const h = heights.get(`${n},${j}`) || 0;
                    return to3D(n, j, h);
                });
                addQuad(v3d[0], v3d[1], v3d[2], v3d[3], colors[dimer.t]);
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
            geometry.setIndex(indices);
            geometry.computeBoundingSphere(); // Helps with camera centering

            const material = new THREE.MeshPhongMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                flatShading: true,
                shininess: 30
            });
            const mesh = new THREE.Mesh(geometry, material);
            this.meshGroup.add(mesh);

            const edgesGeometry = new THREE.EdgesGeometry(geometry, 10); // Threshold to show cube edges
            const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1, opacity: 0.3, transparent: true });
            const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            this.meshGroup.add(edges);

            if (!this.cameraInitialized && dimers.length > 0) {
                this.centerCamera(heights);
                this.cameraInitialized = true;
            }
        }

        // Render both min and max CFTP surfaces with transparency
        cftpBoundsTo3D(minDimers, maxDimers) {
            while (this.meshGroup.children.length > 0) {
                const child = this.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                this.meshGroup.remove(child);
            }

            if ((!minDimers || minDimers.length === 0) && (!maxDimers || maxDimers.length === 0)) return;

            const colors = this.getPermutedColors();

            const getVertexKeys = (dimer) => {
                const { bn, bj, t } = dimer;
                if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
                else if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
                else return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
            };

            const getHeightPattern = (t) => {
                if (t === 0) return [0, 0, 0, 0];
                if (t === 1) return [1, 0, 0, 1];
                return [1, 1, 0, 0];
            };

            const computeHeights = (dimers) => {
                const vertexToDimers = new Map();
                for (const dimer of dimers) {
                    for (const [n, j] of getVertexKeys(dimer)) {
                        const key = `${n},${j}`;
                        if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                        vertexToDimers.get(key).push(dimer);
                    }
                }
                const heights = new Map();
                if (dimers.length > 0) {
                    const firstVerts = getVertexKeys(dimers[0]);
                    const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
                    heights.set(startKey, 0);
                    const queue = [startKey];
                    const visited = new Set();
                    while (queue.length > 0) {
                        const currentKey = queue.shift();
                        if (visited.has(currentKey)) continue;
                        visited.add(currentKey);
                        const currentH = heights.get(currentKey);
                        const [cn, cj] = currentKey.split(',').map(Number);
                        for (const dimer of vertexToDimers.get(currentKey) || []) {
                            const verts = getVertexKeys(dimer);
                            const pattern = getHeightPattern(dimer.t);
                            let myIdx = verts.findIndex(([n, j]) => n === cn && j === cj);
                            if (myIdx >= 0) {
                                for (let i = 0; i < 4; i++) {
                                    const vkey = `${verts[i][0]},${verts[i][1]}`;
                                    if (!heights.has(vkey)) {
                                        heights.set(vkey, currentH + (pattern[i] - pattern[myIdx]));
                                        queue.push(vkey);
                                    }
                                }
                            }
                        }
                    }
                }
                return heights;
            };

            const to3D = (n, j, h) => ({ x: h, y: -n - h, z: j - h });

            const buildSurface = (dimers, heights, opacity, colorMod) => {
                const geometry = new THREE.BufferGeometry();
                const vertices = [], normals = [], vertexColors = [], indices = [];
                const addQuad = (v1, v2, v3, v4, color) => {
                    const baseIndex = vertices.length / 3;
                    vertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, v4.x, v4.y, v4.z);
                    const e1 = { x: v2.x-v1.x, y: v2.y-v1.y, z: v2.z-v1.z };
                    const e2 = { x: v4.x-v1.x, y: v4.y-v1.y, z: v4.z-v1.z };
                    const nx = e1.y*e2.z - e1.z*e2.y, ny = e1.z*e2.x - e1.x*e2.z, nz = e1.x*e2.y - e1.y*e2.x;
                    const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
                    for (let i = 0; i < 4; i++) normals.push(nx/len, ny/len, nz/len);
                    const c = new THREE.Color(color);
                    c.r *= colorMod; c.g *= colorMod; c.b *= colorMod;
                    for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
                    indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
                };
                for (const dimer of dimers) {
                    const verts = getVertexKeys(dimer);
                    const v3d = verts.map(([n, j]) => to3D(n, j, heights.get(`${n},${j}`) || 0));
                    addQuad(v3d[0], v3d[1], v3d[2], v3d[3], colors[dimer.t]);
                }
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
                geometry.setIndex(indices);
                geometry.computeBoundingSphere();
                const material = new THREE.MeshPhongMaterial({
                    vertexColors: true, side: THREE.DoubleSide, flatShading: true, shininess: 30,
                    transparent: true, opacity: opacity, depthWrite: opacity > 0.9
                });
                return new THREE.Mesh(geometry, material);
            };

            if (maxDimers && maxDimers.length > 0) {
                const maxHeights = computeHeights(maxDimers);
                this.meshGroup.add(buildSurface(maxDimers, maxHeights, 0.6, 1.0));
            }
            if (minDimers && minDimers.length > 0) {
                const minHeights = computeHeights(minDimers);
                this.meshGroup.add(buildSurface(minDimers, minHeights, 0.6, 0.7));
            }
        }

        // Render continuous height function as surface plot (like Mathematica ListPlot3D)
        // options: { hideZLabels: boolean } - hide z-axis labels for fluctuation display
        heightFunctionTo3D(heights, blackTriangles, whiteTriangles, boundaries, options = {}) {
            while (this.meshGroup.children.length > 0) {
                const child = this.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                this.meshGroup.remove(child);
            }

            if (heights.size === 0) return;

            // Surface plot coordinates: x = n, y = j (in triangular lattice coords), z = height
            // Use the same 2D world coordinates as the renderer
            const to3D = (n, j, h) => {
                // Same as getVertex but with height as z
                const x = n;
                const y = n / Math.sqrt(3) + j * 2 / Math.sqrt(3);
                return { x: x, y: y, z: h };
            };

            const geometry = new THREE.BufferGeometry();
            const vertices = [], normals = [], vertexColors = [], indices = [];

            // Diverging colormap: blue (negative) -> gray (zero) -> red (positive)
            // When fadeZero is true, values near zero become transparent
            const getHeightColorAlpha = (h, fadeZero) => {
                const t = Math.tanh(h / 3); // Normalize to [-1, 1] range
                const gray = 0.75; // Zero value is light gray instead of white
                let r, g, b;
                if (t < 0) {
                    // Blue to gray
                    const s = -t;
                    r = gray * (1 - s); g = gray * (1 - s); b = gray + s * (1 - gray);
                } else {
                    // Gray to red
                    const s = t;
                    r = gray + s * (1 - gray); g = gray * (1 - s); b = gray * (1 - s);
                }
                // Alpha: transparent at zero, opaque at large |h|
                const alpha = fadeZero ? Math.min(1, Math.abs(h) / 5) : 1;
                return { r, g, b, a: alpha };
            };

            const fadeZero = options.fadeZero || false;

            const addTriangle = (v1, v2, v3, h1, h2, h3) => {
                const baseIndex = vertices.length / 3;
                vertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);

                // Compute flat normal
                const e1 = { x: v2.x-v1.x, y: v2.y-v1.y, z: v2.z-v1.z };
                const e2 = { x: v3.x-v1.x, y: v3.y-v1.y, z: v3.z-v1.z };
                const nx = e1.y*e2.z - e1.z*e2.y;
                const ny = e1.z*e2.x - e1.x*e2.z;
                const nz = e1.x*e2.y - e1.y*e2.x;
                const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
                for (let i = 0; i < 3; i++) normals.push(nx/len, ny/len, nz/len);

                // Color each vertex by its height (with optional alpha for fadeZero)
                // For fadeZero, use average height for flat shading (no interpolation)
                const avgH = fadeZero ? (h1 + h2 + h3) / 3 : 0;
                const c1 = getHeightColorAlpha(fadeZero ? avgH : h1, fadeZero);
                const c2 = getHeightColorAlpha(fadeZero ? avgH : h2, fadeZero);
                const c3 = getHeightColorAlpha(fadeZero ? avgH : h3, fadeZero);
                vertexColors.push(c1.r, c1.g, c1.b, c1.a, c2.r, c2.g, c2.b, c2.a, c3.r, c3.g, c3.b, c3.a);

                indices.push(baseIndex, baseIndex+1, baseIndex+2);
            };

            // Draw black triangles (type 1): vertices (n,j), (n,j-1), (n+1,j-1)
            for (const tri of blackTriangles) {
                const h1 = heights.get(`${tri.n},${tri.j}`) || 0;
                const h2 = heights.get(`${tri.n},${tri.j-1}`) || 0;
                const h3 = heights.get(`${tri.n+1},${tri.j-1}`) || 0;
                const p1 = to3D(tri.n, tri.j, h1);
                const p2 = to3D(tri.n, tri.j-1, h2);
                const p3 = to3D(tri.n+1, tri.j-1, h3);
                addTriangle(p1, p2, p3, h1, h2, h3);
            }

            // Draw white triangles (type 2): vertices (n,j), (n+1,j), (n+1,j-1)
            for (const tri of whiteTriangles) {
                const h1 = heights.get(`${tri.n},${tri.j}`) || 0;
                const h2 = heights.get(`${tri.n+1},${tri.j}`) || 0;
                const h3 = heights.get(`${tri.n+1},${tri.j-1}`) || 0;
                const p1 = to3D(tri.n, tri.j, h1);
                const p2 = to3D(tri.n+1, tri.j, h2);
                const p3 = to3D(tri.n+1, tri.j-1, h3);
                addTriangle(p1, p2, p3, h1, h2, h3);
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 4)); // RGBA
            geometry.setIndex(indices);
            geometry.computeBoundingSphere();

            let material;
            if (fadeZero) {
                // Custom shader material for per-vertex alpha with flat shading
                material = new THREE.ShaderMaterial({
                    vertexShader: `
                        attribute vec4 color;
                        flat varying vec4 vColor;
                        varying vec3 vNormal;
                        void main() {
                            vColor = color;
                            vNormal = normalMatrix * normal;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        flat varying vec4 vColor;
                        varying vec3 vNormal;
                        void main() {
                            vec3 light = normalize(vec3(0.5, 0.5, 1.0));
                            float diff = max(dot(normalize(vNormal), light), 0.3);
                            gl_FragColor = vec4(vColor.rgb * diff, vColor.a);
                        }
                    `,
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                    glslVersion: THREE.GLSL3
                });
            } else {
                material = new THREE.MeshPhongMaterial({
                    vertexColors: true, side: THREE.DoubleSide, flatShading: options.flatShading || false, shininess: 30
                });
            }
            const mesh = new THREE.Mesh(geometry, material);
            this.meshGroup.add(mesh);

            // Compute bounds
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            for (let i = 0; i < vertices.length; i += 3) {
                minX = Math.min(minX, vertices[i]);
                maxX = Math.max(maxX, vertices[i]);
                minY = Math.min(minY, vertices[i+1]);
                maxY = Math.max(maxY, vertices[i+1]);
                minZ = Math.min(minZ, vertices[i+2]);
                maxZ = Math.max(maxZ, vertices[i+2]);
            }

            // Draw coordinate axes and grid
            const axesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
            const gridMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, linewidth: 1 });

            // X axis
            const xAxisGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(minX, minY, minZ),
                new THREE.Vector3(maxX, minY, minZ)
            ]);
            this.meshGroup.add(new THREE.Line(xAxisGeom, axesMaterial));

            // Y axis
            const yAxisGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(minX, minY, minZ),
                new THREE.Vector3(minX, maxY, minZ)
            ]);
            this.meshGroup.add(new THREE.Line(yAxisGeom, axesMaterial));

            // Z axis
            const zAxisGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(minX, minY, minZ),
                new THREE.Vector3(minX, minY, maxZ)
            ]);
            this.meshGroup.add(new THREE.Line(zAxisGeom, axesMaterial));

            // Grid lines on bottom (z = minZ)
            const gridStep = Math.max(1, Math.floor((maxX - minX) / 5));
            for (let x = Math.ceil(minX); x <= maxX; x += gridStep) {
                const lineGeom = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x, minY, minZ),
                    new THREE.Vector3(x, maxY, minZ)
                ]);
                this.meshGroup.add(new THREE.Line(lineGeom, gridMaterial));
            }
            for (let y = Math.ceil(minY); y <= maxY; y += gridStep) {
                const lineGeom = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(minX, y, minZ),
                    new THREE.Vector3(maxX, y, minZ)
                ]);
                this.meshGroup.add(new THREE.Line(lineGeom, gridMaterial));
            }

            // Z axis tick marks and labels
            const zRange = maxZ - minZ;
            const zStep = Math.pow(10, Math.floor(Math.log10(zRange))) || 1;
            const tickSize = (maxX - minX) * 0.02;

            // Create sprite material for labels
            const createLabel = (text, position) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 128;
                canvas.height = 64;
                ctx.fillStyle = '#000000';
                ctx.font = '32px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(text, 64, 40);
                const texture = new THREE.CanvasTexture(canvas);
                const spriteMat = new THREE.SpriteMaterial({ map: texture });
                const sprite = new THREE.Sprite(spriteMat);
                sprite.position.copy(position);
                sprite.scale.set((maxX - minX) * 0.15, (maxX - minX) * 0.075, 1);
                return sprite;
            };

            if (!options.hideZLabels) {
                for (let z = Math.ceil(minZ / zStep) * zStep; z <= maxZ; z += zStep) {
                    // Tick mark
                    const tickGeom = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(minX - tickSize, minY, z),
                        new THREE.Vector3(minX + tickSize, minY, z)
                    ]);
                    this.meshGroup.add(new THREE.Line(tickGeom, axesMaterial));

                    // Label (divide by 10 to show true values since heights are scaled x10)
                    const trueZ = z / 10;
                    const label = createLabel(trueZ.toFixed(1), new THREE.Vector3(minX - tickSize * 4, minY, z));
                    this.meshGroup.add(label);
                }
            }

            // Draw polygon boundary above or below the surface
            if (boundaries && boundaries.length > 0) {
                let boundaryZ;
                if (options.boundaryAtZero) {
                    // At z=0 for fluctuations (centered around zero)
                    boundaryZ = 0;
                } else if (options.boundaryAbove) {
                    boundaryZ = maxZ + zRange * 0.1;
                } else {
                    boundaryZ = minZ - zRange * 0.1; // Below for normal height function
                }
                const boundaryMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

                for (const boundary of boundaries) {
                    if (boundary.length < 2) continue;
                    const points = boundary.map(pt => new THREE.Vector3(pt.x, pt.y, boundaryZ));
                    points.push(points[0]); // Close the loop
                    const boundaryGeom = new THREE.BufferGeometry().setFromPoints(points);
                    this.meshGroup.add(new THREE.Line(boundaryGeom, boundaryMaterial));
                }

                // Also draw filled polygon (unless boundaryLineOnly is set)
                if (!options.boundaryLineOnly && boundaries[0] && boundaries[0].length >= 3) {
                    const shape = new THREE.Shape();
                    shape.moveTo(boundaries[0][0].x, boundaries[0][0].y);
                    for (let i = 1; i < boundaries[0].length; i++) {
                        shape.lineTo(boundaries[0][i].x, boundaries[0][i].y);
                    }
                    shape.closePath();
                    const shapeGeom = new THREE.ShapeGeometry(shape);
                    // Position at boundaryZ
                    shapeGeom.translate(0, 0, boundaryZ);
                    const shapeMat = new THREE.MeshBasicMaterial({
                        color: 0xeeeeee,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.5
                    });
                    const shapeMesh = new THREE.Mesh(shapeGeom, shapeMat);
                    this.meshGroup.add(shapeMesh);
                }
            }

            // Center camera for surface plot
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            const cz = (minZ + maxZ) / 2;
            const range = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
            this.camera.position.set(cx + range * 0.6, cy - range * 0.8, cz + range * 0.6);
            this.camera.lookAt(cx, cy, cz);
            this.controls.target.set(cx, cy, cz);
            this.controls.update();
        }

        centerCamera(heights) {
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;

            for (const [key, h] of heights) {
                const [n, j] = key.split(',').map(Number);
                const x = n - j * 0.5;
                const y = j * Math.sqrt(3) / 2;
                const z = h;

                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                minZ = Math.min(minZ, z);
                maxZ = Math.max(maxZ, z);
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const centerZ = (minZ + maxZ) / 2;
            const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 10;

            this.controls.target.set(centerX, centerY, centerZ);
            this.camera.position.set(
                centerX - size * 3.0,
                centerY + size * 1.5,
                centerZ + size * 1.5
            );
            this.camera.lookAt(centerX, centerY, centerZ);
            this.controls.update();
        }

        resetCamera() {
            this.cameraInitialized = false;
        }

        zoom(factor) {
            // Dolly camera towards/away from target
            const direction = new THREE.Vector3();
            direction.subVectors(this.camera.position, this.controls.target);
            direction.multiplyScalar(1 / factor);
            this.camera.position.copy(this.controls.target).add(direction);
            this.controls.update();
        }

        pan(deltaX, deltaY) {
            // Pan camera and target in screen space
            const offset = new THREE.Vector3();

            // Get camera's right and up vectors
            const right = new THREE.Vector3();
            const up = new THREE.Vector3();
            this.camera.matrix.extractBasis(right, up, new THREE.Vector3());

            // Scale pan amount based on distance to target
            const distance = this.camera.position.distanceTo(this.controls.target);
            const panScale = distance * 0.002;

            offset.addScaledVector(right, -deltaX * panScale);
            offset.addScaledVector(up, deltaY * panScale);

            this.camera.position.add(offset);
            this.controls.target.add(offset);
            this.controls.update();
        }

        updateDarkMode(isDark) {
            this.scene.background = new THREE.Color(isDark ? 0x1a1a1a : 0xffffff);
        }
    }

    // ========================================================================
    // MAIN APPLICATION
    // ========================================================================
    const canvas = document.getElementById('lozenge-canvas');
    const threeContainer = document.getElementById('three-container');
    const sim = new UltimateLozengeSampler();
    const renderer = new LozengeRenderer(canvas);
    const undoStack = new UndoStack();

    let activeTriangles = new Map();
    let isDrawing = false;
    // Tools: 'draw', 'erase', 'lassoFill', 'lassoErase', 'belowFill', 'belowErase'
    let currentTool = 'draw';
    let running = false;

    // 3D view state
    let is3DView = false;
    let renderer3D = null;

    // Lasso state (drag to select)
    let lassoPoints = []; // Array of {x, y} in world coordinates
    let isLassoing = false;
    let lassoCursor = null; // Current cursor position for lasso preview

    let stepsPerSecond = 100;
    let animationId = null;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let currentFps = 0;
    let isValid = false;

    const el = {
        drawBtn: document.getElementById('drawBtn'),
        eraseBtn: document.getElementById('eraseBtn'),
        lassoFillBtn: document.getElementById('lassoFillBtn'),
        lassoEraseBtn: document.getElementById('lassoEraseBtn'),
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
        cftpSteps: document.getElementById('cftpSteps'),
        cftpStopBtn: document.getElementById('cftpStopBtn'),
        toggle3DBtn: document.getElementById('toggle3DBtn'),
        autoRotateCheckbox: document.getElementById('autoRotateCheckbox'),
        averageBtn: document.getElementById('averageBtn'),
        avgSamplesInput: document.getElementById('avgSamplesInput'),
        avgStopBtn: document.getElementById('avgStopBtn'),
        avgProgress: document.getElementById('avgProgress'),
        fluctuationsBtn: document.getElementById('fluctuationsBtn'),
        fluctProgress: document.getElementById('fluctProgress'),
        fluctScaleInput: document.getElementById('fluctScaleInput'),
    };

    // CFTP cancellation flag
    let cftpCancelled = false;
    // Average sampling cancellation flag
    let avgCancelled = false;
    // Fluctuations cancellation flag
    let fluctCancelled = false;
    // Store raw fluctuation data for dynamic re-rendering
    let rawFluctuations = null;
    // Flag to prevent draw() from overwriting fluctuation surface
    let inFluctuationMode = false;

    function renderFluctuations() {
        if (!rawFluctuations || !renderer3D) return;
        const scale = parseFloat(el.fluctScaleInput.value) || 10;
        const fluctHeights = new Map();
        for (const [key, raw] of rawFluctuations) {
            fluctHeights.set(key, raw * scale);
        }
        renderer3D.heightFunctionTo3D(fluctHeights, sim.blackTriangles, sim.whiteTriangles, sim.boundaries, { hideZLabels: true, flatShading: true, boundaryAtZero: true, boundaryLineOnly: true });
    }

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
        el.averageBtn.disabled = !isValid;
        el.fluctuationsBtn.disabled = !isValid;

        // Enable repair button only if Invalid and Not Empty
        el.repairBtn.disabled = isValid || activeTriangles.size === 0;
    }

    function setViewMode(use3D) {
        is3DView = use3D;
        canvas.style.display = use3D ? 'none' : 'block';
        threeContainer.style.display = use3D ? 'block' : 'none';
        el.toggle3DBtn.textContent = use3D ? '2D' : '3D';

        if (use3D) {
            if (!renderer3D) {
                renderer3D = new Lozenge3DRenderer(threeContainer);
            }
            // Sync palette and permutation
            renderer3D.setPalette(renderer.currentPaletteIndex);
            renderer3D.colorPermutation = renderer.colorPermutation;
            // Update dark mode
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            renderer3D.updateDarkMode(isDarkMode);
            // Render 3D view
            if (isValid && sim.dimers.length > 0) {
                renderer3D.dimersTo3D(sim.dimers, sim.boundaries);
            }
        } else {
            draw();
        }
    }

    function draw() {
        if (is3DView && renderer3D && isValid && sim.dimers.length > 0 && !inFluctuationMode) {
            renderer3D.dimersTo3D(sim.dimers, sim.boundaries);
        }
        renderer.draw(sim, activeTriangles, isValid);
        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
        const tool = getEffectiveTool();

        // Draw lasso overlay if active
        if (lassoPoints.length > 0 || isLassoing) {
            const isFillMode = tool === 'lassoFill';
            renderer.drawLasso(renderer.ctx, lassoPoints, centerX, centerY, scale, isFillMode, lassoCursor);
        }

    }

    // Track if simulation should auto-restart when shape becomes valid
    let wasRunningBeforeInvalid = false;

    function reinitialize() {
        const wasRunning = running;

        // Clear fluctuation mode when polygon changes
        inFluctuationMode = false;
        rawFluctuations = null;

        // Stop animation loop temporarily
        if (animationId) {
            cancelAnimationFrame(animationId);
            clearTimeout(animationId);
            animationId = null;
        }

        const result = sim.initFromTriangles(activeTriangles);
        const wasValid = isValid;
        isValid = result.status === 'valid';


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

    function completeLasso(isFillMode) {
        if (lassoPoints.length < 3) {
            lassoPoints = [];
            isLassoing = false;
            return false;
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

        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        let changed = false;

        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {
                const blackCentroid = getRightTriangleCentroid(n, j);
                if (pointInPolygonPreset(blackCentroid.x, blackCentroid.y, lassoPoints)) {
                    const key = `${n},${j},1`;
                    if (isFillMode) {
                        if (!activeTriangles.has(key)) {
                            activeTriangles.set(key, { n, j, type: 1 });
                            changed = true;
                        }
                    } else {
                        if (activeTriangles.has(key)) {
                            activeTriangles.delete(key);
                            changed = true;
                        }
                    }
                }

                const whiteCentroid = getLeftTriangleCentroid(n, j);
                if (pointInPolygonPreset(whiteCentroid.x, whiteCentroid.y, lassoPoints)) {
                    const key = `${n},${j},2`;
                    if (isFillMode) {
                        if (!activeTriangles.has(key)) {
                            activeTriangles.set(key, { n, j, type: 2 });
                            changed = true;
                        }
                    } else {
                        if (activeTriangles.has(key)) {
                            activeTriangles.delete(key);
                            changed = true;
                        }
                    }
                }
            }
        }

        lassoPoints = [];
        isLassoing = false;
        return changed;
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
        const zoomFactor = e.deltaY > 0 ? 0.97 : 1.03;
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
        // Reset if the Meta or Ctrl key itself was released
        if (e.key === 'Meta' || e.key === 'Control') cmdHeld = false;
        // Also reset if neither modifier is held
        if (!e.metaKey && !e.ctrlKey) cmdHeld = false;
    });
    // Reset on focus loss to prevent stuck state
    window.addEventListener('blur', () => {
        cmdHeld = false;
    });
    // Also reset when mouse is released
    canvas.addEventListener('mouseup', () => {
        cmdHeld = false;
    });

    function getEffectiveTool() {
        // Disabled cmd-hold toggle - was causing issues with lasso tools
        return currentTool;
    }

    function isLassoTool() {
        const tool = getEffectiveTool();
        return tool === 'lassoFill' || tool === 'lassoErase';
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

        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
        const worldPos = renderer.fromCanvas(mx, my, centerX, centerY, scale);
        const lassoSnap = document.getElementById('lassoSnapBtn').classList.contains('active');

        // Left-click - handle different tool types
        if (isLassoTool()) {
            // Click-based lasso: click to add points, click near start to close
            if (!isLassoing) {
                // Start new lasso
                isLassoing = true;
                const pointToAdd = lassoSnap ? snapToLattice(worldPos) : worldPos;
                lassoPoints = [pointToAdd];
                draw();
            } else {
                // Snap direction to grid axes if enabled, then snap to lattice
                const lastPoint = lassoPoints[lassoPoints.length - 1];
                let pointToAdd = worldPos;
                if (lassoSnap) {
                    const dirSnapped = snapDirectionToGrid(lastPoint, worldPos);
                    pointToAdd = snapToLattice(dirSnapped);
                }

                // Cmd-click (Mac) or Ctrl-click: add point and complete immediately
                if (e.metaKey || e.ctrlKey) {
                    if (pointToAdd.x !== lastPoint.x || pointToAdd.y !== lastPoint.y) {
                        lassoPoints.push(pointToAdd);
                    }
                    if (lassoPoints.length >= 3) {
                        const tool = getEffectiveTool();
                        const changed = completeLasso(tool === 'lassoFill');
                        if (changed) reinitialize();
                        else draw();
                    }
                    isLassoing = false;
                    lassoCursor = null;
                    return;
                }

                // Check if clicking near start point to close
                const startPoint = lassoPoints[0];
                const distToStart = Math.hypot(pointToAdd.x - startPoint.x, pointToAdd.y - startPoint.y);
                if (lassoPoints.length >= 3 && distToStart < 0.8) {
                    // Close the lasso
                    const tool = getEffectiveTool();
                    const changed = completeLasso(tool === 'lassoFill');
                    if (changed) reinitialize();
                    else draw();
                    isLassoing = false;
                    lassoCursor = null;
                } else {
                    // Add waypoint (avoid duplicates)
                    if (pointToAdd.x !== lastPoint.x || pointToAdd.y !== lastPoint.y) {
                        lassoPoints.push(pointToAdd);
                    }
                    draw();
                }
            }
        } else {
            // Regular draw/erase
            saveState();
            isDrawing = true;
            handleInput(e);
        }
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

        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
        const worldPos = renderer.fromCanvas(mx, my, centerX, centerY, scale);

        if (isLassoing) {
            // Update cursor preview for lasso with direction snapping
            const lassoSnap = document.getElementById('lassoSnapBtn').classList.contains('active');
            if (lassoSnap && lassoPoints.length > 0) {
                const lastPoint = lassoPoints[lassoPoints.length - 1];
                const dirSnapped = snapDirectionToGrid(lastPoint, worldPos);
                lassoCursor = snapToLattice(dirSnapped);
            } else {
                lassoCursor = lassoSnap ? snapToLattice(worldPos) : worldPos;
            }
            draw();
            return;
        }

        if (isDrawing) handleInput(e);
    });

    canvas.addEventListener('mouseup', (e) => {
        // Lasso doesn't complete on mouseup anymore (click-based)
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
            const rect = canvas.getBoundingClientRect();
            const mx = e.touches[0].clientX - rect.left;
            const my = e.touches[0].clientY - rect.top;
            const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
            const worldPos = renderer.fromCanvas(mx, my, centerX, centerY, scale);

            if (isLassoTool()) {
                isLassoing = true;
                lassoPoints = [snapToLattice(worldPos)];
                draw();
            } else {
                saveState();
                isDrawing = true;
                handleInput(e);
            }
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

        if (e.touches.length === 1) {
            const mx = e.touches[0].clientX - rect.left;
            const my = e.touches[0].clientY - rect.top;
            const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
            const worldPos = renderer.fromCanvas(mx, my, centerX, centerY, scale);

            if (isLassoing) {
                const snappedPos = snapToLattice(worldPos);
                const lastPoint = lassoPoints[lassoPoints.length - 1];
                if (snappedPos.x !== lastPoint.x || snappedPos.y !== lastPoint.y) {
                    lassoPoints.push(snappedPos);
                    draw();
                }
                return;
            }
        }

        if (isDrawing) handleInput(e);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            if (isLassoing) {
                const tool = getEffectiveTool();
                const changed = completeLasso(tool === 'lassoFill');
                if (changed) reinitialize();
                else draw();
            }

            isDrawing = false;
            isPanning = false;
            isLassoing = false;
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
    function setTool(tool) {
        // Auto-switch to 2D when using drawing tools
        if (is3DView) {
            setViewMode(false);
        }
        // Clear any in-progress lasso when switching tools
        if (lassoPoints.length > 0 || isLassoing) {
            lassoPoints = [];
            isLassoing = false;
            lassoCursor = null;
            draw();
        }
        currentTool = tool;
        el.drawBtn.classList.toggle('active', tool === 'draw');
        el.eraseBtn.classList.toggle('active', tool === 'erase');
        el.lassoFillBtn.classList.toggle('active', tool === 'lassoFill');
        el.lassoEraseBtn.classList.toggle('active', tool === 'lassoErase');
    }

    el.drawBtn.addEventListener('click', () => { cmdHeld = false; setTool('draw'); });
    el.eraseBtn.addEventListener('click', () => { cmdHeld = false; setTool('erase'); });
    el.lassoFillBtn.addEventListener('click', () => { cmdHeld = false; setTool('lassoFill'); });
    el.lassoEraseBtn.addEventListener('click', () => { cmdHeld = false; setTool('lassoErase'); });

    document.getElementById('lassoSnapBtn').addEventListener('click', () => {
        const btn = document.getElementById('lassoSnapBtn');
        btn.classList.toggle('active');
    });

    el.resetBtn.addEventListener('click', () => {
        saveState();
        activeTriangles.clear();
        renderer.resetView();
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

    document.getElementById('halveMeshBtn').addEventListener('click', () => {
        if (activeTriangles.size === 0) return;
        saveState();
        activeTriangles = halveMesh(activeTriangles);
        reinitialize();

        // Auto-repair if region is invalid after scaling
        if (!isValid && activeTriangles.size > 0) {
            const result = sim.repair();
            activeTriangles.clear();
            for (const t of sim.blackTriangles) {
                activeTriangles.set(`${t.n},${t.j},1`, { n: t.n, j: t.j, type: 1 });
            }
            for (const t of sim.whiteTriangles) {
                activeTriangles.set(`${t.n},${t.j},2`, { n: t.n, j: t.j, type: 2 });
            }
            isValid = result.status === 'valid';
            updateUI();
        }

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

    // Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', () => {
        renderer.zoomAt(renderer.displayWidth / 2, renderer.displayHeight / 2, 1.3);
        if (renderer3D && is3DView) {
            renderer3D.zoom(1.3);
        }
        draw();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        renderer.zoomAt(renderer.displayWidth / 2, renderer.displayHeight / 2, 0.7);
        if (renderer3D && is3DView) {
            renderer3D.zoom(0.7);
        }
        draw();
    });

    document.getElementById('resetViewBtn').addEventListener('click', () => {
        // Complete redraw of 2D canvas
        renderer.setupCanvas();
        renderer.resetView();
        renderer.fitToRegion(activeTriangles);

        // Complete redraw of 3D if available
        if (renderer3D) {
            renderer3D.resetCamera();
            renderer3D.handleResize();
            // Rebuild 3D geometry from current state
            if (isValid && sim.dimers.length > 0) {
                renderer3D.dimersTo3D(sim.dimers, sim.boundaries);
            }
        }
        draw();
    });

    // Pan controls
    const panAmount = 50; // pixels
    document.getElementById('panLeftBtn').addEventListener('click', () => {
        renderer.pan(panAmount, 0);
        if (renderer3D && is3DView) {
            renderer3D.pan(-panAmount, 0);
        }
        draw();
    });
    document.getElementById('panRightBtn').addEventListener('click', () => {
        renderer.pan(-panAmount, 0);
        if (renderer3D && is3DView) {
            renderer3D.pan(panAmount, 0);
        }
        draw();
    });
    document.getElementById('panUpBtn').addEventListener('click', () => {
        renderer.pan(0, panAmount);
        if (renderer3D && is3DView) {
            renderer3D.pan(0, panAmount);
        }
        draw();
    });
    document.getElementById('panDownBtn').addEventListener('click', () => {
        renderer.pan(0, -panAmount);
        if (renderer3D && is3DView) {
            renderer3D.pan(0, -panAmount);
        }
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
        // Escape to cancel any in-progress lasso
        if (e.key === 'Escape') {
            if (lassoPoints.length > 0 || isLassoing) {
                lassoPoints = [];
                isLassoing = false;
                lassoCursor = null;
                draw();
            }
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

    // 3D View toggle
    el.toggle3DBtn.addEventListener('click', () => {
        setViewMode(!is3DView);
    });

    el.autoRotateCheckbox.addEventListener('change', (e) => {
        if (renderer3D) {
            renderer3D.setAutoRotate(e.target.checked);
        }
    });

    // Palette
    el.paletteSelect.addEventListener('change', (e) => {
        renderer.setPalette(parseInt(e.target.value));
        if (renderer3D) {
            renderer3D.setPalette(parseInt(e.target.value));
        }
        draw();
    });

    document.getElementById('prev-palette').addEventListener('click', () => {
        renderer.prevPalette();
        if (renderer3D) {
            renderer3D.setPalette(renderer.currentPaletteIndex);
        }
        el.paletteSelect.value = renderer.currentPaletteIndex;
        draw();
    });

    document.getElementById('next-palette').addEventListener('click', () => {
        renderer.nextPalette();
        if (renderer3D) {
            renderer3D.setPalette(renderer.currentPaletteIndex);
        }
        el.paletteSelect.value = renderer.currentPaletteIndex;
        draw();
    });

    document.getElementById('permuteColors').addEventListener('click', () => {
        renderer.permuteColors();
        if (renderer3D) {
            renderer3D.permuteColors();
        }
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

    document.getElementById('showGridCheckbox').addEventListener('change', (e) => {
        renderer.showGrid = e.target.checked;
        draw();
    });

    document.getElementById('rotateCheckbox').addEventListener('change', (e) => {
        renderer.rotated = e.target.checked;
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

    // Periodic weights controls
    const usePeriodicCheckbox = document.getElementById('usePeriodicWeightsCheckbox');
    const periodicKSelect = document.getElementById('periodicKSelect');
    const periodicWeightsMatrix = document.getElementById('periodicWeightsMatrix');

    // Default values for each k (k x k matrices stored as 2D arrays)
    const defaultPeriodicQ = {
        1: [[1]],
        2: [[1, 100], [0.003333, 3]],
        // Nienhuis Pattern: (n-j)%3. q0=1 (diag), q1=0.5, q2=2
        3: [
            [1.0, 2.0, 0.5],
            [0.5, 1.0, 2.0],
            [2.0, 0.5, 1.0]
        ],
        4: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]],
        5: [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]]
    };

    let currentPeriodicK = 2; // Default to 2
    let currentPeriodicQ = defaultPeriodicQ[2].map(row => [...row]); // Load 2x2 matrix
    let isNienhuis3x3Mode = false;
    let isDuits2x2Mode = false;

    function computeCharlier2x2Matrix(alpha) {
        return [
            [alpha, 1],
            [1, 1/alpha]
        ];
    }

    function computeNienhuis3x3Matrix(alpha) {
        const invAlpha = 1 / alpha;
        return [
            [1, alpha, invAlpha],
            [invAlpha, 1, alpha],
            [alpha, invAlpha, 1]
        ];
    }

    function buildPeriodicMatrix(k) {
        periodicWeightsMatrix.innerHTML = '';
        periodicWeightsMatrix.style.gridTemplateColumns = `repeat(${k}, auto)`;

        for (let i = 0; i < k; i++) {
            for (let j = 0; j < k; j++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'param-input';
                input.style.width = '100px';
                input.min = '0';
                input.max = '1000000';
                input.step = '0.01';
                input.value = currentPeriodicQ[i]?.[j] ?? 1;
                input.dataset.row = i;
                input.dataset.col = j;
                input.title = `q${i}${j}`;
                input.addEventListener('change', updatePeriodicWeights);
                periodicWeightsMatrix.appendChild(input);
            }
        }
    }

    function updatePeriodicWeights() {
        const k = currentPeriodicK;
        const inputs = periodicWeightsMatrix.querySelectorAll('input');
        const values = [];
        currentPeriodicQ = [];
        let product = 1;

        for (let i = 0; i < k; i++) {
            currentPeriodicQ[i] = [];
        }

        inputs.forEach(input => {
            const i = parseInt(input.dataset.row);
            const j = parseInt(input.dataset.col);
            const val = Math.max(0, Math.min(1000000, parseFloat(input.value) || 1));
            input.value = val;
            currentPeriodicQ[i][j] = val;
            values.push(val);
            product *= val;
        });

        document.getElementById('periodicQProduct').textContent = product.toFixed(4).replace(/\.?0+$/, '');

        sim.setPeriodicQBias(values, k);
        renderer.periodicK = k;
        renderer.periodicQ = currentPeriodicQ;
        draw();
    }

    periodicKSelect.addEventListener('change', (e) => {
        const newK = parseInt(e.target.value);
        // Exit preset modes and restore editable matrix
        isNienhuis3x3Mode = false;
        isDuits2x2Mode = false;
        document.getElementById('nienhuis3x3AlphaContainer').style.display = 'none';
        document.getElementById('duits2x2Container').style.display = 'none';
        // Unhighlight presets
        document.getElementById('preset2x2Btn').style.background = '#f5f5f5';
        document.getElementById('preset2x2Btn').style.color = '';
        document.getElementById('presetNienhuis3x3Btn').style.background = '#f5f5f5';
        document.getElementById('presetNienhuis3x3Btn').style.color = '';
        // Preserve values where possible
        const oldQ = currentPeriodicQ;
        currentPeriodicK = newK;
        currentPeriodicQ = [];
        for (let i = 0; i < newK; i++) {
            currentPeriodicQ[i] = [];
            for (let j = 0; j < newK; j++) {
                currentPeriodicQ[i][j] = oldQ[i]?.[j] ?? 1;
            }
        }
        buildPeriodicMatrix(newK);
        setMatrixInputsDisabled(false);
        updatePeriodicWeights();
    });

    usePeriodicCheckbox.addEventListener('change', (e) => {
        sim.setUsePeriodicWeights(e.target.checked);
        renderer.usePeriodicWeights = e.target.checked;
        if (e.target.checked) {
            updatePeriodicWeights();
        }
        draw();
    });

    // Preset buttons
    document.getElementById('preset2x2Btn').addEventListener('click', (e) => {
        e.preventDefault();
        isNienhuis3x3Mode = false;
        isDuits2x2Mode = true;
        document.getElementById('nienhuis3x3AlphaContainer').style.display = 'none';
        document.getElementById('duits2x2Container').style.display = 'flex';
        // Highlight active preset
        document.getElementById('preset2x2Btn').style.background = '#1976d2';
        document.getElementById('preset2x2Btn').style.color = 'white';
        document.getElementById('presetNienhuis3x3Btn').style.background = '#f5f5f5';
        document.getElementById('presetNienhuis3x3Btn').style.color = '';
        currentPeriodicK = 2;
        const alpha = parseFloat(document.getElementById('duitsAlpha').value) || 2;
        currentPeriodicQ = computeCharlier2x2Matrix(alpha);
        periodicKSelect.value = '2';
        buildPeriodicMatrix(2);
        setMatrixInputsDisabled(true);
        // Enable periodic weights
        usePeriodicCheckbox.checked = true;
        sim.setUsePeriodicWeights(true);
        renderer.usePeriodicWeights = true;
        updatePeriodicWeights();
    });

    function updateCharlier2x2Matrix() {
        if (!isDuits2x2Mode) return;
        const alpha = parseFloat(document.getElementById('duitsAlpha').value) || 2;
        currentPeriodicQ = computeCharlier2x2Matrix(alpha);
        const inputs = periodicWeightsMatrix.querySelectorAll('input');
        inputs.forEach(input => {
            const i = parseInt(input.dataset.row);
            const j = parseInt(input.dataset.col);
            input.value = currentPeriodicQ[i][j];
        });
        updatePeriodicWeights();
    }

    document.getElementById('duitsAlpha').addEventListener('input', updateCharlier2x2Matrix);

    document.getElementById('presetNienhuis3x3Btn').addEventListener('click', (e) => {
        e.preventDefault();
        isNienhuis3x3Mode = true;
        isDuits2x2Mode = false;
        document.getElementById('duits2x2Container').style.display = 'none';
        document.getElementById('nienhuis3x3AlphaContainer').style.display = 'flex';
        // Highlight active preset
        document.getElementById('presetNienhuis3x3Btn').style.background = '#1976d2';
        document.getElementById('presetNienhuis3x3Btn').style.color = 'white';
        document.getElementById('preset2x2Btn').style.background = '#f5f5f5';
        document.getElementById('preset2x2Btn').style.color = '';
        currentPeriodicK = 3;
        const alpha = parseFloat(document.getElementById('nienhuis3x3Alpha').value) || 2;
        currentPeriodicQ = computeNienhuis3x3Matrix(alpha);
        periodicKSelect.value = '3';
        buildPeriodicMatrix(3);
        setMatrixInputsDisabled(true);
        // Enable periodic weights
        usePeriodicCheckbox.checked = true;
        sim.setUsePeriodicWeights(true);
        renderer.usePeriodicWeights = true;
        updatePeriodicWeights();
    });

    document.getElementById('nienhuis3x3Alpha').addEventListener('input', (e) => {
        if (!isNienhuis3x3Mode) return;
        const alpha = parseFloat(e.target.value) || 2;
        currentPeriodicQ = computeNienhuis3x3Matrix(alpha);
        // Update the displayed values in the greyed-out inputs
        const inputs = periodicWeightsMatrix.querySelectorAll('input');
        inputs.forEach(input => {
            const i = parseInt(input.dataset.row);
            const j = parseInt(input.dataset.col);
            input.value = currentPeriodicQ[i][j];
        });
        updatePeriodicWeights();
    });

    function setMatrixInputsDisabled(disabled) {
        const inputs = periodicWeightsMatrix.querySelectorAll('input');
        inputs.forEach(input => {
            input.disabled = disabled;
            input.style.backgroundColor = disabled ? '#e9e9e9' : '';
            input.style.color = disabled ? '#666' : '';
        });
    }

    // Initialize matrix and compute initial product
    buildPeriodicMatrix(currentPeriodicK);
    document.getElementById('periodicQProduct').textContent = currentPeriodicQ.flat().reduce((a, b) => a * b, 1).toFixed(4).replace(/\.?0+$/, '');

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
            inFluctuationMode = false; // Exit fluctuation mode when starting Glauber
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
        inFluctuationMode = false; // Exit fluctuation mode when starting CFTP
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
        cftpCancelled = false;
        el.cftpStopBtn.style.display = 'inline-block';

        setTimeout(() => {
            sim.initCFTP();
            let lastDrawnBlock = -1; // Track which 4096-block we last drew

            function cftpStep() {
                // Check for cancellation
                if (cftpCancelled) {
                    el.cftpSteps.textContent = 'stopped';
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                    el.cftpStopBtn.style.display = 'none';
                    return;
                }

                const res = sim.stepCFTP();
                if (res.status === 'in_progress') {
                    el.cftpSteps.textContent = 'T=' + res.T + ' @' + res.step;
                    el.cftpBtn.textContent = res.T + ':' + res.step;
                    // Draw every 4096 steps when T > 4096
                    if (res.T > 4096) {
                        const currentBlock = Math.floor(res.step / 4096);
                        if (currentBlock > lastDrawnBlock) {
                            lastDrawnBlock = currentBlock;
                            const maxData = sim.getCFTPMaxDimers();
                            const minData = sim.getCFTPMinDimers();
                            if (is3DView && renderer3D) {
                                renderer3D.cftpBoundsTo3D(minData.dimers, maxData.dimers);
                            } else if (maxData.dimers && maxData.dimers.length > 0) {
                                if (renderer.showDimerView) {
                                    // Draw double dimer view in 2D dimer mode
                                    renderer.draw(sim, activeTriangles, isValid);
                                    const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
                                    renderer.drawDoubleDimerView(renderer.ctx, sim, minData.dimers, maxData.dimers, centerX, centerY, scale);
                                } else {
                                    // Lozenge view - just show max
                                    const savedDimers = sim.dimers;
                                    sim.dimers = maxData.dimers;
                                    draw();
                                    sim.dimers = savedDimers;
                                }
                            }
                        }
                    }
                    setTimeout(cftpStep, 0);
                } else if (res.status === 'coalesced') {
                    const finalRes = sim.finalizeCFTP();
                    draw();
                    el.cftpSteps.textContent = res.T;
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                    el.cftpStopBtn.style.display = 'none';
                } else if (res.status === 'timeout') {
                    el.cftpSteps.textContent = 'timeout';
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                    el.cftpStopBtn.style.display = 'none';
                } else if (res.status === 'not_coalesced') {
                    el.cftpSteps.textContent = 'T=' + res.T;
                    el.cftpBtn.textContent = 'T=' + res.T;
                    lastDrawnBlock = -1; // Reset for new epoch
                    // Draw both surfaces after each epoch
                    if (res.prevT <= 4096) {
                        const maxData = sim.getCFTPMaxDimers();
                        const minData = sim.getCFTPMinDimers();
                        if (is3DView && renderer3D) {
                            renderer3D.cftpBoundsTo3D(minData.dimers, maxData.dimers);
                        } else if (maxData.dimers && maxData.dimers.length > 0) {
                            if (renderer.showDimerView) {
                                // Draw double dimer view in 2D dimer mode
                                renderer.draw(sim, activeTriangles, isValid);
                                const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
                                renderer.drawDoubleDimerView(renderer.ctx, sim, minData.dimers, maxData.dimers, centerX, centerY, scale);
                            } else {
                                // Lozenge view - just show max
                                const savedDimers = sim.dimers;
                                sim.dimers = maxData.dimers;
                                draw();
                                sim.dimers = savedDimers;
                            }
                        }
                    }
                    setTimeout(cftpStep, 0);
                } else {
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                    el.cftpStopBtn.style.display = 'none';
                }
            }

            setTimeout(cftpStep, 0);
        }, 10);
    });

    el.cftpStopBtn.addEventListener('click', () => {
        cftpCancelled = true;
    });

    // Average Sampling for Limit Shape
    el.averageBtn.addEventListener('click', () => {
        if (!isValid) return;
        inFluctuationMode = false; // Exit fluctuation mode when starting averaging

        // Stop any running simulation
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

        const numSamples = parseInt(el.avgSamplesInput.value) || 10;
        const originalText = el.averageBtn.textContent;
        el.averageBtn.disabled = true;
        el.cftpBtn.disabled = true;
        el.startStopBtn.disabled = true;
        avgCancelled = false;
        el.avgStopBtn.style.display = 'inline-block';

        // Store height sums
        const heightSums = new Map();
        let completedSamples = 0;

        function runOneSample() {
            if (avgCancelled) {
                el.avgProgress.textContent = 'stopped';
                el.averageBtn.textContent = originalText;
                el.averageBtn.disabled = false;
                el.cftpBtn.disabled = false;
                el.startStopBtn.disabled = false;
                el.avgStopBtn.style.display = 'none';
                return;
            }

            el.avgProgress.textContent = `Sample ${completedSamples + 1}/${numSamples}...`;
            el.averageBtn.textContent = `${completedSamples + 1}/${numSamples}`;

            // Initialize and run CFTP
            sim.initCFTP();

            function cftpStep() {
                if (avgCancelled) {
                    el.avgProgress.textContent = 'stopped';
                    el.averageBtn.textContent = originalText;
                    el.averageBtn.disabled = false;
                    el.cftpBtn.disabled = false;
                    el.startStopBtn.disabled = false;
                    el.avgStopBtn.style.display = 'none';
                    return;
                }

                const res = sim.stepCFTP();
                if (res.status === 'in_progress') {
                    el.avgProgress.textContent = `Sample ${completedSamples + 1}/${numSamples}: T=${res.T} @${res.step}`;
                    setTimeout(cftpStep, 0);
                } else if (res.status === 'not_coalesced') {
                    el.avgProgress.textContent = `Sample ${completedSamples + 1}/${numSamples}: T=${res.T}`;
                    setTimeout(cftpStep, 0);
                } else if (res.status === 'coalesced') {
                    sim.finalizeCFTP();

                    // Compute height function for this sample
                    const heights = computeHeightFunction(sim.dimers);

                    // Add to sums
                    for (const [key, h] of heights) {
                        if (!heightSums.has(key)) {
                            heightSums.set(key, 0);
                        }
                        heightSums.set(key, heightSums.get(key) + h);
                    }

                    completedSamples++;

                    if (completedSamples < numSamples) {
                        // Run next sample
                        setTimeout(runOneSample, 0);
                    } else {
                        // All samples done - compute average and display
                        finishAveraging();
                    }
                } else if (res.status === 'timeout') {
                    setTimeout(cftpStep, 0);
                } else {
                    // timeout or error - try next sample anyway
                    completedSamples++;
                    if (completedSamples < numSamples) {
                        setTimeout(runOneSample, 0);
                    } else {
                        finishAveraging();
                    }
                }
            }

            setTimeout(cftpStep, 0);
        }

        function finishAveraging() {
            // Compute averaged heights (rounded to nearest integer)
            const avgHeights = new Map();
            for (const [key, sum] of heightSums) {
                avgHeights.set(key, Math.round(sum / completedSamples));
            }

            // Reconstruct dimers from averaged heights
            const avgDimers = reconstructDimersFromHeights(avgHeights, sim.blackTriangles, sim.whiteTriangles);

            // Display the result
            sim.dimers = avgDimers;
            draw();

            el.avgProgress.textContent = `Done (${completedSamples} samples)`;
            el.averageBtn.textContent = originalText;
            el.averageBtn.disabled = false;
            el.cftpBtn.disabled = false;
            el.startStopBtn.disabled = false;
            el.avgStopBtn.style.display = 'none';
        }

        setTimeout(runOneSample, 10);
    });

    el.avgStopBtn.addEventListener('click', () => {
        avgCancelled = true;
    });

    // Fluctuations (GFF) - difference of two samples divided by sqrt(2)
    el.fluctuationsBtn.addEventListener('click', () => {
        if (!isValid) return;

        // Stop any running simulation
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

        const originalText = el.fluctuationsBtn.textContent;
        el.fluctuationsBtn.disabled = true;
        el.cftpBtn.disabled = true;
        el.startStopBtn.disabled = true;
        el.averageBtn.disabled = true;
        fluctCancelled = false;

        let sample1Heights = null;
        let sample2Heights = null;
        let currentSample = 1;

        function runSample() {
            if (fluctCancelled) {
                el.fluctProgress.textContent = 'stopped';
                el.fluctuationsBtn.textContent = originalText;
                el.fluctuationsBtn.disabled = false;
                el.cftpBtn.disabled = false;
                el.startStopBtn.disabled = false;
                el.averageBtn.disabled = false;
                return;
            }

            el.fluctProgress.textContent = `Sample ${currentSample}/2...`;
            el.fluctuationsBtn.textContent = `${currentSample}/2`;

            sim.initCFTP();

            function cftpStep() {
                if (fluctCancelled) {
                    el.fluctProgress.textContent = 'stopped';
                    el.fluctuationsBtn.textContent = originalText;
                    el.fluctuationsBtn.disabled = false;
                    el.cftpBtn.disabled = false;
                    el.startStopBtn.disabled = false;
                    el.averageBtn.disabled = false;
                    return;
                }

                const res = sim.stepCFTP();
                if (res.status === 'in_progress') {
                    el.fluctProgress.textContent = `Sample ${currentSample}/2: T=${res.T} @${res.step}`;
                    setTimeout(cftpStep, 0);
                } else if (res.status === 'not_coalesced') {
                    el.fluctProgress.textContent = `Sample ${currentSample}/2: T=${res.T}`;
                    setTimeout(cftpStep, 0);
                } else if (res.status === 'coalesced') {
                    sim.finalizeCFTP();
                    const heights = computeHeightFunction(sim.dimers);

                    if (currentSample === 1) {
                        sample1Heights = heights;
                        currentSample = 2;
                        setTimeout(runSample, 0);
                    } else {
                        sample2Heights = heights;
                        finishFluctuations();
                    }
                } else {
                    // timeout or error
                    el.fluctProgress.textContent = 'error';
                    el.fluctuationsBtn.textContent = originalText;
                    el.fluctuationsBtn.disabled = false;
                    el.cftpBtn.disabled = false;
                    el.startStopBtn.disabled = false;
                    el.averageBtn.disabled = false;
                }
            }

            setTimeout(cftpStep, 0);
        }

        function finishFluctuations() {
            // Compute raw (h1 - h2) / sqrt(2) and store for dynamic re-rendering
            rawFluctuations = new Map();
            const sqrt2 = Math.sqrt(2);

            for (const [key, h1] of sample1Heights) {
                const h2 = sample2Heights.get(key) || 0;
                rawFluctuations.set(key, (h1 - h2) / sqrt2);
            }

            // Switch to 3D view if not already
            if (!is3DView) {
                setViewMode(true);
            }

            // Lock fluctuation mode to prevent draw() from overwriting
            inFluctuationMode = true;

            // Render with current scale
            renderFluctuations();

            el.fluctProgress.textContent = 'Done';
            el.fluctuationsBtn.textContent = originalText;
            el.fluctuationsBtn.disabled = false;
            el.cftpBtn.disabled = false;
            el.startStopBtn.disabled = false;
            el.averageBtn.disabled = false;
        }

        setTimeout(runSample, 10);
    });

    // Dynamic scale update for fluctuations
    el.fluctScaleInput.addEventListener('input', () => {
        renderFluctuations();
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

    // JSON Export - save shape to file
    document.getElementById('export-json').addEventListener('click', () => {
        const triangles = [];
        for (const [key, tri] of activeTriangles) {
            triangles.push({ n: tri.n, j: tri.j, type: tri.type });
        }
        const data = {
            version: 1,
            triangles: triangles
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'lozenge_shape.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    });

    // Height CSV coordinate info - toggle visibility
    const csvInfoBox = document.getElementById('height-csv-info-box');
    document.getElementById('height-csv-info').addEventListener('click', () => {
        csvInfoBox.style.display = csvInfoBox.style.display === 'none' ? 'block' : 'none';
    });

    // Mathematica plotting code - toggle visibility
    const mmaInfoBox = document.getElementById('height-mma-info-box');
    document.getElementById('height-mma-info').addEventListener('click', () => {
        mmaInfoBox.style.display = mmaInfoBox.style.display === 'none' ? 'block' : 'none';
    });

    // Height CSV Export - export height function to CSV
    document.getElementById('export-height-csv').addEventListener('click', () => {
        if (!isValid || sim.dimers.length === 0) {
            alert('No valid tiling to export. Create a valid tileable region first.');
            return;
        }

        const heights = computeHeightFunction(sim.dimers);

        // Build CSV with header
        let csv = 'n,j,x,y,h\n';
        for (const [key, h] of heights) {
            const [n, j] = key.split(',').map(Number);
            const vertex = getVertex(n, j);
            csv += `${n},${j},${vertex.x.toFixed(6)},${vertex.y.toFixed(6)},${-h}\n`;
        }

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'lozenge_height_function.csv';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    });

    // Height Mathematica Export - copy height function to clipboard in Mathematica format
    document.getElementById('export-height-mma').addEventListener('click', () => {
        if (!isValid || sim.dimers.length === 0) {
            alert('No valid tiling to export. Create a valid tileable region first.');
            return;
        }

        const heights = computeHeightFunction(sim.dimers);

        // Build Mathematica list format: { {x1,y1,h1}, {x2,y2,h2}, ... }
        const entries = [];
        for (const [key, h] of heights) {
            const [n, j] = key.split(',').map(Number);
            const vertex = getVertex(n, j);
            entries.push(`{${vertex.x.toFixed(6)}, ${vertex.y.toFixed(6)}, ${-h}}`);
        }
        const mma = `{\n${entries.join(',\n')}\n}`;

        // Copy to clipboard
        navigator.clipboard.writeText(mma).then(() => {
            // Brief visual feedback
            const btn = document.getElementById('export-height-mma');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = originalText; }, 1500);
        }).catch(err => {
            alert('Failed to copy to clipboard: ' + err);
        });
    });

    // JSON Import - load shape from file
    document.getElementById('import-json').addEventListener('click', () => {
        document.getElementById('import-json-file').click();
    });

    document.getElementById('import-json-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data.triangles || !Array.isArray(data.triangles)) {
                    alert('Invalid shape file: missing triangles array');
                    return;
                }

                saveState();
                activeTriangles.clear();

                for (const tri of data.triangles) {
                    if (tri.n !== undefined && tri.j !== undefined && tri.type !== undefined) {
                        const key = `${tri.n},${tri.j},${tri.type}`;
                        activeTriangles.set(key, { n: tri.n, j: tri.j, type: tri.type });
                    }
                }

                reinitialize();
                renderer.fitToRegion(activeTriangles);
                draw();
            } catch (err) {
                alert('Failed to parse shape file: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
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
