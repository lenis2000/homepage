---
title: Domino tilings with random Bernoulli Weights and Glauber Dynamics
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-05-09-random-weights-glauber.md'
    txt: 'This simulation is interactive, written in JavaScript; see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-05-09-random-weights-glauber.cpp'
    txt: 'C++ code for the simulation'
---

<style>
  /* Basic styling for the SVG and controls */
  #aztec-svg {
    width: 100%;
    height: 80vh;
    border: 1px solid #ccc;
  }
  .controls {
    margin-bottom: 10px;
  }
  #zoom-in-btn, #zoom-out-btn {
    font-weight: bold;
    width: 30px;
    height: 30px;
  }
  #zoom-reset-btn {
    height: 30px;
  }
  #dynamics-btn {
    background-color: #4CAF50;
    color: white;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  #dynamics-btn.running {
    background-color: #f44336;
  }
</style>

<details>
<summary><h2>About the simulation <svg width="14" height="10" style="vertical-align: middle; margin-left: 3px;">
      <polygon points="2,2 12,2 7,8" style="fill:#888;" />
    </svg></h2>
</summary>


<p>This interactive application demonstrates random domino tilings of an Aztec diamond - a diamond-shaped union of unit squares. The simulation allows exploration of two distinct sampling methods:</p>

<h5>1. Initial sampling (Shuffling algorithm)</h5>

<p>The initial configuration is generated using the exact-sampling shuffling algorithm, producing a perfect sample from the weighted domino tiling measure, with random Bernoulli weights on 3/4 of edges. The Bernoulli weights are equal to $u$ or $v$ with probability 1/2, where $u$ and $v$ are user-defined parameters. The remaining 1/4 of edges are assigned a deterministic weight of 1.0.</p>

<h5>2. Glauber dynamics</h5>

<p>After generating an initial configuration, you can observe the evolution of the system through Glauber dynamics - a Markov chain Monte Carlo method that preserves the stationary distribution. Each step attempts to flip a randomly chosen 2×2 block of cells according to the heat-bath probability determined by the edge weights.</p>

<p>Unlike the shuffling algorithm which generates an exact sample immediately, Glauber dynamics shows the system evolving over time.</p>

<p>You can change the weights before the Glauber dynamics, effectively running a dynamics out of equilibrium.</p>

<h3>Weight Graph Visualization</h3>

<p>The "Show Weight Graph" button displays a graphical representation of the edge weights used in the simulation:</p>
<ul>
  <li>Edges with weight 1.0 (shown in blue) are deterministic</li>
  <li>Edges with weight u (shown in red) or v (shown in green) are randomly assigned according to the Bernoulli distribution</li>
</ul>

<p>The graph visualization shows a 4×4 corner of the weight matrix to help understand the spatial arrangement of weights in the Aztec diamond graph.</p>

<p>The sampling runs entirely in your browser. For sizes up to about n≤120 the sampler is fast; larger n may take noticeable time (hard cap n=300 to protect your browser).</p>
</details>

---

<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="/js/2025-05-09-random-weights-glauber.js"></script>

<!-- Simulation Controls -->
<!-- Dynamics controls – always visible -->

<div class="controls">
  <label for="n-input">Aztec Diamond Order (n ≤ 300): </label>
  <input id="n-input" type="number" value="6" min="2" step="2" max="300" size="3" onchange="onNChange()">
  <button id="update-btn">Sample</button>
  <button id="cancel-btn" style="display: none; margin-left: 10px; background-color: #ff5555;">Cancel</button>
</div>

<div class="controls">
  <label for="u-input">Value u:</label>
  <input id="u-input" type="number" value="0.5" step="0.1" min="0.1" oninput="updateWeightsIfShown()">
  <label for="v-input">Value v:</label>
  <input id="v-input" type="number" value="1.5" step="0.1" min="0.1" oninput="updateWeightsIfShown()">
  <button id="update-weights-btn" style="margin-left: 10px;">Update Weights</button>
  <span style="margin-left: 10px; font-style: italic;">(Random Bernoulli weights use u or v with probability 1/2)</span>
</div>


<!-- Height function toggle -->
<div class="controls">
  <label for="height-toggle">
    <input type="checkbox" id="height-toggle"> Show height function
  </label>
</div>

<!-- Weight Graph Display -->
<div class="controls">
  <button id="show-weights-btn">Show Weight Graph</button>
</div>
<div id="weight-matrix-container" style="display: none; margin-top: 15px; margin-bottom: 15px; overflow-x: auto;">
  <!-- Graph visualization of weights -->
  <div>
    <h4>Weight Graph Visualization (4×4 Corner)</h4>
    <p style="font-style: italic; font-size: 0.9em;">This shows a corner of the Aztec diamond graph with labeled weights</p>
    <svg id="weight-graph-svg" width="400" height="400" style="border: 1px solid #ccc; background-color: #f9f9f9;"></svg>
  </div>
</div>

<!-- Progress indicator -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<div class="row">
  <div class="col-12">
    <svg id="aztec-svg"></svg>
  </div>
</div>

<div style="margin-top: 10px; margin-bottom: 10px;">
  <button id="tikz-btn" class="btn btn-primary">Generate TikZ Code</button>
  <div id="tikz-buttons-container" style="margin-top: 10px; display: none;">
    <button id="copy-tikz-btn" class="btn btn-primary">Copy to Clipboard</button>
    <button id="download-tikz-btn" class="btn btn-primary" style="margin-left: 10px;">Download .tex File</button>
    <span id="copy-success-msg" style="color: green; margin-left: 10px; font-weight: bold; display: none;">Copied!</span>
  </div>
</div>

<!-- TikZ code container that will be updated dynamically -->
<div id="tikz-code-container" style="font-family: 'Courier New', monospace; padding: 15px; border: 1px solid #ccc; border-radius: 4px; background-color: white; white-space: pre; font-size: 14px; max-height: 40vh; overflow-y: auto; margin-top: 15px; margin-bottom: 15px; display: none;"></div>

