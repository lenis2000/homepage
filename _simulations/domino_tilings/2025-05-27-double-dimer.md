---
title: Double dimer covering
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-05-27-double-dimer.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-05-27-double-dimer.cpp'
    txt: 'C++ code for the simulation'
  - link: 'https://github.com/lenis2000/homepage/blob/master/LaTeX/Scripts/2025-04-14-SVG_to_TiKZ_domino_tiling_convert.py'
    txt: 'Python script for TikZ export (now integrated directly in the web page)'
---

<style>
  /* Ensure the SVG scales fully on wide screens and remains responsive on mobile */
  #aztec-svg {
    width: 100%;
    height: 80vh; /* Use 80% of viewport height on large screens */
    vertical-align: top; /* Align media to the top */
  }
  @media (max-width: 576px) {
    #aztec-svg {
      height: 60vh; /* Reduce height on smaller devices */
      vertical-align: top; /* Maintain top alignment on mobile */
    }
  }

  /* Zoom controls styling */
  #zoom-in-btn, #zoom-out-btn {
    font-weight: bold;
    width: 30px;
    height: 30px;
  }
  #zoom-reset-btn {
    height: 30px;
  }
</style>

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="/js/2025-05-27-double-dimer.js"></script>

This simulation demonstrates <b>double dimer configurations</b> on an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a>. Two independent dimer configurations are sampled and displayed simultaneously - one in black and one in red. The simulation uses <b>random IID weights</b> sampled from a Bernoulli distribution to generate tilings via the <a href="https://arxiv.org/abs/math/0111034">shuffling algorithm</a>. The original python code was created by <a href="https://www.durham.ac.uk/staff/sunil-chhita/">Sunil Chhita</a>; this version is adapted for <code>JS</code> + <code>WebAssembly</code>. Visualization is done using <code>D3.js</code>.

The sampler works in your browser. Up to $n \sim 120$ it works in reasonable time, but for larger $n$ it may take a while.
I set the upper bound at $n=400$ to avoid freezing your browser.

<b>Random Weights:</b> Each edge weight $W_{ij}$ is sampled independently from a Bernoulli distribution that takes value "Value 1" with probability "P(Value 1)" and value "Value 2" with probability $1 - P(\text{Value 1})$. The default values (1/2 and 3/2 with equal probability) create a mildly inhomogeneous environment.


---

<!-- Controls to change n and weight parameters -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 400$): </label>
  <!-- Updated input: starting value 24, even numbers only (step=2), three-digit window (size=3), maximum 400 -->
  <input id="n-input" type="number" value="24" min="2" step="2" max="400" size="3">
  <button id="update-btn">Update</button>
  <button id="cancel-btn" style="display: none; margin-left: 10px; background-color: #ff5555;">Cancel</button>
</div>

<!-- Weight distribution controls -->
<div style="margin-bottom: 10px;">
  <strong>Weight Distribution (Bernoulli):</strong>
  <label for="value1-input" style="margin-left: 10px;">Value 1: </label>
  <input id="value1-input" type="number" value="0.5" min="0.01" step="0.1" size="6" style="width: 60px;">
  <label for="value2-input" style="margin-left: 10px;">Value 2: </label>
  <input id="value2-input" type="number" value="1.5" min="0.01" step="0.1" size="6" style="width: 60px;">
  <label for="prob1-input" style="margin-left: 10px;">P(Value 1): </label>
  <input id="prob1-input" type="number" value="0.5" min="0" max="1" step="0.1" size="4" style="width: 60px;">
</div>

<!-- Display options -->
<div style="margin-bottom: 10px;">
  <label>
    <input type="checkbox" id="show-double-edges" checked>
    Show double edges (edges present in both configurations)
  </label>
  <label style="margin-left: 20px;">
    <input type="checkbox" id="show-weight-matrix">
    Show weight matrix sample (upper-left 8×8)
  </label>
</div>

