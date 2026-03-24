---
title: Fluctuations of q-Weighted Domino Tilings
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2026-03-24-q-domino-fluctuations.md'
    txt: 'JavaScript simulation with RSK WASM sampling engine'
a11y-description: "Interactive simulation studying fluctuations of boundary paths in q-Whittaker weighted domino tilings of the Aztec diamond. Sample many tilings via RSK, extract nonintersecting lattice paths, and visualize fluctuation histograms of the outermost path height."
published: true
---

<script src="/js/d3.v7.min.js"></script>
<script src="/js/colorschemes.js"></script>
<script src="/js/2025-12-04-RSK-sampling.js"></script>

<style>
  #tiling-canvas {
    width: 100%;
    height: 50vh;
    border: 1px solid #ccc;
    background: #fafafa;
  }
  #histogram-canvas {
    width: 100%;
    height: 300px;
    border: 1px solid #ccc;
    background: #fafafa;
  }
  .controls-row {
    margin-bottom: 8px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .controls-row label {
    font-size: 0.95em;
  }
  .controls-row input[type="number"] {
    width: 70px;
  }
  .controls-row select {
    padding: 2px 4px;
  }
  .param-input {
    font-family: monospace;
    font-size: 12px;
    width: 100%;
    padding: 4px;
  }
  #stats-bar {
    font-family: monospace;
    font-size: 13px;
    padding: 6px 10px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin: 8px 0;
  }
  #progress-area {
    display: none;
    margin: 6px 0;
  }
  #progress-bar {
    width: 100%;
    height: 6px;
    background: #eee;
    border-radius: 3px;
    overflow: hidden;
  }
  #progress-fill {
    height: 100%;
    background: #232D4B;
    width: 0%;
    transition: width 0.1s;
  }
  #progress-text {
    font-size: 12px;
    font-family: monospace;
    color: #666;
    margin-top: 2px;
  }
</style>

<div class="controls-row">
  <label>n: <input id="n-input" type="number" value="10" min="2" max="40" aria-label="Diamond size n"></label>
  <label>q: <input id="q-input" type="number" value="0.5" min="0" max="0.9999" step="0.01" style="width:80px;" aria-label="q-Whittaker parameter"></label>
  <label><input id="high-precision-cb" type="checkbox"> High precision</label>
</div>

<div class="controls-row">
  <label style="flex:1;">x params: <input id="x-params" class="param-input" value="1^10" aria-label="Schur x specialization"></label>
  <label style="flex:1;">y params: <input id="y-params" class="param-input" value="1^10" aria-label="Schur y specialization"></label>
</div>

<div class="controls-row">
  <label>Family:
    <select id="family-select" aria-label="Path family">
      <option value="top">Top boundary</option>
      <option value="bottom">Bottom boundary</option>
    </select>
  </label>
  <label>Diagonal: <input id="diag-slider" type="range" min="0" max="20" value="10" style="width:120px; vertical-align:middle;" aria-label="Measurement diagonal"></label>
  <span id="diag-label" style="font-family:monospace; font-size:13px;">k=10</span>
</div>

<div class="controls-row">
  <label>Batch: <input id="batch-input" type="number" value="100" min="1" max="10000" style="width:80px;" aria-label="Batch size"></label>
  <button id="sample-btn">Sample 1</button>
  <button id="batch-btn">Run Batch</button>
  <button id="clear-btn">Clear</button>
  <label><input id="show-paths-cb" type="checkbox" checked> Show paths</label>
  <label><input id="show-tiling-cb" type="checkbox" checked> Show tiling</label>
</div>

<div id="progress-area">
  <div id="progress-bar"><div id="progress-fill"></div></div>
  <div id="progress-text"></div>
</div>

<div id="stats-bar" role="status" aria-live="polite">Samples: 0 &nbsp;|&nbsp; Mean: — &nbsp;|&nbsp; SD: — &nbsp;|&nbsp; Skew: — &nbsp;|&nbsp; Kurt: — &nbsp;|&nbsp; JB: —</div>
<details style="margin: 4px 0 8px 0; font-size: 0.85em; color: #555;">
<summary style="cursor:pointer;">Stats legend</summary>
<b>SD</b> = standard deviation. <b>Skew</b> = skewness (0 for symmetric). <b>Kurt</b> = excess kurtosis (0 for normal; positive = heavy tails, negative = light tails). <b>JB</b> = Jarque-Bera statistic, a normality test based on skewness and kurtosis: JB = n/6·(S² + K²/4). Under the null hypothesis of normality, JB ~ χ²(2). <b>p</b> = p-value; large p (say >0.05) means the data is consistent with normality; small p rejects normality.
</details>

