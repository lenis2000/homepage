---
title: Glauber dynamics for lozenge tilings of a C2 region
model: lozenge-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-11-26-c2-region-glauber.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-11-26-c2-region-glauber.cpp'
    txt: 'C++ code for the simulation (compiled to WebAssembly)'
---

<style>
  /* Interface container and responsive layout */
  .interface-container {
    display: grid;
    gap: 16px;
    padding: 16px;
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Desktop layout */
  @media (min-width: 768px) {
    .interface-container {
      grid-template-columns: repeat(2, 1fr);
    }

    .control-group.full-width,
    .full-width {
      grid-column: 1 / -1;
    }
  }

  /* Mobile layout */
  @media (max-width: 767px) {
    .interface-container {
      grid-template-columns: 1fr;
    }
  }

  /* Visual grouping */
  .control-group {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .control-group-title {
    font-size: 12px;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Canvas styling */
  #lozenge-canvas {
    width: 100%;
    max-width: 900px;
    height: 500px;
    border: 1px solid #ccc;
    display: block;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 8px;
  }

  [data-theme="dark"] #lozenge-canvas {
    background: #1a1a1a;
    border-color: #444;
  }

  /* Slider styling */
  .slider-group {
    margin: 12px 0;
  }

  .slider-group label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    color: #555;
    font-size: 13px;
  }

  .slider-group label span {
    color: #1976d2;
    font-family: 'SF Mono', Monaco, monospace;
    font-weight: 600;
  }

  input[type="range"] {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #d0d0d0;
    appearance: none;
    outline: none;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4CAF50, #66BB6A);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(76, 175, 80, 0.4);
  }

  /* Button styling */
  .button-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  button {
    height: 36px;
    padding: 0 16px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    background: white;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  button:hover {
    background: #f5f5f5;
    border-color: #999;
  }

  button:active {
    background: #e0e0e0;
  }

  button.primary {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
  }

  button.primary:hover {
    background: #45a049;
  }

  button.running {
    background: linear-gradient(135deg, #ff5722, #ff9800);
    color: white;
    border-color: #ff5722;
  }

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-box {
    background: white;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  }

  .stat-box .label {
    color: #888;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .stat-box .value {
    color: #1976d2;
    font-size: 16px;
    font-weight: 600;
    font-family: 'SF Mono', Monaco, monospace;
  }

  /* Select styling */
  select {
    height: 36px;
    padding: 0 12px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 14px;
    background: white;
    cursor: pointer;
  }

  /* Checkbox styling */
  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
    color: #555;
    font-size: 13px;
  }

  .checkbox-group input {
    accent-color: #4CAF50;
  }

  /* Color legend */
  .color-legend {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #fafafa;
    border-radius: 8px;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .color-box {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid rgba(0,0,0,0.1);
  }

  /* Details/accordion styling */
  details {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 12px;
  }

  details > summary {
    padding: 12px 16px;
    background: #f5f5f5;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
  }

  details[open] > summary {
    border-bottom: 1px solid #e0e0e0;
  }

  details > .content {
    padding: 16px;
    background: white;
  }

  /* Mobile optimizations */
  @media (max-width: 767px) {
    .interface-container {
      padding: 8px;
      gap: 8px;
    }

    .control-group {
      padding: 10px;
    }

    #lozenge-canvas {
      height: 350px;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }

    .stat-box {
      padding: 8px;
    }

    .stat-box .value {
      font-size: 14px;
    }

    button {
      min-height: 44px;
      font-size: 13px;
    }
  }

  /* Dark theme support */
  [data-theme="dark"] .control-group {
    background-color: #2d2d2d;
    border-color: #444;
  }

  [data-theme="dark"] .control-group-title {
    color: #bbb;
  }

  [data-theme="dark"] label {
    color: #bbb;
  }

  [data-theme="dark"] button {
    background-color: #3a3a3a;
    border-color: #555;
    color: #ddd;
  }

  [data-theme="dark"] .stat-box {
    background: #3a3a3a;
    border-color: #555;
  }

  [data-theme="dark"] .stat-box .label {
    color: #999;
  }

  [data-theme="dark"] select {
    background-color: #3a3a3a;
    border-color: #555;
    color: #ddd;
  }

  /* 3D container styling */
  #three-container {
    width: 100%;
    max-width: 900px;
    height: 500px;
    margin: 0 auto;
    border: 1px solid #ccc;
    display: none;
    background: #ffffff;
    border-radius: 8px;
  }

  [data-theme="dark"] #three-container {
    background: #1a1a1a;
    border-color: #444;
  }

  #three-canvas {
    width: 100%;
    height: 100%;
  }

  /* Parameter display */
  .param-display {
    background: #e3f2fd;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 13px;
    color: #1565c0;
    margin-bottom: 12px;
  }

  [data-theme="dark"] .param-display {
    background: #1a237e;
    color: #90caf9;
  }
</style>

<script src="/js/three.min.js"></script>
<script src="/js/OrbitControls.js"></script>
<script src="/js/colorschemes.js"></script>
<script src="/js/2025-11-26-c2-region-glauber.js"></script>

<!-- Controls for the simulation -->
<div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; padding: 16px; max-width: 1200px; margin: 0 auto;">

<!-- Shape Parameters (2 cols) -->
<div class="control-group">
  <div class="control-group-title">C2 Polygon Shape</div>
  <div class="param-display">a = b + c + e - d = <span id="paramAVal">18</span> (grid: a × a × 2h)</div>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px;">
    <div class="slider-group">
      <label>b <span id="paramBVal">10</span></label>
      <input type="range" id="paramBSlider" min="2" max="200" value="10">
    </div>
    <div class="slider-group">
      <label>c <span id="paramCVal">4</span></label>
      <input type="range" id="paramCSlider" min="1" max="200" value="4">
    </div>
    <div class="slider-group">
      <label>d <span id="paramDVal">4</span></label>
      <input type="range" id="paramDSlider" min="1" max="200" value="4">
    </div>
    <div class="slider-group">
      <label>e <span id="paramEVal">8</span></label>
      <input type="range" id="paramESlider" min="1" max="200" value="8">
    </div>
    <div class="slider-group">
      <label>h (height param) <span id="paramHVal">15</span></label>
      <input type="range" id="paramHSlider" min="1" max="200" value="15">
    </div>
  </div>
</div>

<!-- Display Options (1 col) -->
<div class="control-group">
  <div class="control-group-title">Display Options</div>
  <div class="checkbox-group">
    <input type="checkbox" id="show3DView">
    <label for="show3DView">3D view</label>
  </div>
  <div class="checkbox-group">
    <input type="checkbox" id="showGradient">
    <label for="showGradient">Color gradient</label>
  </div>
  <div class="checkbox-group">
    <input type="checkbox" id="showWalls" checked>
    <label for="showWalls">Room outline</label>
  </div>
  <div class="checkbox-group">
    <input type="checkbox" id="showWallGrid" checked>
    <label for="showWallGrid">Room outline grid</label>
  </div>
  <div class="checkbox-group">
    <input type="checkbox" id="showRegion3Wall">
    <label for="showRegion3Wall">Region 0-h back wall</label>
  </div>
  <div class="button-row" style="margin-top: 12px;">
    <button id="prev-palette">&#9664;</button>
    <select id="palette-select"></select>
    <button id="next-palette">&#9654;</button>
  </div>
