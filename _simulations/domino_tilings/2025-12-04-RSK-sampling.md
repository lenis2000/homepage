---
title: Partition Interlacing Editor
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

<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order n: </label>
  <input id="n-input" type="number" value="4" min="1" max="100" style="width: 60px;">
  <button id="sample-btn">Sample</button>
</div>

<div class="row">
  <div class="col-12">
    <svg id="aztec-svg"></svg>
  </div>
</div>

<div style="margin-top: 20px;">
  <h4>Partitions forming the Schur process</h4>
  <div id="subsets-output">Loading...</div>
</div>

<div style="margin-top: 20px; padding: 15px; border: 2px solid #4682B4; border-radius: 8px; background-color: #f0f8ff;">
  <h4 style="margin-top: 0;">Edit Partition</h4>
  <div style="margin-bottom: 10px;">
    <label for="partition-select">Select partition level: </label>
    <select id="partition-select" style="font-family: monospace; padding: 5px;">
      <option value="">-- Loading --</option>
    </select>
  </div>
  <div style="margin-bottom: 10px;">
    <label for="partition-input">Partition (comma-separated, e.g., 4,3,1): </label>
    <input id="partition-input" type="text" class="param-input" value="" placeholder="e.g., 4,3,1 or empty for empty partition">
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
(function() {
  let currentN = 4;
  const svg = d3.select("#aztec-svg");
  let currentPartitions = [];

  // ========== RSK Sampling Functions ==========

  // Get i-th part of partition (0-indexed), return 0 if out of range
  function getPart(partition, i) {
    return (i >= 0 && i < partition.length) ? partition[i] : 0;
  }

  // VH bijection for the Aztec diamond growth diagram
  // Based on arXiv:1407.3764
  function sampleVH(lam, mu, kappa, bit) {
    const maxLen = Math.max(lam.length, mu.length) + 2;
    const nu = [];
    let B = bit;

    for (let i = 0; i < maxLen; i++) {
      const lam_i = getPart(lam, i);
      const mu_i = getPart(mu, i);
      const lam_im1 = i > 0 ? getPart(lam, i - 1) : Infinity;
      const mu_im1 = i > 0 ? getPart(mu, i - 1) : Infinity;
      const mu_ip1 = getPart(mu, i + 1);
      const lam_ip1 = getPart(lam, i + 1);
      const kappa_i = getPart(kappa, i);

      let nu_i;
      // VH condition: if mu_i <= lam_i < mu_{i-1}
      if (mu_i <= lam_i && lam_i < mu_im1) {
        nu_i = Math.max(lam_i, mu_i) + B;
      } else {
        nu_i = Math.max(lam_i, mu_i);
      }
      nu.push(nu_i);

      // Extract new bit: if lam_{i+1} < mu_i <= lam_i
      if (lam_ip1 < mu_i && mu_i <= lam_i) {
        B = Math.min(lam_i, mu_i) - kappa_i;
      }
    }

    // Trim trailing zeros
    while (nu.length > 0 && nu[nu.length - 1] === 0) nu.pop();
    return nu;
  }

  // Sample Aztec diamond partition sequence using RSK growth diagram
  function aztecDiamondSample(n) {
    if (n === 0) return [[]];

    const numBits = n * (n + 1) / 2;
    const bits = Array.from({length: numBits}, () => Math.random() < 0.5 ? 0 : 1);

    // Initialize growth diagram with empty partitions on boundaries
    const tau = {};
    for (let j = 0; j <= n; j++) tau[`0,${j}`] = [];
    for (let i = 0; i <= n; i++) tau[`${i},0`] = [];

    // Fill staircase row by row
    let bitIdx = 0;
    for (let i = 1; i <= n; i++) {
      const rowLen = n + 1 - i;
      for (let j = 1; j <= rowLen; j++) {
        const lam = tau[`${i-1},${j}`];
        const mu = tau[`${i},${j-1}`];
        const kappa = tau[`${i-1},${j-1}`];
        tau[`${i},${j}`] = sampleVH(lam, mu, kappa, bits[bitIdx++]);
      }
    }

    // Extract output path along staircase boundary
    // Path goes from (0,n) to (n,0), but we need reverse order for λ⁰, μ¹, λ¹, ...
    const outputPath = [];
    let i = 0, j = n;
    outputPath.push([i, j]);
    while (i !== n || j !== 0) {
      if (j <= n - i && i < n) i++;
      else j--;
      outputPath.push([i, j]);
    }

    // Reverse to get correct order: λ⁰ first (empty), then growing, then shrinking back to λⁿ (empty)
    return outputPath.map(([i, j]) => tau[`${i},${j}`]).reverse();
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

    initialTransform = { translateX, translateY, scale: scaleView };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g")
      .attr("class", "particles")
      .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scaleView + ")");

    // Draw x,y coordinate axes
    const axisExtent = (currentN + 1) * 20;
    // X-axis (horizontal)
    group.append("line")
      .attr("x1", -axisExtent)
      .attr("y1", 0)
      .attr("x2", axisExtent)
      .attr("y2", 0)
      .attr("stroke", "#999")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,2");
    group.append("text")
      .attr("x", axisExtent + 5)
      .attr("y", 0)
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .attr("dominant-baseline", "middle")
      .text("x");
    // Y-axis (vertical, positive y points up)
    group.append("line")
      .attr("x1", 0)
      .attr("y1", -axisExtent)
      .attr("x2", 0)
      .attr("y2", axisExtent)
      .attr("stroke", "#999")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,2");
    group.append("text")
      .attr("x", 0)
      .attr("y", -axisExtent - 5)
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .attr("text-anchor", "middle")
      .text("y");
    // Origin marker
    group.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 3)
      .attr("fill", "#999");

    // Draw diagonal lines (optional, for reference)
    diagKeys.forEach((diagKey, idx) => {
      const pts = geomDiagonals[diagKey];
      if (pts.length > 1) {
        group.append("line")
          .attr("x1", pts[0].x)
          .attr("y1", pts[0].y)
          .attr("x2", pts[pts.length - 1].x)
          .attr("y2", pts[pts.length - 1].y)
          .attr("stroke", "#ddd")
          .attr("stroke-width", 1);
      }
    });

    // Draw particles
    group.selectAll("circle.particle")
      .data(latticePoints)
      .enter()
      .append("circle")
      .attr("class", "particle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 5)
      .attr("fill", d => d.inSubset ? "#ff00ff" : "#ffffff")
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    // Add coordinate labels next to particles only (not holes)
    group.selectAll("text.coord")
      .data(latticePoints.filter(d => d.inSubset))
      .enter()
      .append("text")
      .attr("class", "coord")
      .attr("x", d => d.x + 7)
      .attr("y", d => d.y + 1)
      .attr("font-size", "1.7px")
      .attr("fill", "#333")
      .attr("dominant-baseline", "middle")
      .text(d => `(${d.hx},${d.hy})`);

    // Add diagonal labels at staircase positions along left edge
    // λ⁰ at (-n,0), μ¹ at (-n,1), λ¹ at (-n+1,1), μ² at (-n+1,2), etc.
    const labelScale = 20;
    for (let idx = 0; idx < currentPartitions.length; idx++) {
      const labelX = -currentN + Math.floor(idx / 2);
      const labelY = Math.floor((idx + 1) / 2);
      const screenLabelX = (labelX + .55) * labelScale;
      const screenLabelY = (-labelY-.15) * labelScale;  // y is flipped
      group.append("text")
        .attr("x", screenLabelX - 10)
        .attr("y", screenLabelY)
        .attr("font-size", "8px")
        .attr("fill", "#666")
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .text(getPartitionLabel(idx));
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

  // Populate partition dropdown
  function populatePartitionDropdown() {
    const partitionSelect = document.getElementById("partition-select");
    const partitionInput = document.getElementById("partition-input");

    partitionSelect.innerHTML = '';
    for (let i = 0; i < currentPartitions.length; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = getPartitionLabel(i) + " = " + partitionToString(currentPartitions[i]);
      partitionSelect.appendChild(opt);
    }
    partitionInput.value = currentPartitions.length > 0 ? currentPartitions[0].join(",") : "";
  }

  // Parse partition from string
  function parsePartition(str) {
    if (!str || str.trim() === "" || str.trim() === "∅") return [];
    const parts = str.split(",").map(s => parseInt(s.trim(), 10)).filter(x => !isNaN(x) && x > 0);
    parts.sort((a, b) => b - a);
    return parts;
  }

  // Validate interlacing for a partition at index idx
  function validatePartitionAtIndex(idx, newPartition) {
    const errors = [];
    const prevPartition = idx > 0 ? currentPartitions[idx - 1] : null;
    const nextPartition = idx < currentPartitions.length - 1 ? currentPartitions[idx + 1] : null;

    if (idx % 2 === 0) {
      // This is λ^k where k = idx/2
      const k = idx / 2;
      if (prevPartition !== null) {
        const mu_k = prevPartition;
        if (!isVerticalStrip(mu_k, newPartition)) {
          errors.push(`μ${toSuperscript(k)}/λ${toSuperscript(k)} is not a vertical strip`);
        }
      }
      if (nextPartition !== null) {
        const mu_kp1 = nextPartition;
        if (!isHorizontalStrip(mu_kp1, newPartition)) {
          errors.push(`μ${toSuperscript(k+1)}/λ${toSuperscript(k)} is not a horizontal strip`);
        }
      }
    } else {
      // This is μ^k where k = (idx+1)/2
      const k = (idx + 1) / 2;
      if (prevPartition !== null) {
        const lambda_km1 = prevPartition;
        if (!isHorizontalStrip(newPartition, lambda_km1)) {
          errors.push(`μ${toSuperscript(k)}/λ${toSuperscript(k-1)} is not a horizontal strip`);
        }
      }
      if (nextPartition !== null) {
        const lambda_k = nextPartition;
        if (!isVerticalStrip(newPartition, lambda_k)) {
          errors.push(`μ${toSuperscript(k)}/λ${toSuperscript(k)} is not a vertical strip`);
        }
      }
    }

    return errors;
  }

  // Event handlers
  const partitionSelect = document.getElementById("partition-select");
  const partitionInput = document.getElementById("partition-input");
  const applyPartitionBtn = document.getElementById("apply-partition-btn");
  const partitionStatus = document.getElementById("partition-status");

  partitionSelect.addEventListener("change", function() {
    const idx = parseInt(this.value, 10);
    if (!isNaN(idx) && idx >= 0 && idx < currentPartitions.length) {
      partitionInput.value = currentPartitions[idx].join(",");
      partitionStatus.textContent = "";
    }
  });

  applyPartitionBtn.addEventListener("click", function() {
    const idx = parseInt(partitionSelect.value, 10);
    if (isNaN(idx) || idx < 0 || idx >= currentPartitions.length) {
      partitionStatus.textContent = "Please select a valid partition level";
      partitionStatus.style.color = "red";
      return;
    }

    const newPartition = parsePartition(partitionInput.value);
    const errors = validatePartitionAtIndex(idx, newPartition);

    if (errors.length > 0) {
      partitionStatus.textContent = "Invalid: " + errors.join("; ");
      partitionStatus.style.color = "red";
      return;
    }

    // Update partition
    currentPartitions[idx] = newPartition;

    // Refresh everything
    populatePartitionDropdown();
    partitionSelect.value = idx;
    renderParticles();
    displaySubsets();

    partitionStatus.textContent = "Partition updated ✓";
    partitionStatus.style.color = "green";
  });

  // Sample button handler
  document.getElementById("sample-btn").addEventListener("click", function() {
    const nInput = document.getElementById("n-input");
    const newN = parseInt(nInput.value, 10);
    if (isNaN(newN) || newN < 1) {
      alert("Please enter a valid positive integer for n");
      return;
    }
    currentN = newN;
    currentPartitions = aztecDiamondSample(currentN);
    populatePartitionDropdown();
    renderParticles();
    displaySubsets();
  });

  // Sample on page load
  currentPartitions = aztecDiamondSample(currentN);
  populatePartitionDropdown();
  renderParticles();
  displaySubsets();
})();
</script>
