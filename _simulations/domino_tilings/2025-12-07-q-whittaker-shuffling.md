---
title: q-Whittaker Domino Shuffling
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-07-q-whittaker-shuffling.md'
    txt: 'Pure JavaScript implementation of EKLP shuffling with q-Whittaker deformation'
a11y-description: "Interactive simulation of Aztec diamond domino tilings generated step-by-step via the domino shuffling algorithm with q-Whittaker deformation. Watch each shuffle phase: identify bad blocks, delete, slide, and fill with q-correlated dominoes. Adjust target size n up to 50 and q parameter from 0 to 1."
---

<script src="/js/colorschemes.js"></script>

<div style="margin-bottom: 10px;">
  <label>Target n: <input id="n-input" type="number" value="10" min="1" max="200" style="width: 60px;" aria-label="Target diamond size n"></label>
  <label style="margin-left: 15px;">q: <input id="q-input" type="number" value="0" min="0" max="0.999" step="0.01" style="width: 70px;" aria-label="q-Whittaker parameter"></label>
  <input id="q-slider" type="range" min="0" max="999" value="0" style="width: 120px; vertical-align: middle;" aria-label="q slider">
  <span id="q-display" style="margin-left: 5px; font-family: monospace;">q=0</span>
</div>

<div style="margin-bottom: 10px;">
  <button id="reset-btn">Reset</button>
  <button id="back-btn" disabled>← Back</button>
  <button id="step-btn">Step</button>
  <button id="auto-btn">Auto</button>
  <button id="instant-btn">Instant</button>
  <label style="margin-left: 10px;">Speed: <input id="speed-slider" type="range" min="50" max="500" value="150" style="width: 80px; vertical-align: middle;" aria-label="Animation speed"></label>
  <span id="step-indicator" style="margin-left: 15px; font-weight: bold;" role="status" aria-live="polite">n=0</span>
</div>

<div style="margin-bottom: 10px;">
  <label><input type="checkbox" id="granular-cb"> Granular steps</label>
  <label style="margin-left: 15px;"><input type="checkbox" id="rotate-cb" checked> Rotate 45°</label>
  <label style="margin-left: 15px;"><input type="checkbox" id="holes-cb"> Particles</label>
  <select id="palette-select" style="margin-left: 15px;" aria-label="Color palette"></select>
  <label style="margin-left: 15px;">Border: <input id="border-slider" type="range" min="0" max="100" value="50" style="width: 80px; vertical-align: middle;" aria-label="Domino border width"></label>
</div>

<canvas id="aztec-canvas" style="width: 100%; height: 70vh; border: 1px solid #ccc; background: #fafafa;" role="img" aria-label="Aztec diamond domino tiling built by shuffling algorithm"></canvas>

<div id="step-log" style="max-height: 250px; overflow-y: auto; font-family: monospace; font-size: 0.78em; background: #f0f0f0; padding: 8px; border-radius: 4px; margin-top: 10px; display: none; white-space: pre-wrap; line-height: 1.4;"></div>