</div>

<!-- Simulation Controls (spans both columns) -->
<div class="control-group" style="grid-column: 1 / -1;">
  <div class="control-group-title">Simulation</div>
  <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
    <div class="button-row">
      <button id="startStopBtn" class="primary">Start</button>
      <button id="resetViewBtn">Reset View</button>
    </div>
    <div class="slider-group" style="flex: 1; min-width: 200px;">
      <label>Steps per Frame <span id="stepsVal">50k</span></label>
      <input type="range" id="stepsSlider" min="1000" max="200000" value="50000" step="1000">
    </div>
    <div class="slider-group" style="flex: 1; min-width: 200px;">
      <label>Bias <span id="biasVal">0.000</span></label>
      <input type="range" id="biasSlider" min="-500" max="500" value="0">
    </div>
  </div>
</div>

</div> <!-- End controls grid -->

<!-- Visualization canvas (2D) -->
<canvas id="lozenge-canvas"></canvas>

<!-- 3D Visualization container -->
<div id="three-container">
  <canvas id="three-canvas"></canvas>
</div>

<!-- Statistics (below canvas) -->
<div class="interface-container">
<div class="control-group full-width">
  <div class="control-group-title">Statistics</div>
  <div class="stats-grid">
    <div class="stat-box">
      <div class="label">Monte Carlo Steps</div>
      <div class="value" id="stepCount">0</div>
    </div>
    <div class="stat-box">
      <div class="label">Accept Rate</div>
      <div class="value" id="acceptRate">0%</div>
    </div>
    <div class="stat-box">
      <div class="label">Total Volume</div>
      <div class="value" id="cubeCount">0</div>
    </div>
    <div class="stat-box">
      <div class="label">Frame Rate</div>
      <div class="value" id="fps">0</div>
    </div>
  </div>
</div>

<!-- Styling -->
<div class="control-group full-width">
  <div class="control-group-title">Styling</div>
  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
    <label style="font-size: 13px; color: #555;">Border Width:</label>
    <input id="border-width" type="number" value="0.8" step="0.1" min="0" max="5" style="width: 70px; height: 28px; padding: 0 8px; border: 1px solid #d0d0d0; border-radius: 4px;">
    <button id="border-thin">Thin</button>
    <button id="border-medium">Medium</button>
    <button id="border-thick">Thick</button>
    <button id="border-ultra-thick">Ultra</button>
  </div>
</div>

<!-- Export -->
<div class="control-group full-width">
  <div class="control-group-title">Export</div>
  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
    <button id="export-png">PNG</button>
    <button id="export-pdf">PDF (Vector)</button>
    <button id="export-csv">CSV (Heights)</button>
    <span style="font-size: 12px; color: #666;">PNG Quality:</span>
    <input type="range" id="export-quality" min="0" max="100" value="85" style="width: 80px;">
    <span id="export-quality-val" style="font-size: 12px; color: #1976d2; min-width: 24px;">85</span>
  </div>
</div>
</div>

<!-- Color Legend -->
<details id="legend-details">
  <summary>Color Legend</summary>
  <div class="content">
    <div class="color-legend">
      <span class="legend-item">
        <span class="color-box" id="swatch-top" style="background-color: #a8d8ff;"></span>
        Top Face
      </span>
      <span class="legend-item">
        <span class="color-box" id="swatch-right" style="background-color: #5a9fd4;"></span>
        Right Face
      </span>
      <span class="legend-item">
        <span class="color-box" id="swatch-left" style="background-color: #3d7ab8;"></span>
        Left Face
      </span>
      <span class="legend-item" id="palette-name-display">
        <strong>UVA</strong>
      </span>
    </div>
  </div>
</details>


<script>
// Check if Module is defined
if (typeof Module === 'undefined') {
    console.error('Module is not defined. Make sure the WASM JavaScript file is loaded correctly.');
    window.Module = { onRuntimeInitialized: function() {} };
}

