---
title: Periodic Pipe Dreams and Affine Permutons
model: permutations
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2026-07-29-periodic-pipe-dreams.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
papers:
  - title: "Alejandro H. Morales, Greta Panova, Leonid Petrov, Damir Yeliussizov. Grothendieck Shenanigans: Permutons from Pipe Dreams via Integrable Probability"
    arxiv-url: "https://arxiv.org/abs/2407.21653"
published: true
a11y-description: "Displays a cylindrical pipe dream: a grid of k rows and n columns whose left and right edges are identified, randomly filled with crossing and elbow tiles, drawn with colored pipes that continue across the seam. Below it, the resulting affine permutation is plotted either as a scatter of points on a torus or as a displacement profile, together with a histogram of scaled displacements. Adjust circumference, height, crossing probability p, the Hecke parameter q controlling how often pipes are allowed to cross a second time, and the number of periods drawn."
---

<style>
  details.math-description { margin-bottom: 12px; }
  details.math-description summary {
    cursor: pointer;
    font-family: "franklingothic-demi", Arial, sans-serif;
    font-size: 13px; font-weight: 600;
    color: var(--text-secondary, #888);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  details.math-description summary:hover { color: var(--accent-color, #E57200); }

  #ppd-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .ppd-controls {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .ppd-group {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 4px;
  }

  .ppd-group label {
    margin: 0;
    font-weight: 500;
  }

  .ppd-group input[type="number"],
  .ppd-group input[type="text"] {
    width: 82px;
  }

  .ppd-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }

  #ppd-canvas-wrap {
    position: relative;
    width: 100%;
    margin-top: 15px;
    overflow: hidden;
    border: 1px solid #ccc;
    background: #f9f9f9;
  }

  #ppd-canvas {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
  }

  #ppd-canvas:active {
    cursor: grabbing;
  }

  #ppd-zoom {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    padding: 10px 12px;
    background: var(--bg-secondary, #F1F1EF);
    border-radius: 6px;
    width: fit-content;
  }

  #ppd-zoom button {
    min-width: 36px;
    height: 36px;
    padding: 0 12px;
    font-size: 16px;
    font-weight: 600;
    border: 1px solid #232D4B;
    background: #232D4B;
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
  }

  #ppd-zoom button:hover {
    background: #e57200;
    border-color: #e57200;
  }

  #ppd-zoom-level {
    min-width: 52px;
    text-align: center;
    font-weight: 600;
  }

  #ppd-zoom .ppd-hint {
    margin-left: 8px;
    color: #666;
    font-size: 12px;
  }

  .ppd-view-toggle button {
    padding: 6px 14px;
    font-size: 14px;
    font-weight: 600;
    border: 1px solid #232D4B;
    background: #fff;
    color: #232D4B;
    border-radius: 4px;
    cursor: pointer;
  }

  .ppd-view-toggle button.active {
    background: #232D4B;
    color: #fff;
  }

  .ppd-plots {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 12px;
    align-items: flex-start;
  }

  .ppd-plots canvas {
    border: 1px solid #ddd;
    background: #fff;
    max-width: 100%;
    height: auto;
  }

  #ppd-stats {
    margin-top: 18px;
    padding: 15px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  #ppd-stats h4 {
    margin-top: 0;
    margin-bottom: 10px;
  }

  #ppd-stats table {
    border-collapse: collapse;
  }

  #ppd-stats td {
    padding: 2px 16px 2px 0;
    vertical-align: top;
  }

  #ppd-window {
    font-family: monospace;
    font-size: 13px;
    word-break: break-all;
    background: #fff;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #ddd;
    margin-top: 8px;
  }

  #ppd-message {
    margin-top: 8px;
    color: #8a5a00;
  }

  @media (max-width: 768px) {
    .ppd-controls {
      flex-direction: column;
      align-items: stretch;
    }
    .ppd-group {
      justify-content: space-between;
    }
  }
</style>

<details class="math-description" id="ppd-defs">
<summary>About this simulation</summary>
<div style="padding: 10px 4px 6px; line-height: 1.55;">

<p>A <b>periodic pipe dream</b> is an $n$-periodic filling of the $k\times\infty$ grid by two tiles, the <em>cross</em> and the <em>elbow</em>. Equivalently it is a $k\times n$ pipe dream drawn on a cylinder: the left and right boundaries of the $k\times n$ rectangle are identified, so a pipe leaving through the right edge re-enters on the left.</p>

<p>Here every cell is an independent cross with probability $p$ and an elbow with probability $1-p$. Pipes enter through the bottom boundary and leave through the top boundary. At a cross the two pipes pass through each other; at an elbow the pipe arriving from below turns right and the pipe arriving from the left turns up. Numbering the bottom and top boundary edges by $\mathbb{Z}$, the connectivity of the pipes is an <b>affine permutation</b>: a bijection $f\colon \mathbb{Z}\to\mathbb{Z}$ with $f(i+n)=f(i)+n$.</p>

