/* Exact sampler for factorial Schur processes via Yang--Baxter bijectivisation.
 * No Glauber dynamics, no WASM: this implements the reverse-Cauchy row-swap
 * sampler from the frozen RHS configuration.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('fs-canvas');
  const ctx = canvas.getContext('2d');

  let N = 6;
  let M = 6;
  let xArr = [];
  let wArr = [];
  let ySpec = null;
  let randomUnit = Math.random;
  let columnCapOverride = null;

  // Final sampled GT data, in the format used by the old page view.
  let mu = [];   // mu[j], j=0..M, each length N
  let lam = [];  // lam[j], j=0..N, length j; lam[N] = mu[M]

  let rows = [];
  let levels = [];
  let stats = {
    samples: 0,
    size: 0,
    maxPos: 0,
    rowSwaps: 0,
    localMoves: 0,
    randomChoices: 0,
    elapsedMs: 0,
  };
  let activeWorker = null;
  let activeRequestId = 0;
  let samplingActive = false;
  let samplingCanceled = false;
  let runState = 'ready';
  let elapsedStartedAt = 0;
  let elapsedTimer = null;
  let renderScheduled = false;

  const LOCKED_DURING_SAMPLE_IDS = [
    'fs-N', 'fs-M', 'fs-q', 'fs-alpha', 'fs-beta', 'fs-gamma',
    'fs-x', 'fs-w', 'fs-y', 'fs-apply-q', 'fs-uniform-btn', 'fs-resize-btn',
    'fs-sample-btn', 'fs-multi-sample-btn', 'fs-sample-count', 'fs-max-cols',
  ];

  const SUB = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
  function sub(n) { return String(n).split('').map(d => SUB[+d] || d).join(''); }

  function clampInt(s, lo, hi) {
    const n = parseInt(s, 10);
    if (!Number.isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function round6(x) {
    if (!Number.isFinite(x)) return x;
    return parseFloat(x.toPrecision(6));
  }

  function formatSeconds(ms) {
    const value = Number.isFinite(ms) && ms > 0 ? ms : 0;
    return `${(value / 1000).toFixed(2)} s`;
  }

  function updateElapsedDisplay(ms) {
    const el = $('fs-status-elapsed');
    if (el) el.textContent = formatSeconds(ms);
  }

  function stopElapsedTimer(finalMs) {
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
    if (finalMs != null) updateElapsedDisplay(finalMs);
  }

  function startElapsedTimer(startedAt = performance.now()) {
    elapsedStartedAt = startedAt;
    stopElapsedTimer(0);
    elapsedTimer = setInterval(() => {
      updateElapsedDisplay(performance.now() - elapsedStartedAt);
    }, 100);
  }

  function classForRunState(state) {
    if (state === 'error') return 'fs-note err';
    if (state === 'canceled') return 'fs-note warn';
    if (state === 'sampling' || state === 'rendering' || state === 'validating') return 'fs-note ok';
    return 'fs-note ok';
  }

  function setRunState(state, phase, message, className) {
    runState = state;
    const phaseEl = $('fs-status-phase');
    if (phaseEl) phaseEl.textContent = phase || state;
    const note = $('fs-validation-note');
    if (note) {
      note.textContent = message || '';
      note.className = className || classForRunState(state);
    }
    if (state !== 'sampling') stopElapsedTimer(state === 'ready' || state === 'validating' ? 0 : undefined);
  }

  function readControlState(overrides = {}) {
    const nextN = clampInt(overrides.N ?? $('fs-N')?.value ?? N, 1, 120);
    const nextM = clampInt(overrides.M ?? $('fs-M')?.value ?? M, 1, 120);
    const rawCap = overrides.columnCap ?? $('fs-max-cols')?.value ?? '20000';
    const columnCap = Math.max(100, Math.min(1000000, Math.trunc(Number(rawCap) || 20000)));
    return {
      N: nextN,
      M: nextM,
      columnCap,
      q: parseFloat($('fs-q')?.value || '0.95'),
      alpha: parseFloat($('fs-alpha')?.value || '0.55'),
      beta: parseFloat($('fs-beta')?.value || '0'),
      gamma: parseFloat($('fs-gamma')?.value || '1.0'),
      xInput: $('fs-x')?.value || '',
      wInput: $('fs-w')?.value || '',
      yInput: $('fs-y')?.value || '',
    };
  }

  function createXoshiro256pp(seedLo = 1, seedHi = 0) {
    const mask = (1n << 64n) - 1n;
    function asUint64(value) {
      if (typeof value === 'bigint') return BigInt.asUintN(64, value);
      if (typeof value === 'string') return BigInt.asUintN(64, BigInt(value));
      const number = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
      return BigInt.asUintN(64, BigInt(number));
    }
    function rotl(x, k) {
      const shift = BigInt(k);
      return ((x << shift) | (x >> (64n - shift))) & mask;
    }

    let splitmixState = BigInt.asUintN(64, asUint64(seedLo) ^ (asUint64(seedHi) << 32n));
    function splitmix64() {
      splitmixState = BigInt.asUintN(64, splitmixState + 0x9e3779b97f4a7c15n);
      let z = splitmixState;
      z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n);
      z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94d049bb133111ebn);
      return BigInt.asUintN(64, z ^ (z >> 31n));
    }

    let s0 = splitmix64();
    let s1 = splitmix64();
    let s2 = splitmix64();
    let s3 = splitmix64();

    return function nextDouble() {
      const result = BigInt.asUintN(64, rotl(BigInt.asUintN(64, s0 + s3), 23) + s0);
      const t = BigInt.asUintN(64, s1 << 17n);
      s2 = BigInt.asUintN(64, s2 ^ s0);
      s3 = BigInt.asUintN(64, s3 ^ s1);
      s1 = BigInt.asUintN(64, s1 ^ s2);
      s0 = BigInt.asUintN(64, s0 ^ s3);
      s2 = BigInt.asUintN(64, s2 ^ t);
      s3 = rotl(s3, 45);
      return Number(result >> 11n) / 0x20000000000000;
    };
  }

  function arrayToCSV(arr) {
    return arr.map(x => Number.isInteger(x) ? String(x) : String(round6(x))).join(',');
  }

  function summarize(arr) {
    if (!arr.length) return '';
    if (arr.every(v => v === arr[0])) return `${arr.length} values, all = ${round6(arr[0])}`;
    if (arr.length <= 6) return arr.map(round6).join(', ');
    const head = arr.slice(0, 3).map(round6).join(', ');
    const tail = arr.slice(-2).map(round6).join(', ');
    return `${head}, ..., ${tail}  (${arr.length} total)`;
  }

  function fail(message) {
    setRunState('error', 'error', message, 'fs-note err');
    throw new Error(message);
  }

  function clearValidation(message) {
    setRunState('ready', 'ready', message || '', message ? 'fs-note ok' : 'fs-note');
  }

  // ---------------------------------------------------------------------------
  // Parameter parsing
  // ---------------------------------------------------------------------------

  function numericEnv() {
    const controls = readControlState();
    return {
      q: controls.q,
      alpha: controls.alpha,
      beta: controls.beta,
      gamma: controls.gamma,
    };
  }

  function looksLikeExpression(str) {
    const s = String(str || '').trim();
    return !!s && /[a-zA-Z]/.test(s) && !s.includes(',');
  }

  function normalizeExpression(expr) {
    let s = String(expr || '').trim();
    if (!s) throw new Error('empty expression');
    if (!/^[0-9eE+\-*/().\s^a-zA-Z_]+$/.test(s)) {
      throw new Error('unsupported character in expression');
    }
    const ids = s.match(/[A-Za-z_]\w*/g) || [];
    const allowed = new Set([
      'i','j','k','n','N','M','q','alpha','beta','gamma','a','b','g',
      'sqrt','exp','log','pow','sin','cos','tan','abs','min','max','PI','E'
    ]);
    for (const id of ids) {
      if (!allowed.has(id)) throw new Error(`unknown variable/function ${id}`);
    }
    // In this UI, ^ means exponentiation, as in the previous parameter entry.
    s = s.replace(/\^/g, '**');
    return s;
  }

  function compileExpression(expr) {
    const js = normalizeExpression(expr);
    // The identifier list is deliberately explicit; no global scope access.
    return new Function(
      'i','j','k','n','N','M','q','alpha','beta','gamma','a','b','g',
      'sqrt','exp','log','pow','sin','cos','tan','abs','min','max','PI','E',
      `return (${js});`
    );
  }

  function evalExpression(fn, idx) {
    const env = numericEnv();
    const v = fn(
      idx, idx, idx, idx, N, M,
      env.q, env.alpha, env.beta, env.gamma, env.alpha, env.beta, env.gamma,
      Math.sqrt, Math.exp, Math.log, Math.pow, Math.sin, Math.cos, Math.tan,
      Math.abs, Math.min, Math.max, Math.PI, Math.E
    );
    if (!Number.isFinite(v)) throw new Error('expression produced a non-finite value');
    return Number(v);
  }

  function repeatCountFromToken(token) {
    const t = String(token || '').trim();
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    if (t === 'N') return N;
    if (t === 'M') return M;
    if (t === 'columnCap' || t === 'cap' || t === 'K') return currentColumnCap();
    throw new Error(`unsupported repeat count ${t}`);
  }

  function expandRepeatedPatterns(str) {
    return String(str).replace(/\(([^)]+)\)\^(\d+|N|M|columnCap|cap|K)\b/g, (m, pattern, count) => {
      const n = repeatCountFromToken(count);
      const vals = pattern.split(',').map(v => v.trim()).filter(Boolean);
      const out = [];
      for (let i = 0; i < n; i++) out.push(...vals);
      return out.join(',');
    });
  }

  function parseFiniteList(str) {
    const s = expandRepeatedPatterns(str);
    const out = [];
    const numberPattern = '[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?';
    const repeatPattern = new RegExp(`^(${numberPattern})\\^(\\d+|N|M|columnCap|cap|K)$`);
    for (const token of s.split(',')) {
      const tr = token.trim();
      if (!tr) continue;
      const rep = tr.match(repeatPattern);
      if (rep) {
        const value = Number(rep[1]);
        const count = repeatCountFromToken(rep[2]);
        if (!Number.isFinite(value) || count <= 0) throw new Error(`bad repeat token ${tr}`);
        for (let i = 0; i < count; i++) out.push(value);
        continue;
      }
      const value = Number(tr);
      if (!Number.isFinite(value)) throw new Error(`bad numeric token ${tr}`);
      out.push(value);
    }
    return out;
  }

  function finiteListTooShortMessage(label, got, needed) {
    const repeatHint = label === 'x'
      ? 'Use a repeat like 1^N or an expression such as alpha*q^i.'
      : label === 'w'
        ? 'Use a repeat like 1^M or an expression such as gamma*q^i.'
        : 'Use a repeat like 0^columnCap, a long enough list, or an expression such as beta*q^i.';
    return `${label} finite list has length ${got}, but needs at least ${needed}. ${repeatHint}`;
  }

  function parseArrayInput(input, len, label) {
    const str = String(input || '').trim();
    if (!str) throw new Error(`${label} is empty`);
    let arr;
    let finiteListError = null;
    try {
      arr = parseFiniteList(str);
    } catch (error) {
      finiteListError = error;
    }
    if (arr && arr.length > 0) {
      if (arr.length < len) throw new Error(finiteListTooShortMessage(label, arr.length, len));
    } else if (looksLikeExpression(str)) {
      const fn = compileExpression(str);
      arr = [];
      for (let i = 1; i <= len; i++) arr.push(evalExpression(fn, i));
    } else {
      throw finiteListError || new Error(`${label} is not a valid list or expression`);
    }
    if (arr.length < len) {
      throw new Error(`${label} has length ${arr.length}, but needs at least ${len}`);
    }
    arr = arr.slice(0, len);
    for (const v of arr) {
      if (!Number.isFinite(v)) throw new Error(`${label} contains a non-finite value`);
    }
    return arr;
  }

  function parseYInput(input) {
    const str = String(input || '').trim();
    if (!str) throw new Error('y is empty');
    let arr;
    let finiteListError = null;
    try {
      arr = parseFiniteList(str);
    } catch (error) {
      finiteListError = error;
    }
    if (arr && arr.length > 0) {
      for (const v of arr) {
        if (!Number.isFinite(v)) throw new Error('y contains a non-finite value');
      }
      return {
        kind: 'array',
        preview: arr.slice(0, Math.min(arr.length, 120)),
        value(k) {
          if (k <= 0) return 0;
          return k <= arr.length ? arr[k - 1] : undefined;
        },
        length: arr.length,
      };
    }
    if (looksLikeExpression(str)) {
      const fn = compileExpression(str);
      const previewLen = Math.max(20, Math.min(200, 4 * (N + M) + 20));
      const preview = [];
      for (let i = 1; i <= previewLen; i++) preview.push(evalExpression(fn, i));
      return {
        kind: 'expr',
        preview,
        value(k) {
          if (k <= 0) return 0;
          return evalExpression(fn, k);
        },
      };
    }
    throw finiteListError || new Error('y is not a valid list or expression');
  }

  function yVal(k) {
    if (!ySpec) return 0;
    return ySpec.value(k);
  }

  function validateParameters() {
    for (let i = 0; i < xArr.length; i++) {
      for (let j = 0; j < wArr.length; j++) {
        if (!(wArr[j] > xArr[i])) {
          fail(`Parameter check failed: need w${sub(j + 1)} > x${sub(i + 1)}, but ${round6(wArr[j])} ≤ ${round6(xArr[i])}.`);
        }
      }
    }
    clearValidation(`OK: all ${N * M} inequalities w${sub(1)}…w${sub(M)} > x${sub(1)}…x${sub(N)} hold.`);
  }

  function applyParamsFromInputs() {
    setRunState('validating', 'validating', 'Checking parameters...', 'fs-note ok');
    try {
      const controls = readControlState();
      N = controls.N;
      M = controls.M;
      if ($('fs-N')) $('fs-N').value = String(N);
      if ($('fs-M')) $('fs-M').value = String(M);
      xArr = parseArrayInput($('fs-x').value, N, 'x');
      wArr = parseArrayInput($('fs-w').value, M, 'w');
      ySpec = parseYInput($('fs-y').value);
      if (ySpec.kind === 'array' && ySpec.length < controls.columnCap) {
        throw new Error(finiteListTooShortMessage('y', ySpec.length, controls.columnCap));
      }

      $('fs-x-note').textContent = `x: [${summarize(xArr)}]`;
      $('fs-w-note').textContent = `w: [${summarize(wArr)}]`;
      const ySummary = summarize(ySpec.preview || []);
      $('fs-y-note').textContent = ySpec.kind === 'expr'
        ? `y: expression, first values [${ySummary}]`
        : `y: [${ySummary}]${ySpec.length ? `  (length ${ySpec.length})` : ''}`;
      validateParameters();
      return true;
    } catch (e) {
      setRunState('error', 'error', e.message, 'fs-note err');
      return false;
    }
  }

  function applyQSpecToInputs() {
    $('fs-x').value = 'alpha*q^i';
    $('fs-w').value = 'gamma*q^i';
    $('fs-y').value = 'beta*q^i';
    applyParamsFromInputs();
  }

  function applySafeConstantsToInputs() {
    $('fs-x').value = '0.8^N';
    $('fs-w').value = '1^M';
    $('fs-y').value = '0^columnCap';
    applyParamsFromInputs();
  }

  // ---------------------------------------------------------------------------
  // Vertex weights and local bijectivisation
  // ---------------------------------------------------------------------------

  function WWeight(x, y, i1, j1, i2, j2) {
    if (i1 + j1 !== i2 + j2) return 0;
    if (i1 === 1 && j1 === 1 && i2 === 1 && j2 === 1) return 0;
    if (i1 === 0 && j1 === 0 && i2 === 0 && j2 === 0) return x + y;
    return 1;
  }

  function WCheckWeight(w, y, i1, j1, i2, j2) {
    if (i1 + j1 !== i2 + j2) return 0;
    if (i1 === 1 && j1 === 1 && i2 === 1 && j2 === 1) return 0;
    if (i1 === 0 && j1 === 0 && i2 === 0 && j2 === 0) return 1;
    return 1 / (w + y);
  }

  function RWeight(w, x, i1, i2, j1, j2) {
    if (i1 + i2 !== j1 + j2) return 0;
    if (i1 === 0 && i2 === 0 && j1 === 0 && j2 === 0) return 1 / (w - x);
    if (i1 === 1 && i2 === 1 && j1 === 1 && j2 === 1) return 1 / (w - x);
    if (i1 === 1 && i2 === 0 && j1 === 1 && j2 === 0) return 1;
    if (i1 === 0 && i2 === 1 && j1 === 0 && j2 === 1) return 0;
    if (i1 === 0 && i2 === 1 && j1 === 1 && j2 === 0) return 1 / (w - x);
    if (i1 === 1 && i2 === 0 && j1 === 0 && j2 === 1) return 1 / (w - x);
    return 0;
  }

  function tupleEq(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  function positiveTerm(value, context) {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite local weight at ${context}. Check denominators w-x and w+y.`);
    }
    if (value < 0) {
      throw new Error(`Negative local weight at ${context}. Need w>x and local positivity x+y_k,w+y_k>0.`);
    }
    // The vertex-weight functions return exact zero for forbidden states, so no
    // epsilon cutoff is needed here; tiny positive probabilities are meaningful.
    return value > 0 ? value : 0;
  }

  function localForward(x, w, y, boundary, kTriple) {
    const [i1, i2, i3, j1, j2, j3] = boundary;
    if (!(w > x)) throw new Error(`Need w>x locally; got w=${w}, x=${x}`);
    if (!(w + y > 0) || !(x + y >= 0)) {
      throw new Error(`Local positivity failed at y=${round6(y)}: need w+y>0 and x+y≥0.`);
    }

    const A = [];
    const B = [];
    for (let k1 = 0; k1 <= 1; k1++) {
      for (let k2 = 0; k2 <= 1; k2++) {
        for (let k3 = 0; k3 <= 1; k3++) {
          const leftWeight = positiveTerm(
            WCheckWeight(w, y, k3, k2, j3, j2) *
            WWeight(x, y, i3, k1, k3, j1) *
            RWeight(w, x, i1, i2, k1, k2),
            `A boundary ${boundary.join(',')}`
          );
          if (leftWeight > 0) A.push({ triple: [k1, k2, k3], weight: leftWeight });

          const rightWeight = positiveTerm(
            WCheckWeight(w, y, i3, i2, k3, k2) *
            WWeight(x, y, k3, i1, j3, k1) *
            RWeight(w, x, k1, k2, j1, j2),
            `B boundary ${boundary.join(',')}`
          );
          if (rightWeight > 0) B.push({ triple: [k1, k2, k3], weight: rightWeight });
        }
      }
    }

    const input = A.find(a => tupleEq(a.triple, kTriple));
    if (!input) {
      throw new Error(`Internal YB state ${kTriple.join(',')} is not admissible for boundary ${boundary.join(',')}.`);
    }
    if (B.length === 0) {
      throw new Error(`No admissible output YB states for boundary ${boundary.join(',')}.`);
    }
    if (B.length === 1) {
      return { triple: B[0].triple, random: false };
    }

    // In this degeneration this is exactly the Bernoulli split
    // (x+y)/(w+y), (w-x)/(w+y), but using the right-side local weights keeps
    // the implementation tied directly to the bijectivised YBE table.
    const total = B.reduce((s, b) => s + b.weight, 0);
    if (!(total > 0) || !Number.isFinite(total)) {
      throw new Error(`Bad Bernoulli normalization for boundary ${boundary.join(',')}.`);
    }
    let u = randomUnit() * total;
    for (const b of B) {
      u -= b.weight;
      if (u <= 0) return { triple: b.triple, random: true };
    }
    return { triple: B[B.length - 1].triple, random: true };
  }

  // ---------------------------------------------------------------------------
  // Reverse-Cauchy row-swap sampler
  // ---------------------------------------------------------------------------

  function rangeSet(count) {
    const s = new Set();
    for (let i = 1; i <= count; i++) s.add(i);
    return s;
  }

  function occ(set, column) {
    return set.has(column) ? 1 : 0;
  }

  function maxSet(...sets) {
    let m = 0;
    for (const s of sets) {
      for (const v of s) if (v > m) m = v;
    }
    return m;
  }

  function currentColumnCap() {
    if (columnCapOverride != null) {
      return Math.max(1, Math.min(1000000, Math.trunc(columnCapOverride)));
    }
    return clampInt($('fs-max-cols')?.value || '20000', 100, 1000000);
  }

  function setSamplingUi(active) {
    samplingActive = active;
    for (const id of LOCKED_DURING_SAMPLE_IDS) {
      const el = $(id);
      if (el) el.disabled = active;
    }
    const cancelBtn = $('fs-cancel-btn');
    if (cancelBtn) cancelBtn.disabled = !active;
    const resetBtn = $('fs-reset-btn');
    if (resetBtn) resetBtn.disabled = false;
  }

  function terminateActiveWorker(message, options = {}) {
    const hadWorker = !!activeWorker;
    activeRequestId += 1;
    if (activeWorker) {
      activeWorker.terminate();
      activeWorker = null;
    }
    setSamplingUi(false);
    samplingActive = false;
    if (!options.silent && message) {
      setRunState(options.state || 'canceled', options.phase || 'canceled', message, options.className || 'fs-note warn');
    }
    return hadWorker;
  }

  function createSeedPair() {
    const seeds = new Uint32Array(2);
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      window.crypto.getRandomValues(seeds);
    } else {
      seeds[0] = Math.floor(Math.random() * 0x100000000) >>> 0;
      seeds[1] = Math.floor(Math.random() * 0x100000000) >>> 0;
    }
    if (seeds[0] === 0 && seeds[1] === 0) seeds[0] = 1;
    return seeds;
  }

  function arrayMinMax(values) {
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return { min, max };
  }

  function buildYArrayForWasm(columnCap) {
    if (ySpec?.kind === 'array' && ySpec.length < columnCap) {
      throw new Error(finiteListTooShortMessage('y', ySpec.length, columnCap));
    }
    const values = new Float64Array(columnCap);
    let minY = Infinity;
    let maxY = -Infinity;
    for (let k = 1; k <= columnCap; k++) {
      const v = yVal(k);
      if (!Number.isFinite(v)) throw new Error(`y_${k} is non-finite`);
      values[k - 1] = v;
      if (v < minY) minY = v;
      if (v > maxY) maxY = v;
    }
    const xBounds = arrayMinMax(xArr);
    const wBounds = arrayMinMax(wArr);
    if (!(wBounds.min + minY > 0)) {
      throw new Error(`Local positivity failed over the first ${columnCap} columns: need every w_j + y_k > 0, but min(w)+min(y)=${round6(wBounds.min + minY)}.`);
    }
    if (!(xBounds.min + minY >= 0)) {
      throw new Error(`Local positivity failed over the first ${columnCap} columns: need every x_i + y_k >= 0, but min(x)+min(y)=${round6(xBounds.min + minY)}.`);
    }
    values.summary = { minY, maxY };
    return values;
  }

  function buildFrozenRhs() {
    rows = [];
    levels = [];
    // Bottom-to-top order in the frozen RHS picture: x_N,...,x_1,w_1,...,w_M.
    for (let i = N; i >= 1; i--) rows.push({ type: 'W', idx: i });
    for (let j = 1; j <= M; j++) rows.push({ type: 'C', idx: j });

    for (let r = 0; r <= N; r++) levels[r] = rangeSet(N - r);
    for (let r = N + 1; r <= N + M; r++) levels[r] = new Set();
  }

  function validateHorizontal(value, label, column) {
    if (value !== 0 && value !== 1) {
      throw new Error(`${label} horizontal occupancy ${value} at column ${column}; row configuration is not admissible.`);
    }
  }

  function swapAdjacentRows(pos) {
    const lower = rows[pos];
    const upper = rows[pos + 1];
    if (!lower || !upper || lower.type !== 'W' || upper.type !== 'C') {
      throw new Error('swapAdjacentRows called on a non-(W below C) pair');
    }

    const x = xArr[lower.idx - 1];
    const w = wArr[upper.idx - 1];
    const bottom = levels[pos];
    const mid = levels[pos + 1];
    const top = levels[pos + 2];
    const newMid = new Set();
    const maxInitialColumn = maxSet(bottom, mid, top);
    const columnCap = currentColumnCap();

    let hW = 0;      // lower W-row horizontal state in the unprocessed A side
    let hC = 0;      // upper check-row horizontal state in the unprocessed A side
    let carrier1 = 0; // B-side upper/W horizontal state just left of the moving R
    let carrier2 = 0; // B-side lower/check horizontal state just left of the moving R

    for (let column = 1; column <= columnCap; column++) {
      const b = occ(bottom, column);
      const k3 = occ(mid, column);
      const t = occ(top, column);
      const k1 = hW;
      const k2 = hC;
      const j1 = hW + b - k3;
      const j2 = hC + k3 - t;
      const j3 = t;
      validateHorizontal(j1, 'W-row', column);
      validateHorizontal(j2, 'check-row', column);

      const y = yVal(column);
      const result = localForward(x, w, y, [carrier1, carrier2, b, j1, j2, j3], [k1, k2, k3]);
      const [l1, l2, l3] = result.triple;
      if (l3 === 1) newMid.add(column);
      carrier1 = l1;
      carrier2 = l2;
      hW = j1;
      hC = j2;

      stats.localMoves += 1;
      if (result.random) stats.randomChoices += 1;

      // Past the old support, the A-side rows are in their tails.  Once the
      // carrier is the final (1,0) R-state, all further columns are forced and
      // add no vertical particles, so the infinite scan can stop.
      if (column >= maxInitialColumn && carrier1 === 1 && carrier2 === 0 && hW === 1 && hC === 0) {
        levels[pos + 1] = newMid;
        rows[pos] = upper;
        rows[pos + 1] = lower;
        stats.rowSwaps += 1;
        return;
      }
    }

    throw new Error(`Column cap ${columnCap} reached while swapping x${lower.idx} with w${upper.idx}. Increase the cap or choose parameters with a lighter tail.`);
  }

  function sampleRows() {
    buildFrozenRhs();
    // Bubble x_1, then x_2, ... upward through all w-rows.
    for (let xIdx = 1; xIdx <= N; xIdx++) {
      let pos = rows.findIndex(r => r.type === 'W' && r.idx === xIdx);
      if (pos < 0) throw new Error(`Internal error: x${xIdx} row not found`);
      while (pos + 1 < rows.length && rows[pos + 1].type === 'C') {
        swapAdjacentRows(pos);
        pos += 1;
      }
    }
  }

  function partitionFromPositions(set, length) {
    const asc = Array.from(set).sort((a, b) => a - b);
    if (asc.length !== length) {
      throw new Error(`Expected ${length} particles at a level, found ${asc.length}.`);
    }
    const desc = asc.slice().reverse();
    const part = [];
    for (let i = 0; i < length; i++) {
      const v = desc[i] - (length - i);
      if (v < 0) throw new Error('Sampled a negative signature part; internal inconsistency.');
      if (i > 0 && part[i - 1] < v) throw new Error('Sampled signature is not weakly decreasing.');
      part.push(v);
    }
    return part;
  }

  function rebuildMuLamFromLevels(options = {}) {
    const updateDom = options.updateDom !== false;
    // Final bottom-to-top order should be w_1,...,w_M,x_N,...,x_1.
    for (let j = 0; j < M; j++) {
      if (!rows[j] || rows[j].type !== 'C') throw new Error('Final row order check failed in w-block.');
    }
    for (let s = 0; s < N; s++) {
      if (!rows[M + s] || rows[M + s].type !== 'W') throw new Error('Final row order check failed in x-block.');
    }

    mu = [];
    for (let j = 0; j <= M; j++) {
      mu[j] = partitionFromPositions(levels[j], N);
    }

    lam = [[]];
    for (let length = 1; length <= N; length++) lam[length] = [];
    for (let length = N; length >= 0; length--) {
      const levelIndex = M + (N - length);
      lam[length] = partitionFromPositions(levels[levelIndex], length);
    }

    const lambda = mu[M] || [];
    stats.size = lambda.reduce((s, v) => s + v, 0);
    stats.maxPos = maxPositionSeen();
    if (updateDom) $('fs-lambda').textContent = lambda.length ? `(${lambda.join(', ')})` : '∅';
  }

  function sortedLevelArray(set) {
    return Array.from(set || []).sort((a, b) => a - b);
  }

  function snapshotReferenceResult() {
    return {
      N,
      M,
      mu: mu.map(row => row.slice()),
      lam: lam.map(row => row.slice()),
      lambda: (mu[M] || []).slice(),
      stats: { ...stats },
      rows: rows.map(row => ({ ...row })),
      levels: levels.map(sortedLevelArray),
    };
  }

  function arrayYSpec(values) {
    const arr = values.map(Number);
    for (const v of arr) {
      if (!Number.isFinite(v)) throw new Error('y contains a non-finite value');
    }
    return {
      kind: 'array',
      preview: arr.slice(0, Math.min(arr.length, 120)),
      value(k) {
        if (k <= 0) return 0;
        return k <= arr.length ? arr[k - 1] : undefined;
      },
      length: arr.length,
    };
  }

  function referenceArrayInput(input, len, label) {
    let arr;
    if (Array.isArray(input)) {
      arr = input.map(Number);
    } else if (typeof input === 'string') {
      arr = parseArrayInput(input, len, label);
    } else if (label === 'x' && xArr.length >= len) {
      arr = xArr.slice(0, len);
    } else if (label === 'w' && wArr.length >= len) {
      arr = wArr.slice(0, len);
    } else {
      throw new Error(`reference ${label} values are required`);
    }
    if (arr.length < len) throw new Error(`${label} has length ${arr.length}, but needs at least ${len}`);
    arr = arr.slice(0, len);
    for (const v of arr) {
      if (!Number.isFinite(v)) throw new Error(`${label} contains a non-finite value`);
    }
    return arr;
  }

  function referenceYInput(input) {
    if (Array.isArray(input)) return arrayYSpec(input);
    if (typeof input === 'string') return parseYInput(input);
    if (ySpec) return ySpec;
    throw new Error('reference y values are required');
  }

  function validateReferenceParameters() {
    for (let i = 0; i < xArr.length; i++) {
      for (let j = 0; j < wArr.length; j++) {
        if (!(wArr[j] > xArr[i])) {
          throw new Error(`Need w_${j + 1} > x_${i + 1}; got ${wArr[j]} <= ${xArr[i]}`);
        }
      }
    }
  }

  function runReferenceSample(options = {}) {
    const saved = {
      N,
      M,
      xArr,
      wArr,
      ySpec,
      mu,
      lam,
      rows,
      levels,
      stats,
      randomUnit,
      columnCapOverride,
    };

    try {
      N = Math.max(1, Math.min(120, Math.trunc(Number(options.N ?? N))));
      M = Math.max(1, Math.min(120, Math.trunc(Number(options.M ?? M))));
      xArr = referenceArrayInput(options.x, N, 'x');
      wArr = referenceArrayInput(options.w, M, 'w');
      ySpec = referenceYInput(options.y);
      validateReferenceParameters();

      const seedLo = options.seedLo ?? options.seed ?? 1;
      const seedHi = options.seedHi ?? 0;
      randomUnit = createXoshiro256pp(seedLo, seedHi);
      columnCapOverride = options.columnCap ?? 20000;
      buildYArrayForWasm(columnCapOverride);
      stats = {
        samples: 0,
        size: 0,
        maxPos: 0,
        rowSwaps: 0,
        localMoves: 0,
        randomChoices: 0,
        elapsedMs: 0,
      };

      const t0 = performance.now();
      sampleRows();
      rebuildMuLamFromLevels({ updateDom: false });
      stats.samples = 1;
      stats.elapsedMs = performance.now() - t0;
      return snapshotReferenceResult();
    } finally {
      N = saved.N;
      M = saved.M;
      xArr = saved.xArr;
      wArr = saved.wArr;
      ySpec = saved.ySpec;
      mu = saved.mu;
      lam = saved.lam;
      rows = saved.rows;
      levels = saved.levels;
      stats = saved.stats;
      randomUnit = saved.randomUnit;
      columnCapOverride = saved.columnCapOverride;
    }
  }

  function resetFrozen() {
    buildFrozenRhs();
    // Frozen RHS is not in the final display order; display the zero LHS pattern
    // as the harmless reset view.
    mu = [];
    for (let j = 0; j <= M; j++) mu[j] = Array(N).fill(0);
    lam = [[]];
    for (let j = 1; j <= N; j++) lam[j] = Array(j).fill(0);
    stats.size = 0;
    stats.maxPos = N;
    stats.rowSwaps = 0;
    stats.localMoves = 0;
    stats.randomChoices = 0;
    stats.wasm = false;
    stats.wallElapsedMs = 0;
    stats.elapsedMs = 0;
    $('fs-lambda').textContent = '∅';
    refreshStats();
    invalidateRender();
  }

  function sampleOnceJsFallback() {
    if (!applyParamsFromInputs()) return false;
    const t0 = performance.now();
    stats.rowSwaps = 0;
    stats.localMoves = 0;
    stats.randomChoices = 0;
    stats.wasm = false;
    stats.wallElapsedMs = 0;
    try {
      startElapsedTimer(t0);
      buildYArrayForWasm(currentColumnCap());
      setRunState('sampling', 'sampling', 'Sampling with the small-system JS reference fallback...', 'fs-note warn');
      sampleRows();
      setRunState('rendering', 'rendering', 'Normalizing JS reference result and redrawing...', 'fs-note ok');
      rebuildMuLamFromLevels();
      stats.samples += 1;
      stats.elapsedMs = performance.now() - t0;
      stopElapsedTimer(stats.elapsedMs);
      if (stats.size === 0) {
        setRunState('done', 'done', 'Sample returned λ=0. This is a valid sample, but if it happens repeatedly the specialization is too frozen; increase x/w while keeping every w_j > x_i.', 'fs-note warn');
      } else {
        setRunState('done', 'done', `Sampled |λ|=${stats.size}; all ${N * M} inequalities w_j > x_i hold.`, 'fs-note ok');
      }
      refreshStats();
      invalidateRender();
      return true;
    } catch (e) {
      stopElapsedTimer(performance.now() - t0);
      setRunState('error', 'error', e.message, 'fs-note err');
      console.error(e);
      return false;
    }
  }

  function normalizeWorkerResult(result, wallElapsedMs) {
    if (!result || !Array.isArray(result.mu) || !Array.isArray(result.lam)) {
      throw new Error('Worker returned malformed sampler data.');
    }
    const previousSamples = stats.samples || 0;
    N = result.N;
    M = result.M;
    mu = result.mu;
    lam = result.lam;
    rows = Array.isArray(result.rows) ? result.rows : [];
    levels = Array.isArray(result.levels) ? result.levels : [];
    stats = {
      samples: previousSamples + 1,
      size: result.stats?.size || 0,
      maxPos: result.stats?.maxPos || 0,
      rowSwaps: result.stats?.rowSwaps || 0,
      localMoves: result.stats?.localMoves || 0,
      randomChoices: result.stats?.randomChoices || 0,
      elapsedMs: Number.isFinite(result.stats?.elapsedMs) ? result.stats.elapsedMs : wallElapsedMs,
      wallElapsedMs,
      wasm: true,
    };
    const lambda = Array.isArray(result.lambda) ? result.lambda : (mu[M] || []);
    $('fs-lambda').textContent = lambda.length ? `(${lambda.join(', ')})` : '∅';
  }

  function workerFallbackAllowed() {
    return N * M <= 64 && currentColumnCap() <= 5000;
  }

  function buildWorkerRequest(options = {}) {
    const columnCap = options.columnCap == null
      ? currentColumnCap()
      : Math.max(1, Math.min(1000000, Math.trunc(Number(options.columnCap))));
    const yValues = buildYArrayForWasm(columnCap);
    const seeds = createSeedPair();
    if (options.seedLo != null) seeds[0] = Number(options.seedLo) >>> 0;
    if (options.seedHi != null) seeds[1] = Number(options.seedHi) >>> 0;
    const requestId = activeRequestId + 1;
    activeRequestId = requestId;
    // Fresh typed arrays are transferred so the UI-owned xArr/wArr arrays stay usable.
    // The worker owns these buffers after postMessage; xArr/wArr remain normal JS arrays.
    const xValues = new Float64Array(xArr);
    const wValues = new Float64Array(wArr);
    return {
      requestId,
      columnCap,
      payload: {
        type: 'sample',
        requestId,
        N,
        M,
        xBuffer: xValues.buffer,
        wBuffer: wValues.buffer,
        yBuffer: yValues.buffer,
        columnCap,
        seedLo: seeds[0],
        seedHi: seeds[1],
      },
      transfer: [xValues.buffer, wValues.buffer, yValues.buffer],
    };
  }

  function sampleOnceWithWorker(options = {}) {
    if (!applyParamsFromInputs()) return Promise.resolve(false);
    if (typeof Worker !== 'function') {
      if (workerFallbackAllowed()) {
        setRunState('sampling', 'sampling', 'Web Workers are unavailable; using the small-system JS reference fallback.', 'fs-note warn');
        return Promise.resolve(sampleOnceJsFallback());
      }
      setRunState('error', 'error', 'Web Workers are unavailable, so large exact samples cannot run without freezing the page.', 'fs-note err');
      return Promise.resolve(false);
    }

    terminateActiveWorker('', { silent: true });
    samplingCanceled = false;

    let request;
    try {
      request = buildWorkerRequest(options);
    } catch (error) {
      setRunState('error', 'error', error.message, 'fs-note err');
      return Promise.resolve(false);
    }

    let worker;
    try {
      worker = new Worker('/js/factorial-ybe-worker.js?v=20260605-wasm');
    } catch (error) {
      if (workerFallbackAllowed()) {
        setRunState('sampling', 'sampling', `Worker could not start (${error.message}); using the small-system JS reference fallback.`, 'fs-note warn');
        return Promise.resolve(sampleOnceJsFallback());
      }
      setRunState('error', 'error', `Worker could not start: ${error.message}`, 'fs-note err');
      return Promise.resolve(false);
    }
    activeWorker = worker;
    setSamplingUi(true);
    const started = performance.now();
    startElapsedTimer(started);
    setRunState('sampling', 'sampling', `Sampling in WASM worker for N=${N}, M=${M}, cap=${request.columnCap}...`, 'fs-note ok');

    return new Promise((resolve) => {
      let settled = false;
      function finish(ok, finalElapsedMs = performance.now() - started) {
        if (settled) return;
        settled = true;
        if (activeWorker === worker) activeWorker = null;
        worker.terminate();
        setSamplingUi(false);
        stopElapsedTimer(finalElapsedMs);
        resolve(ok);
      }

      worker.onmessage = (event) => {
        const message = event.data || {};
        if (message.requestId !== request.requestId || request.requestId !== activeRequestId) return;
        if (message.type === 'result') {
          try {
            const wallElapsedMs = performance.now() - started;
            setRunState('rendering', 'rendering', 'Normalizing worker result and redrawing...', 'fs-note ok');
            normalizeWorkerResult(message.result, wallElapsedMs);
            if (stats.size === 0) {
              setRunState('done', 'done', 'Sample returned λ=0. This is valid; increase x/w for more activity while keeping every w_j > x_i.', 'fs-note warn');
            } else {
              setRunState('done', 'done', `Sampled with worker/WASM: |λ|=${stats.size}, wall time ${(wallElapsedMs / 1000).toFixed(2)}s.`, 'fs-note ok');
            }
            refreshStats();
            invalidateRender();
            finish(true, wallElapsedMs);
          } catch (error) {
            setRunState('error', 'error', error.message, 'fs-note err');
            console.error(error);
            finish(false);
          }
        } else if (message.type === 'error') {
          setRunState('error', 'error', message.error || 'Worker sampler failed.', 'fs-note err');
          finish(false);
        }
      };

      worker.onerror = (event) => {
        if (request.requestId !== activeRequestId) return;
        const message = event.message || 'Worker sampler failed to load.';
        setRunState('error', 'error', message, 'fs-note err');
        finish(false);
      };

      worker.postMessage(request.payload, request.transfer);
    });
  }

  function sampleOnce() {
    return sampleOnceWithWorker();
  }

  async function sampleMany(count) {
    let ok = true;
    for (let i = 0; i < count; i++) {
      if (samplingCanceled) break;
      ok = await sampleOnce();
      if (!ok) break;
    }
    return ok;
  }

  const BENCHMARK_CONTROL_IDS = [
    'fs-N', 'fs-M', 'fs-q', 'fs-alpha', 'fs-beta', 'fs-gamma',
    'fs-x', 'fs-w', 'fs-y', 'fs-max-cols',
  ];

  function defaultBenchmarkCases(options = {}) {
    return [
      {
        name: 'default',
        N: 6,
        M: 6,
        q: 0.95,
        alpha: 0.55,
        beta: 0,
        gamma: 1,
        x: 'alpha*q^i',
        w: 'gamma*q^i',
        y: 'beta*q^i',
        columnCap: options.defaultColumnCap || 20000,
      },
      {
        name: 'old fan epsilon-safe',
        N: 12,
        M: 50,
        q: 0.2,
        alpha: 1,
        beta: 1,
        gamma: 1,
        x: '1^N',
        w: '1.001*q^(-50+i)',
        y: 'q^(i-50)',
        columnCap: options.oldFanColumnCap || 20000,
        note: 'The original screenshot had w_50=x=1; this benchmark uses 1.001*w to keep strict w_j > x_i.',
      },
      {
        name: 'large stress',
        N: options.stressN || 80,
        M: options.stressM || 120,
        q: 0.9,
        alpha: 0.3,
        beta: 0,
        gamma: 1,
        x: '0.3^N',
        w: '1^M',
        y: '0^columnCap',
        columnCap: options.stressColumnCap || 20000,
      },
    ];
  }

  function snapshotUiAndSamplerState() {
    const controls = {};
    for (const id of BENCHMARK_CONTROL_IDS) {
      const el = $(id);
      if (!el) continue;
      controls[id] = { value: el.value };
    }
    return {
      controls,
      N,
      M,
      xArr: xArr.slice(),
      wArr: wArr.slice(),
      ySpec,
      mu: mu.map(row => row.slice()),
      lam: lam.map(row => row.slice()),
      rows: rows.map(row => ({ ...row })),
      levels: levels.map(level => level instanceof Set ? new Set(level) : Array.isArray(level) ? level.slice() : level),
      stats: { ...stats },
      panX,
      panY,
      zoom,
      viewInitialized,
    };
  }

  function restoreUiAndSamplerState(saved) {
    terminateActiveWorker('', { silent: true });
    for (const [id, value] of Object.entries(saved.controls || {})) {
      const el = $(id);
      if (el) el.value = value.value;
    }
    N = saved.N;
    M = saved.M;
    xArr = saved.xArr.slice();
    wArr = saved.wArr.slice();
    ySpec = saved.ySpec;
    mu = saved.mu.map(row => row.slice());
    lam = saved.lam.map(row => row.slice());
    rows = saved.rows.map(row => ({ ...row }));
    levels = saved.levels.map(level => level instanceof Set ? new Set(level) : Array.isArray(level) ? level.slice() : level);
    stats = { ...saved.stats };
    panX = saved.panX;
    panY = saved.panY;
    zoom = saved.zoom;
    viewInitialized = saved.viewInitialized;
    setSamplingUi(false);
    refreshStats();
    const lambda = mu[M] || [];
    const lambdaEl = $('fs-lambda');
    if (lambdaEl) lambdaEl.textContent = lambda.length ? `(${lambda.join(', ')})` : '∅';
    applyParamsFromInputs();
    stats = { ...saved.stats };
    setRunState('ready', 'ready', 'Benchmark complete; controls restored.', 'fs-note ok');
    invalidateRender();
  }

  function applyBenchmarkControls(testCase) {
    const assignments = {
      'fs-N': testCase.N,
      'fs-M': testCase.M,
      'fs-q': testCase.q,
      'fs-alpha': testCase.alpha,
      'fs-beta': testCase.beta,
      'fs-gamma': testCase.gamma,
      'fs-x': testCase.x,
      'fs-w': testCase.w,
      'fs-y': testCase.y,
      'fs-max-cols': testCase.columnCap,
    };
    for (const [id, value] of Object.entries(assignments)) {
      const el = $(id);
      if (el && value != null) el.value = String(value);
    }
    if (!applyParamsFromInputs()) {
      throw new Error($('fs-validation-note')?.textContent || `Benchmark case ${testCase.name} failed validation.`);
    }
  }

  async function runBenchmark(options = {}) {
    const saved = snapshotUiAndSamplerState();
    const cases = Array.isArray(options.cases) ? options.cases : defaultBenchmarkCases(options);
    const results = [];
    try {
      terminateActiveWorker('', { silent: true });
      for (const testCase of cases) {
        applyBenchmarkControls(testCase);
        const started = performance.now();
        const ok = await sampleOnceWithWorker({
          columnCap: testCase.columnCap,
          seedLo: testCase.seedLo ?? options.seedLo,
          seedHi: testCase.seedHi ?? options.seedHi,
        });
        const elapsedMs = performance.now() - started;
        const state = snapshotReferenceResult();
        results.push({
          name: testCase.name,
          ok,
          elapsedMs,
          elapsedSeconds: elapsedMs / 1000,
          lambda: state.lambda,
          stats: { ...stats },
          status: $('fs-validation-note')?.textContent || '',
          note: testCase.note || '',
        });
        if (!ok && options.stopOnError) break;
      }
      return { results };
    } finally {
      restoreUiAndSamplerState(saved);
    }
  }

  // ---------------------------------------------------------------------------
  // Stats and drawing
  // ---------------------------------------------------------------------------

  function refreshStats() {
    $('fs-stat-samples').textContent = String(stats.samples);
    $('fs-stat-size').textContent = String(stats.size || 0);
    $('fs-stat-maxp').textContent = String(stats.maxPos || 0);
    $('fs-stat-swaps').textContent = String(stats.rowSwaps || 0);
    $('fs-stat-moves').textContent = String(stats.localMoves || 0);
    $('fs-stat-random').textContent = String(stats.randomChoices || 0);
    $('fs-stat-time').textContent = `${(stats.elapsedMs || 0).toFixed(2)} ms`;
  }

  function isSquareCells() {
    const cb = $('fs-square-cells');
    return !cb || cb.checked;
  }

  function getDesiredCellSize() {
    const slider = $('fs-scale');
    const v = slider ? parseInt(slider.value, 10) : 20;
    return (!Number.isFinite(v) || v <= 0) ? 20 : v;
  }

  function maxPositionSeen() {
    let m = N + 1;
    for (let j = 0; j <= M; j++) {
      const v = mu[j] && mu[j][0];
      if (v != null && v + N > m) m = v + N;
    }
    for (let j = 1; j <= N; j++) {
      const arr = lam[j];
      if (arr && arr.length && arr[0] + j > m) m = arr[0] + j;
    }
    return m;
  }

  function pathPosition(k, lvl) {
    if (lvl <= M) {
      if (!mu[lvl]) return null;
      return mu[lvl][k] + N - k;
    }
    const s = lvl - M;
    const lamLevel = N - s;
    const track = k - s;
    if (track < 0 || track >= lamLevel) return null;
    if (!lam[lamLevel]) return null;
    return lam[lamLevel][track] + lamLevel - track;
  }

  let panX = 0;
  let panY = 0;
  let zoom = 1.0;
  let viewInitialized = false;
  let cachedDrawDims = null;

  function fitViewToContent(maxPos, totalLevels, plotW, plotH) {
    const cssW = canvas.clientWidth || 800;
    const cssH = canvas.clientHeight || 480;
    const padding = 24;
    const targetW = Math.max(50, cssW - padding);
    const targetH = Math.max(50, cssH - padding);
    const z = Math.min(targetW / plotW, targetH / plotH, 1.0);
    zoom = z > 0 ? z : 1.0;
    panX = (cssW - plotW * zoom) / 2 - 38 * zoom;
    panY = (cssH - plotH * zoom) / 2 - 14 * zoom;
    viewInitialized = true;
  }

  function invalidateRender(options = {}) {
    if (options.resetView) viewInitialized = false;
    if (renderScheduled) return;
    renderScheduled = true;
    const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 16));
    schedule(() => {
      renderScheduled = false;
      draw();
    });
  }

  function draw() {
    if (!canvas || !ctx) return;
    const maxPos = Math.max(N + 2, maxPositionSeen() + 2);
    const totalLevels = M + N;
    const ml = 38, mr = 18, mt = 14, mb = 28;

    const userCell = getDesiredCellSize();
    const square = isSquareCells();
    let cellHeight = userCell;
    let cellWidth = userCell;
    if (!square) {
      const cssWForFit = Math.max(400, canvas.clientWidth || 1000);
      if (cellWidth * maxPos + ml + mr > cssWForFit) {
        cellWidth = Math.max(0.5, (cssWForFit - ml - mr) / maxPos);
      }
    }

    const plotW = cellWidth * maxPos;
    const plotH = cellHeight * totalLevels;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 800;
    const cssH = canvas.clientHeight || 480;
    if (canvas.width !== Math.round(cssW * dpr)) canvas.width = Math.round(cssW * dpr);
    if (canvas.height !== Math.round(cssH * dpr)) canvas.height = Math.round(cssH * dpr);

    if (!viewInitialized) fitViewToContent(maxPos, totalLevels, plotW, plotH);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * panX, dpr * panY);

    cachedDrawDims = { ml, mt, plotH, cellWidth, cellHeight, maxPos, totalLevels, panX, panY, zoom };

    const xOf = (col) => ml + col * cellWidth;
    const yOf = (lvl) => mt + plotH - lvl * cellHeight;
    const cellSize = Math.min(cellWidth, cellHeight);

    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(ml, yOf(M), plotW, yOf(0) - yOf(M));
    ctx.fillStyle = '#e9f1ff';
    ctx.fillRect(ml, yOf(totalLevels), plotW, yOf(M) - yOf(totalLevels));

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let lvl = 0; lvl <= totalLevels; lvl++) {
      const y = yOf(lvl);
      ctx.moveTo(ml, y);
      ctx.lineTo(ml + plotW, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#eee';
    ctx.beginPath();
    for (let c = 0; c <= maxPos; c++) {
      const x = xOf(c);
      ctx.moveTo(x, mt);
      ctx.lineTo(x, mt + plotH);
    }
    ctx.stroke();

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(ml, yOf(M));
    ctx.lineTo(ml + plotW, yOf(M));
    ctx.stroke();

    ctx.fillStyle = '#555';
    const labelFont = Math.min(13, Math.max(9, cellSize * 0.55));
    ctx.font = labelFont + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let j = 1; j <= M; j++) {
      const yMid = (yOf(j - 1) + yOf(j)) / 2;
      ctx.fillText('w' + sub(j), ml - 6, yMid);
    }
    for (let s = 1; s <= N; s++) {
      const yMid = (yOf(M + s - 1) + yOf(M + s)) / 2;
      ctx.fillText('x' + sub(N - s + 1), ml - 6, yMid);
    }

    const palette = [
      '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2',
      '#7f7f7f','#bcbd22','#17becf','#aec7e8','#ffbb78','#98df8a','#ff9896',
      '#c5b0d5','#c49c94','#f7b6d2','#c7c7c7','#dbdb8d','#9edae5'
    ];

    for (let k = 0; k < N; k++) {
      const color = palette[k % palette.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.beginPath();
      let prev = null;
      let lastX = 0;
      let lastY = 0;
      const lastLvl = Math.min(M + k, M + N);
      for (let lvl = 0; lvl <= lastLvl; lvl++) {
        const pos = pathPosition(k, lvl);
        if (pos == null) break;
        const x = xOf(pos);
        const y = yOf(lvl);
        if (prev == null) ctx.moveTo(x, y);
        else if (pos !== prev.pos) {
          ctx.lineTo(prev.x, y);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        prev = { x, y, pos };
        lastX = x;
        lastY = y;
      }
      ctx.stroke();

      if (prev) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = color;
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(ml + plotW, lastY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = color;
      for (let lvl = 0; lvl <= lastLvl; lvl++) {
        const pos = pathPosition(k, lvl);
        if (pos == null) break;
        ctx.beginPath();
        ctx.arc(xOf(pos), yOf(lvl), Math.min(3.4, Math.max(1.6, cellSize * 0.14)), 0, 2 * Math.PI);
        ctx.fill();
      }

      if (prev) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(lastX, lastY, Math.min(4.2, Math.max(2.1, cellSize * 0.18)), 0, 2 * Math.PI);
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(lastX, lastY, Math.min(4.2, Math.max(2.1, cellSize * 0.18)), 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  function attachCanvasEvents() {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    canvas.addEventListener('mousedown', (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.classList.add('dragging');
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      canvas.classList.remove('dragging');
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      panX += e.clientX - lastX;
      panY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      draw();
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const oldZoom = zoom;
      const factor = Math.exp(-e.deltaY * 0.001);
      zoom = Math.max(0.05, Math.min(8, zoom * factor));
      panX = mx - (mx - panX) * (zoom / oldZoom);
      panY = my - (my - panY) * (zoom / oldZoom);
      draw();
    }, { passive: false });
    canvas.addEventListener('dblclick', () => {
      viewInitialized = false;
      draw();
    });

    let touchPrev = null;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchPrev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && touchPrev) {
        e.preventDefault();
        const t = e.touches[0];
        panX += t.clientX - touchPrev.x;
        panY += t.clientY - touchPrev.y;
        touchPrev = { x: t.clientX, y: t.clientY };
        draw();
      }
    }, { passive: false });
    canvas.addEventListener('touchend', () => { touchPrev = null; });
  }

  function attachUiEvents() {
    $('fs-apply-q').addEventListener('click', () => {
      terminateActiveWorker('', { silent: true });
      applyQSpecToInputs();
      resetFrozen();
    });
    $('fs-uniform-btn').addEventListener('click', () => {
      terminateActiveWorker('', { silent: true });
      applySafeConstantsToInputs();
      resetFrozen();
    });
    $('fs-resize-btn').addEventListener('click', () => {
      terminateActiveWorker('', { silent: true });
      N = clampInt($('fs-N').value, 1, 120);
      M = clampInt($('fs-M').value, 1, 120);
      $('fs-N').value = String(N);
      $('fs-M').value = String(M);
      applyParamsFromInputs();
      viewInitialized = false;
      resetFrozen();
    });
    $('fs-reset-btn').addEventListener('click', () => {
      terminateActiveWorker('Active sample canceled by reset.', { className: 'fs-note warn' });
      applyParamsFromInputs();
      viewInitialized = false;
      resetFrozen();
    });
    $('fs-sample-btn').addEventListener('click', () => {
      sampleOnce();
    });
    $('fs-multi-sample-btn').addEventListener('click', () => {
      const count = clampInt($('fs-sample-count').value, 1, 1000);
      sampleMany(count);
    });
    const cancelBtn = $('fs-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        samplingCanceled = true;
        terminateActiveWorker('Sampling canceled.', { className: 'fs-note warn' });
      });
    }

    for (const id of ['fs-x', 'fs-w', 'fs-y', 'fs-q', 'fs-alpha', 'fs-beta', 'fs-gamma']) {
      const el = $(id);
      if (el) el.addEventListener('change', () => applyParamsFromInputs());
    }

    const scaleEl = $('fs-scale');
    const scaleValEl = $('fs-scale-val');
    if (scaleEl) {
      const onScaleChange = () => {
        if (scaleValEl) scaleValEl.textContent = scaleEl.value + 'px';
        draw();
      };
      scaleEl.addEventListener('input', onScaleChange);
      scaleEl.addEventListener('change', onScaleChange);
    }
    const fitBtn = $('fs-scale-fit');
    if (fitBtn) {
      fitBtn.addEventListener('click', () => {
        const maxPos = Math.max(N + 2, maxPositionSeen() + 2);
        const totalLevels = M + N;
        const wrap = $('fs-canvas-wrap');
        const cssW = wrap ? wrap.clientWidth : 1000;
        const cssH = wrap ? wrap.clientHeight : 600;
        const ml = 38, mr = 18, mt = 14, mb = 28;
        const fitted = Math.floor(Math.max(3, Math.min(60, (Math.min((cssW - ml - mr) / maxPos, (cssH - mt - mb) / totalLevels) || 20))));
        scaleEl.value = String(fitted);
        if (scaleValEl) scaleValEl.textContent = fitted + 'px';
        viewInitialized = false;
        draw();
      });
    }
    const square = $('fs-square-cells');
    if (square) square.addEventListener('change', draw);
    window.addEventListener('resize', () => {
      viewInitialized = false;
      draw();
    });
  }

  function init() {
    N = clampInt($('fs-N').value, 1, 120);
    M = clampInt($('fs-M').value, 1, 120);
    $('fs-N').value = String(N);
    $('fs-M').value = String(M);
    attachCanvasEvents();
    attachUiEvents();
    applyParamsFromInputs();
    resetFrozen();

    window.factorialExactSamplerSample = sampleOnce;
    window.factorialExactSamplerState = () => ({ N, M, xArr, wArr, mu, lam, stats, rows, levels, runState, activeRequestId });
    window.factorialYBEReferenceSample = runReferenceSample;
    window.factorialYBEWorkerSample = sampleOnceWithWorker;
    window.factorialYBEValidateControls = applyParamsFromInputs;
    window.factorialYBEBenchmark = runBenchmark;
    window.factorialYBECancelSample = () => {
      samplingCanceled = true;
      return terminateActiveWorker('Sampling canceled.', { className: 'fs-note warn' });
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
