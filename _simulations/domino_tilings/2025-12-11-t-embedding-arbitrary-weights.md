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
  <label>n: <input id="n-input" type="number" value="5" min="1" max="50" style="width: 60px;"></label>
  <button id="draw-btn" style="margin-left: 10px;">Draw</button>
  <button id="fold-btn" style="margin-left: 10px;">Urban renewal (n&nbsp;→&nbsp;n-1)</button>
  <button id="temb-btn" style="margin-left: 10px;">Compute T-embedding</button>
  <button id="zoom-in-btn" style="margin-left: 10px;">+</button>
  <button id="zoom-out-btn">−</button>
  <button id="reset-zoom-btn" style="margin-left: 10px;">Reset Zoom</button>
</div>

<div style="margin-bottom: 10px;">
  <label><input type="checkbox" id="granular-chk"> Granular urban renewal:</label>
  <button id="step1-btn" style="margin-left: 10px;" disabled>Step 1: Transform weights</button>
  <button id="step2-btn" style="opacity: 0.4;" disabled>Step 2: Strip boundary</button>
  <button id="step3-btn" style="opacity: 0.4;" disabled>Step 3: Swap colors</button>
</div>

<div style="margin-bottom: 10px;">
  <label>Periodicity:
    <label style="margin-left: 10px;">k: <input id="k-input" type="number" value="2" min="1" max="5" style="width: 40px;"></label>
    <label>l: <input id="l-input" type="number" value="2" min="1" max="5" style="width: 40px;"></label>
  </label>
  <button id="edit-weights-btn" style="margin-left: 10px;">Edit periodic weights</button>
  <button id="uniform-btn" style="margin-left: 10px;">Uniform (all 1s)</button>
  <button id="random-btn">Random</button>
</div>

<div id="weights-editor" style="display: none; margin-bottom: 10px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9; max-height: 300px; overflow-y: auto;">
  <div id="weights-tables"></div>
  <button id="close-weights-btn" style="margin-top: 10px;">Close</button>
</div>

<div id="loading-msg" style="display: none; padding: 10px; background: #ffe; border: 1px solid #cc0; margin-bottom: 10px;">
  Loading WASM module...
</div>

<canvas id="temb-canvas" style="width: 100%; height: 70vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>

<details style="margin-top: 15px;">
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #f0f0f0; border: 1px solid #ccc;">Show original Aztec diamond with edge weights</summary>
  <canvas id="aztec-canvas" style="width: 100%; height: 70vh; border: 1px solid #ccc; background: #fafafa; cursor: grab; margin-top: 10px;"></canvas>
</details>

<style>
#aztec-canvas.panning { cursor: grabbing; }
.weight-tables-row { display: flex; flex-wrap: wrap; gap: 15px; }
.weight-table { margin-bottom: 10px; }
.weight-table input { width: 50px; margin: 2px; }
.weight-table th, .weight-table td { padding: 2px 5px; text-align: center; }
</style>

<script src="/js/2025-12-11-t-embedding-arbitrary-weights.js"></script>

