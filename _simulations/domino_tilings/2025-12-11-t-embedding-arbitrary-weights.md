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
  <label>n: <input id="n-input" type="number" value="5" min="1" max="15" style="width: 60px;"></label>
  <button id="compute-btn" style="margin-left: 10px;">Compute T-embedding</button>
</div>

<div id="loading-msg" style="display: none; padding: 10px; background: #ffe; border: 1px solid #cc0; margin-bottom: 10px;">
  Loading WASM module...
</div>

<details id="stepwise-section" style="margin-top: 15px;" open>
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #e8f4e8; border: 1px solid #9c9;">Step-by-step T-embedding construction</summary>
  <div style="margin-top: 10px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">
    <div style="margin-bottom: 10px;">
      <button id="step-prev-btn" style="width: 30px;">&lt;</button>
      <label style="margin: 0 10px;">Level m = <span id="step-value">1</span></label>
      <button id="step-next-btn" style="width: 30px;">&gt;</button>
      <span id="step-info" style="margin-left: 10px; color: #666;"></span>
    </div>
    <div style="flex: 1; min-width: 400px;">
      <h4 style="margin: 0 0 10px 0;">T-embedding at level m</h4>
      <canvas id="stepwise-temb-canvas" style="width: 100%; height: 60vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>
    </div>
    <div style="margin-top: 10px;">
      <label><input type="checkbox" id="show-labels-chk" checked> Show T(j,k) labels</label>
    </div>
    <div id="vertex-info" style="margin-top: 10px; padding: 10px; background: #fff; border: 1px solid #ddd; min-height: 60px; font-family: monospace; font-size: 12px;">
      <em>Click on a vertex to see its formula and dependencies</em>
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
#stepwise-temb-canvas.panning { cursor: grabbing; }
</style>

<script src="/js/2025-12-11-t-embedding-arbitrary-weights.js"></script>

<script>
(function() {
  const loadingMsg = document.getElementById('loading-msg');
  const stepwiseCanvas = document.getElementById('stepwise-temb-canvas');
  const stepwiseCtx = stepwiseCanvas.getContext('2d');

  // T-embedding data
  let tembData = null;
  let wasmReady = false;

  // WASM function wrappers
  let setN, initCoefficients, computeTembedding, getTembeddingJSON, freeString;

  // Step-by-step state
  let currentStep = 1;
  let maxStep = 5;

  // Vertex selection state
  let selectedVertex = null;
  let highlightedDeps = new Set();
  let vertexScreenPositions = [];

  // Canvas pan/zoom
  let stepwiseZoom = 1.0;
  let stepwisePanX = 0, stepwisePanY = 0;
  let stepwiseIsPanning = false;
  let stepwiseLastPanX = 0, stepwiseLastPanY = 0;

  // Initialize WASM
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

      wasmReady = true;
      loadingMsg.style.display = 'none';

      // Auto-compute on load
      const n = parseInt(document.getElementById('n-input').value) || 5;
      setN(n);
      computeAndDisplay();
    };

    if (Module.calledRun) {
      Module.onRuntimeInitialized();
    }
  }

  function computeAndDisplay() {
    if (!wasmReady) return;

    const n = parseInt(document.getElementById('n-input').value) || 5;
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

  // Event listeners
  document.getElementById('compute-btn').addEventListener('click', computeAndDisplay);

  document.getElementById('n-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') computeAndDisplay();
  });

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

  document.getElementById('show-labels-chk').addEventListener('change', renderStepwiseTemb);

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

  window.addEventListener('resize', renderStepwiseTemb);

  // Initialize
  initWasm();
})();
</script>
