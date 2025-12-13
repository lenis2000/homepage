---
title: T-embeddings of the Aztec diamond with arbitrary weights
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md'
    txt: 'JavaScript implementation'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.cpp'
    txt: 'C++ source (WASM)'
---

<p style="font-size: 0.9em; color: #555; margin-bottom: 15px;">
<b>Acknowledgement:</b> Developed during the reunion conference for the <a href="https://www.ipam.ucla.edu/programs/long-programs/geometry-statistical-mechanics-and-integrability/">IPAM long program on Geometry, Statistical Mechanics, and Integrability</a> (December 2025).
I thank Mikhail Basok, Dmitry Chelkak, and Marianna Russkikh for helpful discussions.
</p>

<details style="margin-bottom: 15px;">
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #f0f8ff; border: 1px solid #9cf;">Definition of Perfect T-embedding</summary>
  <div style="margin-top: 10px; padding: 15px; background: #fff; border: 1px solid #ddd; font-size: 14px; line-height: 1.6;">

<p>The notion of a <em>t-embedding</em> (also known as a <em>Coulomb gauge</em>) was introduced in
<a href="https://arxiv.org/abs/1810.05616">[KLRR]</a> and further developed in
<a href="https://arxiv.org/abs/2001.11871">[CLR1]</a>, <a href="https://arxiv.org/abs/2109.06272">[CLR2]</a>.</p>

<h5>Definition (T-embedding)</h5>
<p>Let $\mathcal{G}$ be a weighted, finite, bipartite, planar graph with a marked outer face $f_{\mathrm{out}}$,
and let $\mathcal{G}^*$ denote its <em>augmented dual graph</em>. A <strong>t-embedding</strong> of $\mathcal{G}$ is an
embedding $\mathcal{T}: \mathcal{G}^* \to \mathbb{C}$ such that:</p>
<ol type="a">
  <li>$\mathcal{T}$ is a proper embedding: edges are non-degenerate straight segments, inner faces are convex and do not overlap;</li>
  <li><strong>Angle condition:</strong> For each inner vertex $v^*$ of $\mathcal{T}(\mathcal{G}^*)$, the sum of angles at corners corresponding to black faces equals $\pi$ (and similarly for white faces);</li>
  <li><strong>Weight condition:</strong> For each inner face $f$ of $\mathcal{G}$ with face weight $X_f$, if $v^*$ denotes the corresponding dual vertex with neighbors $v^*_1, \ldots, v^*_{2d}$ listed in counterclockwise order, then
    $$X_f = (-1)^{d+1} \prod_{k=1}^d \frac{\mathcal{T}(v^*) - \mathcal{T}(v^*_{2k-1})}{\mathcal{T}(v^*_{2k}) - \mathcal{T}(v^*)}.$$
  </li>
</ol>

<h5>Definition (Perfect T-embedding) <a href="https://arxiv.org/abs/2109.06272">[CLR2]</a></h5>
<p>A t-embedding $\mathcal{T}$ of a finite weighted planar bipartite graph $\mathcal{G}$ is called
<strong>perfect</strong> if the following additional boundary conditions are satisfied:</p>
<ol type="i">
  <li>The outer face of $\mathcal{T}(\mathcal{G}^*)$ is a <em>tangential polygon</em>, i.e., it admits an inscribed circle;</li>
  <li>For each outer vertex $v_k$ of $\mathcal{G}^*$, the edge connecting $v_k$ to its unique inner neighbor $v_{\mathrm{in},k}$ lies on the <em>angle bisector</em> of the corresponding corner of the tangential polygon. Equivalently, the line containing this edge passes through the center of the inscribed circle.</li>
</ol>

<h5>Definition (Face weight)</h5>
<p>Given edge weights $\chi$ on a bipartite graph $\mathcal{G}$, one can associate a <strong>face weight</strong> $X_{v^*}$ to each face of $\mathcal{G}$ by
$$X_{v^*}:=\prod_{s=1}^d\frac{\chi_{b_s w_s}}{\chi_{b_s w_{s+1}}},$$
where the face $v^*$ has degree $2d$ with vertices denoted by $w_1, b_1, \ldots , w_d, b_d$ in counterclockwise order (white vertices $w_i$, black vertices $b_i$, and $w_{d+1}:=w_1$).</p>

<h5>References</h5>
<ul style="font-size: 13px;">
  <li><strong>[CLR2]</strong> D. Chelkak, B. Laslier, M. Russkikh. <em>Bipartite dimer model: perfect t-embeddings and Lorentz-minimal surfaces.</em> <a href="https://arxiv.org/abs/2109.06272">arXiv:2109.06272</a> (2021).</li>
  <li><strong>[CLR1]</strong> D. Chelkak, B. Laslier, M. Russkikh. <em>Dimer model and holomorphic functions on t-embeddings of planar graphs.</em> Proc. Lond. Math. Soc. 126(5):1656–1739 (2023). <a href="https://arxiv.org/abs/2001.11871">arXiv:2001.11871</a>.</li>
  <li><strong>[KLRR]</strong> R. Kenyon, W. Y. Lam, S. Ramassamy, M. Russkikh. <em>Dimers and circle patterns.</em> Ann. Sci. Éc. Norm. Supér. 55(3):863–901 (2022). <a href="https://arxiv.org/abs/1810.05616">arXiv:1810.05616</a>.</li>
</ul>

  </div>
</details>

<div style="margin-bottom: 10px;">
  <label>n: <input id="n-input" type="number" value="4" min="1" max="15" style="width: 60px;"></label>
  <button id="compute-btn" style="margin-left: 10px;">Compute T-embedding</button>
  <button id="randomize-weights-btn" style="margin-left: 10px;">Randomize weights</button>
</div>

<div id="loading-msg" style="display: none; padding: 10px; background: #ffe; border: 1px solid #cc0; margin-bottom: 10px;">
  Loading WASM module...
</div>

<details id="stepwise-section" style="margin-top: 15px;" open>
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #e8f4e8; border: 1px solid #9c9;">Step-by-step visualization</summary>
  <div style="margin-top: 10px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">
    <!-- Side-by-side layout -->
    <div style="display: flex; flex-wrap: wrap; gap: 20px;">
      <!-- LEFT: Aztec diamond graph -->
      <div style="flex: 1; min-width: 350px;">
        <div style="margin-bottom: 10px; text-align: center;">
          <button id="aztec-down-btn" style="width: 60px;">←</button>
          <button id="aztec-up-btn" style="width: 60px; margin-left: 10px;">→</button>
          <label style="margin-left: 15px;"><input type="checkbox" id="show-aztec-weights-chk" checked> Weights</label>
          <label style="margin-left: 15px;"><input type="checkbox" id="show-face-weights-chk"> Faces</label>
        </div>
        <canvas id="aztec-graph-canvas" style="width: 100%; height: 50vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>
        <div id="aztec-vertex-info" style="margin-top: 5px; padding: 8px; background: #fff; border: 1px solid #ddd; min-height: 30px; font-family: monospace; font-size: 12px;">
          <em>Click on a vertex to see its coordinates</em>
        </div>
      </div>

      <!-- RIGHT: T-embedding canvas -->
      <div style="flex: 1; min-width: 350px;">
        <div style="margin-bottom: 10px;">
          <button id="step-prev-btn" style="width: 30px;">&lt;</button>
          <span style="margin: 0 10px;">k = <span id="step-value">0</span></span>
          <button id="step-next-btn" style="width: 30px;">&gt;</button>
          <span id="step-info" style="margin-left: 10px; color: #666;">(T_0 graph)</span>
          <label style="margin-left: 15px;"><input type="checkbox" id="show-labels-chk" checked> Labels</label>
        </div>
        <canvas id="stepwise-temb-canvas" style="width: 100%; height: 50vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>
        <div id="vertex-info" style="margin-top: 5px; padding: 8px; background: #fff; border: 1px solid #ddd; min-height: 30px; font-family: monospace; font-size: 12px;">
          <em>T_k from face weights (step through Aztec reduction first)</em>
        </div>
        <div id="mathematica-output" style="margin-top: 5px; padding: 8px; background: #f5f5f5; border: 1px solid #ccc; min-height: 30px; font-family: monospace; font-size: 11px; white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
          <em>Mathematica output will appear here</em>
        </div>
      </div>
    </div>
  </div>
</details>

<style>
#stepwise-temb-canvas.panning, #aztec-graph-canvas.panning { cursor: grabbing; }
</style>

<script src="/js/2025-12-11-t-embedding-arbitrary-weights.js"></script>

