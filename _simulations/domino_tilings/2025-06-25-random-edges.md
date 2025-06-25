---
title: Domino tilings of the Aztec diamond with random one-periodic edges
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-06-25-random-edges.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-06-25-random-edges.cpp'
    txt: 'C++ code for the simulation'
---

<style>
  /* Ensure the SVG scales fully on wide screens and remains responsive on mobile */
  #aztec-svg, #dimer-svg {
    width: 100%;
    height: 80vh; /* Use 80% of viewport height on large screens */
    vertical-align: top; /* Align media to the top */
  }
  @media (max-width: 576px) {
    #aztec-svg, #dimer-svg {
      height: 60vh; /* Reduce height on smaller devices */
      vertical-align: top; /* Maintain top alignment on mobile */
    }
  }

  /* Tabs styling */
  .tab {
    overflow: hidden;
    border: 1px solid #ccc;
    background-color: #f1f1f1;
    margin-bottom: 10px;
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

  .tab button {
    background-color: inherit;
    float: left;
    border: none;
    outline: none;
    cursor: pointer;
    padding: 14px 16px;
    transition: 0.3s;
  }

  .tab button:hover {
    background-color: #ddd;
  }

  .tab button.active {
    background-color: #ccc;
  }

  .tabcontent {
    display: none;
    padding: 6px 12px;
    border: 1px solid #ccc;
    border-top: none;
  }
</style>

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="/js/2025-06-25-random-edges.js"></script>

The sampler works in your browser. Up to $n \sim 120$ it works in reasonable time, but for larger $n$ it may take a while.
I set the upper bound at $n=400$ to avoid freezing your browser.

### Update 2025-04-14: TikZ Code Generation

You can now get a TikZ code for the sampled Aztec diamond directly by clicking the button below. This feature supports <b>dominoes</b> and <b>nonintersecting paths</b> only.

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

---

<!-- Parameter Regime Selection -->
<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
  <h4 style="margin-top: 0;">Parameter Regimes</h4>
  
  <div style="margin-bottom: 15px;">
    <input type="radio" id="regime1" name="regime" value="1">
    <label for="regime1" style="margin-left: 5px; font-weight: bold;">Regime 1: Critical Scaling</label>
    <p style="margin: 5px 0 10px 25px; font-size: 0.9em; color: #666;">
      Parameters: $1 + \frac{2}{\sqrt{N}}$ with probability $p_1$, and $1 - \frac{1}{\sqrt{N}}$ with probability $p_2$.
      <br><em>Models critical behavior near the uniform measure.</em>
    </p>
    <div id="regime1-params" style="margin-left: 25px; display: none;">
      <label>Value 1: <input type="number" id="regime1-val1" value="1" step="0.1" style="width: 60px;"></label>
      <label style="margin-left: 10px;">Value 2: <input type="number" id="regime1-val2" value="1" step="0.1" style="width: 60px;"></label>
      <label style="margin-left: 10px;">Prob 1: <input type="number" id="regime1-prob1" value="0.5" step="0.1" min="0" max="1" style="width: 60px;"></label>
      <label style="margin-left: 10px;">Prob 2: <input type="number" id="regime1-prob2" value="0.5" step="0.1" min="0" max="1" style="width: 60px;"></label>
    </div>
  </div>

  <div style="margin-bottom: 15px;">
    <input type="radio" id="regime2" name="regime" value="2">
    <label for="regime2" style="margin-left: 5px; font-weight: bold;">Regime 2: Rare Event Scaling</label>
    <p style="margin: 5px 0 10px 25px; font-size: 0.9em; color: #666;">
      Parameter equals $v_1$ with probability $\frac{1}{\sqrt{N}}$, and $v_2$ with probability $\frac{\sqrt{N} - 1}{\sqrt{N}}$.
      <br><em>Models rare high-weight events in the limit.</em>
    </p>
    <div id="regime2-params" style="margin-left: 25px; display: none;">
      <label>Value 1: <input type="number" id="regime2-val1" value="2" step="0.1" style="width: 60px;"></label>
      <label style="margin-left: 10px;">Value 2: <input type="number" id="regime2-val2" value="1" step="0.1" style="width: 60px;"></label>
      <span style="margin-left: 10px; font-size: 0.9em; color: #666;">(Probabilities auto-computed)</span>
    </div>
  </div>

  <div style="margin-bottom: 15px;">
    <input type="radio" id="regime3" name="regime" value="3" checked>
    <label for="regime3" style="margin-left: 5px; font-weight: bold;">Regime 3: Balanced Bernoulli (Default)</label>
    <p style="margin: 5px 0 10px 25px; font-size: 0.9em; color: #666;">
      Parameter equals $v_1$ with probability $\frac{1}{2}$, and $v_2$ with probability $\frac{1}{2}$.
      <br><em>Balanced two-point distribution.</em>
    </p>
    <div id="regime3-params" style="margin-left: 25px; display: block;">
      <label>Value 1: <input type="number" id="regime3-val1" value="2" step="0.1" style="width: 60px;"></label>
      <label style="margin-left: 10px;">Value 2: <input type="number" id="regime3-val2" value="0.5" step="0.1" style="width: 60px;"></label>
      <label style="margin-left: 10px;">Prob 1: <input type="number" id="regime3-prob1" value="0.5" step="0.1" min="0" max="1" style="width: 60px;"></label>
      <label style="margin-left: 10px;">Prob 2: <input type="number" id="regime3-prob2" value="0.5" step="0.1" min="0" max="1" style="width: 60px;"></label>
    </div>
  </div>

  <div style="margin-bottom: 15px;">
    <input type="radio" id="regime4" name="regime" value="4">
    <label for="regime4" style="margin-left: 5px; font-weight: bold;">Regime 4: Deterministic Periodic</label>
    <p style="margin: 5px 0 10px 25px; font-size: 0.9em; color: #666;">
      Deterministic periodic pattern: $w_1, w_2, w_1, w_2, w_1, w_2, \ldots$
      <br><em>Fixed alternating weights with no randomness.</em>
    </p>
    <div id="regime4-params" style="margin-left: 25px; display: none;">
      <label>Weight 1 (w₁): <input type="number" id="regime4-w1" value="2" step="0.1" style="width: 60px;"></label>
      <label style="margin-left: 10px;">Weight 2 (w₂): <input type="number" id="regime4-w2" value="0.5" step="0.1" style="width: 60px;"></label>
    </div>
  </div>

  <div style="margin-bottom: 15px;">
    <input type="radio" id="regime5" name="regime" value="5">
    <label for="regime5" style="margin-left: 5px; font-weight: bold;">Regime 5: Uniform [0,1]</label>
    <p style="margin: 5px 0 10px 25px; font-size: 0.9em; color: #666;">
      Parameters are independent and uniform on $[a,b]$.
      <br><em>Continuous uniform distribution.</em>
    </p>
    <div id="regime5-params" style="margin-left: 25px; display: none;">
      <label>Min (a): <input type="number" id="regime5-min" value="0" step="0.1" style="width: 60px;"></label>
      <label style="margin-left: 10px;">Max (b): <input type="number" id="regime5-max" value="1" step="0.1" style="width: 60px;"></label>
    </div>
  </div>

</div>

<!-- Controls to change n -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 400$): </label>
  <!-- Updated input: starting value 24, even numbers only (step=2), three-digit window (size=3), maximum 400 -->
  <input id="n-input" type="number" value="24" min="2" step="2" max="400" size="3">
  <button id="resample-btn">Resample</button>
  <button id="cancel-btn" style="display: none; margin-left: 10px; background-color: #ff5555;">Cancel</button>