Module.onRuntimeInitialized = async function() {

    // === WASM Interface ===
    class GlauberWASM {
        constructor() {
            this.ready = false;
            this.gridSize = 60;
            this.heights = null;
            this.mask = null;
            this.n = 60;
            this.maxHeight = 30;
        }

        async initialize() {
            if (typeof Module.cwrap !== 'function') {
                throw new Error('Module.cwrap is not available');
            }

            this.initDomain = Module.cwrap('initDomain', 'number',
                ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']);
            this.performGlauberSteps = Module.cwrap('performGlauberSteps', 'number', ['number']);
            this.exportHeights = Module.cwrap('exportHeights', 'number', []);
            this.updatePolygonParamsWasm = Module.cwrap('updatePolygonParams', 'number',
                ['number', 'number', 'number', 'number', 'number']);
            this.setMode = Module.cwrap('setMode', 'number', ['number', 'number']);
            this.updateBiasWasm = Module.cwrap('updateBias', 'number', ['number']);
            this.freeString = Module.cwrap('freeString', null, ['number']);
            this.getTotalCubes = Module.cwrap('getTotalCubes', 'number', []);
            this.getAcceptRate = Module.cwrap('getAcceptRate', 'number', []);

            this.ready = true;
            console.log('C2 Region Glauber WASM module loaded successfully');
        }

        async init(gridSize, paramB, paramC, paramD, paramE, paramH, bias, mode) {
            if (!this.ready) throw new Error('WASM not ready');

            const ptr = this.initDomain(gridSize, paramB, paramC, paramD, paramE, paramH, bias, mode);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeString(ptr);

            const result = JSON.parse(jsonStr);
            if (result.error) throw new Error(result.error);

            this.gridSize = gridSize;
            this.n = result.n;
            this.maxHeight = result.maxHeight;

            await this.refreshHeights();
            return result;
        }

        async step(numSteps) {
            if (!this.ready) throw new Error('WASM not ready');

            const ptr = this.performGlauberSteps(numSteps);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeString(ptr);

            const result = JSON.parse(jsonStr);
            if (result.error) throw new Error(result.error);

            await this.refreshHeights();
            return result;
        }

        async refreshHeights() {
            const ptr = this.exportHeights();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeString(ptr);

            const result = JSON.parse(jsonStr);
            if (!result.error) {
                this.heights = result.heights;
                this.mask = result.mask;
                this.n = result.n;
                this.maxHeight = result.maxHeight;
            }
        }

        async updatePolygonParams(paramB, paramC, paramD, paramE, paramH) {
            if (!this.ready) throw new Error('WASM not ready');

            const ptr = this.updatePolygonParamsWasm(paramB, paramC, paramD, paramE, paramH);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeString(ptr);

            const result = JSON.parse(jsonStr);
            if (result.error) throw new Error(result.error);

            this.maxHeight = result.maxHeight;
            await this.refreshHeights();
            return result;
        }

        async setModeAndBias(mode, bias) {
            if (!this.ready) throw new Error('WASM not ready');

            const ptr = this.setMode(mode, bias);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeString(ptr);

            const result = JSON.parse(jsonStr);
            if (result.error) throw new Error(result.error);

            await this.refreshHeights();
            return result;
        }

        async updateBias(bias) {
            if (!this.ready) throw new Error('WASM not ready');

            const ptr = this.updateBiasWasm(bias);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeString(ptr);

            const result = JSON.parse(jsonStr);
            if (result.error) throw new Error(result.error);

            return result;
        }
    }

    // === Renderer ===
    class IsometricRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.baseTileSize = 10;
            this.showGradient = false;
            this.showOutlines = true;
            this.showWalls = true;
            this.showWallGrid = true;
            this.showRegion3Wall = false;
            this.currentPaletteIndex = 0;
            this.borderWidth = 0.8;

            // Zoom and pan state
            this.zoomLevel = 1.0;
            this.panX = 0;
            this.panY = 0;
            this.isPanning = false;
            this.lastMouseX = 0;
            this.lastMouseY = 0;

            // Load color schemes
            this.colorPalettes = window.ColorSchemes || [
                { name: 'UVA', colors: ['#E57200', '#232D4B', '#F9DCBF', '#002D62'] }
            ];

            this.setupCanvas();
            this.setupMouseHandlers();
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

        setupMouseHandlers() {
            // Mouse wheel zoom
            this.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                const newZoom = Math.max(0.2, Math.min(5.0, this.zoomLevel * zoomFactor));

                // Zoom towards mouse position
                const scale = newZoom / this.zoomLevel;
                this.panX = mouseX - (mouseX - this.panX) * scale;
                this.panY = mouseY - (mouseY - this.panY) * scale;

                this.zoomLevel = newZoom;

                if (this.onRedraw) this.onRedraw();
            });

            // Mouse drag to pan
            this.canvas.addEventListener('mousedown', (e) => {
                this.isPanning = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            });

            window.addEventListener('mousemove', (e) => {
                if (!this.isPanning) return;

                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;

                this.panX += dx;
                this.panY += dy;

                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;

                if (this.onRedraw) this.onRedraw();
            });

            window.addEventListener('mouseup', () => {
                this.isPanning = false;
                this.canvas.style.cursor = 'grab';
            });

            // Touch support
            let lastTouchDistance = 0;

            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (e.touches.length === 1) {
                    this.isPanning = true;
                    this.lastMouseX = e.touches[0].clientX;
                    this.lastMouseY = e.touches[0].clientY;
                } else if (e.touches.length === 2) {
                    this.isPanning = false;
                    lastTouchDistance = Math.hypot(
                        e.touches[1].clientX - e.touches[0].clientX,
                        e.touches[1].clientY - e.touches[0].clientY
                    );
                }
            });

            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (e.touches.length === 1 && this.isPanning) {
                    const dx = e.touches[0].clientX - this.lastMouseX;
                    const dy = e.touches[0].clientY - this.lastMouseY;

                    this.panX += dx;
                    this.panY += dy;

                    this.lastMouseX = e.touches[0].clientX;
                    this.lastMouseY = e.touches[0].clientY;

                    if (this.onRedraw) this.onRedraw();
                } else if (e.touches.length === 2) {
                    const distance = Math.hypot(
                        e.touches[1].clientX - e.touches[0].clientX,
                        e.touches[1].clientY - e.touches[0].clientY
                    );

                    if (lastTouchDistance > 0) {
                        const zoomFactor = distance / lastTouchDistance;
                        const newZoom = Math.max(0.2, Math.min(5.0, this.zoomLevel * zoomFactor));

                        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                        const rect = this.canvas.getBoundingClientRect();
                        const mouseX = centerX - rect.left;
                        const mouseY = centerY - rect.top;

                        const scale = newZoom / this.zoomLevel;
                        this.panX = mouseX - (mouseX - this.panX) * scale;
                        this.panY = mouseY - (mouseY - this.panY) * scale;

                        this.zoomLevel = newZoom;

                        if (this.onRedraw) this.onRedraw();
                    }
                    lastTouchDistance = distance;
                }
            });

            this.canvas.addEventListener('touchend', () => {
                this.isPanning = false;
                lastTouchDistance = 0;
            });

            // Set initial cursor
            this.canvas.style.cursor = 'grab';
        }

        resetView() {
            // Reset to default - draw() already auto-scales to fit
            this.zoomLevel = 1.0;
            this.panX = 0;
            this.panY = 0;
            if (this.onRedraw) this.onRedraw();
        }

        getCurrentPalette() {
            return this.colorPalettes[this.currentPaletteIndex];
        }

        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ] : [128, 128, 128];
        }

        rgbToString(rgb) {
            return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        }

        darken(rgb, factor) {
            return [
                Math.round(rgb[0] * factor),
                Math.round(rgb[1] * factor),
                Math.round(rgb[2] * factor)
            ];
        }

        lerpColor(c1, c2, t) {
            return [
                Math.round(c1[0] + (c2[0] - c1[0]) * t),
                Math.round(c1[1] + (c2[1] - c1[1]) * t),
                Math.round(c1[2] + (c2[2] - c1[2]) * t)
            ];
        }

        // Draw back walls at x=0 and y=0
        drawBackWalls(ctx, centerX, centerY, dx, dy, n, maxHeight, wallRightColor, wallLeftColor, floorColor, tileSize) {
            const wallHeight = maxHeight * tileSize;

            // Floor (bottom surface at height 0)
            ctx.fillStyle = this.rgbToString(floorColor);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + n * dx, centerY + n * dy);
            ctx.lineTo(centerX + (n - n) * dx, centerY + (n + n) * dy);
            ctx.lineTo(centerX - n * dx, centerY + n * dy);
            ctx.closePath();
            ctx.fill();
            if (this.showOutlines) {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = this.borderWidth;
                ctx.stroke();
            }

            // Left back wall (at y=0)
            ctx.fillStyle = this.rgbToString(wallRightColor);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + n * dx, centerY + n * dy);
            ctx.lineTo(centerX + n * dx, centerY + n * dy - wallHeight);
            ctx.lineTo(centerX, centerY - wallHeight);
            ctx.closePath();
            ctx.fill();
            if (this.showOutlines) {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = this.borderWidth;
                ctx.stroke();
            }

            // Right back wall (at x=0)
            ctx.fillStyle = this.rgbToString(wallLeftColor);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX - n * dx, centerY + n * dy);
            ctx.lineTo(centerX - n * dx, centerY + n * dy - wallHeight);
            ctx.lineTo(centerX, centerY - wallHeight);
            ctx.closePath();
            ctx.fill();
            if (this.showOutlines) {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = this.borderWidth;
                ctx.stroke();
            }

            // Draw grid lines on walls - full lozenge grid
            if (this.showWallGrid && this.showOutlines) {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = this.borderWidth;

                // Horizontal lines on both walls (every height unit)
                for (let h = 0; h <= maxHeight; h++) {
                    const hOffset = h * tileSize;
                    // Left back wall
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY - hOffset);
                    ctx.lineTo(centerX + n * dx, centerY + n * dy - hOffset);
                    ctx.stroke();
                    // Right back wall
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY - hOffset);
                    ctx.lineTo(centerX - n * dx, centerY + n * dy - hOffset);
                    ctx.stroke();
                }

                // Vertical lines on left wall (every grid unit)
                for (let x = 0; x <= n; x++) {
                    ctx.beginPath();
                    ctx.moveTo(centerX + x * dx, centerY + x * dy);
                    ctx.lineTo(centerX + x * dx, centerY + x * dy - wallHeight);
                    ctx.stroke();
                }

                // Vertical lines on right wall (every grid unit)
                for (let y = 0; y <= n; y++) {
                    ctx.beginPath();
                    ctx.moveTo(centerX - y * dx, centerY + y * dy);
                    ctx.lineTo(centerX - y * dx, centerY + y * dy - wallHeight);
                    ctx.stroke();
                }

                // Floor grid lines
                for (let x = 0; x <= n; x++) {
                    ctx.beginPath();
                    ctx.moveTo(centerX + x * dx, centerY + x * dy);
                    ctx.lineTo(centerX + (x - n) * dx, centerY + (x + n) * dy);
                    ctx.stroke();
                }
                for (let y = 0; y <= n; y++) {
                    ctx.beginPath();
                    ctx.moveTo(centerX - y * dx, centerY + y * dy);
                    ctx.lineTo(centerX + (n - y) * dx, centerY + (n + y) * dy);
                    ctx.stroke();
                }
            }
        }

        draw(heights, mask, n, maxHeight) {
            const ctx = this.ctx;
            const palette = this.getCurrentPalette();

            // Convert palette colors to RGB
            const topColor = this.hexToRgb(palette.colors[0]);
            const rightColor = this.hexToRgb(palette.colors[1]);
            const leftColor = this.hexToRgb(palette.colors[2]);
            const fourthColor = palette.colors[3] ? this.hexToRgb(palette.colors[3]) : this.darken(topColor, 0.3);

            // Wall and floor colors - same as lozenge faces
            const wallRightColor = rightColor;
            const wallLeftColor = leftColor;
            const floorColor = topColor;

            // Detect dark mode
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' ||
                              window.matchMedia('(prefers-color-scheme: dark)').matches;

            // Clear canvas with appropriate background
            ctx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
            ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

            const angle = Math.PI / 6;
            const cos30 = Math.cos(angle);
            const sin30 = Math.sin(angle);

            // Calculate tileSize to fit the tiling in the canvas
            // Width of tiling: 2 * n * cos(30°) * tileSize
            // Height of tiling: (2 * n * sin(30°) + maxHeight) * tileSize
            const tilingWidthFactor = 2 * n * cos30;
            const tilingHeightFactor = 2 * n * sin30 + maxHeight;

            // Calculate base tile size to fit with some padding
            const padding = 0.9;
            const tileSizeForWidth = (this.displayWidth * padding) / tilingWidthFactor;
            const tileSizeForHeight = (this.displayHeight * padding) / tilingHeightFactor;
            const baseTileSize = Math.min(tileSizeForWidth, tileSizeForHeight);

            // Apply zoom
            const tileSize = Math.max(1, baseTileSize * this.zoomLevel);

            const dx = tileSize * cos30;
            const dy = tileSize * sin30;

            // Calculate center position to show the full tiling
            // The tiling extends from (0,0) to (n,n) in grid coords
            // In screen coords: x ranges from -n*dx to +n*dx, y ranges from -maxHeight*tileSize to +2*n*dy
            // Center the bounding box in the canvas
            const baseCenterX = this.displayWidth / 2;
            const baseCenterY = this.displayHeight / 2 + (maxHeight * tileSize) / 2 - n * dy;
            const centerX = baseCenterX + this.panX;
            const centerY = baseCenterY + this.panY;

            // Draw back walls first (behind everything)
            if (this.showWalls) {
                this.drawBackWalls(ctx, centerX, centerY, dx, dy, n, maxHeight, wallRightColor, wallLeftColor, floorColor, tileSize);
            }

            // Draw Region 3 (0-h) back wall at boundary with Region 2
            // This wall is drawn from Region 2's perspective - looking back at Region 3
            if (this.showRegion3Wall) {
                const halfHeight = maxHeight / 2; // h = maxHeight/2
                const outlineColor = 'rgba(0, 0, 0, 0.5)';

                // Find boundary cells where Region 2 (mask==2) meets Region 3 (mask==3)
                // Draw wall on the Region 2 side facing back toward Region 3
                for (let x = 0; x < n; x++) {
                    for (let y = 0; y < n; y++) {
                        const idx = y * n + x;
                        if (mask[idx] !== 2) continue; // Only process Region 2 cells

                        // Check if neighbor in -x direction is Region 3
                        if (x > 0) {
                            const leftIdx = y * n + (x - 1);
                            if (mask[leftIdx] === 3) {
                                // Draw back wall on -x side (left-facing from Region 2)
                                const sx = centerX + (x - y) * dx;
                                const baseY = centerY + (x + y) * dy;

                                // Wall face (this is a "left" wall when looking from Region 2 back to Region 3)
                                ctx.fillStyle = this.rgbToString(rightColor);
                                ctx.beginPath();
                                ctx.moveTo(sx - dx, baseY - dy);
                                ctx.lineTo(sx - dx, baseY - dy - halfHeight * tileSize);
                                ctx.lineTo(sx, baseY - halfHeight * tileSize);
                                ctx.lineTo(sx, baseY);
                                ctx.closePath();
                                ctx.fill();

                                if (this.showOutlines) {
                                    ctx.strokeStyle = outlineColor;
                                    ctx.lineWidth = this.borderWidth;
                                    ctx.stroke();
                                    for (let level = 1; level < halfHeight; level++) {
                                        const levelOffset = level * tileSize;
                                        ctx.beginPath();
                                        ctx.moveTo(sx - dx, baseY - dy - levelOffset);
                                        ctx.lineTo(sx, baseY - levelOffset);
                                        ctx.stroke();
                                    }
                                }
                            }
                        }

                        // Check if neighbor in -y direction is Region 3
                        if (y > 0) {
                            const upIdx = (y - 1) * n + x;
                            if (mask[upIdx] === 3) {
                                // Draw back wall on -y side (right-facing from Region 2)
                                const sx = centerX + (x - y) * dx;
                                const baseY = centerY + (x + y) * dy;

                                // Wall face
                                ctx.fillStyle = this.rgbToString(leftColor);
                                ctx.beginPath();
                                ctx.moveTo(sx + dx, baseY - dy);
                                ctx.lineTo(sx + dx, baseY - dy - halfHeight * tileSize);
                                ctx.lineTo(sx, baseY - halfHeight * tileSize);
                                ctx.lineTo(sx, baseY);
                                ctx.closePath();
                                ctx.fill();

                                if (this.showOutlines) {
                                    ctx.strokeStyle = outlineColor;
                                    ctx.lineWidth = this.borderWidth;
                                    ctx.stroke();
                                    for (let level = 1; level < halfHeight; level++) {
                                        const levelOffset = level * tileSize;
                                        ctx.beginPath();
                                        ctx.moveTo(sx + dx, baseY - dy - levelOffset);
                                        ctx.lineTo(sx, baseY - levelOffset);
                                        ctx.stroke();
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Draw cubes using painter's algorithm
            for (let x = 0; x < n; x++) {
                for (let y = 0; y < n; y++) {
                    const idx = y * n + x;
                    if (mask[idx] === 0) continue;

                    const h = heights[idx];
                    const sx = centerX + (x - y) * dx;
                    const sy = centerY + (x + y) * dy - h * tileSize;

                    // Height-based color gradient
                    let top = topColor;
                    let right = rightColor;
                    let left = leftColor;

                    if (this.showGradient && maxHeight > 0) {
                        const t = h / maxHeight;
                        top = this.lerpColor(this.darken(topColor, 0.7), topColor, t);
                        right = this.lerpColor(this.darken(rightColor, 0.6), rightColor, t);
                        left = this.lerpColor(this.darken(leftColor, 0.5), leftColor, t);
                    }

                    // Outline style (consistent dark lines)
                    const outlineColor = 'rgba(0, 0, 0, 0.5)';
                    const outlineWidth = this.borderWidth;

                    // Top face
                    ctx.fillStyle = this.rgbToString(top);
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx + dx, sy + dy);
                    ctx.lineTo(sx, sy + 2 * dy);
                    ctx.lineTo(sx - dx, sy + dy);
                    ctx.closePath();
                    ctx.fill();

                    if (this.showOutlines) {
                        ctx.strokeStyle = outlineColor;
                        ctx.lineWidth = outlineWidth;
                        ctx.stroke();
                    }

                    // Right face
                    let neighborH = 0;
                    if (x < n - 1) {
                        const rightIdx = y * n + (x + 1);
                        neighborH = (mask[rightIdx] > 0) ? heights[rightIdx] : 0;
                    }

                    if (h > neighborH) {
                        const drop = (h - neighborH) * tileSize;
                        ctx.fillStyle = this.rgbToString(right);
                        ctx.beginPath();
                        ctx.moveTo(sx + dx, sy + dy);
                        ctx.lineTo(sx + dx, sy + dy + drop);
                        ctx.lineTo(sx, sy + 2 * dy + drop);
                        ctx.lineTo(sx, sy + 2 * dy);
                        ctx.closePath();
                        ctx.fill();

                        if (this.showOutlines) {
                            ctx.strokeStyle = outlineColor;
                            ctx.lineWidth = outlineWidth;
                            // Outline the face
                            ctx.stroke();
                            // Draw horizontal level lines for each height unit
                            for (let level = 1; level < h - neighborH; level++) {
                                const levelOffset = level * tileSize;
                                ctx.beginPath();
                                ctx.moveTo(sx + dx, sy + dy + levelOffset);
                                ctx.lineTo(sx, sy + 2 * dy + levelOffset);
                                ctx.stroke();
                            }
                        }
                    }

                    // Left face
                    neighborH = 0;
                    if (y < n - 1) {
                        const downIdx = (y + 1) * n + x;
                        neighborH = (mask[downIdx] > 0) ? heights[downIdx] : 0;
                    }

                    if (h > neighborH) {
                        const drop = (h - neighborH) * tileSize;
                        ctx.fillStyle = this.rgbToString(left);
                        ctx.beginPath();
                        ctx.moveTo(sx - dx, sy + dy);
                        ctx.lineTo(sx - dx, sy + dy + drop);
                        ctx.lineTo(sx, sy + 2 * dy + drop);
                        ctx.lineTo(sx, sy + 2 * dy);
                        ctx.closePath();
                        ctx.fill();

                        if (this.showOutlines) {
                            ctx.strokeStyle = outlineColor;
                            ctx.lineWidth = outlineWidth;
                            // Outline the face
                            ctx.stroke();
                            // Draw horizontal level lines for each height unit
                            for (let level = 1; level < h - neighborH; level++) {
                                const levelOffset = level * tileSize;
                                ctx.beginPath();
                                ctx.moveTo(sx - dx, sy + dy + levelOffset);
                                ctx.lineTo(sx, sy + 2 * dy + levelOffset);
                                ctx.stroke();
                            }
                        }
                    }
                }
            }
        }

        setPalette(index) {
            this.currentPaletteIndex = index % this.colorPalettes.length;
            this.updateLegend();
        }

        nextPalette() {
            this.setPalette(this.currentPaletteIndex + 1);
        }

        prevPalette() {
            this.setPalette(this.currentPaletteIndex - 1 + this.colorPalettes.length);
        }

        updateLegend() {
            const palette = this.getCurrentPalette();
            document.getElementById('swatch-top').style.backgroundColor = palette.colors[0];
            document.getElementById('swatch-right').style.backgroundColor = palette.colors[1];
            document.getElementById('swatch-left').style.backgroundColor = palette.colors[2];
            document.getElementById('palette-name-display').innerHTML = `<strong>${palette.name}</strong>`;
        }
    }

    // === 3D Visualizer ===
    class Visualizer3D {
        constructor(container) {
            this.container = container;
            this.colors = {
                top: '#E57200',
                right: '#232D4B',
                left: '#F9DCBF',
                border: '#333333'
            };

            // Three.js setup
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xffffff);

            // Camera
            this.camera = new THREE.PerspectiveCamera(
                45,
                container.clientWidth / container.clientHeight,
                0.1,
                10000
            );
            this.camera.up.set(0, 0, 1);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: document.getElementById('three-canvas'),
                antialias: true
            });
            this.renderer.setSize(container.clientWidth, container.clientHeight);

            // Controls
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enablePan = true;
            this.controls.screenSpacePanning = false;
            this.controls.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            };

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            this.scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.position.set(10, 10, 15);
            this.scene.add(directionalLight);

            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
            directionalLight2.position.set(-10, -10, 10);
            this.scene.add(directionalLight2);

            // Group for geometry
            this.meshGroup = new THREE.Group();
            this.scene.add(this.meshGroup);

            // Handle window resize
            window.addEventListener('resize', () => this.handleResize());

            // Start animation loop
            this.animate();
        }

        handleResize() {
            if (this.container.style.display === 'none') return;
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

        updateColors(palette) {
            this.colors = {
                top: palette.colors[0],
                right: palette.colors[1],
                left: palette.colors[2],
                border: palette.colors[3] || '#333333'
            };
        }

        buildFromHeights(heights, mask, n, maxHeight) {
            // Clear existing geometry
            while (this.meshGroup.children.length > 0) {
                const child = this.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                this.meshGroup.remove(child);
            }

            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const normals = [];
            const colors = [];
            const indices = [];

            const topColor = new THREE.Color(this.colors.top);
            const rightColor = new THREE.Color(this.colors.right);
            const leftColor = new THREE.Color(this.colors.left);

            // Helper to add a quad face
            const addFace = (v1, v2, v3, v4, normal, color) => {
                const baseIndex = vertices.length / 3;
                vertices.push(...v1, ...v2, ...v3, ...v4);
                for (let i = 0; i < 4; i++) {
                    normals.push(...normal);
                    colors.push(color.r, color.g, color.b);
                }
                indices.push(
                    baseIndex, baseIndex + 1, baseIndex + 2,
                    baseIndex, baseIndex + 2, baseIndex + 3
                );
            };

            // Build visible faces for each cell
            for (let gy = 0; gy < n; gy++) {
                for (let gx = 0; gx < n; gx++) {
                    const idx = gy * n + gx;
                    if (mask[idx] === 0) continue;

                    const h = heights[idx];
                    if (h === 0) continue;

                    // Get neighbor heights
                    const hRight = (gx < n - 1 && mask[gy * n + (gx + 1)] > 0) ? heights[gy * n + (gx + 1)] : 0;
                    const hDown = (gy < n - 1 && mask[(gy + 1) * n + gx] > 0) ? heights[(gy + 1) * n + gx] : 0;

                    const wx = gx;
                    const wy = gy;

                    // Top face
                    addFace(
                        [wx, wy, h],
                        [wx + 1, wy, h],
                        [wx + 1, wy + 1, h],
                        [wx, wy + 1, h],
                        [0, 0, 1],
                        topColor
                    );

                    // Right face
                    if (h > hRight) {
                        for (let z = hRight; z < h; z++) {
                            addFace(
                                [wx + 1, wy, z],
                                [wx + 1, wy + 1, z],
                                [wx + 1, wy + 1, z + 1],
                                [wx + 1, wy, z + 1],
                                [1, 0, 0],
                                rightColor
                            );
                        }
                    }

                    // Front face
                    if (h > hDown) {
                        for (let z = hDown; z < h; z++) {
                            addFace(
                                [wx, wy + 1, z],
                                [wx, wy + 1, z + 1],
                                [wx + 1, wy + 1, z + 1],
                                [wx + 1, wy + 1, z],
                                [0, 1, 0],
                                leftColor
                            );
                        }
                    }

                    // Back walls
                    if (gx === 0 || mask[gy * n + (gx - 1)] === 0) {
                        const hLeft = (gx > 0 && mask[gy * n + (gx - 1)] > 0) ? heights[gy * n + (gx - 1)] : 0;
                        for (let z = hLeft; z < h; z++) {
                            addFace(
                                [wx, wy, z],
                                [wx, wy, z + 1],
                                [wx, wy + 1, z + 1],
                                [wx, wy + 1, z],
                                [-1, 0, 0],
                                rightColor
                            );
                        }
                    }

                    if (gy === 0 || mask[(gy - 1) * n + gx] === 0) {
                        const hUp = (gy > 0 && mask[(gy - 1) * n + gx] > 0) ? heights[(gy - 1) * n + gx] : 0;
                        for (let z = hUp; z < h; z++) {
                            addFace(
                                [wx, wy, z],
                                [wx + 1, wy, z],
                                [wx + 1, wy, z + 1],
                                [wx, wy, z + 1],
                                [0, -1, 0],
                                leftColor
                            );
                        }
                    }
                }
            }

            if (vertices.length === 0) return;

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setIndex(indices);

            const material = new THREE.MeshPhongMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                flatShading: true
            });

            const mesh = new THREE.Mesh(geometry, material);
            this.meshGroup.add(mesh);

            // Add edges
            const edgesGeometry = new THREE.EdgesGeometry(geometry, 1);
            const edgesMaterial = new THREE.LineBasicMaterial({
                color: this.colors.border,
                linewidth: 1
            });
            const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            this.meshGroup.add(edges);

            // Center camera on first build
            if (!this.cameraInitialized) {
                this.centerCamera(n, n, maxHeight);
                this.cameraInitialized = true;
            }
        }

        centerCamera(maxX, maxY, maxZ) {
            const centerX = maxX / 2;
            const centerY = maxY / 2;
            const centerZ = maxZ / 2;

            const maxDim = Math.max(maxX, maxY, maxZ);
            const distance = maxDim * 2.5;

            this.camera.position.set(
                centerX + distance * 0.7,
                centerY - distance * 0.7,
                centerZ + distance * 0.5
            );

            this.controls.target.set(centerX, centerY, centerZ);
            this.controls.update();
        }

        resetCamera() {
            this.cameraInitialized = false;
        }
    }

    // === Main Application ===
    const canvas = document.getElementById('lozenge-canvas');
    const threeContainer = document.getElementById('three-container');
    const wasm = new GlauberWASM();
    const renderer = new IsometricRenderer(canvas);
    let visualizer3D = null; // Lazy initialization

    // Set up redraw callback for zoom/pan
    renderer.onRedraw = () => {
        if (wasm.heights && wasm.mask) {
            renderer.draw(wasm.heights, wasm.mask, wasm.n, wasm.maxHeight);
        }
    };

    // State
    let running = false;
    let animationId = null;
    let totalSteps = 0;
    let stepsPerFrame = 50000;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let currentFps = 0;
    let currentBias = 0;
    let is3DView = false;

    // Polygon parameters
    let paramB = 10, paramC = 4, paramD = 4, paramE = 8, paramH = 15;

    // UI Elements
    const elements = {
        paramBSlider: document.getElementById('paramBSlider'),
        paramCSlider: document.getElementById('paramCSlider'),
        paramDSlider: document.getElementById('paramDSlider'),
        paramESlider: document.getElementById('paramESlider'),
        paramHSlider: document.getElementById('paramHSlider'),
        stepsSlider: document.getElementById('stepsSlider'),
        biasSlider: document.getElementById('biasSlider'),
        paramAVal: document.getElementById('paramAVal'),
        paramBVal: document.getElementById('paramBVal'),
        paramCVal: document.getElementById('paramCVal'),
        paramDVal: document.getElementById('paramDVal'),
        paramEVal: document.getElementById('paramEVal'),
        paramHVal: document.getElementById('paramHVal'),
        stepsVal: document.getElementById('stepsVal'),
        biasVal: document.getElementById('biasVal'),
        stepCount: document.getElementById('stepCount'),
        acceptRate: document.getElementById('acceptRate'),
        cubeCount: document.getElementById('cubeCount'),
        fps: document.getElementById('fps'),
        startStopBtn: document.getElementById('startStopBtn'),
        paletteSelect: document.getElementById('palette-select')
    };

    // Compute grid size from polygon parameters (grid is a × a)
    function getGridSize() {
        return paramB + paramC + paramE - paramD;
    }

    // Update computed 'a' display
    function updateParamA() {
        const a = paramB + paramC + paramE - paramD;
        elements.paramAVal.textContent = a;
    }

    // Initialize palette selector
    function initPaletteSelector() {
        const select = elements.paletteSelect;
        renderer.colorPalettes.forEach((palette, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = palette.name;
            select.appendChild(option);
        });
        select.value = renderer.currentPaletteIndex;
        renderer.updateLegend();
    }

    // Format numbers
    function formatNumber(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toString();
    }

    // Update stats display
    function updateStats(result) {
        if (result && result.totalSteps !== undefined) {
            totalSteps = result.totalSteps;
        }
        elements.stepCount.textContent = formatNumber(totalSteps);

        const rate = wasm.getAcceptRate ? wasm.getAcceptRate() : 0;
        elements.acceptRate.textContent = (rate * 100).toFixed(1) + '%';

        if (result && result.totalCubes !== undefined) {
            elements.cubeCount.textContent = formatNumber(result.totalCubes);
        }

        elements.fps.textContent = currentFps.toFixed(0);
    }

    // Draw current state
    function draw() {
        if (wasm.heights && wasm.mask) {
            if (is3DView) {
                if (visualizer3D) {
                    visualizer3D.buildFromHeights(wasm.heights, wasm.mask, wasm.n, wasm.maxHeight);
                }
            } else {
                renderer.draw(wasm.heights, wasm.mask, wasm.n, wasm.maxHeight);
            }
        }
    }

    // Toggle 3D view
    function toggle3DView(enabled) {
        is3DView = enabled;

        if (is3DView) {
            // Initialize 3D visualizer if needed
            if (!visualizer3D) {
                visualizer3D = new Visualizer3D(threeContainer);
                visualizer3D.updateColors(renderer.getCurrentPalette());
            }

            // Show 3D, hide 2D
            canvas.style.display = 'none';
            threeContainer.style.display = 'block';
            visualizer3D.handleResize();

            // Build 3D view
            if (wasm.heights && wasm.mask) {
                visualizer3D.buildFromHeights(wasm.heights, wasm.mask, wasm.n, wasm.maxHeight);
            }
        } else {
            // Show 2D, hide 3D
            canvas.style.display = 'block';
            threeContainer.style.display = 'none';

            // Reinitialize 2D canvas and redraw
            renderer.setupCanvas();
            if (wasm.heights && wasm.mask) {
                renderer.draw(wasm.heights, wasm.mask, wasm.n, wasm.maxHeight);
            }
        }
    }

    // Animation loop
    async function loop() {
        if (!running) {
            draw();
            return;
        }

        const now = performance.now();
        frameCount++;

        if (now - lastFrameTime >= 1000) {
            currentFps = frameCount * 1000 / (now - lastFrameTime);
            frameCount = 0;
            lastFrameTime = now;
        }

        try {
            const result = await wasm.step(stepsPerFrame);
            draw();
            updateStats(result);
        } catch (error) {
            console.error('Step error:', error);
        }

        animationId = requestAnimationFrame(loop);
    }

    // Toggle running state
    function toggleRunning() {
        running = !running;
        elements.startStopBtn.textContent = running ? 'Stop' : 'Start';
        elements.startStopBtn.classList.toggle('running', running);

        if (running) {
            lastFrameTime = performance.now();
            frameCount = 0;
            loop();
        }
    }

    // Initialize simulation
    async function initSimulation(mode = 0, resetView = true) {
        const gridSize = getGridSize();
        const bias = parseInt(elements.biasSlider.value) / 1000;

        try {
            const result = await wasm.init(gridSize, paramB, paramC, paramD, paramE, paramH, bias, mode);
            totalSteps = 0;
            if (resetView) {
                renderer.resetView();
                if (visualizer3D) visualizer3D.resetCamera();
            }
            draw();
            updateStats(result);
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    // Event Handlers
    elements.paramBSlider.addEventListener('input', async (e) => {
        paramB = parseInt(e.target.value);
        elements.paramBVal.textContent = paramB;
        // Ensure b > d
        if (paramB <= paramD) {
            paramD = paramB - 1;
            elements.paramDSlider.value = paramD;
            elements.paramDVal.textContent = paramD;
        }
        updateParamA();
        await initSimulation(0);
    });

    elements.paramCSlider.addEventListener('input', async (e) => {
        paramC = parseInt(e.target.value);
        elements.paramCVal.textContent = paramC;
        updateParamA();
        await initSimulation(0);
    });

    elements.paramDSlider.addEventListener('input', async (e) => {
        paramD = parseInt(e.target.value);
        // Ensure d < b
        if (paramD >= paramB) {
            paramD = paramB - 1;
            e.target.value = paramD;
        }
        elements.paramDVal.textContent = paramD;
        updateParamA();
        await initSimulation(0);
    });

    elements.paramESlider.addEventListener('input', async (e) => {
        paramE = parseInt(e.target.value);
        elements.paramEVal.textContent = paramE;
        updateParamA();
        await initSimulation(0);
    });

    elements.paramHSlider.addEventListener('input', async (e) => {
        paramH = parseInt(e.target.value);
        elements.paramHVal.textContent = paramH;
        await initSimulation(0);
    });

    elements.stepsSlider.addEventListener('input', (e) => {
        stepsPerFrame = parseInt(e.target.value);
        elements.stepsVal.textContent = (stepsPerFrame / 1000).toFixed(0) + 'k';
    });

    elements.biasSlider.addEventListener('input', async (e) => {
        currentBias = parseInt(e.target.value) / 1000;
        elements.biasVal.textContent = currentBias.toFixed(3);
        // Update bias in WASM without resetting the tiling
        try {
            await wasm.updateBias(currentBias);
        } catch (error) {
            console.error('Bias update error:', error);
        }
    });

    document.getElementById('show3DView').addEventListener('change', (e) => {
        toggle3DView(e.target.checked);
    });

    document.getElementById('showGradient').addEventListener('change', (e) => {
        renderer.showGradient = e.target.checked;
        draw();
    });

    document.getElementById('showWalls').addEventListener('change', (e) => {
        renderer.showWalls = e.target.checked;
        draw();
    });

    document.getElementById('showWallGrid').addEventListener('change', (e) => {
        renderer.showWallGrid = e.target.checked;
        draw();
    });

    document.getElementById('showRegion3Wall').addEventListener('change', (e) => {
        renderer.showRegion3Wall = e.target.checked;
        draw();
    });

    elements.paletteSelect.addEventListener('change', (e) => {
        renderer.setPalette(parseInt(e.target.value));
        if (visualizer3D) visualizer3D.updateColors(renderer.getCurrentPalette());
        draw();
    });

    document.getElementById('prev-palette').addEventListener('click', () => {
        renderer.prevPalette();
        elements.paletteSelect.value = renderer.currentPaletteIndex;
        if (visualizer3D) visualizer3D.updateColors(renderer.getCurrentPalette());
        draw();
    });

    document.getElementById('next-palette').addEventListener('click', () => {
        renderer.nextPalette();
        elements.paletteSelect.value = renderer.currentPaletteIndex;
        if (visualizer3D) visualizer3D.updateColors(renderer.getCurrentPalette());
        draw();
    });

    elements.startStopBtn.addEventListener('click', toggleRunning);

    document.getElementById('resetViewBtn').addEventListener('click', () => {
        // Stop simulation
        if (running) {
            running = false;
            elements.startStopBtn.textContent = 'Start';
            elements.startStopBtn.classList.remove('running');
        }

        // Reset views
        renderer.resetView();
        renderer.setupCanvas();
        if (visualizer3D) {
            visualizer3D.resetCamera();
            visualizer3D.cameraInitialized = false;
        }

        // Force complete redraw
        if (is3DView && visualizer3D) {
            visualizer3D.handleResize();
            visualizer3D.buildFromHeights(wasm.heights, wasm.mask, wasm.n, wasm.maxHeight);
        } else {
            renderer.draw(wasm.heights, wasm.mask, wasm.n, wasm.maxHeight);
        }
    });

    // Export quality slider
    document.getElementById('export-quality').addEventListener('input', (e) => {
        document.getElementById('export-quality-val').textContent = e.target.value;
    });

    // Border width controls
    document.getElementById('border-width').addEventListener('input', (e) => {
        renderer.borderWidth = parseFloat(e.target.value);
        draw();
    });

    document.getElementById('border-thin').addEventListener('click', () => {
        renderer.borderWidth = 0.3;
        document.getElementById('border-width').value = 0.3;
        draw();
    });

    document.getElementById('border-medium').addEventListener('click', () => {
        renderer.borderWidth = 0.8;
        document.getElementById('border-width').value = 0.8;
        draw();
    });

    document.getElementById('border-thick').addEventListener('click', () => {
        renderer.borderWidth = 1.5;
        document.getElementById('border-width').value = 1.5;
        draw();
    });

    document.getElementById('border-ultra-thick').addEventListener('click', () => {
        renderer.borderWidth = 3.0;
        document.getElementById('border-width').value = 3.0;
        draw();
    });

    // Helper: get scale from quality (0-100 maps to 1x-4x)
    function getExportScale() {
        const quality = parseInt(document.getElementById('export-quality').value);
        return 1 + (quality / 100) * 3; // 0->1x, 100->4x
    }

    // Helper: detect iOS
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    // Helper: create export canvas with current tiling
    function createExportCanvas() {
        const baseWidth = 900;
        const baseHeight = 500;
        const scale = getExportScale();
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = baseWidth * scale;
        exportCanvas.height = baseHeight * scale;
        const exportCtx = exportCanvas.getContext('2d');
        exportCtx.scale(scale, scale);

        const originalCtx = renderer.ctx;
        const originalWidth = renderer.displayWidth;
        const originalHeight = renderer.displayHeight;
        renderer.ctx = exportCtx;
        renderer.displayWidth = baseWidth;
        renderer.displayHeight = baseHeight;
        renderer.draw(wasm.heights, wasm.mask, wasm.n, wasm.maxHeight);
        renderer.ctx = originalCtx;
        renderer.displayWidth = originalWidth;
        renderer.displayHeight = originalHeight;

        return exportCanvas;
    }

    // Helper: download file with iOS fallback
    async function downloadFile(blob, filename, mimeType) {
        if (isIOS() && navigator.share && navigator.canShare) {
            // Try Web Share API on iOS
            try {
                const file = new File([blob], filename, { type: mimeType });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: filename
                    });
                    return;
                }
            } catch (e) {
                console.log('Web Share failed, falling back to new tab');
            }
        }

        if (isIOS()) {
            // iOS fallback: open in new tab for user to save manually
            const url = URL.createObjectURL(blob);
            const newTab = window.open(url, '_blank');
            if (!newTab) {
                // Popup blocked, show inline
                alert('Long-press the image to save it, or allow popups for this site.');
                window.location.href = url;
            }
        } else {
            // Standard download for desktop
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }
    }

    // Export PNG
    document.getElementById('export-png').addEventListener('click', async () => {
        if (!wasm.heights || !wasm.mask) {
            alert('No tiling data to export.');
            return;
        }

        const exportCanvas = createExportCanvas();
        const filename = `c2_lozenge_tiling_${wasm.n}x${wasm.n}.png`;

        exportCanvas.toBlob(async (blob) => {
            await downloadFile(blob, filename, 'image/png');
        }, 'image/png');
    });

    // Export CSV (Heights)
    document.getElementById('export-csv').addEventListener('click', async () => {
        if (!wasm.heights || !wasm.mask) {
            alert('No tiling data to export.');
            return;
        }

        const n = wasm.n;
        const heights = wasm.heights;
        const mask = wasm.mask;

        // Build CSV with header row
        let csv = 'x,y,height\n';
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                const idx = y * n + x;
                const h = heights[idx];
                csv += `${x},${y},${h}\n`;
            }
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const filename = `c2_lozenge_heights_${n}x${n}.csv`;
        await downloadFile(blob, filename, 'text/csv');
    });

    // Export PDF (Vector)
    document.getElementById('export-pdf').addEventListener('click', () => {
        if (!wasm.heights || !wasm.mask) {
            alert('No tiling data to export.');
            return;
        }

        // Check if jsPDF is available, if not load it
        if (!window.jspdf) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => exportVectorPDF();
            document.head.appendChild(script);
        } else {
            exportVectorPDF();
        }

        async function exportVectorPDF() {
            const heights = wasm.heights;
            const mask = wasm.mask;
            const n = wasm.n;
            const maxHeight = wasm.maxHeight;
            const palette = renderer.getCurrentPalette();

            const { jsPDF } = window.jspdf;
            const sqrt3 = Math.sqrt(3);

            // Calculate bounding box of the tiling
            // Width: 2 * n * cos(30°), Height: 2 * n * sin(30°) + maxHeight
            const tilingWidth = 2 * n * sqrt3 / 2;
            const tilingHeight = n + maxHeight;

            // Create PDF with appropriate dimensions
            const margin = 20;
            const scale = 10; // Points per unit
            const pdfWidth = tilingWidth * scale + 2 * margin;
            const pdfHeight = tilingHeight * scale + 2 * margin;

            const pdf = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
                unit: 'pt',
                format: [pdfWidth, pdfHeight]
            });

            // Helper to convert hex to RGB array
            const hexToRgb = hex => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
            };

            // Transform from grid coords to PDF coords
            const toScreen = (gx, gy, h) => {
                const sx = (gx - gy) * sqrt3 / 2;
                const sy = (gx + gy) * 0.5 + h;
                // Center in PDF
                const px = margin + (tilingWidth / 2 + sx) * scale;
                const py = margin + (tilingHeight - sy) * scale;
                return [px, py];
            };

            // Draw a filled polygon
            const drawPolygon = (vertices, fillColor) => {
                pdf.setFillColor(...hexToRgb(fillColor));
                pdf.setDrawColor(51, 51, 51); // #333333
                pdf.setLineWidth(renderer.borderWidth * 0.3);

                const lines = [];
                for (let i = 0; i < vertices.length; i++) {
                    const current = vertices[i];
                    const next = vertices[(i + 1) % vertices.length];
                    lines.push([next[0] - current[0], next[1] - current[1]]);
                }
                pdf.lines(lines, vertices[0][0], vertices[0][1], [1, 1], renderer.showOutlines ? 'FD' : 'F');
            };

            // Draw lozenges using painter's algorithm (back to front)
            for (let x = 0; x < n; x++) {
                for (let y = 0; y < n; y++) {
                    const idx = y * n + x;
                    if (mask[idx] === 0) continue;

                    const h = heights[idx];

                    // Right face (vertical rhombus on +x side)
                    let neighborH = 0;
                    if (x < n - 1) {
                        const rightIdx = y * n + (x + 1);
                        neighborH = (mask[rightIdx] > 0) ? heights[rightIdx] : 0;
                    }

                    if (h > neighborH) {
                        const r1 = toScreen(x + 1, y, h);
                        const r2 = toScreen(x + 1, y + 1, h);
                        const r3 = toScreen(x + 1, y + 1, neighborH);
                        const r4 = toScreen(x + 1, y, neighborH);
                        drawPolygon([r1, r2, r3, r4], palette.colors[1]);
                    }

                    // Left face (vertical rhombus on +y side)
                    neighborH = 0;
                    if (y < n - 1) {
                        const downIdx = (y + 1) * n + x;
                        neighborH = (mask[downIdx] > 0) ? heights[downIdx] : 0;
                    }

                    if (h > neighborH) {
                        const l1 = toScreen(x, y + 1, h);
                        const l2 = toScreen(x + 1, y + 1, h);
                        const l3 = toScreen(x + 1, y + 1, neighborH);
                        const l4 = toScreen(x, y + 1, neighborH);
                        drawPolygon([l1, l2, l3, l4], palette.colors[2]);
                    }

                    // Top face (horizontal rhombus at height h)
                    const t1 = toScreen(x, y, h);
                    const t2 = toScreen(x + 1, y, h);
                    const t3 = toScreen(x + 1, y + 1, h);
                    const t4 = toScreen(x, y + 1, h);
                    drawPolygon([t1, t2, t3, t4], palette.colors[0]);
                }
            }

            const filename = `c2_lozenge_tiling_${n}x${n}.pdf`;
            const pdfBlob = pdf.output('blob');
            await downloadFile(pdfBlob, filename, 'application/pdf');
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        renderer.setupCanvas();
        draw();
    });

    // Initialize
    await wasm.initialize();
    initPaletteSelector();
    updateParamA();
    await initSimulation(0);

    console.log('C2 region Glauber dynamics simulation ready');
};
</script>
