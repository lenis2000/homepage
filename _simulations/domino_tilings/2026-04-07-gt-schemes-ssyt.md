---
title: Gelfand-Tsetlin Schemes and SSYT
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2026-04-07-gt-schemes-ssyt.md'
    txt: 'GT schemes, SSYT enumeration, and 2×2 periodic Schur polynomials'
a11y-description: "Interactive tool for enumerating Gelfand-Tsetlin schemes (sequences of interlacing partitions connected by vertical strips) and displaying them as semi-standard Young tableaux (SSYT). Computes Schur polynomials of the conjugate partition with optional 2x2 periodic weight parameter a."
---

<style>
.gt-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.gt-row label { font-size: 14px; }
.gt-row input[type=text] { width: 120px; font-family: monospace; font-size: 14px; }
.gt-row select { font-size: 14px; }
.gt-btn { padding: 6px 18px; font-size: 14px; cursor: pointer; background: #228B22; color: #fff; border: none; border-radius: 4px; }
.gt-btn:hover { background: #1a6b2e; }
.gt-output { margin-top: 12px; padding: 12px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.gt-poly { margin: 8px 0; overflow-x: auto; }
.gt-poly .katex { white-space: normal !important; }
.gt-poly .katex .base { white-space: normal !important; }
.gt-info { font-size: 13px; color: #555; margin: 4px 0; font-family: monospace; }
.gt-error { color: #c00; font-weight: bold; margin-top: 8px; }
.gt-chain { font-size: 13px; color: #333; margin: 8px 0; font-family: monospace; }
.gt-formula { margin: 8px 0; }
.gt-configs { margin-top: 8px; font-size: 12px; border-top: 1px solid #ddd; padding-top: 8px; }
.config-block { display: inline-block; vertical-align: top; margin: 4px; }
.config-header { font-family: monospace; font-size: 11px; text-align: center; margin-bottom: 2px; color: #333; }
/* SSYT styling */
.ssyt { display: inline-block; border-collapse: collapse; margin: 4px auto; }
.ssyt td { width: 22px; height: 22px; text-align: center; font-size: 12px; font-weight: bold;
  border: 1.5px solid #333; background: #fff; font-family: monospace; }
.ssyt .empty { border: none; background: transparent; }
</style>

<div class="gt-row">
  <label>Level k:</label>
  <select id="gt-k" aria-label="Level k">
    <option value="1">1</option>
    <option value="2">2</option>
    <option value="3" selected>3</option>
    <option value="4">4</option>
    <option value="5">5</option>
  </select>
  <label style="margin-left:12px;">λ':</label>
  <input id="gt-lambda" type="text" value="(2,2,1)" placeholder="(2,2,1)" aria-label="Partition lambda-prime">
  <span class="gt-info" style="color:#888;">(parts ≤ k; SSYT shape)</span>
</div>

<div class="gt-row">
  <button id="gt-compute" class="gt-btn">Compute</button>
  <label style="margin-left:12px; font-size:13px;">
    <input type="checkbox" id="gt-show-configs" checked> Show tableaux
  </label>
  <label style="margin-left:12px; font-size:13px;">
    <input type="checkbox" id="gt-a-one"> Set a=1
  </label>
  <label style="margin-left:12px; font-size:13px;">
    α-parity: <select id="gt-a-parity" style="font-size:13px;">
      <option value="odd">x odd</option>
      <option value="even">x even</option>
    </select>
  </label>
</div>

<div id="gt-chain" class="gt-chain"></div>
<div id="gt-formula" class="gt-formula"></div>

<div id="gt-result" class="gt-output" style="display:none;">
  <div class="gt-info"><strong>GT schemes:</strong> <span id="gt-count">0</span> &ensp;|&ensp; <strong>Polynomial terms:</strong> <span id="gt-terms">0</span> &ensp;|&ensp; <span id="gt-time"></span></div>
  <div id="gt-poly" class="gt-poly"></div>
  <div><button id="gt-copy-mma" style="font-size:11px;padding:2px 8px;margin:4px 0;display:none;cursor:pointer;">Copy Mathematica</button></div>
  <div id="gt-verify" class="gt-info" style="display:none;"></div>
  <div id="gt-configs" class="gt-configs" style="display:none;"></div>
</div>

<div id="gt-error" class="gt-error"></div>

<div style="margin-top:8px;">
  <button id="gt-mass-test" style="font-size:12px;padding:4px 12px;cursor:pointer;">Run mass test (local formula vs dimer engine)</button>
  <span id="gt-mass-result" style="font-size:12px;margin-left:8px;"></span>
</div>

<details style="margin-top: 16px;">
<summary style="cursor: pointer; font-weight: bold; font-size: 14px;">How it works</summary>
<div style="margin-top: 8px; font-size: 14px; line-height: 1.6;">

Fix a partition $\lambda'$ (the SSYT shape) and level $k$. We enumerate all Gelfand-Tsetlin schemes
$$\varnothing = \lambda^0 \prec' \lambda^1 \prec' \lambda^2 \prec' \cdots \prec' \lambda^k$$
where each $\prec'$ is a vertical strip ($\lambda^i_j - \lambda^{i-1}_j \in \\{0,1\\}$). Each scheme bijects to a semi-standard Young tableau of shape $\lambda'$ (conjugate): place entry $i$ in the boxes of $\lambda^i \setminus \lambda^{i-1}$.

The polynomial is $s_{\lambda'}(x_1,\ldots,x_k)$ with weight $\prod x_i^{|\lambda^i|-|\lambda^{i-1}|}$ per scheme.

**2&times;2 periodic weight $a$:** Each GT scheme determines a domino tiling of a half-Aztec diamond (via the particle-to-domino correspondence). The parameter $a$ weights specific horizontal dominos satisfying the 2&times;2 periodicity condition. Remarkably, the $a$-weight is a **purely local** property of the SSYT:

A box with entry $i$ at position (row $r$, col $c$) carries weight $a$ iff:
1. $(2i - n - 3) \equiv 2 \pmod{4}$, where $n$ is the Aztec diamond size &mdash; this selects entry parity ($n \equiv 1$: odd entries; $n \equiv 3$: even entries)
2. $r \equiv c \pmod{2}$ (for $x$-odd parity) or $r \not\equiv c \pmod{2}$ (for $x$-even)

<span style="background:#ffe0e0;padding:0 3px;">Pink cells</span> mark $a$-weighted boxes. The rule is a **checkerboard on the tableau** filtered by **entry parity**.

</div>
</details>

<script>
(function() {
  // ═══════════════════════════════════════════════════
  //  PARTITION UTILITIES
  // ═══════════════════════════════════════════════════

  function parsePartition(s) {
    s = s.trim().replace(/^\(/, '').replace(/\)$/, '').trim();
    if (s === '' || s === '∅' || s === '0') return [];
    var parts = s.split(/[,\s]+/).map(function(x) { return parseInt(x.trim()); });
    if (parts.some(isNaN)) return null;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] < 0) return null;
      if (i > 0 && parts[i] > parts[i - 1]) return null;
    }
    while (parts.length > 0 && parts[parts.length - 1] === 0) parts.pop();
    return parts;
  }

  function partSize(p) {
    var s = 0; for (var i = 0; i < p.length; i++) s += p[i]; return s;
  }

  function partStr(p) {
    return p.length === 0 ? '∅' : '(' + p.join(',') + ')';
  }

  function toSup(n) {
    var sups = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    return String(n).split('').map(function(c) { return sups[parseInt(c)] || c; }).join('');
  }

  function toSub(n) {
    var subs = '₀₁₂₃₄₅₆₇₈₉';
    return String(n).split('').map(function(c) { return subs[parseInt(c)] || c; }).join('');
  }

  function conjugatePartition(lambda) {
    if (lambda.length === 0) return [];
    var conj = [];
    for (var j = 1; j <= lambda[0]; j++) {
      var c = 0; for (var i = 0; i < lambda.length; i++) if (lambda[i] >= j) c++;
      conj.push(c);
    }
    return conj;
  }

  function partitionToPositions(partition, h) {
    if (typeof h === 'undefined') h = partition.length;
    if (h === 0) return [];
    var positions = [];
    for (var i = 0; i < h; i++) {
      var partIdx = h - 1 - i;
      var partVal = partIdx < partition.length ? partition[partIdx] : 0;
      positions.push(partVal + (i + 1));
    }
    return positions.sort(function(a, b) { return a - b; });
  }

  // ═══════════════════════════════════════════════════
  //  ENUMERATION
  // ═══════════════════════════════════════════════════

  function enumVertStripSubs(lambda) {
    var results = [];
    var len = lambda.length;
    if (len === 0) { results.push([]); return results; }
    function rec(i, mu) {
      if (i >= len) {
        var t = mu.slice();
        while (t.length > 0 && t[t.length - 1] === 0) t.pop();
        results.push(t); return;
      }
      for (var d = 0; d <= 1; d++) {
        var v = lambda[i] - d;
        if (v < 0) continue;
        if (i > 0 && v > mu[i - 1]) continue;
        mu.push(v); rec(i + 1, mu); mu.pop();
      }
    }
    rec(0, []); return results;
  }

  // ═══════════════════════════════════════════════════
  //  POLYNOMIAL ARITHMETIC
  // ═══════════════════════════════════════════════════

  function makeKey(exps) { return exps.join(','); }
  function parseKey(key) { return key.split(',').map(Number); }

  function polyAddTo(poly, key, coeff) {
    if (coeff === 0) return;
    var cur = poly.get(key) || 0;
    var nv = cur + coeff;
    if (nv === 0) poly.delete(key); else poly.set(key, nv);
  }

  function polyAddPoly(a, b) {
    var result = new Map(a);
    b.forEach(function(coeff, key) { polyAddTo(result, key, coeff); });
    return result;
  }

  function polyMulMono(poly, monoExps) {
    var result = new Map();
    poly.forEach(function(coeff, key) {
      var exps = parseKey(key);
      var newExps = new Array(monoExps.length);
      for (var i = 0; i < monoExps.length; i++) newExps[i] = exps[i] + monoExps[i];
      polyAddTo(result, makeKey(newExps), coeff);
    });
    return result;
  }

  // ═══════════════════════════════════════════════════
  //  GT SCHEME ENUMERATION (y=0: vertical strips only)
  //  Chain: ∅ = λ⁰ ≺' λ¹ ≺' λ² ≺' ... ≺' λᵏ
  // ═══════════════════════════════════════════════════

  function computeGTSchemes(fixedLambda, k) {
    var numVars = k; // x_1, ..., x_k only
    var cache = new Map();
    var configCount = 0;
    var configs = [];
    var wantConfigs = document.getElementById('gt-show-configs').checked ||
                      !document.getElementById('gt-a-one').checked;
    var MAX_CONFIGS = 50000;
    var aborted = false;

    // From λ^level, go down via vertical strip
    function fromLambda(lambda, level, chain) {
      if (aborted) return new Map();
      var cacheKey = lambda.join(',') + ':' + level;
      if (!wantConfigs && cache.has(cacheKey)) {
        var cached = cache.get(cacheKey);
        configCount += cached.count; return cached.poly;
      }
      var countBefore = configCount;
      var result = new Map();
      var lamSize = partSize(lambda);

      if (level === 1) {
        // Base: vertical strip from ∅ to λ^1
        // Only λ^1 with all parts ≤ 1 can reach ∅
        // ∅ ≺' λ means λ_i ∈ {0,1}, so λ^1 must have parts ≤ 1
        // The only sub of λ^1 that equals ∅ is when we subtract all parts
        var subs = enumVertStripSubs(lambda);
        for (var si = 0; si < subs.length; si++) {
          var mu = subs[si];
          if (mu.length === 0) { // mu = ∅
            configCount++;
            if (configCount > MAX_CONFIGS) { aborted = true; break; }
            var mono = new Array(numVars).fill(0);
            mono[0] = lamSize; // x_1^|λ^1|
            if (wantConfigs) {
              configs.push(chain.concat([{ level: 1, part: lambda.slice() }]));
            }
            var p = new Map(); p.set(makeKey(mono), 1);
            result = polyAddPoly(result, p);
          }
        }
      } else {
        // Enumerate λ^{level-1} such that λ^{level-1} ≺' λ^level (vertical strip)
        var subs = enumVertStripSubs(lambda);
        for (var si = 0; si < subs.length; si++) {
          if (aborted) break;
          var prevLam = subs[si];
          var mono = new Array(numVars).fill(0);
          mono[level - 1] = lamSize - partSize(prevLam); // x_level^(|λ^level| - |λ^{level-1}|)
          var newChain = wantConfigs
            ? chain.concat([{ level: level, part: lambda.slice() }]) : chain;
          var subPoly = fromLambda(prevLam, level - 1, newChain);
          result = polyAddPoly(result, polyMulMono(subPoly, mono));
        }
      }

      if (!wantConfigs) cache.set(cacheKey, { poly: result, count: configCount - countBefore });
      return result;
    }

    var poly = fromLambda(fixedLambda, k, []);
    return { poly: poly, configCount: configCount, configs: configs, aborted: aborted };
  }

  // ═══════════════════════════════════════════════════
  //  SSYT VERIFICATION
  // ═══════════════════════════════════════════════════

  function computeSchurSSYT(shape, k) {
    var poly = new Map();
    if (shape.length === 0) { poly.set(new Array(k).fill(0).join(','), 1); return poly; }
    var cells = [];
    for (var r = 0; r < shape.length; r++)
      for (var c = 0; c < shape[r]; c++) cells.push([r, c]);
    var tab = new Array(cells.length).fill(0);
    var cellIdx = {};
    for (var i = 0; i < cells.length; i++) cellIdx[cells[i][0] + ',' + cells[i][1]] = i;
    function rec(idx) {
      if (idx >= cells.length) {
        var exps = new Array(k).fill(0);
        for (var i = 0; i < cells.length; i++) exps[tab[i] - 1]++;
        polyAddTo(poly, exps.join(','), 1); return;
      }
      var r = cells[idx][0], c = cells[idx][1], lo = 1;
      if (c > 0) lo = Math.max(lo, tab[cellIdx[r + ',' + (c - 1)]]);
      if (r > 0 && ((r-1)+','+c) in cellIdx) lo = Math.max(lo, tab[cellIdx[(r-1)+','+c]] + 1);
      for (var v = lo; v <= k; v++) { tab[idx] = v; rec(idx + 1); }
    }
    rec(0); return poly;
  }

  function polyEqual(a, b) {
    var match = true;
    a.forEach(function(c, key) { if ((b.get(key) || 0) !== c) match = false; });
    b.forEach(function(c, key) { if ((a.get(key) || 0) !== c) match = false; });
    return match;
  }

  // ═══════════════════════════════════════════════════
  //  DIMER ENGINE (background, for α weights)
  // ═══════════════════════════════════════════════════

  function bipartiteMatch(midArr, outerValid, nOuter, midIsBigger) {
    var match = {};
    function neighbors(j) {
      var r = [];
      if (midIsBigger) {
        if (j - 1 >= 1 && j - 1 <= nOuter && outerValid[j - 1]) r.push(j - 1);
        if (j >= 1 && j <= nOuter && outerValid[j]) r.push(j);
      } else {
        if (j >= 1 && j <= nOuter && outerValid[j]) r.push(j);
        if (j + 1 >= 1 && j + 1 <= nOuter && outerValid[j + 1]) r.push(j + 1);
      }
      return r;
    }
    var visited;
    function augment(j) {
      var nb = neighbors(j);
      for (var i = 0; i < nb.length; i++) {
        var c = nb[i];
        if (visited[c]) continue;
        visited[c] = true;
        if (!(c in match) || augment(match[c])) { match[c] = j; return true; }
      }
      return false;
    }
    for (var i = 0; i < midArr.length; i++) { visited = {}; augment(midArr[i]); }
    var pairs = [];
    for (var o in match) pairs.push({ mid: match[o], outer: parseInt(o) });
    return pairs;
  }

  // Reconstruct dominos from a GT scheme config (y=0 means μ^i = λ^i)
  // Returns {count, alphaBoxes} where alphaBoxes is Set of "level,origRow" strings
  function countAlphaDimers(config, k, nn) {
    // Build the full interlacing sequence: μ⁰=∅, λ¹, μ¹=λ¹, λ², μ²=λ², ..., λ^k
    // With y=0: μ^i = λ^i for all i
    var fullConfig = [];
    fullConfig.push({ type: 'mu', level: 0, part: [] });
    for (var i = 0; i < config.length; i++) {
      var lvl = config[i].level;
      fullConfig.push({ type: 'lam', level: lvl, part: config[i].part });
      if (lvl < k) {
        fullConfig.push({ type: 'mu', level: lvl, part: config[i].part.slice() });
      }
    }

    var sorted = fullConfig.slice().sort(function(a, b) {
      if (a.level !== b.level) return a.level - b.level;
      return a.type === 'lam' ? -1 : 1;
    });

    var parityOffset = nn;
    var diagInfo = [];
    for (var ri = 0; ri < sorted.length; ri++) {
      var entry = sorted[ri];
      var isLam = entry.type === 'lam';
      var d_val = ri - (nn + 1);
      var x_min = Math.ceil((d_val - nn) / 2);
      var x_max = Math.floor((nn + d_val) / 2);
      var nPos = x_max - x_min + 1;
      var h = isLam ? (nn - (entry.level - 1)) : (nn - entry.level);
      if (h < 0) h = 0;
      var positions = partitionToPositions(entry.part, h);
      var posSet = {};
      for (var pi = 0; pi < positions.length; pi++) posSet[positions[pi]] = true;
      diagInfo.push({ isLam: isLam, d_val: d_val, x_min: x_min, nPos: nPos, posSet: posSet });
    }

    var xPar = document.getElementById('gt-a-parity').value === 'odd' ? 1 : 0;
    var alphaCount = 0;
    var alphaBoxes = new Set(); // "level,origRow" keys for α-weighted boxes

    // Store level info per diagonal
    var diagLevels = [];
    for (var ri = 0; ri < sorted.length; ri++) diagLevels.push(sorted[ri].level);

    for (var ri = 0; ri < diagInfo.length; ri++) {
      var diag = diagInfo[ri];
      if (diag.isLam) continue;
      var muParticles = [];
      for (var j = 1; j <= diag.nPos; j++) if (diag.posSet[j]) muParticles.push(j);
      var h_mu = muParticles.length;

      // Particle dominos: μ particles → λ ABOVE particles
      var lamAboveIdx = ri + 1;
      if (lamAboveIdx < diagInfo.length && muParticles.length > 0) {
        var lamAbove = diagInfo[lamAboveIdx];
        var lamLevel = diagLevels[lamAboveIdx]; // this is level i of λ^i
        var pTarget = {};
        for (var j = 1; j <= lamAbove.nPos; j++) if (lamAbove.posSet[j]) pTarget[j] = true;
        var pPairs = bipartiteMatch(muParticles, pTarget, lamAbove.nPos, false);
        for (var di = 0; di < pPairs.length; di++) {
          var p = pPairs[di];
          var x1 = diag.x_min + (p.mid - 1), y1 = diag.d_val - x1;
          var x2 = lamAbove.x_min + (p.outer - 1), y2 = lamAbove.d_val - x2;
          var gx = Math.min(x1, x2), gy = Math.min(y1, y2);
          var horiz = (y1 === y2);
          if (horiz && (((gx + gy + parityOffset) % 2 + 2) % 2 === 1)
              && (((gx + gy) % 4 + 4) % 4 === 2)
              && (((gx % 2) + 2) % 2 === xPar)) {
            alphaCount++;
            // Determine partition row: particle at muParticles index → row h_mu - idx
            // p.mid is the diagonal position; find its index in muParticles
            var pidx = muParticles.indexOf(p.mid);
            if (pidx >= 0) {
              var origRow = h_mu - 1 - pidx; // 0-indexed partition row
              alphaBoxes.add(lamLevel + ',' + origRow);
            }
          }
        }
      }
      // Hole dominos (μ holes → λ below) — these don't add boxes, skip for SSYT tracking
      var muHoles = [];
      for (var j = 1; j <= diag.nPos; j++) if (!diag.posSet[j]) muHoles.push(j);
      var lamBelowIdx = ri - 1;
      if (lamBelowIdx >= 0 && muHoles.length > 0) {
        var lamBelow = diagInfo[lamBelowIdx];
        var hTarget = {};
        for (var j = 1; j <= lamBelow.nPos; j++) if (!lamBelow.posSet[j]) hTarget[j] = true;
        var hPairs = bipartiteMatch(muHoles, hTarget, lamBelow.nPos, false);
        for (var di = 0; di < hPairs.length; di++) {
          var p = hPairs[di];
          var x1 = diag.x_min + (p.mid - 1), y1 = diag.d_val - x1;
          var x2 = lamBelow.x_min + (p.outer - 1), y2 = lamBelow.d_val - x2;
          var gx = Math.min(x1, x2), gy = Math.min(y1, y2);
          var horiz = (y1 === y2);
          if (horiz && (((gx + gy + parityOffset) % 2 + 2) % 2 === 1)
              && (((gx + gy) % 4 + 4) % 4 === 2)
              && (((gx % 2) + 2) % 2 === xPar)) {
            alphaCount++;
          }
        }
      }
    }
    return { count: alphaCount, alphaBoxes: alphaBoxes };
  }

  // ═══════════════════════════════════════════════════
  //  LOCAL ALPHA FORMULA TEST
  // ═══════════════════════════════════════════════════

  // Test: compare dimer-based α count with a local SSYT formula.
  // Formula: a box with entry i at SSYT position (row r, col c) carries weight α iff:
  //   (1) ((2*i - nn - 3) % 4 + 4) % 4 === 2
  //   (2) x-odd parity: (r + c) % 2 === 0;  x-even parity: (r + c) % 2 === 1
  function countAlphaLocal(ssyt, nn) {
    var xPar = document.getElementById('gt-a-parity').value === 'odd' ? 1 : 0;
    var count = 0;
    var alphaBoxes = new Set();
    for (var r = 0; r < ssyt.shape.length; r++) {
      for (var c = 0; c < ssyt.shape[r]; c++) {
        var i = ssyt.filling[r][c]; // entry = level
        var cond1 = (((2 * i - nn - 3) % 4) + 4) % 4 === 2;
        var cond2 = xPar === 1
          ? ((r + c) % 2 === 0)
          : ((r + c) % 2 === 1);
        if (cond1 && cond2) {
          count++;
          // To match dimer engine key format: "level,origRow" where origRow = c
          // (SSYT cell (r,c) corresponds to original lambda cell (c,r), so origRow = c)
          alphaBoxes.add(i + ',' + c);
        }
      }
    }
    return { count: count, alphaBoxes: alphaBoxes };
  }

  function testAlphaFormula(configs, k, nn, fixedLambda) {
    var mismatches = [];
    for (var ci = 0; ci < configs.length; ci++) {
      var cfg = configs[ci];
      // Method A: dimer engine
      var dimerResult = countAlphaDimers(cfg, k, nn);
      // Method B: local SSYT formula
      var ssyt = configToSSYT(cfg, fixedLambda);
      var localResult = countAlphaLocal(ssyt, nn);

      if (dimerResult.count !== localResult.count) {
        mismatches.push({
          idx: ci,
          dimerCount: dimerResult.count,
          localCount: localResult.count,
          dimerBoxes: Array.from(dimerResult.alphaBoxes).sort().join('; '),
          localBoxes: Array.from(localResult.alphaBoxes).sort().join('; ')
        });
      }
    }
    if (mismatches.length === 0) {
      return {
        match: true,
        details: 'Local formula matches dimer engine for all ' + configs.length + ' configs'
      };
    } else {
      var first = mismatches[0];
      return {
        match: false,
        details: 'Mismatch at config #' + (first.idx + 1) + ': dimer=' + first.dimerCount +
          ' local=' + first.localCount + ' (dimer boxes: ' + first.dimerBoxes +
          ', local boxes: ' + first.localBoxes + '). Total mismatches: ' + mismatches.length + '/' + configs.length
      };
    }
  }

  // ═══════════════════════════════════════════════════
  //  MASS TEST: all partitions up to given size, both parities
  // ═══════════════════════════════════════════════════

  // Generate all partitions of n with at most maxParts parts, each ≤ maxVal
  function genPartitions(n, maxParts, maxVal) {
    var results = [];
    function rec(remaining, parts, maxP) {
      if (remaining === 0) { results.push(parts.slice()); return; }
      if (parts.length >= maxParts || maxP <= 0) return;
      for (var p = Math.min(remaining, maxP, maxVal); p >= 1; p--) {
        parts.push(p);
        rec(remaining - p, parts, p);
        parts.pop();
      }
    }
    rec(n, [], maxVal);
    return results;
  }

  function runMassTest() {
    var el = document.getElementById('gt-mass-result');
    el.textContent = 'Running...';
    el.style.color = '#666';

    setTimeout(function() {
      var totalConfigs = 0, totalCases = 0, failures = [];
      var maxSize = 6; // |λ| up to 6
      var maxK = 5;

      for (var k = 1; k <= maxK; k++) {
        for (var sz = 0; sz <= maxSize; sz++) {
          var partitions = genPartitions(sz, k, k); // parts ≤ k, at most k parts
          // Also include partitions with fewer parts
          if (sz === 0) partitions = [[]];

          for (var pi = 0; pi < partitions.length; pi++) {
            var lam = partitions[pi];
            if (lam.length > 0 && lam[0] > k) continue;

            // Test both x-parities
            for (var xp = 0; xp < 2; xp++) {
              var savedParity = document.getElementById('gt-a-parity').value;
              document.getElementById('gt-a-parity').value = xp === 0 ? 'odd' : 'even';

              // Force config computation
              var oldShow = document.getElementById('gt-show-configs').checked;
              document.getElementById('gt-show-configs').checked = true;
              var oldA1 = document.getElementById('gt-a-one').checked;
              document.getElementById('gt-a-one').checked = false;

              var result = computeGTSchemes(lam, k);
              if (result.configs.length === 0) continue;

              // Compute globalNN
              var nn = 1;
              for (var ci = 0; ci < result.configs.length; ci++) {
                var cc = result.configs[ci];
                for (var ei = 0; ei < cc.length; ei++) {
                  nn = Math.max(nn, cc[ei].part.length + cc[ei].level - 1);
                }
                for (var ei = 0; ei < cc.length; ei++) {
                  if (cc[ei].level < k) nn = Math.max(nn, cc[ei].part.length + cc[ei].level);
                }
              }

              var testResult = testAlphaFormula(result.configs, k, nn, lam);
              totalCases++;
              totalConfigs += result.configs.length;

              if (!testResult.match) {
                failures.push('k=' + k + ' λ=' + partStr(lam) + ' xPar=' + (xp === 0 ? 'odd' : 'even') +
                  ': ' + testResult.details);
                if (failures.length >= 5) break; // stop after 5 failures
              }

              // Restore
              document.getElementById('gt-a-parity').value = savedParity;
              document.getElementById('gt-show-configs').checked = oldShow;
              document.getElementById('gt-a-one').checked = oldA1;
            }
            if (failures.length >= 5) break;
          }
          if (failures.length >= 5) break;
        }
        if (failures.length >= 5) break;
      }

      if (failures.length === 0) {
        el.style.color = '#1a6b2e';
        el.textContent = '✓ All ' + totalCases + ' cases passed (' + totalConfigs + ' total GT schemes, k≤' + maxK + ', |λ|≤' + maxSize + ', both parities)';
      } else {
        el.style.color = '#c00';
        el.textContent = '✗ ' + failures.length + ' failures out of ' + totalCases + ' cases. First: ' + failures[0];
      }
    }, 50);
  }

  // ═══════════════════════════════════════════════════
  //  POLYNOMIAL DISPLAY
  // ═══════════════════════════════════════════════════

  var MAX_LATEX_TERMS = 60;
  var lastMmaString = '';

  function polyToMma(poly, varNames) {
    var entries = [];
    poly.forEach(function(c, key) { if (c !== 0) entries.push([key, c]); });
    if (entries.length === 0) return '0';
    var terms = [];
    for (var t = 0; t < entries.length; t++) {
      var exps = parseKey(entries[t][0]), coeff = entries[t][1];
      var factors = [];
      if (Math.abs(coeff) !== 1 || exps.every(function(e){return e===0;})) factors.push(String(coeff));
      else if (coeff === -1) factors.push('-1');
      for (var i = 0; i < exps.length; i++) {
        if (exps[i] === 0) continue;
        if (exps[i] === 1) factors.push(varNames[i]);
        else factors.push(varNames[i] + '^' + exps[i]);
      }
      terms.push(factors.join('*') || '1');
    }
    return terms.join(' + ').replace(/\+ -/g, '- ');
  }

  function polyToLatex(poly, varNames) {
    var entries = [];
    poly.forEach(function(c, key) { if (c !== 0) entries.push([key, c]); });
    if (entries.length === 0) return '0';
    entries.sort(function(a, b) {
      var ea = parseKey(a[0]), eb = parseKey(b[0]);
      var sa = 0, sb = 0;
      for (var i = 0; i < ea.length; i++) sa += ea[i];
      for (var i = 0; i < eb.length; i++) sb += eb[i];
      if (sa !== sb) return sb - sa;
      for (var i = 0; i < ea.length; i++) { if (ea[i] !== eb[i]) return eb[i] - ea[i]; }
      return 0;
    });
    var latex = '';
    for (var t = 0; t < entries.length; t++) {
      var key = entries[t][0], coeff = entries[t][1];
      var exps = parseKey(key), absCoeff = Math.abs(coeff), sign = coeff > 0 ? '+' : '-';
      var monoStr = '';
      for (var i = 0; i < exps.length; i++) {
        if (exps[i] === 0) continue;
        if (exps[i] === 1) monoStr += varNames[i];
        else monoStr += varNames[i] + '^{' + exps[i] + '}';
      }
      if (monoStr === '') monoStr = String(absCoeff);
      else if (absCoeff !== 1) monoStr = absCoeff + '\\,' + monoStr;
      if (t === 0) latex += (coeff < 0 ? '-' : '') + monoStr;
      else latex += ' ' + sign + ' ' + monoStr;
      if (t >= MAX_LATEX_TERMS - 1 && t < entries.length - 1) {
        latex += ' + \\cdots\\;(' + (entries.length - t - 1) + '\\text{ more terms})';
        break;
      }
    }
    return latex;
  }

  function renderLatex(latex, el, displayMode) {
    if (typeof katex !== 'undefined') {
      try { katex.render(latex, el, { displayMode: !!displayMode }); }
      catch (e) { el.innerHTML = '<code style="word-break:break-all;">' + latex + '</code>'; }
    } else { setTimeout(function() { renderLatex(latex, el, displayMode); }, 200); }
  }

  // ═══════════════════════════════════════════════════
  //  SSYT RENDERING
  // ═══════════════════════════════════════════════════

  // GT scheme config → SSYT of shape λ' (conjugate)
  // config = [{level: i, part: λ^i}, ...] sorted by level ascending
  // The SSYT entry at box (r,c) in shape λ' is the level i where that box was added
  function configToSSYT(config, fixedLambda) {
    var conjShape = conjugatePartition(fixedLambda);
    if (conjShape.length === 0) return { shape: [], filling: [] };

    // Build the chain: λ⁰=∅, λ¹, λ², ..., λ^k
    var chain = [[]]; // λ⁰ = ∅
    var sortedConfig = config.slice().sort(function(a, b) { return a.level - b.level; });
    for (var i = 0; i < sortedConfig.length; i++) {
      chain.push(sortedConfig[i].part);
    }

    // For each box in λ (original shape), determine when it was added
    // Box at row r, col c in λ exists if c < λ_r
    // It was added at level i if λ^i_r > λ^{i-1}_r and c = λ^{i-1}_r (the new box in row r at step i)
    // Since vertical strip: at most one box per row per step
    var fillingOrig = []; // filling[r][c] = level
    for (var r = 0; r < fixedLambda.length; r++) {
      fillingOrig[r] = new Array(fixedLambda[r]).fill(0);
    }
    for (var i = 1; i < chain.length; i++) {
      var prev = chain[i - 1];
      var cur = chain[i];
      for (var r = 0; r < cur.length; r++) {
        var prevVal = r < prev.length ? prev[r] : 0;
        if (cur[r] > prevVal) {
          // Box added at (r, prevVal) in step i
          fillingOrig[r][prevVal] = i;
        }
      }
    }

    // Transpose to get SSYT of shape λ'
    var filling = [];
    for (var r = 0; r < conjShape.length; r++) {
      filling[r] = [];
      for (var c = 0; c < conjShape[r]; c++) {
        // Transposed: (r,c) in λ' corresponds to (c,r) in λ
        filling[r][c] = fillingOrig[c][r];
      }
    }

    return { shape: conjShape, filling: filling };
  }

  // Color palette for SSYT entries (level 1..k)
  var ssytColors = ['#e6194b','#3cb44b','#4363d8','#f58231','#911eb4',
                    '#42d4f4','#f032e6','#bfef45','#fabed4','#469990'];

  // alphaBoxes: Set of "level,origRow" strings (or null if a=1)
  // SSYT cell at (r,c) → original λ cell at (c,r) → origRow = c
  function renderSSYThtml(ssyt, alphaBoxes) {
    var shape = ssyt.shape, filling = ssyt.filling;
    if (shape.length === 0) return '<span style="font-size:12px;color:#888;">∅</span>';
    var maxCols = shape[0];
    var html = '<table class="ssyt">';
    for (var r = 0; r < shape.length; r++) {
      html += '<tr>';
      for (var c = 0; c < maxCols; c++) {
        if (c < shape[r]) {
          var val = filling[r][c]; // val = level
          var origRow = c;         // SSYT(r,c) → λ(c,r), original row = c
          var isAlpha = alphaBoxes && alphaBoxes.has(val + ',' + origRow);
          var col = ssytColors[(val - 1) % ssytColors.length];
          var bg = isAlpha ? '#ffe0e0' : '#fff';
          html += '<td style="color:' + col + ';background:' + bg + ';">' + val + '</td>';
        } else {
          html += '<td class="empty"></td>';
        }
      }
      html += '</tr>';
    }
    html += '</table>';
    return html;
  }

  // ═══════════════════════════════════════════════════
  //  UI
  // ═══════════════════════════════════════════════════

  function updateChainDisplay() {
    var k = parseInt(document.getElementById('gt-k').value);
    var chain = '∅ = λ⁰';
    for (var i = 1; i <= k; i++) chain += ' ≺\' λ' + toSup(i);
    chain += '  (fixed)';
    document.getElementById('gt-chain').textContent = chain;

    var formulaEl = document.getElementById('gt-formula');
    var latex = '\\displaystyle s_{\\lambda\'}(x_1,\\ldots,x_' + k + ') = \\sum ';
    for (var i = 1; i <= k; i++) {
      latex += 'x_{' + i + '}^{|\\lambda^{' + i + '}|-|\\lambda^{' + (i - 1) + '}|}';
      if (i < k) latex += '\\, ';
    }
    renderLatex(latex, formulaEl, false);
  }

  function doCompute() {
    var k = parseInt(document.getElementById('gt-k').value);
    var lambdaStr = document.getElementById('gt-lambda').value;
    var aOne = document.getElementById('gt-a-one').checked;
    var errorEl = document.getElementById('gt-error');
    var resultEl = document.getElementById('gt-result');
    errorEl.textContent = '';
    resultEl.style.display = 'none';

    var lambda = parsePartition(lambdaStr);
    if (lambda === null) { errorEl.textContent = 'Invalid partition.'; return; }
    if (lambda.length > 0 && lambda[0] > k) {
      errorEl.textContent = 'Largest part (' + lambda[0] + ') must be ≤ k = ' + k; return;
    }

    var t0 = performance.now();
    var result = computeGTSchemes(lambda, k);
    var elapsed = (performance.now() - t0).toFixed(1);

    var nonZero = 0;
    result.poly.forEach(function(c) { if (c !== 0) nonZero++; });

    // Compute global nn for α
    var globalNN = 1;
    for (var ci0 = 0; ci0 < result.configs.length; ci0++) {
      var cc0 = result.configs[ci0];
      for (var ei0 = 0; ei0 < cc0.length; ei0++) {
        globalNN = Math.max(globalNN, cc0[ei0].part.length + cc0[ei0].level - 1);
      }
    }
    // Also account for μ levels (= λ levels in y=0 case)
    for (var ci0 = 0; ci0 < result.configs.length; ci0++) {
      var cc0 = result.configs[ci0];
      for (var ei0 = 0; ei0 < cc0.length; ei0++) {
        if (cc0[ei0].level < k)
          globalNN = Math.max(globalNN, cc0[ei0].part.length + cc0[ei0].level);
      }
    }

    document.getElementById('gt-count').textContent =
      result.configCount + (result.aborted ? ' (aborted)' : '');
    document.getElementById('gt-terms').textContent = nonZero;
    document.getElementById('gt-time').textContent = elapsed + ' ms';

    var polyEl = document.getElementById('gt-poly');
    var xVarLatex = []; var xVarMma = [];
    for (var i = 1; i <= k; i++) { xVarLatex.push('x_{' + i + '}'); xVarMma.push('x[' + i + ']'); }

    if (nonZero === 0) {
      polyEl.textContent = '0 (no valid GT schemes)';
      lastMmaString = '0';
    } else if (!aOne && result.configs.length > 0) {
      // Build polynomial with α: x_i vars + a
      var polyA = new Map();
      for (var ci = 0; ci < result.configs.length; ci++) {
        var cfg = result.configs[ci];
        // x exponents from the chain
        var expsX = new Array(k).fill(0);
        var sortedCfg = cfg.slice().sort(function(a, b) { return a.level - b.level; });
        var prevSize = 0;
        for (var j = 0; j < sortedCfg.length; j++) {
          expsX[sortedCfg[j].level - 1] = partSize(sortedCfg[j].part) - prevSize;
          prevSize = partSize(sortedCfg[j].part);
        }
        // α count via local SSYT formula
        var ssytForAlpha = configToSSYT(cfg, lambda);
        var alphaResult = countAlphaLocal(ssytForAlpha, globalNN);
        var aDeg = alphaResult.count;
        var fullExps = expsX.concat([aDeg]);
        polyAddTo(polyA, makeKey(fullExps), 1);
      }
      var varNamesLatex = xVarLatex.concat(['a']);
      var varNamesMma = xVarMma.concat(['a']);
      renderLatex('\\displaystyle ' + polyToLatex(polyA, varNamesLatex), polyEl, false);
      lastMmaString = polyToMma(polyA, varNamesMma);
    } else {
      renderLatex('\\displaystyle ' + polyToLatex(result.poly, xVarLatex), polyEl, false);
      lastMmaString = polyToMma(result.poly, xVarMma);
    }

    var copyBtn = document.getElementById('gt-copy-mma');
    copyBtn.style.display = nonZero > 0 ? 'inline-block' : 'none';

    // SSYT verification
    var verifyEl = document.getElementById('gt-verify');
    if (nonZero > 0) {
      var conjLam = conjugatePartition(lambda);
      var ssytPoly = computeSchurSSYT(conjLam, k);
      var match = polyEqual(result.poly, ssytPoly);
      var verifyHtml = match
        ? '<span style="color:#1a6b2e;">✓ At a=1: matches s<sub>' + partStr(conjLam) + '</sub>(x<sub>1</sub>,…,x<sub>' + k + '</sub>) via SSYT</span>'
        : '<span style="color:#c00;">✗ MISMATCH with s<sub>' + partStr(conjLam) + '</sub></span>';

      // Local α formula test
      if (result.configs.length > 0) {
        var alphaTest = testAlphaFormula(result.configs, k, globalNN, lambda);
        if (alphaTest.match) {
          verifyHtml += '<br><span style="color:#1a6b2e;">✓ Local α formula matches dimer engine for all ' + result.configs.length + ' configs (nn=' + globalNN + ')</span>';
        } else {
          verifyHtml += '<br><span style="color:#c00;">✗ ' + alphaTest.details + '</span>';
        }
      }

      verifyEl.innerHTML = verifyHtml;
      verifyEl.style.display = 'block';
    } else { verifyEl.style.display = 'none'; }

    // Show SSYT tableaux
    var configsEl = document.getElementById('gt-configs');
    if (document.getElementById('gt-show-configs').checked && result.configs.length > 0) {
      var maxShow = Math.min(result.configs.length, 200);
      var html = '<strong>' + result.configs.length + ' tableaux (shape ' + partStr(conjugatePartition(lambda)) + '):</strong><br>';

      for (var ci = 0; ci < maxShow; ci++) {
        var cfg = result.configs[ci];
        // Compute weight string
        var sortedCfg = cfg.slice().sort(function(a, b) { return a.level - b.level; });
        var prevSize = 0;
        var weightParts = [];
        for (var j = 0; j < sortedCfg.length; j++) {
          var exp = partSize(sortedCfg[j].part) - prevSize;
          prevSize = partSize(sortedCfg[j].part);
          if (exp > 0) weightParts.push('x' + toSub(sortedCfg[j].level) + (exp === 1 ? '' : toSup(exp)));
        }
        var ssyt = configToSSYT(cfg, lambda);
        var alphaBoxesSet = null;
        if (!aOne) {
          // Use local SSYT formula (verified against dimer engine)
          var alphaRes = countAlphaLocal(ssyt, globalNN);
          if (alphaRes.count > 0) weightParts.push('a' + (alphaRes.count === 1 ? '' : toSup(alphaRes.count)));
          alphaBoxesSet = alphaRes.alphaBoxes;
        }
        var weightStr = weightParts.length > 0 ? weightParts.join('') : '1';
        var block = '<div class="config-block"><div class="config-header">#' + (ci + 1) + ' ' + weightStr + '</div>';
        block += renderSSYThtml(ssyt, alphaBoxesSet);
        block += '</div>';
        html += block;
      }
      configsEl.innerHTML = html;
      configsEl.style.display = 'block';
    } else { configsEl.style.display = 'none'; }

    resultEl.style.display = 'block';
  }

  document.getElementById('gt-copy-mma').addEventListener('click', function() {
    navigator.clipboard.writeText(lastMmaString).then(function() {
      var btn = document.getElementById('gt-copy-mma');
      btn.textContent = 'Copied!';
      setTimeout(function() { btn.textContent = 'Copy Mathematica'; }, 1500);
    });
  });
  document.getElementById('gt-mass-test').addEventListener('click', runMassTest);
  document.getElementById('gt-compute').addEventListener('click', doCompute);
  document.getElementById('gt-k').addEventListener('change', updateChainDisplay);
  document.getElementById('gt-lambda').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doCompute();
  });

  updateChainDisplay();
  if (document.readyState === 'complete') { doCompute(); }
  else { window.addEventListener('load', doCompute); }
})();
</script>
