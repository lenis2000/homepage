---
title: Aztec boundary curve via shuffling vs Bernoulli q-PushTASEP
model: TASEPs
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/TASEP-like-systems/2026-05-14-q-pushtasep-arctic.md'
    txt: 'This simulation is interactive, written in JavaScript'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/TASEP-like-systems/2026-05-14-q-pushtasep-arctic.cpp'
    txt: 'C++ source for Bernoulli q-PushTASEP boundary sampler, compiled to WebAssembly'
a11y-description: "Boundary curve B_m = lambda'(m)_1 of the t-deformed Aztec diamond, sampled in two ways: (a) via the q-RSK shuffling cascade (existing simulation page), then reading lambda'(m)_1 off each diagonal slice; (b) directly via the Matveev-Petrov Bernoulli q-PushTASEP run for n time steps, reading B_m = R_m(n+1-m) off the space-time anti-diagonal. The two curves should coincide in distribution."
---

<style>
  .arctic-cell {
    display: flex; flex-direction: column; align-items: stretch;
  }
  .arctic-cell h3 {
    margin: 0 0 6px 0; font-size: 15px; font-weight: 600;
  }
  .arctic-canvas-wrap {
    position: relative; width: 100%; aspect-ratio: 1 / 1;
    border: 1px solid #ccc; background-color: #fafafa;
  }
  .arctic-canvas-wrap canvas {
    width: 100%; height: 100%; display: block; image-rendering: auto;
  }
  .arctic-meta {
    font-family: monospace; font-size: 12px; color: #444;
    margin-top: 6px; min-height: 1.4em;
  }
  .controls-row {
    display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;
  }
  .controls-row label {
    display: flex; flex-direction: column; font-size: 12px; color: #555;
  }
  .controls-row input[type="number"], .controls-row select {
    width: 110px; padding: 4px 6px; font-family: monospace;
  }
  #arctic-status {
    margin-top: 6px; font-family: monospace; font-size: 12px;
    color: #1976d2; min-height: 1.4em;
  }
  #arctic-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px;
  }
  @media (max-width: 800px) {
    #arctic-grid { grid-template-columns: 1fr; }
  }
  #boundary-wrap {
    width: 100%; aspect-ratio: 2.4 / 1;
    border: 1px solid #ccc; background-color: #fafafa;
  }
  #boundary-wrap canvas { width: 100%; height: 100%; display: block; }
  .math-description {
    margin: 8px 0 16px 0;
    padding: 10px 14px;
    border: 1px solid #d0d7e4;
    border-radius: 4px;
    background-color: #fbfcfe;
  }
  .math-description summary {
    cursor: pointer; font-weight: 600; padding: 2px 0;
  }
  .legend-row {
    margin-top: 8px; font-family: monospace; font-size: 12px;
    display: flex; gap: 18px; flex-wrap: wrap;
  }
  .legend-row .key {
    display: inline-block; width: 12px; height: 12px;
    margin-right: 5px; vertical-align: middle;
  }
</style>

<details class="math-description" open>
<summary>Setup: boundary observable, Bernoulli $q$-PushTASEP, and the $\eta\leftrightarrow\lambda'$ matching</summary>
<div style="padding: 6px 0 0 0; line-height: 1.55;">

<p><b>Boundary observable.</b> For the $t$-deformed Aztec diamond of rank $n$, let $\lambda(m)$ denote the section partition at distance $m \in \{1,\ldots,n\}$ from the SW side. Both samplers produce the first-column length
$$B_m \;=\; \lambda(m)'_1 \;=\; \#\{i : \lambda(m)_i \ge 1\},$$
which is the variable controlling the KPZ-edge asymptotics of the AZTEC paper.</p>

<p><b>Sampler A — Bernoulli $q$-PushTASEP</b> (Matveev–Petrov §6.3, arXiv:1504.00666). State: $R_j(t) = \lambda_1^{(j)}(t)$ for $j=1,\ldots,N$, $N=n$, step IC $R_j(0) = 0$. Independent $V_j(t) \sim \mathrm{Bernoulli}\!\left(\tfrac{\alpha\beta}{1+\alpha\beta}\right)$. Let $\xi_j(t) \in \{0,1\}$ denote whether particle $j$ moves at time $t$; sequentially for $j=1,\ldots,N$,
$$
\xi_j(t) \;=\; V_j(t) \;\;\lor\;\; \mathbf{1}_{\{\xi_{j-1}(t)=1\}}\cdot \mathrm{Bernoulli}\!\left(q^{\,R_j(t-1) - R_{j-1}(t-1)}\right),
$$
with the push probability evaluated at the <em>old</em> gap (positions at time $t-1$, before any update of the current sweep). Then $R_j(t) = R_j(t-1) + \xi_j(t)$. By Matveev–Petrov, this is the projection of the $\widehat\beta$-row dynamics on the $q$-Whittaker process onto the rightmost particles. The boundary curve is the space-time anti-diagonal of one trajectory:
$$\boxed{\,B_m^{\mathrm{qpush}} \;=\; R_m(n+1-m), \qquad m=1,\ldots,n.\,}$$</p>

