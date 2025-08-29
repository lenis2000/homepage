---
title: Voter Model
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
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      if (running) stop(); else start();
    }
  });

  // Initial boot
  // Use 0 seed by default (random); user can set seed explicitly for reproducibility
  reinitFromUI();
};
</script>