<script>
(function() {
  console.log('[q-shuffling v4] loaded');
  const canvas = document.getElementById('aztec-canvas');
  const ctx = canvas.getContext('2d');

  // State
  let currentN = 0;
  let targetN = 10;
  let qParam = 0;
  let dominoes = [];
  let autoInterval = null;
  let rotated = true;
  let granular = false;
  let showHoles = false;
  let borderWidth = 0.5; // 0 to 1
  let phase = 'complete';  // 'complete', 'badblocks', 'deleted', 'slid', 'creating'
  let badDominoes = new Set();
  let creationQueue = []; // dominoes to reveal one-by-one in 'creating' phase
  let creationLogQueue = []; // per-cell log messages to reveal alongside dominos

  // Persistent growth diagram state (for incremental stepping with any q)
  let diagCurr = [];
  let diagPrev = [];
  let partSeq = [];

  // History stack for step-back
  let history = [];
  const MAX_HISTORY = 200;

  function saveState() {
    history.push({
      currentN, dominoes: dominoes.map(d => ({...d})),
      phase, stepProb,
      partSeq: partSeq.map(p => [...p]),
      diagCurr: diagCurr.map(p => [...p]),
      diagPrev: diagPrev.map(p => [...p]),
      creationQueue: creationQueue.map(d => ({...d})),
      creationLogQueue: creationLogQueue.map(l => [...l]),
      cellProbs: [...cellProbs],
      nextDominoes: nextDominoes ? nextDominoes.map(d => ({...d})) : null,
      logText: stepLogEl ? stepLogEl.textContent : ''
    });
    if (history.length > MAX_HISTORY) history.shift();
  }

  function restoreState() {
    if (history.length === 0) return;
    const s = history.pop();
    currentN = s.currentN;
    dominoes = s.dominoes;
    phase = s.phase;
    stepProb = s.stepProb;
    partSeq = s.partSeq;
    diagCurr = s.diagCurr;
    diagPrev = s.diagPrev;
    creationQueue = s.creationQueue;
    creationLogQueue = s.creationLogQueue;
    cellProbs = s.cellProbs;
    nextDominoes = s.nextDominoes;
    if (stepLogEl) { stepLogEl.textContent = s.logText; stepLogEl.style.display = s.logText ? 'block' : 'none'; }
    updateUI(); render();
  }

  // Step probability: accumulated product of all random choices in a step
  let stepProb = 1;

  // Step log
  const stepLogEl = document.getElementById('step-log');

  // ============ q-Whittaker core ============

  // Numerically stable 1 - q^n
  function oneMinusQtoN(q, n) {
    if (n <= 0) return 0;
    if (q <= 0) return 1;
    if (q >= 1) return 0;
    return -Math.expm1(n * Math.log1p(q - 1));
  }

  function getPart(partition, i) {
    return (i >= 0 && i < partition.length) ? partition[i] : 0;
  }

  // cellLogBuffer: when non-null, sampleVHq appends here instead of the main log
  let cellLogBuffer = null;

  function logStep(msg) {
    if (cellLogBuffer !== null) {
      cellLogBuffer.push(msg);
      return;
    }
    if (stepLogEl) {
      stepLogEl.style.display = 'block';
      stepLogEl.textContent += msg + '\n';
      stepLogEl.scrollTop = stepLogEl.scrollHeight;
    }
  }

  function clearLog() {
    if (stepLogEl) { stepLogEl.textContent = ''; stepLogEl.style.display = 'none'; }
  }

  function appendLog(msg) {
    if (stepLogEl) {
      stepLogEl.style.display = 'block';
      stepLogEl.textContent += msg + '\n';
      stepLogEl.scrollTop = stepLogEl.scrollHeight;
    }
  }

  function fmtPart(p) { return (!p || p.length === 0) ? '∅' : '(' + p.join(',') + ')'; }

  // Port of C++ sampleVHq: the V→H map with q-cascade
  // lam, mu, kappa are partition arrays; bit is 0 or 1; q is the parameter
  // cellLabel: optional string for logging (e.g., "(i=2,j=3)")
  function sampleVHq(lam, mu, kappa, bit, q, cellLabel) {
    const maxLen = Math.max(lam.length, mu.length, kappa.length) + 2;

    // Find islands: consecutive indices where mu_i - kappa_i = 1
    const moved = [];
    for (let i = 0; i < maxLen; i++) {
      if (getPart(mu, i) - getPart(kappa, i) === 1) moved.push(i);
    }
    const islands = [];
    if (moved.length > 0) {
      let start = moved[0], end = moved[0];
      for (let i = 1; i < moved.length; i++) {
        if (moved[i] === moved[i-1] + 1) { end = moved[i]; }
        else { islands.push([start, end]); start = moved[i]; end = moved[i]; }
      }
      islands.push([start, end]);
    }

    // Initialize nu = lam
    const nu = new Array(maxLen);
    for (let i = 0; i < maxLen; i++) nu[i] = getPart(lam, i);

    // Rightmost particle jumps by bit
    nu[0] = getPart(lam, 0) + bit;

    // Log header for this cell
    if (cellLabel) {
      logStep(`${cellLabel}: B=${bit}, λ=${fmtPart(lam)}, ν̄=${fmtPart(mu)}, κ=${fmtPart(kappa)}`);
      if (islands.length === 0) logStep('  no islands (no particles moved at previous level)');
    }

    // Process each island
    for (const [k, m] of islands) {
      const islandLen = m - k + 1;

      // Case 1: bit=1 and k=0 (boundary push)
      if (bit === 1 && k === 0) {
        if (cellLabel) {
          logStep(`  island[${k},${m}] (len=${islandLen}): B=1 & k=0 → boundary push, all ${m+1} particles jump`);
        }
        for (let idx = 1; idx <= m + 1; idx++) nu[idx] = getPart(lam, idx) + 1;
        continue;
      }

      // Case 2: generic — the q-cascade
      let stoppedAt;
      if (q === 0) {
        // Schur case: deterministic — stop at first unblocked particle
        stoppedAt = m + 1;
        for (let idx = k; idx <= m; idx++) {
          if (getPart(lam, idx) > getPart(mu, idx) - 1) { stoppedAt = idx; break; }
        }
        if (cellLabel) {
          logStep(`  island[${k},${m}] (len=${islandLen}): q=0 deterministic → stopped@${stoppedAt}`);
        }
      } else {
        // q-Whittaker case: probabilistic cascade
        const lam_k = getPart(lam, k);
        const nu_bar_k = getPart(mu, k);
        let f_k;
        if (k === 0) {
          // k=0: ν̄_{-1} = ∞, so denominator = 1
          const gap = lam_k - nu_bar_k + 1;
          f_k = (gap <= 0) ? 0 : oneMinusQtoN(q, gap);
          if (cellLabel) {
            logStep(`  island[${k},${m}] (len=${islandLen}): cascade with q=${q.toFixed(3)}`);
            logStep(`    f_${k} = 1-q^${gap} = ${f_k.toFixed(4)}  (λ_${k}=${lam_k}, ν̄_${k}=${nu_bar_k}, gap=${gap}; k=0 so denom=1)`);
          }
        } else {
          const gap_num = lam_k - nu_bar_k + 1;
          const gap_den = getPart(mu, k - 1) - nu_bar_k + 1;
          if (gap_num <= 0) f_k = 0;
          else if (gap_den <= 0) f_k = 1;
          else {
            const num = oneMinusQtoN(q, gap_num);
            const den = oneMinusQtoN(q, gap_den);
            f_k = (den === 0) ? 1 : num / den;
          }
          if (cellLabel) {
            logStep(`  island[${k},${m}] (len=${islandLen}): cascade with q=${q.toFixed(3)}`);
            logStep(`    f_${k} = (1-q^${gap_num})/(1-q^${gap_den}) = ${f_k.toFixed(4)}  (λ_${k}=${lam_k}, ν̄_${k}=${nu_bar_k}, ν̄_${k-1}=${getPart(mu, k-1)})`);
            if (gap_num <= 0) logStep(`    → gap_num≤0: particle blocked (λ_${k}=ν̄_${k}-1), MUST stay`);
            if (gap_den <= 0 && gap_num > 0) logStep(`    → gap_den≤0: particle at boundary, f_k=1 (always stops here)`);
          }
        }

        const u_f = Math.random();
        if (u_f < f_k) {
          stoppedAt = k;
          stepProb *= f_k;
          if (cellLabel) logStep(`    U=${u_f.toFixed(4)} < f_${k}=${f_k.toFixed(4)} → STOP at ${k}  [P(choice)=${f_k.toFixed(4)}]`);
        } else {
          stepProb *= (1 - f_k);
          if (cellLabel) logStep(`    U=${u_f.toFixed(4)} ≥ f_${k}=${f_k.toFixed(4)} → cascade continues...  [P(pass)=${(1-f_k).toFixed(4)}]`);
          stoppedAt = m + 1;
          for (let s = k + 1; s <= m; s++) {
            const gap_s = getPart(lam, s) - getPart(mu, s) + 1;
            const g_s = (gap_s <= 0) ? 0 : oneMinusQtoN(q, gap_s);
            const u_g = Math.random();
            if (cellLabel) {
              logStep(`    g_${s} = 1-q^${gap_s} = ${g_s.toFixed(4)}  (λ_${s}=${getPart(lam,s)}, ν̄_${s}=${getPart(mu,s)})`);
            }
            if (u_g < g_s) {
              stoppedAt = s;
              stepProb *= g_s;
              if (cellLabel) logStep(`    U=${u_g.toFixed(4)} < g_${s}=${g_s.toFixed(4)} → STOP at ${s}  [P(stop)=${g_s.toFixed(4)}]`);
              break;
            } else {
              stepProb *= (1 - g_s);
              if (cellLabel) logStep(`    U=${u_g.toFixed(4)} ≥ g_${s}=${g_s.toFixed(4)} → pass  [P(pass)=${(1-g_s).toFixed(4)}]`);
            }
          }
          if (stoppedAt === m + 1) {
            // Last particle stays — probability is the remaining (1-g_m) already accumulated
            if (cellLabel) logStep(`    cascade reached end → STOP at ${m+1} (last particle)`);
          }
        }
      }

      // Log result: which particles jump, which stays
      if (cellLabel) {
        const jumpers = [], stayer = stoppedAt;
        for (let idx = k; idx <= m + 1; idx++) {
          if (idx !== stoppedAt) jumpers.push(idx);
        }
        logStep(`    → particles ${jumpers.join(',')} jump (+1); particle ${stayer} stays (domain wall)`);
      }

      // Apply moves
      for (let idx = k; idx <= m + 1; idx++) {
        if (idx !== stoppedAt) nu[idx] = getPart(lam, idx) + 1;
      }
    }

    // Ensure nu >= mu
    for (let i = 0; i < maxLen; i++) {
      nu[i] = Math.max(nu[i], getPart(mu, i));
    }

    // Trim trailing zeros
    let len = maxLen;
    while (len > 0 && nu[len - 1] === 0) len--;
    const result = nu.slice(0, len);

    if (cellLabel) {
      logStep(`  → ν = ${fmtPart(result)}  (|ν|=${result.reduce((a,b)=>a+b,0)})`);
    }

    return result;
  }

  // Convert partition to subset of {1,...,groundSetSize}
  function partitionToSubset(partition, numParticles, groundSetSize) {
    const m = groundSetSize;
    const h = m - numParticles;
    if (h <= 0) {
      const s = []; for (let i = 1; i <= m; i++) s.push(i); return s;
    }
    const lam = partition || [];
    const lamRev = [...lam].reverse();
    while (lamRev.length < h) lamRev.unshift(0);
    const holePositions = new Set();
    for (let j = 1; j <= h; j++) {
      const u = lamRev[j - 1] + j;
      if (u >= 1 && u <= m) holePositions.add(u);
    }
    const subset = [];
    for (let pos = 1; pos <= m; pos++) {
      if (!holePositions.has(pos)) subset.push(pos);
    }
    return subset;
  }

  // Get number of particles on diagonal idx for diamond of size n
  function getParticleCount(idx, n) {
    const k = Math.floor((idx + 1) / 2);
    return (idx % 2 === 0) ? (n - k) : (n - k + 1);
  }

  // ============ Partition ↔ Domino conversion ============
  // Ported directly from the working RSK simulation (2025-12-04-RSK-sampling)

  function partitionsToDominoes(partSeq, n) {
    if (n === 0) return [];

    // Step 1: Generate lattice points at half-integer coords (cell centers)
    const latticePoints = [];
    const geomDiagonals = {};

    for (let hx = -n - 0.5; hx <= n + 0.5; hx += 1) {
      for (let hy = -n - 0.5; hy <= n + 0.5; hy += 1) {
        if (Math.abs(hx % 1) !== 0.5 || Math.abs(hy % 1) !== 0.5) continue;
        if (Math.abs(hx) + Math.abs(hy) > n + 0.5) continue;
        const diag = Math.round(hx + hy);
        const p = { hx, hy, diag, inSubset: false };
        latticePoints.push(p);
        if (!geomDiagonals[diag]) geomDiagonals[diag] = [];
        geomDiagonals[diag].push(p);
      }
    }

    // Sort each diagonal and assign positions
    for (const d in geomDiagonals) {
      geomDiagonals[d].sort((a, b) => (a.hx - a.hy) - (b.hx - b.hy));
      geomDiagonals[d].forEach((p, i) => { p.posInDiag = i + 1; });
    }

    // Step 2: Assign particle/hole from partition sequence
    const diagKeys = Object.keys(geomDiagonals).map(Number).sort((a, b) => a - b);
    for (let idx = 0; idx < partSeq.length && idx < diagKeys.length; idx++) {
      const d = diagKeys[idx];
      const cells = geomDiagonals[d];
      const numP = getParticleCount(idx, n);
      const subset = new Set(partitionToSubset(partSeq[idx], numP, cells.length));
      cells.forEach(p => { p.inSubset = subset.has(p.posInDiag); });
    }

    // Step 3: Build lookup for neighbor finding (integer key from half-integer coords)
    function lkey(hx, hy) {
      const ix = Math.round(hx * 2) + 2 * n + 1;
      const iy = Math.round(hy * 2) + 2 * n + 1;
      return ix * (4 * n + 3) + iy;
    }
    const pointLookup = new Map();
    for (const p of latticePoints) pointLookup.set(lkey(p.hx, p.hy), p);

    function getNeighbors(p) {
      const nb = [];
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const q = pointLookup.get(lkey(p.hx + dx, p.hy + dy));
        if (q) nb.push(q);
      }
      return nb;
    }

    // Step 4: Match particles (bottom-left first, exactly as RSK simulation)
    const particles = latticePoints.filter(p => p.inSubset);
    particles.sort((a, b) => {
      const sa = a.hx + a.hy, sb = b.hx + b.hy;
      if (sa !== sb) return sa - sb;
      return (a.hx - a.hy) - (b.hx - b.hy);
    });
    const matchedP = new Set();
    const particleDominoes = [];
    for (const p of particles) {
      const pk = lkey(p.hx, p.hy);
      if (matchedP.has(pk)) continue;
      const nbs = getNeighbors(p).filter(nb => nb.inSubset && !matchedP.has(lkey(nb.hx, nb.hy)));
      if (nbs.length === 0) continue;
      nbs.sort((a, b) => {
        const sa = a.hx + a.hy, sb = b.hx + b.hy;
        if (sa !== sb) return sa - sb;
        return (a.hx - a.hy) - (b.hx - b.hy);
      });
      const nb = nbs[0];
      matchedP.add(pk);
      matchedP.add(lkey(nb.hx, nb.hy));
      particleDominoes.push({ p1: p, p2: nb });
    }

    // Step 5: Match holes (top-right first)
    const holes = latticePoints.filter(p => !p.inSubset);
    holes.sort((a, b) => {
      const sa = a.hx + a.hy, sb = b.hx + b.hy;
      if (sa !== sb) return sb - sa;
      return (b.hx - b.hy) - (a.hx - a.hy);
    });
    const matchedH = new Set();
    const holeDominoes = [];
    for (const p of holes) {
      const pk = lkey(p.hx, p.hy);
      if (matchedH.has(pk)) continue;
      const nbs = getNeighbors(p).filter(nb => !nb.inSubset && !matchedH.has(lkey(nb.hx, nb.hy)));
      if (nbs.length === 0) continue;
      nbs.sort((a, b) => {
        const sa = a.hx + a.hy, sb = b.hx + b.hy;
        if (sa !== sb) return sb - sa;
        return (b.hx - b.hy) - (a.hx - a.hy);
      });
      const nb = nbs[0];
      matchedH.add(pk);
      matchedH.add(lkey(nb.hx, nb.hy));
      holeDominoes.push({ p1: p, p2: nb });
    }

    // Step 6: Convert to {x, y, type} format for the shuffling renderer
    const result = [];
    for (const d of particleDominoes) {
      const isHoriz = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
      // Cell coords = half-integer - 0.5
      const cx1 = d.p1.hx - 0.5, cy1 = d.p1.hy - 0.5;
      const cx2 = d.p2.hx - 0.5, cy2 = d.p2.hy - 0.5;
      const minX = Math.min(cx1, cx2), minY = Math.min(cy1, cy2);
      result.push({ x: minX, y: minY, type: isHoriz ? 'S' : 'W' });
    }
    for (const d of holeDominoes) {
      const isHoriz = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
      const cx1 = d.p1.hx - 0.5, cy1 = d.p1.hy - 0.5;
      const cx2 = d.p2.hx - 0.5, cy2 = d.p2.hy - 0.5;
      const minX = Math.min(cx1, cx2), minY = Math.min(cy1, cy2);
      result.push({ x: minX, y: minY, type: isHoriz ? 'N' : 'E' });
    }
    return result;
  }

  // ============ Growth diagram sampling ============

  // Sample A_n from scratch using full growth diagram
  function sampleGrowthDiagramFull(n, q) {
    if (n === 0) { dominoes = []; partSeq = []; diagCurr = []; diagPrev = []; return; }

    let prevRow = new Array(n + 1).fill(null).map(() => []);
    let currRow = new Array(n + 1).fill(null).map(() => []);
    const boundaryA = new Array(n + 1).fill(null).map(() => []);
    const boundaryB = new Array(n).fill(null).map(() => []);

    // Also track the last two anti-diagonals for future incremental steps
    // Anti-diagonal at level t: cells (i,j) with i+j = t
    let lastDiag = [[]]; // level 1: just boundary
    let prevDiag = [[]]; // level 0

    for (let i = 1; i <= n; i++) {
      const rowLen = n + 1 - i;
      for (let j = 1; j <= rowLen; j++) {
        const p = 0.5; // uniform: xi*yj/(1+xi*yj) = 1/2
        const bit = (Math.random() < p) ? 1 : 0;
        stepProb *= (bit === 1) ? p : (1 - p);
        const label = (n <= 15) ? `(i=${i},j=${j})` : null;
        currRow[j] = sampleVHq(prevRow[j], currRow[j-1], prevRow[j-1], bit, q, label);
      }
      boundaryA[i] = currRow[rowLen];
      if (i < n) boundaryB[i] = [...currRow[n - i]];

      [prevRow, currRow] = [currRow, prevRow];
      for (let j = 0; j <= n; j++) currRow[j] = [];
    }

    // Save anti-diagonals for incremental extension
    // Level n+1: cells (i, n+1-i) for i=1..n → these are boundaryA[i]
    diagCurr = [[]]; // index 0 = boundary
    for (let i = 1; i <= n; i++) diagCurr.push(boundaryA[i]);
    diagCurr.push([]); // index n+1 = boundary

    // Level n: cells (i, n-i) for i=1..n-1 → these are boundaryB[i]
    diagPrev = [[]];
    for (let i = 1; i < n; i++) diagPrev.push(boundaryB[i]);
    diagPrev.push([]);

    // Reconstruct partition sequence
    partSeq = [[]];
    for (let i = n; i >= 1; i--) {
      partSeq.push(boundaryA[i]);
      if (i > 1) partSeq.push(boundaryB[i - 1]);
    }
    partSeq.push([]);

    dominoes = partitionsToDominoes(partSeq, n);
    console.log('[v4] sampleGrowthDiagramFull n='+n+' q='+q+' dominoes='+dominoes.length+' expected='+n*(n+1));
    // Check for non-integer coordinates (would cause rendering bugs)
    const bad = dominoes.filter(d => d.x !== Math.round(d.x) || d.y !== Math.round(d.y));
    if (bad.length > 0) console.error('[v4] NON-INTEGER coords!', bad.slice(0,3));
    if (n <= 3) dominoes.forEach(d => console.log('[v4]  '+d.type+' at ('+d.x+','+d.y+')'));
  }

  // Extend growth diagram by one step: A_n → A_{n+1}
  // Uses diagCurr (level n+1) and diagPrev (level n) to compute level n+2
  // Per-cell probability tracking for creation reveals
  let cellProbs = []; // probability of each cell's choices

  function growthDiagramStep(n, q) {
    // n is the NEW size (currentN + 1)
    appendLog(`── Step n=${n-1} → ${n}, q=${q.toFixed(3)} ──`);

    const newDiag = [[]];
    cellProbs = [];
    const cellLogs = []; // per-cell log messages for deferred reveal

    for (let i = 1; i <= n; i++) {
      const lam = (i - 1 < diagCurr.length) ? diagCurr[i - 1] : [];
      const nuBar = (i < diagCurr.length) ? diagCurr[i] : [];
      const kap = (i - 1 < diagPrev.length) ? diagPrev[i - 1] : [];

      const p = 0.5;
      const bit = (Math.random() < p) ? 1 : 0;
      const prevStepProb = stepProb;
      stepProb *= (bit === 1) ? p : (1 - p);

      // Capture per-cell log
      const label = (n <= 20) ? `cell(${i},${n+1-i})` : null;
      cellLogBuffer = [];
      const nu = sampleVHq(lam, nuBar, kap, bit, q, label);
      const cellLog = cellLogBuffer;
      cellLogBuffer = null;

      const cellP = stepProb / prevStepProb; // this cell's contribution (approx)
      cellProbs.push(cellP);
      cellLogs.push(cellLog);

      newDiag.push(nu);
    }
    newDiag.push([]);

    // Store cell logs for incremental reveal during creation phase
    creationLogQueue = cellLogs;

    // Update: new partition sequence interleaves old diagCurr entries with new entries
    // For A_n: partSeq has 2n+1 entries
    // Old A[i] = diagCurr[i] for i=1..n-1 become the B'[i] entries
    // New A'[i] = newDiag[i] for i=1..n become the A entries
    partSeq = [[]]; // boundary
    for (let i = n; i >= 1; i--) {
      partSeq.push(newDiag[i]); // A'[i]
      if (i > 1) partSeq.push(diagCurr[i - 1]); // old A[i-1] = new B'[i-1]
    }
    partSeq.push([]); // boundary

    // Shift diagonals
    diagPrev = diagCurr;
    diagCurr = newDiag;

    dominoes = partitionsToDominoes(partSeq, n);
  }

  // ============ Geometric shuffling (q=0) ============

  // Palette
  const palettes = window.ColorSchemes || [{ name: 'Default', colors: ['#FFCD00', '#228B22', '#0057B7', '#DC143C'] }];
  let paletteIndex = palettes.findIndex(p => p.name === 'Domino Default');
  if (paletteIndex === -1) paletteIndex = 0;

  const paletteSelect = document.getElementById('palette-select');
  palettes.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = p.name;
    if (i === paletteIndex) opt.selected = true;
    paletteSelect.appendChild(opt);
  });

  function getColors() { return palettes[paletteIndex].colors; }

  function inDiamond(x, y, n) {
    return Math.abs(x + 0.5) + Math.abs(y + 0.5) <= n;
  }

  function dominoCells(d) {
    if (d.type === 'N' || d.type === 'S') {
      return [{ x: d.x, y: d.y }, { x: d.x + 1, y: d.y }];
    } else {
      return [{ x: d.x, y: d.y }, { x: d.x, y: d.y + 1 }];
    }
  }

  function buildCellMap() {
    const map = new Map();
    dominoes.forEach((d, idx) => {
      dominoCells(d).forEach(c => map.set(`${c.x},${c.y}`, idx));
    });
    return map;
  }

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
        if (d00 === d10 && d01 === d11 && d00 !== d01) {
          if (dominoes[d00].type === 'N' && dominoes[d01].type === 'S') { bad.add(d00); bad.add(d01); }
        }
        if (d00 === d01 && d10 === d11 && d00 !== d10) {
          if (dominoes[d00].type === 'E' && dominoes[d10].type === 'W') { bad.add(d00); bad.add(d10); }
        }
      }
    }
    return bad;
  }

  function deleteBadDominoes(badSet) {
    dominoes = dominoes.filter((_, idx) => !badSet.has(idx));
  }

  function slideDominoes() {
    dominoes.forEach(d => {
      if (d.type === 'N') d.y += 1;
      else if (d.type === 'S') d.y -= 1;
      else if (d.type === 'E') d.x += 1;
      else if (d.type === 'W') d.x -= 1;
    });
  }

  function createDominoes(n) {
    const occupied = new Set();
    dominoes.forEach(d => {
      dominoCells(d).forEach(c => occupied.add(`${c.x},${c.y}`));
    });
    function isBlockEmpty(bx, by) {
      return !occupied.has(`${bx},${by}`) && !occupied.has(`${bx+1},${by}`) &&
             !occupied.has(`${bx},${by+1}`) && !occupied.has(`${bx+1},${by+1}`);
    }
    function fillBlock(bx, by, vertical) {
      if (vertical) {
        dominoes.push({ x: bx, y: by, type: 'W' });
        dominoes.push({ x: bx + 1, y: by, type: 'E' });
      } else {
        dominoes.push({ x: bx, y: by, type: 'S' });
        dominoes.push({ x: bx, y: by + 1, type: 'N' });
      }
      occupied.add(`${bx},${by}`); occupied.add(`${bx+1},${by}`);
      occupied.add(`${bx},${by+1}`); occupied.add(`${bx+1},${by+1}`);
    }
    for (let bx = -n; bx < n; bx++) {
      for (let by = -n; by < n; by++) {
        if (!inDiamond(bx, by, n) || !inDiamond(bx+1, by, n) ||
            !inDiamond(bx, by+1, n) || !inDiamond(bx+1, by+1, n)) continue;
        if (isBlockEmpty(bx, by)) {
          fillBlock(bx, by, Math.random() < 0.5);
        }
      }
    }
  }

  // ============ Step logic ============

  // Cached next tiling for q>0 granular mode: computed at start, revealed at creation phase
  let nextDominoes = null;

  function initN1() {
    clearLog();
    stepProb = 1;
    logStep('── Initialize A₁ ──');
    sampleGrowthDiagramFull(1, qParam);
    logStep(`\n  ⟹ P(this step) = ${stepProb.toExponential(4)}`);
    currentN = 1;
  }

  function shuffleStep() {
    if (currentN === 0) { saveState(); initN1(); return; }
    saveState();
    clearLog();
    stepProb = 1;
    // Always use growth diagram (works for all q, keeps diagram state consistent)
    currentN++;
    growthDiagramStep(currentN, qParam);
    logStep(`\n  ⟹ P(this step) = ${stepProb.toExponential(4)}`);
  }

  function granularStep() {
    if (currentN === 0) { saveState(); initN1(); phase = 'complete'; return; }
    saveState();

    if (phase === 'complete') {
      stepProb = 1;
      clearLog();
      // Pre-compute the next tiling via growth diagram (for all q)
      const savedDominoes = dominoes.map(d => ({...d}));
      growthDiagramStep(currentN + 1, qParam);
      nextDominoes = dominoes;
      dominoes = savedDominoes;
      logStep(`\n  ⟹ P(this step) = ${stepProb.toExponential(4)}`);
      badDominoes = findBadBlocks(currentN);
      phase = 'badblocks';
    } else if (phase === 'badblocks') {
      deleteBadDominoes(badDominoes);
      badDominoes = new Set();
      phase = 'deleted';
    } else if (phase === 'deleted') {
      slideDominoes();
      phase = 'slid';
    } else if (phase === 'slid') {
      currentN++;
      if (nextDominoes) {
        // Build cell→type map from the pre-computed new tiling
        const newCellType = new Map();
        nextDominoes.forEach(d => {
          dominoCells(d).forEach(c => newCellType.set(`${c.x},${c.y}`, d.type));
        });
        // Find empty 2×2 blocks and determine fill from new tiling
        const n = currentN;
        const occupied = new Set();
        dominoes.forEach(d => dominoCells(d).forEach(c => occupied.add(`${c.x},${c.y}`)));
        creationQueue = [];
        for (let bx = -n; bx < n; bx++) {
          for (let by = -n; by < n; by++) {
            if (!inDiamond(bx,by,n) || !inDiamond(bx+1,by,n) ||
                !inDiamond(bx,by+1,n) || !inDiamond(bx+1,by+1,n)) continue;
            if (occupied.has(`${bx},${by}`) || occupied.has(`${bx+1},${by}`) ||
                occupied.has(`${bx},${by+1}`) || occupied.has(`${bx+1},${by+1}`)) continue;
            // Look up orientation from new tiling's cell map
            const t = newCellType.get(`${bx},${by}`);
            const isVert = (t === 'W' || t === 'E');
            if (isVert) {
              creationQueue.push([
                { x: bx, y: by, type: 'W' },
                { x: bx + 1, y: by, type: 'E' }
              ]);
            } else {
              creationQueue.push([
                { x: bx, y: by, type: 'S' },
                { x: bx, y: by + 1, type: 'N' }
              ]);
            }
          }
        }
        nextDominoes = null;
        phase = 'creating';
      } else {
        createDominoes(currentN);
        phase = 'complete';
      }
    } else if (phase === 'creating') {
      // Place one 2×2 block per click
      if (creationQueue.length > 0) {
        const pair = creationQueue.shift();
        pair.forEach(d => dominoes.push(d));
        const orient = pair[0].type === 'W' ? 'vertical W+E' : 'horizontal S+N';
        appendLog(`  ▸ block (${pair[0].x},${pair[0].y}): ${orient}`);
      }
      // Also reveal next cell log
      if (creationLogQueue.length > 0) {
        const cellLog = creationLogQueue.shift();
        const cellIdx = cellProbs.length - creationLogQueue.length - 1;
        const cellP = cellProbs[cellIdx] || 1;
        cellLog.forEach(line => appendLog(line));
        appendLog(`  → P(this cell) = ${cellP.toExponential(3)}`);
      }
      if (creationQueue.length === 0 && creationLogQueue.length === 0) {
        phase = 'complete';
      }
    }
  }

  function doStep() {
    if (currentN >= targetN && phase === 'complete') return;
    if (granular) granularStep(); else shuffleStep();
    updateUI(); render();
  }

  function reset() {
    currentN = 0; dominoes = []; phase = 'complete';
    diagCurr = []; diagPrev = []; partSeq = []; nextDominoes = null;
    creationQueue = []; creationLogQueue = []; cellProbs = [];
    history = [];
    clearLog();
    stopAuto(); updateUI(); render();
  }

  function instant() {
    stopAuto();
    currentN = 0; dominoes = []; phase = 'complete';
    nextDominoes = null;
    clearLog();
    logStep(`Generating A_${targetN} with q=${qParam.toFixed(3)}...`);
    sampleGrowthDiagramFull(targetN, qParam);
    currentN = targetN;
    updateUI(); render();
  }

  function stepBack() {
    stopAuto();
    restoreState();
  }

  function updateUI() {
    let phaseText = '';
    if (granular && phase !== 'complete') {
      const names = { 'badblocks': 'bad blocks found', 'deleted': 'after deletion', 'slid': 'after sliding', 'creating': `filling ${creationQueue.length} blocks left` };
      phaseText = ` [${names[phase]}]`;
    }
    const expected = currentN * (currentN + 1);
    const actual = dominoes.length;
    const countInfo = (actual !== expected && currentN > 0 && phase === 'complete') ? ` ⚠️${actual}/${expected} dominos` : ` (${actual} dominos)`;
    document.getElementById('step-indicator').textContent = `n=${currentN}${phaseText}${countInfo}`;
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

  // ============ Rendering ============

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
    const typeColor = { 'N': 3, 'S': 1, 'E': 2, 'W': 0 };

    dominoes.forEach((d, idx) => {
      const isHoriz = (d.type === 'N' || d.type === 'S');
      const w = isHoriz ? 2 * cellSize : cellSize;
      const h = isHoriz ? cellSize : 2 * cellSize;
      const px = d.x * cellSize;
      const py = -(d.y + (isHoriz ? 1 : 2)) * cellSize;
      if (idx < 5 && currentN <= 3) console.log('[v4] render', d.type, 'at('+d.x+','+d.y+') px='+px.toFixed(1)+' py='+py.toFixed(1)+' w='+w.toFixed(1)+' h='+h.toFixed(1));

      if (showHoles) {
        const isHole = (d.type === 'N' || d.type === 'E');
        const radius = cellSize * 0.35;
        let centers;
        if (isHoriz) {
          centers = [
            { x: px + cellSize / 2, y: py + cellSize / 2 },
            { x: px + cellSize * 1.5, y: py + cellSize / 2 }
          ];
        } else {
          centers = [
            { x: px + cellSize / 2, y: py + cellSize / 2 },
            { x: px + cellSize / 2, y: py + cellSize * 1.5 }
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
            ctx.fillStyle = '#000';
            ctx.fill();
          }
        });
      } else {
        if (phase === 'badblocks' && badDominoes.has(idx)) {
          ctx.fillStyle = '#FF0000';
        } else {
          ctx.fillStyle = colors[typeColor[d.type]];
        }
        ctx.fillRect(px, py, w, h);
        if (borderWidth > 0.01) {
          ctx.strokeStyle = '#000';
          ctx.lineWidth = Math.max(0.5, cellSize * borderWidth / 10);
          ctx.strokeRect(px, py, w, h);
        }
      }
    });

    ctx.restore();

    // Show step probability on canvas
    if (stepProb < 1 && stepProb > 0) {
      const logP = Math.log10(stepProb);
      ctx.save();
      ctx.font = `${Math.max(11, Math.min(14, rect.width / 50))}px monospace`;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.textAlign = 'left';
      ctx.fillText(`P(step) = ${stepProb.toExponential(3)}  (log₁₀ = ${logP.toFixed(1)})`, 8, rect.height - 8);
      ctx.restore();
    }
  }

  // ============ Event listeners ============

  function syncQ(val) {
    qParam = Math.min(0.999, Math.max(0, val));
    document.getElementById('q-input').value = qParam.toFixed(3);
    document.getElementById('q-slider').value = Math.round(qParam * 1000);
    document.getElementById('q-display').textContent = `q=${qParam.toFixed(3)}`;
  }

  document.getElementById('q-input').addEventListener('change', e => syncQ(parseFloat(e.target.value) || 0));
  document.getElementById('q-slider').addEventListener('input', e => syncQ(parseInt(e.target.value) / 1000));
  document.getElementById('back-btn').addEventListener('click', stepBack);
  document.getElementById('step-btn').addEventListener('click', doStep);
  document.getElementById('reset-btn').addEventListener('click', reset);
  document.getElementById('auto-btn').addEventListener('click', () => autoInterval ? stopAuto() : startAuto());
  document.getElementById('instant-btn').addEventListener('click', instant);
  document.getElementById('n-input').addEventListener('change', e => { targetN = parseInt(e.target.value) || 10; updateUI(); });
  document.getElementById('palette-select').addEventListener('change', e => { paletteIndex = parseInt(e.target.value); render(); });
  document.getElementById('rotate-cb').addEventListener('change', e => { rotated = e.target.checked; render(); });
  document.getElementById('granular-cb').addEventListener('change', e => { granular = e.target.checked; updateUI(); });
  document.getElementById('holes-cb').addEventListener('change', e => { showHoles = e.target.checked; render(); });
  document.getElementById('border-slider').addEventListener('input', e => { borderWidth = parseInt(e.target.value) / 100; render(); });

  window.addEventListener('resize', render);
  targetN = parseInt(document.getElementById('n-input').value) || 10;
  render();
})();
</script>

