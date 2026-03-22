---
title: Shuffling Algorithm for Domino Tilings in Terms of Particles
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-07-q-whittaker-shuffling.md'
    txt: 'Pure JavaScript implementation of EKLP shuffling'
a11y-description: "Interactive simulation of Aztec diamond domino tilings generated step-by-step via the domino shuffling algorithm. Watch each shuffle phase: identify bad blocks, delete, slide, and fill. Adjust target size n up to 50; use granular mode to see individual phases. Rotate view 45 degrees and toggle particle display."
---

<script src="/js/colorschemes.js"></script>

<a href="#aztec-canvas" class="skip-link">Skip to simulation canvas</a>

<div style="margin-bottom: 10px;">
  <label>Target n: <input id="n-input" type="number" value="5" min="1" max="50" style="width: 60px;" aria-label="Target diamond size n"></label>
</div>

<div style="margin-bottom: 10px;">
  <button id="reset-btn">Reset</button>
  <button id="back-btn" disabled>← Back</button>
  <button id="step-btn">Step →</button>
  <button id="auto-btn">Auto</button>
  <button id="instant-btn">Instant</button>
  <label style="margin-left: 10px;">Speed: <input id="speed-slider" type="range" min="50" max="500" value="150" style="width: 80px; vertical-align: middle;" aria-label="Animation speed"></label>
  <span id="step-indicator" style="margin-left: 15px; font-weight: bold;" role="status" aria-live="polite">n=0</span>
</div>

<div style="margin-bottom: 10px;">
  <label><input type="checkbox" id="granular-cb" checked> Granular steps</label>
  <label style="margin-left: 15px;"><input type="checkbox" id="rotate-cb"> Rotate 45°</label>
  <label style="margin-left: 15px;"><input type="checkbox" id="holes-cb" checked> Particles</label>
  <label style="margin-left: 15px;"><input type="checkbox" id="partitions-cb" checked> Show λ,μ</label>
  <select id="palette-select" style="margin-left: 15px;" aria-label="Color palette"></select>
</div>

<canvas id="aztec-canvas" style="width: 100%; height: 70vh; border: 1px solid #ccc; background: #fafafa;" role="img" aria-label="Aztec diamond domino tiling built by shuffling algorithm"></canvas>

<div id="interlacing-display" style="display:none; margin-top: 8px;"></div>

