---
title: Vacuum Cleaner Process
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2026-03-17-vacuum-cleaner.md'
    txt: 'Interactive simulation — see source'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2026-03-17-vacuum-cleaner.cpp'
    txt: 'C++ source for WASM (vacuum cleaner + spatial hashing)'
a11y-description: "Interactive simulation of the vacuum cleaner process on a rate-1 Poisson point process. A particle starts at the origin in 2D or 3D, repeatedly jumps to the nearest Poisson point and removes it. Displays distance from origin as a function of step number on a line plot, with optional log-log scaling and power-law reference lines. Supports up to 100 million steps via WebAssembly with lazy Poisson generation in spatial cells."
published: true
---

<details class="math-description" id="mathDescription">
<summary>Mathematical description</summary>
<div style="padding: 8px 0;">
<p>Consider a rate-1 <b>Poisson point process</b> $\Pi$ in $\mathbb{R}^d$ ($d=2$ or $3$). The <b>vacuum cleaner</b> (or <b>greedy walk</b>) starts at the origin $x_0 = 0$ and moves as follows: at each step, it jumps to the nearest point of $\Pi$ that has not yet been visited, removes that point, and repeats.</p>
<p>Let $R(n) = |x_n|$ be the distance from the origin after $n$ steps. The process is a random walk in a random environment, and the growth rate of $R(n)$ depends on the dimension.</p>
<p>The simulation generates Poisson points lazily in unit cells as the walker explores, using a deterministic seed per cell for reproducibility and memory efficiency. Nearest-neighbor search uses grid-based spatial hashing with shell-by-shell expansion.</p>
</div>
</details>

<script>if (window.innerWidth >= 992) document.getElementById('mathDescription').setAttribute('open', '');</script>

<script src="{{site.url}}/js/2026-03-17-vacuum-cleaner.js"></script>

<style>
details.math-description {
  margin-bottom: 12px;
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
  --accent-fill: rgba(229, 114, 0, 0.15);
  --ref-line-color: #232D4B;
}
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #e8e8e8;
  --text-secondary: #aaa;
  --border-color: #444;
  --accent-color: #ff9933;
  --accent-secondary: #4a7ab8;
  --accent-fill: rgba(255, 153, 51, 0.15);
  --ref-line-color: #4a7ab8;
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
  width: 90px;
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
.control-row input[type="checkbox"] {
  margin: 0;
}

