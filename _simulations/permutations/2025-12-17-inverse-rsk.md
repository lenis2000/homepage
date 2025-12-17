---
title: Permutation from a given shape via inverse RSK (v2)
model: permutations
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-12-17-inverse-rsk.md'
    txt : 'Interactive JS – see source'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-12-17-inverse-rsk.cpp'
    txt : 'WASM sampler for a single SYT'
---

**Conjecture (L.P.)**: If a Young diagram has a limit shape on the scale $\sqrt{n}$, then random permutations have a limit in the sense of permutons.

<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
<!-- hook-walk WASM (already compiled, single-file) -->
<script src="{{site.url}}/js/2025-12-17-inverse-rsk.js"></script>

<style>
/* UVA-themed design system for inverse RSK visualization */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #F1F1EF;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --link-color: #2A69A6;
  --link-hover: #e57200;
  --accent-color: #e57200;
  --accent-secondary: #002f6c;
  --border-color: #DADADA;
  --success-color: #28a745;
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0a0;
  --link-color: #66b3ff;
  --link-hover: #ff9933;
  --accent-color: #ff9933;
  --accent-secondary: #4a7ab8;
  --border-color: #4a4a4a;
}

/* Controls panel */
.controls {
  margin: 20px 0;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.input-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.input-group label {
  font-family: "franklingothic-demi", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: 600;
  color: var(--text-primary);
  min-width: fit-content;
}

.input-group input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-group input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(229, 114, 0, 0.15);
}

[data-theme="dark"] .input-group input:focus {
  box-shadow: 0 0 0 2px rgba(255, 153, 51, 0.2);
}

/* Primary action buttons */
.input-group button,
#generate-permutation,
#generate-large-permutation,
#download-shape,
#download-sigma {
  padding: 10px 20px;
  background: var(--accent-secondary);
  color: #ffffff;
  border: 2px solid var(--accent-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-family: "franklingothic-book", Arial, "Helvetica Neue", Helvetica, sans-serif;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
}

.input-group button:hover,
#generate-permutation:hover,
#generate-large-permutation:hover,
#download-shape:hover,
#download-sigma:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #ffffff;
}

#generate-permutation {
  background: var(--accent-color);
  border-color: var(--accent-color);
}

#generate-permutation:hover {
  background: #c66200;
  border-color: #c66200;
}

/* Toggle buttons (mode switches) */
.mode-toggle,
.shape-toggle {
  padding: 8px 16px;
  border: 2px solid var(--accent-secondary);
  background: var(--bg-primary);
  color: var(--accent-secondary);
  cursor: pointer;
  margin-right: 6px;
  border-radius: 4px;
  font-family: "franklingothic-book", Arial, "Helvetica Neue", Helvetica, sans-serif;
  font-size: 14px;
  transition: all 0.2s ease;
}

.mode-toggle:hover,
.shape-toggle:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.mode-toggle.active,
.shape-toggle.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #ffffff;
}

/* Input sections */
.input-section {
  margin: 15px 0;
  padding: 18px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
}

[data-theme="dark"] .input-section {
  background: var(--bg-secondary);
}

/* Drawing area */
.drawing-container {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.drawing-info {
  min-width: 180px;
  font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.drawing-info div {
  margin: 6px 0;
}

.drawing-info span {
  color: var(--accent-color);
  font-weight: 600;
}

/* Grid cells for drawing */
.grid-cell {
  fill: var(--bg-primary);
  stroke: var(--border-color);
  stroke-width: 1;
  cursor: pointer;
  transition: fill 0.1s ease;
}

.grid-cell.filled {
  fill: rgba(229, 114, 0, 0.15);
}

[data-theme="dark"] .grid-cell.filled {
  fill: rgba(255, 153, 51, 0.2);
}

.grid-cell:hover {
  fill: rgba(229, 114, 0, 0.25);
}

[data-theme="dark"] .grid-cell:hover {
  fill: rgba(255, 153, 51, 0.3);
}

/* Shape input sections */
.shape-input-section {
  margin-top: 12px;
}

.info-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
  margin-left: 8px;
}

/* Progress bar */
.progress-bar {
  width: 100%;
  height: 24px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), #c66200);
  width: 0%;
  transition: width 0.3s ease;
  border-radius: 12px;
}

[data-theme="dark"] .progress-fill {
  background: linear-gradient(90deg, var(--accent-color), #cc7700);
}

.progress-text {
  text-align: center;
  font-size: 14px;
  margin-top: 8px;
  color: var(--text-secondary);
  font-family: "franklingothic-book", Arial, "Helvetica Neue", Helvetica, sans-serif;
}

/* Permutation display */
.permutation-display {
  font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  font-size: 14px;
  margin: 12px 0;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  overflow-x: auto;
}

#perm-matrix svg {
  max-width: 90vw;
  height: auto;
}

.summary-box {
  font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  color: var(--text-primary);
  margin: 8px 0;
}

/* Tableau styling */
.tableau-cell {
  fill: var(--bg-primary);
  stroke: var(--text-primary);
  stroke-width: 1;
}

.tableau-cell.filled {
  fill: rgba(229, 114, 0, 0.12);
}

[data-theme="dark"] .tableau-cell.filled {
  fill: rgba(255, 153, 51, 0.15);
}

.tableau-text {
  text-anchor: middle;
  dominant-baseline: middle;
  font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  font-size: 14px;
  fill: var(--text-primary);
}

/* Section headings */
h2, h3, h4 {
  color: var(--text-primary);
}

/* Details/Summary styling */
#algorithm-description-details summary {
  background-color: var(--bg-secondary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
  transition: background-color 0.2s ease;
}

#algorithm-description-details summary:hover {
  background-color: var(--border-color) !important;
}

#algorithm-description-details > div {
  background-color: var(--bg-secondary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

#algorithm-description-details code {
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  font-size: 13px;
  color: var(--accent-color);
  border: 1px solid var(--border-color);
}