<p>Every cell passes exactly one pipe to the right, so each row contributes exactly $n$ to the total rightward displacement, and therefore
$$\sum_{i=1}^{n}\bigl(f(i)-i\bigr)=kn$$
for every configuration, whatever $p$ is. The height $k$ is thus the <em>level</em> of the affine permutation, and $\alpha=k/n$ is the mean displacement in units of $n$. The list $f(i)-i$ is the <b>siteswap</b> of $f$.</p>

<p><b>Reduction and the parameter $q$.</b> At a cross tile whose two pipes have not met before, the crossing is always realized. Where the two pipes have already crossed, it is realized with probability $q$ and otherwise forced to an elbow (shaded gray). At $q=0$ this is the Demazure product in the affine symmetric group, the periodic analogue of the reduction studied in [1], and the diagram is reduced: the number of realized crossings equals the length $\ell(f)$. At $q=1$ nothing is undone and the pipe dream is the raw i.i.d. tiling. Intermediate values interpolate, in the same way as the parameter $q$ of the staircase simulation: a re-crossing is accepted with relative weight $q$.</p>

<p><b>Affine permuton.</b> Since $f(i+n)=f(i)+n$, the points $(i,f(i))$ are invariant under translation by $(n,n)$ and descend to $n$ points on the torus $(\mathbb{Z}/n)^2$ — one in every row and every column. Rescaling by $n$ and letting $n\to\infty$ gives a measure on the torus with uniform marginals: an affine permuton.</p>

<p>Reduction is what makes it nontrivial. Without reduction the displacements $f(i)-i$ are sums of $k$ nearly independent mean-one contributions, so they concentrate at $k$ and the limit is the trivial rotation $y=x+\alpha$; the observed spread $\mathrm{sd}(f(i)-i)/n$ decays like $n^{-1/2}$. With reduction that ratio instead settles down to a positive constant (about $0.11$ at $p=0.3$, $0.21$ at $p=0.5$, $0.53$ at $p=0.8$, taking $\alpha=1/2$), so the displacements spread on the scale of $n$ and the permuton is genuinely two-dimensional. Compare $q=0$ with $q=1$ at $n$ large to see the two pictures.</p>

<p>A row consisting entirely of crosses would carry a closed loop that never turns up, and its word has no canonical starting point on the cylinder; such rows are excluded by resampling. This has probability $p^n$ and matters only for very small $n$ or $p$ very close to $1$.</p>

</div>
</details>

<a href="#ppd-canvas" class="skip-link">Skip to simulation canvas</a>

<div id="ppd-container">
  <div class="ppd-controls">
    <div class="ppd-group">
      <label for="ppd-n">Circumference $n$:</label>
      <input type="number" id="ppd-n" value="60" min="2" max="4000" />
    </div>
    <div class="ppd-group">
      <label for="ppd-k">Height $k$:</label>
      <input type="number" id="ppd-k" value="30" min="1" max="4000" />
    </div>
    <div class="ppd-group">
      <label for="ppd-p">Cross prob $p$:</label>
      <input type="text" id="ppd-p" value="0.5" />
    </div>
    <div class="ppd-group">
      <label for="ppd-q">Hecke $q$:</label>
      <input type="text" id="ppd-q" value="0" />
    </div>
    <div class="ppd-group">
      <label for="ppd-seed">Seed:</label>
      <input type="number" id="ppd-seed" value="" placeholder="Random" min="0" />
    </div>
  </div>

  <div class="ppd-controls">
    <div class="ppd-group">
      <input type="checkbox" id="ppd-show-pipes" checked />
      <label for="ppd-show-pipes">Show pipes</label>
    </div>
    <div class="ppd-group">
      <input type="checkbox" id="ppd-show-grid" />
      <label for="ppd-show-grid">Show grid</label>
    </div>
    <div class="ppd-group">
      <input type="checkbox" id="ppd-show-forced" checked />
      <label for="ppd-show-forced">Shade forced elbows</label>
    </div>
    <div class="ppd-group">
      <label for="ppd-periods">Periods drawn:</label>
      <select id="ppd-periods">
        <option value="1">1</option>
        <option value="2" selected>2</option>
        <option value="3">3</option>
      </select>
    </div>
  </div>

  <div class="ppd-controls">
    <button id="ppd-generate" class="btn btn-primary">Generate</button>
    <button id="ppd-resample" class="btn btn-secondary">Resample (new seed)</button>
  </div>

  <div id="ppd-canvas-wrap">
    <canvas id="ppd-canvas" width="900" height="480" role="img" aria-label="Periodic pipe dream on a cylinder, drawn flat with colored pipes continuing across the seam"></canvas>
  </div>

  <div id="ppd-zoom">
    <button id="ppd-zoom-out" aria-label="Zoom out">&minus;</button>
    <span id="ppd-zoom-level" role="status" aria-live="polite">100%</span>
    <button id="ppd-zoom-in" aria-label="Zoom in">+</button>
    <button id="ppd-zoom-reset">Reset</button>
    <span class="ppd-hint">Scroll to zoom, drag to pan</span>
  </div>

  <div id="ppd-message" role="status" aria-live="polite"></div>

  <h4 style="margin-top: 22px;">Affine permuton</h4>

  <div class="ppd-controls ppd-view-toggle">
    <button id="ppd-view-torus" class="active">Torus</button>
    <button id="ppd-view-lifted">Lifted (siteswap)</button>
  </div>

  <div class="ppd-plots">
    <canvas id="ppd-permuton" width="520" height="520" role="img" aria-label="Scatter plot of the affine permutation, either on the torus or as a displacement profile"></canvas>
    <canvas id="ppd-hist" width="340" height="520" role="img" aria-label="Histogram of scaled displacements of the affine permutation"></canvas>
  </div>

  <div id="ppd-stats">
    <h4>Statistics</h4>
    <div id="ppd-stats-body"><p>Generating&hellip;</p></div>
    <div id="ppd-window-wrap" style="display:none;">
      <h4 style="margin-top: 14px;">Window notation and siteswap</h4>
      <div id="ppd-window">-</div>
    </div>
  </div>
