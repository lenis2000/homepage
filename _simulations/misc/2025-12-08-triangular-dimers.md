---
title: Triangular Lattice Dimer Sampler
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-12-08-triangular-dimers.md'
    txt: 'This simulation is interactive, written in JavaScript'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-12-08-triangular-dimers.cpp'
    txt: 'C++ code for the simulation (compiled to WebAssembly)'
---


<details id="about-simulation-details">
<summary>About / Help</summary>
<div class="content" style="padding: 16px; background: white; border-top: 1px solid #e0e0e0;">

<h4>What is this?</h4>
<p>This simulator generates <strong>random dimer coverings</strong> (perfect matchings) on the <strong>triangular lattice</strong> using Glauber dynamics (Markov Chain Monte Carlo).</p>

<p>The triangular lattice is <strong>non-bipartite</strong> (cannot be 2-colored), unlike the square lattice (domino tilings) or hexagonal lattice (lozenge tilings).
CFTP (Coupling From The Past) is not directly applicable due to lack of monotone coupling.</p>

<h4>How to use</h4>
<p><strong>Drawing tools:</strong></p>
<ul>
  <li><strong>Pan</strong>: Click and drag to move the view. Scroll to zoom in/out.</li>
  <li><strong>Draw</strong>: Click or drag on lattice vertices to add them to your region</li>
  <li><strong>Erase</strong>: Click or drag to remove vertices from your region</li>
  <li><strong>Lasso Fill/Erase</strong>: Click to place polygon vertices. Close the loop by clicking near the start, pressing Enter, or Cmd/Ctrl+click (adds final vertex then closes).</li>
  <li><strong>Make Coverable</strong>: Attempts to add vertices to enable a perfect matching</li>
</ul>

<p><strong>Presets:</strong> Parallelogram, Triangle</p>

<p><strong>View options:</strong></p>
<ul>
  <li><strong>Show grid</strong>: Display the underlying triangular lattice</li>
  <li><strong>Show vertices</strong>: Display lattice points in the region</li>
  <li><strong>Show boundary</strong>: Highlight the boundary of the region</li>
  <li><strong>Color by orientation</strong>: Color dimers by their direction (3 colors for 3 edge orientations)</li>
  <li><strong>Dimer width</strong>: Adjust the thickness of dimer lines</li>
</ul>

<h4>Double dimer model</h4>
<p>Enable <strong>Double dimer</strong> to superimpose two independent dimer configurations (blue and red). Each configuration evolves via its own independent Glauber dynamics.</p>

<p>The superposition of two perfect matchings decomposes into disjoint <strong>alternating cycles</strong> (loops that alternate between the two configurations). Double edges (where both configurations agree) appear as cycles of length 2.</p>

<p>Use <strong>Min loop</strong> to filter and display only cycles of at least the specified length, hiding double edges and short loops to reveal the large-scale loop structure.</p>

<h4>Local moves (Kenyon-Rémila)</h4>
<p>The simulator uses <strong>lozenge moves</strong> (3 types), <strong>triangle moves</strong> (2 types), and <strong>butterfly moves</strong> (3 types):</p>

<p><strong>Lozenge moves (4-cycle):</strong> Each lozenge is a parallelogram of 4 vertices. If two opposite edges are covered by dimers, flip to cover the other two.</p>
<ul>
  <li><strong>Type 0 (up-right)</strong>: (n,j) → (n+1,j) → (n+1,j+1) → (n,j+1)</li>
  <li><strong>Type 1 (up)</strong>: (n,j) → (n,j+1) → (n-1,j+2) → (n-1,j+1)</li>
  <li><strong>Type 2 (up-left)</strong>: (n,j) → (n-1,j+1) → (n-2,j+1) → (n-1,j)</li>
</ul>

<p><strong>Triangle moves (6-cycle):</strong> Each triangle has 6 boundary edges covered by 3 dimers. Rotate the 3 dimers to the other alternating pattern.</p>
<ul>
  <li><strong>Type 0 (up-left)</strong>: (n,j) → (n+2,j) → (n,j+2)</li>
  <li><strong>Type 1 (down-right)</strong>: (n,j) → (n+2,j) → (n+2,j-2)</li>
</ul>

<p><strong>Butterfly moves (8-cycle):</strong> Each butterfly has 8 boundary edges covered by 4 dimers. Rotate the 4 dimers to the other alternating pattern.</p>
<ul>
  <li><strong>Type 0</strong>: (1,0)-(2,0)-(3,-1)-(3,0)-(3,1)-(2,1)-(1,2)-(1,1)</li>
  <li><strong>Type 1</strong>: (0,0)-(-1,1)-(-2,2)-(-2,1)-(-3,1)-(-3,0)-(-2,0)-(-1,0)</li>
  <li><strong>Type 2</strong>: (0,0)-(1,0)-(2,0)-(1,1)-(1,2)-(0,2)-(-1,2)-(0,1)</li>
</ul>

<p><strong>Move selection:</strong> Each step picks a random vertex, then selects one of 8 move types uniformly at random: lozenge (3/8), triangle (2/8), butterfly (3/8). The move is attempted anchored at that vertex and accepted via Metropolis-Hastings when using periodic weights.</p>

<p>See <a href="https://www.sciencedirect.com/science/article/pii/0012365X9500288U">Kenyon &amp; Rémila (1996)</a> for ergodicity proofs.</p>

<p><strong>Note on topological sectors:</strong> For domains with holes or periodic boundary conditions, the configuration space splits into disjoint sectors, which Glauber cannot mix between.</p>

<h4>Acknowledgements</h4>
<p>Thanks to Alexei Borodin for discussions.</p>

<h4>References</h4>
<ul>
  <li>C. Kenyon, E. Rémila: <a href="https://www.sciencedirect.com/science/article/pii/0012365X9500288U">Perfect matchings in the triangular lattice</a>, Discrete Math. 152 (1996) — ergodicity via 4+6+8 cycles</li>
  <li>I. Hartarsky, L. Lichev, F. Toninelli: <a href="https://arxiv.org/abs/2304.10930">Local dimer dynamics in higher dimensions</a>, Ann. Inst. Henri Poincaré D (2024) — 4+6 cycles suffice for parallelograms</li>
  <li>P. Fendley, R. Moessner, S.L. Sondhi: <a href="https://arxiv.org/abs/cond-mat/0206159">Classical dimers on the triangular lattice</a>, Phys. Rev. B 66 (2002)</li>
</ul>
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
  #dimer-canvas {
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
  #dimer-canvas.panning {
    cursor: grab;
  }
  #dimer-canvas.panning:active {
    cursor: grabbing;
  }
  [data-theme="dark"] #dimer-canvas {
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
  .control-group button.primary {
    background: #4CAF50;
    color: white;
    border-color: #45a049;
  }
  .control-group button.primary:hover {
    background: #45a049;
  }
  .control-group button.danger {
    background: #f44336;
    color: white;
    border-color: #d32f2f;
  }
  .control-group button.danger:hover {
    background: #d32f2f;
  }
  .control-group button.active {
    background: #2196F3;
    color: white;
    border-color: #1976D2;
  }
  .status-bar {
    margin-top: 8px;
    padding: 8px 12px;
    background: #f9f9f9;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 12px;
    color: #666;
  }
  .status-bar.warning {
    background: #fff3cd;
    border-color: #ffc107;
    color: #856404;
  }
  .tool-btn {
    min-width: 36px;
    padding: 0 8px !important;
  }
</style>

<!-- Control Groups -->
<div class="control-group">
  <div class="control-group-title">Presets</div>
  <span class="param-group">
    <span class="param-label">Size:</span>
    <input type="number" id="preset-size" class="param-input" value="6" min="2" max="30">
  </span>
  <button id="btn-parallelogram">Parallelogram</button>
  <button id="btn-triangle-up">Triangle</button>
  <button id="btn-make-coverable">Make Coverable</button>
  <button id="btn-scale-up">Scale ×2</button>
  <button id="btn-clear" class="danger">Clear</button>
</div>

<div class="control-group">
  <div class="control-group-title">Drawing Tools</div>
  <button id="btn-pan" class="tool-btn active">Pan</button>
  <button id="btn-draw" class="tool-btn">Draw</button>
  <button id="btn-erase" class="tool-btn">Erase</button>
  <button id="btn-lasso-fill" class="tool-btn">Lasso Fill</button>
  <button id="btn-lasso-erase" class="tool-btn">Lasso Erase</button>
</div>

<div class="control-group">
  <div class="control-group-title">View</div>
  <button id="btn-zoom-in" class="tool-btn">+</button>
  <button id="btn-zoom-out" class="tool-btn">−</button>
  <button id="btn-reset-view">Reset View</button>
  <label style="margin-left: 12px;">
    <input type="checkbox" id="show-grid" checked> Grid
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="show-vertices"> Vertices
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="show-coords"> Coords
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="show-boundary" checked> Boundary
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="color-by-orientation" checked> Color by orientation
  </label>
  <label style="margin-left: 8px;">
    <input type="checkbox" id="double-dimer"> Double dimer
  </label>
  <span id="min-loop-container" style="display: none; margin-left: 8px;">
    <span style="font-size: 12px; color: #666;">Min loop:</span>
    <input type="number" id="min-loop-size" class="param-input" value="2" min="2" style="width: 50px;">
  </span>
  <span style="margin-left: 12px; display: inline-flex; align-items: center; gap: 4px;">
    <span style="font-size: 12px; color: #666;">Dimer width</span>
    <input type="range" id="edge-width-slider" min="1" max="100" value="50" style="width: 80px;">
  </span>
</div>

<div class="control-group" id="topo-stats-group" style="display: none;">
  <div class="control-group-title">Topological Stats</div>
  <div style="margin-bottom: 6px; font-size: 12px; color: #555;">
    Separation loops ⟨e<sup>2πiuL</sup>⟩ <span style="font-size: 10px; color: #999;">(sampled per frame)</span>
  </div>
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <button id="btn-set-p1" class="tool-btn" style="width:auto; padding: 0 8px;">Set A</button>
    <button id="btn-set-p2" class="tool-btn" style="width:auto; padding: 0 8px;">Set B</button>
    <span id="probe-coords" style="font-size: 11px; font-family: monospace; color: #666;">(None)</span>
  </div>
  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
    <span style="font-size: 12px;">u:</span>
    <input type="number" id="param-u" class="param-input" value="0.5" step="0.05" min="0" max="1" style="width: 50px;">
    <span style="font-size: 12px; margin-left: 8px;">Sample every:</span>
    <input type="range" id="sample-interval-slider" min="0" max="100" value="38" style="width: 80px;">
    <input type="number" id="sample-interval-input" class="param-input" value="1000" min="1" max="100000000" style="width: 70px;">
    <button id="btn-reset-stats" style="font-size: 11px; padding: 0 6px; height: 24px;">Reset</button>
  </div>
  <div id="stats-output" style="margin-top: 6px; font-family: monospace; font-size: 11px; border: 1px solid #ddd; background: white; padding: 4px; border-radius: 4px; cursor: pointer;" title="Click for debug info">
    Loops: - | L: - | Avg: - | Samples: 0
  </div>
</div>

<div class="control-group" id="fractal-dim-group" style="display: none;">
  <div class="control-group-title">Loop Fractal Dimension</div>
  <div style="margin-bottom: 6px; font-size: 12px; color: #555;">
    Click near any loop to select it. Fractal dimension D computed via box-counting at scales diameter/8 to diameter/128: fit log N(ε) vs log(1/ε). Smooth curves: D≈1, space-filling: D→2.
  </div>
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <button id="btn-select-loop" class="tool-btn" style="width:auto; padding: 0 8px;">Select Loop</button>
    <button id="btn-clear-loop" class="tool-btn" style="width:auto; padding: 0 8px;">Clear</button>
    <span id="selected-loop-coords" style="font-size: 11px; font-family: monospace; color: #666;">(Click to select)</span>
  </div>
  <div id="fractal-output" style="font-family: monospace; font-size: 11px; border: 1px solid #ddd; background: white; padding: 4px; border-radius: 4px;">
    Loop: - | Edges: - | Diameter: - | Fractal dim: -
  </div>
  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
    <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">Target Selection</div>
    <div style="font-size: 11px; color: #555; margin-bottom: 6px;">
      Choose what to measure: a loop through a probe point, or the path between two holes (forced interface).
    </div>
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 6px;">
      <label style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
        <input type="radio" name="fractal-target" id="target-probe" value="probe" checked>
        <span style="font-size: 12px;">Probe Point</span>
      </label>
      <label style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
        <input type="radio" name="fractal-target" id="target-holes" value="holes">
        <span style="font-size: 12px;">Two Holes (Forced Interface)</span>
      </label>
    </div>
    <div id="probe-controls" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
      <button id="btn-set-fractal-probe" class="tool-btn" style="width:auto; padding: 0 8px;">Set Probe Point</button>
      <span id="probe-coords" style="font-size: 11px; font-family: monospace; color: #666;">(not set)</span>
    </div>
    <div id="holes-controls" style="display: none; align-items: center; gap: 8px; margin-bottom: 6px;">
      <button id="btn-set-hole1" class="tool-btn" style="width:auto; padding: 0 8px;">Set Hole 1</button>
      <button id="btn-set-hole2" class="tool-btn" style="width:auto; padding: 0 8px;">Set Hole 2</button>
      <button id="btn-clear-holes" class="tool-btn" style="width:auto; padding: 0 8px;">Clear</button>
      <span id="hole-coords" style="font-size: 11px; font-family: monospace; color: #666;">(none)</span>
    </div>
  </div>
  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
    <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">Fractal Dimension Sampling</div>
    <div style="font-size: 11px; color: #555; margin-bottom: 6px;">
      Sample the fractal dimension of the selected target during Glauber dynamics.
    </div>
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
      <button id="btn-start-fractal-avg" class="tool-btn" style="width:auto; padding: 0 8px;" disabled>Start Sampling</button>
      <button id="btn-stop-fractal-avg" class="tool-btn" style="width:auto; padding: 0 8px; display: none;">Stop</button>
      <button id="btn-reset-fractal-avg" class="tool-btn" style="width:auto; padding: 0 8px;" disabled>Reset</button>
      <span style="font-size: 12px; margin-left: 8px;">Sample every:</span>
      <input type="range" id="fractal-sample-interval-slider" min="0" max="100" value="38" style="width: 80px;">
      <input type="number" id="fractal-sample-interval-input" class="param-input" value="1000" min="1" max="100000000" style="width: 70px;">
    </div>
    <div id="fractal-avg-output" style="font-family: monospace; font-size: 11px; border: 1px solid #ddd; background: white; padding: 4px; border-radius: 4px;">
      Target: (not set) | Avg D: - | Samples: 0 | StdDev: -
    </div>
    <canvas id="fractal-histogram" width="800" height="300" style="display: none; margin-top: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; width: 100%; max-width: 500px; height: 180px;"></canvas>
  </div>