</div>

<!-- Progress indicator (polling progress from the C++ code via getProgress) -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<!-- Tabs -->
<div class="tab">
  <button class="tablinks active" onclick="openView(event, 'domino-view')">Dominos</button>
  <button class="tablinks" onclick="openView(event, 'dimer-view'); resizeDimerView();">Dimers on the Dual Grid</button>
</div>

<!-- Domino View -->
<div id="domino-view" class="tabcontent" style="display: block;">
  <!-- Color toggle -->
  <div style="margin-top: 8px; margin-bottom: 8px;">
    <label for="color-toggle">
      <input type="checkbox" id="color-toggle" checked> Show colors
    </label>
  </div>

  <!-- Grayscale toggle -->
  <div style="margin-bottom: 8px;">
    <label for="grayscale-toggle">
      <input type="checkbox" id="grayscale-toggle"> Grayscale mode
    </label>
  </div>

  <!-- Checkerboard toggle -->
  <div style="margin-bottom: 8px;">
    <label for="checkerboard-toggle">
      <input type="checkbox" id="checkerboard-toggle"> Show checkerboard overlay
    </label>
  </div>

  <!-- Paths toggle -->
  <div style="margin-bottom: 8px;">
    <label for="paths-toggle">
      <input type="checkbox" id="paths-toggle"> Show nonintersecting paths
    </label>
  </div>

  <!-- Dimers toggle -->
  <div style="margin-bottom: 8px;">
    <label for="dimers-toggle">
      <input type="checkbox" id="dimers-toggle"> Show dimers
    </label>
  </div>

  <!-- Height function toggle -->
  <div style="margin-bottom: 8px;">
    <label for="height-toggle">
      <input type="checkbox" id="height-toggle"> Show height function
    </label>
  </div>

  <div class="row">
    <div class="col-12">
      <svg id="aztec-svg"></svg>
    </div>
  </div>
</div>

<!-- Dimer View -->
<div id="dimer-view" class="tabcontent">
  <div class="row">
    <div class="col-12">
      <svg id="dimer-svg"></svg>
    </div>
  </div>
</div>

