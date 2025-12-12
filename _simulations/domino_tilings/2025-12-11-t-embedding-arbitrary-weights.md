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
  <label>n: <input id="n-input" type="number" value="4" min="1" max="50" style="width: 60px;"></label>
  <button id="draw-btn" style="margin-left: 10px;">Set</button>
  <button id="temb-btn" style="margin-left: 10px;">Compute T-embedding</button>
</div>

<div style="margin-bottom: 10px;">
  <label>Periodicity:
    <label style="margin-left: 10px;">k: <input id="k-input" type="number" value="2" min="1" max="5" style="width: 40px;"></label>
    <label>l: <input id="l-input" type="number" value="2" min="1" max="5" style="width: 40px;"></label>
  </label>
  <button id="edit-weights-btn" style="margin-left: 10px;">Edit periodic weights</button>
  <button id="example-2x2-btn" style="margin-left: 10px;">2×2 Example</button>
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

<details style="margin-top: 15px;">
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #f0f0f0; border: 1px solid #ccc;">Original Aztec diamond with edge weights</summary>
  <canvas id="aztec-canvas" style="width: 100%; height: 70vh; border: 1px solid #ccc; background: #fafafa; cursor: grab; margin-top: 10px;"></canvas>
  <div style="margin-top: 10px;">
    <button id="fold-btn">Urban renewal (n&nbsp;→&nbsp;n-1)</button>
  </div>
  <div style="margin-top: 10px;">
    <label><input type="checkbox" id="granular-chk"> Granular urban renewal:</label>
    <button id="step1-btn" style="margin-left: 10px;" disabled>Step 1: Transform weights</button>
    <button id="step2-btn" style="opacity: 0.4;" disabled>Step 2: Strip boundary</button>
    <button id="step3-btn" style="opacity: 0.4;" disabled>Step 3: Swap colors</button>
  </div>
</details>