<p><b>Sampler B — $q$-RSK Aztec shuffler</b> (Matveev–Petrov §5). Growth-diagram cascade on the $n \times n$ staircase, Bernoulli inputs of intensity $\alpha\beta/(1+\alpha\beta)$, $q$-Whittaker VH bijection. The cascade returns partitions $\mathtt{parts}[d]$ at anti-diagonals $d=0,1,\ldots,2n$. In Matveev–Petrov's convention, the partition stored at $d=2m-1$ is the $q$-Whittaker level-$m$ partition $\eta^{(m)}$; Macdonald duality identifies this with the <em>conjugate</em> of the AZTEC paper's section partition,
$$\mathtt{parts}[2m-1] \;=\; \eta^{(m)} \;=\; \lambda(m)'.$$
(Note: $\mathtt{parts}[d]$ is the $q$-RSK / $q$-Whittaker output, not the AZTEC draft's physical $(\lambda^k, \mu^k)$ chain. In the draft's notation, the corresponding section is the transposed/reindexed one whose marginal carries $m$ of the $b$-parameters and $n+1-m$ of the $a$-parameters.)</p>

<p>Consequently the AZTEC observable $\lambda(m)'_1$ equals the <em>largest part</em> $\eta^{(m)}_1$ of the stored partition, not its number of parts:
$$\boxed{\,B_m^{\mathrm{shuf}} \;=\; \eta^{(m)}_1 \;=\; \lambda(m)'_1.\,}$$
At $q=0$, the slip is hard to see because Schur transposition symmetries in the homogeneous symmetric setup partially mask it (the Schur measure is invariant under $\lambda \leftrightarrow \lambda'$ jointly with the swap of the two rectangle directions). For $q&gt;0$, $\#\eta^{(m)}$ and $\eta^{(m)}_1$ are genuinely different observables of the $q$-Whittaker measure and respond to $q$ in opposite directions.</p>

<p><b>Equality of distributions.</b> Both $B_m^{\mathrm{qpush}}$ and $B_m^{\mathrm{shuf}}$ are functionals of the Macdonald measure at parameters $(q, t=0)$ with $(n+1-m)$ $\alpha$-variables on the $P$-side and $m$ $\beta$-variables on the $Q$-side; they have identical one-point distributions for every $(n, m, q, \alpha, \beta)$.</p>

</div>
</details>

<div class="controls-row">
  <label>n
    <input type="number" id="arctic-n" value="80" min="20" max="600" step="10">
  </label>
  <label>q
    <input type="number" id="arctic-q" value="0.9" min="0" max="0.999" step="0.05">
  </label>
  <label>α
    <input type="number" id="arctic-alpha" value="1.0" min="0.01" max="20" step="0.1">
  </label>
  <label>β
    <input type="number" id="arctic-beta" value="1.0" min="0.01" max="20" step="0.1">
  </label>
  <label>samples
    <input type="number" id="arctic-samples" value="1" min="1" max="50" step="1" title="Average over this many runs">
  </label>
  <button id="arctic-run" class="btn btn-primary" style="height: 36px; align-self: end;">Sample both</button>
</div>

<div id="arctic-status">Click "Sample both" to start.</div>

<h3 style="margin-top: 14px;">Boundary curves $B_m$ — combined overlay</h3>
<div id="boundary-wrap"><canvas id="arctic-canvas-boundary"></canvas></div>
<div class="legend-row">
  <span><span class="key" style="background:#43a047"></span>Shuffler: $\lambda'(m)_1$ = largest part of $\texttt{parts}[2m-1]$</span>
  <span><span class="key" style="background:#e65100"></span>q-PushTASEP: $B_m=R_m(n+1-m)$</span>
  <span id="arctic-meta-boundary"></span>
</div>

<h3 style="margin-top: 18px;">Auxiliary: one sample of the partition / trajectory pictures</h3>
<div id="arctic-grid">
  <div class="arctic-cell">
    <h3>q-RSK Aztec: Maya particles on diagonals</h3>
    <div class="arctic-canvas-wrap"><canvas id="arctic-canvas-rsk"></canvas></div>
    <div class="arctic-meta" id="arctic-meta-rsk">—</div>
  </div>
  <div class="arctic-cell">
    <h3>q-PushTASEP: $R_j(t)$ trajectories</h3>
    <div class="arctic-canvas-wrap"><canvas id="arctic-canvas-qpush"></canvas></div>
    <div class="arctic-meta" id="arctic-meta-qpush">—</div>
  </div>
</div>

<script src="/js/2025-12-04-RSK-sampling.js"></script>
<script src="/js/2026-05-14-q-pushtasep-arctic.js"></script>
<script>
(async function() {
  const elN     = document.getElementById('arctic-n');
  const elQ     = document.getElementById('arctic-q');
  const elA     = document.getElementById('arctic-alpha');
  const elB     = document.getElementById('arctic-beta');
  const elSamp  = document.getElementById('arctic-samples');
  const elBtn   = document.getElementById('arctic-run');
  const elStat  = document.getElementById('arctic-status');
  const elMetaR = document.getElementById('arctic-meta-rsk');
  const elMetaQ = document.getElementById('arctic-meta-qpush');
  const elMetaB = document.getElementById('arctic-meta-boundary');
  const canRsk  = document.getElementById('arctic-canvas-rsk');
  const canQp   = document.getElementById('arctic-canvas-qpush');
  const canBdy  = document.getElementById('arctic-canvas-boundary');

  function log(msg) { elStat.textContent = msg; console.log('[arctic]', msg); }

  log('Loading WebAssembly modules ...');
  const [rskMod, qpushMod] = await Promise.all([
    createRSKModule(),
    createQPushModule(),
  ]);
  log('Modules loaded. Ready.');

  const sampleAztecRSK  = rskMod.cwrap('sampleAztecRSK', 'number',
                                       ['number', 'string', 'string', 'number'], {async: true});
  const freeStringRSK   = rskMod.cwrap('freeString', null, ['number']);
  const sampleQPushTraj = qpushMod.cwrap('sampleQPushTrajectory', 'number',
                                         ['number', 'number', 'number', 'number'], {async: true});
  const freeStringQpush = qpushMod.cwrap('freeString', null, ['number']);

  // ---------------------------------------------------------------------
  // Canvas helpers
  // ---------------------------------------------------------------------
  function fitCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width  = Math.round(r.width  * dpr);
    canvas.height = Math.round(r.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  function plotScatter(canvas, points, tRange, xRange, label) {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);
    const PAD = 16;
    const Wp = w - 2 * PAD, Hp = h - 2 * PAD;
    const sx = (tt) => PAD + ((tt - tRange[0]) / (tRange[1] - tRange[0])) * Wp;
    const sy = (xx) => PAD + Hp - ((xx - xRange[0]) / (xRange[1] - xRange[0])) * Hp;
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.strokeRect(PAD, PAD, Wp, Hp);
    const psize = Math.max(1, Math.min(3, Math.round(Math.min(Wp, Hp) / Math.max(40, Math.sqrt(points.length)))));
    ctx.fillStyle = 'rgba(20, 50, 120, 0.6)';
    for (const p of points) {
      const px = sx(p.t), py = sy(p.x);
      if (px >= PAD && px <= w - PAD && py >= PAD && py <= h - PAD) {
        ctx.fillRect(px - psize / 2, py - psize / 2, psize, psize);
      }
    }
    ctx.fillStyle = '#333';
    ctx.font = '12px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(label || '', PAD + 2, PAD + 2);
  }

  // q-PushTASEP particle trajectories: one polyline per particle index j
  // through the (t, x_j(t)) plane, with x_j(t) = (j+1) - R[t][j] (Maya
  // convention so the step-IC corner sits at the top-left and particles
  // drift down-right as they jump).
  function plotTrajectories(canvas, R, tRange, xRange, label) {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);
    const PAD = 16;
    const Wp = w - 2 * PAD, Hp = h - 2 * PAD;
    const sx = (tt) => PAD + ((tt - tRange[0]) / (tRange[1] - tRange[0])) * Wp;
    const sy = (xx) => PAD + Hp - ((xx - xRange[0]) / (xRange[1] - xRange[0])) * Hp;
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.strokeRect(PAD, PAD, Wp, Hp);

    const T = R.length;
    const N = (T > 0) ? R[0].length : 0;
    // One slightly translucent dark-blue line per particle. With n in
    // 50–300 the lines overlap to form a clear staircase shape.
    ctx.strokeStyle = 'rgba(15, 40, 100, 0.55)';
    ctx.lineWidth = 1;
    for (let j = 0; j < N; j++) {
      ctx.beginPath();
      for (let t = 0; t < T; t++) {
        const xpos = (j + 1) - R[t][j];
        const px = sx(t), py = sy(xpos);
        if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#333';
    ctx.font = '12px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(label || '', PAD + 2, PAD + 2);
  }

  // Generalized boundary plot: takes an array of {Bshuf, Bqp, shufColor, qpColor, q}.
  function plotBoundaryMulti(canvas, curves, n) {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);
    const PAD_L = 40, PAD_R = 16, PAD_T = 18, PAD_B = 26;
    const Wp = w - PAD_L - PAD_R, Hp = h - PAD_T - PAD_B;

    let ymin = Infinity, ymax = -Infinity;
    for (const c of curves) {
      for (const v of c.Bshuf) { if (v < ymin) ymin = v; if (v > ymax) ymax = v; }
      for (const v of c.Bqp)   { if (v < ymin) ymin = v; if (v > ymax) ymax = v; }
    }
    if (!isFinite(ymin)) { ymin = 0; ymax = 1; }
    const ypad = Math.max(1, (ymax - ymin) * 0.06);
    ymin -= ypad; ymax += ypad;

    const sx = (m) => PAD_L + ((m - 1) / Math.max(1, n - 1)) * Wp;
    const sy = (v) => PAD_T + Hp - ((v - ymin) / (ymax - ymin)) * Hp;

    // axes
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
    ctx.strokeRect(PAD_L, PAD_T, Wp, Hp);
    ctx.fillStyle = '#666'; ctx.font = '11px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('m (section index)', PAD_L + Wp / 2, h - PAD_B + 6);
    ctx.save();
    ctx.translate(10, PAD_T + Hp / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top';
    ctx.fillText("B_m = λ'(m)_1", 0, 0);
    ctx.restore();
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(ymin).toString(), PAD_L - 4, PAD_T + Hp);
    ctx.fillText(Math.round(ymax).toString(), PAD_L - 4, PAD_T);

    function line(arr, color, dash) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      for (let m = 1; m <= n; m++) {
        const v = arr[m - 1];
        if (!isFinite(v)) continue;
        const px = sx(m), py = sy(v);
        if (m === 1) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Draw orange (qpush) first, then blue/green on top.
    for (const c of curves) line(c.Bqp, c.qpColor, [4, 3]);
    for (const c of curves) line(c.Bshuf, c.shufColor, []);
    for (const c of curves) {
      if (c.BshufAlt && c.shufAltColor) line(c.BshufAlt, c.shufAltColor, [1, 3]);
    }

    // In-canvas legend: small color swatches with q labels in the upper right.
    if (curves.length > 0) {
      const hasAlt = curves[0].BshufAlt && curves[0].shufAltColor;
      const lx = w - PAD_R - 145;
      let ly = PAD_T + 4;
      ctx.font = '11px monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      for (const c of curves) {
        // blue (shuf count) — solid
        ctx.fillStyle = c.shufColor;
        ctx.fillRect(lx, ly + 2, 10, 3);
        // orange (qpush) — dashed
        ctx.fillStyle = c.qpColor;
        ctx.fillRect(lx, ly + 8, 10, 3);
        if (hasAlt) {
          // green (shuf largest) — dotted
          ctx.fillStyle = c.shufAltColor;
          ctx.fillRect(lx, ly + 14, 10, 3);
        }
        ctx.fillStyle = '#333';
        ctx.fillText(`q=${c.q}`, lx + 16, ly);
        ly += hasAlt ? 24 : 18;
      }
    }
  }

  // Back-compat single-pair wrapper. Uses green for the shuffler curve to
  // match the q-sweep convention (green = canonical largest-part extraction;
  // blue is reserved for the diagnostic #parts extraction shown only in
  // the q-sweep view).
  function plotBoundary(canvas, Bshuf, Bqp, n) {
    plotBoundaryMulti(canvas, [{
      Bshuf, Bqp, shufColor: '#43a047', qpColor: '#e65100', q: ''
    }], n);
  }

  // ---------------------------------------------------------------------
  // Extract lambda'(m)_1 from q-RSK partition sequence given convention.
  //
  // The cpp returns 2n+1 partitions for d = 0..2n (some are empty at the ends).
  // ---------------------------------------------------------------------
  // B_m = lambda'(m)_1 = largest part of parts[2m-1] (the canonical extraction
  // identified by Macdonald duality: parts[d] stores eta = lambda', and
  // lambda'(m)_1 = eta_1).
  //
  // Sanity assertions: eta = lambda' lives in the rectangle (n+1-m)^m, so
  //   #rows(eta) <= m         (eta has at most m parts)
  //   eta_1     <= n+1-m      (each part is at most n+1-m)
  // Violations indicate the shuffler returned the wrong object or the
  // diagonal indexing is misaligned. We warn but still return a value.
  function extractBoundaryFromRSK(parts, n) {
    if (parts.length !== 2 * n + 1) {
      console.warn(`[arctic] parts.length=${parts.length}, expected ${2*n+1}`);
    }
    const B = new Array(n).fill(0);
    let nRowViolations = 0, nWidthViolations = 0;
    for (let m = 1; m <= n; m++) {
      const d = 2 * m - 1;
      const eta = (d >= 0 && d < parts.length) ? parts[d] : [];
      if (eta.length > m)            nRowViolations++;
      if ((eta[0] || 0) > n + 1 - m) nWidthViolations++;
      B[m - 1] = (eta.length > 0) ? eta[0] : 0;
    }
    if (nRowViolations + nWidthViolations > 0) {
      console.warn(`[arctic] rectangle violations: ${nRowViolations} row, ${nWidthViolations} width (out of ${n} sections)`);
    }
    return B;
  }

  // Convert RSK partition sequence to (t, x) scatter points (auxiliary picture)
  function rskPartitionsToPoints(parts) {
    const points = [];
    const D = parts.length;
    for (let d = 0; d < D; d++) {
      const lam = parts[d];
      const t = d * 0.5;  // map to time scale 0..n
      const L = lam.length;
      for (let i = 0; i < L + 2; i++) {
        const lam_i = (i < L) ? lam[i] : 0;
        const xpos = (i + 1) - lam_i; // sign convention matching qpush below
        points.push({ t: t, x: xpos });
      }
    }
    return points;
  }

  // Run both samplers at (n, alpha, beta, q). Returns Bshuf (canonical
  // largest-part extraction, = lambda'(m)_1) and Bqp.
  async function runOnce(n, alpha, beta, q) {
    const xJson = JSON.stringify(new Array(n).fill(alpha));
    const yJson = JSON.stringify(new Array(n).fill(beta));
    const ptrR = await sampleAztecRSK(n, xJson, yJson, q);
    const jsonR = rskMod.UTF8ToString(ptrR);
    freeStringRSK(ptrR);
    const parts = JSON.parse(jsonR);

    const ptrQ = await sampleQPushTraj(n, alpha, beta, q);
    const jsonQ = qpushMod.UTF8ToString(ptrQ);
    freeStringQpush(ptrQ);
    const qresp = JSON.parse(jsonQ);
    const Rtraj = qresp.R;
    const Bqp = qresp.B;

    const Bshuf = extractBoundaryFromRSK(parts, n);
    return { Bshuf, Bqp, parts, Rtraj };
  }

  async function runMany() {
    elBtn.disabled = true;
    try {
      const n     = parseInt(elN.value, 10);
      const q     = parseFloat(elQ.value);
      const alpha = parseFloat(elA.value);
      const beta  = parseFloat(elB.value);
      const M     = Math.max(1, parseInt(elSamp.value, 10) || 1);
      if (!(n >= 2 && n <= 1000)) { log('n must be in [2, 1000]'); elBtn.disabled = false; return; }

      const sumShuf = new Array(n).fill(0);
      const sumQp   = new Array(n).fill(0);

      let lastResult = null;
      const t0 = performance.now();
      for (let k = 0; k < M; k++) {
        log(`Sample ${k+1}/${M}: running RSK + q-PushTASEP (n=${n}, q=${q}) ...`);
        const r = await runOnce(n, alpha, beta, q);
        for (let m = 0; m < n; m++) {
          sumShuf[m] += r.Bshuf[m];
          sumQp[m]   += r.Bqp[m];
        }
        lastResult = r;
      }
      const meanShuf = sumShuf.map(v => v / M);
      const meanQp   = sumQp.map(v => v / M);

      // Differences for diagnostic readout
      let maxAbsDiff = 0, sumSq = 0;
      for (let m = 0; m < n; m++) {
        const d = meanShuf[m] - meanQp[m];
        if (Math.abs(d) > maxAbsDiff) maxAbsDiff = Math.abs(d);
        sumSq += d * d;
      }
      const rmsDiff = Math.sqrt(sumSq / n);

      // Endpoint diagnostics: print B_1 and B_n for both samplers vs theory.
      // For homogeneous alpha=beta=1, q-PushTASEP gives:
      //   E[B_1] = E[R_1(n)] = Binomial(n, p_vol) mean = n * alpha*beta/(1+alpha*beta).
      //   E[B_n] = E[R_n(1)] = 1 - (1 - p_vol)^n  (effectively 1 for moderate n).
      const p_vol = alpha * beta / (1 + alpha * beta);
      const theoryB1 = n * p_vol;
      const theoryBn = 1 - Math.pow(1 - p_vol, n);
      console.log('[arctic] endpoint diagnostics (M=' + M + ' samples):');
      console.log('  E[B_1]: shuf=' + meanShuf[0].toFixed(3)
                          + ', qpush=' + meanQp[0].toFixed(3)
                          + ', theory(qpush)=' + theoryB1.toFixed(3));
      console.log('  E[B_n]: shuf=' + meanShuf[n-1].toFixed(3)
                          + ', qpush=' + meanQp[n-1].toFixed(3)
                          + ', theory(qpush)=' + theoryBn.toFixed(3));
      // Also show 5 points across the curve so we can compare without zooming
      const sampleMs = [1, Math.floor(n/4), Math.floor(n/2), Math.floor(3*n/4), n];
      console.log('  curve samples (m | shuf | qpush | diff):');
      for (const m of sampleMs) {
        console.log('    m=' + m
          + ': shuf=' + meanShuf[m-1].toFixed(3)
          + ', qpush=' + meanQp[m-1].toFixed(3)
          + ', diff=' + (meanShuf[m-1] - meanQp[m-1]).toFixed(3));
      }

      plotBoundary(canBdy, meanShuf, meanQp, n);

      // Auxiliary pictures from the LAST sample: RSK Maya scatter + qpush polylines.
      const pR = rskPartitionsToPoints(lastResult.parts);
      let xmin = Infinity, xmax = -Infinity;
      for (const p of pR) { if (p.x < xmin) xmin = p.x; if (p.x > xmax) xmax = p.x; }
      // Include qpush R values in the shared x-range.
      for (const row of lastResult.Rtraj) {
        for (let j = 0; j < row.length; j++) {
          const xx = (j + 1) - row[j];
          if (xx < xmin) xmin = xx;
          if (xx > xmax) xmax = xx;
        }
      }
      const xpad = Math.max(2, Math.round((xmax - xmin) * 0.04));
      const xRange = [xmin - xpad, xmax + xpad];
      const tRange = [0, n];
      plotScatter(canRsk, pR, tRange, xRange, `RSK Aztec (n=${n}, q=${q})`);
      plotTrajectories(canQp, lastResult.Rtraj, tRange, xRange, `q-PushTASEP (n=${n}, q=${q})`);

      elMetaR.textContent = `last sample: ${lastResult.parts.length} diagonals, ${pR.length} Maya pts`;
      elMetaQ.textContent = `last sample: ${lastResult.Rtraj.length} time slices, ${lastResult.Rtraj[0].length} particles`;
      elMetaB.textContent = `M=${M} samples, max|meanShuf-meanQp|=${maxAbsDiff.toFixed(3)}, rms=${rmsDiff.toFixed(3)}`;

      const elapsed = (performance.now() - t0) / 1000;
      log(`Done. ${M} sample${M > 1 ? 's' : ''} in ${elapsed.toFixed(2)} s.`);
    } catch (err) {
      log('error: ' + err.message);
      console.error(err);
    } finally {
      elBtn.disabled = false;
    }
  }


  elBtn.addEventListener('click', runMany);
  window.addEventListener('resize', () => {
    fitCanvas(canRsk); fitCanvas(canQp); fitCanvas(canBdy);
  });
})();
</script>
