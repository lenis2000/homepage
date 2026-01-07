---
title: Pipe Dreams in a Rectangle
model: permutations
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2026-01-07-pipe-dreams-rectangle.md'
    txt: 'This simulation is interactive, written in JavaScript/WASM'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2026-01-07-pipe-dreams-rectangle.cpp'
    txt: 'C++ source code compiled to WebAssembly'
papers:
  - title: "Colin Defant. Permutons from Demazure Products"
    arxiv-url: "https://arxiv.org/abs/2505.15630"
published: true
---

<style>
  #simulation-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .controls-row {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .controls-row label {
    margin-right: 5px;
    font-weight: 500;
  }

  .controls-row input[type="number"],
  .controls-row input[type="text"] {
    width: 80px;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 4px;
  }

  #progress-indicator {
    margin-top: 10px;
    font-weight: bold;
  }

  #canvas-container {
    position: relative;
    width: 100%;
    margin-top: 15px;
    overflow: hidden;
    border: 1px solid #ccc;
    background: #f9f9f9;
  }

  #pipe-canvas {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
  }

  #pipe-canvas:active {
    cursor: grabbing;
  }

  #zoom-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    padding: 10px 12px;
    background: var(--bg-secondary, #F1F1EF);
    border-radius: 6px;
    width: fit-content;
  }

  #zoom-controls button {
    min-width: 36px;
    height: 36px;
    padding: 0 12px;
    font-size: 16px;
    font-weight: 600;
    border: 1px solid #232D4B;
    background: #232D4B;
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
  }

  #zoom-controls button:hover {
    background: #e57200;
    border-color: #e57200;
  }

  #zoom-level {
    min-width: 50px;
    text-align: center;
    font-weight: 600;
    color: var(--text-primary, #212529);
  }

  #zoom-controls .zoom-hint {
    margin-left: 8px;
    color: #666;
    font-size: 12px;
  }

  #stats-panel {
    margin-top: 15px;
    padding: 15px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  #stats-panel h4 {
    margin-top: 0;
    margin-bottom: 10px;
  }

  #permutation-display {
    font-family: monospace;
    font-size: 14px;
    word-break: break-all;
    max-height: 100px;
    overflow-y: auto;
    background: #fff;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #ddd;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .checkbox-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 768px) {
    .controls-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .control-group {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>

This simulation generates **pipe dreams** (also known as RC-graphs) on an $N \times M$ grid.

**Pipe dream construction:**
- Pipes enter from the **left edge** (labeled $1, 2, \ldots, N$ from top to bottom) and the **bottom edge** (labeled $N+1, N+2, \ldots, N+M$ from left to right)
- Each cell is randomly assigned as a **cross** ($+$, with probability $p$) or a **bump** (elbow, with probability $1-p$)
- At a cross, pipes pass straight through; at a bump, pipes turn 90 degrees

**Demazure reduction:** When enabled, if two pipes that have already crossed try to cross again (i.e., the left pipe has a larger label than the bottom pipe), the cross is forced to become a bump. This ensures each pair of pipes crosses at most once, producing a **reduced** pipe dream.

The output permutation is read from the top edge (left to right) followed by the right edge (top to bottom).

<div id="simulation-container">
  <div class="controls-row">
    <div class="control-group">
      <label for="rows-input">Rows (N):</label>
      <input type="number" id="rows-input" value="50" min="1" max="500" />
    </div>
    <div class="control-group">
      <label for="cols-input">Cols (M):</label>
      <input type="number" id="cols-input" value="50" min="1" max="500" />
    </div>
    <div class="control-group">
      <label for="prob-input">Prob (p):</label>
      <input type="text" id="prob-input" value="0.5" />
    </div>
    <div class="control-group">
      <label for="seed-input">Seed:</label>
      <input type="number" id="seed-input" value="" placeholder="Random" min="0" />
    </div>
  </div>

  <div class="controls-row">
    <div class="control-group checkbox-group">
      <input type="checkbox" id="demazure-checkbox" checked />
      <label for="demazure-checkbox">Demazure reduction</label>
    </div>
    <div class="control-group checkbox-group">
      <input type="checkbox" id="show-pipes-checkbox" checked />
      <label for="show-pipes-checkbox">Show pipes</label>
    </div>
    <div class="control-group checkbox-group">
      <input type="checkbox" id="show-grid-checkbox" />
      <label for="show-grid-checkbox">Show grid</label>
    </div>
    <div class="control-group">
      <label for="pipe-skip-input">Draw every Nth pipe:</label>
      <input type="number" id="pipe-skip-input" value="1" min="1" max="100" />
    </div>
  </div>

  <div class="controls-row">
    <button id="generate-btn" class="btn btn-primary">Generate</button>
    <button id="resample-btn" class="btn btn-secondary">Resample (new seed)</button>
  </div>

  <div id="progress-indicator"></div>

  <div id="canvas-container">
    <canvas id="pipe-canvas" width="800" height="800"></canvas>
  </div>

  <div id="zoom-controls">
    <button id="zoom-out-btn">−</button>
    <span id="zoom-level">100%</span>
    <button id="zoom-in-btn">+</button>
    <button id="zoom-reset-btn">Reset</button>
    <span class="zoom-hint">Scroll to zoom, drag to pan</span>
  </div>

  <div id="stats-panel">
    <h4>Statistics</h4>
    <div id="stats-content">
      <p>Click "Generate" to create a pipe dream.</p>
    </div>
    <h4>Output Permutation</h4>
    <div id="permutation-display">-</div>
    <h4 style="margin-top: 15px;">Permutation Matrix</h4>
    <canvas id="perm-matrix-canvas" width="400" height="400" style="border: 1px solid #ddd; max-width: 100%;"></canvas>
  </div>
</div>

<script>
// HSV to RGB conversion
function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = v - c;
  let r, g, b;
  const hi = Math.floor(h * 6) % 6;
  switch (hi) {
    case 0: r = c; g = x; b = 0; break;
    case 1: r = x; g = c; b = 0; break;
    case 2: r = 0; g = c; b = x; break;
    case 3: r = 0; g = x; b = c; break;
    case 4: r = x; g = 0; b = c; break;
    default: r = c; g = 0; b = x; break;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

function getPipeColor(label, total) {
  const hue = (label - 1) / total;
  return hsvToRgb(hue, 1.0, 0.9);
}

// Module setup
var Module = {
  preRun: [],
  postRun: [],
  print: function(text) { console.log(text); },
  printErr: function(text) { console.error(text); },
  onRuntimeInitialized: function() {
    console.log("WASM initialized");
    initUI();
  }
};

// Load WASM
var wasmScript = document.createElement('script');
wasmScript.src = "{{site.url}}/js/2026-01-07-pipe-dreams-rectangle.js";
wasmScript.async = true;
wasmScript.onerror = function() {
  console.error("Failed to load WASM");
  document.getElementById('progress-indicator').textContent =
      "Error loading simulation. Please refresh.";
};
document.head.appendChild(wasmScript);

function initUI() {
  const generatePipeDream = Module.cwrap('generatePipeDream', 'number',
      ['number', 'number', 'number', 'number', 'number'], {async: true});
  const freeResult = Module.cwrap('freeResult', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const rowsInput = document.getElementById('rows-input');
  const colsInput = document.getElementById('cols-input');
  const probInput = document.getElementById('prob-input');
  const seedInput = document.getElementById('seed-input');
  const demazureCheckbox = document.getElementById('demazure-checkbox');
  const showPipesCheckbox = document.getElementById('show-pipes-checkbox');
  const showGridCheckbox = document.getElementById('show-grid-checkbox');
  const pipeSkipInput = document.getElementById('pipe-skip-input');
  const generateBtn = document.getElementById('generate-btn');
  const resampleBtn = document.getElementById('resample-btn');
  const progressIndicator = document.getElementById('progress-indicator');
  const canvas = document.getElementById('pipe-canvas');
  const ctx = canvas.getContext('2d');
  const canvasContainer = document.getElementById('canvas-container');
  const statsContent = document.getElementById('stats-content');
  const permutationDisplay = document.getElementById('permutation-display');
  const permMatrixCanvas = document.getElementById('perm-matrix-canvas');
  const permMatrixCtx = permMatrixCanvas.getContext('2d');
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const zoomResetBtn = document.getElementById('zoom-reset-btn');
  const zoomLevelSpan = document.getElementById('zoom-level');

  let currentData = null;
  let isProcessing = false;
  let progressInterval = null;

  // Zoom and pan state (world coordinates)
  let zoom = 1;
  let panX = 0;  // World X offset
  let panY = 0;  // World Y offset
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Display dimensions
  const displayWidth = 800;
  const displayHeight = 800;
  canvas.width = displayWidth;
  canvas.height = displayHeight;

  // Get transform for drawing
  function getTransform() {
    if (!currentData) return { scale: 1, offsetX: 0, offsetY: 0 };
    const N = currentData.N;
    const M = currentData.M;

    // Base scale: fit the grid in the canvas
    const baseScale = Math.min(displayWidth / M, displayHeight / N) * 0.95;
    const scale = baseScale * zoom;

    // Center the grid, adjusted by pan
    const offsetX = displayWidth / 2 - (M / 2 - panX) * scale;
    const offsetY = displayHeight / 2 - (N / 2 - panY) * scale;

    return { scale, offsetX, offsetY };
  }

  // Convert world coords to canvas coords
  function toCanvasX(col) {
    const { scale, offsetX } = getTransform();
    return offsetX + col * scale;
  }

  function toCanvasY(row) {
    const { scale, offsetY } = getTransform();
    return offsetY + row * scale;
  }

  // Convert canvas coords to world coords
  function toWorldX(canvasX) {
    const { scale, offsetX } = getTransform();
    return (canvasX - offsetX) / scale;
  }

  function toWorldY(canvasY) {
    const { scale, offsetY } = getTransform();
    return (canvasY - offsetY) / scale;
  }

  // Zoom centered on a canvas point
  function zoomAt(canvasX, canvasY, factor) {
    // Get world coords under mouse before zoom
    const worldX = toWorldX(canvasX);
    const worldY = toWorldY(canvasY);

    // Apply zoom
    const newZoom = Math.max(0.5, Math.min(20, zoom * factor));
    zoom = newZoom;

    // Adjust pan so worldX,worldY stays at canvasX,canvasY
    const { scale } = getTransform();
    panX = worldX - (canvasX - displayWidth / 2) / scale - currentData.M / 2;
    panY = worldY - (canvasY - displayHeight / 2) / scale - currentData.N / 2;

    // Negate because pan is subtracted
    panX = -panX;
    panY = -panY;

    updateZoomDisplay();
    redraw();
  }

  // Pan by canvas delta
  function pan(deltaCanvasX, deltaCanvasY) {
    const { scale } = getTransform();
    panX += deltaCanvasX / scale;
    panY += deltaCanvasY / scale;
    redraw();
  }

  function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
    updateZoomDisplay();
    redraw();
  }

  function updateZoomDisplay() {
    zoomLevelSpan.textContent = Math.round(zoom * 100) + '%';
  }

  generateBtn.addEventListener('click', generate);
  resampleBtn.addEventListener('click', resample);
  showPipesCheckbox.addEventListener('change', redraw);
  showGridCheckbox.addEventListener('change', redraw);
  pipeSkipInput.addEventListener('change', redraw);

  // Regenerate when these options change
  probInput.addEventListener('change', generate);
  demazureCheckbox.addEventListener('change', generate);

  // Zoom controls
  zoomInBtn.addEventListener('click', () => {
    zoomAt(displayWidth / 2, displayHeight / 2, 1.25);
  });
  zoomOutBtn.addEventListener('click', () => {
    zoomAt(displayWidth / 2, displayHeight / 2, 0.8);
  });
  zoomResetBtn.addEventListener('click', resetView);

  // Mouse wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (displayWidth / rect.width);
    const mouseY = (e.clientY - rect.top) * (displayHeight / rect.height);

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomAt(mouseX, mouseY, factor);
  }, { passive: false });

  // Pan with mouse drag
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    // Scale delta by canvas display ratio
    const rect = canvas.getBoundingClientRect();
    pan(dx * (displayWidth / rect.width), dy * (displayHeight / rect.height));
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = 'grab';
    }
  });

  // Touch support for mobile
  let touchStartDist = 0;
  let touchStartZoom = 1;
  let lastTouchX = 0;
  let lastTouchY = 0;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      touchStartDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      touchStartZoom = zoom;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - lastTouchX;
      const dy = e.touches[0].clientY - lastTouchY;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;

      const rect = canvas.getBoundingClientRect();
      pan(dx * (displayWidth / rect.width), dy * (displayHeight / rect.height));
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = canvas.getBoundingClientRect();

      zoom = touchStartZoom;  // Reset to start zoom
      zoomAt(
        (centerX - rect.left) * (displayWidth / rect.width),
        (centerY - rect.top) * (displayHeight / rect.height),
        dist / touchStartDist
      );
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    isDragging = false;
  });

  async function generate() {
    if (isProcessing) return;

    const N = parseInt(rowsInput.value) || 50;
    const M = parseInt(colsInput.value) || 50;
    const p = parseFloat(probInput.value) || 0.5;
    const demazure = demazureCheckbox.checked ? 1 : 0;
    let seed = parseInt(seedInput.value);
    if (isNaN(seed)) {
      seed = Math.floor(Math.random() * 2147483647);
      seedInput.value = seed;
    }

    isProcessing = true;
    generateBtn.disabled = true;
    resampleBtn.disabled = true;
    startProgressMonitoring();

    try {
      const resultPtr = await generatePipeDream(N, M, p, demazure, seed);
      const jsonStr = Module.UTF8ToString(resultPtr);
      freeResult(resultPtr);

      currentData = JSON.parse(jsonStr);

      if (currentData.error) {
        throw new Error(currentData.error);
      }

      resetView();
      updateStats();
      redraw();

    } catch (e) {
      console.error("Generation error:", e);
      progressIndicator.textContent = "Error: " + e.message;
    }

    stopProgressMonitoring();
    isProcessing = false;
    generateBtn.disabled = false;
    resampleBtn.disabled = false;
  }

  function resample() {
    seedInput.value = Math.floor(Math.random() * 2147483647);
    generate();
  }

  function startProgressMonitoring() {
    progressIndicator.textContent = 'Processing... (0%)';
    progressInterval = setInterval(() => {
      try {
        const progress = getProgress();
        progressIndicator.textContent = `Processing... (${progress}%)`;
        if (progress >= 100) {
          stopProgressMonitoring();
        }
      } catch (e) {
        stopProgressMonitoring();
      }
    }, 100);
  }

  function stopProgressMonitoring() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    progressIndicator.textContent = '';
  }

  function updateStats() {
    if (!currentData) return;

    const N = currentData.N;
    const M = currentData.M;
    const totalCells = N * M;
    const crosses = currentData.grid.reduce((a, b) => a + b, 0);
    const bumps = totalCells - crosses;
    const forcedCount = currentData.forcedCount;

    statsContent.innerHTML = `
      <p><strong>Grid:</strong> ${N} x ${M} = ${totalCells} cells</p>
      <p><strong>Crosses:</strong> ${crosses} (${(100 * crosses / totalCells).toFixed(1)}%)</p>
      <p><strong>Bumps:</strong> ${bumps} (${(100 * bumps / totalCells).toFixed(1)}%)</p>
      <p><strong>Forced bumps (Demazure):</strong> ${forcedCount} (${(100 * forcedCount / totalCells).toFixed(2)}%)</p>
    `;

    // Output permutation
    const perm = [...currentData.topOutputs, ...currentData.rightOutputs];
    permutationDisplay.textContent = '[' + perm.join(', ') + ']';

    // Draw permutation matrix
    drawPermutationMatrix(perm);
  }

  function drawPermutationMatrix(perm) {
    const n = perm.length;
    const size = 400;
    const margin = 10;
    permMatrixCanvas.width = size;
    permMatrixCanvas.height = size;

    // White background
    permMatrixCtx.fillStyle = '#ffffff';
    permMatrixCtx.fillRect(0, 0, size, size);

    // Draw dots for permutation (Grothendieck shenanigans convention)
    const chartSize = size - 2 * margin;
    const dotRadius = Math.max(1.5, Math.min(chartSize / n / 2, 3));

    permMatrixCtx.fillStyle = '#00204E'; // Dark navy blue

    for (let i = 0; i < n; i++) {
      const outputPos = perm[i] - 1; // 0-indexed
      // x: column i, scaled to chart area
      const x = margin + (i + 0.5) * chartSize / n;
      // y: row outputPos, scaled to chart area (top to bottom)
      const y = margin + (outputPos + 0.5) * chartSize / n;

      permMatrixCtx.beginPath();
      permMatrixCtx.arc(x, y, dotRadius, 0, 2 * Math.PI);
      permMatrixCtx.fill();
    }
  }

  function redraw() {
    if (!currentData) return;

    const N = currentData.N;
    const M = currentData.M;
    const showPipes = showPipesCheckbox.checked;
    const showGrid = showGridCheckbox.checked;
    const pipeSkip = parseInt(pipeSkipInput.value) || 1;

    const { scale, offsetX, offsetY } = getTransform();

    // Helper to convert grid coords to canvas coords
    const toX = (col) => offsetX + col * scale;
    const toY = (row) => offsetY + row * scale;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw forced bumps as gray cells
    ctx.fillStyle = '#c8c8c8';
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < M; col++) {
        if (currentData.forcedBumps[row * M + col]) {
          ctx.fillRect(toX(col), toY(row), scale, scale);
        }
      }
    }

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#dcdcdc';
      ctx.lineWidth = 1;
      for (let row = 0; row <= N; row++) {
        const y = toY(row);
        ctx.beginPath();
        ctx.moveTo(toX(0), y);
        ctx.lineTo(toX(M), y);
        ctx.stroke();
      }
      for (let col = 0; col <= M; col++) {
        const x = toX(col);
        ctx.beginPath();
        ctx.moveTo(x, toY(0));
        ctx.lineTo(x, toY(N));
        ctx.stroke();
      }
    }

    // Draw pipes
    if (showPipes) {
      const totalPipes = N + M;
      const lineWidth = Math.max(1, scale / 5);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';

      for (let row = 0; row < N; row++) {
        for (let col = 0; col < M; col++) {
          const pipeH = currentData.hPipes[row * (M + 1) + col];
          const pipeV = currentData.vPipes[(row + 1) * M + col];

          const drawH = (pipeSkip === 1) || (pipeH % pipeSkip === 0);
          const drawV = (pipeSkip === 1) || (pipeV % pipeSkip === 0);

          if (!drawH && !drawV) continue;

          const cx = toX(col + 0.5);
          const cy = toY(row + 0.5);
          const left = toX(col);
          const right = toX(col + 1);
          const top = toY(row);
          const bot = toY(row + 1);

          const isCross = currentData.grid[row * M + col] === 1;
          const wasForced = currentData.forcedBumps[row * M + col] === 1;

          if (isCross && !wasForced) {
            // Cross: horizontal and vertical lines
            if (drawH) {
              const [r, g, b] = getPipeColor(pipeH, totalPipes);
              ctx.strokeStyle = `rgb(${r},${g},${b})`;
              ctx.beginPath();
              ctx.moveTo(left, cy);
              ctx.lineTo(right, cy);
              ctx.stroke();
            }
            if (drawV) {
              const [r, g, b] = getPipeColor(pipeV, totalPipes);
              ctx.strokeStyle = `rgb(${r},${g},${b})`;
              ctx.beginPath();
              ctx.moveTo(cx, bot);
              ctx.lineTo(cx, top);
              ctx.stroke();
            }
          } else {
            // Bump: curved elbows
            if (drawH) {
              const [r, g, b] = getPipeColor(pipeH, totalPipes);
              ctx.strokeStyle = `rgb(${r},${g},${b})`;
              ctx.beginPath();
              ctx.moveTo(left, cy);
              ctx.quadraticCurveTo(cx, cy, cx, top);
              ctx.stroke();
            }
            if (drawV) {
              const [r, g, b] = getPipeColor(pipeV, totalPipes);
              ctx.strokeStyle = `rgb(${r},${g},${b})`;
              ctx.beginPath();
              ctx.moveTo(cx, bot);
              ctx.quadraticCurveTo(cx, cy, right, cy);
              ctx.stroke();
            }
          }
        }
      }
    }
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    if (currentData) redraw();
  });

  // Auto-generate on load
  generate();
}
</script>
