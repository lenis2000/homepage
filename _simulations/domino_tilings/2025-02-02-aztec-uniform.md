---
title: Domino tilings of the Aztec diamond
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-02-02-aztec-uniform.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-02-02-aztec-uniform.cpp'
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
</style>

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="/js/2025-02-02-aztec-uniform.js"></script>

This simulation demonstrates random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a>, which is a diamond-shaped union of unit squares. The simulation uses a uniform measure to generate random tilings via the <a href="https://arxiv.org/abs/math/0111034">shuffling algorithm</a>. The original python code was created by <a href="https://www.durham.ac.uk/staff/sunil-chhita/">Sunil Chhita</a>; this version is adapted for <code>JS</code> + <code>WebAssembly</code>. Visualization is done using <code>D3.js</code>.

The sampler works in your browser. Up to $n \sim 120$ it works in reasonable time, but for larger $n$ it may take a while.
I set the upper bound at $n=300$ to avoid freezing your browser.

<!-- Controls to change n -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 300$): </label>
  <!-- Updated input: starting value 50, even numbers only (step=2), three-digit window (size=3), maximum 300 -->
  <input id="n-input" type="number" value="50" min="2" step="2" max="300" size="3">
  <button id="update-btn">Update</button>

  <!-- Color toggle -->
  <div style="margin-top: 8px;">
    <label for="color-toggle">
      <input type="checkbox" id="color-toggle" checked> Show colors
    </label>
  </div>

  <!-- Checkerboard toggle -->
  <div style="margin-top: 8px;">
    <label for="checkerboard-toggle">
      <input type="checkbox" id="checkerboard-toggle"> Show checkerboard overlay
    </label>
  </div>
</div>

<!-- Progress indicator (polling progress from the C++ code via getProgress) -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<div class="row">
  <div class="col-12">
    <!-- The SVG now scales with the container.
         Its height is controlled via CSS for larger screens and mobile devices alike. -->
    <svg id="aztec-svg"></svg>
  </div>
</div>
<script>
Module.onRuntimeInitialized = async function() {
  // Wrap exported functions asynchronously.
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const svg = d3.select("#aztec-svg");
  const progressElem = document.getElementById("progress-indicator");
  const inputField = document.getElementById("n-input");
  let progressInterval;
  let useColors = true; // Track coloring state
  let useCheckerboard = false; // Track checkerboard state
  let currentDominoes = []; // Store current dominoes for toggling colors
  let isProcessing = false; // Flag to prevent multiple simultaneous updates
  let lastValue = parseInt(inputField.value, 10); // Track last processed value
  let checkerboardGroup; // Group for checkerboard squares

  // Start polling the progress counter from C++.
  function startProgressPolling() {
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
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
    }
  });

  // Handle checkerboard toggle
  document.getElementById("checkerboard-toggle").addEventListener("change", function() {
    useCheckerboard = this.checked;
    if (currentDominoes.length > 0) {
      toggleCheckerboard();
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

      // Create checkerboard squares (KxK units, where K is the size of the checkerboard square)
      const K = (maxX - minX) / (2*n); // Size of each checkerboard square
      const squares = [];
      for (let x = minX; x < maxX; x += K) {
        for (let y = minY; y < maxY; y += K) {
          squares.push({
            x: x,
            y: y,
            width: K,
            height: K,
            color: ((Math.floor(x/K) + Math.floor(y/K)) % 2 === 0) ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.05)"
          });
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
      .attr("width", 1)
      .attr("height", 1)
      .attr("fill", d => d.color)
      .attr("stroke", "rgba(0,0,0,0.3)")
      .attr("stroke-width", 0.1);

    // Move checkerboard on top of dominoes
    checkerboardGroup.raise();
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

    // Clear previous rendering
    svg.selectAll("g").remove();
    checkerboardGroup = null;

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
      .attr("stroke-width", 0.5);

    // Add checkerboard if enabled
    if (useCheckerboard) {
      toggleCheckerboard();
    }
  }

  // Update the visualization for a given n.
  async function updateVisualization(n) {
    // If already processing, don't start another one
    if (isProcessing) return;

    isProcessing = true;

    // Clear any previous simulation.
    svg.selectAll("g").remove();
    checkerboardGroup = null;

    // Start the progress indicator.
    startProgressPolling();

    try {
      // Await the asynchronous simulation.
      const ptr = await simulateAztec(n);
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      try {
        currentDominoes = JSON.parse(jsonStr); // Store for later toggling
      } catch (e) {
        console.error("Error parsing JSON:", e, jsonStr);
        progressElem.innerText = "Error during sampling";
        clearInterval(progressInterval);
        isProcessing = false;
        return;
      }

      // Render the dominoes
      renderDominoes(currentDominoes);

      // Clear progress indicator once done.
      progressElem.innerText = "";

      // Update last processed value
      lastValue = n;
    } catch (error) {
      console.error("Error in updateVisualization:", error);
      progressElem.innerText = "Error during sampling";
      clearInterval(progressInterval);
    } finally {
      isProcessing = false;
    }
  }

  // Validate and process the input
  function processInput() {
    const n = parseInt(inputField.value, 10);

    // Skip if the value hasn't changed
    if (n === lastValue) return;

    // Check for a valid positive even number.
    if (isNaN(n) || n < 2) {
      progressElem.innerText = "Please enter a valid positive even number for n (n ≥ 2).";
      return;
    }
    if (n % 2 !== 0) {
      progressElem.innerText = "Please enter an even number for n.";
      return;
    }
    if (n > 300) {
      progressElem.innerText = "Please enter a number no greater than 300.";
      return;
    }

    updateVisualization(n);
  }

  // Set up event listeners for input changes
  inputField.addEventListener("input", processInput);
  inputField.addEventListener("change", processInput);

  // Make sure the update button always triggers a new sample, even if value hasn't changed
  document.getElementById("update-btn").addEventListener("click", function() {
    // Force a resample even if the value hasn't changed
    updateVisualization(parseInt(inputField.value, 10));
  });

  // Run an initial simulation.
  const initialN = parseInt(inputField.value, 10);
  updateVisualization(initialN);
};
</script>
