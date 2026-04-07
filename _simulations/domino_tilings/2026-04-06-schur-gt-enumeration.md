---
title: Schur Polynomial via GT Pattern Enumeration
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2026-04-06-schur-gt-enumeration.md'
    txt: 'Pure JavaScript GT pattern enumeration for Schur polynomials'
a11y-description: "Interactive tool for computing Schur-type polynomials by enumerating Gelfand-Tsetlin patterns. Fix a partition lambda at level k and enumerate all valid interlacing sequences of partitions from the empty partition up to lambda, alternating vertical and horizontal strips. The weighted sum over configurations gives a polynomial in variables x_i and y_i."
---

<style>
.gt-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.gt-row label { font-size: 14px; }
.gt-row input[type=text] { width: 140px; font-family: monospace; font-size: 14px; }
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
</style>

<div class="gt-row">
  <label>Level k:</label>
  <select id="gt-k" aria-label="Level k">
    <option value="1">1</option>
    <option value="2" selected>2</option>
    <option value="3">3</option>
    <option value="4">4</option>
    <option value="5">5</option>
  </select>
  <label style="margin-left:12px;">λ<sup>k</sup>:</label>
  <input id="gt-lambda" type="text" value="(2,1)" placeholder="(2,1)" aria-label="Partition lambda">
  <span class="gt-info" style="color:#888;">(parts ≤ k)</span>
</div>

<div class="gt-row">
  <button id="gt-compute" class="gt-btn">Compute</button>
  <label style="margin-left:12px; font-size:13px;">
    <input type="checkbox" id="gt-show-configs" checked> Show configurations
  </label>
  <label style="margin-left:12px; font-size:13px;">
    <input type="checkbox" id="gt-y-zero"> Set all y<sub>i</sub> = 0
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
  <label style="margin-left:12px; font-size:13px;">
    View: <select id="gt-view" style="font-size:13px;">
      <option value="particles">Particles</option>
      <option value="dimers" selected>Dimers</option>
    </select>
  </label>
</div>

<div id="gt-chain" class="gt-chain"></div>
<div id="gt-formula" class="gt-formula"></div>

<div id="gt-result" class="gt-output" style="display:none;">
  <div class="gt-info"><strong>Configurations:</strong> <span id="gt-count">0</span> &ensp;|&ensp; <strong>Polynomial terms:</strong> <span id="gt-terms">0</span> &ensp;|&ensp; <span id="gt-time"></span></div>
  <div id="gt-poly" class="gt-poly"></div>
  <div><button id="gt-copy-mma" style="font-size:11px;padding:2px 8px;margin:4px 0;display:none;cursor:pointer;">Copy Mathematica</button></div>
  <div id="gt-verify" class="gt-info" style="display:none;"></div>
  <div id="gt-configs" class="gt-configs" style="display:none;"></div>
</div>

