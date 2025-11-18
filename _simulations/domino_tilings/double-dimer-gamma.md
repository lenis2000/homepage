---
title: Gamma-disordered Aztec diamond (double dimer representation)
date: 2025-11-18
permalink: /double-dimer-gamma/
layout: sim_page
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/double-dimer-gamma.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/double-dimer-gamma.cpp'
    txt: 'C++ code for the simulation'
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
<script src="/js/double-dimer-gamma.js"></script>

This interactive simulation visualizes the **Gamma-disordered Aztec diamond**, an integrable model introduced by **Maurice Duits and Roger Van Peski** (in preparation, 2025). The model uses **Gamma-distributed random edge weights** - the unique family preserving independence under the shuffling algorithm - to generate domino tilings with remarkable probabilistic properties.

**What you see:** Two independent dimer configurations sampled from the *same random weights* are displayed simultaneously:
- **Black dimers** show the first configuration
- **Red dimers** show the second configuration
- **Purple dimers** are "double edges" that appear in both configurations (toggle with checkbox below)

The simulation runs entirely in your browser using the <a href="https://arxiv.org/abs/math/0111034">shuffling algorithm</a>. For $n \lesssim 120$ it runs in reasonable time; the upper bound is set at $n=400$ to prevent browser freezing.

<b>Gamma Weights:</b> Each edge weight $a_{i,j}$ or $b_{i,j}$ is sampled independently from a Gamma distribution $\Gamma(\alpha, 1)$ for edges on even rows (NE/SE edges, $i$ even), and weight is fixed at $1$ for edges on odd rows (NW/SW edges, $i$ odd):
- $a_{i,j} \sim \Gamma(\alpha, 1)$ for $i$ even, and $a_{i,j} = 1$ for $i$ odd
- $b_{i,j} \sim \Gamma(\beta, 1)$ for $i$ even, and $b_{i,j} = 1$ for $i$ odd

The shape parameters $\alpha$ and $\beta$ control the distribution of the gamma weights.

---

<!-- Controls to change n and weight parameters -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 400$): </label>
  <input id="n-input" type="number" value="24" min="2" step="2" max="400" size="3">
  <button id="update-btn">Update</button>
  <button id="cancel-btn" style="display: none; margin-left: 10px; background-color: #ff5555;">Cancel</button>
</div>

<!-- Gamma parameters -->
<div id="gamma-params" style="margin-bottom: 10px;">
  <strong>Gamma Parameters:</strong>
  <label for="alpha-input" style="margin-left: 10px;">α (shape for a<sub>i,j</sub>): </label>
  <input id="alpha-input" type="number" value="2.0" min="0.1" max="20" step="0.1" size="6" style="width: 60px;">
  <label for="beta-input-gamma" style="margin-left: 10px;">β (shape for b<sub>i,j</sub>): </label>
  <input id="beta-input-gamma" type="number" value="2.0" min="0.1" max="20" step="0.1" size="6" style="width: 60px;">
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