<!-- Weight matrix display (hidden by default) -->
<div id="weight-matrix-display" style="display: none; margin-bottom: 10px; font-family: monospace; font-size: 12px;">
  <strong>Shared Weight Matrix Sample (8×8 upper-left corner):</strong>
  <p style="font-size: 11px; color: #666; margin: 5px 0;">Note: Both domino tilings use the same weight matrix. They are independent samples from the same weighted distribution.</p>
  <div id="weight-matrix-content" style="margin-top: 5px; padding: 10px; background-color: #f5f5f5; border: 1px solid #ddd; overflow-x: auto;">
    <!-- Matrix content will be inserted here -->
  </div>
</div>

<!-- Progress indicator (polling progress from the C++ code via getProgress) -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>


<!-- Domino View -->
<div id="domino-view">
  <div style="margin-top: 8px; margin-bottom: 8px;">
    <strong>Double Dimer Configuration:</strong> Black dimers show the first configuration, red dimers show the second configuration. Purple dimers are "double edges" that appear in both configurations. Use the checkbox above to show/hide double edges.
  </div>

  <div class="row">
    <div class="col-12">
      <svg id="aztec-svg"></svg>
    </div>
  </div>
</div>
<script>
Module.onRuntimeInitialized = async function() {
  // Wrap exported functions asynchronously.
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number'], {async: true});
  const simulateAztecWithWeights = Module.cwrap('simulateAztecWithWeights', 'number', ['number', 'number', 'number', 'number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const svg = d3.select("#aztec-svg");
  const progressElem = document.getElementById("progress-indicator");
  const inputField = document.getElementById("n-input");
  const value1Input = document.getElementById("value1-input");
  const value2Input = document.getElementById("value2-input");
  const prob1Input = document.getElementById("prob1-input");
  const showDoubleEdgesCheckbox = document.getElementById("show-double-edges");
  const showWeightMatrixCheckbox = document.getElementById("show-weight-matrix");
  const weightMatrixDisplay = document.getElementById("weight-matrix-display");
  const weightMatrixContent = document.getElementById("weight-matrix-content");
  let progressInterval;
  let useColors = true; // Track coloring state
  let useCheckerboard = false; // Track checkerboard state
  let usePaths = false; // Track nonintersecting paths state
  let useDimers = false; // Track dimers visibility state
  let useHeightFunction = false; // Track height function visibility state
  let currentDominoes = []; // Store current dominoes for toggling colors
  let currentConfigs = null; // Store both configurations
  let isProcessing = false; // Flag to prevent multiple simultaneous updates
  let lastValue = parseInt(inputField.value, 10); // Track last processed value
  let checkerboardGroup; // Group for checkerboard squares
  let pathsGroup; // Group for nonintersecting paths
  let dimersGroup; // Group for dimers overlay
  let heightGroup; // Group for height function display
  let showDoubleEdges = true; // Track whether to show double edges

  // Function to display weight matrix
  function displayWeightMatrix(matrix) {
    if (!matrix || matrix.length === 0) return;
    
    let html = '<table style="border-collapse: collapse;">';
    
    // Add row/column headers
    html += '<tr><td style="padding: 4px; border: 1px solid #ccc;"></td>';
    for (let j = 0; j < matrix[0].length; j++) {
      html += `<td style="padding: 4px; border: 1px solid #ccc; font-weight: bold; text-align: center;">j=${j}</td>`;
    }
    html += '</tr>';
    
    // Add matrix rows
    for (let i = 0; i < matrix.length; i++) {
      html += `<tr><td style="padding: 4px; border: 1px solid #ccc; font-weight: bold;">i=${i}</td>`;
      for (let j = 0; j < matrix[i].length; j++) {
        const value = matrix[i][j];
        const bgColor = value === parseFloat(value1Input.value) ? '#e8f5e9' : '#fff3e0';
        html += `<td style="padding: 4px; border: 1px solid #ccc; text-align: right; background-color: ${bgColor};">${value}</td>`;
      }
      html += '</tr>';
    }
    html += '</table>';
    
    html += '<div style="margin-top: 10px; font-size: 11px;">';
    html += `<span style="display: inline-block; width: 15px; height: 15px; background-color: #e8f5e9; border: 1px solid #ccc;"></span> Value 1 (${value1Input.value})<br>`;
    html += `<span style="display: inline-block; width: 15px; height: 15px; background-color: #fff3e0; border: 1px solid #ccc;"></span> Value 2 (${value2Input.value})`;
    html += '</div>';
    
    weightMatrixContent.innerHTML = html;
  }

  // Create zoom behavior for domino view
  let initialTransform = {}; // Store initial transform parameters
  const zoom = d3.zoom()
    .scaleExtent([0.1, 50]) // Min and max zoom scale (up to 50x)
    .on("zoom", (event) => {
      if (!initialTransform.scale) return; // Skip if no initial transform is set

      // Apply the zoom transformation on top of initial transform
      const group = svg.select("g.dominoes");
      if (!group.empty()) {
        const t = event.transform;
        group.attr("transform",
          `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k})`);

        // Also transform other groups if they exist
        if (checkerboardGroup) {
          checkerboardGroup.attr("transform",
            `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k})`);
        }
        if (pathsGroup) {
          pathsGroup.attr("transform",
            `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k})`);
        }
        if (dimersGroup) {
          dimersGroup.attr("transform",
            `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k})`);
        }
        if (heightGroup) {
          heightGroup.attr("transform",
            `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k})`);
        }
      }
    });


  // Enable zoom on both SVGs
  svg.call(zoom);

  // Add double-click to reset zoom on both views
  svg.on("dblclick.zoom", () => {
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  });
  // Add zoom controls for domino view
  const dominoControlsContainer = d3.select("#domino-view")
    .insert("div", ".row")
    .attr("class", "zoom-controls")
    .style("margin-bottom", "10px");

  dominoControlsContainer.append("span")
    .text("Zoom: ")
    .style("font-weight", "bold");

  dominoControlsContainer.append("button")
    .attr("id", "zoom-in-btn")
    .style("margin-left", "5px")
    .text("+")
    .on("click", () => {
      svg.transition()
        .duration(300)
        .call(zoom.scaleBy, 1.3);
    });

  dominoControlsContainer.append("button")
    .attr("id", "zoom-out-btn")
    .style("margin-left", "5px")
    .text("-")
    .on("click", () => {
      svg.transition()
        .duration(300)
        .call(zoom.scaleBy, 0.7);
    });

  dominoControlsContainer.append("button")
    .attr("id", "zoom-reset-btn")
    .style("margin-left", "5px")
    .text("Reset Zoom")
    .on("click", () => {
      svg.transition()
        .duration(300)
        .call(zoom.transform, d3.zoomIdentity);
    });

  dominoControlsContainer.append("span")
    .style("margin-left", "10px")
    .style("font-style", "italic")
    .style("font-size", "0.9em")
    .text("(You can also use mouse wheel to zoom and drag to pan)");


  // Simulation state
  let simulationActive = false;
  let simulationAbortController = null;
  const cancelBtn = document.getElementById("cancel-btn");

  // Define n in the broader scope so it's accessible to all functions
  let n = parseInt(inputField.value, 10);



  // Helper function to sleep for ms milliseconds
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function startSimulation() {
    simulationActive = true;
    const updateBtn = document.getElementById("update-btn");

    updateBtn.disabled = true;
    inputField.disabled = true;
    cancelBtn.style.display = 'inline-block';

    simulationAbortController = new AbortController();
  }

  function stopSimulation() {
    simulationActive = false;
    const updateBtn = document.getElementById("update-btn");

    clearInterval(progressInterval);
    updateBtn.disabled = false;
    inputField.disabled = false;
    cancelBtn.style.display = 'none';
    progressElem.innerText = "Simulation cancelled";

    if (simulationAbortController) {
      simulationAbortController.abort();
      simulationAbortController = null;
    }

    isProcessing = false;
  }

  // Start polling the progress counter from C++.
  function startProgressPolling() {
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
      if (!simulationActive) {
        clearInterval(progressInterval);
        return;
      }

      const progress = getProgress();
      progressElem.innerText = "Sampling... (" + progress + "%)";
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
  }

  // Toggle event listeners removed - not applicable for double dimer view

  // Create or update checkerboard overlay
  function toggleCheckerboard() {
    // Remove existing checkerboard if it exists
    if (checkerboardGroup) {
      checkerboardGroup.remove();
      checkerboardGroup = null;
    }
    // If checkerboard is not enabled, just return
    if (!useCheckerboard) return;
    // Compute bounding box of dominoes
    const minX = d3.min(currentDominoes, d => d.x);
    const minY = d3.min(currentDominoes, d => d.y);
    const maxX = d3.max(currentDominoes, d => d.x + d.w);
    const maxY = d3.max(currentDominoes, d => d.y + d.h);
    // Use the computed dimensions of the SVG
    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    const scale = Math.min(svgWidth / (maxX - minX), svgHeight / (maxY - minY)) * 0.9;
    const translateX = (svgWidth - (maxX - minX) * scale) / 2 - minX * scale;
    const translateY = (svgHeight - (maxY - minY) * scale) / 2 - minY * scale;
    // Create a new group for the checkerboard
    checkerboardGroup = svg.append("g")
      .attr("class", "checkerboard")
      .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");
    // Now n is accessible here because it's defined in the broader scope
    const K = (maxX - minX) / (2*n); // Size of each checkerboard square
    const squares = [];
    // Calculate center coordinates
    const centerX = (minX + maxX-2) / 2;
    const centerY = (minY + maxY-2) / 2;

    // Create a grid that fully covers the Aztec diamond
    for (let x = minX; x < maxX; x += K) {
      for (let y = minY; y < maxY; y += K) {
        // For each square, check if its center is within the Aztec diamond
        // The +0.5 ensures we include squares that are exactly on the boundary
        const normX = Math.abs((x + K/2) - centerX) / K;
        const normY = Math.abs((y + K/2) - centerY) / K;

        if (normX + normY <= n + 0.5) {  // Adjusted boundary condition
          squares.push({
            x: x,
            y: y,
            width: K,
            height: K,
            color: ((Math.floor(x/K) + Math.floor(y/K)) % 2 === 0) ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.05)"
          });
        }
      }
    }

    // Render checkerboard squares with some transparency
    checkerboardGroup.selectAll("rect.checkerboard")
      .data(squares)
      .enter()
      .append("rect")
      .attr("class", "checkerboard")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("width", K)
      .attr("height", K)
      .attr("fill", d => d.color)
      .attr("stroke", "rgba(0,0,0,0.1)")
      .attr("stroke-width", 0.05);
    // Move checkerboard on top of dominoes
    checkerboardGroup.raise();
  }

  // Function to toggle paths on/off
  function togglePaths() {
    // Remove existing paths if they exist
    if (pathsGroup) {
      pathsGroup.remove();
      pathsGroup = null;
    }

    // If paths are not enabled, just return
    if (!usePaths) return;

    // Compute bounding box of dominoes
    const minX = d3.min(currentDominoes, d => d.x);
    const minY = d3.min(currentDominoes, d => d.y);
    const maxX = d3.max(currentDominoes, d => d.x + d.w);
    const maxY = d3.max(currentDominoes, d => d.y + d.h);

    // Use the computed dimensions of the SVG
    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    const scale = Math.min(svgWidth / (maxX - minX), svgHeight / (maxY - minY)) * 0.9;
    const translateX = (svgWidth - (maxX - minX) * scale) / 2 - minX * scale;
    const translateY = (svgHeight - (maxY - minY) * scale) / 2 - minY * scale;

    // Create a new group for the paths
    pathsGroup = svg.append("g")
      .attr("class", "paths")
      .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");

    // Draw paths for each domino based on its color and orientation
    currentDominoes.forEach(domino => {
      const centerX = domino.x + domino.w / 2;
      const centerY = domino.y + domino.h / 2;
      const isHorizontal = domino.w > domino.h;

      // Draw different paths based on domino color
      if (domino.color === "green") {
        // Green: Horizontal line through center
        pathsGroup.append("line")
          .attr("x1", domino.x)
          .attr("y1", centerY)
          .attr("x2", domino.x + domino.w)
          .attr("y2", centerY)
          .attr("stroke", "black")
          .attr("stroke-width", 5.5);
      }
      else if (domino.color === "yellow") {
        // Yellow: path parallel to vector (1,-1) through the center
        // Calculate the line endpoints based on center point and direction vector (1,-1)
        const length = Math.min(domino.w, domino.h) * 0.7; // Scale length to fit inside domino

        // Direction vector (1,-1) normalized and scaled
        const dx = length / Math.sqrt(2);
        const dy = length / Math.sqrt(2);

        pathsGroup.append("line")
          .attr("x1", centerX - dx)
          .attr("y1", centerY + dy)
          .attr("x2", centerX + dx)
          .attr("y2", centerY - dy)
          .attr("stroke", "black")
          .attr("stroke-width", 5.5);
      }
      else if (domino.color === "red") {
        // Red: path parallel to vector (1,1) through the center
        // Calculate the line endpoints based on center point and direction vector (1,1)
        const length = Math.min(domino.w, domino.h) * 0.7; // Scale length to fit inside domino

        // Direction vector (1,1) normalized and scaled
        const dx = length / Math.sqrt(2);
        const dy = length / Math.sqrt(2);

        pathsGroup.append("line")
          .attr("x1", centerX - dx)
          .attr("y1", centerY - dy)
          .attr("x2", centerX + dx)
          .attr("y2", centerY + dy)
          .attr("stroke", "black")
          .attr("stroke-width", 5.5);
      }
      // Blue dominos don't get paths
    });

    // Move paths on top of dominoes but below checkerboard if it exists
    pathsGroup.raise();
    if (checkerboardGroup) {
      checkerboardGroup.raise();
    }
    if (dimersGroup) {
      dimersGroup.raise();
    }
  }

  // Function to toggle height function on/off
  function toggleHeightFunction() {
    /* ────────────────────────────────────────────────────────────── 0. clear */
    if (heightGroup) { heightGroup.remove(); heightGroup = null; }
    if (!useHeightFunction) return;
    if (currentDominoes.length === 0) return;

    /* ─────────────────────────────── 1. determine one lattice unit in pixels */
    //  Every rectangle is either 4×2 or 2×4 lattice units.
    const minSidePx = d3.min(currentDominoes, d => Math.min(d.w, d.h));
    const unit      = minSidePx / 2;              // 2 lattice units → 1 short side
    if (unit <= 0) { console.error("unit ≤ 0"); return; }

    /* ─────────────────────────────── 2. viewport transform for the new group */
    const minX = d3.min(currentDominoes, d => d.x);
    const minY = d3.min(currentDominoes, d => d.y);
    const maxX = d3.max(currentDominoes, d => d.x + d.w);
    const maxY = d3.max(currentDominoes, d => d.y + d.h);

    const { width: svgW, height: svgH } = svg.node().getBoundingClientRect();
    const scale = Math.min(svgW / (maxX - minX), svgH / (maxY - minY)) * 0.9;
    const tx    = (svgW - (maxX - minX) * scale) / 2 - minX * scale;
    const ty    = (svgH - (maxY - minY) * scale) / 2 - minY * scale;

    heightGroup = svg.append("g")
      .attr("class", "height-function")
      .attr("transform", `translate(${tx},${ty}) scale(${scale})`);

    /* ───────────────────── 3. convert each domino → (orient, sign, gx, gy)  */
    //     orient 0 = horizontal , 1 = vertical
    //     sign   +1 = blue|red  , −1 = green|yellow
    const dominoData = currentDominoes.map(d => {
      const horiz  = d.w > d.h;
      const orient = horiz ? 0 : 1;
      const sign   = horiz
          ? (d.color === "green"  ? -1 :  1)   // horizontal: green = −1, blue = +1
          : (d.color === "yellow" ? -1 :  1);  // vertical:   yellow = −1, red  = +1
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


  // Function to toggle dimers on/off in the domino view
  function toggleDimers() {
    // Remove existing dimers if they exist
    if (dimersGroup) {
      dimersGroup.remove();
      dimersGroup = null;
    }

    // If dimers are not enabled, just return
    if (!useDimers) return;

    // Compute bounding box of dominoes
    const minX = d3.min(currentDominoes, d => d.x);
    const minY = d3.min(currentDominoes, d => d.y);
    const maxX = d3.max(currentDominoes, d => d.x + d.w);
    const maxY = d3.max(currentDominoes, d => d.y + d.h);

    // Use the computed dimensions of the SVG
    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    const scale = Math.min(svgWidth / (maxX - minX), svgHeight / (maxY - minY)) * 0.9;
    const translateX = (svgWidth - (maxX - minX) * scale) / 2 - minX * scale;
    const translateY = (svgHeight - (maxY - minY) * scale) / 2 - minY * scale;

    // Create a new group for the dimers
    dimersGroup = svg.append("g")
      .attr("class", "dimers-overlay")
      .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");

    // Draw dimers for each domino
    currentDominoes.forEach(domino => {
      const centerX = domino.x + domino.w / 2;
      const centerY = domino.y + domino.h / 2;
      const isHorizontal = domino.w > domino.h;

      // Determine line endpoints based on orientation
      let x1, y1, x2, y2;

      if (isHorizontal) {
        // For horizontal dominos
        x1 = centerX - domino.w / 4;
        y1 = centerY;
        x2 = centerX + domino.w / 4;
        y2 = centerY;
      } else {
        // For vertical dominos
        x1 = centerX;
        y1 = centerY - domino.h / 4;
        x2 = centerX;
        y2 = centerY + domino.h / 4;
      }

      // Draw dimer line
      dimersGroup.append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", "black")
        .attr("stroke-width", 4.5)
        .attr("stroke-opacity", 1);

      // Add circles at endpoints
      const circleRadius = 4.5;
      dimersGroup.append("circle")
        .attr("cx", x1)
        .attr("cy", y1)
        .attr("r", circleRadius)
        .attr("fill", "black")
        .attr("fill-opacity", 1);

      dimersGroup.append("circle")
        .attr("cx", x2)
        .attr("cy", y2)
        .attr("r", circleRadius)
        .attr("fill", "black")
        .attr("fill-opacity", 1);
    });

    // Make dimers appear on top of everything else
    dimersGroup.raise();
  }

  // Render double dimer configuration
  function renderDoubleDimer(configs) {
    // For double dimer, we show dimers from both configs
    const allDominoes = [...configs.config1, ...configs.config2];
    
    // Compute bounding box
    const minX = d3.min(allDominoes, d => d.x);
    const minY = d3.min(allDominoes, d => d.y);
    const maxX = d3.max(allDominoes, d => d.x + d.w);
    const maxY = d3.max(allDominoes, d => d.y + d.h);
    const widthDominoes = maxX - minX;
    const heightDominoes = maxY - minY;

    // Use the computed dimensions of the SVG
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

    // Clear previous rendering
    svg.selectAll("g").remove();
    checkerboardGroup = null;
    pathsGroup = null;
    dimersGroup = null;
    heightGroup = null;

    // Create group for the visualization
    const group = svg.append("g")
      .attr("class", "dominoes")
      .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");

    // Create a map to track edges from both configurations
    const edgeMap = new Map();
    
    // Helper function to create edge key
    const createEdgeKey = (domino) => {
      const centerX = domino.x + domino.w / 2;
      const centerY = domino.y + domino.h / 2;
      const isHorizontal = domino.w > domino.h;
      
      let x1, y1, x2, y2;
      if (isHorizontal) {
        x1 = centerX - domino.w / 4;
        y1 = centerY;
        x2 = centerX + domino.w / 4;
        y2 = centerY;
      } else {
        x1 = centerX;
        y1 = centerY - domino.h / 4;
        x2 = centerX;
        y2 = centerY + domino.h / 4;
      }
      
      // Round to avoid floating point comparison issues
      x1 = Math.round(x1 * 1000) / 1000;
      y1 = Math.round(y1 * 1000) / 1000;
      x2 = Math.round(x2 * 1000) / 1000;
      y2 = Math.round(y2 * 1000) / 1000;
      
      // Create a normalized key (smaller coords first)
      return `${Math.min(x1,x2)},${Math.min(y1,y2)}-${Math.max(x1,x2)},${Math.max(y1,y2)}`;
    };
    
    // First pass: identify all edges and mark which configs they belong to
    configs.config1.forEach(domino => {
      const key = createEdgeKey(domino);
      edgeMap.set(key, { config1: true, config2: false, domino: domino });
    });
    
    configs.config2.forEach(domino => {
      const key = createEdgeKey(domino);
      if (edgeMap.has(key)) {
        edgeMap.get(key).config2 = true;
      } else {
        edgeMap.set(key, { config1: false, config2: true, domino: domino });
      }
    });
    
    // Second pass: draw edges based on whether they're double edges or not
    edgeMap.forEach((edgeInfo, key) => {
      const domino = edgeInfo.domino;
      const isDoubleEdge = edgeInfo.config1 && edgeInfo.config2;
      
      // Skip double edges if checkbox is unchecked
      if (isDoubleEdge && !showDoubleEdges) {
        return;
      }
      
      const centerX = domino.x + domino.w / 2;
      const centerY = domino.y + domino.h / 2;
      const isHorizontal = domino.w > domino.h;

      let x1, y1, x2, y2;
      if (isHorizontal) {
        x1 = centerX - domino.w / 4;
        y1 = centerY;
        x2 = centerX + domino.w / 4;
        y2 = centerY;
      } else {
        x1 = centerX;
        y1 = centerY - domino.h / 4;
        x2 = centerX;
        y2 = centerY + domino.h / 4;
      }
      
      // Determine color based on which config(s) the edge belongs to
      let color, opacity;
      if (isDoubleEdge) {
        color = "purple"; // Double edges in purple
        opacity = 1;
      } else if (edgeInfo.config1) {
        color = "black";
        opacity = 1;
      } else {
        color = "red";
        opacity = 0.8;
      }

      // Draw dimer line
      group.append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", color)
        .attr("stroke-width", 3.5)
        .attr("stroke-opacity", opacity);

      // Add circles at endpoints
      const circleRadius = 3.5;
      group.append("circle")
        .attr("cx", x1)
        .attr("cy", y1)
        .attr("r", circleRadius)
        .attr("fill", color)
        .attr("fill-opacity", opacity);

      group.append("circle")
        .attr("cx", x2)
        .attr("cy", y2)
        .attr("r", circleRadius)
        .attr("fill", color)
        .attr("fill-opacity", opacity);
    });
  }

  // Render the dominoes with or without colors
  function renderDominoes(dominoes) {
    // Compute bounding box of dominoes.
    const minX = d3.min(dominoes, d => d.x);
    const minY = d3.min(dominoes, d => d.y);
    const maxX = d3.max(dominoes, d => d.x + d.w);
    const maxY = d3.max(dominoes, d => d.y + d.h);
    const widthDominoes = maxX - minX;
    const heightDominoes = maxY - minY;

    // Use the computed dimensions of the SVG (which now scales with the container).
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

    // Clear previous rendering
    svg.selectAll("g").remove();
    checkerboardGroup = null;
    pathsGroup = null;
    dimersGroup = null;
    heightGroup = null;

    // Append a group for the dominoes.
    const group = svg.append("g")
      .attr("class", "dominoes")
      .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");

    // Render each domino piece.
    group.selectAll("rect")
      .data(dominoes)
      .enter()
      .append("rect")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("width", d => d.w)
      .attr("height", d => d.h)
      .attr("fill", d => useColors ? d.color : "#eee") // Use color from data or gray if colors disabled
      .attr("stroke", "#000")
      .attr("stroke-width", d => useCheckerboard ? 4.5 : (useColors ? 0.5 : 0.8));

    // Add paths if enabled (must be added before checkerboard)
    if (usePaths) {
      togglePaths();
    }

    // Add checkerboard if enabled
    if (useCheckerboard) {
      toggleCheckerboard();
    }


    // Add dimers if enabled
    if (useDimers) {
      toggleDimers();
    }

    // Add height function if enabled
    if (useHeightFunction) {
      toggleHeightFunction();
    }
  }


  // Update the visualization for a given n.
  async function updateVisualization(newN) {
    // Update the global n value
    n = newN;

    // If already processing, don't start another one
    if (isProcessing) return;

    isProcessing = true;
    startSimulation();
    const signal = simulationAbortController.signal;

    // Clear any previous simulation.
    svg.selectAll("g").remove();
    checkerboardGroup = null;
    pathsGroup = null;
    dimersGroup = null;
    heightGroup = null;

    // Height function toggle removed for double dimer view


    // Start the progress indicator.
    startProgressPolling();

    // Allow UI thread to update before starting computation
    await sleep(10);
    if (signal.aborted) {
      clearInterval(progressInterval);
      isProcessing = false;
      return;
    }

    try {
      // Get weight parameters
      const value1 = parseFloat(value1Input.value);
      const value2 = parseFloat(value2Input.value);
      const prob1 = parseFloat(prob1Input.value);
      
      // Await the asynchronous simulation with weights.
      const ptrPromise = simulateAztecWithWeights(n, value1, value2, prob1);

      // Wait for computation to complete or be aborted
      const ptr = await ptrPromise;

      if (signal.aborted) {
        if (ptr) freeString(ptr);
        clearInterval(progressInterval);
        isProcessing = false;
        return;
      }

      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      if (signal.aborted) {
        clearInterval(progressInterval);
        isProcessing = false;
        return;
      }

      // Allow UI thread to breathe after computation
      await sleep(10);
      if (signal.aborted) {
        clearInterval(progressInterval);
        isProcessing = false;
        return;
      }

      try {
        const parsedData = JSON.parse(jsonStr);
        currentConfigs = {
          config1: parsedData.config1,
          config2: parsedData.config2
        };
        // Store weight matrix if available
        if (parsedData.weightMatrix) {
          displayWeightMatrix(parsedData.weightMatrix);
        }
        // Merge both configurations for display
        currentDominoes = [...currentConfigs.config1, ...currentConfigs.config2];
      } catch (e) {
        progressElem.innerText = "Error during sampling";
        clearInterval(progressInterval);
        isProcessing = false;
        return;
      }

      // Render the double dimer configuration
      if (!signal.aborted) {
        showDoubleEdges = showDoubleEdgesCheckbox.checked;
        renderDoubleDimer(currentConfigs);
      }

      // Clear progress indicator once done.
      if (!signal.aborted) {
        progressElem.innerText = "";
        // Update last processed value
        lastValue = n;
      }
    } catch (error) {
      if (!signal.aborted) {
        progressElem.innerText = "Error during sampling";
        clearInterval(progressInterval);
      }
    } finally {
      if (!signal.aborted) {
        // Reset simulation state if not already cancelled
        simulationActive = false;
        const updateBtn = document.getElementById("update-btn");
        updateBtn.disabled = false;
        inputField.disabled = false;
        cancelBtn.style.display = 'none';
        isProcessing = false;
      }
    }
  }

  // Validate and process the input
  function processInput() {
    const newN = parseInt(inputField.value, 10);

    // Skip if the value hasn't changed
    if (newN === lastValue) return;

    // Check for a valid positive even number.
    if (isNaN(newN) || newN < 2) {
      progressElem.innerText = "Please enter a valid positive even number for n (n ≥ 2).";
      return;
    }
    if (newN % 2 !== 0) {
      progressElem.innerText = "Please enter an even number for n.";
      return;
    }
    if (newN > 400) {
      progressElem.innerText = "Please enter a number no greater than 400.";
      return;
    }

    updateVisualization(newN);
  }

  // Set up event listeners for input changes
  inputField.addEventListener("input", processInput);
  inputField.addEventListener("change", processInput);

  // Make sure the update button always triggers a new sample, even if value hasn't changed
  document.getElementById("update-btn").addEventListener("click", function() {
    // Force a resample even if the value hasn't changed
    updateVisualization(parseInt(inputField.value, 10));
  });

  // Add cancel button event listener
  document.getElementById("cancel-btn").addEventListener("click", function() {
    stopSimulation();
  });
  
  // Add checkbox event listener for double edges
  showDoubleEdgesCheckbox.addEventListener("change", function() {
    showDoubleEdges = this.checked;
    // Re-render if we have data
    if (currentConfigs) {
      renderDoubleDimer(currentConfigs);
    }
  });
  
  // Add checkbox event listener for weight matrix display
  showWeightMatrixCheckbox.addEventListener("change", function() {
    weightMatrixDisplay.style.display = this.checked ? 'block' : 'none';
  });

  // Run an initial simulation.
  const initialN = parseInt(inputField.value, 10);
  updateVisualization(initialN);


  // TikZ export not supported for double dimer configurations
};
</script>