<script>
// Global variables to cache the simulation state.
let cachedDominoes = null;
let dynamicsRunning = false;
let dynamicsTimer = null;
let g_W = null; // Global variable to store the weight matrix
let g_N = null; // Global variable to track current matrix size (2*n)
let useHeightFunction = false; // Track height function visibility state
let heightGroup; // Group for height function display

// Helper: convert a brightness value (0–255) to a hex grayscale string.
function grayHex(brightness) {
  let hex = Math.round(brightness).toString(16);
  if(hex.length < 2) hex = "0" + hex;
  return "#" + hex + hex + hex;
}

// Pre-compute grayscale palettes for the four original colors.
const palettes = {
"#ff0000": d3.range(0,8).map(i => grayHex(30*i+5)),
"#00ff00": d3.range(0,8).map(i => grayHex(30*i+10)),
"#0000ff": d3.range(0,8).map(i => grayHex(30*i+12)),
"#ffff00": d3.range(0,8).map(i => grayHex(30*i+18))
};

function getPos(d) {
    if (d.w > d.h) {
        return ((Math.floor(d.x) % 8) + 8) % 8;
    } else {
        return ((Math.floor(d.y) % 8) + 8) % 8;
    }
}

function getGrayscaleColor(originalColor, d) {
  let c = d3.color(originalColor);
  if (!c) return originalColor;
  let normHex = c.formatHex().toLowerCase();
  let pos = getPos(d);
  if (palettes[normHex]) {
    return palettes[normHex][pos];
  }
  let r = c.r, g = c.g, b = c.b;
  let lum = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
  let offset = ((pos / 7) - 0.5) * 80;
  let newLum = Math.max(0, Math.min(255, lum + offset));
  return grayHex(newLum);
}

