---
title: Vertical-Horizontal Interlacing Explorer
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2026-04-01-vertical-horizontal-interlacing.md'
    txt: 'Pure JavaScript RSK interlacing explorer'
a11y-description: "Interactive explorer for the RSK-style transition between partitions represented as particle configurations on a diagonal lattice. Set two partitions lambda-top and lambda-bottom, enumerate valid intermediate partitions mu, see forced vs free particles, and compute the output partition nu."
---

<style>
.int-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.int-row label { font-size: 13px; min-width: 70px; }
.int-row input[type=number] { width: 50px; }
.int-row input[type=text] { width: 120px; font-family: monospace; }
.int-canvas { width: 100%; border: 1px solid #ccc; background: #fafafa; cursor: pointer; }
.mu-nav { display: flex; align-items: center; gap: 6px; margin: 8px 0; }
.mu-nav button { padding: 2px 10px; }
.mu-nav .mu-label { font-weight: bold; font-size: 14px; min-width: 140px; text-align: center; }
.panel-label { font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin: 10px 0 4px 0; }
.info-line { font-size: 12px; color: #555; margin: 2px 0; font-family: monospace; }
.forced-legend { display: inline-flex; align-items: center; gap: 12px; font-size: 12px; margin: 4px 0; }
.forced-legend span { display: inline-flex; align-items: center; gap: 3px; }
</style>

<div class="int-row">
  <label>Lattice N:</label>
  <input id="lattice-n" type="number" value="5" min="2" max="15">
  <label style="margin-left:12px;">Particles k:</label>
  <input id="particle-k" type="number" value="2" min="1" max="15">
</div>

<div class="int-row">
  <label>λ<sup>top</sup>:</label>
  <input id="lam-top-input" type="text" value="(2,1)" placeholder="(2,1)">
  <span id="lam-top-info" class="info-line"></span>
</div>

<div class="int-row">
  <label>λ<sup>bot</sup>:</label>
  <input id="lam-bot-input" type="text" value="(2,1,1)">
  <span id="lam-bot-info" class="info-line"></span>
</div>

<div class="panel-label">Before: λ<sup>top</sup>/μ vertical strip, μ/λ<sup>bot</sup> horizontal strip</div>

<canvas id="before-canvas" class="int-canvas" style="height: 280px;" role="img" aria-label="Before: particle configurations with dominos on diagonal lattice"></canvas>

<div class="mu-nav">
  <button id="mu-prev">← Prev</button>
  <span id="mu-label" class="mu-label">μ = ∅</span>
  <button id="mu-next">Next →</button>
  <span id="mu-count" class="info-line"></span>
</div>

<div class="forced-legend">
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#FF8C00"/></svg> free</span>
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#FF8C00" stroke="#c00" stroke-width="2"/></svg> forced particle</span>
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="#c00" stroke-width="2"/></svg> forced hole</span>
</div>

<div class="panel-label">After: ν/λ<sup>bot</sup> vertical strip, λ<sup>top</sup>/ν horizontal strip</div>

<canvas id="after-canvas" class="int-canvas" style="height: 280px;" role="img" aria-label="After: particle configurations with dominos on diagonal lattice"></canvas>

<div class="mu-nav">
  <button id="nu-prev">← Prev</button>
  <span id="nu-label" class="mu-label">ν = ∅</span>
  <button id="nu-next">Next →</button>
  <span id="nu-count" class="info-line"></span>
</div>

<div class="forced-legend">
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#228B22"/></svg> free</span>
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#228B22" stroke="#c00" stroke-width="2"/></svg> forced particle</span>
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="#c00" stroke-width="2"/></svg> forced hole</span>
</div>

<script>
(function() {
  // ═══════════════════════════════════════════════════════════════
  // MATH
  // ═══════════════════════════════════════════════════════════════

  // Standard convention (internal, for strip checks):
  // k particles at s_1 < ... < s_k → λ_i = s_{k+1-i} - (k+1-i)
  function particlesToPartition(positions) {
    const k = positions.length;
    if (k === 0) return [];
    const sorted = [...positions].sort((a, b) => a - b);
    const parts = [];
    for (let i = 1; i <= k; i++) parts.push(sorted[k - i] - (k + 1 - i));
    while (parts.length > 0 && parts[parts.length - 1] === 0) parts.pop();
    return parts;
  }

  function partitionToParticles(partition, k) {
    const parts = [];
    for (let i = 0; i < k; i++) parts.push(partition[i] || 0);
    const positions = [];
    for (let i = 1; i <= k; i++) positions.push(parts[k - i] + i);
    return positions.sort((a, b) => a - b);
  }

  // Display convention: count holes to the RIGHT of each particle, listed left→right
  // k particles at s_1 < ... < s_k on latticeN positions → part_i = (latticeN - s_i) - (k - 1 - i)
  function positionsToDisplayPart(positions, latticeN) {
    const k = positions.length;
    if (k === 0) return [];
    const sorted = [...positions].sort((a, b) => a - b);
    const parts = [];
    for (let i = 0; i < k; i++) parts.push(latticeN - sorted[i] - (k - 1 - i));
    while (parts.length > 0 && parts[parts.length - 1] === 0) parts.pop();
    return parts;
  }

  // Parse display-convention partition → positions
  function displayPartToPositions(parts, k, latticeN) {
    const p = [];
    for (let i = 0; i < k; i++) p.push(parts[i] || 0);
    const positions = [];
    for (let i = 0; i < k; i++) positions.push(latticeN - p[i] - (k - 1 - i));
    return positions.sort((a, b) => a - b);
  }

  function fmtDisplay(positions, latticeN) {
    const parts = positionsToDisplayPart(positions, latticeN);
    return parts.length === 0 ? '∅' : '(' + parts.join(',') + ')';
  }

  function isVerticalStrip(lambda, mu) {
    const len = Math.max(lambda.length, mu.length);
    for (let i = 0; i < len; i++) {
      const d = (lambda[i] || 0) - (mu[i] || 0);
      if (d < 0 || d > 1) return false;
    }
    return true;
  }

  function isHorizontalStrip(lambda, mu) {
    const len = Math.max(lambda.length, mu.length);
    for (let i = 0; i < len; i++) {
      if ((lambda[i] || 0) < (mu[i] || 0)) return false;
      if ((mu[i] || 0) < (lambda[i + 1] || 0)) return false;
    }
    return true;
  }

  function enumerateMu(lamTop, lamBot, k, N) {
    const numPos = N - 1;
    if (numPos < k || k < 0) return [];
    const results = [];
    function gen(start, chosen) {
      if (chosen.length === k) {
        const mu = particlesToPartition(chosen);
        if (isVerticalStrip(lamTop, mu) && isHorizontalStrip(lamBot, mu)) {
          results.push({ particles: [...chosen], partition: mu });
        }
        return;
      }
      const rem = k - chosen.length;
      for (let p = start; p <= numPos - rem + 1; p++) {
        chosen.push(p);
        gen(p + 1, chosen);
        chosen.pop();
      }
    }
    gen(1, []);
    return results;
  }

  // Enumerate all valid ν: (k+1) particles on (N+1) positions
  // ν/λ_bot vertical strip, λ_top/ν horizontal strip
  function enumerateNu(lamTop, lamBot, k, N) {
    const kNu = k + 1;
    const numPos = N + 1;
    if (kNu < 0 || numPos < kNu) return [];
    const results = [];
    function gen(start, chosen) {
      if (chosen.length === kNu) {
        const nu = particlesToPartition(chosen);
        if (isVerticalStrip(nu, lamBot) && isHorizontalStrip(lamTop, nu)) {
          results.push({ particles: [...chosen], partition: nu });
        }
        return;
      }
      const rem = kNu - chosen.length;
      for (let p = start; p <= numPos - rem + 1; p++) {
        chosen.push(p);
        gen(p + 1, chosen);
        chosen.pop();
      }
    }
    gen(1, []);
    return results;
  }

  function sum(a) { return a.reduce((s, v) => s + v, 0); }

  // Compute forced/free for a list of particle configs on numPos positions
  function computeForcedFree(allConfigs, numPos) {
    if (allConfigs.length === 0) return { forced: new Set(), free: new Set(), forcedHoles: new Set() };
    const counts = new Array(numPos + 1).fill(0);
    allConfigs.forEach(m => m.particles.forEach(p => counts[p]++));
    const total = allConfigs.length;
    const forced = new Set(), forcedHoles = new Set(), free = new Set();
    for (let p = 1; p <= numPos; p++) {
      if (counts[p] === total) forced.add(p);
      else if (counts[p] === 0) forcedHoles.add(p);
      else free.add(p);
    }
    return { forced, free, forcedHoles };
  }

  // Compute non-crossing matching between μ positions and λ positions
  // midSet = set of μ positions to match (particles or holes)
  // outerSet = set of λ positions that can be matched
  // Each μ[j] can connect to λ[j] or λ[j+1]
  function computeMatching(midSet, outerSet, nMid) {
    const used = new Set();
    const pairs = [];
    for (let j = 1; j <= nMid; j++) {
      if (!midSet.has(j)) continue;
      if (outerSet.has(j) && !used.has(j)) {
        pairs.push({ outer: j, mid: j });
        used.add(j);
      } else if (outerSet.has(j + 1) && !used.has(j + 1)) {
        pairs.push({ outer: j + 1, mid: j });
        used.add(j + 1);
      }
    }
    return pairs;
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE — positions are the primary state, partitions derived
  // ═══════════════════════════════════════════════════════════════

  let N = 5;
  let lamTopPos = new Set([2, 4]);      // display: (2,1), k=2
  let lamBotPos = new Set([1, 3, 4]);   // display: (2,1,1), k+1=3
  let allMu = [], muIndex = 0;
  let allNu = [], nuIndex = 0;
  let muForcedInfo = { forced: new Set(), free: new Set(), forcedHoles: new Set() };
  let nuForcedInfo = { forced: new Set(), free: new Set(), forcedHoles: new Set() };

  // Derived from positions
  function getK() { return lamTopPos.size; }
  function getLamTopPart() { return lamTopPos.size > 0 ? particlesToPartition([...lamTopPos]) : []; }
  function getLamBotPart() { return lamBotPos.size > 0 ? particlesToPartition([...lamBotPos]) : []; }

  // ═══════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════

  const GREEN = '#228B22';
  const ORANGE = '#FF8C00';
  const HOLE_STROKE = '#888';
  const FORCED_RING = '#c00';
  const DOMINO_GREEN = 'rgba(34, 139, 34, 0.20)';
  const DOMINO_GRAY = 'rgba(140, 140, 140, 0.18)';
  const DOMINO_EDGE = 'rgba(0,0,0,0.35)';

  const beforeCanvas = document.getElementById('before-canvas');
  const afterCanvas = document.getElementById('after-canvas');

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  // Diagonal lattice layout
  // Position j (1-indexed) in a row of size n:
  //   λ rows: x = (2*(j-1)) * u,  y = rowY
  //   μ rows (N-1): x = (2*(j-1)+1) * u,  y = rowY  (offset by u)
  //   ν rows (N+1): x = (2*(j-1)-1) * u,  y = rowY  (protrudes)
  function computeLayout(canvasW, canvasH, nTop, nMid, nBot) {
    // Compute max x extent across all rows
    function maxX(n, isOffset) {
      if (n === 0) return 0;
      if (isOffset === 0) return 2 * (n - 1);      // λ type: 0, 2, 4, ...
      if (isOffset === 1) return 2 * (n - 1) + 1;   // μ type: 1, 3, 5, ...
      return 2 * (n - 1) - 1;                        // ν type: -1, 1, 3, ...
    }
    function minX(n, isOffset) {
      if (isOffset < 0) return -1;  // ν type protrudes left
      return 0;
    }

    // Determine offsets: which row types
    const topOff = 0, botOff = 0;  // λ rows
    const midOff = (nMid < nTop) ? 1 : (nMid > nTop) ? -1 : 0;

    const allMaxX = Math.max(maxX(nTop, topOff), maxX(nMid, midOff), maxX(nBot, botOff));
    const allMinX = Math.min(minX(nTop, topOff), minX(nMid, midOff), minX(nBot, botOff));
    const spanX = allMaxX - allMinX;

    const margin = 60;
    const u = Math.min((canvasW - 2 * margin) / (spanX + 2), (canvasH - 2 * margin) / 4, 32);
    const radius = u * 0.30;

    const centerX = canvasW / 2;
    const centerY = canvasH / 2;

    // Screen coordinates for position j in row of size n with offset type
    function posX(j, n, offType) {
      let latticeX;
      if (offType === 0) latticeX = 2 * (j - 1);          // λ: 0, 2, 4, ...
      else if (offType === 1) latticeX = 2 * (j - 1) + 1;  // μ: 1, 3, 5, ...
      else latticeX = 2 * (j - 1) - 1;                      // ν: -1, 1, 3, ...
      const midLattice = (allMinX + allMaxX) / 2;
      return centerX + (latticeX - midLattice) * u;
    }

    return {
      u, radius, centerX,
      y0: centerY - u,   // λ_top
      y1: centerY,        // μ or ν (middle row)
      y2: centerY + u,    // λ_bot
      posX,
      topOff, midOff, botOff
    };
  }

  function drawDiamond(ctx, cx, cy, u, fill, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - u);
    ctx.lineTo(cx + u, cy);
    ctx.lineTo(cx, cy + u);
    ctx.lineTo(cx - u, cy);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }

  // Draw a domino = union of two adjacent diamonds (forms a parallelogram)
  // c1 = (cx1, cy1) and c2 = (cx2, cy2) are centers of the two diamonds
  function drawDomino(ctx, cx1, cy1, cx2, cy2, u, fill, stroke) {
    const dx = cx2 - cx1, dy = cy2 - cy1;
    // The parallelogram vertices are the 2 outer vertices of each diamond
    // perpendicular to the connection direction
    let v;
    if (dx > 0 && dy > 0) {
      // Right-down: top-left of d1, top-right of d1/d2 collinear, bot-right of d2, bot-left collinear
      v = [[cx1 - u, cy1], [cx1, cy1 - u], [cx2 + u, cy2], [cx2, cy2 + u]];
    } else if (dx < 0 && dy > 0) {
      // Left-down
      v = [[cx1, cy1 - u], [cx1 + u, cy1], [cx2, cy2 + u], [cx2 - u, cy2]];
    } else if (dx > 0 && dy < 0) {
      // Right-up
      v = [[cx1, cy1 + u], [cx1 - u, cy1], [cx2, cy2 - u], [cx2 + u, cy2]];
    } else {
      // Left-up
      v = [[cx1 + u, cy1], [cx1, cy1 + u], [cx2 - u, cy2], [cx2, cy2 - u]];
    }
    ctx.beginPath();
    ctx.moveTo(v[0][0], v[0][1]);
    ctx.lineTo(v[1][0], v[1][1]);
    ctx.lineTo(v[2][0], v[2][1]);
    ctx.lineTo(v[3][0], v[3][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function drawCircle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
  }


  function renderBefore() {
    const { ctx, w, h } = setupCanvas(beforeCanvas);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    const hasMu = allMu.length > 0;
    const mu = hasMu ? allMu[muIndex] : null;
    const nTop = N, nMid = N - 1, nBot = N;
    const lay = computeLayout(w, h, nTop, nMid, nBot);
    const u = lay.u;

    const topPSet = lamTopPos;
    const botPSet = lamBotPos;
    const muPSet = hasMu ? new Set(mu.particles) : new Set();

    if (hasMu) {
      // Compute holes
      const topHoles = new Set();
      for (let j = 1; j <= nTop; j++) if (!topPSet.has(j)) topHoles.add(j);
      const botHoles = new Set();
      for (let j = 1; j <= nBot; j++) if (!botPSet.has(j)) botHoles.add(j);
      const muHoles = new Set();
      for (let j = 1; j <= nMid; j++) if (!muPSet.has(j)) muHoles.add(j);

      // Compute matchings
      const topMatch = computeMatching(muPSet, topPSet, nMid);
      const botMatch = computeMatching(muHoles, botHoles, nMid);

      // Draw dominos
      topMatch.forEach(p => {
        drawDomino(ctx, lay.posX(p.outer, nTop, 0), lay.y0,
                   lay.posX(p.mid, nMid, 1), lay.y1, u, DOMINO_GREEN, DOMINO_EDGE);
      });
      botMatch.forEach(p => {
        drawDomino(ctx, lay.posX(p.mid, nMid, 1), lay.y1,
                   lay.posX(p.outer, nBot, 0), lay.y2, u, DOMINO_GRAY, DOMINO_EDGE);
      });
    }

    // Always draw λ_top circles
    for (let j = 1; j <= nTop; j++) {
      const x = lay.posX(j, nTop, 0);
      if (topPSet.has(j)) drawCircle(ctx, x, lay.y0, lay.radius, GREEN, null);
      else drawCircle(ctx, x, lay.y0, lay.radius, '#fafafa', HOLE_STROKE, 1.5);
    }
    // Draw μ circles only if valid
    if (hasMu) {
      for (let j = 1; j <= nMid; j++) {
        const x = lay.posX(j, nMid, 1);
        if (muPSet.has(j)) {
          const isF = muForcedInfo.forced.has(j);
          drawCircle(ctx, x, lay.y1, lay.radius, ORANGE, isF ? FORCED_RING : null, isF ? 2.5 : 0);
        } else {
          const isFH = muForcedInfo.forcedHoles.has(j);
          drawCircle(ctx, x, lay.y1, lay.radius, '#fafafa', isFH ? FORCED_RING : HOLE_STROKE, isFH ? 2.5 : 1.5);
        }
      }
    }
    // Always draw λ_bot circles
    for (let j = 1; j <= nBot; j++) {
      const x = lay.posX(j, nBot, 0);
      if (botPSet.has(j)) drawCircle(ctx, x, lay.y2, lay.radius, GREEN, null);
      else drawCircle(ctx, x, lay.y2, lay.radius, '#fafafa', HOLE_STROKE, 1.5);
    }

    // Labels
    ctx.font = 'bold 12px sans-serif'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1a6b2e';
    ctx.fillText('λᵗᵒᵖ', lay.posX(1, nTop, 0) - u - 6, lay.y0);
    if (hasMu) { ctx.fillStyle = '#c06000'; ctx.fillText('μ', lay.posX(1, nMid, 1) - u - 6, lay.y1); }
    ctx.fillStyle = '#1a6b2e';
    ctx.fillText('λᵇᵒᵗ', lay.posX(1, nBot, 0) - u - 6, lay.y2);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a6b2e';
    ctx.fillText(fmtDisplay([...lamTopPos], N), lay.posX(nTop, nTop, 0) + u + 8, lay.y0);
    if (hasMu) { ctx.fillStyle = '#c06000'; ctx.fillText(fmtDisplay(mu.particles, N - 1), lay.posX(nMid, nMid, 1) + u + 8, lay.y1); }
    ctx.fillStyle = '#1a6b2e';
    ctx.fillText(fmtDisplay([...lamBotPos], N), lay.posX(nBot, nBot, 0) + u + 8, lay.y2);

    // "No valid μ" message overlay
    if (!hasMu) {
      ctx.fillStyle = 'rgba(200,0,0,0.7)'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('No valid μ — adjust λ values', w / 2, lay.y1);
    }
  }

  function renderAfter() {
    const { ctx, w, h } = setupCanvas(afterCanvas);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    const hasNu = allNu.length > 0;
    const nu = hasNu ? allNu[nuIndex] : null;
    const nTop = N, nMid = N + 1, nBot = N;
    const lay = computeLayout(w, h, nTop, nMid, nBot);
    const u = lay.u;

    const topPSet = lamTopPos;
    const botPSet = lamBotPos;
    const nuPSet = hasNu ? new Set(nu.particles) : new Set();

    if (hasNu) {
      const topHoles = new Set();
      for (let j = 1; j <= nTop; j++) if (!topPSet.has(j)) topHoles.add(j);
      const nuHoles = new Set();
      for (let j = 1; j <= nMid; j++) if (!nuPSet.has(j)) nuHoles.add(j);

      // Top strip: λ_top ↔ ν — hole dominos (λ_top/ν horizontal strip)
      const topHoleMatch = computeMatchingReverse(topHoles, nuHoles, nTop);
      // Bottom strip: ν ↔ λ_bot — particle dominos (ν/λ_bot vertical strip)
      const botPartMatch = computeMatchingReverse(botPSet, nuPSet, nBot);

      topHoleMatch.forEach(p => {
        drawDomino(ctx, lay.posX(p.mid, nTop, 0), lay.y0,
                   lay.posX(p.outer, nMid, -1), lay.y1, u, DOMINO_GRAY, DOMINO_EDGE);
      });
      botPartMatch.forEach(p => {
        drawDomino(ctx, lay.posX(p.outer, nMid, -1), lay.y1,
                   lay.posX(p.mid, nBot, 0), lay.y2, u, DOMINO_GREEN, DOMINO_EDGE);
      });
    }

    // Always draw λ_top (orange in After)
    for (let j = 1; j <= nTop; j++) {
      const x = lay.posX(j, nTop, 0);
      if (topPSet.has(j)) drawCircle(ctx, x, lay.y0, lay.radius, ORANGE, null);
      else drawCircle(ctx, x, lay.y0, lay.radius, '#fafafa', HOLE_STROKE, 1.5);
    }
    // ν circles (green) with forced/free
    if (hasNu) {
      for (let j = 1; j <= nMid; j++) {
        const x = lay.posX(j, nMid, -1);
        if (nuPSet.has(j)) {
          const isF = nuForcedInfo.forced.has(j);
          drawCircle(ctx, x, lay.y1, lay.radius, GREEN, isF ? FORCED_RING : null, isF ? 2.5 : 0);
        } else {
          const isFH = nuForcedInfo.forcedHoles.has(j);
          drawCircle(ctx, x, lay.y1, lay.radius, '#fafafa', isFH ? FORCED_RING : HOLE_STROKE, isFH ? 2.5 : 1.5);
        }
      }
    }
    // Always draw λ_bot (orange in After)
    for (let j = 1; j <= nBot; j++) {
      const x = lay.posX(j, nBot, 0);
      if (botPSet.has(j)) drawCircle(ctx, x, lay.y2, lay.radius, ORANGE, null);
      else drawCircle(ctx, x, lay.y2, lay.radius, '#fafafa', HOLE_STROKE, 1.5);
    }

    // Labels
    ctx.font = 'bold 12px sans-serif'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#c06000';
    ctx.fillText('λᵗᵒᵖ', lay.posX(1, nTop, 0) - u - 6, lay.y0);
    if (hasNu) { ctx.fillStyle = '#1a6b2e'; ctx.fillText('ν', lay.posX(1, nMid, -1) - u - 6, lay.y1); }
    ctx.fillStyle = '#c06000';
    ctx.fillText('λᵇᵒᵗ', lay.posX(1, nBot, 0) - u - 6, lay.y2);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#c06000';
    ctx.fillText(fmtDisplay([...lamTopPos], N), lay.posX(nTop, nTop, 0) + u + 8, lay.y0);
    if (hasNu) { ctx.fillStyle = '#1a6b2e'; ctx.fillText(fmtDisplay(nu.particles, N + 1), lay.posX(nMid, nMid, -1) + u + 8, lay.y1); }
    ctx.fillStyle = '#c06000';
    ctx.fillText(fmtDisplay([...lamBotPos], N), lay.posX(nBot, nBot, 0) + u + 8, lay.y2);

    if (!hasNu) {
      ctx.fillStyle = 'rgba(200,0,0,0.7)'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('No valid ν — adjust λ values', w / 2, lay.y1);
    }
  }

  // Matching for After panel where the OUTER row (ν) has MORE positions
  // innerSet = positions from inner row (λ) to match
  // outerSet = positions from outer row (ν) that can match
  // Inner[j] sits between Outer[j] and Outer[j+1]
  function computeMatchingReverse(innerSet, outerSet, nInner) {
    const used = new Set();
    const pairs = [];
    for (let j = 1; j <= nInner; j++) {
      if (!innerSet.has(j)) continue;
      if (outerSet.has(j) && !used.has(j)) {
        pairs.push({ mid: j, outer: j });
        used.add(j);
      } else if (outerSet.has(j + 1) && !used.has(j + 1)) {
        pairs.push({ mid: j, outer: j + 1 });
        used.add(j + 1);
      }
    }
    return pairs;
  }

  function render() { renderBefore(); renderAfter(); }

  // ═══════════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════════

  function parsePartition(str) {
    str = str.replace(/[()]/g, '').trim();
    if (!str || str === '∅' || str === '0') return [];
    const parts = str.split(/[,\s]+/).map(Number).filter(n => !isNaN(n) && n >= 0);
    parts.sort((a, b) => b - a);
    while (parts.length > 0 && parts[parts.length - 1] === 0) parts.pop();
    return parts;
  }

  // Called from text inputs / N / k changes — rebuild positions from inputs
  function recomputeFromInputs() {
    N = Math.max(2, Math.min(15, parseInt(document.getElementById('lattice-n').value) || 5));
    document.getElementById('lattice-n').value = N;

    const kInput = parseInt(document.getElementById('particle-k').value);
    const topPart = parsePartition(document.getElementById('lam-top-input').value);
    const botPart = parsePartition(document.getElementById('lam-bot-input').value);

    // If k was manually changed, use it; otherwise derive from partition
    // k from input or from number of parts typed
    const kTop = (!isNaN(kInput) && kInput >= 0) ? kInput : Math.max(topPart.length, 1);
    const kBot = kTop + 1;

    // Parse display-convention partitions to positions
    lamTopPos = new Set(displayPartToPositions(topPart, kTop, N).filter(p => p >= 1 && p <= N));
    lamBotPos = new Set(displayPartToPositions(botPart, kBot, N).filter(p => p >= 1 && p <= N));

    syncUI();
    recompute();
  }

  // Sync UI fields from position state
  function syncUI() {
    const k = getK();
    document.getElementById('particle-k').value = k;
    document.getElementById('lam-top-input').value = fmtDisplay([...lamTopPos], N);
    document.getElementById('lam-bot-input').value = fmtDisplay([...lamBotPos], N);

    const topArr = [...lamTopPos].sort((a, b) => a - b);
    const botArr = [...lamBotPos].sort((a, b) => a - b);
    document.getElementById('lam-top-info').textContent =
      k + ' particles at [' + topArr.join(',') + '] of ' + N;
    document.getElementById('lam-bot-info').textContent =
      lamBotPos.size + ' particles at [' + botArr.join(',') + '] of ' + N;
  }

  function recompute() {
    const k = getK();
    const lamTopPart = getLamTopPart();
    const lamBotPart = getLamBotPart();

    // Validate: λ_top has k, λ_bot has k+1, all positions in range
    const topOk = [...lamTopPos].every(p => p >= 1 && p <= N);
    const botOk = [...lamBotPos].every(p => p >= 1 && p <= N);
    const kOk = k >= 0 && lamBotPos.size === k + 1;

    const valid = topOk && botOk && kOk;
    allMu = valid ? enumerateMu(lamTopPart, lamBotPart, k, N) : [];
    allNu = valid ? enumerateNu(lamTopPart, lamBotPart, k, N) : [];
    muIndex = Math.min(muIndex, Math.max(0, allMu.length - 1));
    nuIndex = Math.min(nuIndex, Math.max(0, allNu.length - 1));
    muForcedInfo = computeForcedFree(allMu, N - 1);
    nuForcedInfo = computeForcedFree(allNu, N + 1);
    updateMuDisplay();
    updateNuDisplay();
    render();
  }

  function updateMuDisplay() {
    const label = document.getElementById('mu-label');
    const count = document.getElementById('mu-count');
    if (allMu.length === 0) {
      label.textContent = 'μ: none'; count.textContent = '0 valid μ';
    } else {
      label.textContent = 'μ = ' + fmtDisplay(allMu[muIndex].particles, N - 1);
      count.textContent = (muIndex + 1) + ' of ' + allMu.length;
    }
    document.getElementById('mu-prev').disabled = muIndex <= 0;
    document.getElementById('mu-next').disabled = muIndex >= allMu.length - 1;
  }

  function updateNuDisplay() {
    const label = document.getElementById('nu-label');
    const count = document.getElementById('nu-count');
    if (allNu.length === 0) {
      label.textContent = 'ν: none'; count.textContent = '0 valid ν';
    } else {
      label.textContent = 'ν = ' + fmtDisplay(allNu[nuIndex].particles, N + 1);
      count.textContent = (nuIndex + 1) + ' of ' + allNu.length;
    }
    document.getElementById('nu-prev').disabled = nuIndex <= 0;
    document.getElementById('nu-next').disabled = nuIndex >= allNu.length - 1;
  }

  document.getElementById('lattice-n').addEventListener('change', recomputeFromInputs);
  document.getElementById('particle-k').addEventListener('change', recomputeFromInputs);
  document.getElementById('lam-top-input').addEventListener('change', recomputeFromInputs);
  document.getElementById('lam-bot-input').addEventListener('change', recomputeFromInputs);
  document.getElementById('mu-prev').addEventListener('click', () => {
    if (muIndex > 0) { muIndex--; updateMuDisplay(); render(); }
  });
  document.getElementById('mu-next').addEventListener('click', () => {
    if (muIndex < allMu.length - 1) { muIndex++; updateMuDisplay(); render(); }
  });
  document.getElementById('nu-prev').addEventListener('click', () => {
    if (nuIndex > 0) { nuIndex--; updateNuDisplay(); render(); }
  });
  document.getElementById('nu-next').addEventListener('click', () => {
    if (nuIndex < allNu.length - 1) { nuIndex++; updateNuDisplay(); render(); }
  });

  // Click to toggle λ particles
  beforeCanvas.addEventListener('click', function(e) {
    const rect = beforeCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const nTop = N, nMid = N - 1, nBot = N;
    const lay = computeLayout(rect.width, rect.height, nTop, nMid, nBot);
    const hitR = lay.u * 0.6;

    for (let j = 1; j <= nTop; j++) {
      const x = lay.posX(j, nTop, 0);
      if (Math.abs(mx - x) < hitR && Math.abs(my - lay.y0) < hitR) {
        toggleParticle('top', j); return;
      }
    }
    for (let j = 1; j <= nBot; j++) {
      const x = lay.posX(j, nBot, 0);
      if (Math.abs(mx - x) < hitR && Math.abs(my - lay.y2) < hitR) {
        toggleParticle('bot', j); return;
      }
    }
  });

  function toggleParticle(row, pos) {
    const s = (row === 'top') ? lamTopPos : lamBotPos;
    if (s.has(pos)) s.delete(pos); else s.add(pos);
    syncUI();
    recompute();
  }

  window.addEventListener('resize', render);
  syncUI();
  recompute();
})();
</script>