<script>
(function() {
  const canvas = document.getElementById('aztec-canvas');
  const ctx = canvas.getContext('2d');
  const tembCanvas = document.getElementById('temb-canvas');
  const tembCtx = tembCanvas.getContext('2d');
  const loadingMsg = document.getElementById('loading-msg');

  // UI state
  let zoom = 1.0;
  let panX = 0, panY = 0;
  let isPanning = false;
  let lastPanX = 0, lastPanY = 0;

  // T-embedding canvas state
  let tembZoom = 1.0;
  let tembPanX = 0, tembPanY = 0;
  let tembIsPanning = false;
  let tembLastPanX = 0, tembLastPanY = 0;

  // Data from WASM (source of truth)
  let edges = [];
  let faces = [];
  let weights = { k: 2, l: 2, n: 5, alpha: [[1,1],[1,1]], beta: [[1,1],[1,1]], gamma: [[1,1],[1,1]] };

  // T-embedding data
  let tembData = null;

  // Highlighting state
  let highlightedEdges = new Set();
  let highlightedFaces = new Set();
  let highlightTimeout = null;

  // WASM module interface
  let wasmReady = false;
  let setN, setPeriodicParams, initWeights, setWeight, getWeightsJSON, getEdgesJSON, getFacesJSON, freeString, foldWeights;
  let urbanRenewalStep1, urbanRenewalStep2, urbanRenewalStep3;
  let computeTembedding, getTembeddingJSON;

  // Initialize when Module is ready
  function initWasm() {
    if (typeof Module === 'undefined') {
      setTimeout(initWasm, 100);
      return;
    }

    loadingMsg.style.display = 'block';

    Module.onRuntimeInitialized = function() {
      // Wrap exported functions
      setN = Module.cwrap('setN', null, ['number']);
      setPeriodicParams = Module.cwrap('setPeriodicParams', null, ['number', 'number']);
      initWeights = Module.cwrap('initWeights', null, []);
      setWeight = Module.cwrap('setWeight', null, ['number', 'number', 'number', 'number']);
      getWeightsJSON = Module.cwrap('getWeightsJSON', 'number', []);
      getEdgesJSON = Module.cwrap('getEdgesJSON', 'number', []);
      getFacesJSON = Module.cwrap('getFacesJSON', 'number', []);
      freeString = Module.cwrap('freeString', null, ['number']);
      foldWeights = Module.cwrap('foldWeights', null, []);
      urbanRenewalStep1 = Module.cwrap('urbanRenewalStep1', null, []);
      urbanRenewalStep2 = Module.cwrap('urbanRenewalStep2', null, []);
      urbanRenewalStep3 = Module.cwrap('urbanRenewalStep3', null, []);
      computeTembedding = Module.cwrap('computeTembedding', null, ['number']);
      getTembeddingJSON = Module.cwrap('getTembeddingJSON', 'number', []);

      wasmReady = true;
      loadingMsg.style.display = 'none';

      // Initialize with default values
      const n = parseInt(document.getElementById('n-input').value) || 5;
      const k = parseInt(document.getElementById('k-input').value) || 2;
      const l = parseInt(document.getElementById('l-input').value) || 2;

      setPeriodicParams(k, l);
      setN(n);
      initWeights();

      // Load data from WASM
      loadFromWasm();
      render();

      // Automatically compute and display T-embedding on load
      setTimeout(() => {
        computeAndDisplayTembedding();
      }, 100);
    };

    // If already initialized (e.g., page reload with cached module)
    if (Module.calledRun) {
      Module.onRuntimeInitialized();
    }
  }

  // Load all data from WASM
  function loadFromWasm() {
    if (!wasmReady) return;

    // Get weights
    let ptr = getWeightsJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    weights = JSON.parse(jsonStr);

    // Get edges
    ptr = getEdgesJSON();
    jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    edges = JSON.parse(jsonStr);

    // Get faces
    ptr = getFacesJSON();
    jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    faces = JSON.parse(jsonStr);
  }

  // Check if point is in diamond (for rendering only)
  function inDiamond(x, y) {
    return Math.abs(x) + Math.abs(y) <= weights.n + 0.5;
  }

  function render() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (!wasmReady || weights.n === 0) return;

    const n = weights.n;
    const baseScale = Math.min(rect.width, rect.height) / (2 * n + 4);
    const scale = baseScale * zoom;
    const cx = rect.width / 2 + panX * zoom;
    const cy = rect.height / 2 + panY * zoom;

    ctx.save();
    ctx.translate(cx, cy);

    // Draw checkerboard faces using WASM face data for correct coloring
    for (const f of faces) {
      const x = (f.x - 0.5) * scale;
      const y = -(f.y + 0.5) * scale;
      ctx.fillStyle = f.isBlack ? '#e8e8e8' : '#ffffff';
      ctx.fillRect(x, y, scale, scale);
    }

    // Draw face weights from WASM data
    const faceFontSize = Math.max(5, scale / 8);
    ctx.font = `${faceFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const f of faces) {
      const fx = f.x * scale;
      const fy = -f.y * scale;

      const wText = f.weight === 1 ? '1' : f.weight.toFixed(2).replace(/\.?0+$/, '');
      const textWidth = ctx.measureText(wText).width;
      const padX = 2, padY = 1;
      const boxW = textWidth + padX * 2;
      const boxH = faceFontSize + padY * 2;

      const isHighlighted = highlightedFaces.has(f.key);
      ctx.fillStyle = isHighlighted ? '#ffffcc' : (f.isBlack ? '#d8d8d8' : '#f8f8f8');
      ctx.fillRect(fx - boxW / 2, fy - boxH / 2, boxW, boxH);
      ctx.strokeStyle = isHighlighted ? '#cc9900' : '#aaa';
      ctx.lineWidth = isHighlighted ? 1 : 0.3;
      ctx.strokeRect(fx - boxW / 2, fy - boxH / 2, boxW, boxH);

      ctx.fillStyle = '#555';
      ctx.fillText(wText, fx, fy);
    }

    // Draw edges
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(1, scale / 15);

    for (const e of edges) {
      ctx.beginPath();
      ctx.moveTo(e.x1 * scale, -e.y1 * scale);
      ctx.lineTo(e.x2 * scale, -e.y2 * scale);
      ctx.stroke();
    }

    // Draw weight labels on edges
    const fontSize = Math.max(6, scale / 6);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const e of edges) {
      const midX = ((e.x1 + e.x2) / 2) * scale;
      const midY = -((e.y1 + e.y2) / 2) * scale;

      const label = e.weight === 1 ? '1' : e.weight.toFixed(2).replace(/\.?0+$/, '');

      const textWidth = ctx.measureText(label).width;
      const padX = 2, padY = 1;
      const boxW = textWidth + padX * 2;
      const boxH = fontSize + padY * 2;

      const isHighlighted = highlightedEdges.has(e.key);
      ctx.fillStyle = isHighlighted ? '#ffcccc' : '#fff';
      ctx.fillRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
      ctx.strokeStyle = isHighlighted ? '#cc0000' : '#999';
      ctx.lineWidth = isHighlighted ? 1 : 0.5;
      ctx.strokeRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);

      ctx.fillStyle = '#333';
      ctx.fillText(label, midX, midY);
    }

    // Draw vertices
    const coords = [];
    for (let kk = -n; kk <= n; kk++) {
      coords.push(kk - 0.5);
      coords.push(kk + 0.5);
    }
    const vertexRadius = Math.max(3, scale / 10);
    for (const i of coords) {
      for (const j of coords) {
        if (!inDiamond(i, j)) continue;
        const x = i * scale;
        const y = -j * scale;

        const sum = Math.round((i + j) * 2);
        const isBlack = (sum % 4 !== 0);

        ctx.beginPath();
        ctx.arc(x, y, vertexRadius, 0, Math.PI * 2);
        if (isBlack) {
          ctx.fillStyle = '#000';
          ctx.fill();
        } else {
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = Math.max(1, scale / 20);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  // Render T-embedding
  function renderTemb() {
    if (!tembData || !tembData.vertices || tembData.vertices.length === 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = tembCanvas.getBoundingClientRect();
    tembCanvas.width = rect.width * dpr;
    tembCanvas.height = rect.height * dpr;
    tembCtx.scale(dpr, dpr);

    tembCtx.fillStyle = '#fafafa';
    tembCtx.fillRect(0, 0, rect.width, rect.height);

    // Find bounds of T-embedding
    let minReal = Infinity, maxReal = -Infinity;
    let minImag = Infinity, maxImag = -Infinity;
    for (const v of tembData.vertices) {
      minReal = Math.min(minReal, v.tReal);
      maxReal = Math.max(maxReal, v.tReal);
      minImag = Math.min(minImag, v.tImag);
      maxImag = Math.max(maxImag, v.tImag);
    }

    const rangeReal = maxReal - minReal || 1;
    const rangeImag = maxImag - minImag || 1;
    const centerReal = (minReal + maxReal) / 2;
    const centerImag = (minImag + maxImag) / 2;

    // Scale to fit canvas
    const padding = 50;
    const scaleX = (rect.width - 2 * padding) / rangeReal;
    const scaleY = (rect.height - 2 * padding) / rangeImag;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * tembZoom;

    const cx = rect.width / 2 + tembPanX * tembZoom;
    const cy = rect.height / 2 + tembPanY * tembZoom;

    tembCtx.save();
    tembCtx.translate(cx, cy);

    // Create a map for quick vertex lookup
    const vertexMap = {};
    for (const v of tembData.vertices) {
      vertexMap[v.key] = v;
    }

    // Draw faces as quadrilaterals
    // Faces are indexed by their center (fx, fy)
    // The four corners are: (fx-0.5, fy-0.5), (fx+0.5, fy-0.5), (fx+0.5, fy+0.5), (fx-0.5, fy+0.5)
    // These correspond to neighboring face centers in the T-embedding
    const n = tembData.originalN;

    // Draw face quadrilaterals
    for (const v of tembData.vertices) {
      const fx = v.x;
      const fy = v.y;

      // Determine if this is a black or white face
      const isBlack = (fx + fy) % 2 === 0;

      // Get the 4 neighboring vertices to form the quadrilateral
      // The T-embedding maps face centers, so we draw edges between adjacent face centers
      const neighbors = [
        `${fx-1},${fy}`,
        `${fx},${fy+1}`,
        `${fx+1},${fy}`,
        `${fx},${fy-1}`
      ];

      // Draw edges to neighbors that exist
      tembCtx.strokeStyle = '#333';
      tembCtx.lineWidth = Math.max(1, scale / 30);

      for (const nKey of neighbors) {
        if (vertexMap[nKey]) {
          const nv = vertexMap[nKey];
          tembCtx.beginPath();
          tembCtx.moveTo((v.tReal - centerReal) * scale, -(v.tImag - centerImag) * scale);
          tembCtx.lineTo((nv.tReal - centerReal) * scale, -(nv.tImag - centerImag) * scale);
          tembCtx.stroke();
        }
      }
    }

    // Draw vertices
    const vertexRadius = Math.max(3, scale / 20);
    for (const v of tembData.vertices) {
      const x = (v.tReal - centerReal) * scale;
      const y = -(v.tImag - centerImag) * scale;

      const isBlack = (v.x + v.y) % 2 === 0;

      tembCtx.beginPath();
      tembCtx.arc(x, y, vertexRadius, 0, Math.PI * 2);
      if (isBlack) {
        tembCtx.fillStyle = '#000';
        tembCtx.fill();
      } else {
        tembCtx.fillStyle = '#fff';
        tembCtx.fill();
        tembCtx.strokeStyle = '#000';
        tembCtx.lineWidth = Math.max(1, scale / 40);
        tembCtx.stroke();
      }
    }

    tembCtx.restore();

    // Draw info text
    tembCtx.fillStyle = '#333';
    tembCtx.font = '12px sans-serif';
    tembCtx.fillText(`T-embedding (n=${tembData.originalN}, ${tembData.numLevels} levels folded)`, 10, 20);
  }

  function resetZoom() {
    zoom = 1.0;
    panX = 0;
    panY = 0;
    render();
  }

  function redraw() {
    if (!wasmReady) return;
    loadFromWasm();
    render();
  }

  // Weights editor
  function buildWeightsEditor() {
    if (!wasmReady) return;

    const container = document.getElementById('weights-tables');
    container.innerHTML = '';

    const params = [
      { name: 'α (bottom)', arr: weights.alpha, paramIdx: 0 },
      { name: 'β (right)', arr: weights.beta, paramIdx: 1 },
      { name: 'γ (left)', arr: weights.gamma, paramIdx: 2 }
    ];

    // Create a row container for side-by-side tables
    let rowHtml = '<div class="weight-tables-row">';

    for (const param of params) {
      let html = `<div class="weight-table"><strong>${param.name}:</strong><table><tr><th>j\\i</th>`;
      for (let i = 0; i < weights.l; i++) {
        html += `<th>${i+1}</th>`;
      }
      html += '</tr>';
      for (let j = 0; j < weights.k; j++) {
        html += `<tr><th>${j+1}</th>`;
        for (let i = 0; i < weights.l; i++) {
          const val = param.arr[j] ? param.arr[j][i] : 1;
          html += `<td><input type="number" step="0.1" min="0.01" data-param="${param.paramIdx}" data-j="${j}" data-i="${i}" value="${val}"></td>`;
        }
        html += '</tr>';
      }
      html += '</table></div>';
      rowHtml += html;
    }

    rowHtml += '</div>';
    container.innerHTML = rowHtml;

    container.innerHTML += '<p style="font-size: 0.85em; color: #666; margin-top: 5px;">NE edge weight is always 1. Total: 3kl free weights.</p>';

    // Add responsive input listeners
    container.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', applyWeightsFromEditor);
    });
  }

  function applyWeightsFromEditor(evt) {
    if (!wasmReady) return;

    const changedInput = evt && evt.target ? evt.target : null;
    let changedParam = null, changedJ = null, changedI = null;

    if (changedInput && changedInput.dataset) {
      changedParam = parseInt(changedInput.dataset.param);
      changedJ = parseInt(changedInput.dataset.j);
      changedI = parseInt(changedInput.dataset.i);
      const val = parseFloat(changedInput.value) || 1;

      // Update WASM with the new weight
      setWeight(changedParam, changedJ, changedI, val);
    }

    // Reload data from WASM
    loadFromWasm();

    // Highlight affected edges and faces
    if (changedParam !== null) {
      if (highlightTimeout) clearTimeout(highlightTimeout);
      highlightedEdges.clear();
      highlightedFaces.clear();

      const paramName = ['alpha', 'beta', 'gamma'][changedParam];

      // Find edges matching the changed cell
      for (const e of edges) {
        if (e.dir === paramName && e.j === changedJ && e.i === changedI) {
          highlightedEdges.add(e.key);

          // Find adjacent faces
          if (e.horizontal) {
            const faceAbove = `${Math.round((e.x1 + e.x2) / 2)},${Math.round(e.y1 + 0.5)}`;
            const faceBelow = `${Math.round((e.x1 + e.x2) / 2)},${Math.round(e.y1 - 0.5)}`;
            highlightedFaces.add(faceAbove);
            highlightedFaces.add(faceBelow);
          } else {
            const faceRight = `${Math.round(e.x1 + 0.5)},${Math.round((e.y1 + e.y2) / 2)}`;
            const faceLeft = `${Math.round(e.x1 - 0.5)},${Math.round((e.y1 + e.y2) / 2)}`;
            highlightedFaces.add(faceRight);
            highlightedFaces.add(faceLeft);
          }
        }
      }

      render();

      highlightTimeout = setTimeout(() => {
        highlightedEdges.clear();
        highlightedFaces.clear();
        render();
      }, 3000);
    } else {
      render();
    }
  }

  // Mouse handlers for panning
  function handleMouseDown(e) {
    isPanning = true;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    canvas.classList.add('panning');
  }

  function handleMouseMove(e) {
    if (!isPanning) return;
    const dx = e.clientX - lastPanX;
    const dy = e.clientY - lastPanY;
    panX += dx / zoom;
    panY += dy / zoom;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    render();
  }

  function handleMouseUp() {
    isPanning = false;
    canvas.classList.remove('panning');
  }

  function handleWheel(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoom = Math.max(0.1, Math.min(20, zoom * factor));
    render();
  }

  // Event listeners
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
  canvas.addEventListener('wheel', handleWheel, { passive: false });

  document.getElementById('draw-btn').addEventListener('click', () => {
    if (!wasmReady) return;
    const n = parseInt(document.getElementById('n-input').value) || 5;
    setN(n);
    loadFromWasm();
    resetZoom();
  });

  document.getElementById('fold-btn').addEventListener('click', () => {
    if (!wasmReady) return;
    if (weights.n <= 1) return;
    foldWeights();
    loadFromWasm();
    document.getElementById('n-input').value = weights.n;
    render();
  });

  // Function to compute and display T-embedding from current weights
  function computeAndDisplayTembedding() {
    if (!wasmReady) return;

    // Compute T-embedding using current n and weights
    // (WASM function handles folding internally)
    const n = weights.n;
    computeTembedding(n);

    // Get T-embedding data
    let ptr = getTembeddingJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    tembData = JSON.parse(jsonStr);

    // Reload from WASM to restore original n (T-embedding computation may have folded)
    loadFromWasm();
    document.getElementById('n-input').value = weights.n;

    // Show T-embedding canvas and render
    tembCanvas.style.display = 'block';
    tembZoom = 1.0;
    tembPanX = 0;
    tembPanY = 0;
    renderTemb();
  }

  document.getElementById('temb-btn').addEventListener('click', computeAndDisplayTembedding);

  // T-embedding canvas mouse handlers
  tembCanvas.addEventListener('mousedown', (e) => {
    tembIsPanning = true;
    tembLastPanX = e.clientX;
    tembLastPanY = e.clientY;
    tembCanvas.style.cursor = 'grabbing';
  });

  tembCanvas.addEventListener('mousemove', (e) => {
    if (!tembIsPanning) return;
    const dx = e.clientX - tembLastPanX;
    const dy = e.clientY - tembLastPanY;
    tembPanX += dx / tembZoom;
    tembPanY += dy / tembZoom;
    tembLastPanX = e.clientX;
    tembLastPanY = e.clientY;
    renderTemb();
  });

  tembCanvas.addEventListener('mouseup', () => {
    tembIsPanning = false;
    tembCanvas.style.cursor = 'grab';
  });

  tembCanvas.addEventListener('mouseleave', () => {
    tembIsPanning = false;
    tembCanvas.style.cursor = 'grab';
  });

  tembCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    tembZoom = Math.max(0.1, Math.min(20, tembZoom * factor));
    renderTemb();
  }, { passive: false });

  // Granular urban renewal controls
  let urbanRenewalStep = 1;  // Track current step (1, 2, or 3)

  function updateStepButtons() {
    const enabled = document.getElementById('granular-chk').checked;
    const btn1 = document.getElementById('step1-btn');
    const btn2 = document.getElementById('step2-btn');
    const btn3 = document.getElementById('step3-btn');

    btn1.disabled = !enabled || urbanRenewalStep !== 1;
    btn2.disabled = !enabled || urbanRenewalStep !== 2;
    btn3.disabled = !enabled || urbanRenewalStep !== 3;

    btn1.style.opacity = (enabled && urbanRenewalStep === 1) ? '1' : '0.4';
    btn2.style.opacity = (enabled && urbanRenewalStep === 2) ? '1' : '0.4';
    btn3.style.opacity = (enabled && urbanRenewalStep === 3) ? '1' : '0.4';
  }

  document.getElementById('granular-chk').addEventListener('change', () => {
    updateStepButtons();
  });

  document.getElementById('step1-btn').addEventListener('click', () => {
    if (!wasmReady || weights.n <= 1) return;
    urbanRenewalStep1();
    loadFromWasm();
    render();
    urbanRenewalStep = 2;
    updateStepButtons();
  });

  document.getElementById('step2-btn').addEventListener('click', () => {
    if (!wasmReady || weights.n <= 1) return;
    urbanRenewalStep2();
    loadFromWasm();
    document.getElementById('n-input').value = weights.n;
    render();
    urbanRenewalStep = 3;
    updateStepButtons();
  });

  document.getElementById('step3-btn').addEventListener('click', () => {
    if (!wasmReady) return;
    urbanRenewalStep3();
    loadFromWasm();
    render();
    urbanRenewalStep = 1;  // Reset to step 1 for next cycle
    updateStepButtons();
  });

  document.getElementById('reset-zoom-btn').addEventListener('click', resetZoom);

  document.getElementById('zoom-in-btn').addEventListener('click', () => {
    zoom = Math.min(20, zoom * 1.3);
    render();
  });

  document.getElementById('zoom-out-btn').addEventListener('click', () => {
    zoom = Math.max(0.1, zoom / 1.3);
    render();
  });

  document.getElementById('n-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && wasmReady) {
      const n = parseInt(e.target.value) || 5;
      setN(n);
      loadFromWasm();
      resetZoom();
    }
  });

  document.getElementById('k-input').addEventListener('change', (e) => {
    if (!wasmReady) return;
    let k = Math.max(1, Math.min(5, parseInt(e.target.value) || 2));
    e.target.value = k;
    const l = parseInt(document.getElementById('l-input').value) || 2;
    setPeriodicParams(k, l);
    initWeights();
    loadFromWasm();
    // Rebuild weights editor if open
    if (document.getElementById('weights-editor').style.display !== 'none') {
      buildWeightsEditor();
    }
    render();
  });

  document.getElementById('l-input').addEventListener('change', (e) => {
    if (!wasmReady) return;
    let l = Math.max(1, Math.min(5, parseInt(e.target.value) || 2));
    e.target.value = l;
    const k = parseInt(document.getElementById('k-input').value) || 2;
    setPeriodicParams(k, l);
    initWeights();
    loadFromWasm();
    // Rebuild weights editor if open
    if (document.getElementById('weights-editor').style.display !== 'none') {
      buildWeightsEditor();
    }
    render();
  });

  document.getElementById('edit-weights-btn').addEventListener('click', () => {
    buildWeightsEditor();
    document.getElementById('weights-editor').style.display = 'block';
  });

  document.getElementById('close-weights-btn').addEventListener('click', () => {
    document.getElementById('weights-editor').style.display = 'none';
  });

  document.getElementById('uniform-btn').addEventListener('click', () => {
    if (!wasmReady) return;
    // Set all weights to 1
    for (let j = 0; j < weights.k; j++) {
      for (let i = 0; i < weights.l; i++) {
        setWeight(0, j, i, 1);  // alpha
        setWeight(1, j, i, 1);  // beta
        setWeight(2, j, i, 1);  // gamma
      }
    }
    loadFromWasm();
    if (document.getElementById('weights-editor').style.display !== 'none') {
      buildWeightsEditor();
    }
    render();
  });

  document.getElementById('random-btn').addEventListener('click', () => {
    if (!wasmReady) return;
    // Set random weights between 0.1 and 2.0
    for (let j = 0; j < weights.k; j++) {
      for (let i = 0; i < weights.l; i++) {
        setWeight(0, j, i, 0.1 + Math.random() * 1.9);  // alpha
        setWeight(1, j, i, 0.1 + Math.random() * 1.9);  // beta
        setWeight(2, j, i, 0.1 + Math.random() * 1.9);  // gamma
      }
    }
    loadFromWasm();
    if (document.getElementById('weights-editor').style.display !== 'none') {
      buildWeightsEditor();
    }
    render();
  });

  window.addEventListener('resize', () => {
    render();
    if (tembData) renderTemb();
  });

  // Initialize WASM
  initWasm();
})();
</script>