<script>
Module.onRuntimeInitialized = async function() {
  // Wrap exported functions asynchronously.
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number'], {async: true});
  const simulateAztecWithRegime = Module.cwrap('simulateAztecWithRegime', 'number', ['number', 'number', 'number', 'number', 'number', 'number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const svg = d3.select("#aztec-svg");
  const dimerSvg = d3.select("#dimer-svg");
  const progressElem = document.getElementById("progress-indicator");
  const inputField = document.getElementById("n-input");
  let progressInterval;
  let useColors = true; // Track coloring state
  let useGrayscale = false; // Track grayscale state
  let useCheckerboard = false; // Track checkerboard state
  let usePaths = false; // Track nonintersecting paths state
  let useDimers = false; // Track dimers visibility state
  let useHeightFunction = false; // Track height function visibility state
  let currentDominoes = []; // Store current dominoes for toggling colors
  let isProcessing = false; // Flag to prevent multiple simultaneous updates
  let checkerboardGroup; // Group for checkerboard squares
  let pathsGroup; // Group for nonintersecting paths
  let dimersGroup; // Group for dimers overlay
  let heightGroup; // Group for height function display

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

  // Create zoom behavior for dimer view
  let dimerInitialTransform = {}; // Store dimer view initial transform parameters
  const dimerZoom = d3.zoom()
    .scaleExtent([0.1, 50]) // Min and max zoom scale (up to 50x)
    .on("zoom", (event) => {
      if (!dimerInitialTransform.scale) return; // Skip if no initial transform is set

      // Apply the zoom transformation on top of initial transform
      const group = dimerSvg.select("g.dimer-elements");
      if (!group.empty()) {
        const t = event.transform;
        group.attr("transform",
          `translate(${dimerInitialTransform.translateX * t.k + t.x},${dimerInitialTransform.translateY * t.k + t.y}) scale(${dimerInitialTransform.scaleX * t.k},${dimerInitialTransform.scaleY * t.k})`);
      }
    });

  // Enable zoom on both SVGs
  svg.call(zoom);
  dimerSvg.call(dimerZoom);

  // Add double-click to reset zoom on both views
  svg.on("dblclick.zoom", () => {
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  });

  dimerSvg.on("dblclick.zoom", () => {
    dimerSvg.transition()
      .duration(750)
      .call(dimerZoom.transform, d3.zoomIdentity);
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

  // Add zoom controls for dimer view
  const dimerControlsContainer = d3.select("#dimer-view")
    .insert("div", ".row")
    .attr("class", "zoom-controls")
    .style("margin-bottom", "10px");

  dimerControlsContainer.append("span")
    .text("Zoom: ")
    .style("font-weight", "bold");

  dimerControlsContainer.append("button")
    .attr("id", "dimer-zoom-in-btn")
    .style("margin-left", "5px")
    .text("+")
    .on("click", () => {
      dimerSvg.transition()
        .duration(300)
        .call(dimerZoom.scaleBy, 1.3);
    });

  dimerControlsContainer.append("button")
    .attr("id", "dimer-zoom-out-btn")
    .style("margin-left", "5px")
    .text("-")
    .on("click", () => {
      dimerSvg.transition()
        .duration(300)
        .call(dimerZoom.scaleBy, 0.7);
    });

  dimerControlsContainer.append("button")
    .attr("id", "dimer-zoom-reset-btn")
    .style("margin-left", "5px")
    .text("Reset Zoom")
    .on("click", () => {
      dimerSvg.transition()
        .duration(300)
        .call(dimerZoom.transform, d3.zoomIdentity);
    });

  dimerControlsContainer.append("span")
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

  // Regime selection and parameter management
  let currentRegime = 3; // Default to regime 3 (balanced Bernoulli)
  
  // Add event listeners for regime radio buttons
  document.querySelectorAll('input[name="regime"]').forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.checked) {
        currentRegime = parseInt(this.value);
        // Hide all parameter divs
        for (let i = 1; i <= 5; i++) {
          const paramDiv = document.getElementById(`regime${i}-params`);
          if (paramDiv) {
            paramDiv.style.display = 'none';
          }
        }
        // Show the selected regime's parameters
        const selectedParamDiv = document.getElementById(`regime${currentRegime}-params`);
        if (selectedParamDiv) {
          selectedParamDiv.style.display = 'block';
        }
      }
    });
  });

  // Function to get current regime parameters
  function getRegimeParameters() {
    const sqrtN = Math.sqrt(n);
    let param1 = 0, param2 = 0, param3 = 0, param4 = 0;
    
    switch (currentRegime) {
      case 1:
        param1 = parseFloat(document.getElementById('regime1-val1').value) || 1;
        param2 = parseFloat(document.getElementById('regime1-val2').value) || 1;
        param3 = parseFloat(document.getElementById('regime1-prob1').value) || 0.5;
        param4 = parseFloat(document.getElementById('regime1-prob2').value) || 0.5;
        break;
      case 2:
        param1 = parseFloat(document.getElementById('regime2-val1').value) || 2;
        param2 = parseFloat(document.getElementById('regime2-val2').value) || 1;
        param3 = 1.0 / sqrtN; // Auto-computed probability
        param4 = (sqrtN - 1.0) / sqrtN; // Auto-computed probability
        break;
      case 3:
        param1 = parseFloat(document.getElementById('regime3-val1').value) || 2;
        param2 = parseFloat(document.getElementById('regime3-val2').value) || 0.5;
        param3 = parseFloat(document.getElementById('regime3-prob1').value) || 0.5;
        param4 = parseFloat(document.getElementById('regime3-prob2').value) || 0.5;
        break;
      case 4:
        param1 = parseFloat(document.getElementById('regime4-w1').value) || 2;
        param2 = parseFloat(document.getElementById('regime4-w2').value) || 0.5;
        param3 = 0; // Unused for deterministic
        param4 = 0; // Unused for deterministic
        break;
      case 5:
        param1 = parseFloat(document.getElementById('regime5-min').value) || 0;
        param2 = parseFloat(document.getElementById('regime5-max').value) || 1;
        param3 = 0; // Unused for uniform
        param4 = 0; // Unused for uniform
        break;
      default:
        param1 = 0; param2 = 0; param3 = 0; param4 = 0;
    }
    
    return { regime: currentRegime, param1, param2, param3, param4 };
  }

  // Tab functionality
  window.openView = function(evt, viewName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(viewName).style.display = "block";
    evt.currentTarget.className += " active";

    // If switching to dimer view, force a redraw
    if (viewName === "dimer-view") {
      resizeDimerView();
    }
  }

  // Function to properly render dimer view when tab becomes visible
  window.resizeDimerView = function() {
    // This fixes a common issue where SVG doesn't render properly in hidden tabs
    setTimeout(() => {
      if (currentDominoes && currentDominoes.length > 0) {

        // First get the DOM node dimensions
        const dimerSvgNode = document.getElementById("dimer-svg");
        if (dimerSvgNode) {
          const rect = dimerSvgNode.getBoundingClientRect();
        }

        renderDimerView(currentDominoes);
      } else {
      }
    }, 100); // Longer timeout to ensure DOM is ready
  }

  // Helper function to sleep for ms milliseconds
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function startSimulation() {
    simulationActive = true;
    const resampleBtn = document.getElementById("resample-btn");

    resampleBtn.disabled = true;
    inputField.disabled = true;
    cancelBtn.style.display = 'inline-block';

    simulationAbortController = new AbortController();
  }

  function stopSimulation() {
    simulationActive = false;
    const resampleBtn = document.getElementById("resample-btn");

    clearInterval(progressInterval);
    resampleBtn.disabled = false;
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

  // Handle color toggle - only toggle colors, don't resample
  document.getElementById("color-toggle").addEventListener("change", function() {
    useColors = this.checked;
    if (currentDominoes.length > 0) {
      renderDominoes(currentDominoes);
      renderDimerView(currentDominoes);
    }
  });

  // Grayscale values for different colors and orientations
  const grayscaleValues = {
    blue: { p0: 100, p1: 253 },
    green: { p0: 243, p1: 80 },
    red: { p0: 150, p1: 10 },
    yellow: { p0: 20, p1: 170 }
  };

  // Helper function to convert brightness to hex grayscale
  function grayHex(brightness) {
    const clampedBrightness = Math.max(0, Math.min(255, Math.round(brightness)));
    const hex = clampedBrightness.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
  }

  // Function to get grayscale color based on domino properties
  function getGrayscaleColor(originalColor, domino) {
    if (grayscaleValues[originalColor]) {
      const isHorizontal = domino.w > domino.h;
      const { p0, p1 } = grayscaleValues[originalColor];
      
      let useP1;
      if (isHorizontal) {
        // For horizontal dominoes (blue/green), use y-coordinate parity
        useP1 = (domino.y % 40 === 0); // 40 = 2 * scale * 2
      } else {
        // For vertical dominoes (red/yellow), use x-coordinate parity
        useP1 = (domino.x % 40 === 0); // 40 = 2 * scale * 2
      }
      
      return grayHex(useP1 ? p1 : p0);
    } else {
      // Fallback for unrecognized colors using standard luminance formula
      return grayHex(128); // Default gray
    }
  }

  // Handle grayscale toggle
  document.getElementById("grayscale-toggle").addEventListener("change", function() {
    useGrayscale = this.checked;
    if (currentDominoes.length > 0) {
      renderDominoes(currentDominoes);
      renderDimerView(currentDominoes);
    }
  });

  // Handle checkerboard toggle
  document.getElementById("checkerboard-toggle").addEventListener("change", function() {
    useCheckerboard = this.checked;
    if (currentDominoes.length > 0) {
      toggleCheckerboard();
    }
  });

  // Handle paths toggle
  document.getElementById("paths-toggle").addEventListener("change", function() {
    usePaths = this.checked;
    if (currentDominoes.length > 0) {
      togglePaths();
    }
  });

  // Handle dimers toggle
  document.getElementById("dimers-toggle").addEventListener("change", function() {
    useDimers = this.checked;
    if (currentDominoes.length > 0) {
      toggleDimers();
    }
  });

  // Handle height function toggle
  document.getElementById("height-toggle").addEventListener("change", function() {
    useHeightFunction = this.checked;
    if (currentDominoes.length > 0) {
      toggleHeightFunction();
    }
  });

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
      .attr("fill", d => {
        if (useGrayscale) {
          return getGrayscaleColor(d.color, d);
        } else if (useColors) {
          return d.color;
        } else {
          return "#eee";
        }
      })
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

    // Also render the dimer view
    renderDimerView(dominoes);

    // Add dimers if enabled
    if (useDimers) {
      toggleDimers();
    }

    // Add height function if enabled
    if (useHeightFunction) {
      toggleHeightFunction();
    }
  }

  // Render the dimer view based on Python's aztec_edge_printer
  function renderDimerView(dominoes) {


    // Clear previous rendering
    dimerSvg.selectAll("*").remove();

    // Define the dimensions of the dimer view
    const bbox = dimerSvg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    dimerSvg.attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

    // Add a title
    dimerSvg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text(`Aztec Diamond Dimer Configuration (n=${n})`);

    // Create group for dimer elements with appropriate transformation
    const dimerGroup = dimerSvg.append("g")
      .attr("class", "dimer-elements")
      .attr("transform", `translate(${svgWidth/2},${svgHeight/2}) scale(1,-1)`);  // Flip vertically with scale(1,-1)

    // Scale factor based on the SVG size and the diamond size
    const scale = Math.min(svgWidth, svgHeight) / (2 * n + 4) * 0.85;

    // Draw the Aztec diamond grid vertices (points)
    let vertexCount = 0;
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        if (Math.abs(i) + Math.abs(j) <= n + 1 &&
            i + j <= n &&
            i - j < n &&
            -j - i < n + 1) {
          dimerGroup.append("circle")
            .attr("cx", i * scale)
            .attr("cy", j * scale)
            .attr("r", 1.5)
            .attr("fill", "black");
          vertexCount++;
        }
      }
    }

    // Draw background grid lines with low opacity
    let edgeCount = 0;
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        if (Math.abs(i) + Math.abs(j) <= n + 1 &&
            i + j <= n &&
            i - j < n &&
            -j - i < n + 1) {
          // Draw horizontal edge to the right if in bounds
          if (Math.abs(i+1) + Math.abs(j) <= n + 1 &&
              (i+1) + j <= n &&
              (i+1) - j < n &&
              -j - (i+1) < n + 1) {
            dimerGroup.append("line")
              .attr("x1", i * scale)
              .attr("y1", j * scale)
              .attr("x2", (i+1) * scale)
              .attr("y2", j * scale)
              .attr("stroke", "black")
              .attr("stroke-width", 0.5)
              .attr("opacity", 0.3);
            edgeCount++;
          }

          // Draw vertical edge up if in bounds
          if (Math.abs(i) + Math.abs(j+1) <= n + 1 &&
              i + (j+1) <= n &&
              i - (j+1) < n &&
              -(j+1) - i < n + 1) {
            dimerGroup.append("line")
              .attr("x1", i * scale)
              .attr("y1", j * scale)
              .attr("x2", i * scale)
              .attr("y2", (j+1) * scale)
              .attr("stroke", "black")
              .attr("stroke-width", 0.5)
              .attr("opacity", 0.3);
            edgeCount++;
          }
        }
      }
    }

    // Direct rendering of dimers without using a grid
  let dimerCount = 0;

  // The size value used for scaling
  const size = 2 * n;

  // Check if n is too large for dimer view
  if (n >= 52) {
    // Display message for large n values as an overlay on top of SVG
    dimerSvg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .attr("fill", "rgba(255, 255, 255, 0.8)");

    dimerSvg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", svgHeight / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .style("z-index", "100")
      .text("This n is too large to see individual dimers");
    return;
  }

  // Draw dimers directly from the domino data
  dominoes.forEach(domino => {
    // Based on the logs, dominoes look like: {"x":-20,"y":1000,"w":40,"h":20,"color":"green"}

    // Only attempt to draw dimers that are within reasonable bounds
    if (Math.abs(domino.x) > 1000 || Math.abs(domino.y) > 1000) {
      return;
    }

    // Determine if it's a horizontal or vertical domino
    const isHorizontal = domino.w > domino.h;

    // Get color from the domino or use black if colors disabled
    const color = useColors ? domino.color : "black";

    // Calculate center point for the domino
    const centerX = domino.x / 20;
    const centerY = -domino.y / 20;  // Flip Y since our coordinate system is inverted

    // Calculate dimer endpoints based on orientation
    let x1, y1, x2, y2;

    if (isHorizontal) {
      // For horizontal dominos
      x1 = centerX - 0.5;
      y1 = centerY;
      x2 = centerX + 0.5;
      y2 = centerY;
    } else {
      // For vertical dominos
      x1 = centerX;
      y1 = centerY - 0.5;
      x2 = centerX;
      y2 = centerY + 0.5;
    }

    // Determine stroke width based on n (decreasing with larger n)
    let strokeWidth, circleRadius;
    if (n <= 20) {
      strokeWidth = 6;
      circleRadius = 6;
    } else if (n <= 30) {
      strokeWidth = 5;
      circleRadius = 5;
    } else if (n <= 40) {
      strokeWidth = 3;
      circleRadius = 3;
    } else if (n <= 50) {
      strokeWidth = 2;
      circleRadius = 2;
    } else {
      strokeWidth = 1.5;
      circleRadius = 1.5;
    }

    // Store the initial transform parameters for dimer view zoom behavior
    // Extract the transformation values from the group
    const transformStr = dimerGroup.attr("transform");
    // Parse the transform string to get values (assuming format: translate(x,y) scale(x,-y))
    // For the dimer view, the transform includes a vertical flip with scale(1,-1)
    const translateMatch = transformStr.match(/translate\(([^,]+),([^)]+)\)/);
    const scaleMatch = transformStr.match(/scale\(([^,]+),([^)]+)\)/);

    if (translateMatch && scaleMatch) {
      dimerInitialTransform = {
        translateX: parseFloat(translateMatch[1]),
        translateY: parseFloat(translateMatch[2]),
        scaleX: parseFloat(scaleMatch[1]),
        scaleY: parseFloat(scaleMatch[2])
      };

      // Reset the zoom transform when creating a new visualization
      dimerSvg.call(dimerZoom.transform, d3.zoomIdentity);
    }

    // Draw the dimer on the grid
    dimerGroup.append("line")
      .attr("x1", isHorizontal ? (x1+1/2) * scale : x1 * scale)
      .attr("y1", isHorizontal ? (y1+1) * scale : (y1 + 1/2) * scale)
      .attr("x2", isHorizontal ? (x2+1/2) * scale : x2 * scale)
      .attr("y2", isHorizontal ? (y2+1) * scale : (y2 + 1/2) * scale)
      .attr("stroke", "black")
      .attr("stroke-width", strokeWidth)
      .attr("class", isHorizontal ? "dimer-edge-h" : "dimer-edge-v");

    // Add circles at endpoints for better visibility
    dimerGroup.append("circle")
      .attr("cx", isHorizontal ? (x1+1/2) * scale : x1 * scale)
      .attr("cy", isHorizontal ? (y1+1) * scale : (y1 + 1/2) * scale)
      .attr("r", circleRadius)
      .attr("fill", "black");

    dimerGroup.append("circle")
      .attr("cx", isHorizontal ? (x2+1/2) * scale : x2 * scale)
      .attr("cy", isHorizontal ? (y2+1) * scale : (y2 + 1/2) * scale)
      .attr("r", circleRadius)
      .attr("fill", "black");

    dimerCount++;
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
    dimerSvg.selectAll("*").remove();
    checkerboardGroup = null;
    pathsGroup = null;
    dimersGroup = null;
    heightGroup = null;

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
      // Get current regime parameters
      const regimeParams = getRegimeParameters();
      
      // Await the asynchronous simulation with regime parameters.
      const ptrPromise = simulateAztecWithRegime(n, regimeParams.regime, regimeParams.param1, regimeParams.param2, regimeParams.param3, regimeParams.param4);

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
        currentDominoes = JSON.parse(jsonStr); // Store for later toggling
      } catch (e) {
        progressElem.innerText = "Error during sampling";
        clearInterval(progressInterval);
        isProcessing = false;
        return;
      }

      // Render the dominoes with yield points for UI responsiveness
      if (!signal.aborted) {
        renderDominoes(currentDominoes);
      }

      // Clear progress indicator once done.
      if (!signal.aborted) {
        progressElem.innerText = "";
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
        const resampleBtn = document.getElementById("resample-btn");
        resampleBtn.disabled = false;
        inputField.disabled = false;
        cancelBtn.style.display = 'none';
        isProcessing = false;
      }
    }
  }

  // Validate and process the input
  function processInput() {
    const newN = parseInt(inputField.value, 10);

    // Check for a valid positive even number.
    if (isNaN(newN) || newN < 2) {
      progressElem.innerText = "Please enter a valid positive even number for n (n ≥ 2).";
      return false;
    }
    if (newN % 2 !== 0) {
      progressElem.innerText = "Please enter an even number for n.";
      return false;
    }
    if (newN > 400) {
      progressElem.innerText = "Please enter a number no greater than 400.";
      return false;
    }

    // Clear any error messages
    progressElem.innerText = "";
    return true;
  }

  // Resample button triggers a new sample with current n value
  document.getElementById("resample-btn").addEventListener("click", function() {
    const newN = parseInt(inputField.value, 10);
    if (processInput()) {
      updateVisualization(newN);
    }
  });

  // Add cancel button event listener
  document.getElementById("cancel-btn").addEventListener("click", function() {
    stopSimulation();
  });

  // Initial message - no automatic simulation
  progressElem.innerText = "Click 'Resample' to generate a domino tiling";

  // Make sure both tab views are properly initialized once
  setTimeout(() => {
    if (currentDominoes && currentDominoes.length > 0) {
      renderDimerView(currentDominoes);

      // Make the first tab (domino view) active by default
      document.querySelector('.tablinks').click();
    }
  }, 1000);

  // SVG to TikZ conversion function for dual grid dimers
  function dimerToTikZ() {
    if (!currentDominoes || currentDominoes.length === 0) {
      alert("Please generate a domino tiling first.");
      return;
    }

    // Check if n is too large for dimer view
    if (n >= 52) {
      alert("n is too large for dimer TikZ export (n >= 52). Please use a smaller value.");
      return;
    }

    // Convert dominoes to dimer lines for the dual grid
    const dimerLines = [];
    
    currentDominoes.forEach(domino => {
      // Skip dominoes that are out of reasonable bounds
      if (Math.abs(domino.x) > 1000 || Math.abs(domino.y) > 1000) {
        return;
      }

      // Determine if it's a horizontal or vertical domino
      const isHorizontal = domino.w > domino.h;

      // Calculate center point for the domino in dual grid coordinates
      const centerX = domino.x / 20;
      const centerY = -domino.y / 20;  // Flip Y since coordinate system is inverted

      // Calculate dimer endpoints based on orientation
      let x1, y1, x2, y2;

      if (isHorizontal) {
        // For horizontal dominos
        x1 = centerX - 0.5;
        y1 = centerY;
        x2 = centerX + 0.5;
        y2 = centerY;
      } else {
        // For vertical dominos
        x1 = centerX;
        y1 = centerY - 0.5;
        x2 = centerX;
        y2 = centerY + 0.5;
      }

      // Adjust coordinates to match the dual grid positioning from renderDimerView
      const scale = 1; // We'll handle scaling in TikZ
      dimerLines.push({
        x1: isHorizontal ? (x1 + 1/2) : x1,
        y1: isHorizontal ? (y1 + 1) : (y1 + 1/2),
        x2: isHorizontal ? (x2 + 1/2) : x2,
        y2: isHorizontal ? (y2 + 1) : (y2 + 1/2),
        isHorizontal: isHorizontal
      });
    });

    console.log(`Generated ${dimerLines.length} dimer lines for TikZ export`);

    if (dimerLines.length === 0) {
      alert("No dimer elements found to convert.");
      return;
    }

    // Find the bounds of the drawing
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    dimerLines.forEach(line => {
      minX = Math.min(minX, line.x1, line.x2);
      maxX = Math.max(maxX, line.x1, line.x2);
      minY = Math.min(minY, line.y1, line.y2);
      maxY = Math.max(maxY, line.y1, line.y2);
    });

    // Calculate a good scale factor
    const width = maxX - minX;
    const height = maxY - minY;
    const maxDimension = Math.max(width, height);
    const scaleFactor = 15.0 / maxDimension;

    // Generate TikZ code for dual grid dimers
    let tikzCode = `\\documentclass{standalone}
\\usepackage{tikz}

\\begin{document}
\\begin{tikzpicture}[scale=${scaleFactor.toFixed(6)}]

% Aztec Diamond Dual Grid Dimer Configuration (n=${n})
% Generated from ${dimerLines.length} dimers

`;

    // First, add the underlying grid structure
    tikzCode += "% Underlying grid\n";
    
    // Generate all grid edges that should be visible
    const gridEdges = new Set();
    const gridVertices = new Set();
    
    // For each vertex in the Aztec diamond grid, check if it's within bounds
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        if (Math.abs(i) + Math.abs(j) <= n + 1 &&
            i + j <= n &&
            i - j < n &&
            -j - i < n + 1) {
          
          const x = i;
          const y = j;
          gridVertices.add(`${x},${y}`);
          
          // Check horizontal edge to the right
          if (Math.abs(i+1) + Math.abs(j) <= n + 1 &&
              (i+1) + j <= n &&
              (i+1) - j < n &&
              -j - (i+1) < n + 1) {
            gridEdges.add(`${x},${y},${x+1},${y}`);
          }
          
          // Check vertical edge up
          if (Math.abs(i) + Math.abs(j+1) <= n + 1 &&
              i + (j+1) <= n &&
              i - (j+1) < n &&
              -(j+1) - i < n + 1) {
            gridEdges.add(`${x},${y},${x},${y+1}`);
          }
        }
      }
    }
    
    // Draw all grid edges with thicker lines
    gridEdges.forEach(edge => {
      const [x1, y1, x2, y2] = edge.split(',').map(Number);
      const tx1 = x1 - minX;
      const ty1 = maxY - y1;
      const tx2 = x2 - minX;
      const ty2 = maxY - y2;
      tikzCode += `\\draw[gray!60, line width=1.6pt] (${tx1.toFixed(2)}, ${ty1.toFixed(2)}) -- (${tx2.toFixed(2)}, ${ty2.toFixed(2)});\n`;
    });

    // Add grid vertices (black dots) with 5x larger radius
    tikzCode += "\n% Grid vertices\n";
    gridVertices.forEach(vertex => {
      const [x, y] = vertex.split(',').map(Number);
      const tx = x - minX;
      const ty = maxY - y;
      tikzCode += `\\fill (${tx.toFixed(2)}, ${ty.toFixed(2)}) circle (4pt);\n`;
    });

    tikzCode += "\n% Dimer edges (3x thicker)\n";
    
    // Add dimer lines with 3x thickness
    dimerLines.forEach((line, index) => {
      // Shift and invert coordinates to match TikZ coordinate system
      const x1 = line.x1 - minX;
      const y1 = maxY - line.y1;
      const x2 = line.x2 - minX;
      const y2 = maxY - line.y2;

      tikzCode += `\\draw[black, line width=6pt] (${x1.toFixed(2)}, ${y1.toFixed(2)}) -- (${x2.toFixed(2)}, ${y2.toFixed(2)});\n`;
    });

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

  // SVG to TikZ conversion function - directly adapted from the Python script at
  // /Users/leo/Homepage/LaTeX/Scripts/2025-04-14-SVG_to_TiKZ_domino_tiling_convert.py
  function svgToTikZ() {
    if (!currentDominoes || currentDominoes.length === 0) {
      alert("Please generate a domino tiling first.");
      return;
    }

    // We'll use the domino data directly instead of parsing SVG
    // Convert domino objects to rectangle objects with the format needed for TikZ conversion
    const rectangles = currentDominoes.map(domino => {
      return {
        x: domino.x / 100,
        y: domino.y / 100,
        width: domino.w / 100,
        height: domino.h / 100,
        fill: domino.color,
        stroke: "black",
        strokeWidth: 0.45 // Scaled down like in the Python script
      };
    });

    // Create lines array for paths if enabled
    const lines = [];
    if (usePaths) {
      // Add lines based on domino colors and positions
      currentDominoes.forEach(domino => {
        const centerX = domino.x + domino.w/2;
        const centerY = domino.y + domino.h/2;

        if (domino.color === "green") {
          // Green: Horizontal line through center
          lines.push({
            x1: domino.x / 100,
            y1: centerY / 100,
            x2: (domino.x + domino.w) / 100,
            y2: centerY / 100,
            stroke: "black",
            strokeWidth: 0.55 // Scaled down from 5.5
          });
        }
        else if (domino.color === "yellow") {
          // Yellow: path parallel to vector (1,-1) through the center
          const length = Math.min(domino.w, domino.h) * 0.7;
          const dx = length / Math.sqrt(2);
          const dy = length / Math.sqrt(2);

          lines.push({
            x1: (centerX - dx) / 100,
            y1: (centerY + dy) / 100,
            x2: (centerX + dx) / 100,
            y2: (centerY - dy) / 100,
            stroke: "black",
            strokeWidth: 0.55
          });
        }
        else if (domino.color === "red") {
          // Red: path parallel to vector (1,1) through the center
          const length = Math.min(domino.w, domino.h) * 0.7;
          const dx = length / Math.sqrt(2);
          const dy = length / Math.sqrt(2);

          lines.push({
            x1: (centerX - dx) / 100,
            y1: (centerY - dy) / 100,
            x2: (centerX + dx) / 100,
            y2: (centerY + dy) / 100,
            stroke: "black",
            strokeWidth: 0.55
          });
        }
        // Blue dominos don't get paths
      });
    }

    // Print debug info
    console.log("Rectangles:", rectangles.length);
    console.log("Lines:", lines.length);

    if (rectangles.length === 0) {
      alert("No domino elements found to convert.");
      return;
    }

    // Find the bounds of the drawing
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    // Process rectangles
    for (const rect of rectangles) {
      minX = Math.min(minX, rect.x);
      maxX = Math.max(maxX, rect.x + rect.width);
      minY = Math.min(minY, rect.y);
      maxY = Math.max(maxY, rect.y + rect.height);
    }

    // Process lines if they exist
    for (const line of lines) {
      minX = Math.min(minX, line.x1, line.x2);
      maxX = Math.max(maxX, line.x1, line.x2);
      minY = Math.min(minY, line.y1, line.y2);
      maxY = Math.max(maxY, line.y1, line.y2);
    }

    // Calculate a good scale factor (same as Python script)
    const width = maxX - minX;
    const height = maxY - minY;
    const maxDimension = Math.max(width, height);
    const scaleFactor = 15.0 / maxDimension;

    // Generate TikZ code (exact format from Python script)
    let tikzCode = `\\documentclass{standalone}
\\usepackage{tikz}
\\usepackage{xcolor}

`;

    // Add color definitions only if not using grayscale
    if (!useGrayscale) {
      tikzCode += `% Define colors to match SVG
\\definecolor{svggreen}{RGB}{0, 128, 0}
\\definecolor{svgred}{RGB}{255, 0, 0}
\\definecolor{svgyellow}{RGB}{255, 255, 0}
\\definecolor{svgblue}{RGB}{0, 0, 255}

`;
    }

    tikzCode += `\\begin{document}
\\begin{tikzpicture}[scale=${scaleFactor.toFixed(6)}]  % Calculated scale

% Dominoes (rectangles)
`;

    // Add rectangles to TikZ code (exact algorithm from Python script)
    rectangles.forEach(rect => {
      // Map SVG colors to TikZ colors or use grayscale
      let fillColor;
      if (useGrayscale) {
        // Use grayscale - extract from the actual domino data
        const matchingDomino = currentDominoes.find(d => 
          Math.abs(d.x/100 - rect.x) < 0.01 && Math.abs(d.y/100 - rect.y) < 0.01);
        if (matchingDomino) {
          const grayColor = getGrayscaleColor(matchingDomino.color, matchingDomino);
          // Convert hex to RGB values for TikZ
          const hex = grayColor.substring(1);
          const r = parseInt(hex.substring(0,2), 16);
          const g = parseInt(hex.substring(2,4), 16);
          const b = parseInt(hex.substring(4,6), 16);
          fillColor = `{rgb,255:red,${r};green,${g};blue,${b}}`;
        } else {
          fillColor = '{rgb,255:red,128;green,128;blue,128}'; // fallback gray
        }
      } else {
        // Use original colors
        fillColor = rect.fill;
        if (fillColor === 'green') fillColor = 'svggreen';
        else if (fillColor === 'red') fillColor = 'svgred';
        else if (fillColor === 'yellow') fillColor = 'svgyellow';
        else if (fillColor === 'blue') fillColor = 'svgblue';
      }

      // Shift coordinates to keep everything positive
      const x1 = rect.x - minX;
      const y1 = maxY - rect.y - rect.height;  // Invert y and adjust for height
      const x2 = rect.x - minX + rect.width;
      const y2 = maxY - rect.y;

      tikzCode += `\\filldraw[fill=${fillColor}, draw=black, line width=${rect.strokeWidth}pt] `;
      tikzCode += `(${x1.toFixed(2)}, ${y1.toFixed(2)}) rectangle (${x2.toFixed(2)}, ${y2.toFixed(2)});\n`;
    });

    tikzCode += "\n% Paths (lines) - Optimized\n";

    // Extract all line segments
    const segments = [];

    // Process lines to get path segments with coordinate adjustments
    lines.forEach(line => {
      // Shift and invert coordinates
      const x1 = line.x1 - minX;
      const y1 = maxY - line.y1;
      const x2 = line.x2 - minX;
      const y2 = maxY - line.y2;
      segments.push([x1, y1, x2, y2]);
    });

    console.log(`Extracted ${segments.length} line segments for optimization`);

    // Organize the data for processing
    const linePattern = /\\draw\[black, line width=.+?\] \((.+?), (.+?)\) -- \((.+?), (.+?)\);/;
    const parsedSegments = [];

    // Convert each segment to start/end point format
    segments.forEach(segment => {
      const [x1, y1, x2, y2] = segment;
      const start = [x1, y1];
      const end = [x2, y2];
      parsedSegments.push([start, end]);
    });

    // Function to check if two points are the same (within a small tolerance)
    function samePoint(p1, p2, tolerance = 0.02) { // Increased tolerance for better matching
      return Math.abs(p1[0] - p2[0]) < tolerance && Math.abs(p1[1] - p2[1]) < tolerance;
    }

    // Function to optimize paths with better debugging
    function optimizePaths(segments) {
      // Debug lines
      console.log("First few segments:");
      for (let i = 0; i < Math.min(5, segments.length); i++) {
        console.log(`  ${i}: [${segments[i][0]}] to [${segments[i][1]}]`);
      }

      // Create an adjacency list for easier path finding
      // For each endpoint, store all segments that connect to it
      const adjacencyMap = new Map();

      // Add a pair to the adjacency map
      function addToAdjacencyMap(point, segmentIndex, isStart) {
        // Convert point to string for use as a map key (with reduced precision)
        const key = `${point[0].toFixed(2)},${point[1].toFixed(2)}`;
        if (!adjacencyMap.has(key)) {
          adjacencyMap.set(key, []);
        }
        adjacencyMap.get(key).push({ segmentIndex, isStart });
      }

      // Build the adjacency map
      segments.forEach((segment, index) => {
        addToAdjacencyMap(segment[0], index, true);  // Start point
        addToAdjacencyMap(segment[1], index, false); // End point
      });

      // Debug the adjacency map
      console.log("Adjacency map (sample):");
      let count = 0;
      for (const [key, connections] of adjacencyMap.entries()) {
        if (count++ > 5) break; // Just show a few entries
        console.log(`  ${key}: ${connections.map(c => c.segmentIndex).join(', ')}`);
      }

      // Track which segments have been used
      const used = new Set();
      const paths = [];

      // Find all paths
      while (used.size < segments.length) {
        // Find an unused segment to start a new path
        let currentIndex = -1;
        for (let i = 0; i < segments.length; i++) {
          if (!used.has(i)) {
            currentIndex = i;
            break;
          }
        }

        if (currentIndex === -1) break; // All segments used

        // Start building the path
        const startSegment = segments[currentIndex];
        let currentPath = [...startSegment[0], ...startSegment[1]]; // Flatten to [x1,y1,x2,y2]
        used.add(currentIndex);

        // Keep extending the path as long as possible
        let foundExtension = true;
        while (foundExtension) {
          foundExtension = false;

          // Get current endpoints
          const n = currentPath.length;
          const headPoint = [currentPath[0], currentPath[1]];
          const tailPoint = [currentPath[n-2], currentPath[n-1]];

          // Try to find a segment connecting to the tail
          const tailKey = `${tailPoint[0].toFixed(2)},${tailPoint[1].toFixed(2)}`;
          if (adjacencyMap.has(tailKey)) {
            for (const connection of adjacencyMap.get(tailKey)) {
              if (used.has(connection.segmentIndex)) continue;

              const segment = segments[connection.segmentIndex];
              let newPoint;

              if (connection.isStart) {
                // Tail connects to start of segment, add the end
                newPoint = segment[1];
              } else {
                // Tail connects to end of segment, add the start
                newPoint = segment[0];
              }

              // Add the new point
              currentPath.push(newPoint[0], newPoint[1]);
              used.add(connection.segmentIndex);
              foundExtension = true;
              break;
            }
          }

          // If we didn't find a tail extension, try the head
          if (!foundExtension) {
            const headKey = `${headPoint[0].toFixed(2)},${headPoint[1].toFixed(2)}`;
            if (adjacencyMap.has(headKey)) {
              for (const connection of adjacencyMap.get(headKey)) {
                if (used.has(connection.segmentIndex)) continue;

                const segment = segments[connection.segmentIndex];
                let newPoint;

                if (connection.isStart) {
                  // Head connects to start of segment, add the end at the beginning
                  newPoint = segment[1];
                } else {
                  // Head connects to end of segment, add the start at the beginning
                  newPoint = segment[0];
                }

                // Add to the beginning of the path
                currentPath.unshift(newPoint[0], newPoint[1]);
                used.add(connection.segmentIndex);
                foundExtension = true;
                break;
              }
            }
          }
        }

        // Convert flat array [x1,y1,x2,y2,...] to points [[x1,y1],[x2,y2],...]
        const pointPath = [];
        for (let i = 0; i < currentPath.length; i += 2) {
          pointPath.push([currentPath[i], currentPath[i+1]]);
        }

        paths.push(pointPath);
      }

      // Debug info about the result
      console.log(`Found ${paths.length} paths`);
      for (let i = 0; i < Math.min(5, paths.length); i++) {
        console.log(`  Path ${i}: ${paths[i].length} points`);
      }

      return paths;
    }

    // Function to format point for TikZ
    function formatPoint(point) {
      return `(${point[0].toFixed(2)}, ${point[1].toFixed(2)})`;
    }

    // Optimize the paths
    const optimizedPaths = optimizePaths(parsedSegments);

    // Calculate optimization statistics
    console.log(`Original: ${segments.length} separate line segments`);
    console.log(`Optimized: ${optimizedPaths.length} combined paths`);

    // Calculate reduction percentage
    const reductionPercent = ((segments.length - optimizedPaths.length) / segments.length * 100).toFixed(2);
    console.log(`Reduced by ${reductionPercent}%`);

    // Find the longest path
    const longestPath = optimizedPaths.reduce((longest, current) =>
      current.length > longest.length ? current : longest, { length: 0 });
    console.log(`Longest path has ${longestPath.length} points`);

    // Distribution of path lengths
    const lengthCounts = {};
    optimizedPaths.forEach(path => {
      const len = path.length;
      lengthCounts[len] = (lengthCounts[len] || 0) + 1;
    });

    console.log("Path length distribution:");
    const sortedLengths = Object.keys(lengthCounts).sort((a, b) => parseInt(a) - parseInt(b));
    sortedLengths.forEach(len => {
      console.log(`Length ${len}: ${lengthCounts[len]} paths`);
    });

    // Add statistics to the TikZ code as comments
    tikzCode += `% Original: ${segments.length} separate line segments\n`;
    tikzCode += `% Optimized into ${optimizedPaths.length} combined paths\n`;
    tikzCode += `% Reduced by ${reductionPercent}%\n`;
    tikzCode += `% Longest path has ${longestPath.length} points\n\n`;

    // Add distribution info
    tikzCode += "% Path length distribution:\n";
    sortedLengths.forEach(len => {
      tikzCode += `% Length ${len}: ${lengthCounts[len]} paths\n`;
    });
    tikzCode += "\n";

    // Generate the optimized TikZ code
    optimizedPaths.forEach((path, i) => {
      // Add path info comment
      tikzCode += `% Path ${i+1}, ${path.length} points\n`;

      // Generate the draw command
      tikzCode += `\\draw[black, line width=2.5pt]`;
      path.forEach((point, j) => {
        if (j === 0) {
          tikzCode += ` ${formatPoint(point)}`;
        } else {
          tikzCode += ` -- ${formatPoint(point)}`;
        }
      });
      tikzCode += ";\n\n";
    });

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
    // Check which tab is currently active
    const activeTab = document.querySelector('.tablinks.active');
    const isDimerViewActive = activeTab && activeTab.textContent.includes('Dual Grid');
    
    if (isDimerViewActive) {
      dimerToTikZ();
    } else {
      svgToTikZ();
    }

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
    a.download = `aztec_diamond_n${n}_tikz.tex`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  });
};
</script>
