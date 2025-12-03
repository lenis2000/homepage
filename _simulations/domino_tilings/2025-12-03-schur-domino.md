---
title: Schur Process Sampling for Aztec Diamond
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-03-schur-domino.md'
    txt: 'This simulation is interactive, written in JavaScript'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-03-schur-domino.cpp'
    txt: 'C++ code for the simulation'
---

<style>
  #aztec-svg {
    width: 100%;
    height: 80vh;
    vertical-align: top;
  }
  @media (max-width: 576px) {
    #aztec-svg {
      height: 60vh;
      vertical-align: top;
    }
  }
  #zoom-in-btn, #zoom-out-btn {
    font-weight: bold;
    width: 30px;
    height: 30px;
  }
  #zoom-reset-btn {
    height: 30px;
  }
  .param-input {
    font-family: monospace;
    font-size: 12px;
    width: 100%;
    padding: 5px;
    margin-top: 5px;
    margin-bottom: 10px;
  }
</style>

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="/js/2025-12-03-schur-domino.js"></script>

Schur process sampling for Aztec diamond tilings based on <a href="https://arxiv.org/abs/1407.3764">arXiv:1407.3764</a> (Borodin, Gorin, Rains). Parameters $x_1,\ldots,x_n$ and $y_1,\ldots,y_n$ control the measure on tilings.

---

<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 400$): </label>
  <input id="n-input" type="number" value="4" min="2" step="2" max="400" size="3">
  <button id="update-btn">Sample (Shuffling)</button>
  <button id="growth-btn">Sample (Growth Diagram)</button>
  <button id="cancel-btn" style="display: none; margin-left: 10px; background-color: #ff5555;">Cancel</button>
</div>

<div style="margin-bottom: 10px;">
  <button id="uniform-btn">Uniform (all 1s)</button>
  <span style="margin-left: 20px;">
    <label for="r-input">r-weighting: $x_i=y_i=r^i$, r = </label>
    <input id="r-input" type="number" value="0.9" min="0.01" max="2" step="0.01" style="width: 60px;">
    <button id="r-btn">Apply r</button>
  </span>
</div>

<div style="margin-bottom: 10px;">
  <label for="x-params">x parameters (CSV, supports value^count e.g. 1^4):</label>
  <input id="x-params" type="text" class="param-input" value="1^4">
</div>

<div style="margin-bottom: 10px;">
  <label for="y-params">y parameters (CSV, supports value^count e.g. 1^4):</label>
  <input id="y-params" type="text" class="param-input" value="1^4">
</div>

<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<div class="row">
  <div class="col-12">
    <svg id="aztec-svg"></svg>
  </div>
</div>

<div style="margin-top: 15px;">
  <label for="subsets-output" style="font-weight: bold;">Schur Process Partitions:</label>
  <pre id="subsets-output" style="width: 100%; font-family: monospace; font-size: 12px; margin-top: 5px; padding: 10px; background-color: #f5f5f5; border: 1px solid #ddd; white-space: pre-wrap;"></pre>
</div>

<p style="margin-top: 10px; font-size: 0.9em;">See also:
<ul style="margin-top: 5px; margin-bottom: 0;">
  <li><a href="https://math.mit.edu/~borodin/aztec_phenomena.html">https://math.mit.edu/~borodin/aztec_phenomena.html</a></li>
  <li><a href="https://arxiv.org/abs/1407.3764">arXiv:1407.3764</a> — D. Betea, C. Boutillier, J. Bouttier, G. Chapuy, S. Corteel, and M. Vuletic, <i>Perfect sampling algorithms for Schur processes</i>, Markov Process. Related Fields 24 (2018), no. 3, 381–418.</li>
</ul>
</p>

