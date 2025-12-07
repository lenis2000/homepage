---
title: q-Whittaker Domino Shuffling
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-07-q-whittaker-shuffling.md'
    txt: 'Pure JavaScript implementation of EKLP shuffling'
---

<script src="/js/colorschemes.js"></script>

<div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%); border: 2px dashed #856404; border-radius: 8px; padding: 15px 20px; margin-bottom: 20px;">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
    <span style="font-size: 1.5em;">🚧</span>
    <strong style="color: #856404; font-size: 1.1em;">q-Whittaker Deformation: Coming Soon</strong>
  </div>
  <p style="margin: 0 0 10px 0; color: #664d03;">Currently running <b>uniform shuffling</b> (q = 0). The q &gt; 0 deformation will modify the hole-filling step to introduce correlations based on partition-valued stopping probabilities. For a working q-Whittaker implementation, see <a href="/simulations/2025-12-04-rsk-sampling/" style="color: #0056b3; font-weight: bold;">q-RSK Sampling of Domino Tilings</a>.</p>
  <div style="display: flex; align-items: center; gap: 15px; opacity: 0.6;">
    <label style="color: #664d03;">q = <input type="number" value="0" min="0" max="1" step="0.01" style="width: 60px;" disabled></label>
    <span style="font-size: 0.9em; color: #856404; font-style: italic;">Parameter disabled until implementation</span>
  </div>
</div>

<div style="margin-bottom: 10px;">
  <label>Target n: <input id="n-input" type="number" value="10" min="1" max="50" style="width: 60px;"></label>
</div>

<div style="margin-bottom: 10px;">
  <button id="reset-btn">Reset</button>
  <button id="step-btn">Step</button>
  <button id="auto-btn">Auto</button>
  <button id="instant-btn">Instant</button>
  <label style="margin-left: 10px;">Speed: <input id="speed-slider" type="range" min="50" max="500" value="150" style="width: 80px; vertical-align: middle;"></label>
  <span id="step-indicator" style="margin-left: 15px; font-weight: bold;">n=0</span>
</div>

<div style="margin-bottom: 10px;">
  <label><input type="checkbox" id="granular-cb"> Granular steps</label>
  <label style="margin-left: 15px;"><input type="checkbox" id="rotate-cb" checked> Rotate 45°</label>
  <label style="margin-left: 15px;"><input type="checkbox" id="particles-cb"> Particles</label>
  <select id="palette-select" style="margin-left: 15px;"></select>
</div>

<canvas id="aztec-canvas" style="width: 100%; height: 70vh; border: 1px solid #ccc; background: #fafafa;"></canvas>

