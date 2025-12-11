---
title: T-embeddings of the Aztec diamond with arbitrary weights
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md'
    txt: 'JavaScript implementation'
---

<p style="font-size: 0.9em; color: #555; margin-bottom: 15px;">
<b>Acknowledgement:</b> Developed during the reunion conference for the <a href="https://www.ipam.ucla.edu/programs/long-programs/geometry-statistical-mechanics-and-integrability/">IPAM long program on Geometry, Statistical Mechanics, and Integrability</a> (December 2025).
I thank Mikhail Basok, Dmitry Chelkak, and Marianna Russkikh for helpful discussions.
</p>

<div style="margin-bottom: 10px;">
  <label>n: <input id="n-input" type="number" value="5" min="1" max="50" style="width: 60px;"></label>
  <button id="draw-btn" style="margin-left: 10px;">Draw</button>
  <button id="zoom-in-btn" style="margin-left: 10px;">+</button>
  <button id="zoom-out-btn">−</button>
  <button id="reset-zoom-btn" style="margin-left: 10px;">Reset Zoom</button>
</div>

<div style="margin-bottom: 10px;">
  <label>Weights:
    <select id="weight-preset">
      <option value="uniform">Uniform (all 1)</option>
      <option value="periodic" selected>k×l Periodic</option>
      <option value="random">Random (1/2 to 2)</option>
    </select>
  </label>
  <span id="periodic-params" style="margin-left: 10px;">
    <label>k: <input id="k-input" type="number" value="2" min="1" max="5" style="width: 40px;"></label>
    <label>l: <input id="l-input" type="number" value="2" min="1" max="5" style="width: 40px;"></label>
    <button id="edit-weights-btn" style="margin-left: 5px;">Edit Weights</button>
  </span>
</div>

<div id="weights-editor" style="display: none; margin-bottom: 10px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9; max-height: 300px; overflow-y: auto;">
  <div id="weights-tables"></div>
  <button id="close-weights-btn" style="margin-top: 10px;">Close</button>
</div>

<canvas id="aztec-canvas" style="width: 100%; height: 70vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>

<style>
#aztec-canvas.panning { cursor: grabbing; }
.weight-table { margin-bottom: 10px; }
.weight-table input { width: 50px; margin: 2px; }
.weight-table th, .weight-table td { padding: 2px 5px; text-align: center; }
</style>

