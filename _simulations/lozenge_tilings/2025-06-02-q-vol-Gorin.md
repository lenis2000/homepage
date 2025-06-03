---
title: Shuffling algorithm for q-volume lozenge tilings of the hexagon
model: lozenge-tilings
author: 'Vadim Gorin (original code); Leonid Petrov (porting)'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-06-02-q-vol-Gorin.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-06-02-q-vol-Gorin.cpp'
    txt: 'C++ code for the simulation'
---

<style>
  /* Basic styling for the canvas and controls */
  #lozenge-canvas {
    width: 100%;
    max-width: 1200px;
    height: 80vh;
    max-height: 800px;
    border: 1px solid #ccc;
    display: block;
    margin: 0 auto;
  }
  .controls {
    margin-bottom: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .controls > * {
    flex-shrink: 0;
  }
  .keyboard-info {
    margin-top: 10px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
    font-size: 12px;
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    #lozenge-canvas {
      height: 60vh;
      min-height: 400px;
    }
    .controls {
      font-size: 14px;
    }
    .controls input[type="number"] {
      width: 50px !important;
    }
    .controls button {
      padding: 5px 10px;
      font-size: 13px;
    }
    .keyboard-info {
      display: none;
    }
  }
</style>

<script src="/js/three.min.js"></script>
<script src="/js/OrbitControls.js"></script>
<script src="/js/2025-06-02-q-vol-Gorin.js"></script>

