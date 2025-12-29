---
title: CFTP Sampling of q-Weighted Partitions
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-12-28-q-partition-cftp.md'
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

<p><strong>Coupling From The Past (CFTP)</strong> is an algorithm for exact sampling from a target distribution. Here we sample partitions $\lambda$ contained in an $M \times N$ rectangle with probability proportional to $q^{|\lambda|}$, where $|\lambda|$ is the number of boxes.</p>

<p><strong>Parameters:</strong></p>
<ul>
  <li>$N$: Width of the bounding rectangle</li>
  <li>$a = M/N$: Aspect ratio (so $M = \lfloor aN \rfloor$)</li>
  <li>$q$: Weight parameter. When $q &lt; 1$, smaller partitions are favored; when $q &gt; 1$, larger partitions are favored.</li>
</ul>

<p><strong>Glauber Dynamics:</strong> At each step, pick a corner (addable or removable position) uniformly at random:</p>
<ul>
  <li>If addable: add box with probability $q/(1+q)$</li>
  <li>If removable: remove box with probability $1/(1+q)$</li>
</ul>

<p><strong>CFTP:</strong> Run two coupled chains from extremal states (empty and full rectangle). When they coalesce, we have an exact sample from the stationary distribution.</p>

<p><strong>Limit Shape:</strong> As $N \to \infty$ with $q = e^{-\gamma/N}$ for fixed $\gamma > 0$, the rescaled partition boundary converges to a deterministic curve given by the implicit equation:
$$A e^{-\gamma y} + B e^{-\gamma x} = 1$$
where $A = \frac{1-e^{-\gamma}}{1-e^{-\gamma(1+a)}}$ and $B = \frac{1-e^{-\gamma a}}{1-e^{-\gamma(1+a)}}$. The red curve shows this limit shape.</p>

<p><strong>Reference:</strong> A. Vershik, "Statistical mechanics of combinatorial partitions, and their limit shapes," <em>Functional Analysis and Its Applications</em> 30 (1996), 90-105.</p>

</div>
</details>

