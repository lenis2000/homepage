---
title: Bernoulli TASEP — Empirical Density Profile
model: TASEPs
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/TASEP-like-systems/2026-04-21-bernoulli-tasep.md'
    txt: 'Interactive simulation — see source'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/TASEP-like-systems/2026-04-21-bernoulli-tasep.cpp'
    txt: 'C++ source for WASM (128-bit SIMD Bernoulli sampler)'
a11y-description: "Simulation of Bernoulli TASEP with step initial condition. Particles at sites {-r+1,...,0} each flip a biased coin and (if heads) attempt to jump right by one site; exclusion prevents two particles from occupying the same site. Two update rules: parallel (snapshot-based, simultaneous) and sequential (right-to-left cascading, allowing chains of jumps). Outputs are the averaged empirical density profile as a function of xi = x/T, and the fraction of active particles a_n/n vs time."
---

<details class="math-description" id="defsBlock">
<summary>Definitions, stationary currents, and limit shapes</summary>
<div style="padding: 10px 4px 6px; line-height: 1.55;">

<p><b>Setup.</b> State space $\{0,1\}^{\mathbb{Z}}$; write $\eta_t(x) \in \{0,1\}$ for the occupancy of site $x \in \mathbb{Z}$ at time $t \in \mathbb{Z}_{\ge 0}$. Fix $r \in \mathbb{Z}_{\ge 1}$ and $p \in (0,1]$. Step initial condition: $\eta_0(x) = \mathbf{1}_{-r < x \le 0}$. Let $(\xi_{t,x})_{t \ge 0,\, x \in \mathbb{Z}}$ be i.i.d. $\mathrm{Bernoulli}(p)$.</p>

<p><b>Definition 1</b> (parallel update). <em>$\eta_{t+1}$ is obtained from $\eta_t$ by moving, simultaneously, every particle at $x$ with $\xi_{t,x} = 1$ and $\eta_t(x+1) = 0$.</em></p>

<p><b>Definition 2</b> (right-to-left sequential update). <em>$\eta_{t+1}$ is obtained from $\eta_t$ by processing sites in strict decreasing order of $x$: apply $(\eta(x), \eta(x+1)) \mapsto (0,1)$ whenever the current configuration satisfies $\eta(x) = 1$, $\eta(x+1) = 0$, and $\xi_{t,x} = 1$.</em></p>

<p><b>Proposition 1</b> (Evans–Rajewsky–Speer <a href="#ref-ers">[2]</a>). <em>The stationary current of Definition 1 on $\mathbb{Z}/N\mathbb{Z}$ at density $\rho \in [0,1]$ is</em>
$$j_{\mathrm{par}}(\rho) = \tfrac{1}{2}\!\left(1 - \sqrt{1 - 4p\rho(1-\rho)}\,\right).$$
</p>

<p><b>Proposition 2</b> (Rajewsky–Santen–Schadschneider–Schreckenberg <a href="#ref-rajewsky">[1]</a>). <em>The stationary current of Definition 2 on $\mathbb{Z}/N\mathbb{Z}$ at density $\rho \in [0,1]$ is</em>
$$j_{\mathrm{seq}}(\rho) = \frac{p\,\rho(1-\rho)}{1 - p\rho}.$$
</p>

<p>Both currents are strictly concave on $[0,1]$ for $p \in (0,1)$. At the deterministic boundary $p = 1$ one has $j_{\mathrm{par}}(\rho) = \min(\rho, 1-\rho)$ and $j_{\mathrm{seq}}(\rho) = \rho$.</p>

<p><b>Scaling limit under step initial condition.</b> Under Eulerian scaling $\xi = x/T$, the empirical measure $T^{-1}\sum_k \delta_{x_k(T)/T}$ is expected to converge in probability to $\rho_\infty(\xi)\, d\xi$, where $\rho_\infty$ is the entropy solution of $\partial_t \rho + \partial_x j(\rho) = 0$ with initial data $\rho_0(\xi) = \mathbf{1}_{\xi \le 0}$; see Kipnis–Landim <a href="#ref-kl">[4]</a>. For a strictly concave flux this yields the rarefaction
$$\rho_\infty(\xi) = \begin{cases} 1, & \xi \le j'(1), \\ (j')^{-1}(\xi), & j'(1) < \xi < j'(0), \\ 0, & \xi \ge j'(0). \end{cases}$$
</p>

<p><b>Corollary</b> (explicit fans).</p>

<p><em>Parallel.</em> $j_{\mathrm{par}}'(0) = p$, $j_{\mathrm{par}}'(1) = -p$; on $\xi \in (-p, p)$,
$$\rho_\infty^{\mathrm{par}}(\xi) = \tfrac{1}{2}\!\left(1 - \mathrm{sgn}(\xi)\sqrt{\tfrac{\xi^2(1-p)}{p\,(p - \xi^2)}}\right).$$
</p>

<p><em>Sequential.</em> $j_{\mathrm{seq}}'(0) = p$, $j_{\mathrm{seq}}'(1) = -p/(1-p)$; on $\xi \in \bigl(-\tfrac{p}{1-p},\, p\bigr)$,
$$\rho_\infty^{\mathrm{seq}}(\xi) = \tfrac{1}{p}\!\left(1 - \sqrt{\tfrac{1-p}{1 - \xi}}\,\right).$$
</p>

<h4 style="margin: 14px 0 4px;">References</h4>
<ol style="margin-top: 4px;">
  <li id="ref-rajewsky">N. Rajewsky, L. Santen, A. Schadschneider, M. Schreckenberg. <em>The asymmetric exclusion process: Comparison of update procedures.</em> J. Stat. Phys. <b>92</b> (1998), 151–194.</li>
  <li id="ref-ers">M. R. Evans, N. Rajewsky, E. R. Speer. <em>Exact solution of a cellular automaton for traffic.</em> J. Stat. Phys. <b>95</b> (1999), 45–96. <a href="https://arxiv.org/abs/cond-mat/9903287">arXiv:cond-mat/9903287</a>.</li>
  <li>A. M. Povolotsky, V. B. Priezzhev. <em>Determinant solution for the totally asymmetric exclusion process with parallel update.</em> J. Stat. Mech. (2006), P07002.</li>
  <li id="ref-kl">C. Kipnis, C. Landim. <em>Scaling Limits of Interacting Particle Systems.</em> Grundlehren der mathematischen Wissenschaften <b>320</b>, Springer, 1999.</li>
  <li>A. Borodin, P. L. Ferrari, M. Prähofer, T. Sasamoto. <em>Fluctuation properties of the TASEP with periodic initial configuration.</em> J. Stat. Phys. <b>129</b> (2007), 1055–1080. <a href="https://arxiv.org/abs/math-ph/0608056">arXiv:math-ph/0608056</a>.</li>