<details id="stepwise-section" style="margin-top: 15px;" open>
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #e8f4e8; border: 1px solid #9c9;">Step-by-step T-embedding construction (n ≤ 15)</summary>
  <div style="margin-top: 10px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">
    <div style="margin-bottom: 10px;">
      <button id="step-prev-btn" style="width: 30px;">&lt;</button>
      <label style="margin: 0 10px;">Step m = <span id="step-value">1</span></label>
      <button id="step-next-btn" style="width: 30px;">&gt;</button>
      <span id="step-info" style="margin-left: 10px; color: #666;"></span>
    </div>
    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 300px;">
        <h4 style="margin: 0 0 10px 0;">Face weights c<sub>j,k</sub> at level m</h4>
        <div id="face-weights-display" style="max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 11px; background: #fff; padding: 5px; border: 1px solid #ddd;"></div>
      </div>
      <div style="flex: 2; min-width: 400px;">
        <h4 style="margin: 0 0 10px 0;">T-embedding at level m (with face shading)</h4>
        <canvas id="stepwise-temb-canvas" style="width: 100%; height: 50vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>
      </div>
    </div>
    <div style="margin-top: 10px;">
      <label><input type="checkbox" id="show-labels-chk" checked> Show T(j,k) labels</label>
    </div>
    <div id="vertex-info" style="margin-top: 10px; padding: 10px; background: #fff; border: 1px solid #ddd; min-height: 60px; font-family: monospace; font-size: 12px;">
      <em>Click on a vertex to see its formula and dependencies</em>
    </div>
  </div>
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
  const loadingMsg = document.getElementById('loading-msg');

  // UI state
  let zoom = 1.6;
  let panX = 0, panY = 0;
  let isPanning = false;
  let lastPanX = 0, lastPanY = 0;

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
  let computeTembedding, getTembeddingJSON, setAFormulaChoice;

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
      // Use longer delay to ensure WASM state is fully initialized
      setTimeout(() => {
        // Re-init to ensure clean state
        setPeriodicParams(k, l);
        setN(n);
        initWeights();
        loadFromWasm();
        computeAndDisplayTembedding();
      }, 200);
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

    // Only render the detailed Aztec diamond for n <= 15
    if (n > 15) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Aztec diamond rendering disabled for n > 15 (current n = ${n})`, rect.width / 2, rect.height / 2);
      return;
    }
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
    const faceFontSize = Math.max(8, scale / 5);
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
    const fontSize = Math.max(9, scale / 4);
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

  function resetZoom() {
    zoom = 1.6;
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

    // Update step-by-step visualization
    updateStepRange();
    displayFaceWeights(currentStep);
    renderStepwiseTemb();
  }

  document.getElementById('temb-btn').addEventListener('click', computeAndDisplayTembedding);

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
    // Set random weights between 0.5 and 2.0
    for (let j = 0; j < weights.k; j++) {
      for (let i = 0; i < weights.l; i++) {
        setWeight(0, j, i, 0.5 + Math.random() * 1.5);  // alpha
        setWeight(1, j, i, 0.5 + Math.random() * 1.5);  // beta
        setWeight(2, j, i, 0.5 + Math.random() * 1.5);  // gamma
      }
    }
    loadFromWasm();
    if (document.getElementById('weights-editor').style.display !== 'none') {
      buildWeightsEditor();
    }
    render();
  });

  document.getElementById('example-2x2-btn').addEventListener('click', () => {
    if (!wasmReady) return;
    // Set periodicity to 2x2
    document.getElementById('k-input').value = 2;
    document.getElementById('l-input').value = 2;
    setPeriodicParams(2, 2);
    initWeights();
    // Set the interesting 2x2 example weights:
    // α (bottom): all 1s
    // β (right): β[0][0]=1, β[0][1]=4, β[1][0]=4, β[1][1]=1
    // γ (left): γ[0][0]=4, γ[0][1]=1, γ[1][0]=4, γ[1][1]=1
    setWeight(1, 0, 0, 1);  // beta[0][0]
    setWeight(1, 0, 1, 4);  // beta[0][1]
    setWeight(1, 1, 0, 4);  // beta[1][0]
    setWeight(1, 1, 1, 1);  // beta[1][1]
    setWeight(2, 0, 0, 4);  // gamma[0][0]
    setWeight(2, 0, 1, 1);  // gamma[0][1]
    setWeight(2, 1, 0, 4);  // gamma[1][0]
    setWeight(2, 1, 1, 1);  // gamma[1][1]
    loadFromWasm();
    if (document.getElementById('weights-editor').style.display !== 'none') {
      buildWeightsEditor();
    }
    render();
  });

  window.addEventListener('resize', () => {
    render();
    renderStepwiseTemb();
  });

  // ========== STEP-BY-STEP T-EMBEDDING VISUALIZATION ==========
  const stepwiseCanvas = document.getElementById('stepwise-temb-canvas');
  const stepwiseCtx = stepwiseCanvas.getContext('2d');
  const stepPrevBtn = document.getElementById('step-prev-btn');
  const stepNextBtn = document.getElementById('step-next-btn');
  const stepValue = document.getElementById('step-value');
  const stepInfo = document.getElementById('step-info');
  const faceWeightsDisplay = document.getElementById('face-weights-display');
  const vertexInfoDiv = document.getElementById('vertex-info');
  let currentStep = 1;
  let maxStep = 5;

  // Vertex highlighting state
  let selectedVertex = null;  // Currently selected vertex key
  let highlightedDeps = new Set();  // Set of dependency keys to highlight

  // Store vertex screen positions for hit testing
  let vertexScreenPositions = [];  // [{key, x, y, vertex}]

  // Stepwise canvas state
  let stepwiseZoom = 1.0;
  let stepwisePanX = 0, stepwisePanY = 0;
  let stepwiseIsPanning = false;
  let stepwiseLastPanX = 0, stepwiseLastPanY = 0;

  // Update step range when T-embedding is computed
  function updateStepRange() {
    if (!tembData || !tembData.tembHistory) return;
    maxStep = tembData.tembHistory.length;
    currentStep = Math.min(currentStep, maxStep);
    updateStepDisplay();
  }

  function updateStepDisplay() {
    stepValue.textContent = currentStep;
    stepPrevBtn.disabled = (currentStep <= 1);
    stepNextBtn.disabled = (currentStep >= maxStep);
    stepInfo.textContent = `(diamond size at this level: ${currentStep})`;
  }

  // Display face weights for current level
  function displayFaceWeights(level) {
    if (!tembData || !tembData.faceWeightsHistory) {
      faceWeightsDisplay.innerHTML = '<em>No data available</em>';
      return;
    }

    // Face weights history is indexed by fold level (0 = n, 1 = n-1, etc.)
    // T-embedding level m corresponds to faceWeightsHistory[n - m]
    const n = tembData.originalN;
    const histIdx = n - level;

    if (histIdx < 0 || histIdx >= tembData.faceWeightsHistory.length) {
      faceWeightsDisplay.innerHTML = '<em>Level out of range</em>';
      return;
    }

    const levelData = tembData.faceWeightsHistory[histIdx];
    if (!levelData || !levelData.faces || levelData.faces.length === 0) {
      faceWeightsDisplay.innerHTML = '<em>No faces at this level</em>';
      return;
    }

    // Build a lookup map for faces by (x,y)
    const faceMap = {};
    for (const f of levelData.faces) {
      faceMap[`${f.x},${f.y}`] = f;
    }

    const m = levelData.diamondSize;
    let html = `<div style="margin-bottom: 5px;"><strong>Diamond size: ${m}</strong> (colors ${levelData.colorsSwapped ? 'swapped' : 'normal'})</div>`;
    html += '<table style="border-collapse: collapse; font-size: 10px;">';

    // Display diamond shape properly: rows from y = m-1 down to -(m-1)
    // Each row has faces where |x| + |y| < m
    for (let y = m - 1; y >= -(m - 1); y--) {
      html += '<tr>';
      // Calculate how many empty cells to pad on left for diamond centering
      const rowWidth = m - Math.abs(y);  // number of faces in this row
      const maxRowWidth = m;  // max faces in any row (at y=0)
      const leftPad = maxRowWidth - rowWidth;

      // Add empty cells for centering
      for (let p = 0; p < leftPad; p++) {
        html += '<td style="border: none; width: 40px;"></td>';
      }

      // Add faces for this row: x from -(rowWidth-1) to (rowWidth-1) stepping by 2 for checkerboard
      const minX = -(m - 1 - Math.abs(y));
      const maxX = m - 1 - Math.abs(y);
      for (let x = minX; x <= maxX; x++) {
        // Faces exist where (x+y) has correct parity
        const f = faceMap[`${x},${y}`];
        if (f) {
          const wStr = f.w === 1 ? '1' : f.w.toFixed(3).replace(/\.?0+$/, '');
          const bgColor = f.isBlack ? '#d0d0d0' : '#fff';
          html += `<td style="border: 1px solid #999; padding: 2px 4px; background: ${bgColor}; text-align: center; min-width: 40px;" title="c(${f.x},${f.y})">${wStr}</td>`;
        } else {
          // Empty cell for the other checkerboard color
          html += '<td style="border: none; width: 40px;"></td>';
        }
      }
      html += '</tr>';
    }
    html += '</table>';

    faceWeightsDisplay.innerHTML = html;
  }

  // Render stepwise T-embedding at specific level with face shading
  function renderStepwiseTemb() {
    if (!tembData || !tembData.tembHistory || tembData.originalN > 15) {
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
      if (tembData && tembData.originalN > 15) {
        stepwiseCtx.fillText('Step-by-step visualization disabled for n > 15', rect.width / 2, rect.height / 2);
      } else {
        stepwiseCtx.fillText('Compute T-embedding first', rect.width / 2, rect.height / 2);
      }
      return;
    }

    const level = currentStep;
    const levelIdx = level - 1;  // tembHistory[0] is level 1

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

    // Use the same bounds as final T-embedding for consistent view
    let minReal = Infinity, maxReal = -Infinity;
    let minImag = Infinity, maxImag = -Infinity;

    // Use final level bounds
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

    // ==========================================================================
    // HARDCODED T-EMBEDDING GRAPH STRUCTURE -- DON'T TOUCH THESE EDGE DEFINITIONS!
    // ==========================================================================
    // T_m graph structure:
    // - Interior vertices: all (i,j) with |i|+|j| < m
    // - Exterior vertices (4 corners): (±m, 0) and (0, ±m)
    //
    // Edges:
    // 1. Interior edges: grid connections (±1 in one coordinate) between interior vertices
    // 2. Exterior rhombus: connect 4 corners to each other
    // 3. Corner-to-axis: (m,0)↔(m-1,0), (-m,0)↔(-m+1,0), (0,m)↔(0,m-1), (0,-m)↔(0,-m+1)
    // 4. Exterior face diagonals: (m-1,0)↔(m-2,1)↔...↔(0,m-1) and 3 symmetric sides
    // ==========================================================================

    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = Math.max(0.5, scale / 150);

    // Helper to draw edge between two vertices by key
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

    // 1. Interior edges: grid connections between all interior vertices (|i|+|j| < m)
    for (let i = -(m-1); i <= m-1; i++) {
      for (let j = -(m-1); j <= m-1; j++) {
        if (Math.abs(i) + Math.abs(j) >= m) continue;  // not interior
        // Connect to right neighbor (i+1, j) if also interior
        if (Math.abs(i+1) + Math.abs(j) < m) {
          drawEdge(`${i},${j}`, `${i+1},${j}`);
        }
        // Connect to top neighbor (i, j+1) if also interior
        if (Math.abs(i) + Math.abs(j+1) < m) {
          drawEdge(`${i},${j}`, `${i},${j+1}`);
        }
      }
    }

    // 2. Exterior rhombus: connect 4 corners
    stepwiseCtx.lineWidth = Math.max(1, scale / 100);
    drawEdge(`${-m},0`, `0,${m}`);   // left to top
    drawEdge(`0,${m}`, `${m},0`);    // top to right
    drawEdge(`${m},0`, `0,${-m}`);   // right to bottom
    drawEdge(`0,${-m}`, `${-m},0`);  // bottom to left

    // 3. Corner-to-axis edges (connect each corner to the nearest interior vertex on the axis)
    // For m=1: corners connect to (0,0); for m>1: corners connect to (±(m-1),0) and (0,±(m-1))
    stepwiseCtx.lineWidth = Math.max(0.5, scale / 150);
    drawEdge(`${m},0`, `${m-1},0`);     // right corner to interior
    drawEdge(`${-m},0`, `${-m+1},0`);   // left corner to interior
    drawEdge(`0,${m}`, `0,${m-1}`);     // top corner to interior
    drawEdge(`0,${-m}`, `0,${-m+1}`);   // bottom corner to interior

    // 4. Exterior face diagonal edges along |i|+|j| = m-1
    // These form the inner boundary of the 4 exterior triangular faces
    if (m > 1) {
      // Upper-right face: (m-1,0) -- (m-2,1) -- ... -- (1,m-2) -- (0,m-1)
      for (let k = 0; k < m-1; k++) {
        drawEdge(`${m-1-k},${k}`, `${m-2-k},${k+1}`);
      }
      // Upper-left face: (0,m-1) -- (-1,m-2) -- ... -- (-m+2,1) -- (-m+1,0)
      for (let k = 0; k < m-1; k++) {
        drawEdge(`${-k},${m-1-k}`, `${-k-1},${m-2-k}`);
      }
      // Lower-left face: (-m+1,0) -- (-m+2,-1) -- ... -- (-1,-m+2) -- (0,-m+1)
      for (let k = 0; k < m-1; k++) {
        drawEdge(`${-m+1+k},${-k}`, `${-m+2+k},${-k-1}`);
      }
      // Lower-right face: (0,-m+1) -- (1,-m+2) -- ... -- (m-2,-1) -- (m-1,0)
      for (let k = 0; k < m-1; k++) {
        drawEdge(`${k},${-m+1+k}`, `${k+1},${-m+2+k}`);
      }
    }

    // Draw vertices and collect screen positions
    const vertexRadius = Math.max(3, scale / 100);
    const showLabels = document.getElementById('show-labels-chk').checked;
    vertexScreenPositions = [];

    for (const v of levelData.vertices) {
      const x = (v.tReal - centerReal) * scale;
      const y = (v.tImag - centerImag) * scale;

      // Store screen position for hit testing (in canvas coords after transform)
      vertexScreenPositions.push({
        key: v.key,
        screenX: x + cx,
        screenY: y + cy,
        vertex: v
      });

      // Determine vertex color based on selection/highlight state
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

      // Draw T(j,k) label
      if (showLabels) {
        const fontSize = Math.max(8, Math.min(11, scale / 80));
        stepwiseCtx.font = `${fontSize}px sans-serif`;
        stepwiseCtx.fillStyle = isSelected ? '#cc0000' : (isDep ? '#0044cc' : '#333');
        stepwiseCtx.textAlign = 'center';
        stepwiseCtx.textBaseline = 'bottom';
        stepwiseCtx.fillText(`T(${v.x},${v.y})`, x, y - vertexRadius - 2);
      }
    }

    stepwiseCtx.restore();

    // Draw level info
    stepwiseCtx.fillStyle = '#333';
    stepwiseCtx.font = '11px sans-serif';
    stepwiseCtx.fillText(`Level m=${level}, ${levelData.vertices.length} vertices`, 10, 15);
  }

  // Generate formula explanation for a vertex
  // Formulas match the Berggren-Russkikh recurrence (Proposition 2.4)
  function getVertexFormulaHTML(v, level) {
    const c = v.faceWeight.toFixed(3).replace(/\.?0+$/, '');
    const j = v.x, k = v.y;
    const m = v.sourceLevel;  // level = m + 1

    // Note: level = m + 1 in the recurrence formulas
    // T_{m+1}(...) is computed from T_m(...) values
    const typeDescriptions = {
      // Rule 1: Boundary corners are fixed at the 4 corners of level m+1
      'boundary_corner': `<strong>Boundary corner</strong> (fixed)<br>T<sub>${level}</sub>(${j},${k}) is fixed at the boundary rhombus corner`,

      // Rule 2: Axis boundary - positions on the axes (j=±m, k=0) or (j=0, k=±m)
      // Left: T_{m+1}(-m, 0) = (T_m(-m, 0) + c·T_m(-m+1, 0)) / (1+c)
      'boundary_left': `<strong>Left axis boundary</strong> (j = -m)<br>T<sub>${level}</sub>(${j},0) = (T<sub>${m}</sub>(${j},0) + c·T<sub>${m}</sub>(${j+1},0)) / (1+c)<br>c = c<sub>${j},0,${m}</sub> = ${c}`,

      // Right: T_{m+1}(m, 0) = (T_m(m, 0) + c·T_m(m-1, 0)) / (1+c)
      'boundary_right': `<strong>Right axis boundary</strong> (j = m)<br>T<sub>${level}</sub>(${j},0) = (T<sub>${m}</sub>(${j},0) + c·T<sub>${m}</sub>(${j-1},0)) / (1+c)<br>c = c<sub>${j},0,${m}</sub> = ${c}`,

      // Top: T_{m+1}(0, m) = (c·T_m(0, m) + T_m(0, m-1)) / (1+c)
      'boundary_top': `<strong>Top axis boundary</strong> (k = m)<br>T<sub>${level}</sub>(0,${k}) = (c·T<sub>${m}</sub>(0,${k}) + T<sub>${m}</sub>(0,${k-1})) / (1+c)<br>c = c<sub>0,${k},${m}</sub> = ${c}`,

      // Bottom: T_{m+1}(0, -m) = (c·T_m(0, -m) + T_m(0, -m+1)) / (1+c)
      'boundary_bottom': `<strong>Bottom axis boundary</strong> (k = -m)<br>T<sub>${level}</sub>(0,${k}) = (c·T<sub>${m}</sub>(0,${k}) + T<sub>${m}</sub>(0,${k+1})) / (1+c)<br>c = c<sub>0,${k},${m}</sub> = ${c}`,

      // Rule 3: Diagonal boundary - positions where |j|+|k|=m (excluding axes)
      // Upper-right: j > 0, k = m - j
      // T_{m+1}(j, m-j) = (T_m(j-1, m-j) + c·T_m(j, m-j-1)) / (1+c)
      'diag_upper_right': `<strong>Diagonal boundary (upper-right)</strong><br>|j|+|k| = ${m}, j > 0, k > 0<br>T<sub>${level}</sub>(${j},${k}) = (T<sub>${m}</sub>(${j-1},${k}) + c·T<sub>${m}</sub>(${j},${k-1})) / (1+c)<br>c = c<sub>${j},${k},${m}</sub> = ${c}`,

      // Lower-right: j > 0, k = -(m - j)
      // T_{m+1}(j, -(m-j)) = (T_m(j-1, -(m-j)) + c·T_m(j, -(m-j)+1)) / (1+c)
      'diag_lower_right': `<strong>Diagonal boundary (lower-right)</strong><br>|j|+|k| = ${m}, j > 0, k < 0<br>T<sub>${level}</sub>(${j},${k}) = (T<sub>${m}</sub>(${j-1},${k}) + c·T<sub>${m}</sub>(${j},${k+1})) / (1+c)<br>c = c<sub>${j},${k},${m}</sub> = ${c}`,

      // Upper-left: j < 0, k = m + j
      // T_{m+1}(j, m+j) = (c·T_m(j, m+j-1) + T_m(j+1, m+j)) / (1+c)
      'diag_upper_left': `<strong>Diagonal boundary (upper-left)</strong><br>|j|+|k| = ${m}, j < 0, k > 0<br>T<sub>${level}</sub>(${j},${k}) = (c·T<sub>${m}</sub>(${j},${k-1}) + T<sub>${m}</sub>(${j+1},${k})) / (1+c)<br>c = c<sub>${j},${k},${m}</sub> = ${c}`,

      // Lower-left: j < 0, k = -(m + j)
      // T_{m+1}(j, -(m+j)) = (c·T_m(j, -(m+j)+1) + T_m(j+1, -(m+j))) / (1+c)
      'diag_lower_left': `<strong>Diagonal boundary (lower-left)</strong><br>|j|+|k| = ${m}, j < 0, k < 0<br>T<sub>${level}</sub>(${j},${k}) = (c·T<sub>${m}</sub>(${j},${k+1}) + T<sub>${m}</sub>(${j+1},${k})) / (1+c)<br>c = c<sub>${j},${k},${m}</sub> = ${c}`,

      // Rule 4: Interior pass-through for j+k+m even
      // T_{m+1}(j,k) = T_m(j,k)
      'interior_passthrough': `<strong>Interior pass-through</strong> (j+k+m = ${j}+${k}+${m} = ${j+k+m} even)<br>T<sub>${level}</sub>(${j},${k}) = T<sub>${m}</sub>(${j},${k})`,

      // Rule 5: Interior recurrence for j+k+m odd
      // T_{m+1}(j,k) = -T_m(j,k) + (T_{m+1}(j-1,k) + T_{m+1}(j+1,k) + c·(T_{m+1}(j,k+1) + T_{m+1}(j,k-1))) / (1+c)
      'interior_recurrence': `<strong>Interior recurrence</strong> (j+k+m = ${j}+${k}+${m} = ${j+k+m} odd)<br>T<sub>${level}</sub>(${j},${k}) = -T<sub>${m}</sub>(${j},${k}) + (T<sub>${level}</sub>(${j-1},${k}) + T<sub>${level}</sub>(${j+1},${k}) + c·(T<sub>${level}</sub>(${j},${k+1}) + T<sub>${level}</sub>(${j},${k-1}))) / (1+c)<br>c = c<sub>${j},${k},${m}</sub> = ${c}`
    };

    let html = typeDescriptions[v.type] || `Unknown type: ${v.type}`;
    html += `<br><br><strong>Value:</strong> ${v.tReal.toFixed(4)} + ${v.tImag.toFixed(4)}i`;
    html += `<br><strong>Dependencies:</strong> ${v.deps.length > 0 ? v.deps.join(', ') : 'none (fixed)'}`;

    return html;
  }

  // Handle click on canvas to select vertex
  function handleStepwiseCanvasClick(e) {
    const rect = stepwiseCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clickX = (e.clientX - rect.left) * dpr;
    const clickY = (e.clientY - rect.top) * dpr;

    // Find closest vertex within threshold
    const threshold = 15 * dpr;
    let closestVertex = null;
    let closestDist = Infinity;

    for (const vp of vertexScreenPositions) {
      const dx = clickX - vp.screenX * dpr;
      const dy = clickY - vp.screenY * dpr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold && dist < closestDist) {
        closestDist = dist;
        closestVertex = vp;
      }
    }

    if (closestVertex) {
      selectedVertex = closestVertex.key;
      highlightedDeps = new Set(closestVertex.vertex.deps || []);

      // Show formula
      const level = currentStep;
      vertexInfoDiv.innerHTML = getVertexFormulaHTML(closestVertex.vertex, level);
    } else {
      selectedVertex = null;
      highlightedDeps.clear();
      vertexInfoDiv.innerHTML = '<em>Click on a vertex to see its formula and dependencies</em>';
    }

    renderStepwiseTemb();
  }

  stepwiseCanvas.addEventListener('click', handleStepwiseCanvasClick);

  // Update display when step buttons are clicked
  stepPrevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateStepDisplay();
      displayFaceWeights(currentStep);
      renderStepwiseTemb();
    }
  });

  stepNextBtn.addEventListener('click', () => {
    if (currentStep < maxStep) {
      currentStep++;
      updateStepDisplay();
      displayFaceWeights(currentStep);
      renderStepwiseTemb();
    }
  });

  // Checkbox handlers
  document.getElementById('show-labels-chk').addEventListener('change', renderStepwiseTemb);

  // Debug canvas mouse handlers
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


  // Initialize WASM
  initWasm();
})();
</script>
