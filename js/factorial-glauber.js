/* Glauber dynamics for the factorial Schur process.
 * Two-sided GT pattern: empty = mu^(0) prec ... prec mu^(M) = lam^(N) succ ... succ lam^(0) = empty
 *
 * Conventions in this file (0-indexed in code, 1-indexed in math comments):
 *   - mu[j] (j=0..M)       : N-part array (size N), mu[j][i]=0 forced for i>=j
 *   - lam[j] (j=0..N)      : j-part array (size j) -- j-part convention as in paper
 *   - mu[M] === lam[N]     : shared reference for the middle row (size N)
 *
 * Gibbs ratios (Theorem 1.12 of Y. Li, "Factorial Schur" 2026), in 0-indexed (i = i_math - 1):
 *   - mu interior (j in 1..M-1, i in 0..N-1):
 *       up:   (w_{j+1} + y_{v + N - i}) / (w_j     + y_{v + N + 1 - i})
 *       down: (w_j     + y_{v + N - i}) / (w_{j+1} + y_{v + N - 1 - i})
 *   - lam interior (j in 1..N-1, i in 0..j-1):
 *       up:   (x_j     + y_{v + j - i}) / (x_{j+1} + y_{v + j + 1 - i})
 *       down: (x_{j+1} + y_{v + j - i}) / (x_j     + y_{v + j - 1 - i})
 *   - middle (j=M / j=N, i in 0..N-1):
 *       up:   (x_N + y_{v + N - i}) / (w_M + y_{v + N + 1 - i})
 *       down: (w_M + y_{v + N - i}) / (x_N + y_{v + N - 1 - i})
 *
 * Position of particle i (0-indexed) in mu[j]: mu[j][i] + N - i  (always N tracks).
 * Position of particle i (0-indexed) in lam[j]: lam[j][i] + j - i  (only j tracks).
 */