<script>
Module.onRuntimeInitialized = async function() {
  const simulateSchur = Module.cwrap('simulateSchur', 'number', ['number', 'string', 'string'], {async: true});
  const simulateSchurGrowth = Module.cwrap('simulateSchurGrowth', 'number', ['number', 'string', 'string'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const svg = d3.select("#aztec-svg");
  const progressElem = document.getElementById("progress-indicator");
  const inputField = document.getElementById("n-input");
  const xParamsField = document.getElementById("x-params");
  const yParamsField = document.getElementById("y-params");
  let progressInterval;
  let currentDominoes = [];
  let isProcessing = false;
  let n = parseInt(inputField.value, 10);

  // Zoom setup
  let initialTransform = {};
  const zoom = d3.zoom()
    .scaleExtent([0.1, 50])
    .on("zoom", (event) => {
      if (!initialTransform.scale) return;
      const group = svg.select("g.dominoes");
      if (!group.empty()) {
        const t = event.transform;
        group.attr("transform",
          `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k})`);
      }
    });

  svg.call(zoom);
  svg.on("dblclick.zoom", () => {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  });

  // Add zoom controls
  const controlsContainer = d3.select("#aztec-svg").node().parentNode;
  const zoomDiv = d3.select(controlsContainer)
    .insert("div", "svg")
    .attr("class", "zoom-controls")
    .style("margin-bottom", "10px");

  zoomDiv.append("span").text("Zoom: ").style("font-weight", "bold");
  zoomDiv.append("button").attr("id", "zoom-in-btn").style("margin-left", "5px").text("+")
    .on("click", () => svg.transition().duration(300).call(zoom.scaleBy, 1.3));
  zoomDiv.append("button").attr("id", "zoom-out-btn").style("margin-left", "5px").text("-")
    .on("click", () => svg.transition().duration(300).call(zoom.scaleBy, 0.7));
  zoomDiv.append("button").attr("id", "zoom-reset-btn").style("margin-left", "5px").text("Reset Zoom")
    .on("click", () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity));
  zoomDiv.append("span").style("margin-left", "10px").style("font-style", "italic").style("font-size", "0.9em")
    .text("(Mouse wheel to zoom, drag to pan)");

  // Simulation control
  let simulationActive = false;
  let simulationAbortController = null;
  const cancelBtn = document.getElementById("cancel-btn");

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function startSimulation() {
    simulationActive = true;
    document.getElementById("update-btn").disabled = true;
    document.getElementById("growth-btn").disabled = true;
    inputField.disabled = true;
    cancelBtn.style.display = 'inline-block';
    simulationAbortController = new AbortController();
  }

  function stopSimulation() {
    simulationActive = false;
    clearInterval(progressInterval);
    document.getElementById("update-btn").disabled = false;
    document.getElementById("growth-btn").disabled = false;
    inputField.disabled = false;
    cancelBtn.style.display = 'none';
    progressElem.innerText = "Simulation cancelled";
    if (simulationAbortController) {
      simulationAbortController.abort();
      simulationAbortController = null;
    }
    isProcessing = false;
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
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
  }

  // Parse CSV to array with support for value^count notation (e.g., "1^100" = 100 ones)
  function parseCSV(str) {
    const result = [];
    const tokens = str.split(',');
    for (const token of tokens) {
      const trimmed = token.trim();
      if (trimmed === '') continue;

      // Check for value^count notation
      if (trimmed.includes('^')) {
        const parts = trimmed.split('^');
        if (parts.length === 2) {
          const value = parseFloat(parts[0].trim());
          const count = parseInt(parts[1].trim(), 10);
          if (!isNaN(value) && !isNaN(count) && count > 0) {
            for (let i = 0; i < count; i++) {
              result.push(value);
            }
            continue;
          }
        }
      }

      // Regular number
      const value = parseFloat(trimmed);
      if (!isNaN(value)) {
        result.push(value);
      }
    }
    return result;
  }

  // Generate CSV from array
  function arrayToCSV(arr) {
    return arr.map(x => x.toString()).join(',');
  }

  // Update parameters display based on n
  function updateParamsForN(newN) {
    const currentX = parseCSV(xParamsField.value);
    const currentY = parseCSV(yParamsField.value);

    // Extend or truncate to match n
    const newX = [];
    const newY = [];
    for (let i = 0; i < newN; i++) {
      newX.push(i < currentX.length ? currentX[i] : 1.0);
      newY.push(i < currentY.length ? currentY[i] : 1.0);
    }

    xParamsField.value = arrayToCSV(newX);
    yParamsField.value = arrayToCSV(newY);
  }

  // Set uniform parameters
  document.getElementById("uniform-btn").addEventListener("click", function() {
    const currentN = parseInt(inputField.value, 10);
    xParamsField.value = "1^" + currentN;
    yParamsField.value = "1^" + currentN;
  });

  // Set r-weighted parameters: x_i = y_i = r^i
  function applyRWeighting() {
    const currentN = parseInt(inputField.value, 10);
    const r = parseFloat(document.getElementById("r-input").value);
    if (isNaN(r) || r <= 0) {
      return;
    }
    const params = [];
    for (let i = 1; i <= currentN; i++) {
      params.push(Math.pow(r, i).toFixed(6));
    }
    const paramStr = params.join(',');
    xParamsField.value = paramStr;
    yParamsField.value = paramStr;
  }

  document.getElementById("r-btn").addEventListener("click", applyRWeighting);
  document.getElementById("r-input").addEventListener("input", applyRWeighting);

  function renderDominoes(dominoes) {
    const minX = d3.min(dominoes, d => d.x);
    const minY = d3.min(dominoes, d => d.y);
    const maxX = d3.max(dominoes, d => d.x + d.w);
    const maxY = d3.max(dominoes, d => d.y + d.h);
    const widthDominoes = maxX - minX;
    const heightDominoes = maxY - minY;

    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const scaleView = Math.min(svgWidth / widthDominoes, svgHeight / heightDominoes) * 0.45;
    const translateX = (svgWidth - widthDominoes * scaleView) / 2 - minX * scaleView;
    const translateY = (svgHeight - heightDominoes * scaleView) / 2 - minY * scaleView;

    initialTransform = { translateX, translateY, scale: scaleView };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g")
      .attr("class", "dominoes")
      .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scaleView + ")");

    // Draw dominoes first
    group.selectAll("rect")
      .data(dominoes)
      .enter()
      .append("rect")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("width", d => d.w)
      .attr("height", d => d.h)
      .attr("fill", d => d.color)
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5);

    // Draw the half-integer lattice points for Aztec diamond
    // Each domino covers two adjacent half-integer points
    // Extract 1x1 square centers from dominoes as lattice points
    // Yellow/Blue → in subset, Green/Red → not in subset
    const latticePoints = [];
    dominoes.forEach(d => {
      const inSubset = (d.color === "yellow" || d.color === "blue");
      if (d.w > d.h) {
        // Horizontal domino (w=40, h=20): two squares side by side
        latticePoints.push({x: d.x + 10, y: d.y + 10, inSubset});
        latticePoints.push({x: d.x + 30, y: d.y + 10, inSubset});
      } else {
        // Vertical domino (w=20, h=40): two squares stacked
        latticePoints.push({x: d.x + 10, y: d.y + 10, inSubset});
        latticePoints.push({x: d.x + 10, y: d.y + 30, inSubset});
      }
    });

    // Compute center of diamond
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Compute diagonal index for each point: x - y in abstract coords
    // SW-NE diagonals have constant (screen_x + screen_y)
    // Diagonal spacing is 20 pixels (moving perpendicular to diagonal by 1 unit)
    latticePoints.forEach(p => {
      // Diagonal index: (sx + sy - center) / 20, gives values from -n to n
      p.diag = Math.round((p.x + p.y - cx - cy) / 20);
    });

    // Group by diagonal to form subsets
    // x - y = -n is λ^n, x - y = -n+1 is μ^n, etc.
    const diagonals = {};
    latticePoints.forEach(p => {
      if (!diagonals[p.diag]) diagonals[p.diag] = [];
      diagonals[p.diag].push(p);
    });

    // Sort points within each diagonal by position along the diagonal
    // (by screen_x - screen_y, which increases going NE along the diagonal)
    for (const d in diagonals) {
      diagonals[d].sort((a, b) => (a.x - a.y) - (b.x - b.y));
      // Assign 1-indexed position within diagonal
      diagonals[d].forEach((p, idx) => {
        p.posInDiag = idx + 1;
      });
    }

    // Draw only the points that are IN the subset (yellow/blue dominoes)
    const subsetPoints = latticePoints.filter(p => p.inSubset);
    group.selectAll("circle.lattice")
      .data(subsetPoints)
      .enter()
      .append("circle")
      .attr("class", "lattice")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 4)
      .attr("fill", "#000")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Build and log subsets for each diagonal
    const subsets = {};
    for (const k in diagonals) {
      subsets[k] = diagonals[k]
        .filter(p => p.inSubset)
        .map(p => p.posInDiag);
    }

    // Convert diagonal index to λ/μ label
    const diagKeys = Object.keys(diagonals).map(Number).sort((a, b) => a - b);
    const subsetLabels = {};
    diagKeys.forEach((k, idx) => {
      const label = (idx % 2 === 0) ? "λ" + (n - idx/2) : "μ" + (n - Math.floor(idx/2));
      subsetLabels[label] = subsets[k];
    });

    console.log("Subsets by diagonal:", subsets);
    console.log("Subsets with labels:", subsetLabels);
  }

  function renderParticles(particles, n) {
    const scale = 25;
    const numSlices = 2 * n + 1;

    // SW/NE diagonals at x - y = k for k = -n, ..., n (2n+1 lines total)
    // Slice s corresponds to diagonal k = s - n
    // Slice sizes: n + 1 - |k| gives 1,2,3,...,n+1,...,3,2,1
    // λ⁰ (s=0, k=-n) at bottom-left, λⁿ (s=2n, k=n) at top-right
    const gridPositions = [];
    for (let s = 0; s < numSlices; s++) {
      const k = s - n;  // diagonal index: x - y = k, ranges from -n to n
      const sliceSize = n + 1 - Math.abs(k);  // number of points on this diagonal

      for (let elem = 1; elem <= sliceSize; elem++) {
        // Position along diagonal (in x + y direction)
        const alongDiag = elem - (sliceSize + 1) / 2;

        // Coordinates where x - y = k (SW-NE diagonal)
        // Moving along diagonal: direction (1, 1)
        // Moving between diagonals: direction (1, -1)
        const x = (k + alongDiag) * scale;
        const y = (-k + alongDiag) * scale;
        // Check: x - y = (k + alongDiag) - (-k + alongDiag) = 2k ✓

        gridPositions.push({
          x: x,
          y: y,
          slice: s,
          elem: elem,
          isGrid: true
        });
      }
    }

    // Compute bounds from actual grid positions
    const allPoints = [...gridPositions];
    const minX = d3.min(allPoints, d => d.x) - scale * 1.5;
    const minY = d3.min(allPoints, d => d.y) - scale * 1.5;
    const maxX = d3.max(allPoints, d => d.x) + scale * 1.5;
    const maxY = d3.max(allPoints, d => d.y) + scale * 1.5;
    const widthData = maxX - minX;
    const heightData = maxY - minY;

    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const viewScale = Math.min(svgWidth / widthData, svgHeight / heightData) * 0.85;
    const translateX = (svgWidth - widthData * viewScale) / 2 - minX * viewScale;
    const translateY = (svgHeight - heightData * viewScale) / 2 - minY * viewScale;

    initialTransform = { translateX, translateY, scale: viewScale };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g")
      .attr("class", "particles")
      .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + viewScale + ")");

    // Draw Aztec diamond outline - compute from actual grid extent
    // The outline should be a rotated square enclosing all grid points
    // Note: In screen coords, max y is at bottom, min y is at top
    const outlinePoints = [];
    // Bottom vertex in screen coords (max y, where λ⁰ slice is)
    outlinePoints.push({x: 0, y: d3.max(gridPositions, d => d.y) + scale * 0.5});
    // Right vertex (max x)
    outlinePoints.push({x: d3.max(gridPositions, d => d.x) + scale * 0.5, y: 0});
    // Top vertex in screen coords (min y, where λⁿ slice is)
    outlinePoints.push({x: 0, y: d3.min(gridPositions, d => d.y) - scale * 0.5});
    // Left vertex (min x)
    outlinePoints.push({x: d3.min(gridPositions, d => d.x) - scale * 0.5, y: 0});

    group.append("polygon")
      .attr("points", outlinePoints.map(p => p.x + "," + p.y).join(" "))
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    // Draw grid positions as small gray circles
    const gridRadius = 4;
    group.selectAll("circle.grid")
      .data(gridPositions)
      .enter()
      .append("circle")
      .attr("class", "grid")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", gridRadius)
      .attr("fill", "#eee")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);

    // Draw diagonal lines for each slice (SW-NE diagonals at x - y = const)
    // Draw BEFORE circles so circles appear on top
    for (let s = 0; s < numSlices; s++) {
      const k = s - n;
      const sliceSize = n + 1 - Math.abs(k);
      // Compute line endpoints directly from k
      // Line goes from elem=1 to elem=sliceSize
      const alongStart = 1 - (sliceSize + 1) / 2;
      const alongEnd = sliceSize - (sliceSize + 1) / 2;
      const ext = scale * 0.7;  // extension amount

      const x1 = (k + alongStart) * scale - ext;
      const y1 = (-k + alongStart) * scale - ext;
      const x2 = (k + alongEnd) * scale + ext;
      const y2 = (-k + alongEnd) * scale + ext;

      group.append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", "#cc0000")
        .attr("stroke-width", 2);

      // Add dashed mark at coordinate 0 (perpendicular tick)
      // Position for elem = 0 on this diagonal
      const alongZero = 0 - (sliceSize + 1) / 2;
      const x0 = (k + alongZero) * scale;
      const y0 = (-k + alongZero) * scale;

      // Perpendicular to diagonal (1,1) is direction (1,-1)
      const tickLen = scale * 1.2;
      group.append("line")
        .attr("x1", x0 - tickLen * 0.5)
        .attr("y1", y0 + tickLen * 0.5)
        .attr("x2", x0 + tickLen * 0.5)
        .attr("y2", y0 - tickLen * 0.5)
        .attr("stroke", "#000")
        .attr("stroke-width", 4)
        .attr("stroke-dasharray", "6,4");
    }

    // Map particles to grid positions and draw
    const particleRadius = 7;
    if (particles && particles.length > 0) {
      // Find matching grid positions for each particle
      const particlePositions = particles.map(p => {
        const gridPos = gridPositions.find(g => g.slice === p.slice && g.elem === p.elem);
        return gridPos ? {...gridPos, isParticle: true} : null;
      }).filter(p => p !== null);

      group.selectAll("circle.particle")
        .data(particlePositions)
        .enter()
        .append("circle")
        .attr("class", "particle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", particleRadius)
        .attr("fill", "#E57200")
        .attr("stroke", "#232D4B")
        .attr("stroke-width", 2);
    }

    // Draw slice labels at the SW end of each diagonal (elem=1, which has max y value)
    for (let s = 0; s < numSlices; s++) {
      const slicePoints = gridPositions.filter(p => p.slice === s);
      if (slicePoints.length > 0) {
        // Find SW point (max y, which is elem=1)
        const swPoint = slicePoints.reduce((a, b) => a.y > b.y ? a : b);
        const label = (s % 2 === 0) ? "λ" + (s / 2) : "μ" + Math.ceil(s / 2);
        group.append("text")
          .attr("x", swPoint.x)
          .attr("y", swPoint.y + scale * 0.8)
          .attr("text-anchor", "end")
          .attr("dominant-baseline", "middle")
          .attr("font-size", "10px")
          .attr("fill", "#666")
          .text(label);
      }
    }
  }

  // Display partitions with subsets for Growth Diagram
  function displayPartitionsWithSubsets(partitions, subsets, n) {
    const subsetsOutput = document.getElementById("subsets-output");
    if (!subsetsOutput) return;

    const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    function toSuperscript(num) {
      if (num < 10) return superscripts[num];
      return num.toString().split('').map(d => superscripts[parseInt(d)]).join('');
    }

    const lines = [];
    lines.push("Growth Diagram Sampling:");
    lines.push("");

    for (let i = 0; i < partitions.length; i++) {
      const partition = partitions[i];
      const subset = subsets[i] || [];
      const partStr = partition.length === 0 ? "∅" : "(" + partition.join(",") + ")";
      const subsetStr = subset.length === 0 ? "∅" : "{" + subset.join(",") + "}";
      const label = (i % 2 === 0) ? "λ" + toSuperscript(i / 2) : "μ" + toSuperscript(Math.ceil(i / 2));
      lines.push(`${label} = ${partStr}  →  subset: ${subsetStr}`);
    }

    // Check interlacing
    lines.push("");
    lines.push("Interlacing checks:");
    let allValid = true;

    for (let i = 1; i < partitions.length; i++) {
      if (i % 2 === 1) {
        const k = Math.ceil(i / 2);
        const mu_k = partitions[i];
        const lambda_km1 = partitions[i - 1];
        const isHS = isHorizontalStrip(mu_k, lambda_km1);
        if (!isHS) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k-1)} horiz: ${isHS ? "✓" : "✗"}`);
      } else {
        const k = i / 2;
        const lambda_k = partitions[i];
        const mu_k = partitions[i - 1];
        const isVS = isVerticalStrip(mu_k, lambda_k);
        if (!isVS) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k)} vert: ${isVS ? "✓" : "✗"}`);
      }
    }

    lines.push(allValid ? "\nAll interlacing ✓" : "\nWARNING: Interlacing failed ✗");
    subsetsOutput.textContent = lines.join("\n");
  }

  let currentSubsets = [];
  let currentN = 4;

  // Convert subset S ⊂ {1,...,m} to partition via Maya diagram
  // λ_i = s_i - i where s_1 < s_2 < ... < s_k are elements of S
  function subsetToPartition(subset, m) {
    if (!subset || subset.length === 0) return [];
    const sorted = [...subset].sort((a, b) => a - b);
    const parts = [];
    for (let i = 0; i < sorted.length; i++) {
      const part = sorted[i] - (i + 1);  // s_{i+1} - (i+1), 0-indexed
      if (part > 0) parts.push(part);
    }
    // Parts are already in increasing order, reverse for standard notation
    return parts.reverse();
  }

  // Format partition as string
  function partitionToString(lambda) {
    if (!lambda || lambda.length === 0) return "∅";
    return "(" + lambda.join(",") + ")";
  }

  // Check if μ/λ is a horizontal strip (at most one box per column)
  // Equivalently: μ_i ≥ λ_i ≥ μ_{i+1} for all i
  function isHorizontalStrip(mu, lambda) {
    const maxLen = Math.max(mu.length, lambda.length) + 1;
    for (let i = 0; i < maxLen; i++) {
      const mu_i = i < mu.length ? mu[i] : 0;
      const mu_ip1 = (i + 1) < mu.length ? mu[i + 1] : 0;
      const lambda_i = i < lambda.length ? lambda[i] : 0;
      if (!(mu_i >= lambda_i && lambda_i >= mu_ip1)) {
        return false;
      }
    }
    return true;
  }

  // Check if λ/μ is a vertical strip (at most one box per row)
  // Equivalently: λ_i - μ_i ∈ {0, 1} for all i
  function isVerticalStrip(lambda, mu) {
    const maxLen = Math.max(lambda.length, mu.length);
    for (let i = 0; i < maxLen; i++) {
      const lambda_i = i < lambda.length ? lambda[i] : 0;
      const mu_i = i < mu.length ? mu[i] : 0;
      const diff = lambda_i - mu_i;
      if (diff < 0 || diff > 1) {
        return false;
      }
    }
    return true;
  }

  function displaySubsets(subsets, n) {
    currentSubsets = subsets;
    currentN = n;
    const subsetsOutput = document.getElementById("subsets-output");

    if (!subsetsOutput) return;

    if (!subsets || subsets.length === 0) {
      subsetsOutput.textContent = "No subset data available.";
      return;
    }

    // Superscript helper
    const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    function toSuperscript(num) {
      if (num < 10) return superscripts[num];
      return num.toString().split('').map(d => superscripts[parseInt(d)]).join('');
    }

    // Convert all subsets to partitions
    const partitions = [];
    for (let i = 0; i < subsets.length; i++) {
      // Determine slice size (number of elements on this diagonal)
      const m = subsets[i].length > 0 ? Math.max(...subsets[i]) : (i < subsets.length - 1 && subsets[i+1].length > 0 ? Math.max(...subsets[i+1]) : n);
      partitions.push(subsetToPartition(subsets[i], m));
    }

    // Display partitions with λ/μ notation
    const lines = [];
    for (let i = 0; i < subsets.length; i++) {
      const subset = subsets[i];
      const partition = partitions[i];
      const partStr = partitionToString(partition);
      const subsetStr = subset.length === 0 ? "∅" : "{" + subset.join(",") + "}";
      let label;
      if (i % 2 === 0) {
        label = "λ" + toSuperscript(i / 2);
      } else {
        label = "μ" + toSuperscript((i + 1) / 2);
      }
      lines.push(`${label} = ${partStr}  (subset: ${subsetStr})`);
    }

    // Check interlacing conditions
    // Pattern: λ^(i-1) ⊂ μ^i ⊃ λ^i
    // μ^i / λ^(i-1) is horizontal strip (μ contains λ^(i-1))
    // μ^i / λ^i is vertical strip (μ contains λ^i)
    lines.push("");
    lines.push("Interlacing checks:");
    let allValid = true;

    for (let i = 1; i < partitions.length; i++) {
      if (i % 2 === 1) {
        // Odd slice: μ^k where k = (i+1)/2
        // Check μ^k / λ^(k-1) is horizontal strip
        const k = (i + 1) / 2;
        const mu_k = partitions[i];
        const lambda_km1 = partitions[i - 1];
        const isHS = isHorizontalStrip(mu_k, lambda_km1);
        const status = isHS ? "✓" : "✗";
        if (!isHS) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k-1)} horizontal strip: ${status}`);
      } else {
        // Even slice: λ^k where k = i/2
        // Check μ^k / λ^k is vertical strip (μ^k is previous slice)
        const k = i / 2;
        const lambda_k = partitions[i];
        const mu_k = partitions[i - 1];
        const isVS = isVerticalStrip(mu_k, lambda_k);  // μ/λ not λ/μ
        const status = isVS ? "✓" : "✗";
        if (!isVS) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k)} vertical strip: ${status}`);
      }
    }

    if (allValid) {
      lines.push("All interlacing conditions satisfied ✓");
    } else {
      lines.push("WARNING: Some interlacing conditions failed ✗");
    }

    subsetsOutput.textContent = lines.join("\n");
  }

  // Display partitions directly from Growth Diagram output
  function displayPartitions(partitions, n) {
    const subsetsOutput = document.getElementById("subsets-output");

    if (!subsetsOutput) return;

    if (!partitions || partitions.length === 0) {
      subsetsOutput.textContent = "No partition data available.";
      return;
    }

    // Superscript helper
    const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    function toSuperscript(num) {
      if (num < 10) return superscripts[num];
      return num.toString().split('').map(d => superscripts[parseInt(d)]).join('');
    }

    // Display partitions with λ/μ notation
    const lines = [];
    lines.push("Growth Diagram Sampling - Partition Sequence:");
    lines.push("");

    for (let i = 0; i < partitions.length; i++) {
      const partition = partitions[i];
      const partStr = partition.length === 0 ? "∅" : "(" + partition.join(",") + ")";
      let label;
      if (i % 2 === 0) {
        label = "λ" + toSuperscript(i / 2);
      } else {
        label = "μ" + toSuperscript((i + 1) / 2);
      }
      lines.push(`${label} = ${partStr}`);
    }

    // Check interlacing conditions
    lines.push("");
    lines.push("Interlacing checks:");
    let allValid = true;

    for (let i = 1; i < partitions.length; i++) {
      if (i % 2 === 1) {
        // Odd slice: μ^k where k = (i+1)/2
        // Check μ^k / λ^(k-1) is horizontal strip
        const k = (i + 1) / 2;
        const mu_k = partitions[i];
        const lambda_km1 = partitions[i - 1];
        const isHS = isHorizontalStrip(mu_k, lambda_km1);
        const status = isHS ? "✓" : "✗";
        if (!isHS) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k-1)} horizontal strip: ${status}`);
      } else {
        // Even slice: λ^k where k = i/2
        // Check μ^k / λ^k is vertical strip
        const k = i / 2;
        const lambda_k = partitions[i];
        const mu_k = partitions[i - 1];
        const isVS = isVerticalStrip(mu_k, lambda_k);
        const status = isVS ? "✓" : "✗";
        if (!isVS) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k)} vertical strip: ${status}`);
      }
    }

    if (allValid) {
      lines.push("");
      lines.push("All interlacing conditions satisfied ✓");
    } else {
      lines.push("");
      lines.push("WARNING: Some interlacing conditions failed ✗");
    }

    subsetsOutput.textContent = lines.join("\n");
  }

  async function updateVisualization(newN) {
    n = newN;
    if (isProcessing) return;

    isProcessing = true;
    startSimulation();
    const signal = simulationAbortController.signal;

    svg.selectAll("g").remove();
    const startTime = performance.now();
    startProgressPolling();

    await sleep(10);
    if (signal.aborted) {
      clearInterval(progressInterval);
      isProcessing = false;
      return;
    }

    try {
      // Update params to match n
      updateParamsForN(n);

      // Get parameters
      const xParams = parseCSV(xParamsField.value);
      const yParams = parseCSV(yParamsField.value);
      const xJson = JSON.stringify(xParams);
      const yJson = JSON.stringify(yParams);

      const ptr = await simulateSchur(n, xJson, yJson);

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

      await sleep(10);
      if (signal.aborted) {
        clearInterval(progressInterval);
        isProcessing = false;
        return;
      }

      try {
        const result = JSON.parse(jsonStr);
        currentDominoes = result.dominoes || result;  // Handle both old and new format
        const subsets = result.subsets || [];
        displaySubsets(subsets, n);
      } catch (e) {
        progressElem.innerText = "Error during sampling";
        clearInterval(progressInterval);
        isProcessing = false;
        return;
      }

      if (!signal.aborted) {
        renderDominoes(currentDominoes);
      }

      if (!signal.aborted) {
        const endTime = performance.now();
        const elapsed = ((endTime - startTime) / 1000).toFixed(2);
        progressElem.innerText = "Sampled in " + elapsed + " seconds";
      }
    } catch (error) {
      if (!signal.aborted) {
        progressElem.innerText = "Error during sampling";
        clearInterval(progressInterval);
      }
    } finally {
      if (!signal.aborted) {
        simulationActive = false;
        document.getElementById("update-btn").disabled = false;
        document.getElementById("growth-btn").disabled = false;
        inputField.disabled = false;
        cancelBtn.style.display = 'none';
        isProcessing = false;
      }
    }
  }

  function processInput() {
    const newN = parseInt(inputField.value, 10);
    if (isNaN(newN) || newN < 2) {
      progressElem.innerText = "Please enter a valid positive even number for n (n >= 2).";
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

  document.getElementById("update-btn").addEventListener("click", processInput);
  document.getElementById("cancel-btn").addEventListener("click", stopSimulation);

  // Growth Diagram sampling
  async function updateVisualizationGrowth(newN) {
    n = newN;
    if (isProcessing) return;

    isProcessing = true;
    startSimulation();
    document.getElementById("growth-btn").disabled = true;
    const signal = simulationAbortController.signal;

    svg.selectAll("g").remove();
    const startTime = performance.now();
    startProgressPolling();

    await sleep(10);
    if (signal.aborted) {
      clearInterval(progressInterval);
      isProcessing = false;
      document.getElementById("growth-btn").disabled = false;
      return;
    }

    try {
      updateParamsForN(n);

      const xParams = parseCSV(xParamsField.value);
      const yParams = parseCSV(yParamsField.value);
      const xJson = JSON.stringify(xParams);
      const yJson = JSON.stringify(yParams);

      const ptr = await simulateSchurGrowth(n, xJson, yJson);

      if (signal.aborted) {
        if (ptr) freeString(ptr);
        clearInterval(progressInterval);
        isProcessing = false;
        document.getElementById("growth-btn").disabled = false;
        return;
      }

      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      if (signal.aborted) {
        clearInterval(progressInterval);
        isProcessing = false;
        document.getElementById("growth-btn").disabled = false;
        return;
      }

      await sleep(10);
      if (signal.aborted) {
        clearInterval(progressInterval);
        isProcessing = false;
        document.getElementById("growth-btn").disabled = false;
        return;
      }

      try {
        const result = JSON.parse(jsonStr);
        const particles = result.particles || [];
        const partitions = result.partitions || [];
        const subsets = result.subsets || [];
        displayPartitionsWithSubsets(partitions, subsets, n);

        // Render particles
        if (particles.length > 0) {
          renderParticles(particles, n);
        } else {
          svg.selectAll("g").remove();
          const bbox = svg.node().getBoundingClientRect();
          svg.attr("viewBox", "0 0 " + bbox.width + " " + bbox.height);
          svg.append("text")
            .attr("x", bbox.width / 2)
            .attr("y", bbox.height / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("fill", "#666")
            .text("No particles to display");
        }
      } catch (e) {
        progressElem.innerText = "Error during sampling: " + e.message;
        clearInterval(progressInterval);
        isProcessing = false;
        document.getElementById("growth-btn").disabled = false;
        return;
      }

      if (!signal.aborted) {
        const endTime = performance.now();
        const elapsed = ((endTime - startTime) / 1000).toFixed(2);
        progressElem.innerText = "Growth Diagram sampled in " + elapsed + " seconds";
      }
    } catch (error) {
      if (!signal.aborted) {
        progressElem.innerText = "Error during sampling: " + error.message;
        clearInterval(progressInterval);
      }
    } finally {
      if (!signal.aborted) {
        simulationActive = false;
        document.getElementById("update-btn").disabled = false;
        document.getElementById("growth-btn").disabled = false;
        inputField.disabled = false;
        cancelBtn.style.display = 'none';
        isProcessing = false;
      }
    }
  }

  function processInputGrowth() {
    const newN = parseInt(inputField.value, 10);
    if (isNaN(newN) || newN < 2) {
      progressElem.innerText = "Please enter a valid positive even number for n (n >= 2).";
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
    updateVisualizationGrowth(newN);
  }

  document.getElementById("growth-btn").addEventListener("click", processInputGrowth);

  // Initial simulation - use Shuffling algorithm
  updateVisualization(parseInt(inputField.value, 10));
};
</script>