This simulation demonstrates **lozenge tilings** using a WASM/JS port of a program by [Vadim Gorin](https://www.stat.berkeley.edu/~vadicgor/research.html). The simulation generates lozenge tilings of a hexagon with sides $N$, $S$, and $T-S$ under the $q^{-volume}$ measure.

The sampler works entirely in your browser using WebAssembly.

---

<!-- Controls for the simulation -->
<div class="controls">

  <label for="N" style="margin-left: 20px;">N: </label>
  <input id="N" type="number" value="20" min="1" max="200" style="width: 60px;">

  <label for="T" style="margin-left: 20px;">T: </label>
  <input id="T" type="number" value="40" min="1" max="500" style="width: 60px;">

  <label for="S" style="margin-left: 20px;">S: </label>
  <input id="S" type="number" value="0" min="0" style="width: 60px;">

  <label for="q" style="margin-left: 20px;">q: </label>
  <input id="q" type="number" value="1" step="0.1" min="0.01" style="width: 60px;">

  <button id="initialize">Initialize</button>
  <button id="set-parameters">Set Parameters</button>
</div>

<div class="controls">
  <label for="style">Style: </label>
  <select id="style">
    <option value="1" selected>Lozenges</option>
    <option value="5">Z² paths</option>
    <option value="3d">3D boxes</option>
  </select>

  <label for="steps">Steps: </label>
  <input id="steps" type="number" value="1" min="1" max="10" style="width: 50px;">

  <button id="step-plus">S → S+steps</button>
  <button id="step-minus">S → S-steps</button>
  <button id="export">Export</button>
</div>

<div class="controls">
  <button id="zoom-in">Zoom In</button>
  <button id="zoom-out" style="margin-left: 10px;">Zoom Out</button>
  <button id="zoom-reset" style="margin-left: 10px;">Reset Zoom</button>
</div>

<div id="info" style="margin-bottom: 10px; font-weight: bold;"></div>

<!-- Visualization canvas -->
<canvas id="lozenge-canvas"></canvas>
<div id="lozenge-3d-container" style="display: none; width: 100%; max-width: 1200px; height: 80vh; max-height: 800px; margin: 0 auto;"></div>

<div class="keyboard-info">
  <strong>Keyboard shortcuts:</strong><br>
  A: S → S+steps<br>
  Z: S → S-steps<br>
  S: S → S+steps → S-steps<br>
  X: S → S-steps → S+steps
</div>

<script>
// Check if Module is defined before setting onRuntimeInitialized
if (typeof Module === 'undefined') {
    console.error('Module is not defined. Make sure the WASM JavaScript file is loaded correctly.');
    window.Module = { onRuntimeInitialized: function() {} };
}

Module.onRuntimeInitialized = async function() {
    // WASM Interface Class
    class WASMInterface {
        constructor() {
            this.ready = false;
            this.N_param = 20;
            this.T_param = 40;
            this.S_param = 0;
            this.mode_param = 5;
            this.q_param = 1.0;
            this.paths = [];
        }

        async initialize() {
            // Check if Module and cwrap are available
            if (typeof Module === 'undefined') {
                throw new Error('Module is not defined. WASM JavaScript file may not be loaded.');
            }
            if (typeof Module.cwrap !== 'function') {
                throw new Error('Module.cwrap is not a function. WASM module may not be properly initialized.');
            }
            
            // Wrap exported functions
            this.initializeTiling = Module.cwrap('initializeTiling', 'number', ['number', 'number', 'number', 'number', 'number'], {async: true});
            this.performSOperator = Module.cwrap('performSOperator', 'number', [], {async: true});
            this.performSMinusOperator = Module.cwrap('performSMinusOperator', 'number', [], {async: true});
            this.exportPaths = Module.cwrap('exportPaths', 'number', [], {async: true});
            this.updateParameters = Module.cwrap('updateParameters', 'number', ['number', 'number'], {async: true});
            this.freeString = Module.cwrap('freeString', null, ['number']);
            this.getProgress = Module.cwrap('getProgress', 'number', []);

            this.ready = true;
            console.log('WASM module loaded successfully');
        }

        async initializeTilingWasm(params) {
            if (!this.ready) throw new Error('WASM not ready');
            if (typeof Module === 'undefined') throw new Error('Module is not defined');

            this.N_param = params.N;
            this.T_param = params.T;
            this.S_param = params.S;
            this.mode_param = params.mode;
            this.q_param = params.q;

            try {
                console.log('Initializing tiling with params:', params);
                const ptr = await this.initializeTiling(params.N, params.T, params.S, params.mode, params.q);
                if (!ptr) {
                    throw new Error('initializeTiling returned null pointer');
                }
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);

                const result = JSON.parse(jsonStr);
                if (result.error) {
                    throw new Error(result.error);
                }

                // Auto-export paths
                await this.refreshPaths();
                return result;
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                throw new Error(`Initialization failed: ${errorMessage}`);
            }
        }

        async stepForward() {
            if (!this.ready) throw new Error('WASM not ready');
            if (this.S_param >= this.T_param) throw new Error('Cannot perform S→S+1: already at maximum');

            try {
                const ptr = await this.performSOperator();
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);

                const result = JSON.parse(jsonStr);
                if (result.error) {
                    throw new Error(result.error);
                }

                this.S_param = result.s;
                await this.refreshPaths();
                return result;
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                throw new Error(`S operator failed: ${errorMessage}`);
            }
        }

        async stepBackward() {
            if (!this.ready) throw new Error('WASM not ready');
            if (this.S_param <= 0) throw new Error('Cannot perform S→S-1: already at minimum');

            try {
                const ptr = await this.performSMinusOperator();
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);

                const result = JSON.parse(jsonStr);
                if (result.error) {
                    throw new Error(result.error);
                }

                this.S_param = result.s;
                await this.refreshPaths();
                return result;
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                throw new Error(`S- operator failed: ${errorMessage}`);
            }
        }

        async refreshPaths() {
            try {
                const ptr = await this.exportPaths();
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);

                const result = JSON.parse(jsonStr);
                if (!result.error) {
                    this.paths = result.paths;
                }
            } catch (error) {
                console.error('Failed to refresh paths:', error);
            }
        }

        getPaths() {
            return this.paths;
        }

        getParameters() {
            return {
                N: this.N_param,
                T: this.T_param,
                S: this.S_param,
                mode: this.mode_param,
                q: this.q_param
            };
        }

        async updateParametersWasm(params) {
            if (!this.ready) throw new Error('WASM not ready');

            try {
                const ptr = await this.updateParameters(params.mode, params.q);
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);

                const result = JSON.parse(jsonStr);
                if (result.error) {
                    throw new Error(result.error);
                }

                this.mode_param = params.mode;
                this.q_param = params.q;
                return result;
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                throw new Error(`Parameter update failed: ${errorMessage}`);
            }
        }

        exportPlanePartition() {
            // Return current paths as plane partition
            return this.paths;
        }

        static transposeMatrix(matrix) {
            if (matrix.length === 0) return [];
            const rows = matrix.length;
            const cols = matrix[0].length;
            const transposed = Array(cols).fill(null).map(() => Array(rows));

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    transposed[j][i] = matrix[i][j];
                }
            }

            return transposed;
        }
    }

    // Tiling Visualizer Class
    class TilingVisualizer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.style = 2; // Default: classical with borders

            this.colors = {
                gray1: '#D0FFD0', // Green-tinted (down rhombi)
                gray2: '#D0D0FF', // Blue-tinted (up rhombi)
                gray3: '#FFB0B0', // Red-tinted (background)
                black: '#000000',
                white: '#FFFFFF'
            };

            this.zoomLevel = 1.0;
            this.panX = 0;
            this.panY = 0;
            this.isPanning = false;
            this.lastMouseX = 0;
            this.lastMouseY = 0;

            this.setupCanvas();
            this.setupMouseHandlers();
        }

        setupCanvas() {
            const dpr = window.devicePixelRatio || 1;

            // Get the actual canvas element dimensions from CSS
            const rect = this.canvas.getBoundingClientRect();
            const displayWidth = rect.width || 1200;
            const displayHeight = rect.height || 800;

            // Set internal size accounting for device pixel ratio
            this.canvas.width = displayWidth * dpr;
            this.canvas.height = displayHeight * dpr;

            // Scale context to ensure correct drawing operations
            this.ctx.scale(dpr, dpr);
        }

        setupMouseHandlers() {
            this.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();

                const width = this.canvas.width / (window.devicePixelRatio || 1);
                const height = this.canvas.height / (window.devicePixelRatio || 1);
                const centerX = width / 2;
                const centerY = height / 2;

                const zoomFactor = e.deltaY > 0 ? 0.985 : 1.015;
                const newZoom = Math.max(0.1, Math.min(10.0, this.zoomLevel * zoomFactor));

                const scale = newZoom / this.zoomLevel;
                this.panX = centerX - (centerX - this.panX) * scale;
                this.panY = centerY - (centerY - this.panY) * scale;

                this.zoomLevel = newZoom;

                if (this.lastPaths) {
                    this.draw(this.lastPaths, this.lastN, this.lastT, this.lastS);
                }
            });

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

                if (this.lastPaths) {
                    this.draw(this.lastPaths, this.lastN, this.lastT, this.lastS);
                }
            });

            window.addEventListener('mouseup', () => {
                this.isPanning = false;
                this.canvas.style.cursor = 'grab';
            });

            // Touch events for mobile
            this.canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    this.isPanning = true;
                    this.lastMouseX = e.touches[0].clientX;
                    this.lastMouseY = e.touches[0].clientY;
                    e.preventDefault();
                }
            });

            this.canvas.addEventListener('touchmove', (e) => {
                if (!this.isPanning || e.touches.length !== 1) return;

                const dx = e.touches[0].clientX - this.lastMouseX;
                const dy = e.touches[0].clientY - this.lastMouseY;

                this.panX += dx;
                this.panY += dy;

                this.lastMouseX = e.touches[0].clientX;
                this.lastMouseY = e.touches[0].clientY;

                if (this.lastPaths) {
                    this.draw(this.lastPaths, this.lastN, this.lastT, this.lastS);
                }
                e.preventDefault();
            });

            this.canvas.addEventListener('touchend', () => {
                this.isPanning = false;
            });

            this.canvas.style.cursor = 'grab';
        }

        setStyle(style) {
            this.style = parseInt(style);
        }

        zoomIn() {
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);
            const centerX = width / 2;
            const centerY = height / 2;

            const oldZoom = this.zoomLevel;
            const newZoom = Math.min(10.0, oldZoom * 1.2);

            if (newZoom === oldZoom) return;

            const scale = newZoom / oldZoom;
            this.panX = centerX - (centerX - this.panX) * scale;
            this.panY = centerY - (centerY - this.panY) * scale;

            this.zoomLevel = newZoom;
        }

        zoomOut() {
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);
            const centerX = width / 2;
            const centerY = height / 2;

            const oldZoom = this.zoomLevel;
            const newZoom = Math.max(0.1, oldZoom / 1.2);

            if (newZoom === oldZoom) return;

            const scale = newZoom / oldZoom;
            this.panX = centerX - (centerX - this.panX) * scale;
            this.panY = centerY - (centerY - this.panY) * scale;

            this.zoomLevel = newZoom;
        }

        resetZoom() {
            this.zoomLevel = 1.0;
            this.panX = 0;
            this.panY = 0;
            if (this.lastPaths) {
                this.draw(this.lastPaths, this.lastN, this.lastT, this.lastS);
            }
        }

        draw(paths, N, T, S) {
            this.lastPaths = paths;
            this.lastN = N;
            this.lastT = T;
            this.lastS = S;

            const ctx = this.ctx;
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);

            ctx.fillStyle = this.colors.white;
            ctx.fillRect(0, 0, width, height);

            if (this.style === 5) {
                this.drawLatticePathsStyle(paths, N, T, S);
            } else {
                this.drawHexagonStyle(paths, N, T, S);
            }
        }

        drawHexagonStyle(paths, N, T, S) {
            const ctx = this.ctx;
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);

            const sqrt3 = Math.sqrt(3);

            // Calculate the bounding box of the hexagon
            const minX = 0;
            const maxX = T * 0.5 * sqrt3;
            const minY = -(T - S) * 0.5;
            const maxY = N + Math.max(S * 0.5, (2 * S - T) * 0.5);

            const hexWidth = maxX - minX;
            const hexHeight = maxY - minY;
            const hexCenterX = (minX + maxX) / 2;
            const hexCenterY = (minY + maxY) / 2;

            const margin = 40;
            const scale = Math.min(
                (width - 2 * margin) / hexWidth,
                (height - 2 * margin) / hexHeight
            ) * this.zoomLevel;

            ctx.save();
            ctx.translate(this.panX, this.panY);
            ctx.translate(width / 2, height / 2);
            ctx.scale(scale, scale);
            // Center the hexagon
            ctx.translate(-hexCenterX, -hexCenterY);

            this.drawBackgroundHexagon(N, T, S);

            for (let i = 0; i < T; i++) {
                for (let j = 0; j < N; j++) {
                    const currentHeight = paths[j][i];
                    const nextHeight = paths[j][i + 1];
                    this.drawRhombus(i, j, currentHeight, nextHeight);
                }
            }

            ctx.restore();
        }

        drawBackgroundHexagon(N, T, S) {
            const ctx = this.ctx;
            const sqrt3 = Math.sqrt(3);

            const vertices = [
                {x: 0, y: 0},
                {x: 0, y: N},
                {x: S * 0.5 * sqrt3, y: N + S * 0.5},
                {x: T * 0.5 * sqrt3, y: N + (2 * S - T) * 0.5},
                {x: T * 0.5 * sqrt3, y: (2 * S - T) * 0.5},
                {x: (T - S) * 0.5 * sqrt3, y: -(T - S) * 0.5}
            ];

            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < 6; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            ctx.closePath();

            ctx.fillStyle = this.colors.gray3;
            ctx.fill();
        }

        drawRhombus(timeIdx, particleIdx, height, nextHeight) {
            const ctx = this.ctx;
            const sqrt3 = Math.sqrt(3);

            const x1 = timeIdx * 0.5 * sqrt3;
            const y1 = height - timeIdx * 0.5;
            const x2 = x1;
            const y2 = y1 + 1;

            let x3, y3, x4, y4;
            let fillColor;

            if (nextHeight === height) {
                // Down rhombus
                x3 = x2 + 0.5 * sqrt3;
                y3 = y2 - 0.5;
                x4 = x1 + 0.5 * sqrt3;
                y4 = y1 - 0.5;
                fillColor = this.colors.gray1;
            } else {
                // Up rhombus
                x3 = x2 + 0.5 * sqrt3;
                y3 = y2 + 0.5;
                x4 = x1 + 0.5 * sqrt3;
                y4 = y1 + 0.5;
                fillColor = this.colors.gray2;
            }

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x4, y4);
            ctx.closePath();

            ctx.fillStyle = fillColor;
            ctx.fill();
        }


        drawLatticePathsStyle(paths, N, T, S) {
            const ctx = this.ctx;
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);

            const margin = 40;
            const scaleX = (width - 2 * margin) / (T + 5);
            const scaleY = (height - 2 * margin) / (N + S + 5);
            const scale = Math.min(scaleX, scaleY) * this.zoomLevel;

            const maxY = N + S - 1;

            ctx.save();
            ctx.translate(this.panX + margin, this.panY + height - margin);
            ctx.scale(scale, -scale);

            ctx.fillStyle = this.colors.gray3;
            for (let i = 0; i <= T; i++) {
                for (let j = 0; j <= maxY; j++) {
                    ctx.fillRect(i - 0.1, j - 0.1, 0.2, 0.2);
                }
            }

            ctx.strokeStyle = this.colors.black;
            ctx.lineWidth = 0.1;
            ctx.fillStyle = this.colors.black;

            for (let j = 0; j < N; j++) {
                ctx.beginPath();

                for (let i = 0; i <= T; i++) {
                    const x = i;
                    const y = paths[j][i];

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }

                    ctx.fillRect(x - 0.05, y - 0.05, 0.1, 0.1);
                }

                ctx.stroke();
            }

            ctx.restore();
        }
    }

    // UI Controller Class
    class UIController {
        constructor(wasmInterface, visualizer) {
            this.wasm = wasmInterface;
            this.visualizer = visualizer;
            this.animationId = null;
            this.animationRunning = false;
            this.compositeOperationRunning = false;

            this.setupEventListeners();
        }

        setupEventListeners() {
            document.getElementById('style').addEventListener('change', (e) => {
                this.visualizer.setStyle(e.target.value);
                this.redraw();
            });

            document.getElementById('initialize').addEventListener('click', () => {
                this.initializeTiling();
            });

            document.getElementById('set-parameters').addEventListener('click', () => {
                this.setParameters();
            });

            document.getElementById('step-plus').addEventListener('click', () => {
                this.stepForward();
            });

            document.getElementById('step-minus').addEventListener('click', () => {
                this.stepBackward();
            });

            document.getElementById('export').addEventListener('click', () => {
                this.exportPlanePartition();
            });

            document.getElementById('zoom-in').addEventListener('click', () => {
                this.visualizer.zoomIn();
                this.redraw();
            });

            document.getElementById('zoom-out').addEventListener('click', () => {
                this.visualizer.zoomOut();
                this.redraw();
            });

            document.getElementById('zoom-reset').addEventListener('click', () => {
                this.visualizer.resetZoom();
                this.redraw();
            });

            // Keyboard controls
            document.addEventListener('keypress', (e) => {
                if (this.animationRunning) return;

                const key = e.key.toLowerCase();

                if ((key === 's' || key === 'x') && this.compositeOperationRunning) {
                    return;
                }

                const steps = parseInt(document.getElementById('steps').value) || 1;

                switch(key) {
                    case 'a':
                        this.stepForward();
                        break;
                    case 'z':
                        this.stepBackward();
                        break;
                    case 's':
                        this.compositeOperationRunning = true;
                        this.stepForwardNoRedraw().then(() => {
                            return this.stepBackwardNoRedraw();
                        }).then(() => {
                            // Update S display and redraw once at the end
                            const params = this.wasm.getParameters();
                            document.getElementById('S').value = params.S;
                            this.updateInfo();
                            this.redraw();
                            this.compositeOperationRunning = false;
                        }).catch((error) => {
                            // Silently handle errors - just stop the operation
                            this.compositeOperationRunning = false;
                        });
                        break;
                    case 'x':
                        this.compositeOperationRunning = true;
                        this.stepBackwardNoRedraw().then(() => {
                            return this.stepForwardNoRedraw();
                        }).then(() => {
                            // Update S display and redraw once at the end
                            const params = this.wasm.getParameters();
                            document.getElementById('S').value = params.S;
                            this.updateInfo();
                            this.redraw();
                            this.compositeOperationRunning = false;
                        }).catch((error) => {
                            // Silently handle errors - just stop the operation
                            this.compositeOperationRunning = false;
                        });
                        break;
                }
            });

            window.addEventListener('resize', () => {
                this.visualizer.setupCanvas();
                this.redraw();
            });
        }


        getParametersFromUI() {
            const params = {
                mode: 5, // Always q-Hahn
                N: parseInt(document.getElementById('N').value),
                T: parseInt(document.getElementById('T').value),
                S: parseInt(document.getElementById('S').value),
                q: parseFloat(document.getElementById('q').value)
            };

            return params;
        }

        validateParametersUI(params) {
            if (isNaN(params.N) || params.N < 1) {
                throw new Error('N must be a positive integer');
            }
            if (isNaN(params.T) || params.T < 1) {
                throw new Error('T must be a positive integer');
            }
            if (isNaN(params.S) || params.S < 0 || params.S > params.T) {
                throw new Error('S must be between 0 and T');
            }

            if (isNaN(params.q) || params.q <= 0) {
                throw new Error('q must be positive');
            }
        }

        async initializeTiling() {
            try {
                const params = this.getParametersFromUI();
                this.validateParametersUI(params);

                await this.wasm.initializeTilingWasm(params);

                const actualParams = this.wasm.getParameters();
                document.getElementById('S').value = actualParams.S;

                this.updateInfo();
                this.redraw();

            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                alert('Initialization error: ' + errorMessage);
                console.error(error);
            }
        }

        async stepForward() {
            try {
                const steps = parseInt(document.getElementById('steps').value) || 1;

                for (let i = 0; i < steps; i++) {
                    try {
                        await this.wasm.stepForward();
                    } catch (error) {
                        // Silently ignore boundary errors - just stop stepping
                        break;
                    }
                }

                const params = this.wasm.getParameters();
                document.getElementById('S').value = params.S;

                this.updateInfo();
                this.redraw();

            } catch (error) {
                // Silently handle any other errors
            }
        }

        async stepBackward() {
            try {
                const steps = parseInt(document.getElementById('steps').value) || 1;

                for (let i = 0; i < steps; i++) {
                    try {
                        await this.wasm.stepBackward();
                    } catch (error) {
                        // Silently ignore boundary errors - just stop stepping
                        break;
                    }
                }

                const params = this.wasm.getParameters();
                document.getElementById('S').value = params.S;

                this.updateInfo();
                this.redraw();

            } catch (error) {
                // Silently handle any other errors
            }
        }

        // Internal functions without redraw for composite operations
        async stepForwardNoRedraw() {
            const steps = parseInt(document.getElementById('steps').value) || 1;
            for (let i = 0; i < steps; i++) {
                try {
                    await this.wasm.stepForward();
                } catch (error) {
                    // Silently ignore boundary errors - just stop stepping
                    break;
                }
            }
        }

        async stepBackwardNoRedraw() {
            const steps = parseInt(document.getElementById('steps').value) || 1;
            for (let i = 0; i < steps; i++) {
                try {
                    await this.wasm.stepBackward();
                } catch (error) {
                    // Silently ignore boundary errors - just stop stepping
                    break;
                }
            }
        }

        exportPlanePartition() {
            try {
                const partition = this.wasm.exportPlanePartition();
                const transposed = WASMInterface.transposeMatrix(partition);

                let text = '';
                for (let row of transposed) {
                    text += row.join('\t') + '\n';
                }

                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `plane_partition_N${this.wasm.getParameters().N}_T${this.wasm.getParameters().T}_S${this.wasm.getParameters().S}.txt`;
                a.click();
                URL.revokeObjectURL(url);

            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                alert('Export error: ' + errorMessage);
            }
        }

        updateInfo() {
            const params = this.wasm.getParameters();

            const info = document.getElementById('info');
            info.innerHTML = `
                <strong>Current Configuration:</strong><br>
                N = ${params.N}, T = ${params.T}, S = ${params.S}, q = ${params.q}
            `;
        }

        async setParameters() {
            try {
                const params = this.getParametersFromUI();
                const currentParams = this.wasm.getParameters();

                if (params.N !== currentParams.N || params.T !== currentParams.T || params.S !== currentParams.S) {
                    alert('Cannot change N, T, or S without creating a new tiling. Use "Initialize New Tiling" instead.');
                    return;
                }

                this.validateParametersUI(params);
                await this.wasm.updateParametersWasm(params);

                this.updateInfo();

            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                alert('Invalid parameters: ' + errorMessage);
            }
        }

        redraw() {
            try {
                const params = this.wasm.getParameters();
                const paths = this.wasm.getPaths();
                this.visualizer.draw(paths, params.N, params.T, params.S);
            } catch (error) {
                console.error('Redraw error:', error);
            }
        }
    }

    // Initialize application
    try {
        console.log('Starting application initialization...');
        console.log('Module defined:', typeof Module !== 'undefined');
        
        const wasmInterface = new WASMInterface();
        await wasmInterface.initialize();

        const canvas = document.getElementById('lozenge-canvas');
        if (!canvas) {
            throw new Error('Canvas element "lozenge-canvas" not found');
        }
        const visualizer = new TilingVisualizer(canvas);

        const ui = new UIController(wasmInterface, visualizer);

        // Initialize with default parameters
        await ui.initializeTiling();

        console.log('Random Tilings Generator initialized successfully');

    } catch (error) {
        console.error('Failed to initialize application:', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        alert('Failed to initialize application: ' + errorMessage + '\nCheck console for details.');
    }
};
</script>