<canvas id="tiling-canvas"></canvas>

<canvas id="histogram-canvas"></canvas>

<script>
if (typeof createRSKModule === 'undefined') {
  document.getElementById("stats-bar").textContent = 'Error: WASM Module not loaded';
}

async function initializeApp() {
  // ========== WASM Setup ==========
  let wasmMod = null;
  let sampleAztecRSK, freeString, getProgress, setHighPrecision, getHighPrecision;

  async function recreateWasm() {
    const wasHighPrecision = wasmMod ? getHighPrecision() : 0;
    wasmMod = await createRSKModule();
    sampleAztecRSK = wasmMod.cwrap('sampleAztecRSK', 'number', ['number', 'string', 'string', 'number'], {async: true});
    freeString = wasmMod.cwrap('freeString', null, ['number']);
    getProgress = wasmMod.cwrap('getProgress', 'number', []);
    setHighPrecision = wasmMod.cwrap('setHighPrecision', null, ['number']);
    getHighPrecision = wasmMod.cwrap('getHighPrecision', 'number', []);
    if (wasHighPrecision) setHighPrecision(1);
  }

  await recreateWasm();

  // ========== State ==========
  let currentN = 10;
  let heightSamples = [];
  let lastPartitions = null;
  let lastDominoes = null;
  let lastLatticePoints = null;
  let lastBounds = null;
  let isBatching = false;
  let batchCancelRequested = false;
  let wasmSampleCount = 0;
  let lastBatchPartitions = null;

  // ========== DOM Elements ==========
  const nInput = document.getElementById('n-input');
  const qInput = document.getElementById('q-input');
  const xParamsField = document.getElementById('x-params');
  const yParamsField = document.getElementById('y-params');
  const highPrecisionCb = document.getElementById('high-precision-cb');
  const familySelect = document.getElementById('family-select');
  const diagSlider = document.getElementById('diag-slider');
  const diagLabel = document.getElementById('diag-label');
  const batchInput = document.getElementById('batch-input');
  const sampleBtn = document.getElementById('sample-btn');
  const batchBtn = document.getElementById('batch-btn');
  const clearBtn = document.getElementById('clear-btn');
  const showPathsCb = document.getElementById('show-paths-cb');
  const showTilingCb = document.getElementById('show-tiling-cb');
  const statsBar = document.getElementById('stats-bar');
  const tilingCanvas = document.getElementById('tiling-canvas');
  const histogramCanvas = document.getElementById('histogram-canvas');
  const progressArea = document.getElementById('progress-area');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const tilingCtx = tilingCanvas.getContext('2d');

  // ========== Parameter Parsing ==========
  function parseCSV(str) {
    const result = [];
    let processed = str;
    const patternRegex = /\(([^)]+)\)\^(\d+)/g;
    processed = processed.replace(patternRegex, (match, patternStr, countStr) => {
      const count = parseInt(countStr, 10);
      const patternValues = patternStr.split(',').map(v => v.trim()).filter(v => v !== '');
      const expanded = [];
      for (let i = 0; i < count; i++) expanded.push(...patternValues);
      return expanded.join(',');
    });
    const tokens = processed.split(',');
    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;
      if (trimmed.includes('^')) {
        const parts = trimmed.split('^');
        if (parts.length === 2) {
          const value = parseFloat(parts[0].trim());
          const count = parseInt(parts[1].trim(), 10);
          if (!isNaN(value) && !isNaN(count) && count > 0) {
            for (let i = 0; i < count; i++) result.push(value);
            continue;
          }
        }
      }
      const value = parseFloat(trimmed);
      if (!isNaN(value)) result.push(value);
    }
    return result;
  }

  function arrayToCSV(arr) { return arr.map(x => x.toString()).join(','); }

  function updateParamsForN(newN) {
    const currentX = parseCSV(xParamsField.value);
    const currentY = parseCSV(yParamsField.value);
    const newX = [], newY = [];
    for (let i = 0; i < newN; i++) {
      newX.push(i < currentX.length ? currentX[i] : 1.0);
      newY.push(i < currentY.length ? currentY[i] : 1.0);
    }
    xParamsField.value = arrayToCSV(newX);
    yParamsField.value = arrayToCSV(newY);
  }

  // ========== Lattice / Partition Utilities ==========
  // Actual geometric diagonal size for Aztec diamond of size n
  // (NOT the same as min(idx+1, 2n+1-idx) — that formula is wrong!)
  function actualDiagSize(diagIdx, n) {
    const d = diagIdx - n;
    return (Math.abs(d) % 2 === n % 2) ? n : n + 1;
  }

  function getParticleCount(idx) {
    const k = Math.floor((idx + 1) / 2);
    return idx % 2 === 0 ? currentN - k : currentN - k + 1;
  }

  function partitionToSubset(partition, numParticles, groundSetSize) {
    const m = groundSetSize;
    const n_p = numParticles;
    const h = m - n_p;
    if (h <= 0) {
      const subset = [];
      for (let i = 1; i <= m; i++) subset.push(i);
      return subset;
    }
    const lambda = partition || [];
    const lambdaReversed = [...lambda].reverse();
    while (lambdaReversed.length < h) lambdaReversed.unshift(0);
    const holePositions = new Set();
    for (let j = 1; j <= h; j++) {
      const u_j = lambdaReversed[j - 1] + j;
      if (u_j >= 1 && u_j <= m) holePositions.add(u_j);
    }
    const subset = [];
    for (let pos = 1; pos <= m; pos++) {
      if (!holePositions.has(pos)) subset.push(pos);
    }
    return subset;
  }

  function latticeKey(hx, hy) {
    const ix = Math.round(hx * 2) + 2 * currentN + 1;
    const iy = Math.round(hy * 2) + 2 * currentN + 1;
    return ix * (4 * currentN + 3) + iy;
  }

  function generateLatticePoints() {
    const scale = 20;
    const latticePoints = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let hx = -currentN - 0.5; hx <= currentN + 0.5; hx += 1) {
      for (let hy = -currentN - 0.5; hy <= currentN + 0.5; hy += 1) {
        if (Math.abs(hx % 1) !== 0.5 || Math.abs(hy % 1) !== 0.5) continue;
        if (Math.abs(hx) + Math.abs(hy) > currentN + 0.5) continue;
        const screenX = hx * scale;
        const screenY = -hy * scale;
        const diag = Math.round(hx + hy);
        latticePoints.push({ hx, hy, x: screenX, y: screenY, diag });
        if (screenX < minX) minX = screenX;
        if (screenX > maxX) maxX = screenX;
        if (screenY < minY) minY = screenY;
        if (screenY > maxY) maxY = screenY;
      }
    }
    const geomDiagonals = {};
    for (const p of latticePoints) {
      if (!geomDiagonals[p.diag]) geomDiagonals[p.diag] = [];
      geomDiagonals[p.diag].push(p);
    }
    for (const d in geomDiagonals) {
      geomDiagonals[d].sort((a, b) => (a.hx - a.hy) - (b.hx - b.hy));
      geomDiagonals[d].forEach((p, i) => { p.posInDiag = i + 1; });
    }
    return { latticePoints, geomDiagonals, bounds: { minX, minY, maxX, maxY } };
  }

  function assignSubsets(latticePoints, geomDiagonals, partitions) {
    const diagKeys = Object.keys(geomDiagonals).map(Number).sort((a, b) => a - b);
    const subsetsByDiag = {};
    for (let idx = 0; idx < partitions.length && idx < diagKeys.length; idx++) {
      const diagKey = diagKeys[idx];
      const diagSize = geomDiagonals[diagKey].length;
      const partition = partitions[idx] || [];
      const numParticles = getParticleCount(idx);
      const subset = partitionToSubset(partition, numParticles, diagSize);
      subsetsByDiag[diagKey] = new Set(subset);
    }
    for (const p of latticePoints) {
      const subset = subsetsByDiag[p.diag];
      p.inSubset = subset ? subset.has(p.posInDiag) : false;
    }
  }

  function computeDominoes(latticePoints) {
    const pointLookup = new Map();
    for (const p of latticePoints) pointLookup.set(latticeKey(p.hx, p.hy), p);

    function getNeighbors(p) {
      const neighbors = [];
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const d of dirs) {
        const n = pointLookup.get(latticeKey(p.hx + d[0], p.hy + d[1]));
        if (n) neighbors.push(n);
      }
      return neighbors;
    }

    const particles = latticePoints.filter(p => p.inSubset);
    particles.sort((a, b) => {
      const sa = a.hx + a.hy, sb = b.hx + b.hy;
      if (sa !== sb) return sa - sb;
      return (a.hx - a.hy) - (b.hx - b.hy);
    });
    const matchedParticles = new Set();
    const particleDominoes = [];
    for (const p of particles) {
      const pk = latticeKey(p.hx, p.hy);
      if (matchedParticles.has(pk)) continue;
      const neighbors = getNeighbors(p).filter(n => n.inSubset && !matchedParticles.has(latticeKey(n.hx, n.hy)));
      if (neighbors.length > 0) {
        neighbors.sort((a, b) => {
          const sa = a.hx + a.hy, sb = b.hx + b.hy;
          if (sa !== sb) return sa - sb;
          return (a.hx - a.hy) - (b.hx - b.hy);
        });
        matchedParticles.add(pk);
        matchedParticles.add(latticeKey(neighbors[0].hx, neighbors[0].hy));
        particleDominoes.push({ p1: p, p2: neighbors[0] });
      }
    }

    const holes = latticePoints.filter(p => !p.inSubset);
    holes.sort((a, b) => {
      const sa = a.hx + a.hy, sb = b.hx + b.hy;
      if (sa !== sb) return sb - sa;
      return (b.hx - b.hy) - (a.hx - a.hy);
    });
    const matchedHoles = new Set();
    const holeDominoes = [];
    for (const p of holes) {
      const pk = latticeKey(p.hx, p.hy);
      if (matchedHoles.has(pk)) continue;
      const neighbors = getNeighbors(p).filter(n => !n.inSubset && !matchedHoles.has(latticeKey(n.hx, n.hy)));
      if (neighbors.length > 0) {
        neighbors.sort((a, b) => {
          const sa = a.hx + a.hy, sb = b.hx + b.hy;
          if (sa !== sb) return sb - sa;
          return (b.hx - b.hy) - (a.hx - a.hy);
        });
        matchedHoles.add(pk);
        matchedHoles.add(latticeKey(neighbors[0].hx, neighbors[0].hy));
        holeDominoes.push({ p1: p, p2: neighbors[0] });
      }
    }

    const scale = 20;
    const result = [];
    for (const d of particleDominoes) {
      const isHorizontal = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
      result.push({
        cx: (d.p1.x + d.p2.x) / 2, cy: (d.p1.y + d.p2.y) / 2,
        width: isHorizontal ? 2 * scale : scale,
        height: isHorizontal ? scale : 2 * scale,
        type: 'particle', isHorizontal
      });
    }
    for (const d of holeDominoes) {
      const isHorizontal = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
      result.push({
        cx: (d.p1.x + d.p2.x) / 2, cy: (d.p1.y + d.p2.y) / 2,
        width: isHorizontal ? 2 * scale : scale,
        height: isHorizontal ? scale : 2 * scale,
        type: 'hole', isHorizontal
      });
    }
    return result;
  }

  // ========== Domino Color ==========
  const defaultColors = ['#6aaa64', '#c9534a', '#6d9eeb', '#f1c232']; // green, red, blue, yellow
  function getDominoColor(type, isHorizontal) {
    if (type === 'particle') return isHorizontal ? defaultColors[0] : defaultColors[1];
    return isHorizontal ? defaultColors[2] : defaultColors[3];
  }

  // ========== WASM Sampling ==========
  async function aztecDiamondSample(n, x, y, q) {
    if (n === 0) return [[]];
    const xJson = JSON.stringify(x);
    const yJson = JSON.stringify(y);
    try {
      const ptr = await sampleAztecRSK(n, xJson, yJson, q);
      if (!ptr) throw new Error("WASM returned null pointer");
      const jsonStr = wasmMod.UTF8ToString(ptr);
      freeString(ptr);
      const result = JSON.parse(jsonStr);
      if (result && result.error) throw new Error(result.error);
      return result;
    } catch (e) {
      console.error("Sampling error:", e);
      return null;
    }
  }

  // ========== Measurement Extraction ==========
  // Fast: only needs partition data, no lattice point generation
  function extractMeasurement(partitions, diagIdx, family, n) {
    const partition = partitions[diagIdx] || [];
    const numParticles = getParticleCount(diagIdx);
    const diagSize = actualDiagSize(diagIdx, n);
    const subset = partitionToSubset(partition, numParticles, diagSize);
    if (subset.length === 0) return 0;
    if (family === 'top') return subset[subset.length - 1];
    if (family === 'bottom') return subset[0];
    return subset[subset.length - 1];
  }

  // ========== Rendering: Tiling + Paths ==========
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;
    if (w < 1 || h < 1) return null;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  }

  function renderTiling() {
    const setup = setupCanvas(tilingCanvas);
    if (!setup) return;
    const { ctx, w, h } = setup;
    ctx.clearRect(0, 0, w, h);

    if (!lastPartitions || !lastDominoes) {
      ctx.fillStyle = '#888';
      ctx.font = '14px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press "Sample 1" to generate a tiling', w / 2, h / 2);
      return;
    }

    const { minX, minY, maxX, maxY } = lastBounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;
    const baseScale = Math.min(w / widthPts, h / heightPts) * 0.9;
    const baseX = (w - widthPts * baseScale) / 2 - (minX - 20) * baseScale;
    const baseY = (h - heightPts * baseScale) / 2 - (minY - 20) * baseScale;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(baseScale, baseScale);

    // Draw dominoes
    if (showTilingCb.checked) {
      const colorGroups = {};
      for (const d of lastDominoes) {
        const color = getDominoColor(d.type, d.isHorizontal);
        if (!colorGroups[color]) colorGroups[color] = [];
        colorGroups[color].push(d);
      }
      for (const color in colorGroups) {
        ctx.fillStyle = color;
        for (const d of colorGroups[color]) {
          ctx.fillRect(d.cx - d.width / 2, d.cy - d.height / 2, d.width, d.height);
        }
      }
      // Borders
      if (lastDominoes.length <= 10000) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.5 / baseScale;
        ctx.beginPath();
        for (const d of lastDominoes) {
          ctx.rect(d.cx - d.width / 2, d.cy - d.height / 2, d.width, d.height);
        }
        ctx.stroke();
      }
    }

    // Draw paths using lattice points (already have inSubset flags)
    if (showPathsCb.checked && lastLatticePoints) {
      // Group particles by geometric diagonal
      const diagParticles = {};
      for (const p of lastLatticePoints) {
        if (!p.inSubset) continue;
        if (!diagParticles[p.diag]) diagParticles[p.diag] = [];
        diagParticles[p.diag].push(p);
      }
      for (const d in diagParticles) {
        diagParticles[d].sort((a, b) => a.posInDiag - b.posInDiag);
      }
      const diagKeys = Object.keys(diagParticles).map(Number).sort((a, b) => a - b);

      // Find max number of particles on any diagonal
      let maxParticles = 0;
      for (const d of diagKeys) maxParticles = Math.max(maxParticles, diagParticles[d].length);

      // Draw path segments: connect i-th particle (from bottom) on consecutive diagonals
      // First pass: thin lines for all interior paths
      for (let i = 0; i < diagKeys.length - 1; i++) {
        const d1 = diagKeys[i], d2 = diagKeys[i + 1];
        const p1 = diagParticles[d1], p2 = diagParticles[d2];
        const minLen = Math.min(p1.length, p2.length);
        for (let j = 0; j < minLen; j++) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.lineWidth = 1 / baseScale;
          ctx.beginPath();
          ctx.moveTo(p1[j].x, p1[j].y);
          ctx.lineTo(p2[j].x, p2[j].y);
          ctx.stroke();
        }
      }

      // Second pass: top path (thick orange) — connects last particle on each diagonal
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(232, 62, 0, 0.9)';
      ctx.lineWidth = 3 / baseScale;
      let started = false;
      for (const d of diagKeys) {
        const pts = diagParticles[d];
        if (pts.length > 0) {
          const pt = pts[pts.length - 1];
          if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
          else ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();

      // Third pass: bottom path (thick blue) — connects first particle on each diagonal
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 100, 200, 0.8)';
      ctx.lineWidth = 2.5 / baseScale;
      started = false;
      for (const d of diagKeys) {
        const pts = diagParticles[d];
        if (pts.length > 0) {
          const pt = pts[0];
          if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
          else ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();

      // Highlight measurement diagonal
      const diagIdx = parseInt(diagSlider.value);
      const geomDiag = diagIdx - currentN;
      if (diagParticles[geomDiag] && diagParticles[geomDiag].length > 0) {
        const pts = diagParticles[geomDiag];
        // Draw line along the diagonal
        ctx.setLineDash([4 / baseScale, 4 / baseScale]);
        ctx.strokeStyle = 'rgba(150, 0, 150, 0.5)';
        ctx.lineWidth = 1.5 / baseScale;
        ctx.beginPath();
        ctx.moveTo(pts[0].x - 15, pts[0].y + 15);
        ctx.lineTo(pts[pts.length - 1].x + 15, pts[pts.length - 1].y - 15);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight measured particle with a dot
        const family = familySelect.value;
        const measuredPt = family === 'top' ? pts[pts.length - 1] : pts[0];
        ctx.fillStyle = 'rgba(150, 0, 150, 0.9)';
        ctx.beginPath();
        ctx.arc(measuredPt.x, measuredPt.y, 6 / baseScale, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5 / baseScale;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ========== Histogram ==========
  function drawHistogram() {
    const setup = setupCanvas(histogramCanvas);
    if (!setup) return;
    const { ctx, w, h } = setup;
    const margin = { top: 20, right: 20, bottom: 35, left: 50 };

    ctx.clearRect(0, 0, w, h);

    if (heightSamples.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '14px "franklingothic-book", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Run Batch to accumulate fluctuation histograms', w / 2, h / 2);
      return;
    }

    // Compute centered values
    const mean = d3.mean(heightSamples);
    const centered = heightSamples.map(h => h - mean);

    let dMin = d3.min(centered), dMax = d3.max(centered);
    const pad = Math.max(0.5, (dMax - dMin) * 0.1);
    dMin -= pad; dMax += pad;

    const numBins = Math.min(40, Math.max(10, Math.ceil(Math.sqrt(heightSamples.length))));
    const xScale = d3.scaleLinear().domain([dMin, dMax]).range([margin.left, w - margin.right]);
    const binner = d3.bin().domain([dMin, dMax]).thresholds(numBins);
    const bins = binner(centered);

    const binWidth = bins.length > 0 ? (bins[0].x1 - bins[0].x0) : 1;
    const normalized = bins.map(b => ({
      ...b,
      density: heightSamples.length > 0 ? b.length / (heightSamples.length * binWidth) : 0
    }));

    const maxDensity = d3.max(normalized, d => d.density) || 1;
    const yScale = d3.scaleLinear().domain([0, maxDensity * 1.1]).range([h - margin.bottom, margin.top]);

    // Axes
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, h - margin.bottom);
    ctx.lineTo(w - margin.right, h - margin.bottom);
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, h - margin.bottom);
    ctx.stroke();

    // X ticks
    ctx.fillStyle = '#888';
    ctx.font = '10px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'center';
    const xTicks = xScale.ticks(8);
    for (const t of xTicks) {
      const tx = xScale(t);
      ctx.fillText(t.toFixed(1), tx, h - margin.bottom + 14);
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tx, h - margin.bottom);
      ctx.lineTo(tx, h - margin.bottom + 4);
      ctx.stroke();
    }

    // Zero line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xScale(0), margin.top);
    ctx.lineTo(xScale(0), h - margin.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bars
    ctx.fillStyle = '#232D4B';
    for (const b of normalized) {
      const bx = xScale(b.x0);
      const bw = xScale(b.x1) - bx;
      const by = yScale(b.density);
      const bh = yScale(0) - by;
      ctx.fillRect(bx + 0.5, by, bw - 1, bh);
    }

    // Legend
    const sd = d3.deviation(heightSamples) || 0;
    const skew = heightSamples.length > 2 ? computeSkewness(heightSamples, mean, sd) : 0;
    const kurt = heightSamples.length > 3 ? computeKurtosis(heightSamples, mean, sd) : 0;
    const { jb, p: jbP } = jarqueBera(heightSamples);
    ctx.font = '11px "franklingothic-book", Arial, sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    const family = familySelect.value;
    const diagIdx = parseInt(diagSlider.value);
    ctx.fillText(
      `${family}, diag ${diagIdx}  ·  n=${heightSamples.length}  ·  sd=${sd.toFixed(3)}  ·  skew=${skew.toFixed(3)}  ·  kurt=${kurt.toFixed(3)}  ·  JB p=${jbP < 0.001 ? jbP.toExponential(1) : jbP.toFixed(3)}`,
      margin.left + 5, margin.top + 12
    );

    // X-axis label
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.font = '11px "franklingothic-book", Arial, sans-serif';
    ctx.fillText('Deviation from mean (h − E[h])', w / 2, h - 2);
  }

  function computeSkewness(data, mean, sd) {
    if (sd === 0 || data.length < 3) return 0;
    const n = data.length;
    let sum3 = 0;
    for (const x of data) sum3 += Math.pow((x - mean) / sd, 3);
    return sum3 / n;
  }

  function computeKurtosis(data, mean, sd) {
    if (sd === 0 || data.length < 4) return 0;
    const n = data.length;
    let sum4 = 0;
    for (const x of data) sum4 += Math.pow((x - mean) / sd, 4);
    return sum4 / n - 3; // excess kurtosis (0 for normal)
  }

  // Jarque-Bera normality test: JB = n/6 * (S² + K²/4)
  // Under H0 (normality), JB ~ χ²(2). p-value from chi-squared CDF.
  function jarqueBera(data) {
    if (data.length < 8) return { jb: 0, p: 1 };
    const n = data.length;
    const mean = d3.mean(data);
    const sd = d3.deviation(data);
    if (!sd || sd === 0) return { jb: 0, p: 1 };
    const S = computeSkewness(data, mean, sd);
    const K = computeKurtosis(data, mean, sd);
    const jb = n / 6 * (S * S + K * K / 4);
    // chi-squared(2) survival function: p = exp(-jb/2)
    const p = Math.exp(-jb / 2);
    return { jb, p };
  }

  // ========== Stats ==========
  function updateStats() {
    if (heightSamples.length === 0) {
      statsBar.innerHTML = 'Samples: 0 &nbsp;|&nbsp; Mean: — &nbsp;|&nbsp; SD: — &nbsp;|&nbsp; Skew: — &nbsp;|&nbsp; Kurt: — &nbsp;|&nbsp; JB: —';
      return;
    }
    const mean = d3.mean(heightSamples);
    const sd = d3.deviation(heightSamples) || 0;
    const skew = heightSamples.length > 2 ? computeSkewness(heightSamples, mean, sd) : 0;
    const kurt = heightSamples.length > 3 ? computeKurtosis(heightSamples, mean, sd) : 0;
    const { jb, p } = jarqueBera(heightSamples);
    const pStr = p < 0.001 ? p.toExponential(1) : p.toFixed(3);
    statsBar.innerHTML =
      `Samples: ${heightSamples.length} &nbsp;|&nbsp; ` +
      `Mean: ${mean.toFixed(3)} &nbsp;|&nbsp; ` +
      `SD: ${sd.toFixed(3)} &nbsp;|&nbsp; ` +
      `Skew: ${skew.toFixed(3)} &nbsp;|&nbsp; ` +
      `Kurt: ${kurt.toFixed(3)} &nbsp;|&nbsp; ` +
      `JB: ${jb.toFixed(2)} (p=${pStr})`;
  }

  // ========== Single Sample ==========
  async function sampleOne(addToHistogram) {
    disableControls(true);
    const n = parseInt(nInput.value);
    const q = parseFloat(qInput.value);
    const x = parseCSV(xParamsField.value);
    const y = parseCSV(yParamsField.value);
    currentN = n;

    if (highPrecisionCb.checked) setHighPrecision(1);
    else setHighPrecision(0);

    // Recreate WASM periodically
    wasmSampleCount++;
    if (wasmSampleCount % 50 === 0) await recreateWasm();

    const partitions = await aztecDiamondSample(n, x, y, q);
    if (!partitions) {
      disableControls(false);
      return;
    }

    lastPartitions = partitions;

    // Build lattice points and dominoes for display
    const { latticePoints, geomDiagonals, bounds } = generateLatticePoints();
    assignSubsets(latticePoints, geomDiagonals, partitions);
    const dominoes = computeDominoes(latticePoints);
    lastDominoes = dominoes;
    lastLatticePoints = latticePoints;
    lastBounds = bounds;

    if (addToHistogram) {
      const diagIdx = parseInt(diagSlider.value);
      const family = familySelect.value;
      const h = extractMeasurement(partitions, diagIdx, family, n);
      heightSamples.push(h);
    }

    renderTiling();
    updateStats();
    drawHistogram();
    disableControls(false);
  }

  // ========== Batch Sampling ==========
  async function runBatch() {
    if (isBatching) {
      batchCancelRequested = true;
      return;
    }
    isBatching = true;
    batchCancelRequested = false;
    disableControls(true);
    batchBtn.disabled = false;
    batchBtn.textContent = 'Stop';
    progressArea.style.display = 'block';

    const n = parseInt(nInput.value);
    const q = parseFloat(qInput.value);
    const x = parseCSV(xParamsField.value);
    const y = parseCSV(yParamsField.value);
    const count = parseInt(batchInput.value);
    const diagIdx = parseInt(diagSlider.value);
    const family = familySelect.value;
    currentN = n;

    if (highPrecisionCb.checked) setHighPrecision(1);
    else setHighPrecision(0);

    let completed = 0;
    const startTime = performance.now();
    let lastYield = startTime;
    let lastTilingUpdate = 0;

    // Recreate WASM at start of batch
    await recreateWasm();

    while (completed < count && !batchCancelRequested) {
      const partitions = await aztecDiamondSample(n, x, y, q);
      if (!partitions) {
        // Try recreating WASM on failure
        await recreateWasm();
        continue;
      }

      const h = extractMeasurement(partitions, diagIdx, family, n);
      heightSamples.push(h);
      completed++;
      wasmSampleCount++;

      // Recreate WASM every 50 samples to prevent OOM
      if (wasmSampleCount % 50 === 0) await recreateWasm();

      const now = performance.now();
      if (now - lastYield > 80 || completed === count) {
        const pct = Math.round((completed / count) * 100);
        progressFill.style.width = pct + '%';
        const elapsed = (now - startTime) / 1000;
        const rate = completed / elapsed;
        const remaining = (count - completed) / rate;
        const sd = heightSamples.length > 1 ? d3.deviation(heightSamples) : 0;
        progressText.textContent =
          `${completed}/${count} · ${rate.toFixed(1)}/s · ~${Math.ceil(remaining)}s left · sd: ${(sd || 0).toFixed(3)}`;

        // Save last partitions for display after batch completes
        lastBatchPartitions = partitions;

        updateStats();
        drawHistogram();
        await new Promise(r => requestAnimationFrame(r));
        lastYield = performance.now();
      }
    }

    isBatching = false;
    batchCancelRequested = false;
    batchBtn.textContent = 'Run Batch';
    progressArea.style.display = 'none';
    disableControls(false);

    // Build tiling display from last sample
    if (lastBatchPartitions) {
      lastPartitions = lastBatchPartitions;
      const { latticePoints, geomDiagonals, bounds } = generateLatticePoints();
      assignSubsets(latticePoints, geomDiagonals, lastBatchPartitions);
      lastDominoes = computeDominoes(latticePoints);
      lastLatticePoints = latticePoints;
      lastBounds = bounds;
      renderTiling();
    }

    updateStats();
    drawHistogram();
  }

  function disableControls(disabled) {
    nInput.disabled = disabled;
    qInput.disabled = disabled;
    xParamsField.disabled = disabled;
    yParamsField.disabled = disabled;
    highPrecisionCb.disabled = disabled;
    familySelect.disabled = disabled;
    diagSlider.disabled = disabled;
    batchInput.disabled = disabled;
    sampleBtn.disabled = disabled;
    clearBtn.disabled = disabled;
  }

  // ========== Event Handlers ==========
  sampleBtn.addEventListener('click', () => sampleOne(true));
  batchBtn.addEventListener('click', runBatch);
  clearBtn.addEventListener('click', () => {
    heightSamples = [];
    updateStats();
    drawHistogram();
  });

  nInput.addEventListener('change', () => {
    const n = parseInt(nInput.value);
    currentN = n;
    diagSlider.max = 2 * n;
    diagSlider.value = n;
    diagLabel.textContent = 'k=' + n;
    updateParamsForN(n);
    heightSamples = [];
    updateStats();
    drawHistogram();
  });

  diagSlider.addEventListener('input', () => {
    diagLabel.textContent = 'k=' + diagSlider.value;
    renderTiling();
  });

  showPathsCb.addEventListener('change', renderTiling);
  showTilingCb.addEventListener('change', renderTiling);
  familySelect.addEventListener('change', () => {
    heightSamples = [];
    updateStats();
    drawHistogram();
    renderTiling();
  });

  // ========== Init ==========
  updateParamsForN(currentN);
  diagSlider.max = 2 * currentN;
  diagSlider.value = currentN;
  diagLabel.textContent = 'k=' + currentN;
  renderTiling();
  drawHistogram();
}

initializeApp();
</script>