<details style="margin-top: 15px;">
  <summary style="cursor: pointer; font-weight: bold;">About the Algorithm</summary>
  <div style="padding: 10px;">

<h4>Classical EKLP Shuffling (q = 0)</h4>

<p><strong>Forward shuffling</strong> builds random tilings of Aztec diamonds via the map A<sub>n</sub> → A<sub>n+1</sub> in three phases:</p>
<ol>
  <li><strong>Delete bad blocks:</strong> Find colliding domino pairs — N-S pairs (N below, S above) and E-W pairs (E left, W right) — that form 2×2 blocks. These would collide during sliding, so remove them.</li>
  <li><strong>Slide:</strong> Each surviving domino slides one unit in its natural direction: N↑, S↓, E→, W←. This embeds the A<sub>n</sub> tiling into the larger A<sub>n+1</sub> diamond.</li>
  <li><strong>Fill holes:</strong> After sliding, empty 2×2 blocks appear (both from deletion gaps and the expanded boundary). Fill each with a random domino pair: either two horizontal (N top + S bottom) or two vertical (W left + E right), each with probability ½.</li>
</ol>
<p>Enable <strong>Granular steps</strong> to watch each phase separately. Bad blocks are highlighted in red before deletion.</p>

<hr style="margin: 15px 0;">