/* Canvas styling */
#shape-canvas canvas {
  border-color: var(--border-color) !important;
  background: var(--bg-primary);
}

[data-theme="dark"] #shape-canvas canvas {
  filter: invert(0.85) hue-rotate(180deg);
}

/* WASM status indicator */
#wasm-status {
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .input-group {
    flex-direction: column;
    align-items: flex-start;
  }

  .drawing-container {
    flex-direction: column;
  }

  .mode-toggle,
  .shape-toggle {
    margin-bottom: 6px;
  }
}
</style>

<h2>Random permutation via inverse RSK</h2>

<details id="algorithm-description-details" style="margin-bottom: 20px;">
    <summary style="cursor: pointer; padding: 14px 18px; border: 1px solid var(--border-color); border-radius: 6px; background-color: var(--bg-secondary); font-family: 'franklingothic-demi', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; font-size: 1em; color: var(--text-primary); transition: background-color 0.2s ease;">
        About the Inverse RSK Algorithm
    </summary>
    <div style="padding: 18px; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 6px 6px; background-color: var(--bg-secondary); color: var(--text-primary); line-height: 1.6;">
        <p>The <strong>inverse Robinson-Schensted-Knuth (RSK) correspondence</strong> takes a pair of Standard Young Tableaux (P, Q) of the same shape and recovers the permutation that generated them through the forward RSK algorithm.</p>

        <h4 style="margin-top: 16px; margin-bottom: 8px; color: var(--accent-color);">How it works:</h4>
        <ol style="margin-left: 20px;">
            <li>Sample two independent random Standard Young Tableaux P and Q of the same shape using the hook-walk algorithm</li>
            <li>Apply the inverse RSK procedure:
                <ul style="margin: 8px 0 8px 16px;">
                    <li>For each time step t = N down to 1, find t in the Q-tableau</li>
                    <li>Extract the corresponding entry from the P-tableau</li>
                    <li>Perform reverse bumping through the rows to recover the original inserted value</li>
                </ul>
            </li>
            <li>The sequence of extracted values forms the permutation σ</li>
        </ol>

        <h4 style="margin-top: 16px; margin-bottom: 8px; color: var(--accent-color);">Shape Input Methods:</h4>
        <ul style="margin-left: 20px;">
            <li><strong>Draw Mode:</strong> Draw the outline of a Young diagram and specify target number of boxes</li>
            <li><strong>Text Input & Presets:</strong>
                <ul style="margin: 8px 0 8px 16px;">
                    <li><strong>Manual:</strong> Enter comma-separated row lengths (e.g., <code>5,4,3,2,1</code>) or use exponential notation (e.g., <code>50^50,1^50</code> for 50 rows of length 50 followed by 50 rows of length 1)</li>
                    <li><strong>Plancherel:</strong> Sample random partition with given number of boxes using Plancherel measure</li>
                    <li><strong>Staircase:</strong> Generate staircase shape k, k-1, ..., 1</li>
                </ul>
            </li>
        </ul>

        <h4 style="margin-top: 16px; margin-bottom: 8px; color: var(--accent-color);">Output Formats:</h4>
        <ul style="margin-left: 20px;">
            <li><strong>Small permutations (N ≤ 200):</strong>
                <ul style="margin: 8px 0 8px 16px;">
                    <li>Full permutation array display: <code>σ = [3, 1, 4, 2, ...]</code></li>
                    <li>Detailed tableaux with numbered entries</li>
                    <li>Permutation matrix with dots</li>
                </ul>
            </li>
            <li><strong>Medium permutations (200 < N ≤ 600):</strong>
                <ul style="margin: 8px 0 8px 16px;">
                    <li>Truncated array display: <code>σ of size N (showing first 20): [σ(1), σ(2), ..., σ(20), ...]</code></li>
                    <li>Permutation matrix visualization with dots</li>
                    <li>Color-coded tableaux (heat map style)</li>
                </ul>
            </li>
            <li><strong>Large permutations (N > 600):</strong>
                <ul style="margin: 8px 0 8px 16px;">
                    <li>Truncated array display with first 20 elements</li>
                    <li>Summary statistics only for visualization</li>
                    <li>Color-coded tableaux using UVA color scheme (orange to blue gradient)</li>
                </ul>
            </li>
        </ul>

        <h4 style="margin-top: 16px; margin-bottom: 8px; color: var(--accent-color);">Download Options:</h4>
        <ul style="margin-left: 20px;">
            <li><strong>Download Shape λ:</strong> Saves the Young diagram as comma-separated row lengths in a text file</li>
            <li><strong>Download Permutation σ:</strong> Saves the complete permutation as comma-separated values in a text file</li>
            <li>Files are timestamped with format: <code>shape_lambda_N{size}_{timestamp}.txt</code> and <code>permutation_sigma_N{size}_{timestamp}.txt</code></li>
        </ul>

        <h4 style="margin-top: 16px; margin-bottom: 8px; color: var(--accent-color);">Properties:</h4>
        <ul style="margin-left: 20px;">
            <li><strong>Uniform distribution:</strong> Generates uniformly random permutations with given RSK shape</li>
            <li><strong>Bijective:</strong> Perfect correspondence between permutations and SYT pairs</li>
            <li><strong>Scalable:</strong> Uses WASM for large shapes (N > 500 boxes) with pure JS implementation for smaller cases</li>
            <li><strong>Progress tracking:</strong> Shows progress bar for large simulations (N > 5000)</li>
        </ul>
    </div>
</details>

<div id="shape-ui"></div>
<div class="input-group" style="margin-top: 16px; padding: 16px; background: var(--bg-secondary); border-radius: 6px; border: 1px solid var(--border-color);">
  <button id="generate-permutation">Generate permutation σ</button>
  <button id="generate-large-permutation">Generate σ with N=30,000</button>
  <span id="wasm-status"></span>
</div>

