---
title: q-Shuffling Algorithm for Domino Tilings
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2026-03-22-q-shuffling-algo.md'
    txt: 'Pure JavaScript implementation of q-weighted EKLP shuffling'
a11y-description: "Interactive simulation of Aztec diamond domino tilings generated step-by-step via the q-weighted domino shuffling algorithm. Watch each shuffle phase: identify bad blocks, delete, slide, and fill with q-dependent probabilities. Adjust target size n and parameter q; use granular mode to see individual phases."
---

<script src="/js/colorschemes.js"></script>
<script src="/js/q-shuffling-engine.js"></script>

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
// ═══════════════════════════════════════════════════════════════════
// DISPLAY — canvas rendering, UI controls, event listeners
// Engine loaded from /js/q-shuffling-engine.js → window.QShufflingEngine
// ═══════════════════════════════════════════════════════════════════
(function() {
  const E = window.QShufflingEngine;

  const canvas = document.getElementById('aztec-canvas');
  const ctx = canvas.getContext('2d');

  let autoInterval = null;
  let rotated = false;
  let granular = true;
  let showHoles = true;
  let showPartitions = true;

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

  // --- Step / reset / instant (bridge engine ↔ display) ---

  function doStep() {
    const s = E.getState();
    if (s.currentN >= s.targetN && s.phase === 'complete') return;
    E.saveSnapshot();
    if (granular) E.granularStep(); else E.shuffleStep();
    updateUI();
    render();
  }

  function stepBack() {
    if (!E.restoreSnapshot()) return;
    stopAuto();
    updateUI();
    render();
  }

  function reset() {
    E.resetState();
    stopAuto();
    updateUI();
    render();
  }

  function instant() {
    stopAuto();
    E.runToTarget();
    updateUI();
    render();
  }

  // --- UI state ---

  function updateUI() {
    const s = E.getState();
    let phaseText = '';
    if (granular && s.phase !== 'complete') {
      const phaseNames = {
        'badblocks': 'bad blocks found',
        'deleted': 'after deletion',
        'slid': 'after sliding'
      };
      phaseText = ` [${phaseNames[s.phase]}]`;
    }
    document.getElementById('step-indicator').textContent = `n=${s.currentN}${phaseText}`;
    document.getElementById('step-btn').disabled = s.currentN >= s.targetN && s.phase === 'complete';
    document.getElementById('back-btn').disabled = s.historyLen === 0;
  }

  function startAuto() {
    if (autoInterval) return;
    autoInterval = setInterval(() => {
      const s = E.getState();
      if (s.currentN >= s.targetN && s.phase === 'complete') { stopAuto(); return; }
      doStep();
    }, parseInt(document.getElementById('speed-slider').value));
    document.getElementById('auto-btn').textContent = 'Stop';
  }

  function stopAuto() {
    if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
    document.getElementById('auto-btn').textContent = 'Auto';
  }

  // --- Canvas rendering ---

  function render() {
    const s = E.getState();
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const maxN = Math.max(s.currentN, s.targetN, 1);
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
    ctx.transform(0, -1, -1, 0, 0, 0);

    const parityOffset = s.currentN + (s.phase === 'slid' ? 1 : 0);
    const boardExtent = Math.ceil(Math.max(rect.width, rect.height) / cellSize * (rotated ? Math.SQRT2 : 1)) + 2;
    for (let gx = -boardExtent; gx <= boardExtent; gx++) {
      for (let gy = -boardExtent; gy <= boardExtent; gy++) {
        const isWhite = ((gx + gy + parityOffset) % 2 + 2) % 2 === 0;
        ctx.fillStyle = isWhite ? '#d8d8d8' : '#ffffff';
        ctx.fillRect(gx * cellSize, -(gy + 1) * cellSize, cellSize, cellSize);
      }
    }

    if (s.currentN === 0) { ctx.restore(); return; }

    const colors = getColors();
    const typeColor = {'N': 0, 'S': 1, 'E': 2, 'W': 3};

    s.dominoes.forEach((d, idx) => {
      const isHoriz = (d.type === 'N' || d.type === 'S');
      const w = isHoriz ? 2 * cellSize : cellSize;
      const h = isHoriz ? cellSize : 2 * cellSize;

      const px = d.x * cellSize;
      const py = -(d.y + (isHoriz ? 1 : 2)) * cellSize;

      if (showHoles) {
        const isHole = (d.type === 'N' || d.type === 'E');
        const radius = cellSize * 0.35;

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
            const isWhiteCell = ((c.lx + c.ly + parityOffset) % 2 + 2) % 2 === 0;
            ctx.fillStyle = isWhiteCell ? '#228B22' : '#FF8C00';
            ctx.fill();
          }
        });

        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = Math.max(0.5, cellSize / 20);
        ctx.strokeRect(px, py, w, h);
      } else {
        if (s.phase === 'badblocks' && s.badDominoes.has(idx)) {
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

    if (showPartitions && s.currentN > 0) {
      const nDiag = s.currentN + (s.phase === 'slid' ? 1 : 0);
      const diags = E.computeDiagonalPartitions(nDiag);
      const fontSize = Math.max(11, Math.min(22, cellSize * 1.36)) * 1.6;
      ctx.font = `${fontSize}px serif`;
      ctx.textBaseline = 'middle';
      diags.forEach(info => {
        if (info.cells.length === 0) return;
        let dx, dy;
        if (info.isLambda) {
          const xMin = info.cells[0].x;
          const yAtXMin = info.d - xMin;
          dx = (xMin - 0.5) * cellSize - cellSize * 0.2;
          dy = -(yAtXMin + 1.5) * cellSize;
          ctx.textAlign = 'right';
        } else {
          const xMax = info.cells[info.cells.length - 1].x;
          const yAtXMax = info.d - xMax;
          dx = (xMax + 1.5) * cellSize + cellSize * 0.2;
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
          text += ' = ' + (info.partition.length ? '(' + info.partition.join(',') + ')' : '∅');
        }
        ctx.fillText(text, sx, sy);
      });
    }

    renderInterlacingDisplay();
  }

  function renderInterlacingDisplay() {
    const s = E.getState();
    const el = document.getElementById('interlacing-display');
    if (!showPartitions || s.currentN === 0) { el.style.display = 'none'; return; }
    const nDiag = s.currentN + (s.phase === 'slid' ? 1 : 0);
    const diags = E.computeDiagonalPartitions(nDiag);
    const mus = diags.filter(d => !d.isLambda);
    const lambdas = diags.filter(d => d.isLambda);

    function fmtPart(info) {
      return info.label + ' = ' + (info.partition.length ? '(' + info.partition.join(',') + ')' : '∅');
    }

    function checkVertStrip(mu, lam) {
      const len = Math.max(mu.length, lam.length);
      for (let i = 0; i < len; i++) {
        const d = (lam[i] || 0) - (mu[i] || 0);
        if (d < 0 || d > 1) return false;
      }
      return true;
    }
    function checkHorizStrip(mu, lam) {
      const len = Math.max(mu.length, lam.length);
      for (let i = 0; i < len; i++) {
        if ((lam[i] || 0) < (mu[i] || 0)) return false;
        if ((mu[i] || 0) < (lam[i + 1] || 0)) return false;
      }
      return true;
    }

    const lines = [];
    const N = lambdas.length;
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

  // --- Event listeners ---

  document.getElementById('step-btn').addEventListener('click', doStep);
  document.getElementById('back-btn').addEventListener('click', stepBack);
  document.getElementById('reset-btn').addEventListener('click', reset);
  document.getElementById('auto-btn').addEventListener('click', () => autoInterval ? stopAuto() : startAuto());
  document.getElementById('instant-btn').addEventListener('click', instant);
  document.getElementById('n-input').addEventListener('change', e => { E.setTargetN(parseInt(e.target.value) || 5); updateUI(); });
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

  E.setTargetN(parseInt(document.getElementById('n-input').value) || 5);
  render();
})();
</script>

<details style="margin-top: 15px;">
  <summary style="cursor: pointer; font-weight: bold;">About the Algorithm</summary>
  <div style="padding: 10px;">
    <p><strong>q-Weighted EKLP Shuffling</strong> builds random tilings of Aztec diamonds via the map A<sub>n</sub> → A<sub>n+1</sub>:</p>
    <ol>
      <li><strong>Delete bad blocks:</strong> Remove colliding pairs: N-S (N bottom, S top) and E-W (E left, W right)</li>
      <li><strong>Slide:</strong> Each domino slides one unit in its direction (N↑, S↓, E→, W←)</li>
      <li><strong>Fill holes:</strong> Fill each empty 2×2 block with a q-weighted random domino pair</li>
    </ol>
    <p>Enable "Granular steps" to see each phase separately. Bad blocks are highlighted in red before deletion.</p>

    <hr style="margin: 15px 0;">

    <p><strong>References:</strong></p>
    <ul>
      <li><a href="https://arxiv.org/abs/math/9201305">arXiv:math/9201305</a> — Elkies, Kuperberg, Larsen, Propp (EKLP shuffling)</li>
    </ul>
  </div>
</details>