</ol>

</div>
</details>

<script>if (window.innerWidth >= 1200) document.getElementById('defsBlock').setAttribute('open', '');</script>

<script src="{{site.url}}/js/2026-04-21-bernoulli-tasep.js"></script>

<style>
details.math-description { margin-bottom: 12px; }
details.math-description summary {
  cursor: pointer;
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--text-secondary, #888);
  text-transform: uppercase; letter-spacing: 0.5px;
}
details.math-description summary:hover { color: var(--accent-color, #E57200); }

:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333;
  --text-secondary: #888;
  --border-color: #e0e0e0;
  --accent-color: #E57200;
  --accent-secondary: #232D4B;
  --curve-par: #E57200;
  --curve-seq: #2a7ab8;
  --curve-limit: #1a7a3a;
}
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #e8e8e8;
  --text-secondary: #aaa;
  --border-color: #444;
  --accent-color: #ff9933;
  --accent-secondary: #4a7ab8;
  --curve-par: #ff9933;
  --curve-seq: #5ba3e0;
  --curve-limit: #4caf72;
}

.simulation-layout {
  display: flex; flex-direction: column;
  max-width: 1400px; margin: 0 auto; padding: 8px; gap: 16px;
}
@media (min-width: 992px) {
  .simulation-layout { flex-direction: row; align-items: flex-start; }
  .controls-panel {
    width: 300px; min-width: 260px; max-width: 340px;
    max-height: calc(100vh - 100px); overflow-y: auto;
    position: sticky; top: 80px;
    background: var(--bg-primary);
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  .controls-panel::-webkit-scrollbar { width: 6px; }
  .controls-panel::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
  .visualization-panel { flex: 1 1 auto; max-width: calc(100% - 320px); }
  .drawer-handle { display: none; }
}

details.control-section {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  margin-bottom: 8px;
}
.control-section summary {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
  cursor: pointer; user-select: none; list-style: none;
  color: var(--text-primary);
}
.control-section summary::-webkit-details-marker { display: none; }
.control-section summary::after {
  content: ''; width: 8px; height: 8px;
  border-right: 2px solid currentColor; border-bottom: 2px solid currentColor;
  transform: rotate(-45deg); transition: transform 0.2s; opacity: 0.6;
}
.control-section[open] summary::after { transform: rotate(45deg); }
.control-section-content {
  padding: 12px 14px; border-top: 1px solid var(--border-color);
  display: flex; flex-direction: column; gap: 10px;
}

.control-row {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
}
.control-row label {
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 13px; font-weight: 600; color: var(--text-primary);
  min-width: fit-content;
}
.control-row input[type="number"] {
  width: 74px; padding: 6px 8px;
  border: 1px solid var(--border-color); border-radius: 4px;
  font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
  background: var(--bg-primary); color: var(--text-primary);
}
.control-row input[type="range"] { flex: 1; min-width: 80px; }
.control-row input[type="radio"] { cursor: pointer; }
.radio-label {
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 13px; color: var(--text-primary); cursor: pointer;
}

.btn-action {
  background: linear-gradient(135deg, #E57200, #f08c30) !important;
  color: white !important; border: 1px solid #E57200 !important;
  font-weight: 600; padding: 8px 16px; border-radius: 4px;
  cursor: pointer; font-size: 13px;
  font-family: "franklingothic-demi", Arial, sans-serif;
}
.btn-action:hover { background: #c96300 !important; }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-action:active:not(:disabled) { transform: scale(0.96); }
.btn-utility {
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--border-color) !important;
  padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;
}
.btn-utility:hover { background: var(--bg-secondary) !important; border-color: #999 !important; }

.stats-bar {
  padding: 10px 14px; border: 1px solid var(--border-color);
  border-radius: 8px; background: var(--bg-secondary); margin-bottom: 8px;
}
.stats-inline { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; }
.stat { display: flex; align-items: center; gap: 4px; }
.stat-label { color: var(--text-secondary); text-transform: uppercase; font-size: 10px; }
.stat-value {
  color: var(--accent-secondary); font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace; font-size: 12px;
}
[data-theme="dark"] .stat-value { color: #d0d0d0; }

.density-container {
  background: var(--bg-secondary); border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06); overflow: hidden;
  margin-bottom: 12px;
}
[data-theme="dark"] .density-container {
  background: #222; box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}
.density-container canvas { display: block; width: 100%; }
.plot-controls {
  display: flex; justify-content: flex-end; align-items: center;
  gap: 8px; padding: 4px 12px 8px;
  font-size: 11px; color: var(--text-secondary);
}
.plot-controls label {
  font-family: "franklingothic-book", Arial, sans-serif;
  margin: 0;
}
.plot-controls select {
  font-size: 11px; padding: 2px 6px;
  background: var(--bg-primary); color: var(--text-primary);
  border: 1px solid var(--border-color); border-radius: 3px;
  font-family: 'SF Mono', Monaco, monospace;
}

.progress-bar-container { display: none; margin-top: 6px; }
.progress-bar {
  width: 100%; height: 6px; background: var(--border-color);
  border-radius: 3px; overflow: hidden;
}
.progress-fill {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, #E57200, #f08c30);
  border-radius: 3px; transition: width 0.15s ease;
}
.progress-text { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

@media (max-width: 991px) {
  .controls-panel {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--bg-primary);
    border-top: 1px solid var(--border-color);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
    z-index: 900; max-height: 70vh;
    transform: translateY(calc(100% - 60px));
    transition: transform 0.3s ease-out;
  }
  .controls-panel.expanded { transform: translateY(0); }
  .drawer-handle {
    display: flex; align-items: center; justify-content: center;
    height: 60px; cursor: grab; flex-shrink: 0;
  }
  .drawer-handle:active { cursor: grabbing; }
  .drawer-handle-bar { width: 40px; height: 4px; background: var(--border-color); border-radius: 2px; }
  .drawer-handle-hint { position: absolute; font-size: 11px; color: #888; margin-top: 24px; }
  .controls-panel.expanded .drawer-handle-hint { display: none; }
  .controls-panel-inner {
    max-height: calc(70vh - 60px); overflow-y: auto; padding: 0 12px 20px;
  }
  .sample-fab {
    display: flex; position: fixed; bottom: 80px; right: 16px;
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, #E57200, #f08c30);
    color: white; border: none; font-size: 20px; cursor: pointer;
    box-shadow: 0 4px 12px rgba(229,114,0,0.4); z-index: 1000;
    align-items: center; justify-content: center;
  }
}
@media (min-width: 992px) { .sample-fab { display: none; } }

.control-section {
  opacity: 0; transform: translateY(8px);
  animation: revealUp 0.3s ease-out forwards;
}
.control-section:nth-child(1) { animation-delay: 0.05s; }
.control-section:nth-child(2) { animation-delay: 0.10s; }
.control-section:nth-child(3) { animation-delay: 0.15s; }
@keyframes revealUp { to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
</style>

<a href="#densityCanvas" class="sr-only sr-only-focusable">Skip to simulation</a>

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
            <label for="rInput">r (particles)</label>
            <input type="number" id="rInput" value="3000" min="100" max="30000" step="100">
          </div>
          <div class="control-row">
            <input type="range" id="rSlider" min="100" max="30000" step="100" value="3000" aria-label="r slider">
          </div>
          <div class="control-row">
            <label for="pInput">p (jump prob)</label>
            <input type="number" id="pInput" value="0.5" min="0.01" max="1.0" step="0.01">
          </div>
          <div class="control-row">
            <input type="range" id="pSlider" min="1" max="100" step="1" value="50" aria-label="p slider">
          </div>
          <div class="control-row">
            <label for="tInput">T (time)</label>
            <input type="number" id="tInput" value="3000" min="100" max="50000" step="100">
          </div>
          <div class="control-row">
            <input type="range" id="tSlider" min="100" max="50000" step="100" value="3000" aria-label="T slider">
          </div>
          <div class="control-row">
            <label for="kInput">K (samples)</label>
            <input type="number" id="kInput" value="20" min="1" max="200" step="1">
          </div>
          <div class="control-row" style="gap:16px;">
            <label style="font-family:'franklingothic-demi',Arial,sans-serif;font-size:13px;font-weight:600;color:var(--text-primary);">Update rule</label>
          </div>
          <div class="control-row" style="gap:12px; flex-wrap:wrap;">
            <label class="radio-label"><input type="radio" name="updateRule" id="ruleParallel" value="0" checked> Parallel</label>
            <label class="radio-label"><input type="radio" name="updateRule" id="ruleSeq" value="1"> Sequential</label>
          </div>
          <div class="control-row" style="gap:8px;">
            <label class="radio-label"><input type="checkbox" id="showLimitChk"> Show limit shape</label>
          </div>
        </div>
      </details>

      <details class="control-section" open>
        <summary>Run</summary>
        <div class="control-section-content">
          <div class="control-row">
            <button class="btn-action" id="runBtn">Run</button>
            <button class="btn-utility" id="clearBtn">Clear</button>
          </div>
          <div class="progress-bar-container" id="progressArea">
            <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
            <div class="progress-text" id="progressText" role="status" aria-live="polite"></div>
          </div>
        </div>
      </details>

      <div class="stats-bar">
        <div class="stats-inline" role="status" aria-live="polite">
          <div class="stat"><span class="stat-label">Samples</span><span class="stat-value" id="statSamples">0</span></div>
          <div class="stat"><span class="stat-label">ms/sample</span><span class="stat-value" id="statMs">—</span></div>
        </div>
      </div>

    </div>
  </aside>

  <main class="visualization-panel">
    <div class="density-container">
      <canvas id="densityCanvas" width="900" height="440"></canvas>
    </div>
    <div class="density-container" style="margin-top: 10px;">
      <canvas id="activeCanvas" width="900" height="500"></canvas>
      <div class="plot-controls">
        <label for="activeZoom">y-zoom:</label>
        <select id="activeZoom">
          <option value="0.5">bottom 50%</option>
          <option value="0.25" selected>bottom 25%</option>
          <option value="0.1">bottom 10%</option>
          <option value="0.05">bottom 5%</option>
          <option value="0.02">bottom 2%</option>
        </select>
      </div>
    </div>
    <div class="density-container" style="margin-top: 10px;">
      <canvas id="jumpsCanvas" width="900" height="500"></canvas>
      <div class="plot-controls">
        <label for="jumpsZoom">y-zoom:</label>
        <select id="jumpsZoom">
          <option value="0.5">bottom 50%</option>
          <option value="0.25" selected>bottom 25%</option>
          <option value="0.1">bottom 10%</option>
          <option value="0.05">bottom 5%</option>
          <option value="0.02">bottom 2%</option>
        </select>
      </div>
    </div>
    <div class="density-container" style="margin-top: 10px;">
      <canvas id="diagramCanvas" width="900" height="360"></canvas>
      <div style="display:flex; justify-content:flex-end; padding: 4px 10px 8px;">
        <button class="btn-utility" id="shuffleDiagBtn" style="font-size:11px; padding:4px 12px;" title="Resample coin flips">Shuffle</button>
      </div>
    </div>
  </main>
</div>

<button class="sample-fab" id="sampleFab" aria-label="Run">&#9654;</button>

<script>
(async function() {
  'use strict';

  // ─── WASM ────────────────────────────────────────────────────────────────
  let W = null;

  // ─── State ───────────────────────────────────────────────────────────────
  const NUM_BINS = 200;
  const XI_MIN = -1.1, XI_MAX = 1.1;
  let allSamples = [];     // each entry: Float64Array(NUM_BINS)
  let sumDensity = new Float64Array(NUM_BINS);
  let activeSamples = [];  // each entry: Float64Array(T) — a_n for n=1..T
  let sumActive = null;    // Float64Array(T)
  let activeT = 0;
  let jumpsSamples = [];   // each entry: Float64Array(T) — cumulative A_n for n=1..T
  let sumJumps = null;     // Float64Array(T)
  let running = false;
  let stopReq = false;
  let lastSampleMs = 0;

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  const rInput       = document.getElementById('rInput');
  const rSlider      = document.getElementById('rSlider');
  const pInput       = document.getElementById('pInput');
  const pSlider      = document.getElementById('pSlider');
  const tInput       = document.getElementById('tInput');
  const tSlider      = document.getElementById('tSlider');
  const kInput       = document.getElementById('kInput');
  const runBtn       = document.getElementById('runBtn');
  const clearBtn     = document.getElementById('clearBtn');
  const sampleFab    = document.getElementById('sampleFab');
  const progressArea = document.getElementById('progressArea');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const statSamples  = document.getElementById('statSamples');
  const statMs       = document.getElementById('statMs');
  const showLimitChk = document.getElementById('showLimitChk');
  const densityCanvas = document.getElementById('densityCanvas');
  const activeCanvas  = document.getElementById('activeCanvas');
  const jumpsCanvas   = document.getElementById('jumpsCanvas');
  const diagramCanvas = document.getElementById('diagramCanvas');
  const activeZoomSel = document.getElementById('activeZoom');
  const jumpsZoomSel  = document.getElementById('jumpsZoom');
  const shuffleDiagBtn = document.getElementById('shuffleDiagBtn');
  const controlsPanel = document.getElementById('controlsPanel');
  const drawerHandle  = document.getElementById('drawerHandle');

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function yieldFrame() { return new Promise(requestAnimationFrame); }

  function getParams() {
    return {
      r: Math.max(100, Math.min(30000, parseInt(rInput.value) || 3000)),
      p: Math.max(0.01, Math.min(1.0, parseFloat(pInput.value) || 0.5)),
      T: Math.max(100, Math.min(50000, parseInt(tInput.value) || 3000)),
      K: Math.max(1, Math.min(200, parseInt(kInput.value) || 20)),
      rule: parseInt(document.querySelector('input[name="updateRule"]:checked').value)
    };
  }

  function getColor(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  // ─── Space-time diagram (rightmost DIAG_R particles × DIAG_T steps, JS sim) ─
  const DIAG_R = 10;
  const DIAG_T = 20;
  let diagramCache = null;

  function runDiagram() {
    const { p, rule } = getParams();
    // Space range: show initial -(DIAG_R-1)..0 and room to the right
    const xMin = -DIAG_R;
    const xMax = DIAG_T + 2;
    const width = xMax - xMin + 1;
    const idx = x => x - xMin;

    let occ = new Array(width).fill(0);
    for (let k = 0; k < DIAG_R; k++) occ[idx(-(DIAG_R - 1) + k)] = 1;

    const frames = [{ occ: occ.slice(), coin: null, moves: null }];

    for (let t = 0; t < DIAG_T; t++) {
      const coin = new Array(width).fill(0);
      for (let i = 0; i < width; i++) if (occ[i]) coin[i] = Math.random() < p ? 1 : 0;

      const newOcc = occ.slice();
      const moves = new Array(width).fill(0);

      if (rule === 0) {
        // Parallel: decide movers from the SNAPSHOT
        const movers = [];
        for (let i = 0; i < width - 1; i++) {
          if (occ[i] && coin[i] && !occ[i + 1]) movers.push(i);
        }
        for (const i of movers) { newOcc[i] = 0; newOcc[i + 1] = 1; moves[i] = 1; }
      } else {
        // Sequential right-to-left: decide on the CURRENT (cascading) state
        for (let i = width - 2; i >= 0; i--) {
          if (newOcc[i] && coin[i] && !newOcc[i + 1]) {
            newOcc[i] = 0; newOcc[i + 1] = 1; moves[i] = 1;
          }
        }
      }
      occ = newOcc;
      frames.push({ occ: occ.slice(), coin, moves });
    }

    diagramCache = { frames, xMin, xMax, width, p, rule };
  }

  function drawArrow(ctx, x1, y1, x2, y2, headSize) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headSize * Math.cos(ang - Math.PI / 6), y2 - headSize * Math.sin(ang - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headSize * Math.cos(ang + Math.PI / 6), y2 - headSize * Math.sin(ang + Math.PI / 6));
    ctx.stroke();
  }

  function drawDiagram() {
    const { ctx, w, h } = setupCanvas(diagramCanvas);
    ctx.clearRect(0, 0, w, h);
    if (!diagramCache) return;
    const { frames, xMin, xMax, width, rule } = diagramCache;
    const rows = frames.length;

    const margin = { top: 34, right: 16, bottom: 38, left: 52 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;
    const cellW = pw / width;
    const cellH = ph / rows;
    const cx = i => margin.left + (i + 0.5) * cellW;
    const cy = t => margin.top + (t + 0.5) * cellH;

    // Faint grid
    ctx.strokeStyle = getColor('--border-color') || '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= width; i++) {
      ctx.beginPath();
      ctx.moveTo(margin.left + i * cellW, margin.top);
      ctx.lineTo(margin.left + i * cellW, margin.top + ph);
      ctx.stroke();
    }
    for (let t = 0; t <= rows; t++) {
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top + t * cellH);
      ctx.lineTo(margin.left + pw, margin.top + t * cellH);
      ctx.stroke();
    }

    // x=0 emphasized
    const zeroIdx = -xMin;
    ctx.strokeStyle = getColor('--text-secondary') || '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left + zeroIdx * cellW, margin.top);
    ctx.lineTo(margin.left + zeroIdx * cellW, margin.top + ph);
    ctx.stroke();

    // Trajectory lines: vertical light-gray for "stayed put" (waiting), diagonal green for "moved",
    // red dashed stub for "heads but blocked"
    const dotRprev = Math.max(2, Math.min(cellW, cellH) * 0.26);
    for (let t = 1; t < rows; t++) {
      const { coin, moves } = frames[t];
      const prevOcc = frames[t - 1].occ;
      for (let i = 0; i < width; i++) {
        if (!prevOcc[i]) continue;
        if (moves[i]) {
          // Moved: green arrow (t-1, i) → (t, i+1)
          ctx.strokeStyle = '#1a7a3a';
          ctx.lineWidth = 2;
          drawArrow(ctx, cx(i), cy(t - 1), cx(i + 1), cy(t), 4);
        } else {
          // Didn't move — vertical "waiting" line connecting the same position across rows
          ctx.strokeStyle = 'rgba(140,140,140,0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx(i), cy(t - 1) + dotRprev);
          ctx.lineTo(cx(i), cy(t) - dotRprev);
          ctx.stroke();
          // If it flipped heads but was blocked, add a short red dashed stub at the particle's row
          if (coin && coin[i]) {
            ctx.strokeStyle = '#c62828';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(cx(i) + cellW * 0.22, cy(t - 1));
            ctx.lineTo(cx(i) + cellW * 0.62, cy(t - 1));
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    // Particles
    const dotR = Math.max(2, Math.min(cellW, cellH) * 0.26);
    ctx.fillStyle = getColor('--text-primary') || '#333';
    for (let t = 0; t < rows; t++) {
      for (let i = 0; i < width; i++) {
        if (frames[t].occ[i]) {
          ctx.beginPath();
          ctx.arc(cx(i), cy(t), dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // X axis labels
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '10px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center';
    const xStep = width > 30 ? 5 : 2;
    for (let i = 0; i < width; i++) {
      const x = xMin + i;
      if (x % xStep === 0) ctx.fillText(x.toString(), cx(i), margin.top + ph + 14);
    }
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '11px "franklingothic-book", Arial, sans-serif';
    ctx.fillText('position x', margin.left + pw / 2, margin.top + ph + 30);

    // Y axis labels (time)
    ctx.textAlign = 'right';
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '10px "franklingothic-book", Arial, sans-serif';
    for (let t = 0; t < rows; t++) {
      if (t % 5 === 0 || t === rows - 1) ctx.fillText('t=' + t, margin.left - 6, cy(t) + 3);
    }

    // Title + legend
    ctx.textAlign = 'left';
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '12px "franklingothic-demi", Arial, sans-serif';
    const label = ruleLabel(rule);
    ctx.fillText('Space-time diagram — rightmost ' + DIAG_R + ' particles, first ' + DIAG_T + ' steps (' + label + ')',
                 margin.left, margin.top - 14);

    // Legend — right-aligned near the right edge of the plot area
    const legY = margin.top - 14;
    ctx.font = '10px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'left';
    let legX = margin.left + pw - 230;
    ctx.strokeStyle = '#1a7a3a';
    ctx.lineWidth = 2;
    drawArrow(ctx, legX, legY, legX + 18, legY - 6, 3);
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.fillText('heads → moved', legX + 24, legY + 3);
    legX += 120;
    ctx.strokeStyle = '#c62828';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(legX, legY); ctx.lineTo(legX + 18, legY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('heads, blocked', legX + 24, legY + 3);
  }

  function refreshDiagram() {
    runDiagram();
    drawDiagram();
  }

  // ─── Hydrodynamic limit (checkbox-gated) ─────────────────────────────────
  function hydroParallel(xi, p) {
    if (p <= 0) return xi <= 0 ? 1 : 0;
    if (xi <= -p) return 1;
    if (xi >= p)  return 0;
    if (xi === 0) return 0.5;
    const sgn = xi < 0 ? -1 : 1;
    const under = xi * xi * (1 - p) / (p * (p - xi * xi));
    if (under < 0) return 0.5;
    return 0.5 * (1 - sgn * Math.sqrt(under));
  }
  function hydroSequential(xi, p) {
    if (p <= 0) return xi <= 0 ? 1 : 0;
    const xiL = p >= 1 ? -1e9 : -p / (1 - p);
    if (xi <= xiL) return 1;
    if (xi >= p)   return 0;
    if (xi >= 1)   return 0;
    const under = (1 - p) / (1 - xi);
    if (under < 0) return 0;
    return (1 / p) * (1 - Math.sqrt(under));
  }
  function computeHydroArray(rule, p) {
    const arr = new Float64Array(NUM_BINS);
    const dxi = (XI_MAX - XI_MIN) / NUM_BINS;
    const fn = (rule === 1) ? hydroSequential : hydroParallel;
    for (let i = 0; i < NUM_BINS; i++) {
      const xi = XI_MIN + (i + 0.5) * dxi;
      arr[i] = fn(xi, p);
    }
    return arr;
  }

  function ruleLabel(rule) { return rule === 0 ? 'Parallel' : 'Sequential'; }
  function ruleColorVar(rule) { return rule === 0 ? '--curve-par' : '--curve-seq'; }

  // ─── Drawing ──────────────────────────────────────────────────────────────
  function drawDensity(forceHydroOnly) {
    const { ctx, w, h } = setupCanvas(densityCanvas);
    const margin = { top: 32, right: 24, bottom: 44, left: 52 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;

    const XI_D_MIN = -1.1, XI_D_MAX = 1.1;
    const RHO_MIN = -0.05, RHO_MAX = 1.05;

    function toX(xi)  { return margin.left + (xi - XI_D_MIN) / (XI_D_MAX - XI_D_MIN) * pw; }
    function toY(rho) { return margin.top + ph - (rho - RHO_MIN) / (RHO_MAX - RHO_MIN) * ph; }

    const dxi = (XI_MAX - XI_MIN) / NUM_BINS;
    const { p, rule } = getParams();
    const showLimit = showLimitChk && showLimitChk.checked;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = getColor('--border-color') || '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (const rho of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.beginPath();
      ctx.moveTo(margin.left, toY(rho));
      ctx.lineTo(margin.left + pw, toY(rho));
      ctx.stroke();
    }
    for (const xi of [-1, -0.5, 0, 0.5, 1]) {
      ctx.beginPath();
      ctx.moveTo(toX(xi), margin.top);
      ctx.lineTo(toX(xi), margin.top + ph);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = getColor('--text-primary') || '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + ph);
    ctx.lineTo(margin.left + pw, margin.top + ph);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '12px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center';
    for (const xi of [-1, -0.5, 0, 0.5, 1]) {
      ctx.fillText(xi === 0 ? '0' : xi.toString(), toX(xi), margin.top + ph + 18);
    }
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '13px "franklingothic-book", Arial, sans-serif';
    ctx.fillText('ξ = x/T', margin.left + pw / 2, margin.top + ph + 36);

    ctx.textAlign = 'right';
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '12px "franklingothic-book", Arial, sans-serif';
    for (const rho of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.fillText(rho.toFixed(2), margin.left - 6, toY(rho) + 4);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '13px "franklingothic-book", Arial, sans-serif';
    ctx.save();
    ctx.translate(14, margin.top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ρ', 0, 0);
    ctx.restore();

    // Individual samples (thin, low alpha)
    if (allSamples.length > 0) {
      const sampleColor = rule === 1
        ? 'rgba(42,122,184,0.10)'   // sequential: blue
        : 'rgba(229,114,0,0.10)';   // parallel & active: orange
      ctx.strokeStyle = sampleColor;
      ctx.lineWidth = 0.8;
      for (const s of allSamples) {
        ctx.beginPath();
        for (let i = 0; i < NUM_BINS; i++) {
          const xi = XI_MIN + (i + 0.5) * dxi;
          const fn = i === 0 ? 'moveTo' : 'lineTo';
          ctx[fn](toX(xi), toY(s[i]));
        }
        ctx.stroke();
      }

      // Bold average
      const avgColor = getColor(ruleColorVar(rule));
      ctx.strokeStyle = avgColor;
      ctx.lineWidth = 2.5;
      const k = allSamples.length;
      ctx.beginPath();
      for (let i = 0; i < NUM_BINS; i++) {
        const xi = XI_MIN + (i + 0.5) * dxi;
        const rho = sumDensity[i] / k;
        const fn = i === 0 ? 'moveTo' : 'lineTo';
        ctx[fn](toX(xi), toY(rho));
      }
      ctx.stroke();
    }

    // Hydrodynamic limit (dashed, checkbox-gated)
    const limitColor = getColor('--curve-limit') || '#1a7a3a';
    if (showLimit) {
      const hydro = computeHydroArray(rule, p);
      ctx.strokeStyle = limitColor;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      for (let i = 0; i < NUM_BINS; i++) {
        const xi = XI_MIN + (i + 0.5) * dxi;
        const fn = i === 0 ? 'moveTo' : 'lineTo';
        ctx[fn](toX(xi), toY(hydro[i]));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Legend
    {
      const legendX = margin.left + pw - 8;
      let legendY = margin.top + 14;
      const label = ruleLabel(rule);
      ctx.font = '11px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'right';
      if (allSamples.length > 0) {
        const avgColor2 = getColor(ruleColorVar(rule));
        ctx.strokeStyle = avgColor2; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(legendX - 28, legendY); ctx.lineTo(legendX, legendY); ctx.stroke();
        ctx.fillStyle = getColor('--text-primary') || '#333';
        ctx.fillText('avg (' + allSamples.length + ' samples, ' + label + ')', legendX - 32, legendY + 4);
        legendY += 18;
      }
      if (showLimit) {
        ctx.strokeStyle = limitColor; ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(legendX - 28, legendY); ctx.lineTo(legendX, legendY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = getColor('--text-primary') || '#333';
        const limitLabel = rule === 1 ? 'Sequential' : 'Parallel';
        ctx.fillText('limit shape (' + limitLabel + ')', legendX - 32, legendY + 4);
      }
    }

    // Empty state message
    if (allSamples.length === 0) {
      ctx.fillStyle = getColor('--text-secondary') || '#888';
      ctx.font = '14px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press Run to generate samples', w / 2, h / 2 - 10);
    }
  }

  // ─── a_n/n plot (active particles over time) ─────────────────────────────
  function drawActive() {
    const { ctx, w, h } = setupCanvas(activeCanvas);
    const margin = { top: 32, right: 24, bottom: 44, left: 52 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;

    ctx.clearRect(0, 0, w, h);

    const { rule } = getParams();

    if (!sumActive || activeSamples.length === 0 || activeT < 2) {
      ctx.fillStyle = getColor('--text-secondary') || '#888';
      ctx.font = '14px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('a_n / n — press Run to generate samples', w / 2, h / 2);
      return;
    }

    const T_s = activeT;
    const k   = activeSamples.length;

    // y range from data
    let ymax = 0;
    for (const s of activeSamples) {
      for (let n = 1; n <= T_s; n++) {
        const v = s[n - 1] / n;
        if (v > ymax) ymax = v;
      }
    }
    const zoom = Math.max(0.01, parseFloat(activeZoomSel.value) || 1);
    const Y_MAX = Math.max(ymax * 1.1 * zoom, 0.1);
    const Y_MIN = 0;

    function toX(n) { return margin.left + (n - 1) / Math.max(T_s - 1, 1) * pw; }
    function toY(v) { return margin.top + ph - (v - Y_MIN) / (Y_MAX - Y_MIN) * ph; }

    // y-ticks
    const yTickVals = [0, 0.25, 0.5, 0.75, 1.0].map(f => Y_MIN + f * (Y_MAX - Y_MIN));

    // x-ticks
    const xTickVals = [1, Math.max(1, Math.round(T_s * 0.25)),
                       Math.max(1, Math.round(T_s * 0.5)),
                       Math.max(1, Math.round(T_s * 0.75)),
                       T_s];

    // Grid
    ctx.strokeStyle = getColor('--border-color') || '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (const yv of yTickVals) {
      ctx.beginPath();
      ctx.moveTo(margin.left, toY(yv));
      ctx.lineTo(margin.left + pw, toY(yv));
      ctx.stroke();
    }
    for (const xv of xTickVals) {
      ctx.beginPath();
      ctx.moveTo(toX(xv), margin.top);
      ctx.lineTo(toX(xv), margin.top + ph);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = getColor('--text-primary') || '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + ph);
    ctx.lineTo(margin.left + pw, margin.top + ph);
    ctx.stroke();

    // Axis tick labels
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '12px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center';
    for (const xv of xTickVals) {
      ctx.fillText(xv.toString(), toX(xv), margin.top + ph + 18);
    }
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '13px "franklingothic-book", Arial, sans-serif';
    ctx.fillText('n', margin.left + pw / 2, margin.top + ph + 36);

    ctx.textAlign = 'right';
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '12px "franklingothic-book", Arial, sans-serif';
    for (const yv of yTickVals) {
      ctx.fillText(yv.toFixed(2), margin.left - 6, toY(yv) + 4);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '13px "franklingothic-book", Arial, sans-serif';
    ctx.save();
    ctx.translate(14, margin.top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('aₙ / n', 0, 0);
    ctx.restore();

    // Clip to plot area so zoomed-in curves don't paint above the axes
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin.left, margin.top, pw, ph);
    ctx.clip();

    // Individual samples (thin, low alpha)
    const sampleColor = rule === 1
      ? 'rgba(42,122,184,0.10)'
      : 'rgba(229,114,0,0.10)';
    ctx.strokeStyle = sampleColor;
    ctx.lineWidth = 0.8;
    for (const s of activeSamples) {
      ctx.beginPath();
      for (let n = 1; n <= T_s; n++) {
        const v = s[n - 1] / n;
        const fn = n === 1 ? 'moveTo' : 'lineTo';
        ctx[fn](toX(n), toY(v));
      }
      ctx.stroke();
    }

    // Bold average
    ctx.strokeStyle = getColor(ruleColorVar(rule));
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let n = 1; n <= T_s; n++) {
      const v = (sumActive[n - 1] / n) / k;
      const fn = n === 1 ? 'moveTo' : 'lineTo';
      ctx[fn](toX(n), toY(v));
    }
    ctx.stroke();
    ctx.restore();

    // Title
    ctx.textAlign = 'left';
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '12px "franklingothic-demi", Arial, sans-serif';
    ctx.fillText('Active particles — aₙ/n, n=1..T  (' + ruleLabel(rule) + ', ' + k + ' sample' + (k === 1 ? '' : 's') + ')',
                 margin.left, margin.top - 14);
  }

  // ─── A_n/n^2 plot (cumulative total jumps over time, rescaled) ───────────
  function drawJumps() {
    const { ctx, w, h } = setupCanvas(jumpsCanvas);
    const margin = { top: 32, right: 24, bottom: 44, left: 62 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;

    ctx.clearRect(0, 0, w, h);

    const { rule } = getParams();

    if (!sumJumps || jumpsSamples.length === 0 || activeT < 2) {
      ctx.fillStyle = getColor('--text-secondary') || '#888';
      ctx.font = '14px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('A_n / n² — press Run to generate samples', w / 2, h / 2);
      return;
    }

    const T_s = activeT;
    const k   = jumpsSamples.length;

    let ymax = 0;
    for (const s of jumpsSamples) {
      for (let n = 1; n <= T_s; n++) {
        const v = s[n - 1] / (n * n);
        if (v > ymax) ymax = v;
      }
    }
    const zoom = Math.max(0.01, parseFloat(jumpsZoomSel.value) || 1);
    const Y_MAX = Math.max(ymax * 1.1 * zoom, 0.01);
    const Y_MIN = 0;

    function toX(n) { return margin.left + (n - 1) / Math.max(T_s - 1, 1) * pw; }
    function toY(v) { return margin.top + ph - (v - Y_MIN) / (Y_MAX - Y_MIN) * ph; }

    const yTickVals = [0, 0.25, 0.5, 0.75, 1.0].map(f => Y_MIN + f * (Y_MAX - Y_MIN));
    const xTickVals = [1, Math.max(1, Math.round(T_s * 0.25)),
                       Math.max(1, Math.round(T_s * 0.5)),
                       Math.max(1, Math.round(T_s * 0.75)),
                       T_s];

    // Grid
    ctx.strokeStyle = getColor('--border-color') || '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (const yv of yTickVals) {
      ctx.beginPath();
      ctx.moveTo(margin.left, toY(yv));
      ctx.lineTo(margin.left + pw, toY(yv));
      ctx.stroke();
    }
    for (const xv of xTickVals) {
      ctx.beginPath();
      ctx.moveTo(toX(xv), margin.top);
      ctx.lineTo(toX(xv), margin.top + ph);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = getColor('--text-primary') || '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + ph);
    ctx.lineTo(margin.left + pw, margin.top + ph);
    ctx.stroke();

    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '12px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center';
    for (const xv of xTickVals) {
      ctx.fillText(xv.toString(), toX(xv), margin.top + ph + 18);
    }
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '13px "franklingothic-book", Arial, sans-serif';
    ctx.fillText('n', margin.left + pw / 2, margin.top + ph + 36);

    ctx.textAlign = 'right';
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '12px "franklingothic-book", Arial, sans-serif';
    for (const yv of yTickVals) {
      ctx.fillText(yv.toFixed(3), margin.left - 6, toY(yv) + 4);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '13px "franklingothic-book", Arial, sans-serif';
    ctx.save();
    ctx.translate(14, margin.top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Aₙ / n²', 0, 0);
    ctx.restore();

    // Clip to plot area so zoomed-in curves don't paint above the axes
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin.left, margin.top, pw, ph);
    ctx.clip();

    // Individual samples
    const sampleColor = rule === 1
      ? 'rgba(42,122,184,0.10)'
      : 'rgba(229,114,0,0.10)';
    ctx.strokeStyle = sampleColor;
    ctx.lineWidth = 0.8;
    for (const s of jumpsSamples) {
      ctx.beginPath();
      for (let n = 1; n <= T_s; n++) {
        const v = s[n - 1] / (n * n);
        const fn = n === 1 ? 'moveTo' : 'lineTo';
        ctx[fn](toX(n), toY(v));
      }
      ctx.stroke();
    }

    // Bold average
    ctx.strokeStyle = getColor(ruleColorVar(rule));
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let n = 1; n <= T_s; n++) {
      const v = (sumJumps[n - 1] / (n * n)) / k;
      const fn = n === 1 ? 'moveTo' : 'lineTo';
      ctx[fn](toX(n), toY(v));
    }
    ctx.stroke();
    ctx.restore();

    // Title
    ctx.textAlign = 'left';
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '12px "franklingothic-demi", Arial, sans-serif';
    ctx.fillText('Total jumps — Aₙ/n², n=1..T  (' + ruleLabel(rule) + ', ' + k + ' sample' + (k === 1 ? '' : 's') + ')',
                 margin.left, margin.top - 14);
  }

  // ─── Clear ────────────────────────────────────────────────────────────────
  function clearSamples() {
    allSamples = [];
    sumDensity.fill(0);
    activeSamples = [];
    sumActive = null;
    activeT = 0;
    jumpsSamples = [];
    sumJumps = null;
    statSamples.textContent = '0';
    statMs.textContent = '—';
    drawDensity();
    drawActive();
    drawJumps();
  }

  // ─── Run loop ─────────────────────────────────────────────────────────────
  async function runBatch() {
    if (running || !W) return;
    running = true;
    stopReq = false;
    runBtn.textContent = 'Stop';
    sampleFab.innerHTML = '&#9646;&#9646;';
    progressArea.style.display = 'block';

    const { r, p, T, K, rule } = getParams();
    let t0 = performance.now();
    let lastYield = t0;

    // Reset active/jumps accumulators if T changed since last batch
    if (activeT !== T) {
      activeSamples = [];
      sumActive = new Float64Array(T);
      jumpsSamples = [];
      sumJumps = new Float64Array(T);
      activeT = T;
    }

    for (let k = 0; k < K && !stopReq; k++) {
      const sampleStart = performance.now();
      W._runSample(r, T, p, rule, NUM_BINS, XI_MIN, XI_MAX);
      const ptr = W._getDensityBuf();
      // Copy immediately before any other WASM call
      const raw = new Float64Array(W.HEAPF64.buffer, ptr, NUM_BINS);
      const densityCopy = new Float64Array(raw);
      allSamples.push(densityCopy);
      for (let i = 0; i < NUM_BINS; i++) sumDensity[i] += densityCopy[i];

      // Copy active-count trajectory a_n for n=1..T
      const aPtr = W._getActiveBuf();
      const rawA = new Float64Array(W.HEAPF64.buffer, aPtr, T);
      const activeCopy = new Float64Array(rawA);
      activeSamples.push(activeCopy);
      for (let i = 0; i < T; i++) sumActive[i] += activeCopy[i];

      // Copy per-step jumps m_n, then convert to cumulative A_n = sum_{i=1..n} m_i
      const jPtr = W._getJumpsBuf();
      const rawJ = new Float64Array(W.HEAPF64.buffer, jPtr, T);
      const cumJumps = new Float64Array(T);
      {
        let acc = 0;
        for (let i = 0; i < T; i++) { acc += rawJ[i]; cumJumps[i] = acc; }
      }
      jumpsSamples.push(cumJumps);
      for (let i = 0; i < T; i++) sumJumps[i] += cumJumps[i];

      lastSampleMs = performance.now() - sampleStart;

      const now = performance.now();
      const pct = ((k + 1) / K * 100).toFixed(0);
      const elapsed = ((now - t0) / 1000).toFixed(1);
      progressFill.style.width = pct + '%';
      progressText.textContent = (k + 1) + ' / ' + K + ' samples · ' + elapsed + 's · ' + lastSampleMs.toFixed(0) + ' ms/sample';
      statSamples.textContent = allSamples.length;
      statMs.textContent = lastSampleMs.toFixed(0);

      if (now - lastYield > 80) {
        drawDensity();
        drawActive();
        drawJumps();
        await yieldFrame();
        lastYield = performance.now();
      }
    }

    drawDensity();
    drawActive();
    drawJumps();
    running = false;
    stopReq = false;
    runBtn.textContent = 'Run';
    sampleFab.innerHTML = '&#9654;';
    progressArea.style.display = 'none';
  }

  // ─── Controls wiring ──────────────────────────────────────────────────────
  function syncSlider(input, slider, isFloat, onChange) {
    input.addEventListener('input', () => {
      const v = isFloat ? parseFloat(input.value) : parseInt(input.value);
      if (!isNaN(v)) {
        slider.value = isFloat ? Math.round(v * 100) : v;
      }
      clearSamples();
      if (onChange) onChange();
    });
    slider.addEventListener('input', () => {
      input.value = isFloat ? (parseInt(slider.value) / 100).toFixed(2) : slider.value;
      clearSamples();
      if (onChange) onChange();
    });
  }

  syncSlider(rInput, rSlider, false);
  syncSlider(pInput, pSlider, true, refreshDiagram);  // diagram depends on p
  syncSlider(tInput, tSlider, false);
  kInput.addEventListener('input', () => clearSamples());

  document.querySelectorAll('input[name="updateRule"]').forEach(radio => {
    radio.addEventListener('change', () => { clearSamples(); refreshDiagram(); });
  });

  showLimitChk.addEventListener('change', () => drawDensity());

  activeZoomSel.addEventListener('change', () => drawActive());
  jumpsZoomSel.addEventListener('change', () => drawJumps());

  shuffleDiagBtn.addEventListener('click', () => refreshDiagram());

  runBtn.addEventListener('click', () => {
    if (running) {
      stopReq = true;
    } else {
      runBatch();
    }
  });

  clearBtn.addEventListener('click', () => {
    if (!running) clearSamples();
  });

  sampleFab.addEventListener('click', () => {
    if (running) { stopReq = true; }
    else { runBatch(); }
  });

  // Mobile drawer
  drawerHandle.addEventListener('click', () => {
    controlsPanel.classList.toggle('expanded');
  });

  window.addEventListener('resize', () => {
    clearTimeout(window._btResizeTimer);
    window._btResizeTimer = setTimeout(() => { drawDensity(); drawActive(); drawJumps(); drawDiagram(); }, 200);
  });

  // Disable/enable controls
  function disableControls(dis) {
    [rInput, rSlider, pInput, pSlider, tInput, tSlider, kInput].forEach(el => el.disabled = dis);
    document.querySelectorAll('input[name="updateRule"]').forEach(el => el.disabled = dis);
    runBtn.disabled = dis;
    clearBtn.disabled = dis;
    sampleFab.disabled = dis;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function drawLoadingMsg(msg) {
    const { ctx, w, h } = setupCanvas(densityCanvas);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '14px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, w / 2, h / 2);
  }

  drawLoadingMsg('Loading WASM…');
  disableControls(true);

  try {
    W = await createBernoulliTASEP();
  } catch (err) {
    console.error('WASM load failed:', err);
    drawLoadingMsg('WASM failed to load');
    return;
  }

  disableControls(false);
  drawDensity();
  drawActive();
  drawJumps();
  refreshDiagram();

})();
</script>