<h4>q-Whittaker Deformation (q &gt; 0)</h4>

<p>The q-deformation modifies <strong>Step 3 only</strong>. Instead of independent coin flips, the empty blocks within each diagonal "trench" are filled using a <strong>correlated probability cascade</strong>.</p>

<p><strong>Physical intuition:</strong> The parameter q acts as <em>friction</em> or <em>stickiness</em> during the creation step:</p>
<ul>
  <li><strong>q = 0:</strong> No friction. Each block filled independently. Gives the uniform measure on tilings.</li>
  <li><strong>0 &lt; q &lt; 1:</strong> Sticky shuffling. Blocks in the same trench are correlated. Dominoes may "snag" before sliding to the end of a trench, creating domain walls. This produces the q-Whittaker measure.</li>
  <li><strong>q → 1:</strong> Maximum stickiness. The cascade almost never stops early. The "liquid" (disordered) region of the Aztec diamond shrinks, and the frozen corners expand to fill everything.</li>
</ul>

<p><strong>Implementation:</strong> For q &gt; 0, this simulation uses the equivalent <strong>RSK growth diagram</strong> algorithm with the q-cascade from <a href="https://arxiv.org/abs/1504.00666">arXiv:1504.00666</a> (Matveev–Petrov). The growth diagram computes the same distribution as q-deformed shuffling but processes the randomness through partition-valued dynamics. The output is converted to domino coordinates for display.</p>