<script>
(function() {
  const canvas = document.getElementById('aztec-canvas');
  const ctx = canvas.getContext('2d');

  // State
  let n = 5;
  let zoom = 1.0;
  let panX = 0, panY = 0;
  let isPanning = false;
  let lastPanX = 0, lastPanY = 0;

  // Weight parameters
  // Following Berggren-Borodin: each white vertex has edges with weights
  // α_{j,i} (SW), β_{j,i} (SE), γ_{j,i} (NW), 1 (NE)
  // j = 1..k (vertical period), i = 1..l (horizontal period)
  // Periodicity vectors are (1,1) and (1,-1) in original coords, or
  // horizontal and vertical in the 45°-rotated view
  let weightPreset = 'periodic';
  let k = 2, l = 2;
  // alpha[j][i], beta[j][i], gamma[j][i] for j=0..k-1, i=0..l-1
  let alpha = [], beta = [], gamma = [];

  function initWeights() {
    alpha = []; beta = []; gamma = [];
    for (let j = 0; j < k; j++) {
      alpha[j] = []; beta[j] = []; gamma[j] = [];
      for (let i = 0; i < l; i++) {
        alpha[j][i] = 1;
        beta[j][i] = 1;
        gamma[j][i] = 1;
      }
    }
    // Set some interesting default values for 2x2 case (from paper Fig 1)
    if (k === 2 && l === 2) {
      alpha[1][1] = 1.5;
      beta[0][0] = 0.95;
      beta[1][1] = 0.1;
      gamma[1][0] = 0.95;
      gamma[0][1] = 0.1;
    }
  }

  initWeights();

  // Edge storage: edges[edgeKey] = { x1, y1, x2, y2, weight, type }
  // type: 'h' for horizontal, 'v' for vertical
  let edges = {};
  let highlightedEdges = new Set(); // Edges to highlight in red
  let highlightedFaces = new Set(); // Faces to highlight
  let highlightTimeout = null;

  function inDiamond(x, y, n) {
    return Math.abs(x) + Math.abs(y) <= n + 0.5;
  }

  // Get weight for an edge based on which face it belongs to
  // Following Berggren-Borodin convention:
  // - Each FACE (square) has 4 edges with weights α, β, γ, 1
  // - A "black face" has black vertices on left/right, white on top/bottom
  // - In the rotated view: α (bottom-left edge), β (bottom-right), γ (top-left), 1 (top-right)
  // - In our un-rotated coords (black face centered at integer (fx, fy)):
  //     α = bottom edge (the one closer to bottom-left in rotated view)
  //     β = right edge
  //     γ = left edge
  //     1 = top edge
  // - Face color: black if (fx + fy) is even

  function isBlackFace(fx, fy) {
    return (fx + fy) % 2 === 0;
  }

  function getEdgeWeightAndDir(x1, y1, x2, y2) {
    if (weightPreset === 'uniform') return { weight: 1, dir: 'uniform' };
    if (weightPreset === 'random') {
      const seed = Math.abs(x1 * 1000 + y1 * 100 + x2 * 10 + y2);
      const rand = ((seed * 9301 + 49297) % 233280) / 233280;
      return { weight: 0.5 + rand * 1.5, dir: 'random' };
    }

    // Each edge borders two faces. Find the black face this edge belongs to.
    const isHorizontal = (y1 === y2);
    let faceX, faceY, edgeDir;

    if (isHorizontal) {
      // Horizontal edge at y, from x1 to x1+1
      // Edge midpoint is at (x1+0.5, y1)
      // Adjacent faces are centered at (x1+0.5, y1+0.5) and (x1+0.5, y1-0.5)
      // But faces are at INTEGER coords, so round: faces at (round(x1+0.5), y1+0.5 rounded) etc.
      // Actually, face centers are at integers. Edge from (x1,y1) to (x1+1,y1):
      // - Face above: centered at (?, y1+0.5) - but y1 is half-integer, so y1+0.5 is integer
      // Wait, vertices are at half-integers, so face centers are at integers.
      // Edge from (-0.5, -0.5) to (0.5, -0.5): faces above at (0, 0) and below at (0, -1)
      const faceAboveX = Math.round((x1 + x2) / 2);
      const faceAboveY = Math.round(y1 + 0.5);
      const faceBelowX = Math.round((x1 + x2) / 2);
      const faceBelowY = Math.round(y1 - 0.5);

      if (isBlackFace(faceAboveX, faceAboveY)) {
        faceX = faceAboveX; faceY = faceAboveY;
        edgeDir = 'alpha'; // bottom edge of black face
      } else if (isBlackFace(faceBelowX, faceBelowY)) {
        faceX = faceBelowX; faceY = faceBelowY;
        edgeDir = 'one'; // top edge of black face = 1
        return { weight: 1, dir: 'one' };
      } else {
        console.error('No black face for horizontal edge!', x1, y1);
        return { weight: 1, dir: 'error' };
      }
    } else {
      // Vertical edge at x1, from y1 to y1+1
      const faceRightX = Math.round(x1 + 0.5);
      const faceRightY = Math.round((y1 + y2) / 2);
      const faceLeftX = Math.round(x1 - 0.5);
      const faceLeftY = Math.round((y1 + y2) / 2);

      if (isBlackFace(faceRightX, faceRightY)) {
        faceX = faceRightX; faceY = faceRightY;
        edgeDir = 'gamma'; // left edge of black face
      } else if (isBlackFace(faceLeftX, faceLeftY)) {
        faceX = faceLeftX; faceY = faceLeftY;
        edgeDir = 'beta'; // right edge of black face
      } else {
        console.error('No black face for vertical edge!', x1, y1);
        return { weight: 1, dir: 'error' };
      }
    }

    // Compute periodic indices using diagonal coordinates of face center
    // In rotated view: i increases along (1,1), j increases along (1,-1)
    // Black faces have faceX + faceY even, so diagonal coords are even.
    // Divide by 2 to get the actual periodic cell index.
    const diagI = (faceX + faceY) / 2;
    const diagJ = (faceX - faceY) / 2;

    // Map to periodic indices [0, l-1] and [0, k-1]
    const i = ((diagI % l) + l) % l;
    const j = ((diagJ % k) + k) % k;

    let weight;
    if (edgeDir === 'alpha') weight = alpha[j][i];
    else if (edgeDir === 'beta') weight = beta[j][i];
    else if (edgeDir === 'gamma') weight = gamma[j][i];
    else weight = 1;

    return { weight, dir: edgeDir, i, j };
  }

  // Face storage: faces[faceKey] = { x, y, weight }
  // Face centered at (x, y) has corners at (x±0.5, y±0.5)
  let faces = {};

  function buildEdges() {
    edges = {};
    const coords = [];
    for (let kk = -n; kk <= n; kk++) {
      coords.push(kk - 0.5);
      coords.push(kk + 0.5);
    }

    for (const i of coords) {
      for (const j of coords) {
        if (!inDiamond(i, j, n)) continue;

        // Horizontal edge to the right
        if (inDiamond(i + 1, j, n)) {
          const key = `${i},${j}-${i+1},${j}`;
          const wd = getEdgeWeightAndDir(i, j, i + 1, j);
          edges[key] = {
            x1: i, y1: j, x2: i + 1, y2: j,
            weight: wd.weight,
            dir: wd.dir,
            type: 'h'
          };
        }

        // Vertical edge upward
        if (inDiamond(i, j + 1, n)) {
          const key = `${i},${j}-${i},${j+1}`;
          const wd = getEdgeWeightAndDir(i, j, i, j + 1);
          edges[key] = {
            x1: i, y1: j, x2: i, y2: j + 1,
            weight: wd.weight,
            dir: wd.dir,
            type: 'v'
          };
        }
      }
    }

    // Build faces and compute face weights (product of 4 edge weights)
    buildFaces();
  }

  function buildFaces() {
    faces = {};
    for (let fx = -n; fx <= n; fx++) {
      for (let fy = -n; fy <= n; fy++) {
        // Check all 4 corners are in diamond
        if (!inDiamond(fx - 0.5, fy - 0.5, n) || !inDiamond(fx + 0.5, fy - 0.5, n) ||
            !inDiamond(fx - 0.5, fy + 0.5, n) || !inDiamond(fx + 0.5, fy + 0.5, n)) continue;

        // Get the 4 edge weights
        const bottomKey = `${fx - 0.5},${fy - 0.5}-${fx + 0.5},${fy - 0.5}`;
        const topKey = `${fx - 0.5},${fy + 0.5}-${fx + 0.5},${fy + 0.5}`;
        const leftKey = `${fx - 0.5},${fy - 0.5}-${fx - 0.5},${fy + 0.5}`;
        const rightKey = `${fx + 0.5},${fy - 0.5}-${fx + 0.5},${fy + 0.5}`;

        const wBottom = edges[bottomKey] ? edges[bottomKey].weight : 1;
        const wTop = edges[topKey] ? edges[topKey].weight : 1;
        const wLeft = edges[leftKey] ? edges[leftKey].weight : 1;
        const wRight = edges[rightKey] ? edges[rightKey].weight : 1;

        // Face weight formula from Kenyon-Lam-Ramassamy-Russkikh "Dimers and Circle patterns"
        // Black face: X = α/(βγ)
        //   where α = bottom, β = right, γ = left, 1 = top
        // White face: X = βγ/α
        //   where edges come from adjacent black faces: top = α, bottom = 1, left = γ, right = β
        let faceWeight;
        if (isBlackFace(fx, fy)) {
          // Black face: X = α/(βγ) = bottom / (right * left)
          faceWeight = wBottom / (wRight * wLeft);
        } else {
          // White face: X = βγ/α = (right * left) / top
          // top = α from black face above, right = β, left = γ
          faceWeight = (wRight * wLeft) / wTop;
        }

        faces[`${fx},${fy}`] = {
          x: fx,
          y: fy,
          weight: faceWeight,
          isBlack: isBlackFace(fx, fy)
        };
      }
    }
  }

  function render() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (n === 0) return;

    const baseScale = Math.min(rect.width, rect.height) / (2 * n + 4);
    const scale = baseScale * zoom;
    const cx = rect.width / 2 + panX * zoom;
    const cy = rect.height / 2 + panY * zoom;

    ctx.save();
    ctx.translate(cx, cy);

    // Draw checkerboard faces
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        if (!inDiamond(i - 0.5, j - 0.5, n) || !inDiamond(i + 0.5, j - 0.5, n) ||
            !inDiamond(i - 0.5, j + 0.5, n) || !inDiamond(i + 0.5, j + 0.5, n)) continue;

        const x = (i - 0.5) * scale;
        const y = -(j + 0.5) * scale;

        ctx.fillStyle = (i + j) % 2 === 0 ? '#e8e8e8' : '#ffffff';
        ctx.fillRect(x, y, scale, scale);
      }
    }

    // Draw face weights in center of each face
    const faceFontSize = Math.max(5, scale / 8);
    ctx.font = `${faceFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const key in faces) {
      const f = faces[key];
      const fx = f.x * scale;
      const fy = -f.y * scale;

      const wText = f.weight === 1 ? '1' : f.weight.toFixed(2).replace(/\.?0+$/, '');
      const textWidth = ctx.measureText(wText).width;
      const padX = 2, padY = 1;
      const boxW = textWidth + padX * 2;
      const boxH = faceFontSize + padY * 2;

      // Highlight background if face is highlighted
      const isHighlighted = highlightedFaces.has(key);
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

    for (const key in edges) {
      const e = edges[key];
      ctx.beginPath();
      ctx.moveTo(e.x1 * scale, -e.y1 * scale);
      ctx.lineTo(e.x2 * scale, -e.y2 * scale);
      ctx.stroke();
    }

    // Draw weight labels in rectangular bubbles centered on edges
    const fontSize = Math.max(6, scale / 6);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const key in edges) {
      const e = edges[key];
      const midX = ((e.x1 + e.x2) / 2) * scale;
      const midY = -((e.y1 + e.y2) / 2) * scale;

      // Build label: "α=1.2" or just "1" for direction 'one'
      let label;
      if (e.dir === 'one') {
        label = '1';
      } else if (e.dir === 'alpha') {
        label = 'α=' + (e.weight === 1 ? '1' : e.weight.toFixed(2).replace(/\.?0+$/, ''));
      } else if (e.dir === 'beta') {
        label = 'β=' + (e.weight === 1 ? '1' : e.weight.toFixed(2).replace(/\.?0+$/, ''));
      } else if (e.dir === 'gamma') {
        label = 'γ=' + (e.weight === 1 ? '1' : e.weight.toFixed(2).replace(/\.?0+$/, ''));
      } else {
        label = e.weight === 1 ? '1' : e.weight.toFixed(2).replace(/\.?0+$/, '');
      }

      const textWidth = ctx.measureText(label).width;
      const padX = 2, padY = 1;
      const boxW = textWidth + padX * 2;
      const boxH = fontSize + padY * 2;

      // Draw rectangular bubble background (red if highlighted)
      const isHighlighted = highlightedEdges.has(key);
      ctx.fillStyle = isHighlighted ? '#ffcccc' : '#fff';
      ctx.fillRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
      ctx.strokeStyle = isHighlighted ? '#cc0000' : '#999';
      ctx.lineWidth = isHighlighted ? 1 : 0.5;
      ctx.strokeRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);

      // Draw label text
      ctx.fillStyle = '#333';
      ctx.fillText(label, midX, midY);
    }

    // Draw vertices (bipartite coloring: black and white)
    const coords = [];
    for (let kk = -n; kk <= n; kk++) {
      coords.push(kk - 0.5);
      coords.push(kk + 0.5);
    }
    const vertexRadius = Math.max(3, scale / 10);
    for (const i of coords) {
      for (const j of coords) {
        if (!inDiamond(i, j, n)) continue;
        const x = i * scale;
        const y = -j * scale;

        // Bipartite coloring based on parity
        // Must match isWhite() in getEdgeWeight: white if (2x + 2y) mod 4 == 0
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
    zoom = 1.0;
    panX = 0;
    panY = 0;
    render();
  }

  function redraw() {
    buildEdges();
    render();
  }

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

  // Weights editor
  function buildWeightsEditor() {
    const container = document.getElementById('weights-tables');
    container.innerHTML = '';

    const params = [
      { name: 'α (←)', arr: alpha, key: 'alpha' },
      { name: 'β (↓)', arr: beta, key: 'beta' },
      { name: 'γ (↑)', arr: gamma, key: 'gamma' }
    ];

    for (const param of params) {
      let html = `<div class="weight-table"><strong>${param.name}:</strong><table><tr><th>j\\i</th>`;
      for (let i = 0; i < l; i++) {
        html += `<th>${i+1}</th>`;
      }
      html += '</tr>';
      for (let j = 0; j < k; j++) {
        html += `<tr><th>${j+1}</th>`;
        for (let i = 0; i < l; i++) {
          html += `<td><input type="number" step="0.1" min="0.01" data-param="${param.key}" data-j="${j}" data-i="${i}" value="${param.arr[j][i]}"></td>`;
        }
        html += '</tr>';
      }
      html += '</table></div>';
      container.innerHTML += html;
    }

    container.innerHTML += '<p style="font-size: 0.85em; color: #666; margin-top: 5px;">NE edge weight is always 1. Total: 3kl free weights.</p>';

    // Add responsive input listeners
    container.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', applyWeightsFromEditor);
    });
  }

  function applyWeightsFromEditor(evt) {
    // Track which param/cell changed
    let changedParam = null, changedJ = null, changedI = null;
    const changedInput = evt && evt.target ? evt.target : null;
    if (changedInput && changedInput.dataset) {
      changedParam = changedInput.dataset.param;
      changedJ = parseInt(changedInput.dataset.j);
      changedI = parseInt(changedInput.dataset.i);
    }

    const inputs = document.querySelectorAll('#weights-tables input');
    inputs.forEach(inp => {
      const param = inp.dataset.param;
      const j = parseInt(inp.dataset.j);
      const i = parseInt(inp.dataset.i);
      const val = parseFloat(inp.value) || 1;
      if (param === 'alpha') alpha[j][i] = val;
      else if (param === 'beta') beta[j][i] = val;
      else if (param === 'gamma') gamma[j][i] = val;
    });

    // Find edges that match the changed param/cell and highlight them
    if (changedParam !== null) {
      // Clear previous highlight timeout
      if (highlightTimeout) clearTimeout(highlightTimeout);
      highlightedEdges.clear();
      highlightedFaces.clear();

      // Rebuild edges first to get new weights
      buildEdges();

      // Find edges matching the changed cell
      for (const key in edges) {
        const e = edges[key];
        const wd = getEdgeWeightAndDir(e.x1, e.y1, e.x2, e.y2);
        if (wd.dir === changedParam && wd.j === changedJ && wd.i === changedI) {
          highlightedEdges.add(key);
          // Also highlight adjacent faces
          if (e.type === 'h') {
            // Horizontal edge: faces above and below
            const faceAbove = `${Math.round((e.x1 + e.x2) / 2)},${Math.round(e.y1 + 0.5)}`;
            const faceBelow = `${Math.round((e.x1 + e.x2) / 2)},${Math.round(e.y1 - 0.5)}`;
            if (faces[faceAbove]) highlightedFaces.add(faceAbove);
            if (faces[faceBelow]) highlightedFaces.add(faceBelow);
          } else {
            // Vertical edge: faces left and right
            const faceRight = `${Math.round(e.x1 + 0.5)},${Math.round((e.y1 + e.y2) / 2)}`;
            const faceLeft = `${Math.round(e.x1 - 0.5)},${Math.round((e.y1 + e.y2) / 2)}`;
            if (faces[faceRight]) highlightedFaces.add(faceRight);
            if (faces[faceLeft]) highlightedFaces.add(faceLeft);
          }
        }
      }

      render();

      // Fade out after 3 seconds
      highlightTimeout = setTimeout(() => {
        highlightedEdges.clear();
        highlightedFaces.clear();
        render();
      }, 3000);
    } else {
      redraw();
    }
  }

  function updatePeriodicParamsVisibility() {
    const pp = document.getElementById('periodic-params');
    pp.style.display = weightPreset === 'periodic' ? 'inline' : 'none';
  }

  // Event listeners
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
  canvas.addEventListener('wheel', handleWheel, { passive: false });

  document.getElementById('draw-btn').addEventListener('click', () => {
    n = parseInt(document.getElementById('n-input').value) || 3;
    buildEdges();
    resetZoom();
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
    if (e.key === 'Enter') {
      n = parseInt(e.target.value) || 3;
      buildEdges();
      resetZoom();
    }
  });

  document.getElementById('weight-preset').addEventListener('change', (e) => {
    weightPreset = e.target.value;
    updatePeriodicParamsVisibility();
    redraw();
  });

  document.getElementById('k-input').addEventListener('change', (e) => {
    k = Math.max(1, Math.min(5, parseInt(e.target.value) || 2));
    e.target.value = k;
    initWeights();
    redraw();
  });

  document.getElementById('l-input').addEventListener('change', (e) => {
    l = Math.max(1, Math.min(5, parseInt(e.target.value) || 2));
    e.target.value = l;
    initWeights();
    redraw();
  });

  document.getElementById('edit-weights-btn').addEventListener('click', () => {
    buildWeightsEditor();
    document.getElementById('weights-editor').style.display = 'block';
  });

  document.getElementById('close-weights-btn').addEventListener('click', () => {
    document.getElementById('weights-editor').style.display = 'none';
  });

  window.addEventListener('resize', render);

  // Initial setup
  updatePeriodicParamsVisibility();
  buildEdges();
  render();
})();
</script>