<div id="progress-area" style="display:none; margin-top: 16px; padding: 16px; background: var(--bg-secondary); border-radius: 6px; border: 1px solid var(--border-color);">
  <div class="progress-bar"><div id="progress-fill" class="progress-fill"></div></div>
  <div id="progress-text" class="progress-text"></div>
</div>

<h3 style="margin-top: 28px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid var(--border-color); color: var(--text-primary);">Permutation</h3>
<div id="perm-matrix" style="background: var(--bg-secondary); padding: 20px; border-radius: 6px; border: 1px solid var(--border-color); display: inline-block; min-width: 450px;"></div>
<div id="perm-display" class="permutation-display"></div>
<div class="input-group" style="margin-top: 16px;">
  <button id="download-shape">Download Shape λ</button>
  <button id="download-sigma">Download Permutation σ</button>
</div>

<h3 style="margin-top: 28px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid var(--border-color); color: var(--text-primary);">Standard Young Tableaux</h3>
<div style="display: flex; gap: 32px; flex-wrap: wrap; align-items: flex-start;">
  <div style="flex: 1; min-width: 280px;">
    <h4 style="margin-bottom: 12px; color: var(--accent-color); font-family: 'Unna', serif; font-style: italic;">P-tableau</h4>
    <div id="p-tableau" style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color); min-height: 100px;"></div>
  </div>
  <div style="flex: 1; min-width: 280px;">
    <h4 style="margin-bottom: 12px; color: var(--accent-color); font-family: 'Unna', serif; font-style: italic;">Q-tableau</h4>
    <div id="q-tableau" style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color); min-height: 100px;"></div>
  </div>
</div>

<script>
/* global createHookModule */
/* eslint-disable no-await-in-loop, max-lines */

