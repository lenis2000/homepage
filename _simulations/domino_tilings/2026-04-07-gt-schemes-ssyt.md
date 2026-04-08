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
  <label style="margin-left:12px; font-size:13px;">
    offset: <input id="gt-offset" type="number" value="0" min="0" style="width:40px;font-size:13px;" title="Entry offset: entry i becomes i+offset for parity check">
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
  <div style="font-weight:bold;font-size:13px;margin-bottom:6px;">Branching rule (M=1)</div>
  <div style="font-size:13px;line-height:1.5;margin-bottom:6px;">
    <strong>Statement.</strong> Define the checkerboard weight: for an SSYT $T$ of shape $\lambda/\mu$, 
    $$\mathrm{wt}_a(T) = \prod_{i} x_i^{m_i(T)} \cdot a^{\#\{(r,c) \in T : r+c \text{ even},\; \text{entry odd}\}}$$
    where $m_i(T)$ is the number of entries equal to $i$. Then
    $$s_{\lambda}^{(a)}(x_1,\ldots,x_N) = \sum_{\mu:\,\lambda/\mu\text{ horiz.\ strip}} s_{\mu}^{(a)}(x_1,\ldots,x_{N-1})\cdot x_N^{|\lambda/\mu|}\cdot a^{d(\lambda/\mu)}$$
    where $d(\lambda/\mu) = \#\{(r,c)\in \lambda/\mu : r+c\text{ even}\}$ if $N$ is odd, and $0$ if $N$ is even.
  </div>
  <div id="gt-branching-result" class="gt-info"></div>
</div>

<div id="gt-mma-section" style="margin-top:12px;padding:10px;background:#f5f0e8;border:1px solid #ccc;border-radius:4px;display:none;">
  <div style="font-weight:bold;font-size:13px;margin-bottom:6px;">Mathematica code</div>
  <pre id="gt-mma-code" style="font-size:11px;background:#fff;padding:8px;border:1px solid #ddd;border-radius:3px;overflow-x:auto;max-height:300px;white-space:pre-wrap;"></pre>
  <button id="gt-copy-mma-code" style="font-size:11px;padding:2px 8px;margin-top:4px;cursor:pointer;">Copy code</button>
</div>

<div style="margin-top:8px;">
  <button id="gt-mass-branch" style="font-size:12px;padding:4px 12px;cursor:pointer;">Mass test branching rule (a-weighted, all M)</button>
  <span id="gt-mass-branch-result" style="font-size:12px;margin-left:8px;"></span>
</div>


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

  function countAlphaSSYT(ssyt, offset) {
    var entryParity = document.getElementById('gt-a-parity').value === 'odd' ? 1 : 0;
    var off = offset || 0;
    var count = 0;
    var alphaBoxes = new Set();
    for (var r = 0; r < ssyt.shape.length; r++) {
      for (var c = 0; c < ssyt.shape[r]; c++) {
        var entry = ssyt.filling[r][c];
        if (entry === 0) continue;
        if ((entry + off) % 2 === entryParity && (r + c) % 2 === 0) {
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
    var userOffset = parseInt(document.getElementById('gt-offset').value) || 0;
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
      var startSize = partSize(gtStart);
      for (var ci = 0; ci < result.configs.length; ci++) {
        var cfg = result.configs[ci];
        var sortedCfg = cfg.slice().sort(function(a, b) { return a.level - b.level; });
        var expsX = new Array(k).fill(0);
        var prevSize = startSize;
        for (var j = 0; j < sortedCfg.length; j++) {
          expsX[sortedCfg[j].level - 1] = partSize(sortedCfg[j].part) - prevSize;
          prevSize = partSize(sortedCfg[j].part);
        }
        var ssytA = configToSSYT(cfg, gtEndpoint, gtStart);
        var alphaRes = countAlphaSSYT(ssytA, userOffset);
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
        var prevSize = startSize;
        var weightParts = [];
        for (var j = 0; j < sortedCfg.length; j++) {
          var exp = partSize(sortedCfg[j].part) - prevSize;
          prevSize = partSize(sortedCfg[j].part);
          if (exp > 0) weightParts.push('x' + toSub(sortedCfg[j].level) + (exp === 1 ? '' : toSup(exp)));
        }
        var ssyt = configToSSYT(cfg, gtEndpoint, gtStart);
        var alphaBoxesSet = null;
        if (!aOne) {
          var alphaRes = countAlphaSSYT(ssyt, userOffset);
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

    // ── Branching rule check (M=1) ──
    // s_λ(x_1,...,x_N) = Σ_{μ: λ/μ horiz strip} s_μ(x_1,...,x_{N-1}) · x_N^{|λ|-|μ|}
    var branchEl = document.getElementById('gt-branching');
    var branchResEl = document.getElementById('gt-branching-result');
    if (nonZero > 0 && k >= 2 && mu.length === 0) {
      branchEl.style.display = 'block';
      // Compute s_λ(x_1,...,x_N) via SSYT
      var sLam = computeSchurSSYT(lambda, k);
      // Enumerate all μ ⊂ λ (subpartitions)
      var allMu = [];
      function enumSubs(lam, idx, cur) {
        if (idx >= lam.length) {
          var t = cur.slice(); while (t.length > 0 && t[t.length-1] === 0) t.pop();
          allMu.push(t); return;
        }
        var hi = lam[idx];
        if (idx > 0) hi = Math.min(hi, cur[idx-1]); // decreasing
        for (var v = 0; v <= hi; v++) { cur.push(v); enumSubs(lam, idx+1, cur); cur.pop(); }
      }
      enumSubs(lambda, 0, []);

      // Check: is λ/μ a horizontal strip? (λ'_j - μ'_j ≤ 1 for all j, i.e. no two boxes in same column)
      function isHorizStrip(lam, mu) {
        for (var j = 0; j < lam.length; j++) {
          var d = (lam[j] || 0) - (mu[j] || 0);
          if (d < 0) return false;
        }
        // Check horizontal strip: interlacing λ_1 ≥ μ_1 ≥ λ_2 ≥ μ_2 ≥ ...
        var len = Math.max(lam.length, mu.length);
        for (var i = 0; i < len; i++) {
          if ((lam[i]||0) < (mu[i]||0)) return false;
          if ((mu[i]||0) < (lam[i+1]||0)) return false;
        }
        return true;
      }

      // Count dark cells in skew shape lam/mu
      function darkCellsInStrip(lam, mu) {
        var count = 0;
        for (var r = 0; r < lam.length; r++) {
          var from = r < mu.length ? mu[r] : 0;
          for (var c = from; c < lam[r]; c++) {
            if ((r + c) % 2 === 0) count++;
          }
        }
        return count;
      }

      // Helper: compute a-weighted polynomial for shape nu with N vars
      function computeAWeightedPoly(nu, numVars) {
        var conjNu = conjugatePartition(nu);
        var res = computeGTSchemes(conjNu, numVars, []);
        if (res.configs.length === 0) {
          // No configs but might have polynomial from cache
          return res.poly; // just x-polynomial, no a
        }
        var polyA = new Map();
        for (var ci = 0; ci < res.configs.length; ci++) {
          var cfg = res.configs[ci];
          var sortedCfg = cfg.slice().sort(function(a2,b2){return a2.level-b2.level;});
          var expsX = new Array(numVars).fill(0);
          var prev = 0;
          for (var j = 0; j < sortedCfg.length; j++) {
            expsX[sortedCfg[j].level-1] = partSize(sortedCfg[j].part) - prev;
            prev = partSize(sortedCfg[j].part);
          }
          var ssytB = configToSSYT(cfg, conjNu, []);
          var alphaB = countAlphaSSYT(ssytB);
          var fullExps = expsX.concat([alphaB.count]);
          polyAddTo(polyA, makeKey(fullExps), 1);
        }
        return polyA;
      }

      // ── Standard branching (no a) ──
      var branchSum = new Map();
      var branchTerms = [];
      for (var mi = 0; mi < allMu.length; mi++) {
        var muB = allMu[mi];
        if (!isHorizStrip(lambda, muB)) continue;
        var stripSize = partSize(lambda) - partSize(muB);
        var sMu = computeSchurSSYT(muB, k - 1);
        sMu.forEach(function(c, key) {
          var exps = parseKey(key).concat([stripSize]);
          polyAddTo(branchSum, makeKey(exps), c);
        });
        var xTerm = stripSize === 0 ? '' : stripSize === 1 ? '·x<sub>' + k + '</sub>' : '·x<sub>' + k + '</sub><sup>' + stripSize + '</sup>';
        branchTerms.push('s<sub>' + partStr(muB) + '</sub>' + xTerm);
      }
      var branchMatch = polyEqual(sLam, branchSum);
      var branchHtml = branchMatch
        ? '<span style="color:#1a6b2e;">✓ Branching (a=1) verified</span>'
        : '<span style="color:#c00;">✗ Branching (a=1) FAILED</span>';
      branchHtml += '<br><span style="font-size:11px;">' + branchTerms.join(' + ') + '</span>';

      // ── a-weighted branching ──
      if (!aOne) {
        var entryParity = document.getElementById('gt-a-parity').value === 'odd' ? 1 : 0;
        // s_λ^(a) from main computation
        var sLamA = new Map();
        for (var ci = 0; ci < result.configs.length; ci++) {
          var cfg = result.configs[ci];
          var sortedCfg = cfg.slice().sort(function(a2,b2){return a2.level-b2.level;});
          var expsX = new Array(k).fill(0); var prev = startSize;
          for (var j = 0; j < sortedCfg.length; j++) {
            expsX[sortedCfg[j].level-1] = partSize(sortedCfg[j].part) - prev;
            prev = partSize(sortedCfg[j].part);
          }
          var ssytB = configToSSYT(cfg, gtEndpoint, gtStart);
          var alphaB = countAlphaSSYT(ssytB);
          polyAddTo(sLamA, makeKey(expsX.concat([alphaB.count])), 1);
        }

        // Branching: Σ_μ s_μ^(a)(x_1..x_{N-1}) · x_N^{strip} · a^{darkCells if N parity matches}
        var branchSumA = new Map();
        var branchTermsA = [];
        for (var mi = 0; mi < allMu.length; mi++) {
          var muB = allMu[mi];
          if (!isHorizStrip(lambda, muB)) continue;
          var stripSize = partSize(lambda) - partSize(muB);
          // a-exponent from entry N on dark cells of strip
          var aDegStrip = (k % 2 === entryParity) ? darkCellsInStrip(lambda, muB) : 0;
          // s_μ^(a) in N-1 variables
          var sMuA = computeAWeightedPoly(muB, k - 1);
          // Multiply: append x_N exponent and add a-strip contribution
          sMuA.forEach(function(c, key) {
            var exps = parseKey(key);
            // exps has k-1 x-vars + 1 a-var = k entries
            var xExps = exps.slice(0, k - 1);
            var aExp = exps[k - 1];
            var fullExps = xExps.concat([stripSize, aExp + aDegStrip]);
            polyAddTo(branchSumA, makeKey(fullExps), c);
          });
          var aTerm = aDegStrip > 0 ? (aDegStrip === 1 ? '·a' : '·a<sup>' + aDegStrip + '</sup>') : '';
          var xTerm = stripSize === 0 ? '' : stripSize === 1 ? '·x<sub>' + k + '</sub>' : '·x<sub>' + k + '</sub><sup>' + stripSize + '</sup>';
          branchTermsA.push('s<sub>' + partStr(muB) + '</sub><sup>(a)</sup>' + xTerm + aTerm);
        }

        var branchMatchA = polyEqual(sLamA, branchSumA);
        branchHtml += '<br>' + (branchMatchA
          ? '<span style="color:#1a6b2e;">✓ Branching with a verified</span>'
          : '<span style="color:#c00;">✗ Branching with a FAILED</span>');
        branchHtml += '<br><span style="font-size:11px;">' + branchTermsA.join(' + ') + '</span>';
      }

      branchResEl.innerHTML = branchHtml;
    } else {
      branchEl.style.display = 'none';
    }

    // ── Mathematica code generation ──
    var mmaSection = document.getElementById('gt-mma-section');
    if (nonZero > 0) {
      var lamStr = '{' + lambda.join(',') + '}';
      var muStrMma = mu.length > 0 ? '{' + mu.join(',') + '}' : '{}';
      var isSkew = mu.length > 0;
      var shapeDesc = isSkew ? lamStr + '/' + muStrMma : lamStr;

      var mma = '';
      mma += '(* a-weighted Schur function s_' + partStr(lambda) + (isSkew ? '/' + partStr(mu) : '') + '^(a) with N=' + k + ' *)\n';
      mma += '(* Self-contained: no external packages needed *)\n\n';

      mma += '(* === SSYT ENUMERATION (self-contained, no packages) === *)\n';
      mma += 'ClearAll[aSchur, schur, enumSSYTrec];\n\n';

      mma += '(* Build list of cells (r,c) in lam/mu, reading order *)\n';
      mma += 'skewCells[lam_, mu_] := Flatten[Table[\n';
      mma += '  Table[{r, c}, {c, If[r <= Length[mu], mu[[r]], 0] + 1, lam[[r]]}],\n';
      mma += '  {r, Length[lam]}], 1];\n\n';

      mma += '(* Recursively enumerate SSYT entries for given cells *)\n';
      mma += 'enumSSYTrec[cells_, n_, idx_, vals_, tab_] :=\n';
      mma += '  If[idx > Length[cells],\n';
      mma += '    {vals},\n';
      mma += '    Module[{r = cells[[idx, 1]], c = cells[[idx, 2]], lo = 1, res = {}},\n';
      mma += '      (* Row: weakly increasing *)\n';
      mma += '      If[KeyExistsQ[tab, {r, c - 1}], lo = Max[lo, tab[{r, c - 1}]]];\n';
      mma += '      (* Column: strictly increasing *)\n';
      mma += '      If[KeyExistsQ[tab, {r - 1, c}], lo = Max[lo, tab[{r - 1, c}] + 1]];\n';
      mma += '      Do[res = Join[res, enumSSYTrec[cells, n, idx + 1,\n';
      mma += '        Append[vals, v], Append[tab, {r, c} -> v]]], {v, lo, n}];\n';
      mma += '      res]];\n\n';

      mma += '(* a-weighted Schur polynomial *)\n';
      mma += 'aSchur[lam_List, n_Integer] := aSchur[lam, {}, n];\n';
      mma += 'aSchur[lam_List, mu_List, n_Integer] := Module[\n';
      mma += '  {cells = skewCells[lam, PadRight[mu, Length[lam]]],\n';
      mma += '   allT, result = 0},\n';
      mma += '  If[cells === {}, Return[1]];\n';
      mma += '  allT = enumSSYTrec[cells, n, 1, {}, <||>];\n';
      mma += '  Do[Module[{wt = 1, ac = 0},\n';
      mma += '    Do[wt *= x[vals[[i]]];\n';
      mma += '      If[OddQ[vals[[i]]] && EvenQ[cells[[i, 1]] + cells[[i, 2]]], ac++],\n';
      mma += '      {i, Length[vals]}];\n';
      mma += '    result += wt * a^ac], {vals, allT}];\n';
      mma += '  result];\n';
      mma += 'schur[lam_List, n_Integer] := aSchur[lam, n] /. a -> 1;\n\n';

      mma += '(* === POLYNOMIAL FROM JS === *)\n';
      mma += 'saJS = ' + lastMmaString + ';\n\n';

      mma += '(* === CHECKS === *)\n\n';

      mma += '(* 1. Verify JS matches Mathematica SSYT enumeration *)\n';
      mma += 'saMma = aSchur[' + lamStr + ', ' + k + '];\n';
      mma += 'Print["JS vs MMA: ", Simplify[saJS - saMma]];\n\n';

      mma += '(* 2. At a=1: standard Schur *)\n';
      mma += 'Print["a=1 check: ", Simplify[(saJS /. a -> 1) - schur[' + lamStr + ', ' + k + ']]];\n\n';

      mma += '(* 3. Pairwise symmetry tests *)\n';
      for (var i = 1; i < k; i++) {
        mma += 'Print["Sym x[' + i + ']<->x[' + (i+1) + ']: ",\n';
        mma += '  Simplify[saJS - (saJS /. {x[' + i + ']->x[' + (i+1) + '], x[' + (i+1) + ']->x[' + i + ']})]];\n';
      }

      mma += '\n(* 4. Operator tests *)\n';
      mma += 'Print["Euler (total degree): ",\n';
      mma += '  Simplify[Sum[x[i] D[saJS, x[i]], {i, ' + k + '}] / saJS]];\n';
      mma += 'Print["Sum x_i^2 d/dx_i: ",\n';
      mma += '  Simplify[Sum[x[i]^2 D[saJS, x[i]], {i, ' + k + '}] / saJS]];\n';
      mma += '(* Calogero-Sutherland type: *)\n';
      mma += 'csOp = Sum[x[i]^2 D[saJS, x[i], x[i]], {i, ' + k + '}] +\n';
      mma += '  2 Sum[x[i]*x[j]/(x[i]-x[j]) (D[saJS, x[i]] - D[saJS, x[j]]),\n';
      mma += '    {i, ' + k + '}, {j, i+1, ' + k + '}];\n';
      mma += 'Print["CS eigenvalue? ", Simplify[csOp / saJS]];\n\n';

      mma += '(* 5. a=0: restricted tableaux *)\n';
      mma += 'Print["At a=0: ", Expand[saJS /. a -> 0]];\n';
      mma += 'Print["At a=-1: ", Expand[saJS /. a -> -1]];\n\n';

      mma += '(* 6. Symmetrization *)\n';
      mma += 'symPart = 1/' + k + '! * Sum[saJS /. Thread[Array[x,' + k + '] -> Array[x,' + k + '][[perm]]],\n';
      mma += '  {perm, Permutations[Range[' + k + ']]}];\n';
      mma += 'Print["Symmetrized: ", Expand[symPart]];\n';
      mma += '(* Express in monomial symmetric basis: *)\n';
      mma += 'Print["Sym at a=1: ", Expand[symPart /. a -> 1]];\n\n';

      mma += '(* 7. Tangent at a=1: first-order perturbation *)\n';
      mma += 'tang = D[saJS, a] /. a -> 1;\n';
      mma += 'Print["d/da at a=1: ", Expand[tang]];\n';
      mma += 'Print["d/da at a=1 / s_lam: ", Simplify[tang / (saJS /. a -> 1)]];\n\n';

      mma += '(* 8. Cherednik-Dunkl type operators *)\n';
      mma += '(* s_ij = transposition operator: (s_ij f)(x) = f(...,x_j,...,x_i,...) *)\n';
      mma += 'sij[f_, i_, j_] := f /. {x[i] -> x[j], x[j] -> x[i]};\n\n';

      mma += '(* Dunkl operator: D_i = d/dx_i + t * Sum_{j!=i} (1 - s_ij)/(x_i - x_j) *)\n';
      mma += 'dunkl[f_, i_, n_, t_] := D[f, x[i]] +\n';
      mma += '  t * Sum[If[j != i, (f - sij[f, i, j])/(x[i] - x[j]), 0], {j, n}];\n\n';

      mma += '(* Cherednik operator: Y_i = t*x_i*d/dx_i + Sum_{j<i} x_i s_ij/(x_i-x_j) - Sum_{j>i} x_j s_ij/(x_i-x_j) + (i-1)*t - (n-i) *)\n';
      mma += '(* Try: is Y_i saJS = eigenvalue * saJS? *)\n';
      mma += 'chered[f_, i_, n_, t_] := t*x[i]*D[f, x[i]] +\n';
      mma += '  Sum[If[j < i, x[i]*(sij[f,i,j])/(x[i]-x[j]), 0], {j, n}] -\n';
      mma += '  Sum[If[j > i, x[j]*(sij[f,i,j])/(x[i]-x[j]), 0], {j, n}] +\n';
      mma += '  ((i - 1)*t - (n - i))*f;\n\n';

      mma += 'Print["--- Dunkl D_1 (t=1): ---"];\n';
      mma += 'Print[Simplify[dunkl[saJS, 1, ' + k + ', 1] / saJS]];\n';
      mma += 'Print["--- Dunkl D_1 (t=a): ---"];\n';
      mma += 'Print[Simplify[dunkl[saJS, 1, ' + k + ', a] / saJS]];\n\n';

      mma += 'Print["--- Cherednik Y_1 (t=1): ---"];\n';
      mma += 'Print[Simplify[chered[saJS, 1, ' + k + ', 1] / saJS]];\n';
      mma += 'Print["--- Cherednik Y_1 (t=a): ---"];\n';
      mma += 'Print[Simplify[chered[saJS, 1, ' + k + ', a] / saJS]];\n\n';

      mma += '(* 9. Modified operator: mix derivative + checkerboard-weighted permutation *)\n';
      mma += '(* Try: T_i = x_i*d/dx_i + a * Sum_{j!=i, j same parity} s_ij*x_i/(x_i-x_j) *)\n';
      mma += 'modOp[f_, i_, n_] := x[i]*D[f, x[i]] +\n';
      mma += '  a * Sum[If[j != i && Mod[i, 2] == Mod[j, 2], x[i]*sij[f,i,j]/(x[i]-x[j]), 0], {j, n}];\n';
      mma += 'Print["--- Modified T_1 (same-parity swaps): ---"];\n';
      mma += 'Print[Simplify[modOp[saJS, 1, ' + k + '] / saJS]];\n\n';

      mma += '(* 10. Try sum of Cherednik operators *)\n';
      mma += 'sumY = Sum[chered[saJS, i, ' + k + ', 1], {i, ' + k + '}];\n';
      mma += 'Print["--- Sum Y_i (t=1): ---"];\n';
      mma += 'Print[Simplify[sumY / saJS]];\n';
      mma += 'sumY2 = Sum[chered[saJS, i, ' + k + ', 1]^2, {i, ' + k + '}] // Expand;\n';
      mma += 'Print["--- Sum Y_i^2 (t=1) eigenvalue? ---"];\n';
      mma += 'Print[Simplify[sumY2 / saJS]];\n';

      document.getElementById('gt-mma-code').textContent = mma;
      mmaSection.style.display = 'block';
    } else {
      mmaSection.style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════════════
  //  MASS BRANCHING RULE TEST
  // ═══════════════════════════════════════════════════

  function genPartitions(n, maxParts, maxVal) {
    var results = [];
    function rec(remaining, parts, maxP) {
      if (remaining === 0) { results.push(parts.slice()); return; }
      if (parts.length >= maxParts || maxP <= 0) return;
      for (var p = Math.min(remaining, maxP, maxVal); p >= 1; p--) {
        parts.push(p); rec(remaining - p, parts, p); parts.pop();
      }
    }
    rec(n, [], maxVal); return results;
  }

  function runMassBranchTest() {
    var el = document.getElementById('gt-mass-branch-result');
    el.textContent = 'Running...'; el.style.color = '#666';
    setTimeout(function() {
      var maxSize = 6, maxK = 4, passed = 0, failed = 0, failures = [];
      var entryParity = document.getElementById('gt-a-parity').value === 'odd' ? 1 : 0;

      for (var kk = 2; kk <= maxK; kk++) {
        for (var sz = 1; sz <= maxSize; sz++) {
          var partitions = genPartitions(sz, 20, 20);
          for (var pi = 0; pi < partitions.length; pi++) {
            var lam = partitions[pi];
            if (lam.length > kk) continue; // need ℓ(λ) ≤ N

            for (var M = 1; M < kk; M++) { // test all splits
              // Compute s_λ^(a)(x_1,...,x_N) directly
              var conjLam = conjugatePartition(lam);
              var resLam = computeGTSchemes(conjLam, kk, []);
              if (resLam.configs.length === 0) continue;
              var sLamA = new Map();
              for (var ci = 0; ci < resLam.configs.length; ci++) {
                var cfg = resLam.configs[ci];
                var sc = cfg.slice().sort(function(a,b){return a.level-b.level;});
                var ex = new Array(kk).fill(0); var pv = 0;
                for (var j = 0; j < sc.length; j++) { ex[sc[j].level-1] = partSize(sc[j].part)-pv; pv=partSize(sc[j].part); }
                var ssyt = configToSSYT(cfg, conjLam, []);
                var aCount = 0;
                for (var r = 0; r < ssyt.shape.length; r++)
                  for (var c = 0; c < ssyt.shape[r]; c++) {
                    var entry = ssyt.filling[r][c];
                    if (entry > 0 && (entry % 2) === entryParity && (r+c) % 2 === 0) aCount++;
                  }
                polyAddTo(sLamA, makeKey(ex.concat([aCount])), 1);
              }

              // Branching sum over all μ ⊂ λ with λ/μ valid for split at M
              var allMu2 = [];
              function enumS2(lam2, idx, cur) {
                if (idx >= lam2.length) { var t=cur.slice(); while(t.length>0&&t[t.length-1]===0)t.pop(); allMu2.push(t); return; }
                var hi = lam2[idx]; if (idx>0) hi=Math.min(hi,cur[idx-1]);
                for (var v=0;v<=hi;v++){cur.push(v);enumS2(lam2,idx+1,cur);cur.pop();}
              }
              allMu2 = []; enumS2(lam, 0, []);

              var branchA = new Map();
              for (var mi = 0; mi < allMu2.length; mi++) {
                var muB = allMu2[mi];
                // s_μ^(a)(x_1,...,x_M) with offset 0
                var conjMuB = conjugatePartition(muB);
                if (conjMuB.length > 0 && conjMuB[0] > M) continue; // parts of conj(μ) ≤ M
                var resMu = computeGTSchemes(conjMuB, M, []);
                if (resMu.configs.length === 0 && partSize(muB) > 0) continue;
                var sMuA = new Map();
                if (partSize(muB) === 0) {
                  sMuA.set(makeKey(new Array(M+1).fill(0)), 1);
                } else {
                  for (var ci = 0; ci < resMu.configs.length; ci++) {
                    var cfg = resMu.configs[ci];
                    var sc = cfg.slice().sort(function(a,b){return a.level-b.level;});
                    var ex = new Array(M).fill(0); var pv = 0;
                    for (var j = 0; j < sc.length; j++) { ex[sc[j].level-1] = partSize(sc[j].part)-pv; pv=partSize(sc[j].part); }
                    var ssyt = configToSSYT(cfg, conjMuB, []);
                    var aC = 0;
                    for (var r = 0; r < ssyt.shape.length; r++)
                      for (var c = 0; c < ssyt.shape[r]; c++) {
                        var entry = ssyt.filling[r][c];
                        if (entry > 0 && (entry % 2) === entryParity && (r+c) % 2 === 0) aC++;
                      }
                    polyAddTo(sMuA, makeKey(ex.concat([aC])), 1);
                  }
                }

                // s_{λ/μ}^(a)(x_{M+1},...,x_N) with offset M
                var conjLamB = conjugatePartition(lam);
                var conjMuB2 = conjugatePartition(muB);
                var resSkew = computeGTSchemes(conjLamB, kk - M, conjMuB2);
                if (resSkew.configs.length === 0 && partSize(lam) > partSize(muB)) continue;
                var sSkewA = new Map();
                if (resSkew.configCount === 0 && partSize(lam) === partSize(muB)) {
                  sSkewA.set(makeKey(new Array(kk-M+1).fill(0)), 1);
                } else {
                  for (var ci = 0; ci < resSkew.configs.length; ci++) {
                    var cfg = resSkew.configs[ci];
                    var sc = cfg.slice().sort(function(a,b){return a.level-b.level;});
                    var ex = new Array(kk-M).fill(0); var pv = partSize(conjMuB2);
                    for (var j = 0; j < sc.length; j++) { ex[sc[j].level-1] = partSize(sc[j].part)-pv; pv=partSize(sc[j].part); }
                    var ssyt = configToSSYT(cfg, conjLamB, conjMuB2);
                    var aC = 0;
                    for (var r = 0; r < ssyt.shape.length; r++)
                      for (var c = 0; c < ssyt.shape[r]; c++) {
                        var entry = ssyt.filling[r][c];
                        if (entry > 0 && ((entry + M) % 2) === entryParity && (r+c) % 2 === 0) aC++;
                      }
                    polyAddTo(sSkewA, makeKey(ex.concat([aC])), 1);
                  }
                }

                // Multiply sMuA * sSkewA → full polynomial in kk vars + a
                sMuA.forEach(function(cMu, keyMu) {
                  sSkewA.forEach(function(cSkew, keySkew) {
                    var eMu = parseKey(keyMu), eSkew = parseKey(keySkew);
                    var xFull = eMu.slice(0,M).concat(eSkew.slice(0,kk-M));
                    var aFull = eMu[M] + eSkew[kk-M];
                    polyAddTo(branchA, makeKey(xFull.concat([aFull])), cMu * cSkew);
                  });
                });
              }

              if (polyEqual(sLamA, branchA)) { passed++; }
              else {
                failed++;
                if (failures.length < 3) failures.push('N=' + kk + ' λ=' + partStr(lam) + ' M=' + M);
              }
            }
          }
        }
      }
      if (failed === 0) {
        el.style.color = '#1a6b2e';
        el.textContent = '✓ All ' + passed + ' cases passed (N≤' + maxK + ', |λ|≤' + maxSize + ', all M splits)';
      } else {
        el.style.color = '#c00';
        el.textContent = '✗ ' + failed + '/' + (passed+failed) + ' failed. First: ' + failures.join('; ');
      }
    }, 50);
  }

  document.getElementById('gt-copy-mma-code').addEventListener('click', function() {
    var code = document.getElementById('gt-mma-code').textContent;
    navigator.clipboard.writeText(code).then(function() {
      var btn = document.getElementById('gt-copy-mma-code');
      btn.textContent = 'Copied!';
      setTimeout(function() { btn.textContent = 'Copy code'; }, 1500);
    });
  });
  document.getElementById('gt-mass-branch').addEventListener('click', runMassBranchTest);

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
