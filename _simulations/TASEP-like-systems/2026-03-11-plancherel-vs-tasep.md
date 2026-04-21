---
title: Plancherel vs TASEP Fluctuations
model: TASEPs
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/TASEP-like-systems/2026-03-11-plancherel-vs-tasep.md'
    txt: 'Interactive simulation — see source'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/TASEP-like-systems/2026-03-11-plancherel-vs-tasep.cpp'
    txt: 'C++ source for WASM (RSK + TASEP algorithms)'
a11y-description: "Side-by-side comparison of Plancherel growth process (Russian-notation Young diagram profile) and TASEP height function (step initial condition). Both produce piecewise-linear profiles with slopes plus or minus 1. Animated growth synchronized by box count, with limit shape overlays and accumulated histograms of height fluctuations at the center. Demonstrates that Plancherel pointwise bulk fluctuations are of order square-root log N, while TASEP fluctuations are O(N to the 1/6)."
---

<div class="misconception-callout">
<div class="misconception-label">Common misconception</div>
<p>Plancherel and TASEP height functions look alike, but their fluctuations at the center differ dramatically: synchronized by box count $N$, Plancherel is $O(\sqrt{\log N})$ pointwise, while TASEP is $O(N^{1/6})$ (equivalently $O(t^{1/3})$).</p>
</div>

<details class="math-description" id="mathDescription">
<summary>Mathematical description</summary>
<div style="padding: 8px 0;">
<p>The <b>Plancherel growth process</b> adds boxes to a Young diagram via RSK insertion of i.i.d. uniform random variables. The resulting partition of $N$ is distributed according to the <b>Plancherel measure</b>. The <b>TASEP</b> (Totally Asymmetric Simple Exclusion Process) starts from step initial condition: particles at $\ldots, -2, -1, 0$, each jumping right at rate $1$ (i.e., $\mathrm{Exp}(1)$ waiting times), subject to the exclusion constraint.</p>
<p>Both processes produce piecewise-linear <b>height functions</b> with slopes $\pm 1$: the Russian-notation profile $\omega(u)$ for Plancherel, and $h(x,t)$ for TASEP ($+1$ over holes, $-1$ over particles). Both height functions have the shape of the Young diagram (a partition) sitting on top of the $|u|$ or $|x|$ baseline. The two processes are synchronized so that the total number of boxes (area of the partition) equals $N$.</p>
<p><b>Fluctuations at the center</b> ($u = x = 0$): the Plancherel height $\omega(0) \approx \frac{4}{\pi}\sqrt{N}$ has $O(\sqrt{\log N})$ pointwise bulk fluctuations (Bogachev–Su), while the TASEP height $h(0,t) \approx t/2$ has $O(t^{1/3})$ KPZ fluctuations, i.e. $O(N^{1/6})$ under the box-count synchronization $N \asymp t^2$. <b>Plancherel is dramatically more rigid.</b> Regarding integrable structure: the Plancherel measure on partitions is a Schur measure, while the full TASEP height profile at fixed time is a diagonal marginal of an <em>infinite</em> Schur process on interlacing arrays: $x_i(t) \stackrel{d}{=} \lambda_i^{(i)} - i$. This coupling covers the entire curved rarefaction fan, both bulk and edge.</p>
</div>
</details>

<script>if (window.innerWidth >= 992) document.getElementById('mathDescription').setAttribute('open', '');</script>

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="{{site.url}}/js/2026-03-11-plancherel-vs-tasep.js"></script>