(function () {
  'use strict';

  // ---- State ----
  let N = 6, M = 6;
  let mu = [];      // mu[j], j in 0..M; each size N
  let lam = [];     // lam[j], j in 0..N; lam[j] has size j; lam[N] === mu[M]

  let xArr = [], wArr = [], yArr = [];

  let stepCount = 0;
  let acceptCount = 0;
  let tryCount = 0;

  let running = false;
  let rafId = null;

  // ---- DOM ----
  const $ = (id) => document.getElementById(id);
  const canvas = $('fs-canvas');
  const ctx = canvas.getContext('2d');

  // ---- Parameter parsing (mirror of RSK page conventions) ----
  function parseCSV(str) {
    if (!str) return [];
    let processed = String(str);
    const patternRegex = /\(([^)]+)\)\^(\d+)/g;
    processed = processed.replace(patternRegex, (m, patternStr, countStr) => {
      const count = parseInt(countStr, 10);
      const vals = patternStr.split(',').map(v => v.trim()).filter(v => v !== '');
      const expanded = [];
      for (let i = 0; i < count; i++) expanded.push(...vals);
      return expanded.join(',');
    });
    const out = [];
    for (const tok of processed.split(',')) {
      const t = tok.trim();
      if (t === '') continue;
      if (t.includes('^')) {
        const parts = t.split('^');
        if (parts.length === 2) {
          const v = parseFloat(parts[0]);
          const c = parseInt(parts[1], 10);
          if (!isNaN(v) && !isNaN(c) && c > 0) { for (let i = 0; i < c; i++) out.push(v); continue; }
        }
      }
      const v = parseFloat(t);
      if (!isNaN(v)) out.push(v);
    }
    return out;
  }
  function arrayToCSV(arr) {
    return arr.map(x => Number.isInteger(x) ? x.toString() : parseFloat(x.toPrecision(6)).toString()).join(',');
  }
  function summarize(arr) {
    if (!arr.length) return '';
    const allEq = arr.every(v => v === arr[0]);
    if (allEq) return `${arr.length} values, all = ${parseFloat(arr[0].toPrecision(6))}`;
    const head = arr.slice(0, 3).map(v => parseFloat(v.toPrecision(4))).join(', ');
    const tail = arr.length > 6 ? `, ..., ${arr.slice(-2).map(v => parseFloat(v.toPrecision(4))).join(', ')}  (${arr.length} total)` : '';
    return arr.length <= 6 ? arr.map(v => parseFloat(v.toPrecision(4))).join(', ') : head + tail;
  }

  // ---- Parameter accessors (1-indexed math; arrays are 0-indexed) ----
  function xVal(j) { return j >= 1 && j <= xArr.length ? xArr[j - 1] : 1.0; }
  function wVal(j) { return j >= 1 && j <= wArr.length ? wArr[j - 1] : 1.0; }
  function yVal(k) {
    if (k < 1) return 0;
    if (k <= yArr.length) return yArr[k - 1];
    // beyond array: return 0 (background)
    return 0;
  }

  // ---- Initialization ----
  function initState() {
    mu = [];
    for (let j = 0; j <= M; j++) mu.push(new Array(N).fill(0));
    lam = [];
    for (let j = 0; j < N; j++) lam.push(new Array(j).fill(0));
    lam.push(mu[M]); // lam[N] === mu[M]
    stepCount = 0; acceptCount = 0; tryCount = 0;
  }

  // ---- Interlacing bounds ----
  // mu interior: returns [lower, upper] for mu[j][i], j in 1..M-1, i in 0..N-1
  function muBounds(j, i) {
    const below = mu[j - 1];
    const above = mu[j + 1];
    const upperBel = (i === 0) ? Infinity : below[i - 1];
    const lowerBel = below[i];
    const upperAbo = above[i];
    const lowerAbo = (i === N - 1) ? 0 : above[i + 1];
    return [Math.max(lowerBel, lowerAbo), Math.min(upperBel, upperAbo)];
  }
  // lam interior: returns [lower, upper] for lam[j][i], j in 1..N-1, i in 0..j-1
  function lamBounds(j, i) {
    const below = lam[j - 1]; // (j-1)-part
    const above = lam[j + 1]; // (j+1)-part
    // upper from below: lam[j-1][i-1] for i>=1; +inf for i=0
    const upperBel = (i === 0) ? Infinity : (i - 1 < below.length ? below[i - 1] : 0);
    // lower from below: lam[j-1][i] for i <= j-2; 0 for i = j-1 (out of below range)
    const lowerBel = (i < below.length) ? below[i] : 0;
    // upper from above: lam[j+1][i] (always valid since j+1 > j > i)
    const upperAbo = above[i];
    // lower from above: lam[j+1][i+1] (i+1 < j+1 always)
    const lowerAbo = (i + 1 < above.length) ? above[i + 1] : 0;
    return [Math.max(lowerBel, lowerAbo), Math.min(upperBel, upperAbo)];
  }
  // middle row bounds: for mu[M][i] = lam[N][i], i in 0..N-1
  function midBounds(i) {
    const muBel = mu[M - 1];
    const lamBel = lam[N - 1]; // (N-1)-part
    const upperMu = (i === 0) ? Infinity : muBel[i - 1];
    const lowerMu = muBel[i];
    const upperLam = (i === 0) ? Infinity : (i - 1 < lamBel.length ? lamBel[i - 1] : 0);
    const lowerLam = (i < lamBel.length) ? lamBel[i] : 0;
    return [Math.max(lowerMu, lowerLam), Math.min(upperMu, upperLam)];
  }

  // ---- Gibbs ratios (single-step ±1) ----
  function muRatios(j, i, v) {
    // r_+ = (w_{j+1} + y_{v + N - i}) / (w_j + y_{v + N + 1 - i})
    // r_- = (w_j + y_{v + N - i}) / (w_{j+1} + y_{v + N - 1 - i})
    const wj = wVal(j), wj1 = wVal(j + 1);
    const a = yVal(v + N - i);
    const b = yVal(v + N + 1 - i);
    const c = yVal(v + N - 1 - i);
    return { rPlus: (wj1 + a) / (wj + b), rMinus: (wj + a) / (wj1 + c) };
  }
  function lamRatios(j, i, v) {
    const xj = xVal(j), xj1 = xVal(j + 1);
    const a = yVal(v + j - i);
    const b = yVal(v + j + 1 - i);
    const c = yVal(v + j - 1 - i);
    return { rPlus: (xj + a) / (xj1 + b), rMinus: (xj1 + a) / (xj + c) };
  }
  function midRatios(i, v) {
    const xN = xVal(N), wM = wVal(M);
    const a = yVal(v + N - i);
    const b = yVal(v + N + 1 - i);
    const c = yVal(v + N - 1 - i);
    return { rPlus: (xN + a) / (wM + b), rMinus: (wM + a) / (xN + c) };
  }

  function doSingleFlip(rPlus, rMinus, v, lower, upper) {
    // Metropolis-Hastings with symmetric ±1 proposal.
    // Detailed balance: pi_v * (1/2) min(1, r_+) = pi_{v+1} * (1/2) min(1, 1/r_+).
    if (Math.random() < 0.5) {
      // propose v+1
      if (v + 1 > upper) return v;
      if (!isFinite(rPlus) || rPlus <= 0) return v;
      if (Math.random() < Math.min(1, rPlus)) return v + 1;
      return v;
    } else {
      // propose v-1
      if (v - 1 < lower) return v;
      if (!isFinite(rMinus) || rMinus <= 0) return v;
      if (Math.random() < Math.min(1, rMinus)) return v - 1;
      return v;
    }
  }

  // ---- Glauber step ----
  // Returns +1 if state changed, 0 if no change, -1 if no flippable site at all.
  function glauberStep() {
    // Site counts: mu interior = max(0, M-1) * N, lam interior = N(N-1)/2, middle = N
    const numMu = Math.max(0, M - 1) * N;
    const numLam = N >= 2 ? Math.floor(N * (N - 1) / 2) : 0;
    const numMid = N;
    const total = numMu + numLam + numMid;
    if (total === 0) return -1;

    const r = Math.random() * total;
    let changed = 0;

    if (r < numMu) {
      const idx = Math.floor(r);
      const j = 1 + Math.floor(idx / N);
      const i = idx % N;
      const v = mu[j][i];
      const [lo, hi] = muBounds(j, i);
      if (lo <= v && v <= hi) {
        const { rPlus, rMinus } = muRatios(j, i, v);
        const nv = doSingleFlip(rPlus, rMinus, v, lo, hi);
        if (nv !== v) { mu[j][i] = nv; changed = 1; }
      }
      tryCount++;
    } else if (r < numMu + numLam) {
      // pick (j, i) with j in 1..N-1, i in 0..j-1
      let r2 = r - numMu;
      let j = 1, accum = 0;
      while (j <= N - 1 && accum + j <= r2) { accum += j; j++; }
      const i = Math.floor(r2 - accum);
      if (j >= 1 && j <= N - 1 && i >= 0 && i < j) {
        const v = lam[j][i];
        const [lo, hi] = lamBounds(j, i);
        if (lo <= v && v <= hi) {
          const { rPlus, rMinus } = lamRatios(j, i, v);
          const nv = doSingleFlip(rPlus, rMinus, v, lo, hi);
          if (nv !== v) { lam[j][i] = nv; changed = 1; }
        }
      }
      tryCount++;
    } else {
      const i = Math.floor(r - numMu - numLam);
      const v = mu[M][i]; // === lam[N][i]
      const [lo, hi] = midBounds(i);
      if (lo <= v && v <= hi) {
        const { rPlus, rMinus } = midRatios(i, v);
        const nv = doSingleFlip(rPlus, rMinus, v, lo, hi);
        if (nv !== v) {
          mu[M][i] = nv; // shared with lam[N][i]
          changed = 1;
        }
      }
      tryCount++;
    }
    if (changed) acceptCount++;
    stepCount++;
    return changed;
  }

  function glauberSweep(numSteps) {
    for (let s = 0; s < numSteps; s++) glauberStep();
  }

  // ---- Helpers for visualization ----
  function maxPositionSeen() {
    let m = N;
    for (let j = 0; j <= M; j++) {
      const v = mu[j][0]; // largest position is for i=0
      if (v + N > m) m = v + N;
    }
    for (let j = 1; j <= N; j++) {
      if (lam[j].length === 0) continue;
      const v = lam[j][0];
      if (v + j > m) m = v + j;
    }
    return m;
  }

  // Position of path label k (0-indexed) at level lvl (0..M+N).
  // Returns null if path has exited.
  function pathPosition(k, lvl) {
    if (lvl <= M) {
      // mu stack
      return mu[lvl][k] + N - k;
    } else {
      const s = lvl - M;       // 1..N
      const lamLevel = N - s;  // (N-1)..0
      const track = k - s;     // 0-indexed track in lam[lamLevel]
      if (track < 0 || track >= lamLevel) return null; // exited
      return lam[lamLevel][track] + lamLevel - track;
    }
  }

  // ---- Rendering ----
  function getDesiredCellSize() {
    // Read from slider; if the slider is in "fit" mode (cellSize===0) use auto.
    const slider = $('fs-scale');
    const v = slider ? parseInt(slider.value, 10) : 20;
    if (!isFinite(v) || v <= 0) return 20;
    return v;
  }
  function draw() {
    const maxPos = Math.max(N + 2, maxPositionSeen() + 2);
    const totalLevels = M + N;

    // Layout: margins + cellSize * (cells)
    const ml = 38, mr = 18, mt = 14, mb = 28;
    const cellSize = getDesiredCellSize();

    const plotW = cellSize * maxPos;
    const plotH = cellSize * totalLevels;
    const cssW = ml + plotW + mr;
    const cssH = mt + plotH + mb;

    // Set canvas size to fit content exactly
    const dpr = window.devicePixelRatio || 1;
    if (canvas.style.width !== cssW + 'px') canvas.style.width = cssW + 'px';
    if (canvas.style.height !== cssH + 'px') canvas.style.height = cssH + 'px';
    if (canvas.width !== Math.round(cssW * dpr)) canvas.width = Math.round(cssW * dpr);
    if (canvas.height !== Math.round(cssH * dpr)) canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const xOf = (col) => ml + col * cellSize;
    const yOf = (lvl) => mt + plotH - lvl * cellSize;

    // Background bands: w-environment vs x-environment
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(ml, yOf(0) - 0, plotW, yOf(M) - yOf(0)); // bottom (mu / w)
    ctx.fillStyle = '#e9f1ff';
    ctx.fillRect(ml, yOf(M), plotW, yOf(totalLevels) - yOf(M)); // top (lam / x)

    // Horizontal grid lines per level
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let lvl = 0; lvl <= totalLevels; lvl++) {
      const y = yOf(lvl);
      ctx.moveTo(ml, y); ctx.lineTo(ml + plotW, y);
    }
    ctx.stroke();

    // Vertical column ticks (small)
    ctx.strokeStyle = '#eee';
    ctx.beginPath();
    for (let c = 1; c <= maxPos; c++) {
      const x = xOf(c);
      ctx.moveTo(x, mt); ctx.lineTo(x, mt + plotH);
    }
    ctx.stroke();

    // Mu / lam separator
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const ySep = yOf(M);
    ctx.moveTo(ml, ySep); ctx.lineTo(ml + plotW, ySep);
    ctx.stroke();

    // Side labels
    ctx.fillStyle = '#777';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let j = 0; j <= M; j++) {
      ctx.fillText('μ' + (j === 0 ? '⁰' : ''), ml - 6, yOf(j));
    }
    for (let s = 1; s <= N; s++) {
      ctx.fillText('λ' + (s === N ? '⁰' : ''), ml - 6, yOf(M + s));
    }
    // x-axis (column numbers) every 5
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#666';
    const tickStep = Math.max(1, Math.floor(maxPos / 12));
    for (let c = 0; c <= maxPos; c += tickStep) {
      ctx.fillText(String(c), xOf(c), mt + plotH + 4);
    }

    // Draw paths
    // Each path k (0..N-1) has a color
    const palette = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
      '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
      '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
    ];
    for (let k = 0; k < N; k++) {
      const color = palette[k % palette.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      // Path k exists for levels 0..M+k
      let prev = null;
      for (let lvl = 0; lvl <= Math.min(M + k, M + N); lvl++) {
        const pos = pathPosition(k, lvl);
        if (pos == null) break;
        const x = xOf(pos), y = yOf(lvl);
        if (prev == null) ctx.moveTo(x, y);
        else {
          // Draw step: vertical from prev.y to current y at prev.x, then horizontal to current x
          // (up-right look; if equal positions, just vertical)
          if (pos !== prev.pos) {
            // up to mid then right
            ctx.lineTo(prev.x, y);
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        prev = { x, y, pos };
      }
      // Exit segment at top of mu stack into lambda, drawn as part of normal path above.
      // Final exit horizontal stub (going right)
      if (prev) {
        ctx.lineTo(ml + plotW, prev.y);
      }
      ctx.stroke();

      // Particle dots
      ctx.fillStyle = color;
      for (let lvl = 0; lvl <= Math.min(M + k, M + N); lvl++) {
        const pos = pathPosition(k, lvl);
        if (pos == null) break;
        const x = xOf(pos), y = yOf(lvl);
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  // ---- UI Wiring ----
  function applyParamsFromInputs() {
    xArr = parseCSV($('fs-x').value);
    wArr = parseCSV($('fs-w').value);
    yArr = parseCSV($('fs-y').value);
    $('fs-x-note').textContent = `x: [${summarize(xArr)}]  (need length ${N})`;
    $('fs-w-note').textContent = `w: [${summarize(wArr)}]  (need length ${M})`;
    $('fs-y-note').textContent = `y: [${summarize(yArr)}]  (need length ≥ ${maxPositionSeen()})`;
  }
  function applyQSpecToInputs() {
    const q = parseFloat($('fs-q').value);
    const a = parseFloat($('fs-alpha').value);
    const b = parseFloat($('fs-beta').value);
    const g = parseFloat($('fs-gamma').value);
    const xS = []; for (let i = 1; i <= N; i++) xS.push(round6(a * Math.pow(q, i)));
    const wS = []; for (let k = 1; k <= M; k++) wS.push(round6(g * Math.pow(q, k)));
    const yLen = Math.max(120, N + 60);
    const yS = []; for (let k = 1; k <= yLen; k++) yS.push(round6(b * Math.pow(q, k)));
    $('fs-x').value = arrayToCSV(xS);
    $('fs-w').value = arrayToCSV(wS);
    $('fs-y').value = arrayToCSV(yS);
    applyParamsFromInputs();
  }
  function round6(x) {
    return parseFloat(x.toPrecision(6));
  }
  function applyUniformToInputs() {
    $('fs-x').value = `1^${N}`;
    $('fs-w').value = `1^${M}`;
    $('fs-y').value = `1^${Math.max(60, N + 4)}`;
    applyParamsFromInputs();
  }

  function refreshStats() {
    $('fs-stat-step').textContent = stepCount.toString();
    $('fs-stat-acc').textContent = acceptCount.toString();
    $('fs-stat-tries').textContent = tryCount.toString();
    const middle = mu[M];
    let size = 0; for (const v of middle) size += v;
    $('fs-stat-size').textContent = size.toString();
    $('fs-stat-maxp').textContent = (maxPositionSeen()).toString();
  }

  function setRunning(on) {
    running = on;
    $('fs-run-btn').textContent = on ? '⏸ Pause' : '▶ Run';
    $('fs-run-btn').classList.toggle('danger', on);
    $('fs-run-btn').classList.toggle('primary', !on);
    if (on) {
      const tick = () => {
        if (!running) return;
        const sweepsPerFrame = Math.max(0, parseInt($('fs-speed').value || '1', 10));
        // 1 sweep = (M*N + N(N-1)/2 + N) attempted flips, scaled by some factor
        const sitesPerSweep = Math.max(1, Math.max(0, M - 1) * N + Math.max(0, N * (N - 1) / 2) + N);
        const stepsThisFrame = sitesPerSweep * sweepsPerFrame;
        glauberSweep(stepsThisFrame);
        draw();
        refreshStats();
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    } else if (rafId) {
      cancelAnimationFrame(rafId); rafId = null;
    }
  }

  function fullRebuild() {
    setRunning(false);
    N = clampInt($('fs-N').value, 1, 40);
    M = clampInt($('fs-M').value, 1, 40);
    initState();
    applyParamsFromInputs();
    draw();
    refreshStats();
  }
  function clampInt(s, lo, hi) {
    const n = parseInt(s, 10);
    if (isNaN(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function setupListeners() {
    $('fs-resize-btn').addEventListener('click', fullRebuild);
    $('fs-uniform-btn').addEventListener('click', () => { applyUniformToInputs(); draw(); });
    $('fs-apply-q').addEventListener('click', () => { applyQSpecToInputs(); draw(); });
    $('fs-x').addEventListener('input', () => { applyParamsFromInputs(); });
    $('fs-w').addEventListener('input', () => { applyParamsFromInputs(); });
    $('fs-y').addEventListener('input', () => { applyParamsFromInputs(); });
    $('fs-N').addEventListener('change', fullRebuild);
    $('fs-M').addEventListener('change', fullRebuild);

    $('fs-run-btn').addEventListener('click', () => setRunning(!running));
    $('fs-step-btn').addEventListener('click', () => {
      const n = parseInt($('fs-step-count').value, 10) || 1;
      glauberSweep(n);
      draw(); refreshStats();
    });
    $('fs-reset-btn').addEventListener('click', () => {
      setRunning(false);
      initState();
      draw(); refreshStats();
    });

    const scaleEl = $('fs-scale');
    const scaleValEl = $('fs-scale-val');
    if (scaleEl && scaleValEl) {
      const onScaleChange = () => {
        scaleValEl.textContent = scaleEl.value + 'px';
        draw();
      };
      scaleEl.addEventListener('input', onScaleChange);
      onScaleChange();
    }
    const fitBtn = $('fs-scale-fit');
    if (fitBtn) {
      fitBtn.addEventListener('click', () => {
        // Pick the largest cell that fits in current canvas-wrap
        const wrap = document.getElementById('fs-canvas-wrap');
        if (!wrap) return;
        const wrapW = wrap.clientWidth - 16;          // minus padding
        const wrapH = Math.max(280, window.innerHeight * 0.7);
        const maxPos = Math.max(N + 2, maxPositionSeen() + 2);
        const totalLevels = M + N;
        const fitCell = Math.floor(Math.max(3, Math.min(
          (wrapW - 38 - 18) / maxPos,
          (wrapH - 14 - 28) / totalLevels
        )));
        scaleEl.value = String(Math.min(parseInt(scaleEl.max,10), Math.max(parseInt(scaleEl.min,10), fitCell)));
        scaleValEl.textContent = scaleEl.value + 'px';
        draw();
      });
    }

    window.addEventListener('resize', () => draw());
  }

  // ---- Entry ----
  function init() {
    N = clampInt($('fs-N').value, 1, 40);
    M = clampInt($('fs-M').value, 1, 40);
    initState();
    // Auto-apply q-spec so the page boots with sensible non-trivial parameters
    applyQSpecToInputs();
    setupListeners();
    draw();
    refreshStats();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