<script>
(function() {
  const canvas = document.getElementById('aztec-canvas');
  const ctx = canvas.getContext('2d');

  // State
  let currentN = 0;
  let targetN = 5;
  // Dominoes: {x, y, type} where type is 'N', 'S', 'E', 'W'
  // N/S are horizontal, E/W are vertical
  let dominoes = [];
  let autoInterval = null;
  let rotated = false;
  let granular = true;
  let showHoles = true;
  let phase = 'complete';  // 'complete', 'badblocks', 'deleted', 'slid'
  let badDominoes = new Set();  // For highlighting bad blocks
  let history = [];  // Step-back history stack
  const MAX_HISTORY = 200;
  let showPartitions = true;

  function saveSnapshot() {
    history.push({ currentN, dominoes: dominoes.map(d => ({...d})), phase, badDominoes: new Set(badDominoes) });
    if (history.length > MAX_HISTORY) history.shift();
  }

  function stepBack() {
    if (history.length === 0) return;
    stopAuto();
    const snap = history.pop();
    currentN = snap.currentN;
    dominoes = snap.dominoes;
    phase = snap.phase;
    badDominoes = snap.badDominoes;
    updateUI();
    render();
  }

  // Superscript helper for partition labels
  function toSup(n) {
    const sups = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    return String(n).split('').map(c => sups[parseInt(c)] || c).join('');
  }

  // Compute partition for each diagonal from current domino state.
  // nDiag = currentN (or currentN+1 during slid phase).
  // Particle convention: cell (px,py) is a particle if S domino at (px-1,py) or W domino at (px,py-1).
  function computeDiagonalPartitions(nDiag) {
    const sDom = new Set();
    const wDom = new Set();
    dominoes.forEach(d => {
      if (d.type === 'S') sDom.add(`${d.x},${d.y}`);
      if (d.type === 'W') wDom.add(`${d.x},${d.y}`);
    });
    const result = [];
    for (let k = 0; k <= 2 * nDiag; k++) {
      const diag = k - (nDiag + 1);  // x+y value for this diagonal
      const cells = [];
      for (let x = -nDiag - 1; x <= nDiag + 1; x++) {
        const y = diag - x;
        if (inDiamond(x, y, nDiag)) cells.push({x, y});
      }
      // Particle positions (1-indexed along cells sorted by x)
      const particlePos = [];
      cells.forEach((c, i) => {
        if (sDom.has(`${c.x - 1},${c.y}`) || wDom.has(`${c.x},${c.y - 1}`) ||
            sDom.has(`${c.x},${c.y}`) || wDom.has(`${c.x},${c.y}`))
          particlePos.push(i + 1);
      });
      // Bijection {s1<...<sh} -> partition: λi = s_{h+1-i} - (h+1-i)
      const h = particlePos.length;
      const partitionRaw = [];
      for (let i = 1; i <= h; i++) partitionRaw.push(particlePos[h - i] - (h + 1 - i));
      // Trim trailing zeros — (0,0,0) = ∅
      const partition = partitionRaw.slice(0, partitionRaw.findLastIndex(v => v > 0) + 1);
      const isLambda = k % 2 === 1;
      const num = isLambda ? (k + 1) / 2 : k / 2;
      result.push({ k, d: diag, label: (isLambda ? 'λ' : 'μ') + toSup(num), partition, cells, isLambda });
    }
    return result;
  }

  // Palette
  const palettes = window.ColorSchemes || [{ name: 'Default', colors: ['#FFCD00', '#228B22', '#0057B7', '#DC143C'] }];
  let paletteIndex = palettes.findIndex(p => p.name === 'Domino Default');
  if (paletteIndex === -1) paletteIndex = 0;

  const paletteSelect = document.getElementById('palette-select');
  palettes.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = p.name;
    if (i === paletteIndex) opt.selected = true;
    paletteSelect.appendChild(opt);
  });

  function getColors() { return palettes[paletteIndex].colors; }

  // Check if cell (x, y) is inside Aztec diamond A_n
  // A_n: cells where |x + 0.5| + |y + 0.5| <= n
  function inDiamond(x, y, n) {
    return Math.abs(x + 0.5) + Math.abs(y + 0.5) <= n;
  }

  // Get cells covered by a domino
  function dominoCells(d) {
    if (d.type === 'N' || d.type === 'S') {
      return [{x: d.x, y: d.y}, {x: d.x + 1, y: d.y}];
    } else {
      return [{x: d.x, y: d.y}, {x: d.x, y: d.y + 1}];
    }
  }

  // Build a map from cell to domino index
  function buildCellMap() {
    const map = new Map();
    dominoes.forEach((d, idx) => {
      dominoCells(d).forEach(c => map.set(`${c.x},${c.y}`, idx));
    });
    return map;
  }

  // Find bad blocks: 2x2 blocks filled by N-S pair or E-W pair
  function findBadBlocks(n) {
    const cellMap = buildCellMap();
    const bad = new Set();

    for (let bx = -n; bx < n; bx++) {
      for (let by = -n; by < n; by++) {
        if (!inDiamond(bx, by, n) || !inDiamond(bx+1, by, n) ||
            !inDiamond(bx, by+1, n) || !inDiamond(bx+1, by+1, n)) continue;

        const d00 = cellMap.get(`${bx},${by}`);
        const d10 = cellMap.get(`${bx+1},${by}`);
        const d01 = cellMap.get(`${bx},${by+1}`);
        const d11 = cellMap.get(`${bx+1},${by+1}`);

        if (d00 === undefined || d10 === undefined || d01 === undefined || d11 === undefined) continue;

        // Bad N-S pair: bottom=N, top=S (they collide when sliding: N↑ into S, S↓ into N)
        if (d00 === d10 && d01 === d11 && d00 !== d01) {
          if (dominoes[d00].type === 'N' && dominoes[d01].type === 'S') {
            bad.add(d00);
            bad.add(d01);
          }
        }

        // Bad E-W pair: left=E, right=W (they collide when sliding: E→ into W, W← into E)
        if (d00 === d01 && d10 === d11 && d00 !== d10) {
          if (dominoes[d00].type === 'E' && dominoes[d10].type === 'W') {
            bad.add(d00);
            bad.add(d10);
          }
        }
      }
    }
    return bad;
  }

  // Delete bad dominoes
  function deleteBadDominoes(badSet) {
    dominoes = dominoes.filter((_, idx) => !badSet.has(idx));
  }

  // Slide each domino in its natural direction
  function slideDominoes() {
    dominoes.forEach(d => {
      if (d.type === 'N') d.y += 1;
      else if (d.type === 'S') d.y -= 1;
      else if (d.type === 'E') d.x += 1;
      else if (d.type === 'W') d.x -= 1;
    });
  }

  // Fill empty 2x2 blocks with uniform random choice
  function createDominoes(n) {
    const occupied = new Set();
    dominoes.forEach(d => {
      dominoCells(d).forEach(c => occupied.add(`${c.x},${c.y}`));
    });

    // Helper to check if a 2x2 block is still empty
    function isBlockEmpty(bx, by) {
      return !occupied.has(`${bx},${by}`) && !occupied.has(`${bx+1},${by}`) &&
             !occupied.has(`${bx},${by+1}`) && !occupied.has(`${bx+1},${by+1}`);
    }

    // Helper to fill a block and mark cells as occupied
    function fillBlock(bx, by, vertical) {
      if (vertical) {
        // Vertical EW pair
        dominoes.push({x: bx, y: by, type: 'W'});
        dominoes.push({x: bx + 1, y: by, type: 'E'});
      } else {
        // Horizontal NS pair
        dominoes.push({x: bx, y: by, type: 'S'});
        dominoes.push({x: bx, y: by + 1, type: 'N'});
      }
      occupied.add(`${bx},${by}`);
      occupied.add(`${bx+1},${by}`);
      occupied.add(`${bx},${by+1}`);
      occupied.add(`${bx+1},${by+1}`);
    }

    // Find and fill all empty 2x2 blocks with uniform random choice
    let filled = 0;
    for (let bx = -n; bx < n; bx++) {
      for (let by = -n; by < n; by++) {
        if (!inDiamond(bx, by, n) || !inDiamond(bx+1, by, n) ||
            !inDiamond(bx, by+1, n) || !inDiamond(bx+1, by+1, n)) continue;

        if (isBlockEmpty(bx, by)) {
          fillBlock(bx, by, Math.random() < 0.5);
          filled++;
        }
      }
    }
  }

  // Initialize A_1
  function initN1() {
    dominoes = [];
    if (Math.random() < 0.5) {
      dominoes.push({x: -1, y: -1, type: 'W'});
      dominoes.push({x: 0, y: -1, type: 'E'});
    } else {
      dominoes.push({x: -1, y: -1, type: 'S'});
      dominoes.push({x: -1, y: 0, type: 'N'});
    }
    currentN = 1;
  }

  // Full shuffle step: delete bad → slide → fill
  function shuffleStep() {
    if (currentN === 0) {
      initN1();
      return;
    }

    // 1. Delete bad blocks
    const bad = findBadBlocks(currentN);
    deleteBadDominoes(bad);

    // 2. Slide
    slideDominoes();

    // 3. Fill holes
    currentN++;
    createDominoes(currentN);
  }

  // Granular steps: complete → badblocks → deleted → slid → complete
  function granularStep() {
    if (currentN === 0) {
      initN1();
      phase = 'complete';
      return;
    }

    if (phase === 'complete') {
      // Find bad blocks (highlight them)
      badDominoes = findBadBlocks(currentN);
      phase = 'badblocks';
    } else if (phase === 'badblocks') {
      // Delete bad blocks
      deleteBadDominoes(badDominoes);
      badDominoes = new Set();
      phase = 'deleted';
    } else if (phase === 'deleted') {
      // Slide
      slideDominoes();
      phase = 'slid';
    } else if (phase === 'slid') {
      // Fill holes
      currentN++;
      createDominoes(currentN);
      phase = 'complete';
    }
  }

  function doStep() {
    if (currentN >= targetN && phase === 'complete') return;
    saveSnapshot();
    if (granular) granularStep(); else shuffleStep();
    updateUI();
    render();
  }

  function reset() {
    currentN = 0;
    dominoes = [];
    phase = 'complete';
    history = [];
    stopAuto();
    updateUI();
    render();
  }

  function instant() {
    stopAuto();
    currentN = 0;
    dominoes = [];
    phase = 'complete';
    history = [];
    while (currentN < targetN) {
      shuffleStep();
    }
    updateUI();
    render();
  }

  function updateUI() {
    let phaseText = '';
    if (granular && phase !== 'complete') {
      const phaseNames = {
        'badblocks': 'bad blocks found',
        'deleted': 'after deletion',
        'slid': 'after sliding'
      };
      phaseText = ` [${phaseNames[phase]}]`;
    }
    document.getElementById('step-indicator').textContent = `n=${currentN}${phaseText}`;
    document.getElementById('step-btn').disabled = currentN >= targetN && phase === 'complete';
    document.getElementById('back-btn').disabled = history.length === 0;
  }

  function startAuto() {
    if (autoInterval) return;
    autoInterval = setInterval(() => {
      if (currentN >= targetN && phase === 'complete') { stopAuto(); return; }
      doStep();
    }, parseInt(document.getElementById('speed-slider').value));
    document.getElementById('auto-btn').textContent = 'Stop';
  }

  function stopAuto() {
    if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
    document.getElementById('auto-btn').textContent = 'Auto';
  }

  function render() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const maxN = Math.max(currentN, targetN, 1);
    const cellSize = Math.min(rect.width, rect.height) / (2 * maxN + 2);
    if (cellSize <= 0) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    if (rotated) {
      ctx.rotate(-Math.PI / 4);
      ctx.scale(1 / Math.sqrt(2), 1 / Math.sqrt(2));
    }
    // Flip tiling across SW/NE axis: (x,y) → (y,x) in lattice
    ctx.transform(0, -1, -1, 0, 0, 0);

    // Checkerboard background. parityOffset shifts with slide step so SW border stays consistent.
    const parityOffset = currentN + (phase === 'slid' ? 1 : 0);
    const boardExtent = Math.ceil(Math.max(rect.width, rect.height) / cellSize * (rotated ? Math.SQRT2 : 1)) + 2;
    for (let gx = -boardExtent; gx <= boardExtent; gx++) {
      for (let gy = -boardExtent; gy <= boardExtent; gy++) {
        const isWhite = ((gx + gy + parityOffset) % 2 + 2) % 2 === 0;
        ctx.fillStyle = isWhite ? '#d8d8d8' : '#ffffff';
        ctx.fillRect(gx * cellSize, -(gy + 1) * cellSize, cellSize, cellSize);
      }
    }

    if (currentN === 0) { ctx.restore(); return; }

    const colors = getColors();
    const typeColor = {'N': 0, 'S': 1, 'E': 2, 'W': 3};

    dominoes.forEach((d, idx) => {
      const isHoriz = (d.type === 'N' || d.type === 'S');
      const w = isHoriz ? 2 * cellSize : cellSize;
      const h = isHoriz ? cellSize : 2 * cellSize;

      const px = d.x * cellSize;
      const py = -(d.y + (isHoriz ? 1 : 2)) * cellSize;

      if (showHoles) {
        // Holes view: S and W are particles (filled), N and E are holes (empty)
        const isHole = (d.type === 'N' || d.type === 'E');
        const radius = cellSize * 0.35;

        // Center positions with lattice cell coords (lx, ly) for checkerboard lookup.
        // Vertical domino: py = -(d.y+2)*cellSize, so first center is cell (d.x, d.y+1),
        // second center is cell (d.x, d.y).
        let centers;
        if (isHoriz) {
          centers = [
            { x: px + cellSize / 2,       y: py + cellSize / 2, lx: d.x,     ly: d.y },
            { x: px + cellSize * 1.5,     y: py + cellSize / 2, lx: d.x + 1, ly: d.y }
          ];
        } else {
          centers = [
            { x: px + cellSize / 2, y: py + cellSize / 2,       lx: d.x, ly: d.y + 1 },
            { x: px + cellSize / 2, y: py + cellSize * 1.5,     lx: d.x, ly: d.y }
          ];
        }

        centers.forEach(c => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
          if (isHole) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = Math.max(1, cellSize / 15);
            ctx.stroke();
          } else {
            // Color by checkerboard cell: white cell → orange, black cell → green
            const isWhiteCell = ((c.lx + c.ly + parityOffset) % 2 + 2) % 2 === 0;
            ctx.fillStyle = isWhiteCell ? '#228B22' : '#FF8C00';
            ctx.fill();
          }
        });

        // Faint domino border on top of particles
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = Math.max(0.5, cellSize / 20);
        ctx.strokeRect(px, py, w, h);
      } else {
        // Normal domino view with colors
        // Highlight bad blocks in red during 'badblocks' phase
        if (phase === 'badblocks' && badDominoes.has(idx)) {
          ctx.fillStyle = '#FF0000';
        } else {
          ctx.fillStyle = colors[typeColor[d.type]];
        }
        ctx.fillRect(px, py, w, h);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = Math.max(1, cellSize / 20);
        ctx.strokeRect(px, py, w, h);
      }
    });

    ctx.restore();

    // Partition labels — drawn after restore so text is always horizontal
    if (showPartitions && currentN > 0) {
      const nDiag = currentN + (phase === 'slid' ? 1 : 0);
      const diags = computeDiagonalPartitions(nDiag);
      const fontSize = Math.max(11, Math.min(22, cellSize * 1.36)) * 1.6;
      ctx.font = `${fontSize}px serif`;
      ctx.textBaseline = 'middle';
      diags.forEach(info => {
        if (info.cells.length === 0) return;
        let dx, dy;
        if (info.isLambda) {
          // λ: label at NW end (min-x cell), right-aligned, to the left
          const xMin = info.cells[0].x;
          const yAtXMin = info.d - xMin;
          dx = (xMin - 0.5) * cellSize - cellSize * 0.2 + cellSize * 0.5;
          dy = -(yAtXMin + 1.5) * cellSize;
          ctx.textAlign = 'right';
        } else {
          // μ: label at SE end (max-x cell), shifted one step right and one step down
          const xMax = info.cells[info.cells.length - 1].x;
          const yAtXMax = info.d - xMax;
          dx = (xMax + 1.5) * cellSize + cellSize * 0.2 - cellSize * 0.5;
          dy = -(yAtXMax - 0.5) * cellSize;
          ctx.textAlign = 'left';
        }
        let sx, sy;
        if (rotated) {
          sx = cx + (dx + dy) / 2;
          sy = cy + (dy - dx) / 2;
        } else {
          sx = cx + dx;
          sy = cy + dy;
        }
        ctx.fillStyle = info.isLambda ? '#1a6b2e' : '#a01010';
        let text = info.label;
        if (info.isLambda) {
          text += '=' + (info.partition.length ? '(' + info.partition.join(',') + ')' : '∅');
        } else {
          // Always spell out μ partition values on canvas
          text += ' = ' + (info.partition.length ? '(' + info.partition.join(',') + ')' : '∅');
        }
        ctx.fillText(text, sx, sy);
      });
    }

    renderInterlacingDisplay();
  }

  // Interlacing check display
  function renderInterlacingDisplay() {
    const el = document.getElementById('interlacing-display');
    if (!showPartitions || currentN === 0) { el.style.display = 'none'; return; }
    const nDiag = currentN + (phase === 'slid' ? 1 : 0);
    const diags = computeDiagonalPartitions(nDiag);
    const mus = diags.filter(d => !d.isLambda);
    const lambdas = diags.filter(d => d.isLambda);

    function fmtPart(info) {
      return info.label + ' = ' + (info.partition.length ? '(' + info.partition.join(',') + ')' : '∅');
    }
    function padPart(p, len) { return (p + Array(len).fill(0)).slice(0, len); }

    // Vertical strip: λ_i - μ_i ∈ {0,1} for all i
    function checkVertStrip(mu, lam) {
      const len = Math.max(mu.length, lam.length);
      for (let i = 0; i < len; i++) {
        const d = (lam[i] || 0) - (mu[i] || 0);
        if (d < 0 || d > 1) return false;
      }
      return true;
    }
    // Horizontal strip: λ_1 ≥ μ_1 ≥ λ_2 ≥ μ_2 ≥ ...
    function checkHorizStrip(mu, lam) {
      const len = Math.max(mu.length, lam.length);
      for (let i = 0; i < len; i++) {
        if ((lam[i] || 0) < (mu[i] || 0)) return false;
        if ((mu[i] || 0) < (lam[i + 1] || 0)) return false;
      }
      return true;
    }

    // Build sequence: μ⁰ ≺' λ¹ ≻ μ¹ ≺' λ² ≻ μ² ...
    const lines = [];
    const N = lambdas.length; // = mus.length - 1
    lines.push(fmtPart(mus[0]));
    for (let k = 0; k < N; k++) {
      const mu_k = mus[k].partition;
      const lam_k1 = lambdas[k].partition;
      const vOk = checkVertStrip(mu_k, lam_k1);
      lines.push('  ≺\' ' + fmtPart(lambdas[k]) + '    <span style="color:' + (vOk ? '#1a6b2e' : '#c00') + '">vert ' + (vOk ? '✓' : '✗') + '</span>');

      const mu_k1 = mus[k + 1].partition;
      const hOk = checkHorizStrip(mu_k1, lam_k1);
      lines.push('  ≻  ' + fmtPart(mus[k + 1]) + '    <span style="color:' + (hOk ? '#1a6b2e' : '#c00') + '">horiz ' + (hOk ? '✓' : '✗') + '</span>');
    }

    el.style.display = 'block';
    el.innerHTML = '<pre style="margin:0;font-size:0.82em;line-height:1.5;font-family:monospace;">' + lines.join('\n') + '</pre>';
  }

  // Event listeners
  document.getElementById('step-btn').addEventListener('click', doStep);
  document.getElementById('back-btn').addEventListener('click', stepBack);
  document.getElementById('reset-btn').addEventListener('click', reset);
  document.getElementById('auto-btn').addEventListener('click', () => autoInterval ? stopAuto() : startAuto());
  document.getElementById('instant-btn').addEventListener('click', instant);
  document.getElementById('n-input').addEventListener('change', e => { targetN = parseInt(e.target.value) || 5; updateUI(); });
  document.getElementById('palette-select').addEventListener('change', e => { paletteIndex = parseInt(e.target.value); render(); });
  document.getElementById('rotate-cb').addEventListener('change', e => { rotated = e.target.checked; render(); });
  document.getElementById('granular-cb').addEventListener('change', e => { granular = e.target.checked; updateUI(); });
  document.getElementById('holes-cb').addEventListener('change', e => { showHoles = e.target.checked; render(); });
  document.getElementById('partitions-cb').addEventListener('change', e => { showPartitions = e.target.checked; render(); });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'k') doStep();
    else if (e.key === 'j') stepBack();
  });

  window.addEventListener('resize', render);

  targetN = parseInt(document.getElementById('n-input').value) || 5;
  render();
})();
</script>

<details style="margin-top: 15px;">
  <summary style="cursor: pointer; font-weight: bold;">About the Algorithm</summary>
  <div style="padding: 10px;">
    <p><strong>Forward EKLP Shuffling</strong> builds random tilings of Aztec diamonds via the map A<sub>n</sub> → A<sub>n+1</sub>:</p>
    <ol>
      <li><strong>Delete bad blocks:</strong> Remove colliding pairs: N-S (N bottom, S top) and E-W (E left, W right)</li>
      <li><strong>Slide:</strong> Each domino slides one unit in its direction (N↑, S↓, E→, W←)</li>
      <li><strong>Fill holes:</strong> Fill each empty 2×2 block with a random domino pair</li>
    </ol>
    <p>Enable "Granular steps" to see each phase separately. Bad blocks are highlighted in red before deletion.</p>

    <hr style="margin: 15px 0;">

    <p><strong>References:</strong></p>
    <ul>
      <li><a href="https://arxiv.org/abs/math/9201305">arXiv:math/9201305</a> — Elkies, Kuperberg, Larsen, Propp (EKLP shuffling)</li>
    </ul>
  </div>
</details>
