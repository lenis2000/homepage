---
title: Schur process weights for the Aztec Diamond
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
<script src="/js/2025-12-03-schur-domino.js"></script>

Schur process style parameters $x_1,\ldots,x_n$ and $y_1,\ldots,y_n$ determine the probability distribution on domino tilings of the Aztec diamond; the sampling is done via shuffling algorithm by Betea-Boutillier-Bouttier-Chapuy-Corteel-Vuletic.

---

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

<details style="margin-top: 20px; border: 1px solid #ccc; border-radius: 5px; padding: 10px;">
  <summary style="cursor: pointer; font-weight: bold; font-size: 1.1em; color: #0066cc;">▶ Partitions forming the Schur process (click to expand)</summary>
  <div id="subsets-output" style="margin-top: 10px;">No subset data available yet. Click "Sample" to generate.</div>
</details>

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

    // ========== STEP 4: Display subsets and partitions ==========
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
    }
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

  // Convert partition to subset via Maya diagram (INVERSE of subsetToPartition)
  // Given partition λ and subset size m = ceiling(k/2), compute subset
  // s_i = λ'_i + i where λ' is partition reversed and zero-padded to length m
  //
  // For Aztec diamond: λ diagonals have range {1,...,n}, μ diagonals have range {1,...,n+1}
  // maxElem parameter caps the subset elements to valid range
  function partitionToSubsetWithSize(partition, m, maxElem = null) {
    if (m <= 0) return [];
    // Reverse partition: (4,3,1) → [1,3,4]
    const reversed = partition ? [...partition].reverse() : [];
    // Pad with zeros at the beginning to length m: [0,1,3,4]
    while (reversed.length < m) {
      reversed.unshift(0);
    }
    // Compute s_i = reversed[i-1] + i for i = 1..m
    const subset = [];
    for (let i = 0; i < m; i++) {
      let elem = reversed[i] + (i + 1);
      // Cap to valid range if specified
      if (maxElem !== null && elem > maxElem) {
        elem = maxElem;
      }
      subset.push(elem);
    }
    // Remove duplicates and sort
    return [...new Set(subset)].sort((a, b) => a - b);
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