</div>

<div class="control-group">
  <div class="control-group-title">Periodic Edge Weights</div>
  <label style="display: inline-flex; align-items: center; gap: 4px;">
    <input type="checkbox" id="use-periodic-weights">
    <span style="font-size: 12px; color: #555;">Enable</span>
  </label>
  <label style="margin-left: 8px; display: inline-flex; align-items: center; gap: 4px;">
    <input type="checkbox" id="show-edge-weights">
    <span style="font-size: 12px; color: #555;">Show weights on grid</span>
  </label>
  <span class="param-group" style="margin-left: 12px;">
    <span class="param-label">k:</span>
    <select id="periodic-k" class="param-input" style="width: 50px;">
      <option value="1">1</option>
      <option value="2" selected>2</option>
      <option value="3">3</option>
      <option value="4">4</option>
    </select>
  </span>
  <span class="param-group">
    <span class="param-label">l:</span>
    <select id="periodic-l" class="param-input" style="width: 50px;">
      <option value="1" selected>1</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
    </select>
  </span>
  <div id="weight-diagram-container" style="margin-top: 8px; display: none;">
    <div style="font-size: 11px; color: #666; margin-bottom: 4px;">
      k×l fundamental domain with 3 edge types per cell:
      <span style="color: #E57200;">━ horiz</span>,
      <span style="color: #232D4B;">╱ diag1</span>,
      <span style="color: #2E8B57;">╲ diag2</span>
    </div>
    <div id="weight-diagram" style="display: inline-block;"></div>
  </div>
</div>

<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
  <button id="btn-start" class="primary" style="height: 32px; padding: 0 16px; font-size: 14px; font-weight: 600;">Start Glauber</button>
  <button id="btn-stop" disabled style="height: 32px; padding: 0 12px;">Stop</button>
  <span style="font-size: 12px; color: #666; margin-left: 8px;">Speed:</span>
  <input type="range" id="speed-slider" min="0" max="100" value="25" style="width: 80px;">
  <input type="number" id="speed-input" class="param-input" value="100" min="1" max="100000000" style="width: 70px;">
  <span style="font-size: 11px; color: #888;">/s</span>
</div>

<canvas id="dimer-canvas"></canvas>

<div class="status-bar">
  <span id="status-text">Draw a region or use a preset to begin</span>
</div>

<!-- Load dependencies -->
<script src="/js/2025-12-08-triangular-dimers.js"></script>

