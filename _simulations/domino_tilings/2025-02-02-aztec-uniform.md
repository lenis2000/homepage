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
I set the upper bound at $n=400$ to avoid freezing your browser.

### Update 2025-04-14: TikZ Code Generation

You can now get a TikZ code for the sampled Aztec diamond (supporting dominoes and nonintersecting paths) using [this Python script](https://github.com/lenis2000/homepage/blob/master/LaTeX/Scripts/2025-04-14-SVG_to_TiKZ_domino_tiling_convert.py).

---

<!-- Controls to change n -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 400$): </label>
  <!-- Updated input: starting value 24, even numbers only (step=2), three-digit window (size=3), maximum 400 -->
  <input id="n-input" type="number" value="24" min="2" step="2" max="400" size="3">
  <button id="update-btn">Update</button>
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
  let usePaths = false; // Track nonintersecting paths state
  let useDimers = false; // Track dimers visibility state
  let currentDominoes = []; // Store current dominoes for toggling colors
  let isProcessing = false; // Flag to prevent multiple simultaneous updates
  let lastValue = parseInt(inputField.value, 10); // Track last processed value
  let checkerboardGroup; // Group for checkerboard squares
  let pathsGroup; // Group for nonintersecting paths
  let dimersGroup; // Group for dimers overlay

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

    // Clear previous rendering
    svg.selectAll("g").remove();
    checkerboardGroup = null;
    pathsGroup = null;
    dimersGroup = null;

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

    // Also render the dimer view
    renderDimerView(dominoes);

    // Add dimers if enabled
    if (useDimers) {
      toggleDimers();
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

    // Clear any previous simulation.
    svg.selectAll("g").remove();
    dimerSvg.selectAll("*").remove();
    checkerboardGroup = null;
    pathsGroup = null;
    dimersGroup = null;

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

  // Run an initial simulation.
  const initialN = parseInt(inputField.value, 10);
  updateVisualization(initialN);

  // Make sure both tab views are properly initialized once
  setTimeout(() => {
    if (currentDominoes && currentDominoes.length > 0) {
      renderDimerView(currentDominoes);

      // Make the first tab (domino view) active by default
      document.querySelector('.tablinks').click();
    }
  }, 1000);
};
</script>