<div id="gt-error" class="gt-error"></div>

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

  // Partition → particle positions (1-indexed)
  // h = number of particles (from Aztec diamond structure, >= number of parts)
  // Empty partition with h=5 → positions {1,2,3,4,5} (tightest packing = all particles)
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
  //  ENUMERATION OF STRIPS
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

  function enumHorizStripSupers(mu, maxPart) {
    var results = [];
    var s = mu.length;
    function rec(j, lam) {
      if (j > s) {
        var t = lam.slice();
        while (t.length > 0 && t[t.length - 1] === 0) t.pop();
        results.push(t); return;
      }
      var lo, hi;
      if (j === 0) { lo = s > 0 ? mu[0] : 0; hi = maxPart; }
      else if (j < s) { lo = mu[j]; hi = mu[j - 1]; }
      else { lo = 0; hi = s > 0 ? mu[s - 1] : 0; }
      if (lo > hi) return;
      for (var v = lo; v <= hi; v++) { lam.push(v); rec(j + 1, lam); lam.pop(); }
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

  function polyAddPoly(a, b) {
    var result = new Map(a);
    b.forEach(function(coeff, key) { polyAddTo(result, key, coeff); });
    return result;
  }

  // ═══════════════════════════════════════════════════
  //  MAIN COMPUTATION
  // ═══════════════════════════════════════════════════

  function computeSchurPoly(fixedLambda, k, yZero) {
    var numVars = yZero ? k : (2 * k - 1);
    function xIdx(level) { return yZero ? (level - 1) : 2 * (level - 1); }
    function yIdx(level) { return 2 * (level - 1) + 1; }

    var cache = new Map();
    var configCount = 0;
    var configs = [];
    var wantConfigs = document.getElementById('gt-show-configs').checked ||
                      !document.getElementById('gt-a-one').checked;
    var MAX_CONFIGS = 50000;
    var aborted = false;

    function fromLambda(lambda, level, chain) {
      if (aborted) return new Map();
      var cacheKey = 'L:' + lambda.join(',') + ':' + level;
      if (!wantConfigs && cache.has(cacheKey)) {
        var cached = cache.get(cacheKey);
        configCount += cached.count; return cached.poly;
      }
      var countBefore = configCount;
      var result = new Map();
      var lamSize = partSize(lambda);
      var subs = enumVertStripSubs(lambda);
      for (var si = 0; si < subs.length; si++) {
        if (aborted) break;
        var mu = subs[si];
        var mono = new Array(numVars).fill(0);
        mono[xIdx(level)] = lamSize - partSize(mu);
        if (level === 1) {
          if (mu.length === 0) {
            configCount++;
            if (configCount > MAX_CONFIGS) { aborted = true; break; }
            if (wantConfigs) {
              configs.push(chain.concat([
                { type: 'lam', level: 1, part: lambda.slice() },
                { type: 'mu', level: 0, part: [] }
              ]));
            }
            var p = new Map(); p.set(makeKey(mono), 1);
            result = polyAddPoly(result, p);
          }
        } else {
          var newChain = wantConfigs
            ? chain.concat([{ type: 'lam', level: level, part: lambda.slice() }]) : chain;
          var subPoly = fromMu(mu, level - 1, newChain);
          result = polyAddPoly(result, polyMulMono(subPoly, mono));
        }
      }
      if (!wantConfigs) cache.set(cacheKey, { poly: result, count: configCount - countBefore });
      return result;
    }

    function fromMu(mu, level, chain) {
      if (aborted) return new Map();
      if (yZero) {
        var newChain = wantConfigs
          ? chain.concat([{ type: 'mu', level: level, part: mu.slice() }]) : chain;
        return fromLambda(mu, level, newChain);
      }
      var cacheKey = 'M:' + mu.join(',') + ':' + level;
      if (!wantConfigs && cache.has(cacheKey)) {
        var cached = cache.get(cacheKey);
        configCount += cached.count; return cached.poly;
      }
      var countBefore = configCount;
      var result = new Map();
      var muSize = partSize(mu);
      var newChain2 = wantConfigs
        ? chain.concat([{ type: 'mu', level: level, part: mu.slice() }]) : chain;
      var supers = enumHorizStripSupers(mu, level);
      for (var si = 0; si < supers.length; si++) {
        if (aborted) break;
        var lambda = supers[si];
        var mono = new Array(numVars).fill(0);
        mono[yIdx(level)] = partSize(lambda) - muSize;
        var subPoly = fromLambda(lambda, level, newChain2);
        result = polyAddPoly(result, polyMulMono(subPoly, mono));
      }
      if (!wantConfigs) cache.set(cacheKey, { poly: result, count: configCount - countBefore });
      return result;
    }

    var poly = fromLambda(fixedLambda, k, []);
    return { poly: poly, configCount: configCount, configs: configs, aborted: aborted };
  }

  // ═══════════════════════════════════════════════════
  //  SCHUR VIA SSYT (verification)
  // ═══════════════════════════════════════════════════

  function conjugatePartition(lambda) {
    if (lambda.length === 0) return [];
    var conj = [];
    for (var j = 1; j <= lambda[0]; j++) {
      var c = 0; for (var i = 0; i < lambda.length; i++) if (lambda[i] >= j) c++;
      conj.push(c);
    }
    return conj;
  }

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
  //  POLYNOMIAL → LaTeX
  // ═══════════════════════════════════════════════════

  var MAX_LATEX_TERMS = 60;
  var lastMmaString = '';

  // Convert polynomial Map to Mathematica string
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

  function polyToLatex(poly, k, yZero) {
    var entries = [];
    poly.forEach(function(c, key) { if (c !== 0) entries.push([key, c]); });
    if (entries.length === 0) return '0';
    var varNames = [];
    if (yZero) { for (var i = 1; i <= k; i++) varNames.push('x_{' + i + '}'); }
    else { for (var i = 1; i <= k; i++) { varNames.push('x_{' + i + '}'); if (i < k) varNames.push('y_{' + i + '}'); } }
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

  // ═══════════════════════════════════════════════════
  //  KaTeX helper
  // ═══════════════════════════════════════════════════

  function renderLatex(latex, el, displayMode) {
    if (typeof katex !== 'undefined') {
      try { katex.render(latex, el, { displayMode: !!displayMode }); }
      catch (e) { el.innerHTML = '<code style="word-break:break-all;">' + latex + '</code>'; }
    } else { setTimeout(function() { renderLatex(latex, el, displayMode); }, 200); }
  }

  // ═══════════════════════════════════════════════════
  //  DOMINO RENDERING ON CANVAS
  // ═══════════════════════════════════════════════════

  var GREEN = '#228B22', ORANGE = '#FF8C00';
  var DOMINO_GREEN = 'rgba(34,139,34,0.25)', DOMINO_ORANGE = 'rgba(255,140,0,0.25)';
  var DOMINO_EDGE = 'rgba(0,0,0,0.3)', HOLE_STROKE = '#333';

  // Bipartite matching: each mid position j can match to outer position j or j+offset
  // where offset=0 means j,j+1 and offset=-1 means j-1,j (depends on midIsBigger)
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
    for (var i = 0; i < midArr.length; i++) {
      visited = {};
      augment(midArr[i]);
    }
    var pairs = [];
    for (var o in match) pairs.push({ mid: match[o], outer: parseInt(o) });
    return pairs;
  }

  // Reconstruct dominos from a config. Returns {dominos, diagInfo, allCells}.
  // Each domino = {gx, gy, horiz, isParticle, isAlpha}
  // isAlpha = horizontal AND left cell is black (carries weight a in 2x2 periodic)
  function reconstructDominos(config, k, nn) {
    var sorted = config.slice().sort(function(a, b) {
      if (a.level !== b.level) return a.level - b.level;
      return a.type === 'lam' ? -1 : 1;
    });
    var parityOffset = nn;
    var diagInfo = [], allCells = [];
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
      var cells = [];
      for (var x = x_min; x <= x_max; x++) {
        var posIdx = x - x_min + 1;
        var cell = { gx: x, gy: d_val - x, isParticle: !!posSet[posIdx] };
        cells.push(cell); allCells.push(cell);
      }
      diagInfo.push({ entry: entry, isLam: isLam, d_val: d_val, x_min: x_min, nPos: nPos, posSet: posSet, cells: cells });
    }
    var dominos = [];
    for (var ri = 0; ri < diagInfo.length; ri++) {
      var diag = diagInfo[ri];
      if (diag.isLam) continue;
      var muParticles = [], muHoles = [];
      for (var j = 1; j <= diag.nPos; j++) {
        if (diag.posSet[j]) muParticles.push(j); else muHoles.push(j);
      }
      var lamAboveIdx = ri + 1;
      if (lamAboveIdx < diagInfo.length && muParticles.length > 0) {
        var lamAbove = diagInfo[lamAboveIdx];
        var pTarget = {};
        for (var j = 1; j <= lamAbove.nPos; j++) if (lamAbove.posSet[j]) pTarget[j] = true;
        var pPairs = bipartiteMatch(muParticles, pTarget, lamAbove.nPos, false);
        for (var di = 0; di < pPairs.length; di++) {
          var p = pPairs[di];
          var x1 = diag.x_min + (p.mid - 1), y1 = diag.d_val - x1;
          var x2 = lamAbove.x_min + (p.outer - 1), y2 = lamAbove.d_val - x2;
          var gx = Math.min(x1, x2), gy = Math.min(y1, y2);
          var horiz = (y1 === y2);
          // isAlpha: horizontal AND left cell is black (odd parity)
          var xPar = document.getElementById('gt-a-parity').value === 'odd' ? 1 : 0;
          var isA = horiz && (((gx + gy + parityOffset) % 2 + 2) % 2 === 1) && (((gx + gy) % 4 + 4) % 4 === 2) && (((gx % 2) + 2) % 2 === xPar);
          dominos.push({ gx: gx, gy: gy, horiz: horiz, isParticle: true, isAlpha: isA });
        }
      }
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
          var xPar = document.getElementById('gt-a-parity').value === 'odd' ? 1 : 0;
          var isA = horiz && (((gx + gy + parityOffset) % 2 + 2) % 2 === 1) && (((gx + gy) % 4 + 4) % 4 === 2) && (((gx % 2) + 2) % 2 === xPar);
          dominos.push({ gx: gx, gy: gy, horiz: horiz, isParticle: false, isAlpha: isA });
        }
      }
    }
    return { dominos: dominos, diagInfo: diagInfo, allCells: allCells };
  }

  // Match all positions between two adjacent rows
  function computeDominos(midPSet, topPSet, nMid, nTop, midIsBigger) {
    var midParticles = [], midHoles = [];
    for (var j = 1; j <= nMid; j++) {
      if (midPSet[j]) midParticles.push(j); else midHoles.push(j);
    }
    var particleTarget = {}, holeTarget = {};
    // Particle dominos: mid particles → outer particles
    for (var j = 1; j <= nTop; j++) if (topPSet[j]) particleTarget[j] = true;
    // Hole dominos: mid holes → outer holes
    for (var j = 1; j <= nTop; j++) if (!topPSet[j]) holeTarget[j] = true;
    return {
      particlePairs: bipartiteMatch(midParticles, particleTarget, nTop, midIsBigger),
      holePairs: bipartiteMatch(midHoles, holeTarget, nTop, midIsBigger)
    };
  }

  // Render config on square lattice with domino outlines.
  function renderConfig(canvas, config, k, yZero, nn, viewMode) {
    var dpr = window.devicePixelRatio || 1;
    var cw = canvas.width / dpr, ch = canvas.height / dpr;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    var rd = reconstructDominos(config, k, nn);
    var dominos = rd.dominos, diagInfo = rd.diagInfo, allCells = rd.allCells;

    if (allCells.length === 0) { ctx.restore(); return; }

    // Bounding box
    var minGx = allCells[0].gx, maxGx = allCells[0].gx;
    var minGy = allCells[0].gy, maxGy = allCells[0].gy;
    for (var i = 1; i < allCells.length; i++) {
      var c = allCells[i];
      if (c.gx < minGx) minGx = c.gx; if (c.gx > maxGx) maxGx = c.gx;
      if (c.gy < minGy) minGy = c.gy; if (c.gy > maxGy) maxGy = c.gy;
    }

    var spanX = maxGx - minGx + 1, spanY = maxGy - minGy + 1;
    var margin = 4;
    var cellSize = Math.min((cw - 2 * margin) / (spanX + 1), (ch - 2 * margin) / (spanY + 1));
    cellSize = Math.min(cellSize, 24);
    var radius = cellSize * 0.35;
    var midGx = (minGx + maxGx + 1) / 2, midGy = (minGy + maxGy + 1) / 2;
    var parityOffset = nn;

    function pxX(gx) { return cw / 2 + (gx - midGx) * cellSize; }
    function pxY(gy) { return ch / 2 - (gy + 1 - midGy) * cellSize; }

    // ── 2. Draw checkerboard for ALL cells ──
    for (var i = 0; i < allCells.length; i++) {
      var c = allCells[i];
      var isWhite = ((c.gx + c.gy + parityOffset) % 2 + 2) % 2 === 0;
      ctx.fillStyle = isWhite ? '#d8d8d8' : '#fff';
      ctx.fillRect(pxX(c.gx), pxY(c.gy), cellSize, cellSize);
    }

    if (viewMode === 'dimers') {
      // ── DIMER VIEW: dots connected by thick lines ──
      var dotR = cellSize * 0.18;
      var lineW = Math.max(2, cellSize * 0.14);
      var hasAlpha = !document.getElementById('gt-a-one').checked; // show a-weighted dimers
      ctx.lineCap = 'round';
      for (var i = 0; i < dominos.length; i++) {
        var d = dominos[i];
        // When α is set: highlight dimers carrying weight a (horizontal, black→white)
        var color = hasAlpha ? (d.isAlpha ? '#c00' : '#aaa') : '#000';
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        var cx1, cy1, cx2, cy2;
        if (d.horiz) {
          cx1 = pxX(d.gx) + cellSize / 2;
          cy1 = pxY(d.gy) + cellSize / 2;
          cx2 = pxX(d.gx + 1) + cellSize / 2;
          cy2 = cy1;
        } else {
          cx1 = pxX(d.gx) + cellSize / 2;
          cy1 = pxY(d.gy) + cellSize / 2;
          cx2 = cx1;
          cy2 = pxY(d.gy + 1) + cellSize / 2;
        }
        // Line
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();
        // Dots
        ctx.beginPath(); ctx.arc(cx1, cy1, dotR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx2, cy2, dotR, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // ── PARTICLE VIEW ──
      // 3. Draw domino outlines
      ctx.strokeStyle = '#000';
      ctx.lineWidth = Math.max(1.5, cellSize / 8);
      for (var i = 0; i < dominos.length; i++) {
        var d = dominos[i];
        if (d.horiz) {
          ctx.strokeRect(pxX(d.gx), pxY(d.gy), 2 * cellSize, cellSize);
        } else {
          ctx.strokeRect(pxX(d.gx), pxY(d.gy + 1), cellSize, 2 * cellSize);
        }
      }
      // 4. Draw circles at cell centers
      for (var i = 0; i < allCells.length; i++) {
        var c = allCells[i];
        var cx = pxX(c.gx) + cellSize / 2;
        var cy = pxY(c.gy) + cellSize / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        if (c.isParticle) {
          var isWhiteCell = ((c.gx + c.gy + parityOffset) % 2 + 2) % 2 === 0;
          ctx.fillStyle = isWhiteCell ? '#228B22' : '#FF8C00';
          ctx.fill();
        } else {
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = Math.max(1, cellSize / 12);
          ctx.stroke();
        }
      }
    }

    ctx.restore();

  }

  function drawDomino(ctx, cx1, cy1, cx2, cy2, u, fill, stroke) {
    var dx = cx2 - cx1, dy = cy2 - cy1;
    var v;
    if (dx > 0 && dy < 0) {
      v = [[cx1 - u, cy1], [cx1, cy1 - u], [cx2 + u, cy2], [cx2, cy2 + u]];
    } else if (dx < 0 && dy < 0) {
      v = [[cx1, cy1 - u], [cx1 + u, cy1], [cx2, cy2 + u], [cx2 - u, cy2]];
    } else if (dx > 0 && dy > 0) {
      v = [[cx1, cy1 + u], [cx1 - u, cy1], [cx2, cy2 - u], [cx2 + u, cy2]];
    } else if (dx < 0 && dy > 0) {
      v = [[cx1 + u, cy1], [cx1, cy1 + u], [cx2 - u, cy2], [cx2, cy2 - u]];
    } else if (Math.abs(dx) < 0.01) {
      // Vertical domino (same x, different y)
      v = [[cx1 - u, cy1], [cx1 + u, cy1], [cx2 + u, cy2], [cx2 - u, cy2]];
    } else {
      // Horizontal domino
      v = [[cx1, cy1 - u], [cx1, cy1 + u], [cx2, cy2 + u], [cx2, cy2 - u]];
    }
    ctx.beginPath();
    ctx.moveTo(v[0][0], v[0][1]);
    for (var i = 1; i < v.length; i++) ctx.lineTo(v[i][0], v[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.5; ctx.stroke(); }
  }

  function drawCircle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
  }

  // ═══════════════════════════════════════════════════
  //  UI
  // ═══════════════════════════════════════════════════

  function updateChainDisplay() {
    var k = parseInt(document.getElementById('gt-k').value);
    var chain = 'μ⁰=∅';
    for (var i = 1; i <= k; i++) {
      chain += ' ≺\' λ' + toSup(i);
      if (i < k) chain += ' ≻ μ' + toSup(i);
    }
    chain += '  (fixed)';
    document.getElementById('gt-chain').textContent = chain;

    var formulaEl = document.getElementById('gt-formula');
    var latex = '\\displaystyle\\sum ';
    for (var i = 1; i <= k; i++) {
      latex += 'x_{' + i + '}^{|\\lambda^{' + i + '}|-|\\mu^{' + (i - 1) + '}|}';
      if (i < k) latex += '\\, y_{' + i + '}^{|\\lambda^{' + i + '}|-|\\mu^{' + i + '}|}';
      if (i < k) latex += '\\, ';
    }
    renderLatex(latex, formulaEl, false);
  }

  function doCompute() {
    var k = parseInt(document.getElementById('gt-k').value);
    var lambdaStr = document.getElementById('gt-lambda').value;
    var yZero = document.getElementById('gt-y-zero').checked;
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
    var result = computeSchurPoly(lambda, k, yZero);
    var elapsed = (performance.now() - t0).toFixed(1);

    var nonZero = 0;
    result.poly.forEach(function(c) { if (c !== 0) nonZero++; });

    document.getElementById('gt-count').textContent =
      result.configCount + (result.aborted ? ' (aborted)' : '');
    document.getElementById('gt-terms').textContent = nonZero;
    document.getElementById('gt-time').textContent = elapsed + ' ms';

    // Compute global nn from ALL configs (needed for domino reconstruction)
    var globalNN = 1;
    for (var ci0 = 0; ci0 < result.configs.length; ci0++) {
      var cc0 = result.configs[ci0];
      for (var ei0 = 0; ei0 < cc0.length; ei0++) {
        var e0 = cc0[ei0];
        globalNN = Math.max(globalNN, e0.type === 'lam' ? e0.part.length + e0.level - 1 : e0.part.length + e0.level);
      }
    }

    var polyEl = document.getElementById('gt-poly');
    var aOne = document.getElementById('gt-a-one').checked;

    if (nonZero === 0) {
      polyEl.textContent = '0 (no valid GT patterns)';
    } else if (!aOne) {
      // Full polynomial in x_i, y_i AND a (2×2 periodic weight)
      // For each config: standard (x,y) exponents + a^(count of α-dimers)
      var numVarsOrig = yZero ? k : (2 * k - 1);
      var polyA = new Map(); // keys have numVarsOrig + 1 entries (last = a exponent)
      for (var ci2 = 0; ci2 < result.configs.length; ci2++) {
        var cfg = result.configs[ci2];
        // Compute (x,y) exponents
        var sorted2 = cfg.slice().sort(function(a, b) {
          if (a.level !== b.level) return a.level - b.level;
          return a.type === 'lam' ? -1 : 1;
        });
        var byKey2 = {};
        for (var ei2 = 0; ei2 < sorted2.length; ei2++)
          byKey2[(sorted2[ei2].type === 'mu' ? 'mu' : 'lam') + sorted2[ei2].level] = sorted2[ei2].part;
        var expsA = new Array(numVarsOrig + 1).fill(0);
        for (var j2 = 1; j2 <= k; j2++) {
          var lam2 = byKey2['lam' + j2] || [];
          var muPrev2 = byKey2['mu' + (j2 - 1)] || [];
          expsA[yZero ? (j2 - 1) : 2 * (j2 - 1)] = partSize(lam2) - partSize(muPrev2);
          if (!yZero && j2 < k) {
            var muCur2 = byKey2['mu' + j2] || [];
            expsA[2 * (j2 - 1) + 1] = partSize(lam2) - partSize(muCur2);
          }
        }
        // Count α-dimers
        var rd2 = reconstructDominos(cfg, k, globalNN);
        var aDeg2 = 0;
        for (var di2 = 0; di2 < rd2.dominos.length; di2++) {
          if (rd2.dominos[di2].isAlpha) aDeg2++;
        }
        expsA[numVarsOrig] = aDeg2;
        polyAddTo(polyA, makeKey(expsA), 1);
      }
      // Format as LaTeX with variable names x1,y1,...,xk,a
      var varNamesA = [];
      if (yZero) { for (var i = 1; i <= k; i++) varNamesA.push('x_{' + i + '}'); }
      else { for (var i = 1; i <= k; i++) { varNamesA.push('x_{' + i + '}'); if (i < k) varNamesA.push('y_{' + i + '}'); } }
      varNamesA.push('a');
      var entriesA = [];
      polyA.forEach(function(c, key) { if (c !== 0) entriesA.push([key, c]); });
      entriesA.sort(function(a, b) {
        var ea = parseKey(a[0]), eb = parseKey(b[0]);
        var sa = 0, sb = 0;
        for (var i = 0; i < ea.length; i++) sa += ea[i];
        for (var i = 0; i < eb.length; i++) sb += eb[i];
        if (sa !== sb) return sb - sa;
        for (var i = 0; i < ea.length; i++) { if (ea[i] !== eb[i]) return eb[i] - ea[i]; }
        return 0;
      });
      var latexA = '';
      for (var t = 0; t < entriesA.length; t++) {
        var key = entriesA[t][0], coeff = entriesA[t][1];
        var exps = parseKey(key), absC = Math.abs(coeff), sign = coeff > 0 ? '+' : '-';
        var mono = '';
        for (var i = 0; i < exps.length; i++) {
          if (exps[i] === 0) continue;
          if (exps[i] === 1) mono += varNamesA[i];
          else mono += varNamesA[i] + '^{' + exps[i] + '}';
        }
        if (mono === '') mono = String(absC);
        else if (absC !== 1) mono = absC + '\\,' + mono;
        if (t === 0) latexA += (coeff < 0 ? '-' : '') + mono;
        else latexA += ' ' + sign + ' ' + mono;
        if (t >= MAX_LATEX_TERMS - 1 && t < entriesA.length - 1) {
          latexA += ' + \\cdots\\;(' + (entriesA.length - t - 1) + '\\text{ more terms})';
          break;
        }
      }
      renderLatex('\\displaystyle ' + (latexA || '0'), polyEl, false);
      // Mathematica string for α polynomial
      var mmaVarNamesA = [];
      if (yZero) { for (var i = 1; i <= k; i++) mmaVarNamesA.push('x[' + i + ']'); }
      else { for (var i = 1; i <= k; i++) { mmaVarNamesA.push('x[' + i + ']'); if (i < k) mmaVarNamesA.push('y[' + i + ']'); } }
      mmaVarNamesA.push('a');
      lastMmaString = polyToMma(polyA, mmaVarNamesA);
    } else {
      renderLatex('\\displaystyle ' + polyToLatex(result.poly, k, yZero), polyEl, false);
      // Mathematica string for standard polynomial
      var mmaVarNames = [];
      if (yZero) { for (var i = 1; i <= k; i++) mmaVarNames.push('x[' + i + ']'); }
      else { for (var i = 1; i <= k; i++) { mmaVarNames.push('x[' + i + ']'); if (i < k) mmaVarNames.push('y[' + i + ']'); } }
      lastMmaString = polyToMma(result.poly, mmaVarNames);
    }
    var copyBtn = document.getElementById('gt-copy-mma');
    copyBtn.style.display = nonZero > 0 ? 'inline-block' : 'none';

    // SSYT verification when y=0
    var verifyEl = document.getElementById('gt-verify');
    if (yZero && nonZero > 0) {
      var conjLam = conjugatePartition(lambda);
      var ssytPoly = computeSchurSSYT(conjLam, k);
      var match = polyEqual(result.poly, ssytPoly);
      verifyEl.innerHTML = match
        ? '<span style="color:#1a6b2e;">✓ At a=1, yᵢ=0: matches s<sub>' + partStr(conjLam) + '</sub>(x<sub>1</sub>,…,x<sub>' + k + '</sub>) via SSYT</span>'
        : '<span style="color:#c00;">✗ MISMATCH with s<sub>' + partStr(conjLam) + '</sub></span>';
      verifyEl.style.display = 'block';
    } else { verifyEl.style.display = 'none'; }

    // Configurations with domino diagrams
    var configsEl = document.getElementById('gt-configs');
    if (document.getElementById('gt-show-configs').checked && result.configs.length > 0) {
      var maxShow = Math.min(result.configs.length, 100);

      // Variable names for weight display
      var varN = [];
      if (yZero) { for (var j = 1; j <= k; j++) varN.push('x' + toSub(j)); }
      else { for (var j = 1; j <= k; j++) { varN.push('x' + toSub(j)); if (j < k) varN.push('y' + toSub(j)); } }

      var numRows = 2 * k + 1;
      var canvasW = 420, canvasH = Math.max(200, (2 * globalNN + 2) * 22 + 50);
      var dpr = window.devicePixelRatio || 1;

      var html = '<strong>' + result.configs.length + ' configurations:</strong><br>';
      configsEl.innerHTML = html;

      for (var ci = 0; ci < maxShow; ci++) {
        var c = result.configs[ci];
        // Compute weight
        var sorted = c.slice().sort(function(a, b) {
          if (a.level !== b.level) return a.level - b.level;
          return a.type === 'lam' ? -1 : 1;
        });
        var byKey = {};
        for (var ei = 0; ei < sorted.length; ei++)
          byKey[(sorted[ei].type === 'mu' ? 'mu' : 'lam') + sorted[ei].level] = sorted[ei].part;
        var numVarsW = yZero ? k : (2 * k - 1);
        var exps = new Array(numVarsW).fill(0);
        for (var j = 1; j <= k; j++) {
          var lam = byKey['lam' + j] || [];
          var muPrev = byKey['mu' + (j - 1)] || [];
          exps[yZero ? (j - 1) : 2 * (j - 1)] = partSize(lam) - partSize(muPrev);
          if (!yZero && j < k) {
            var muCur = byKey['mu' + j] || [];
            exps[2 * (j - 1) + 1] = partSize(lam) - partSize(muCur);
          }
        }
        var weightParts = [];
        for (var vi = 0; vi < exps.length; vi++) {
          if (exps[vi] === 0) continue;
          weightParts.push(varN[vi] + (exps[vi] === 1 ? '' : toSup(exps[vi])));
        }
        var weightStr = weightParts.length > 0 ? weightParts.join('') : '1';

        var block = document.createElement('div');
        block.className = 'config-block';
        var header = document.createElement('div');
        header.className = 'config-header';
        header.textContent = '#' + (ci + 1) + '  ' + weightStr;
        block.appendChild(header);

        var cvs = document.createElement('canvas');
        cvs.style.width = canvasW + 'px';
        cvs.style.height = canvasH + 'px';
        cvs.width = canvasW * dpr;
        cvs.height = canvasH * dpr;
        block.appendChild(cvs);
        configsEl.appendChild(block);

        var viewMode = document.getElementById('gt-view').value;
        renderConfig(cvs, c, k, yZero, globalNN, viewMode);
      }
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
  document.getElementById('gt-compute').addEventListener('click', doCompute);
  document.getElementById('gt-k').addEventListener('change', updateChainDisplay);
  document.getElementById('gt-lambda').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doCompute();
  });

  updateChainDisplay();
  // Run compute after page fully loads (KaTeX may not be ready yet)
  if (document.readyState === 'complete') { doCompute(); }
  else { window.addEventListener('load', doCompute); }
})();
</script>
