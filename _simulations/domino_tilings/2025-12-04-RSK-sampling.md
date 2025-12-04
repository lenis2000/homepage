---
title: q-RSK Sampling of Domino Tilings of the Aztec Diamond
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-04-RSK-sampling.md'
    txt: 'This simulation is interactive, written in JavaScript'
---

<style>
  #aztec-svg {
    width: 100%;
    height: 50vh;
    vertical-align: top;
    border: 1px solid #ccc;
    background-color: #fafafa;
  }
  @media (max-width: 576px) {
    #aztec-svg {
      height: 40vh;
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
<script src="{{site.url}}/js/2025-12-04-RSK-sampling.js"></script>

<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order n: </label>
  <input id="n-input" type="number" value="4" min="1" max="100" style="width: 60px;">
  <button id="sample-btn">Sample</button>
  <span id="progress-indicator" style="margin-left: 10px; color: #666;"></span>
  <span style="margin-left: 20px;">
    <input type="checkbox" id="show-particles-cb">
    <label for="show-particles-cb">Show particles</label>
  </span>
  <span style="margin-left: 20px;">
    <input type="checkbox" id="rotate-canvas-cb">
    <label for="rotate-canvas-cb">Rotate 45°</label>
  </span>
  <span style="margin-left: 20px;">
    <label for="border-slider">Border: </label>
    <input type="range" id="border-slider" min="0" max="3" step="0.5" value="1" style="width: 80px; vertical-align: middle;">
    <span id="border-value">1</span>
  </span>
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
  <label for="q-input">q-Whittaker parameter (0 ≤ q < 1): </label>
  <input id="q-input" type="number" value="0.5" min="0" max="0.99999999999" step="0.0001" style="width: 80px;">
</div>

<div style="margin-bottom: 10px;">
  <label for="x-params">x parameters (CSV, supports value^count e.g. 1^4):</label>
  <input id="x-params" type="text" class="param-input" value="1^4">
</div>

<div style="margin-bottom: 10px;">
  <label for="y-params">y parameters (CSV, supports value^count e.g. 1^4):</label>
  <input id="y-params" type="text" class="param-input" value="1^4">
</div>

<div class="row">
  <div class="col-12">
    <svg id="aztec-svg"></svg>
  </div>
</div>

<details style="margin-top: 20px; border: 1px solid #ccc; border-radius: 5px; padding: 10px;">
  <summary style="cursor: pointer; font-weight: bold; font-size: 1.1em; color: #0066cc;">Partitions forming the Schur process (click to expand)</summary>
  <div id="subsets-output" style="margin-top: 10px;">Loading...</div>
</details>

<p style="margin-top: 10px; font-size: 0.9em;">See also:
<ul style="margin-top: 5px; margin-bottom: 0;">
  <li><a href="https://arxiv.org/abs/1504.00666">arXiv:1504.00666</a> — K. Matveev, L. Petrov, <i>q-randomized Robinson–Schensted–Knuth correspondences and random polymers</i>, Ann. Inst. Henri Poincaré D 4 (2017), no. 1, 1–123.</li>
  <li><a href="https://arxiv.org/abs/1407.3764">arXiv:1407.3764</a> — D. Betea, C. Boutillier, J. Bouttier, G. Chapuy, S. Corteel, and M. Vuletic, <i>Perfect sampling algorithms for Schur processes</i>, Markov Process. Related Fields 24 (2018), no. 3, 381–418.</li>
</ul>
</p>

<script>
Module.onRuntimeInitialized = async function() {
  // Wrap WASM functions
  const sampleAztecRSK = Module.cwrap('sampleAztecRSK', 'number', ['number', 'string', 'string', 'number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  let currentN = 4;
  const svg = d3.select("#aztec-svg");
  let currentPartitions = [];
  let simulationActive = false;
  let progressInterval = null;
  const progressElem = document.getElementById("progress-indicator");

  // ========== RSK Sampling Functions (now in C++/WASM) ==========
  // The sampling logic has been moved to 2025-12-04-RSK-sampling.cpp for performance

  // Async wrapper for WASM sampling
  async function aztecDiamondSample(n, x, y, q) {
    if (n === 0) return [[]];

    const xJson = JSON.stringify(x);
    const yJson = JSON.stringify(y);

    simulationActive = true;
    startProgressPolling();

    try {
      const ptr = await sampleAztecRSK(n, xJson, yJson, q);
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      simulationActive = false;
      progressElem.innerText = "";

      return JSON.parse(jsonStr);
    } catch (e) {
      simulationActive = false;
      progressElem.innerText = "Error!";
      console.error("Sampling error:", e);
      return [[]];
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
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 50);
  }

  // ========== Parameter Parsing Functions ==========

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
    const xParamsField = document.getElementById("x-params");
    const yParamsField = document.getElementById("y-params");
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

  // ========== Particle Count Functions ==========

  // Ground set sizes for each diagonal (index 0 to 2n)
  function getGroundSetSize(diagIdx) {
    return Math.min(diagIdx + 1, 2 * currentN + 1 - diagIdx);
  }

  // Number of particles on diagonal idx for Aztec diamond of size n
  // λ^k (even idx): n - k particles
  // μ^k (odd idx): n - k + 1 particles
  function getParticleCount(idx) {
    const k = Math.floor((idx + 1) / 2);
    if (idx % 2 === 0) {
      return currentN - k;
    } else {
      return currentN - k + 1;
    }
  }

  // Zoom setup
  let initialTransform = {};
  const zoom = d3.zoom()
    .scaleExtent([0.1, 50])
    .on("zoom", (event) => {
      if (!initialTransform.scale) return;
      const group = svg.select("g.particles");
      if (!group.empty()) {
        const t = event.transform;
        const rot = initialTransform.rotation || 0;
        group.attr("transform",
          `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k}) rotate(${rot})`);
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

  // Superscript helper
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

  // Convert partition to subset
  // Given partition λ and ground set size m, number of particles n_p
  function partitionToSubset(partition, numParticles, groundSetSize) {
    const m = groundSetSize;
    const n_p = numParticles;
    const h = m - n_p;  // number of holes (U's in walk)

    if (h <= 0) {
      const subset = [];
      for (let i = 1; i <= m; i++) subset.push(i);
      return subset;
    }

    const lambda = partition || [];
    const lambdaReversed = [...lambda].reverse();
    while (lambdaReversed.length < h) {
      lambdaReversed.unshift(0);
    }

    const holePositions = new Set();
    for (let j = 1; j <= h; j++) {
      const u_j = lambdaReversed[j - 1] + j;
      if (u_j >= 1 && u_j <= m) {
        holePositions.add(u_j);
      }
    }

    const subset = [];
    for (let pos = 1; pos <= m; pos++) {
      if (!holePositions.has(pos)) {
        subset.push(pos);
      }
    }

    return subset;
  }

  // Build walk string from subset
  function buildWalk(subset, groundSetSize) {
    const subsetSet = new Set(subset);
    let walk = "";
    for (let pos = 1; pos <= groundSetSize; pos++) {
      walk += subsetSet.has(pos) ? "R" : "U";
    }
    return walk;
  }

  // Generate lattice points for visualization
  function generateLatticePoints() {
    const scale = 20;
    const cx = 0;
    const cy = 0;

    const latticePoints = [];
    for (let hx = -currentN - 0.5; hx <= currentN + 0.5; hx += 1) {
      for (let hy = -currentN - 0.5; hy <= currentN + 0.5; hy += 1) {
        if (Math.abs(hx % 1) !== 0.5 || Math.abs(hy % 1) !== 0.5) continue;
        if (Math.abs(hx) + Math.abs(hy) > currentN + 0.5) continue;

        const screenX = cx + hx * scale;
        const screenY = cy - hy * scale;  // Flip y-axis so positive y is up
        const diag = Math.round(hx + hy);

        latticePoints.push({
          hx, hy,
          x: screenX, y: screenY,
          diag
        });
      }
    }

    // Group by diagonal and assign positions
    const geomDiagonals = {};
    latticePoints.forEach(p => {
      if (!geomDiagonals[p.diag]) geomDiagonals[p.diag] = [];
      geomDiagonals[p.diag].push(p);
    });
    for (const d in geomDiagonals) {
      geomDiagonals[d].sort((a, b) => (a.hx - a.hy) - (b.hx - b.hy));
      geomDiagonals[d].forEach((p, idx) => { p.posInDiag = idx + 1; });
    }

    return { latticePoints, geomDiagonals };
  }

  // Render particles based on current partitions
  function renderParticles() {
    const { latticePoints, geomDiagonals } = generateLatticePoints();

    // Get diagonal keys sorted
    const diagKeys = Object.keys(geomDiagonals).map(Number).sort((a, b) => a - b);

    // Convert partitions to subsets
    const subsetsByDiag = {};
    for (let idx = 0; idx < currentPartitions.length && idx < diagKeys.length; idx++) {
      const diagKey = diagKeys[idx];
      const diagSize = geomDiagonals[diagKey].length;
      const partition = currentPartitions[idx] || [];
      const numParticles = getParticleCount(idx);
      const subset = partitionToSubset(partition, numParticles, diagSize);
      subsetsByDiag[diagKey] = new Set(subset);
    }

    // Mark points
    latticePoints.forEach(p => {
      const subset = subsetsByDiag[p.diag];
      p.inSubset = subset ? subset.has(p.posInDiag) : false;
    });

    // Compute bounds
    const minX = d3.min(latticePoints, d => d.x);
    const minY = d3.min(latticePoints, d => d.y);
    const maxX = d3.max(latticePoints, d => d.x);
    const maxY = d3.max(latticePoints, d => d.y);
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;

    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const scaleView = Math.min(svgWidth / widthPts, svgHeight / heightPts) * 0.9;
    const translateX = (svgWidth - widthPts * scaleView) / 2 - (minX - 20) * scaleView;
    const translateY = (svgHeight - heightPts * scaleView) / 2 - (minY - 20) * scaleView;

    const rotateCanvas = document.getElementById("rotate-canvas-cb").checked;
    const rotation = rotateCanvas ? -45 : 0;
    initialTransform = { translateX, translateY, scale: scaleView, rotation };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g")
      .attr("class", "particles")
      .attr("transform", `translate(${translateX},${translateY}) scale(${scaleView}) rotate(${rotation})`);

    // Create lookup by (hx, hy) coordinates
    const pointLookup = {};
    latticePoints.forEach(p => {
      pointLookup[`${p.hx},${p.hy}`] = p;
    });

    // Find adjacent point (horizontal or vertical neighbor)
    function getNeighbors(p) {
      const neighbors = [];
      // Check all 4 directions: right, left, up, down
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of directions) {
        const key = `${p.hx + dx},${p.hy + dy}`;
        if (pointLookup[key]) {
          neighbors.push(pointLookup[key]);
        }
      }
      return neighbors;
    }

    // Match particles (pink) - start from bottom-left, go up-right
    const particles = latticePoints.filter(p => p.inSubset);
    // Sort: bottom-left first means low hx+hy, then low hx-hy (bottom before top on same diagonal)
    particles.sort((a, b) => {
      const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
      if (sumA !== sumB) return sumA - sumB;
      return (a.hx - a.hy) - (b.hx - b.hy);
    });

    const matchedParticles = new Set();
    const particleDominoes = [];

    for (const p of particles) {
      if (matchedParticles.has(`${p.hx},${p.hy}`)) continue;
      const neighbors = getNeighbors(p).filter(n => n.inSubset && !matchedParticles.has(`${n.hx},${n.hy}`));
      if (neighbors.length > 0) {
        // Pick neighbor that's most "up-right" (highest hx+hy, then highest hx-hy)
        neighbors.sort((a, b) => {
          const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
          if (sumA !== sumB) return sumA - sumB;
          return (a.hx - a.hy) - (b.hx - b.hy);
        });
        const neighbor = neighbors[0];
        matchedParticles.add(`${p.hx},${p.hy}`);
        matchedParticles.add(`${neighbor.hx},${neighbor.hy}`);
        particleDominoes.push({ p1: p, p2: neighbor });
      }
    }

    // Match holes (white) - start from top-right, go down-left
    const holes = latticePoints.filter(p => !p.inSubset);
    // Sort: top-right first means high hx+hy, then high hx-hy
    holes.sort((a, b) => {
      const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
      if (sumA !== sumB) return sumB - sumA;
      return (b.hx - b.hy) - (a.hx - a.hy);
    });

    const matchedHoles = new Set();
    const holeDominoes = [];

    for (const p of holes) {
      if (matchedHoles.has(`${p.hx},${p.hy}`)) continue;
      const neighbors = getNeighbors(p).filter(n => !n.inSubset && !matchedHoles.has(`${n.hx},${n.hy}`));
      if (neighbors.length > 0) {
        // Pick neighbor that's most "down-left" (lowest hx+hy, then lowest hx-hy)
        neighbors.sort((a, b) => {
          const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
          if (sumA !== sumB) return sumB - sumA;
          return (b.hx - b.hy) - (a.hx - a.hy);
        });
        const neighbor = neighbors[0];
        matchedHoles.add(`${p.hx},${p.hy}`);
        matchedHoles.add(`${neighbor.hx},${neighbor.hy}`);
        holeDominoes.push({ p1: p, p2: neighbor });
      }
    }

    // Draw dominoes as 2x1 rectangles (in coordinate units where particle spacing = 1)
    const scale = 20;  // matches the scale used in generateLatticePoints
    const allDominoes = [...particleDominoes.map(d => ({...d, type: 'particle'})),
                         ...holeDominoes.map(d => ({...d, type: 'hole'}))];

    const showParticles = document.getElementById("show-particles-cb").checked;

    // Domino colors:
    // Particle (filled) + Horizontal → Green
    // Particle (filled) + Vertical → Red
    // Hole (empty) + Horizontal → Blue
    // Hole (empty) + Vertical → Yellow
    function getDominoColor(type, isHorizontal) {
      if (showParticles) return "#ffffff";
      if (type === 'particle') {
        return isHorizontal ? "#228B22" : "#DC143C";  // Green : Red
      } else {
        return isHorizontal ? "#0057B7" : "#FFCD00";  // Blue : Yellow
      }
    }

    const borderWidth = parseFloat(document.getElementById("border-slider").value);
    for (const domino of allDominoes) {
      const { p1, p2, type } = domino;
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const isHorizontal = Math.abs(p1.hx - p2.hx) > 0.5;

      // 2x1 domino in coordinate units
      const width = isHorizontal ? 2 * scale : 1 * scale;
      const height = isHorizontal ? 1 * scale : 2 * scale;

      group.append("rect")
        .attr("x", cx - width / 2)
        .attr("y", cy - height / 2)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", getDominoColor(type, isHorizontal))
        .attr("stroke", borderWidth > 0 ? "#000" : "none")
        .attr("stroke-width", borderWidth);
    }

    // Draw particles on top (only if show particles is checked)
    if (showParticles) {
      group.selectAll("circle.particle")
        .data(latticePoints)
        .enter()
        .append("circle")
        .attr("class", "particle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 5)
        .attr("fill", d => d.inSubset ? "#000000" : "#ffffff")
        .attr("stroke", "#000")
        .attr("stroke-width", 1);
    }
  }

  // Display subsets and interlacing info
  function displaySubsets() {
    const subsetsOutput = document.getElementById("subsets-output");
    if (!subsetsOutput) return;

    const lines = ["Subsets by diagonal:"];

    for (let idx = 0; idx < currentPartitions.length; idx++) {
      const partition = currentPartitions[idx];
      const groundSetSize = getGroundSetSize(idx);
      const numParticles = getParticleCount(idx);
      const numHoles = groundSetSize - numParticles;
      const subset = partitionToSubset(partition, numParticles, groundSetSize);
      const walk = buildWalk(subset, groundSetSize);
      const label = getPartitionLabel(idx);
      const subsetStr = subset.length === 0 ? "∅" : "{" + subset.join(",") + "}";
      const partStr = partitionToString(partition);

      lines.push(`  ${label}: ${subsetStr}  (n=${numParticles}, m=${numHoles})  walk: ${walk}  ${label}=${partStr}`);
    }

    // Interlacing checks
    lines.push("");
    lines.push("Interlacing checks:");
    let allValid = true;

    for (let idx = 1; idx < currentPartitions.length; idx++) {
      if (idx % 2 === 1) {
        // Odd index: μ^k where k = (idx+1)/2
        const k = (idx + 1) / 2;
        const mu_k = currentPartitions[idx];
        const lambda_km1 = currentPartitions[idx - 1];
        const hsCheck = isHorizontalStrip(mu_k, lambda_km1);
        const hsStatus = hsCheck ? "✓" : "✗";
        if (!hsCheck) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k-1)} horizontal strip: ${hsStatus}`);

        // Check μ^k / λ^k is vertical strip (if λ^k exists)
        if (idx + 1 < currentPartitions.length) {
          const lambda_k = currentPartitions[idx + 1];
          const vsCheck = isVerticalStrip(mu_k, lambda_k);
          const vsStatus = vsCheck ? "✓" : "✗";
          if (!vsCheck) allValid = false;
          lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k)} vertical strip: ${vsStatus}`);
        }
      }
    }

    if (allValid) {
      lines.push("All interlacing conditions satisfied ✓");
    } else {
      lines.push("WARNING: Some interlacing conditions failed ✗");
    }

    subsetsOutput.textContent = lines.join("\n");
  }

  // Sample button handler
  document.getElementById("sample-btn").addEventListener("click", async function() {
    const nInput = document.getElementById("n-input");
    const newN = parseInt(nInput.value, 10);
    if (isNaN(newN) || newN < 1) {
      alert("Please enter a valid positive integer for n");
      return;
    }
    currentN = newN;
    updateParamsForN(currentN);
    const x = parseCSV(document.getElementById("x-params").value);
    const y = parseCSV(document.getElementById("y-params").value);
    const q = parseFloat(document.getElementById("q-input").value);
    currentPartitions = await aztecDiamondSample(currentN, x, y, q);
    renderParticles();
    displaySubsets();
  });

  // Uniform button handler - set all parameters to 1
  document.getElementById("uniform-btn").addEventListener("click", function() {
    const ones = Array(currentN).fill(1);
    document.getElementById("x-params").value = arrayToCSV(ones);
    document.getElementById("y-params").value = arrayToCSV(ones);
  });

  // Show particles checkbox handler - re-render when toggled
  document.getElementById("show-particles-cb").addEventListener("change", function() {
    renderParticles();
  });

  // q-input change handler - resample when q changes
  document.getElementById("q-input").addEventListener("change", async function() {
    const x = parseCSV(document.getElementById("x-params").value);
    const y = parseCSV(document.getElementById("y-params").value);
    const q = parseFloat(document.getElementById("q-input").value);
    currentPartitions = await aztecDiamondSample(currentN, x, y, q);
    renderParticles();
    displaySubsets();
  });

  // Rotate canvas checkbox handler - re-render when toggled
  document.getElementById("rotate-canvas-cb").addEventListener("change", function() {
    renderParticles();
  });

  // Border slider handler - re-render and update display value
  document.getElementById("border-slider").addEventListener("input", function() {
    document.getElementById("border-value").innerText = this.value;
    renderParticles();
  });

  // r-weighting button handler - set x_i = y_i = r^i
  document.getElementById("r-btn").addEventListener("click", function() {
    const r = parseFloat(document.getElementById("r-input").value);
    if (isNaN(r) || r <= 0) {
      alert("Please enter a valid positive number for r");
      return;
    }
    const xArr = [];
    const yArr = [];
    for (let i = 0; i < currentN; i++) {
      const val = Math.pow(r, i + 1);  // r^1, r^2, ..., r^n
      xArr.push(val);
      yArr.push(val);
    }
    document.getElementById("x-params").value = arrayToCSV(xArr);
    document.getElementById("y-params").value = arrayToCSV(yArr);
  });

  // Sample on page load with default parameters
  updateParamsForN(currentN);
  const initX = parseCSV(document.getElementById("x-params").value);
  const initY = parseCSV(document.getElementById("y-params").value);
  const initQ = parseFloat(document.getElementById("q-input").value);
  currentPartitions = await aztecDiamondSample(currentN, initX, initY, initQ);
  renderParticles();
  displaySubsets();
};
</script>
