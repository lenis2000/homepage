---
title: One-dimensional Voter Model
model: vertex-models
author: Alexei Borodin and Alexei Bufetov (request); Leonid Petrov (implementation)
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/vertex_models/2025-08-29-voter-model.md'
    txt: 'This simulation is interactive; see page source'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/vertex_models/2025-08-29-voter-model.cpp'
    txt: 'C++/WASM core (Emscripten)'
---

The voter model on a 1D lattice where each site adopts the color of its left neighbor according to independent exponential clocks.

<div style="margin: 20px 0;">
  <label for="n-input">N (lattice size: -N to N): </label>
  <input type="number" id="n-input" value="10" min="1" max="10000" style="width: 70px;">
  <button id="apply-n">Set N</button>

  <label for="events-per-sec" style="margin-left: 20px;">Events per second: </label>
  <input type="range" id="events-per-sec" value="200" min="1" max="20000" step="1" style="width: 180px;">
  <input type="number" id="events-per-sec-input" value="200" min="1" max="20000" step="1" style="width: 80px; margin-left: 5px;">

  <label for="seed-input" style="margin-left: 20px;">Seed: </label>
  <input type="number" id="seed-input" value="0" min="0" step="1" style="width: 120px;" title="0 = random seed">
</div>

<div style="margin: 20px 0;">
  <button id="run-stop-btn">Run</button>
  <button id="step-btn">Step (1 event)</button>
  <button id="reset-btn">Reset</button>
</div>

<canvas id="voterCanvas" width="800" height="200" style="border: 1px solid #ccc; display: block; margin: 20px auto; width: 100%;"></canvas>

<div id="info" style="text-align: center; margin: 20px;">
    Time: <span id="time-display">0.00</span>
</div>

<details class="control-group full-width" open>
  <summary><div class="control-group-title">Statistics</div></summary>
  <div class="content" style="display:grid;gap:12px">
    <div>
      <div style="font-weight:600;margin-bottom:6px;text-align:center">
        Time Series: Front Position, Interface Density, Normalized Entropy
      </div>
      <div style="font-size:12px;margin-bottom:8px;text-align:center;color:#666">
        <strong style="color:#d62728">Red:</strong> Front position F(t)/L (leftmost color extent) with Poisson(t) theory ±√t band<br>
        <strong style="color:#2ca02c">Green:</strong> Interface density I(t)/(L-1) (fraction of neighboring sites with different colors)<br>
        <strong style="color:#1f77b4">Blue:</strong> Normalized entropy H(t)/log(L) (color diversity, 1=uniform, 0=single color)
      </div>
      <canvas id="stat-ts" width="900" height="160"
              style="width:100%;max-width:900px;border:1px solid #ccc;display:block;margin:0 auto"></canvas>
    </div>
    <div style="display:flex;gap:16px;">
      <div style="flex:7;">
        <div style="font-weight:600;margin-bottom:6px;text-align:center">
          Space–time raster: Complete History (time ↑, space →, NEVER scrolls)
        </div>
        <div id="history-container" style="height:280px;border:1px solid #ccc;overflow:hidden">
          <canvas id="stat-raster-full" width="600" height="280"
                  style="width:100%;display:block"></canvas>
        </div>
      </div>
      <div style="flex:5;">
        <div style="font-weight:600;margin-bottom:6px;text-align:center">
          Recent Events Window (last N×N events)
        </div>
        <div style="height:280px;border:1px solid #ccc;overflow:hidden">
          <canvas id="stat-raster" width="300" height="280"
                  style="width:100%;display:block"></canvas>
        </div>
      </div>
    </div>
    <div>
      <div style="font-weight:600;margin-bottom:6px;text-align:center">
        Domain-size histogram
      </div>
      <canvas id="stat-hist" width="900" height="120"
              style="width:100%;max-width:900px;border:1px solid #ccc;display:block;margin:0 auto"></canvas>
    </div>
  </div>
