---
title: KPZ Tetris — Random Tetromino Deposition
model: TASEPs
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/TASEP-like-systems/2026-04-22-kpz-tetris.md'
    txt: 'Interactive simulation — see source'
a11y-description: "Random tetromino deposition simulation. Standard Tetris pieces (I, O, T, S, Z, L, J) fall from above onto a 100-wide floor at uniformly random positions and orientations, with no player input. Pieces drop straight down and land on the existing surface. The growing height profile h(x,t) is displayed along with its fluctuation statistics. Related to KPZ universality class surface growth models."
---

<style>
.kpz-wrap {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin: 0 auto;
  width: 100%;
  max-width: 100%;
}
.kpz-controls {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}
.kpz-controls button {
  background: #222;
  color: #ccc;
  border: 1px solid #444;
  padding: 5px 14px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  border-radius: 3px;
}
.kpz-controls button:hover { background: #333; color: #fff; }
.kpz-controls label { font-size: 13px; color: #777; }
.kpz-controls input[type=range] { width: 90px; vertical-align: middle; }
.kpz-stats {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #777;
  flex-wrap: wrap;
  justify-content: center;
}
.kpz-stats b { color: #333; font-weight: 600; }
.kpz-canvases { position: relative; line-height: 0; width: 100%; }
#kpzGrid {
  border: 1px solid #ccc;
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>

<div class="kpz-wrap">
  <div class="kpz-controls">
    <button id="kpzReset">Reset</button>
    <button id="kpzPause">&#9646;&#9646; Pause</button>
    <label>Speed <input type="range" id="kpzSpeed" min="1" max="50" value="1"> <b id="kpzSpeedVal">1</b></label>
    <label><input type="checkbox" id="kpzCeil"> Show surface h(x)</label>
    <button id="kpzFF">+500</button>
  </div>
  <div class="kpz-stats">
    <span>Pieces <b id="stPieces">0</b></span>
    <span>Avg h <b id="stAvg">0</b></span>
    <span>&sigma; <b id="stSigma">0</b></span>
    <span>Max h <b id="stMax">0</b></span>
  </div>
  <div class="kpz-canvases">
    <canvas id="kpzGrid"></canvas>
  </div>
</div>

<script>
(function() {
  const W = 200, H = 500, CELL = 6, VISIBLE = 100;
  const CW = W * CELL, CH = VISIBLE * CELL;

  const gc = document.getElementById('kpzGrid');
  gc.width = CW; gc.height = CH;
  const gx = gc.getContext('2d');

  const COL = [
    null,
    [0, 175, 175],
    [180, 170, 0],
    [130, 30, 180],
    [30, 170, 60],
    [190, 50, 50],
    [200, 120, 10],
    [50, 70, 190],
  ];

  const MATS = [
    [[1,1,1,1]],
    [[1,1],[1,1]],
    [[1,1,1],[0,1,0]],
    [[0,1,1],[1,1,0]],
    [[1,1,0],[0,1,1]],
    [[1,0],[1,0],[1,1]],
    [[0,1],[0,1],[1,1]],
  ];

  function rotCW(m) {
    const R = m.length, C = m[0].length, o = [];
    for (let c = 0; c < C; c++) {
      const row = [];
      for (let r = R - 1; r >= 0; r--) row.push(m[r][c]);
      o.push(row);
    }
    return o;
  }

  function m2c(m) {
    const cells = [], my = m.length - 1;
    for (let r = 0; r < m.length; r++)
      for (let c = 0; c < m[r].length; c++)
        if (m[r][c]) cells.push([c, my - r]);
    return cells;
  }

  const PIECES = MATS.map(mat => {
    const rots = [], seen = new Set();
    let m = mat;
    for (let i = 0; i < 4; i++) {
      const cells = m2c(m);
      const k = JSON.stringify(cells);
      if (!seen.has(k)) { seen.add(k); rots.push(cells); }
      m = rotCW(m);
    }
    return rots;
  });

  let grid, heights, pieceCount, maxH, running, animId;
  let falling = []; // array of {type, cells, x, targetY, y, mxd, myd}
  let showSurface = false;
  const CONCURRENT_MIN = 5, CONCURRENT_MAX = 8;

  function init() {
    grid = [];
    for (let i = 0; i < W; i++) grid[i] = new Uint8Array(H);
    heights = new Float64Array(W);
    pieceCount = 0; maxH = 0;
    falling = [];
  }

  function viewBot() { return Math.max(0, maxH - (VISIBLE - 20)); }

  // Effective landing target considering already-falling pieces that will
  // settle first (those with lower y or same y but earlier in array would
  // land first — but we compute against committed heights only; collisions
  // between falling pieces are resolved by staggering start Y).
  function computeTarget(x, cells) {
    let ly = 0;
    for (let i = 0; i < cells.length; i++) {
      const v = heights[x + cells[i][0]] - cells[i][1];
      if (v > ly) ly = v;
    }
    return ly;
  }

  function spawnPiece() {
    const ti = Math.random() * 7 | 0;
    const rots = PIECES[ti];
    const cells = rots[Math.random() * rots.length | 0];
    let mxd = 0, myd = 0;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i][0] > mxd) mxd = cells[i][0];
      if (cells[i][1] > myd) myd = cells[i][1];
    }
    const x = Math.random() * (W - mxd) | 0;

    const ly = computeTarget(x, cells);
    if (ly + myd >= H) return null;

    // Stagger start Y so pieces are spread vertically. Find the highest
    // active falling piece over this x-range and start above it.
    const vb = viewBot();
    let startY = vb + VISIBLE + 2;
    for (let k = 0; k < falling.length; k++) {
      const f = falling[k];
      // Check horizontal overlap
      if (f.x + f.mxd < x || f.x > x + mxd) continue;
      const topY = f.y + f.myd + 2 + ((Math.random() * 3) | 0);
      if (topY > startY) startY = topY;
    }

    return { type: ti, cells: cells, x: x, targetY: ly, y: startY, mxd: mxd, myd: myd };
  }

  function placePiece(p) {
    const ci = p.type + 1;
    for (let i = 0; i < p.cells.length; i++) {
      const cx = p.x + p.cells[i][0], cy = p.targetY + p.cells[i][1];
      grid[cx][cy] = ci;
      if (cy + 1 > heights[cx]) heights[cx] = cy + 1;
      if (cy + 1 > maxH) maxH = cy + 1;
    }
    pieceCount++;
  }

  function dropInstant() {
    const ti = Math.random() * 7 | 0;
    const rots = PIECES[ti];
    const cells = rots[Math.random() * rots.length | 0];
    let mxd = 0, myd = 0;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i][0] > mxd) mxd = cells[i][0];
      if (cells[i][1] > myd) myd = cells[i][1];
    }
    const x = Math.random() * (W - mxd) | 0;
    let ly = 0;
    for (let i = 0; i < cells.length; i++) {
      const v = heights[x + cells[i][0]] - cells[i][1];
      if (v > ly) ly = v;
    }
    if (ly + myd >= H) return false;
    const ci = ti + 1;
    for (let i = 0; i < cells.length; i++) {
      const cx = x + cells[i][0], cy = ly + cells[i][1];
      grid[cx][cy] = ci;
      if (cy + 1 > heights[cx]) heights[cx] = cy + 1;
      if (cy + 1 > maxH) maxH = cy + 1;
    }
    pieceCount++;
    return true;
  }

  function drawBlock(sx, sy, c, highlight) {
    const r = highlight ? Math.min(255, c[0] + 60) : c[0];
    const g = highlight ? Math.min(255, c[1] + 60) : c[1];
    const b = highlight ? Math.min(255, c[2] + 60) : c[2];
    // main fill
    gx.fillStyle = `rgb(${r},${g},${b})`;
    gx.fillRect(sx, sy, CELL, CELL);
    // top-left bevel
    gx.fillStyle = `rgba(255,255,255,0.45)`;
    gx.fillRect(sx, sy, CELL, 1);
    gx.fillRect(sx, sy, 1, CELL);
    // bottom-right bevel
    gx.fillStyle = `rgba(0,0,0,0.30)`;
    gx.fillRect(sx, sy + CELL - 1, CELL, 1);
    gx.fillRect(sx + CELL - 1, sy, 1, CELL);
  }

  function render() {
    const vb = viewBot();

    gx.fillStyle = '#f5f5f0';
    gx.fillRect(0, 0, CW, CH);

    for (let vy = 0; vy < VISIBLE; vy++) {
      const gy = vb + vy;
      if (gy >= H) break;
      const sy = CH - (vy + 1) * CELL;
      for (let xi = 0; xi < W; xi++) {
        const ci = grid[xi][gy];
        if (!ci) continue;
        drawBlock(xi * CELL, sy, COL[ci], false);
      }
    }

    // draw falling pieces
    for (let fi = 0; fi < falling.length; fi++) {
      const f = falling[fi];
      const c = COL[f.type + 1];
      const fy = Math.round(f.y);
      for (let i = 0; i < f.cells.length; i++) {
        const cx = f.x + f.cells[i][0];
        const cy = fy + f.cells[i][1];
        const vy = cy - vb;
        if (vy < 0 || vy >= VISIBLE) continue;
        const sy = CH - (vy + 1) * CELL;
        drawBlock(cx * CELL, sy, c, true);
      }

    }

    // surface line (toggleable)
    if (showSurface) {
      gx.beginPath();
      gx.strokeStyle = 'rgba(0,0,0,0.55)';
      gx.lineWidth = 1.5;
      for (let xi = 0; xi < W; xi++) {
        const sy = CH - (heights[xi] - vb) * CELL;
        if (xi === 0) gx.moveTo(xi * CELL + CELL / 2, sy);
        else gx.lineTo(xi * CELL + CELL / 2, sy);
      }
      gx.stroke();
    }

    if (vb === 0) {
      gx.strokeStyle = '#999';
      gx.lineWidth = 1;
      gx.beginPath();
      gx.moveTo(0, CH - 0.5);
      gx.lineTo(CW, CH - 0.5);
      gx.stroke();
    }

    let sum = 0, sum2 = 0;
    for (let xi = 0; xi < W; xi++) { sum += heights[xi]; sum2 += heights[xi] * heights[xi]; }
    const avg = sum / W;
    const sigma = Math.sqrt(Math.max(0, sum2 / W - avg * avg));

    document.getElementById('stPieces').textContent = pieceCount;
    document.getElementById('stAvg').textContent = avg.toFixed(1);
    document.getElementById('stSigma').textContent = sigma.toFixed(2);
    document.getElementById('stMax').textContent = maxH;
  }

  function frame() {
    const speed = +document.getElementById('kpzSpeed').value / 3;

    // Maintain 5-8 concurrent falling pieces
    const target = CONCURRENT_MIN + ((Math.random() * (CONCURRENT_MAX - CONCURRENT_MIN + 1)) | 0);
    while (falling.length < target) {
      const p = spawnPiece();
      if (!p) break;
      falling.push(p);
    }

    // Advance every falling piece by `speed` units per frame
    for (let i = 0; i < falling.length; i++) {
      const f = falling[i];
      // Recompute target in case pieces below have landed since spawn
      const t = computeTarget(f.x, f.cells);
      if (t > f.targetY) f.targetY = t;
      f.y -= speed;
      if (f.y <= f.targetY) {
        f.y = f.targetY;
        placePiece(f);
        f._done = true;
      }
    }
    // Remove landed pieces; update targets of remaining pieces since heights changed
    if (falling.some(f => f._done)) {
      falling = falling.filter(f => !f._done);
      for (let i = 0; i < falling.length; i++) {
        const f = falling[i];
        const t = computeTarget(f.x, f.cells);
        if (t > f.targetY) f.targetY = t;
      }
    }

    // If we've run out of space entirely, stop
    if (falling.length === 0) {
      const p = spawnPiece();
      if (!p) { render(); running = false; return; }
      falling.push(p);
    }

    render();
    if (running) animId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    document.getElementById('kpzPause').innerHTML = '&#9646;&#9646; Pause';
    animId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(animId);
    document.getElementById('kpzPause').innerHTML = '&#9654; Run';
  }

  document.getElementById('kpzPause').addEventListener('click', () => running ? stop() : start());
  document.getElementById('kpzReset').addEventListener('click', () => { stop(); init(); render(); });
  document.getElementById('kpzSpeed').addEventListener('input', e => {
    document.getElementById('kpzSpeedVal').textContent = e.target.value;
  });
  document.getElementById('kpzFF').addEventListener('click', () => {
    for (let i = 0; i < 500; i++) { if (!dropInstant()) break; }
    falling = [];
    render();
  });
  document.getElementById('kpzCeil').addEventListener('change', e => {
    showSurface = e.target.checked;
    render();
  });

  init();
  render();
  start();
})();
</script>
