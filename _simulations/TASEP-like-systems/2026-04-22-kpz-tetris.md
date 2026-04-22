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
  align-items: center;
  gap: 10px;
  margin: 0 auto;
  max-width: 700px;
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
.kpz-canvases { position: relative; line-height: 0; }
#kpzGrid { border: 1px solid #ccc; display: block; }
#kpzProfile { border: 1px solid #ddd; border-top: none; display: block; }
</style>

<div class="kpz-wrap">
  <div class="kpz-controls">
    <button id="kpzReset">Reset</button>
    <button id="kpzPause">&#9654; Run</button>
    <label>Speed <input type="range" id="kpzSpeed" min="1" max="50" value="5"> <b id="kpzSpeedVal">5</b></label>
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
    <canvas id="kpzProfile"></canvas>
  </div>
</div>

<script>
(function() {
  const W = 100, H = 500, CELL = 6, VISIBLE = 100;
  const CW = W * CELL, CH = VISIBLE * CELL;

  const gc = document.getElementById('kpzGrid');
  const pc = document.getElementById('kpzProfile');
  gc.width = CW; gc.height = CH;
  pc.width = CW; pc.height = 140;
  const gx = gc.getContext('2d');
  const px = pc.getContext('2d');

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
  let falling = null; // {type, cells, x, targetY, y}

  function init() {
    grid = [];
    for (let i = 0; i < W; i++) grid[i] = new Uint8Array(H);
    heights = new Float64Array(W);
    pieceCount = 0; maxH = 0;
    falling = null;
  }

  function viewBot() { return Math.max(0, maxH - 70); }

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

    let ly = 0;
    for (let i = 0; i < cells.length; i++) {
      const v = heights[x + cells[i][0]] - cells[i][1];
      if (v > ly) ly = v;
    }
    if (ly + myd >= H) return null;

    const startY = viewBot() + VISIBLE + 2;

    return { type: ti, cells: cells, x: x, targetY: ly, y: startY };
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
        const c = COL[ci];
        gx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        gx.fillRect(xi * CELL, sy, CELL, CELL);
      }
    }

    // draw falling piece
    if (falling) {
      const c = COL[falling.type + 1];
      const fy = Math.round(falling.y);
      gx.fillStyle = `rgb(${Math.min(255, c[0]+60)},${Math.min(255, c[1]+60)},${Math.min(255, c[2]+60)})`;
      for (let i = 0; i < falling.cells.length; i++) {
        const cx = falling.x + falling.cells[i][0];
        const cy = fy + falling.cells[i][1];
        const vy = cy - vb;
        if (vy < 0 || vy >= VISIBLE) continue;
        const sy = CH - (vy + 1) * CELL;
        gx.fillRect(cx * CELL, sy, CELL, CELL);
      }

      // ghost at target
      gx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.35)`;
      gx.lineWidth = 1;
      for (let i = 0; i < falling.cells.length; i++) {
        const cx = falling.x + falling.cells[i][0];
        const cy = falling.targetY + falling.cells[i][1];
        const vy = cy - vb;
        if (vy < 0 || vy >= VISIBLE) continue;
        const sy = CH - (vy + 1) * CELL;
        gx.strokeRect(cx * CELL + 0.5, sy + 0.5, CELL - 1, CELL - 1);
      }
    }

    // surface line
    gx.beginPath();
    gx.strokeStyle = 'rgba(0,0,0,0.55)';
    gx.lineWidth = 1.5;
    for (let xi = 0; xi < W; xi++) {
      const sy = CH - (heights[xi] - vb) * CELL;
      if (xi === 0) gx.moveTo(xi * CELL + CELL / 2, sy);
      else gx.lineTo(xi * CELL + CELL / 2, sy);
    }
    gx.stroke();

    if (vb === 0) {
      gx.strokeStyle = '#999';
      gx.lineWidth = 1;
      gx.beginPath();
      gx.moveTo(0, CH - 0.5);
      gx.lineTo(CW, CH - 0.5);
      gx.stroke();
    }

    // profile
    const pw = pc.width, ph = pc.height;
    px.fillStyle = '#fafaf6';
    px.fillRect(0, 0, pw, ph);

    if (maxH > 0) {
      const mg = 18, plotH = ph - mg * 2, plotW = pw - 10;
      let hMin = Infinity, hMax = -Infinity;
      for (let xi = 0; xi < W; xi++) {
        if (heights[xi] < hMin) hMin = heights[xi];
        if (heights[xi] > hMax) hMax = heights[xi];
      }
      const range = hMax - hMin || 1;

      px.beginPath();
      px.moveTo(5, mg + plotH);
      for (let xi = 0; xi < W; xi++) {
        const xp = 5 + (xi / (W - 1)) * plotW;
        const yp = mg + plotH - ((heights[xi] - hMin) / range) * plotH;
        px.lineTo(xp, yp);
      }
      px.lineTo(5 + plotW, mg + plotH);
      px.closePath();
      const grad = px.createLinearGradient(0, mg, 0, mg + plotH);
      grad.addColorStop(0, 'rgba(0,140,180,0.3)');
      grad.addColorStop(1, 'rgba(0,140,180,0.02)');
      px.fillStyle = grad;
      px.fill();

      px.beginPath();
      px.strokeStyle = '#0090a0';
      px.lineWidth = 1.5;
      for (let xi = 0; xi < W; xi++) {
        const xp = 5 + (xi / (W - 1)) * plotW;
        const yp = mg + plotH - ((heights[xi] - hMin) / range) * plotH;
        if (xi === 0) px.moveTo(xp, yp); else px.lineTo(xp, yp);
      }
      px.stroke();

      px.fillStyle = '#999';
      px.font = '10px monospace';
      px.fillText(hMax.toFixed(0), 5, mg - 4);
      px.fillText(hMin.toFixed(0), 5, mg + plotH + 12);
      px.fillText('h(x) profile', pw / 2 - 30, ph - 2);
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
    const speed = +document.getElementById('kpzSpeed').value;
    let budget = speed;

    while (budget > 0) {
      if (!falling) {
        falling = spawnPiece();
        if (!falling) { running = false; break; }
      }
      const dist = falling.y - falling.targetY;
      if (budget >= dist) {
        placePiece(falling);
        budget -= dist;
        falling = null;
      } else {
        falling.y -= budget;
        budget = 0;
      }
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
    falling = null;
    render();
  });

  init();
  render();
})();
</script>
