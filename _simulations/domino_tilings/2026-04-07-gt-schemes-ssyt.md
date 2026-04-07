---
title: Gelfand-Tsetlin Schemes and SSYT
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2026-04-07-gt-schemes-ssyt.md'
    txt: 'GT schemes, SSYT enumeration, and Schur polynomials with checkerboard weight'
a11y-description: "Interactive tool for enumerating Gelfand-Tsetlin schemes and displaying them as semi-standard Young tableaux. Computes Schur polynomials with optional checkerboard weight parameter a."
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
.ssyt { display: inline-block; border-collapse: collapse; margin: 4px auto; }
.ssyt td { width: 22px; height: 22px; text-align: center; font-size: 12px; font-weight: bold;
  border: 1.5px solid #333; background: #fff; font-family: monospace; }
.ssyt .empty { border: none; background: transparent; }
</style>

<div class="gt-row">
  <label>N:</label>
  <select id="gt-k" aria-label="Number of variables N">
    <option value="1">1</option>
    <option value="2">2</option>
    <option value="3" selected>3</option>
    <option value="4">4</option>
    <option value="5">5</option>
    <option value="6">6</option>
    <option value="7">7</option>
    <option value="8">8</option>
  </select>
  <label style="margin-left:12px;">λ:</label>
  <input id="gt-lambda" type="text" value="(2,2,1)" placeholder="(2,2,1)" aria-label="Partition lambda">
  <label style="margin-left:8px;">μ:</label>
  <input id="gt-mu" type="text" value="" placeholder="∅" aria-label="Partition mu" style="width:80px;font-family:monospace;font-size:14px;">
  <span class="gt-info" style="color:#888;">(≤ N rows; skew shape λ/μ)</span>
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
    a on: <select id="gt-a-parity" style="font-size:13px;">
      <option value="odd">odd entries</option>
      <option value="even">even entries</option>
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

<div id="gt-branching" style="margin-top:12px;padding:10px;background:#f0f8f0;border:1px solid #ccc;border-radius:4px;display:none;">
  <div style="font-weight:bold;font-size:13px;margin-bottom:6px;">Branching rule check: s<sub>λ</sub>(x<sub>1</sub>,…,x<sub>N</sub>) = Σ<sub>μ⊂λ</sub> s<sub>μ</sub>(x<sub>1</sub>,…,x<sub>M</sub>) · s<sub>λ/μ</sub>(x<sub>M+1</sub>,…,x<sub>N</sub>)</div>
  <div id="gt-branching-result" class="gt-info"></div>
</div>

<details style="margin-top: 16px;">
<summary style="cursor: pointer; font-weight: bold; font-size: 14px;">How it works</summary>
<div style="margin-top: 8px; font-size: 14px; line-height: 1.6;">

Fix a partition $\lambda'$ (the SSYT shape) and level $k$. We enumerate all GT schemes
$$\varnothing = \lambda^0 \prec' \lambda^1 \prec' \lambda^2 \prec' \cdots \prec' \lambda^k$$
where each $\prec'$ is a vertical strip. Each scheme bijects to an SSYT of shape $\lambda'$: place entry $i$ in the boxes of $\lambda^i \setminus \lambda^{i-1}$.

The polynomial is $s_{\lambda'}(x_1,\ldots,x_k)$ with weight $\prod x_i^{|\lambda^i|-|\lambda^{i-1}|}$ per scheme.

**Checkerboard weight $a$:** The SSYT has a checkerboard coloring (dark = $r+c$ even, white = $r+c$ odd). The parameter $a$ weights boxes on <span style="background:#ccc;padding:0 3px;">dark cells</span> with the selected entry parity (odd or even). <span style="background:#e05050;color:#fff;padding:0 3px;">Red cells</span> carry weight $a$.

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
  //  GT SCHEME ENUMERATION (vertical strips only)
  // ═══════════════════════════════════════════════════

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function computeGTSchemes(fixedLambda, k, startPartition) {
    var numVars = k;
    var cache = new Map();
    var configCount = 0;
    var configs = [];
    var wantConfigs = document.getElementById('gt-show-configs').checked ||
                      !document.getElementById('gt-a-one').checked;
    var MAX_CONFIGS = 50000;
    var aborted = false;

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
        var subs = enumVertStripSubs(lambda);
        for (var si = 0; si < subs.length; si++) {
          var mu = subs[si];
          if (arraysEqual(mu, startPartition)) {
            configCount++;
            if (configCount > MAX_CONFIGS) { aborted = true; break; }
            var mono = new Array(numVars).fill(0);
            mono[0] = lamSize - partSize(startPartition);
            if (wantConfigs) configs.push(chain.concat([{ level: 1, part: lambda.slice() }]));
            var p = new Map(); p.set(makeKey(mono), 1);
            result = polyAddPoly(result, p);
          }
        }
      } else {
        var subs = enumVertStripSubs(lambda);
        for (var si = 0; si < subs.length; si++) {
          if (aborted) break;
          var prevLam = subs[si];
          var mono = new Array(numVars).fill(0);
          mono[level - 1] = lamSize - partSize(prevLam);
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
  //  CHECKERBOARD α-WEIGHT (pure SSYT rule)
  //  a-weighted iff: entry has selected parity AND (r+c) even (dark cell)
  // ═══════════════════════════════════════════════════

  function countAlphaSSYT(ssyt) {
    var entryParity = document.getElementById('gt-a-parity').value === 'odd' ? 1 : 0;
    var count = 0;
    var alphaBoxes = new Set();
    for (var r = 0; r < ssyt.shape.length; r++) {
      for (var c = 0; c < ssyt.shape[r]; c++) {
        var entry = ssyt.filling[r][c];
        if (entry === 0) continue; // skip μ cells in skew shape
        if (entry % 2 === entryParity && (r + c) % 2 === 0) {
          count++;
          alphaBoxes.add(entry + ',' + c); // key: "level,origRow"
        }
      }
    }
    return { count: count, alphaBoxes: alphaBoxes };
  }

  // ═══════════════════════════════════════════════════
  //  SSYT CONSTRUCTION & RENDERING
  // ═══════════════════════════════════════════════════

  function configToSSYT(config, fixedLambda, innerMu) {
    var conjShape = conjugatePartition(fixedLambda);
    var conjInner = innerMu ? conjugatePartition(innerMu) : [];
    if (conjShape.length === 0) return { shape: conjShape, filling: [], inner: conjInner };
    var startPart = innerMu || [];
    var chain = [startPart];
    var sortedConfig = config.slice().sort(function(a, b) { return a.level - b.level; });
    for (var i = 0; i < sortedConfig.length; i++) chain.push(sortedConfig[i].part);
    var fillingOrig = [];
    for (var r = 0; r < fixedLambda.length; r++) fillingOrig[r] = new Array(fixedLambda[r]).fill(0);
    for (var i = 1; i < chain.length; i++) {
      var prev = chain[i - 1], cur = chain[i];
      for (var r = 0; r < cur.length; r++) {
        var prevVal = r < prev.length ? prev[r] : 0;
        if (cur[r] > prevVal) fillingOrig[r][prevVal] = i;
      }
    }
    var filling = [];
    for (var r = 0; r < conjShape.length; r++) {
      filling[r] = [];
      for (var c = 0; c < conjShape[r]; c++) filling[r][c] = fillingOrig[c][r];
    }
    return { shape: conjShape, filling: filling, inner: conjInner };
  }

  var ssytColors = ['#e6194b','#3cb44b','#4363d8','#f58231','#911eb4',
                    '#42d4f4','#f032e6','#bfef45','#fabed4','#469990'];

  function renderSSYThtml(ssyt, alphaBoxes) {
    var shape = ssyt.shape, filling = ssyt.filling, inner = ssyt.inner || [];
    if (shape.length === 0) return '<span style="font-size:12px;color:#888;">∅</span>';
    var maxCols = shape[0];
    var html = '<table class="ssyt">';
    for (var r = 0; r < shape.length; r++) {
      var innerCols = r < inner.length ? inner[r] : 0;
      html += '<tr>';
      for (var c = 0; c < maxCols; c++) {
        if (c < innerCols) {
          // Inner μ cell — blank
          html += '<td class="empty"></td>';
        } else if (c < shape[r]) {
          var val = filling[r][c];
          var origRow = c;
          var isAlpha = alphaBoxes && val > 0 && alphaBoxes.has(val + ',' + origRow);
          var checker = (r + c) % 2 === 0 ? '#ccc' : '#fff';
          var col = ssytColors[((val || 1) - 1) % ssytColors.length];
          if (isAlpha) {
            html += '<td style="color:#fff;background:' + col + ';border-radius:50%;">' + val + '</td>';
          } else {
            html += '<td style="color:' + col + ';background:' + checker + ';">' + (val || '') + '</td>';
          }
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
  //  UI
  // ═══════════════════════════════════════════════════

  function updateChainDisplay() {
    var k = parseInt(document.getElementById('gt-k').value);
    var chain = '∅ = λ⁰';
    for (var i = 1; i <= k; i++) chain += ' ≺\' λ' + toSup(i);
    chain += '  (fixed)';
    document.getElementById('gt-chain').textContent = chain;
    var formulaEl = document.getElementById('gt-formula');
    var muLabel = document.getElementById('gt-mu').value.trim();
    var isSkew = muLabel && muLabel !== '∅' && muLabel !== '';
    var shapeLatex = isSkew ? '\\lambda/\\mu' : '\\lambda';
    var latex = '\\displaystyle s_{' + shapeLatex + '}(x_1,\\ldots,x_' + k + ') = \\sum ';
    for (var i = 1; i <= k; i++) {
      latex += 'x_{' + i + '}^{|\\lambda^{' + i + '}|-|\\lambda^{' + (i - 1) + '}|}';
      if (i < k) latex += '\\, ';
    }
    renderLatex(latex, formulaEl, false);
  }

  function doCompute() {
    var k = parseInt(document.getElementById('gt-k').value);
    var lambdaStr = document.getElementById('gt-lambda').value;
    var muStr = document.getElementById('gt-mu').value.trim();
    var aOne = document.getElementById('gt-a-one').checked;
    var errorEl = document.getElementById('gt-error');
    var resultEl = document.getElementById('gt-result');
    errorEl.textContent = '';
    resultEl.style.display = 'none';

    var lambda = parsePartition(lambdaStr);
    if (lambda === null) { errorEl.textContent = 'Invalid partition.'; return; }
    if (lambda.length > k) {
      errorEl.textContent = 'Number of rows (' + lambda.length + ') must be ≤ N = ' + k; return;
    }

    var mu = (muStr === '' || muStr === '∅') ? [] : parsePartition(muStr);
    if (mu === null) { errorEl.textContent = 'Invalid μ.'; return; }
    // Validate μ ⊂ λ
    for (var i = 0; i < mu.length; i++) {
      if ((mu[i] || 0) > (lambda[i] || 0)) {
        errorEl.textContent = 'μ must fit inside λ (μ_' + (i+1) + '=' + mu[i] + ' > λ_' + (i+1) + '=' + (lambda[i]||0) + ')'; return;
      }
    }

    var t0 = performance.now();
    var gtEndpoint = conjugatePartition(lambda);
    var gtStart = conjugatePartition(mu);
    var result = computeGTSchemes(gtEndpoint, k, gtStart);
    var elapsed = (performance.now() - t0).toFixed(1);

    var nonZero = 0;
    result.poly.forEach(function(c) { if (c !== 0) nonZero++; });

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
      // Polynomial with checkerboard a-weight
      var polyA = new Map();
      for (var ci = 0; ci < result.configs.length; ci++) {
        var cfg = result.configs[ci];
        var sortedCfg = cfg.slice().sort(function(a, b) { return a.level - b.level; });
        var expsX = new Array(k).fill(0);
        var prevSize = 0;
        for (var j = 0; j < sortedCfg.length; j++) {
          expsX[sortedCfg[j].level - 1] = partSize(sortedCfg[j].part) - prevSize;
          prevSize = partSize(sortedCfg[j].part);
        }
        var ssyt = configToSSYT(cfg, gtEndpoint, gtStart);
        var alphaRes = countAlphaSSYT(ssyt);
        var fullExps = expsX.concat([alphaRes.count]);
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
      var ssytPoly = computeSchurSSYT(lambda, k);
      var match = polyEqual(result.poly, ssytPoly);
      verifyEl.innerHTML = match
        ? '<span style="color:#1a6b2e;">✓ At a=1: matches s<sub>' + partStr(lambda) + '</sub>(x<sub>1</sub>,…,x<sub>' + k + '</sub>) via SSYT</span>'
        : '<span style="color:#c00;">✗ MISMATCH with s<sub>' + partStr(lambda) + '</sub></span>';
      verifyEl.style.display = 'block';
    } else { verifyEl.style.display = 'none'; }

    // Show SSYT tableaux
    var configsEl = document.getElementById('gt-configs');
    if (document.getElementById('gt-show-configs').checked && result.configs.length > 0) {
      var maxShow = result.configs.length;
      var shapeStr = mu.length > 0 ? partStr(lambda) + '/' + partStr(mu) : partStr(lambda);
      var html = '<strong>' + result.configs.length + ' tableaux (shape ' + shapeStr + '):</strong><br>';
      for (var ci = 0; ci < maxShow; ci++) {
        var cfg = result.configs[ci];
        var sortedCfg = cfg.slice().sort(function(a, b) { return a.level - b.level; });
        var prevSize = 0;
        var weightParts = [];
        for (var j = 0; j < sortedCfg.length; j++) {
          var exp = partSize(sortedCfg[j].part) - prevSize;
          prevSize = partSize(sortedCfg[j].part);
          if (exp > 0) weightParts.push('x' + toSub(sortedCfg[j].level) + (exp === 1 ? '' : toSup(exp)));
        }
        var ssyt = configToSSYT(cfg, gtEndpoint, gtStart);
        var alphaBoxesSet = null;
        if (!aOne) {
          var alphaRes = countAlphaSSYT(ssyt);
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

    // ── Branching rule check ──
    var branchEl = document.getElementById('gt-branching');
    var branchResEl = document.getElementById('gt-branching-result');
    if (nonZero > 0 && k >= 2 && mu.length === 0) {
      branchEl.style.display = 'block';
      var M = Math.floor(k / 2); // split: first M variables, last N-M variables
      // Compute s_λ(x_1,...,x_N) via SSYT
      var sLam = computeSchurSSYT(lambda, k);
      // Enumerate all μ ⊂ λ: subpartitions
      var allMu = [];
      function enumSubs(lam, idx, cur) {
        if (idx >= lam.length) {
          var t = cur.slice(); while (t.length > 0 && t[t.length-1] === 0) t.pop();
          allMu.push(t); return;
        }
        var hi = lam[idx], lo = (idx+1 < lam.length ? lam[idx+1] : 0);
        // Also bounded by previous part of cur
        if (idx > 0) hi = Math.min(hi, cur[idx-1]);
        for (var v = lo; v <= hi; v++) { cur.push(v); enumSubs(lam, idx+1, cur); cur.pop(); }
      }
      enumSubs(lambda, 0, []);

      // Sum: Σ_μ s_μ(x_1,...,x_M) * s_{λ/μ}(x_{M+1},...,x_N)
      var branchSum = new Map();
      var branchTerms = [];
      for (var mi = 0; mi < allMu.length; mi++) {
        var muB = allMu[mi];
        // s_μ in x_1,...,x_M
        var sMu = computeSchurSSYT(muB, M);
        // s_{λ/μ} in variables x_{M+1},...,x_N (N-M variables)
        var conjLamB = conjugatePartition(lambda);
        var conjMuB = conjugatePartition(muB);
        var skewResult = computeGTSchemes(conjLamB, k - M, conjMuB);
        if (skewResult.configCount === 0) continue;
        var sSkew = skewResult.poly; // polynomial in (k-M) variables

        // Multiply: s_μ(x_1..x_M) * s_{λ/μ}(x_{M+1}..x_N) → polynomial in N variables
        sMu.forEach(function(cMu, keyMu) {
          sSkew.forEach(function(cSkew, keySkew) {
            var expsFull = parseKey(keyMu).concat(parseKey(keySkew));
            polyAddTo(branchSum, makeKey(expsFull), cMu * cSkew);
          });
        });
        if (partSize(muB) > 0 || muB.length === 0)
          branchTerms.push(partStr(muB));
      }

      var branchMatch = polyEqual(sLam, branchSum);
      branchResEl.innerHTML = branchMatch
        ? '<span style="color:#1a6b2e;">✓ Branching rule verified (M=' + M + ', ' + allMu.length + ' subpartitions μ: ' + branchTerms.slice(0,10).join(', ') + (branchTerms.length > 10 ? ', …' : '') + ')</span>'
        : '<span style="color:#c00;">✗ Branching rule FAILED (M=' + M + ')</span>';
    } else {
      branchEl.style.display = 'none';
    }
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
  if (document.readyState === 'complete') { doCompute(); }
  else { window.addEventListener('load', doCompute); }
})();
</script>
