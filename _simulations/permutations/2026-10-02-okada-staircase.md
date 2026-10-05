---
title: Random permutations from the staircase in the Okada monoid
model: permutations
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2026-10-02-okada-staircase.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
papers:
  - title: "Florent Hivert, Jeanne Scott. Diagrammatic Okada monoid and cellularity of the Okada algebra"
    arxiv-url: "https://arxiv.org/abs/2609.01440"
  - title: "Alejandro H. Morales, Greta Panova, Leonid Petrov, Damir Yeliussizov. Grothendieck Shenanigans: Permutons from Pipe Dreams via Integrable Probability"
    arxiv-url: "https://arxiv.org/abs/2407.21653"
published: true
a11y-description: "Samples a random element of the Okada monoid from the staircase diamond diagram: every box is independently a double U-turn with probability p (shaded) or a double straight square. For N up to 10 the page draws the staircase with its loop picture and the resulting labelled arc diagram; for every N it plots the resulting permutation as a scatter of points (i, sigma(i)), and its height function H(x, y), the number of points strictly north-east of (x, y), as a rotatable 3D surface and as a color map with level lines. Adjust N, p, and resample with the controls."
---

<style>
  :root {
    --okd-bg: #ffffff;
    --okd-panel: #f5f5f5;
    --okd-border: #e0e0e0;
    --okd-text: #333;
    --okd-muted: #888;
    --okd-dot: #00204E;
    --okd-uturn: #F9DCBF;
    --okd-uturn-edge: #E57200;
    --okd-cell-edge: #c8c8c8;
    --okd-loop: #9a9a9a;
    --okd-accent: #E57200;
  }
  [data-theme="dark"] {
    --okd-bg: #1a1a1a;
    --okd-panel: #2d2d2d;
    --okd-border: #444;
    --okd-text: #e8e8e8;
    --okd-muted: #aaa;
    --okd-dot: #9cc3ff;
    --okd-uturn: #5a3a1a;
    --okd-uturn-edge: #ff9933;
    --okd-cell-edge: #555;
    --okd-loop: #777;
    --okd-accent: #ff9933;
  }

  details.math-description { margin-bottom: 12px; }
  details.math-description summary {
    cursor: pointer;
    font-family: "franklingothic-demi", Arial, sans-serif;
    font-size: 13px; font-weight: 600;
    color: var(--okd-muted);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  details.math-description summary:hover { color: var(--okd-accent); }

  .okd-controls {
    background: var(--okd-panel);
    border: 1px solid var(--okd-border);
    border-radius: 8px;
    padding: 12px 14px;
    display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px;
  }
  .okd-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .okd-group label { margin: 0; font-weight: 600; }
  .okd-group input[type="text"], .okd-group input[type="number"] {
    width: 7.5rem; text-align: center;
    border: 1px solid var(--okd-border); border-radius: 4px;
    background: var(--okd-bg); color: var(--okd-text); padding: 2px 4px;
  }
  .okd-group input[type="number"] { width: 5.5rem; }
  .okd-group input[type="range"] { width: 160px; }
  .okd-btn {
    border: 1px solid var(--okd-border); border-radius: 4px;
    background: var(--okd-bg); color: var(--okd-text);
    font-size: 12px; padding: 2px 8px; cursor: pointer; min-height: 28px;
  }
  .okd-btn:hover { border-color: var(--okd-accent); color: var(--okd-accent); }
  .okd-btn-action {
    background: linear-gradient(135deg, #E57200, #f08c30); color: #fff;
    border-color: #E57200; font-weight: 600; padding: 4px 14px;
  }
  .okd-btn-action:hover { background: #c96300; color: #fff; }
  .okd-btn-action:active { transform: scale(0.96); }
  .okd-btn:focus, .okd-group input:focus { outline: 3px solid #E57200; outline-offset: 2px; }

  .okd-stats { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; margin: 10px 2px; }
  .okd-stat-label { color: var(--okd-muted); text-transform: uppercase; font-size: 10px; margin-right: 4px; }
  .okd-stat-value { font-family: 'SF Mono', Monaco, monospace; font-weight: 600; color: var(--okd-text); }

  .okd-panels { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
  .okd-panel {
    flex: 1 1 340px; min-width: 0;
    background: var(--okd-bg);
    border: 1px solid var(--okd-border); border-radius: 8px; padding: 8px;
  }
  .okd-panel.wide { flex: 1 1 100%; }
  .okd-panel h3 {
    font-family: "franklingothic-demi", Arial, sans-serif;
    font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    color: var(--okd-muted); margin: 2px 4px 6px;
  }
  .okd-panel svg { width: 100%; height: auto; display: block; }
  #okdArcs, #okdPerm { max-height: 480px; }
  .okd-hrow { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
  .okd-hrow > div { flex: 1 1 340px; min-width: 0; }
  #okdH3d { position: relative; touch-action: none; }
  #okdH3d canvas { display: block; cursor: grab; }
  #okdHMap { width: 100%; max-width: 520px; height: auto; display: block; margin: 0 auto; }
  .okd-cbar { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--okd-muted); max-width: 520px; margin: 4px auto 0; }
  .okd-cbar span.bar { flex: 1; height: 10px; border-radius: 2px;
    background: linear-gradient(to right, #440154, #3b528b, #21918c, #5ec962, #fde725); }
  .okd-oneline { font-family: 'SF Mono', Monaco, monospace; font-size: 13px; margin: 4px 6px; color: var(--okd-text); overflow-wrap: anywhere; }
  .okd-hint { font-size: 12px; color: var(--okd-muted); margin: 6px 4px; }

  .okd-svg text { fill: var(--okd-text); font-family: "franklingothic-book", Arial, sans-serif; }
  .okd-cell { stroke: var(--okd-cell-edge); stroke-width: 1; fill: none; }
  .okd-cell.u { fill: var(--okd-uturn); stroke: var(--okd-uturn-edge); }
  .okd-strand { fill: none; stroke-width: 3.2; stroke-linecap: round; transition: opacity 0.15s; }
  .okd-hit { fill: none; stroke: transparent; stroke-width: 14; }
  .okd-strand.loop { stroke: var(--okd-loop); stroke-dasharray: 5 4; stroke-width: 2.4; }
  .okd-arclabel circle { fill: var(--okd-bg); stroke-width: 1.6; }
  .okd-arclabel text { font-size: 12px; text-anchor: middle; dominant-baseline: central; }
  .okd-arcgrp { transition: opacity 0.15s; cursor: default; }
  .okd-dimmed .okd-strand:not(.hl), .okd-dimmed .okd-arcgrp:not(.hl) { opacity: 0.15; }
  .okd-dot { fill: var(--okd-dot); }
  .okd-grid { stroke: var(--okd-border); stroke-width: 1; }
  .okd-frame { stroke: var(--okd-muted); stroke-width: 1; fill: none; }

  #okdTooltip {
    position: absolute; padding: 4px 8px; font: 12px 'SF Mono', Monaco, monospace;
    background: var(--okd-bg); color: var(--okd-text);
    border: 1px solid var(--okd-border); border-radius: 4px;
    pointer-events: none; opacity: 0; transition: opacity 0.15s; z-index: 9999;
  }
  @media (prefers-reduced-motion: reduce) {
    .okd-strand, .okd-arcgrp, #okdTooltip { transition: none; }
  }
</style>

<details class="math-description" id="okd-defs">
<summary>About this simulation</summary>
<div style="padding: 10px 4px 6px; line-height: 1.55;">

<p>The <b>Okada monoid</b> $\mathcal{O}_N$ is generated by $e_1,\dots,e_{N-1}$ subject to $e_i^2=e_i$, $e_ie_j=e_je_i$ for $|i-j|\ge 2$, and $e_{i+1}e_ie_{i+1}=e_{i+1}$; it is Okada's algebra at $x_i=y_i=1$. Hivert and Scott realize $\mathcal{O}_N$ by labelled non-crossing arc diagrams and show $|\mathcal{O}_N|=N!$, the elements being $e_\sigma=e_{i_1}\cdots e_{i_k}$ for the lexicographically minimal reduced word $\sigma=s_{i_1}\cdots s_{i_k}$, $\sigma\in S_N$.</p>

<p><b>Random element.</b> Take the staircase diamond diagram with $N-1$ rows, whose reading word $(1)(2\,1)(3\,2\,1)\cdots(N{-}1\,\cdots\,1)$ is a reduced word of the longest permutation. Each box, in row $i$, is independently a <em>double U-turn</em> (the letter $e_i$, shaded) with probability $p$ and a <em>double straight square</em> (the letter is deleted) with probability $1-p$. The product of the surviving letters in reading order is $e_\sigma$ for a unique $\sigma\in S_N$, which is plotted as the points $(i,\sigma(i))$. This is the Okada analogue of the staircase pipe dreams of [MPPY], where the same staircase is evaluated in the 0-Hecke monoid.</p>

<p><b>Loop picture and arc diagram.</b> The strands enter on the left at levels $1,\dots,N$ and leave on the right at levels $\bar 1,\dots,\bar N$, numbered from the bottom. Their connectivity is a non-crossing perfect matching of these $2N$ endpoints; each arc carries the lowest level its path reaches. Closed loops are discarded, since $e_i^2=e_i$. Hover over a strand or an arc to highlight it in both pictures.</p>

<p><b>Decoding.</b> Let $D$ be the labelled arc diagram. If $N$ and $\bar N$ are joined by an arc of label $N$, put $d=N$ and delete that arc. Otherwise let $d$ be the largest index such that $\bar d$ and $\overline{d+1}$ are joined by an arc of label $d$; then $D=D^\flat e_{N-1}\cdots e_d$ (Hivert–Scott, Prop. right-code-factor). In both cases $N-d$ is the last entry of the Lehmer-type code of $\sigma$, and the procedure recurses on $D^\flat\in\mathcal{O}_{N-1}$.</p>

<p><b>Height function.</b> For integers $0\le x,y\le N$ let $H(x,y)=\#\{i>x:\ \sigma(i)>y\}$, the number of points $(i,\sigma(i))$ strictly north-east of $(x,y)$. Then $H(x,0)=N-x$, $H(0,y)=N-y$, and $H$ is non-increasing in both variables. The rescaled function $N^{-1}H(Nx,Ny)=\mu_\sigma\bigl((x,1]\times(y,1]\bigr)$ is the joint survival function of the empirical permuton $\mu_\sigma$ of $\sigma$, so convergence of $N^{-1}H$ is convergence to a permuton. Up to the transposition $x\leftrightarrow y$ and a shift by one, this is the height function of [MPPY]. The surface is drawn in 3D (drag to rotate, scroll to zoom) and as a color map. For $N\le 60$ it is the exact step function, with the points of $\sigma$ at the corners of its steps and lines where $H$ jumps; for $N\le 12$ the values $H(x,y)$ are written in the cells. For larger $N$ it is sampled on a grid of mesh at most $N/160$, and the map shows the level lines $N^{-1}H=0.1,0.2,\dots,0.9$.</p>

<p>For $N\le 10$ the staircase is drawn; for larger $N$ only the permutation is shown. The random numbers are reused when $p$ changes, so moving $p$ only flips boxes monotonically; <b>Resample</b> draws new ones. Nontrivial limit shapes appear when $1-p$ is of order $1/N$.</p>

</div>
</details>

<div class="okd-controls" role="group" aria-label="Simulation controls">
  <div class="okd-group">
    <label for="okdN">$N$</label>
    <input id="okdNRange" type="range" min="2" max="5000" step="1" value="8" aria-label="N slider">
    <input id="okdN" type="number" min="2" max="5000" step="1" value="8">
    <button class="okd-btn" data-n="6">6</button>
    <button class="okd-btn" data-n="10">10</button>
    <button class="okd-btn" data-n="300">300</button>
    <button class="okd-btn" data-n="1000">1000</button>
  </div>
  <div class="okd-group">
    <label for="okdP">$p$</label>
    <input id="okdPRange" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="p slider">
    <button id="okdPDec" class="okd-btn" aria-label="Decrease p">&#9660;</button>
    <input id="okdP" type="text" value="0.5000000" aria-label="p">
    <button id="okdPInc" class="okd-btn" aria-label="Increase p">&#9650;</button>
  </div>
  <div class="okd-group">
    <button id="okdResample" class="okd-btn okd-btn-action" aria-keyshortcuts="S" title="Resample (S)">Resample</button>
  </div>
</div>

<div class="okd-stats" role="status" aria-live="polite">
  <div><span class="okd-stat-label">U-turns</span><span class="okd-stat-value" id="okdLen">0</span></div>
  <div><span class="okd-stat-label">of boxes</span><span class="okd-stat-value" id="okdBoxes">0</span></div>
  <div><span class="okd-stat-label">inversions</span><span class="okd-stat-value" id="okdInv">0</span></div>
  <div id="okdLoopsWrap"><span class="okd-stat-label">closed loops</span><span class="okd-stat-value" id="okdLoops">0</span></div>
  <div><span class="okd-stat-label">time</span><span class="okd-stat-value" id="okdTime">0</span></div>
</div>

<div class="okd-panels">
  <div class="okd-panel wide" id="okdStairPanel">
    <h3>Staircase loop picture</h3>
    <svg id="okdStair" class="okd-svg" role="img" aria-label="Staircase diamond diagram with U-turn and straight squares and the strands they form"></svg>
    <div class="okd-oneline" id="okdWord"></div>
  </div>
  <div class="okd-panel" id="okdArcPanel">
    <h3>Labelled arc diagram</h3>
    <svg id="okdArcs" class="okd-svg" role="img" aria-label="Labelled non-crossing arc diagram of the sampled Okada monoid element"></svg>
  </div>
  <div class="okd-panel" id="okdPermPanel">
    <h3>Resulting permutation</h3>
    <svg id="okdPerm" class="okd-svg" role="img" aria-label="Scatter plot of the points (i, sigma(i)) of the sampled permutation"></svg>
    <div class="okd-oneline" id="okdOneLine"></div>
    <div class="okd-hint" id="okdBigHint" style="display:none;">The staircase is drawn for $N\le 10$.</div>
  </div>
</div>

<div class="okd-panels" style="margin-top: 16px;">
  <div class="okd-panel wide" id="okdHPanel">
    <h3>Height function</h3>
    <div class="okd-hint">$H(x,y)=\#\{i>x:\ \sigma(i)>y\}$, the number of points north-east of $(x,y)$.</div>
    <div class="okd-hrow">
      <div>
        <div id="okdH3d" role="img" aria-label="Rotatable 3D surface of the rescaled height function of the sampled permutation"></div>
        <div class="okd-hint" id="okdH3dHint">Drag to rotate, scroll to zoom.</div>
      </div>
      <div>
        <canvas id="okdHMap" role="img" aria-label="Color map of the rescaled height function of the sampled permutation, with its level lines"></canvas>
        <div class="okd-cbar"><span>0</span><span class="bar"></span><span>1</span><span>&nbsp;$H/N$</span></div>
      </div>
    </div>
  </div>
</div>

<div id="okdTooltip"></div>

<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"></script>

<script>
(function() {
  // ---------- Okada monoid on labelled arc diagrams ----------
  // Nodes: left a -> a, right \bar a -> N + a. Label = lowest level of the path.
  function okadaProduct(N, forEachLetter) {
    const partner = new Int32Array(2 * N + 1);
    const label = new Int32Array(2 * N + 1);
    for (let a = 1; a <= N; a++) {
      partner[a] = N + a; partner[N + a] = a;
      label[a] = label[N + a] = a;
    }
    forEachLetter(function(i) {
      const r1 = N + i, r2 = N + i + 1;
      const x = partner[r1], y = partner[r2];
      if (x !== r2) {
        const ell = Math.min(label[r1], label[r2], i);
        partner[x] = y; partner[y] = x;
        label[x] = label[y] = ell;
      }
      partner[r1] = r2; partner[r2] = r1;
      label[r1] = label[r2] = i;
    });
    return { partner, label };
  }

  function okadaDecode(D, N) {
    const partner = D.partner, label = D.label;
    const L = [], R = [];
    for (let a = 1; a <= N; a++) { L.push(a); R.push(N + a); }
    const code = new Int32Array(N + 1);
    for (let n = N; n >= 1; n--) {
      let d;
      const ln = L[n - 1];
      if (partner[ln] === R[n - 1] && label[ln] === n) {
        d = n;
        L.pop(); R.pop();
      } else {
        d = 0;
        for (let a = n - 1; a >= 1; a--) {
          const u = R[a - 1];
          if (partner[u] === R[a] && label[u] === a) { d = a; break; }
        }
        if (d === 0) throw new Error('decode: no descent at n=' + n);
        R.splice(d - 1, 2);
        R.push(L.pop());
      }
      code[n] = n - d;
    }
    const sigma = [];
    for (let i = 1; i <= N; i++) sigma.splice(sigma.length - code[i], 0, i);
    return sigma;
  }

  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Box in SE diagonal r (reading factor r, r-1, ..., 1) and row i sits at (x, y) = (2r - i, i).
  function staircaseCells(N, p, rng) {
    const cells = [];
    for (let r = 1; r <= N - 1; r++)
      for (let i = r; i >= 1; i--)
        cells.push({ r: r, i: i, x: 2 * r - i, y: i, u: rng() < p });
    return cells;
  }

  function inversions(sigma) {
    const N = sigma.length, bit = new Int32Array(N + 1);
    let inv = 0;
    for (let k = N - 1; k >= 0; k--) {
      for (let j = sigma[k] - 1; j > 0; j -= j & -j) inv += bit[j];
      for (let j = sigma[k]; j <= N; j += j & -j) bit[j]++;
    }
    return inv;
  }

  // ---------- Loop picture ----------
  // Points are edge midpoints; straight squares join SW-SE and NW-NE, U-turns join SW-NW and SE-NE.
  // Bottom row is completed by half straight squares; endpoints get horizontal leads.
  function buildLoopPicture(N, cells) {
    const segs = [];
    const K = function(P) { return (2 * P[0]) + ',' + (2 * P[1]); };
    const add = function(a, b, kind, side) { segs.push({ a: a, b: b, kind: kind, side: side }); };
    for (const c of cells) {
      const x = c.x, y = c.y;
      const SW = [x - .5, y - .5], NW = [x - .5, y + .5], NE = [x + .5, y + .5], SE = [x + .5, y - .5];
      if (c.u) { add(SW, NW, 'cup', 1); add(SE, NE, 'cup', -1); }
      else { add(SW, SE, 'line'); add(NW, NE, 'line'); }
    }
    for (let x = 1; x + 2 <= 2 * N - 3; x += 2) add([x + .5, .5], [x + 1.5, .5], 'line');
    const XL = -0.5, XR = 2 * N - 1.5;
    const leftEnd = function(j) { return j === 1 ? [.5, .5] : [j - 1.5, j - .5]; };
    const rightEnd = function(j) { return j === 1 ? [2 * N - 2.5, .5] : [2 * N - j - .5, j - .5]; };
    const nodeAt = new Map();
    for (let j = 1; j <= N; j++) {
      add([XL, j - .5], leftEnd(j), 'line');
      add(rightEnd(j), [XR, j - .5], 'line');
      nodeAt.set(K([XL, j - .5]), j);
      nodeAt.set(K([XR, j - .5]), N + j);
    }
    const id = new Map(), par = [];
    const gid = function(P) { const k = K(P); if (!id.has(k)) { id.set(k, par.length); par.push(par.length); } return id.get(k); };
    const find = function(a) { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
    for (const s of segs) { const a = find(gid(s.a)), b = find(gid(s.b)); if (a !== b) par[a] = b; }
    const compNodes = new Map();
    for (const [k, v] of nodeAt) {
      const r = find(id.get(k));
      if (!compNodes.has(r)) compNodes.set(r, []);
      compNodes.get(r).push(v);
    }
    const loopId = new Map();
    for (const s of segs) {
      const r = find(gid(s.a));
      const nodes = compNodes.get(r);
      if (nodes) s.comp = Math.min.apply(null, nodes);
      else {
        if (!loopId.has(r)) loopId.set(r, loopId.size);
        s.comp = -1 - loopId.get(r);
      }
    }
    return { segs: segs, loops: loopId.size, XL: XL, XR: XR };
  }

  // ---------- Drawing ----------
  const PALETTE = ['#1f77b4', '#d62728', '#2ca02c', '#9467bd', '#E57200',
                   '#17becf', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22'];
  let colorRank = new Map();
  const colorOf = function(comp) { return PALETTE[colorRank.get(comp) % PALETTE.length]; };

  function setHighlight(comp) {
    for (const id of ['okdStair', 'okdArcs']) {
      const svg = document.getElementById(id);
      svg.classList.toggle('okd-dimmed', comp !== null);
      svg.querySelectorAll('[data-comp]').forEach(function(el) {
        el.classList.toggle('hl', comp !== null && el.getAttribute('data-comp') === String(comp));
      });
    }
  }

  function attachHover(svg) {
    svg.onmouseover = function(e) {
      const t = e.target.closest('[data-comp]');
      setHighlight(t ? t.getAttribute('data-comp') : null);
    };
    svg.onmouseleave = function() { setHighlight(null); };
  }

  function drawStaircase(N, cells, pic) {
    const svg = document.getElementById('okdStair');
    const u = 40, pad = 34;
    const X0 = pic.XL, X1 = pic.XR, Ytop = N;
    const W = (X1 - X0) * u + 2 * pad, H = Ytop * u + 2 * 14;
    const sx = function(x) { return pad + (x - X0) * u; };
    const sy = function(y) { return 14 + (Ytop - y) * u; };
    let s = '';
    for (const c of cells) {
      const pts = [[c.x - 1, c.y], [c.x, c.y + 1], [c.x + 1, c.y], [c.x, c.y - 1]]
        .map(function(P) { return sx(P[0]).toFixed(2) + ',' + sy(P[1]).toFixed(2); }).join(' ');
      s += '<polygon class="okd-cell' + (c.u ? ' u' : '') + '" points="' + pts + '"><title>row ' + c.i +
           (c.u ? ': U-turn (e_' + c.i + ')' : ': straight') + '</title></polygon>';
    }
    const k = 0.55;
    for (const g of pic.segs) {
      const a = g.a, b = g.b;
      let d;
      if (g.kind === 'line') {
        d = 'M' + sx(a[0]) + ',' + sy(a[1]) + 'L' + sx(b[0]) + ',' + sy(b[1]);
      } else {
        // smooth cup with horizontal tangents, bulging towards the box center
        const cx = a[0] + g.side * k;
        d = 'M' + sx(a[0]) + ',' + sy(a[1]) + 'C' + sx(cx) + ',' + sy(a[1]) + ' ' +
            sx(cx) + ',' + sy(b[1]) + ' ' + sx(b[0]) + ',' + sy(b[1]);
      }
      if (g.comp < 0) s += '<path class="okd-strand loop" d="' + d + '"/>';
      else s += '<path class="okd-strand" data-comp="' + g.comp + '" stroke="' + colorOf(g.comp) + '" d="' + d + '"/>' +
                '<path class="okd-hit" data-comp="' + g.comp + '" d="' + d + '"/>';
    }
    for (let j = 1; j <= N; j++) {
      s += '<text x="' + (sx(pic.XL) - 8) + '" y="' + sy(j - .5) + '" text-anchor="end" dominant-baseline="central" font-size="14">' + j + '</text>';
      s += '<text x="' + (sx(pic.XR) + 8) + '" y="' + sy(j - .5) + '" text-anchor="start" dominant-baseline="central" font-size="14" text-decoration="overline">' + j + '</text>';
    }
    svg.setAttribute('viewBox', '0 0 ' + W.toFixed(1) + ' ' + H.toFixed(1));
    svg.innerHTML = s;
    attachHover(svg);
  }

  function drawArcDiagram(N, D) {
    const svg = document.getElementById('okdArcs');
    const u = 40, padX = 30, Wd = Math.max(160, 30 * N);
    const H = N * u + 28;
    const xL = padX, xR = padX + Wd;
    const yOf = function(j) { return 14 + (N - (j - .5)) * u; };
    const pos = function(v) { return v <= N ? [xL, yOf(v)] : [xR, yOf(v - N)]; };
    let s = '';
    for (let v = 1; v <= 2 * N; v++) {
      const w = D.partner[v];
      if (w < v) continue;
      const comp = Math.min(v, w);
      const A = pos(v), B = pos(w);
      let d, mx, my;
      if (v <= N && w <= N) {
        const c = Math.min(Wd * 0.45, 0.42 * Math.abs(A[1] - B[1]) + 16);
        d = 'M' + A[0] + ',' + A[1] + 'C' + (A[0] + c) + ',' + A[1] + ' ' + (A[0] + c) + ',' + B[1] + ' ' + B[0] + ',' + B[1];
        mx = A[0] + 0.75 * c; my = (A[1] + B[1]) / 2;
      } else if (v > N && w > N) {
        const c = Math.min(Wd * 0.45, 0.42 * Math.abs(A[1] - B[1]) + 16);
        d = 'M' + A[0] + ',' + A[1] + 'C' + (A[0] - c) + ',' + A[1] + ' ' + (A[0] - c) + ',' + B[1] + ' ' + B[0] + ',' + B[1];
        mx = A[0] - 0.75 * c; my = (A[1] + B[1]) / 2;
      } else {
        d = 'M' + A[0] + ',' + A[1] + 'L' + B[0] + ',' + B[1];
        mx = (A[0] + B[0]) / 2; my = (A[1] + B[1]) / 2;
      }
      const col = colorOf(comp);
      s += '<g class="okd-arcgrp" data-comp="' + comp + '">' +
           '<path class="okd-strand" stroke="' + col + '" d="' + d + '"/>' +
           '<g class="okd-arclabel"><circle cx="' + mx + '" cy="' + my + '" r="9" stroke="' + col + '"/>' +
           '<text x="' + mx + '" y="' + my + '">' + D.label[v] + '</text></g></g>';
    }
    for (let j = 1; j <= N; j++) {
      s += '<text x="' + (xL - 8) + '" y="' + yOf(j) + '" text-anchor="end" dominant-baseline="central" font-size="14">' + j + '</text>';
      s += '<text x="' + (xR + 8) + '" y="' + yOf(j) + '" text-anchor="start" dominant-baseline="central" font-size="14" text-decoration="overline">' + j + '</text>';
    }
    svg.setAttribute('viewBox', '0 0 ' + (xR + padX) + ' ' + H);
    svg.innerHTML = s;
    attachHover(svg);
  }

  function drawPermutation(sigma) {
    const N = sigma.length;
    const svg = document.getElementById('okdPerm');
    const size = 600, m = N <= 10 ? 36 : 12;
    const cell = size / N;
    const px = function(i) { return m + (i - 0.5) * cell; };
    const py = function(v) { return m + size - (v - 0.5) * cell; };
    const r = N <= 10 ? Math.min(14, cell * 0.28) : Math.max(0.9, Math.min(4, 1.6 * size / N));
    let s = '<rect class="okd-frame" x="' + m + '" y="' + m + '" width="' + size + '" height="' + size + '"/>';
    if (N <= 30) {
      for (let k = 1; k < N; k++) {
        s += '<line class="okd-grid" x1="' + (m + k * cell) + '" y1="' + m + '" x2="' + (m + k * cell) + '" y2="' + (m + size) + '"/>';
        s += '<line class="okd-grid" x1="' + m + '" y1="' + (m + k * cell) + '" x2="' + (m + size) + '" y2="' + (m + k * cell) + '"/>';
      }
    }
    for (let i = 1; i <= N; i++)
      s += '<circle class="okd-dot" cx="' + px(i).toFixed(2) + '" cy="' + py(sigma[i - 1]).toFixed(2) + '" r="' + r.toFixed(2) + '"/>';
    if (N <= 10) {
      for (let i = 1; i <= N; i++) {
        s += '<text x="' + px(i) + '" y="' + (m + size + 22) + '" text-anchor="middle" font-size="20">' + i + '</text>';
        s += '<text x="' + (m - 10) + '" y="' + py(i) + '" text-anchor="end" dominant-baseline="central" font-size="20">' + i + '</text>';
      }
    }
    svg.setAttribute('viewBox', '0 0 ' + (size + 2 * m) + ' ' + (size + 2 * m));
    svg.innerHTML = s;

    const tip = document.getElementById('okdTooltip');
    svg.onmousemove = function(e) {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      const i = Math.round((q.x - m) / cell + 0.5);
      if (i < 1 || i > N || q.y < m || q.y > m + size) { tip.style.opacity = 0; return; }
      tip.textContent = 'i = ' + i + ', σ(i) = ' + sigma[i - 1];
      tip.style.left = (e.pageX + 12) + 'px';
      tip.style.top = (e.pageY + 12) + 'px';
      tip.style.opacity = 1;
    };
    svg.onmouseleave = function() { tip.style.opacity = 0; };
  }

  // ---------- Height function ----------
  // H(x, y) = #{i > x : sigma(i) > y}, sampled at x, y in xs = {round(kN/G) : 0 <= k <= G}.
  function heightGrid(sigma, G) {
    const N = sigma.length, S = G + 1;
    const xs = new Int32Array(S);
    for (let k = 0; k <= G; k++) xs[k] = Math.round(k * N / G);
    const bin = new Int32Array(N + 1);  // bin[i] = max{k : xs[k] < i}
    for (let i = 1, k = 0; i <= N; i++) { while (xs[k + 1] < i) k++; bin[i] = k; }
    const H = new Int32Array(S * S);
    for (let i = 1; i <= N; i++) H[bin[i] * S + bin[sigma[i - 1]]]++;
    for (let k = G; k >= 0; k--)
      for (let l = G; l >= 0; l--) {
        let v = H[k * S + l];
        if (k < G) v += H[(k + 1) * S + l];
        if (l < G) v += H[k * S + l + 1];
        if (k < G && l < G) v -= H[(k + 1) * S + l + 1];
        H[k * S + l] = v;
      }
    return { N: N, G: G, S: S, xs: xs, H: H };
  }

  const VIRIDIS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
  function viridis(t) {
    t = Math.max(0, Math.min(1, t));
    const s = t * 4, j = Math.min(3, Math.floor(s)), f = s - j;
    const a = VIRIDIS[j], b = VIRIDIS[j + 1];
    return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])];
  }

  const HS = 0.7;  // vertical scale of the 3D surface
  let three = null;

  function textSprite(txt, x, y, z) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#888'; g.font = 'italic 44px Georgia, serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 32, 32);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
    sp.scale.set(0.1, 0.1, 1);
    sp.position.set(x, y, z);
    return sp;
  }

  // World coordinates: X = x - 1/2, Z = 1/2 - y, Y = HS * h.
  function initThree() {
    if (three) return three;
    const box = document.getElementById('okdH3d');
    let renderer = null;
    if (typeof THREE !== 'undefined' && THREE.OrbitControls) {
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { renderer = null; }
    }
    if (!renderer) {
      box.innerHTML = '<div class="okd-hint">3D view unavailable (WebGL or three.js failed to load).</div>';
      document.getElementById('okdH3dHint').style.display = 'none';
      three = { failed: true };
      return three;
    }
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    box.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    camera.position.set(1.55, 1.35, 1.85);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.22, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 0.55);
    light.position.set(1, 2.5, 1.5);
    scene.add(light);
    const frame = new THREE.BufferGeometry().setFromPoints([
      [-.5, 0, .5], [.5, 0, .5], [.5, 0, .5], [.5, 0, -.5], [.5, 0, -.5], [-.5, 0, -.5],
      [-.5, 0, -.5], [-.5, 0, .5], [-.5, 0, .5], [-.5, HS * 1.08, .5]
    ].map(function(P) { return new THREE.Vector3(P[0], P[1], P[2]); }));
    scene.add(new THREE.LineSegments(frame, new THREE.LineBasicMaterial({ color: 0x888888 })));
    scene.add(textSprite('x', 0, -0.03, 0.62));
    scene.add(textSprite('y', -0.62, -0.03, 0));
    scene.add(textSprite('h', -0.5, HS * 1.08 + 0.07, 0.5));
    three = { renderer: renderer, scene: scene, camera: camera, controls: controls, box: box, mesh: null };
    three.render = function() { renderer.render(scene, camera); };
    controls.addEventListener('change', three.render);
    window.addEventListener('resize', function() { resizeThree(); three.render(); });
    resizeThree();
    return three;
  }

  function resizeThree() {
    const w = three.box.clientWidth || 400;
    const h = Math.round(Math.max(280, Math.min(460, 0.85 * w)));
    three.renderer.setSize(w, h);
    three.camera.aspect = w / h;
    three.camera.updateProjectionMatrix();
  }

  // stepped: G = N and the cell [k, k+1) x [l, l+1) carries H(k, l); otherwise a smooth mesh through the grid values.
  function drawHeight3D(hg, stepped) {
    const T = initThree();
    if (T.failed) return;
    const N = hg.N, G = hg.G, S = hg.S, xs = hg.xs, H = hg.H;
    const X = function(k) { return xs[k] / N - 0.5; };
    const Z = function(l) { return 0.5 - xs[l] / N; };
    const Y = function(v) { return HS * v / N; };
    const val = function(k, l) { return k < G && l < G ? H[k * S + l] : 0; };
    const pos = [], col = [];
    let idx = null;
    const vert = function(x, y, z, c) { pos.push(x, y, z); col.push(c[0] / 255, c[1] / 255, c[2] / 255); };
    const quad = function(a, b, c, d, rgb) {
      for (const P of [a, b, c, a, c, d]) vert(P[0], P[1], P[2], rgb);
    };
    if (stepped) {
      for (let k = 0; k < G; k++)
        for (let l = 0; l < G; l++) {
          const v = val(k, l), y = Y(v), rgb = viridis(v / N);
          const dark = [rgb[0] * 0.75, rgb[1] * 0.75, rgb[2] * 0.75];
          quad([X(k), y, Z(l)], [X(k + 1), y, Z(l)], [X(k + 1), y, Z(l + 1)], [X(k), y, Z(l + 1)], rgb);
          const vx = val(k + 1, l), vy = val(k, l + 1);
          if (vx !== v) quad([X(k + 1), Y(vx), Z(l)], [X(k + 1), y, Z(l)], [X(k + 1), y, Z(l + 1)], [X(k + 1), Y(vx), Z(l + 1)], dark);
          if (vy !== v) quad([X(k), Y(vy), Z(l + 1)], [X(k), y, Z(l + 1)], [X(k + 1), y, Z(l + 1)], [X(k + 1), Y(vy), Z(l + 1)], dark);
          if (k === 0) quad([X(0), 0, Z(l)], [X(0), y, Z(l)], [X(0), y, Z(l + 1)], [X(0), 0, Z(l + 1)], dark);
          if (l === 0) quad([X(k), 0, Z(0)], [X(k), y, Z(0)], [X(k + 1), y, Z(0)], [X(k + 1), 0, Z(0)], dark);
        }
    } else {
      for (let k = 0; k <= G; k++)
        for (let l = 0; l <= G; l++) {
          const v = H[k * S + l];
          vert(X(k), Y(v), Z(l), viridis(v / N));
        }
      idx = [];
      for (let k = 0; k < G; k++)
        for (let l = 0; l < G; l++) {
          const a = k * S + l, b = (k + 1) * S + l, c = (k + 1) * S + l + 1, d = k * S + l + 1;
          idx.push(a, b, c, a, c, d);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    if (idx) geo.setIndex(idx);
    geo.computeVertexNormals();
    if (T.mesh) { T.scene.remove(T.mesh); T.mesh.geometry.dispose(); T.mesh.material.dispose(); }
    T.mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    T.scene.add(T.mesh);
    resizeThree();
    T.render();
  }

  function drawHeightMap(hg, sigma, stepped) {
    const N = hg.N, G = hg.G, S = hg.S, xs = hg.xs, H = hg.H;
    const cv = document.getElementById('okdHMap');
    const m = 22, mL = 42, P = 576, LW = mL + P + m, LH = P + 2 * m;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(LW * dpr); cv.height = Math.round(LH * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, LW, LH);
    const sx = function(x) { return mL + P * x / N; };
    const sy = function(y) { return m + P - P * y / N; };

    // one pixel per grid value, scaled up; stepped cells are drawn sharp, sampled grids are interpolated
    const n = stepped ? G : G + 1;
    const img = document.createElement('canvas');
    img.width = img.height = n;
    const ictx = img.getContext('2d'), data = ictx.createImageData(n, n);
    for (let k = 0; k < n; k++)
      for (let l = 0; l < n; l++) {
        const c = viridis(H[k * S + l] / N), o = 4 * ((n - 1 - l) * n + k);
        data.data[o] = c[0]; data.data[o + 1] = c[1]; data.data[o + 2] = c[2]; data.data[o + 3] = 255;
      }
    ictx.putImageData(data, 0, 0);
    ctx.save();
    ctx.beginPath(); ctx.rect(mL, m, P, P); ctx.clip();
    ctx.imageSmoothingEnabled = !stepped;
    if (stepped) ctx.drawImage(img, mL, m, P, P);
    else { const h = P / G / 2; ctx.drawImage(img, mL - h, m - h, P + 2 * h, P + 2 * h); }

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    if (stepped) {
      for (let k = 0; k < G; k++)
        for (let l = 0; l < G; l++) {
          const v = H[k * S + l];
          if (k + 1 < G && H[(k + 1) * S + l] !== v) { ctx.moveTo(sx(k + 1), sy(l)); ctx.lineTo(sx(k + 1), sy(l + 1)); }
          if (l + 1 < G && H[k * S + l + 1] !== v) { ctx.moveTo(sx(k), sy(l + 1)); ctx.lineTo(sx(k + 1), sy(l + 1)); }
        }
    } else {
      // marching squares for the level lines H = cN
      for (let q = 1; q <= 9; q++) {
        const c = q * N / 10;
        for (let k = 0; k < G; k++)
          for (let l = 0; l < G; l++) {
            const v = [H[k * S + l], H[(k + 1) * S + l], H[(k + 1) * S + l + 1], H[k * S + l + 1]];
            const Pt = [[xs[k], xs[l]], [xs[k + 1], xs[l]], [xs[k + 1], xs[l + 1]], [xs[k], xs[l + 1]]];
            const pts = [];
            for (let e = 0; e < 4; e++) {
              const a = e, b = (e + 1) % 4;
              if ((v[a] > c) !== (v[b] > c)) {
                const t = (c - v[a]) / (v[b] - v[a]);
                pts.push([Pt[a][0] + t * (Pt[b][0] - Pt[a][0]), Pt[a][1] + t * (Pt[b][1] - Pt[a][1])]);
              }
            }
            for (let j = 0; j + 1 < pts.length; j += 2) {
              ctx.moveTo(sx(pts[j][0]), sy(pts[j][1]));
              ctx.lineTo(sx(pts[j + 1][0]), sy(pts[j + 1][1]));
            }
          }
      }
    }
    ctx.stroke();
    ctx.restore();

    const textCol = getComputedStyle(document.documentElement).getPropertyValue('--okd-text').trim() || '#333';
    if (stepped && N <= 12) {
      ctx.font = Math.round(Math.min(22, 0.3 * P / N)) + 'px "SF Mono", Monaco, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let k = 0; k < G; k++)
        for (let l = 0; l < G; l++) {
          const v = H[k * S + l];
          ctx.fillStyle = v / N > 0.6 ? '#222' : '#fff';
          ctx.fillText(String(v), sx(k + 0.5), sy(l + 0.5));
        }
    }
    if (stepped) {
      const r = Math.max(2, Math.min(6, 0.12 * P / N));
      ctx.lineWidth = 1.2;
      for (let i = 1; i <= N; i++) {
        ctx.beginPath();
        ctx.arc(sx(i), sy(sigma[i - 1]), r, 0, 2 * Math.PI);
        ctx.fillStyle = '#E57200'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.stroke();
      }
    }
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
    ctx.strokeRect(mL, m, P, P);
    ctx.fillStyle = textCol;
    ctx.font = '13px "franklingothic-book", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('0', mL, m + P + 4); ctx.fillText(String(N), mL + P, m + P + 4); ctx.fillText('x', mL + P / 2, m + P + 4);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(String(N), mL - 4, m); ctx.fillText('y', mL - 6, m + P / 2);

    const tip = document.getElementById('okdTooltip');
    cv.onmousemove = function(e) {
      const rect = cv.getBoundingClientRect();
      const qx = (e.clientX - rect.left) * LW / rect.width, qy = (e.clientY - rect.top) * LH / rect.height;
      const x = Math.floor((qx - mL) / P * N), y = Math.floor((m + P - qy) / P * N);
      if (x < 0 || x >= N || y < 0 || y >= N) { tip.style.opacity = 0; return; }
      let h = 0;
      for (let i = x + 1; i <= N; i++) if (sigma[i - 1] > y) h++;
      tip.textContent = 'H(' + x + ', ' + y + ') = ' + h + (N > 12 ? ',  H/N = ' + (h / N).toFixed(3) : '');
      tip.style.left = (e.pageX + 12) + 'px';
      tip.style.top = (e.pageY + 12) + 'px';
      tip.style.opacity = 1;
    };
    cv.onmouseleave = function() { tip.style.opacity = 0; };
  }

  function drawHeight(sigma) {
    const N = sigma.length, stepped = N <= 60;
    const hg = heightGrid(sigma, stepped ? N : Math.min(N, 160));
    drawHeightMap(hg, sigma, stepped);
    drawHeight3D(hg, stepped);
  }

  // ---------- Simulation ----------
  let seed = (Math.random() * 4294967296) >>> 0;
  let currentN = 8, currentP = 0.5;

  function simulate() {
    const N = currentN, p = currentP;
    const t0 = performance.now();
    const rng = mulberry32(seed);
    const small = N <= 10;
    let cells = null, nU = 0, D;
    if (small) {
      cells = staircaseCells(N, p, rng);
      D = okadaProduct(N, function(apply) {
        for (const c of cells) if (c.u) { nU++; apply(c.i); }
      });
    } else {
      D = okadaProduct(N, function(apply) {
        for (let r = 1; r <= N - 1; r++)
          for (let i = r; i >= 1; i--) if (rng() < p) { nU++; apply(i); }
      });
    }
    const sigma = okadaDecode(D, N);
    const dt = performance.now() - t0;

    document.getElementById('okdLen').textContent = nU;
    document.getElementById('okdBoxes').textContent = N * (N - 1) / 2;
    document.getElementById('okdInv').textContent = inversions(sigma);
    document.getElementById('okdTime').textContent = dt.toFixed(0) + ' ms';

    document.getElementById('okdStairPanel').style.display = small ? '' : 'none';
    document.getElementById('okdArcPanel').style.display = small ? '' : 'none';
    document.getElementById('okdLoopsWrap').style.display = small ? '' : 'none';
    document.getElementById('okdBigHint').style.display = small ? 'none' : '';
    document.getElementById('okdPermPanel').style.maxWidth = small ? '480px' : '720px';

    if (small) {
      colorRank = new Map();
      for (let v = 1; v <= 2 * N; v++) if (D.partner[v] > v) colorRank.set(v, colorRank.size);
      const pic = buildLoopPicture(N, cells);
      document.getElementById('okdLoops').textContent = pic.loops;
      drawStaircase(N, cells, pic);
      drawArcDiagram(N, D);
      const factors = [];
      for (let r = 1; r <= N - 1; r++) {
        const f = cells.filter(function(c) { return c.r === r && c.u; }).map(function(c) { return c.i; });
        factors.push(f.length ? f.join('') : 'ε');
      }
      document.getElementById('okdWord').textContent = 'reading word: ' + factors.join(' · ');
      document.getElementById('okdOneLine').textContent = 'σ = ' + sigma.join(' ');
    } else {
      document.getElementById('okdOneLine').textContent = '';
    }
    drawPermutation(sigma);
    drawHeight(sigma);
  }

  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(simulate, currentN > 1500 ? 150 : 30);
  }

  // ---------- Controls ----------
  const nIn = document.getElementById('okdN'), nRange = document.getElementById('okdNRange');
  const pIn = document.getElementById('okdP'), pRange = document.getElementById('okdPRange');

  function setN(v) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = currentN;
    v = Math.max(2, Math.min(5000, v));
    currentN = v; nIn.value = v; nRange.value = v;
    schedule();
  }
  function setP(v) {
    v = parseFloat(String(v).replace(',', '.'));
    if (isNaN(v)) v = currentP;
    v = Math.max(0, Math.min(1, v));
    currentP = v; pIn.value = v.toFixed(7); pRange.value = v;
    schedule();
  }

  nIn.addEventListener('change', function() { setN(nIn.value); });
  nRange.addEventListener('input', function() { setN(nRange.value); });
  document.querySelectorAll('[data-n]').forEach(function(b) {
    b.addEventListener('click', function() { setN(b.getAttribute('data-n')); });
  });
  pIn.addEventListener('change', function() { setP(pIn.value); });
  pIn.addEventListener('keyup', function(e) { if (e.key === 'Enter') { setP(pIn.value); pIn.blur(); } });
  pRange.addEventListener('input', function() { setP(pRange.value); });
  document.getElementById('okdPInc').addEventListener('click', function() { setP(currentP + 0.05); });
  document.getElementById('okdPDec').addEventListener('click', function() { setP(currentP - 0.05); });
  document.getElementById('okdResample').addEventListener('click', function() {
    seed = (Math.random() * 4294967296) >>> 0;
    simulate();
  });
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 's' || e.key === 'S') { seed = (Math.random() * 4294967296) >>> 0; simulate(); }
  });

  setP(0.5);
  setN(8);
})();
</script>