// Wrap exported functions after module is initialized.
Module.onRuntimeInitialized = async function() {
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number','number','number'], {async: true});
  const simulateAztecGlauber = Module.cwrap('simulateAztecGlauber', 'number', ['number','number','number','number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  // Add this new function for single Glauber steps
  const performGlauberStep = Module.cwrap('performGlauberStep', 'number', ['number', 'number'], {async: true});
  const performGlauberSteps = Module.cwrap('performGlauberSteps', 'number', ['number','number','number'], {async:true});

  // Add new function to get the weight matrix
  const getWeightMatrix = Module.cwrap('getWeightMatrix', 'number', [], {async: true});

  // Add reset global state function
  const resetGlobalState = Module.cwrap('resetGlobalState', null, [], {});

  const svg = d3.select("#aztec-svg");
  const progressElem = document.getElementById("progress-indicator");
  const updateBtn = document.getElementById("update-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  let dynamicsBtn = document.getElementById("dynamics-btn"); // Changed to let since we'll reassign it
  let progressInterval;

  // Create zoom behavior
  let initialTransform = {}; // Store initial transform parameters
  const zoom = d3.zoom()
    .scaleExtent([0.1, 50]) // Min and max zoom scale
    .on("zoom", (event) => {
      if (!initialTransform.scale) return; // Skip if no initial transform is set

      // Apply the zoom transformation on top of initial transform
      const group = svg.select("g");
      const t = event.transform;
      const transformStr = `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k})`;
      group.attr("transform", transformStr);
      
      // Also transform height function group if it exists
      if (heightGroup) {
        heightGroup.attr("transform", transformStr);
      }
    });

  // Enable zoom on the SVG
  svg.call(zoom);

  // Add double-click to reset zoom
  svg.on("dblclick.zoom", () => {
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  });

  // Add zoom controls to the UI
  const controlsContainer = d3.select(".row").insert("div", "div")  // Insert before the SVG container
    .attr("class", "col-12")
    .append("div")
    .attr("class", "controls zoom-controls")
    .style("margin-bottom", "10px");

  controlsContainer.append("span")
    .text("Zoom: ")
    .style("font-weight", "bold");

  controlsContainer.append("button")
    .attr("id", "zoom-in-btn")
    .style("margin-left", "5px")
    .text("+")
    .on("click", () => {
      svg.transition()
        .duration(300)
        .call(zoom.scaleBy, 1.3);
    });

  controlsContainer.append("button")
    .attr("id", "zoom-out-btn")
    .style("margin-left", "5px")
    .text("-")
    .on("click", () => {
      svg.transition()
        .duration(300)
        .call(zoom.scaleBy, 0.7);
    });

  controlsContainer.append("button")
    .attr("id", "zoom-reset-btn")
    .style("margin-left", "5px")
    .text("Reset Zoom")
    .on("click", () => {
      svg.transition()
        .duration(300)
        .call(zoom.transform, d3.zoomIdentity);
    });

  controlsContainer.append("span")
    .style("margin-left", "10px")
    .style("font-style", "italic")
    .style("font-size", "0.9em")
    .text("(You can also use mouse wheel to zoom and drag to pan)");

  // Add the Glauber dynamics controls just before zoom controls
  controlsContainer.insert("div", ":first-child")
    .attr("class", "controls")
    .style("margin-bottom", "10px")
    .html(`
      <label for="sweeps-input">Sweeps per visual update:</label>
      <input id="sweeps-input" type="number"
             value="100" min="1" step="1" style="width:70px;">
      <button id="dynamics-btn" style="margin-left:10px;">Start Glauber Dynamics</button>
    `);

  // Update the dynamics button reference since we created it dynamically
  dynamicsBtn = document.getElementById("dynamics-btn");

  // Add event listener after the button is created
  dynamicsBtn.addEventListener("click", toggleDynamics);

  // Handle height function toggle
  document.getElementById("height-toggle").addEventListener("change", function() {
    useHeightFunction = this.checked;
    if (cachedDominoes && cachedDominoes.length > 0) {
      toggleHeightFunction();
    }
  });

  // Simulation state
  let simulationActive = false;
  let simulationAbortController = null;

  // Helper function to sleep for ms milliseconds
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function startSimulation() {
    simulationActive = true;
    updateBtn.disabled = true;
    document.getElementById("n-input").disabled = true;
    // Removed references to a-input and b-input as they no longer exist
    cancelBtn.style.display = 'inline-block';

    simulationAbortController = new AbortController();
  }

  function stopSimulation() {
    simulationActive = false;
    clearInterval(progressInterval);
    updateBtn.disabled = false;
    document.getElementById("n-input").disabled = false;
    // Removed references to a-input and b-input as they no longer exist
    cancelBtn.style.display = 'none';
    progressElem.innerText = "Simulation cancelled";

    if (simulationAbortController) {
      simulationAbortController.abort();
      simulationAbortController = null;
    }
  }

  function startProgressPolling() {
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
      if (!simulationActive) {
        clearInterval(progressInterval);
        return;
      }

      const progress = getProgress();
      progressElem.innerText = "Sampling... (" + progress + "%)";
      if (progress >= 100) clearInterval(progressInterval);
    }, 100);
  }

// --- helper: run nSteps Glauber flips with current a,b and redraw ---
async function advanceDynamics(nSteps) {
  // Get the current u and v values from the interface
  const uVal = parseFloat(document.getElementById("u-input").value);
  const vVal = parseFloat(document.getElementById("v-input").value);

  const ptr   = await performGlauberSteps(uVal, vVal, nSteps);
  const json  = Module.UTF8ToString(ptr);
  freeString(ptr);

  cachedDominoes = JSON.parse(json);
  updateDominoesVisualization();          // redraw
  return nSteps;                           // tell caller how many steps ran
}


  // Function to start/stop real-time Glauber dynamics
  async function toggleDynamics() {
    if (dynamicsRunning) {
      // Stop dynamics
      clearInterval(dynamicsTimer);
      dynamicsTimer = null;
      dynamicsRunning = false;
      dynamicsBtn.textContent = "Start Glauber Dynamics";
      dynamicsBtn.classList.remove("running");
      progressElem.innerText = "";

      // Re-enable controls
      document.getElementById("sweeps-input").disabled = false;
      document.getElementById("n-input").disabled = false;
      updateBtn.disabled = false;
    } else {
      // Start dynamics
      if (!cachedDominoes) {
        alert("Please generate a tiling first before starting dynamics.");
        return;
      }

      dynamicsRunning = true;
      dynamicsBtn.textContent = "Stop Glauber Dynamics";
      dynamicsBtn.classList.add("running");
      progressElem.innerText = "";

      // Only disable new sample inputs, leave sweeps editable
      document.getElementById("n-input").disabled = true;
      updateBtn.disabled = true;

          // ---- FIRST update *before* timer starts ----
          const firstSteps   = Math.max(1,
            parseInt(document.getElementById('sweeps-input').value, 10) || 1);

          let stepCount      = await advanceDynamics(firstSteps);   // runs once
          progressElem.innerText = "";


      // Start the dynamics timer - perform steps and update visualization
      const updateInterval = 100; // ms between screen draws

      // every update interval:
dynamicsTimer = setInterval(async () => {
  const stepsPerUpdate = Math.max(
        1, parseInt(document.getElementById('sweeps-input').value,10)||1);
  // Get the current u and v values from the interface
  const uVal = parseFloat(document.getElementById("u-input").value);
  const vVal = parseFloat(document.getElementById("v-input").value);

  const ptr = await performGlauberSteps(uVal, vVal, stepsPerUpdate);
  const jsonStr = Module.UTF8ToString(ptr);  freeString(ptr);
  cachedDominoes = JSON.parse(jsonStr);

  updateDominoesVisualization();
  stepCount += stepsPerUpdate;
  progressElem.innerText = "";
}, updateInterval);
    }
  }

  // Function to update just the visualization without resampling
  function updateDominoesVisualization() {
    if (!cachedDominoes) return;

    // Update existing rectangles
    const rects = svg.select("g").selectAll("rect").data(cachedDominoes);

    // Update attributes that might have changed
    rects.attr("fill", d => d.color)
         .attr("x", d => d.x)
         .attr("y", d => d.y)
         .attr("width", d => d.w)
         .attr("height", d => d.h);

    // Update height function if enabled
    if (useHeightFunction) {
      toggleHeightFunction();
    }
  }

  // Function to toggle height function on/off
  function toggleHeightFunction() {
    /* ────────────────────────────────────────────────────────────── 0. clear */
    if (heightGroup) { heightGroup.remove(); heightGroup = null; }
    if (!useHeightFunction) return;
    if (!cachedDominoes || cachedDominoes.length === 0) return;

    /* ─────────────────────────────── 1. determine one lattice unit in pixels */
    //  Every rectangle is either 4×2 or 2×4 lattice units.
    const minSidePx = d3.min(cachedDominoes, d => Math.min(d.w, d.h));
    const unit      = minSidePx / 2;              // 2 lattice units → 1 short side
    if (unit <= 0) { console.error("unit ≤ 0"); return; }

    /* ─────────────────────────────── 2. viewport transform for the new group */
    const minX = d3.min(cachedDominoes, d => d.x);
    const minY = d3.min(cachedDominoes, d => d.y);
    const maxX = d3.max(cachedDominoes, d => d.x + d.w);
    const maxY = d3.max(cachedDominoes, d => d.y + d.h);

    const { width: svgW, height: svgH } = svg.node().getBoundingClientRect();
    const scale = Math.min(svgW / (maxX - minX), svgH / (maxY - minY)) * 0.9;
    const tx    = (svgW - (maxX - minX) * scale) / 2 - minX * scale;
    const ty    = (svgH - (maxY - minY) * scale) / 2 - minY * scale;

    heightGroup = svg.append("g")
      .attr("class", "height-function")
      .attr("transform", `translate(${tx},${ty}) scale(${scale})`);

    /* ───────────────────── 3. convert each domino → (orient, sign, gx, gy)  */
    //     orient 0 = horizontal , 1 = vertical
    //     sign   +1 = blue|red  , −1 = green|yellow
    const dominoData = cachedDominoes.map(d => {
      const horiz  = d.w > d.h;
      const orient = horiz ? 0 : 1;
      const sign   = horiz
          ? (d.color === "green"  ? -1 :  1)   // horizontal: green = −1, blue = +1
          : (d.color === "yellow" ? -1 :  1);  // vertical:   yellow = −1, red  = +1
      const gx = Math.round(d.x / unit);       // lattice coordinates
      const gy = Math.round(d.y / unit);
      return [orient, sign, gx, gy];
    });

    /* ─────────────────────────────── 4. build graph with height increments  */
    const adj = new Map();                      // key → [[nbrKey, Δh], …]
    const edge = (v1, v2, dh) => {
      if (!adj.has(v1)) adj.set(v1, []);
      if (!adj.has(v2)) adj.set(v2, []);
      adj.get(v1).push([v2, dh]);
      adj.get(v2).push([v1, -dh]);
    };

    dominoData.forEach(([o, s, x, y]) => {
      if (o === 0) {                      /* horizontal  (4×2)  */
        const TL = `${x},${y+2}`, TM = `${x+2},${y+2}`, TR = `${x+4},${y+2}`;
        const BL = `${x},${y}`,   BM = `${x+2},${y}`,   BR = `${x+4},${y}`;
        edge(TL, TM, -s);   edge(TM, TR,  s);
        edge(BL, BM,  s);   edge(BM, BR, -s);
        edge(TL, BL,  s);   edge(TM, BM,  3*s);
        edge(TR, BR,  s);
      } else {                            /* vertical    (2×4)  */
        const TL = `${x},${y+4}`, TR = `${x+2},${y+4}`;
        const ML = `${x},${y+2}`, MR = `${x+2},${y+2}`;
        const BL = `${x},${y}`,   BR = `${x+2},${y}`;
        edge(TL, TR, -s);  edge(ML, MR, -3*s);  edge(BL, BR, -s);
        edge(TL, ML,  s);  edge(ML, BL,  -s);
        edge(TR, MR, -s);  edge(MR, BR,  s);
      }
    });

    /* ─────────────────────────────── 5. breadth‑first integration of heights */
    const verts = Array.from(adj.keys())
          .map(k => { const [gx, gy] = k.split(',').map(Number); return {k, gx, gy}; });

    const root = verts.reduce((a, b) =>
          (a.gy < b.gy) || (a.gy === b.gy && a.gx <= b.gx) ? a : b).k;

    const H = new Map([[root, 0]]);
    const queue = [root];
    while (queue.length) {
      const v = queue.shift();
      for (const [w, dh] of adj.get(v)) {
        if (!H.has(w)) { H.set(w, H.get(v) + dh); queue.push(w); }
        else if (H.get(w) !== H.get(v) + dh)
          console.warn(`height inconsistency on edge ${v}↔${w}`);
      }
    }

    /* ─────────────────────────────── 6. render dots + numbers (in pixels)  */
    const n = parseInt(document.getElementById("n-input").value, 10);
    const fontSize = Math.max(8, Math.min(12, 36 - n / 2));   // n = order

    H.forEach((h, key) => {
      const [gx, gy] = key.split(',').map(Number);
      const px = gx * unit, py = gy * unit;                   // back to pixels

      heightGroup.append("circle")
        .attr("cx", px)
        .attr("cy", py)
        .attr("r", fontSize / 6)
        .attr("fill", "black");

      heightGroup.append("text")
        .attr("x", px)
        .attr("y", py)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", `${fontSize}px`)
        .attr("fill", "black")
        .attr("stroke", "white")
        .attr("stroke-width", "3px")
        .attr("paint-order", "stroke")
        .text(-h);
    });

    heightGroup.raise();   // keep on top
  }

  async function updateVisualization(n) {
    // First, stop any running dynamics
    if (dynamicsRunning) {
      clearInterval(dynamicsTimer);
      dynamicsTimer = null;
      dynamicsRunning = false;
      dynamicsBtn.textContent = "Start Glauber Dynamics";
      dynamicsBtn.classList.remove("running");
    }

    // Show or hide height function checkbox based on n value
    const heightToggleDiv = document.querySelector('label[for="height-toggle"]').parentNode;
    if (n > 30) {
      heightToggleDiv.style.display = 'none';
      // If height function was enabled, disable it
      if (useHeightFunction) {
        useHeightFunction = false;
        document.getElementById("height-toggle").checked = false;
      }
    } else {
      heightToggleDiv.style.display = 'block';
    }

    svg.selectAll("g").remove();
    heightGroup = null; // Reset height group when clearing SVG
    startSimulation();
    startProgressPolling();

    const signal = simulationAbortController.signal;

    // Hide the TikZ code container if it's visible
    const codeContainer = document.getElementById('tikz-code-container');
    if (codeContainer) {
      codeContainer.style.display = 'none';
    }

    // Hide the buttons container
    const buttonsContainer = document.getElementById('tikz-buttons-container');
    if (buttonsContainer) {
      buttonsContainer.style.display = 'none';
    }

    // Allow UI to update before starting heavy computation
    await sleep(50);
    if (signal.aborted) return;

    // Get u and v values from the interface
    const uVal = parseFloat(document.getElementById("u-input").value);
    const vVal = parseFloat(document.getElementById("v-input").value);
    // Verify u and v are valid
    if (isNaN(uVal) || isNaN(vVal) || uVal <= 0 || vVal <= 0) {
      alert("Values for u and v must be positive numbers.");
      stopSimulation();
      return;
    }

    // Run simulation with periodic yielding to keep UI responsive
    try {
      // always take an exact shuffling sample
      // Use the current n value and u,v values for the random Bernoulli weights
      console.log(`Generating new sample with n=${n}, u=${uVal}, v=${vVal}`);
      let ptr = await simulateAztec(n, uVal, vVal);


      if (signal.aborted) {
        if (ptr) freeString(ptr);
        return;
      }

      // Allow UI thread to breathe
      await sleep(10);
      if (signal.aborted) {
        if (ptr) freeString(ptr);
        return;
      }

      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      if (signal.aborted) return;

      // Allow UI thread to breathe before parsing
      await sleep(10);
      if (signal.aborted) return;

      let dominoes;
      try {
        dominoes = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Error parsing JSON:", e, jsonStr);
        if (simulationActive) {
          progressElem.innerText = "Error during sampling";
        }
        clearInterval(progressInterval);
        return;
      }

      if (signal.aborted) return;

      cachedDominoes = dominoes;

      // Update our JavaScript tracking of the current n value
      g_N = 2 * n;
      console.log(`Updated g_N to ${g_N} (n=${n})`);

      const minX = d3.min(dominoes, d => d.x);
      const minY = d3.min(dominoes, d => d.y);
      const maxX = d3.max(dominoes, d => d.x + d.w);
      const maxY = d3.max(dominoes, d => d.y + d.h);
      const widthDominoes = maxX - minX;
      const heightDominoes = maxY - minY;

      // Allow UI thread to breathe before rendering
      await sleep(10);
      if (signal.aborted) return;

      const bbox = svg.node().getBoundingClientRect();
      const svgWidth = bbox.width;
      const svgHeight = bbox.height;
      svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

      const scale = Math.min(svgWidth / widthDominoes, svgHeight / heightDominoes) * 0.9;
      const translateX = (svgWidth - widthDominoes * scale) / 2 - minX * scale;
      const translateY = (svgHeight - heightDominoes * scale) / 2 - minY * scale;

      // Store the initial transform parameters for zoom behavior
      initialTransform = {
        translateX: translateX,
        translateY: translateY,
        scale: scale
      };

      // Reset the zoom transform when creating a new visualization
      svg.call(zoom.transform, d3.zoomIdentity);

      const group = svg.append("g")
                       .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");

      // Render dominoes in batches to keep UI responsive
      const BATCH_SIZE = 200;

      for (let i = 0; i < dominoes.length && simulationActive; i += BATCH_SIZE) {
        if (signal.aborted) return;

        const batch = dominoes.slice(i, i + BATCH_SIZE);

        group.selectAll("rect.batch" + i)
             .data(batch)
             .enter()
             .append("rect")
             .attr("x", d => d.x)
             .attr("y", d => d.y)
             .attr("width", d => d.w)
             .attr("height", d => d.h)
             .attr("fill", d => d.color)
             .attr("stroke", "#000")
             .attr("stroke-width", 0.5);

        // Yield to UI thread after each batch
        if (i + BATCH_SIZE < dominoes.length) {
          await sleep(0);
          if (signal.aborted) return;
        }
      }

      // Only update if not aborted
      if (!signal.aborted) {
        // Add height function if enabled
        if (useHeightFunction) {
          toggleHeightFunction();
        }
        
        progressElem.innerText = "";
        updateBtn.disabled = false;
        document.getElementById("n-input").disabled = false;
        cancelBtn.style.display = 'none';
        simulationActive = false;
      }
    } catch (error) {
      console.error("Simulation error:", error);
      if (simulationActive) {
        progressElem.innerText = "Error during simulation";
      }
      stopSimulation();
    }
  }

  document.getElementById("update-btn").addEventListener("click", () => {
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (isNaN(n) || n < 2 || n > 300 || n % 2 !== 0) {
      alert("Please enter a valid even number n, 2 ≤ n ≤ 300.");
      return;
    }

    // We only want to force a resample if n changed, which is handled by onNChange
    // So we DON'T call clearGlobalStateForResample() here
    console.log(`Sampling with n=${n} (only clearing state if n changed)`);

    // Generate new sample with explicitly passed n
    updateVisualization(n);
  });

  // Add cancel button event listener
  document.getElementById("cancel-btn").addEventListener("click", stopSimulation);

  // Note: Dynamics button event listener is now added immediately after the button is created

  // Add update weights button event listener
  document.getElementById("update-weights-btn").addEventListener("click", async function() {
    const u = parseFloat(document.getElementById("u-input").value);
    const v = parseFloat(document.getElementById("v-input").value);

    // Validate u and v
    if (isNaN(u) || isNaN(v) || u <= 0 || v <= 0) {
      alert("Values for u and v must be positive numbers.");
      return;
    }

    // Temporarily disable the button and show progress
    const updateBtn = document.getElementById("update-weights-btn");
    const originalText = updateBtn.textContent;
    updateBtn.disabled = true;
    updateBtn.textContent = "Updating...";
    progressElem.innerText = "Updating weight matrix...";

    try {
      // Call performGlauberSteps with special parameter -1 to signal regeneration of weights
      // but keep the current configuration
      const ptr = await performGlauberSteps(u, v, -1);
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      // Update the visualization with the new configuration (which has the same pattern
      // but possibly uses the new weights for the dynamics)
      cachedDominoes = JSON.parse(jsonStr);
      updateDominoesVisualization();

      // Update the weight matrix display if it's visible
      const weightMatrixContainer = document.getElementById('weight-matrix-container');
      if (weightMatrixContainer && weightMatrixContainer.style.display !== 'none') {
        // Hide and then re-show the weight matrix to force a refresh
        document.getElementById('show-weights-btn').click(); // Hide
        setTimeout(() => {
          document.getElementById('show-weights-btn').click(); // Show again
        }, 100);
      }

      progressElem.innerText = "Weights updated successfully";
      setTimeout(() => {
        progressElem.innerText = "";
      }, 2000);
    } catch (e) {
      console.error("Error updating weights:", e);
      progressElem.innerText = "Error updating weights";
    } finally {
      // Re-enable the button
      updateBtn.disabled = false;
      updateBtn.textContent = originalText;
    }
  });


  // Ensure weight matrix button is visible
  const showWeightsBtn = document.getElementById("show-weights-btn");
  if (showWeightsBtn) showWeightsBtn.style.display = "block";

  // Remove weight-matrix-container if it exists
  const weightMatrixContainer = document.getElementById("weight-matrix-container");
  // Don't hide the container


  // Function to convert SVG dominoes to TikZ code
  function svgToTikZ() {
    if (!cachedDominoes || cachedDominoes.length === 0) {
      alert("Please generate a domino tiling first.");
      return;
    }

    // Convert domino objects to rectangle objects with the format needed for TikZ conversion
    const rectangles = cachedDominoes.map(domino => {
      return {
        x: domino.x / 100,
        y: domino.y / 100,
        width: domino.w / 100,
        height: domino.h / 100,
        fill: domino.color,
        stroke: "black",
        strokeWidth: 0.45 // Scaled down
      };
    });

    // Find the bounds of the drawing
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    // Process rectangles
    for (const rect of rectangles) {
      minX = Math.min(minX, rect.x);
      maxX = Math.max(maxX, rect.x + rect.width);
      minY = Math.min(minY, rect.y);
      maxY = Math.max(maxY, rect.y + rect.height);
    }

    // Calculate a good scale factor
    const width = maxX - minX;
    const height = maxY - minY;
    const maxDimension = Math.max(width, height);
    const scaleFactor = 15.0 / maxDimension;

    // Get current parameters
    const n = parseInt(document.getElementById("n-input").value, 10);
    const u = parseFloat(document.getElementById("u-input").value);
    const v = parseFloat(document.getElementById("v-input").value);

    // Generate TikZ code
    let tikzCode = `\\documentclass{standalone}
\\usepackage{tikz}
\\usepackage{xcolor}

% Define colors to match SVG
\\definecolor{svggreen}{RGB}{0, 128, 0}
\\definecolor{svgred}{RGB}{255, 0, 0}
\\definecolor{svgyellow}{RGB}{255, 255, 0}
\\definecolor{svgblue}{RGB}{0, 0, 255}

\\begin{document}

% n = ${n}, u = ${u}, v = ${v}
% sample obtained by Glauber dynamics
\\begin{tikzpicture}[scale=${scaleFactor.toFixed(6)}]  % Calculated scale

% Dominoes (rectangles)
`;

    // Add rectangles to TikZ code
    rectangles.forEach(rect => {
      // Map SVG colors to TikZ colors
      let fillColor = rect.fill;
      if (fillColor === '#00ff00') fillColor = 'svggreen';
      else if (fillColor === '#ff0000') fillColor = 'svgred';
      else if (fillColor === '#ffff00') fillColor = 'svgyellow';
      else if (fillColor === '#0000ff') fillColor = 'svgblue';

      if (fillColor.startsWith('#') && fillColor !== '#00ff00' && fillColor !== '#ff0000' &&
          fillColor !== '#ffff00' && fillColor !== '#0000ff') {
        // For other hex colors, extract the intensity and use it
        const intensity = parseInt(fillColor.substring(1, 3), 16);
        fillColor = `black!${Math.round((intensity/255)*100)}`;
      }

      // Shift coordinates to keep everything positive
      const x1 = rect.x - minX;
      const y1 = maxY - rect.y - rect.height;  // Invert y and adjust for height
      const x2 = rect.x - minX + rect.width;
      const y2 = maxY - rect.y;

      tikzCode += `\\filldraw[fill=${fillColor}, draw=black, line width=${rect.strokeWidth}pt] `;
      tikzCode += `(${x1.toFixed(2)}, ${y1.toFixed(2)}) rectangle (${x2.toFixed(2)}, ${y2.toFixed(2)});\n`;
    });

    tikzCode += `
\\end{tikzpicture}
\\end{document}`;

    // Update the TikZ code in the code container
    const tikzCodeContainer = document.getElementById('tikz-code-container');
    if (tikzCodeContainer) {
      tikzCodeContainer.textContent = tikzCode;
      tikzCodeContainer.style.display = 'block';
    } else {
      console.error("TikZ code container not found");
    }

    // Show the copy/download buttons
    const buttonsContainer = document.getElementById('tikz-buttons-container');
    if (buttonsContainer) {
      buttonsContainer.style.display = 'block';
    }
  }

  // Add event listeners for the TikZ buttons
  document.getElementById("tikz-btn").addEventListener("click", function() {
    svgToTikZ();
  });

  // Add event listener for the copy button
  document.getElementById("copy-tikz-btn").addEventListener("click", function() {
    const codeContainer = document.getElementById('tikz-code-container');
    const successMsg = document.getElementById('copy-success-msg');

    // Create a text area to copy from (more reliable cross-browser)
    const textArea = document.createElement('textarea');
    textArea.value = codeContainer.textContent;
    textArea.style.position = 'fixed';  // Prevent scrolling to bottom
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      successMsg.style.display = 'inline';
      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 2000);
    } catch (err) {
      alert('Failed to copy to clipboard. Please try again or select and copy manually.');
    }

    document.body.removeChild(textArea);
  });

  // Add event listener for the download button
  document.getElementById("download-tikz-btn").addEventListener("click", function() {
    const codeContainer = document.getElementById('tikz-code-container');
    const n = parseInt(document.getElementById("n-input").value, 10);
    const u = parseFloat(document.getElementById("u-input").value);
    const v = parseFloat(document.getElementById("v-input").value);
    const algo = "glauber";

    const blob = new Blob([codeContainer.textContent], { type: 'text/plain' });
    const fileNameBase = `aztec_periodic_${algo}_n${n}_u${u}_v${v}`;
    const downloadLink = document.createElement('a');
    downloadLink.download = `${fileNameBase.replace(/\./g, "_")}_tikz.tex`;
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
  });

  // Weight graph display functionality
  document.getElementById("show-weights-btn").addEventListener("click", async function() {
    const containerElem = document.getElementById('weight-matrix-container');
    const btnElem = document.getElementById('show-weights-btn');
    const graphSvg = document.getElementById('weight-graph-svg');

    if (containerElem.style.display === 'none') {
      containerElem.style.display = 'block';
      btnElem.textContent = 'Hide Weight Graph';
      btnElem.disabled = true; // Disable button while loading

      progressElem.innerText = "Fetching edge weights...";
      const ptr = await getWeightMatrix(); // C++ function returns JSON with two matrices
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      // For debugging, log the raw JSON string from C++
      console.log("Edge weights JSON from C++:", jsonStr);

      let edgeWeightData;
      try {
        edgeWeightData = JSON.parse(jsonStr);
        if (edgeWeightData.error) {
            console.error("Error from C++ getWeightMatrix:", edgeWeightData.error);
            progressElem.innerText = "Error fetching weight data: " + edgeWeightData.error;
            btnElem.disabled = false;
            return;
        }
        if (!edgeWeightData || !edgeWeightData.horizontal_weights || !edgeWeightData.vertical_weights) {
            throw new Error("Returned JSON does not contain horizontal_weights or vertical_weights.");
        }
      } catch (e) {
        console.error("JSON parse error for edge weights:", e, "Raw JSON:", jsonStr);
        progressElem.innerText = "Error parsing weight data: " + e.message;
        btnElem.disabled = false;
        return;
      }

      const horizontalWeights = edgeWeightData.horizontal_weights;
      const verticalWeights = edgeWeightData.vertical_weights;

      if (!horizontalWeights || !horizontalWeights.length || !verticalWeights || !verticalWeights.length || horizontalWeights.length !== verticalWeights.length) {
        progressElem.innerText = "No valid weight data available or data mismatch. Ensure simulation has run.";
        btnElem.disabled = false;
        return;
      }

      // Call drawWeightGraph with both matrices
      drawWeightGraph(d3.select("#weight-graph-svg").node(), horizontalWeights, verticalWeights);

      progressElem.innerText = ""; // Clear progress message
      btnElem.disabled = false; // Re-enable button

    } else {
      // Hide the weights
      containerElem.style.display = 'none';
      btnElem.textContent = 'Show Weight Graph';
      btnElem.disabled = false;
    }
  });

  // Modify the drawWeightGraph function signature and internal logic
  function drawWeightGraph(svgNode, horizontalWeightMatrix, verticalWeightMatrix) { // Changed signature
    const svg = d3.select(svgNode); // Work with the D3 selection of the SVG node
    svg.selectAll("*").remove(); // Clear previous content

    const graphDisplayCells = 4; // We want to display a 4x4 grid of cells/plaquettes

    if (!horizontalWeightMatrix || !horizontalWeightMatrix.length ||
        !verticalWeightMatrix || !verticalWeightMatrix.length ||
        horizontalWeightMatrix.length !== verticalWeightMatrix.length) {
        console.error("drawWeightGraph: Invalid or mismatched weight matrices.");
        // Optionally display an error message in the SVG itself
        svg.append("text").attr("x", 10).attr("y", 20).text("Error: Weight data unavailable.");
        return;
    }
    const matrixDim = horizontalWeightMatrix.length; // e.g., g_N from C++

    // Size calculations for the SVG drawing area
    const width = parseFloat(svg.attr("width"));
    const height = parseFloat(svg.attr("height"));
    const margin = { top: 40, right: 20, bottom: 70, left: 40 }; // Adjusted margins
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    // Number of nodes to display: graphDisplayCells + 1
    // Max node index will be graphDisplayCells
    const numNodesToDisplay = graphDisplayCells + 1;
    const cellSize = Math.floor(Math.min(graphWidth, graphHeight) / (graphDisplayCells + 1)); // Add padding around

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const uVal = parseFloat(document.getElementById("u-input").value);
    const vVal = parseFloat(document.getElementById("v-input").value);

    // Create grid points (nodes)
    const points = [];
    for (let i = 0; i < numNodesToDisplay && i < matrixDim; i++) {
      for (let j = 0; j < numNodesToDisplay && j < matrixDim; j++) {
        points.push({ x: j * cellSize, y: i * cellSize, row: i, col: j });
      }
    }

    // Draw horizontal edges
    const horizontalEdges = [];
    for (let i = 0; i < numNodesToDisplay && i < matrixDim; i++) {         // Node row index
      for (let j = 0; j < numNodesToDisplay - 1 && j < matrixDim -1; j++) { // Node col index (start of edge)
          const weight = horizontalWeightMatrix[i][j];
          let color = "grey"; // Default for unexpected weights
          if (Math.abs(weight - 1.0) < 0.01) color = "#1976D2";
          else if (Math.abs(weight - uVal) < 0.01) color = "#D32F2F";
          else if (Math.abs(weight - vVal) < 0.01) color = "#388E3C";

          horizontalEdges.push({
            x1: j * cellSize, y1: i * cellSize,
            x2: (j + 1) * cellSize, y2: i * cellSize,
            weight: weight.toFixed(1), color: color
          });
      }
    }

    // Draw vertical edges
    const verticalEdges = [];
    for (let i = 0; i < numNodesToDisplay - 1 && i < matrixDim -1; i++) { // Node row index (start of edge)
      for (let j = 0; j < numNodesToDisplay && j < matrixDim; j++) {     // Node col index
          const weight = verticalWeightMatrix[i][j];
          let color = "grey"; // Default for unexpected weights
          if (Math.abs(weight - 1.0) < 0.01) color = "#1976D2";
          else if (Math.abs(weight - uVal) < 0.01) color = "#D32F2F";
          else if (Math.abs(weight - vVal) < 0.01) color = "#388E3C";

          verticalEdges.push({
            x1: j * cellSize, y1: i * cellSize,
            x2: j * cellSize, y2: (i + 1) * cellSize,
            weight: weight.toFixed(1), color: color
          });
      }
    }

    // Draw edges (lines)
    g.selectAll(".h-edge")
      .data(horizontalEdges)
      .enter().append("line")
      .attr("class", "h-edge")
      .attr("x1", d => d.x1).attr("y1", d => d.y1)
      .attr("x2", d => d.x2).attr("y2", d => d.y2)
      .attr("stroke", d => d.color).attr("stroke-width", 2);

    g.selectAll(".v-edge")
      .data(verticalEdges)
      .enter().append("line")
      .attr("class", "v-edge")
      .attr("x1", d => d.x1).attr("y1", d => d.y1)
      .attr("x2", d => d.x2).attr("y2", d => d.y2)
      .attr("stroke", d => d.color).attr("stroke-width", 2);

    // Add weight labels for horizontal edges
    g.selectAll(".h-label")
      .data(horizontalEdges)
      .enter().append("text")
      .attr("class", "h-label")
      .attr("x", d => (d.x1 + d.x2) / 2).attr("y", d => d.y1 - 5)
      .attr("text-anchor", "middle").attr("font-size", "10px")
      .attr("fill", d => d.color).text(d => d.weight);

    // Add weight labels for vertical edges
    g.selectAll(".v-label")
      .data(verticalEdges)
      .enter().append("text")
      .attr("class", "v-label")
      .attr("x", d => d.x1 + 5).attr("y", d => (d.y1 + d.y2) / 2)
      .attr("text-anchor", "start").attr("dominant-baseline", "middle")
      .attr("font-size", "10px").attr("fill", d => d.color)
      .text(d => d.weight);

    // Draw grid points (nodes)
    g.selectAll(".grid-point")
      .data(points)
      .enter().append("circle")
      .attr("class", "grid-point")
      .attr("cx", d => d.x).attr("cy", d => d.y)
      .attr("r", 3).attr("fill", "black");

    // Legend (should still be correct as it uses uVal, vVal from UI)
    const legend = g.append("g")
      .attr("transform", `translate(10, ${Math.min(graphHeight, (numNodesToDisplay)*cellSize) + 10})`) // Position legend below graph
      .attr("font-size", "12px");

    legend.append("text").attr("y", -10).attr("font-weight", "bold").text("Legend (Edge Weights):");
    legend.append("line").attr("x1", 0).attr("y1", 10).attr("x2", 20).attr("y2", 10).attr("stroke", "#1976D2").attr("stroke-width", 2);
    legend.append("text").attr("x", 25).attr("y", 14).text("1.0 (deterministic)");
    legend.append("line").attr("x1", 0).attr("y1", 30).attr("x2", 20).attr("y2", 30).attr("stroke", "#D32F2F").attr("stroke-width", 2);
    legend.append("text").attr("x", 25).attr("y", 34).text(`${uVal.toFixed(1)} (u value)`);
    legend.append("line").attr("x1", 0).attr("y1", 50).attr("x2", 20).attr("y2", 50).attr("stroke", "#388E3C").attr("stroke-width", 2);
    legend.append("text").attr("x", 25).attr("y", 54).text(`${vVal.toFixed(1)} (v value)`);
  }

  // Tracks the previously used n value
  let previousN = parseInt(document.getElementById("n-input").value, 10) || 6;

  // Called when n input changes
  window.onNChange = function() {
    const newN = parseInt(document.getElementById("n-input").value, 10);
    // Only clear global state if n actually changed
    if (newN !== previousN) {
      console.log(`n changed from ${previousN} to ${newN}, clearing global state`);
      previousN = newN;
      clearGlobalStateForResample();
    }
  };

  // Helper to clear global state to force fresh resampling
  window.clearGlobalStateForResample = function() {
    // This JavaScript counterpart to C++ global state clearing
    // Makes sure we force a complete resampling with new dimensions
    // To be called when n changes before sampling

    // Reset cached dominoes
    cachedDominoes = null;

    // Reset the C++ global state
    if (Module && Module.ccall) {
      try {
        console.log("Calling resetGlobalState to clear C++ globals");
        Module.ccall("resetGlobalState", null, [], []);
      } catch (e) {
        console.error("Error calling resetGlobalState:", e);
      }
    }
  };

  // Function to update weight graph when u/v values change
  window.updateWeightsIfShown = function() {
    const containerElem = document.getElementById('weight-matrix-container');

    // Only update if the weight graph is currently visible
    if (containerElem && containerElem.style.display !== 'none') {
      // Prevent too rapid updates with a debounce mechanism
      if (window.weightUpdateTimer) {
        clearTimeout(window.weightUpdateTimer);
      }

      // Schedule update after a short delay to avoid too many rapid updates
      window.weightUpdateTimer = setTimeout(async function() {
        // Get the current u/v values
        const u = parseFloat(document.getElementById('u-input').value);
        const v = parseFloat(document.getElementById('v-input').value);

        if (!isNaN(u) && !isNaN(v) && u > 0 && v > 0) {
          // Force a complete refresh of the weight graph visualization
          // Hide and then re-show the weight graph to trigger a refresh with the latest u/v values
          document.getElementById('show-weights-btn').click(); // Hide
          setTimeout(() => {
            document.getElementById('show-weights-btn').click(); // Show again
          }, 100);
        }
      }, 300);
    }
  };

  const initialN = parseInt(document.getElementById("n-input").value, 10);
  updateVisualization(initialN);
};
</script>
