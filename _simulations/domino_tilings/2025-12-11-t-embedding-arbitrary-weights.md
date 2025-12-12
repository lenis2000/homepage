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
        <h4 style="margin: 0 0 5px 0;">Aztec diamond graph G<sub>k</sub></h4>
        <div style="margin-bottom: 5px; text-align: center;"><span id="aztec-graph-label">A<sub>6</sub></span></div>
        <div style="margin-bottom: 10px; text-align: center;">
          <button id="aztec-down-btn" style="width: 100px;">← Step down</button>
          <button id="aztec-up-btn" style="width: 100px; margin-left: 10px;">Step up →</button>
          <label style="margin-left: 15px;"><input type="checkbox" id="show-aztec-weights-chk" checked> Show weights</label>
        </div>
        <canvas id="aztec-graph-canvas" style="width: 100%; height: 50vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>
        <div id="aztec-vertex-info" style="margin-top: 5px; padding: 8px; background: #fff; border: 1px solid #ddd; min-height: 30px; font-family: monospace; font-size: 12px;">
          <em>Click on a vertex to see its coordinates</em>
        </div>
      </div>

      <!-- RIGHT: T-embedding canvas -->
      <div style="flex: 1; min-width: 350px;">
        <h4 style="margin: 0 0 10px 0;">T-embedding at level m</h4>
        <div style="margin-bottom: 10px;">
          <button id="step-prev-btn" style="width: 30px;">&lt;</button>
          <span style="margin: 0 10px;">Level m = <span id="step-value">1</span></span>
          <button id="step-next-btn" style="width: 30px;">&gt;</button>
          <span id="step-info" style="margin-left: 10px; color: #666;"></span>
          <label style="margin-left: 15px;"><input type="checkbox" id="show-labels-chk" checked> Show labels</label>
        </div>
        <canvas id="stepwise-temb-canvas" style="width: 100%; height: 50vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>
        <div id="vertex-info" style="margin-top: 5px; padding: 8px; background: #fff; border: 1px solid #ddd; min-height: 30px; font-family: monospace; font-size: 12px;">
          <em>Click on a vertex to see its formula and dependencies</em>
        </div>
      </div>
    </div>
    <details style="margin-top: 15px;">
      <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #f5f5f5; border: 1px solid #ddd;">Recurrence formulas for T-embedding</summary>
      <div style="margin-top: 10px; padding: 15px; background: #fff; border: 1px solid #ddd; font-size: 14px; line-height: 1.6;">
        <p>The T-embedding $T_n$ is computed recursively from $T_1$ to $T_n$ using the Berggren-Russkikh recurrence. At each level $m$, the graph $T_m$ has:</p>
        <ul>
          <li><strong>Interior vertices:</strong> $(j,k)$ with $|j|+|k| < m$</li>
          <li><strong>Boundary corners:</strong> $(\pm m, 0)$ and $(0, \pm m)$</li>
        </ul>

        <h5 style="margin-top: 15px;">Base case: T_1</h5>
        <p>The initial T-embedding is the boundary rhombus with parameter $a$:</p>
        $$T_1(-1,0) = -1, \quad T_1(1,0) = 1, \quad T_1(0,-1) = ia, \quad T_1(0,1) = -ia, \quad T_1(0,0) = 0$$

        <h5 style="margin-top: 15px;">Recurrence: $T_{m+1}$ from $T_m$</h5>
        <p>Coefficients: $\alpha_n$ (axis), $\beta_{j,n}$ (diagonal), $\gamma_{j,k,n}$ (interior). Currently all set to 1.</p>

        <p><strong>Rule 1: Boundary corners</strong> ($|j|+|k| = m+1$, on axes)<br>
        $$T_{m+1}(\pm(m+1), 0) = \pm 1, \quad T_{m+1}(0, \pm(m+1)) = \mp ia$$</p>

        <p><strong>Rule 2: Axis boundary</strong> ($j=\pm m$, $k=0$ or $j=0$, $k=\pm m$)</p>
        $$T_{m+1}(m, 0) = \frac{T_m(m, 0) + \alpha_m \cdot T_m(m-1, 0)}{1+\alpha_m}$$
        $$T_{m+1}(-m, 0) = \frac{T_m(-m, 0) + \alpha_m \cdot T_m(-m+1, 0)}{1+\alpha_m}$$
        $$T_{m+1}(0, m) = \frac{\alpha_m \cdot T_m(0, m) + T_m(0, m-1)}{1+\alpha_m}$$
        $$T_{m+1}(0, -m) = \frac{\alpha_m \cdot T_m(0, -m) + T_m(0, -m+1)}{1+\alpha_m}$$

        <p><strong>Rule 3: Diagonal boundary</strong> ($|j|+|k|=m$, $j\neq 0$, $k\neq 0$)</p>
        <p>For $j>0$:</p>
        $$T_{m+1}(j,k) = \frac{T_m(j-1,k) + \beta_{j,m} \cdot T_m(j,k\mp 1)}{1+\beta_{j,m}}$$
        <p>For $j<0$:</p>
        $$T_{m+1}(j,k) = \frac{\beta_{j,m} \cdot T_m(j,k\mp 1) + T_m(j+1,k)}{1+\beta_{j,m}}$$

        <p><strong>Rule 4: Interior pass-through</strong> ($|j|+|k| < m$, $j+k+m$ even)</p>
        $$T_{m+1}(j,k) = T_m(j,k)$$

        <p><strong>Rule 5: Interior recurrence</strong> ($|j|+|k| < m$, $j+k+m$ odd)</p>
        $$T_{m+1}(j,k) = -T_m(j,k) + \frac{T_{m+1}(j-1,k) + T_{m+1}(j+1,k) + \gamma_{j,k,m}\bigl(T_{m+1}(j,k+1) + T_{m+1}(j,k-1)\bigr)}{1+\gamma_{j,k,m}}$$
      </div>
    </details>
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
  let generateAztecGraph, getAztecGraphJSON, randomizeAztecWeights, setAztecGraphLevel;
  let aztecGraphStepDown, aztecGraphStepUp, getAztecReductionStep, canAztecStepUp, canAztecStepDown;

  // Step-by-step state
  let currentStep = 1;
  let maxStep = 5;

  // Vertex selection state
  let selectedVertex = null;
  let highlightedDeps = new Set();
  let vertexScreenPositions = [];

  // Canvas pan/zoom for T-embedding
  let stepwiseZoom = 1.0;
  let stepwisePanX = 0, stepwisePanY = 0;
  let stepwiseIsPanning = false;
  let stepwiseLastPanX = 0, stepwiseLastPanY = 0;

  // ========== AZTEC DIAMOND GRAPH STATE ==========
  let aztecLevel = 4;
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
  let selectedAztecVertex = null;
  let selectedAztecEdge = null;

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

  // Update Aztec UI state (graph label, button states)
  function updateAztecUI() {
    // Step labels
    const stepNames = [
      'original',           // 0
      'black gauge',        // 1
      'white gauge',        // 2
      'contracted',         // 3
      'black contr.',       // 4
      'white contr.',       // 5
      'fold 1: shaded',     // 6
      'fold 2: diagonal',   // 7
      'fold 3: split',      // 8
      'fold 3b: diag gauge',// 9
      'fold 4: renewal',    // 10
      'fold 5: combine'     // 11
    ];
    const stepName = stepNames[aztecReductionStep] || `step ${aztecReductionStep}`;
    const prefix = aztecReductionStep >= 3 ? "A'" : "A";
    document.getElementById('aztec-graph-label').innerHTML = `${prefix}<sub>${aztecLevel}</sub> (${stepName})`;

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

    // Debug: count multi-edges
    let multiEdgeCount = 0;
    for (const [key, edges] of edgeGroups) {
      if (edges.length > 1) multiEdgeCount += edges.length;
    }
    if (multiEdgeCount > 0) console.log(`Multi-edges: ${multiEdgeCount} edges in ${[...edgeGroups.values()].filter(e => e.length > 1).length} groups`);

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

    // Draw level info
    aztecCtx.fillStyle = '#333';
    aztecCtx.font = '11px sans-serif';
    const stepLabels = ['original', 'black gauge', 'white gauge', 'contracted', 'black contr.', 'white contr.', 'fold 1', 'fold 2', 'fold 3', 'fold 4'];
    const stepLabel = stepLabels[aztecReductionStep] || 'unknown';
    const prefix = aztecReductionStep >= 3 ? "A'" : "A";
    aztecCtx.fillText(`${prefix}_${k} (${stepLabel}): ${aztecVertices.length} vertices, ${aztecEdges.length} edges`, 10, 15);
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
    let closestVertex = null;
    let closestVertexDist = Infinity;
    let closestEdge = null;
    let closestEdgeDist = Infinity;

    // Check vertices first (higher priority)
    for (const vp of aztecVertexScreenPositions) {
      const dx = clickX - vp.screenX * dpr;
      const dy = clickY - vp.screenY * dpr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < vertexThreshold && dist < closestVertexDist) {
        closestVertexDist = dist;
        closestVertex = vp;
      }
    }

    // Check edges if no vertex clicked
    if (!closestVertex) {
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
      const v = closestVertex.vertex;
      // i + j + k parity determines color
      const i = Math.round(v.x - 0.5);
      const j = Math.round(v.y - 0.5);
      const parity = (i + j + aztecLevel) % 2;
      const colorType = v.isWhite ? `white (i+j+k = ${i}+${j}+${aztecLevel} = ${i+j+aztecLevel} even)`
                                  : `black (i+j+k = ${i}+${j}+${aztecLevel} = ${i+j+aztecLevel} odd)`;
      infoDiv.innerHTML = `<strong>Vertex:</strong> (${v.x}, ${v.y}) &nbsp; | &nbsp; <strong>Color:</strong> ${colorType}`;
    } else if (closestEdge) {
      selectedAztecEdge = closestEdge.idx;
      selectedAztecVertex = null;
      const edge = closestEdge.edge;
      const preciseWeight = edge.weight.toFixed(10);
      const orient = edge.isHorizontal ? 'horizontal' : 'vertical';
      const status = edge.gaugeTransformed ? ' (gauge transformed)' : '';
      infoDiv.innerHTML = `<strong>Edge:</strong> (${edge.x1}, ${edge.y1}) — (${edge.x2}, ${edge.y2}) &nbsp; | &nbsp; <strong>Weight:</strong> ${preciseWeight}${status}`;
    } else {
      selectedAztecVertex = null;
      selectedAztecEdge = null;
      infoDiv.innerHTML = '<em>Click on a vertex or edge to see details</em>';
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
    setN(n);
    computeTembedding();

    let ptr = getTembeddingJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    tembData = JSON.parse(jsonStr);

    updateStepRange();
    renderStepwiseTemb();
  }

  function updateStepRange() {
    if (!tembData || !tembData.tembHistory) return;
    maxStep = tembData.tembHistory.length;
    currentStep = Math.min(currentStep, maxStep);
    updateStepDisplay();
  }

  function updateStepDisplay() {
    document.getElementById('step-value').textContent = currentStep;
    document.getElementById('step-prev-btn').disabled = (currentStep <= 1);
    document.getElementById('step-next-btn').disabled = (currentStep >= maxStep);
    document.getElementById('step-info').textContent = `(T_${currentStep} graph)`;
  }

  function renderStepwiseTemb() {
    if (!tembData || !tembData.tembHistory) {
      const dpr = window.devicePixelRatio || 1;
      const rect = stepwiseCanvas.getBoundingClientRect();
      stepwiseCanvas.width = rect.width * dpr;
      stepwiseCanvas.height = rect.height * dpr;
      stepwiseCtx.scale(dpr, dpr);
      stepwiseCtx.fillStyle = '#fafafa';
      stepwiseCtx.fillRect(0, 0, rect.width, rect.height);
      stepwiseCtx.fillStyle = '#666';
      stepwiseCtx.font = '14px sans-serif';
      stepwiseCtx.textAlign = 'center';
      stepwiseCtx.fillText('Click "Compute T-embedding" to start', rect.width / 2, rect.height / 2);
      return;
    }

    const level = currentStep;
    const levelIdx = level - 1;

    if (levelIdx < 0 || levelIdx >= tembData.tembHistory.length) return;

    const levelData = tembData.tembHistory[levelIdx];
    if (!levelData || !levelData.vertices || levelData.vertices.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = stepwiseCanvas.getBoundingClientRect();
    stepwiseCanvas.width = rect.width * dpr;
    stepwiseCanvas.height = rect.height * dpr;
    stepwiseCtx.scale(dpr, dpr);

    stepwiseCtx.fillStyle = '#fafafa';
    stepwiseCtx.fillRect(0, 0, rect.width, rect.height);

    // Use final level bounds for consistent view
    let minReal = Infinity, maxReal = -Infinity;
    let minImag = Infinity, maxImag = -Infinity;

    const finalLevel = tembData.tembHistory[tembData.tembHistory.length - 1];
    for (const v of finalLevel.vertices) {
      minReal = Math.min(minReal, v.tReal);
      maxReal = Math.max(maxReal, v.tReal);
      minImag = Math.min(minImag, v.tImag);
      maxImag = Math.max(maxImag, v.tImag);
    }

    const rangeReal = maxReal - minReal || 1;
    const rangeImag = maxImag - minImag || 1;
    const centerReal = (minReal + maxReal) / 2;
    const centerImag = (minImag + maxImag) / 2;

    const padding = 40;
    const scaleX = (rect.width - 2 * padding) / rangeReal;
    const scaleY = (rect.height - 2 * padding) / rangeImag;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * stepwiseZoom;

    const cx = rect.width / 2 + stepwisePanX * stepwiseZoom;
    const cy = rect.height / 2 + stepwisePanY * stepwiseZoom;

    stepwiseCtx.save();
    stepwiseCtx.translate(cx, cy);

    // Create vertex map
    const vertexMap = {};
    for (const v of levelData.vertices) {
      vertexMap[v.key] = v;
    }

    const m = level;

    // Draw edges
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = Math.max(0.5, scale / 150);

    function drawEdge(key1, key2) {
      const v1 = vertexMap[key1];
      const v2 = vertexMap[key2];
      if (v1 && v2) {
        stepwiseCtx.beginPath();
        stepwiseCtx.moveTo((v1.tReal - centerReal) * scale, (v1.tImag - centerImag) * scale);
        stepwiseCtx.lineTo((v2.tReal - centerReal) * scale, (v2.tImag - centerImag) * scale);
        stepwiseCtx.stroke();
      }
    }

    // Interior edges
    for (let i = -(m-1); i <= m-1; i++) {
      for (let j = -(m-1); j <= m-1; j++) {
        if (Math.abs(i) + Math.abs(j) >= m) continue;
        if (Math.abs(i+1) + Math.abs(j) < m) drawEdge(`${i},${j}`, `${i+1},${j}`);
        if (Math.abs(i) + Math.abs(j+1) < m) drawEdge(`${i},${j}`, `${i},${j+1}`);
      }
    }

    // Exterior rhombus
    stepwiseCtx.lineWidth = Math.max(1, scale / 100);
    drawEdge(`${-m},0`, `0,${m}`);
    drawEdge(`0,${m}`, `${m},0`);
    drawEdge(`${m},0`, `0,${-m}`);
    drawEdge(`0,${-m}`, `${-m},0`);

    // Corner-to-axis edges
    stepwiseCtx.lineWidth = Math.max(0.5, scale / 150);
    drawEdge(`${m},0`, `${m-1},0`);
    drawEdge(`${-m},0`, `${-m+1},0`);
    drawEdge(`0,${m}`, `0,${m-1}`);
    drawEdge(`0,${-m}`, `0,${-m+1}`);

    // Exterior face diagonal edges
    if (m > 1) {
      for (let k = 0; k < m-1; k++) {
        drawEdge(`${m-1-k},${k}`, `${m-2-k},${k+1}`);
        drawEdge(`${-k},${m-1-k}`, `${-k-1},${m-2-k}`);
        drawEdge(`${-m+1+k},${-k}`, `${-m+2+k},${-k-1}`);
        drawEdge(`${k},${-m+1+k}`, `${k+1},${-m+2+k}`);
      }
    }

    // Draw vertices
    const vertexRadius = Math.max(3, scale / 100);
    const showLabels = document.getElementById('show-labels-chk').checked;
    vertexScreenPositions = [];

    for (const v of levelData.vertices) {
      const x = (v.tReal - centerReal) * scale;
      const y = (v.tImag - centerImag) * scale;

      vertexScreenPositions.push({
        key: v.key,
        screenX: x + cx,
        screenY: y + cy,
        vertex: v
      });

      const vertexKey = `T${level}(${v.x},${v.y})`;
      const isSelected = (selectedVertex === v.key);
      const isDep = highlightedDeps.has(vertexKey);

      stepwiseCtx.beginPath();
      stepwiseCtx.arc(x, y, isSelected ? vertexRadius * 1.5 : vertexRadius, 0, Math.PI * 2);

      if (isSelected) {
        stepwiseCtx.fillStyle = '#ff0000';
      } else if (isDep) {
        stepwiseCtx.fillStyle = '#0066ff';
      } else {
        stepwiseCtx.fillStyle = '#000';
      }
      stepwiseCtx.fill();

      if (isSelected || isDep) {
        stepwiseCtx.strokeStyle = isSelected ? '#cc0000' : '#0044cc';
        stepwiseCtx.lineWidth = 2;
        stepwiseCtx.stroke();
      }

      // Draw labels only for valid T_m vertices
      if (showLabels) {
        const absSum = Math.abs(v.x) + Math.abs(v.y);
        const isInterior = absSum < m;
        const isCorner = (absSum === m) && (v.x === 0 || v.y === 0);
        if (isInterior || isCorner) {
          const fontSize = Math.max(8, Math.min(11, scale / 80));
          stepwiseCtx.font = `${fontSize}px sans-serif`;
          stepwiseCtx.fillStyle = isSelected ? '#cc0000' : (isDep ? '#0044cc' : '#333');
          stepwiseCtx.textAlign = 'center';
          stepwiseCtx.textBaseline = 'bottom';
          stepwiseCtx.fillText(`T(${v.x},${v.y})`, x, y - vertexRadius - 2);
        }
      }
    }

    stepwiseCtx.restore();

    // Draw level info
    stepwiseCtx.fillStyle = '#333';
    stepwiseCtx.font = '11px sans-serif';
    stepwiseCtx.fillText(`Level m=${level}, a=${tembData.a.toFixed(3)}, ${levelData.vertices.length} vertices`, 10, 15);
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

    const threshold = 15 * dpr;
    let closestVertex = null;
    let closestDist = Infinity;
    const m = currentStep;

    for (const vp of vertexScreenPositions) {
      const absSum = Math.abs(vp.vertex.x) + Math.abs(vp.vertex.y);
      const isInterior = absSum < m;
      const isCorner = (absSum === m) && (vp.vertex.x === 0 || vp.vertex.y === 0);
      if (!isInterior && !isCorner) continue;

      const dx = clickX - vp.screenX * dpr;
      const dy = clickY - vp.screenY * dpr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold && dist < closestDist) {
        closestDist = dist;
        closestVertex = vp;
      }
    }

    const vertexInfoDiv = document.getElementById('vertex-info');

    if (closestVertex) {
      selectedVertex = closestVertex.key;
      highlightedDeps = new Set(closestVertex.vertex.deps || []);
      vertexInfoDiv.innerHTML = getVertexFormulaHTML(closestVertex.vertex, currentStep);
    } else {
      selectedVertex = null;
      highlightedDeps.clear();
      vertexInfoDiv.innerHTML = '<em>Click on a vertex to see its formula and dependencies</em>';
    }

    renderStepwiseTemb();
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
    if (currentStep > 1) {
      currentStep--;
      updateStepDisplay();
      renderStepwiseTemb();
    }
  });

  document.getElementById('step-next-btn').addEventListener('click', () => {
    if (currentStep < maxStep) {
      currentStep++;
      updateStepDisplay();
      renderStepwiseTemb();
    }
  });

  // Checkboxes
  document.getElementById('show-labels-chk').addEventListener('change', renderStepwiseTemb);
  document.getElementById('show-aztec-weights-chk').addEventListener('change', renderAztecGraph);

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