<div class="sim-container">
  <!-- Control Panel -->
  <div class="control-panel">
    <div class="control-row">
      <div class="control-group">
        <label for="sliderN">N (width)</label>
        <input type="range" id="sliderN" min="5" max="1000" value="50">
        <span class="value-display" id="valueN">50</span>
      </div>
      <div class="control-group">
        <label for="sliderA">a (M/N ratio)</label>
        <input type="range" id="sliderA" min="0.1" max="10" step="0.1" value="1.0">
        <span class="value-display" id="valueA">1.0</span>
      </div>
      <div class="control-group">
        <label for="inputQ">q (weight)</label>
        <input type="text" id="inputQ" value="1" style="width: 80px;">
      </div>
      <div class="control-group">
        <label for="inputGamma">γ = -N·log(q)</label>
        <input type="text" id="inputGamma" value="0" style="width: 80px;">
      </div>
    </div>
    <div class="control-row">
      <div class="control-group">
        <label for="sliderSpeed">Steps/frame (log)</label>
        <input type="range" id="sliderSpeed" min="0" max="6" value="2">
        <span class="value-display" id="valueSpeed">100</span>
      </div>
    </div>
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
<script src="{{site.url}}/js/2025-12-28-q-partition-cftp.js"></script>
<script>
(function() {
  'use strict';

  // ==================== WASM function wrappers ====================
  let wasmReady = false;
  let initSimulation, runCFTPEpoch, runGlauberSteps, setQ;
  let getPartitionData, getLowerData, getUpperData, freeString;
  let getM, getN, getArea, getGap;

  window.onWASMReady = function() {
    initSimulation = Module.cwrap('initSimulation', null, ['number', 'number', 'number']);
    runCFTPEpoch = Module.cwrap('runCFTPEpoch', 'number', []);
    runGlauberSteps = Module.cwrap('runGlauberSteps', null, ['number']);
    getPartitionData = Module.cwrap('getPartitionData', 'number', []);
    getLowerData = Module.cwrap('getLowerData', 'number', []);
    getUpperData = Module.cwrap('getUpperData', 'number', []);
    freeString = Module.cwrap('freeString', null, ['number']);
    getM = Module.cwrap('getM', 'number', []);
    getN = Module.cwrap('getN', 'number', []);
    getArea = Module.cwrap('getArea', 'number', []);
    getGap = Module.cwrap('getGap', 'number', []);
    setQ = Module.cwrap('setQ', null, ['number']);
    wasmReady = true;
    updateParams();
    reset();
  };

  // ==================== Partition Class (for JS fallback and display) ====================
  class Partition {
    constructor(M, N, data = null) {
      this.M = M;  // Number of rows (height)
      this.N = N;  // Max width
      // parts[i] = number of boxes in row i (0-indexed from top)
      this.parts = data ? data.slice() : new Array(M).fill(0);
    }

    clone() {
      return new Partition(this.M, this.N, this.parts);
    }

    equals(other) {
      if (this.M !== other.M || this.N !== other.N) return false;
      for (let i = 0; i < this.M; i++) {
        if (this.parts[i] !== other.parts[i]) return false;
      }
      return true;
    }

    size() {
      let s = 0;
      for (let i = 0; i < this.M; i++) s += this.parts[i];
      return s;
    }

    // Check if we can add a box at row i (0-indexed)
    canAdd(i) {
      if (i < 0 || i >= this.M) return false;
      const curr = this.parts[i];
      if (curr >= this.N) return false;  // Can't exceed N
      // Must maintain partition property: parts[i] <= parts[i-1]
      if (i > 0 && curr >= this.parts[i - 1]) return false;
      return true;
    }

    // Check if we can remove a box from row i
    canRemove(i) {
      if (i < 0 || i >= this.M) return false;
      const curr = this.parts[i];
      if (curr <= 0) return false;  // Nothing to remove
      // Must maintain partition property: parts[i] >= parts[i+1]
      if (i < this.M - 1 && curr <= this.parts[i + 1]) return false;
      return true;
    }

    addBox(i) {
      if (this.canAdd(i)) {
        this.parts[i]++;
        return true;
      }
      return false;
    }

    removeBox(i) {
      if (this.canRemove(i)) {
        this.parts[i]--;
        return true;
      }
      return false;
    }

    // Get all corners (addable and removable positions)
    getCorners() {
      const addable = [];
      const removable = [];
      for (let i = 0; i < this.M; i++) {
        if (this.canAdd(i)) addable.push(i);
        if (this.canRemove(i)) removable.push(i);
      }
      return { addable, removable };
    }

    // Create empty partition
    static empty(M, N) {
      return new Partition(M, N);
    }

    // Create full partition (rectangle)
    static full(M, N) {
      const p = new Partition(M, N);
      for (let i = 0; i < M; i++) p.parts[i] = N;
      return p;
    }
  }

  // ==================== Random Number Generator ====================
  // Simple seeded PRNG (xorshift128+)
  class SeededRNG {
    constructor(seed) {
      this.state = [seed, seed ^ 0xDEADBEEF];
    }

    next() {
      let s1 = this.state[0];
      const s0 = this.state[1];
      this.state[0] = s0;
      s1 ^= s1 << 23;
      s1 ^= s1 >>> 17;
      s1 ^= s0;
      s1 ^= s0 >>> 26;
      this.state[1] = s1;
      return (this.state[0] + this.state[1]) >>> 0;
    }

    random() {
      return this.next() / 4294967296;
    }
  }

  // ==================== Simulation State ====================
  let N = 50;
  let M = 50;
  let q = 1.0;
  let stepsPerFrame = 100;
  // UVA colors: Orange, Navy, Light Orange, Dark Blue
  const colors = ['#E57200', '#232D4B', '#F9DCBF', '#002D62'];
  let currentPartition = null;
  let lowerBound = null;
  let upperBound = null;
  let isRunning = false;
  let isCFTP = false;
  let animationId = null;
  let stepCount = 0;
  let cftpT = 0;

  // ==================== Glauber Step ====================
  function glauberStep(partition, rng, qVal) {
    const corners = partition.getCorners();
    const allCorners = [];

    // Collect all corners with their type
    for (const i of corners.addable) {
      allCorners.push({ row: i, type: 'add' });
    }
    for (const i of corners.removable) {
      allCorners.push({ row: i, type: 'remove' });
    }

    if (allCorners.length === 0) return;

    // Pick a corner uniformly at random
    const idx = Math.floor(rng.random() * allCorners.length);
    const corner = allCorners[idx];
    const u = rng.random();

    if (corner.type === 'add') {
      // Add with probability q/(1+q)
      if (u < qVal / (1 + qVal)) {
        partition.addBox(corner.row);
      }
    } else {
      // Remove with probability 1/(1+q)
      if (u < 1 / (1 + qVal)) {
        partition.removeBox(corner.row);
      }
    }
  }

  // ==================== Drawing ====================
  const canvas = document.getElementById('mainCanvas');
  const ctx = canvas.getContext('2d');

  function draw() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 50;
    const drawWidth = canvas.width - 2 * padding;
    const drawHeight = canvas.height - 2 * padding;

    // Calculate scale to fit M x N rectangle
    const scaleX = drawWidth / N;
    const scaleY = drawHeight / M;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (drawWidth - N * scale) / 2;
    const offsetY = padding + (drawHeight - M * scale) / 2;

    // Draw grid background
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= M; i++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * scale);
      ctx.lineTo(offsetX + N * scale, offsetY + i * scale);
      ctx.stroke();
    }
    for (let j = 0; j <= N; j++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + j * scale, offsetY);
      ctx.lineTo(offsetX + j * scale, offsetY + M * scale);
      ctx.stroke();
    }

    // Draw bounding rectangle
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, N * scale, M * scale);

    // Function to draw a partition as a lattice path
    function drawPartitionPath(partition, color, lineWidth, dashed = false) {
      if (!partition) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (dashed) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);

      ctx.beginPath();
      // Start at bottom-left (0, M) in grid coords -> (offsetX, offsetY + M*scale) in canvas
      let x = offsetX;
      let y = offsetY + M * scale;
      ctx.moveTo(x, y);

      // Walk through the partition
      // The path goes: for each row from bottom (M-1) to top (0):
      //   - go right by parts[row] units
      //   - go up by 1 unit
      for (let row = M - 1; row >= 0; row--) {
        const width = partition.parts[row];
        // Go right
        x = offsetX + width * scale;
        ctx.lineTo(x, y);
        // Go up
        y = offsetY + row * scale;
        ctx.lineTo(x, y);
      }
      // Final segment to top-right if needed
      ctx.lineTo(offsetX + N * scale, offsetY);

      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Function to fill the partition region
    function fillPartitionRegion(partition, color) {
      if (!partition) return;

      ctx.fillStyle = color;
      ctx.beginPath();

      // Start at bottom-left
      let x = offsetX;
      let y = offsetY + M * scale;
      ctx.moveTo(x, y);

      // Trace the partition boundary
      for (let row = M - 1; row >= 0; row--) {
        const width = partition.parts[row];
        x = offsetX + width * scale;
        ctx.lineTo(x, y);
        y = offsetY + row * scale;
        ctx.lineTo(x, y);
      }

      // Close along the left and bottom edges
      ctx.lineTo(offsetX, offsetY);
      ctx.lineTo(offsetX, offsetY + M * scale);
      ctx.closePath();
      ctx.fill();
    }

    // Draw based on current state
    if (isCFTP && lowerBound && upperBound) {
      // Draw upper bound filled (light)
      fillPartitionRegion(upperBound, colors[2] + '80');  // Semi-transparent
      // Draw lower bound filled (darker)
      fillPartitionRegion(lowerBound, colors[0] + '80');
      // Draw paths
      drawPartitionPath(upperBound, colors[1], 2, true);
      drawPartitionPath(lowerBound, colors[0], 3);
    } else if (currentPartition) {
      // Single partition
      fillPartitionRegion(currentPartition, colors[0] + '60');
      drawPartitionPath(currentPartition, colors[0], 3);
    }

    // Draw limit shape curve
    // Using: A·e^{-cy} + B·e^{-cx} = 1 (both exponents negative)
    // c = γ/N² (scaled by N)
    function drawLimitShape() {
      const aa = M / N;  // aspect ratio a
      const gamma = -N * Math.log(q);  // γ from the formula q = e^(-γ/N)
      const c = gamma;  // c = γ (no N scaling)

      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();

      // For c ≈ 0 (q ≈ 1): straight diagonal from bottom-left to top-right
      if (Math.abs(c) < 1e-6) {
        ctx.moveTo(offsetX, offsetY + M * scale);
        ctx.lineTo(offsetX + N * scale, offsetY);
        ctx.stroke();
        return;
      }

      // Use formula: A·e^{-cy} + B·e^{-cx} = 1
      // where A = (1-e^{-c})/(1-e^{-c(1+a)}), B = (1-e^{-ca})/(1-e^{-c(1+a)})
      // Solving for y: y = -ln((1 - B·e^{-cx})/A) / c
      const denom = 1 - Math.exp(-c * (1 + aa));
      const A = (1 - Math.exp(-c)) / denom;
      const B = (1 - Math.exp(-c * aa)) / denom;

      const steps = 200;
      let points = [];

      for (let i = 0; i <= steps; i++) {
        const x_norm = i / steps;  // x in [0, 1]
        const exp_neg_cx = Math.exp(-c * x_norm);
        const inside = (1 - B * exp_neg_cx) / A;

        if (inside > 0) {
          const y_formula = -Math.log(inside) / c;
          // Flip y: curve goes from (0, aa) to (1, 0) in formula coords
          // We want bottom-left to top-right, so y_screen = aa - y_formula
          const y_norm = aa - y_formula;

          if (y_norm >= -0.1 && y_norm <= aa * 1.1) {
            // Map to screen: x_norm=0 -> left, x_norm=1 -> right
            // y_norm=0 -> bottom, y_norm=aa -> top
            const canvasX = offsetX + x_norm * N * scale;
            const canvasY = offsetY + M * scale - (y_norm / aa) * M * scale;
            points.push({x: canvasX, y: canvasY, xn: x_norm, yn: y_norm});
          }
        }
      }

      if (points.length > 0) {
        ctx.moveTo(offsetX, offsetY + M * scale);
        for (let p of points) {
          ctx.lineTo(p.x, p.y);
        }
        ctx.lineTo(offsetX + N * scale, offsetY);
      } else {
        ctx.moveTo(offsetX, offsetY + M * scale);
        ctx.lineTo(offsetX + N * scale, offsetY);
      }

      ctx.stroke();
    }

    drawLimitShape();

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
  const sliderN = document.getElementById('sliderN');
  const sliderA = document.getElementById('sliderA');
  const inputQ = document.getElementById('inputQ');
  const inputGamma = document.getElementById('inputGamma');
  const sliderSpeed = document.getElementById('sliderSpeed');
  const btnCFTP = document.getElementById('btnCFTP');
  const btnGlauber = document.getElementById('btnGlauber');
  const btnStop = document.getElementById('btnStop');
  const btnReset = document.getElementById('btnReset');
  const statusMessage = document.getElementById('statusMessage');

  function updateParams() {
    N = parseInt(sliderN.value) || 50;
    M = Math.floor(parseFloat(sliderA.value) * N);
    // Log scale: 10^0=1, 10^1=10, 10^2=100, ..., 10^6=1000000
    stepsPerFrame = Math.pow(10, parseInt(sliderSpeed.value));

    document.getElementById('valueN').textContent = N;
    document.getElementById('valueA').textContent = sliderA.value;
    document.getElementById('valueSpeed').textContent = stepsPerFrame.toLocaleString();

    // Update stats display
    document.getElementById('statSize').textContent = currentPartition ? currentPartition.size() : 0;
  }

  // Update gamma from q (gamma = -N * log(q))
  function updateGammaFromQ() {
    const qVal = parseFloat(inputQ.value);
    if (qVal > 0 && !isNaN(qVal)) {
      q = qVal;
      const gamma = -N * Math.log(q);
      inputGamma.value = gamma.toFixed(4);
    }
  }

  // Update q from gamma (q = exp(-gamma / N))
  function updateQFromGamma() {
    const gamma = parseFloat(inputGamma.value);
    if (!isNaN(gamma)) {
      q = Math.exp(-gamma / N);
      inputQ.value = q.toFixed(6);
    }
  }

  // When N changes, keep gamma fixed and update q
  function updateQFromN() {
    const gamma = parseFloat(inputGamma.value);
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
    updateQFromN();  // Keep gamma fixed, update q
    reset();
  });
  sliderA.addEventListener('input', () => {
    updateParams();
    reset();
  });
  inputQ.addEventListener('input', () => {
    updateGammaFromQ();
    updateParams();
    // Update WASM q if Glauber is running
    if (wasmReady && isRunning && !isCFTP) {
      setQ(q);
    }
    draw();
  });
  inputGamma.addEventListener('input', () => {
    updateQFromGamma();
    updateParams();
    // Update WASM q if Glauber is running
    if (wasmReady && isRunning && !isCFTP) {
      setQ(q);
    }
    draw();
  });
  sliderSpeed.addEventListener('input', updateParams);

  function reset() {
    stopSimulation();
    currentPartition = Partition.empty(M, N);
    lowerBound = null;
    upperBound = null;
    stepCount = 0;
    cftpT = 0;

    // Initialize WASM with current parameters
    if (wasmReady) {
      initSimulation(N, parseFloat(sliderA.value), q);
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

  // Glauber dynamics using WASM (same algorithm as CFTP)
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

    // Just update q without resetting the path (continue from current state)
    setQ(q);

    btnCFTP.disabled = true;
    btnGlauber.disabled = true;
    btnGlauber.classList.add('active');
    btnStop.disabled = false;
    setStatus('Running Glauber dynamics...', 'running');

    function step() {
      if (!isRunning) return;

      // Run steps in WASM
      runGlauberSteps(stepsPerFrame);
      stepCount += stepsPerFrame;

      // Get partition from WASM for display
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

  // Helper to parse JSON array from WASM
  function getArrayFromWasm(getter) {
    const ptr = getter();
    const str = Module.UTF8ToString(ptr);
    freeString(ptr);
    return JSON.parse(str);
  }

  // CFTP using WASM - runs until coalescence with progress updates
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

    // Re-initialize WASM with current parameters
    initSimulation(N, parseFloat(sliderA.value), q);

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

      // Run one batch (50M steps) in WASM
      const result = runCFTPEpoch();
      const gap = getGap();
      const wasmM = getM();
      const wasmN = getN();

      // Get the bounds for display
      const lowerArr = getArrayFromWasm(getLowerData);
      const upperArr = getArrayFromWasm(getUpperData);
      lowerBound = new Partition(wasmM, wasmN, lowerArr);
      upperBound = new Partition(wasmM, wasmN, upperArr);

      // Steps = batch * 50M
      cftpT = batch * 50000000;
      stepCount = cftpT;

      if (result === 1) {
        // Coalesced!
        const partArr = getArrayFromWasm(getPartitionData);
        currentPartition = new Partition(wasmM, wasmN, partArr);
        lowerBound = null;
        upperBound = null;
        setStatus(`CFTP coalesced! Steps=${cftpT.toLocaleString()}, size=${currentPartition.size()}`, 'success');
        updateStats();
        draw();
        stopSimulation();
        return;
      }

      // Still running - update status
      setStatus(`CFTP running: ${cftpT.toLocaleString()} steps, gap=${gap}`, 'running');
      updateStats();
      draw();

      // Continue to next batch
      setTimeout(runBatch, 1);
    }

    runBatch();
  }

  btnCFTP.addEventListener('click', runCFTP);
  btnGlauber.addEventListener('click', runGlauber);
  btnStop.addEventListener('click', stopSimulation);
  btnReset.addEventListener('click', reset);

  // Initialize
  updateParams();
  updateGammaFromQ();  // Sync gamma with initial q
  reset();
})();
</script>