.view-toggle {
  display: inline-flex;
  border: 2px solid #232D4B;
  border-radius: 6px;
  overflow: hidden;
}
.view-toggle button {
  border: none;
  border-radius: 0;
  height: 28px;
  padding: 0 14px;
  font-weight: 500;
  background: white;
  color: #232D4B;
  cursor: pointer;
  font-size: 12px;
  font-family: "franklingothic-demi", Arial, sans-serif;
}
.view-toggle button.active {
  background: #232D4B;
  color: white;
}
.view-toggle button:hover:not(.active) {
  background: #F9DCBF;
}
[data-theme="dark"] .view-toggle {
  border-color: #4dabf7;
}
[data-theme="dark"] .view-toggle button {
  background: #2d2d2d;
  color: #4dabf7;
}
[data-theme="dark"] .view-toggle button.active {
  background: #4dabf7;
  color: #1a1a1a;
}
[data-theme="dark"] .view-toggle button:hover:not(.active) {
  background: #3d3d3d;
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

.plot-container {
  position: relative;
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
  margin-bottom: 12px;
}
[data-theme="dark"] .plot-container {
  background: #222;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}
.plot-container canvas { display: block; width: 100%; }
.plot-label {
  position: absolute;
  top: 8px; left: 12px;
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  opacity: 0.8;
}

@media (max-width: 991px) {
  .bottom-row { flex-direction: column !important; }
  .bottom-row .plot-container { width: 100% !important; min-width: 0 !important; }
}

.path-container {
  position: relative;
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
  margin-bottom: 12px;
}
[data-theme="dark"] .path-container {
  background: #222;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}
.path-container canvas { display: block; width: 100%; }

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
.control-section:nth-child(4) { animation-delay: 0.20s; }
@keyframes revealUp {
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

.keyboard-help-modal {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 2000;
  align-items: center;
  justify-content: center;
}
.keyboard-help-modal.visible { display: flex; }
.keyboard-help-content {
  background: var(--bg-primary, white);
  border-radius: 12px;
  padding: 24px;
  max-width: 360px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.keyboard-help-content h3 {
  margin: 0 0 16px 0;
  font-family: "franklingothic-demi", Arial, sans-serif;
  font-size: 16px;
  color: var(--text-primary, #333);
}
.keyboard-help-content table {
  width: 100%;
  border-collapse: collapse;
}
.keyboard-help-content td {
  padding: 6px 4px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  font-size: 13px;
  color: var(--text-primary, #333);
}
.keyboard-help-content kbd {
  display: inline-block;
  background: #e8e8e8;
  border: 1px solid #bbb;
  border-radius: 4px;
  padding: 2px 8px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  min-width: 24px;
  text-align: center;
  color: #333;
  box-shadow: 0 1px 0 #999;
}
[data-theme="dark"] .keyboard-help-content kbd {
  background: #444;
  border-color: #666;
  color: #e8e8e8;
  box-shadow: 0 1px 0 #222;
}
.keyboard-help-content .close-btn {
  margin-top: 16px;
  width: 100%;
  padding: 10px;
  background: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #d0d0d0);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary, #333);
}
</style>

<a href="#distancePlotCanvas" class="sr-only sr-only-focusable">Skip to simulation</a>

<div class="simulation-layout">
  <aside class="controls-panel" id="controlsPanel">
    <div class="drawer-handle" id="drawerHandle">
      <div class="drawer-handle-bar"></div>
      <span class="drawer-handle-hint">Swipe up for controls</span>
    </div>
    <div class="controls-panel-inner">

      <details class="control-section" open>
        <summary>Dimension</summary>
        <div class="control-section-content">
          <div class="control-row">
            <div class="view-toggle" id="dimToggle">
              <button id="dim2Btn" class="active" aria-label="2D mode">2D</button>
              <button id="dim3Btn" aria-label="3D mode">3D</button>
            </div>
          </div>
        </div>
      </details>

      <details class="control-section" open>
        <summary>Parameters</summary>
        <div class="control-section-content">
          <div class="control-row">
            <label for="stepsInput">Steps</label>
            <input type="number" id="stepsInput" value="1000000" min="1000" max="1000000000" step="1000">
          </div>
          <div class="control-row">
            <input type="range" id="stepsSlider" min="3" max="9" step="0.1" value="6" aria-label="Steps (log10)">
            <span id="stepsSliderLabel" style="font-size:11px; color:var(--text-secondary); min-width:40px;">10<sup>6</sup></span>
          </div>
        </div>
      </details>

      <details class="control-section" open>
        <summary>Simulation</summary>
        <div class="control-section-content">
          <div class="control-row">
            <button class="btn-action" id="runBtn" aria-label="Run" aria-keyshortcuts="r">Run</button>
            <button class="btn-utility" id="stopBtn" aria-label="Stop" disabled>Stop</button>
            <button class="btn-utility" id="resetBtn" aria-label="Reset" aria-keyshortcuts="c">Reset</button>
          </div>
          <div class="progress-bar-container" id="progressArea">
            <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
            <div class="progress-text" id="progressText" role="status" aria-live="polite"></div>
          </div>
        </div>
      </details>

      <div class="stats-bar">
        <div class="stats-inline" role="status" aria-live="polite">
          <div class="stat"><span class="stat-label">Steps</span><span class="stat-value" id="statSteps">0</span></div>
          <div class="stat"><span class="stat-label">Dist</span><span class="stat-value" id="statDist">—</span></div>
          <div class="stat"><span class="stat-label">Max</span><span class="stat-value" id="statMax">—</span></div>
          <div class="stat"><span class="stat-label">Rate</span><span class="stat-value" id="statRate">—</span></div>
          <div class="stat"><span class="stat-label">Pos</span><span class="stat-value" id="statPos">—</span></div>
        </div>
      </div>

      <details class="control-section">
        <summary>View Options</summary>
        <div class="control-section-content">
          <div class="control-row">
            <input type="checkbox" id="logXCheck">
            <label for="logXCheck">Log X axis</label>
          </div>
          <div class="control-row">
            <input type="checkbox" id="logYCheck">
            <label for="logYCheck">Log Y axis</label>
          </div>
          <div class="control-row">
            <input type="checkbox" id="showPathCheck">
            <label for="showPathCheck">Show recent path (2D)</label>
          </div>
          <div class="control-row" style="justify-content: flex-end;">
            <button id="helpBtn" title="Keyboard shortcuts" style="width: 28px; height: 28px; border: 1px solid var(--border-color, #888); border-radius: 50%; background: var(--bg-primary, white); color: #666; font-size: 14px; cursor: pointer; padding: 0;">?</button>
          </div>
        </div>
      </details>

      <details class="control-section">
        <summary>Export</summary>
        <div class="control-section-content">
          <div class="control-row">
            <button class="btn-utility" id="exportPngBtn" style="font-size: 11px;">PNG</button>
            <button class="btn-utility" id="exportCsvBtn" style="font-size: 11px;">CSV</button>
          </div>
        </div>
      </details>

    </div>
  </aside>

  <main class="visualization-panel">
    <div class="plot-container">
      <span class="plot-label">Distance from origin</span>
      <canvas id="distancePlotCanvas" width="1200" height="400"></canvas>
    </div>
    <div class="bottom-row" style="display: flex; gap: 12px;">
      <div class="plot-container" style="flex: 1; margin-bottom: 0;">
        <span class="plot-label" id="scatterLabel">Local view (2D)</span>
        <canvas id="scatterCanvas" width="600" height="500"></canvas>
      </div>
      <div class="plot-container" style="flex: 1; margin-bottom: 0;">
        <span class="plot-label" id="trajLabel">Trajectory</span>
        <canvas id="trajCanvas" width="600" height="500"></canvas>
      </div>
    </div>
  </main>
</div>

<button class="sample-fab" id="sampleFab" aria-label="Run">&#9654;</button>

<div id="keyboardHelpModal" class="keyboard-help-modal" role="dialog" aria-labelledby="keyboard-help-title" aria-modal="true">
  <div class="keyboard-help-content">
    <h3 id="keyboard-help-title">Keyboard Shortcuts</h3>
    <table>
      <tr><td><kbd>R</kbd></td><td>Run / Stop simulation</td></tr>
      <tr><td><kbd>C</kbd></td><td>Reset</td></tr>
      <tr><td><kbd>2</kbd> / <kbd>3</kbd></td><td>Switch dimension</td></tr>
      <tr><td><kbd>L</kbd></td><td>Toggle log-log</td></tr>
      <tr><td><kbd>P</kbd></td><td>Toggle path view</td></tr>
      <tr><td><kbd>?</kbd></td><td>Show this help</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Close dialogs</td></tr>
    </table>
    <button class="close-btn" id="closeKeyboardHelp">Close</button>
  </div>
</div>

<script>
(async function() {
  'use strict';

  // ─── WASM Init ───
  let W = null;

  // ─── State ───
  let dimension = 2;
  let isRunning = false;
  let cancelRequested = false;
  let targetSteps = 1000000;

  // ─── DOM Refs ───
  const dim2Btn = document.getElementById('dim2Btn');
  const dim3Btn = document.getElementById('dim3Btn');
  const stepsInput = document.getElementById('stepsInput');
  const stepsSlider = document.getElementById('stepsSlider');
  const stepsSliderLabel = document.getElementById('stepsSliderLabel');
  const runBtn = document.getElementById('runBtn');
  const stopBtn = document.getElementById('stopBtn');
  const resetBtn = document.getElementById('resetBtn');
  const progressArea = document.getElementById('progressArea');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const statSteps = document.getElementById('statSteps');
  const statDist = document.getElementById('statDist');
  const statMax = document.getElementById('statMax');
  const statRate = document.getElementById('statRate');
  const statPos = document.getElementById('statPos');
  const logXCheck = document.getElementById('logXCheck');
  const logYCheck = document.getElementById('logYCheck');
  const refLineCheck = document.getElementById('refLineCheck');
  const showPathCheck = document.getElementById('showPathCheck');
  const distancePlotCanvas = document.getElementById('distancePlotCanvas');
  const scatterCanvas = document.getElementById('scatterCanvas');
  const scatterLabel = document.getElementById('scatterLabel');
  const trajCanvas = document.getElementById('trajCanvas');
  const trajLabel = document.getElementById('trajLabel');
  const sampleFab = document.getElementById('sampleFab');
  const helpBtn = document.getElementById('helpBtn');
  const keyboardHelpModal = document.getElementById('keyboardHelpModal');
  const closeKeyboardHelp = document.getElementById('closeKeyboardHelp');
  const exportPngBtn = document.getElementById('exportPngBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  // ─── Utility ───
  function yieldFrame() { return new Promise(requestAnimationFrame); }

  function formatSteps(n) {
    if (n >= 1e8) return (n / 1e6).toFixed(0) + 'M';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(0) + 'K';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return '' + n;
  }

  function formatDist(d) {
    if (d >= 1000) return d.toFixed(0);
    if (d >= 100) return d.toFixed(1);
    if (d >= 10) return d.toFixed(2);
    return d.toFixed(3);
  }

  function getColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  // ─── Canvas setup ───
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  // ─── Nice tick values ───
  function niceNum(range, round) {
    const exponent = Math.floor(Math.log10(range));
    const fraction = range / Math.pow(10, exponent);
    let niceFraction;
    if (round) {
      if (fraction < 1.5) niceFraction = 1;
      else if (fraction < 3) niceFraction = 2;
      else if (fraction < 7) niceFraction = 5;
      else niceFraction = 10;
    } else {
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 5) niceFraction = 5;
      else niceFraction = 10;
    }
    return niceFraction * Math.pow(10, exponent);
  }

  function getTicks(min, max, maxTicks) {
    if (max <= min) return [];
    const range = niceNum(max - min, false);
    const d = niceNum(range / (maxTicks - 1), true);
    const graphMin = Math.floor(min / d) * d;
    const graphMax = Math.ceil(max / d) * d;
    const ticks = [];
    for (let v = graphMin; v <= graphMax + d * 0.5; v += d) {
      if (v >= min && v <= max) ticks.push(v);
    }
    return ticks;
  }

  // ─── Distance Plot Drawing ───
  function drawDistancePlot() {
    if (!W) return;
    const { ctx, w, h } = setupCanvas(distancePlotCanvas);
    const margin = { top: 30, right: 20, bottom: 40, left: 55 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;

    ctx.clearRect(0, 0, w, h);

    const count = W._getSubsampledCount();
    if (count === 0) {
      ctx.fillStyle = getColor('--text-secondary') || '#888';
      ctx.font = '14px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press Run to start', w / 2, h / 2);
      return;
    }

    const ptrDist = W._getSubsampledDistances();
    const ptrStep = W._getSubsampledSteps();
    const dists = new Float32Array(W.HEAPF32.buffer, ptrDist, count);
    const steps = new Float64Array(W.HEAPF64.buffer, ptrStep, count);

    const useLogX = logXCheck.checked;
    const useLogY = logYCheck.checked;


    // Compute axis ranges
    let xMin, xMax, yMin, yMax;
    if (useLogX) {
      xMin = Math.log10(Math.max(1, steps[0]));
      xMax = Math.log10(Math.max(2, steps[count - 1]));
    } else {
      xMin = 0;
      xMax = steps[count - 1];
    }
    if (useLogY) {
      let minD = Infinity;
      for (let i = 0; i < count; i++) {
        if (dists[i] > 0 && dists[i] < minD) minD = dists[i];
      }
      yMin = Math.log10(Math.max(0.01, minD));
      yMax = Math.log10(Math.max(1, W._getMaxDistance()));
    } else {
      yMin = 0;
      yMax = W._getMaxDistance() * 1.05;
    }

    // Prevent degenerate ranges
    if (xMax <= xMin) xMax = xMin + 1;
    if (yMax <= yMin) yMax = yMin + 1;

    function toX(v) { return margin.left + (v - xMin) / (xMax - xMin) * pw; }
    function toY(v) { return margin.top + ph - (v - yMin) / (yMax - yMin) * ph; }

    // Grid lines
    ctx.strokeStyle = getColor('--border-color') || '#e0e0e0';
    ctx.lineWidth = 0.5;
    const xTicks = getTicks(xMin, xMax, 8);
    const yTicks = getTicks(yMin, yMax, 6);
    for (const t of xTicks) {
      ctx.beginPath();
      ctx.moveTo(toX(t), margin.top);
      ctx.lineTo(toX(t), margin.top + ph);
      ctx.stroke();
    }
    for (const t of yTicks) {
      ctx.beginPath();
      ctx.moveTo(margin.left, toY(t));
      ctx.lineTo(margin.left + pw, toY(t));
      ctx.stroke();
    }

    // Tick labels
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '10px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'center';
    for (const t of xTicks) {
      let label;
      if (useLogX) {
        const v = Math.pow(10, t);
        label = formatSteps(Math.round(v));
      } else {
        label = formatSteps(t);
      }
      ctx.fillText(label, toX(t), margin.top + ph + 16);
    }
    ctx.textAlign = 'right';
    for (const t of yTicks) {
      let label;
      if (useLogY) {
        const v = Math.pow(10, t);
        label = formatDist(v);
      } else {
        label = formatDist(t);
      }
      ctx.fillText(label, margin.left - 6, toY(t) + 4);
    }

    // Fill under curve
    const fillColor = getColor('--accent-fill') || 'rgba(229,114,0,0.15)';
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    let firstPt = true;
    for (let i = 0; i < count; i++) {
      let xv = useLogX ? Math.log10(Math.max(1, steps[i])) : steps[i];
      let yv = useLogY ? Math.log10(Math.max(0.01, dists[i])) : dists[i];
      if (xv < xMin || xv > xMax) continue;
      if (firstPt) {
        ctx.moveTo(toX(xv), toY(yMin));
        ctx.lineTo(toX(xv), toY(yv));
        firstPt = false;
      } else {
        ctx.lineTo(toX(xv), toY(yv));
      }
    }
    // Close fill
    let lastXv = useLogX ? Math.log10(Math.max(1, steps[count - 1])) : steps[count - 1];
    ctx.lineTo(toX(lastXv), toY(yMin));
    ctx.closePath();
    ctx.fill();

    // Main data line
    const lineColor = getColor('--accent-color') || '#E57200';
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    firstPt = true;
    for (let i = 0; i < count; i++) {
      let xv = useLogX ? Math.log10(Math.max(1, steps[i])) : steps[i];
      let yv = useLogY ? Math.log10(Math.max(0.01, dists[i])) : dists[i];
      if (xv < xMin || xv > xMax) continue;
      if (firstPt) { ctx.moveTo(toX(xv), toY(yv)); firstPt = false; }
      else ctx.lineTo(toX(xv), toY(yv));
    }
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '11px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(useLogX ? 'Step (log scale)' : 'Step', margin.left + pw / 2, h - 4);
    ctx.save();
    ctx.translate(12, margin.top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(useLogY ? 'Distance (log scale)' : 'Distance from origin', 0, 0);
    ctx.restore();
  }

  // ─── Scatter View: Poisson points + walker path ───
  function drawScatter() {
    if (!W) return;
    const totalSteps = W._getStepCount();
    const { ctx, w, h } = setupCanvas(scatterCanvas);
    ctx.clearRect(0, 0, w, h);

    if (totalSteps === 0) {
      ctx.fillStyle = getColor('--text-secondary') || '#888';
      ctx.font = '14px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press Run to start', w / 2, h / 2);
      return;
    }

    const curX = W._getCurrentX();
    const curY = W._getCurrentY();

    // Local view: center on walker, fixed radius so points are visible
    // Show ~50 unit radius so individual points are clearly visible
    const viewHalfY = 50;

    const margin = 30;
    const sizeW = w - 2 * margin;
    const sizeH = h - 2 * margin;
    const aspect = sizeW / sizeH;

    const viewHalfX = viewHalfY * aspect;
    const scale = sizeH / (viewHalfY * 2);

    const centerX = curX;
    const centerY = curY;

    function toSX(x) { return margin + sizeW / 2 + (x - centerX) * scale; }
    function toSY(y) { return margin + sizeH / 2 - (y - centerY) * scale; }

    // Query nearby Poisson points — use the actual visible bounding box
    let nearbyCount = 0;
    if (dimension === 2) {
      nearbyCount = W._enumerateNearby2D(
        centerX - viewHalfX, centerY - viewHalfY,
        centerX + viewHalfX, centerY + viewHalfY, 80000);
    } else {
      const curZ3 = W._getCurrentZ();
      nearbyCount = W._enumerateNearby3D(
        centerX - viewHalfX, centerY - viewHalfY, curZ3 - viewHalfY,
        centerX + viewHalfX, centerY + viewHalfY, curZ3 + viewHalfY, 80000);
    }

    // Draw Poisson points
    if (nearbyCount > 0) {
      const ptrNX = W._getNearbyX();
      const ptrNY = W._getNearbyY();
      const nxs = new Float64Array(W.HEAPF64.buffer, ptrNX, nearbyCount);
      const nys = new Float64Array(W.HEAPF64.buffer, ptrNY, nearbyCount);

      const pointColor = getColor('--accent-secondary') || '#232D4B';
      ctx.fillStyle = pointColor;
      ctx.globalAlpha = 0.35;
      // Dot size adapts: bigger when zoomed in, smaller when zoomed out
      const dotR = Math.max(1, Math.min(3, scale * 0.4));
      for (let i = 0; i < nearbyCount; i++) {
        const sx = toSX(nxs[i]);
        const sy = toSY(nys[i]);
        ctx.fillRect(sx - dotR / 2, sy - dotR / 2, dotR, dotR);
      }
      ctx.globalAlpha = 1;
    }

    // Draw walker path (ring buffer, chronological order)
    const RING_SIZE = 10000;
    const pathCount = W._getRecentPathLen();
    if (pathCount > 1) {
      const head = W._getRecentPathHead();
      const ptrPX = W._getRecentPathX();
      const ptrPY = W._getRecentPathY();
      const rawPX = new Float64Array(W.HEAPF64.buffer, ptrPX, RING_SIZE);
      const rawPY = new Float64Array(W.HEAPF64.buffer, ptrPY, RING_SIZE);

      const pathStart = (pathCount < RING_SIZE) ? 0 : head;
      const lineColor = getColor('--accent-color') || '#E57200';

      // Batch draw for performance
      const batchCount = 20;
      const batchSize = Math.max(1, Math.floor(pathCount / batchCount));
      for (let b = 0; b < batchCount; b++) {
        const bStart = Math.max(1, b * batchSize);
        const bEnd = (b === batchCount - 1) ? pathCount : (b + 1) * batchSize;
        const alpha = 0.05 + 0.7 * ((bStart + bEnd) / 2 / pathCount);
        ctx.strokeStyle = lineColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(0.3, Math.min(1.5, scale * 0.3));
        ctx.beginPath();
        const prevIdx = (pathStart + bStart - 1) % RING_SIZE;
        ctx.moveTo(toSX(rawPX[prevIdx]), toSY(rawPY[prevIdx]));
        for (let i = bStart; i < bEnd; i++) {
          const idx = (pathStart + i) % RING_SIZE;
          ctx.lineTo(toSX(rawPX[idx]), toSY(rawPY[idx]));
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Origin marker (crosshair) — only if visible
    const osx = toSX(0), osy = toSY(0);
    if (osx >= margin - 10 && osx <= w - margin + 10 && osy >= margin - 10 && osy <= h - margin + 10) {
      ctx.strokeStyle = getColor('--text-secondary') || '#888';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(osx - 6, osy); ctx.lineTo(osx + 6, osy);
      ctx.moveTo(osx, osy - 6); ctx.lineTo(osx, osy + 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Current position marker (filled circle)
    const walkerColor = getColor('--accent-color') || '#E57200';
    ctx.fillStyle = walkerColor;
    ctx.beginPath();
    ctx.arc(toSX(curX), toSY(curY), 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Walker coordinate label
    ctx.fillStyle = getColor('--text-primary') || '#333';
    ctx.font = '10px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'left';
    const coordLabel = dimension === 2
      ? '(' + curX.toFixed(1) + ', ' + curY.toFixed(1) + ')'
      : '(' + curX.toFixed(1) + ', ' + curY.toFixed(1) + ', ' + W._getCurrentZ().toFixed(1) + ')';
    ctx.fillText(coordLabel, toSX(curX) + 8, toSY(curY) - 8);

    // Bottom-left: position info
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '10px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('pos: ' + coordLabel, margin, h - 8);

    // Bottom-right: view size
    ctx.textAlign = 'right';
    ctx.fillText('view: ' + formatDist(viewHalfX * 2) + ' \u00d7 ' + formatDist(viewHalfY * 2), w - margin, h - 8);
  }

  // ─── Global Trajectory View ───
  function drawTrajectory() {
    if (!W) return;
    const count = W._getSubsampledCount();
    const { ctx, w, h } = setupCanvas(trajCanvas);
    ctx.clearRect(0, 0, w, h);

    if (count < 2) {
      ctx.fillStyle = getColor('--text-secondary') || '#888';
      ctx.font = '12px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Trajectory', w / 2, h / 2);
      return;
    }

    const ptrX = W._getSubsampledX();
    const ptrY = W._getSubsampledY();
    const xs = new Float32Array(W.HEAPF32.buffer, ptrX, count);
    const ys = new Float32Array(W.HEAPF32.buffer, ptrY, count);

    // For 3D, also get Z for a simple oblique projection
    let zs = null;
    if (dimension === 3) {
      const ptrZ = W._getSubsampledZ();
      zs = new Float32Array(W.HEAPF32.buffer, ptrZ, count);
    }

    // Find bounds
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (let i = 0; i < count; i++) {
      let px = xs[i], py = ys[i];
      if (dimension === 3) { px += zs[i] * 0.35; py += zs[i] * 0.35; }
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    // Include origin
    if (minX > 0) minX = 0;
    if (maxX < 0) maxX = 0;
    if (minY > 0) minY = 0;
    if (maxY < 0) maxY = 0;

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const range = Math.max(rangeX, rangeY) * 1.15;
    const cX = (minX + maxX) / 2;
    const cY = (minY + maxY) / 2;
    const margin = 16;
    const size = Math.min(w, h) - 2 * margin;
    const scale = size / range;

    function toSX(x) { return margin + (w - 2 * margin) / 2 + (x - cX) * scale; }
    function toSY(y) { return margin + (h - 2 * margin) / 2 - (y - cY) * scale; }

    // Origin crosshair
    ctx.strokeStyle = getColor('--text-secondary') || '#888';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    const ox = toSX(0), oy = toSY(0);
    ctx.beginPath();
    ctx.moveTo(ox - 5, oy); ctx.lineTo(ox + 5, oy);
    ctx.moveTo(ox, oy - 5); ctx.lineTo(ox, oy + 5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Draw trajectory with color gradient (old=faint, new=bright)
    const lineColor = getColor('--accent-color') || '#E57200';
    const batchCount = 30;
    const batchSize = Math.max(1, Math.floor(count / batchCount));
    for (let b = 0; b < batchCount; b++) {
      const bStart = Math.max(1, b * batchSize);
      const bEnd = (b === batchCount - 1) ? count : (b + 1) * batchSize;
      const alpha = 0.3 + 0.6 * ((bStart + bEnd) / 2 / count);
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(0.5, Math.min(1.5, scale * 0.15));
      ctx.beginPath();
      let pi = bStart - 1;
      let ppx = xs[pi], ppy = ys[pi];
      if (dimension === 3) { ppx += zs[pi] * 0.35; ppy += zs[pi] * 0.35; }
      ctx.moveTo(toSX(ppx), toSY(ppy));
      for (let i = bStart; i < bEnd; i++) {
        let px = xs[i], py = ys[i];
        if (dimension === 3) { px += zs[i] * 0.35; py += zs[i] * 0.35; }
        ctx.lineTo(toSX(px), toSY(py));
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Current position
    const curX = W._getCurrentX(), curY = W._getCurrentY();
    let cpx = curX, cpy = curY;
    if (dimension === 3) { cpx += W._getCurrentZ() * 0.35; cpy += W._getCurrentZ() * 0.35; }
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(toSX(cpx), toSY(cpy), 3, 0, 2 * Math.PI);
    ctx.fill();

    // Origin dot
    ctx.fillStyle = getColor('--accent-secondary') || '#232D4B';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(ox, oy, 2.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;

    trajLabel.textContent = dimension === 2 ? 'Trajectory' : 'Trajectory (oblique)';
  }

  // ─── Stats Update ───
  function updateStats() {
    if (!W) return;
    const steps = W._getStepCount();
    const dist = Math.sqrt(
      W._getCurrentX() * W._getCurrentX() +
      W._getCurrentY() * W._getCurrentY() +
      (dimension === 3 ? W._getCurrentZ() * W._getCurrentZ() : 0)
    );
    statSteps.textContent = formatSteps(steps);
    statDist.textContent = steps > 0 ? formatDist(dist) : '—';
    statMax.textContent = steps > 0 ? formatDist(W._getMaxDistance()) : '—';
    if (steps > 0) {
      const px = W._getCurrentX(), py = W._getCurrentY();
      statPos.textContent = dimension === 2
        ? '(' + px.toFixed(1) + ', ' + py.toFixed(1) + ')'
        : '(' + px.toFixed(1) + ', ' + py.toFixed(1) + ', ' + W._getCurrentZ().toFixed(1) + ')';
    } else {
      statPos.textContent = '—';
    }
  }

  // ─── Controls enable/disable ───
  function setRunning(running) {
    isRunning = running;
    runBtn.disabled = running;
    runBtn.textContent = running ? 'Running…' : 'Run';
    stopBtn.disabled = !running;
    resetBtn.disabled = running;
    dim2Btn.disabled = running;
    dim3Btn.disabled = running;
    stepsInput.disabled = running;
    stepsSlider.disabled = running;
    if (sampleFab) {
      sampleFab.innerHTML = running ? '&#9724;' : '&#9654;';
    }
  }

  // ─── Simulation Runner ───
  async function runSimulation() {
    if (isRunning || !W) return;
    cancelRequested = false;
    setRunning(true);
    progressArea.style.display = 'block';

    const currentSteps = W._getStepCount();
    const total = currentSteps + targetSteps;
    const batchSize = Math.min(100000, Math.max(1000, Math.floor(targetSteps / 200)));
    let lastDrawTime = performance.now();
    const startTime = performance.now();
    let stepsAtStart = currentSteps;

    while (W._getStepCount() < total && !cancelRequested) {
      const remaining = total - W._getStepCount();
      const batch = Math.min(batchSize, remaining);
      W._runSteps(batch);

      const now = performance.now();
      const elapsed = now - startTime;
      const stepsRun = W._getStepCount() - stepsAtStart;
      const rate = stepsRun / (elapsed / 1000);
      statRate.textContent = formatSteps(Math.round(rate)) + '/s';

      // Update progress bar
      const pct = Math.round(((W._getStepCount() - currentSteps) / targetSteps) * 100);
      progressFill.style.width = pct + '%';
      progressText.textContent = formatSteps(W._getStepCount()) + ' / ' + formatSteps(total);

      // Redraw plot periodically
      if (now - lastDrawTime > 300) {
        updateStats();
        drawDistancePlot();
        drawScatter(); drawTrajectory();
        lastDrawTime = now;
      }

      await yieldFrame();
    }

    setRunning(false);
    updateStats();
    drawDistancePlot();
    drawScatter(); drawTrajectory();
    statRate.textContent = '—';
  }

  // ─── Event Listeners ───

  // Dimension toggle
  dim2Btn.addEventListener('click', () => {
    if (dimension === 2 || isRunning) return;
    dimension = 2;
    dim2Btn.classList.add('active');
    dim3Btn.classList.remove('active');
    W._setDimension(2);
    updateStats();
    drawDistancePlot();
    showPathCheck.disabled = false;
  });
  dim3Btn.addEventListener('click', () => {
    if (dimension === 3 || isRunning) return;
    dimension = 3;
    dim3Btn.classList.add('active');
    dim2Btn.classList.remove('active');
    W._setDimension(3);
    updateStats();
    drawDistancePlot();
    showPathCheck.disabled = true;
  });

  // Steps input sync
  stepsSlider.addEventListener('input', () => {
    const logVal = parseFloat(stepsSlider.value);
    targetSteps = Math.round(Math.pow(10, logVal));
    stepsInput.value = targetSteps;
    const exp = Math.floor(logVal);
    const frac = logVal - exp;
    if (frac < 0.01) {
      stepsSliderLabel.innerHTML = '10<sup>' + exp + '</sup>';
    } else {
      stepsSliderLabel.textContent = formatSteps(targetSteps);
    }
  });
  stepsInput.addEventListener('change', () => {
    targetSteps = Math.max(1000, Math.min(1000000000, parseInt(stepsInput.value) || 1000000));
    stepsInput.value = targetSteps;
    stepsSlider.value = Math.log10(targetSteps);
    stepsSliderLabel.textContent = formatSteps(targetSteps);
  });

  // Run / Stop / Reset
  runBtn.addEventListener('click', () => { runSimulation(); });
  stopBtn.addEventListener('click', () => { cancelRequested = true; });
  resetBtn.addEventListener('click', () => {
    if (isRunning) return;
    W._initSim(Date.now() & 0x7FFFFFFF);
    progressArea.style.display = 'none';
    progressFill.style.width = '0%';
    updateStats();
    drawDistancePlot();
    drawScatter(); drawTrajectory();
  });

  // FAB
  if (sampleFab) {
    sampleFab.addEventListener('click', () => {
      if (isRunning) { cancelRequested = true; }
      else { runSimulation(); }
    });
  }

  // View options
  logXCheck.addEventListener('change', drawDistancePlot);
  logYCheck.addEventListener('change', drawDistancePlot);
  showPathCheck.addEventListener('change', drawScatter);

  // Export PNG
  exportPngBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'vacuum-cleaner-' + dimension + 'd.png';
    link.href = distancePlotCanvas.toDataURL('image/png');
    link.click();
  });

  // Export CSV
  exportCsvBtn.addEventListener('click', () => {
    if (!W) return;
    const count = W._getSubsampledCount();
    if (count === 0) return;
    const ptrDist = W._getSubsampledDistances();
    const ptrStep = W._getSubsampledSteps();
    const dists = new Float32Array(W.HEAPF32.buffer, ptrDist, count);
    const steps = new Float64Array(W.HEAPF64.buffer, ptrStep, count);
    let csv = 'step,distance\n';
    for (let i = 0; i < count; i++) {
      csv += steps[i] + ',' + dists[i].toFixed(6) + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = 'vacuum-cleaner-' + dimension + 'd.csv';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // Help modal
  helpBtn.addEventListener('click', () => keyboardHelpModal.classList.add('visible'));
  closeKeyboardHelp.addEventListener('click', () => keyboardHelpModal.classList.remove('visible'));
  keyboardHelpModal.addEventListener('click', (e) => {
    if (e.target === keyboardHelpModal) keyboardHelpModal.classList.remove('visible');
  });

  // Escape to close help modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') keyboardHelpModal.classList.remove('visible');
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

  // Resize handler
  function handleResize() {
    drawDistancePlot();
    drawScatter(); drawTrajectory();
  }
  window.addEventListener('resize', () => {
    clearTimeout(window._resizeTimer);
    window._resizeTimer = setTimeout(handleResize, 200);
  });

  // ─── Loading state ───
  function drawLoading(canvas, msg) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getColor('--text-secondary') || '#888';
    ctx.font = '14px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, w / 2, h / 2);
  }

  drawLoading(scatterCanvas, 'Loading WASM\u2026');
  drawLoading(distancePlotCanvas, '');

  // ─── WASM Load ───
  try {
    W = await createVacuumCleaner();
  } catch (err) {
    console.error('WASM load failed:', err);
    drawLoading(distancePlotCanvas, 'WASM failed to load');
    return;
  }

  W._initSim(Date.now() & 0x7FFFFFFF);
  drawScatter(); drawTrajectory();
  drawDistancePlot();
  updateStats();

})();
</script>