<style>
details.math-description {
  margin-bottom: 12px;
}
.misconception-callout {
  border: 2px solid #E57200;
  border-radius: 8px;
  background: rgba(229, 114, 0, 0.08);
  padding: 14px 18px;
  margin: 12px 0 16px 0;
}
.misconception-callout .misconception-label {
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #E57200;
  margin-bottom: 6px;
}
.misconception-callout p {
  margin: 0;
  font-size: 1.15em;
  line-height: 1.45;
  color: var(--text-primary, #333);
}
[data-theme="dark"] .misconception-callout {
  background: rgba(255, 153, 51, 0.12);
  border-color: #ff9933;
}
[data-theme="dark"] .misconception-callout .misconception-label {
  color: #ff9933;
}
details.math-description summary {
  cursor: pointer;
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
details.math-description summary:hover {
  color: var(--accent-color, #E57200);
}

:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333;
  --text-secondary: #888;
  --border-color: #e0e0e0;
  --accent-color: #E57200;
  --accent-secondary: #232D4B;
  --plancherel-color: #232D4B;
  --plancherel-fill: rgba(35, 45, 75, 0.15);
  --tasep-color: #E57200;
  --tasep-fill: rgba(229, 114, 0, 0.15);
}
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #e8e8e8;
  --text-secondary: #aaa;
  --border-color: #444;
  --accent-color: #ff9933;
  --accent-secondary: #4a7ab8;
  --plancherel-color: #4a7ab8;
  --plancherel-fill: rgba(74, 122, 184, 0.2);
  --tasep-color: #ff9933;
  --tasep-fill: rgba(255, 153, 51, 0.2);
}

.simulation-layout {
  display: flex;
  flex-direction: column;
  max-width: 1400px;
  margin: 0 auto;
  padding: 8px;
  gap: 16px;
}
@media (min-width: 992px) {
  .simulation-layout {
    flex-direction: row;
    align-items: flex-start;
  }
  .controls-panel {
    width: 300px;
    min-width: 260px;
    max-width: 340px;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    position: sticky;
    top: 80px;
    background: var(--bg-primary);
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  .controls-panel::-webkit-scrollbar { width: 6px; }
  .controls-panel::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
  .visualization-panel {
    flex: 1 1 auto;
    max-width: calc(100% - 320px);
  }
  .drawer-handle { display: none; }
}

details.control-section {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  margin-bottom: 8px;
}
.control-section summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  user-select: none;
  list-style: none;
  color: var(--text-primary);
}
.control-section summary::-webkit-details-marker { display: none; }
.control-section summary::after {
  content: '';
  width: 8px; height: 8px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.2s;
  opacity: 0.6;
}
.control-section[open] summary::after { transform: rotate(45deg); }
.control-section-content {
  padding: 12px 14px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.control-row label {
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: fit-content;
}
.control-row input[type="number"] {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
}
.control-row input[type="range"] {
  flex: 1;
  min-width: 80px;
}

.btn-action {
  background: linear-gradient(135deg, #E57200, #f08c30) !important;
  color: white !important;
  border: 1px solid #E57200 !important;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-family: "franklingothic-demi", Arial, sans-serif;
}
.btn-action:hover { background: #c96300 !important; }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-action:active:not(:disabled) { transform: scale(0.96); }

.btn-utility {
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--border-color) !important;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.btn-utility:hover { background: var(--bg-secondary) !important; border-color: #999 !important; }

.stats-bar {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  margin-bottom: 8px;
}
.stats-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
}
.stat { display: flex; align-items: center; gap: 4px; }
.stat-label {
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 10px;
}
.stat-value {
  color: var(--accent-secondary);
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
}
[data-theme="dark"] .stat-value { color: #d0d0d0; }

.profile-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.profile-container {
  flex: 1;
  position: relative;
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
}
[data-theme="dark"] .profile-container {
  background: #222;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}
.profile-container canvas {
  display: block;
  width: 100%;
}
.profile-label {
  position: absolute;
  top: 8px; left: 12px;
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  opacity: 0.8;
}

.histogram-container {
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
  position: relative;
}
[data-theme="dark"] .histogram-container {
  background: #222;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}
.histogram-container canvas { display: block; width: 100%; }

.progress-bar-container {
  display: none;
  margin-top: 6px;
}
.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #E57200, #f08c30);
  border-radius: 3px;
  transition: width 0.2s ease;
}
.progress-text {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

@media (max-width: 991px) {
  .profile-row { flex-direction: column; }
  .controls-panel {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: var(--bg-primary);
    border-top: 1px solid var(--border-color);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
    z-index: 900;
    max-height: 70vh;
    transform: translateY(calc(100% - 60px));
    transition: transform 0.3s ease-out;
  }
  .controls-panel.expanded { transform: translateY(0); }
  .drawer-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
    cursor: grab;
    flex-shrink: 0;
  }
  .drawer-handle:active { cursor: grabbing; }
  .drawer-handle-bar {
    width: 40px; height: 4px;
    background: var(--border-color);
    border-radius: 2px;
  }
  .drawer-handle-hint {
    position: absolute;
    font-size: 11px;
    color: #888;
    margin-top: 24px;
  }
  .controls-panel.expanded .drawer-handle-hint { display: none; }
  .controls-panel-inner {
    max-height: calc(70vh - 60px);
    overflow-y: auto;
    padding: 0 12px 20px;
  }
  .sample-fab {
    display: flex;
    position: fixed;
    bottom: 80px; right: 16px;
    width: 56px; height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E57200, #f08c30);
    color: white;
    border: none;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(229,114,0,0.4);
    z-index: 1000;
    align-items: center;
    justify-content: center;
  }
}
@media (min-width: 992px) {
  .sample-fab { display: none; }
}

.control-section {
  opacity: 0;
  transform: translateY(8px);
  animation: revealUp 0.3s ease-out forwards;
}
.control-section:nth-child(1) { animation-delay: 0.05s; }
.control-section:nth-child(2) { animation-delay: 0.10s; }
.control-section:nth-child(3) { animation-delay: 0.15s; }
@keyframes revealUp {
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>

<a href="#plancherelCanvas" class="sr-only sr-only-focusable">Skip to simulation</a>

<div class="simulation-layout">
  <aside class="controls-panel" id="controlsPanel">
    <div class="drawer-handle" id="drawerHandle">
      <div class="drawer-handle-bar"></div>
      <span class="drawer-handle-hint">Swipe up for controls</span>
    </div>
    <div class="controls-panel-inner">

      <details class="control-section" open>
        <summary>Parameters</summary>
        <div class="control-section-content">
          <div class="control-row">
            <label for="nInput">N (boxes)</label>
            <input type="number" id="nInput" value="2000" min="100" max="200000" step="100">
          </div>
          <div class="control-row">
            <input type="range" id="nSlider" min="100" max="200000" step="100" value="2000" aria-label="N slider">
          </div>
        </div>
      </details>

      <details class="control-section" open>
        <summary>Single Run</summary>
        <div class="control-section-content">
          <div class="control-row">
            <button class="btn-action" id="sampleBtn" aria-label="Sample" aria-keyshortcuts="s">Sample</button>
            <button class="btn-action" id="animateBtn" aria-label="Animate" aria-keyshortcuts="a">Animate</button>
          </div>
          <div class="control-row">
            <label for="speedSlider">Speed</label>
            <input type="range" id="speedSlider" min="1" max="100" value="20" aria-label="Animation speed">
          </div>
        </div>
      </details>

      <details class="control-section" open>
        <summary>Batch Sampling</summary>
        <div class="control-section-content">
          <div class="control-row">
            <label for="batchInput">Samples</label>
            <input type="number" id="batchInput" value="200" min="10" max="5000" step="10">
          </div>
          <div class="control-row">
            <button class="btn-action" id="batchBtn" aria-label="Run Batch" aria-keyshortcuts="b">Run Batch</button>
            <button class="btn-utility" id="clearBtn" aria-label="Clear Histogram">Clear</button>
          </div>
          <div class="progress-bar-container" id="progressArea">
            <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
            <div class="progress-text" id="progressText" role="status" aria-live="polite"></div>
          </div>
        </div>
      </details>

      <div class="stats-bar">
        <div class="stats-inline" role="status" aria-live="polite">
          <div class="stat"><span class="stat-label">N</span><span class="stat-value" id="statN">—</span></div>
          <div class="stat"><span class="stat-label">ω(0)</span><span class="stat-value" id="statOmega">—</span></div>
          <div class="stat"><span class="stat-label">h(0)</span><span class="stat-value" id="statH">—</span></div>
          <div class="stat"><span class="stat-label">Samples</span><span class="stat-value" id="statSamples">0</span></div>
        </div>
      </div>

    </div>
  </aside>

  <main class="visualization-panel">
    <div class="profile-row">
      <div class="profile-container">
        <span class="profile-label">Plancherel</span>
        <canvas id="plancherelCanvas" width="600" height="360"></canvas>
      </div>
      <div class="profile-container">
        <span class="profile-label">TASEP height function</span>
        <canvas id="tasepCanvas" width="600" height="360"></canvas>
      </div>
    </div>
    <div class="profile-row">
      <div class="profile-container">
        <span class="profile-label">Plancherel (center)</span>
        <canvas id="plancherelZoomCanvas" width="600" height="240"></canvas>
      </div>
      <div class="profile-container">
        <span class="profile-label">TASEP (center)</span>
        <canvas id="tasepZoomCanvas" width="600" height="240"></canvas>
      </div>
    </div>
    <div class="histogram-container">
      <canvas id="histogramCanvas" width="1200" height="280"></canvas>
    </div>
  </main>
</div>

<button class="sample-fab" id="sampleFab" aria-label="Sample">&#9654;</button>

<script>
(async function() {
  'use strict';

  // ─── WASM Init ───
  let W = null;

  // ─── State ───
  let currentN = 2000;
  let animationId = null;
  let isAnimating = false;
  let isBatching = false;
  let batchCancelRequested = false;
  const plancherelDeviations = [];
  const tasepDeviations = [];
  let lastPlancherelDraw = null;
  let lastTasepDraw = null;

  // ─── DOM refs ───
  const nInput = document.getElementById('nInput');
  const nSlider = document.getElementById('nSlider');
  const sampleBtn = document.getElementById('sampleBtn');
  const animateBtn = document.getElementById('animateBtn');
  const batchBtn = document.getElementById('batchBtn');
  const clearBtn = document.getElementById('clearBtn');
  const speedSlider = document.getElementById('speedSlider');
  const batchInput = document.getElementById('batchInput');
  const progressArea = document.getElementById('progressArea');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const plancherelCanvas = document.getElementById('plancherelCanvas');
  const tasepCanvas = document.getElementById('tasepCanvas');
  const plancherelZoomCanvas = document.getElementById('plancherelZoomCanvas');
  const tasepZoomCanvas = document.getElementById('tasepZoomCanvas');
  const histogramCanvas = document.getElementById('histogramCanvas');
  const sampleFab = document.getElementById('sampleFab');

  // ─── Utility ───
  function expRandom() { return -Math.log(1 - Math.random()); }
  function yieldFrame() { return new Promise(requestAnimationFrame); }

  // ─── WASM wrappers ───
  function wasmPlancherelGrow(N) {
    W._plancherelGrow(N);
  }

  function wasmProfileHeightAtZero() {
    return W._profileHeightAtZero();
  }

  function wasmRussianProfile() {
    const len = W._computeRussianProfile();
    const ptrU = W._getProfileU();
    const ptrV = W._getProfileV();
    // Read immediately before any other WASM call (buffer may move with ALLOW_MEMORY_GROWTH)
    const uArr = new Float64Array(W.HEAPF64.buffer, ptrU, len);
    const vArr = new Float64Array(W.HEAPF64.buffer, ptrV, len);
    const pts = new Array(len);
    for (let i = 0; i < len; i++) {
      pts[i] = { u: uArr[i], v: vArr[i] };
    }
    return pts;
  }

  function wasmTasepSimulate(N) {
    return W._tasepSimulate(N); // returns time
  }

  function wasmTasepHeightAtZero() {
    return W._tasepHeightAtZero();
  }

  function wasmHeightFunction(xMin, xMax) {
    const len = W._computeHeightFunction(xMin, xMax);
    const ptrX = W._getHeightX();
    const ptrH = W._getHeightH();
    const xArr = new Float64Array(W.HEAPF64.buffer, ptrX, len);
    const hArr = new Float64Array(W.HEAPF64.buffer, ptrH, len);
    const pts = new Array(len);
    for (let i = 0; i < len; i++) {
      pts[i] = { x: xArr[i], h: hArr[i] };
    }
    return pts;
  }

  // ─── JS RSK (kept for animation only) ───
  function rskInsert(tableau, x) {
    let val = x;
    for (let r = 0; r < tableau.length; r++) {
      const row = tableau[r];
      let pos = -1;
      for (let j = 0; j < row.length; j++) {
        if (row[j] > val) { pos = j; break; }
      }
      if (pos === -1) {
        row.push(val);
        return;
      }
      const bumped = row[pos];
      row[pos] = val;
      val = bumped;
    }
    tableau.push([val]);
  }

  function jsRussianProfile(lambda) {
    const ell = lambda.length;
    if (ell === 0) return [{ u: 0, v: 0 }];
    const points = [];
    let currU = -ell, currV = ell;
    points.push({ u: currU, v: currV });
    let j = 0;
    for (let i = ell - 1; i >= 0; i--) {
      const rightSteps = lambda[i] - j;
      if (rightSteps > 0) {
        currU += rightSteps;
        currV += rightSteps;
        points.push({ u: currU, v: currV });
      }
      j = lambda[i];
      currU += 1;
      currV -= 1;
      points.push({ u: currU, v: currV });
    }
    return points;
  }

  function jsProfileHeightAtZero(lambda) {
    let count = 0;
    for (let k = 0; k < lambda.length; k++) {
      if (lambda[k] >= k + 1) count++; else break;
    }
    return 2 * count;
  }

  function jsHeightFunction(particles, xMin, xMax) {
    const occupied = new Set();
    for (const p of particles) occupied.add(Math.round(p));
    const pts = [];
    let countRight = 0;
    for (const p of particles) {
      if (Math.round(p) > xMin) countRight++;
    }
    let h = 2 * countRight + xMin;
    pts.push({ x: xMin, h: h });
    for (let x = xMin + 1; x <= xMax; x++) {
      h += (1 - 2 * (occupied.has(x) ? 1 : 0));
      pts.push({ x, h });
    }
    return pts;
  }

  // ─── Limit shapes (JS — just math, fast) ───
  function vklsOmega(x) {
    if (Math.abs(x) >= 2) return Math.abs(x);
    return (2 / Math.PI) * (x * Math.asin(x / 2) + Math.sqrt(4 - x * x));
  }

  function vklsCurve(N, numPoints) {
    const sqN = Math.sqrt(N);
    const pts = [];
    for (let i = 0; i <= numPoints; i++) {
      const x = -2 + (4 * i / numPoints);
      pts.push({ u: x * sqN, v: vklsOmega(x) * sqN });
    }
    return pts;
  }

  function tasepLimitCurve(t, xMin, xMax, numPoints) {
    const pts = [];
    for (let i = 0; i <= numPoints; i++) {
      const x = xMin + (xMax - xMin) * i / numPoints;
      pts.push({ x, h: Math.abs(x) >= t ? Math.abs(x) : t / 2 + (x * x) / (2 * t) });
    }
    return pts;
  }

  // ─── Canvas Drawing ───
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  function getColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function drawProfile(canvas, profilePts, limitPts, colorVar, fillVar, label, centerVal, limitCenterVal) {
    const { ctx, w, h } = setupCanvas(canvas);
    const margin = { top: 30, right: 20, bottom: 30, left: 45 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;

    ctx.clearRect(0, 0, w, h);

    if (!profilePts || profilePts.length === 0) {
      ctx.fillStyle = getColor('--text-secondary');
      ctx.font = '14px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press Sample or Animate', w / 2, h / 2);
      return;
    }

    // Determine axis ranges from profile points
    const uKey = profilePts[0].u !== undefined ? 'u' : 'x';
    const vKey = profilePts[0].v !== undefined ? 'v' : 'h';

    let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
    for (const p of profilePts) {
      if (p[uKey] < uMin) uMin = p[uKey];
      if (p[uKey] > uMax) uMax = p[uKey];
      if (p[vKey] < vMin) vMin = p[vKey];
      if (p[vKey] > vMax) vMax = p[vKey];
    }
    if (limitPts) {
      for (const p of limitPts) {
        const uk = p[uKey] !== undefined ? p[uKey] : p.x;
        const vk = p[vKey] !== undefined ? p[vKey] : p.h;
        if (uk < uMin) uMin = uk;
        if (uk > uMax) uMax = uk;
        if (vk < vMin) vMin = vk;
        if (vk > vMax) vMax = vk;
      }
    }
    // Add padding
    const uPad = (uMax - uMin) * 0.05 || 1;
    const vPad = (vMax - vMin) * 0.05 || 1;
    uMin -= uPad; uMax += uPad;
    vMin = Math.min(vMin, 0) - vPad * 0.5;
    vMax += vPad;

    function toX(u) { return margin.left + (u - uMin) / (uMax - uMin) * pw; }
    function toY(v) { return margin.top + ph - (v - vMin) / (vMax - vMin) * ph; }

    // Grid / axes
    ctx.strokeStyle = getColor('--border-color') || '#e0e0e0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, toY(0));
    ctx.lineTo(w - margin.right, toY(0));
    ctx.stroke();

    // |u| baseline (V-shape: the "empty" profile before any growth)
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(toX(uMin), toY(Math.abs(uMin)));
    ctx.lineTo(toX(0), toY(0));
    ctx.lineTo(toX(uMax), toY(Math.abs(uMax)));
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertical center line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(toX(0), margin.top);
    ctx.lineTo(toX(0), h - margin.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Fill under profile
    const fillColor = getColor(fillVar);
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(toX(profilePts[0][uKey]), toY(0));
    for (const p of profilePts) {
      ctx.lineTo(toX(p[uKey]), toY(p[vKey]));
    }
    ctx.lineTo(toX(profilePts[profilePts.length - 1][uKey]), toY(0));
    ctx.closePath();
    ctx.fill();

    // Profile line
    const lineColor = getColor(colorVar);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < profilePts.length; i++) {
      const fn = i === 0 ? 'moveTo' : 'lineTo';
      ctx[fn](toX(profilePts[i][uKey]), toY(profilePts[i][vKey]));
    }
    ctx.stroke();

    // Limit shape (dashed)
    if (limitPts && limitPts.length > 0) {
      const limUKey = limitPts[0].u !== undefined ? 'u' : 'x';
      const limVKey = limitPts[0].v !== undefined ? 'v' : 'h';
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < limitPts.length; i++) {
        const fn = i === 0 ? 'moveTo' : 'lineTo';
        ctx[fn](toX(limitPts[i][limUKey]), toY(limitPts[i][limVKey]));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    // Center value annotation
    if (centerVal !== undefined) {
      const cx = toX(0);
      const cy = toY(centerVal);
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = '12px "SF Mono", Monaco, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(centerVal.toFixed(1), cx + 8, cy - 6);
      if (limitCenterVal !== undefined) {
        ctx.globalAlpha = 0.5;
        ctx.fillText('(' + limitCenterVal.toFixed(1) + ')', cx + 8, cy + 10);
        ctx.globalAlpha = 1;
      }
    }

    // Axis labels
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '11px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(uKey === 'u' ? 'u' : 'x', w / 2, h - 4);
    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(vKey === 'v' ? 'ω(u)' : 'h(x,t)', 0, 0);
    ctx.restore();
  }

  // ─── Zoomed Center View ───
  function drawZoomed(canvas, profilePts, limitPts, colorVar, fillVar, centerVal, limitCenterVal, zoomRadius) {
    const { ctx, w, h } = setupCanvas(canvas);
    const margin = { top: 20, right: 15, bottom: 25, left: 40 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;

    ctx.clearRect(0, 0, w, h);

    if (!profilePts || profilePts.length === 0) {
      ctx.fillStyle = getColor('--text-secondary');
      ctx.font = '13px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Zoomed view after sampling', w / 2, h / 2);
      return;
    }

    const uKey = profilePts[0].u !== undefined ? 'u' : 'x';
    const vKey = profilePts[0].v !== undefined ? 'v' : 'h';

    // Fixed x-range centered on 0
    const uMin = -zoomRadius, uMax = zoomRadius;

    // Filter points to zoom window (with 1 extra on each side for continuity)
    const inRange = [];
    for (let i = 0; i < profilePts.length; i++) {
      const u = profilePts[i][uKey];
      if (u >= uMin && u <= uMax) {
        inRange.push(profilePts[i]);
      } else if (inRange.length === 0 && i + 1 < profilePts.length && profilePts[i + 1][uKey] >= uMin) {
        inRange.push(profilePts[i]);
      } else if (inRange.length > 0 && u > uMax) {
        inRange.push(profilePts[i]);
        break;
      }
    }
    if (inRange.length === 0) return;

    // y-range: auto from visible data
    let vMin = Infinity, vMax = -Infinity;
    for (const p of inRange) {
      if (p[vKey] < vMin) vMin = p[vKey];
      if (p[vKey] > vMax) vMax = p[vKey];
    }
    // Include limit curve points in y-range
    if (limitPts) {
      const limUKey = limitPts[0].u !== undefined ? 'u' : 'x';
      const limVKey = limitPts[0].v !== undefined ? 'v' : 'h';
      for (const p of limitPts) {
        if (p[limUKey] >= uMin && p[limUKey] <= uMax) {
          if (p[limVKey] < vMin) vMin = p[limVKey];
          if (p[limVKey] > vMax) vMax = p[limVKey];
        }
      }
    }
    const vPad = (vMax - vMin) * 0.08 || 1;
    vMin -= vPad; vMax += vPad;

    function toX(u) { return margin.left + (u - uMin) / (uMax - uMin) * pw; }
    function toY(v) { return margin.top + ph - (v - vMin) / (vMax - vMin) * ph; }

    // Vertical center line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(toX(0), margin.top);
    ctx.lineTo(toX(0), h - margin.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Fill under profile (clipped to zoom window)
    const fillColor = getColor(fillVar);
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(toX(inRange[0][uKey]), toY(vMin));
    for (const p of inRange) ctx.lineTo(toX(p[uKey]), toY(p[vKey]));
    ctx.lineTo(toX(inRange[inRange.length - 1][uKey]), toY(vMin));
    ctx.closePath();
    ctx.fill();

    // Profile line
    const lineColor = getColor(colorVar);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < inRange.length; i++) {
      ctx[i === 0 ? 'moveTo' : 'lineTo'](toX(inRange[i][uKey]), toY(inRange[i][vKey]));
    }
    ctx.stroke();

    // Limit shape (dashed)
    if (limitPts && limitPts.length > 0) {
      const limUKey = limitPts[0].u !== undefined ? 'u' : 'x';
      const limVKey = limitPts[0].v !== undefined ? 'v' : 'h';
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (const p of limitPts) {
        if (p[limUKey] >= uMin && p[limUKey] <= uMax) {
          ctx[started ? 'lineTo' : 'moveTo'](toX(p[limUKey]), toY(p[limVKey]));
          started = true;
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    // Center value annotation
    if (centerVal !== undefined) {
      const cx = toX(0), cy = toY(centerVal);
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = '12px "SF Mono", Monaco, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(centerVal.toFixed(1), cx + 8, cy - 6);
      if (limitCenterVal !== undefined) {
        ctx.globalAlpha = 0.5;
        ctx.fillText('limit: ' + limitCenterVal.toFixed(1), cx + 8, cy + 10);
        ctx.globalAlpha = 1;
        // Draw deviation
        const dev = centerVal - limitCenterVal;
        ctx.fillStyle = Math.abs(dev) > 3 ? '#c00' : lineColor;
        ctx.fillText('Δ=' + dev.toFixed(2), cx + 8, cy + 24);
      }
    }
  }

  // ─── Histogram Drawing ───
  function drawHistogram() {
    const { ctx, w, h } = setupCanvas(histogramCanvas);
    const margin = { top: 20, right: 20, bottom: 35, left: 50 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;

    ctx.clearRect(0, 0, w, h);

    if (plancherelDeviations.length === 0 && tasepDeviations.length === 0) {
      ctx.fillStyle = getColor('--text-secondary');
      ctx.font = '14px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Run Batch to accumulate fluctuation histograms', w / 2, h / 2);
      return;
    }

    // Compute range
    const allData = [...plancherelDeviations, ...tasepDeviations];
    let dMin = d3.min(allData), dMax = d3.max(allData);
    const pad = Math.max(1, (dMax - dMin) * 0.1);
    dMin -= pad; dMax += pad;

    const numBins = 40;
    const xScale = d3.scaleLinear().domain([dMin, dMax]).range([margin.left, w - margin.right]);
    const binner = d3.bin().domain([dMin, dMax]).thresholds(numBins);

    const pBins = binner(plancherelDeviations);
    const tBins = binner(tasepDeviations);

    // Normalize
    const binWidth = pBins.length > 0 ? (pBins[0].x1 - pBins[0].x0) : 1;
    const pNorm = pBins.map(b => ({ ...b, density: plancherelDeviations.length > 0 ? b.length / (plancherelDeviations.length * binWidth) : 0 }));
    const tNorm = tBins.map(b => ({ ...b, density: tasepDeviations.length > 0 ? b.length / (tasepDeviations.length * binWidth) : 0 }));

    const maxDensity = Math.max(
      d3.max(pNorm, d => d.density) || 0,
      d3.max(tNorm, d => d.density) || 0
    );
    const yScale = d3.scaleLinear().domain([0, maxDensity * 1.1]).range([h - margin.bottom, margin.top]);

    // Axes
    ctx.strokeStyle = getColor('--border-color') || '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, h - margin.bottom);
    ctx.lineTo(w - margin.right, h - margin.bottom);
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, h - margin.bottom);
    ctx.stroke();

    // Axis ticks
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '10px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'center';
    const xTicks = xScale.ticks(8);
    for (const t of xTicks) {
      const tx = xScale(t);
      ctx.fillText(t.toFixed(0), tx, h - margin.bottom + 14);
      ctx.strokeStyle = getColor('--border-color');
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tx, h - margin.bottom);
      ctx.lineTo(tx, h - margin.bottom + 4);
      ctx.stroke();
    }

    // Zero line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xScale(0), margin.top);
    ctx.lineTo(xScale(0), h - margin.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plancherel bars
    const pColor = getColor('--plancherel-color') || '#232D4B';
    ctx.fillStyle = pColor;
    ctx.globalAlpha = 0.5;
    for (const b of pNorm) {
      const bx = xScale(b.x0);
      const bw = xScale(b.x1) - bx;
      const by = yScale(b.density);
      const bh = yScale(0) - by;
      ctx.fillRect(bx, by, bw, bh);
    }

    // TASEP bars
    const tColor = getColor('--tasep-color') || '#E57200';
    ctx.fillStyle = tColor;
    for (const b of tNorm) {
      const bx = xScale(b.x0);
      const bw = xScale(b.x1) - bx;
      const by = yScale(b.density);
      const bh = yScale(0) - by;
      ctx.fillRect(bx, by, bw, bh);
    }
    ctx.globalAlpha = 1;

    // Legend
    ctx.font = '12px "franklingothic-book", Arial, sans-serif';
    const lx = w - margin.right - 200;
    const ly = margin.top + 10;
    ctx.fillStyle = pColor;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(lx, ly, 14, 14);
    ctx.globalAlpha = 1;
    ctx.fillStyle = getColor('--text-primary');
    ctx.textAlign = 'left';
    const pSD = plancherelDeviations.length > 1 ? d3.deviation(plancherelDeviations) : 0;
    ctx.fillText('Plancherel ω(0)−E (sd=' + (pSD || 0).toFixed(2) + ')', lx + 20, ly + 12);

    ctx.fillStyle = tColor;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(lx, ly + 22, 14, 14);
    ctx.globalAlpha = 1;
    ctx.fillStyle = getColor('--text-primary');
    const tSD = tasepDeviations.length > 1 ? d3.deviation(tasepDeviations) : 0;
    ctx.fillText('TASEP h(0)−E (sd=' + (tSD || 0).toFixed(2) + ')', lx + 20, ly + 34);

    // X-axis label
    ctx.fillStyle = getColor('--text-secondary');
    ctx.textAlign = 'center';
    ctx.font = '11px "franklingothic-book", Arial, sans-serif';
    ctx.fillText('Deviation from limit shape at center', w / 2, h - 2);
  }

  // ─── Update stats display ───
  function updateStats(N, omega0, h0, limitOmega, limitH) {
    document.getElementById('statN').textContent = N;
    document.getElementById('statOmega').textContent =
      omega0 !== null ? omega0.toFixed(1) + ' (' + (omega0 - limitOmega).toFixed(2) + ')' : '—';
    document.getElementById('statH').textContent =
      h0 !== null ? h0.toFixed(1) + ' (' + (h0 - limitH).toFixed(2) + ')' : '—';
    document.getElementById('statSamples').textContent = plancherelDeviations.length;
  }

  // ─── Run one sample and draw (WASM) ───
  async function runAndDraw(N, addToHistogram) {
    disableControls(true);
    drawLoading(plancherelCanvas, 'Computing…');
    drawLoading(tasepCanvas, 'Computing…');
    await yieldFrame();

    // Plancherel via WASM
    wasmPlancherelGrow(N);
    const omega0 = wasmProfileHeightAtZero();
    const profile = wasmRussianProfile();
    const sqN = Math.sqrt(N);
    const limitOmega0 = (4 / Math.PI) * sqN;
    const limitCurve = vklsCurve(N, 200);

    const uMinProf = profile[0].u;
    const uMaxProf = profile[profile.length - 1].u;
    const extProfile = [
      { u: uMinProf - 10, v: Math.abs(uMinProf - 10) },
      ...profile,
      { u: uMaxProf + 10, v: Math.abs(uMaxProf + 10) }
    ];
    const extLimit = [
      { u: uMinProf - 10, v: Math.abs(uMinProf - 10) },
      ...limitCurve,
      { u: uMaxProf + 10, v: Math.abs(uMaxProf + 10) }
    ];

    lastPlancherelDraw = { pts: extProfile, limit: extLimit, centerVal: omega0, limitCenter: limitOmega0 };
    drawProfile(plancherelCanvas, extProfile, extLimit, '--plancherel-color', '--plancherel-fill', 'Plancherel', omega0, limitOmega0);
    const zoomR = Math.max(10, Math.ceil(Math.pow(N, 2/3) * 0.3));
    drawZoomed(plancherelZoomCanvas, extProfile, extLimit, '--plancherel-color', '--plancherel-fill', omega0, limitOmega0, zoomR);

    // TASEP via WASM
    const t = wasmTasepSimulate(N);
    const limitH0 = t / 2;
    const xRange = Math.ceil(t * 1.15);
    const hFunc = wasmHeightFunction(-xRange, xRange);
    const h0 = wasmTasepHeightAtZero();
    const hLimitCurve = tasepLimitCurve(t, -xRange, xRange, 300);

    lastTasepDraw = { pts: hFunc, limit: hLimitCurve, centerVal: h0, limitCenter: limitH0 };
    drawProfile(tasepCanvas, hFunc, hLimitCurve, '--tasep-color', '--tasep-fill', 'TASEP', h0, limitH0);
    const tZoom = zoomR;
    drawZoomed(tasepZoomCanvas, hFunc, hLimitCurve, '--tasep-color', '--tasep-fill', h0, limitH0, tZoom);

    if (addToHistogram) {
      plancherelDeviations.push(omega0 - limitOmega0);
      tasepDeviations.push(h0 - limitH0);
      drawHistogram();
    }

    updateStats(N, omega0, h0, limitOmega0, limitH0);
    disableControls(false);
  }

  // ─── Animation (JS RSK for incremental Plancherel, JS TASEP replay) ───
  async function startAnimation(N) {
    if (isAnimating) { stopAnimation(); return; }
    isAnimating = true;
    animateBtn.textContent = 'Stop';
    disableControls(true);
    animateBtn.disabled = false;

    drawLoading(plancherelCanvas, 'Pre-generating…');
    drawLoading(tasepCanvas, 'Pre-generating…');
    await yieldFrame();

    const rskValues = Array.from({ length: N }, () => Math.random());
    const tableau = [];
    let pStep = 0;

    // Pre-generate TASEP moves via WASM (O(N log M) with min-heap)
    const moveCount = W._tasepPregenerate(N);
    const M = Math.ceil(3 * Math.sqrt(N)) + 10;
    const movesPtr = W._getTasepMoves();
    const timesPtr = W._getTasepTimes();
    const moves = new Int32Array(W.HEAP32.buffer, movesPtr, moveCount);
    const times = new Float64Array(W.HEAPF64.buffer, timesPtr, moveCount);

    const animParticles = new Float64Array(M);
    for (let k = 0; k < M; k++) animParticles[k] = -k;
    let tStep = 0;

    function frame() {
      if (!isAnimating) return;
      const speed = parseInt(speedSlider.value);
      const stepsPerFrame = Math.max(1, Math.ceil(N * speed / 2000));
      const targetStep = Math.min(N, pStep + stepsPerFrame);

      while (pStep < targetStep) { rskInsert(tableau, rskValues[pStep]); pStep++; }
      while (tStep < targetStep) { animParticles[moves[tStep]]++; tStep++; }

      const lambda = tableau.map(row => row.length);
      const profile = jsRussianProfile(lambda);
      const omega0 = jsProfileHeightAtZero(lambda);
      const sqN = Math.sqrt(N);
      const limitOmega0 = (4 / Math.PI) * sqN;
      const limitCurve = vklsCurve(N, 200);

      const uMinP = profile[0].u, uMaxP = profile[profile.length - 1].u;
      const ext = [
        { u: Math.min(uMinP, -2*sqN)-5, v: Math.abs(Math.min(uMinP, -2*sqN)-5) },
        ...profile,
        { u: Math.max(uMaxP, 2*sqN)+5, v: Math.abs(Math.max(uMaxP, 2*sqN)+5) }
      ];
      const extLim = [
        { u: Math.min(uMinP, -2*sqN)-5, v: Math.abs(Math.min(uMinP, -2*sqN)-5) },
        ...limitCurve,
        { u: Math.max(uMaxP, 2*sqN)+5, v: Math.abs(Math.max(uMaxP, 2*sqN)+5) }
      ];
      drawProfile(plancherelCanvas, ext, extLim, '--plancherel-color', '--plancherel-fill', 'Plancherel', omega0, limitOmega0);
      drawZoomed(plancherelZoomCanvas, ext, extLim, '--plancherel-color', '--plancherel-fill', omega0, limitOmega0, Math.max(10, Math.ceil(Math.pow(N, 2/3)*0.3)));

      const tTime = tStep > 0 ? times[tStep-1] : 0;
      const limitH0 = tTime / 2;
      const tXRange = Math.max(20, Math.ceil(Math.sqrt(6*N)*1.2));
      const hFunc = jsHeightFunction(Array.from(animParticles).slice(0,M), -tXRange, tXRange);
      const hLim = tasepLimitCurve(Math.max(tTime,1), -tXRange, tXRange, 300);
      const h0Pt = hFunc.find(p => p.x === 0);
      const h0 = h0Pt ? h0Pt.h : 0;
      drawProfile(tasepCanvas, hFunc, hLim, '--tasep-color', '--tasep-fill', 'TASEP', h0, limitH0);
      drawZoomed(tasepZoomCanvas, hFunc, hLim, '--tasep-color', '--tasep-fill', h0, limitH0, Math.max(10, Math.ceil(Math.pow(N, 2/3)*0.3)));

      updateStats(pStep, omega0, h0, limitOmega0, limitH0);

      if (pStep >= N) {
        plancherelDeviations.push(omega0 - limitOmega0);
        tasepDeviations.push(h0 - limitH0);
        drawHistogram();
        stopAnimation();
        return;
      }
      animationId = requestAnimationFrame(frame);
    }
    animationId = requestAnimationFrame(frame);
  }

  function stopAnimation() {
    isAnimating = false;
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    animateBtn.textContent = 'Animate';
    disableControls(false);
  }

  // ─── Batch Sampling ───
  async function runBatch(N, count) {
    if (isBatching) return;
    isBatching = true;
    batchCancelRequested = false;
    disableControls(true);
    batchBtn.disabled = false;
    batchBtn.textContent = 'Stop';
    progressArea.style.display = 'block';

    let completed = 0;
    const sqN = Math.sqrt(N);
    const limitOmega0 = (4 / Math.PI) * sqN;
    let lastYield = performance.now();
    const startTime = performance.now();

    while (completed < count && !batchCancelRequested) {
      wasmPlancherelGrow(N);
      const omega0 = wasmProfileHeightAtZero();
      plancherelDeviations.push(omega0 - limitOmega0);

      const tTime = wasmTasepSimulate(N);
      const h0 = wasmTasepHeightAtZero();
      const limitH0 = tTime / 2;
      tasepDeviations.push(h0 - limitH0);

      completed++;
      const now = performance.now();
      // Yield to browser every ~80ms to keep UI responsive
      if (now - lastYield > 80 || completed === count) {
        const pct = Math.round((completed / count) * 100);
        progressFill.style.width = pct + '%';
        const elapsed = (now - startTime) / 1000;
        const rate = completed / elapsed;
        const remaining = (count - completed) / rate;
        const pSD = plancherelDeviations.length > 1 ? d3.deviation(plancherelDeviations) : 0;
        const tSD = tasepDeviations.length > 1 ? d3.deviation(tasepDeviations) : 0;
        progressText.textContent =
          completed + '/' + count +
          ' · ' + rate.toFixed(1) + '/s' +
          ' · ~' + Math.ceil(remaining) + 's left' +
          ' · sd: ' + (pSD || 0).toFixed(2) + ' vs ' + (tSD || 0).toFixed(2);
        document.getElementById('statSamples').textContent = plancherelDeviations.length;
        drawHistogram();
        await yieldFrame();
        lastYield = performance.now();
      }
    }

    isBatching = false;
    batchCancelRequested = false;
    batchBtn.textContent = 'Run Batch';
    progressArea.style.display = 'none';
    disableControls(false);
    drawHistogram();
    updateStats(N, null, null, 0, 0);
  }

  function disableControls(disabled) {
    sampleBtn.disabled = disabled;
    animateBtn.disabled = disabled;
    batchBtn.disabled = disabled;
    nInput.disabled = disabled;
    nSlider.disabled = disabled;
    batchInput.disabled = disabled;
    if (sampleFab) sampleFab.disabled = disabled;
  }

  // ─── Event Listeners ───
  function clearHistogramOnNChange(newN) {
    if (plancherelDeviations.length > 0 || tasepDeviations.length > 0) {
      plancherelDeviations.length = 0;
      tasepDeviations.length = 0;
      drawHistogram();
      document.getElementById('statSamples').textContent = '0';
    }
  }

  nInput.addEventListener('input', () => {
    const v = Math.max(100, Math.min(200000, parseInt(nInput.value) || 2000));
    nSlider.value = v;
    if (v !== currentN) clearHistogramOnNChange(v);
    currentN = v;
  });
  nSlider.addEventListener('input', () => {
    nInput.value = nSlider.value;
    const v = parseInt(nSlider.value);
    if (v !== currentN) clearHistogramOnNChange(v);
    currentN = v;
  });

  sampleBtn.addEventListener('click', async () => {
    currentN = parseInt(nInput.value) || 2000;
    await runAndDraw(currentN, true);
  });

  animateBtn.addEventListener('click', () => {
    currentN = parseInt(nInput.value) || 2000;
    startAnimation(currentN);
  });

  batchBtn.addEventListener('click', () => {
    if (isBatching) {
      batchCancelRequested = true;
      return;
    }
    currentN = parseInt(nInput.value) || 2000;
    const count = parseInt(batchInput.value) || 200;
    runBatch(currentN, count);
  });

  clearBtn.addEventListener('click', () => {
    plancherelDeviations.length = 0;
    tasepDeviations.length = 0;
    drawHistogram();
    document.getElementById('statSamples').textContent = '0';
  });

  if (sampleFab) {
    sampleFab.addEventListener('click', async () => {
      currentN = parseInt(nInput.value) || 2000;
      await runAndDraw(currentN, true);
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      if (!sampleBtn.disabled) sampleBtn.click();
    } else if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      if (!animateBtn.disabled) animateBtn.click();
    } else if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      if (!batchBtn.disabled) batchBtn.click();
    } else if (e.key === ' ') {
      e.preventDefault();
      if (isAnimating) stopAnimation();
    }
  });

  // Mobile drawer
  const drawerHandle = document.getElementById('drawerHandle');
  const controlsPanel = document.getElementById('controlsPanel');
  if (drawerHandle && controlsPanel) {
    drawerHandle.addEventListener('click', () => {
      if (window.innerWidth >= 992) return;
      controlsPanel.classList.toggle('expanded');
    });
  }

  // Canvas resize
  function handleResize() {
    const zR = Math.max(10, Math.ceil(Math.pow(currentN, 2/3) * 0.3));
    if (lastPlancherelDraw) {
      drawProfile(plancherelCanvas, lastPlancherelDraw.pts, lastPlancherelDraw.limit,
        '--plancherel-color', '--plancherel-fill',
        'Plancherel', lastPlancherelDraw.centerVal, lastPlancherelDraw.limitCenter);
      drawZoomed(plancherelZoomCanvas, lastPlancherelDraw.pts, lastPlancherelDraw.limit,
        '--plancherel-color', '--plancherel-fill',
        lastPlancherelDraw.centerVal, lastPlancherelDraw.limitCenter, zR);
    } else {
      drawProfile(plancherelCanvas, null, null, '--plancherel-color', '--plancherel-fill', 'Plancherel');
      drawZoomed(plancherelZoomCanvas, null, null, '--plancherel-color', '--plancherel-fill', undefined, undefined, 10);
    }
    if (lastTasepDraw) {
      drawProfile(tasepCanvas, lastTasepDraw.pts, lastTasepDraw.limit,
        '--tasep-color', '--tasep-fill',
        'TASEP', lastTasepDraw.centerVal, lastTasepDraw.limitCenter);
      drawZoomed(tasepZoomCanvas, lastTasepDraw.pts, lastTasepDraw.limit,
        '--tasep-color', '--tasep-fill',
        lastTasepDraw.centerVal, lastTasepDraw.limitCenter, zR);
    } else {
      drawProfile(tasepCanvas, null, null, '--tasep-color', '--tasep-fill', 'TASEP');
      drawZoomed(tasepZoomCanvas, null, null, '--tasep-color', '--tasep-fill', undefined, undefined, 10);
    }
    drawHistogram();
  }
  window.addEventListener('resize', () => {
    clearTimeout(window._resizeTimer);
    window._resizeTimer = setTimeout(handleResize, 200);
  });

  // ─── Show loading state, init WASM, then auto-sample ───
  function drawLoading(canvas, msg) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getColor('--text-secondary');
    ctx.font = '14px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, w / 2, h / 2);
  }

  drawLoading(plancherelCanvas, 'Loading WASM…');
  drawLoading(tasepCanvas, 'Loading WASM…');
  drawLoading(plancherelZoomCanvas, '');
  drawLoading(tasepZoomCanvas, '');
  drawHistogram();

  disableControls(true);

  try {
    W = await createPlancherelTASEP();
  } catch (err) {
    console.error('WASM load failed:', err);
    drawLoading(plancherelCanvas, 'WASM failed to load');
    drawLoading(tasepCanvas, 'WASM failed to load');
    return;
  }

  disableControls(false);

  // Initial sample
  currentN = 20000;
  nInput.value = currentN;
  nSlider.value = currentN;
  await runAndDraw(currentN, true);
})();
</script>
