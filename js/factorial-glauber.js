/* UI driver for the factorial Schur process Glauber dynamics.
 * Dynamics + state are implemented in C++/WASM (factorial-wasm.js).
 * This file: parameter parsing, rendering, run-loop, detail mode.
 */
(function () {
  'use strict';

  // ---- DOM ----
  const $ = (id) => document.getElementById(id);
  const canvas = $('fs-canvas');
  const ctx = canvas.getContext('2d');

  // ---- WASM proxy ----
  let wasmReady = false;
  let api = null;     // cwrap'd functions

  // ---- Local state mirror (from WASM JSON) ----
  let N = 6, M = 6;
  let mu = [];          // mu[j] arrays of length N
  let lam = [];         // lam[j] arrays of length j (lam[N] mirrors mu[M])
  let xArr = [], wArr = [], yArr = [];
  let stats = { step: 0, accept: 0, tries: 0, size: 0, maxPos: 0 };

  let running = false, rafId = null;
  let selected = null; // detailed-mode selection: { kind: 'mu'|'lam'|'mid', j, i }

  // Subscript/superscript helpers
  const SUB = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
  function sub(n) { return String(n).split('').map(d => SUB[+d] || d).join(''); }

  // ---- Exact rational arithmetic (BigInt) ----
  function bigGcd(a, b) {
    if (a < 0n) a = -a; if (b < 0n) b = -b;
    while (b !== 0n) { const t = b; b = a % b; a = t; }
    return a || 1n;
  }
  class Rat {
    constructor(p, q) {
      if (q === 0n) throw new Error('Rat: zero denominator');
      if (q < 0n) { p = -p; q = -q; }
      const g = bigGcd(p < 0n ? -p : p, q);
      this.p = p / g; this.q = q / g;
    }
    static zero() { return new Rat(0n, 1n); }
    static one()  { return new Rat(1n, 1n); }
    static fromString(s) {
      try {
        s = String(s).trim();
        if (!s) return Rat.zero();
        // Fraction "p/q"
        if (s.includes('/')) {
          const parts = s.split('/');
          if (parts.length !== 2) return Rat.zero();
          const a = parts[0].trim(), b = parts[1].trim();
          if (!/^-?\d+$/.test(a) || !/^-?\d+$/.test(b)) return Rat.zero();
          const q = BigInt(b); if (q === 0n) return Rat.zero();
          return new Rat(BigInt(a), q);
        }
        // Scientific:  -?digits(.digits)?[eE]±?digits   → exact rational.
        // (Important: "1e-200" must NOT round to 0.)
        const sci = s.match(/^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
        if (sci) {
          const sign = sci[1] === '-' ? -1n : 1n;
          const whole = sci[2], frac = sci[3] || '';
          const e = parseInt(sci[4], 10);
          // mantissa = (whole+frac)  with denominator 10^frac.length
          let p = BigInt(whole + frac);
          let q = 10n ** BigInt(frac.length);
          if (e >= 0) p *= 10n ** BigInt(e);
          else        q *= 10n ** BigInt(-e);
          return new Rat(sign * p, q);
        }
        // Decimal "-?digits.digits"
        if (/^-?\d+\.\d+$/.test(s)) {
          const neg = s.startsWith('-'); if (neg) s = s.slice(1);
          const [whole, frac] = s.split('.');
          const denom = 10n ** BigInt(frac.length);
          let num = BigInt(whole) * denom + BigInt(frac);
          if (neg) num = -num;
          return new Rat(num, denom);
        }
        // Integer
        if (/^-?\d+$/.test(s)) return new Rat(BigInt(s), 1n);
        // Anything else → 0  (don't crash)
        return Rat.zero();
      } catch (e) {
        return Rat.zero();
      }
    }
    add(o) { return new Rat(this.p * o.q + o.p * this.q, this.q * o.q); }
    sub(o) { return new Rat(this.p * o.q - o.p * this.q, this.q * o.q); }
    mul(o) { return new Rat(this.p * o.p, this.q * o.q); }
    div(o) { if (o.p === 0n) throw new Error('Rat: divide by zero'); return new Rat(this.p * o.q, this.q * o.p); }
    pow(n) {
      if (n === 0) return Rat.one();
      if (n < 0) return Rat.one().div(this).pow(-n);
      let r = Rat.one(), base = this, e = n;
      while (e > 0) { if (e & 1) r = r.mul(base); base = base.mul(base); e >>= 1; }
      return r;
    }
    isZero() { return this.p === 0n; }
    sign() { return this.p === 0n ? 0 : (this.p > 0n ? 1 : -1); }
    toFloat() { return Number(this.p) / Number(this.q); }
  }

  // Rational parameter arrays (parsed when rational mode is on).
  let xRat = [], wRat = [], yRat = [];
  function parseRationalCSV(str) {
    if (!str) return [];
    let s = String(str);
    s = s.replace(/\(([^)]+)\)\^(\d+)/g, (m, p, c) => {
      const n = parseInt(c, 10);
      const vals = p.split(',').map(v => v.trim()).filter(v => v !== '');
      const out = []; for (let i = 0; i < n; i++) out.push(...vals); return out.join(',');
    });
    const out = [];
    for (const t of s.split(',')) {
      const tr = t.trim(); if (!tr) continue;
      // Detect a^b style (only when a,b are simple numbers without a slash in 'a')
      const cm = tr.match(/^(-?\d+(?:\.\d+)?(?:\/\d+)?)\^(\d+)$/);
      if (cm) {
        const base = cm[1], cnt = parseInt(cm[2], 10);
        for (let i = 0; i < cnt; i++) out.push(Rat.fromString(base));
        continue;
      }
      out.push(Rat.fromString(tr));
    }
    return out;
  }
  function xValRat(j) { return j >= 1 && j <= xRat.length ? xRat[j - 1] : Rat.one(); }
  function wValRat(j) { return j >= 1 && j <= wRat.length ? wRat[j - 1] : Rat.one(); }
  function yValRat(k) { return (k >= 1 && k <= yRat.length) ? yRat[k - 1] : Rat.zero(); }

  // ---- JS-side state-mutation dynamics in exact rationals ----
  // When 'fs-rat-mode' is ON we run these instead of the WASM path; mu and
  // lam are mutated directly (same arrays the renderer reads).
  let jsStepCount = 0, jsAcceptCount = 0, jsTryCount = 0;

  function isRationalMode() { const cb = $('fs-rat-mode'); return cb && cb.checked; }
  function isSquareCells()  { const cb = $('fs-square-cells'); return !cb || cb.checked; }

  function jsMuBounds(j, i) {
    const below = mu[j - 1], above = mu[j + 1];
    const upperBel = (i === 0) ? Infinity : below[i - 1];
    const lowerBel = below[i];
    const upperAbo = above[i];
    const lowerAbo = (i === N - 1) ? 0 : above[i + 1];
    return [Math.max(lowerBel, lowerAbo), Math.min(upperBel, upperAbo)];
  }
  function jsLamBounds(j, i) {
    const below = lam[j - 1], above = lam[j + 1];
    const upperBel = (i === 0) ? Infinity : (i - 1 < below.length ? below[i - 1] : 0);
    const lowerBel = (i < below.length) ? below[i] : 0;
    const upperAbo = above[i];
    const lowerAbo = (i + 1 < above.length) ? above[i + 1] : 0;
    return [Math.max(lowerBel, lowerAbo), Math.min(upperBel, upperAbo)];
  }
  function jsMidBounds(i) {
    const muBel = mu[M - 1], lamBel = lam[N - 1];
    const upperMu = (i === 0) ? Infinity : muBel[i - 1];
    const lowerMu = muBel[i];
    const upperLam = (i === 0) ? Infinity : (i - 1 < lamBel.length ? lamBel[i - 1] : 0);
    const lowerLam = (i < lamBel.length) ? lamBel[i] : 0;
    return [Math.max(lowerMu, lowerLam), Math.min(upperMu, upperLam)];
  }

  // Site upward ratio (Rat) for kind 0=mu, 1=lam, 2=mid.
  // Returns null if the local ratio is mathematically singular (e.g. both
  // parameter and y-shift evaluate to exactly 0); the caller treats null
  // as "no flip available at this site" instead of crashing.
  function siteRatPlus(kind, j, i, v) {
    let num, den;
    if (kind === 0) {
      const wj = wValRat(j), wj1 = wValRat(j + 1);
      const ya = yValRat(v + N - i), yb = yValRat(v + N + 1 - i);
      num = wj1.add(ya); den = wj.add(yb);
    } else if (kind === 1) {
      const xj = xValRat(j), xj1 = xValRat(j + 1);
      const ya = yValRat(v + j - i), yb = yValRat(v + j + 1 - i);
      num = xj.add(ya); den = xj1.add(yb);
    } else {
      const xN = xValRat(N), wM = wValRat(M);
      const ya = yValRat(v + N - i), yb = yValRat(v + N + 1 - i);
      num = xN.add(ya); den = wM.add(yb);
    }
    if (den.isZero()) return null;
    return num.div(den);
  }

  // Exact rational comparison: this < other ?
  Rat.prototype.lessThan = function (o) { return this.p * o.q < o.p * this.q; };
  Rat.prototype.cmp = function (o) {
    const a = this.p * o.q, b = o.p * this.q;
    return a < b ? -1 : (a > b ? 1 : 0);
  };

  // Exact heat-bath: build pi(v') as Rats, sample with a Rat-uniform target.
  // Cap kept moderate because each iteration is a BigInt rat-op on potentially
  // hundreds-of-digits numbers; 4096 was freezing the UI.
  const JS_HEATBATH_MAX_W = 256;
  const JS_HEATBATH_FLOAT_TAIL = 1e-300;  // Float side check for early exit.
  function jsHeatBathFlip(kind, j, i, v, lo, hi) {
    if (lo === hi) return v;
    let hiCap = hi;
    if (hi - lo + 1 > JS_HEATBATH_MAX_W) hiCap = lo + JS_HEATBATH_MAX_W - 1;
    if (hiCap < v) hiCap = v;

    const pi = [];
    pi[v - lo] = Rat.one();
    let cum = Rat.one();
    let hiUsed = v;
    for (let u = v; u + 1 <= hiCap; u++) {
      const r = siteRatPlus(kind, j, i, u);
      if (r === null) break;     // singular ratio: stop expanding upward
      cum = cum.mul(r);
      pi[u + 1 - lo] = cum;
      hiUsed = u + 1;
      if (u >= v + 4) {
        const cf = cum.toFloat();
        if (!isFinite(cf) || cf < JS_HEATBATH_FLOAT_TAIL) break;
      }
    }
    cum = Rat.one();
    let loUsed = v;
    for (let u = v - 1; u >= lo; u--) {
      const r = siteRatPlus(kind, j, i, u);
      if (r === null || r.isZero()) break;   // singular: stop expanding downward
      cum = cum.div(r);
      pi[u - lo] = cum;
      loUsed = u;
      if (u <= v - 4) {
        const cf = cum.toFloat();
        if (!isFinite(cf) || cf < JS_HEATBATH_FLOAT_TAIL) break;
      }
    }
    // Total = sum of pi[k] over the populated window
    let total = Rat.zero();
    for (let k = loUsed - lo; k <= hiUsed - lo; k++) total = total.add(pi[k]);
    if (total.isZero()) return v;
    // Exact sampling: pick a uniform Rat target in [0, total)
    // 64-bit randomness from two Math.random() draws (≈ 53+53 bits effective).
    const r1 = BigInt(Math.floor(Math.random() * 0x100000000));        // 32 bits
    const r2 = BigInt(Math.floor(Math.random() * 0x100000000));        // 32 bits
    const r64 = (r1 << 32n) | r2;
    const RAND_D = 1n << 64n;
    const target = new Rat(r64, RAND_D).mul(total);  // uniform in [0, total)
    let accum = Rat.zero();
    for (let k = loUsed - lo; k <= hiUsed - lo; k++) {
      accum = accum.add(pi[k]);
      if (target.lessThan(accum)) return lo + k;
    }
    return hiUsed;
  }

  function jsGlauberStep() {
    const numMu = Math.max(0, M - 1) * N;
    const numLam = N >= 2 ? Math.floor(N * (N - 1) / 2) : 0;
    const numMid = N;
    const total = numMu + numLam + numMid;
    if (total === 0) return -1;
    const r = Math.random() * total;
    let changed = 0;
    if (r < numMu) {
      const idx = Math.floor(r);
      const j = 1 + Math.floor(idx / N);
      const i = idx % N;
      const v = mu[j][i];
      const [lo, hi] = jsMuBounds(j, i);
      if (v >= lo && v <= hi) {
        const nv = jsHeatBathFlip(0, j, i, v, lo, hi);
        if (nv !== v) { mu[j][i] = nv; changed = 1; }
      }
      jsTryCount++;
    } else if (r < numMu + numLam) {
      let r2 = r - numMu;
      let j = 1, accum = 0;
      while (j <= N - 1 && accum + j <= r2) { accum += j; j++; }
      const i = Math.floor(r2 - accum);
      if (j >= 1 && j <= N - 1 && i >= 0 && i < j) {
        const v = lam[j][i];
        const [lo, hi] = jsLamBounds(j, i);
        if (v >= lo && v <= hi) {
          const nv = jsHeatBathFlip(1, j, i, v, lo, hi);
          if (nv !== v) { lam[j][i] = nv; changed = 1; }
        }
      }
      jsTryCount++;
    } else {
      const i = Math.floor(r - numMu - numLam);
      const v = mu[M][i];
      const [lo, hi] = jsMidBounds(i);
      if (v >= lo && v <= hi) {
        const nv = jsHeatBathFlip(2, M, i, v, lo, hi);
        if (nv !== v) { mu[M][i] = nv; changed = 1; }
      }
      jsTryCount++;
    }
    if (changed) jsAcceptCount++;
    jsStepCount++;
    return changed;
  }
  function jsGlauberSweep(numSteps) {
    for (let s = 0; s < numSteps; s++) jsGlauberStep();
  }

  // Initialise mu / lam in JS to all-zero state (used by rational mode).
  function jsInitState() {
    mu = []; for (let j = 0; j <= M; j++) mu.push(new Array(N).fill(0));
    lam = []; for (let j = 0; j < N; j++) lam.push(new Array(j).fill(0));
    lam.push(mu[M]);
    jsStepCount = 0; jsAcceptCount = 0; jsTryCount = 0;
  }

  // Build rational parameters from current input fields, preferring exact
  // expression evaluation when the input looks like an expression (e.g. q^i).
  // Also pushes the rationals across to WASM as CSV of "p/q" strings.
  function refreshRationalParams() {
    const yLen = Math.max(yRat.length || 0, 200, 4 * Math.max(N, M) + 200, (stats.maxPos || 0) + 50);
    const xExpr = tryExpressionRat($('fs-x').value, N);
    const wExpr = tryExpressionRat($('fs-w').value, M);
    const yExpr = tryExpressionRat($('fs-y').value, yLen);
    xRat = xExpr || parseRationalCSV($('fs-x').value);
    wRat = wExpr || parseRationalCSV($('fs-w').value);
    yRat = yExpr || parseRationalCSV($('fs-y').value);
    if (wasmReady && api && api.ratSetX) {
      api.ratSetX(ratArrayToCSV(xRat));
      api.ratSetW(ratArrayToCSV(wRat));
      api.ratSetY(ratArrayToCSV(yRat));
    }
  }
  function ratArrayToCSV(arr) {
    // Each element a Rat with BigInt p/q -> "p/q" string.
    const parts = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      const r = arr[i];
      parts[i] = r.p.toString() + '/' + r.q.toString();
    }
    return parts.join(',');
  }

  function jsRefreshStats() {
    const middle = mu[M] || [];
    let size = 0; for (const v of middle) size += v;
    stats = {
      step: jsStepCount,
      accept: jsAcceptCount,
      tries: jsTryCount,
      size,
      maxPos: maxPositionSeen()
    };
  }

  // ---- Parameter parsing ----
  // Expression parser/evaluator for inputs like  q^i,  10*q^i,  q^(-i)/2.
  // Variables available: i, k, j, n (1..len), q, alpha, beta, gamma (and a,b,g
  // shorthands), N, M.  Operators: + - * / ^.  ^ is right-associative.
  function exprTokenize(s) {
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) {
        let j = i, dot = false;
        while (j < s.length && (/[0-9]/.test(s[j]) || (s[j] === '.' && !dot))) {
          if (s[j] === '.') dot = true; j++;
        }
        tokens.push({ type: 'num', value: s.slice(i, j) }); i = j;
      } else if (/[a-zA-Z_]/.test(c)) {
        let j = i; while (j < s.length && /[a-zA-Z_0-9]/.test(s[j])) j++;
        tokens.push({ type: 'id', value: s.slice(i, j) }); i = j;
      } else if ('+-*/^()'.includes(c)) { tokens.push({ type: c }); i++; }
      else throw new Error('Unexpected char: ' + c);
    }
    return tokens;
  }
  function exprParse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const eat  = () => tokens[pos++];
    function E() {
      let l = T();
      while (peek() && (peek().type === '+' || peek().type === '-')) {
        const op = eat().type, r = T(); l = { type: 'binop', op, left: l, right: r };
      }
      return l;
    }
    function T() {
      let l = P();
      while (peek() && (peek().type === '*' || peek().type === '/')) {
        const op = eat().type, r = P(); l = { type: 'binop', op, left: l, right: r };
      }
      return l;
    }
    function P() {
      const b = U();
      if (peek() && peek().type === '^') { eat(); return { type: 'pow', base: b, exp: P() }; }
      return b;
    }
    function U() {
      if (peek() && peek().type === '-') { eat(); return { type: 'neg', child: U() }; }
      if (peek() && peek().type === '+') { eat(); return U(); }
      return A();
    }
    function A() {
      const t = eat();
      if (!t) throw new Error('Unexpected end');
      if (t.type === 'num') return { type: 'num', value: parseFloat(t.value) };
      if (t.type === 'id')  return { type: 'id',  name: t.value };
      if (t.type === '(') {
        const e = E(); const c = eat();
        if (!c || c.type !== ')') throw new Error('Expected )');
        return e;
      }
      throw new Error('Unexpected token ' + t.type);
    }
    const ast = E();
    if (pos < tokens.length) throw new Error('Trailing tokens');
    return ast;
  }
  function exprEvalFloat(ast, env) {
    switch (ast.type) {
      case 'num': return ast.value;
      case 'id':  { const v = env[ast.name]; if (v === undefined) throw new Error('Unknown variable: ' + ast.name); return v; }
      case 'neg': return -exprEvalFloat(ast.child, env);
      case 'binop': {
        const a = exprEvalFloat(ast.left, env), b = exprEvalFloat(ast.right, env);
        if (ast.op === '+') return a + b; if (ast.op === '-') return a - b;
        if (ast.op === '*') return a * b; if (ast.op === '/') return a / b;
      }
      case 'pow': return Math.pow(exprEvalFloat(ast.base, env), exprEvalFloat(ast.exp, env));
    }
    throw new Error('Bad AST');
  }
  function exprEvalRat(ast, env) {
    switch (ast.type) {
      case 'num': return Rat.fromString(String(ast.value));
      case 'id': { const v = env[ast.name]; if (v === undefined) throw new Error('Unknown variable: ' + ast.name);
                   return (v instanceof Rat) ? v : Rat.fromString(String(v)); }
      case 'neg': { const c = exprEvalRat(ast.child, env); return new Rat(-c.p, c.q); }
      case 'binop': {
        const a = exprEvalRat(ast.left, env), b = exprEvalRat(ast.right, env);
        if (ast.op === '+') return a.add(b); if (ast.op === '-') return a.sub(b);
        if (ast.op === '*') return a.mul(b); if (ast.op === '/') return a.div(b);
      }
      case 'pow': {
        const base = exprEvalRat(ast.base, env), exp = exprEvalRat(ast.exp, env);
        if (exp.q !== 1n) throw new Error('Non-integer exponent in rational expression');
        return base.pow(Number(exp.p));
      }
    }
    throw new Error('Bad AST');
  }
  function exprEnvFloat(i) {
    const q = parseFloat($('fs-q')?.value || '0.5');
    const alpha = parseFloat($('fs-alpha')?.value || '1');
    const beta  = parseFloat($('fs-beta')?.value  || '1');
    const gamma = parseFloat($('fs-gamma')?.value || '1');
    return { i, k: i, j: i, n: i, q, alpha, beta, gamma, a: alpha, b: beta, g: gamma, N, M };
  }
  function exprEnvRat(i) {
    const qR = Rat.fromString($('fs-q')?.value || '0.5');
    const aR = Rat.fromString($('fs-alpha')?.value || '1');
    const bR = Rat.fromString($('fs-beta')?.value || '1');
    const gR = Rat.fromString($('fs-gamma')?.value || '1');
    const iR = new Rat(BigInt(i), 1n);
    return { i: iR, k: iR, j: iR, n: iR, q: qR, alpha: aR, beta: bR, gamma: gR,
             a: aR, b: bR, g: gR, N: new Rat(BigInt(N), 1n), M: new Rat(BigInt(M), 1n) };
  }
  function looksLikeExpression(str) {
    const s = String(str || '').trim();
    if (!s) return false;
    if (s.includes(',')) return false;
    if (!/[a-zA-Z]/.test(s)) return false;
    return true;
  }
  function tryExpressionFloat(str, len) {
    if (!looksLikeExpression(str)) return null;
    try {
      const ast = exprParse(exprTokenize(String(str).trim()));
      const out = [];
      for (let i = 1; i <= len; i++) out.push(exprEvalFloat(ast, exprEnvFloat(i)));
      return out;
    } catch (e) { return null; }
  }
  function tryExpressionRat(str, len) {
    if (!looksLikeExpression(str)) return null;
    try {
      const ast = exprParse(exprTokenize(String(str).trim()));
      const out = [];
      for (let i = 1; i <= len; i++) out.push(exprEvalRat(ast, exprEnvRat(i)));
      return out;
    } catch (e) { return null; }
  }

  function parseCSV(str, indexedLen) {
    if (!str) return [];
    if (indexedLen != null) {
      const ex = tryExpressionFloat(str, indexedLen);
      if (ex) return ex;
    }
    let s = String(str);
    s = s.replace(/\(([^)]+)\)\^(\d+)/g, (m, p, c) => {
      const n = parseInt(c, 10);
      const vals = p.split(',').map(v => v.trim()).filter(v => v !== '');
      const out = []; for (let i = 0; i < n; i++) out.push(...vals); return out.join(',');
    });
    const out = [];
    for (const t of s.split(',')) {
      const tr = t.trim(); if (!tr) continue;
      if (tr.includes('^')) {
        const [a, b] = tr.split('^');
        const v = parseFloat(a), c = parseInt(b, 10);
        if (!isNaN(v) && !isNaN(c) && c > 0) { for (let i = 0; i < c; i++) out.push(v); continue; }
      }
      const v = parseFloat(tr); if (!isNaN(v)) out.push(v);
    }
    return out;
  }
  function arrayToCSV(arr) {
    return arr.map(x => Number.isInteger(x) ? x.toString() : parseFloat(x.toPrecision(6)).toString()).join(',');
  }
  function summarize(arr) {
    if (!arr.length) return '';
    if (arr.every(v => v === arr[0])) return `${arr.length} values, all = ${parseFloat(arr[0].toPrecision(6))}`;
    const head = arr.slice(0, 3).map(v => parseFloat(v.toPrecision(4))).join(', ');
    const tail = arr.length > 6 ? `, ..., ${arr.slice(-2).map(v => parseFloat(v.toPrecision(4))).join(', ')}  (${arr.length} total)` : '';
    return arr.length <= 6 ? arr.map(v => parseFloat(v.toPrecision(4))).join(', ') : head + tail;
  }
  function clampInt(s, lo, hi) {
    const n = parseInt(s, 10); if (isNaN(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }
  function round6(x) { return parseFloat(x.toPrecision(6)); }

  // ---- WASM helpers ----
  function pushArrayToWasm(arr, setter) {
    const n = arr.length;
    if (n === 0) { setter(0, 0); return; }
    const ptr = Module._malloc(n * 8);
    // Re-fetch HEAPF64 each call: WASM memory growth invalidates cached typed arrays.
    const heap = new Float64Array(Module.HEAPF64.buffer, ptr, n);
    for (let i = 0; i < n; i++) heap[i] = arr[i];
    setter(ptr, n);
    Module._free(ptr);
  }
  function readJsonFromWasm(getter) {
    const ptr = getter();
    const s = Module.UTF8ToString(ptr);
    api.free(ptr);
    return JSON.parse(s);
  }

  function syncStateFromWasm() {
    const st = readJsonFromWasm(api.getStateJson);
    N = st.N; M = st.M; mu = st.mu; lam = st.lam;
    stats = readJsonFromWasm(api.getStatsJson);
  }
  function pushParamsToWasm() {
    pushArrayToWasm(xArr, api.setX);
    pushArrayToWasm(wArr, api.setW);
    pushArrayToWasm(yArr, api.setY);
  }

  // ---- UI -> WASM ----
  function applyParamsFromInputs() {
    const yLen = Math.max(yArr.length || 0, 200, 4 * Math.max(N, M) + 200, stats.maxPos + 50);
    xArr = parseCSV($('fs-x').value, N);
    wArr = parseCSV($('fs-w').value, M);
    yArr = parseCSV($('fs-y').value, yLen);
    $('fs-x-note').textContent = `x: [${summarize(xArr)}]  (need length ${N})`;
    $('fs-w-note').textContent = `w: [${summarize(wArr)}]  (need length ${M})`;
    $('fs-y-note').textContent = `y: [${summarize(yArr)}]  (length ${yArr.length}; need ≥ ${stats.maxPos})`;
    if (wasmReady) pushParamsToWasm();
    refreshRationalParams();
  }
  function applyQSpecToInputs() {
    const qStr = $('fs-q').value, aStr = $('fs-alpha').value;
    const bStr = $('fs-beta').value, gStr = $('fs-gamma').value;
    const q = parseFloat(qStr);
    const a = parseFloat(aStr);
    const b = parseFloat(bStr);
    const g = parseFloat(gStr);

    // Float versions for the input fields (approximate, displayed only).
    const xS = []; for (let i = 1; i <= N; i++) xS.push(round6(a * Math.pow(q, i)));
    const wS = []; for (let k = 1; k <= M; k++) wS.push(round6(g * Math.pow(q, k)));
    const yLen = (q > 0 && q < 1)
        ? Math.min(2000, Math.max(200, Math.ceil(-690 / Math.log(q))))
        : 200;
    const yS = []; for (let k = 1; k <= yLen; k++) yS.push(round6(b * Math.pow(q, k)));
    $('fs-x').value = arrayToCSV(xS);
    $('fs-w').value = arrayToCSV(wS);
    $('fs-y').value = arrayToCSV(yS);

    // EXACT rational arrays — built directly via Rat so values never collapse
    // to 0 even when q^k underflows in double.
    try {
      const qR = Rat.fromString(qStr);
      const aR = Rat.fromString(aStr);
      const bR = Rat.fromString(bStr);
      const gR = Rat.fromString(gStr);
      // Cache q^k incrementally (avoids O(log k) work per entry).
      const qPow = [Rat.one()];
      const yLenRat = Math.max(yLen, 2 * (N + M) + 200);
      for (let k = 1; k <= yLenRat; k++) qPow.push(qPow[k - 1].mul(qR));
      xRat = []; for (let i = 1; i <= N; i++) xRat.push(aR.mul(qPow[i]));
      wRat = []; for (let k = 1; k <= M; k++) wRat.push(gR.mul(qPow[k]));
      yRat = []; for (let k = 1; k <= yLenRat; k++) yRat.push(bR.mul(qPow[k]));
    } catch (e) {
      // Fall back to parsing the (possibly imprecise) input text.
      refreshRationalParams();
    }

    // Refresh notes
    $('fs-x-note').textContent = `x: [${summarize(xS)}]  (need length ${N})`;
    $('fs-w-note').textContent = `w: [${summarize(wS)}]  (need length ${M})`;
    $('fs-y-note').textContent = `y: [${summarize(yS)}]  (need length ≥ ${stats.maxPos})`;

    if (wasmReady) pushParamsToWasm();
  }
  function applyUniformToInputs() {
    $('fs-x').value = `1^${N}`;
    $('fs-w').value = `1^${M}`;
    $('fs-y').value = `1^${Math.max(60, N + 4)}`;
    applyParamsFromInputs();
  }

  function fullRebuild() {
    setRunning(false);
    N = clampInt($('fs-N').value, 1, 200);
    M = clampInt($('fs-M').value, 1, 200);
    if (wasmReady) {
      const seed = (Math.random() * 0xFFFFFFFF) >>> 0;
      api.init(N, M, seed);
      pushParamsToWasm();
      syncStateFromWasm();
    }
    selected = null;
    applyParamsFromInputs();
    draw();
    refreshStats();
  }

  // ---- Stats ----
  function refreshStats() {
    if (isRationalMode()) {
      if (wasmReady && api.ratGetStatsJson) {
        stats = readJsonFromWasm(api.ratGetStatsJson);
      } else {
        jsRefreshStats();
      }
    } else if (wasmReady) {
      stats = readJsonFromWasm(api.getStatsJson);
    }
    $('fs-stat-step').textContent = stats.step;
    $('fs-stat-acc').textContent  = stats.accept;
    $('fs-stat-tries').textContent = stats.tries;
    $('fs-stat-size').textContent = stats.size;
    $('fs-stat-maxp').textContent = stats.maxPos;
  }

  // ---- Visualization ----
  function getDesiredCellSize() {
    const slider = $('fs-scale');
    const v = slider ? parseInt(slider.value, 10) : 20;
    return (!isFinite(v) || v <= 0) ? 20 : v;
  }
  function maxPositionSeen() {
    let m = N + 1;
    for (let j = 0; j <= M; j++) {
      const v = mu[j] && mu[j][0]; if (v != null && v + N > m) m = v + N;
    }
    for (let j = 1; j <= N; j++) {
      const arr = lam[j]; if (arr && arr.length && arr[0] + j > m) m = arr[0] + j;
    }
    return m;
  }
  function pathPosition(k, lvl) {
    if (lvl <= M) {
      if (!mu[lvl]) return null;
      return mu[lvl][k] + N - k;
    }
    const s = lvl - M, lamLevel = N - s, track = k - s;
    if (track < 0 || track >= lamLevel) return null;
    if (!lam[lamLevel]) return null;
    return lam[lamLevel][track] + lamLevel - track;
  }

  // Map canvas (cssX, cssY) to particle (kind, j, i) closest to click. Returns null if too far.
  let cachedDrawDims = null;
  function findParticleAtPixel(cssX, cssY) {
    if (!cachedDrawDims) return null;
    const { ml, mt, plotH, cellSize } = cachedDrawDims;
    const xToCol = (x) => (x - ml) / cellSize;
    const yToLvl = (y) => (mt + plotH - y) / cellSize;
    let best = null;
    const maxLvl = M + N;
    for (let lvl = 0; lvl <= maxLvl; lvl++) {
      for (let k = 0; k < N; k++) {
        const pos = pathPosition(k, lvl);
        if (pos == null) continue;
        const dx = xToCol(cssX) - pos;
        const dy = yToLvl(cssY) - lvl;
        const d2 = dx * dx + dy * dy;
        if (!best || d2 < best.d2) {
          best = { d2, lvl, k, pos };
        }
      }
    }
    if (!best || best.d2 > 1.2) return null; // require < ~1 cell
    // Map (lvl, k) to (kind, j, i)
    const { lvl, k } = best;
    if (lvl > 0 && lvl < M) return { kind: 'mu', j: lvl, i: k, lvl, k, pos: best.pos };
    if (lvl === M) {
      // middle row: i = k for k in 0..N-1
      return { kind: 'mid', j: M, i: k, lvl, k, pos: best.pos };
    }
    if (lvl > M && lvl < M + N) {
      const s = lvl - M; const lamLevel = N - s; const track = k - s;
      // lam[lamLevel] has lamLevel parts
      if (lamLevel >= 1 && lamLevel <= N - 1 && track >= 0 && track < lamLevel) {
        return { kind: 'lam', j: lamLevel, i: track, lvl, k, pos: best.pos };
      }
    }
    return null; // boundary rows (mu^0, lam^0) — not flippable
  }

  // ---- Pan/zoom state ----
  let panX = 0, panY = 0, zoom = 1.0;
  let viewInitialized = false;

  function fitViewToContent(maxPos, totalLevels, plotW, plotH) {
    const wrap = document.getElementById('fs-canvas-wrap');
    if (!wrap) return;
    const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    const padding = 24;
    const targetW = Math.max(50, cssW - padding);
    const targetH = Math.max(50, cssH - padding);
    const z = Math.min(targetW / plotW, targetH / plotH, 1.0);
    zoom = z > 0 ? z : 1.0;
    panX = (cssW - plotW * zoom) / 2 - 38 * zoom;  // approximate centring
    panY = (cssH - plotH * zoom) / 2 - 14 * zoom;
    viewInitialized = true;
  }

  function draw() {
    const maxPos = Math.max(N + 2, maxPositionSeen() + 2);
    const totalLevels = M + N;
    const ml = 38, mr = 18, mt = 14, mb = 28;

    const userCell = getDesiredCellSize();
    const square = isSquareCells();
    let cellHeight = userCell, cellWidth = userCell;
    if (!square) {
      // Allow non-square: keep cellHeight, shrink cellWidth to fit nominal canvas
      const cssWForFit = Math.max(400, canvas.clientWidth || 1000);
      if (cellWidth * maxPos + ml + mr > cssWForFit) {
        cellWidth = Math.max(0.5, (cssWForFit - ml - mr) / maxPos);
      }
    }

    const plotW = cellWidth * maxPos;
    const plotH = cellHeight * totalLevels;

    // CSS canvas size = wrap's box.  Internal pixel size = css × dpr.
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 800;
    const cssH = canvas.clientHeight || 480;
    if (canvas.width !== Math.round(cssW * dpr)) canvas.width = Math.round(cssW * dpr);
    if (canvas.height !== Math.round(cssH * dpr)) canvas.height = Math.round(cssH * dpr);

    if (!viewInitialized) fitViewToContent(maxPos, totalLevels, plotW, plotH);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Apply DPR + pan + zoom
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * panX, dpr * panY);

    cachedDrawDims = { ml, mt, plotH, cellSize: cellWidth, cellWidth, cellHeight, maxPos, totalLevels, panX, panY, zoom };

    const xOf = (col) => ml + col * cellWidth;
    const yOf = (lvl) => mt + plotH - lvl * cellHeight;
    const cellSize = cellWidth;

    // Bands
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(ml, yOf(M), plotW, yOf(0) - yOf(M));
    ctx.fillStyle = '#e9f1ff';
    ctx.fillRect(ml, yOf(totalLevels), plotW, yOf(M) - yOf(totalLevels));

    // Grid
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let lvl = 0; lvl <= totalLevels; lvl++) { const y = yOf(lvl); ctx.moveTo(ml, y); ctx.lineTo(ml + plotW, y); }
    ctx.stroke();
    ctx.strokeStyle = '#eee';
    ctx.beginPath();
    for (let c = 0; c <= maxPos; c++) { const x = xOf(c); ctx.moveTo(x, mt); ctx.lineTo(x, mt + plotH); }
    ctx.stroke();
    // mu/lam separator
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(ml, yOf(M)); ctx.lineTo(ml + plotW, yOf(M)); ctx.stroke();

    // Side labels: w_j (mu rows), x_{N-s+1} (lam rows)
    ctx.fillStyle = '#555';
    const labelFont = Math.min(13, Math.max(9, cellSize * 0.55));
    ctx.font = labelFont + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let j = 1; j <= M; j++) {
      const yMid = (yOf(j - 1) + yOf(j)) / 2;
      ctx.fillText('w' + sub(j), ml - 6, yMid);
    }
    for (let s = 1; s <= N; s++) {
      const yMid = (yOf(M + s - 1) + yOf(M + s)) / 2;
      ctx.fillText('x' + sub(N - s + 1), ml - 6, yMid);
    }
    // (Bottom y_k labels removed — too cluttered when maxPos is large.)

    // Highlight selected 2x2 block: the four cells whose lower-left corner is
    // the GT vertex (pos, lvl).  For an up-right path through the vertex these
    // are the cells the path traverses immediately after passing through it,
    // and they are exactly the cells whose contents change when v ↦ v ± 1.
    if (selected) {
      const { lvl, pos } = selected;
      const x0 = xOf(pos), y0 = yOf(lvl + 2), bw = 2 * cellSize, bh = 2 * cellSize;
      ctx.fillStyle = 'rgba(255,180,40,0.22)';
      ctx.fillRect(x0, y0, bw, bh);
      ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2;
      ctx.strokeRect(x0, y0, bw, bh);
      // mark internal grid lines so the four cells of the block are visible
      ctx.lineWidth = 1; ctx.strokeStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(x0 + cellSize, y0); ctx.lineTo(x0 + cellSize, y0 + bh);
      ctx.moveTo(x0, y0 + cellSize); ctx.lineTo(x0 + bw, y0 + cellSize);
      ctx.stroke();
    }

    // Paths
    const palette = [
      '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2',
      '#7f7f7f','#bcbd22','#17becf','#aec7e8','#ffbb78','#98df8a','#ff9896',
      '#c5b0d5','#c49c94','#f7b6d2','#c7c7c7','#dbdb8d','#9edae5'
    ];
    for (let k = 0; k < N; k++) {
      const color = palette[k % palette.length];
      // 1) trajectory (solid)
      ctx.strokeStyle = color; ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.beginPath();
      let prev = null, lastX = 0, lastY = 0;
      const lastLvl = Math.min(M + k, M + N);
      for (let lvl = 0; lvl <= lastLvl; lvl++) {
        const pos = pathPosition(k, lvl);
        if (pos == null) break;
        const x = xOf(pos), y = yOf(lvl);
        if (prev == null) ctx.moveTo(x, y);
        else if (pos !== prev.pos) { ctx.lineTo(prev.x, y); ctx.lineTo(x, y); }
        else ctx.lineTo(x, y);
        prev = { x, y, pos }; lastX = x; lastY = y;
      }
      ctx.stroke();
      // 2) exit stub: dashed line from the final particle to the right edge
      if (prev) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = color;
        ctx.moveTo(lastX, lastY); ctx.lineTo(ml + plotW, lastY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // 3) dots at every GT level the path is at
      ctx.fillStyle = color;
      for (let lvl = 0; lvl <= lastLvl; lvl++) {
        const pos = pathPosition(k, lvl);
        if (pos == null) break;
        ctx.beginPath(); ctx.arc(xOf(pos), yOf(lvl), Math.min(3.4, Math.max(1.6, cellSize * 0.14)), 0, 2 * Math.PI); ctx.fill();
      }
      // 4) emphasise the exit dot (where the path leaves the system)
      if (prev) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(lastX, lastY, Math.min(4.2, Math.max(2.1, cellSize * 0.18)), 0, 2 * Math.PI); ctx.fill();
        ctx.lineWidth = 1.8; ctx.strokeStyle = color;
        ctx.beginPath(); ctx.arc(lastX, lastY, Math.min(4.2, Math.max(2.1, cellSize * 0.18)), 0, 2 * Math.PI); ctx.stroke();
      }
    }
  }

  // ---- Detail mode ----
  function symbolicRatios(sel) {
    const { kind, j, i } = sel;
    const v = (kind === 'mu') ? mu[j][i]
            : (kind === 'lam') ? lam[j][i]
            : mu[M][i];
    let formula;
    if (kind === 'mu') {
      // up: (w_{j+1} + y_{v+N-i}) / (w_j + y_{v+N+1-i})
      formula = {
        up:  `(w${sub(j+1)} + y${sub(v + N - i)}) / (w${sub(j)} + y${sub(v + N + 1 - i)})`,
        dn:  `(w${sub(j)} + y${sub(v + N - i)}) / (w${sub(j+1)} + y${sub(v + N - 1 - i)})`,
        upRaw: `\\frac{w_{${j+1}}+y_{${v + N - i}}}{w_{${j}}+y_{${v + N + 1 - i}}}`,
        dnRaw: `\\frac{w_{${j}}+y_{${v + N - i}}}{w_{${j+1}}+y_{${v + N - 1 - i}}}`,
      };
    } else if (kind === 'lam') {
      formula = {
        up:  `(x${sub(j)} + y${sub(v + j - i)}) / (x${sub(j+1)} + y${sub(v + j + 1 - i)})`,
        dn:  `(x${sub(j+1)} + y${sub(v + j - i)}) / (x${sub(j)} + y${sub(v + j - 1 - i)})`,
      };
    } else {
      formula = {
        up:  `(x${sub(N)} + y${sub(v + N - i)}) / (w${sub(M)} + y${sub(v + N + 1 - i)})`,
        dn:  `(w${sub(M)} + y${sub(v + N - i)}) / (x${sub(N)} + y${sub(v + N - 1 - i)})`,
      };
    }
    return { v, formula };
  }
  function refreshDetailPanel() {
    const panel = $('fs-detail-panel'); if (!panel) return;
    const inDetail = $('fs-detail-mode') && $('fs-detail-mode').checked;
    if (!inDetail || !selected) { panel.style.display = 'none'; return; }
    panel.style.display = '';

    // Get bounds + ratios from WASM (but display only symbolic)
    const kindCode = selected.kind === 'mu' ? 0 : selected.kind === 'lam' ? 1 : 2;
    const r = readJsonFromWasm(() => api.getRatiosJson(kindCode, selected.j, selected.i));
    const sym = symbolicRatios(selected);
    const kindLabel = selected.kind === 'mu' ? `μ-interior, level j=${selected.j}, row i=${selected.i+1}`
                    : selected.kind === 'lam' ? `λ-interior, level j=${selected.j}, row i=${selected.i+1}`
                    : `middle row μ⁽ᴹ⁾ = λ⁽ᴺ⁾, row i=${selected.i+1}`;
    const hi = (r.hi >= 1000000000) ? '∞' : r.hi;
    const info = $('fs-detail-info');
    info.innerHTML = `
      <div><b>${kindLabel}</b></div>
      <div>current value v = <b>${r.v}</b> &nbsp; bounds [${r.lo}, ${hi}]</div>
      <div style="margin-top:6px;">flip ↑ ratio &nbsp; <span style="color:#7a4a00;">P(v+1)/P(v)</span> =</div>
      <div style="padding-left:14px;">${sym.formula.up}</div>
      <div style="margin-top:4px;">flip ↓ ratio &nbsp; <span style="color:#7a4a00;">P(v−1)/P(v)</span> =</div>
      <div style="padding-left:14px;">${sym.formula.dn}</div>
    `;
  }
  function setupCanvasClick() {
    canvas.addEventListener('click', (e) => {
      const inDetail = $('fs-detail-mode') && $('fs-detail-mode').checked;
      if (!inDetail) return;
      // Map click → world coordinates by inverting pan/zoom
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const wx = (cx - panX) / zoom, wy = (cy - panY) / zoom;
      const sel = findParticleAtPixel(wx, wy);
      selected = sel;
      draw();
      refreshDetailPanel();
    });
  }
  function setupPanZoom() {
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('mousedown', (e) => {
      if ($('fs-detail-mode') && $('fs-detail-mode').checked) return; // detail mode owns clicks
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.classList.add('dragging');
    });
    window.addEventListener('mouseup', () => { dragging = false; canvas.classList.remove('dragging'); });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      panX += dx; panY += dy;
      draw();
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      // Anchor zoom at the pointer
      const zFactor = Math.exp(-e.deltaY * 0.0015);
      const newZoom = Math.max(0.005, Math.min(50, zoom * zFactor));
      const wx = (cx - panX) / zoom, wy = (cy - panY) / zoom;
      panX = cx - wx * newZoom; panY = cy - wy * newZoom;
      zoom = newZoom;
      draw();
    }, { passive: false });
    canvas.addEventListener('dblclick', () => { viewInitialized = false; draw(); });
    // Touch: simple single-finger pan + pinch zoom
    let touchPrev = null;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchPrev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchPrev = { dist: Math.hypot(dx, dy),
          midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          midY: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (!touchPrev) return;
      e.preventDefault();
      if (e.touches.length === 1 && 'x' in touchPrev) {
        const dx = e.touches[0].clientX - touchPrev.x, dy = e.touches[0].clientY - touchPrev.y;
        panX += dx; panY += dy;
        touchPrev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        draw();
      } else if (e.touches.length === 2 && 'dist' in touchPrev) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const rect = canvas.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const factor = dist / touchPrev.dist;
        const newZoom = Math.max(0.005, Math.min(50, zoom * factor));
        const wx = (midX - panX) / zoom, wy = (midY - panY) / zoom;
        panX = midX - wx * newZoom; panY = midY - wy * newZoom; zoom = newZoom;
        touchPrev = { dist, midX: midX + rect.left, midY: midY + rect.top };
        draw();
      }
    }, { passive: false });
    canvas.addEventListener('touchend', () => { touchPrev = null; });
  }

  // ---- Run loop ----
  // Dynamics loop (decoupled from render) — runs in background via setTimeout(0)
  // so the browser can interleave UI events between chunks.
  let dynamicsTimerId = null;
  function startDynamicsLoop() {
    if (dynamicsTimerId) { clearTimeout(dynamicsTimerId); dynamicsTimerId = null; }
    const loop = () => {
      if (!running) return;
      const sweepsPerFrame = Math.max(0, parseInt($('fs-speed').value || '1', 10));
      const sitesPerSweep = Math.max(1, Math.max(0, M - 1) * N + Math.max(0, N * (N - 1) / 2) + N);
      const target = sitesPerSweep * sweepsPerFrame;
      const t0 = performance.now();
      const CHUNK_MS = 60;
      if (isRationalMode()) {
        // Run rational dynamics in WASM (BigInt + Rat in C++) — ~10× faster
        // than the JS BigInt path it replaced.  Sync state/stats afterwards.
        if (wasmReady && api.ratSweep) {
          api.ratSweep(target);
          syncStateFromWasm();
        } else {
          // Fallback: JS BigInt heat-bath if WASM didn't load
          let done = 0;
          while (done < target && (performance.now() - t0) < CHUNK_MS) {
            jsGlauberStep(); done++;
          }
        }
      } else if (wasmReady) {
        if (target > 0) api.sweep(target);
      }
      dynamicsTimerId = setTimeout(loop, 0);
    };
    loop();
  }

  // Render loop — independent, runs on every animation frame, just reads
  // whichever state the dynamics loop has produced so far.
  function startRenderLoop() {
    const loop = () => {
      if (!running) { rafId = null; return; }
      if (isRationalMode()) {
        jsRefreshStats();
      } else if (wasmReady) {
        syncStateFromWasm();
      }
      draw();
      refreshStats();
      if (selected) refreshDetailPanel();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function setRunning(on) {
    running = on;
    const btn = $('fs-run-btn');
    if (btn) { btn.textContent = on ? '⏸ Pause' : '▶ Run'; btn.classList.toggle('danger', on); btn.classList.toggle('primary', !on); }
    if (on) {
      startDynamicsLoop();
      startRenderLoop();
    } else {
      if (dynamicsTimerId) { clearTimeout(dynamicsTimerId); dynamicsTimerId = null; }
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }
  }

  // ---- Listeners ----
  function setupListeners() {
    $('fs-resize-btn').addEventListener('click', fullRebuild);
    $('fs-uniform-btn').addEventListener('click', () => { applyUniformToInputs(); draw(); });
    $('fs-apply-q').addEventListener('click', () => { applyQSpecToInputs(); draw(); });
    $('fs-x').addEventListener('input', applyParamsFromInputs);
    $('fs-w').addEventListener('input', applyParamsFromInputs);
    $('fs-y').addEventListener('input', applyParamsFromInputs);
    $('fs-N').addEventListener('change', fullRebuild);
    $('fs-M').addEventListener('change', fullRebuild);

    $('fs-run-btn').addEventListener('click', () => setRunning(!running));
    $('fs-step-btn').addEventListener('click', () => {
      const n = parseInt($('fs-step-count').value, 10) || 1;
      if (isRationalMode()) {
        if (wasmReady && api.ratSweep) {
          api.ratSweep(n);
          syncStateFromWasm();
        } else {
          // Fallback chunked JS BigInt
          let remaining = n;
          const runChunk = () => {
            const t0 = performance.now();
            while (remaining > 0) { jsGlauberStep(); remaining--;
              if (performance.now() - t0 > 25) break; }
            jsRefreshStats(); draw(); refreshStats();
            if (remaining > 0) setTimeout(runChunk, 0);
          };
          runChunk();
          return;
        }
      } else if (wasmReady) {
        api.sweep(n); syncStateFromWasm();
      }
      draw(); refreshStats();
    });
    $('fs-reset-btn').addEventListener('click', () => {
      setRunning(false);
      if (wasmReady) {
        const seed = (Math.random() * 0xFFFFFFFF) >>> 0;
        api.init(N, M, seed);          // re-zeros mu/lam in C++
        pushParamsToWasm();             // double-mode params
        if (api.ratResetStats) api.ratResetStats();
        refreshRationalParams();        // also pushes rational params to C++
        syncStateFromWasm();
      } else {
        jsInitState();
        refreshRationalParams();
      }
      selected = null;
      draw(); refreshStats(); refreshDetailPanel();
    });

    // Toggle exact rational mode: reset state to all-zero on switch.
    const ratCb = $('fs-rat-mode');
    if (ratCb) ratCb.addEventListener('change', () => {
      setRunning(false);
      if (isRationalMode()) {
        jsInitState();
        refreshRationalParams();
      } else if (wasmReady) {
        const seed = (Math.random() * 0xFFFFFFFF) >>> 0;
        api.init(N, M, seed);
        pushParamsToWasm();
        syncStateFromWasm();
      }
      draw(); refreshStats();
    });
    const sqCb = $('fs-square-cells');
    if (sqCb) sqCb.addEventListener('change', () => draw());

    const scaleEl = $('fs-scale'), scaleValEl = $('fs-scale-val');
    if (scaleEl && scaleValEl) {
      const onScaleChange = () => { scaleValEl.textContent = scaleEl.value + 'px'; draw(); };
      scaleEl.addEventListener('input', onScaleChange); onScaleChange();
    }
    const fitBtn = $('fs-scale-fit');
    if (fitBtn) {
      fitBtn.addEventListener('click', () => {
        const wrap = document.getElementById('fs-canvas-wrap'); if (!wrap) return;
        const wrapW = wrap.clientWidth - 16;
        const wrapH = Math.max(280, window.innerHeight * 0.7);
        const maxPos = Math.max(N + 2, maxPositionSeen() + 2);
        const totalLevels = M + N;
        const fit = Math.floor(Math.max(3, Math.min(
          (wrapW - 38 - 18) / maxPos, (wrapH - 14 - 28) / totalLevels)));
        scaleEl.value = String(Math.min(parseInt(scaleEl.max,10), Math.max(parseInt(scaleEl.min,10), fit)));
        scaleValEl.textContent = scaleEl.value + 'px';
        draw();
      });
    }

    // Detail mode
    const dm = $('fs-detail-mode');
    if (dm) {
      dm.addEventListener('change', () => { if (!dm.checked) { selected = null; } draw(); refreshDetailPanel(); });
    }
    // Force-flip buttons in detail panel
    const flipUp = $('fs-flip-up-btn'), flipDn = $('fs-flip-dn-btn');
    if (flipUp) flipUp.addEventListener('click', () => doForceFlip(+1));
    if (flipDn) flipDn.addEventListener('click', () => doForceFlip(-1));

    setupCanvasClick();
    setupPanZoom();
    window.addEventListener('resize', () => { viewInitialized = false; draw(); });
  }
  function doForceFlip(dir) {
    if (!wasmReady || !selected) return;
    const k = selected.kind === 'mu' ? 0 : selected.kind === 'lam' ? 1 : 2;
    api.flipAt(k, selected.j, selected.i, dir);
    syncStateFromWasm();
    draw(); refreshStats(); refreshDetailPanel();
  }

  // ---- Init ----
  function bindWasmApi() {
    api = {
      init:          Module.cwrap('fs_init',          null,   ['number','number','number']),
      setX:          Module.cwrap('fs_set_x',         null,   ['number','number']),
      setW:          Module.cwrap('fs_set_w',         null,   ['number','number']),
      setY:          Module.cwrap('fs_set_y',         null,   ['number','number']),
      sweep:         Module.cwrap('fs_sweep',         null,   ['number']),
      flipAt:        Module.cwrap('fs_flip_at',       'number', ['number','number','number','number']),
      getStateJson:  Module.cwrap('fs_get_state_json','number', []),
      getStatsJson:  Module.cwrap('fs_get_stats_json','number', []),
      getRatiosJson: Module.cwrap('fs_get_ratios_json','number',['number','number','number']),
      free:          Module.cwrap('fs_free',          null,   ['number']),
      // Exact-rational dynamics (BigInt rationals, all in C++).
      // Strings are passed as HEAP pointers, NOT cwrap('string') — the latter
      // copies into the WASM stack which overflows for the multi-megabyte
      // CSVs we send for the y array.
      ratSetXRaw:    Module.cwrap('fs_rat_set_x',     null,   ['number']),
      ratSetWRaw:    Module.cwrap('fs_rat_set_w',     null,   ['number']),
      ratSetYRaw:    Module.cwrap('fs_rat_set_y',     null,   ['number']),
      ratSweep:      Module.cwrap('fs_rat_sweep',     null,   ['number']),
      ratResetStats: Module.cwrap('fs_rat_reset_stats', null, []),
      ratGetStatsJson: Module.cwrap('fs_rat_get_stats_json','number', []),
    };
    // Helpers that copy long strings via _malloc/_free (heap, not stack).
    api.ratSetX = (csv) => sendStringToWasm(csv, api.ratSetXRaw);
    api.ratSetW = (csv) => sendStringToWasm(csv, api.ratSetWRaw);
    api.ratSetY = (csv) => sendStringToWasm(csv, api.ratSetYRaw);
  }
  function sendStringToWasm(str, fn) {
    str = String(str || '');
    const lenBytes = Module.lengthBytesUTF8(str) + 1;
    const ptr = Module._malloc(lenBytes);
    if (!ptr) return;
    Module.stringToUTF8(str, ptr, lenBytes);
    try { fn(ptr); } finally { Module._free(ptr); }
  }

  function bootInit() {
    N = clampInt($('fs-N').value, 1, 200);
    M = clampInt($('fs-M').value, 1, 200);
    const seed = (Math.random() * 0xFFFFFFFF) >>> 0;
    api.init(N, M, seed);
    // Initialise both engines so toggling is seamless; rational mode is the
    // active path by default.
    jsInitState();
    syncStateFromWasm();
    if (isRationalMode()) jsInitState();   // override with empty zero state
    applyQSpecToInputs();
    setupListeners();
    if (isRationalMode()) jsRefreshStats();
    draw();
    refreshStats();
  }

  // Wait for WASM
  function waitForRuntime() {
    if (typeof Module === 'undefined') {
      console.error('Module not found — factorial-wasm.js failed to load.');
      return;
    }
    if (Module.calledRun) {
      // Already initialized
      wasmReady = true; bindWasmApi(); bootInit(); return;
    }
    Module.onRuntimeInitialized = () => {
      wasmReady = true; bindWasmApi(); bootInit();
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForRuntime);
  } else {
    waitForRuntime();
  }
})();
