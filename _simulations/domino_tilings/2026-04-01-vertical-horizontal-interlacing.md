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
.panel-label { font-weight: bold; font-size: 13px; letter-spacing: 0.5px; color: #666; margin: 10px 0 4px 0; }
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

<div class="int-row">
  <label>Parameter:</label>
  t = <input id="param-t" type="text" value="t" style="width:50px; font-family:monospace;">
</div>

<div id="weight-summary" class="info-line" style="margin: 6px 0; padding: 6px; background: #f0f0f0; border-radius: 4px; font-weight: bold;"></div>

<div class="panel-label">Before: λ<sup>top</sup>/μ vertical strip, λ<sup>bot</sup>/μ horizontal strip</div>

<canvas id="before-canvas" class="int-canvas" style="height: 280px;" role="img" aria-label="Before: particle configurations with dominos on diagonal lattice"></canvas>

<div class="mu-nav">
  <button id="mu-prev">← Prev</button>
  <span id="mu-label" class="mu-label">μ = ∅</span>
  <button id="mu-next">Next →</button>
  <span id="mu-count" class="info-line"></span>
</div>

<div id="mu-strips" class="info-line"></div>

<div class="forced-legend">
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#FF8C00"/></svg> free</span>
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#FF8C00" stroke="#c00" stroke-width="2"/></svg> forced particle</span>
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="#c00" stroke-width="2"/></svg> forced hole</span>
</div>

<div class="panel-label">After: ν/λ<sup>bot</sup> vertical strip, ν/λ<sup>top</sup> horizontal strip</div>

<canvas id="after-canvas" class="int-canvas" style="height: 280px;" role="img" aria-label="After: particle configurations with dominos on diagonal lattice"></canvas>

<div class="mu-nav">
  <button id="nu-prev">← Prev</button>
  <span id="nu-label" class="mu-label">ν = ∅</span>
  <button id="nu-next">Next →</button>
  <span id="nu-count" class="info-line"></span>
</div>

<div id="nu-strips" class="info-line"></div>

<div class="forced-legend">
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#228B22"/></svg> free</span>
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#228B22" stroke="#c00" stroke-width="2"/></svg> forced particle</span>
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="#c00" stroke-width="2"/></svg> forced hole</span>
</div>

<div id="weight-sums" class="info-line" style="margin: 12px 0; padding: 8px; background: #f0f0f0; border-radius: 4px; white-space: pre-wrap; font-size: 12px;"></div>

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


  function enumerateMu(k, N, topPSet, botPSet) {
    const numPos = N - 1;
    if (numPos < k || k < 0) return [];
    const botHolesSet = new Set();
    for (let j = 1; j <= N; j++) if (!botPSet.has(j)) botHolesSet.add(j);
    const results = [];
    function gen(start, chosen) {
      if (chosen.length === k) {
        // Geometric check: can all μ positions be matched?
        const muPSet = new Set(chosen);
        const muParts = [], muHoles = [];
        for (let j = 1; j <= numPos; j++) {
          if (muPSet.has(j)) muParts.push(j); else muHoles.push(j);
        }
        const partOk = bipartiteMatch(muParts, topPSet, N, false).length === muParts.length;
        const holeOk = bipartiteMatch(muHoles, botHolesSet, N, false).length === muHoles.length;
        if (partOk && holeOk) {
          results.push({ particles: [...chosen], partition: particlesToPartition(chosen) });
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
  // Also checks geometric feasibility of the domino matching
  function enumerateNu(k, N, topPSet, botPSet) {
    const kNu = k + 1;
    const numPos = N + 1;
    if (kNu < 0 || numPos < kNu) return [];
    const results = [];
    function gen(start, chosen) {
      if (chosen.length === kNu) {
        const nu = particlesToPartition(chosen);
        {
          // Geometric check: can all ν positions be matched to λ neighbors?
          // (replaces partition-level strip conditions which fail across different row sizes)
          const nuPSet = new Set(chosen);
          const nuHoles = [], nuParts = [];
          for (let j = 1; j <= numPos; j++) {
            if (nuPSet.has(j)) nuParts.push(j); else nuHoles.push(j);
          }
          const topHolesSet = new Set();
          for (let j = 1; j <= N; j++) if (!topPSet.has(j)) topHolesSet.add(j);
          const holeOk = bipartiteMatch(nuHoles, topHolesSet, N, true).length === nuHoles.length;
          const partOk = bipartiteMatch(nuParts, botPSet, N, true).length === nuParts.length;
          if (holeOk && partOk) {
            results.push({ particles: [...chosen], partition: nu });
          }
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

  // Augmenting-path bipartite matching for interval graphs
  // midToMatch: array of middle positions that need a match
  // outerValid: Set of outer positions that can be matched
  // nOuter: size of outer row
  // midIsBigger: if true, mid[j]→outer[j-1] or outer[j]; if false, mid[j]→outer[j] or outer[j+1]
  function bipartiteMatch(midToMatch, outerValid, nOuter, midIsBigger) {
    const match = {};  // outer → mid
    let visited;
    function neighbors(j) {
      const r = [];
      if (midIsBigger) {
        if (j - 1 >= 1 && j - 1 <= nOuter && outerValid.has(j - 1)) r.push(j - 1);
        if (j <= nOuter && outerValid.has(j)) r.push(j);
      } else {
        if (j >= 1 && j <= nOuter && outerValid.has(j)) r.push(j);
        if (j + 1 <= nOuter && outerValid.has(j + 1)) r.push(j + 1);
      }
      return r;
    }
    function augment(j) {
      for (const c of neighbors(j)) {
        if (visited.has(c)) continue;
        visited.add(c);
        if (!(c in match) || augment(match[c])) { match[c] = j; return true; }
      }
      return false;
    }
    for (const j of midToMatch) { visited = new Set(); augment(j); }
    const pairs = [];
    for (const [o, m] of Object.entries(match)) pairs.push({ mid: m, outer: parseInt(o) });
    return pairs;
  }

  // Match ALL middle positions to outer rows (for rendering dominos)
  // Before: μ smaller, mid[j]→outer[j] or outer[j+1]
  // After: ν bigger, mid[j]→outer[j-1] or outer[j]
  function computeAllDominos(midPSet, topPSet, botPSet, nMid, nOuter, midIsBigger) {
    const midParticles = [], midHoles = [];
    for (let j = 1; j <= nMid; j++) {
      if (midPSet.has(j)) midParticles.push(j); else midHoles.push(j);
    }
    // Particle dominos: Before→top strip, After→bottom strip
    const particleTarget = midIsBigger ? botPSet : topPSet;
    // Hole dominos: Before→bottom strip, After→top strip
    const holeTarget = new Set();
    const holeSource = midIsBigger ? topPSet : botPSet;
    for (let j = 1; j <= nOuter; j++) if (!holeSource.has(j)) holeTarget.add(j);

    const particlePairs = bipartiteMatch(midParticles, particleTarget, nOuter, midIsBigger);
    const holePairs = bipartiteMatch(midHoles, holeTarget, nOuter, midIsBigger);
    return { particlePairs, holePairs };
  }

  // ═══════════════════════════════════════════════════════════════
  // WEIGHTS — lightweight polynomial arithmetic in t (q=t)
  // ═══════════════════════════════════════════════════════════════

  // Poly = array of coefficients: [c0, c1, c2, ...] means c0 + c1*t + c2*t^2 + ...
  const ZERO = [0], ONE = [1];
  function polyTrim(p) { while (p.length > 1 && p[p.length-1] === 0) p.pop(); return p; }
  function polyAdd(a, b) {
    const r = new Array(Math.max(a.length, b.length)).fill(0);
    for (let i = 0; i < a.length; i++) r[i] += a[i];
    for (let i = 0; i < b.length; i++) r[i] += b[i];
    return polyTrim(r);
  }
  function polyMul(a, b) {
    if (a.length === 1 && a[0] === 0) return [0];
    if (b.length === 1 && b[0] === 0) return [0];
    const r = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < b.length; j++) r[i+j] += a[i] * b[j];
    return polyTrim(r);
  }
  // (1 - t^n) as polynomial
  function poly1minusTn(n) {
    if (n === 0) return [0];
    const r = new Array(n + 1).fill(0); r[0] = 1; r[n] = -1; return r;
  }
  // (1 + t + t^2 + ... + t^{n-1}) = (1-t^n)/(1-t)
  function polyGeom(n) {
    if (n <= 0) return [0];
    return new Array(n).fill(1);
  }
  // q-binomial [n choose k]_t as polynomial
  function qBinom(n, k) {
    if (k < 0 || k > n) return [0];
    if (k === 0 || k === n) return [1];
    // [n,k]_t = [n,k-1]_t * (1-t^{n-k+1})/(1-t^k)
    // Build iteratively: start with 1, multiply by (1+t+...+t^{n-j}) for j=1..k
    // Actually: [n,k] = prod_{j=1}^{k} (1-t^{n-j+1})/(1-t^j)
    // = prod_{j=1}^{k} (1+t+...+t^{n-j})  when we expand
    let r = [1];
    for (let j = 1; j <= k; j++) {
      // (1-t^{n-j+1})/(1-t^j) = polyGeom(n-j+1) if j=1, else need full division
      // Actually: (1-t^a)/(1-t^b) where a=n-j+1, b=j
      // For q-binomials, this always divides evenly as a polynomial
      r = polyMul(r, poly1minusTn(n - j + 1));
      r = polyDiv(r, poly1minusTn(j));
    }
    return r;
  }
  // Polynomial division (exact, no remainder expected)
  function polyDiv(a, b) {
    a = [...a]; b = [...b];
    polyTrim(a); polyTrim(b);
    if (b.length === 1 && b[0] === 0) return [0]; // div by zero
    const r = new Array(Math.max(0, a.length - b.length + 1)).fill(0);
    for (let i = r.length - 1; i >= 0; i--) {
      r[i] = a[i + b.length - 1] / b[b.length - 1];
      for (let j = 0; j < b.length; j++) a[i + j] -= r[i] * b[j];
    }
    return polyTrim(r);
  }
  // Format polynomial in t as string
  // Evaluate polynomial at numeric t, or format symbolically
  function polyEval(p, tVal) {
    let s = 0;
    for (let i = 0; i < p.length; i++) s += p[i] * Math.pow(tVal, i);
    return s;
  }

  function polyStr(p, tVar) {
    tVar = tVar || 't';
    p = polyTrim(p);
    if (p.length === 0 || (p.length === 1 && p[0] === 0)) return '0';

    // If tVar is numeric, evaluate
    const tNum = parseFloat(tVar);
    if (!isNaN(tNum) && tVar.trim() !== '') {
      const val = polyEval(p, tNum);
      return '' + (Math.round(val * 1e6) / 1e6);
    }

    // Symbolic display
    const terms = [];
    for (let i = 0; i < p.length; i++) {
      if (Math.abs(p[i]) < 1e-12) continue;
      const c = Math.round(p[i] * 1e6) / 1e6;
      if (i === 0) { terms.push('' + c); continue; }
      const tPow = i === 1 ? tVar : tVar + '^' + i;
      if (c === 1) terms.push(tPow);
      else if (c === -1) terms.push('-' + tPow);
      else terms.push(c + '*' + tPow);
    }
    return terms.length === 0 ? '0' : terms.join(' + ').replace(/\+ -/g, '- ');
  }

  // Conjugate partition
  function conjugate(lambda) {
    if (lambda.length === 0) return [];
    const conj = [];
    for (let j = 1; j <= lambda[0]; j++) conj.push(lambda.filter(p => p >= j).length);
    return conj;
  }

  // Positions → standard partition
  function posToStdPart(positions, latticeN) {
    const k = positions.length;
    if (k === 0) return [];
    const sorted = [...positions].sort((a, b) => a - b);
    const parts = [];
    for (let i = 1; i <= k; i++) parts.push(sorted[k - i] - (k + 1 - i));
    while (parts.length > 0 && parts[parts.length - 1] === 0) parts.pop();
    return parts;
  }

  // P^HL_{λ/μ}(β; t) for HORIZONTAL strip
  // = ∏_{i: λ'_i=μ'_i, λ'_{i+1}=μ'_{i+1}+1} (1-t^{μ'_i-μ'_{i+1}}) · β^{|λ|-|μ|}
  function pHL_horiz(lamPos, lamN, muPos, muN) {
    const lam = posToStdPart(lamPos, lamN), mu = posToStdPart(muPos, muN);
    const lamC = conjugate(lam), muC = conjugate(mu);
    const len = Math.max(lamC.length, muC.length) + 1;
    const LC = i => lamC[i] || 0, MC = i => muC[i] || 0;
    let poly = [1];
    for (let i = 0; i < len; i++) {
      if (LC(i) === MC(i) && LC(i + 1) === MC(i + 1) + 1) {
        const exp = MC(i) - MC(i + 1);
        if (exp > 0) poly = polyMul(poly, poly1minusTn(exp));
      }
    }
    const sizeDiff = (lam.reduce((a,b) => a+b, 0)||0) - (mu.reduce((a,b) => a+b, 0)||0);
    return { poly, betaPow: sizeDiff };
  }

  // ρ_β(Q^HL_{λ/μ}) for VERTICAL strip λ/μ
  // = P^Wh_{λ'/μ'}(β; t) where λ', μ' are conjugates
  // P^Wh formula: ∏_i [λ'_i-λ'_{i+1} choose λ'_i-μ'_i]_t · β^{|λ|-|μ|}
  function pWh_vert(lamPos, lamN, muPos, muN) {
    const lam = posToStdPart(lamPos, lamN), mu = posToStdPart(muPos, muN);
    // Conjugate: vertical strip λ/μ becomes horizontal strip λ'/μ'
    const lamC = conjugate(lam), muC = conjugate(mu);
    const len = Math.max(lamC.length, muC.length) + 1;
    const L = i => lamC[i] || 0, M = i => muC[i] || 0;
    let poly = [1];
    for (let i = 0; i < len; i++) {
      const n = L(i) - L(i + 1), k = L(i) - M(i);
      if (k < 0 || k > n) return { poly: [0], betaPow: 0 };
      if (k > 0) poly = polyMul(poly, qBinom(n, k));
    }
    const sizeDiff = (lam.reduce((a,b) => a+b, 0)||0) - (mu.reduce((a,b) => a+b, 0)||0);
    return { poly, betaPow: sizeDiff };
  }

  // Format weight (β=1, so just polynomial in t)
  function fmtWeight(w, tVar) {
    return polyStr(w.poly, tVar) || '0';
  }

  // Multiply two weights
  function weightMul(a, b) {
    return { poly: polyMul(a.poly, b.poly), betaPow: a.betaPow + b.betaPow };
  }

  // Add weights (β=1 so betaPow irrelevant)
  function weightAdd(a, b) {
    return { poly: polyAdd(a.poly, b.poly), betaPow: 0 };
  }

  function updateWeights() {
    const el = document.getElementById('weight-sums');
    if (allMu.length === 0 && allNu.length === 0) {
      el.innerHTML = '';
      document.getElementById('weight-summary').innerHTML = '';
      return;
    }
    const tVar = document.getElementById('param-t').value || 't';

    try {
      const muWeights = allMu.map(mu => {
        // Before: λ_top/μ vertical strip → P^Wh of conjugates
        //         λ_bot/μ horizontal strip → P^HL
        const wVert = pWh_vert([...lamTopPos], N, mu.particles, N - 1);
        const wHoriz = pHL_horiz([...lamBotPos], N, mu.particles, N - 1);
        return weightMul(wVert, wHoriz);
      });

      const nuWeights = allNu.map(nu => {
        // After: ν/λ_bot vertical strip → P^Wh of conjugates
        //        ν/λ_top horizontal strip (i.e. λ_top ⊃ ν) → P^HL
        const wVert = pWh_vert(nu.particles, N + 1, [...lamBotPos], N);
        const wHoriz = pHL_horiz(nu.particles, N + 1, [...lamTopPos], N);
        return weightMul(wVert, wHoriz);
      });

      // Sum weights (all should have same betaPow within each group)
      let sumMu = { poly: [0], betaPow: muWeights.length > 0 ? muWeights[0].betaPow : 0 };
      muWeights.forEach(w => { sumMu = weightAdd(sumMu, w) || sumMu; });

      let sumNu = { poly: [0], betaPow: nuWeights.length > 0 ? nuWeights[0].betaPow : 0 };
      nuWeights.forEach(w => { sumNu = weightAdd(sumNu, w) || sumNu; });

      // Summary at top: just the sums and ratio
      const sumEl = document.getElementById('weight-summary');
      const sumMuStr = fmtWeight(sumMu, tVar);
      const sumNuStr = fmtWeight(sumNu, tVar);
      let summaryHTML = 'Σ_μ = ' + sumMuStr + ' &nbsp;&nbsp; Σ_ν = ' + sumNuStr;
      if (sumMu.poly.some(c => c !== 0) && sumNu.poly.some(c => c !== 0)) {
        const ratioP = polyDiv(sumMu.poly, sumNu.poly);
        const check = polyMul(ratioP, sumNu.poly);
        const exact = sumMu.poly.every((c, i) => Math.abs(c - (check[i]||0)) < 1e-9) &&
                      check.every((c, i) => Math.abs(c - (sumMu.poly[i]||0)) < 1e-9);
        if (exact) {
          summaryHTML += ' &nbsp;&nbsp; Σ_μ/Σ_ν = ' + polyStr(ratioP, tVar);
        }
      }
      sumEl.innerHTML = summaryHTML;

      // Details at bottom: individual weights
      const lines = [];
      muWeights.forEach((w, i) => {
        lines.push('W(μ=' + fmtDisplay(allMu[i].particles, N - 1) + ') = ' + fmtWeight(w, tVar));
      });
      lines.push('');
      nuWeights.forEach((w, i) => {
        lines.push('W(ν=' + fmtDisplay(allNu[i].particles, N + 1) + ') = ' + fmtWeight(w, tVar));
      });

      el.innerHTML = lines.join('\n');
    } catch (e) {
      el.innerHTML = 'Error: ' + e.message;
    }
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
      // Before: μ is smaller row. mid[j]→outer[j] or outer[j+1]
      // Particle dominos → top strip (μ particles to λ_top particles)
      // Hole dominos → bottom strip (μ holes to λ_bot holes)
      const { particlePairs, holePairs } = computeAllDominos(muPSet, topPSet, botPSet, nMid, nTop, false);

      particlePairs.forEach(p => {
        drawDomino(ctx, lay.posX(p.outer, nTop, 0), lay.y0,
                   lay.posX(p.mid, nMid, 1), lay.y1, u, DOMINO_GREEN, DOMINO_EDGE);
      });
      holePairs.forEach(p => {
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
      // After: ν is bigger row. mid[j]→outer[j-1] or outer[j]
      // Particle dominos → bottom strip (ν particles to λ_bot particles)
      // Hole dominos → top strip (ν holes to λ_top holes)
      const { particlePairs, holePairs } = computeAllDominos(nuPSet, topPSet, botPSet, nMid, nTop, true);

      holePairs.forEach(p => {
        drawDomino(ctx, lay.posX(p.outer, nTop, 0), lay.y0,
                   lay.posX(p.mid, nMid, -1), lay.y1, u, DOMINO_GRAY, DOMINO_EDGE);
      });
      particlePairs.forEach(p => {
        drawDomino(ctx, lay.posX(p.mid, nMid, -1), lay.y1,
                   lay.posX(p.outer, nBot, 0), lay.y2, u, DOMINO_GREEN, DOMINO_EDGE);
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

    // Validate: λ_top has k, λ_bot has k+1, all positions in range
    const topOk = [...lamTopPos].every(p => p >= 1 && p <= N);
    const botOk = [...lamBotPos].every(p => p >= 1 && p <= N);
    const kOk = k >= 0 && lamBotPos.size === k + 1;

    const valid = topOk && botOk && kOk;
    allMu = valid ? enumerateMu(k, N, lamTopPos, lamBotPos) : [];
    allNu = valid ? enumerateNu(k, N, lamTopPos, lamBotPos) : [];
    muIndex = Math.min(muIndex, Math.max(0, allMu.length - 1));
    nuIndex = Math.min(nuIndex, Math.max(0, allNu.length - 1));
    muForcedInfo = computeForcedFree(allMu, N - 1);
    nuForcedInfo = computeForcedFree(allNu, N + 1);
    updateMuDisplay();
    updateNuDisplay();
    updateWeights();
    render();
  }

  // Show partition-level strip verification
  function vertStripCheck(aPos, aN, bPos, bN, label) {
    // Vertical strip: a_i - b_i ∈ {0,1} for all i
    const a = positionsToDisplayPart(aPos, aN);
    const b = positionsToDisplayPart(bPos, bN);
    const len = Math.max(a.length, b.length);
    const diffs = [];
    let ok = true;
    for (let i = 0; i < len; i++) {
      const d = (a[i] || 0) - (b[i] || 0);
      diffs.push(d);
      if (d < 0 || d > 1) ok = false;
    }
    const aS = a.length ? '(' + a.join(',') + ')' : '∅';
    const bS = b.length ? '(' + b.join(',') + ')' : '∅';
    const color = ok ? '#1a6b2e' : '#c00';
    return '<span style="color:' + color + '">' + label + ': ' + aS + ' − ' + bS + ' = (' + diffs.join(',') + ')' + (ok ? ' ✓' : ' ✗') + '</span>';
  }

  function horizStripCheck(aPos, aN, bPos, bN, label) {
    // Horizontal strip: a₁ ≥ b₁ ≥ a₂ ≥ b₂ ≥ ... (interlacing)
    // a has one more part than b (or same)
    const a = positionsToDisplayPart(aPos, aN);
    const b = positionsToDisplayPart(bPos, bN);
    const seq = [];
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < a.length) seq.push(a[i]);
      if (i < b.length) seq.push(b[i]);
    }
    if (a.length > b.length && a.length > maxLen) seq.push(a[a.length - 1]);
    let ok = true;
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] > seq[i - 1]) ok = false;
    }
    const aS = a.length ? '(' + a.join(',') + ')' : '∅';
    const bS = b.length ? '(' + b.join(',') + ')' : '∅';
    const color = ok ? '#1a6b2e' : '#c00';
    return '<span style="color:' + color + '">' + label + ': ' + seq.join(' ≥ ') + (ok ? ' ✓' : ' ✗') + '</span>';
  }

  function updateMuDisplay() {
    const label = document.getElementById('mu-label');
    const count = document.getElementById('mu-count');
    const strips = document.getElementById('mu-strips');
    if (allMu.length === 0) {
      label.textContent = 'μ: none'; count.textContent = '0 valid μ';
      strips.innerHTML = '';
    } else {
      const mu = allMu[muIndex];
      label.textContent = 'μ = ' + fmtDisplay(mu.particles, N - 1);
      count.textContent = (muIndex + 1) + ' of ' + allMu.length;
      strips.innerHTML =
        vertStripCheck([...lamTopPos], N, mu.particles, N - 1, 'λᵗᵒᵖ/μ') + '<br>' +
        horizStripCheck([...lamBotPos], N, mu.particles, N - 1, 'λᵇᵒᵗ/μ');
    }
    document.getElementById('mu-prev').disabled = muIndex <= 0;
    document.getElementById('mu-next').disabled = muIndex >= allMu.length - 1;
  }

  function updateNuDisplay() {
    const label = document.getElementById('nu-label');
    const count = document.getElementById('nu-count');
    const strips = document.getElementById('nu-strips');
    if (allNu.length === 0) {
      label.textContent = 'ν: none'; count.textContent = '0 valid ν';
      strips.innerHTML = '';
    } else {
      const nu = allNu[nuIndex];
      label.textContent = 'ν = ' + fmtDisplay(nu.particles, N + 1);
      count.textContent = (nuIndex + 1) + ' of ' + allNu.length;
      strips.innerHTML =
        vertStripCheck(nu.particles, N + 1, [...lamBotPos], N, 'ν/λᵇᵒᵗ') + '<br>' +
        horizStripCheck(nu.particles, N + 1, [...lamTopPos], N, 'ν/λᵗᵒᵖ');
    }
    document.getElementById('nu-prev').disabled = nuIndex <= 0;
    document.getElementById('nu-next').disabled = nuIndex >= allNu.length - 1;
  }

  document.getElementById('lattice-n').addEventListener('change', recomputeFromInputs);
  document.getElementById('particle-k').addEventListener('change', recomputeFromInputs);
  document.getElementById('lam-top-input').addEventListener('change', recomputeFromInputs);
  document.getElementById('lam-bot-input').addEventListener('change', recomputeFromInputs);
  document.getElementById('param-t').addEventListener('change', updateWeights);
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
