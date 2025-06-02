---
title: Shuffling algorithm for q-volume lozenge tilings of the hexagon
model: lozenge-tilings
author: 'Vadim Gorin (original code); Leonid Petrov (porting)'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-06-02-q-vol-Gorin.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-06-02-q-vol-Gorin.cpp'
    txt: 'C++ code for the simulation'
---

<style>
  /* Ensure the canvas scales fully on wide screens and remains responsive on mobile */
  #lozenge-canvas {
    width: 100%;
    height: 80vh; /* Use 80% of viewport height on large screens */
    border: 1px solid #ccc;
    vertical-align: top; /* Align media to the top */
  }
  @media (max-width: 576px) {
    #lozenge-canvas {
      height: 60vh; /* Reduce height on smaller devices */
      vertical-align: top; /* Maintain top alignment on mobile */
    }
  }

  /* Controls styling */
  .controls {
    margin-bottom: 15px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 5px;
  }

  .control-group {
    margin-bottom: 10px;
  }

  .control-group label {
    display: inline-block;
    width: 120px;
    font-weight: bold;
  }

  .control-group input, .control-group select {
    width: 100px;
    padding: 3px 5px;
  }
</style>

<script src="/js/2025-06-02-q-vol-Gorin.js"></script>

This simulation demonstrates **lozenge tilings** using a WASM/JS port of a program by [Vadim Gorin](https://www.stat.berkeley.edu/~vadicgor/research.html). The simulation handles **uniform** and **q^volume** cases for lozenge tilings, providing an interactive way to explore these mathematical structures.

This is a simplified version that focuses on the core tiling generation algorithms. The original implementation by Vadim Gorin includes much more sophisticated features for studying the asymptotic behavior of random lozenge tilings.

**Technical Details:**
- **Uniform case**: All tilings have equal probability
- **q^volume case**: Tilings are weighted by q raised to their volume
- **S operator**: Performs dynamics on the tiling configurations
- **Interactive visualization**: Real-time rendering of the tiling structure

The sampler works entirely in your browser using WebAssembly for computational efficiency.

---

<!-- Controls for the simulation -->
<div class="controls">
  <div class="control-group">
    <label for="n-input">N (paths):</label>
    <input id="n-input" type="number" value="5" min="1" max="20">

    <label for="t-input" style="margin-left: 20px;">T (time):</label>
    <input id="t-input" type="number" value="10" min="1" max="30">

    <label for="s-input" style="margin-left: 20px;">S (current):</label>
    <input id="s-input" type="number" value="0" min="0" readonly>
  </div>

  <div class="control-group">
    <label for="mode-select">Mode:</label>
    <select id="mode-select">
      <option value="6">Hahn (uniform)</option>
      <option value="5">q-Hahn (q^volume)</option>
    </select>

    <label for="q-input" style="margin-left: 20px;">q parameter:</label>
    <input id="q-input" type="number" value="0.5" min="0.01" max="10" step="0.01">
  </div>

  <div class="control-group">
    <button id="initialize-btn" class="btn">Initialize</button>
    <button id="s-operator-btn" class="btn">S Operator</button>
    <button id="s-minus-btn" class="btn">S- Operator</button>
    <button id="export-btn" class="btn">Export Paths</button>
  </div>
</div>

<!-- Progress indicator -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<!-- Visualization canvas -->
<canvas id="lozenge-canvas"></canvas>

<!-- Output area for exported data -->
<div id="output-area" style="margin-top: 15px; display: none;">
  <h4>Exported Paths Data:</h4>
  <pre id="output-content" style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; max-height: 300px;"></pre>
</div>

<script>
Module.onRuntimeInitialized = async function() {
  // Wrap exported functions
  const initializeTiling = Module.cwrap('initializeTiling', 'number', ['number', 'number', 'number', 'number', 'number'], {async: true});
  const performSOperator = Module.cwrap('performSOperator', 'number', [], {async: true});
  const performSMinusOperator = Module.cwrap('performSMinusOperator', 'number', [], {async: true});
  const exportPaths = Module.cwrap('exportPaths', 'number', [], {async: true});
  const updateParameters = Module.cwrap('updateParameters', 'number', ['number', 'number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  // Get DOM elements
  const canvas = document.getElementById('lozenge-canvas');
  const ctx = canvas.getContext('2d');
  const progressElem = document.getElementById('progress-indicator');
  const nInput = document.getElementById('n-input');
  const tInput = document.getElementById('t-input');
  const sInput = document.getElementById('s-input');
  const modeSelect = document.getElementById('mode-select');
  const qInput = document.getElementById('q-input');
  const outputArea = document.getElementById('output-area');
  const outputContent = document.getElementById('output-content');

  // Set canvas size
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Current paths data
  let currentPaths = null;

  // Progress polling
  let progressInterval;
  function startProgressPolling(message) {
    progressElem.innerText = message + " (0%)";
    progressInterval = setInterval(() => {
      const progress = getProgress();
      progressElem.innerText = message + " (" + progress + "%)";
      if (progress >= 100) {
        clearInterval(progressInterval);
        progressElem.innerText = "";
      }
    }, 100);
  }

  function stopProgressPolling() {
    clearInterval(progressInterval);
    progressElem.innerText = "";
  }

  // Visualization function
  function drawPaths(pathsData) {
    if (!pathsData || !pathsData.paths) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const paths = pathsData.paths;
    const n = pathsData.n;
    const t = pathsData.t;

    if (paths.length === 0) return;

    // Calculate drawing parameters
    const margin = 50;
    const plotWidth = canvas.width - 2 * margin;
    const plotHeight = canvas.height - 2 * margin;

    // Find data bounds
    let minY = Infinity, maxY = -Infinity;
    paths.forEach(path => {
      path.forEach(y => {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
    });

    const xScale = plotWidth / t;
    const yScale = plotHeight / (maxY - minY + 1);

    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.stroke();

    // Draw paths
    const colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'];

    paths.forEach((path, pathIndex) => {
      ctx.strokeStyle = colors[pathIndex % colors.length];
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let t = 0; t < path.length; t++) {
        const x = margin + t * xScale;
        const y = canvas.height - margin - (path[t] - minY) * yScale;

        if (t === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw points
      ctx.fillStyle = colors[pathIndex % colors.length];
      for (let t = 0; t < path.length; t++) {
        const x = margin + t * xScale;
        const y = canvas.height - margin - (path[t] - minY) * yScale;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Labels
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Time', canvas.width / 2, canvas.height - 10);

    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Position', 0, 0);
    ctx.restore();
  }

  // Event handlers
  document.getElementById('initialize-btn').addEventListener('click', async function() {
    const n = parseInt(nInput.value);
    const t = parseInt(tInput.value);
    const s = parseInt(sInput.value);
    const mode = parseInt(modeSelect.value);
    const q = parseFloat(qInput.value);

    startProgressPolling("Initializing");

    try {
      const ptr = await initializeTiling(n, t, s, mode, q);
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      const result = JSON.parse(jsonStr);
      if (result.error) {
        alert("Error: " + result.error);
      } else {
        sInput.value = result.s;
        console.log("Initialized successfully");
      }
    } catch (error) {
      alert("Initialization failed: " + error.message);
    }

    stopProgressPolling();
  });

  document.getElementById('s-operator-btn').addEventListener('click', async function() {
    startProgressPolling("Performing S operator");

    try {
      const ptr = await performSOperator();
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      const result = JSON.parse(jsonStr);
      if (result.error) {
        alert("Error: " + result.error);
      } else {
        sInput.value = result.s;
        console.log("S operator completed");
      }
    } catch (error) {
      alert("S operator failed: " + error.message);
    }

    stopProgressPolling();
  });

  document.getElementById('s-minus-btn').addEventListener('click', async function() {
    startProgressPolling("Performing S- operator");

    try {
      const ptr = await performSMinusOperator();
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      const result = JSON.parse(jsonStr);
      if (result.error) {
        alert("Error: " + result.error);
      } else {
        sInput.value = result.s;
        console.log("S- operator completed");
      }
    } catch (error) {
      alert("S- operator failed: " + error.message);
    }

    stopProgressPolling();
  });

  document.getElementById('export-btn').addEventListener('click', async function() {
    startProgressPolling("Exporting paths");

    try {
      const ptr = await exportPaths();
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      const result = JSON.parse(jsonStr);
      if (result.error) {
        alert("Error: " + result.error);
      } else {
        currentPaths = result;
        drawPaths(result);
        outputContent.textContent = JSON.stringify(result, null, 2);
        outputArea.style.display = 'block';
        console.log("Paths exported successfully");
      }
    } catch (error) {
      alert("Export failed: " + error.message);
    }

    stopProgressPolling();
  });

  // Update q input visibility based on mode
  modeSelect.addEventListener('change', function() {
    const mode = parseInt(this.value);
    qInput.disabled = (mode === 6);
    if (mode === 6) {
      qInput.value = '1.0';
    } else {
      qInput.value = '0.5';
    }
  });

  // Initialize with default parameters
  setTimeout(() => {
    document.getElementById('initialize-btn').click();
  }, 500);
};
</script>
