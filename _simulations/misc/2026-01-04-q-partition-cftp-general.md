---
title: CFTP Sampling of q-Weighted Partitions (General Boundary)
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2026-01-04-q-partition-cftp-general.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at this link'
published: true
---


<style>
/* Simulation container */
.sim-container {
  max-width: 1200px;
  margin: 0 auto;
  font-family: "franklingothic-book", Arial, "Helvetica Neue", Helvetica, sans-serif;
}

/* Control panel */
.control-panel {
  background-color: var(--bg-secondary, #F1F1EF);
  border: 1px solid var(--border-color, #DADADA);
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
}

[data-theme="dark"] .control-panel {
  background-color: var(--bg-secondary, #2d2d2d);
  border-color: var(--border-color, #4a4a4a);
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 15px;
  align-items: flex-end;
}

.control-group {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.control-group label {
  font-family: "franklingothic-demi", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--text-secondary, #6c757d);
  margin-bottom: 5px;
}

.control-group input[type="range"] {
  width: 150px;
  cursor: pointer;
}

.control-group input[type="number"] {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid var(--border-color, #DADADA);
  border-radius: 3px;
  font-size: 14px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #212529);
}

[data-theme="dark"] .control-group input[type="number"] {
  background: var(--bg-primary, #1a1a1a);
  color: var(--text-primary, #e8e8e8);
  border-color: var(--border-color, #4a4a4a);
}

.control-group input[type="text"] {
  padding: 6px 10px;
  border: 1px solid var(--border-color, #DADADA);
  border-radius: 3px;
  font-size: 14px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #212529);
}

[data-theme="dark"] .control-group input[type="text"] {
  background: var(--bg-primary, #1a1a1a);
  color: var(--text-primary, #e8e8e8);
  border-color: var(--border-color, #4a4a4a);
}

.control-group select {
  padding: 6px 10px;
  border: 1px solid var(--border-color, #DADADA);
  border-radius: 3px;
  font-size: 14px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #212529);
  cursor: pointer;
  min-width: 150px;
}

[data-theme="dark"] .control-group select {
  background: var(--bg-primary, #1a1a1a);
  color: var(--text-primary, #e8e8e8);
  border-color: var(--border-color, #4a4a4a);
}

.value-display {
  font-family: "SFMono-Regular", Consolas, Monaco, monospace;
  font-size: 0.9rem;
  color: var(--text-primary, #212529);
  min-width: 50px;
  display: inline-block;
}

.info-text {
  font-size: 0.8rem;
  color: var(--text-secondary, #6c757d);
  margin-top: 4px;
}

/* Shape-specific controls */
.shape-controls {
  display: none;
  margin-top: 10px;
  padding: 10px;
  background: var(--bg-primary, #ffffff);
  border-radius: 3px;
}

.shape-controls.active {
  display: block;
}

[data-theme="dark"] .shape-controls {
  background: var(--bg-primary, #1a1a1a);
}

/* Buttons */
.btn-sim {
  padding: 8px 20px;
  border: 2px solid #002f6c;
  border-radius: 4px;
  font-family: "franklingothic-demi", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 0.9rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
  color: #002f6c;
}

.btn-sim:hover {
  background: #002f6c;
  color: #ffffff;
}

.btn-sim.active, .btn-sim:active {
  background: #e57200;
  border-color: #e57200;
  color: #ffffff;
}

.btn-sim:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

[data-theme="dark"] .btn-sim {
  border-color: #66b3ff;
  color: #66b3ff;
}

[data-theme="dark"] .btn-sim:hover {
  background: #66b3ff;
  color: #1a1a1a;
}

[data-theme="dark"] .btn-sim.active {
  background: #ff9933;
  border-color: #ff9933;
  color: #1a1a1a;
}

/* Canvas container */
.canvas-container {
  background: var(--bg-primary, #ffffff);
  border: 1px solid var(--border-color, #DADADA);
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 20px;
  text-align: center;
}

[data-theme="dark"] .canvas-container {
  background: var(--bg-primary, #1a1a1a);
  border-color: var(--border-color, #4a4a4a);
}

#mainCanvas {
  max-width: 100%;
  height: auto;
}

/* Statistics panel */
.stats-panel {
  background-color: var(--bg-secondary, #F1F1EF);
  border: 1px solid var(--border-color, #DADADA);
  border-radius: 4px;
  padding: 15px 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
}

[data-theme="dark"] .stats-panel {
  background-color: var(--bg-secondary, #2d2d2d);
  border-color: var(--border-color, #4a4a4a);
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-family: "franklingothic-demi", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary, #6c757d);
}

.stat-value {
  font-family: "SFMono-Regular", Consolas, Monaco, monospace;
  font-size: 1.25rem;
  color: var(--text-primary, #212529);
}

[data-theme="dark"] .stat-value {
  color: var(--text-primary, #e8e8e8);
}

/* Status message */
.status-message {
  font-family: "franklingothic-book", Arial, sans-serif;
  font-size: 0.9rem;
  padding: 10px 15px;
  border-radius: 4px;
  margin-top: 15px;
  background: #e8f4f8;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

[data-theme="dark"] .status-message {
  background: #1a3a4a;
  color: #66b3ff;
  border-color: #2a5a7a;
}

.status-message.running {
  background: #fff3cd;
  color: #856404;
  border-color: #ffeeba;
}

[data-theme="dark"] .status-message.running {
  background: #4a3a1a;
  color: #ff9933;
  border-color: #6a4a2a;
}

.status-message.success {
  background: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

[data-theme="dark"] .status-message.success {
  background: #1a3a2a;
  color: #66ff99;
  border-color: #2a5a3a;
}

/* Responsive */
@media (max-width: 768px) {
  .control-row {
    flex-direction: column;
    gap: 15px;
  }

  .control-group {
    width: 100%;
  }

  .control-group input[type="range"] {
    width: 100%;
  }

  .stats-panel {
    gap: 15px;
  }
}

/* About section styling */
.about-section {
  margin-bottom: 20px;
}

.about-section summary {
  font-family: "franklingothic-demi", "Helvetica Neue", Helvetica, Arial, sans-serif;
  cursor: pointer;
  padding: 10px 0;
  color: var(--link-color, #2A69A6);
}

.about-section summary:hover {
  color: var(--link-hover, #e57200);
}

.about-content {
  padding: 15px;
  background: var(--bg-secondary, #F1F1EF);
  border-radius: 4px;
  margin-top: 10px;
}

[data-theme="dark"] .about-content {
  background: var(--bg-secondary, #2d2d2d);
}
</style>

<details class="about-section">
<summary><strong>About this simulation</strong></summary>
<div class="about-content">

<p><strong>Coupling From The Past (CFTP)</strong> is an algorithm for exact sampling from a target distribution. Here we sample partitions $\lambda$ contained in a given <strong>boundary partition</strong> $\mu$ with probability proportional to $q^{|\lambda|}$.</p>

<p><strong>Boundary Types:</strong></p>
<ul>
  <li><strong>Rectangle:</strong> $N \times M$ rectangle (all rows have length $N$)</li>
  <li><strong>Staircase:</strong> Shape $(k, k-1, \ldots, 1)$ for a given $k$</li>
  <li><strong>Custom:</strong> Specify any partition using notation like <code>50,40,30</code> or multiplicative form <code>50^3,40^2,10^5</code></li>
</ul>

<p><strong>Parameters:</strong></p>
<ul>
  <li>$q$: Weight parameter. When $q &lt; 1$, smaller partitions are favored; when $q &gt; 1$, larger partitions are favored.</li>
</ul>

<p><strong>Glauber Dynamics:</strong> At each step, pick a corner uniformly at random:</p>
<ul>
  <li>If addable (and within boundary): add box with probability $q/(1+q)$</li>
  <li>If removable: remove box with probability $1/(1+q)$</li>
</ul>

<p><strong>CFTP:</strong> Run two coupled chains from extremal states (empty partition and boundary partition). When they coalesce, we have an exact sample from the stationary distribution.</p>

<p><strong>Reference:</strong> A. Vershik, "Statistical mechanics of combinatorial partitions, and their limit shapes," <em>Functional Analysis and Its Applications</em> 30 (1996), 90-105.</p>

</div>
</details>

<div class="sim-container">
  <!-- Control Panel -->
  <div class="control-panel">
    <!-- Boundary Selection -->
    <div class="control-row">
      <div class="control-group">
        <label for="boundaryType">Boundary Type</label>
        <select id="boundaryType">
          <option value="rectangle">Rectangle</option>
          <option value="staircase">Staircase</option>
          <option value="custom">Custom</option>
        </select>
      </div>
    </div>

    <!-- Rectangle controls -->
    <div id="rectangleControls" class="shape-controls active">
      <div class="control-row">
        <div class="control-group">
          <label for="sliderN">N (width)</label>
          <input type="range" id="sliderN" min="5" max="500" value="50">
          <span class="value-display" id="valueN">50</span>
        </div>
        <div class="control-group">
          <label for="sliderM">M (height)</label>
          <input type="range" id="sliderM" min="5" max="500" value="50">
          <span class="value-display" id="valueM">50</span>
        </div>
      </div>
    </div>

    <!-- Staircase controls -->
    <div id="staircaseControls" class="shape-controls">
      <div class="control-row">
        <div class="control-group">
          <label for="staircaseK">k (staircase size)</label>
          <input type="number" id="staircaseK" min="2" max="500" value="50">
          <span class="info-text">Generates shape (k, k-1, ..., 1)</span>
        </div>
      </div>
    </div>

    <!-- Custom controls -->
    <div id="customControls" class="shape-controls">
      <div class="control-row">
        <div class="control-group" style="flex-grow: 1;">
          <label for="customShape">Shape (partition)</label>
          <input type="text" id="customShape" value="50^50,1^50" style="width: 100%; min-width: 250px;">
          <span class="info-text">E.g., <code>5,4,3,2,1</code> or <code>50^3,40^2,10^5</code> (50 repeated 3 times, 40 repeated 2 times, etc.)</span>
        </div>
      </div>
    </div>

    <!-- q and gamma controls -->
    <div class="control-row">
      <div class="control-group">
        <label for="inputQ">q (weight)</label>
        <input type="text" id="inputQ" value="1" style="width: 80px;">
      </div>
      <div class="control-group">
        <label for="sliderGamma">γ = -N·log(q)</label>
        <input type="range" id="sliderGamma" min="-20" max="20" step="0.1" value="0">
        <span class="value-display" id="valueGamma">0</span>
      </div>
      <div class="control-group">
        <label for="sliderSpeed">Steps/frame (log)</label>
        <input type="range" id="sliderSpeed" min="0" max="6" value="2">
        <span class="value-display" id="valueSpeed">100</span>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="control-row">
      <button class="btn-sim" id="btnCFTP">Run CFTP</button>
      <button class="btn-sim" id="btnGlauber">Run Glauber</button>
      <button class="btn-sim" id="btnStop" disabled>Stop</button>
      <button class="btn-sim" id="btnReset">Reset</button>
    </div>
    <div class="status-message" id="statusMessage">Ready. Click "Run CFTP" for exact sampling or "Run Glauber" for Markov chain dynamics.</div>
  </div>

  <!-- Canvas -->
  <div class="canvas-container">
    <canvas id="mainCanvas" width="800" height="600"></canvas>
  </div>

  <!-- Statistics -->
  <div class="stats-panel">
    <div class="stat-item">
      <span class="stat-label">Partition Size |λ|</span>
      <span class="stat-value" id="statSize">0</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Boundary Size |μ|</span>
      <span class="stat-value" id="statBoundarySize">0</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Steps</span>
      <span class="stat-value" id="statSteps">0</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">CFTP Time T</span>
      <span class="stat-value" id="statT">-</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Mode</span>
      <span class="stat-value" id="statMode">Idle</span>
    </div>
  </div>
</div>

<script>
// WASM module loading
var Module = {
  onRuntimeInitialized: function() {
    if (window.onWASMReady) window.onWASMReady();
  }
};
</script>
<script src="{{site.url}}/js/2026-01-04-q-partition-cftp-general.js"></script>
<script>
(function() {
  'use strict';

  // ==================== WASM function wrappers ====================
  let wasmReady = false;
  let initSimulationWithBoundary, runCFTPEpoch, runGlauberSteps, setQ;
  let getPartitionData, getLowerData, getUpperData, getBoundaryData, freeString;
  let getM, getN, getArea, getGap, getCftpT;

  window.onWASMReady = function() {
    initSimulationWithBoundary = Module.cwrap('initSimulationWithBoundary', null, ['string', 'number']);
    runCFTPEpoch = Module.cwrap('runCFTPEpoch', 'number', []);
    runGlauberSteps = Module.cwrap('runGlauberSteps', null, ['number']);
    getPartitionData = Module.cwrap('getPartitionData', 'number', []);
    getLowerData = Module.cwrap('getLowerData', 'number', []);
    getUpperData = Module.cwrap('getUpperData', 'number', []);
    getBoundaryData = Module.cwrap('getBoundaryData', 'number', []);
    freeString = Module.cwrap('freeString', null, ['number']);
    getM = Module.cwrap('getM', 'number', []);
    getN = Module.cwrap('getN', 'number', []);
    getArea = Module.cwrap('getArea', 'number', []);
    getGap = Module.cwrap('getGap', 'number', []);
    setQ = Module.cwrap('setQ', null, ['number']);
    getCftpT = Module.cwrap('getCftpT', 'number', []);
    wasmReady = true;
    updateParams();
    reset();
  };

  // ==================== Shape Parsing ====================
  function parseShape(input) {
    const parts = input.split(',').map(x => x.trim()).filter(x => x.length > 0);
    const arr = [];
    for (const part of parts) {
      if (part.includes('^')) {
        const [lenStr, countStr] = part.split('^').map(x => x.trim());
        const len = parseInt(lenStr);
        const count = parseInt(countStr);
        if (isNaN(len) || isNaN(count) || len <= 0 || count <= 0) {
          return null;
        }
        for (let i = 0; i < count; i++) arr.push(len);
      } else {
        const len = parseInt(part);
        if (isNaN(len) || len <= 0) {
          return null;
        }
        arr.push(len);
      }
    }
    // Validate: non-increasing sequence (valid partition)
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > arr[i-1]) {
        return null;  // Invalid partition
      }
    }
    return arr;
  }

  // Generate boundary partition based on current settings
  function getBoundaryPartition() {
    const boundaryType = document.getElementById('boundaryType').value;

    if (boundaryType === 'rectangle') {
      const n = parseInt(document.getElementById('sliderN').value) || 50;
      const m = parseInt(document.getElementById('sliderM').value) || 50;
      const arr = [];
      for (let i = 0; i < m; i++) arr.push(n);
      return arr;
    } else if (boundaryType === 'staircase') {
      const k = parseInt(document.getElementById('staircaseK').value) || 50;
      const arr = [];
      for (let i = k; i >= 1; i--) arr.push(i);
      return arr;
    } else if (boundaryType === 'custom') {
      const input = document.getElementById('customShape').value;
      const arr = parseShape(input);
      if (!arr || arr.length === 0) {
        alert('Invalid partition format. Use comma-separated values like "5,4,3,2,1" or multiplicative notation like "50^3,40^2"');
        return null;
      }
      return arr;
    }
    return [50];  // Default fallback
  }

  // ==================== Partition Class ====================
  class Partition {
    constructor(M, N, data = null) {
      this.M = M;
      this.N = N;
      this.parts = data ? data.slice() : new Array(M).fill(0);
    }

    clone() {
      return new Partition(this.M, this.N, this.parts);
    }

    size() {
      let s = 0;
      for (let i = 0; i < this.M; i++) s += this.parts[i];
      return s;
    }

    static empty(M, N) {
      return new Partition(M, N);
    }

    static fromArray(arr) {
      const M = arr.length;
      const N = arr[0] || 0;
      return new Partition(M, N, arr);
    }
  }

  // ==================== Simulation State ====================
  let N = 50;
  let M = 50;
  let q = 1.0;
  let stepsPerFrame = 100;
  let boundaryPartition = [];
  const colors = ['#E57200', '#232D4B', '#F9DCBF', '#002D62'];
  let currentPartition = null;
  let lowerBound = null;
  let upperBound = null;
  let isRunning = false;
  let isCFTP = false;
  let animationId = null;
  let stepCount = 0;
  let cftpT = 0;

  // ==================== Drawing ====================
  const canvas = document.getElementById('mainCanvas');
  const ctx = canvas.getContext('2d');

  function draw() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!boundaryPartition || boundaryPartition.length === 0) return;

    const padding = 50;
    const drawWidth = canvas.width - 2 * padding;
    const drawHeight = canvas.height - 2 * padding;

    // Calculate scale to fit boundary
    const scaleX = drawWidth / N;
    const scaleY = drawHeight / M;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (drawWidth - N * scale) / 2;
    const offsetY = padding + (drawHeight - M * scale) / 2;

    // Draw grid background (only within boundary)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    // Horizontal lines
    for (let i = 0; i <= M; i++) {
      const rowWidth = (i < M) ? boundaryPartition[i] : 0;
      const prevRowWidth = (i > 0) ? boundaryPartition[i-1] : N;
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * scale);
      ctx.lineTo(offsetX + Math.max(rowWidth, prevRowWidth) * scale, offsetY + i * scale);
      ctx.stroke();
    }

    // Vertical lines (only where boundary extends)
    for (let j = 0; j <= N; j++) {
      let startRow = 0;
      let endRow = 0;
      for (let i = 0; i < M; i++) {
        if (boundaryPartition[i] >= j) endRow = i + 1;
      }
      if (endRow > 0) {
        ctx.beginPath();
        ctx.moveTo(offsetX + j * scale, offsetY);
        ctx.lineTo(offsetX + j * scale, offsetY + endRow * scale);
        ctx.stroke();
      }
    }

    // Function to draw a partition as a lattice path
    function drawPartitionPath(partition, color, lineWidth, dashed = false) {
      if (!partition) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (dashed) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);

      ctx.beginPath();
      let x = offsetX;
      let y = offsetY + M * scale;
      ctx.moveTo(x, y);

      for (let row = M - 1; row >= 0; row--) {
        const width = partition.parts[row];
        x = offsetX + width * scale;
        ctx.lineTo(x, y);
        y = offsetY + row * scale;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Function to draw boundary partition path
    function drawBoundaryPath(boundary, color, lineWidth) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([]);

      ctx.beginPath();
      let x = offsetX;
      let y = offsetY + M * scale;
      ctx.moveTo(x, y);

      for (let row = M - 1; row >= 0; row--) {
        const width = boundary[row];
        x = offsetX + width * scale;
        ctx.lineTo(x, y);
        y = offsetY + row * scale;
        ctx.lineTo(x, y);
      }
      // Close to top-left and back to start
      ctx.lineTo(offsetX, offsetY);
      ctx.lineTo(offsetX, offsetY + M * scale);

      ctx.stroke();
    }

    // Function to fill a partition region
    function fillPartitionRegion(partition, color) {
      if (!partition) return;

      ctx.fillStyle = color;
      ctx.beginPath();

      let x = offsetX;
      let y = offsetY + M * scale;
      ctx.moveTo(x, y);

      for (let row = M - 1; row >= 0; row--) {
        const width = partition.parts[row];
        x = offsetX + width * scale;
        ctx.lineTo(x, y);
        y = offsetY + row * scale;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(offsetX, offsetY);
      ctx.lineTo(offsetX, offsetY + M * scale);
      ctx.closePath();
      ctx.fill();
    }

    // Fill boundary region lightly
    ctx.fillStyle = colors[2] + '40';
    ctx.beginPath();
    let bx = offsetX;
    let by = offsetY + M * scale;
    ctx.moveTo(bx, by);
    for (let row = M - 1; row >= 0; row--) {
      bx = offsetX + boundaryPartition[row] * scale;
      ctx.lineTo(bx, by);
      by = offsetY + row * scale;
      ctx.lineTo(bx, by);
    }
    ctx.lineTo(offsetX, offsetY);
    ctx.lineTo(offsetX, offsetY + M * scale);
    ctx.closePath();
    ctx.fill();

    // Draw boundary outline
    drawBoundaryPath(boundaryPartition, colors[1], 2);

    // Draw based on current state
    if (isCFTP && lowerBound && upperBound) {
      fillPartitionRegion(upperBound, colors[2] + '80');
      fillPartitionRegion(lowerBound, colors[0] + '80');
      drawPartitionPath(upperBound, colors[1], 2, true);
      drawPartitionPath(lowerBound, colors[0], 3);
    } else if (currentPartition) {
      fillPartitionRegion(currentPartition, colors[0] + '60');
      drawPartitionPath(currentPartition, colors[0], 3);
    }

    // Labels
    ctx.fillStyle = colors[1];
    ctx.font = '14px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N = ' + N, offsetX + N * scale / 2, offsetY + M * scale + 30);
    ctx.save();
    ctx.translate(offsetX - 30, offsetY + M * scale / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('M = ' + M, 0, 0);
    ctx.restore();
  }

  // ==================== UI Controls ====================
  const boundaryTypeSelect = document.getElementById('boundaryType');
  const sliderN = document.getElementById('sliderN');
  const sliderM = document.getElementById('sliderM');
  const staircaseK = document.getElementById('staircaseK');
  const customShape = document.getElementById('customShape');
  const inputQ = document.getElementById('inputQ');
  const sliderGamma = document.getElementById('sliderGamma');
  const valueGamma = document.getElementById('valueGamma');
  const sliderSpeed = document.getElementById('sliderSpeed');
  const btnCFTP = document.getElementById('btnCFTP');
  const btnGlauber = document.getElementById('btnGlauber');
  const btnStop = document.getElementById('btnStop');
  const btnReset = document.getElementById('btnReset');
  const statusMessage = document.getElementById('statusMessage');

  // Show/hide controls based on boundary type
  function updateControlsVisibility() {
    const type = boundaryTypeSelect.value;
    document.getElementById('rectangleControls').classList.toggle('active', type === 'rectangle');
    document.getElementById('staircaseControls').classList.toggle('active', type === 'staircase');
    document.getElementById('customControls').classList.toggle('active', type === 'custom');
  }

  boundaryTypeSelect.addEventListener('change', () => {
    updateControlsVisibility();
    updateParams();
    reset();
  });

  function updateParams() {
    boundaryPartition = getBoundaryPartition();
    if (!boundaryPartition) {
      boundaryPartition = [50];  // Fallback
    }

    M = boundaryPartition.length;
    N = boundaryPartition[0] || 1;

    stepsPerFrame = Math.pow(10, parseInt(sliderSpeed.value));

    document.getElementById('valueN').textContent = sliderN.value;
    document.getElementById('valueM').textContent = sliderM.value;
    document.getElementById('valueSpeed').textContent = stepsPerFrame.toLocaleString();

    // Update boundary size stat
    const boundarySize = boundaryPartition.reduce((a, b) => a + b, 0);
    document.getElementById('statBoundarySize').textContent = boundarySize;

    document.getElementById('statSize').textContent = currentPartition ? currentPartition.size() : 0;
  }

  function updateGammaFromQ() {
    const qVal = parseFloat(inputQ.value);
    if (qVal > 0 && !isNaN(qVal)) {
      q = qVal;
      const gamma = -N * Math.log(q);
      if (gamma >= -20 && gamma <= 20) {
        sliderGamma.value = gamma;
        valueGamma.textContent = gamma.toFixed(2);
      } else {
        valueGamma.textContent = gamma > 20 ? '>20' : '<-20';
      }
    }
  }

  function updateQFromGamma() {
    const gamma = parseFloat(sliderGamma.value);
    if (!isNaN(gamma)) {
      q = Math.exp(-gamma / N);
      inputQ.value = q.toFixed(6);
      valueGamma.textContent = gamma.toFixed(1);
    }
  }

  function updateQFromN() {
    const gamma = parseFloat(sliderGamma.value);
    if (!isNaN(gamma)) {
      q = Math.exp(-gamma / N);
      inputQ.value = q.toFixed(6);
    }
  }

  function updateStats() {
    const size = currentPartition ? currentPartition.size() : (lowerBound ? lowerBound.size() : 0);
    document.getElementById('statSize').textContent = size;
    document.getElementById('statSteps').textContent = stepCount;
    document.getElementById('statT').textContent = cftpT > 0 ? cftpT : '-';
    document.getElementById('statMode').textContent = isRunning ? (isCFTP ? 'CFTP' : 'Glauber') : 'Idle';
  }

  function setStatus(msg, type = '') {
    statusMessage.textContent = msg;
    statusMessage.className = 'status-message' + (type ? ' ' + type : '');
  }

  sliderN.addEventListener('input', () => {
    updateParams();
    updateQFromN();
    reset();
  });
  sliderM.addEventListener('input', () => {
    updateParams();
    reset();
  });
  staircaseK.addEventListener('input', () => {
    updateParams();
    updateQFromN();
    reset();
  });
  customShape.addEventListener('change', () => {
    updateParams();
    updateQFromN();
    reset();
  });
  inputQ.addEventListener('input', () => {
    updateGammaFromQ();
    updateParams();
    if (wasmReady && isRunning && !isCFTP) {
      setQ(q);
    }
    draw();
  });
  sliderGamma.addEventListener('input', () => {
    updateQFromGamma();
    updateParams();
    if (wasmReady && isRunning && !isCFTP) {
      setQ(q);
    }
    draw();
  });
  sliderSpeed.addEventListener('input', updateParams);

  function reset() {
    stopSimulation();

    boundaryPartition = getBoundaryPartition();
    if (!boundaryPartition) {
      setStatus('Invalid partition format.', 'running');
      return;
    }

    M = boundaryPartition.length;
    N = boundaryPartition[0] || 1;

    currentPartition = Partition.empty(M, N);
    lowerBound = null;
    upperBound = null;
    stepCount = 0;
    cftpT = 0;

    if (wasmReady) {
      const boundaryStr = boundaryPartition.join(',');
      initSimulationWithBoundary(boundaryStr, q);
    }

    updateStats();
    draw();
    setStatus('Ready. Click "Run CFTP" for exact sampling or "Run Glauber" for Markov chain dynamics.');
  }

  function stopSimulation() {
    isRunning = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    btnCFTP.disabled = false;
    btnGlauber.disabled = false;
    btnStop.disabled = true;
    btnCFTP.classList.remove('active');
    btnGlauber.classList.remove('active');
  }

  function getArrayFromWasm(getter) {
    const ptr = getter();
    const str = Module.UTF8ToString(ptr);
    freeString(ptr);
    return JSON.parse(str);
  }

  function runGlauber() {
    if (isRunning) return;
    if (!wasmReady) {
      setStatus('WASM not ready yet, please wait...', 'running');
      return;
    }

    isRunning = true;
    isCFTP = false;
    lowerBound = null;
    upperBound = null;
    cftpT = 0;

    setQ(q);

    btnCFTP.disabled = true;
    btnGlauber.disabled = true;
    btnGlauber.classList.add('active');
    btnStop.disabled = false;
    setStatus('Running Glauber dynamics...', 'running');

    function step() {
      if (!isRunning) return;

      runGlauberSteps(stepsPerFrame);
      stepCount += stepsPerFrame;

      const wasmM = getM();
      const wasmN = getN();
      const partArr = getArrayFromWasm(getPartitionData);
      currentPartition = new Partition(wasmM, wasmN, partArr);

      updateStats();
      draw();
      animationId = requestAnimationFrame(step);
    }

    step();
  }

  function runCFTP() {
    if (isRunning) return;
    if (!wasmReady) {
      setStatus('WASM not ready yet, please wait...', 'running');
      return;
    }

    isRunning = true;
    isCFTP = true;
    btnCFTP.disabled = true;
    btnGlauber.disabled = true;
    btnStop.disabled = false;
    btnCFTP.classList.add('active');

    // Re-initialize WASM
    const boundaryStr = boundaryPartition.join(',');
    initSimulationWithBoundary(boundaryStr, q);

    let batch = 0;

    function runBatch() {
      if (!isRunning) {
        btnCFTP.disabled = false;
        btnGlauber.disabled = false;
        btnStop.disabled = true;
        btnCFTP.classList.remove('active');
        return;
      }

      batch++;

      const result = runCFTPEpoch();
      const gap = getGap();
      const wasmM = getM();
      const wasmN = getN();

      const lowerArr = getArrayFromWasm(getLowerData);
      const upperArr = getArrayFromWasm(getUpperData);
      lowerBound = new Partition(wasmM, wasmN, lowerArr);
      upperBound = new Partition(wasmM, wasmN, upperArr);

      // Get actual epoch window size from WASM
      cftpT = getCftpT();
      stepCount = cftpT;

      if (result === 1) {
        const partArr = getArrayFromWasm(getPartitionData);
        currentPartition = new Partition(wasmM, wasmN, partArr);
        lowerBound = null;
        upperBound = null;
        setStatus(`CFTP coalesced! T=${cftpT.toLocaleString()}, size=${currentPartition.size()}`, 'success');
        updateStats();
        draw();
        stopSimulation();
        return;
      }

      setStatus(`CFTP running: T=${cftpT.toLocaleString()}, gap=${gap}`, 'running');
      updateStats();
      draw();

      setTimeout(runBatch, 1);
    }

    runBatch();
  }

  btnCFTP.addEventListener('click', runCFTP);
  btnGlauber.addEventListener('click', runGlauber);
  btnStop.addEventListener('click', stopSimulation);
  btnReset.addEventListener('click', reset);

  // Initialize
  updateControlsVisibility();
  updateParams();
  updateGammaFromQ();
  reset();
})();
</script>
