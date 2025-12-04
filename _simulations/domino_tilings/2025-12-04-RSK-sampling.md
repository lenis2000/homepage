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

<!-- Pane 1: Sampling -->
<fieldset style="border: 1px solid #ccc; border-radius: 5px; padding: 10px; margin-bottom: 10px;">
  <legend style="font-weight: bold; padding: 0 5px;">Sampling</legend>
  <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: center;">
    <span>
      <label for="n-input">Aztec Diamond Order n: </label>
      <input id="n-input" type="number" value="4" min="1" max="1000" style="width: 70px;">
      <button id="sample-btn" style="margin-left: 10px;">Sample</button>
      <span id="progress-indicator" style="margin-left: 10px; color: #666;"></span>
    </span>
    <span>
      <label for="q-input">q-Whittaker (0 ≤ q < 1): </label>
      <input id="q-input" type="number" value="0.5" min="0" max="0.99999999999" step="0.0001" style="width: 80px;">
    </span>
  </div>
</fieldset>

<!-- Pane 2: Schur Process Parameters -->
<fieldset style="border: 1px solid #ccc; border-radius: 5px; padding: 10px; margin-bottom: 10px;">
  <legend style="font-weight: bold; padding: 0 5px;">Schur Process Parameters</legend>
  <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center; margin-bottom: 8px;">
    <button id="uniform-btn">Uniform (all 1s)</button>
    <span>
      <label for="r-input">r-weighting $x_i=y_i=r^i$: r = </label>
      <input id="r-input" type="number" value="0.9" min="0.01" max="10" step="0.01" style="width: 60px;">
      <button id="r-btn">Apply r</button>
    </span>
  </div>
  <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 5px;">
    <label for="x-params" style="width: 20px;">x:</label>
    <input id="x-params" type="text" class="param-input" value="1^4" style="flex: 1;">
  </div>
  <div style="display: flex; gap: 10px; align-items: center;">
    <label for="y-params" style="width: 20px;">y:</label>
    <input id="y-params" type="text" class="param-input" value="1^4" style="flex: 1;">
  </div>
  <div style="font-size: 0.85em; color: #666; margin-top: 5px;">
    Syntax: <code>1^4</code> = 1,1,1,1 | <code>(1,2)^3</code> = 1,2,1,2,1,2
  </div>
</fieldset>

<!-- Zoom Controls (placed above canvas) -->
<div id="zoom-controls-container" style="margin-bottom: 10px;"></div>

<!-- Canvas -->
<div class="row">
  <div class="col-12" style="position: relative; height: 50vh;">
    <canvas id="aztec-canvas" style="width: 100%; height: 100%; border: 1px solid #ccc; background-color: #fafafa;"></canvas>
    <svg id="aztec-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; border: 1px solid #ccc; background-color: #fafafa;"></svg>
  </div>
</div>