</details>

<script src="/js/2025-08-29-voter-model.js"></script>

<script>
// Ensure Module exists even if the single-file bundle loads slowly
if (typeof Module === 'undefined') {
  window.Module = { onRuntimeInitialized: function(){} };
}

Module.onRuntimeInitialized = function() {
  class VoterWASM {
    constructor() {
      // sync cwraps are fine; ASYNCIFY allows await if we choose later
      this._initializeModel = Module.cwrap('initializeModel','number',['number','number','number','number'], {async:false});
      this._stepK          = Module.cwrap('stepK','number',['number'], {async:false});
      this._exportSites    = Module.cwrap('exportSites','number',[], {async:false});
      this._freeString     = Module.cwrap('freeString', null, ['number']);
      this._getTime        = Module.cwrap('getTime','number',[], {async:false});
      this.N = 10;
      this.seed = 0;
      this.init_mode = 0;       // reserved for future palettes
      this.palette_colors = 0;  // reserved
    }

    initialize(N, seed) {
      this.N = N; this.seed = seed >>> 0;
      const ptr = this._initializeModel(N, this.seed, this.init_mode, this.palette_colors);
      const json = JSON.parse(Module.UTF8ToString(ptr));
      this._freeString(ptr);
      if (json.error) throw new Error(json.error);
      return json;
    }

    stepK(k) {
      const ptr = this._stepK(k);
      const json = JSON.parse(Module.UTF8ToString(ptr));
      this._freeString(ptr);
      if (json.error) throw new Error(json.error);
      return json;
    }

    exportSites() {
      const ptr = this._exportSites();
      const json = JSON.parse(Module.UTF8ToString(ptr));
      this._freeString(ptr);
      if (!json.ptr || !json.count) return { arr: new Uint32Array(), count: 0 };
      // View directly into WASM memory (no copy)
      const view = new Uint32Array(Module.HEAPU32.buffer, json.ptr, json.count);
      return { arr: view, count: json.count };
    }

    getTime() { return this._getTime(); }
  }

  // --------------------------
  // UI & drawing
  // --------------------------
  const canvas = document.getElementById('voterCanvas');
  const ctx = canvas.getContext('2d');
  const timeSpan = document.getElementById('time-display');

  const nInput = document.getElementById('n-input');
  const seedInput = document.getElementById('seed-input');
  const epsSlider = document.getElementById('events-per-sec');
  const epsInput  = document.getElementById('events-per-sec-input');

  const applyNBtn = document.getElementById('apply-n');
  const runStopBtn = document.getElementById('run-stop-btn');
  const stepBtn = document.getElementById('step-btn');
  const resetBtn = document.getElementById('reset-btn');

  const wasm = new VoterWASM();

  // ---------- Stats state ----------
  const tsCanvas   = document.getElementById('stat-ts');
  const histCanvas = document.getElementById('stat-hist');
  const rasterCanvas = document.getElementById('stat-raster');
  const rasterFullCanvas = document.getElementById('stat-raster-full');
  const historyContainer = document.getElementById('history-container');

  const T = [];            // times
  const frontSeries = [];  // F(t) / (2N+1)
  const ifaceSeries = [];  // I(t) / (2N)
  const entSeries   = [];  // Hnorm(t) in [0,1]

  // throttle sampling (e.g., every ~50ms wall time)
  let lastSampleTS = 0;

  // ---------- Metrics from current snapshot ----------
  function computeFrontLen(view) {
    if (view.length === 0) return 0;
    const c0 = view[0];
    let k = 1;
    while (k < view.length && view[k] === c0) k++;
    return k; // number of sites equal to the leftmost color
  }

  function computeInterfaceCount(view) {
    let cnt = 0;
    for (let i = 1; i < view.length; i++) if (view[i] !== view[i-1]) cnt++;
    return cnt;
  }

  function computeEntropy(view) {
    const L = view.length;
    if (L === 0) return { H: 0, Hnorm: 0 };
    const m = new Map();
    for (let i = 0; i < L; i++) m.set(view[i], (m.get(view[i])||0) + 1);
    let H = 0;
    for (const [,count] of m) {
      const p = count / L;
      H -= p * Math.log(p);
    }
    const Hnorm = H / Math.log(L); // in [0,1]
    return { H, Hnorm };
  }

  function computeDomainSizes(view) {
    const sizes = [];
    if (view.length === 0) return sizes;
    let cur = view[0], run = 1;
    for (let i = 1; i < view.length; i++) {
      if (view[i] === cur) run++;
      else { sizes.push(run); cur = view[i]; run = 1; }
    }
    sizes.push(run);
    return sizes;
  }

  // Map colors to normalized values [0,1]
  const colorToValue = new Map();
  let nextColorIndex = 0;

  function computeRightmostColor(view) {
    if (view.length === 0) return 0;

    // Get color at position +N (rightmost site)
    const rightmostSiteIndex = view.length - 1; // Last array element = position +N
    const rightmostColor = view[rightmostSiteIndex];

    // Map this color to a normalized value
    if (!colorToValue.has(rightmostColor)) {
      colorToValue.set(rightmostColor, nextColorIndex * 0.1);
      nextColorIndex = (nextColorIndex + 1) % 11; // Cycle through 0, 0.1, 0.2, ..., 1.0
    }

    return colorToValue.get(rightmostColor);
  }

  // ---------- Tiny plotting helpers ----------
  function linePlot(canvas, series, opts={}) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const pad = {l:40,r:10,t:10,b:22};
    const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;

    // Build x range from ALL time data (never scroll, always show complete history)
    const T = series[0].x, n = T.length;
    if (n === 0) return;

    // ALWAYS use the full time range from start (0 or first time) to current time
    const xmin = 0; // Always start from time 0
    const xmax = T[n-1]; // Current time (scales as simulation progresses)
    let ymin = Infinity, ymax = -Infinity;
    for (const s of series) {
      for (const v of s.y) { if (v < ymin) ymin = v; if (v > ymax) ymax = v; }
    }
    if (opts.forceY01) { ymin = 0; ymax = 1; }
    if (ymax === ymin) { ymax = ymin + 1; }

    // Time axis scales automatically: more time = more compressed
    const x2px = x => pad.l + (x - xmin) / (xmax - xmin || 1) * plotW;
    const y2px = y => pad.t + (1 - (y - ymin) / (ymax - ymin)) * plotH;

    // Axes
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t+plotH); ctx.lineTo(pad.l+plotW, pad.t+plotH);
    ctx.stroke();

    // Series
    const colors = opts.colors || ['#d62728','#2ca02c','#1f77b4','#9467bd','#8c564b'];
    series.forEach((s, idx) => {
      ctx.strokeStyle = colors[idx % colors.length]; ctx.lineWidth = s.width || 1.5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = x2px(T[i]), y = y2px(s.y[i]);
        if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    });

    // Shaded band if provided: y±band
    if (opts.band) {
      const { y, band } = opts.band;
      ctx.fillStyle = 'rgba(31,119,180,0.12)';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = x2px(T[i]);
        const yU = y2px(y[i] + band[i]);
        if (i === 0) ctx.moveTo(x, yU); else ctx.lineTo(x, yU);
      }
      for (let i = n-1; i >= 0; i--) {
        const x = x2px(T[i]);
        const yL = y2px(y[i] - band[i]);
        ctx.lineTo(x, yL);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Y ticks (few)
    ctx.fillStyle = '#666'; ctx.font = '11px sans-serif';
    for (let k = 0; k <= 4; k++) {
      const vy = ymin + k*(ymax-ymin)/4;
      const y = y2px(vy);
      ctx.fillText(vy.toFixed(2), 4, y+4);
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l+plotW, y); ctx.stroke();
    }
  }

  function histPlot(canvas, data, bins=30) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    if (!data.length) return;
    const maxVal = Math.max(...data);
    const minVal = 1;
    const B = Math.min(bins, maxVal);
    const counts = new Array(B).fill(0);
    for (const v of data) {
      const b = Math.min(B-1, Math.floor((v-minVal) / (maxVal-minVal+1e-9) * B));
      counts[b]++;
    }
    const maxC = Math.max(...counts);
    const barW = W / B;
    for (let i = 0; i < B; i++) {
      const h = (H-20) * (counts[i] / (maxC || 1));
      ctx.fillStyle = '#888';
      ctx.fillRect(i*barW, H-20 - h, barW-1, h);
    }
    ctx.fillStyle = '#666'; ctx.font = '11px sans-serif';
    ctx.fillText('size →', W-40, H-6);
    ctx.save(); ctx.translate(10, H/2); ctx.rotate(-Math.PI/2);
    ctx.fillText('count', 0, 0); ctx.restore();
  }

  function appendRasterRow(canvas, view) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const W = canvas.width, H = canvas.height;
    // Scroll up by 1 pixel
    const img = ctx.getImageData(0, 1, W, H-1);
    ctx.putImageData(img, 0, 0);
    // Draw new row at bottom
    const row = ctx.createImageData(W, 1);
    for (let x = 0; x < W; x++) {
      const i = Math.floor(x * view.length / W);
      const rgb = view[i];
      const R = (rgb >> 16) & 255, G = (rgb >> 8) & 255, B = rgb & 255;
      const p = x*4;
      row.data[p+0]=R; row.data[p+1]=G; row.data[p+2]=B; row.data[p+3]=255;
    }
    ctx.putImageData(row, 0, H-1);
  }

  // State for full history raster with compression
  const fullHistory = []; // Store all history states

  function appendFullHistoryRow(canvas, view) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Add current state to full history
    fullHistory.push(Array.from(view));

    // Redraw entire history compressed to fit canvas height
    ctx.clearRect(0, 0, W, H);

    const totalSteps = fullHistory.length;
    if (totalSteps === 0) return;

    // Each pixel row represents one or more time steps
    const stepsPerPixel = totalSteps / H;

    for (let y = 0; y < H; y++) {
      // Map pixel row to history step(s)
      const stepIndex = Math.floor(y * stepsPerPixel);
      if (stepIndex >= totalSteps) continue;

      const historyRow = fullHistory[stepIndex];
      const row = ctx.createImageData(W, 1);

      for (let x = 0; x < W; x++) {
        const i = Math.floor(x * historyRow.length / W);
        const rgb = historyRow[i];
        const R = (rgb >> 16) & 255, G = (rgb >> 8) & 255, B = rgb & 255;
        const p = x * 4;
        row.data[p+0] = R; row.data[p+1] = G; row.data[p+2] = B; row.data[p+3] = 255;
      }

      // Draw from bottom up (H-1-y for time ↑)
      ctx.putImageData(row, 0, H - 1 - y);
    }

    // Auto-scroll to bottom to show the most recent activity
    historyContainer.scrollTop = historyContainer.scrollHeight;
  }

  // Recent events sliding window (N×N grid)
  const recentEvents = [];
  const maxRecentEvents = 100; // Reduced for faster startup

  function updateRecentEventsWindow(canvas, view) {
    // Add current state to recent events
    recentEvents.push(Array.from(view));
    if (recentEvents.length > maxRecentEvents) {
      recentEvents.shift(); // Remove oldest
    }

    // Draw exactly N×N grid (no scaling of time dimension)
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const N = recentEvents.length;
    if (N === 0) return;

    // Draw available events, using full height even if not full buffer
    const pixelWidth = W / view.length;   // space dimension (can scale to canvas width)
    const pixelHeight = H / N; // time dimension scales with actual data

    for (let t = 0; t < N; t++) {
      const historyRow = recentEvents[t];
      for (let x = 0; x < historyRow.length; x++) {
        const rgb = historyRow[x];
        const R = (rgb >> 16) & 255, G = (rgb >> 8) & 255, B = rgb & 255;
        ctx.fillStyle = `rgb(${R},${G},${B})`;

        // Draw from bottom up (most recent at bottom) - use Math.floor/ceil to avoid gaps
        ctx.fillRect(
          Math.floor(x * pixelWidth),
          Math.floor(H - (t + 1) * pixelHeight),
          Math.ceil(pixelWidth) + 1,
          Math.ceil(pixelHeight) + 1
        );
      }
    }
  }

  function rgbIntToCss(rgb) {
    // rgb is 0xRRGGBB
    const hex = rgb.toString(16).padStart(6,'0');
    return '#' + hex;
  }

  function drawSites(view) {
    const L = view.length;
    if (L === 0) return;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    const siteWidth = canvas.width / L;
    const siteHeight = canvas.height;

    // Draw sites
    for (let i = 0; i < L; i++) {
      ctx.fillStyle = rgbIntToCss(view[i]);
      ctx.fillRect(i * siteWidth, 0, siteWidth, siteHeight);
    }

    // Position labels (max 21)
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    const maxLabels = 21;
    const labelStep = Math.ceil(L / maxLabels);
    const N = parseInt(nInput.value, 10);
    for (let i = 0; i < L; i += labelStep) {
      const position = i - N;
      const x = i * siteWidth + siteWidth / 2;
      ctx.fillText(String(position), x, siteHeight - 10);
    }
    if ((L-1) % labelStep !== 0) {
      const position = (L-1) - N;
      const x = (L-1) * siteWidth + siteWidth / 2;
      ctx.fillText(String(position), x, siteHeight - 10);
    }
  }

  function updateTimeDisplay() {
    timeSpan.textContent = wasm.getTime().toFixed(10);
  }

  let animHandle = 0;
  let running = false;
  let lastTS = 0;

  function frame(ts) {
    if (!running) return;
    if (!lastTS) lastTS = ts;
    const elapsed = (ts - lastTS) / 1000.0; // seconds
    lastTS = ts;

    const eps = parseInt(epsInput.value, 10); // events per second
    // Cap to avoid huge bursts if tab was inactive
    const k = Math.min(200000, Math.max(0, Math.floor(eps * elapsed)));

    if (k > 0) {
      wasm.stepK(k);
      updateTimeDisplay();
      const { arr } = wasm.exportSites();
      drawSites(arr);

      // --- Statistics updates ---
      updateRecentEventsWindow(rasterCanvas, arr);
      appendFullHistoryRow(rasterFullCanvas, arr);

      if (!lastSampleTS || ts - lastSampleTS > 50) {
        lastSampleTS = ts;
        const t = wasm.getTime();
        const Lsites = arr.length;
        const Flen = computeFrontLen(arr);    // number of leftmost-color sites
        const Icnt = computeInterfaceCount(arr);
        const { Hnorm } = computeEntropy(arr);

        // record normalized series
        T.push(t);
        frontSeries.push(Flen / Lsites);
        ifaceSeries.push(Icnt / Math.max(1, Lsites-1));
        entSeries.push(Hnorm);

        // Build theoretical overlay for front: E[F]=t, band=√t, all normalized
        const Ncur = parseInt(nInput.value, 10);
        const Lcur = 2 * Ncur + 1;
        const yFront = T.map(tt => Math.min(tt, Lcur-1) / Lcur);
        const bandFront = T.map(tt => Math.min(Math.sqrt(Math.max(tt,0)), Lcur-1) / Lcur);

        linePlot(tsCanvas, [
          { x: T, y: frontSeries },                 // empirical front (normalized)
          { x: T, y: ifaceSeries },                 // interface density
          { x: T, y: entSeries }                    // entropy (normalized)
        ], {
          forceY01: true,
          band: { y: yFront, band: bandFront }      // ±√t band around theory y=t/L
        });

        // Domain-size histogram (recompute each sample)
        const sizes = computeDomainSizes(arr);
        histPlot(histCanvas, sizes, 30);
      }
    }
    animHandle = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    runStopBtn.textContent = 'Stop';
    lastTS = 0;
    animHandle = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    runStopBtn.textContent = 'Run';
    if (animHandle) cancelAnimationFrame(animHandle);
    animHandle = 0;
  }

  function reinitFromUI() {
    stop();
    const N = parseInt(nInput.value, 10);
    const seed = parseInt(seedInput.value, 10) >>> 0;
    const res = wasm.initialize(N, seed);
    const { arr } = wasm.exportSites();
    drawSites(arr);
    updateTimeDisplay();

    // clear stats canvases & series
    T.length = 0; frontSeries.length = 0; ifaceSeries.length = 0; entSeries.length = 0;
    recentEvents.length = 0; fullHistory.length = 0;
    const ctx1 = tsCanvas.getContext('2d'); ctx1.clearRect(0,0,tsCanvas.width,tsCanvas.height);
    const ctx2 = histCanvas.getContext('2d'); ctx2.clearRect(0,0,histCanvas.width,histCanvas.height);
    const ctx3 = rasterCanvas.getContext('2d'); ctx3.clearRect(0,0,rasterCanvas.width,rasterCanvas.height);
    const ctx4 = rasterFullCanvas.getContext('2d'); ctx4.clearRect(0,0,rasterFullCanvas.width,rasterFullCanvas.height);
  }

  // Wire events
  epsSlider.addEventListener('input', () => {
    epsInput.value = epsSlider.value;
  });

  epsInput.addEventListener('input', () => {
    const value = parseInt(epsInput.value, 10);
    if (value >= 1 && value <= 20000) {
      epsSlider.value = value;
    }
  });

  applyNBtn.addEventListener('click', () => {
    reinitFromUI();
  });

  runStopBtn.addEventListener('click', () => {
    if (running) stop(); else start();
  });

  stepBtn.addEventListener('click', () => {
    stop();
    wasm.stepK(1);
    updateTimeDisplay();
    const { arr } = wasm.exportSites();
    drawSites(arr);
  });

  resetBtn.addEventListener('click', () => {
    reinitFromUI();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if (event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      if (running) stop(); else start();
    }
    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      stop();
      wasm.stepK(1);
      updateTimeDisplay();
      const { arr } = wasm.exportSites();
      drawSites(arr);
      // Update stats for single step
      updateRecentEventsWindow(rasterCanvas, arr);
      appendFullHistoryRow(rasterFullCanvas, arr);
      // Force stats update
      const t = wasm.getTime();
      const Lsites = arr.length;
      const Flen = computeFrontLen(arr);
      const Icnt = computeInterfaceCount(arr);
      const { Hnorm } = computeEntropy(arr);
      T.push(t);
      frontSeries.push(Flen / Lsites);
      ifaceSeries.push(Icnt / Math.max(1, Lsites-1));
      entSeries.push(Hnorm);
      const Ncur = parseInt(nInput.value, 10);
      const Lcur = 2 * Ncur + 1;
      const yFront = T.map(tt => Math.min(tt, Lcur-1) / Lcur);
      const bandFront = T.map(tt => Math.min(Math.sqrt(Math.max(tt,0)), Lcur-1) / Lcur);
      linePlot(tsCanvas, [
        { x: T, y: frontSeries },
        { x: T, y: ifaceSeries },
        { x: T, y: entSeries }
      ], {
        forceY01: true,
        band: { y: yFront, band: bandFront }
      });
      const sizes = computeDomainSizes(arr);
      histPlot(histCanvas, sizes, 30);
    }
  });

  // Initial boot
  // Use 0 seed by default (random); user can set seed explicitly for reproducibility
  reinitFromUI();
};
</script>