</div>

<script>
(function () {
  'use strict';

  // ---------- random ----------
  function hsvToRgb(h, s, v) {
    var c = v * s;
    var x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    var m = v - c;
    var r, g, b;
    switch (Math.floor(h * 6) % 6) {
      case 0: r = c; g = x; b = 0; break;
      case 1: r = x; g = c; b = 0; break;
      case 2: r = 0; g = c; b = x; break;
      case 3: r = 0; g = x; b = c; break;
      case 4: r = x; g = 0; b = c; break;
      default: r = c; g = 0; b = x; break;
    }
    return 'rgb(' + Math.round((r + m) * 255) + ',' + Math.round((g + m) * 255) + ',' + Math.round((b + m) * 255) + ')';
  }

  var colorCache = null, colorCacheN = -1;
  function pipeColor(label, n) {
    if (colorCacheN !== n) {
      colorCache = new Array(n);
      for (var j = 0; j < n; j++) colorCache[j] = hsvToRgb(((j * 7) % n) / n, 0.85, 0.85);
      colorCacheN = n;
    }
    var r = label % n;
    if (r < 0) r += n;
    return colorCache[r];
  }

  // ---------- sampler ----------
  // Tiles: 0 = elbow, 1 = cross, 2 = cross forced to an elbow by reduction.
  // State u[c] = label of the pipe sitting on the vertical edge at position c.
  // A row sends the pipe at each elbow position to the next elbow position on
  // the cycle, and leaves the pipes at cross positions where they are.
  // The per-cell arrays are only consumed by the drawing code, so above the
  // drawing threshold they are not allocated at all.
  function samplePPD(n, k, p, q, seed, keepDiagram) {
    // The mulberry32 state is held in a local and compared against an integer
    // threshold: this loop runs n*k times, and a closure-allocated generator
    // returning floats costs about twenty times as much per call.
    var rs = (seed | 0);
    var thresh = p >= 1 ? 4294967296 : Math.floor(p * 4294967296);
    var qThresh = q >= 1 ? 4294967296 : Math.floor(q * 4294967296);
    // Only the tiles are stored. The pipe labels are a deterministic function
    // of the tiles, so the drawing code replays them instead of paying eight
    // bytes per cell to remember them.
    var cells = keepDiagram ? new Uint8Array(n * k) : null;
    var u = new Int32Array(n);
    var t = new Int32Array(n);
    var row = new Uint8Array(n);
    var crossings = 0, forced = 0, resampledRows = 0;
    var c, i;

    for (c = 0; c < n; c++) u[c] = c;

    for (var r = 0; r < k; r++) {
      // sample the row, conditioned on containing at least one elbow
      var e0 = -1, attempts = 0, z;
      for (;;) {
        e0 = -1;
        for (c = 0; c < n; c++) {
          rs = (rs + 0x6D2B79F5) | 0;
          z = Math.imul(rs ^ (rs >>> 15), 1 | rs);
          z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
          var isCross = ((z ^ (z >>> 14)) >>> 0) < thresh ? 1 : 0;
          row[c] = isCross;
          if (!isCross && e0 < 0) e0 = c;
        }
        if (e0 >= 0) break;
        resampledRows++;
        if (++attempts >= 100) {
          // p is numerically 1, so rejection would never terminate. The
          // conditional law degenerates as p -> 1 to a single elbow at a
          // uniform position; use that.
          rs = (rs + 0x6D2B79F5) | 0;
          z = Math.imul(rs ^ (rs >>> 15), 1 | rs);
          z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
          e0 = ((z ^ (z >>> 14)) >>> 0) % n;
          row[e0] = 0;
          break;
        }
      }

      var base = r * n;
      var hcur = u[e0];
      for (var step = 1; step <= n; step++) {
        var idx = e0 + step;
        var w = 0;
        if (idx >= n) { idx -= n; w = n; }
        c = idx;
        var b = u[c] + w;
        var tile;
        if (row[c] === 1) {
          // Pipes that have not met yet always cross. Pipes that have already
          // crossed re-cross with probability q, so q = 0 is the Demazure
          // product and q = 1 leaves the sampled tiling untouched.
          var uncross = false;
          if (hcur >= b) {
            if (qThresh === 0) {
              uncross = true;
            } else {
              rs = (rs + 0x6D2B79F5) | 0;
              z = Math.imul(rs ^ (rs >>> 15), 1 | rs);
              z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
              uncross = ((z ^ (z >>> 14)) >>> 0) >= qThresh;
            }
          }
          if (uncross) {
            tile = 2;
            forced++;
            t[c] = hcur - w;
            hcur = b;
          } else {
            tile = 1;
            crossings++;
            t[c] = b - w;
          }
        } else {
          tile = 0;
          t[c] = hcur - w;
          hcur = b;
        }
        if (keepDiagram) cells[base + c] = tile;
      }
      for (c = 0; c < n; c++) u[c] = t[c];
    }

    // f on the window of residues, and the displacements
    var fWin = new Int32Array(n);
    var disp = new Int32Array(n);
    for (c = 0; c < n; c++) {
      var lab = u[c];
      var res = lab % n;
      if (res < 0) res += n;
      fWin[res] = c + (res - lab);
      disp[res] = c - lab;
    }

    var dispSum = 0;
    for (i = 0; i < n; i++) dispSum += disp[i];

    return {
      n: n, k: k, p: p, q: q,
      cells: cells, hasDiagram: !!keepDiagram,
      uTop: u, fWin: fWin, disp: disp,
      crossings: crossings, forced: forced,
      resampledRows: resampledRows, dispSum: dispSum
    };
  }

  // ---------- elements ----------
  var elN = document.getElementById('ppd-n');
  var elK = document.getElementById('ppd-k');
  var elP = document.getElementById('ppd-p');
  var elQ = document.getElementById('ppd-q');
  var elSeed = document.getElementById('ppd-seed');
  var elShowPipes = document.getElementById('ppd-show-pipes');
  var elShowGrid = document.getElementById('ppd-show-grid');
  var elShowForced = document.getElementById('ppd-show-forced');
  var elPeriods = document.getElementById('ppd-periods');
  var elGenerate = document.getElementById('ppd-generate');
  var elResample = document.getElementById('ppd-resample');
  var elMessage = document.getElementById('ppd-message');
  var elStats = document.getElementById('ppd-stats-body');
  var elWindowWrap = document.getElementById('ppd-window-wrap');
  var elWindow = document.getElementById('ppd-window');

  var canvas = document.getElementById('ppd-canvas');
  var ctx = canvas.getContext('2d');
  var permCanvas = document.getElementById('ppd-permuton');
  var permCtx = permCanvas.getContext('2d');
  var histCanvas = document.getElementById('ppd-hist');
  var histCtx = histCanvas.getContext('2d');

  var btnTorus = document.getElementById('ppd-view-torus');
  var btnLifted = document.getElementById('ppd-view-lifted');
  var btnZoomIn = document.getElementById('ppd-zoom-in');
  var btnZoomOut = document.getElementById('ppd-zoom-out');
  var btnZoomReset = document.getElementById('ppd-zoom-reset');
  var elZoomLevel = document.getElementById('ppd-zoom-level');

  // Logical (CSS-pixel) sizes; the backing stores are DPR times larger, so that
  // single-pixel dots stay solid instead of being smeared by antialiasing.
  var DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  var DW = 900, DH = 480;
  var PW = 520, PH = 520;
  var HW = 340, HH = 520;

  function setupCanvas(cv, cx, w, h, setInlineWidth) {
    cv.width = Math.round(w * DPR);
    cv.height = Math.round(h * DPR);
    if (setInlineWidth) cv.style.width = w + 'px';   // height follows from CSS height:auto
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  setupCanvas(canvas, ctx, DW, DH, false);
  setupCanvas(permCanvas, permCtx, PW, PH, true);
  setupCanvas(histCanvas, histCtx, HW, HH, true);

  var PPD_EXACT_TILES = 60000;      // tiles repainted every frame, crisp at any zoom
  var MAX_DIAGRAM_CELLS = 1500000;  // tiles retained, and the largest cache render
  var PPD_CACHE_MAX_PX = 4096;      // longest side of the offscreen cache

  var data = null;
  var permView = 'torus';
  var zoom = 1, panX = 0, panY = 0;
  var cacheCanvas = null, cacheKey = '';
  var stampCounter = 0;

  // ---------- transform for the pipe dream ----------
  function worldSize() {
    var periods = parseInt(elPeriods.value, 10) || 1;
    return { w: data.n * periods, h: data.k, periods: periods };
  }

  // A fixed canvas height letterboxes wide cylinders, so the height follows the
  // aspect ratio of the periods currently drawn.
  function fitCanvasHeight() {
    if (!data) return;
    var ws = worldSize();
    DH = Math.max(200, Math.min(620, Math.round(DW * ws.h / ws.w)));
    setupCanvas(canvas, ctx, DW, DH, false);
  }

  function transform() {
    if (!data) return { scale: 1, ox: 0, oy: 0 };
    var ws = worldSize();
    var baseScale = Math.min(DW / ws.w, DH / ws.h) * 0.95;
    var scale = baseScale * zoom;
    return {
      scale: scale,
      ox: DW / 2 - (ws.w / 2 - panX) * scale,
      oy: DH / 2 - (ws.h / 2 - panY) * scale
    };
  }

  function zoomAt(cx, cy, factor) {
    if (!data) return;
    var tr = transform();
    var wx = (cx - tr.ox) / tr.scale;
    var wy = (cy - tr.oy) / tr.scale;
    zoom = Math.max(0.2, Math.min(60, zoom * factor));
    var ws = worldSize();
    var tr2 = transform();
    panX = -(wx - (cx - DW / 2) / tr2.scale - ws.w / 2);
    panY = -(wy - (cy - DH / 2) / tr2.scale - ws.h / 2);
    elZoomLevel.textContent = Math.round(zoom * 100) + '%';
    drawPipeDream();
  }

  function resetView() {
    zoom = 1; panX = 0; panY = 0;
    elZoomLevel.textContent = '100%';
    drawPipeDream();
  }

  // ---------- pipe dream drawing ----------
  // One period is painted in world coordinates, one cell to the unit square, so
  // that the same routine serves both the exact per-frame path and the
  // offscreen cache. Segments are accumulated into one path per pipe colour and
  // stroked once, which is what keeps large diagrams affordable.
  function paintTiles(cx, pxPerCell) {
    var n = data.n, k = data.k, cells = data.cells;
    var r, c, base, step, idx, w, Y;

    if (elShowForced.checked) {
      cx.fillStyle = '#d8d8d8';
      for (r = 0; r < k; r++) {
        base = r * n;
        Y = k - 1 - r;
        for (c = 0; c < n; c++) if (cells[base + c] === 2) cx.fillRect(c, Y, 1, 1);
      }
    }

    if (elShowGrid.checked && pxPerCell > 3) {
      cx.strokeStyle = '#e2e2e2';
      cx.lineWidth = 1 / pxPerCell;
      cx.beginPath();
      for (r = 0; r <= k; r++) { cx.moveTo(0, r); cx.lineTo(n, r); }
      for (c = 0; c <= n; c++) { cx.moveTo(c, 0); cx.lineTo(c, k); }
      cx.stroke();
    }

    if (!elShowPipes.checked) return;

    var simple = pxPerCell < 4.5;      // straight elbows once the curve cannot be seen
    var paths = new Array(n);
    var u = new Int32Array(n), t = new Int32Array(n), swap;
    for (c = 0; c < n; c++) u[c] = c;

    function pathFor(label) {
      var j = label % n;
      if (j < 0) j += n;
      var pth = paths[j];
      if (!pth) { pth = new Path2D(); paths[j] = pth; }
      return pth;
    }

    // Replay of the row operator, identical to the one used when sampling.
    for (r = 0; r < k; r++) {
      base = r * n;
      Y = k - 1 - r;
      var top = Y, bot = Y + 1, cy = Y + 0.5;
      var e0 = -1;
      for (c = 0; c < n; c++) if (cells[base + c] !== 1) { e0 = c; break; }
      var hcur = u[e0];
      for (step = 1; step <= n; step++) {
        idx = e0 + step; w = 0;
        if (idx >= n) { idx -= n; w = n; }
        c = idx;
        var left = c, right = c + 1, mid = c + 0.5;
        var ph = pathFor(hcur), pv = pathFor(u[c]);
        if (cells[base + c] === 1) {
          ph.moveTo(left, cy); ph.lineTo(right, cy);
          pv.moveTo(mid, bot); pv.lineTo(mid, top);
          t[c] = u[c];
        } else {
          if (simple) {
            ph.moveTo(left, cy); ph.lineTo(mid, cy); ph.lineTo(mid, top);
            pv.moveTo(mid, bot); pv.lineTo(mid, cy); pv.lineTo(right, cy);
          } else {
            ph.moveTo(left, cy); ph.quadraticCurveTo(mid, cy, mid, top);
            pv.moveTo(mid, bot); pv.quadraticCurveTo(mid, cy, right, cy);
          }
          t[c] = hcur - w;
          hcur = u[c] + w;
        }
      }
      swap = u; u = t; t = swap;
    }

    cx.lineWidth = Math.max(0.13, 1.05 / pxPerCell);
    cx.lineCap = simple ? 'butt' : 'round';
    cx.lineJoin = 'round';
    for (var j = 0; j < n; j++) {
      if (!paths[j]) continue;
      cx.strokeStyle = pipeColor(j, n);
      cx.stroke(paths[j]);
    }
  }

  // Offscreen copy of one period, rendered at a bounded resolution and then
  // blitted under the current zoom, so panning never repaints the tiles.
  function renderCache() {
    var n = data.n, k = data.k;
    var key = n + '|' + k + '|' + data.stamp + '|' +
      (elShowPipes.checked ? 1 : 0) + (elShowGrid.checked ? 1 : 0) + (elShowForced.checked ? 1 : 0);
    if (cacheCanvas && cacheKey === key) return;

    var s = Math.min(2, PPD_CACHE_MAX_PX / Math.max(n, k));
    var cw = Math.max(1, Math.round(n * s)), ch = Math.max(1, Math.round(k * s));
    var surf = document.createElement('canvas');
    surf.width = cw; surf.height = ch;
    var cx = surf.getContext('2d');
    cx.fillStyle = '#ffffff';
    cx.fillRect(0, 0, cw, ch);
    cx.setTransform(cw / n, 0, 0, ch / k, 0, 0);
    paintTiles(cx, cw / n);
    cacheCanvas = surf;
    cacheKey = key;
  }

  function drawPipeDream() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, DW, DH);
    if (!data) return;

    var n = data.n, k = data.k;
    var ws = worldSize();
    var tr = transform();
    var q;

    if (!data.hasDiagram) {
      ctx.fillStyle = '#555';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Pipe dream too large to draw (' + n + ' × ' + k + ').', DW / 2, DH / 2 - 10);
      ctx.fillText('The permuton below is still computed.', DW / 2, DH / 2 + 14);
      ctx.textAlign = 'left';
      return;
    }

    if (n * k * ws.periods <= PPD_EXACT_TILES) {
      for (q = 0; q < ws.periods; q++) {
        ctx.save();
        ctx.translate(tr.ox + q * n * tr.scale, tr.oy);
        ctx.scale(tr.scale, tr.scale);
        paintTiles(ctx, tr.scale);
        ctx.restore();
      }
    } else {
      renderCache();
      ctx.imageSmoothingEnabled = false;
      for (q = 0; q < ws.periods; q++) {
        ctx.drawImage(cacheCanvas, tr.ox + q * n * tr.scale, tr.oy, n * tr.scale, k * tr.scale);
      }
      ctx.imageSmoothingEnabled = true;
    }

    // seams between consecutive periods
    ctx.save();
    ctx.strokeStyle = '#232D4B';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    for (q = 0; q <= ws.periods; q++) {
      ctx.moveTo(tr.ox + q * n * tr.scale, tr.oy);
      ctx.lineTo(tr.ox + q * n * tr.scale, tr.oy + k * tr.scale);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- permuton drawing ----------
  // Dots are painted as solid blocks of device pixels with the transform reset:
  // a sub-pixel arc gets antialiased across four pixels and reads as pale gray.
  function dotPainter(cx) {
    var size = 1, half = 0;
    return {
      begin: function (n, maxCss) {
        size = Math.max(1, Math.round(Math.min(maxCss, 150 / n) * DPR));
        half = size >> 1;
        cx.save();
        cx.setTransform(1, 0, 0, 1, 0, 0);
        cx.fillStyle = '#00204E';
      },
      at: function (x, y) {
        cx.fillRect(Math.round(x * DPR) - half, Math.round(y * DPR) - half, size, size);
      },
      end: function () { cx.restore(); }
    };
  }

  function drawPermuton() {
    var W = PW, H = PH;
    permCtx.fillStyle = '#ffffff';
    permCtx.fillRect(0, 0, W, H);
    if (!data) return;

    var n = data.n, k = data.k;
    var m = 42;                       // margin
    var S = Math.min(W, H) - 2 * m;   // plot side
    var i, x, y;

    permCtx.strokeStyle = '#bbbbbb';
    permCtx.lineWidth = 1;
    permCtx.strokeRect(m, m, S, S);

    permCtx.fillStyle = '#444';
    permCtx.font = '12px sans-serif';

    if (permView === 'torus') {
      // 2x2 copies of the fundamental domain: (i mod n, f(i) mod n)
      var half = S / 2;
      permCtx.strokeStyle = '#dddddd';
      permCtx.beginPath();
      permCtx.moveTo(m + half, m); permCtx.lineTo(m + half, m + S);
      permCtx.moveTo(m, m + half); permCtx.lineTo(m + S, m + half);
      permCtx.stroke();

      var dot = dotPainter(permCtx);
      dot.begin(n, 3.2);
      for (i = 0; i < n; i++) {
        var py = (data.fWin[i] % n + n) % n;   // vertical coordinate: position on the top boundary
        var xa = m + (i + 0.5) / n * half;
        var ya = m + (py + 0.5) / n * half;
        for (var dx = 0; dx <= 1; dx++) {
          for (var dy = 0; dy <= 1; dy++) dot.at(xa + dx * half, ya + dy * half);
        }
      }
      dot.end();

      permCtx.fillStyle = '#444';
      permCtx.textAlign = 'center';
      permCtx.fillText('i / n   (two periods)', m + S / 2, m + S + 26);
      permCtx.save();
      permCtx.translate(16, m + S / 2);
      permCtx.rotate(-Math.PI / 2);
      permCtx.fillText('f(i) / n   (mod 1)', 0, 0);
      permCtx.restore();
      permCtx.textAlign = 'left';
    } else {
      // lifted view: (i/n, (f(i)-i)/n) with y upward
      var dmax = 0;
      for (i = 0; i < n; i++) if (data.disp[i] > dmax) dmax = data.disp[i];
      var yTop = Math.max(1e-9, dmax / n) * 1.08;

      // reference line at alpha = k/n
      var alpha = k / n;
      if (alpha <= yTop) {
        var ay = m + S - (alpha / yTop) * S;
        permCtx.strokeStyle = '#e57200';
        permCtx.lineWidth = 1.5;
        permCtx.setLineDash([5, 4]);
        permCtx.beginPath();
        permCtx.moveTo(m, ay); permCtx.lineTo(m + S, ay);
        permCtx.stroke();
        permCtx.setLineDash([]);
        permCtx.fillStyle = '#e57200';
        permCtx.fillText('α = k/n = ' + alpha.toFixed(3), m + 6, ay - 5);
      }

      var dot2 = dotPainter(permCtx);
      dot2.begin(n, 3.2);
      for (i = 0; i < n; i++) {
        x = m + (i + 0.5) / n * S;
        y = m + S - (data.disp[i] / n / yTop) * S;
        dot2.at(x, y);
      }
      dot2.end();

      permCtx.fillStyle = '#444';
      permCtx.textAlign = 'center';
      permCtx.fillText('i / n', m + S / 2, m + S + 26);
      permCtx.textAlign = 'right';
      permCtx.fillText('0', m - 6, m + S + 4);
      permCtx.fillText(yTop.toFixed(2), m - 6, m + 10);
      permCtx.save();
      permCtx.translate(16, m + S / 2);
      permCtx.rotate(-Math.PI / 2);
      permCtx.textAlign = 'center';
      permCtx.fillText('( f(i) - i ) / n', 0, 0);
      permCtx.restore();
      permCtx.textAlign = 'left';
    }
  }

  function drawHistogram() {
    var W = HW, H = HH;
    histCtx.fillStyle = '#ffffff';
    histCtx.fillRect(0, 0, W, H);
    if (!data) return;

    var n = data.n;
    var ml = 52, mr = 16, mt = 42, mb = 46;
    var pw = W - ml - mr, ph = H - mt - mb;
    var i;

    var dmax = 0;
    for (i = 0; i < n; i++) if (data.disp[i] > dmax) dmax = data.disp[i];
    var hi = Math.max(1e-9, (dmax / n) * 1.08);

    var nb = Math.max(8, Math.min(60, Math.round(Math.sqrt(n) * 2)));
    var bins = new Float64Array(nb);
    for (i = 0; i < n; i++) {
      var b = Math.floor((data.disp[i] / n) / hi * nb);
      if (b >= nb) b = nb - 1;
      if (b < 0) b = 0;
      bins[b]++;
    }
    var bmax = 0;
    for (i = 0; i < nb; i++) if (bins[i] > bmax) bmax = bins[i];
    if (bmax === 0) bmax = 1;

    histCtx.fillStyle = '#232D4B';
    for (i = 0; i < nb; i++) {
      var bh = (bins[i] / bmax) * pw;
      var y0 = mt + ph - (i + 1) / nb * ph;
      var hh = ph / nb;
      histCtx.fillRect(ml, y0, bh, Math.max(1, hh - 1));
    }

    histCtx.strokeStyle = '#bbbbbb';
    histCtx.lineWidth = 1;
    histCtx.beginPath();
    histCtx.moveTo(ml, mt); histCtx.lineTo(ml, mt + ph);
    histCtx.stroke();

    var alpha = data.k / data.n;
    if (alpha <= hi) {
      var ay = mt + ph - (alpha / hi) * ph;
      histCtx.strokeStyle = '#e57200';
      histCtx.lineWidth = 1.5;
      histCtx.setLineDash([5, 4]);
      histCtx.beginPath();
      histCtx.moveTo(ml, ay); histCtx.lineTo(ml + pw, ay);
      histCtx.stroke();
      histCtx.setLineDash([]);
    }

    histCtx.fillStyle = '#444';
    histCtx.font = '12px sans-serif';
    histCtx.textAlign = 'right';
    histCtx.fillText('0', ml - 6, mt + ph + 4);
    histCtx.fillText(hi.toFixed(2), ml - 6, mt + 10);
    histCtx.textAlign = 'left';
    histCtx.fillText('density of ( f(i) - i ) / n', ml - 40, mt - 18);
  }

  // ---------- stats ----------
  function updateStats() {
    if (!data) return;
    var n = data.n, k = data.k, i;
    var total = n * k;

    var mean = 0, dmin = Infinity, dmax = -Infinity;
    for (i = 0; i < n; i++) {
      mean += data.disp[i];
      if (data.disp[i] < dmin) dmin = data.disp[i];
      if (data.disp[i] > dmax) dmax = data.disp[i];
    }
    mean /= n;
    var varc = 0;
    for (i = 0; i < n; i++) varc += (data.disp[i] - mean) * (data.disp[i] - mean);
    var sd = Math.sqrt(varc / n);

    var rows = [
      ['Grid', n + ' × ' + k + ' = ' + total + ' cells, &alpha; = k/n = ' + (k / n).toFixed(4)],
      ['Realized crossings', data.crossings + ' (' + (100 * data.crossings / total).toFixed(2) + '% of cells)' +
        (data.q === 0 ? ' &mdash; equals the affine length &#8467;(f)' : '')],
      ['Crosses undone', data.q >= 1 ? '&mdash; (q = 1, nothing is undone)'
        : (data.forced + ' (' + (100 * data.forced / total).toFixed(2) + '% of cells)')],
      ['&sum; (f(i) &minus; i)', data.dispSum + (data.dispSum === total ? ' = kn ✓' : ' ≠ kn (!)')],
      ['Displacement f(i) &minus; i', 'min ' + dmin + ', mean ' + mean.toFixed(2) + ', max ' + dmax],
      ['Spread', 'sd = ' + sd.toFixed(2) + ',  sd/n = ' + (sd / n).toFixed(4)]
    ];
    if (data.resampledRows > 0) {
      rows.push(['All-cross rows resampled', String(data.resampledRows)]);
    }

    var html = '<table>';
    for (i = 0; i < rows.length; i++) {
      html += '<tr><td><strong>' + rows[i][0] + '</strong></td><td>' + rows[i][1] + '</td></tr>';
    }
    html += '</table>';
    elStats.innerHTML = html;

    if (n <= 40) {
      var win = [], site = [];
      for (i = 0; i < n; i++) {
        win.push(data.fWin[i]);
        site.push(data.disp[i]);
      }
      elWindow.innerHTML =
        'f(0), …, f(' + (n - 1) + ') = [' + win.join(', ') + ']<br>' +
        'siteswap f(i) &minus; i = [' + site.join(', ') + ']';
      elWindowWrap.style.display = '';
    } else {
      elWindowWrap.style.display = 'none';
    }
  }

  // ---------- driver ----------
  function readParams() {
    var n = Math.max(2, Math.min(4000, parseInt(elN.value, 10) || 60));
    var k = Math.max(1, Math.min(4000, parseInt(elK.value, 10) || 30));
    var p = parseFloat(elP.value);
    if (!isFinite(p)) p = 0.5;
    p = Math.max(0, Math.min(1, p));
    var q = parseFloat(elQ.value);
    if (!isFinite(q)) q = 0;
    q = Math.max(0, Math.min(1, q));
    elN.value = n; elK.value = k; elP.value = p; elQ.value = q;
    return { n: n, k: k, p: p, q: q };
  }

  function generate() {
    var par = readParams();
    var seed = parseInt(elSeed.value, 10);
    if (!isFinite(seed)) {
      seed = Math.floor(Math.random() * 2147483647);
      elSeed.value = seed;
    }

    elMessage.textContent = '';
    var keepDiagram = par.n * par.k <= MAX_DIAGRAM_CELLS;
    var t0 = performance.now();
    data = samplePPD(par.n, par.k, par.p, par.q, seed, keepDiagram);
    data.stamp = ++stampCounter;
    cacheCanvas = null;
    var ms = performance.now() - t0;

    if (!keepDiagram) {
      elMessage.textContent = 'Pipe dream not drawn at this size; the permuton and statistics below use the full ' +
        par.n + ' × ' + par.k + ' configuration.';
    } else if (ms > 250) {
      elMessage.textContent = 'Sampled in ' + Math.round(ms) + ' ms.';
    }

    fitCanvasHeight();
    resetView();
    drawPermuton();
    drawHistogram();
    updateStats();
  }

  function resample() {
    elSeed.value = Math.floor(Math.random() * 2147483647);
    generate();
  }

  elGenerate.addEventListener('click', generate);
  elResample.addEventListener('click', resample);
  elP.addEventListener('change', generate);
  elQ.addEventListener('change', generate);
  [elN, elK, elSeed].forEach(function (el) {
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') generate(); });
  });
  [elShowPipes, elShowGrid, elShowForced, elPeriods].forEach(function (el) {
    el.addEventListener('change', function () { fitCanvasHeight(); drawPipeDream(); });
  });

  btnTorus.addEventListener('click', function () {
    permView = 'torus';
    btnTorus.classList.add('active'); btnLifted.classList.remove('active');
    drawPermuton();
  });
  btnLifted.addEventListener('click', function () {
    permView = 'lifted';
    btnLifted.classList.add('active'); btnTorus.classList.remove('active');
    drawPermuton();
  });

  btnZoomIn.addEventListener('click', function () { zoomAt(DW / 2, DH / 2, 1.25); });
  btnZoomOut.addEventListener('click', function () { zoomAt(DW / 2, DH / 2, 0.8); });
  btnZoomReset.addEventListener('click', resetView);

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    zoomAt((e.clientX - rect.left) * (DW / rect.width),
           (e.clientY - rect.top) * (DH / rect.height),
           e.deltaY > 0 ? 0.9 : 1.1);
  }, { passive: false });

  var dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('mousedown', function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
  });
  document.addEventListener('mousemove', function (e) {
    if (!dragging || !data) return;
    var rect = canvas.getBoundingClientRect();
    var tr = transform();
    panX += (e.clientX - lastX) * (DW / rect.width) / tr.scale;
    panY += (e.clientY - lastY) * (DH / rect.height) / tr.scale;
    lastX = e.clientX; lastY = e.clientY;
    drawPipeDream();
  });
  document.addEventListener('mouseup', function () { dragging = false; });

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) {
      dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    if (!dragging || e.touches.length !== 1 || !data) return;
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var tr = transform();
    panX += (e.touches[0].clientX - lastX) * (DW / rect.width) / tr.scale;
    panY += (e.touches[0].clientY - lastY) * (DH / rect.height) / tr.scale;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    drawPipeDream();
  }, { passive: false });
  canvas.addEventListener('touchend', function () { dragging = false; });

  window.addEventListener('resize', function () { if (data) drawPipeDream(); });

  generate();
})();
</script>