<!-- Visual Controls -->
<div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: center; margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
  <span>
    <label>Renderer: </label>
    <input type="radio" id="renderer-canvas" name="renderer" value="canvas" checked>
    <label for="renderer-canvas">Canvas</label>
    <input type="radio" id="renderer-svg" name="renderer" value="svg" style="margin-left: 10px;">
    <label for="renderer-svg">SVG</label>
  </span>
  <span>
    <input type="checkbox" id="rotate-canvas-cb">
    <label for="rotate-canvas-cb">Rotate 45°</label>
  </span>
  <span>
    <input type="checkbox" id="show-particles-cb">
    <label for="show-particles-cb">Show particles</label>
  </span>
  <span>
    <label for="border-slider">Border: </label>
    <input type="range" id="border-slider" min="0" max="3" step="0.5" value="1" style="width: 80px; vertical-align: middle;">
    <span id="border-value">1</span>
  </span>
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
  const canvas = document.getElementById("aztec-canvas");
  const ctx = canvas.getContext("2d");
  let currentPartitions = [];
  let simulationActive = false;
  let progressInterval = null;
  const progressElem = document.getElementById("progress-indicator");

  // Canvas zoom/pan state
  let canvasTransform = { x: 0, y: 0, scale: 1 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  // Cache for computed domino data
  let cachedDominoes = null;
  let cachedLatticePoints = null;

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

    // First, handle (pattern)^count notation: e.g., (1,2)^3 = 1,2,1,2,1,2
    let processed = str;
    const patternRegex = /\(([^)]+)\)\^(\d+)/g;
    processed = processed.replace(patternRegex, (match, patternStr, countStr) => {
      const count = parseInt(countStr, 10);
      const patternValues = patternStr.split(',').map(v => v.trim()).filter(v => v !== '');
      const expanded = [];
      for (let i = 0; i < count; i++) {
        expanded.push(...patternValues);
      }
      return expanded.join(',');
    });

    // Now parse the expanded string
    const tokens = processed.split(',');
    for (const token of tokens) {
      const trimmed = token.trim();
      if (trimmed === '') continue;

      // Check for value^count notation (e.g., 1^4)
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

  // Add zoom controls to dedicated container
  const zoomDiv = d3.select("#zoom-controls-container");

  zoomDiv.append("span").text("Zoom: ").style("font-weight", "bold");
  zoomDiv.append("button").attr("id", "zoom-in-btn").style("margin-left", "5px").text("+")
    .on("click", () => {
      if (document.getElementById("renderer-canvas").checked) {
        canvasTransform.scale *= 1.3;
        redrawOnly();
      } else {
        svg.transition().duration(300).call(zoom.scaleBy, 1.3);
      }
    });
  zoomDiv.append("button").attr("id", "zoom-out-btn").style("margin-left", "5px").text("-")
    .on("click", () => {
      if (document.getElementById("renderer-canvas").checked) {
        canvasTransform.scale *= 0.7;
        redrawOnly();
      } else {
        svg.transition().duration(300).call(zoom.scaleBy, 0.7);
      }
    });
  zoomDiv.append("button").attr("id", "zoom-reset-btn").style("margin-left", "5px").text("Reset Zoom")
    .on("click", () => {
      if (document.getElementById("renderer-canvas").checked) {
        canvasTransform = { x: 0, y: 0, scale: 1 };
        redrawOnly();
      } else {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      }
    });
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

  // Compute dominoes from lattice points (cached for redrawing)
  function computeDominoes(latticePoints) {
    // Create lookup by (hx, hy) coordinates
    const pointLookup = {};
    latticePoints.forEach(p => {
      pointLookup[`${p.hx},${p.hy}`] = p;
    });

    function getNeighbors(p) {
      const neighbors = [];
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of directions) {
        const key = `${p.hx + dx},${p.hy + dy}`;
        if (pointLookup[key]) neighbors.push(pointLookup[key]);
      }
      return neighbors;
    }

    // Match particles - start from bottom-left
    const particles = latticePoints.filter(p => p.inSubset);
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

    // Match holes - start from top-right
    const holes = latticePoints.filter(p => !p.inSubset);
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

    const scale = 20;
    return [...particleDominoes.map(d => {
      const isHorizontal = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
      return {
        cx: (d.p1.x + d.p2.x) / 2,
        cy: (d.p1.y + d.p2.y) / 2,
        width: isHorizontal ? 2 * scale : scale,
        height: isHorizontal ? scale : 2 * scale,
        type: 'particle',
        isHorizontal
      };
    }), ...holeDominoes.map(d => {
      const isHorizontal = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
      return {
        cx: (d.p1.x + d.p2.x) / 2,
        cy: (d.p1.y + d.p2.y) / 2,
        width: isHorizontal ? 2 * scale : scale,
        height: isHorizontal ? scale : 2 * scale,
        type: 'hole',
        isHorizontal
      };
    })];
  }

  // Get domino color based on type and orientation
  function getDominoColor(type, isHorizontal, showParticles) {
    if (showParticles) return "#ffffff";
    if (type === 'particle') {
      return isHorizontal ? "#228B22" : "#DC143C";
    } else {
      return isHorizontal ? "#0057B7" : "#FFCD00";
    }
  }

  // Canvas rendering function
  function renderCanvas(dominoes, latticePoints, bounds, showParticles, borderWidth, rotation) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const { minX, minY, maxX, maxY } = bounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;
    const baseScale = Math.min(rect.width / widthPts, rect.height / heightPts) * 0.9;
    const baseX = (rect.width - widthPts * baseScale) / 2 - (minX - 20) * baseScale;
    const baseY = (rect.height - heightPts * baseScale) / 2 - (minY - 20) * baseScale;

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(canvasTransform.x + baseX * canvasTransform.scale, canvasTransform.y + baseY * canvasTransform.scale);
    ctx.scale(baseScale * canvasTransform.scale, baseScale * canvasTransform.scale);

    if (rotation !== 0) {
      ctx.rotate(rotation * Math.PI / 180);
    }

    // Draw all dominoes
    for (const d of dominoes) {
      ctx.fillStyle = getDominoColor(d.type, d.isHorizontal, showParticles);
      ctx.fillRect(d.cx - d.width / 2, d.cy - d.height / 2, d.width, d.height);
      if (borderWidth > 0) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(d.cx - d.width / 2, d.cy - d.height / 2, d.width, d.height);
      }
    }

    // Draw particles if enabled
    if (showParticles) {
      for (const p of latticePoints) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = p.inSubset ? "#000000" : "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // SVG rendering function (optimized with data binding)
  function renderSVG(dominoes, latticePoints, bounds, showParticles, borderWidth, rotation) {
    const { minX, minY, maxX, maxY } = bounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;

    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const scaleView = Math.min(svgWidth / widthPts, svgHeight / heightPts) * 0.9;
    const translateX = (svgWidth - widthPts * scaleView) / 2 - (minX - 20) * scaleView;
    const translateY = (svgHeight - heightPts * scaleView) / 2 - (minY - 20) * scaleView;

    initialTransform = { translateX, translateY, scale: scaleView, rotation };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g")
      .attr("class", "particles")
      .attr("transform", `translate(${translateX},${translateY}) scale(${scaleView}) rotate(${rotation})`);

    // Use D3 data binding for batch DOM creation
    group.selectAll("rect.domino")
      .data(dominoes)
      .enter()
      .append("rect")
      .attr("class", "domino")
      .attr("x", d => d.cx - d.width / 2)
      .attr("y", d => d.cy - d.height / 2)
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("fill", d => getDominoColor(d.type, d.isHorizontal, showParticles))
      .attr("stroke", borderWidth > 0 ? "#000" : "none")
      .attr("stroke-width", borderWidth);

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

  // Main render function - dispatches to canvas or SVG
  function renderParticles() {
    const { latticePoints, geomDiagonals } = generateLatticePoints();
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

    latticePoints.forEach(p => {
      const subset = subsetsByDiag[p.diag];
      p.inSubset = subset ? subset.has(p.posInDiag) : false;
    });

    // Compute bounds
    const minX = d3.min(latticePoints, d => d.x);
    const minY = d3.min(latticePoints, d => d.y);
    const maxX = d3.max(latticePoints, d => d.x);
    const maxY = d3.max(latticePoints, d => d.y);
    const bounds = { minX, minY, maxX, maxY };

    // Compute dominoes
    const dominoes = computeDominoes(latticePoints);

    // Cache for redraw on style changes
    cachedDominoes = dominoes;
    cachedLatticePoints = latticePoints;

    const showParticles = document.getElementById("show-particles-cb").checked;
    const borderWidth = parseFloat(document.getElementById("border-slider").value);
    const rotateCanvas = document.getElementById("rotate-canvas-cb").checked;
    const rotation = rotateCanvas ? -45 : 0;

    const useCanvas = document.getElementById("renderer-canvas").checked;

    if (useCanvas) {
      canvas.style.display = "block";
      svg.style("display", "none");
      renderCanvas(dominoes, latticePoints, bounds, showParticles, borderWidth, rotation);
    } else {
      canvas.style.display = "none";
      svg.style("display", "block").style("pointer-events", "auto");
      renderSVG(dominoes, latticePoints, bounds, showParticles, borderWidth, rotation);
    }
  }

  // Fast redraw for style changes only (no recomputation)
  function redrawOnly() {
    if (!cachedDominoes || !cachedLatticePoints) {
      renderParticles();
      return;
    }

    const minX = d3.min(cachedLatticePoints, d => d.x);
    const minY = d3.min(cachedLatticePoints, d => d.y);
    const maxX = d3.max(cachedLatticePoints, d => d.x);
    const maxY = d3.max(cachedLatticePoints, d => d.y);
    const bounds = { minX, minY, maxX, maxY };

    const showParticles = document.getElementById("show-particles-cb").checked;
    const borderWidth = parseFloat(document.getElementById("border-slider").value);
    const rotateCanvas = document.getElementById("rotate-canvas-cb").checked;
    const rotation = rotateCanvas ? -45 : 0;

    const useCanvas = document.getElementById("renderer-canvas").checked;

    if (useCanvas) {
      canvas.style.display = "block";
      svg.style("display", "none");
      renderCanvas(cachedDominoes, cachedLatticePoints, bounds, showParticles, borderWidth, rotation);
    } else {
      canvas.style.display = "none";
      svg.style("display", "block").style("pointer-events", "auto");
      renderSVG(cachedDominoes, cachedLatticePoints, bounds, showParticles, borderWidth, rotation);
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

  // Show particles checkbox handler - fast redraw
  document.getElementById("show-particles-cb").addEventListener("change", function() {
    redrawOnly();
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

  // Rotate canvas checkbox handler - fast redraw
  document.getElementById("rotate-canvas-cb").addEventListener("change", function() {
    redrawOnly();
  });

  // Border slider handler - fast redraw and update display value
  document.getElementById("border-slider").addEventListener("input", function() {
    document.getElementById("border-value").innerText = this.value;
    redrawOnly();
  });

  // Renderer toggle handlers - switch between canvas and SVG
  document.getElementById("renderer-canvas").addEventListener("change", function() {
    if (this.checked) {
      canvasTransform = { x: 0, y: 0, scale: 1 };
      redrawOnly();
    }
  });
  document.getElementById("renderer-svg").addEventListener("change", function() {
    if (this.checked) {
      redrawOnly();
    }
  });

  // Canvas zoom/pan event handlers
  canvas.addEventListener("wheel", function(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = canvasTransform.scale * zoomFactor;

    // Zoom centered on mouse position
    canvasTransform.x = mouseX - (mouseX - canvasTransform.x) * zoomFactor;
    canvasTransform.y = mouseY - (mouseY - canvasTransform.y) * zoomFactor;
    canvasTransform.scale = newScale;

    redrawOnly();
  });

  canvas.addEventListener("mousedown", function(e) {
    isDragging = true;
    dragStart = { x: e.clientX - canvasTransform.x, y: e.clientY - canvasTransform.y };
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("mousemove", function(e) {
    if (!isDragging) return;
    canvasTransform.x = e.clientX - dragStart.x;
    canvasTransform.y = e.clientY - dragStart.y;
    redrawOnly();
  });

  canvas.addEventListener("mouseup", function() {
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("mouseleave", function() {
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("dblclick", function() {
    canvasTransform = { x: 0, y: 0, scale: 1 };
    redrawOnly();
  });

  canvas.style.cursor = "grab";

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