<script>
(function() {
  const loadingMsg = document.getElementById('loading-msg');
  const stepwiseCanvas = document.getElementById('stepwise-temb-canvas');
  const stepwiseCtx = stepwiseCanvas.getContext('2d');
  const aztecCanvas = document.getElementById('aztec-graph-canvas');
  const aztecCtx = aztecCanvas.getContext('2d');

  // T-embedding data
  let tembData = null;
  let wasmReady = false;

  // WASM function wrappers
  let setN, initCoefficients, computeTembedding, getTembeddingJSON, freeString;
  let generateAztecGraph, getAztecGraphJSON, getAztecFacesJSON, getStoredFaceWeightsJSON, getTembeddingLevelJSON;
  let randomizeAztecWeights, setAztecGraphLevel;
  let aztecGraphStepDown, aztecGraphStepUp, getAztecReductionStep, canAztecStepUp, canAztecStepDown;

  // Classify face type based on centroid coordinates and current face count
  // Returns: {type: 'ROOT'|'alpha_top'|'alpha_bottom'|'alpha_left'|'alpha_right'|'beta'|'gamma', k: number, i: number, j: number}
  function classifyFace(cx, cy, numFaces) {
    // Determine k from face count: numFaces = 2k² + 2k + 1
    // Solve: k = (-1 + sqrt(2*numFaces - 1)) / 2
    let k = -1;
    for (let testK = 0; testK <= 20; testK++) {
      if (2*testK*testK + 2*testK + 1 === numFaces) {
        k = testK;
        break;
      }
    }

    // Use raw coordinates for classification (may be non-integer)
    const i = Math.round(cx);
    const j = Math.round(cy);
    const absI = Math.abs(cx);
    const absJ = Math.abs(cy);
    const absSumRaw = absI + absJ;
    const absSum = Math.abs(i) + Math.abs(j);

    if (k < 0) return {type: 'unknown', k: -1, i, j};

    // For k=0, only ROOT (single face near origin)
    if (k === 0) {
      return {type: 'ROOT', k: 0, i, j};
    }

    // For k >= 1, classify based on position
    // Alpha: on axes, at distance k from origin (|i|+|j| ≈ k with i≈0 or j≈0)
    const tol = 0.6;
    if (absI < tol && absJ > k - tol) {
      return {type: cy > 0 ? 'alpha_top' : 'alpha_bottom', k, i, j};
    }
    if (absJ < tol && absI > k - tol) {
      return {type: cx > 0 ? 'alpha_right' : 'alpha_left', k, i, j};
    }

    // Beta: diagonal positions, |i|+|j| ≈ k, both i and j non-zero
    if (Math.abs(absSumRaw - k) < tol && absI > tol && absJ > tol) {
      return {type: 'beta', k, i, j};
    }

    // Gamma: inner positions, |i|+|j| < k
    if (absSumRaw < k - tol) {
      return {type: 'gamma', k, i, j};
    }

    // If close to boundary but not matching other types, likely beta
    if (Math.abs(absSumRaw - k) < 1.0) {
      return {type: 'beta', k, i, j};
    }

    return {type: 'unknown', k, i, j};
  }

  // T-embedding from face weights state
  let currentTembLevelData = null;  // Data from getTembeddingLevelJSON
  let tembFromFaceWeightsK = -1;    // Current k level computed

  // Check if face count corresponds to a checkpoint: numFaces = 2k² + 2k + 1
  function faceCountToK(numFaces) {
    for (let k = 0; k <= 20; k++) {
      if (2*k*k + 2*k + 1 === numFaces) return k;
    }
    return -1;  // Not a checkpoint
  }

  // Render T-embedding level from face weights on stepwise canvas
  function renderTembFromFaceWeights() {
    const dpr = window.devicePixelRatio || 1;
    const rect = stepwiseCanvas.getBoundingClientRect();
    stepwiseCanvas.width = rect.width * dpr;
    stepwiseCanvas.height = rect.height * dpr;
    stepwiseCtx.scale(dpr, dpr);

    stepwiseCtx.fillStyle = '#fafafa';
    stepwiseCtx.fillRect(0, 0, rect.width, rect.height);

    if (!currentTembLevelData || !currentTembLevelData.vertices || currentTembLevelData.vertices.length === 0) {
      stepwiseCtx.fillStyle = '#666';
      stepwiseCtx.font = '14px sans-serif';
      stepwiseCtx.textAlign = 'center';
      const msg = tembFromFaceWeightsK >= 0 ?
        `T_${tembFromFaceWeightsK} not yet computed` :
        'Not at a weight checkpoint';
      stepwiseCtx.fillText(msg, rect.width / 2, rect.height / 2);
      return;
    }

    const vertices = currentTembLevelData.vertices;
    const k = currentTembLevelData.k;

    // Find bounds
    let minRe = Infinity, maxRe = -Infinity;
    let minIm = Infinity, maxIm = -Infinity;
    for (const v of vertices) {
      minRe = Math.min(minRe, v.re);
      maxRe = Math.max(maxRe, v.re);
      minIm = Math.min(minIm, v.im);
      maxIm = Math.max(maxIm, v.im);
    }

    const rangeRe = maxRe - minRe || 1;
    const rangeIm = maxIm - minIm || 1;
    const centerRe = (minRe + maxRe) / 2;
    const centerIm = (minIm + maxIm) / 2;

    const padding = 60;
    const scaleX = (rect.width - 2 * padding) / rangeRe;
    const scaleY = (rect.height - 2 * padding) / rangeIm;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * stepwiseZoom;

    const cx = rect.width / 2 + stepwisePanX * stepwiseZoom;
    const cy = rect.height / 2 + stepwisePanY * stepwiseZoom;

    stepwiseCtx.save();
    stepwiseCtx.translate(cx, cy);

    // Create vertex map by (i,j)
    const vertexMap = {};
    for (const v of vertices) {
      vertexMap[`${v.i},${v.j}`] = v;
    }

    // Draw edges based on T_k structure
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = Math.max(1, scale / 80);

    function drawTembEdge(i1, j1, i2, j2) {
      const v1 = vertexMap[`${i1},${j1}`];
      const v2 = vertexMap[`${i2},${j2}`];
      if (v1 && v2) {
        stepwiseCtx.beginPath();
        stepwiseCtx.moveTo((v1.re - centerRe) * scale, -(v1.im - centerIm) * scale);
        stepwiseCtx.lineTo((v2.re - centerRe) * scale, -(v2.im - centerIm) * scale);
        stepwiseCtx.stroke();
      }
    }

    // Draw T_k edges - same logic as renderStepwiseTemb
    // Interior lattice edges
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = Math.max(1, scale / 80);

    for (const v of vertices) {
      const ii = v.i, jj = v.j;
      const absSum = Math.abs(ii) + Math.abs(jj);

      if (vertexMap[`${ii+1},${jj}`]) {
        const nAbsSum = Math.abs(ii+1) + Math.abs(jj);
        if (absSum <= k && nAbsSum <= k) {
          drawTembEdge(ii, jj, ii+1, jj);
        }
      }
      if (vertexMap[`${ii},${jj+1}`]) {
        const nAbsSum = Math.abs(ii) + Math.abs(jj+1);
        if (absSum <= k && nAbsSum <= k) {
          drawTembEdge(ii, jj, ii, jj+1);
        }
      }
    }

    // Boundary rhombus
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = Math.max(0.3, scale / 300);  // uniform thickness
    drawTembEdge(k+1, 0, 0, k+1);
    drawTembEdge(0, k+1, -(k+1), 0);
    drawTembEdge(-(k+1), 0, 0, -(k+1));
    drawTembEdge(0, -(k+1), k+1, 0);

    // External corners to alpha
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = Math.max(0.3, scale / 300);  // uniform thickness
    drawTembEdge(k+1, 0, k, 0);
    drawTembEdge(-(k+1), 0, -k, 0);
    drawTembEdge(0, k+1, 0, k);
    drawTembEdge(0, -(k+1), 0, -k);

    // Diagonal boundary
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = Math.max(0.3, scale / 300);  // uniform thickness
    for (let s = 0; s < k; s++) {
      drawTembEdge(k-s, s, k-s-1, s+1);
      drawTembEdge(-s, k-s, -(s+1), k-s-1);
      drawTembEdge(-(k-s), -s, -(k-s-1), -(s+1));
      drawTembEdge(s, -(k-s), s+1, -(k-s-1));
    }

    // Draw vertices
    const vertexRadius = Math.max(0.5, scale / 800);  // 20x smaller
    for (const v of vertices) {
      const x = (v.re - centerRe) * scale;
      const y = -(v.im - centerIm) * scale;  // Flip y for standard math orientation

      stepwiseCtx.beginPath();
      stepwiseCtx.arc(x, y, vertexRadius, 0, Math.PI * 2);
      stepwiseCtx.fillStyle = (v.i === 0 && v.j === 0) ? '#ff0000' : '#000';
      stepwiseCtx.fill();

      // Label vertices
      stepwiseCtx.fillStyle = '#333';
      stepwiseCtx.font = `${Math.max(10, scale / 15)}px sans-serif`;
      stepwiseCtx.textAlign = 'center';
      stepwiseCtx.textBaseline = 'bottom';
      const label = `(${v.i},${v.j})`;
      stepwiseCtx.fillText(label, x, y - vertexRadius - 2);
    }

    stepwiseCtx.restore();

    // Title
    stepwiseCtx.fillStyle = '#333';
    stepwiseCtx.font = '14px sans-serif';
    stepwiseCtx.textAlign = 'left';
    stepwiseCtx.fillText(`T_${k} from face weights`, 10, 20);
  }

  // Update T-embedding display based on current face count
  function updateTembFromFaceWeights() {
    if (!wasmReady || !getTembeddingLevelJSON) {
      currentTembLevelData = null;
      tembFromFaceWeightsK = -1;
      renderTembFromFaceWeights();
      return;
    }

    // Get face count from the current Aztec graph
    let ptr = getAztecFacesJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    let facesData = JSON.parse(jsonStr);
    const numFaces = facesData.faces ? facesData.faces.length : 0;

    const k = faceCountToK(numFaces);
    tembFromFaceWeightsK = k;

    if (k >= 0) {
      // At a checkpoint - compute T_k
      ptr = getTembeddingLevelJSON(k);
      jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);
      currentTembLevelData = JSON.parse(jsonStr);
    } else {
      currentTembLevelData = null;
    }

    renderTembFromFaceWeights();
  }

  // T-embedding k level state (for face weights based T_k)
  let currentK = 0;
  let maxK = 0;  // Updated based on stored face weights

  // Vertex selection state
  let selectedVertex = null;
  let highlightedDeps = new Set();
  let vertexScreenPositions = [];

  // T-embedding vertex screen positions for click detection
  let tembVertexScreenPositions = [];
  let tembCurrentVertices = [];  // Store current vertices data

  // Canvas pan/zoom for T-embedding
  let stepwiseZoom = 1.0;
  let stepwisePanX = 0, stepwisePanY = 0;
  let stepwiseIsPanning = false;
  let stepwiseLastPanX = 0, stepwiseLastPanY = 0;

  // ========== AZTEC DIAMOND GRAPH STATE ==========
  let aztecLevel = 3;
  let aztecReductionStep = 0;  // 0=original, 1=gauge, 2=contracted, 3=finalized
  let aztecVertices = [];
  let aztecEdges = [];
  let aztecBlackQuadCenters = [];  // Centers of black quads (for shading at step 8+)
  let aztecZoom = 1.4;
  let aztecPanX = 0, aztecPanY = 0;
  let aztecIsPanning = false;
  let aztecDidPan = false;
  let aztecLastPanX = 0, aztecLastPanY = 0;
  let aztecVertexScreenPositions = [];
  let aztecEdgeScreenPositions = [];
  let aztecFaceScreenPositions = [];
  let selectedAztecVertex = null;
  let selectedAztecEdge = null;
  let selectedAztecFace = null;

  // Generate random weight from 0.5 to 2.0 with step 0.1
  function randomWeight() {
    const steps = Math.floor(Math.random() * 16); // 0-15 steps
    return 0.5 + steps * 0.1;
  }

  // Generate Aztec diamond graph vertices for level k
  function generateAztecVertices(k) {
    const vertices = [];
    // Vertices at half-integer coordinates where |x| + |y| <= k + 0.5
    for (let i = -k; i <= k; i++) {
      for (let j = -k; j <= k; j++) {
        const x = i + 0.5;
        const y = j + 0.5;
        if (Math.abs(x) + Math.abs(y) <= k + 0.5) {
          // Bipartite coloring depends on i + j + k
          const isWhite = ((i + j + k) % 2 === 0);
          vertices.push({ x, y, isWhite, key: `${x},${y}` });
        }
      }
    }
    return vertices;
  }

  // Generate edges between adjacent vertices
  function generateAztecEdges(vertices) {
    const vertexSet = new Set(vertices.map(v => v.key));
    const edges = [];

    for (const v of vertices) {
      // Right neighbor (x+1, y)
      const rightKey = `${v.x + 1},${v.y}`;
      if (vertexSet.has(rightKey)) {
        edges.push({
          x1: v.x, y1: v.y,
          x2: v.x + 1, y2: v.y,
          weight: randomWeight(),
          key: `h:${v.x},${v.y}`
        });
      }
      // Top neighbor (x, y+1)
      const topKey = `${v.x},${v.y + 1}`;
      if (vertexSet.has(topKey)) {
        edges.push({
          x1: v.x, y1: v.y,
          x2: v.x, y2: v.y + 1,
          weight: randomWeight(),
          key: `v:${v.x},${v.y}`
        });
      }
    }
    return edges;
  }

  // Compute face weights for all faces in the Aztec diamond
  // Face weight formula: X = (w1→b1 × w2→b2) / (w2→b1 × w1→b2)
  // where w1, b1, w2, b2 are vertices in clockwise order starting from white
  function computeFaceWeights() {
    if (aztecVertices.length === 0 || aztecEdges.length === 0) return [];

    // Build vertex lookup map: "x,y" -> vertex object
    const vertexMap = new Map();
    for (const v of aztecVertices) {
      vertexMap.set(`${v.x},${v.y}`, v);
    }

    // Build edge lookup map: canonical key -> edge weight
    const edgeMap = new Map();
    for (const e of aztecEdges) {
      // Canonical key: smaller coordinate pair first
      const key = e.x1 < e.x2 || (e.x1 === e.x2 && e.y1 < e.y2)
        ? `${e.x1},${e.y1}-${e.x2},${e.y2}`
        : `${e.x2},${e.y2}-${e.x1},${e.y1}`;
      edgeMap.set(key, e.weight);
    }

    // Helper to get edge weight between two vertices
    function getEdgeWeight(x1, y1, x2, y2) {
      const key = x1 < x2 || (x1 === x2 && y1 < y2)
        ? `${x1},${y1}-${x2},${y2}`
        : `${x2},${y2}-${x1},${y1}`;
      return edgeMap.get(key);
    }

    const faceWeights = [];
    const k = aztecLevel;

    // Iterate over all possible face positions (integer coordinates)
    for (let i = -k; i < k; i++) {
      for (let j = -k; j < k; j++) {
        // Face corners at half-integer coordinates
        const blX = i + 0.5, blY = j + 0.5;      // bottom-left
        const brX = i + 1.5, brY = j + 0.5;      // bottom-right
        const tlX = i + 0.5, tlY = j + 1.5;      // top-left
        const trX = i + 1.5, trY = j + 1.5;      // top-right

        // Check if all 4 vertices exist
        const blV = vertexMap.get(`${blX},${blY}`);
        const brV = vertexMap.get(`${brX},${brY}`);
        const tlV = vertexMap.get(`${tlX},${tlY}`);
        const trV = vertexMap.get(`${trX},${trY}`);

        if (!blV || !brV || !tlV || !trV) continue;

        // Check if all 4 edges exist
        const bottom = getEdgeWeight(blX, blY, brX, brY);
        const right = getEdgeWeight(brX, brY, trX, trY);
        const top = getEdgeWeight(tlX, tlY, trX, trY);
        const left = getEdgeWeight(blX, blY, tlX, tlY);

        if (bottom === undefined || right === undefined ||
            top === undefined || left === undefined) continue;

        // Compute face weight based on which diagonal is white
        // BL and TR have same parity, BR and TL have same parity
        let faceWeight;
        if (blV.isWhite) {
          // Type A: white at BL/TR, clockwise from BL: w1=BL, b1=BR, w2=TR, b2=TL
          // X = (w1→b1 × w2→b2) / (w2→b1 × w1→b2) = (bottom × top) / (right × left)
          faceWeight = (bottom * top) / (right * left);
        } else {
          // Type B: white at BR/TL, clockwise from BR: w1=BR, b1=TR, w2=TL, b2=BL
          // X = (w1→b1 × w2→b2) / (w2→b1 × w1→b2) = (right × left) / (top × bottom)
          faceWeight = (right * left) / (top * bottom);
        }

        // Compute centroid (at integer coordinates i+1, j+1)
        const cx = (blX + brX + tlX + trX) / 4;
        const cy = (blY + brY + tlY + trY) / 4;

        // Store face with index coordinates and type
        faceWeights.push({
          cx, cy,
          weight: faceWeight,
          faceI: i,           // Face index (BL corner at i+0.5, j+0.5)
          faceJ: j,
          isTypeA: blV.isWhite  // Type A if BL is white
        });
      }
    }

    return faceWeights;
  }

  // Initialize Aztec graph (calls C++ via WASM)
  function initAztecGraph(k) {
    if (!wasmReady) {
      // Fallback to JS generation if WASM not ready
      aztecLevel = k;
      aztecVertices = generateAztecVertices(k);
      aztecEdges = generateAztecEdges(aztecVertices);
      updateAztecUI();
      renderAztecGraph();
      return;
    }

    // Generate graph in C++
    generateAztecGraph(k);

    // Get JSON from C++
    let ptr = getAztecGraphJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    let graphData = JSON.parse(jsonStr);

    aztecLevel = graphData.level;
    aztecReductionStep = graphData.reductionStep || 0;
    aztecVertices = graphData.vertices;
    aztecBlackQuadCenters = graphData.blackQuadCenters || [];

    // Convert edges from index-based to coordinate-based for rendering
    aztecEdges = graphData.edges.map(e => ({
      x1: aztecVertices[e.v1].x,
      y1: aztecVertices[e.v1].y,
      x2: aztecVertices[e.v2].x,
      y2: aztecVertices[e.v2].y,
      weight: e.weight,
      isHorizontal: e.isHorizontal,
      gaugeTransformed: e.gaugeTransformed || false
    }));

    updateAztecUI();
    renderAztecGraph();
  }

  // Update Aztec UI state (button states)
  function updateAztecUI() {
    // Update button states
    if (wasmReady) {
      document.getElementById('aztec-up-btn').disabled = !canAztecStepUp();
      document.getElementById('aztec-down-btn').disabled = !canAztecStepDown();
    }
  }

  // Refresh Aztec graph state from C++
  function refreshAztecFromCpp() {
    let ptr = getAztecGraphJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    let graphData = JSON.parse(jsonStr);

    aztecLevel = graphData.level;
    aztecReductionStep = graphData.reductionStep || 0;
    aztecVertices = graphData.vertices;
    aztecBlackQuadCenters = graphData.blackQuadCenters || [];
    aztecEdges = graphData.edges.map(e => ({
      x1: aztecVertices[e.v1].x,
      y1: aztecVertices[e.v1].y,
      x2: aztecVertices[e.v2].x,
      y2: aztecVertices[e.v2].y,
      weight: e.weight,
      isHorizontal: e.isHorizontal,
      gaugeTransformed: e.gaugeTransformed || false
    }));

    updateAztecUI();
    renderAztecGraph();
  }

  // Render Aztec diamond graph
  function renderAztecGraph() {
    const dpr = window.devicePixelRatio || 1;
    const rect = aztecCanvas.getBoundingClientRect();
    aztecCanvas.width = rect.width * dpr;
    aztecCanvas.height = rect.height * dpr;
    aztecCtx.scale(dpr, dpr);

    aztecCtx.fillStyle = '#fafafa';
    aztecCtx.fillRect(0, 0, rect.width, rect.height);

    if (aztecVertices.length === 0) return;

    const k = aztecLevel;
    const padding = 40;
    const range = 2 * k + 2;
    const baseScale = Math.min(rect.width - 2 * padding, rect.height - 2 * padding) / range;
    const scale = baseScale * aztecZoom;

    const cx = rect.width / 2 + aztecPanX * aztecZoom;
    const cy = rect.height / 2 + aztecPanY * aztecZoom;

    aztecCtx.save();
    aztecCtx.translate(cx, cy);

    const showWeights = document.getElementById('show-aztec-weights-chk').checked;

    // Draw shaded black quads (faces containing purple stars)
    if (aztecReductionStep >= 6) {
      // For each black quad center, find the 4 closest vertices and draw as quad
      for (const center of aztecBlackQuadCenters) {
        // Get all vertices with their distances to center
        const vertsWithDist = aztecVertices.map(v => ({
          x: v.x, y: v.y,
          dist: Math.hypot(v.x - center.x, v.y - center.y)
        }));

        // Sort by distance and take the 4 closest
        vertsWithDist.sort((a, b) => a.dist - b.dist);
        const quadVerts = vertsWithDist.slice(0, 4);

        // Sort by angle around center to get correct winding order
        quadVerts.sort((a, b) => {
          const angleA = Math.atan2(a.y - center.y, a.x - center.x);
          const angleB = Math.atan2(b.y - center.y, b.x - center.x);
          return angleA - angleB;
        });

        // Draw the shaded quad
        aztecCtx.fillStyle = 'rgba(100, 100, 100, 0.35)';
        aztecCtx.beginPath();
        aztecCtx.moveTo(quadVerts[0].x * scale, -quadVerts[0].y * scale);
        for (let i = 1; i < quadVerts.length; i++) {
          aztecCtx.lineTo(quadVerts[i].x * scale, -quadVerts[i].y * scale);
        }
        aztecCtx.closePath();
        aztecCtx.fill();
      }

      // Draw purple stars at black quad centers
      const drawStar = (cx, cy, r, points) => {
        aztecCtx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? r : r * 0.4;
          const angle = (i * Math.PI / points) - Math.PI / 2;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          if (i === 0) aztecCtx.moveTo(x, y);
          else aztecCtx.lineTo(x, y);
        }
        aztecCtx.closePath();
      };

      for (const center of aztecBlackQuadCenters) {
        const sx = center.x * scale;
        const sy = -center.y * scale;
        aztecCtx.fillStyle = 'rgba(128, 0, 128, 0.8)';
        drawStar(sx, sy, 8, 5);
        aztecCtx.fill();
        aztecCtx.strokeStyle = '#400040';
        aztecCtx.lineWidth = 1;
        aztecCtx.stroke();
      }
    }

    // Draw edges and store positions for click detection
    // Group edges by vertex pair to detect multi-edges
    const edgeGroups = new Map();
    for (let i = 0; i < aztecEdges.length; i++) {
      const e = aztecEdges[i];
      // Create canonical key for the vertex pair
      const key = e.x1 < e.x2 || (e.x1 === e.x2 && e.y1 < e.y2)
        ? `${e.x1},${e.y1}-${e.x2},${e.y2}`
        : `${e.x2},${e.y2}-${e.x1},${e.y1}`;
      if (!edgeGroups.has(key)) edgeGroups.set(key, []);
      edgeGroups.get(key).push({idx: i, edge: e});
    }

    aztecEdgeScreenPositions = [];


    for (const [key, edges] of edgeGroups) {
      const numEdges = edges.length;

      for (let j = 0; j < numEdges; j++) {
        const {idx, edge: e} = edges[j];

        // Highlight gauge-transformed edges
        if (e.gaugeTransformed) {
          aztecCtx.strokeStyle = '#ff6600';
          aztecCtx.lineWidth = Math.max(2, scale / 15);
        } else {
          aztecCtx.strokeStyle = '#333';
          aztecCtx.lineWidth = Math.max(1, scale / 30);
        }

        const x1 = e.x1 * scale, y1 = -e.y1 * scale;
        const x2 = e.x2 * scale, y2 = -e.y2 * scale;

        aztecCtx.beginPath();

        if (numEdges === 1) {
          // Single edge: draw straight line
          aztecCtx.moveTo(x1, y1);
          aztecCtx.lineTo(x2, y2);
        } else {
          // Multi-edge: draw as curved arc
          // Use consistent direction (normalize so "smaller" endpoint is first)
          let ex1 = x1, ey1 = y1, ex2 = x2, ey2 = y2;
          if (x1 > x2 || (x1 === x2 && y1 > y2)) {
            ex1 = x2; ey1 = y2; ex2 = x1; ey2 = y1;
          }
          const dx = ex2 - ex1, dy = ey2 - ey1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 0.001) {
            // Skip degenerate edges
            aztecCtx.moveTo(x1, y1);
            aztecCtx.lineTo(x2, y2);
          } else {
            const perpX = -dy / len, perpY = dx / len;

            // Distribute curves symmetrically around the straight line
            const curveOffset = (j - (numEdges - 1) / 2) * Math.max(32, scale * 0.8);
            const ctrlX = (ex1 + ex2) / 2 + perpX * curveOffset;
            const ctrlY = (ey1 + ey2) / 2 + perpY * curveOffset;

            // Draw curved edge with distinct color for visibility
            aztecCtx.strokeStyle = ['#ff0000', '#0000ff', '#00ff00', '#ff00ff'][j % 4];
            aztecCtx.lineWidth = 3;

            aztecCtx.moveTo(x1, y1);
            aztecCtx.quadraticCurveTo(ctrlX, ctrlY, x2, y2);
          }
        }
        aztecCtx.stroke();

        // Compute midpoint (on curve for multi-edges)
        let midX, midY;
        if (numEdges === 1) {
          midX = (x1 + x2) / 2;
          midY = (y1 + y2) / 2;
        } else {
          // Use same normalized direction as curve drawing
          let ex1 = x1, ey1 = y1, ex2 = x2, ey2 = y2;
          if (x1 > x2 || (x1 === x2 && y1 > y2)) {
            ex1 = x2; ey1 = y2; ex2 = x1; ey2 = y1;
          }
          const dx = ex2 - ex1, dy = ey2 - ey1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const perpX = -dy / len, perpY = dx / len;
          const curveOffset = (j - (numEdges - 1) / 2) * Math.max(32, scale * 0.8);
          midX = (x1 + x2) / 2 + perpX * curveOffset * 0.5;
          midY = (y1 + y2) / 2 + perpY * curveOffset * 0.5;
        }

        // Store edge midpoint for click detection
        aztecEdgeScreenPositions.push({
          idx: idx,
          screenX: midX + cx,
          screenY: midY + cy,
          edge: e
        });

        // Draw weight label in rectangular bubble
        if (showWeights) {
          const label = e.weight.toFixed(2);

          const fontSize = Math.max(8, Math.min(11, scale / 4));
          aztecCtx.font = `${fontSize}px sans-serif`;
          const textWidth = aztecCtx.measureText(label).width;
          const padX = 3, padY = 2;
          const boxW = textWidth + padX * 2;
          const boxH = fontSize + padY * 2;

          aztecCtx.fillStyle = '#fff';
          aztecCtx.fillRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
          aztecCtx.strokeStyle = '#999';
          aztecCtx.lineWidth = 0.5;
          aztecCtx.strokeRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);

          aztecCtx.fillStyle = '#333';
          aztecCtx.textAlign = 'center';
          aztecCtx.textBaseline = 'middle';
          aztecCtx.fillText(label, midX, midY);
        }
      }
    }

    // Draw face weights
    const showFaceWeights = document.getElementById('show-face-weights-chk').checked;
    aztecFaceScreenPositions = [];  // Reset for click detection
    if (showFaceWeights) {
      // Get face weights from C++ if WASM is ready, otherwise fall back to JS
      let faceWeights = [];
      if (wasmReady && getAztecFacesJSON) {
        let ptr = getAztecFacesJSON();
        let jsonStr = Module.UTF8ToString(ptr);
        freeString(ptr);
        faceWeights = JSON.parse(jsonStr);
        console.log('C++ faces:', faceWeights.length, faceWeights.slice(0, 3));
      } else {
        faceWeights = computeFaceWeights();
        console.log('JS faces:', faceWeights.length, faceWeights.slice(0, 3));
      }

      for (let idx = 0; idx < faceWeights.length; idx++) {
        const face = faceWeights[idx];
        const x = face.cx * scale;
        const y = -face.cy * scale;

        // Store screen position for click detection
        aztecFaceScreenPositions.push({
          idx: idx,
          screenX: x + cx,
          screenY: y + cy,
          face: face
        });

        // Check if this face is selected (compare by centroid since structure may differ)
        const isSelected = (selectedAztecFace !== null &&
                           Math.abs(selectedAztecFace.cx - face.cx) < 0.01 &&
                           Math.abs(selectedAztecFace.cy - face.cy) < 0.01);

        const label = face.weight.toFixed(2);
        const fontSize = Math.max(8, Math.min(11, scale / 4));
        aztecCtx.font = `${fontSize}px sans-serif`;
        const textWidth = aztecCtx.measureText(label).width;
        const padX = 3, padY = 2;
        const boxW = textWidth + padX * 2;
        const boxH = fontSize + padY * 2;

        // Light blue background (red if selected) to distinguish from edge weights
        aztecCtx.fillStyle = isSelected ? '#ffcccc' : '#e6f3ff';
        aztecCtx.fillRect(x - boxW / 2, y - boxH / 2, boxW, boxH);
        aztecCtx.strokeStyle = isSelected ? '#cc0000' : '#6699cc';
        aztecCtx.lineWidth = isSelected ? 1.5 : 0.5;
        aztecCtx.strokeRect(x - boxW / 2, y - boxH / 2, boxW, boxH);

        aztecCtx.fillStyle = isSelected ? '#cc0000' : '#003366';
        aztecCtx.textAlign = 'center';
        aztecCtx.textBaseline = 'middle';
        aztecCtx.fillText(label, x, y);
      }
    }

    // Draw vertices
    let vertexRadius = Math.max(4, scale / 8);
    if (aztecReductionStep == 8) vertexRadius /= 3;  // Smaller vertices at split step
    aztecVertexScreenPositions = [];

    for (let i = 0; i < aztecVertices.length; i++) {
      const v = aztecVertices[i];
      const x = v.x * scale;
      const y = -v.y * scale;

      // Store screen position for click detection
      aztecVertexScreenPositions.push({
        idx: i,
        screenX: x + cx,
        screenY: y + cy,
        vertex: v
      });

      const isSelected = (selectedAztecVertex === i);
      const inVgauge = v.inVgauge || false;
      const toContract = v.toContract || false;

      // Determine vertex size
      let radius = vertexRadius;
      if (isSelected) radius *= 1.5;
      if (toContract) radius *= 1.3;

      aztecCtx.beginPath();
      aztecCtx.arc(x, y, radius, 0, Math.PI * 2);

      if (isSelected) {
        // Selected vertex: red highlight
        aztecCtx.fillStyle = '#ff0000';
        aztecCtx.fill();
        aztecCtx.strokeStyle = '#cc0000';
        aztecCtx.lineWidth = 2;
        aztecCtx.stroke();
      } else if (toContract) {
        // Vertex to be contracted: orange fill
        aztecCtx.fillStyle = '#ff6600';
        aztecCtx.fill();
        aztecCtx.strokeStyle = '#cc4400';
        aztecCtx.lineWidth = 2;
        aztecCtx.stroke();
      } else if (inVgauge) {
        // V_gauge vertex: green ring
        aztecCtx.fillStyle = v.isWhite ? '#fff' : '#000';
        aztecCtx.fill();
        aztecCtx.strokeStyle = '#00cc00';
        aztecCtx.lineWidth = 3;
        aztecCtx.stroke();
      } else if (v.isWhite) {
        // White vertex: hollow with black outline
        aztecCtx.fillStyle = '#fff';
        aztecCtx.fill();
        aztecCtx.strokeStyle = '#000';
        aztecCtx.lineWidth = Math.max(1, scale / 30);
        aztecCtx.stroke();
      } else {
        // Black vertex: filled
        aztecCtx.fillStyle = '#000';
        aztecCtx.fill();
      }
    }

    aztecCtx.restore();
  }

  // Aztec graph step down: advance reduction step
  function aztecTransformDown() {
    if (!wasmReady) return;
    aztecGraphStepDown();
    refreshAztecFromCpp();
  }

  // Aztec graph step up: restore previous state
  function aztecTransformUp() {
    if (!wasmReady) return;
    aztecGraphStepUp();
    refreshAztecFromCpp();
  }

  // Randomize all edge weights (calls C++ via WASM)
  function randomizeWeights() {
    if (!wasmReady) {
      // Fallback to JS randomization
      for (const e of aztecEdges) {
        e.weight = randomWeight();
      }
      renderAztecGraph();
      return;
    }

    // Randomize in C++
    randomizeAztecWeights();

    // Re-fetch graph data
    let ptr = getAztecGraphJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    let graphData = JSON.parse(jsonStr);

    // Update edges with new weights
    aztecEdges = graphData.edges.map(e => ({
      x1: aztecVertices[e.v1].x,
      y1: aztecVertices[e.v1].y,
      x2: aztecVertices[e.v2].x,
      y2: aztecVertices[e.v2].y,
      weight: e.weight,
      isHorizontal: e.isHorizontal
    }));

    renderAztecGraph();
  }

  // Handle click on Aztec graph canvas
  function handleAztecCanvasClick(e) {
    // Ignore click if we just panned
    if (aztecDidPan) {
      aztecDidPan = false;
      return;
    }

    const rect = aztecCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clickX = (e.clientX - rect.left) * dpr;
    const clickY = (e.clientY - rect.top) * dpr;

    const vertexThreshold = 15 * dpr;
    const edgeThreshold = 20 * dpr;
    const faceThreshold = 18 * dpr;
    let closestVertex = null;
    let closestVertexDist = Infinity;
    let closestEdge = null;
    let closestEdgeDist = Infinity;
    let closestFace = null;
    let closestFaceDist = Infinity;

    // Check vertices first (highest priority)
    for (const vp of aztecVertexScreenPositions) {
      const dx = clickX - vp.screenX * dpr;
      const dy = clickY - vp.screenY * dpr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < vertexThreshold && dist < closestVertexDist) {
        closestVertexDist = dist;
        closestVertex = vp;
      }
    }

    // Check faces if no vertex clicked (medium priority)
    if (!closestVertex) {
      for (const fp of aztecFaceScreenPositions) {
        const dx = clickX - fp.screenX * dpr;
        const dy = clickY - fp.screenY * dpr;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < faceThreshold && dist < closestFaceDist) {
          closestFaceDist = dist;
          closestFace = fp;
        }
      }
    }

    // Check edges if no vertex or face clicked
    if (!closestVertex && !closestFace) {
      for (const ep of aztecEdgeScreenPositions) {
        const dx = clickX - ep.screenX * dpr;
        const dy = clickY - ep.screenY * dpr;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < edgeThreshold && dist < closestEdgeDist) {
          closestEdgeDist = dist;
          closestEdge = ep;
        }
      }
    }

    const infoDiv = document.getElementById('aztec-vertex-info');

    if (closestVertex) {
      selectedAztecVertex = closestVertex.idx;
      selectedAztecEdge = null;
      selectedAztecFace = null;
      const v = closestVertex.vertex;
      // i + j + k parity determines color
      const i = Math.round(v.x - 0.5);
      const j = Math.round(v.y - 0.5);
      const parity = (i + j + aztecLevel) % 2;
      const colorType = v.isWhite ? `white (i+j+k = ${i}+${j}+${aztecLevel} = ${i+j+aztecLevel} even)`
                                  : `black (i+j+k = ${i}+${j}+${aztecLevel} = ${i+j+aztecLevel} odd)`;
      infoDiv.innerHTML = `<strong>Vertex:</strong> (${v.x}, ${v.y}) &nbsp; | &nbsp; <strong>Color:</strong> ${colorType}`;
    } else if (closestFace) {
      selectedAztecFace = closestFace.face;
      selectedAztecVertex = null;
      selectedAztecEdge = null;
      const face = closestFace.face;
      const numFaces = aztecFaceScreenPositions.length;
      const faceClass = classifyFace(face.cx, face.cy, numFaces);
      let typeStr = faceClass.type;
      if (faceClass.type === 'beta' || faceClass.type === 'gamma') {
        typeStr = `${faceClass.type}(${faceClass.i},${faceClass.j})`;
      }
      const genStr = faceClass.k >= 0 ? `k=${faceClass.k}` : '';
      infoDiv.innerHTML = `<strong>Type:</strong> ${typeStr} &nbsp; | &nbsp; <strong>Gen:</strong> ${genStr} &nbsp; | &nbsp; <strong>Center:</strong> (${face.cx.toFixed(2)}, ${face.cy.toFixed(2)})`;
    } else if (closestEdge) {
      selectedAztecEdge = closestEdge.idx;
      selectedAztecVertex = null;
      selectedAztecFace = null;
      const edge = closestEdge.edge;
      const preciseWeight = edge.weight.toFixed(10);
      const orient = edge.isHorizontal ? 'horizontal' : 'vertical';
      const status = edge.gaugeTransformed ? ' (gauge transformed)' : '';
      infoDiv.innerHTML = `<strong>Edge:</strong> (${edge.x1}, ${edge.y1}) — (${edge.x2}, ${edge.y2}) &nbsp; | &nbsp; <strong>Weight:</strong> ${preciseWeight}${status}`;
    } else {
      selectedAztecVertex = null;
      selectedAztecEdge = null;
      selectedAztecFace = null;
      infoDiv.innerHTML = '<em>Click on a vertex, edge, or face weight to see details</em>';
    }

    renderAztecGraph();
  }

  // ========== T-EMBEDDING CODE (unchanged) ==========

  function initWasm() {
    if (typeof Module === 'undefined') {
      setTimeout(initWasm, 100);
      return;
    }

    loadingMsg.style.display = 'block';

    Module.onRuntimeInitialized = function() {
      setN = Module.cwrap('setN', null, ['number']);
      initCoefficients = Module.cwrap('initCoefficients', null, []);
      computeTembedding = Module.cwrap('computeTembedding', null, []);
      getTembeddingJSON = Module.cwrap('getTembeddingJSON', 'number', []);
      freeString = Module.cwrap('freeString', null, ['number']);

      // Aztec graph functions
      generateAztecGraph = Module.cwrap('generateAztecGraph', null, ['number']);
      getAztecGraphJSON = Module.cwrap('getAztecGraphJSON', 'number', []);
      getAztecFacesJSON = Module.cwrap('getAztecFacesJSON', 'number', []);
      getStoredFaceWeightsJSON = Module.cwrap('getStoredFaceWeightsJSON', 'number', []);
      getTembeddingLevelJSON = Module.cwrap('getTembeddingLevelJSON', 'number', ['number']);
      randomizeAztecWeights = Module.cwrap('randomizeAztecWeights', null, []);
      setAztecGraphLevel = Module.cwrap('setAztecGraphLevel', null, ['number']);
      aztecGraphStepDown = Module.cwrap('aztecGraphStepDown', null, []);
      aztecGraphStepUp = Module.cwrap('aztecGraphStepUp', null, []);
      getAztecReductionStep = Module.cwrap('getAztecReductionStep', 'number', []);
      canAztecStepUp = Module.cwrap('canAztecStepUp', 'number', []);
      canAztecStepDown = Module.cwrap('canAztecStepDown', 'number', []);

      wasmReady = true;
      loadingMsg.style.display = 'none';

      // Auto-compute on load
      const n = parseInt(document.getElementById('n-input').value) || 4;
      setN(n);
      initAztecGraph(n);
      computeAndDisplay();
    };

    if (Module.calledRun) {
      Module.onRuntimeInitialized();
    }
  }

  function computeAndDisplay() {
    if (!wasmReady) return;

    const n = parseInt(document.getElementById('n-input').value) || 4;

    // Initialize Aztec graph at level n
    generateAztecGraph(n);

    // Silently step down through all reduction steps to capture face weights
    // This stores face weights at each checkpoint (k=0 is ROOT)
    while (canAztecStepDown()) {
      aztecGraphStepDown();
    }

    // Step back up to restore to original Aztec graph
    while (canAztecStepUp()) {
      aztecGraphStepUp();
    }

    // Display the original Aztec graph
    refreshAztecFromCpp();

    // maxK = n - 2 (for input n, we have T_0 through T_{n-2})
    maxK = Math.max(0, n - 2);

    // Start at k=0
    currentK = 0;
    updateStepDisplay();
    renderStepwiseTemb();
  }

  function updateStepRange() {
    // Legacy - not used anymore
  }

  function updateStepDisplay() {
    document.getElementById('step-value').textContent = currentK;
    document.getElementById('step-prev-btn').disabled = (currentK <= 0);
    document.getElementById('step-next-btn').disabled = (currentK >= maxK);
    document.getElementById('step-info').textContent = `(T_${currentK} graph)`;
    updateMathematicaOutput();
  }

  // Generate Mathematica array output for current T_k level
  function updateMathematicaOutput() {
    const mathDiv = document.getElementById('mathematica-output');
    if (!wasmReady || !getTembeddingLevelJSON) {
      mathDiv.innerHTML = '<em>Loading...</em>';
      return;
    }

    let ptr = getTembeddingLevelJSON(currentK);
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    const tembLevel = JSON.parse(jsonStr);

    if (!tembLevel || !tembLevel.vertices || tembLevel.vertices.length === 0) {
      mathDiv.innerHTML = `<em>T_${currentK} not computed yet</em>`;
      return;
    }

    // Format complex number for Mathematica
    function formatComplex(re, im) {
      if (Math.abs(im) < 1e-10) {
        return re.toFixed(6);
      } else if (Math.abs(re) < 1e-10) {
        return `${im.toFixed(6)}*I`;
      } else {
        const sign = im >= 0 ? '+' : '';
        return `${re.toFixed(6)}${sign}${im.toFixed(6)}*I`;
      }
    }

    // Generate Mathematica definitions
    const lines = [];
    for (const v of tembLevel.vertices) {
      lines.push(`T[${currentK}][${v.i},${v.j}]:=${formatComplex(v.re, v.im)}`);
    }

    // Sort by i, then j for consistent ordering
    lines.sort((a, b) => {
      const matchA = a.match(/T\[\d+\]\[(-?\d+),(-?\d+)\]/);
      const matchB = b.match(/T\[\d+\]\[(-?\d+),(-?\d+)\]/);
      const iA = parseInt(matchA[1]), jA = parseInt(matchA[2]);
      const iB = parseInt(matchB[1]), jB = parseInt(matchB[2]);
      if (iA !== iB) return iA - iB;
      return jA - jB;
    });

    mathDiv.textContent = lines.join('\n');
  }

  function renderStepwiseTemb() {
    const dpr = window.devicePixelRatio || 1;
    const rect = stepwiseCanvas.getBoundingClientRect();
    stepwiseCanvas.width = rect.width * dpr;
    stepwiseCanvas.height = rect.height * dpr;
    stepwiseCtx.scale(dpr, dpr);

    stepwiseCtx.fillStyle = '#fafafa';
    stepwiseCtx.fillRect(0, 0, rect.width, rect.height);

    // Get T_k from face weights
    if (!wasmReady || !getTembeddingLevelJSON) {
      stepwiseCtx.fillStyle = '#666';
      stepwiseCtx.font = '14px sans-serif';
      stepwiseCtx.textAlign = 'center';
      stepwiseCtx.fillText('Loading...', rect.width / 2, rect.height / 2);
      return;
    }

    let ptr = getTembeddingLevelJSON(currentK);
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    const tembLevel = JSON.parse(jsonStr);

    if (!tembLevel || !tembLevel.vertices || tembLevel.vertices.length === 0) {
      stepwiseCtx.fillStyle = '#666';
      stepwiseCtx.font = '14px sans-serif';
      stepwiseCtx.textAlign = 'center';
      stepwiseCtx.fillText(`T_${currentK} not computed yet`, rect.width / 2, rect.height / 2);
      return;
    }

    const vertices = tembLevel.vertices;
    const k = tembLevel.k;

    // Find bounds
    let minRe = Infinity, maxRe = -Infinity;
    let minIm = Infinity, maxIm = -Infinity;
    for (const v of vertices) {
      minRe = Math.min(minRe, v.re);
      maxRe = Math.max(maxRe, v.re);
      minIm = Math.min(minIm, v.im);
      maxIm = Math.max(maxIm, v.im);
    }

    const rangeRe = maxRe - minRe || 1;
    const rangeIm = maxIm - minIm || 1;
    const centerRe = (minRe + maxRe) / 2;
    const centerIm = (minIm + maxIm) / 2;

    const padding = 60;
    const scaleX = (rect.width - 2 * padding) / rangeRe;
    const scaleY = (rect.height - 2 * padding) / rangeIm;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * stepwiseZoom;

    const cx = rect.width / 2 + stepwisePanX * stepwiseZoom;
    const cy = rect.height / 2 + stepwisePanY * stepwiseZoom;

    stepwiseCtx.save();
    stepwiseCtx.translate(cx, cy);

    // Create vertex map by (i,j)
    const vertexMap = {};
    for (const v of vertices) {
      vertexMap[`${v.i},${v.j}`] = v;
    }

    // Draw edges based on T_k structure
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = Math.max(1, scale / 80);

    function drawTembEdge(i1, j1, i2, j2) {
      const v1 = vertexMap[`${i1},${j1}`];
      const v2 = vertexMap[`${i2},${j2}`];
      if (v1 && v2) {
        stepwiseCtx.beginPath();
        stepwiseCtx.moveTo((v1.re - centerRe) * scale, -(v1.im - centerIm) * scale);
        stepwiseCtx.lineTo((v2.re - centerRe) * scale, -(v2.im - centerIm) * scale);
        stepwiseCtx.stroke();
      }
    }

    // Draw T_k edges based on graph structure
    // T_k has:
    //   - External corners: (±(k+1), 0), (0, ±(k+1))
    //   - Alpha vertices: (±k, 0), (0, ±k) (on axis, |i|+|j|=k)
    //   - Beta vertices: |i|+|j|=k, off-axis
    //   - Interior: |i|+|j| < k
    //
    // Edge rules:
    //   1. External corners connect to alpha and to each other (boundary rhombus)
    //   2. Alpha/Beta form the diagonal boundary
    //   3. Interior connects like a lattice

    // Draw interior edges (lattice connections)
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = Math.max(0.3, scale / 300);  // uniform thickness

    for (const v of vertices) {
      const i = v.i, j = v.j;
      const absSum = Math.abs(i) + Math.abs(j);

      // Connect to right neighbor (i+1, j) if both interior/boundary
      if (vertexMap[`${i+1},${j}`]) {
        const nAbsSum = Math.abs(i+1) + Math.abs(j);
        // Draw if both are interior (|i|+|j| <= k)
        if (absSum <= k && nAbsSum <= k) {
          drawTembEdge(i, j, i+1, j);
        }
      }

      // Connect to top neighbor (i, j+1) if both interior/boundary
      if (vertexMap[`${i},${j+1}`]) {
        const nAbsSum = Math.abs(i) + Math.abs(j+1);
        if (absSum <= k && nAbsSum <= k) {
          drawTembEdge(i, j, i, j+1);
        }
      }
    }

    // Draw boundary rhombus (external corners)
    stepwiseCtx.strokeStyle = '#666';
    stepwiseCtx.lineWidth = Math.max(2, scale / 50);

    // Connect external corners: (k+1,0) -> (0,k+1) -> (-(k+1),0) -> (0,-(k+1)) -> (k+1,0)
    drawTembEdge(k+1, 0, 0, k+1);
    drawTembEdge(0, k+1, -(k+1), 0);
    drawTembEdge(-(k+1), 0, 0, -(k+1));
    drawTembEdge(0, -(k+1), k+1, 0);

    // Connect external corners to alpha vertices
    stepwiseCtx.strokeStyle = '#999';
    stepwiseCtx.lineWidth = Math.max(1.5, scale / 60);
    drawTembEdge(k+1, 0, k, 0);
    drawTembEdge(-(k+1), 0, -k, 0);
    drawTembEdge(0, k+1, 0, k);
    drawTembEdge(0, -(k+1), 0, -k);

    // Connect diagonal boundary vertices (beta and alpha on boundary)
    // These form the edges along the diagonal |i|+|j|=k
    stepwiseCtx.strokeStyle = '#555';
    stepwiseCtx.lineWidth = Math.max(1, scale / 70);

    // Right-top diagonal: (k,0) -> (k-1,1) -> ... -> (1,k-1) -> (0,k)
    for (let s = 0; s < k; s++) {
      drawTembEdge(k-s, s, k-s-1, s+1);
    }
    // Left-top diagonal: (0,k) -> (-1,k-1) -> ... -> (-(k-1),1) -> (-k,0)
    for (let s = 0; s < k; s++) {
      drawTembEdge(-s, k-s, -(s+1), k-s-1);
    }
    // Left-bottom diagonal: (-k,0) -> (-(k-1),-1) -> ... -> (-1,-(k-1)) -> (0,-k)
    for (let s = 0; s < k; s++) {
      drawTembEdge(-(k-s), -s, -(k-s-1), -(s+1));
    }
    // Right-bottom diagonal: (0,-k) -> (1,-(k-1)) -> ... -> (k-1,-1) -> (k,0)
    for (let s = 0; s < k; s++) {
      drawTembEdge(s, -(k-s), s+1, -(k-s-1));
    }

    // Draw vertices and store positions for click detection
    const vertexRadius = Math.max(0.5, scale / 800);  // 20x smaller
    const showLabels = document.getElementById('show-labels-chk').checked;
    tembVertexScreenPositions = [];  // Reset
    tembCurrentVertices = vertices;  // Store for click handler

    for (const v of vertices) {
      const x = (v.re - centerRe) * scale;
      const y = -(v.im - centerIm) * scale;  // Flip y for standard math orientation

      // Store screen position for click detection
      tembVertexScreenPositions.push({
        screenX: x + cx,
        screenY: y + cy,
        vertex: v
      });

      stepwiseCtx.beginPath();
      stepwiseCtx.arc(x, y, vertexRadius, 0, Math.PI * 2);
      stepwiseCtx.fillStyle = (v.i === 0 && v.j === 0) ? '#ff0000' : '#000';
      stepwiseCtx.fill();

      // Label vertices
      if (showLabels) {
        stepwiseCtx.fillStyle = '#333';
        stepwiseCtx.font = `${Math.max(10, scale / 15)}px sans-serif`;
        stepwiseCtx.textAlign = 'center';
        stepwiseCtx.textBaseline = 'bottom';
        const label = `(${v.i},${v.j})`;
        stepwiseCtx.fillText(label, x, y - vertexRadius - 2);
      }
    }

    stepwiseCtx.restore();

    // Title
    stepwiseCtx.fillStyle = '#333';
    stepwiseCtx.font = '12px sans-serif';
    stepwiseCtx.textAlign = 'left';
    stepwiseCtx.fillText(`T_${k}: ${vertices.length} vertices`, 10, 18);
  }

  function getVertexFormulaHTML(v, level) {
    const coeff = v.coeff.toFixed(3).replace(/\.?0+$/, '');
    const j = v.x, k = v.y;
    const m = v.sourceLevel;

    const typeDescriptions = {
      'boundary_corner': `<strong>Boundary corner</strong> (fixed)`,
      'axis_horizontal': `<strong>Axis boundary</strong> (horizontal)<br>T<sub>${level}</sub>(${j},0) uses α<sub>${m}</sub> = ${coeff}`,
      'axis_vertical': `<strong>Axis boundary</strong> (vertical)<br>T<sub>${level}</sub>(0,${k}) uses α<sub>${m}</sub> = ${coeff}`,
      'diag_positive_j': `<strong>Diagonal boundary</strong> (j > 0)<br>Uses β<sub>${j},${m}</sub> = ${coeff}`,
      'diag_negative_j': `<strong>Diagonal boundary</strong> (j < 0)<br>Uses β<sub>${j},${m}</sub> = ${coeff}`,
      'interior_passthrough': `<strong>Interior pass-through</strong> (j+k+m even)<br>T<sub>${level}</sub>(${j},${k}) = T<sub>${m}</sub>(${j},${k})`,
      'interior_recurrence': `<strong>Interior recurrence</strong> (j+k+m odd)<br>Uses γ<sub>${j},${k},${m}</sub> = ${coeff}`
    };

    let html = typeDescriptions[v.type] || `Unknown type: ${v.type}`;
    html += `<br><br><strong>Value:</strong> ${v.tReal.toFixed(4)} + ${v.tImag.toFixed(4)}i`;
    html += `<br><strong>Dependencies:</strong> ${v.deps.length > 0 ? v.deps.join(', ') : 'none (fixed)'}`;

    return html;
  }

  function handleStepwiseCanvasClick(e) {
    const rect = stepwiseCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clickX = (e.clientX - rect.left) * dpr;
    const clickY = (e.clientY - rect.top) * dpr;

    // 20x bigger detection area (was ~15, now 300)
    const clickThreshold = 300 * dpr;
    let closestVertex = null;
    let closestDist = Infinity;

    for (const vp of tembVertexScreenPositions) {
      const dx = clickX - vp.screenX * dpr;
      const dy = clickY - vp.screenY * dpr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < clickThreshold && dist < closestDist) {
        closestDist = dist;
        closestVertex = vp.vertex;
      }
    }

    const vertexInfoDiv = document.getElementById('vertex-info');
    const k = currentK;

    if (closestVertex) {
      const v = closestVertex;
      const i = v.i, j = v.j;
      const re = v.re.toFixed(6);
      const im = v.im.toFixed(6);
      const imSign = v.im >= 0 ? '+' : '';

      // Determine formula based on vertex position
      let formula = '';
      const absSum = Math.abs(i) + Math.abs(j);

      if (absSum === k + 1) {
        // External corner - inherited from previous level
        formula = `T_${k}(${i},${j}) = T_${k-1}(${i > 0 ? k : -k},${j > 0 ? k : (j < 0 ? -k : 0)})`;
        if (i !== 0) formula = `T_${k}(${i},${j}) = T_${k-1}(${i > 0 ? k : -k},0)`;
        else formula = `T_${k}(${i},${j}) = T_${k-1}(0,${j > 0 ? k : -k})`;
      } else if (absSum === k && (i === 0 || j === 0)) {
        // Alpha vertex (on axis)
        const dir = i > 0 ? 'right' : (i < 0 ? 'left' : (j > 0 ? 'top' : 'bottom'));
        formula = `T_${k}(${i},${j}) = (T_${k-1}(${i},${j}) + α_${dir} · T_${k-1}(${i===0 ? 0 : (i>0 ? k-1 : -(k-1))},${j===0 ? 0 : (j>0 ? k-1 : -(k-1))})) / (α_${dir} + 1)`;
      } else if (absSum === k && i !== 0 && j !== 0) {
        // Beta vertex (diagonal)
        formula = `T_${k}(${i},${j}) = (T_${k-1}(...) + β(${i},${j}) · T_${k-1}(...)) / (β(${i},${j}) + 1)`;
      } else if (absSum < k) {
        // Interior
        if ((i + j + k) % 2 === 0) {
          // Pass-through
          formula = `T_${k}(${i},${j}) = T_${k-1}(${i},${j})  [pass-through, i+j+k even]`;
        } else {
          // Recurrence
          formula = `T_${k}(${i},${j}) = (T_${k}(${i-1},${j}) + T_${k}(${i+1},${j}) + γ·(T_${k}(${i},${j+1}) + T_${k}(${i},${j-1}))) / (γ+1) - T_${k-1}(${i},${j})`;
        }
      }

      vertexInfoDiv.innerHTML = `<strong>T_${k}(${i},${j})</strong> = ${re} ${imSign} ${im}i<br><small>${formula}</small>`;
    } else {
      vertexInfoDiv.innerHTML = `<em>Click on a vertex to see its formula (T_${k}, ${tembVertexScreenPositions.length} vertices)</em>`;
    }
  }

  // ========== EVENT LISTENERS ==========

  // Main buttons
  document.getElementById('compute-btn').addEventListener('click', () => {
    const n = parseInt(document.getElementById('n-input').value) || 4;
    initAztecGraph(n);
    computeAndDisplay();
  });

  document.getElementById('randomize-weights-btn').addEventListener('click', randomizeWeights);

  document.getElementById('n-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const n = parseInt(e.target.value) || 4;
      initAztecGraph(n);
      computeAndDisplay();
    }
  });

  // Aztec graph buttons
  document.getElementById('aztec-down-btn').addEventListener('click', aztecTransformDown);
  document.getElementById('aztec-up-btn').addEventListener('click', aztecTransformUp);

  // T-embedding step buttons
  document.getElementById('step-prev-btn').addEventListener('click', () => {
    if (currentK > 0) {
      currentK--;
      updateStepDisplay();
      renderStepwiseTemb();
    }
  });

  document.getElementById('step-next-btn').addEventListener('click', () => {
    if (currentK < maxK) {
      currentK++;
      updateStepDisplay();
      renderStepwiseTemb();
    }
  });

  // Checkboxes
  document.getElementById('show-labels-chk').addEventListener('change', renderStepwiseTemb);
  document.getElementById('show-aztec-weights-chk').addEventListener('change', renderAztecGraph);
  document.getElementById('show-face-weights-chk').addEventListener('change', renderAztecGraph);

  // T-embedding canvas pan/zoom
  stepwiseCanvas.addEventListener('click', handleStepwiseCanvasClick);

  stepwiseCanvas.addEventListener('mousedown', (e) => {
    stepwiseIsPanning = true;
    stepwiseLastPanX = e.clientX;
    stepwiseLastPanY = e.clientY;
    stepwiseCanvas.style.cursor = 'grabbing';
  });

  stepwiseCanvas.addEventListener('mousemove', (e) => {
    if (!stepwiseIsPanning) return;
    const dx = e.clientX - stepwiseLastPanX;
    const dy = e.clientY - stepwiseLastPanY;
    stepwisePanX += dx / stepwiseZoom;
    stepwisePanY += dy / stepwiseZoom;
    stepwiseLastPanX = e.clientX;
    stepwiseLastPanY = e.clientY;
    renderStepwiseTemb();
  });

  stepwiseCanvas.addEventListener('mouseup', () => {
    stepwiseIsPanning = false;
    stepwiseCanvas.style.cursor = 'grab';
  });

  stepwiseCanvas.addEventListener('mouseleave', () => {
    stepwiseIsPanning = false;
    stepwiseCanvas.style.cursor = 'grab';
  });

  stepwiseCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    stepwiseZoom = Math.max(0.1, Math.min(20, stepwiseZoom * factor));
    renderStepwiseTemb();
  }, { passive: false });

  // Aztec canvas click and pan/zoom
  aztecCanvas.addEventListener('click', handleAztecCanvasClick);

  aztecCanvas.addEventListener('mousedown', (e) => {
    aztecIsPanning = true;
    aztecDidPan = false;
    aztecLastPanX = e.clientX;
    aztecLastPanY = e.clientY;
    aztecCanvas.style.cursor = 'grabbing';
  });

  aztecCanvas.addEventListener('mousemove', (e) => {
    if (!aztecIsPanning) return;
    const dx = e.clientX - aztecLastPanX;
    const dy = e.clientY - aztecLastPanY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      aztecDidPan = true;
    }
    aztecPanX += dx / aztecZoom;
    aztecPanY += dy / aztecZoom;
    aztecLastPanX = e.clientX;
    aztecLastPanY = e.clientY;
    renderAztecGraph();
  });

  aztecCanvas.addEventListener('mouseup', () => {
    aztecIsPanning = false;
    aztecCanvas.style.cursor = 'grab';
  });

  aztecCanvas.addEventListener('mouseleave', () => {
    aztecIsPanning = false;
    aztecCanvas.style.cursor = 'grab';
  });

  aztecCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    aztecZoom = Math.max(0.1, Math.min(20, aztecZoom * factor));
    renderAztecGraph();
  }, { passive: false });

  // Resize handler
  window.addEventListener('resize', () => {
    renderStepwiseTemb();
    renderAztecGraph();
  });

  // Initialize
  initWasm();
})();
</script>