<p><strong>The cascade within each trench:</strong> For a trench of L consecutive empty blocks, all blocks receive one orientation except exactly one — the <em>domain wall</em> — which receives the opposite. The domain wall position is chosen by a sequential random process:</p>
<ol>
  <li>At the first block, stop with probability f<sub>k</sub> = (1 − q<sup>gap</sup>) / (1 − q<sup>denom</sup>)</li>
  <li>At each subsequent block s, stop with probability g<sub>s</sub> = 1 − q<sup>gap<sub>s</sub></sup></li>
  <li>If the cascade reaches the end without stopping, the last block is the domain wall</li>
</ol>
<p>The "gap" values encode local geometric constraints from the surrounding dominos.</p>

<hr style="margin: 15px 0;">

<h4>What to observe</h4>
<ul>
  <li>At q = 0: the <strong>arctic circle</strong> — a sharp boundary between the frozen corners and the disordered center.</li>
  <li>At q &gt; 0: the disordered region <strong>shrinks</strong>. The arctic boundary moves inward. Try q = 0.3, 0.5, 0.8 to see the effect.</li>
  <li>At q → 1: the tiling approaches a <strong>fully frozen</strong> state (one of the four "brick-wall" patterns).</li>
  <li>Toggle <strong>Particles</strong> to see the particle/hole representation (filled circles = S,W dominoes; open circles = N,E dominoes).</li>
</ul>

<h4>References</h4>
<ul>
  <li><a href="https://arxiv.org/abs/math/9201305">arXiv:math/9201305</a> — Elkies, Kuperberg, Larsen, Propp (EKLP shuffling)</li>
  <li><a href="https://arxiv.org/abs/1504.00666">arXiv:1504.00666</a> — Matveev, Petrov (q-randomized RSK and q-Whittaker dynamics)</li>
  <li><a href="https://arxiv.org/abs/1407.3764">arXiv:1407.3764</a> — Betea, Boutillier, Bouttier, Chapuy, Corteel, Vuletić (Schur process sampling)</li>
  <li><a href="/simulations/2025-12-04-rsk-sampling/">q-RSK Sampling</a> — companion simulation with full growth diagram visualization</li>
</ul>

  </div>
</details>