<script>
(function() {
  const canvas = document.getElementById('aztec-canvas');
  const ctx = canvas.getContext('2d');

  // State
  let currentN = 0;
  let targetN = 10;
  // Dominoes: {x, y, type} where type is 'N', 'S', 'E', 'W'
  // N/S are horizontal, E/W are vertical
  let dominoes = [];
  let autoInterval = null;
  let rotated = true;
  let granular = false;
  let showParticles = false;
  let phase = 'complete';  // 'complete', 'badblocks', 'deleted', 'slid'
  let badDominoes = new Set();  // For highlighting bad blocks

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
  // TODO: q-Whittaker deformation will be implemented here
  // See RSK sampling implementation for the partition-based q-Whittaker algorithm
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
    if (granular) granularStep(); else shuffleStep();
    updateUI();
    render();
  }

  function reset() {
    currentN = 0;
    dominoes = [];
    phase = 'complete';
    stopAuto();
    updateUI();
    render();
  }

  function instant() {
    stopAuto();
    currentN = 0;
    dominoes = [];
    phase = 'complete';
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

    if (currentN === 0) return;

    const maxN = Math.max(currentN, targetN);
    const cellSize = Math.min(rect.width, rect.height) / (2 * maxN + 2);
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    if (rotated) {
      ctx.rotate(-Math.PI / 4);
      ctx.scale(1 / Math.sqrt(2), 1 / Math.sqrt(2));
    }

    const colors = getColors();
    const typeColor = {'N': 0, 'S': 1, 'E': 2, 'W': 3};

    dominoes.forEach((d, idx) => {
      const isHoriz = (d.type === 'N' || d.type === 'S');
      const w = isHoriz ? 2 * cellSize : cellSize;
      const h = isHoriz ? cellSize : 2 * cellSize;

      const px = d.x * cellSize;
      const py = -(d.y + (isHoriz ? 1 : 2)) * cellSize;

      if (showParticles) {
        // Particles view: N and E are particles (filled), S and W are holes (empty)
        const isParticle = (d.type === 'N' || d.type === 'E');
        const radius = cellSize * 0.35;

        // Get center positions of the two cells in the domino
        let centers;
        if (isHoriz) {
          // Horizontal domino: two cells side by side
          centers = [
            { x: px + cellSize / 2, y: py + cellSize / 2 },
            { x: px + cellSize * 1.5, y: py + cellSize / 2 }
          ];
        } else {
          // Vertical domino: two cells stacked
          centers = [
            { x: px + cellSize / 2, y: py + cellSize / 2 },
            { x: px + cellSize / 2, y: py + cellSize * 1.5 }
          ];
        }

        centers.forEach(c => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
          if (isParticle) {
            ctx.fillStyle = '#000';
            ctx.fill();
          } else {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = Math.max(1, cellSize / 15);
            ctx.stroke();
          }
        });
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
  }

  // Event listeners
  document.getElementById('step-btn').addEventListener('click', doStep);
  document.getElementById('reset-btn').addEventListener('click', reset);
  document.getElementById('auto-btn').addEventListener('click', () => autoInterval ? stopAuto() : startAuto());
  document.getElementById('instant-btn').addEventListener('click', instant);
  document.getElementById('n-input').addEventListener('change', e => { targetN = parseInt(e.target.value) || 10; updateUI(); });
  document.getElementById('palette-select').addEventListener('change', e => { paletteIndex = parseInt(e.target.value); render(); });
  document.getElementById('rotate-cb').addEventListener('change', e => { rotated = e.target.checked; render(); });
  document.getElementById('granular-cb').addEventListener('change', e => { granular = e.target.checked; updateUI(); });
  document.getElementById('particles-cb').addEventListener('change', e => { showParticles = e.target.checked; render(); });

  window.addEventListener('resize', render);

  targetN = parseInt(document.getElementById('n-input').value) || 10;
  render();
})();
</script>

<details style="margin-top: 15px;">
  <summary style="cursor: pointer; font-weight: bold;">About the Algorithm</summary>
  <div style="padding: 10px;">
    <p><b>Forward EKLP Shuffling</b> builds random tilings of Aztec diamonds via the map A<sub>n</sub> → A<sub>n+1</sub>:</p>
    <ol>
      <li><b>Delete bad blocks:</b> Remove colliding pairs: N-S (N bottom, S top) and E-W (E left, W right)</li>
      <li><b>Slide:</b> Each domino slides one unit in its direction (N↑, S↓, E→, W←)</li>
      <li><b>Fill holes:</b> Fill each empty 2×2 block with a random domino pair</li>
    </ol>
    <p>Enable "Granular steps" to see each phase separately. Bad blocks are highlighted in red before deletion.</p>

    <hr style="margin: 15px 0;">

    <h4>q-Whittaker Deformation (TODO)</h4>
    <p>The q-Whittaker deformation of domino shuffling modifies <b>Step 3 (Fill holes)</b> to introduce correlations between adjacent empty blocks based on partition-valued stopping probabilities.</p>

    <p>For a working implementation using the partition-based q-Whittaker algorithm (via RSK growth diagrams), see:</p>
    <ul>
      <li><a href="/simulations/domino/2025-12-04-RSK-sampling/">q-RSK Sampling of Domino Tilings</a> — samples from q-Whittaker measure using growth diagram dynamics</li>
    </ul>

    <p>The challenge for direct shuffling is translating partition indices (where islands are detected as consecutive i with μ<sub>i</sub> − κ<sub>i</sub> = 1) into geometric empty-block positions.</p>

    <p><b>References:</b></p>
    <ul>
      <li><a href="https://arxiv.org/abs/math/9201305">arXiv:math/9201305</a> — Elkies, Kuperberg, Larsen, Propp (EKLP shuffling)</li>
      <li><a href="https://arxiv.org/abs/1504.00666">arXiv:1504.00666</a> — Matveev, Petrov (q-RSK and q-Whittaker)</li>
    </ul>
  </div>
</details>
