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

  /* Export modal styles */
  .export-modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
  }

  .export-modal-content {
    background-color: white;
    margin: 5% auto;
    padding: 20px;
    border-radius: 8px;
    width: 80%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .export-textarea {
    width: 100%;
    height: 300px;
    font-family: monospace;
    font-size: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
    margin: 10px 0;
    resize: vertical;
  }

  .export-buttons {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .export-buttons button {
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #f8f9fa;
    cursor: pointer;
  }

  .export-buttons button:hover {
    background-color: #e9ecef;
  }

  .close-modal {
    float: right;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    color: #aaa;
  }

  .close-modal:hover {
    color: #000;
  }

  /* Color picker modal styles */
  .color-picker-modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
  }

  .color-picker-modal-content {
    background-color: white;
    margin: 5% auto;
    padding: 20px;
    border-radius: 8px;
    width: 80%;
    max-width: 400px;
  }

  .color-picker-row {
    display: flex;
    align-items: center;
    margin: 15px 0;
    gap: 10px;
  }

  .color-picker-row label {
    width: 120px;
    font-weight: bold;
  }

  .color-picker-row input[type="color"] {
    width: 50px;
    height: 40px;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
  }

  .color-preview {
    width: 30px;
    height: 30px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-left: 10px;
  }

  .color-picker-buttons {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    justify-content: flex-end;
  }

  .color-picker-buttons button {
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #f8f9fa;
    cursor: pointer;
  }

  .color-picker-buttons button:hover {
    background-color: #e9ecef;
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
  <input id="q" type="number" value="1" step="0.02" min="0.01" style="width: 60px;">

  <button id="initialize">Initialize</button>
  <button id="set-parameters">Set Parameters</button>
</div>

<div class="controls">
  <label for="style">Style: </label>
  <select id="style">
    <option value="1" selected>Lozenges</option>
    <option value="5">Z² paths</option>
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
  <button id="change-palette" style="margin-left: 10px;">Change Colors</button>
  <button id="custom-colors" style="margin-left: 10px;">Custom Colors</button>
  <button id="toggle-debug" style="margin-left: 10px;">Toggle Debug</button>
</div>

<div id="info" style="margin-bottom: 10px; font-weight: bold;"></div>
<div id="color-info" style="margin-bottom: 10px; font-size: 14px; color: #666;">Current palette: <span id="current-palette">UVA</span></div>
<div id="debug-info" style="margin-bottom: 10px; font-size: 14px; color: #666; display: none;">Debug mode: <span id="debug-status">OFF</span></div>

<!-- Visualization canvas -->
<canvas id="lozenge-canvas"></canvas>

<!-- Export Modal -->
<div id="export-modal" class="export-modal">
  <div class="export-modal-content">
    <span class="close-modal">&times;</span>
    <h3>Export Plane Partition</h3>
    <p>Matrix representation of the plane partition:</p>
    <textarea id="export-textarea" class="export-textarea" readonly></textarea>
    <div class="export-buttons">
      <button id="copy-to-clipboard">Copy to Clipboard</button>
      <button id="download-file">Download File</button>
      <button id="close-export">Close</button>
    </div>
  </div>
</div>

<!-- Color Picker Modal -->
<div id="color-picker-modal" class="color-picker-modal">
  <div class="color-picker-modal-content">
    <span class="close-modal" id="close-color-picker">&times;</span>
    <h3>Custom Colors</h3>
    <p>Choose colors for the different elements:</p>

    <div class="color-picker-row">
      <label for="color-down">Down Rhombi:</label>
      <input type="color" id="color-down" value="#E57200">
      <div class="color-preview" id="preview-down"></div>
    </div>

    <div class="color-picker-row">
      <label for="color-up">Up Rhombi:</label>
      <input type="color" id="color-up" value="#232D4B">
      <div class="color-preview" id="preview-up"></div>
    </div>

    <div class="color-picker-row">
      <label for="color-background">Background:</label>
      <input type="color" id="color-background" value="#F5F5F5">
      <div class="color-preview" id="preview-background"></div>
    </div>

    <div class="color-picker-buttons">
      <button id="apply-colors">Apply Colors</button>
      <button id="reset-colors">Reset to Default</button>
      <button id="close-color-picker-btn">Close</button>
    </div>
  </div>
</div>

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
            this.debugMode = false;
            this.showLabels = true;
            this.logHorizontal = true;
            this.lozengeCounts = null;

            this.colorPalettes = [
                {
                    name: 'UVA',
                    colors: {
                        gray1: '#E57200', // UVA Orange (horizontal lozenges)
                        gray2: '#232D4B', // UVA Navy (left-tilted lozenges)
                        gray3: '#606060', // Darker gray (right-tilted lozenges)
                        background: '#F5F5F5', // Light gray (background)
                        black: '#000000', // Changed to actual black for better border visibility
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Classic',
                    colors: {
                        gray1: '#D0FFD0', // Green-tinted (horizontal lozenges)
                        gray2: '#D0D0FF', // Blue-tinted (left-tilted lozenges)
                        gray3: '#FFD0D0', // Red-tinted (right-tilted lozenges)
                        background: '#FFB0B0', // Light red (background)
                        black: '#000000',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Ocean',
                    colors: {
                        gray1: '#87CEEB', // Sky blue (horizontal lozenges)
                        gray2: '#4682B4', // Steel blue (left-tilted lozenges)
                        gray3: '#5F9EA0', // Cadet blue (right-tilted lozenges)
                        background: '#F0F8FF', // Alice blue (background)
                        black: '#191970',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Sunset',
                    colors: {
                        gray1: '#FFB347', // Peach (horizontal lozenges)
                        gray2: '#FF6B6B', // Light coral (left-tilted lozenges)
                        gray3: '#FFA07A', // Light salmon (right-tilted lozenges)
                        background: '#FFF0E6', // Linen (background)
                        black: '#8B4513',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Forest',
                    colors: {
                        gray1: '#90EE90', // Light green (horizontal lozenges)
                        gray2: '#228B22', // Forest green (left-tilted lozenges)
                        gray3: '#3CB371', // Medium sea green (right-tilted lozenges)
                        background: '#F0FFF0', // Honeydew (background)
                        black: '#006400',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Berry',
                    colors: {
                        gray1: '#FF69B4', // Hot pink (down rhombi)
                        gray2: '#8B008B', // Dark magenta (up rhombi)
                        gray3: '#FFF0F5', // Lavender blush (background)
                        black: '#4B0082',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Earth',
                    colors: {
                        gray1: '#D2691E', // Chocolate (down rhombi)
                        gray2: '#8B4513', // Saddle brown (up rhombi)
                        gray3: '#F5F5DC', // Beige (background)
                        black: '#654321',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Arctic',
                    colors: {
                        gray1: '#B0E0E6', // Powder blue (down rhombi)
                        gray2: '#4682B4', // Steel blue (up rhombi)
                        gray3: '#F0F8FF', // Alice blue (background)
                        black: '#2F4F4F',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Autumn',
                    colors: {
                        gray1: '#FF8C00', // Dark orange (down rhombi)
                        gray2: '#DC143C', // Crimson (up rhombi)
                        gray3: '#FFF8DC', // Cornsilk (background)
                        black: '#8B0000',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Lavender',
                    colors: {
                        gray1: '#DDA0DD', // Plum (down rhombi)
                        gray2: '#9370DB', // Medium purple (up rhombi)
                        gray3: '#F8F8FF', // Ghost white (background)
                        black: '#483D8B',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Mint',
                    colors: {
                        gray1: '#98FB98', // Pale green (down rhombi)
                        gray2: '#00FF7F', // Spring green (up rhombi)
                        gray3: '#F0FFF0', // Honeydew (background)
                        black: '#2E8B57',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Coral',
                    colors: {
                        gray1: '#FF7F50', // Coral (down rhombi)
                        gray2: '#CD5C5C', // Indian red (up rhombi)
                        gray3: '#FFF5EE', // Seashell (background)
                        black: '#A0522D',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Steel',
                    colors: {
                        gray1: '#708090', // Slate gray (down rhombi)
                        gray2: '#2F4F4F', // Dark slate gray (up rhombi)
                        gray3: '#F8F8FF', // Ghost white (background)
                        black: '#191970',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Gold',
                    colors: {
                        gray1: '#FFD700', // Gold (down rhombi)
                        gray2: '#B8860B', // Dark goldenrod (up rhombi)
                        gray3: '#FFFACD', // Lemon chiffon (background)
                        black: '#8B7355',
                        white: '#FFFFFF'
                    }
                },
                {
                    name: 'Sage',
                    colors: {
                        gray1: '#9CAF88', // Dark sea green (down rhombi)
                        gray2: '#556B2F', // Dark olive green (up rhombi)
                        gray3: '#F5F5F5', // White smoke (background)
                        black: '#2F4F2F',
                        white: '#FFFFFF'
                    }
                }
            ];

            this.currentPaletteIndex = 0;
            this.colors = this.colorPalettes[this.currentPaletteIndex].colors;

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

                const center = this.getHexagonScreenCenter();

                const zoomFactor = e.deltaY > 0 ? 0.985 : 1.015;
                const newZoom = Math.max(0.1, Math.min(10.0, this.zoomLevel * zoomFactor));

                const scale = newZoom / this.zoomLevel;
                this.panX = center.x - (center.x - this.panX) * scale;
                this.panY = center.y - (center.y - this.panY) * scale;

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

        changePalette() {
            this.currentPaletteIndex = (this.currentPaletteIndex + 1) % this.colorPalettes.length;
            this.colors = this.colorPalettes[this.currentPaletteIndex].colors;
            return this.colorPalettes[this.currentPaletteIndex].name;
        }

        getCurrentPaletteName() {
            return this.colorPalettes[this.currentPaletteIndex].name;
        }

        setCustomColors(downColor, upColor, backgroundColor) {
            this.colors = {
                gray1: downColor,
                gray2: upColor,
                gray3: '#606060', // Darker gray for third type
                background: backgroundColor,
                black: '#000000',
                white: '#FFFFFF'
            };
        }

        getContrastingBorderColor(fillColor) {
            // Convert hex to RGB
            const hex = fillColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            // Calculate perceived brightness
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            
            // Special handling for gray rhombi (our gray3 color)
            if (fillColor === '#606060' || fillColor.toLowerCase() === '#848484') {
                return '#FFFFFF'; // White border for gray rhombi
            }
            
            // Return white for dark colors, black for light colors
            return brightness < 128 ? '#FFFFFF' : '#000000';
        }

        getHexagonScreenCenter() {
            if (!this.lastPaths || !this.lastN || !this.lastT || !this.lastS) {
                const width = this.canvas.width / (window.devicePixelRatio || 1);
                const height = this.canvas.height / (window.devicePixelRatio || 1);
                return { x: width / 2, y: height / 2 };
            }

            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);

            // Calculate where the hexagon center appears on screen
            // This matches the transformation sequence in drawHexagonStyle
            const screenCenterX = this.panX + width / 2;
            const screenCenterY = this.panY + height / 2;

            return { x: screenCenterX, y: screenCenterY };
        }

        zoomIn() {
            const center = this.getHexagonScreenCenter();

            const oldZoom = this.zoomLevel;
            const newZoom = Math.min(10.0, oldZoom * 1.2);

            if (newZoom === oldZoom) return;

            const scale = newZoom / oldZoom;
            this.panX = center.x - (center.x - this.panX) * scale;
            this.panY = center.y - (center.y - this.panY) * scale;

            this.zoomLevel = newZoom;
        }

        zoomOut() {
            const center = this.getHexagonScreenCenter();

            const oldZoom = this.zoomLevel;
            const newZoom = Math.max(0.1, oldZoom / 1.2);

            if (newZoom === oldZoom) return;

            const scale = newZoom / oldZoom;
            this.panX = center.x - (center.x - this.panX) * scale;
            this.panY = center.y - (center.y - this.panY) * scale;

            this.zoomLevel = newZoom;
        }

        resetZoom() {
            // Reset zoom and center the hexagon properly
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

            // Reset lozenge counts before drawing
            this.lozengeCounts = { horizontal: 0, left: 0, right: 0, unknown: 0 };

            for (let i = 0; i < T; i++) {
                for (let j = 0; j < N; j++) {
                    const currentHeight = paths[j][i];
                    const nextHeight = paths[j][i + 1];
                    this.drawRhombus(i, j, currentHeight, nextHeight);
                }
            }

            ctx.restore();

            // Log lozenge counts if in debug mode
            if (this.debugMode) {
                console.log('Lozenge counts:', this.lozengeCounts);
                console.log(`Total lozenges: ${this.lozengeCounts.horizontal + this.lozengeCounts.left + this.lozengeCounts.right + this.lozengeCounts.unknown}`);
            }
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

            ctx.fillStyle = this.colors.background || this.colors.gray3;
            ctx.fill();
        }

        drawRhombus(timeIdx, particleIdx, height, nextHeight) {
            const ctx = this.ctx;
            const sqrt3 = Math.sqrt(3);

            // Base coordinates for the rhombus
            const x1 = timeIdx * 0.5 * sqrt3;
            const y1 = height - timeIdx * 0.5;
            const x2 = x1;
            const y2 = y1 + 1;

            let x3, y3, x4, y4;
            let fillColor;
            let lozengeType;
            let debugSymbol;

            // Determine lozenge type based on position and transition
            if (nextHeight === height) {
                // Horizontal lozenge (Type 1) - flat rhombus
                x3 = x2 + 0.5 * sqrt3;
                y3 = y2 - 0.5;
                x4 = x1 + 0.5 * sqrt3;
                y4 = y1 - 0.5;
                fillColor = this.debugMode ? '#FF0000' : this.colors.gray1; // Bright red in debug mode
                lozengeType = 'horizontal';
                debugSymbol = 'H';

                // Log horizontal lozenges with details
                if (this.debugMode && this.logHorizontal) {
                    console.log(`Horizontal lozenge at time=${timeIdx}, particle=${particleIdx}, height=${height}, nextHeight=${nextHeight}`);
                }
            } else if (nextHeight === height + 1) {
                // Left-tilted lozenge (Type 2) - tilted up-right
                x3 = x2 + 0.5 * sqrt3;
                y3 = y2 + 0.5;
                x4 = x1 + 0.5 * sqrt3;
                y4 = y1 + 0.5;
                fillColor = this.debugMode ? '#0000FF' : this.colors.gray2; // Bright blue in debug mode
                lozengeType = 'left';
                debugSymbol = 'L';
            } else if (nextHeight === height - 1) {
                // Right-tilted lozenge (Type 3) - tilted down-right
                // This is actually a vertical rhombus
                x3 = x1 + 0.5 * sqrt3;
                y3 = y1 - 0.5;
                x4 = x2 + 0.5 * sqrt3;
                y4 = y2 - 0.5;
                fillColor = this.debugMode ? '#00FF00' : this.colors.gray3; // Bright green in debug mode
                lozengeType = 'right';
                debugSymbol = 'R';
            } else {
                // Unexpected case - log for debugging
                console.warn(`Unexpected height transition: time=${timeIdx}, particle=${particleIdx}, height=${height}, nextHeight=${nextHeight}, diff=${nextHeight - height}`);
                x3 = x2 + 0.5 * sqrt3;
                y3 = y2;
                x4 = x1 + 0.5 * sqrt3;
                y4 = y1;
                fillColor = '#FF00FF'; // Magenta for unexpected cases
                lozengeType = 'unknown';
                debugSymbol = '?';
            }

            // Draw the lozenge
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x4, y4);
            ctx.closePath();

            // Fill with appropriate color
            ctx.fillStyle = fillColor;
            ctx.fill();

            // Add border with improved visibility
            ctx.save();
            
            // Determine border color based on fill color
            let borderColor;
            if (this.debugMode) {
                borderColor = '#000000'; // Always black in debug mode
            } else {
                borderColor = this.getContrastingBorderColor(fillColor);
            }
            
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = this.debugMode ? 0.08 : 0.05; // Increased thickness for better visibility
            ctx.stroke();
            ctx.restore();

            // Draw debug label if in debug mode
            if (this.debugMode && this.showLabels) {
                ctx.save();
                ctx.fillStyle = '#000000';
                ctx.font = '0.3px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Calculate center of rhombus
                const centerX = (x1 + x2 + x3 + x4) / 4;
                const centerY = (y1 + y2 + y3 + y4) / 4;

                ctx.fillText(debugSymbol, centerX, centerY);
                ctx.restore();
            }

            // Count lozenge types
            if (!this.lozengeCounts) {
                this.lozengeCounts = { horizontal: 0, left: 0, right: 0, unknown: 0 };
            }
            this.lozengeCounts[lozengeType]++;
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

            document.getElementById('change-palette').addEventListener('click', () => {
                const paletteName = this.visualizer.changePalette();
                this.updateColorInfo(paletteName);
                this.redraw();
            });

            document.getElementById('custom-colors').addEventListener('click', () => {
                this.openColorPicker();
            });

            document.getElementById('toggle-debug').addEventListener('click', () => {
                this.toggleDebugMode();
            });

            // Export modal event listeners
            document.getElementById('copy-to-clipboard').addEventListener('click', () => {
                this.copyToClipboard();
            });

            document.getElementById('download-file').addEventListener('click', () => {
                this.downloadFile();
            });

            document.getElementById('close-export').addEventListener('click', () => {
                this.closeExportModal();
            });

            document.querySelector('.close-modal').addEventListener('click', () => {
                this.closeExportModal();
            });

            // Close modal when clicking outside of it
            document.getElementById('export-modal').addEventListener('click', (e) => {
                if (e.target.id === 'export-modal') {
                    this.closeExportModal();
                }
            });

            // Color picker modal event listeners
            document.getElementById('apply-colors').addEventListener('click', () => {
                this.applyCustomColors();
            });

            document.getElementById('reset-colors').addEventListener('click', () => {
                this.resetCustomColors();
            });

            document.getElementById('close-color-picker-btn').addEventListener('click', () => {
                this.closeColorPicker();
            });

            document.getElementById('close-color-picker').addEventListener('click', () => {
                this.closeColorPicker();
            });

            // Close modal when clicking outside of it
            document.getElementById('color-picker-modal').addEventListener('click', (e) => {
                if (e.target.id === 'color-picker-modal') {
                    this.closeColorPicker();
                }
            });

            // Update color previews when color inputs change
            document.getElementById('color-down').addEventListener('input', (e) => {
                document.getElementById('preview-down').style.backgroundColor = e.target.value;
            });

            document.getElementById('color-up').addEventListener('input', (e) => {
                document.getElementById('preview-up').style.backgroundColor = e.target.value;
            });

            document.getElementById('color-background').addEventListener('input', (e) => {
                document.getElementById('preview-background').style.backgroundColor = e.target.value;
            });

            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const exportModal = document.getElementById('export-modal');
                    const colorModal = document.getElementById('color-picker-modal');
                    if (exportModal.style.display === 'block') {
                        this.closeExportModal();
                    }
                    if (colorModal.style.display === 'block') {
                        this.closeColorPicker();
                    }
                }
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

                // Show the export modal with the text
                document.getElementById('export-textarea').value = text;
                document.getElementById('export-modal').style.display = 'block';

            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                alert('Export error: ' + errorMessage);
            }
        }

        copyToClipboard() {
            try {
                const textarea = document.getElementById('export-textarea');
                textarea.select();
                textarea.setSelectionRange(0, 99999); // For mobile devices

                if (navigator.clipboard && window.isSecureContext) {
                    // Use modern clipboard API if available
                    navigator.clipboard.writeText(textarea.value).then(() => {
                        alert('Copied to clipboard!');
                    }).catch(() => {
                        // Fallback to execCommand
                        document.execCommand('copy');
                        alert('Copied to clipboard!');
                    });
                } else {
                    // Fallback for older browsers
                    document.execCommand('copy');
                    alert('Copied to clipboard!');
                }
            } catch (error) {
                alert('Failed to copy to clipboard');
            }
        }

        downloadFile() {
            try {
                const text = document.getElementById('export-textarea').value;
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `plane_partition_N${this.wasm.getParameters().N}_T${this.wasm.getParameters().T}_S${this.wasm.getParameters().S}.txt`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                alert('Download error: ' + errorMessage);
            }
        }

        closeExportModal() {
            document.getElementById('export-modal').style.display = 'none';
        }

        openColorPicker() {
            // Set current colors in the color pickers
            const currentColors = this.visualizer.colors;
            document.getElementById('color-down').value = currentColors.gray1;
            document.getElementById('color-up').value = currentColors.gray2;
            document.getElementById('color-background').value = currentColors.gray3;

            // Update previews
            document.getElementById('preview-down').style.backgroundColor = currentColors.gray1;
            document.getElementById('preview-up').style.backgroundColor = currentColors.gray2;
            document.getElementById('preview-background').style.backgroundColor = currentColors.gray3;

            document.getElementById('color-picker-modal').style.display = 'block';
        }

        closeColorPicker() {
            document.getElementById('color-picker-modal').style.display = 'none';
        }

        applyCustomColors() {
            const downColor = document.getElementById('color-down').value;
            const upColor = document.getElementById('color-up').value;
            const backgroundColor = document.getElementById('color-background').value;

            this.visualizer.setCustomColors(downColor, upColor, backgroundColor);
            this.updateColorInfo('Custom');
            this.redraw();
            this.closeColorPicker();
        }

        resetCustomColors() {
            // Reset to UVA palette colors (now the default)
            const defaultColors = this.visualizer.colorPalettes[0].colors;
            document.getElementById('color-down').value = defaultColors.gray1;
            document.getElementById('color-up').value = defaultColors.gray2;
            document.getElementById('color-background').value = defaultColors.gray3;

            // Update previews
            document.getElementById('preview-down').style.backgroundColor = defaultColors.gray1;
            document.getElementById('preview-up').style.backgroundColor = defaultColors.gray2;
            document.getElementById('preview-background').style.backgroundColor = defaultColors.gray3;
        }

        updateInfo() {
            const params = this.wasm.getParameters();

            const info = document.getElementById('info');
            info.innerHTML = `
                <strong>Current Configuration:</strong><br>
                N = ${params.N}, T = ${params.T}, S = ${params.S}, q = ${params.q}
            `;
        }

        updateColorInfo(paletteName) {
            document.getElementById('current-palette').textContent = paletteName;
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

        toggleDebugMode() {
            this.visualizer.debugMode = !this.visualizer.debugMode;
            const debugInfo = document.getElementById('debug-info');
            const debugStatus = document.getElementById('debug-status');

            if (this.visualizer.debugMode) {
                debugInfo.style.display = 'block';
                debugStatus.textContent = 'ON';
                console.log('Debug mode enabled. Colors: Red=Horizontal, Blue=Left, Green=Right');
                this.analyzePaths();
            } else {
                debugInfo.style.display = 'none';
                debugStatus.textContent = 'OFF';
            }

            this.redraw();
        }

        analyzePaths() {
            const params = this.wasm.getParameters();
            const paths = this.wasm.getPaths();

            console.log('=== Path Analysis ===');
            console.log(`Configuration: N=${params.N}, T=${params.T}, S=${params.S}`);
            console.log(`Paths array dimensions: ${paths.length} x ${paths[0]?.length || 0}`);

            // Check for horizontal transitions
            let horizontalCount = 0;
            let leftCount = 0;
            let rightCount = 0;
            let otherCount = 0;

            for (let j = 0; j < params.N; j++) {
                for (let i = 0; i < params.T; i++) {
                    const current = paths[j][i];
                    const next = paths[j][i + 1];
                    const diff = next - current;

                    if (diff === 0) horizontalCount++;
                    else if (diff === 1) leftCount++;
                    else if (diff === -1) rightCount++;
                    else {
                        otherCount++;
                        console.log(`Unusual transition at particle ${j}, time ${i}: ${current} -> ${next} (diff=${diff})`);
                    }
                }
            }

            console.log(`Transition counts: Horizontal=${horizontalCount}, Left=${leftCount}, Right=${rightCount}, Other=${otherCount}`);
            console.log(`Total transitions: ${horizontalCount + leftCount + rightCount + otherCount}`);

            // Sample some paths
            console.log('Sample paths (first 3 particles):');
            for (let j = 0; j < Math.min(3, params.N); j++) {
                console.log(`Particle ${j}: [${paths[j].slice(0, Math.min(10, params.T + 1)).join(', ')}...]`);
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