<!-- TikZ export section -->
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
  const simulateAztecWithWeightsAndDist = Module.cwrap('simulateAztecWithWeightsAndDist', 'number', ['number', 'number', 'number', 'number', 'number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const svg = d3.select("#aztec-svg");
  const progressElem = document.getElementById("progress-indicator");
  const inputField = document.getElementById("n-input");
  const alphaInput = document.getElementById("alpha-input");
  const betaInputGamma = document.getElementById("beta-input-gamma");
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
        let bgColor = '#ffffff';

        // For Gamma, differentiate between weight=1 (odd rows) and gamma values (even rows)
        if (i % 2 === 1) {
          // Odd rows (i is odd): weight should be 1
          bgColor = '#e3f2fd'; // Light blue for weight=1
        } else {
          // Even rows (i is even): gamma distributed
          const intensity = Math.min(255, Math.floor(255 * (1 - Math.exp(-value/2))));
          bgColor = `rgb(255, ${255-intensity/2}, ${255-intensity})`;
        }

        html += `<td style="padding: 4px; border: 1px solid #ccc; text-align: right; background-color: ${bgColor};">${value.toFixed(3)}</td>`;
      }
      html += '</tr>';
    }
    html += '</table>';

    html += '<div style="margin-top: 10px; font-size: 11px;">';
    html += `<span style="display: inline-block; width: 15px; height: 15px; background-color: #e3f2fd; border: 1px solid #ccc;"></span> Weight = 1 (NW/SW edges, odd rows)<br>`;
    html += `<span style="display: inline-block; width: 15px; height: 15px; background: linear-gradient(to right, rgb(255,255,255), rgb(255,128,128)); border: 1px solid #ccc;"></span> Gamma(α, 1) (NE/SE edges, even rows)`;
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
      // For Gamma distribution (always gamma in this version)
      const alpha = parseFloat(alphaInput.value);
      const beta = parseFloat(betaInputGamma.value);
      // distType: 2 for Gamma, alpha is param1, beta is param2, param3 is ignored
      const ptrPromise = simulateAztecWithWeightsAndDist(n, 2, alpha, beta, 0);

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

  // Make sure the update button always triggers a new sample, even if value hasn't changed
  document.getElementById("update-btn").addEventListener("click", function() {
    const newN = parseInt(inputField.value, 10);

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

    // Force a resample even if the value hasn't changed
    lastValue = -1; // Reset lastValue to force update
    updateVisualization(newN);
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

  // SVG to TikZ conversion function adapted for double dimer configurations
  function svgToTikZ() {
    if (!currentConfigs || !currentConfigs.config1 || !currentConfigs.config2) {
      alert("Please generate a double dimer configuration first.");
      return;
    }

    // Process both configurations
    const config1 = currentConfigs.config1;
    const config2 = currentConfigs.config2;

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
      return {
        key: `${Math.min(x1,x2)},${Math.min(y1,y2)}-${Math.max(x1,x2)},${Math.max(y1,y2)}`,
        coords: {x1, y1, x2, y2}
      };
    };

    // First pass: collect all dimers and mark which configs they belong to
    config1.forEach(domino => {
      const {key, coords} = createEdgeKey(domino);
      edgeMap.set(key, {
        config1: true,
        config2: false,
        coords: coords,
        domino: domino
      });
    });

    config2.forEach(domino => {
      const {key, coords} = createEdgeKey(domino);
      if (edgeMap.has(key)) {
        edgeMap.get(key).config2 = true;
      } else {
        edgeMap.set(key, {
          config1: false,
          config2: true,
          coords: coords,
          domino: domino
        });
      }
    });

    // Find the bounds of the drawing
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    edgeMap.forEach((edgeInfo) => {
      const c = edgeInfo.coords;
      minX = Math.min(minX, c.x1/100, c.x2/100);
      maxX = Math.max(maxX, c.x1/100, c.x2/100);
      minY = Math.min(minY, c.y1/100, c.y2/100);
      maxY = Math.max(maxY, c.y1/100, c.y2/100);
    });

    // Calculate a good scale factor
    const width = maxX - minX;
    const height = maxY - minY;
    const maxDimension = Math.max(width, height);
    const scaleFactor = 15.0 / maxDimension;

    // Generate TikZ code
    let tikzCode = `\\documentclass{standalone}
\\usepackage{tikz}
\\usepackage{xcolor}

% Define colors for double dimer configuration
\\definecolor{config1color}{RGB}{0, 0, 0}       % Black for config 1
\\definecolor{config2color}{RGB}{255, 0, 0}     % Red for config 2
\\definecolor{doublecolor}{RGB}{128, 0, 128}    % Purple for double edges

\\begin{document}
\\begin{tikzpicture}[scale=${scaleFactor.toFixed(6)}]

% Gamma-disordered Aztec Diamond (n=${n}, α=${alphaInput.value}, β=${betaInputGamma.value})
% Config 1: Black dimers
% Config 2: Red dimers
% Double edges (in both configs): Purple dimers

`;

    // Separate edges by type
    const config1Only = [];
    const config2Only = [];
    const doubleEdges = [];

    edgeMap.forEach((edgeInfo) => {
      const isDoubleEdge = edgeInfo.config1 && edgeInfo.config2;
      const c = edgeInfo.coords;

      // Convert to TikZ coordinates (scale and shift)
      const dimer = {
        x1: c.x1/100 - minX,
        y1: maxY - c.y1/100,
        x2: c.x2/100 - minX,
        y2: maxY - c.y2/100
      };

      if (isDoubleEdge) {
        doubleEdges.push(dimer);
      } else if (edgeInfo.config1) {
        config1Only.push(dimer);
      } else {
        config2Only.push(dimer);
      }
    });

    // Add statistics as comments
    tikzCode += `% Total edges: ${edgeMap.size}
% Config 1 only: ${config1Only.length}
% Config 2 only: ${config2Only.length}
% Double edges: ${doubleEdges.length}

`;

    // Draw Config 1 only edges (black)
    if (config1Only.length > 0) {
      tikzCode += "% Configuration 1 only (black)\n";
      config1Only.forEach((dimer, i) => {
        // Draw line
        tikzCode += `\\draw[config1color, line width=0.5pt] (${dimer.x1.toFixed(2)}, ${dimer.y1.toFixed(2)}) -- (${dimer.x2.toFixed(2)}, ${dimer.y2.toFixed(2)});\n`;
        // Draw circles at endpoints
        tikzCode += `\\filldraw[config1color] (${dimer.x1.toFixed(2)}, ${dimer.y1.toFixed(2)}) circle (0.5pt);\n`;
        tikzCode += `\\filldraw[config1color] (${dimer.x2.toFixed(2)}, ${dimer.y2.toFixed(2)}) circle (0.5pt);\n`;
      });
      tikzCode += "\n";
    }

    // Draw Config 2 only edges (red)
    if (config2Only.length > 0) {
      tikzCode += "% Configuration 2 only (red)\n";
      config2Only.forEach((dimer, i) => {
        // Draw line with slight transparency
        tikzCode += `\\draw[config2color, line width=0.5pt, opacity=0.8] (${dimer.x1.toFixed(2)}, ${dimer.y1.toFixed(2)}) -- (${dimer.x2.toFixed(2)}, ${dimer.y2.toFixed(2)});\n`;
        // Draw circles at endpoints
        tikzCode += `\\filldraw[config2color, opacity=0.8] (${dimer.x1.toFixed(2)}, ${dimer.y1.toFixed(2)}) circle (0.5pt);\n`;
        tikzCode += `\\filldraw[config2color, opacity=0.8] (${dimer.x2.toFixed(2)}, ${dimer.y2.toFixed(2)}) circle (0.5pt);\n`;
      });
      tikzCode += "\n";
    }

    // Draw double edges (purple) - these should be on top
    if (doubleEdges.length > 0 && showDoubleEdges) {
      tikzCode += "% Double edges (purple)\n";
      doubleEdges.forEach((dimer, i) => {
        // Draw line
        tikzCode += `\\draw[doublecolor, line width=0.5pt] (${dimer.x1.toFixed(2)}, ${dimer.y1.toFixed(2)}) -- (${dimer.x2.toFixed(2)}, ${dimer.y2.toFixed(2)});\n`;
        // Draw circles at endpoints
        tikzCode += `\\filldraw[doublecolor] (${dimer.x1.toFixed(2)}, ${dimer.y1.toFixed(2)}) circle (0.5pt);\n`;
        tikzCode += `\\filldraw[doublecolor] (${dimer.x2.toFixed(2)}, ${dimer.y2.toFixed(2)}) circle (0.5pt);\n`;
      });
    }

    tikzCode += `
\\end{tikzpicture}
\\end{document}`;

    // Update the TikZ code in the code container
    const tikzCodeContainer = document.getElementById('tikz-code-container');
    if (tikzCodeContainer) {
      tikzCodeContainer.textContent = tikzCode;
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

    // Show the TikZ code container
    const codeContainer = document.getElementById('tikz-code-container');
    if (codeContainer) {
      codeContainer.style.display = 'block';
    }
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
    const blob = new Blob([codeContainer.textContent], { type: 'text/plain' });
    const a = document.createElement('a');
    a.download = `gamma_disordered_aztec_n${n}_alpha${alphaInput.value}_beta${betaInputGamma.value}_tikz.tex`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  });
};
</script>

---

## References

**Duits, M., & Van Peski, R.** (in preparation, 2025). *The Gamma-Disordered Aztec Diamond.* Manuscript in preparation.

**Related Works:**
- Elkies, N., Kuperberg, G., Larsen, M., & Propp, J. (1992). Alternating-sign matrices and domino tilings. *Journal of Algebraic Combinatorics*, 1(2-3).
- Propp, J. (2003). Generalized domino-shuffling. *Theoretical Computer Science*, 303(2-3), 267-301.
- Seppäläinen, T. (2012). Scaling for a one-dimensional directed polymer with boundary conditions. *The Annals of Probability*, 40(1), 19-73.
- Zeng, C., Leath, P. L., & Hwa, T. (1999). Thermodynamics of mesoscopic vortex systems in 1+1 dimensions. *Physical Review Letters*, 83(23), 4860.
