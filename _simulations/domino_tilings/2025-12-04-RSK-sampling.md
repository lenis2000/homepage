---
title: RSK Sampling for the Aztec Diamond
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-04-RSK-sampling.md'
    txt: 'This simulation is interactive, written in JavaScript'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-04-RSK-sampling.cpp'
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
  #subsets-output {
    font-family: monospace;
    font-size: 12px;
    white-space: pre-wrap;
    background-color: #f5f5f5;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-top: 10px;
  }
</style>

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="/js/2025-12-04-RSK-sampling.js"></script>

<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 600$): </label>
  <input id="n-input" type="number" value="4" min="2" step="2" max="600" size="3">
  <button id="update-btn">Sample</button>
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

<div style="margin-top: 20px;">
  <h4>Partitions forming the Schur process</h4>
  <div id="subsets-output">No subset data available yet. Click "Sample" to generate.</div>
</div>

<div style="margin-top: 20px; padding: 15px; border: 2px solid #4682B4; border-radius: 8px; background-color: #f0f8ff;">
  <h4 style="margin-top: 0;">Edit Partition</h4>
  <div style="margin-bottom: 10px;">
    <label for="partition-select">Select partition level: </label>
    <select id="partition-select" style="font-family: monospace; padding: 5px;">
      <option value="">-- Sample first --</option>
    </select>
  </div>
  <div style="margin-bottom: 10px;">
    <label for="partition-input">Partition (comma-separated, e.g., 4,3,1): </label>
    <input id="partition-input" type="text" class="param-input" value="" placeholder="e.g., 4,3,1 or empty for ∅">
  </div>
  <div>
    <button id="apply-partition-btn">Apply Partition</button>
    <span id="partition-status" style="margin-left: 15px; font-style: italic;"></span>
  </div>
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
    inputField.disabled = true;
    cancelBtn.style.display = 'inline-block';
    simulationAbortController = new AbortController();
  }

  function stopSimulation() {
    simulationActive = false;
    clearInterval(progressInterval);
    document.getElementById("update-btn").disabled = false;
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

    const scaleView = Math.min(svgWidth / widthDominoes, svgHeight / heightDominoes) * 0.9;
    const translateX = (svgWidth - widthDominoes * scaleView) / 2 - minX * scaleView;
    const translateY = (svgHeight - heightDominoes * scaleView) / 2 - minY * scaleView;

    initialTransform = { translateX, translateY, scale: scaleView };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g")
      .attr("class", "dominoes")
      .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scaleView + ")");

    // ========== DRAW DOMINOES FIRST ==========
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

    // ========== STEP 1: Extract λ/μ subsets from dominos ==========
    // Each domino covers two adjacent half-integer points
    // Yellow/Blue → in subset, Green/Red → not in subset
    const dominoPoints = [];
    dominoes.forEach(d => {
      const inSubset = (d.color === "yellow" || d.color === "blue");
      if (d.w > d.h) {
        // Horizontal domino (w=40, h=20): two squares side by side
        dominoPoints.push({x: d.x + 10, y: d.y + 10, inSubset});
        dominoPoints.push({x: d.x + 30, y: d.y + 10, inSubset});
      } else {
        // Vertical domino (w=20, h=40): two squares stacked
        dominoPoints.push({x: d.x + 10, y: d.y + 10, inSubset});
        dominoPoints.push({x: d.x + 10, y: d.y + 30, inSubset});
      }
    });

    // Compute center of diamond from domino bounds
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Compute diagonal index and position for each domino point
    dominoPoints.forEach(p => {
      p.diag = Math.round((p.x + p.y - cx - cy) / 20);
    });

    // Group by diagonal and sort to get positions
    const dominoDiagonals = {};
    dominoPoints.forEach(p => {
      if (!dominoDiagonals[p.diag]) dominoDiagonals[p.diag] = [];
      dominoDiagonals[p.diag].push(p);
    });
    for (const d in dominoDiagonals) {
      dominoDiagonals[d].sort((a, b) => (a.x - a.y) - (b.x - b.y));
      dominoDiagonals[d].forEach((p, idx) => { p.posInDiag = idx + 1; });
    }

    // Extract subsets: which positions are "in" for each diagonal
    const extractedSubsets = {};
    for (const k in dominoDiagonals) {
      extractedSubsets[k] = dominoDiagonals[k]
        .filter(p => p.inSubset)
        .map(p => p.posInDiag);
    }

    // Store original particle counts for each diagonal (for inverse bijection)
    originalParticleCounts = {};
    for (const k in extractedSubsets) {
      originalParticleCounts[k] = extractedSubsets[k].length;
    }

    // ========== STEP 2: Generate lattice from geometry (no dominos) ==========
    // Half-integer lattice: points (hx, hy) with |hx| + |hy| <= n + 0.5
    // Screen coords: rotated 45 degrees, so screenX ~ (hx - hy), screenY ~ -(hx + hy)
    //
    // From domino rendering (C++): screenX = (j - i) * 10, screenY = (size - (i+j)) * 10
    // The mapping is: hx = (screenX - screenY) / 20, hy = (-screenX - screenY) / 20 + offset
    //
    // Simpler: compute (hx, hy) for each domino point, find the scale/offset

    // Determine scale from domino points: adjacent points differ by 1 in hx or hy
    // In screen coords, horizontal domino has dx=20, vertical has dy=20
    // For horizontal: moving +20 in screenX means +1 in (hx - hy), so hx or hy changes
    // For 45-deg rotation: screenX = k*(hx - hy), screenY = k*(-hx - hy) + c
    // So: hx = (screenX - screenY)/(2k) + offset, hy = (-screenX - screenY)/(2k) + offset

    const scale = 20;  // 1 unit in abstract coords = 20 pixels
    const angle = 0;  // 45 degrees clockwise in screen coords
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Generate all half-integer points
    const latticePoints = [];
    for (let hx = -n - 0.5; hx <= n + 0.5; hx += 1) {
      for (let hy = -n - 0.5; hy <= n + 0.5; hy += 1) {
        if (Math.abs(hx % 1) !== 0.5 || Math.abs(hy % 1) !== 0.5) continue;
        if (Math.abs(hx) + Math.abs(hy) > n + 0.5) continue;

        // Screen coords: rotate 45 CW in screen (y down)
        const screenX = cx + (hx * cosA + hy * sinA) * scale;
        const screenY = cy + (-hx * sinA + hy * cosA) * scale;

        // Diagonal for Schur process: use hx + hy (NW-SE diagonals in abstract coords)
        // These become horizontal lines in the rotated screen view
        // diag ranges from -(n-0.5) - 0.5 = -n to (n-0.5) + 0.5 = n approximately
        const diag = Math.round(hx + hy);

        latticePoints.push({
          hx, hy,
          x: screenX, y: screenY,
          diag
        });
      }
    }

    // Sort each diagonal and assign positions (by hx - hy, which is x-position on screen)
    const geomDiagonals = {};
    latticePoints.forEach(p => {
      if (!geomDiagonals[p.diag]) geomDiagonals[p.diag] = [];
      geomDiagonals[p.diag].push(p);
    });
    for (const d in geomDiagonals) {
      geomDiagonals[d].sort((a, b) => (a.hx - a.hy) - (b.hx - b.hy));
      geomDiagonals[d].forEach((p, idx) => { p.posInDiag = idx + 1; });
    }

    // ========== STEP 3: Mark points using extracted subsets ==========
    latticePoints.forEach(p => {
      const subset = extractedSubsets[p.diag] || [];
      p.inSubset = subset.includes(p.posInDiag);
    });

    // ========== STEP 4: Draw particles ==========
    group.selectAll("circle.particle")
      .data(latticePoints)
      .enter()
      .append("circle")
      .attr("class", "particle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 3)
      .attr("fill", d => d.inSubset ? "#ff00ff" : "#ffffff")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5);

    // ========== STEP 5: Display particle coordinates and subsets ==========
    const subsetsOutput = document.getElementById("subsets-output");
    if (subsetsOutput) {
      // Get all diagonal keys and sizes from geomDiagonals
      const allDiagKeys = Object.keys(geomDiagonals).map(Number).sort((a, b) => a - b);

      // For each diagonal, compute subset (positions that are inSubset)
      const diagData = [];
      allDiagKeys.forEach(d => {
        const pts = geomDiagonals[d];  // Already sorted by posInDiag
        const m = pts.length;  // Ground set size
        const subset = pts.filter(p => p.inSubset).map(p => p.posInDiag);
        diagData.push({ diag: d, m, subset, pts });
      });

      // Superscript helper
      const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
      function toSuperscript(num) {
        if (num < 10) return superscripts[num];
        return num.toString().split('').map(d => superscripts[parseInt(d)]).join('');
      }

      // Build output
      let output = "Subsets by diagonal:\n";
      diagData.forEach(({ diag, m, subset }, idx) => {
        const n_j = subset.length;      // number of particles
        const m_j = m - subset.length;  // number of holes
        const groundSetSize = m;        // n_j + m_j
        const subsetStr = subset.length === 0 ? "∅" : "{" + subset.join(",") + "}";

        // Build walk: R if position is in subset, U otherwise
        let walk = "";
        const subsetSet = new Set(subset);
        for (let pos = 1; pos <= groundSetSize; pos++) {
          walk += subsetSet.has(pos) ? "R" : "U";
        }

        // Compute Young diagram: λ_j = number of R steps before the j-th U step
        let partition = [];
        let rCount = 0;
        for (let pos = 1; pos <= groundSetSize; pos++) {
          if (subsetSet.has(pos)) {
            rCount++;
          } else {
            partition.push(rCount);
          }
        }
        // Reverse to get weakly decreasing order and remove trailing zeros
        partition = partition.reverse().filter(x => x > 0);
        const partStr = partition.length === 0 ? "∅" : "(" + partition.join(",") + ")";

        // Label: λ^0, μ^1, λ^1, μ^2, λ^2, ...
        let label;
        if (idx % 2 === 0) {
          label = "λ" + toSuperscript(idx / 2);
        } else {
          label = "μ" + toSuperscript((idx + 1) / 2);
        }

        // Store partition for interlacing checks
        diagData[idx].partition = partition;
        diagData[idx].label = label;

        output += `  ${label}: ${subsetStr}  (n=${n_j}, m=${m_j})  walk: ${walk}  ${label}=${partStr}\n`;
      });

      // Interlacing checks
      output += "\nInterlacing checks:\n";

      // Helper: get partition part (0 if out of bounds)
      function getPart(p, i) {
        return (i >= 0 && i < p.length) ? p[i] : 0;
      }

      // Check if μ/λ is a horizontal strip: μ_j ≥ λ_j ≥ μ_{j+1} for all j
      function isHorizontalStrip(mu, lambda) {
        const maxLen = Math.max(mu.length, lambda.length) + 1;
        for (let j = 0; j < maxLen; j++) {
          const mu_j = getPart(mu, j);
          const mu_jp1 = getPart(mu, j + 1);
          const lambda_j = getPart(lambda, j);
          if (!(mu_j >= lambda_j && lambda_j >= mu_jp1)) return false;
        }
        return true;
      }

      // Check if μ/λ is a vertical strip: μ_j - λ_j ∈ {0, 1} for all j
      function isVerticalStrip(mu, lambda) {
        const maxLen = Math.max(mu.length, lambda.length);
        for (let j = 0; j < maxLen; j++) {
          const mu_j = getPart(mu, j);
          const lambda_j = getPart(lambda, j);
          const diff = mu_j - lambda_j;
          if (diff < 0 || diff > 1) return false;
        }
        return true;
      }

      let allValid = true;

      // Check μ^i / λ^(i-1) is horizontal strip and μ^i / λ^i is vertical strip
      for (let idx = 1; idx < diagData.length; idx += 2) {
        // idx is odd → μ^k where k = (idx+1)/2
        const k = (idx + 1) / 2;
        const mu_k = diagData[idx].partition;
        const lambda_km1 = diagData[idx - 1].partition;  // λ^(k-1)
        const lambda_k = (idx + 1 < diagData.length) ? diagData[idx + 1].partition : [];  // λ^k

        // Check μ^k / λ^(k-1) is horizontal strip
        const hsCheck = isHorizontalStrip(mu_k, lambda_km1);
        const hsStatus = hsCheck ? "✓" : "✗";
        if (!hsCheck) allValid = false;
        output += `  μ${toSuperscript(k)}/λ${toSuperscript(k-1)} horizontal strip: ${hsStatus}\n`;

        // Check μ^k / λ^k is vertical strip (if λ^k exists)
        if (idx + 1 < diagData.length) {
          const vsCheck = isVerticalStrip(mu_k, lambda_k);
          const vsStatus = vsCheck ? "✓" : "✗";
          if (!vsCheck) allValid = false;
          output += `  μ${toSuperscript(k)}/λ${toSuperscript(k)} vertical strip: ${vsStatus}\n`;
        }
      }

      if (allValid) {
        output += "All interlacing conditions satisfied ✓\n";
      } else {
        output += "WARNING: Some interlacing conditions failed ✗\n";
      }

      subsetsOutput.textContent = output;

      // Store extracted partitions globally and populate dropdown
      // This ensures dropdown matches the "Subsets by diagonal" display
      currentPartitions = diagData.map(d => d.partition);
      currentN = n;
      populatePartitionDropdown(currentPartitions);
    }
  }

  let currentSubsets = [];
  let currentPartitions = [];  // Store partitions for editing
  let currentN = 4;

  // Partition editing UI elements
  const partitionSelect = document.getElementById("partition-select");
  const partitionInput = document.getElementById("partition-input");
  const applyPartitionBtn = document.getElementById("apply-partition-btn");
  const partitionStatus = document.getElementById("partition-status");

  // Superscript helper (global for reuse)
  const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  function toSuperscript(num) {
    if (num < 10) return superscripts[num];
    return num.toString().split('').map(d => superscripts[parseInt(d)]).join('');
  }

  // Get partition label (λ^k or μ^k) for index
  function getPartitionLabel(idx) {
    if (idx % 2 === 0) {
      return "λ" + toSuperscript(idx / 2);
    } else {
      return "μ" + toSuperscript((idx + 1) / 2);
    }
  }

  // Populate partition dropdown after simulation
  function populatePartitionDropdown(partitions) {
    partitionSelect.innerHTML = '';
    for (let i = 0; i < partitions.length; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = getPartitionLabel(i) + " = " + partitionToString(partitions[i]);
      partitionSelect.appendChild(opt);
    }
    partitionInput.value = partitions.length > 0 ? partitions[0].join(",") : "";
  }

  // Handle partition selection change
  partitionSelect.addEventListener("change", function() {
    const idx = parseInt(this.value, 10);
    if (!isNaN(idx) && idx >= 0 && idx < currentPartitions.length) {
      partitionInput.value = currentPartitions[idx].join(",");
      partitionStatus.textContent = "";
    }
  });

  // Parse partition from string
  function parsePartition(str) {
    if (!str || str.trim() === "" || str.trim() === "∅") return [];
    const parts = str.split(",").map(s => parseInt(s.trim(), 10)).filter(x => !isNaN(x) && x > 0);
    // Sort in decreasing order (partition format)
    parts.sort((a, b) => b - a);
    return parts;
  }

  // Validate interlacing for a partition at index idx
  function validatePartitionAtIndex(partitions, idx, newPartition) {
    const errors = [];

    // Get neighbors
    const prevPartition = idx > 0 ? partitions[idx - 1] : null;
    const nextPartition = idx < partitions.length - 1 ? partitions[idx + 1] : null;

    if (idx % 2 === 0) {
      // This is λ^k where k = idx/2
      const k = idx / 2;
      // Check with previous μ^k (if exists, idx > 0)
      if (prevPartition !== null) {
        const mu_k = prevPartition;
        // μ^k / λ^k should be VERTICAL strip
        if (!isVerticalStrip(mu_k, newPartition)) {
          errors.push(`μ${toSuperscript(k)}/λ${toSuperscript(k)} is not a vertical strip`);
        }
      }
      // Check with next μ^(k+1) (if exists)
      if (nextPartition !== null) {
        const mu_kp1 = nextPartition;
        // μ^(k+1) / λ^k should be HORIZONTAL strip
        if (!isHorizontalStrip(mu_kp1, newPartition)) {
          errors.push(`μ${toSuperscript(k+1)}/λ${toSuperscript(k)} is not a horizontal strip`);
        }
      }
    } else {
      // This is μ^k where k = (idx+1)/2
      const k = (idx + 1) / 2;
      // Check with previous λ^(k-1)
      if (prevPartition !== null) {
        const lambda_km1 = prevPartition;
        // μ^k / λ^(k-1) should be HORIZONTAL strip
        if (!isHorizontalStrip(newPartition, lambda_km1)) {
          errors.push(`μ${toSuperscript(k)}/λ${toSuperscript(k-1)} is not a horizontal strip`);
        }
      }
      // Check with next λ^k
      if (nextPartition !== null) {
        const lambda_k = nextPartition;
        // μ^k / λ^k should be VERTICAL strip
        if (!isVerticalStrip(newPartition, lambda_k)) {
          errors.push(`μ${toSuperscript(k)}/λ${toSuperscript(k)} is not a vertical strip`);
        }
      }
    }

    return errors;
  }

  // Apply edited partition - updates particles only, dominoes stay as reference
  applyPartitionBtn.addEventListener("click", function() {
    const idx = parseInt(partitionSelect.value, 10);
    if (isNaN(idx) || idx < 0 || idx >= currentPartitions.length) {
      partitionStatus.textContent = "Please select a valid partition level";
      partitionStatus.style.color = "red";
      return;
    }

    const newPartition = parsePartition(partitionInput.value);

    // Validate interlacing
    const errors = validatePartitionAtIndex(currentPartitions, idx, newPartition);

    if (errors.length > 0) {
      partitionStatus.textContent = "Invalid: " + errors.join("; ");
      partitionStatus.style.color = "red";
      return;
    }

    // Update partition
    currentPartitions[idx] = newPartition;

    // Update dropdown to show new value
    populatePartitionDropdown(currentPartitions);
    partitionSelect.value = idx;

    // Update just the particles, keep original dominoes as reference
    updateParticlesFromPartitions(currentPartitions, currentN);

    // Update subsets display
    displaySubsetsFromPartitions(currentPartitions, currentN);

    partitionStatus.textContent = "Partition updated ✓ (particles show new state, dominoes show original)";
    partitionStatus.style.color = "green";
  });

  // Store original particle counts per diagonal (set by renderDominoes)
  let originalParticleCounts = {};

  // Proper inverse bijection: partition → subset
  // Given partition λ, ground set size m, and number of particles n_p
  // Returns the subset S ⊆ {1, ..., m}
  function partitionToSubset(partition, numParticles, groundSetSize) {
    const m = groundSetSize;
    const n_p = numParticles;
    const h = m - n_p;  // number of holes (U's in walk)

    if (h <= 0) {
      // All positions are particles
      const subset = [];
      for (let i = 1; i <= m; i++) subset.push(i);
      return subset;
    }

    // Reverse partition and pad with zeros at the beginning to length h
    const lambda = partition || [];
    const lambdaReversed = [...lambda].reverse();
    while (lambdaReversed.length < h) {
      lambdaReversed.unshift(0);  // pad with zeros at beginning
    }

    // Compute positions of U's: u_j = lambdaReversed[j-1] + j
    const holePositions = new Set();
    for (let j = 1; j <= h; j++) {
      const u_j = lambdaReversed[j - 1] + j;
      if (u_j >= 1 && u_j <= m) {
        holePositions.add(u_j);
      }
    }

    // Subset = all positions except holes
    const subset = [];
    for (let pos = 1; pos <= m; pos++) {
      if (!holePositions.has(pos)) {
        subset.push(pos);
      }
    }

    return subset;
  }

  // Update particle colors based on new partitions (without changing dominoes)
  function updateParticlesFromPartitions(partitions, n) {
    const group = svg.select("g.dominoes");
    if (group.empty()) return;

    const particles = group.selectAll("circle.particle");
    if (particles.empty()) return;

    // Get diagonal info from existing particles
    const particleData = [];
    particles.each(function(d) {
      particleData.push(d);
    });

    // Group by diagonal
    const diagGroups = {};
    particleData.forEach(p => {
      if (!diagGroups[p.diag]) diagGroups[p.diag] = [];
      diagGroups[p.diag].push(p);
    });

    // Sort diagonal keys
    const diagKeys = Object.keys(diagGroups).map(Number).sort((a, b) => a - b);

    // Convert partitions to subsets using proper inverse bijection
    const subsetsByDiag = {};
    for (let idx = 0; idx < partitions.length && idx < diagKeys.length; idx++) {
      const diagKey = diagKeys[idx];
      const diagSize = diagGroups[diagKey].length;
      const partition = partitions[idx] || [];

      // Use original particle count for this diagonal
      const numParticles = originalParticleCounts[diagKey] !== undefined
        ? originalParticleCounts[diagKey]
        : diagSize - partition.length;  // fallback

      const subset = partitionToSubset(partition, numParticles, diagSize);
      subsetsByDiag[diagKey] = new Set(subset);
    }

    // Update particle colors
    particles.attr("fill", d => {
      const subset = subsetsByDiag[d.diag];
      const inSubset = subset ? subset.has(d.posInDiag) : false;
      return inSubset ? "#ff00ff" : "#ffffff";
    });
  }

  // Display subsets computed from partitions (for after editing)
  function displaySubsetsFromPartitions(partitions, n) {
    const subsetsOutput = document.getElementById("subsets-output");
    if (!subsetsOutput) return;

    const lines = [];
    for (let i = 0; i < partitions.length; i++) {
      const partition = partitions[i];
      const partStr = partitionToString(partition);
      const label = getPartitionLabel(i);

      // Compute subset from partition for display
      // In walk-based encoding: partition.length = number of holes
      // numParticles = diagSize - numHoles
      let diagSize;
      if (i <= n) {
        diagSize = i + 1;
      } else {
        diagSize = 2 * n + 1 - i;
      }
      const numHoles = partition.length;
      const numParticles = diagSize - numHoles;
      const subset = partitionToSubsetWithSize(partition, numParticles, diagSize);
      const subsetStr = subset.length === 0 ? "∅" : "{" + subset.join(",") + "}";

      lines.push(`${label} = ${partStr}  (subset: ${subsetStr})`);
    }

    // Check interlacing conditions
    lines.push("");
    lines.push("Interlacing checks:");
    let allValid = true;

    for (let i = 1; i < partitions.length; i++) {
      if (i % 2 === 1) {
        const k = (i + 1) / 2;
        const mu_k = partitions[i];
        const lambda_km1 = partitions[i - 1];
        const isVS = isVerticalStrip(mu_k, lambda_km1);
        const status = isVS ? "✓" : "✗";
        if (!isVS) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k-1)} vertical strip: ${status}`);
      } else {
        const k = i / 2;
        const lambda_k = partitions[i];
        const mu_k = partitions[i - 1];
        const isHS = isHorizontalStrip(mu_k, lambda_k);
        const status = isHS ? "✓" : "✗";
        if (!isHS) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k)} horizontal strip: ${status}`);
      }
    }

    if (allValid) {
      lines.push("All interlacing conditions satisfied ✓");
    } else {
      lines.push("WARNING: Some interlacing conditions failed ✗");
    }

    subsetsOutput.textContent = lines.join("\n");
  }

  // Convert subset S ⊂ {1,...,m} to partition via walk/ballot path
  // Walk: R if position is in S, U otherwise
  // λ_j = number of R steps before the j-th U step
  // This matches the RSK/Schur process convention used in renderDominoes()
  function subsetToPartition(subset, m) {
    if (!subset || m <= 0) return [];
    const subsetSet = new Set(subset);
    const partition = [];
    let rCount = 0;

    for (let pos = 1; pos <= m; pos++) {
      if (subsetSet.has(pos)) {
        rCount++;
      } else {
        partition.push(rCount);
      }
    }

    // Reverse to get weakly decreasing order and remove trailing zeros
    return partition.reverse().filter(x => x > 0);
  }

  // Convert partition to subset via walk/ballot path (INVERSE of subsetToPartition)
  // This inverts the walk-based encoding:
  // Walk: R if position is in S, U otherwise
  // λ_j = number of R steps before the j-th U step (after reversal)
  //
  // Given partition λ = (λ_1 ≥ λ_2 ≥ ... ≥ λ_k) and ground set size m,
  // reconstruct the walk and extract subset S
  function partitionToSubsetWithSize(partition, numParticles, m) {
    if (m <= 0) return [];
    if (numParticles <= 0) return [];  // No particles means empty subset

    // Number of holes = m - numParticles
    const numHoles = m - numParticles;
    if (numHoles < 0) return [];

    // Reverse partition and pad with zeros to length numHoles
    const lambda = partition ? [...partition] : [];
    const lambdaReversed = [...lambda].reverse();
    while (lambdaReversed.length < numHoles) {
      lambdaReversed.unshift(0);  // Pad at beginning (these become first holes)
    }

    // Reconstruct walk: place R's and U's
    // lambdaReversed[j] = number of R's before (j+1)-th U
    const walk = [];
    let rPlaced = 0;

    for (let j = 0; j < numHoles; j++) {
      const targetR = lambdaReversed[j];
      // Place R's until we have targetR before this U
      while (rPlaced < targetR && walk.length < m) {
        walk.push('R');
        rPlaced++;
      }
      // Place the U
      if (walk.length < m) {
        walk.push('U');
      }
    }

    // Place remaining R's
    while (walk.length < m) {
      walk.push('R');
    }

    // Extract subset: positions with R
    const subset = [];
    for (let pos = 0; pos < walk.length; pos++) {
      if (walk[pos] === 'R') {
        subset.push(pos + 1);  // 1-indexed
      }
    }

    return subset;
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

    // Convert all subsets to partitions
    const partitions = [];
    for (let i = 0; i < subsets.length; i++) {
      // Determine slice size (number of elements on this diagonal)
      // For Aztec diamond order n, diagonal i has size:
      // i+1 for i <= n, and 2n+1-i for i > n
      let m;
      if (i <= n) {
        m = i + 1;
      } else {
        m = 2 * n + 1 - i;
      }
      partitions.push(subsetToPartition(subsets[i], m));
    }

    // Note: currentPartitions and dropdown are populated by renderDominoes()
    // which extracts partitions directly from domino colors (the ground truth)

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
    // Pattern: λ^(k-1) ⊂ μ^k ⊃ λ^k
    // λ^(k-1) → μ^k: VERTICAL strip (μ contains λ as vertical strip)
    // μ^k → λ^k: HORIZONTAL strip (μ contains λ as horizontal strip)
    lines.push("");
    lines.push("Interlacing checks:");
    let allValid = true;

    for (let i = 1; i < partitions.length; i++) {
      if (i % 2 === 1) {
        // Odd index: λ^(k-1) → μ^k transition = VERTICAL strip
        const k = (i + 1) / 2;
        const mu_k = partitions[i];
        const lambda_km1 = partitions[i - 1];
        const isVS = isVerticalStrip(mu_k, lambda_km1);
        const status = isVS ? "✓" : "✗";
        if (!isVS) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k-1)} vertical strip: ${status}`);
      } else {
        // Even index: μ^k → λ^k transition = HORIZONTAL strip
        const k = i / 2;
        const lambda_k = partitions[i];
        const mu_k = partitions[i - 1];
        const isHS = isHorizontalStrip(mu_k, lambda_k);
        const status = isHS ? "✓" : "✗";
        if (!isHS) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k)} horizontal strip: ${status}`);
      }
    }

    if (allValid) {
      lines.push("All interlacing conditions satisfied ✓");
    } else {
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
        // Note: subsets are now extracted from dominoes in renderDominoes()
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
    if (newN > 600) {
      progressElem.innerText = "Please enter a number no greater than 600.";
      return;
    }
    updateVisualization(newN);
  }

  document.getElementById("update-btn").addEventListener("click", processInput);
  document.getElementById("cancel-btn").addEventListener("click", stopSimulation);

  // Initial simulation
  updateVisualization(parseInt(inputField.value, 10));
};
</script>