(function () {
  /* ---------------------------------- 0. Utilities ---------------------------------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const yieldFrame = () => new Promise(requestAnimationFrame);

  /* ---------------------------------- 1. Shape UI Class ---------------------------------- */

  /**
   * Complete shape input UI class borrowed from HookWalkVis
   * Handles drawing, text input, and Plancherel mode
   */
  class ShapeInputVis {
    constructor(hostId) {
      this.host = document.getElementById(hostId);
      if (!this.host) {
        return;
      }
      this.drawMode = true;
      this.usePlancherel = false;
      this.shapeMode = 'manual';
      this.eraserMode = false;
      this.plancherelData = null;
      this.canvasSize = 400;
      this.gridResolution = 100;
      this.pixelSize = this.canvasSize / this.gridResolution;

      this.borderGrid = Array.from({length: this.gridResolution},
                        _ => Array(this.gridResolution).fill(false));
      this.isDrawing = false;
      this.drawAction = true;
      this.prevRow = null;
      this.prevCol = null;

      this.initUI();
      this.setupEvents();
      this.initDrawingCanvas();
      this.loadPlancherelData();
    }

    initUI() {
      if (!this.host) {
        return;
      }
      this.host.innerHTML = `
        <div class="controls">
          <div class="input-group">
            <label>Input method:</label>
            <button id="toggle-draw-mode" class="mode-toggle active">Draw Shape</button>
            <button id="toggle-text-mode" class="mode-toggle">Text Input & Presets</button>
          </div>

          <!-- Drawing interface -->
          <div id="draw-interface" class="input-section">
            <div class="input-group">
              <label for="target-boxes">N:</label>
              <input type="number" id="target-boxes" value="2500" min="1" max="100000">
              <button id="eraser-toggle" class="mode-toggle">Eraser</button>
              <button id="clear-drawing">Clear</button>
              <span class="info-text">Draw only the outline; interior is auto-filled.</span>
            </div>
            <div class="drawing-container">
              <div id="shape-canvas"></div>
              <div class="drawing-info">
                <div>Current boxes: <span id="current-boxes">0</span></div>
              </div>
            </div>
          </div>

          <!-- Text interface -->
          <div id="text-interface" class="input-section" style="display: none;">
            <div class="input-group">
              <label>Shape type:</label>
              <button id="toggle-manual-shape" class="shape-toggle active">Manual</button>
              <button id="toggle-plancherel-shape" class="shape-toggle">Plancherel</button>
              <button id="toggle-staircase-shape" class="shape-toggle">Staircase</button>
            </div>

            <div id="manual-shape-input" class="shape-input-section">
              <div class="input-group">
                <label for="shape-input">Shape (rows):</label>
                <input type="text" id="shape-input" value="50^50">
              </div>
            </div>

            <div id="plancherel-shape-input" class="shape-input-section" style="display: none;">
              <div class="input-group">
                <label for="plancherel-n">Number of boxes (N):</label>
                <input type="number" id="plancherel-n" value="100" min="1" max="10000">
                <span class="info-text">Samples random partition with Plancherel measure</span>
              </div>
            </div>

            <div id="staircase-shape-input" class="shape-input-section" style="display: none;">
              <div class="input-group">
                <label for="staircase-k">Staircase k:</label>
                <input type="number" id="staircase-k" value="10" min="1" max="1000">
                <span class="info-text">Generates staircase shape k, k-1, ..., 1</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    setupEvents() {
      document.getElementById('toggle-draw-mode').addEventListener('click', () => this.setDrawMode(true));
      document.getElementById('toggle-text-mode').addEventListener('click', () => this.setDrawMode(false));
      document.getElementById('clear-drawing').addEventListener('click', () => this.clearDrawing());
      document.getElementById('eraser-toggle').addEventListener('click', () => this.toggleEraserMode());
      document.getElementById('toggle-manual-shape').addEventListener('click', () => this.setShapeMode('manual'));
      document.getElementById('toggle-plancherel-shape').addEventListener('click', () => this.setShapeMode('plancherel'));
      document.getElementById('toggle-staircase-shape').addEventListener('click', () => this.setShapeMode('staircase'));
    }

    setDrawMode(isDraw) {
      this.drawMode = isDraw;
      document.getElementById('toggle-draw-mode').classList.toggle('active', isDraw);
      document.getElementById('toggle-text-mode').classList.toggle('active', !isDraw);
      document.getElementById('draw-interface').style.display = isDraw ? 'block' : 'none';
      document.getElementById('text-interface').style.display = isDraw ? 'none' : 'block';
      document.getElementById('generate-large-permutation').style.display = isDraw ? 'inline-block' : 'none';
    }

    setShapeMode(mode) {
      this.shapeMode = mode;
      document.getElementById('toggle-manual-shape').classList.toggle('active', mode === 'manual');
      document.getElementById('toggle-plancherel-shape').classList.toggle('active', mode === 'plancherel');
      document.getElementById('toggle-staircase-shape').classList.toggle('active', mode === 'staircase');

      document.getElementById('manual-shape-input').style.display = mode === 'manual' ? 'block' : 'none';
      document.getElementById('plancherel-shape-input').style.display = mode === 'plancherel' ? 'block' : 'none';
      document.getElementById('staircase-shape-input').style.display = mode === 'staircase' ? 'block' : 'none';

      // For backward compatibility
      this.usePlancherel = (mode === 'plancherel');
    }

    toggleEraserMode() {
      this.eraserMode = !this.eraserMode;
      document.getElementById('eraser-toggle').classList.toggle('active', this.eraserMode);
      this.canvas.style.cursor = this.eraserMode ? 'crosshair' : 'crosshair';
    }

    initDrawingCanvas() {
      const container = document.getElementById('shape-canvas');
      container.innerHTML = '';

      this.canvas = document.createElement('canvas');
      this.canvas.width = this.canvasSize;
      this.canvas.height = this.canvasSize;
      this.canvas.style.border = '2px solid #ccc';
      this.canvas.style.borderRadius = '4px';
      this.canvas.style.cursor = 'crosshair';
      this.canvas.style.display = 'block';

      container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      this.setupCanvasEvents();
      this.drawCanvas();
      this.updateDrawingInfo();
    }

    drawLine(r0, c0, r1, c1, val) {
      let dr = Math.abs(r1 - r0), dc = Math.abs(c1 - c0);
      let sr = (r0 < r1) ? 1 : -1, sc = (c0 < c1) ? 1 : -1;
      let err = dr - dc;
      while (true) {
        this.borderGrid[r0][c0] = val;
        if (r0 === r1 && c0 === c1) break;
        const e2 = 2 * err;
        if (e2 > -dc) { err -= dc; r0 += sr; }
        if (e2 < dr) { err += dr; c0 += sc; }
      }
    }

    setupCanvasEvents() {
      const start = (x, y) => {
        const {row, col} = this.xy2rc(x, y);
        if (row < 0) return;
        this.isDrawing = true;

        if (this.eraserMode) {
          this.eraseDownAndRight(row, col);
        } else {
          this.drawAction = !this.borderGrid[row][col];
          this.prevRow = row; this.prevCol = col;
          this.setBorder(row, col, this.drawAction);
        }
      };

      const move = (x, y) => {
        if (!this.isDrawing) return;
        const {row, col} = this.xy2rc(x, y);
        if (row === this.prevRow && col === this.prevCol) return;

        if (this.eraserMode) {
          this.eraseDownAndRight(row, col);
        } else {
          if (this.drawAction) this.drawLine(this.prevRow, this.prevCol, row, col, true);
          else this.drawLine(this.prevRow, this.prevCol, row, col, false);
          this.prevRow = row; this.prevCol = col;
          this.drawCanvas();
          this.updateDrawingInfo();
        }
      };

      const stop = () => {
        this.isDrawing = false;
        this.prevRow = this.prevCol = null;
      };

      this.canvas.addEventListener('mousedown', e => start(e.offsetX, e.offsetY));
      this.canvas.addEventListener('mousemove', e => move(e.offsetX, e.offsetY));
      window.addEventListener('mouseup', stop);

      this.canvas.addEventListener('touchstart', e => {
        const t = e.touches[0]; const r = this.canvas.getBoundingClientRect();
        start(t.clientX - r.left, t.clientY - r.top); e.preventDefault();
      }, {passive: false});
      this.canvas.addEventListener('touchmove', e => {
        const t = e.touches[0]; const r = this.canvas.getBoundingClientRect();
        move(t.clientX - r.left, t.clientY - r.top); e.preventDefault();
      }, {passive: false});
      window.addEventListener('touchend', stop);
    }

    xy2rc(x, y) {
      return {row: Math.floor(y / this.pixelSize), col: Math.floor(x / this.pixelSize)};
    }

    setBorder(r, c, val) {
      if (r < 0 || r >= this.gridResolution || c < 0 || c >= this.gridResolution) return;
      if (this.borderGrid[r][c] === val) return;
      this.borderGrid[r][c] = val;
      this.drawCanvas();
      this.updateDrawingInfo();
    }

    drawCanvas() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);

      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 0.5;
      for (let i = 0; i <= this.canvasSize; i += this.pixelSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, this.canvasSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(this.canvasSize, i); ctx.stroke();
      }

      const N = this.gridResolution;
      const interior = Array.from({length: N}, _ => Array(N).fill(false));
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (!this.borderGrid[r][c]) continue;
          for (let rr = 0; rr <= r; rr++) {
            for (let cc = 0; cc <= c; cc++) {
              interior[rr][cc] = true;
            }
          }
        }
      }

      ctx.fillStyle = '#000000';
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++)
          if (interior[r][c])
            ctx.fillRect(c * this.pixelSize, r * this.pixelSize, this.pixelSize, this.pixelSize);

      ctx.fillStyle = '#000000';
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++)
          if (this.borderGrid[r][c])
            ctx.fillRect(c * this.pixelSize, r * this.pixelSize, this.pixelSize, this.pixelSize);
    }

    clearDrawing() {
      for (let r = 0; r < this.gridResolution; r++) {
        for (let c = 0; c < this.gridResolution; c++) {
          this.borderGrid[r][c] = false;
        }
      }
      this.drawCanvas();
      this.updateDrawingInfo();
    }

    eraseDownAndRight(row, col) {
      // Remove all points down and right from (row, col)
      for (let r = row; r < this.gridResolution; r++) {
        for (let c = col; c < this.gridResolution; c++) {
          this.borderGrid[r][c] = false;
        }
      }
      this.drawCanvas();
      this.updateDrawingInfo();
    }


    updateDrawingInfo() {
      const drawnShape = this.getShapeFromDrawing();
      const boxes = drawnShape.reduce((a, b) => a + b, 0);
      document.getElementById('current-boxes').textContent = boxes;
      document.getElementById('target-boxes').value = boxes;
    }

    getShapeFromDrawing() {
      const N = this.gridResolution;
      const interior = Array.from({length: N}, _ => Array(N).fill(false));

      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (!this.borderGrid[r][c]) continue;
          for (let rr = 0; rr <= r; rr++) {
            for (let cc = 0; cc <= c; cc++) {
              interior[rr][cc] = true;
            }
          }
        }
      }

      const rowLen = [];
      for (let r = 0; r < N; r++) {
        let len = 0;
        while (len < N && interior[r][len]) len++;
        if (len === 0 && rowLen.length) break;
        if (len > 0) rowLen.push(len);
      }

      for (let i = 1; i < rowLen.length; i++)
        if (rowLen[i] > rowLen[i - 1]) rowLen[i] = rowLen[i - 1];

      return rowLen;
    }

    async loadPlancherelData() {
      try {
        const response = await fetch('/js/2025-05-04-dim-lambda-partitionData.json');
        this.plancherelData = await response.json();
      } catch (error) {
        // Could not load Plancherel data, using fallback algorithm
      }
    }

    samplePlancherelPartition(n) {
      if (this.plancherelData && this.plancherelData[n]) {
        const partitionData = this.plancherelData[n];
        return [...partitionData.partition];
      }

      if (this.plancherelData && n > 5000) {
        const minK2 = n / 5000;
        const k = Math.ceil(Math.sqrt(minK2));
        const targetSize = Math.floor(n / (k * k));

        if (this.plancherelData[targetSize]) {
          const partitionData = this.plancherelData[targetSize];
          return this.blockScalePartition(partitionData.partition, k);
        }
      }

      return this.fallbackPlancherelPartition(n);
    }

    blockScalePartition(partition, k) {
      const scaledPartition = [];
      for (let i = 0; i < partition.length; i++) {
        const rowLength = partition[i];
        const scaledRowLength = rowLength * k;
        for (let j = 0; j < k; j++) {
          scaledPartition.push(scaledRowLength);
        }
      }
      return scaledPartition;
    }

    scalePartition2D(partition, targetN) {
      const currentN = partition.reduce((a, b) => a + b, 0);
      if (currentN === 0) return [];

      const k = Math.max(1, Math.ceil(Math.sqrt(targetN / currentN)));
      let scaled = this.blockScalePartition(partition, k);
      return this.adjustPartitionSize(scaled, targetN);
    }

    adjustPartitionSize(partition, targetN) {
      const currentN = partition.reduce((a, b) => a + b, 0);
      if (currentN === targetN) return partition;

      const adjusted = [...partition];

      if (currentN < targetN) {
        let diff = targetN - currentN;
        let i = 0;
        while (diff > 0 && i < adjusted.length) {
          adjusted[i]++;
          diff--;
          i = (i + 1) % adjusted.length;
        }
      } else if (currentN > targetN) {
        let diff = currentN - targetN;
        for (let i = adjusted.length - 1; i >= 0 && diff > 0; i--) {
          if (adjusted[i] > 1) {
            adjusted[i]--;
            diff--;
          }
        }
      }

      adjusted.sort((a, b) => b - a);
      for (let i = 1; i < adjusted.length; i++) {
        if (adjusted[i] > adjusted[i - 1]) adjusted[i] = adjusted[i - 1];
      }

      return adjusted.filter(x => x > 0);
    }

    fallbackPlancherelPartition(n) {
      const side = Math.floor(Math.sqrt(n));
      const partition = [];

      for (let i = 0; i < side + 5; i++) {
        const baseLength = side - Math.floor(i / 2);
        const noise = Math.floor(this.gaussianRandom() * Math.sqrt(side));
        const length = Math.max(1, baseLength + noise);

        if (length > 0) partition.push(length);
      }

      return this.scalePartition(partition, n);
    }

    scalePartition(partition, targetN) {
      const currentN = partition.reduce((a, b) => a + b, 0);
      if (currentN === targetN) return [...partition];

      const scale = targetN / currentN;
      let scaled = partition.map(x => Math.max(1, Math.round(x * scale)));

      let sum = scaled.reduce((a, b) => a + b, 0);
      let i = 0;
      while (sum < targetN && i < scaled.length) {
        scaled[i]++;
        sum++;
        i = (i + 1) % scaled.length;
      }
      while (sum > targetN && i < scaled.length) {
        if (scaled[i] > 1) {
          scaled[i]--;
          sum--;
        }
        i++;
      }

      scaled.sort((a, b) => b - a);
      for (let i = 1; i < scaled.length; i++) {
        if (scaled[i] > scaled[i - 1]) scaled[i] = scaled[i - 1];
      }

      return scaled.filter(x => x > 0);
    }

    gaussianRandom() {
      if (this.spare !== undefined) {
        const tmp = this.spare;
        delete this.spare;
        return tmp;
      }
      const u = Math.random(), v = Math.random();
      const mag = Math.sqrt(-2 * Math.log(u));
      this.spare = mag * Math.cos(2 * Math.PI * v);
      return mag * Math.sin(2 * Math.PI * v);
    }

    parseShape() {
      let arr;

      if (this.drawMode) {
        try {
          arr = this.getShapeFromDrawing();
          if (!arr.length) {
            // Fall back to text input
            arr = [50, 50];  // Default 50x50 if drawing fails
          }
        } catch (error) {
          arr = [50, 50];  // Default fallback
        }

        const Nwanted = parseInt(document.getElementById('target-boxes').value) || 1;
        const Ncurr = arr.reduce((a, b) => a + b, 0);
        if (Ncurr !== Nwanted) {
          arr = this.scalePartition2D(arr, Nwanted);
        }
      } else if (this.shapeMode === 'plancherel') {
        const n = parseInt(document.getElementById('plancherel-n').value) || 100;
        arr = this.samplePlancherelPartition(n);
        if (!arr.length) {
          alert('Failed to generate Plancherel partition');
          return null;
        }
      } else if (this.shapeMode === 'staircase') {
        const k = parseInt(document.getElementById('staircase-k').value) || 10;
        arr = [];
        for (let i = k; i >= 1; i--) {
          arr.push(i);
        }
      } else {
        const txt = document.getElementById('shape-input').value;
        const parts = txt.split(',').map(x => x.trim());
        arr = [];

        for (const part of parts) {
          if (part.includes('^')) {
            const [len, count] = part.split('^').map(x => parseInt(x.trim()));
            if (isNaN(len) || isNaN(count) || len <= 0 || count <= 0) {
              alert('Bad shape format: ' + part);
              return null;
            }
            for (let i = 0; i < count; i++) arr.push(len);
          } else {
            const len = parseInt(part);
            if (isNaN(len) || len <= 0) {
              alert('Bad shape format: ' + part);
              return null;
            }
            arr.push(len);
          }
        }

        if (!arr.length) { alert('Bad shape'); return null; }
      }

      return arr;
    }
  }

  /* ---------------------------------- 2. Hook-walk sampler ---------------------------------- */

  /* Web Worker code for parallel WASM sampling */
  const workerCode = `
    let wasmModule = null;

    self.onmessage = async function(e) {
      const { shape, wasmUrl } = e.data;

      try {
        // Load WASM module if not already loaded
        if (!wasmModule) {
          importScripts(wasmUrl);
          // MODULARIZE exports a factory function 'createHookModule'
          wasmModule = await createHookModule();
        }

        const sample = wasmModule.cwrap('sampleHookWalk', 'string', ['string']);
        const getEntry = wasmModule.cwrap('getTableauEntry', 'number', ['number', 'number']);

        const status = sample(shape.join(','));
        if (status !== 'OK') {
          self.postMessage({ error: 'WASM hook-walk failed' });
          return;
        }

        // Extract tableau
        const T = [];
        for (let r = 0; r < shape.length; r++) {
          const row = [];
          for (let c = 0; c < shape[r]; c++) {
            row.push(getEntry(r, c));
          }
          T.push(row);
        }

        self.postMessage({ tableau: T });
      } catch (err) {
        self.postMessage({ error: err.message + ' (stack: ' + err.stack + ')' });
      }
    };
  `;

  let workerBlobUrl = null;

  function getWorkerUrl() {
    if (!workerBlobUrl) {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      workerBlobUrl = URL.createObjectURL(blob);
    }
    return workerBlobUrl;
  }

  /* Sample SYT using Web Worker (for parallel execution) */
  function sampleSYTWorker(shape) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(getWorkerUrl());
      const wasmUrl = new URL('/js/2025-12-17-inverse-rsk.js', location.origin).href;

      worker.onmessage = function(e) {
        worker.terminate();
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.tableau);
        }
      };

      worker.onerror = function(err) {
        worker.terminate();
        reject(new Error('Worker error: ' + err.message));
      };

      worker.postMessage({ shape, wasmUrl });
    });
  }

  /* Sample two SYTs in parallel using Web Workers */
  async function sampleSYTParallel(shape) {
    const [P, Q] = await Promise.all([
      sampleSYTWorker(shape),
      sampleSYTWorker(shape)
    ]);
    return { P, Q };
  }

  /* Original single-threaded sampler (fallback for small N or no Worker support) */
  async function sampleSYT(shape, wasm) {
    const N = shape.reduce((a, b) => a + b, 0);

    /* Use WASM sampler for N>500 if available */
    if (wasm && N > 500) {
      const sample = wasm.cwrap('sampleHookWalk', 'string', ['string']);
      const getEntry = wasm.cwrap('getTableauEntry', 'number', ['number', 'number']);
      const status = sample(shape.join(','));
      if (status !== 'OK') throw new Error('WASM hook-walk failed');

      const T = shape.map(r => Array(r));
      for (let r = 0; r < shape.length; ++r)
        for (let c = 0; c < shape[r]; ++c)
          T[r][c] = getEntry(r, c);
      return T;
    }

    /* Pure-JS Greene–Nijenhuis–Wilf hook-walk */
    const rowLen = [...shape];
    const T = rowLen.map(r => Array(r).fill(0));
    let cells = [];
    for (let r = 0; r < rowLen.length; ++r)
      for (let c = 0; c < rowLen[r]; ++c)
        cells.push([r, c]);

    for (let k = N; k >= 1; --k) {
      const [startIdx] = [Math.floor(Math.random() * cells.length)];
      let [r, c] = cells[startIdx];

      for (;;) {
        const arm = rowLen[r] - c - 1;
        let leg = 0;
        for (let rr = r + 1; rr < rowLen.length && c < rowLen[rr]; ++rr) ++leg;
        if (!arm && !leg) break;
        const step = 1 + Math.floor(Math.random() * (arm + leg));
        step <= arm ? (c += step) : (r += step - arm);
      }
      T[r][c] = k;
      rowLen[r]--;

      const next = [];
      for (const [rr, cc] of cells) {
        if (rr === r && cc === c) continue;
        if (cc >= rowLen[rr]) continue;
        next.push([rr, cc]);
      }
      cells = next;
    }
    return T;
  }

  /* ---------------------------------- 3. Inverse RSK ---------------------------------- */
  async function inverseRSK(P, Q) {
    const N = P.flat().length;
    const perm = Array(N);

    /*
     * OPTIMIZATION: Pre-compute Q lookup table - O(N) instead of O(N²)
     * qLoc[t] = {r, c} gives the position of value t in Q.
     * This works because we remove cells in reverse order of addition,
     * always removing "corners" which don't shift interior positions.
     */
    const qLoc = new Array(N + 1);
    for (let r = 0; r < Q.length; r++) {
      for (let c = 0; c < Q[r].length; c++) {
        qLoc[Q[r][c]] = { r, c };
      }
    }

    for (let t = N; t >= 1; --t) {
      // Progress update for large simulations
      if (N > 5000 && (t & 0x3F) === 0) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        if (progressFill && progressText) {
          const pct = Math.floor(((N - t + 1) / N) * 100);
          progressFill.style.width = `${pct}%`;
          progressText.textContent = `Progress: ${N - t + 1} / ${N} (${pct}%)`;
        }
      }

      if ((N - t) % 1024 === 0) await yieldFrame();   // let the browser paint every ~1k steps

      // O(1) lookup instead of O(N) scan
      const { r, c } = qLoc[t];

      const val = P[r][c];
      Q[r].splice(c, 1);
      P[r].splice(c, 1);
      if (Q[r].length === 0) { Q.splice(r, 1); P.splice(r, 1); }

      /* bump up */
      let currentVal = val;
      for (let row = r - 1; row >= 0; --row) {
        let best = -1;
        for (let col = P[row].length - 1; col >= 0; --col)
          if (P[row][col] < currentVal) { best = col; break; }
        if (best === -1) break;
        const tmp = P[row][best];
        P[row][best] = currentVal;
        currentVal = tmp;
      }
      perm[t - 1] = currentVal;
    }
    return perm;
  }

  /* ---------------------------------- 4. Permutation matrix draw (copied from RSK algorithm) ---------------------------------- */
  function drawPermutation(perm, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const N = perm.length;
    const fixedSize = 450; // Fixed size for the visualization
    const margin = 20;
    const cellSize = Math.min(30, (fixedSize - 2 * margin) / N);
    const dotRadius = Math.max(1, cellSize * 0.3);

    const svg = d3.select(container)
      .append('svg')
      .attr('width', fixedSize)
      .attr('height', fixedSize);

    const g = svg.append('g')
      .attr('transform', `translate(${margin}, ${margin})`);

    const actualSize = N * cellSize;

    // Draw border
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', actualSize)
      .attr('height', actualSize)
      .attr('fill', 'none')
      .attr('stroke', 'var(--text-primary, #333)')
      .attr('stroke-width', 1);

    // Draw dots for the permutation
    for (let j = 0; j < N; j++) {
      const i = perm[j] - 1;
      g.append('circle')
        .attr('cx', j * cellSize + cellSize / 2)
        .attr('cy', i * cellSize + cellSize / 2)
        .attr('r', dotRadius)
        .attr('fill', 'var(--text-primary, #333)');
    }
  }

  /* ---------------------------------- 5. Tableau drawing (EXACT copy from hookwalk-tableau) ---------------------------------- */
  function drawTableau(containerId, tableau, title) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (!tableau || tableau.length === 0) {
      container.innerHTML = '<div style="color: #666; font-style: italic;">No tableau</div>';
      return;
    }

    const N = tableau.flat().length;

    // Use EXACT same logic as hookwalk-tableau
    if (N <= 200) {
      drawTableauSmall(container, tableau, N);
    } else {
      drawTableauLarge(container, tableau, N);
    }
  }

  function drawTableauSmall(container, tableau, N) {
    const containerWidth = container.offsetWidth || 800;
    const containerHeight = window.innerHeight * 0.8; // 80% of viewport height
    const rows = tableau.length;
    const cols = Math.max(...tableau.map(row => row.length));
    const pad = 10;

    // Calculate cell size based on both width and height constraints
    const cellSizeByWidth = (containerWidth - 2 * pad) / cols;
    const cellSizeByHeight = (containerHeight - 2 * pad) / rows;
    const cellSize = Math.min(40, cellSizeByWidth, cellSizeByHeight);

    const width = cols * cellSize + 2 * pad;
    const height = rows * cellSize + 2 * pad;

    const svg = d3.select(container).append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('max-height', containerHeight + 'px');
    const g = svg.append('g').attr('transform', `translate(${pad},${pad})`);

    tableau.forEach((row, r) => {
      row.forEach((val, c) => {
        g.append('rect').attr('x', c * cellSize).attr('y', r * cellSize)
          .attr('width', cellSize).attr('height', cellSize)
          .attr('class', 'tableau-cell filled');
        g.append('text').attr('x', c * cellSize + cellSize / 2).attr('y', r * cellSize + cellSize / 2)
          .attr('class', 'tableau-text')
          .style('font-size', Math.min(14, cellSize * 0.6) + 'px')
          .text(val);
      });
    });
  }

  function drawTableauLarge(container, tableau, N) {
    const containerWidth = container.offsetWidth || 800;
    const containerHeight = window.innerHeight * 0.8; // 80% of viewport height
    const rows = tableau.length;
    const cols = Math.max(...tableau.map(row => row.length));
    const pad = 10;

    // Calculate cell size based on both width and height constraints
    const cellSizeByWidth = (containerWidth - 2 * pad) / cols;
    const cellSizeByHeight = (containerHeight - 2 * pad) / rows;
    const cellSize = Math.max(1, Math.min(cellSizeByWidth, cellSizeByHeight));

    const width = cols * cellSize + 2 * pad;
    const height = rows * cellSize + 2 * pad;

    const svg = d3.select(container).append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('max-height', containerHeight + 'px');
    const g = svg.append('g').attr('transform', `translate(${pad},${pad})`);

    const thresholds = [];
    for (let i = 1; i < 10; i++) thresholds.push(i * N / 10);

    // UVA color palette: orange (inside/small values) to blue (outside/large values)
    const uvaColors = [];
    for (let i = 0; i < 10; i++) {
      const t = i / 9; // 0 to 1
      const r = Math.round((1 - t) * 229 + t * 35);  // E57200 to 232D4B
      const g_val = Math.round((1 - t) * 114 + t * 45);
      const b = Math.round((1 - t) * 0 + t * 75);
      uvaColors.push(`rgb(${r},${g_val},${b})`);
    }

    tableau.forEach((row, r) => {
      row.forEach((val, c) => {
        let idx = thresholds.findIndex(t => val <= t) + 1; // 1..10
        g.append('rect').attr('x', c * cellSize).attr('y', r * cellSize)
          .attr('width', cellSize).attr('height', cellSize)
          .attr('fill', uvaColors[idx - 1]).attr('stroke-width', 0);
      });
    });
  }

  /* ---------------------------------- 6. Main driver class ---------------------------------- */
  class InverseRSKVis {
    constructor() {
      this.shapeUI = new ShapeInputVis('shape-ui');
      this.wasm = null;
      this.currentShape = null;
      this.currentPermutation = null;
      this.initWASM();
      document.getElementById('generate-permutation')
        .addEventListener('click', () => this.run());
      document.getElementById('generate-large-permutation')
        .addEventListener('click', () => this.runLarge());
      document.getElementById('download-shape')
        .addEventListener('click', () => this.downloadShape());
      document.getElementById('download-sigma')
        .addEventListener('click', () => this.downloadPermutation());
    }

    async initWASM() {
      if (typeof createHookModule !== 'undefined') {
        this.wasm = await createHookModule();
        document.getElementById('wasm-status')
          .textContent = '(WASM ready for N>500)';
      } else {
        document.getElementById('wasm-status')
          .textContent = '';
      }
    }

    showProgress(p, txt) {
      const bar = document.getElementById('progress-area');
      const fill = document.getElementById('progress-fill');
      const text = document.getElementById('progress-text');
      bar.style.display = 'block';
      fill.style.width = `${p}%`;
      text.textContent = txt;
    }

    hideProgress() {
      const bar  = document.getElementById('progress-area');
      const fill = document.getElementById('progress-fill');
      const text = document.getElementById('progress-text');
      if (!bar) return;
      fill.style.width = '100%';
      text.textContent = 'Simulation complete!';
      setTimeout(() => { bar.style.display = 'none'; }, 1000);   // ← 1-second grace period
    }

    downloadShape() {
      if (!this.currentShape) {
        alert('No shape data available. Please generate a permutation first.');
        return;
      }
      const content = this.currentShape.join(',');
      const size = this.currentShape.reduce((a, b) => a + b, 0);
      const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0];
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shape_lambda_N${size}_${timestamp}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    downloadPermutation() {
      if (!this.currentPermutation) {
        alert('No permutation data available. Please generate a permutation first.');
        return;
      }
      const content = this.currentPermutation.join(',');
      const size = this.currentPermutation.length;
      const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0];
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `permutation_sigma_N${size}_${timestamp}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    async run() {
      let shape;
      try {
        shape = this.shapeUI.parseShape();
      } catch (error) {
        shape = null;
      }

      if (!shape || shape.length === 0) {
        // Default to a small rectangle if no shape is provided
        const defaultShape = [7, 7, 7, 7, 7, 7, 7];
        const N = defaultShape.reduce((a, b) => a + b, 0);
        this.runWithShape(defaultShape, N);
        return;
      }
      const N = shape.reduce((a, b) => a + b, 0);
      this.runWithShape(shape, N);
    }

    async runLarge() {
      // Set N=30,000 and run the simulation with current shape
      document.getElementById('target-boxes').value = 30000;
      this.run();
    }

    async runWithShape(shape, N) {
      try {
        // Store current data for downloads
        this.currentShape = [...shape];

        // Show progress bar for large simulations
        if (N > 5000) {
          await (this.showProgress(0, `Initialising simulation for ${N} elements…`), yieldFrame());
        }

        let P, Q;

        // Use parallel Web Workers for large N (each worker loads its own WASM instance)
        const useParallel = N > 500 && typeof Worker !== 'undefined';

        if (useParallel) {
          await (this.showProgress(5, 'Sampling P and Q tableaux in parallel...'), yieldFrame());
          const result = await sampleSYTParallel(shape);
          P = result.P;
          Q = result.Q;
        } else {
          await (this.showProgress(5, 'Sampling P tableau'), yieldFrame());
          P = await sampleSYT(shape, this.wasm);

          await (this.showProgress(55, 'Sampling Q tableau'), yieldFrame());
          Q = await sampleSYT(shape, this.wasm);
        }

        await (this.showProgress(50, 'Drawing tableaux...'), yieldFrame());

        // Draw the tableaux before inverse RSK (for all sizes)
        drawTableau('p-tableau', P, 'P');
        drawTableau('q-tableau', Q, 'Q');

        /* deep copy because inverseRSK mutates */
        const Pcopy = P.map(r => r.slice());
        const Qcopy = Q.map(r => r.slice());

        await (this.showProgress(60, 'Computing inverse RSK'), yieldFrame());
        const perm = await inverseRSK(Pcopy, Qcopy);

        // Store current permutation for downloads
        this.currentPermutation = [...perm];

        await (this.showProgress(100, 'Rendering permutation'), yieldFrame());

        drawPermutation(perm, 'perm-matrix');

        if (N <= 200) {
          document.getElementById('perm-display').textContent = `σ = [${perm.join(', ')}]`;
        } else {
          document.getElementById('perm-display').textContent = `σ of size ${N} (showing first 20): [${perm.slice(0, 20).join(', ')}...]`;
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        this.hideProgress();
      }
    }
  }

  /* ---------------------------------- 6. Boot ---------------------------------- */
  window.addEventListener('DOMContentLoaded', () => {
    new InverseRSKVis();
  });
}());
</script>

