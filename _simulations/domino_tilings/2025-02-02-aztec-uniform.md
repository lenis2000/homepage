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
</div>

<!-- Progress indicator (polling progress from the C++ code via getProgress) -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<!-- Tabs -->
<div class="tab">
  <button class="tablinks active" onclick="openView(event, 'domino-view')">Domino View</button>
  <button class="tablinks" onclick="openView(event, 'dimer-view'); resizeDimerView();">Dimer View</button>
</div>

<!-- Domino View -->
<div id="domino-view" class="tabcontent" style="display: block;">
  <!-- Color toggle -->
  <div style="margin-top: 8px; margin-bottom: 8px;">
    <label for="color-toggle">
      <input type="checkbox" id="color-toggle" checked> Show colors
    </label>
  </div>

  <!-- Checkerboard toggle -->
  <div style="margin-bottom: 8px;">
    <label for="checkerboard-toggle">
      <input type="checkbox" id="checkerboard-toggle"> Show checkerboard overlay
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
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const svg = d3.select("#aztec-svg");
  const dimerSvg = d3.select("#dimer-svg");
  const progressElem = document.getElementById("progress-indicator");
  const inputField = document.getElementById("n-input");
  let progressInterval;
  let useColors = true; // Track coloring state
  let useCheckerboard = false; // Track checkerboard state
  let currentDominoes = []; // Store current dominoes for toggling colors
  let isProcessing = false; // Flag to prevent multiple simultaneous updates
  let lastValue = parseInt(inputField.value, 10); // Track last processed value
  let checkerboardGroup; // Group for checkerboard squares

  // Define n in the broader scope so it's accessible to all functions
  let n = parseInt(inputField.value, 10);

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
  }
  
  // Function to properly render dimer view when tab becomes visible
  window.resizeDimerView = function() {
    // This fixes a common issue where SVG doesn't render properly in hidden tabs
    setTimeout(() => {
      if (currentDominoes.length > 0) {
        renderDimerView(currentDominoes);
      }
    }, 10);
  }

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
      .attr("stroke-width", d => useCheckerboard || !useColors ? 4.5 : 0.5);

    // Add checkerboard if enabled
    if (useCheckerboard) {
      toggleCheckerboard();
    }

    // Also render the dimer view
    renderDimerView(dominoes);
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
      .attr("transform", `translate(${svgWidth/2},${svgHeight/2})`);

    // Scale factor based on the SVG size and the diamond size
    const scale = Math.min(svgWidth, svgHeight) / (2 * n + 4) * 0.85;

    // Draw the Aztec diamond grid vertices (points)
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
        }
      }
    }

    // Draw background grid lines with low opacity
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
          }
        }
      }
    }

    // First create a grid representation to match the Python code's approach
    const size = 2 * n;
    const grid = Array(size).fill().map(() => Array(size).fill(0));

    // Fill the grid with information about domino positions and types
    dominoes.forEach(domino => {
      const startI = domino.y;
      const startJ = domino.x;
      
      if (startI < size && startJ < size) {
        // Mark this cell as occupied
        grid[startI][startJ] = 1;
        
        // Set the direction: 1 for horizontal, 2 for vertical
        if (domino.w === 2) { // Horizontal domino
          if (startJ + 1 < size) {
            grid[startI][startJ + 1] = 1; // Mark the second cell
          }
        } else if (domino.h === 2) { // Vertical domino
          if (startI + 1 < size) {
            grid[startI + 1][startJ] = 1; // Mark the second cell
          }
        }
      }
    });
    
    // Now draw the dimers based on the grid, following Python's approach exactly
    const dimers = [];

    // Now identify and create dimers, following python_simulation.py exactly
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (grid[i][j] === 1) {
          let color, x1, y1, x2, y2;
          
          // Check for horizontal dominoes (matching Python exactly)
          if (j + 1 < size && grid[i][j + 1] === 1) {
            // Check domino type based on parity
            if (i % 2 === 1 && j % 2 === 1) {
              // Green horizontal
              color = useColors ? "green" : "black";
              x1 = Math.floor((j - i) / 2) - 1;
              y1 = Math.floor((size - i - j) / 2);
              x2 = x1 + 1;
              y2 = y1;
            } else if (i % 2 === 0 && j % 2 === 0) {
              // Red horizontal
              color = useColors ? "red" : "black";
              x1 = Math.floor((j - i) / 2) - 1;
              y1 = Math.floor((size - i - j) / 2);
              x2 = x1 + 1;
              y2 = y1;
            }
            
            // Mark these cells as processed
            grid[i][j] = 0;
            grid[i][j + 1] = 0;
          }
          // Check for vertical dominoes
          else if (i + 1 < size && grid[i + 1][j] === 1) {
            // Check domino type based on parity
            if (i % 2 === 1 && j % 2 === 0) {
              // Blue vertical
              color = useColors ? "blue" : "black";
              x1 = Math.floor((j - i) / 2);
              y1 = Math.floor((size - i - j) / 2);
              x2 = x1;
              y2 = y1 + 1;
            } else if (i % 2 === 0 && j % 2 === 1) {
              // Yellow vertical
              color = useColors ? "yellow" : "black";
              x1 = Math.floor((j - i) / 2);
              y1 = Math.floor((size - i - j) / 2);
              x2 = x1;
              y2 = y1 + 1;
            }
            
            // Mark these cells as processed
            grid[i][j] = 0;
            grid[i + 1][j] = 0;
          }
          
          // Save dimer if we identified one
          if (color && x1 !== undefined) {
            dimers.push({x1, y1, x2, y2, color});
          }
        }
      }
    }

    // Draw all the dimers
    dimers.forEach(dimer => {
      dimerGroup.append("line")
        .attr("x1", dimer.x1 * scale)
        .attr("y1", dimer.y1 * scale)
        .attr("x2", dimer.x2 * scale)
        .attr("y2", dimer.y2 * scale)
        .attr("stroke", dimer.color)
        .attr("stroke-width", 4);
    });
  }

  // Update the visualization for a given n.
  async function updateVisualization(newN) {
    // Update the global n value
    n = newN;

    // If already processing, don't start another one
    if (isProcessing) return;

    isProcessing = true;

    // Clear any previous simulation.
    svg.selectAll("g").remove();
    dimerSvg.selectAll("*").remove();
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
    if (newN > 300) {
      progressElem.innerText = "Please enter a number no greater than 300.";
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

  // Run an initial simulation.
  const initialN = parseInt(inputField.value, 10);
  updateVisualization(initialN);
};
</script>