<script>
(function() {
    'use strict';

    // ========================================================================
    // CONSTANTS
    // ========================================================================
    const SQRT3 = Math.sqrt(3);
    const SQRT3_2 = SQRT3 / 2;

    // 6 neighbor directions for triangular lattice
    const DIR_DN = [1, 0, -1, -1, 0, 1];
    const DIR_DJ = [0, 1, 1, 0, -1, -1];

    // ========================================================================
    // STATE
    // ========================================================================
    const activeVertices = new Map(); // key -> {n, j}
    let currentDimers = []; // Array of {n1, j1, n2, j2}
    let currentDimers2 = []; // Second configuration for double dimer model
    let boundaryEdges = []; // Array of {n1, j1, n2, j2} for boundary outline
    let isValid = false;
    let isRunning = false;
    let animationId = null;

    // View state
    let viewOffsetX = 0;
    let viewOffsetY = 0;
    let viewScale = 30; // pixels per unit
    let isPanning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Drawing state
    let currentTool = 'pan'; // 'pan', 'draw', 'erase', 'lasso-fill', 'lasso-erase'
    let lassoPoints = []; // Screen coordinates for lasso polygon

    // Speed control (steps per second)
    let stepsPerSecond = 100;
    let lastFrameTime = 0;

    // Periodic weights state
    let currentPeriodicK = 2;
    let currentPeriodicL = 1;
    let currentEdgeWeights = null; // [k][l][3] array

    // Probe vertices for topological stats
    let probeA = null; // {n, j}
    let probeB = null; // {n, j}
    let selectingProbe = null; // 'A' or 'B'

    // Stats accumulators for <e^{2πiuL}>
    let statsCount = 0;
    let sumCos = 0;
    let sumSin = 0;
    let sampleInterval = 1000;  // Sample every N Glauber steps
    let stepsSinceLastSample = 0;

    // Fractal dimension state
    let selectingLoop = false;
    let selectedLoopIndex = -1;
    let selectedLoopPoint = null; // {n, j} - clicked point

    // Forced interface (hole) state
    let settingHole = null;  // 1 or 2 when setting
    let hole1 = null;  // {n, j, idx}
    let hole2 = null;  // {n, j, idx}

    // Initialize default weights for k=2, l=1
    function initDefaultWeights(k, l) {
        const weights = [];
        for (let ni = 0; ni < k; ni++) {
            weights[ni] = [];
            for (let ji = 0; ji < l; ji++) {
                if (k === 2 && l === 1) {
                    // Default non-uniform weights
                    if (ni === 0) {
                        weights[ni][ji] = [1.0, 2.0, 0.5];  // horiz, diag1, diag2
                    } else {
                        weights[ni][ji] = [0.5, 1.0, 2.0];
                    }
                } else {
                    weights[ni][ji] = [1.0, 1.0, 1.0];  // uniform
                }
            }
        }
        return weights;
    }

    currentEdgeWeights = initDefaultWeights(2, 1);

    // ========================================================================
    // PROBE POINTS AND STATS
    // ========================================================================
    function updateProbeUI() {
        const formatCoord = (c) => Number.isInteger(c) ? c : c.toFixed(2);
        let text = '';
        if (probeA) text += `A:(${formatCoord(probeA.n)},${formatCoord(probeA.j)})`;
        if (probeA && probeB) text += ' ';
        if (probeB) text += `B:(${formatCoord(probeB.n)},${formatCoord(probeB.j)})`;
        if (!probeA && !probeB) text = '(None)';
        document.getElementById('probe-coords').textContent = text;
    }

    function resetStats() {
        statsCount = 0;
        sumCos = 0;
        sumSin = 0;
        stepsSinceLastSample = 0;
        updateStatsDisplay(-1, 0);
    }

    // Log scale conversion for sample interval (1 to 100,000,000)
    function sliderToSampleInterval(sliderVal) {
        return Math.round(Math.pow(10, sliderVal * 0.08));
    }

    function sampleIntervalToSlider(interval) {
        if (interval <= 1) return 0;
        return Math.round(Math.log10(interval) / 0.08);
    }

    function updateSampleIntervalFromSlider(sliderVal) {
        sampleInterval = sliderToSampleInterval(sliderVal);
        document.getElementById('sample-interval-slider').value = sliderVal;
        document.getElementById('sample-interval-input').value = sampleInterval;
    }

    function updateSampleIntervalFromInput(val) {
        sampleInterval = Math.max(1, Math.min(100000000, parseInt(val) || 1000));
        document.getElementById('sample-interval-input').value = sampleInterval;
        document.getElementById('sample-interval-slider').value = sampleIntervalToSlider(sampleInterval);
    }

    // Fractal sample interval uses the same log scale conversion
    function updateFractalSampleIntervalFromSlider(sliderVal) {
        fractalSampleInterval = sliderToSampleInterval(sliderVal);
        document.getElementById('fractal-sample-interval-slider').value = sliderVal;
        document.getElementById('fractal-sample-interval-input').value = fractalSampleInterval;
    }

    function updateFractalSampleIntervalFromInput(val) {
        fractalSampleInterval = Math.max(1, Math.min(100000000, parseInt(val) || 1000));
        document.getElementById('fractal-sample-interval-input').value = fractalSampleInterval;
        document.getElementById('fractal-sample-interval-slider').value = sampleIntervalToSlider(fractalSampleInterval);
    }

    function updateStatsDisplay(separationL, loopCount) {
        const statsDiv = document.getElementById('stats-output');
        if (statsCount === 0) {
            statsDiv.textContent = `Loops: ${loopCount >= 0 ? loopCount : '-'} | L: ${separationL >= 0 ? separationL : '-'} | Avg: - | n=0`;
            return;
        }

        const avgCos = sumCos / statsCount;
        const avgSin = sumSin / statsCount;
        const magnitude = Math.sqrt(avgCos * avgCos + avgSin * avgSin);
        const phase = Math.atan2(avgSin, avgCos) / (2 * Math.PI);

        const sign = avgSin >= 0 ? '+' : '-';
        statsDiv.textContent = `L=${separationL} | ⟨e^{2πiuL}⟩: ${avgCos.toFixed(4)} ${sign} ${Math.abs(avgSin).toFixed(4)}i | n=${statsCount}`;
    }

    // ========================================================================
    // FRACTAL DIMENSION FUNCTIONS
    // ========================================================================
    function updateFractalDimUI() {
        const coordsSpan = document.getElementById('selected-loop-coords');
        if (selectedLoopPoint) {
            const formatCoord = (c) => Number.isInteger(c) ? c : c.toFixed(2);
            coordsSpan.textContent = `Point: (${formatCoord(selectedLoopPoint.n)}, ${formatCoord(selectedLoopPoint.j)})`;
        } else {
            coordsSpan.textContent = '(Click to select)';
        }
    }

    function updateFractalDimDisplay() {
        const outputDiv = document.getElementById('fractal-output');
        if (selectedLoopIndex < 0) {
            if (selectedLoopPoint) {
                outputDiv.textContent = 'No loop found near clicked point (try running longer or click closer to a loop)';
            } else {
                outputDiv.textContent = 'Loop: - | Edges: - | Diameter: - | Fractal dim: -';
            }
            return;
        }

        if (!wasmReady) return;

        const infoPtr = wasmModule._getLoopInfo(selectedLoopIndex);
        if (!infoPtr) {
            outputDiv.textContent = 'Error getting loop info';
            return;
        }

        try {
            const info = JSON.parse(infoPtr);
            if (info.error) {
                outputDiv.textContent = info.error;
                return;
            }
            const dim = info.fractalDim >= 0 ? info.fractalDim.toFixed(3) : '- (loop too small)';
            outputDiv.textContent = `Loop #${info.index} | Edges: ${info.edges} | Diam: ${info.diameter.toFixed(2)} | Fractal dim: ${dim}`;
        } catch (e) {
            outputDiv.textContent = 'Error parsing loop info';
        }
    }

    function selectLoopAtPoint(n, j) {
        if (!wasmReady) return;

        selectedLoopPoint = { n, j };
        updateFractalDimUI();

        // Find the loop containing this point
        selectedLoopIndex = wasmModule._findLoopContainingPoint(n, j);
        updateFractalDimDisplay();
        draw();  // Redraw to highlight the selected loop
    }

    function clearSelectedLoop() {
        selectedLoopIndex = -1;
        selectedLoopPoint = null;
        selectingLoop = false;
        document.getElementById('btn-select-loop').classList.remove('active');
        updateFractalDimUI();
        updateFractalDimDisplay();
        draw();
    }

    // ========================================================================
    // FRACTAL DIMENSION AVERAGING
    // ========================================================================
    let fractalProbePoint = null;  // { n, j } - fixed probe point for averaging
    let fractalSampling = false;   // Whether we're actively sampling during dynamics
    let settingFractalProbe = false;  // Whether we're in "set probe" click mode
    let fractalSampleInterval = 1000; // Sample every N Glauber steps
    let stepsSinceLastFractalSample = 0;

    function updateFractalAvgUI() {
        const outputDiv = document.getElementById('fractal-avg-output');
        const startBtn = document.getElementById('btn-start-fractal-avg');
        const stopBtn = document.getElementById('btn-stop-fractal-avg');
        const resetBtn = document.getElementById('btn-reset-fractal-avg');
        const setProbeBtn = document.getElementById('btn-set-fractal-probe');

        // Work with either probe point OR holes
        const hasProbe = fractalProbePoint !== null;
        const hasHoles = hole1 !== null && hole2 !== null;

        if (!hasProbe && !hasHoles) {
            outputDiv.textContent = 'Target: (not set) | Avg D: - | Samples: 0 | StdDev: -';
            startBtn.disabled = true;
            resetBtn.disabled = true;
            return;
        }

        // Simplified target display - details are in Target Selection pane
        const targetStr = hasHoles ? 'Target: Hole Path' : 'Target: Probe';

        if (!wasmReady) {
            outputDiv.textContent = targetStr + ' | Avg D: - | Samples: 0 | StdDev: -';
            return;
        }

        // Get current average from WASM
        try {
            const avgData = JSON.parse(wasmModule._getFractalAverage());
            const avgStr = avgData.average >= 0 ? avgData.average.toFixed(4) : '-';
            const stdStr = avgData.count > 1 ? avgData.stddev.toFixed(4) : '-';
            outputDiv.textContent = `${targetStr} | Avg D: ${avgStr} | Samples: ${avgData.count} | StdDev: ${stdStr}`;
            startBtn.disabled = false;
            resetBtn.disabled = avgData.count === 0;
        } catch (e) {
            outputDiv.textContent = targetStr + ' | Error reading average';
        }

        // Update button visibility
        if (fractalSampling) {
            startBtn.style.display = 'none';
            stopBtn.style.display = '';
            setProbeBtn.disabled = true;
        } else {
            startBtn.style.display = '';
            stopBtn.style.display = 'none';
            setProbeBtn.disabled = false;
        }

        // Update histogram
        drawFractalHistogram();
    }

    function setFractalProbePoint(n, j) {
        fractalProbePoint = { n, j };
        settingFractalProbe = false;
        document.getElementById('btn-set-fractal-probe').classList.remove('active');

        // Update probe coords display
        const formatCoord = (c) => Number.isInteger(c) ? c : c.toFixed(2);
        document.getElementById('probe-coords').textContent = `(${formatCoord(n)}, ${formatCoord(j)})`;

        // Ensure probe radio is selected
        document.getElementById('target-probe').checked = true;
        document.getElementById('probe-controls').style.display = 'flex';
        document.getElementById('holes-controls').style.display = 'none';

        // Clear holes when setting probe point (orthogonal modes)
        if (hole1 || hole2) {
            hole1 = null;
            hole2 = null;
            settingHole = null;
            updateHoleUI();
            if (wasmReady) {
                wasmModule._clearHolesInConfig2();
            }
        }

        if (wasmReady) {
            wasmModule._startFractalAveraging(n, j);
        }
        updateFractalAvgUI();
        draw();
    }

    function startFractalSampling() {
        // Allow starting with either probe OR holes
        const hasProbe = fractalProbePoint !== null;
        const hasHoles = hole1 !== null && hole2 !== null;
        if ((!hasProbe && !hasHoles) || !wasmReady) return;
        fractalSampling = true;
        updateFractalAvgUI();
    }

    function stopFractalSampling() {
        fractalSampling = false;
        updateFractalAvgUI();
    }

    function resetFractalSampling() {
        // Allow reset with either probe OR holes
        const hasProbe = fractalProbePoint !== null;
        const hasHoles = hole1 !== null && hole2 !== null;
        if (wasmReady && (hasProbe || hasHoles)) {
            wasmModule._resetFractalSamples();
        }
        updateFractalAvgUI();
        drawFractalHistogram();
    }

    // Draw histogram of fractal dimension samples
    function drawFractalHistogram() {
        const canvas = document.getElementById('fractal-histogram');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        // Use the full canvas resolution
        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);

        // Work with either probe point OR holes
        const hasProbe = fractalProbePoint !== null;
        const hasHoles = hole1 !== null && hole2 !== null;
        if (!wasmReady || (!hasProbe && !hasHoles)) {
            canvas.style.display = 'none';
            return;
        }

        // Get samples
        let samples;
        try {
            samples = JSON.parse(wasmModule._getFractalSamples());
        } catch (e) {
            canvas.style.display = 'none';
            return;
        }

        if (!samples || samples.length < 2) {
            canvas.style.display = 'none';
            return;
        }

        // Show the canvas
        canvas.style.display = 'block';

        // Compute histogram
        const numBins = 25;
        const minVal = Math.min(...samples);
        const maxVal = Math.max(...samples);
        const range = maxVal - minVal || 0.1;
        const binSize = range / numBins;

        const bins = new Array(numBins).fill(0);
        for (const s of samples) {
            const binIdx = Math.min(numBins - 1, Math.floor((s - minVal) / binSize));
            bins[binIdx]++;
        }

        const maxCount = Math.max(...bins);

        // Compute stats
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
        const stddev = Math.sqrt(variance);

        // Draw histogram with generous padding
        const padding = { left: 60, right: 20, top: 40, bottom: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const barWidth = chartWidth / numBins;

        // Background
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

        // Grid lines
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            const y = padding.top + chartHeight * (1 - i / 4);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
        }

        // Bars with gradient
        for (let i = 0; i < numBins; i++) {
            const barHeight = maxCount > 0 ? (bins[i] / maxCount) * chartHeight : 0;
            if (barHeight > 0) {
                const x = padding.left + i * barWidth + 2;
                const y = padding.top + chartHeight - barHeight;
                const w = barWidth - 4;

                // Bar fill
                ctx.fillStyle = '#2196F3';
                ctx.fillRect(x, y, w, barHeight);

                // Bar border
                ctx.strokeStyle = '#1565C0';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, w, barHeight);
            }
        }

        // Mean line
        const meanX = padding.left + ((mean - minVal) / range) * chartWidth;
        ctx.strokeStyle = '#e53935';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(meanX, padding.top);
        ctx.lineTo(meanX, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();

        // X-axis labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(minVal.toFixed(2), padding.left, height - 15);
        ctx.fillText(maxVal.toFixed(2), padding.left + chartWidth, height - 15);

        // X-axis title
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('Fractal Dimension D', padding.left + chartWidth / 2, height - 10);

        // Y-axis labels
        ctx.font = '16px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(maxCount.toString(), padding.left - 8, padding.top + 6);
        ctx.fillText('0', padding.left - 8, padding.top + chartHeight + 5);

        // Y-axis title
        ctx.save();
        ctx.translate(18, padding.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Count', 0, 0);
        ctx.restore();

        // Stats box
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(padding.left + 10, padding.top + 5, 200, 28);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(padding.left + 10, padding.top + 5, 200, 28);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`n=${samples.length}`, padding.left + 15, padding.top + 24);

        ctx.fillStyle = '#e53935';
        ctx.fillText(`μ=${mean.toFixed(3)}`, padding.left + 85, padding.top + 24);

        ctx.fillStyle = '#666';
        ctx.fillText(`σ=${stddev.toFixed(3)}`, padding.left + 160, padding.top + 24);
    }

    // ========================================================================
    // FORCED INTERFACE (TWO HOLES)
    // ========================================================================
    function updateHoleUI() {
        const formatCoord = (c) => Number.isInteger(c) ? c : c.toFixed(2);
        let text = '';
        if (hole1) text += `H1:(${formatCoord(hole1.n)},${formatCoord(hole1.j)})`;
        if (hole1 && hole2) text += ' ';
        if (hole2) text += `H2:(${formatCoord(hole2.n)},${formatCoord(hole2.j)})`;
        if (!hole1 && !hole2) text = '(none)';
        document.getElementById('hole-coords').textContent = text;

        // Update button states
        document.getElementById('btn-set-hole1').classList.toggle('active', settingHole === 1);
        document.getElementById('btn-set-hole2').classList.toggle('active', settingHole === 2);
    }

    function setHole(holeNum, n, j) {
        // Get vertex index from WASM if available
        const idx = -1;  // We'll let C++ handle the index lookup

        if (holeNum === 1) {
            hole1 = { n, j, idx };
        } else {
            hole2 = { n, j, idx };
        }

        settingHole = null;
        updateHoleUI();

        // Ensure holes radio is selected
        document.getElementById('target-holes').checked = true;
        document.getElementById('probe-controls').style.display = 'none';
        document.getElementById('holes-controls').style.display = 'flex';

        // Clear probe point when setting holes (orthogonal modes)
        if (fractalProbePoint) {
            fractalProbePoint = null;
            settingFractalProbe = false;
            document.getElementById('btn-set-fractal-probe').classList.remove('active');
            document.getElementById('probe-coords').textContent = '(not set)';
        }

        // Reset fractal samples when both holes are set (new target)
        if (hole1 && hole2 && wasmReady) {
            wasmModule._resetFractalSamples();
        }

        // Apply holes to WASM if both are set
        applyHolesToWasm();
        updateFractalAvgUI();
        draw();
    }

    function applyHolesToWasm() {
        if (!wasmReady) return;

        if (hole1 && hole2) {
            wasmModule._setHolesInConfig2(hole1.n, hole1.j, hole2.n, hole2.j);
        } else {
            wasmModule._clearHolesInConfig2();
        }
    }

    function clearHoles() {
        hole1 = null;
        hole2 = null;
        settingHole = null;
        updateHoleUI();

        if (wasmReady) {
            wasmModule._clearHolesInConfig2();
            wasmModule._resetFractalSamples();
        }
        updateFractalAvgUI();
        draw();
    }

    // Called periodically during Glauber dynamics to sample fractal dimension
    function maybeSampleFractalDim(stepsSinceLastSample) {
        if (!fractalSampling || !wasmReady) return 0;
        // Need either a probe point OR both holes set
        const hasProbe = fractalProbePoint !== null;
        const hasHoles = hole1 !== null && hole2 !== null;
        if (!hasProbe && !hasHoles) return 0;
        if (stepsSinceLastSample < fractalSampleInterval) return stepsSinceLastSample;

        // Sample the fractal dimension - use hole path if holes are set, otherwise use probe
        if (hasHoles) {
            wasmModule._sampleHolePathFractalDimension();
        } else {
            wasmModule._sampleFractalDimension();
        }
        updateFractalAvgUI();
        return 0;  // Reset counter
    }

    // ========================================================================
    // CANVAS SETUP
    // ========================================================================
    const canvas = document.getElementById('dimer-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    }

    // ========================================================================
    // COORDINATE TRANSFORMATIONS
    // ========================================================================
    function latticeToScreen(n, j) {
        const x = n + 0.5 * j;
        const y = j * SQRT3_2;
        return {
            x: canvas.width / (2 * (window.devicePixelRatio || 1)) + (x - viewOffsetX) * viewScale,
            y: canvas.height / (2 * (window.devicePixelRatio || 1)) + (viewOffsetY - y) * viewScale
        };
    }

    function screenToLattice(sx, sy) {
        const rect = canvas.getBoundingClientRect();
        const x = (sx - rect.width / 2) / viewScale + viewOffsetX;
        const y = viewOffsetY - (sy - rect.height / 2) / viewScale;
        const j = y / SQRT3_2;
        const n = x - 0.5 * j;
        return { n: Math.round(n), j: Math.round(j) };
    }

    // Return floating-point lattice coordinates (for finding nearest edge)
    function screenToLatticeFloat(sx, sy) {
        const rect = canvas.getBoundingClientRect();
        const x = (sx - rect.width / 2) / viewScale + viewOffsetX;
        const y = viewOffsetY - (sy - rect.height / 2) / viewScale;
        const j = y / SQRT3_2;
        const n = x - 0.5 * j;
        return { n, j };
    }

    // Find the nearest triangle center to a screen position
    // Triangle centers are at (n + 1/3, j + 1/3) for up-triangles
    // and (n + 2/3, j + 2/3) for down-triangles
    function screenToTriangleCenter(sx, sy) {
        const rect = canvas.getBoundingClientRect();
        const x = (sx - rect.width / 2) / viewScale + viewOffsetX;
        const y = viewOffsetY - (sy - rect.height / 2) / viewScale;
        const jFloat = y / SQRT3_2;
        const nFloat = x - 0.5 * jFloat;

        // Find nearest Type A center (n + 1/3, j + 1/3)
        const nA = Math.round(nFloat - 1/3);
        const jA = Math.round(jFloat - 1/3);
        const centerA = { n: nA + 1/3, j: jA + 1/3 };

        // Find nearest Type B center (n + 2/3, j + 2/3)
        const nB = Math.round(nFloat - 2/3);
        const jB = Math.round(jFloat - 2/3);
        const centerB = { n: nB + 2/3, j: jB + 2/3 };

        // Convert to screen coords and compare distances
        const distA = Math.hypot(nFloat - centerA.n, jFloat - centerA.j);
        const distB = Math.hypot(nFloat - centerB.n, jFloat - centerB.j);

        return distA < distB ? centerA : centerB;
    }

    function vertexKey(n, j) {
        return `${n},${j}`;
    }

    // ========================================================================
    // BOUNDARY COMPUTATION & HOLE DETECTION
    // ========================================================================
    let hasHoles = false;  // Track if domain has topological holes

    function computeBoundary() {
        boundaryEdges = [];
        hasHoles = false;
        if (activeVertices.size === 0) return;

        // For each vertex, check all 6 edges
        // An edge is on the boundary if exactly one endpoint is in the region
        for (const [key, v] of activeVertices) {
            for (let d = 0; d < 6; d++) {
                const nn = v.n + DIR_DN[d];
                const nj = v.j + DIR_DJ[d];
                const neighborKey = vertexKey(nn, nj);

                // If neighbor is NOT in region, this edge is on boundary
                if (!activeVertices.has(neighborKey)) {
                    boundaryEdges.push({
                        n1: v.n, j1: v.j,
                        n2: nn, j2: nj
                    });
                }
            }
        }

        // Detect holes by counting boundary connected components
        // More than 1 component means there are holes
        hasHoles = detectHoles();
    }

    // Detect holes by counting connected components of the boundary
    // Uses the inside vertices (n1,j1) of boundary edges
    function detectHoles() {
        if (boundaryEdges.length === 0) return false;

        // Build adjacency for boundary traversal
        // Two boundary edges are connected if they share a vertex
        const edgeMap = new Map();  // vertex key -> list of boundary edges using it

        for (let i = 0; i < boundaryEdges.length; i++) {
            const e = boundaryEdges[i];
            // Use the vertex inside the region (n1, j1)
            const k1 = vertexKey(e.n1, e.j1);
            if (!edgeMap.has(k1)) edgeMap.set(k1, []);
            edgeMap.get(k1).push(i);
        }

        // Count connected components using BFS on boundary edges
        const visited = new Set();
        let components = 0;

        for (let startIdx = 0; startIdx < boundaryEdges.length; startIdx++) {
            if (visited.has(startIdx)) continue;

            components++;
            const queue = [startIdx];
            visited.add(startIdx);

            while (queue.length > 0) {
                const idx = queue.shift();
                const e = boundaryEdges[idx];

                // Find adjacent boundary edges (share a vertex)
                const k1 = vertexKey(e.n1, e.j1);
                const neighbors = edgeMap.get(k1) || [];

                for (const nIdx of neighbors) {
                    if (!visited.has(nIdx)) {
                        visited.add(nIdx);
                        queue.push(nIdx);
                    }
                }

                // Also check neighbors of the inside vertex in other directions
                for (let d = 0; d < 6; d++) {
                    const nn = e.n1 + DIR_DN[d];
                    const nj = e.j1 + DIR_DJ[d];
                    const nk = vertexKey(nn, nj);
                    if (activeVertices.has(nk)) {
                        const adjEdges = edgeMap.get(nk) || [];
                        for (const nIdx of adjEdges) {
                            if (!visited.has(nIdx)) {
                                visited.add(nIdx);
                                queue.push(nIdx);
                            }
                        }
                    }
                }
            }
        }

        // More than 1 component means holes exist
        return components > 1;
    }

    // ========================================================================
    // DRAWING
    // ========================================================================
    function draw() {
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        // Clear
        ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // Draw grid if enabled
        if (document.getElementById('show-grid').checked) {
            drawGrid();
        }

        // Draw boundary if enabled
        if (document.getElementById('show-boundary').checked) {
            drawBoundary();
        }

        // Draw dimers
        drawDimers();

        // Draw vertices if enabled
        if (document.getElementById('show-vertices').checked) {
            drawVertices();
        }

        // Draw coordinates if enabled
        if (document.getElementById('show-coords').checked) {
            drawCoords();
        }

        // Draw lasso polygon if in progress
        if (lassoPoints.length > 0) {
            drawLasso();
        }

        // Draw edge weights if enabled
        if (document.getElementById('show-edge-weights').checked) {
            drawEdgeWeights();
        }

        // Draw hole path if holes are set
        drawHolePath();

        // Draw probe points if set
        drawProbePoints();
    }

    function drawHolePath() {
        if (!hole1 || !hole2 || !wasmReady) return;

        const pathStr = wasmModule._getHolePath();
        if (!pathStr || pathStr.length === 0) return;

        const edges = pathStr.split(';');

        // Use same width scaling as dimers
        const widthSlider = parseInt(document.getElementById('edge-width-slider').value) || 50;
        const widthMultiplier = Math.pow(10, (widthSlider - 50) / 30);
        const dimerWidth = Math.max(0.2, Math.min(20, viewScale * 0.15 * widthMultiplier));

        ctx.strokeStyle = '#FFD700';  // Gold
        ctx.lineWidth = dimerWidth * 2;  // 2x dimer width
        ctx.lineCap = 'round';

        for (const edge of edges) {
            const coords = edge.split(',').map(Number);
            if (coords.length === 4) {
                const p1 = latticeToScreen(coords[0], coords[1]);
                const p2 = latticeToScreen(coords[2], coords[3]);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }

    function drawProbePoints() {
        const probeRadius = Math.max(6, Math.min(12, viewScale * 0.3));
        const fontSize = Math.max(10, Math.min(16, viewScale * 0.4));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const drawProbe = (probe, label) => {
            if (!probe) return;
            const p = latticeToScreen(probe.n, probe.j);

            // Draw black circle with white border
            ctx.beginPath();
            ctx.arc(p.x, p.y, probeRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label text above
            ctx.fillStyle = '#000000';
            ctx.fillText(label, p.x, p.y - probeRadius - 2);
        };

        drawProbe(probeA, 'A');
        drawProbe(probeB, 'B');

        // Draw selected loop point marker
        if (selectedLoopPoint) {
            const p = latticeToScreen(selectedLoopPoint.n, selectedLoopPoint.j);
            // Draw green marker for selected loop point
            ctx.beginPath();
            ctx.arc(p.x, p.y, probeRadius * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = '#00FF00';
            ctx.fill();
            ctx.strokeStyle = '#006600';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Draw label
            ctx.fillStyle = '#006600';
            ctx.fillText('L', p.x, p.y - probeRadius * 1.2 - 2);
        }

        // Draw fractal averaging probe point marker
        if (fractalProbePoint) {
            const p = latticeToScreen(fractalProbePoint.n, fractalProbePoint.j);
            // Draw magenta/purple marker for fractal probe
            ctx.beginPath();
            ctx.arc(p.x, p.y, probeRadius * 1.3, 0, Math.PI * 2);
            ctx.fillStyle = '#FF00FF';
            ctx.fill();
            ctx.strokeStyle = '#800080';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Draw label
            ctx.fillStyle = '#800080';
            ctx.fillText('F', p.x, p.y - probeRadius * 1.3 - 2);
        }

        // Draw hole markers for forced interface
        if (hole1) {
            const p = latticeToScreen(hole1.n, hole1.j);
            // Draw red X marker for hole 1
            ctx.strokeStyle = '#DC143C';
            ctx.lineWidth = 3;
            const sz = probeRadius * 1.5;
            ctx.beginPath();
            ctx.moveTo(p.x - sz, p.y - sz);
            ctx.lineTo(p.x + sz, p.y + sz);
            ctx.moveTo(p.x + sz, p.y - sz);
            ctx.lineTo(p.x - sz, p.y + sz);
            ctx.stroke();
            // Draw label
            ctx.fillStyle = '#DC143C';
            ctx.fillText('H1', p.x + sz + 3, p.y);
        }

        if (hole2) {
            const p = latticeToScreen(hole2.n, hole2.j);
            // Draw red X marker for hole 2
            ctx.strokeStyle = '#DC143C';
            ctx.lineWidth = 3;
            const sz = probeRadius * 1.5;
            ctx.beginPath();
            ctx.moveTo(p.x - sz, p.y - sz);
            ctx.lineTo(p.x + sz, p.y + sz);
            ctx.moveTo(p.x + sz, p.y - sz);
            ctx.lineTo(p.x - sz, p.y + sz);
            ctx.stroke();
            // Draw label
            ctx.fillStyle = '#DC143C';
            ctx.fillText('H2', p.x + sz + 3, p.y);
        }
    }

    function drawGrid() {
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const margin = 2;
        const topLeft = screenToLattice(0, 0);
        const bottomRight = screenToLattice(w, h);

        const minJ = Math.floor(Math.min(topLeft.j, bottomRight.j)) - margin;
        const maxJ = Math.ceil(Math.max(topLeft.j, bottomRight.j)) + margin;
        const minN = Math.floor(Math.min(topLeft.n, bottomRight.n)) - margin;
        const maxN = Math.ceil(Math.max(topLeft.n, bottomRight.n)) + margin;

        ctx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#333' : '#e0e0e0';
        ctx.lineWidth = 0.5;

        for (let j = minJ; j <= maxJ; j++) {
            for (let n = minN; n <= maxN; n++) {
                const p = latticeToScreen(n, j);
                const neighbors = [
                    { dn: 1, dj: 0 },
                    { dn: 0, dj: 1 },
                    { dn: -1, dj: 1 }
                ];
                for (const nb of neighbors) {
                    const p2 = latticeToScreen(n + nb.dn, j + nb.dj);
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
    }

    function drawBoundary() {
        if (boundaryEdges.length === 0) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.strokeStyle = isDark ? '#ff6b6b' : '#d32f2f';
        // Scale boundary width with zoom
        ctx.lineWidth = Math.max(1, Math.min(6, viewScale * 0.1));
        ctx.lineCap = 'round';

        for (const edge of boundaryEdges) {
            const p1 = latticeToScreen(edge.n1, edge.j1);
            const p2 = latticeToScreen(edge.n2, edge.j2);
            // Draw at midpoint towards outside (half edge)
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(midX, midY);
            ctx.stroke();
        }
    }

    function drawVertices() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        // Scale vertex size with zoom - smaller when zoomed out
        const vertexRadius = Math.max(1, Math.min(6, viewScale * 0.12));

        // Skip drawing if too zoomed out (vertices would be too small anyway)
        if (vertexRadius < 1.5) return;

        for (const [key, v] of activeVertices) {
            const p = latticeToScreen(v.n, v.j);
            ctx.beginPath();
            ctx.arc(p.x, p.y, vertexRadius, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? '#888' : '#666';
            ctx.fill();
        }
    }

    function drawCoords() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        // Only draw if zoomed in enough
        if (viewScale < 15) return;

        const fontSize = Math.max(8, Math.min(14, viewScale * 0.35));
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = isDark ? '#aaa' : '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw coords for all visible grid points, not just active vertices
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const margin = 2;
        const topLeft = screenToLattice(0, 0);
        const bottomRight = screenToLattice(w, h);

        const minJ = Math.floor(Math.min(topLeft.j, bottomRight.j)) - margin;
        const maxJ = Math.ceil(Math.max(topLeft.j, bottomRight.j)) + margin;
        const minN = Math.floor(Math.min(topLeft.n, bottomRight.n)) - margin;
        const maxN = Math.ceil(Math.max(topLeft.n, bottomRight.n)) + margin;

        for (let j = minJ; j <= maxJ; j++) {
            for (let n = minN; n <= maxN; n++) {
                const p = latticeToScreen(n, j);
                ctx.fillText(`${n},${j}`, p.x, p.y - fontSize * 0.8);
            }
        }
    }

    // 3 colors for 3 edge orientations (like lozenge types)
    const DIMER_COLORS = ['#E57200', '#232D4B', '#2E8B57']; // Orange, Navy, Green

    // Compute edge weight using midpoint-based periodicity (matches C++ code)
    function getEdgeWeight(n1, j1, n2, j2) {
        // If periodic weights not enabled, return 1
        if (!document.getElementById('use-periodic-weights').checked) {
            return 1;
        }

        const k = currentPeriodicK;
        const l = currentPeriodicL;

        const dn = n2 - n1;
        const dj = j2 - j1;
        let edgeType;
        if (dj === 0) edgeType = 0;       // horizontal
        else if (dn === 0) edgeType = 1;  // diag1
        else edgeType = 2;                 // diag2

        // Use edge midpoint (doubled to avoid fractions)
        const midN2 = n1 + n2;
        const midJ2 = j1 + j2;

        // Positive modulo with doubled period
        let ni = ((midN2 % (2 * k)) + (2 * k)) % (2 * k);
        let ji = ((midJ2 % (2 * l)) + (2 * l)) % (2 * l);

        // Map back to [0, k) x [0, l)
        ni = Math.floor(ni / 2);
        ji = Math.floor(ji / 2);

        return currentEdgeWeights[ni]?.[ji]?.[edgeType] ?? 1;
    }

    function drawEdgeWeights() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (viewScale < 20) return; // Too zoomed out

        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const margin = 2;
        const topLeft = screenToLattice(0, 0);
        const bottomRight = screenToLattice(w, h);

        const minJ = Math.floor(Math.min(topLeft.j, bottomRight.j)) - margin;
        const maxJ = Math.ceil(Math.max(topLeft.j, bottomRight.j)) + margin;
        const minN = Math.floor(Math.min(topLeft.n, bottomRight.n)) - margin;
        const maxN = Math.ceil(Math.max(topLeft.n, bottomRight.n)) + margin;

        const fontSize = Math.max(8, Math.min(11, viewScale * 0.25));
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw weights for all 3 edge types from each vertex
        for (let j = minJ; j <= maxJ; j++) {
            for (let n = minN; n <= maxN; n++) {
                const p = latticeToScreen(n, j);

                // Edge type 0: horizontal (n,j) -> (n+1,j)
                const p_h = latticeToScreen(n + 1, j);
                const midX_h = (p.x + p_h.x) / 2;
                const midY_h = (p.y + p_h.y) / 2;
                const w0 = getEdgeWeight(n, j, n + 1, j);
                ctx.fillStyle = DIMER_COLORS[0];
                ctx.fillText(w0.toFixed(1), midX_h, midY_h + fontSize * 0.7);

                // Edge type 1: diag1 (n,j) -> (n,j+1)
                const p_d1 = latticeToScreen(n, j + 1);
                const midX_d1 = (p.x + p_d1.x) / 2;
                const midY_d1 = (p.y + p_d1.y) / 2;
                const w1 = getEdgeWeight(n, j, n, j + 1);
                ctx.fillStyle = DIMER_COLORS[1];
                ctx.fillText(w1.toFixed(1), midX_d1 + fontSize * 0.8, midY_d1);

                // Edge type 2: diag2 (n,j) -> (n-1,j+1)
                const p_d2 = latticeToScreen(n - 1, j + 1);
                const midX_d2 = (p.x + p_d2.x) / 2;
                const midY_d2 = (p.y + p_d2.y) / 2;
                const w2 = getEdgeWeight(n, j, n - 1, j + 1);
                ctx.fillStyle = DIMER_COLORS[2];
                ctx.fillText(w2.toFixed(1), midX_d2 - fontSize * 0.8, midY_d2);
            }
        }
    }

    function getEdgeOrientation(dn, dj) {
        // 3 edge orientations in triangular lattice:
        // Type 0: horizontal (dn=±1, dj=0)
        // Type 1: upper-right diagonal (dn=0, dj=±1)
        // Type 2: upper-left diagonal (dn=∓1, dj=±1)
        if (dj === 0) return 0;  // horizontal
        if (dn === 0) return 1;  // vertical-ish
        return 2;                 // diagonal
    }

    function drawDimers() {
        if (currentDimers.length === 0) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const colorByOrientation = document.getElementById('color-by-orientation').checked;
        const doubleDimerEnabled = document.getElementById('double-dimer').checked;
        const defaultColor = isDark ? '#ffffff' : '#000000';

        // Width slider: 1-100 with exponential scaling for more extreme ends
        const widthSlider = parseInt(document.getElementById('edge-width-slider').value) || 50;
        // Exponential: 1->0.02, 50->1, 100->5
        const widthMultiplier = Math.pow(10, (widthSlider - 50) / 30);

        // Scale dimer width with zoom and slider
        ctx.lineWidth = Math.max(0.2, Math.min(20, viewScale * 0.15 * widthMultiplier));
        ctx.lineCap = 'round';

        // Double dimer colors (blue and red)
        const dimer1Color = '#0066CC';
        const dimer2Color = '#CC3300';

        // Get loop filter if double dimer is enabled
        let filteredIndices0 = null;
        let filteredIndices1 = null;
        let separatingIndices0 = null;
        let separatingIndices1 = null;
        if (doubleDimerEnabled && wasmReady) {
            const minLoop = parseInt(document.getElementById('min-loop-size').value) || 2;
            const filterResult = wasmModule._filterLoopsBySize(minLoop);
            if (filterResult) {
                try {
                    const parsed = JSON.parse(filterResult);
                    filteredIndices0 = new Set(parsed.indices0);
                    filteredIndices1 = new Set(parsed.indices1);
                } catch (e) {
                    // Ignore parse errors
                }
            }
            // Get separating loop edges when paused and both probes set
            if (animationId === null && probeA && probeB) {
                const sepResult = wasmModule._getSeparatingLoopEdges();
                if (sepResult) {
                    try {
                        const parsed = JSON.parse(sepResult);
                        separatingIndices0 = new Set(parsed.indices0);
                        separatingIndices1 = new Set(parsed.indices1);
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        }

        // Get selected loop edges for highlighting
        let selectedLoopIndices0 = null;
        let selectedLoopIndices1 = null;
        if (doubleDimerEnabled && wasmReady && selectedLoopIndex >= 0) {
            const loopResult = wasmModule._getLoopEdgeIndices(selectedLoopIndex);
            if (loopResult) {
                try {
                    const parsed = JSON.parse(loopResult);
                    selectedLoopIndices0 = new Set(parsed.indices0);
                    selectedLoopIndices1 = new Set(parsed.indices1);
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        const separatingColor = '#FFD700';  // Gold for separating loops
        const selectedLoopColor = '#00FF00';  // Bright green for selected loop
        const defaultLineWidth = ctx.lineWidth;

        for (let i = 0; i < currentDimers.length; i++) {
            // Skip if filtering and this edge is not in the filtered set
            if (filteredIndices0 && !filteredIndices0.has(i)) continue;

            const d = currentDimers[i];
            const p1 = latticeToScreen(d.n1, d.j1);
            const p2 = latticeToScreen(d.n2, d.j2);

            const isSeparating = separatingIndices0 && separatingIndices0.has(i);
            const isSelectedLoop = selectedLoopIndices0 && selectedLoopIndices0.has(i);
            if (isSelectedLoop) {
                ctx.strokeStyle = selectedLoopColor;
                ctx.lineWidth = defaultLineWidth * 2.5;
            } else if (isSeparating) {
                ctx.strokeStyle = separatingColor;
                ctx.lineWidth = defaultLineWidth * 2;
            } else if (doubleDimerEnabled) {
                ctx.strokeStyle = dimer1Color;
                ctx.lineWidth = defaultLineWidth;
            } else if (colorByOrientation) {
                const dn = d.n2 - d.n1;
                const dj = d.j2 - d.j1;
                const orientation = getEdgeOrientation(dn, dj);
                ctx.strokeStyle = DIMER_COLORS[orientation];
                ctx.lineWidth = defaultLineWidth;
            } else {
                ctx.strokeStyle = defaultColor;
                ctx.lineWidth = defaultLineWidth;
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        // Draw second configuration if double dimer is enabled
        if (doubleDimerEnabled && currentDimers2.length > 0) {
            for (let i = 0; i < currentDimers2.length; i++) {
                // Skip if filtering and this edge is not in the filtered set
                if (filteredIndices1 && !filteredIndices1.has(i)) continue;

                const d = currentDimers2[i];
                const p1 = latticeToScreen(d.n1, d.j1);
                const p2 = latticeToScreen(d.n2, d.j2);

                const isSeparating = separatingIndices1 && separatingIndices1.has(i);
                const isSelectedLoop = selectedLoopIndices1 && selectedLoopIndices1.has(i);
                if (isSelectedLoop) {
                    ctx.strokeStyle = selectedLoopColor;
                    ctx.lineWidth = defaultLineWidth * 2.5;
                } else if (isSeparating) {
                    ctx.strokeStyle = separatingColor;
                    ctx.lineWidth = defaultLineWidth * 2;
                } else {
                    ctx.strokeStyle = dimer2Color;
                    ctx.lineWidth = defaultLineWidth;
                }

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
        ctx.lineWidth = defaultLineWidth;
    }

    function drawLasso() {
        if (lassoPoints.length < 1) return;

        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
        for (let i = 1; i < lassoPoints.length; i++) {
            ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
        }
        ctx.stroke();

        ctx.setLineDash([]);

        // Draw points
        ctx.fillStyle = '#2196F3';
        for (const p of lassoPoints) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ========================================================================
    // LASSO TOOL
    // ========================================================================
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

    function applyLasso(isFill) {
        if (lassoPoints.length < 3) {
            lassoPoints = [];
            draw();
            return;
        }

        // Find bounding box in lattice coords
        const rect = canvas.getBoundingClientRect();
        let minN = Infinity, maxN = -Infinity;
        let minJ = Infinity, maxJ = -Infinity;

        for (const p of lassoPoints) {
            const lp = screenToLattice(p.x, p.y);
            minN = Math.min(minN, lp.n);
            maxN = Math.max(maxN, lp.n);
            minJ = Math.min(minJ, lp.j);
            maxJ = Math.max(maxJ, lp.j);
        }

        // Expand a bit
        minN -= 2; maxN += 2;
        minJ -= 2; maxJ += 2;

        // Check all lattice points in bounding box
        for (let n = minN; n <= maxN; n++) {
            for (let j = minJ; j <= maxJ; j++) {
                const screenPos = latticeToScreen(n, j);
                if (pointInPolygon(screenPos.x, screenPos.y, lassoPoints)) {
                    const key = vertexKey(n, j);
                    if (isFill) {
                        if (!activeVertices.has(key)) {
                            activeVertices.set(key, { n, j });
                        }
                    } else {
                        activeVertices.delete(key);
                    }
                }
            }
        }

        lassoPoints = [];
        reinitialize();
    }

    // ========================================================================
    // MAKE COVERABLE
    // ========================================================================
    function makeCoverable() {
        if (activeVertices.size === 0) return;

        // If odd number of vertices, we need to add one
        // Strategy: find an unmatched vertex and add a neighbor
        // For now, simple approach: if odd, add a neighbor to any boundary vertex

        if (activeVertices.size % 2 === 1) {
            // Find a vertex on the boundary (has a neighbor not in region)
            for (const [key, v] of activeVertices) {
                for (let d = 0; d < 6; d++) {
                    const nn = v.n + DIR_DN[d];
                    const nj = v.j + DIR_DJ[d];
                    const neighborKey = vertexKey(nn, nj);
                    if (!activeVertices.has(neighborKey)) {
                        activeVertices.set(neighborKey, { n: nn, j: nj });
                        reinitialize();
                        return;
                    }
                }
            }
        }

        // Even number but no matching exists - try to expand
        // Keep adding boundary vertices until matching exists
        let attempts = 0;
        const maxAttempts = 100;

        while (!isValid && attempts < maxAttempts) {
            attempts++;
            // Find vertices that couldn't be matched (degree 0 or isolated)
            // Simple heuristic: add all neighbors of boundary vertices
            const toAdd = [];
            for (const [key, v] of activeVertices) {
                for (let d = 0; d < 6; d++) {
                    const nn = v.n + DIR_DN[d];
                    const nj = v.j + DIR_DJ[d];
                    const neighborKey = vertexKey(nn, nj);
                    if (!activeVertices.has(neighborKey)) {
                        toAdd.push({ n: nn, j: nj, key: neighborKey });
                    }
                }
            }

            if (toAdd.length === 0) break;

            // Add one vertex at a time
            const v = toAdd[0];
            activeVertices.set(v.key, { n: v.n, j: v.j });

            // Try to initialize
            reinitialize();
        }

        updateStatus(isValid ?
            `Made coverable with ${activeVertices.size} vertices` :
            `Could not make coverable after ${attempts} attempts`);
    }

    // ========================================================================
    // SCALE UP
    // ========================================================================
    function scaleUp() {
        if (activeVertices.size === 0) return;

        // Collect current vertices
        const currentVerts = Array.from(activeVertices.values());

        // Clear and rebuild at 2x scale
        activeVertices.clear();

        // For each original vertex (n, j), add vertices at:
        // (2n, 2j), (2n+1, 2j), (2n, 2j+1), (2n+1, 2j+1)
        // This fills in a 2x2 parallelogram for each original vertex
        for (const v of currentVerts) {
            const n2 = v.n * 2;
            const j2 = v.j * 2;
            for (let dn = 0; dn <= 1; dn++) {
                for (let dj = 0; dj <= 1; dj++) {
                    const key = vertexKey(n2 + dn, j2 + dj);
                    if (!activeVertices.has(key)) {
                        activeVertices.set(key, { n: n2 + dn, j: j2 + dj });
                    }
                }
            }
        }

        // Scale probe points proportionally
        if (probeA) {
            probeA = { n: probeA.n * 2, j: probeA.j * 2 };
        }
        if (probeB) {
            probeB = { n: probeB.n * 2, j: probeB.j * 2 };
        }
        if (probeA && probeB && wasmReady) {
            wasmModule._setProbePoints(probeA.n, probeA.j, probeB.n, probeB.j);
        }
        updateProbeUI();

        reinitialize();
        fitView();
        updateStatus(`Scaled region to ${activeVertices.size} vertices`);
    }

    // ========================================================================
    // WASM INTERFACE
    // ========================================================================
    let wasmReady = false;
    let wasmModule = null;

    function initFromVertices(vertices) {
        if (!wasmReady) return false;

        const vertexStr = Array.from(vertices.values())
            .map(v => `${v.n},${v.j}`)
            .join(';');

        const result = wasmModule._initFromVertices(vertexStr);
        if (result < 0) {
            if (result === -1) updateStatus('Error: No vertices');
            else if (result === -2) updateStatus('Error: Odd number of vertices (need even for matching)');
            else if (result === -3) updateStatus('Error: No perfect matching exists');
            isValid = false;
            currentDimers = [];
            currentDimers2 = [];
            return false;
        }

        isValid = true;
        if (hasHoles) {
            updateStatus(`Initialized with ${result} vertices. ⚠️ Domain has holes - Glauber cannot mix topological sectors!`, true);
        } else {
            updateStatus(`Initialized with ${result} vertices`);
        }
        fetchDimers();
        // Only initialize second config if double dimer is enabled
        if (document.getElementById('double-dimer').checked) {
            wasmModule._resetDimers2();
            fetchDimers2();
        } else {
            currentDimers2 = [];
        }
        return true;
    }

    function fetchDimers() {
        if (!wasmReady || !isValid) return;

        const dimerStr = wasmModule._exportDimers();
        currentDimers = [];

        if (dimerStr && dimerStr.length > 0) {
            const parts = dimerStr.split(';');
            for (const part of parts) {
                const coords = part.split(',').map(Number);
                if (coords.length === 4) {
                    currentDimers.push({
                        n1: coords[0], j1: coords[1],
                        n2: coords[2], j2: coords[3]
                    });
                }
            }
        }
    }

    function fetchDimers2() {
        if (!wasmReady || !isValid) return;

        const dimerStr = wasmModule._exportDimers2();
        currentDimers2 = [];

        if (dimerStr && dimerStr.length > 0) {
            const parts = dimerStr.split(';');
            for (const part of parts) {
                const coords = part.split(',').map(Number);
                if (coords.length === 4) {
                    currentDimers2.push({
                        n1: coords[0], j1: coords[1],
                        n2: coords[2], j2: coords[3]
                    });
                }
            }
        }
    }

    if (typeof Module !== 'undefined') {
        Module.onRuntimeInitialized = function() {
            wasmReady = true;
            wasmModule = {
                _initFromVertices: Module.cwrap('initFromVertices', 'number', ['string']),
                _performGlauberSteps: Module.cwrap('performGlauberSteps', null, ['number']),
                _exportDimers: Module.cwrap('exportDimers', 'string', []),
                _performGlauberSteps2: Module.cwrap('performGlauberSteps2', null, ['number']),
                _exportDimers2: Module.cwrap('exportDimers2', 'string', []),
                _resetDimers2: Module.cwrap('resetDimers2', null, []),
                _clearDimers2: Module.cwrap('clearDimers2', null, []),
                _getDebugWeights: Module.cwrap('getDebugWeights', 'string', []),
                _filterLoopsBySize: Module.cwrap('filterLoopsBySize', 'string', ['number']),
                _getTotalSteps: Module.cwrap('getTotalSteps', 'number', []),
                _getFlipCount: Module.cwrap('getFlipCount', 'number', []),
                _getLozengeFlips: Module.cwrap('getLozengeFlips', 'number', []),
                _getTriangleFlips: Module.cwrap('getTriangleFlips', 'number', []),
                _getButterflyFlips: Module.cwrap('getButterflyFlips', 'number', []),
                _getAcceptRate: Module.cwrap('getAcceptRate', 'number', []),
                _getVertexCount: Module.cwrap('getVertexCount', 'number', []),
                _setUsePeriodicWeights: Module.cwrap('setUsePeriodicWeights', null, ['number']),
                _getUsePeriodicWeights: Module.cwrap('getUsePeriodicWeights', 'number', []),
                _getPeriodicK: Module.cwrap('getPeriodicK', 'number', []),
                _getPeriodicL: Module.cwrap('getPeriodicL', 'number', []),
                _setSeed: Module.cwrap('setSeed', null, ['number']),
                _setProbePoints: Module.cwrap('setProbePoints', null, ['number', 'number', 'number', 'number']),  // doubles
                _getSeparationCount: Module.cwrap('getSeparationCount', 'number', []),
                _getSeparatingLoopEdges: Module.cwrap('getSeparatingLoopEdges', 'string', []),
                _getLoopCount: Module.cwrap('getLoopCount', 'number', []),
                _getProbeDebugInfo: Module.cwrap('getProbeDebugInfo', 'string', []),
                _findLoopContainingPoint: Module.cwrap('findLoopContainingPoint', 'number', ['number', 'number']),
                _computeLoopFractalDimension: Module.cwrap('computeLoopFractalDimension', 'number', ['number']),
                _getLoopInfo: Module.cwrap('getLoopInfo', 'string', ['number']),
                _getLoopEdgeIndices: Module.cwrap('getLoopEdgeIndices', 'string', ['number']),
                // Fractal dimension averaging
                _startFractalAveraging: Module.cwrap('startFractalAveraging', null, ['number', 'number']),
                _sampleFractalDimension: Module.cwrap('sampleFractalDimension', 'number', []),
                _getFractalAverage: Module.cwrap('getFractalAverage', 'string', []),
                _resetFractalSamples: Module.cwrap('resetFractalSamples', null, []),
                _getFractalSamples: Module.cwrap('getFractalSamples', 'string', []),
                // Forced interface (holes)
                _setHolesInConfig2: Module.cwrap('setHolesInConfig2', null, ['number', 'number', 'number', 'number']),
                _clearHolesInConfig2: Module.cwrap('clearHolesInConfig2', null, []),
                _getHole1: Module.cwrap('getHole1', 'number', []),
                _getHole2: Module.cwrap('getHole2', 'number', []),
                _getHolePath: Module.cwrap('getHolePath', 'string', []),
                _computeHolePathFractalDimension: Module.cwrap('computeHolePathFractalDimension', 'number', []),
                _sampleHolePathFractalDimension: Module.cwrap('sampleHolePathFractalDimension', 'number', [])
            };
            // Seed RNG with random value so each page load is different
            const randomSeed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
            wasmModule._setSeed(randomSeed);
            updateStatus('WASM loaded. Draw a region or use a preset.');
        };
    }

    // ========================================================================
    // PRESETS
    // ========================================================================
    function createParallelogram(size) {
        activeVertices.clear();
        for (let n = 0; n < size; n++) {
            for (let j = 0; j < size; j++) {
                const key = vertexKey(n, j);
                activeVertices.set(key, { n, j });
            }
        }
        reinitialize();
        fitView();
    }

    function createTriangleUp(size) {
        activeVertices.clear();
        // Upward-facing triangle: n >= 0, j >= 0, n + j <= size
        for (let n = 0; n <= size; n++) {
            for (let j = 0; j <= size - n; j++) {
                const key = vertexKey(n, j);
                activeVertices.set(key, { n, j });
            }
        }
        reinitialize();
        fitView();
    }

    function reinitialize() {
        stopSimulation();
        computeBoundary();
        if (activeVertices.size === 0) {
            isValid = false;
            currentDimers = [];
            currentDimers2 = [];
            updateStatus('Draw a region or use a preset');
        } else {
            initFromVertices(activeVertices);
        }
        draw();
    }

    function fitView() {
        if (activeVertices.size === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const v of activeVertices.values()) {
            const x = v.n + 0.5 * v.j;
            const y = v.j * SQRT3_2;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        viewOffsetX = (minX + maxX) / 2;
        viewOffsetY = (minY + maxY) / 2;

        const rect = canvas.getBoundingClientRect();
        const padding = 50;
        const scaleX = (rect.width - 2 * padding) / (maxX - minX + 1);
        const scaleY = (rect.height - 2 * padding) / (maxY - minY + 1);
        viewScale = Math.min(scaleX, scaleY, 50);
    }

    // ========================================================================
    // SIMULATION
    // ========================================================================
    function startSimulation() {
        if (!isValid || isRunning) return;
        isRunning = true;
        lastFrameTime = 0; // Reset frame timer
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-stop').disabled = false;
        animationId = requestAnimationFrame(animate);
    }

    function stopSimulation() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-stop').disabled = true;
        draw();  // Redraw to show separating loop highlighting
    }

    function animate(currentTime) {
        if (!isRunning) return;

        // Calculate steps based on elapsed time
        if (lastFrameTime === 0) lastFrameTime = currentTime;
        const deltaTime = (currentTime - lastFrameTime) / 1000; // seconds
        lastFrameTime = currentTime;

        const stepsThisFrame = Math.max(1, Math.round(stepsPerSecond * deltaTime));
        wasmModule._performGlauberSteps(stepsThisFrame);
        fetchDimers();

        // Run second Glauber if double dimer mode is enabled
        const doubleDimerEnabled = document.getElementById('double-dimer').checked;
        if (doubleDimerEnabled) {
            wasmModule._performGlauberSteps2(stepsThisFrame);
            fetchDimers2();
        }

        const totalSteps = wasmModule._getTotalSteps();
        const flipCount = wasmModule._getFlipCount();
        const lozengeFlips = wasmModule._getLozengeFlips();
        const triangleFlips = wasmModule._getTriangleFlips();
        const butterflyFlips = wasmModule._getButterflyFlips();
        const acceptRate = wasmModule._getAcceptRate();

        updateStatus(`Steps: ${totalSteps.toLocaleString()} | L: ${lozengeFlips.toLocaleString()} | T: ${triangleFlips.toLocaleString()} | B: ${butterflyFlips.toLocaleString()} | Accept: ${(acceptRate * 100).toFixed(1)}%`);

        // Compute topological separation stats if both probes are set and double dimer is active
        if (doubleDimerEnabled && probeA && probeB) {
            stepsSinceLastSample += stepsThisFrame;

            // Sample when we've accumulated enough steps
            while (stepsSinceLastSample >= sampleInterval) {
                stepsSinceLastSample -= sampleInterval;

                const separationL = wasmModule._getSeparationCount();
                const loopCount = wasmModule._getLoopCount();

                if (separationL >= 0) {
                    const u = parseFloat(document.getElementById('param-u').value) || 0.5;
                    const angle = 2 * Math.PI * u * separationL;
                    sumCos += Math.cos(angle);
                    sumSin += Math.sin(angle);
                    statsCount++;

                    updateStatsDisplay(separationL, loopCount);
                }
            }
        }

        // Sample fractal dimension if averaging is active (requires double dimer mode)
        // Works with either probe point OR holes
        const hasProbe = fractalProbePoint !== null;
        const hasHoles = hole1 !== null && hole2 !== null;
        if (fractalSampling && doubleDimerEnabled && (hasProbe || hasHoles)) {
            stepsSinceLastFractalSample += stepsThisFrame;
            if (stepsSinceLastFractalSample >= fractalSampleInterval) {
                stepsSinceLastFractalSample = 0;
                // Use hole path sampling when holes are set, otherwise use probe
                if (hasHoles) {
                    wasmModule._sampleHolePathFractalDimension();
                } else {
                    wasmModule._sampleFractalDimension();
                }
                updateFractalAvgUI();
            }
        }

        draw();
        animationId = requestAnimationFrame(animate);
    }

    // Logarithmic slider conversion (0-100 -> 1 to 100,000,000)
    function sliderToSpeed(sliderVal) {
        return Math.round(Math.pow(10, sliderVal * 0.08));
    }

    function speedToSlider(speed) {
        if (speed <= 1) return 0;
        return Math.round(Math.log10(speed) / 0.08);
    }

    function updateSpeedFromSlider(sliderVal) {
        stepsPerSecond = sliderToSpeed(sliderVal);
        document.getElementById('speed-slider').value = sliderVal;
        document.getElementById('speed-input').value = stepsPerSecond;
    }

    function updateSpeedFromInput(speed) {
        stepsPerSecond = Math.max(1, Math.min(100000000, parseInt(speed) || 100));
        document.getElementById('speed-input').value = stepsPerSecond;
        document.getElementById('speed-slider').value = speedToSlider(stepsPerSecond);
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================
    function updateStatus(text, isWarning = false) {
        const statusBar = document.querySelector('.status-bar');
        document.getElementById('status-text').textContent = text;
        statusBar.classList.toggle('warning', isWarning);
    }

    function setTool(tool) {
        currentTool = tool;
        lassoPoints = [];
        document.getElementById('btn-pan').classList.toggle('active', tool === 'pan');
        document.getElementById('btn-draw').classList.toggle('active', tool === 'draw');
        document.getElementById('btn-erase').classList.toggle('active', tool === 'erase');
        document.getElementById('btn-lasso-fill').classList.toggle('active', tool === 'lasso-fill');
        document.getElementById('btn-lasso-erase').classList.toggle('active', tool === 'lasso-erase');
        canvas.classList.toggle('panning', tool === 'pan');
        draw();
    }

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        lastMouseX = e.clientX - rect.left;
        lastMouseY = e.clientY - rect.top;

        // Handle probe point selection (snap to triangle centers)
        if (selectingProbe) {
            const center = screenToTriangleCenter(lastMouseX, lastMouseY);
            if (selectingProbe === 'A') {
                probeA = {n: center.n, j: center.j};
                document.getElementById('btn-set-p1').classList.remove('active');
            } else {
                probeB = {n: center.n, j: center.j};
                document.getElementById('btn-set-p2').classList.remove('active');
            }
            selectingProbe = null;
            updateProbeUI();

            // Send to WASM if both points are set
            if (probeA && probeB && wasmReady) {
                wasmModule._setProbePoints(probeA.n, probeA.j, probeB.n, probeB.j);
                resetStats();
            }
            draw();
            return;
        }

        // Handle loop selection for fractal dimension (use float coords to find nearest edge)
        if (selectingLoop) {
            const coords = screenToLatticeFloat(lastMouseX, lastMouseY);
            selectLoopAtPoint(coords.n, coords.j);
            selectingLoop = false;
            document.getElementById('btn-select-loop').classList.remove('active');
            return;
        }

        // Handle fractal averaging probe point selection
        if (settingFractalProbe) {
            const coords = screenToLatticeFloat(lastMouseX, lastMouseY);
            setFractalProbePoint(coords.n, coords.j);
            return;
        }

        // Handle hole setting for forced interface
        if (settingHole) {
            const coords = screenToLattice(lastMouseX, lastMouseY);
            // Check if vertex is in the active region
            const key = vertexKey(coords.n, coords.j);
            if (activeVertices.has(key)) {
                setHole(settingHole, coords.n, coords.j);
            }
            return;
        }

        if (currentTool === 'pan') {
            isPanning = true;
        } else if (currentTool === 'draw' || currentTool === 'erase') {
            handleDrawErase(lastMouseX, lastMouseY);
        } else if (currentTool === 'lasso-fill' || currentTool === 'lasso-erase') {
            handleLassoClick(lastMouseX, lastMouseY, e.metaKey || e.ctrlKey);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isPanning) {
            const dx = x - lastMouseX;
            const dy = y - lastMouseY;
            viewOffsetX -= dx / viewScale;
            viewOffsetY += dy / viewScale;
            lastMouseX = x;
            lastMouseY = y;
            draw();
        } else if (e.buttons === 1 && (currentTool === 'draw' || currentTool === 'erase')) {
            handleDrawErase(x, y);
        }
    });

    canvas.addEventListener('mouseup', () => {
        isPanning = false;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        viewScale = Math.max(5, Math.min(100, viewScale * zoomFactor));
        draw();
    });

    function handleDrawErase(x, y) {
        const lattice = screenToLattice(x, y);
        const key = vertexKey(lattice.n, lattice.j);

        if (currentTool === 'draw') {
            if (!activeVertices.has(key)) {
                activeVertices.set(key, { n: lattice.n, j: lattice.j });
                reinitialize();
            }
        } else if (currentTool === 'erase') {
            if (activeVertices.has(key)) {
                activeVertices.delete(key);
                reinitialize();
            }
        }
    }

    function handleLassoClick(x, y, forceClose = false) {
        // Check if clicking near the start to close the polygon
        if (lassoPoints.length >= 3) {
            const dist = Math.hypot(x - lassoPoints[0].x, y - lassoPoints[0].y);
            if (dist < 15) {
                applyLasso(currentTool === 'lasso-fill');
                return;
            }
        }

        // Add the point
        lassoPoints.push({ x, y });
        draw();

        // If Cmd/Ctrl was held, close after adding this point
        if (forceClose && lassoPoints.length >= 3) {
            applyLasso(currentTool === 'lasso-fill');
        }
    }

    // Keyboard shortcut to close lasso
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && lassoPoints.length >= 3) {
            applyLasso(currentTool === 'lasso-fill');
        } else if (e.key === 'Escape') {
            lassoPoints = [];
            draw();
        }
    });

    // Button events
    document.getElementById('btn-parallelogram').addEventListener('click', () => {
        const size = parseInt(document.getElementById('preset-size').value) || 6;
        createParallelogram(size);
    });

    document.getElementById('btn-triangle-up').addEventListener('click', () => {
        const size = parseInt(document.getElementById('preset-size').value) || 6;
        createTriangleUp(size);
    });

    document.getElementById('btn-make-coverable').addEventListener('click', makeCoverable);
    document.getElementById('btn-scale-up').addEventListener('click', scaleUp);

    document.getElementById('btn-clear').addEventListener('click', () => {
        activeVertices.clear();
        reinitialize();
        // Reset view
        viewOffsetX = 0;
        viewOffsetY = 0;
        viewScale = 30;
        draw();
    });

    document.getElementById('btn-start').addEventListener('click', startSimulation);
    document.getElementById('btn-stop').addEventListener('click', stopSimulation);

    document.getElementById('speed-slider').addEventListener('input', (e) => updateSpeedFromSlider(parseInt(e.target.value)));
    document.getElementById('speed-input').addEventListener('change', (e) => updateSpeedFromInput(e.target.value));

    document.getElementById('btn-pan').addEventListener('click', () => setTool('pan'));
    document.getElementById('btn-draw').addEventListener('click', () => setTool('draw'));
    document.getElementById('btn-erase').addEventListener('click', () => setTool('erase'));
    document.getElementById('btn-lasso-fill').addEventListener('click', () => setTool('lasso-fill'));
    document.getElementById('btn-lasso-erase').addEventListener('click', () => setTool('lasso-erase'));

    document.getElementById('show-grid').addEventListener('change', draw);
    document.getElementById('show-vertices').addEventListener('change', draw);
    document.getElementById('show-coords').addEventListener('change', draw);
    document.getElementById('show-boundary').addEventListener('change', draw);
    document.getElementById('color-by-orientation').addEventListener('change', draw);
    document.getElementById('edge-width-slider').addEventListener('input', draw);
    document.getElementById('show-edge-weights').addEventListener('change', draw);
    document.getElementById('double-dimer').addEventListener('change', () => {
        const doubleDimerEnabled = document.getElementById('double-dimer').checked;
        document.getElementById('min-loop-container').style.display = doubleDimerEnabled ? '' : 'none';
        document.getElementById('topo-stats-group').style.display = doubleDimerEnabled ? '' : 'none';
        document.getElementById('fractal-dim-group').style.display = doubleDimerEnabled ? '' : 'none';
        if (wasmReady && isValid) {
            if (doubleDimerEnabled) {
                // Start fresh second config from current first config
                wasmModule._resetDimers2();
                fetchDimers2();
            } else {
                // Clear second config
                wasmModule._clearDimers2();
                currentDimers2 = [];
            }
        }
        // Reset stats and clear selected loop when toggling double dimer mode
        resetStats();
        clearSelectedLoop();
        draw();
    });
    document.getElementById('min-loop-size').addEventListener('change', draw);

    // Topological stats event handlers
    document.getElementById('btn-set-p1').addEventListener('click', () => {
        selectingProbe = 'A';
        document.getElementById('btn-set-p1').classList.add('active');
        document.getElementById('btn-set-p2').classList.remove('active');
    });

    document.getElementById('btn-set-p2').addEventListener('click', () => {
        selectingProbe = 'B';
        document.getElementById('btn-set-p2').classList.add('active');
        document.getElementById('btn-set-p1').classList.remove('active');
    });

    document.getElementById('btn-reset-stats').addEventListener('click', () => {
        resetStats();
    });

    document.getElementById('stats-output').addEventListener('click', () => {
        if (wasmReady && probeA && probeB) {
            const debugInfo = wasmModule._getProbeDebugInfo();
            console.log(debugInfo);
            alert(debugInfo);
        }
    });

    document.getElementById('sample-interval-slider').addEventListener('input', (e) => {
        updateSampleIntervalFromSlider(parseInt(e.target.value));
    });

    document.getElementById('sample-interval-input').addEventListener('change', (e) => {
        updateSampleIntervalFromInput(e.target.value);
    });

    document.getElementById('fractal-sample-interval-slider').addEventListener('input', (e) => {
        updateFractalSampleIntervalFromSlider(parseInt(e.target.value));
    });

    document.getElementById('fractal-sample-interval-input').addEventListener('change', (e) => {
        updateFractalSampleIntervalFromInput(e.target.value);
    });

    // Fractal dimension event handlers
    document.getElementById('btn-select-loop').addEventListener('click', () => {
        selectingLoop = !selectingLoop;
        document.getElementById('btn-select-loop').classList.toggle('active', selectingLoop);
        // Deactivate probe selection when selecting loop
        if (selectingLoop) {
            selectingProbe = null;
            document.getElementById('btn-set-p1').classList.remove('active');
            document.getElementById('btn-set-p2').classList.remove('active');
        }
    });

    document.getElementById('btn-clear-loop').addEventListener('click', () => {
        clearSelectedLoop();
    });

    // Fractal dimension averaging event handlers
    document.getElementById('btn-set-fractal-probe').addEventListener('click', () => {
        settingFractalProbe = !settingFractalProbe;
        document.getElementById('btn-set-fractal-probe').classList.toggle('active', settingFractalProbe);
        // Deactivate other click modes
        if (settingFractalProbe) {
            selectingLoop = false;
            selectingProbe = null;
            document.getElementById('btn-select-loop').classList.remove('active');
            document.getElementById('btn-set-p1').classList.remove('active');
            document.getElementById('btn-set-p2').classList.remove('active');
        }
    });

    document.getElementById('btn-start-fractal-avg').addEventListener('click', () => {
        startFractalSampling();
    });

    document.getElementById('btn-stop-fractal-avg').addEventListener('click', () => {
        stopFractalSampling();
    });

    document.getElementById('btn-reset-fractal-avg').addEventListener('click', () => {
        resetFractalSampling();
    });

    // Forced interface (holes) event handlers
    document.getElementById('btn-set-hole1').addEventListener('click', () => {
        settingHole = settingHole === 1 ? null : 1;
        // Deactivate other click modes
        if (settingHole) {
            selectingLoop = false;
            selectingProbe = null;
            settingFractalProbe = false;
            document.getElementById('btn-select-loop').classList.remove('active');
            document.getElementById('btn-set-p1').classList.remove('active');
            document.getElementById('btn-set-p2').classList.remove('active');
            document.getElementById('btn-set-fractal-probe').classList.remove('active');
        }
        updateHoleUI();
    });

    document.getElementById('btn-set-hole2').addEventListener('click', () => {
        settingHole = settingHole === 2 ? null : 2;
        // Deactivate other click modes
        if (settingHole) {
            selectingLoop = false;
            selectingProbe = null;
            settingFractalProbe = false;
            document.getElementById('btn-select-loop').classList.remove('active');
            document.getElementById('btn-set-p1').classList.remove('active');
            document.getElementById('btn-set-p2').classList.remove('active');
            document.getElementById('btn-set-fractal-probe').classList.remove('active');
        }
        updateHoleUI();
    });

    document.getElementById('btn-clear-holes').addEventListener('click', () => {
        clearHoles();
    });

    // Target selection radio buttons
    document.getElementById('target-probe').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.getElementById('probe-controls').style.display = 'flex';
            document.getElementById('holes-controls').style.display = 'none';
            // Clear holes when switching to probe mode
            if (hole1 || hole2) {
                clearHoles();
            }
        }
    });

    document.getElementById('target-holes').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.getElementById('probe-controls').style.display = 'none';
            document.getElementById('holes-controls').style.display = 'flex';
            // Clear probe when switching to holes mode
            if (fractalProbePoint) {
                fractalProbePoint = null;
                settingFractalProbe = false;
                document.getElementById('btn-set-fractal-probe').classList.remove('active');
                document.getElementById('probe-coords').textContent = '(not set)';
                if (wasmReady) {
                    wasmModule._resetFractalSamples();
                }
                updateFractalAvgUI();
                draw();
            }
        }
    });

    // ========================================================================
    // PERIODIC WEIGHTS
    // ========================================================================

    function buildFundamentalDomainSVG(k, l, weights) {
        const svgNS = "http://www.w3.org/2000/svg";
        const sqrt3_2 = Math.sqrt(3) / 2;

        // Layout parameters - scale based on k and l to keep labels readable
        const baseScale = 100;  // pixels per unit
        const scale = Math.max(70, baseScale - Math.max(k, l) * 8);  // reduce scale for larger domains
        const padding = 60;
        const vertexRadius = 5;
        const edgeWidth = 4;

        // Edge colors (same as in main drawing)
        const edgeColors = ['#E57200', '#232D4B', '#2E8B57'];

        // Calculate bounds - show the k×l domain plus one extra row/col for context
        const minN = -1, maxN = k;
        const minJ = -1, maxJ = l;

        // Convert lattice coords to SVG coords
        function toSVG(n, j) {
            const x = (n + 0.5 * j - minN - 0.5 * minJ) * scale + padding;
            const y = ((maxJ - j) * sqrt3_2) * scale + padding;  // flip y so j increases upward
            return { x, y };
        }

        // Calculate SVG dimensions
        const width = (maxN - minN + 0.5 * (maxJ - minJ) + 1) * scale + 2 * padding;
        const height = (maxJ - minJ + 1) * sqrt3_2 * scale + 2 * padding;

        // Create SVG element
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", width);
        svg.setAttribute("height", height);
        svg.style.display = "block";
        svg.style.margin = "8px auto";
        svg.style.background = "#fafafa";
        svg.style.borderRadius = "4px";
        svg.style.border = "1px solid #ddd";

        // Draw background edges (lighter, for context)
        for (let j = minJ; j <= maxJ; j++) {
            for (let n = minN; n <= maxN; n++) {
                const p = toSVG(n, j);
                // Only draw edges going "forward" to avoid duplicates
                // Horizontal: (n,j) -> (n+1,j)
                if (n < maxN) {
                    const p2 = toSVG(n + 1, j);
                    const line = document.createElementNS(svgNS, "line");
                    line.setAttribute("x1", p.x);
                    line.setAttribute("y1", p.y);
                    line.setAttribute("x2", p2.x);
                    line.setAttribute("y2", p2.y);
                    line.setAttribute("stroke", "#ddd");
                    line.setAttribute("stroke-width", 1);
                    svg.appendChild(line);
                }
                // Diag1: (n,j) -> (n,j+1)
                if (j < maxJ) {
                    const p2 = toSVG(n, j + 1);
                    const line = document.createElementNS(svgNS, "line");
                    line.setAttribute("x1", p.x);
                    line.setAttribute("y1", p.y);
                    line.setAttribute("x2", p2.x);
                    line.setAttribute("y2", p2.y);
                    line.setAttribute("stroke", "#ddd");
                    line.setAttribute("stroke-width", 1);
                    svg.appendChild(line);
                }
                // Diag2: (n,j) -> (n-1,j+1)
                if (j < maxJ && n > minN) {
                    const p2 = toSVG(n - 1, j + 1);
                    const line = document.createElementNS(svgNS, "line");
                    line.setAttribute("x1", p.x);
                    line.setAttribute("y1", p.y);
                    line.setAttribute("x2", p2.x);
                    line.setAttribute("y2", p2.y);
                    line.setAttribute("stroke", "#ddd");
                    line.setAttribute("stroke-width", 1);
                    svg.appendChild(line);
                }
            }
        }

        // Draw fundamental domain boundary (subtle dashed parallelogram)
        // The domain contains vertices (0..k-1) × (0..l-1)
        // Draw a tight boundary around these vertices with some padding
        const pad = 0.25;  // padding around vertices
        const boundaryCorners = [
            toSVG(-pad, -pad),
            toSVG(k - 1 + pad, -pad),
            toSVG(k - 1 + pad, l - 1 + pad),
            toSVG(-pad, l - 1 + pad)
        ];
        const boundary = document.createElementNS(svgNS, "polygon");
        boundary.setAttribute("points", boundaryCorners.map(c => `${c.x},${c.y}`).join(" "));
        boundary.setAttribute("fill", "rgba(100, 149, 237, 0.08)");
        boundary.setAttribute("stroke", "#7090c0");
        boundary.setAttribute("stroke-width", 1.5);
        boundary.setAttribute("stroke-dasharray", "6,4");
        svg.appendChild(boundary);

        // Draw colored edges within the fundamental domain
        // Each edge type is drawn as short segments from domain vertices
        const edgeLen = 0.5;  // length of edge indicator (fraction of full edge)
        const labelData = [];  // Store label info to draw last (on top)

        for (let j = 0; j < l; j++) {
            for (let n = 0; n < k; n++) {
                const p = toSVG(n, j);
                const w = weights[n]?.[j] || [1, 1, 1];

                // Horizontal edge indicator: towards (n+1,j), type 0
                const p_horiz = toSVG(n + edgeLen, j);
                const lineH = document.createElementNS(svgNS, "line");
                lineH.setAttribute("x1", p.x);
                lineH.setAttribute("y1", p.y);
                lineH.setAttribute("x2", p_horiz.x);
                lineH.setAttribute("y2", p_horiz.y);
                lineH.setAttribute("stroke", edgeColors[0]);
                lineH.setAttribute("stroke-width", edgeWidth);
                lineH.setAttribute("stroke-linecap", "round");
                svg.appendChild(lineH);
                // Label below the horizontal edge (in its own space)
                labelData.push({
                    x: p.x + scale * 0.25,
                    y: p.y + 22,
                    anchor: "middle",
                    color: edgeColors[0],
                    text: w[0]
                });

                // Diag1 edge indicator: towards (n,j+1), type 1
                const p_diag1 = toSVG(n, j + edgeLen);
                const lineD1 = document.createElementNS(svgNS, "line");
                lineD1.setAttribute("x1", p.x);
                lineD1.setAttribute("y1", p.y);
                lineD1.setAttribute("x2", p_diag1.x);
                lineD1.setAttribute("y2", p_diag1.y);
                lineD1.setAttribute("stroke", edgeColors[1]);
                lineD1.setAttribute("stroke-width", edgeWidth);
                lineD1.setAttribute("stroke-linecap", "round");
                svg.appendChild(lineD1);
                // Label above diag1 - stagger y based on n to avoid collision with neighbor
                labelData.push({
                    x: p.x + scale * 0.15,
                    y: p.y - scale * sqrt3_2 * 0.35 - 10,
                    anchor: "middle",
                    color: edgeColors[1],
                    text: w[1]
                });

                // Diag2 edge indicator: towards (n-1,j+1), type 2
                const p_diag2 = toSVG(n - edgeLen, j + edgeLen);
                const lineD2 = document.createElementNS(svgNS, "line");
                lineD2.setAttribute("x1", p.x);
                lineD2.setAttribute("y1", p.y);
                lineD2.setAttribute("x2", p_diag2.x);
                lineD2.setAttribute("y2", p_diag2.y);
                lineD2.setAttribute("stroke", edgeColors[2]);
                lineD2.setAttribute("stroke-width", edgeWidth);
                lineD2.setAttribute("stroke-linecap", "round");
                svg.appendChild(lineD2);
                // Label above diag2 - higher up than diag1 to separate them
                labelData.push({
                    x: p.x - scale * 0.15,
                    y: p.y - scale * sqrt3_2 * 0.55 - 10,
                    anchor: "middle",
                    color: edgeColors[2],
                    text: w[2]
                });
            }
        }

        // Draw vertices
        for (let j = minJ; j <= maxJ; j++) {
            for (let n = minN; n <= maxN; n++) {
                const p = toSVG(n, j);
                const inDomain = (n >= 0 && n < k && j >= 0 && j < l);
                const circle = document.createElementNS(svgNS, "circle");
                circle.setAttribute("cx", p.x);
                circle.setAttribute("cy", p.y);
                circle.setAttribute("r", inDomain ? vertexRadius : vertexRadius * 0.6);
                circle.setAttribute("fill", inDomain ? "#333" : "#bbb");
                svg.appendChild(circle);
            }
        }

        // Draw weight labels last so they appear on top, with white background bubbles
        for (const lbl of labelData) {
            // Create a group for background + text
            const g = document.createElementNS(svgNS, "g");

            // Create text first to measure it
            const text = document.createElementNS(svgNS, "text");
            text.setAttribute("x", lbl.x);
            text.setAttribute("y", lbl.y);
            text.setAttribute("text-anchor", lbl.anchor);
            text.setAttribute("font-size", "13px");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("fill", lbl.color);
            text.textContent = lbl.text;

            // Estimate text width (roughly 8px per character for this font size)
            const textLen = String(lbl.text).length * 8;
            const padX = 4, padY = 3;
            let rectX = lbl.x - padX;
            if (lbl.anchor === "middle") rectX = lbl.x - textLen/2 - padX;
            else if (lbl.anchor === "end") rectX = lbl.x - textLen - padX;

            // White background rounded rect
            const bg = document.createElementNS(svgNS, "rect");
            bg.setAttribute("x", rectX);
            bg.setAttribute("y", lbl.y - 11);
            bg.setAttribute("width", textLen + padX * 2);
            bg.setAttribute("height", 16);
            bg.setAttribute("rx", 3);
            bg.setAttribute("ry", 3);
            bg.setAttribute("fill", "white");
            bg.setAttribute("stroke", lbl.color);
            bg.setAttribute("stroke-width", "1");
            bg.setAttribute("opacity", "0.95");

            g.appendChild(bg);
            g.appendChild(text);
            svg.appendChild(g);
        }

        return svg;
    }

    function buildWeightDiagram() {
        const container = document.getElementById('weight-diagram');
        const k = currentPeriodicK;
        const l = currentPeriodicL;

        container.innerHTML = '';

        // Create a flex wrapper to put weights on left, SVG on right
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'flex-start';
        wrapper.style.gap = '20px';
        wrapper.style.flexWrap = 'wrap';

        // Build a grid of input cells (on the left)
        const gridContainer = document.createElement('div');
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = `repeat(${k}, auto)`;
        gridContainer.style.gap = '8px';

        const edgeColors = ['#E57200', '#232D4B', '#2E8B57'];
        const edgeLabels = ['━', '╱', '╲'];

        // Iterate j from l-1 down to 0 so (0,l-1) is top-left visually
        for (let ji = l - 1; ji >= 0; ji--) {
            for (let ni = 0; ni < k; ni++) {
                const cellDiv = document.createElement('div');
                cellDiv.style.border = '1px solid #ddd';
                cellDiv.style.padding = '6px';
                cellDiv.style.borderRadius = '4px';
                cellDiv.style.background = '#fff';

                const header = document.createElement('div');
                header.style.fontSize = '10px';
                header.style.color = '#888';
                header.style.textAlign = 'center';
                header.style.marginBottom = '4px';
                header.textContent = `(${ni},${ji})`;
                cellDiv.appendChild(header);

                for (let t = 0; t < 3; t++) {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.alignItems = 'center';
                    row.style.gap = '4px';
                    row.style.marginTop = '2px';

                    const label = document.createElement('span');
                    label.style.color = edgeColors[t];
                    label.style.fontWeight = 'bold';
                    label.style.width = '16px';
                    label.textContent = edgeLabels[t];
                    row.appendChild(label);

                    const input = document.createElement('input');
                    input.type = 'number';
                    input.className = 'param-input';
                    input.style.width = '55px';
                    input.style.fontSize = '11px';
                    input.min = '0.001';
                    input.max = '1000';
                    input.step = '0.1';
                    input.value = currentEdgeWeights[ni]?.[ji]?.[t] ?? 1;
                    input.dataset.n = ni;
                    input.dataset.j = ji;
                    input.dataset.t = t;
                    input.addEventListener('change', updateEdgeWeights);
                    row.appendChild(input);

                    cellDiv.appendChild(row);
                }

                gridContainer.appendChild(cellDiv);
            }
        }

        wrapper.appendChild(gridContainer);

        // Add the SVG diagram of the fundamental domain (on the right)
        const svg = buildFundamentalDomainSVG(k, l, currentEdgeWeights);
        svg.style.margin = '0';  // Remove auto margin since we're using flex
        wrapper.appendChild(svg);

        container.appendChild(wrapper);
    }

    function updateEdgeWeights() {
        if (!wasmReady) return;

        const k = currentPeriodicK;
        const l = currentPeriodicL;

        // Collect weights from inputs
        const inputs = document.querySelectorAll('#weight-diagram input[data-n]');
        inputs.forEach(input => {
            const ni = parseInt(input.dataset.n);
            const ji = parseInt(input.dataset.j);
            const t = parseInt(input.dataset.t);
            const val = Math.max(0.001, parseFloat(input.value) || 1);
            input.value = val;
            if (!currentEdgeWeights[ni]) currentEdgeWeights[ni] = [];
            if (!currentEdgeWeights[ni][ji]) currentEdgeWeights[ni][ji] = [1, 1, 1];
            currentEdgeWeights[ni][ji][t] = val;
        });

        // Send to WASM as flat array: [n0j0t0, n0j0t1, n0j0t2, n0j1t0, ...]
        const flatArray = [];
        for (let ni = 0; ni < k; ni++) {
            for (let ji = 0; ji < l; ji++) {
                for (let t = 0; t < 3; t++) {
                    flatArray.push(currentEdgeWeights[ni]?.[ji]?.[t] ?? 1);
                }
            }
        }

        // Allocate memory and copy values
        const dataPtr = Module._malloc(flatArray.length * 8);  // 8 bytes per double
        for (let i = 0; i < flatArray.length; i++) {
            Module.setValue(dataPtr + i * 8, flatArray[i], 'double');
        }

        // Call WASM function
        Module._setPeriodicEdgeWeights(dataPtr, k, l);

        // Free memory
        Module._free(dataPtr);

        // Update the SVG diagram to show new weights
        const container = document.getElementById('weight-diagram');
        const oldSvg = container.querySelector('svg');
        if (oldSvg) {
            const newSvg = buildFundamentalDomainSVG(k, l, currentEdgeWeights);
            newSvg.style.margin = '0';  // Remove auto margin since we're using flex
            oldSvg.parentNode.replaceChild(newSvg, oldSvg);
        }

        // Redraw canvas to update weight labels
        draw();
    }

    // Periodic weights event handlers
    document.getElementById('use-periodic-weights').addEventListener('change', (e) => {
        const enabled = e.target.checked;
        if (wasmReady) {
            wasmModule._setUsePeriodicWeights(enabled ? 1 : 0);
        }
        document.getElementById('weight-diagram-container').style.display = enabled ? 'block' : 'none';
        if (enabled) {
            buildWeightDiagram();
            updateEdgeWeights();
        }
        draw(); // Update grid weights display
    });

    document.getElementById('periodic-k').addEventListener('change', (e) => {
        currentPeriodicK = parseInt(e.target.value);
        currentEdgeWeights = initDefaultWeights(currentPeriodicK, currentPeriodicL);
        if (document.getElementById('use-periodic-weights').checked) {
            buildWeightDiagram();
            updateEdgeWeights();
        }
        draw();
    });

    document.getElementById('periodic-l').addEventListener('change', (e) => {
        currentPeriodicL = parseInt(e.target.value);
        currentEdgeWeights = initDefaultWeights(currentPeriodicK, currentPeriodicL);
        if (document.getElementById('use-periodic-weights').checked) {
            buildWeightDiagram();
            updateEdgeWeights();
        }
        draw();
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        viewScale = Math.min(100, viewScale * 1.25);
        draw();
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        viewScale = Math.max(5, viewScale / 1.25);
        draw();
    });

    document.getElementById('btn-reset-view').addEventListener('click', () => {
        fitView();
        draw();
    });

    // Initialize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

})();
</script>
