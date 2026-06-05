/* Exact sampler for factorial Schur processes via Yang--Baxter bijectivisation.
 * The visible sampler runs the reverse-Cauchy row-swap algorithm in a WASM
 * worker, with this file retaining a seeded JS reference path for small tests.
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
  let activeRunFinisher = null;
  let activeRequestId = 0;
  let samplingActive = false;
  let samplingCanceled = false;
  let runState = 'ready';
  let elapsedStartedAt = 0;
  let elapsedTimer = null;
  let renderScheduled = false;
  let applyingPreset = false;
  let currentPresetKey = 'schur';

  const LOCKED_DURING_SAMPLE_IDS = [
    'fs-N', 'fs-M', 'fs-q', 'fs-alpha', 'fs-beta', 'fs-gamma',
    'fs-x', 'fs-w', 'fs-y', 'fs-apply-q', 'fs-uniform-btn', 'fs-resize-btn',
    'fs-preset-select', 'fs-preset-apply',
    'fs-sample-btn', 'fs-multi-sample-btn', 'fs-sample-count', 'fs-max-cols',
  ];

  const FACTORIAL_YBE_PRESETS = {
    schur: {
      label: 'Schur',
      description: 'Plain Schur specialization with n=10 paths and N=20 check rows. The sampler uses check-coordinate w=2, equivalent to ordinary Schur dual ratio 0.5 while keeping w>x.',
      N: 10,
      M: 20,
      q: 0.95,
      alpha: 1,
      beta: 0,
      gamma: 2,
      x: '1',
      w: '2',
      y: '0',
      columnCap: 20000,
      cellSize: 16,
      squareCells: true,
      xAspect: 1,
      pathWidth: 1,
      pathStyle: 'tonal',
    },
    'q-racah': {
      label: 'q-Racah',
      description: 'q-Racah-style specialization with n=20 paths and N=50 check rows: x_i=1, y_i=1.5 q^(i-N), w_i=2 q^(i-N).',
      N: 20,
      M: 50,
      q: 0.95,
      alpha: 1,
      beta: 1.5,
      gamma: 2,
      x: '1',
      w: '2*q^(i-N)',
      y: '1.5*q^(i-N)',
      columnCap: 20000,
      cellSize: 10,
      squareCells: false,
      xAspect: 0.25,
      pathWidth: 1,
      pathStyle: 'tonal',
    },
    custom: {
      label: 'Custom parameters',
      description: 'Manual x, w, y controls are active. The visible n, N, and q fields set path count, check-zone size, and q.',
    },
  };

  const SUB = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
  function sub(n) { return String(n).split('').map(d => SUB[+d] || d).join(''); }

  function clampInt(s, lo, hi) {
    const n = parseInt(s, 10);
    if (!Number.isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function normalizeColumnCap(value, minimum = 100) {
    const number = Math.trunc(Number(value));
    if (!Number.isFinite(number)) return 20000;
    return Math.max(minimum, Math.min(1000000, number));
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
    const panel = $('fs-validation-panel');
    if (panel) panel.className = validationPanelClass(state, className);
    if (state !== 'sampling') stopElapsedTimer(state === 'ready' || state === 'validating' ? 0 : undefined);
  }

  function readControlState(overrides = {}) {
    const nextN = clampInt(overrides.N ?? $('fs-N')?.value ?? N, 1, 1000);
    const nextM = clampInt(overrides.M ?? $('fs-M')?.value ?? M, 1, 1000);
    const rawCap = overrides.columnCap ?? $('fs-max-cols')?.value ?? '20000';
    const columnCap = normalizeColumnCap(rawCap, overrides.columnCapMinimum ?? 100);
    return {
      N: nextN,
      M: nextM,
      columnCap,
      q: parseFloat($('fs-q')?.value || '0.95'),
      alpha: parseFloat($('fs-alpha')?.value || '1'),
      beta: parseFloat($('fs-beta')?.value || '0'),
      gamma: parseFloat($('fs-gamma')?.value || '2'),
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

  function formatValue(value) {
    if (!Number.isFinite(value)) return String(value);
    const abs = Math.abs(value);
    if (abs > 0 && (abs < 1e-4 || abs >= 1e5)) return value.toExponential(4);
    return String(round6(value));
  }

  function summarizeValues(label, arr) {
    if (!arr.length) return `${label}: no values`;
    const bounds = arrayMinMax(arr);
    const sample = arr.length <= 5 ? `; values=[${arr.map(formatValue).join(', ')}]` : '';
    return `${label}: ${arr.length} values; first=${formatValue(arr[0])}, last=${formatValue(arr[arr.length - 1])}; min=${formatValue(bounds.min)}, max=${formatValue(bounds.max)}${sample}`;
  }

  function describeGap(strict) {
    if (!strict || !Number.isFinite(strict.minGap)) return '';
    const near = strict.nearEquality ? ' near equality; increase w or lower x before sampling large systems.' : ' strict inequality margin OK.';
    return `Closest gap: w${sub(strict.closestW)} - x${sub(strict.closestX)} = ${formatValue(strict.minGap)};${near}`;
  }

  function setValidationDetail(message) {
    const detail = $('fs-validation-detail');
    if (detail) detail.textContent = message || '';
  }

  function validationPanelClass(state, className) {
    if (state === 'error' || /\berr\b/.test(className || '')) return 'fs-validation-panel fs-validation-error';
    if (state === 'canceled' || /\bwarn\b/.test(className || '')) return 'fs-validation-panel fs-validation-warn';
    if (state === 'done') return 'fs-validation-panel fs-validation-done';
    if (state === 'ready') return 'fs-validation-panel fs-validation-ready';
    return 'fs-validation-panel fs-validation-ok';
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
    const ids = [...s.matchAll(/[A-Za-z_]\w*/g)];
    const allowed = new Set([
      'i','j','k','n','N','M','q','alpha','beta','gamma','a','b','g',
      'sqrt','exp','log','pow','sin','cos','tan','abs','min','max','PI','E'
    ]);
    for (const match of ids) {
      const id = match[0];
      const index = match.index || 0;
      if ((id === 'e' || id === 'E') && index > 0 && /[0-9.]/.test(s[index - 1]) && /^[+-]?\d/.test(s.slice(index + 1))) {
        continue;
      }
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
    // User-facing notation: n is the number of x-rows/paths, while N is the
    // number of check/w-rows. The internal variable names remain N and M.
    const v = fn(
      idx, idx, idx, N, M, M,
      env.q, env.alpha, env.beta, env.gamma, env.alpha, env.beta, env.gamma,
      Math.sqrt, Math.exp, Math.log, Math.pow, Math.sin, Math.cos, Math.tan,
      Math.abs, Math.min, Math.max, Math.PI, Math.E
    );
    if (!Number.isFinite(v)) throw new Error('expression produced a non-finite value');
    return Number(v);
  }

  function repeatCountFromToken(token, columnCap = currentColumnCap()) {
    const t = String(token || '').trim();
    if (/^\d+$/.test(t)) {
      const count = Number(t);
      if (!Number.isSafeInteger(count)) throw new Error(`unsupported repeat count ${t}`);
      return count;
    }
    if (t === 'n') return N;
    if (t === 'N' || t === 'M') return M;
    if (t === 'columnCap' || t === 'cap' || t === 'K') return columnCap;
    throw new Error(`unsupported repeat count ${t}`);
  }

  function splitTopLevelCommas(str) {
    const out = [];
    const source = String(str || '');
    let depth = 0;
    let start = 0;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (ch === '(') depth += 1;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) {
        out.push(source.slice(start, i));
        start = i + 1;
      }
    }
    out.push(source.slice(start));
    return out;
  }

  function appendRepeatedValues(out, values, count, maxLength) {
    const remaining = maxLength - out.length;
    if (remaining <= 0) return;
    if (values.length === 1) {
      const copies = Math.min(count, remaining);
      for (let i = 0; i < copies; i++) out.push(values[0]);
      return;
    }
    const cycles = Math.min(count, Math.ceil(remaining / values.length));
    for (let i = 0; i < cycles && out.length < maxLength; i++) {
      for (const value of values) {
        if (out.length >= maxLength) break;
        out.push(value);
      }
    }
  }

  function parseFiniteList(str, options = {}) {
    const maxLength = Math.max(0, Math.trunc(Number(options.maxLength ?? 1000000)));
    const columnCap = normalizeColumnCap(options.columnCap ?? currentColumnCap(), 1);
    const out = [];
    const numberPattern = '[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?';
    const repeatPattern = new RegExp(`^(${numberPattern})\\^(\\d+|n|N|M|columnCap|cap|K)$`);
    const patternRepeat = /^(.+)\^(\d+|n|N|M|columnCap|cap|K)$/;
    for (const token of splitTopLevelCommas(str)) {
      const tr = token.trim();
      if (!tr) continue;
      const patternRep = tr.startsWith('(') ? tr.match(patternRepeat) : null;
      if (patternRep && patternRep[1].startsWith('(') && patternRep[1].endsWith(')')) {
        const count = repeatCountFromToken(patternRep[2], columnCap);
        if (count <= 0) throw new Error(`bad repeat token ${tr}`);
        const patternTokens = splitTopLevelCommas(patternRep[1].slice(1, -1))
          .map(v => v.trim())
          .filter(Boolean);
        const patternValues = patternTokens.map(v => Number(v));
        if (patternValues.length === 0 || patternValues.some(v => !Number.isFinite(v))) {
          throw new Error(`bad repeat token ${tr}`);
        }
        appendRepeatedValues(out, patternValues, count, maxLength);
        continue;
      }
      const rep = tr.match(repeatPattern);
      if (rep) {
        const value = Number(rep[1]);
        const count = repeatCountFromToken(rep[2], columnCap);
        if (!Number.isFinite(value) || count <= 0) throw new Error(`bad repeat token ${tr}`);
        appendRepeatedValues(out, [value], count, maxLength);
        continue;
      }
      const value = Number(tr);
      if (!Number.isFinite(value)) throw new Error(`bad numeric token ${tr}`);
      if (out.length < maxLength) out.push(value);
    }
    return out;
  }

  function finiteListTooShortMessage(label, got, needed) {
    const repeatHint = label === 'x'
      ? 'try 1^n'
      : label === 'w'
        ? 'try 1^N'
        : 'try 0^columnCap';
    return `${label} needs ${needed} values; got ${got} (${repeatHint}).`;
  }

  function isPlainNumber(str) {
    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(String(str || '').trim());
  }

  function parseArrayInput(input, len, label, options = {}) {
    const str = String(input || '').trim();
    if (!str) throw new Error(`${label} is empty`);
    let arr;
    let finiteListError = null;
    try {
      arr = parseFiniteList(str, { maxLength: len, columnCap: options.columnCap });
    } catch (error) {
      finiteListError = error;
    }
    if (arr && arr.length > 0) {
      if (arr.length === 1 && isPlainNumber(str) && len > 1) {
        arr = Array(len).fill(arr[0]);
      } else if (arr.length < len) {
        throw new Error(finiteListTooShortMessage(label, arr.length, len));
      }
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

  function parseYInput(input, options = {}) {
    const str = String(input || '').trim();
    if (!str) throw new Error('y is empty');
    const columnCap = normalizeColumnCap(options.columnCap ?? currentColumnCap(), 1);
    let arr;
    let finiteListError = null;
    try {
      arr = parseFiniteList(str, { maxLength: columnCap, columnCap });
    } catch (error) {
      finiteListError = error;
    }
    if (arr && arr.length > 0) {
      for (const v of arr) {
        if (!Number.isFinite(v)) throw new Error('y contains a non-finite value');
      }
      if (arr.length === 1 && isPlainNumber(str)) {
        const constant = arr[0];
        const previewLen = Math.max(20, Math.min(120, 4 * (N + M) + 20));
        return {
          kind: 'constant',
          preview: Array(previewLen).fill(constant),
          value(k) {
            if (k <= 0) return 0;
            return constant;
          },
          length: Infinity,
        };
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

  function validateStrictInequalities() {
    let minGap = Infinity;
    let closestX = 1;
    let closestW = 1;
    for (let i = 0; i < xArr.length; i++) {
      for (let j = 0; j < wArr.length; j++) {
        const gap = wArr[j] - xArr[i];
        if (gap < minGap) {
          minGap = gap;
          closestX = i + 1;
          closestW = j + 1;
        }
        if (!(gap > 0)) {
          fail(`Need w${sub(j + 1)} > x${sub(i + 1)} (${formatValue(wArr[j])} ≤ ${formatValue(xArr[i])}).`);
        }
      }
    }
    const scale = Math.max(1, Math.abs(wArr[closestW - 1]), Math.abs(xArr[closestX - 1]));
    return {
      minGap,
      closestX,
      closestW,
      nearEquality: minGap / scale < 1e-5,
    };
  }

  function validatePositivityForCap(columnCap) {
    const xBounds = arrayMinMax(xArr);
    const wBounds = arrayMinMax(wArr);
    let firstY = 0;
    let lastY = 0;
    let minY = Infinity;
    let maxY = -Infinity;
    let minXPlusY = Infinity;
    let minWPlusY = Infinity;
    let minXColumn = 1;
    let minWColumn = 1;
    for (let k = 1; k <= columnCap; k++) {
      const y = yVal(k);
      if (!Number.isFinite(y)) fail(`y_${k} is non-finite.`);
      if (k === 1) firstY = y;
      lastY = y;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const xPlusY = xBounds.min + y;
      const wPlusY = wBounds.min + y;
      if (xPlusY < minXPlusY) {
        minXPlusY = xPlusY;
        minXColumn = k;
      }
      if (wPlusY < minWPlusY) {
        minWPlusY = wPlusY;
        minWColumn = k;
      }
      if (!(wPlusY > 0)) {
        fail(`Need min(w)+y_${k} > 0; got ${formatValue(wPlusY)}.`);
      }
      if (!(xPlusY >= 0)) {
        fail(`Need min(x)+y_${k} ≥ 0; got ${formatValue(xPlusY)}.`);
      }
    }
    return {
      columnCap,
      firstY,
      lastY,
      minY,
      maxY,
      minXPlusY,
      minWPlusY,
      minXColumn,
      minWColumn,
    };
  }

  function validateParameters(columnCap = currentColumnCap()) {
    if (columnCap < N) {
      fail(`Need column cap ≥ n (${N}); got ${columnCap}.`);
    }
    const strict = validateStrictInequalities();
    const positivity = validatePositivityForCap(columnCap);
    clearValidation('OK');
    setValidationDetail('');
    return { strict, positivity };
  }

  function applyParamsFromInputs(overrides = {}) {
    setRunState('validating', 'validating', 'Checking parameters...', 'fs-note ok');
    try {
      const controls = readControlState(overrides);
      N = controls.N;
      M = controls.M;
      if ($('fs-N')) $('fs-N').value = String(N);
      if ($('fs-M')) $('fs-M').value = String(M);
      xArr = parseArrayInput($('fs-x').value, N, 'x', { columnCap: controls.columnCap });
      wArr = parseArrayInput($('fs-w').value, M, 'w', { columnCap: controls.columnCap });
      ySpec = parseYInput($('fs-y').value, { columnCap: controls.columnCap });
      if (ySpec.kind === 'array' && ySpec.length < controls.columnCap) {
        throw new Error(finiteListTooShortMessage('y', ySpec.length, controls.columnCap));
      }

      const validation = validateParameters(controls.columnCap);
      $('fs-x-note').textContent = summarizeValues('x', xArr);
      $('fs-w-note').textContent = `${summarizeValues('w', wArr)}. ${describeGap(validation.strict)}`;
      const ySummary = summarize(ySpec.preview || []);
      $('fs-y-note').textContent = ySpec.kind === 'expr'
        ? `y: expression through cap ${controls.columnCap}; first=${formatValue(validation.positivity.firstY)}, last=${formatValue(validation.positivity.lastY)}, min=${formatValue(validation.positivity.minY)}, max=${formatValue(validation.positivity.maxY)}; preview [${ySummary}]`
        : ySpec.kind === 'constant'
          ? `y: constant ${formatValue(validation.positivity.firstY)} through cap ${controls.columnCap}; min=${formatValue(validation.positivity.minY)}, max=${formatValue(validation.positivity.maxY)}`
          : `y: ${ySpec.length} values; first=${formatValue(validation.positivity.firstY)}, last=${formatValue(validation.positivity.lastY)}, min=${formatValue(validation.positivity.minY)}, max=${formatValue(validation.positivity.maxY)}; preview [${ySummary}]`;
      return true;
    } catch (e) {
      setRunState('error', 'error', e.message, 'fs-note err');
      setValidationDetail('');
      return false;
    }
  }

  function setControlValue(id, value) {
    const el = $(id);
    if (el && value != null) el.value = String(value);
  }

  function setControlChecked(id, value) {
    const el = $(id);
    if (el && typeof value === 'boolean') el.checked = value;
  }

  function syncScaleLabel() {
    const scaleEl = $('fs-scale');
    const scaleValEl = $('fs-scale-val');
    if (scaleEl && scaleValEl) scaleValEl.textContent = `${scaleEl.value}px`;
  }

  function syncAspectControls() {
    const aspectEl = $('fs-x-aspect');
    const squareEl = $('fs-square-cells');
    if (aspectEl && squareEl) aspectEl.disabled = !!squareEl.checked;
  }

  function updatePresetDescription(key = currentPresetKey) {
    const preset = FACTORIAL_YBE_PRESETS[key] || FACTORIAL_YBE_PRESETS.custom;
    const note = $('fs-preset-note');
    if (note) note.textContent = preset.description || '';
  }

  function markCustomPreset() {
    if (applyingPreset) return;
    currentPresetKey = 'custom';
    const select = $('fs-preset-select');
    if (select) select.value = 'custom';
    updatePresetDescription('custom');
  }

  function applyViewPreset(preset) {
    if (!preset) return;
    setControlValue('fs-scale', preset.cellSize);
    setControlChecked('fs-square-cells', preset.squareCells);
    setControlValue('fs-x-aspect', preset.xAspect ?? 1);
    setControlValue('fs-path-width', preset.pathWidth ?? 1);
    setControlValue('fs-path-style', preset.pathStyle);
    syncScaleLabel();
    syncAspectControls();
    pathRenderer?.setBaseScale(getDesiredCellSize());
    pathRenderer?.setSquareCells(isSquareCells());
    pathRenderer?.setAspectRatio(getXAspectRatio());
    pathRenderer?.setPathWidthFactor(getPathWidthFactor());
    pathRenderer?.setPathStyle(getPathStyle());
  }

  function applyPreset(key, options = {}) {
    const preset = FACTORIAL_YBE_PRESETS[key];
    if (!preset || key === 'custom') {
      currentPresetKey = 'custom';
      const select = $('fs-preset-select');
      if (select) select.value = 'custom';
      updatePresetDescription('custom');
      return applyParamsFromInputs();
    }

    applyingPreset = true;
    try {
      terminateActiveWorker('', { silent: true });
      currentPresetKey = key;
      const select = $('fs-preset-select');
      if (select) select.value = key;
      updatePresetDescription(key);
      setControlValue('fs-N', preset.N);
      setControlValue('fs-M', preset.M);
      setControlValue('fs-q', preset.q);
      setControlValue('fs-alpha', preset.alpha);
      setControlValue('fs-beta', preset.beta);
      setControlValue('fs-gamma', preset.gamma);
      setControlValue('fs-x', preset.x);
      setControlValue('fs-w', preset.w);
      setControlValue('fs-y', preset.y);
      setControlValue('fs-max-cols', preset.columnCap);
      applyViewPreset(preset);

      const ok = applyParamsFromInputs();
      if (ok && options.reset !== false) {
        resetFrozen();
        pathRenderer?.fit();
      }
      return ok;
    } finally {
      applyingPreset = false;
    }
  }

  function applyQSpecToInputs() {
    markCustomPreset();
    $('fs-x').value = 'alpha*q^i';
    $('fs-w').value = 'gamma*q^i';
    $('fs-y').value = 'beta*q^i';
    applyParamsFromInputs();
  }

  function applySafeConstantsToInputs() {
    markCustomPreset();
    $('fs-x').value = '0.8^n';
    $('fs-w').value = '1^N';
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
      return normalizeColumnCap(columnCapOverride, 1);
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
    const hadWorker = !!activeWorker || !!activeRunFinisher;
    activeRequestId += 1;
    if (activeRunFinisher) {
      activeRunFinisher(false);
    } else if (activeWorker) {
      activeWorker.terminate();
      activeWorker = null;
    }
    activeRunFinisher = null;
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
    if (updateDom) {
      $('fs-lambda').textContent = lambda.length ? `(${lambda.join(', ')})` : '∅';
      bumpRenderDataVersion();
    }
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

  function referenceYInput(input, options = {}) {
    if (Array.isArray(input)) return arrayYSpec(input);
    if (typeof input === 'string') return parseYInput(input, { columnCap: options.columnCap });
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
      const sampleColumnCap = normalizeColumnCap(options.columnCap ?? 20000, 1);
      columnCapOverride = sampleColumnCap;
      xArr = referenceArrayInput(options.x, N, 'x');
      wArr = referenceArrayInput(options.w, M, 'w');
      ySpec = referenceYInput(options.y, { columnCap: sampleColumnCap });
      validateReferenceParameters();

      const seedLo = options.seedLo ?? options.seed ?? 1;
      const seedHi = options.seedHi ?? 0;
      randomUnit = createXoshiro256pp(seedLo, seedHi);
      buildYArrayForWasm(sampleColumnCap);
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
    bumpRenderDataVersion();
    refreshStats();
    invalidateRender();
  }

  function sampleOnceJsFallback(options = {}) {
    const columnCap = requestedColumnCap(options);
    if (!applyParamsFromInputs({ columnCap, columnCapMinimum: 1 })) return false;
    const t0 = performance.now();
    stats.rowSwaps = 0;
    stats.localMoves = 0;
    stats.randomChoices = 0;
    stats.wasm = false;
    stats.wallElapsedMs = 0;
    const savedColumnCapOverride = columnCapOverride;
    try {
      columnCapOverride = columnCap;
      startElapsedTimer(t0);
      buildYArrayForWasm(columnCap);
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
    } finally {
      columnCapOverride = savedColumnCapOverride;
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
    bumpRenderDataVersion();
  }

  function requestedColumnCap(options = {}) {
    return options.columnCap == null
      ? currentColumnCap()
      : normalizeColumnCap(options.columnCap, 1);
  }

  function workerFallbackAllowed(columnCap = currentColumnCap()) {
    return N * M <= 64 && columnCap <= 5000;
  }

  function buildWorkerRequest(options = {}) {
    const columnCap = requestedColumnCap(options);
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
    const columnCap = requestedColumnCap(options);
    if (!applyParamsFromInputs({ columnCap, columnCapMinimum: 1 })) return Promise.resolve(false);
    if (typeof Worker !== 'function') {
      if (workerFallbackAllowed(columnCap)) {
        setRunState('sampling', 'sampling', 'Web Workers are unavailable; using the small-system JS reference fallback.', 'fs-note warn');
        return Promise.resolve(sampleOnceJsFallback({ ...options, columnCap }));
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
      if (workerFallbackAllowed(columnCap)) {
        setRunState('sampling', 'sampling', `Worker could not start (${error.message}); using the small-system JS reference fallback.`, 'fs-note warn');
        return Promise.resolve(sampleOnceJsFallback({ ...options, columnCap }));
      }
      setRunState('error', 'error', `Worker could not start: ${error.message}`, 'fs-note err');
      return Promise.resolve(false);
    }
    activeWorker = worker;
    setSamplingUi(true);
    const started = performance.now();
    startElapsedTimer(started);
    setRunState('sampling', 'sampling', `Sampling in WASM worker for n=${N}, N=${M}, cap=${request.columnCap}...`, 'fs-note ok');

    return new Promise((resolve) => {
      let settled = false;
      function finish(ok, finalElapsedMs = performance.now() - started) {
        if (settled) return;
        settled = true;
        if (activeWorker === worker) activeWorker = null;
        if (activeRunFinisher === finish) activeRunFinisher = null;
        worker.terminate();
        setSamplingUi(false);
        stopElapsedTimer(finalElapsedMs);
        resolve(ok);
      }
      activeRunFinisher = finish;

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
    samplingCanceled = false;
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
    'fs-x', 'fs-w', 'fs-y', 'fs-max-cols', 'fs-scale', 'fs-path-style',
    'fs-x-aspect', 'fs-path-width', 'fs-preset-select', 'fs-square-cells',
  ];

  function defaultBenchmarkCases(options = {}) {
    return [
      {
        name: 'schur',
        N: 10,
        M: 20,
        q: 0.95,
        alpha: 1,
        beta: 0,
        gamma: 2,
        x: '1',
        w: '2',
        y: '0',
        columnCap: options.schurColumnCap || 20000,
        cellSize: 16,
        squareCells: true,
        xAspect: 1,
        pathWidth: 1,
        pathStyle: 'tonal',
      },
      {
        name: 'q-racah',
        N: 20,
        M: 50,
        q: 0.95,
        alpha: 1,
        beta: 1.5,
        gamma: 2,
        x: '1',
        w: '2*q^(i-N)',
        y: '1.5*q^(i-N)',
        columnCap: options.qRacahColumnCap || 20000,
        cellSize: 10,
        squareCells: false,
        xAspect: 0.25,
        pathWidth: 1,
        pathStyle: 'tonal',
      },
      {
        name: 'large stress',
        N: options.stressN || 80,
        M: options.stressM || 120,
        q: 0.95,
        alpha: 1,
        beta: 0,
        gamma: 2,
        x: '1',
        w: '2*q^(i-N)',
        y: '1.5*q^(i-N)',
        columnCap: options.stressColumnCap || 20000,
        cellSize: 5,
        squareCells: false,
        xAspect: 0.12,
        pathWidth: 1,
        pathStyle: 'tonal',
      },
    ];
  }

  function snapshotUiAndSamplerState() {
    const controls = {};
    for (const id of BENCHMARK_CONTROL_IDS) {
      const el = $(id);
      if (!el) continue;
      controls[id] = { value: el.value, checked: typeof el.checked === 'boolean' ? el.checked : undefined };
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
      rendererViewport: pathRenderer?.snapshotViewport() || null,
    };
  }

  function restoreUiAndSamplerState(saved) {
    terminateActiveWorker('', { silent: true });
    for (const [id, value] of Object.entries(saved.controls || {})) {
      const el = $(id);
      if (el) el.value = value.value;
      if (el && typeof value.checked === 'boolean') el.checked = value.checked;
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
    currentPresetKey = saved.controls?.['fs-preset-select']?.value || 'custom';
    syncScaleLabel();
    updatePresetDescription(currentPresetKey);
    if (saved.rendererViewport && pathRenderer) pathRenderer.restoreViewport(saved.rendererViewport);
    setSamplingUi(false);
    refreshStats();
    const lambda = mu[M] || [];
    const lambdaEl = $('fs-lambda');
    if (lambdaEl) lambdaEl.textContent = lambda.length ? `(${lambda.join(', ')})` : '∅';
    applyParamsFromInputs();
    stats = { ...saved.stats };
    bumpRenderDataVersion();
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
      'fs-scale': testCase.cellSize,
      'fs-x-aspect': testCase.xAspect,
      'fs-path-width': testCase.pathWidth,
      'fs-path-style': testCase.pathStyle,
    };
    for (const [id, value] of Object.entries(assignments)) {
      const el = $(id);
      if (el && value != null) el.value = String(value);
    }
    setControlChecked('fs-square-cells', testCase.squareCells);
    syncScaleLabel();
    applyViewPreset(testCase);
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
  // Stats and canvas renderer
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

  function getXAspectRatio() {
    const input = $('fs-x-aspect');
    const v = input ? Number(input.value) : 1;
    return (!Number.isFinite(v) || v <= 0) ? 1 : Math.max(0.001, Math.min(10, v));
  }

  function getPathWidthFactor() {
    const input = $('fs-path-width');
    const v = input ? Number(input.value) : 1;
    return (!Number.isFinite(v) || v <= 0) ? 1 : Math.max(0.1, Math.min(10, v));
  }

  function getPathStyle() {
    const select = $('fs-path-style');
    return select && select.value === 'legacy' ? 'legacy' : 'tonal';
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

  let renderDataVersion = 0;
  let pathRenderer = null;

  function bumpRenderDataVersion() {
    renderDataVersion += 1;
  }

  class FactorialPathCanvasRenderer {
    constructor(canvasEl, options = {}) {
      this.canvas = canvasEl;
      this.ctx = canvasEl ? canvasEl.getContext('2d') : null;
      this.viewbar = options.viewbar || null;
      this.viewport = { scale: 20, tx: 0, ty: 0 };
      this.baseScale = 20;
      // Allow zooming far out for very large samples: minimum is 0.01% of 100%.
      this.minScale = this.baseScale * 0.0001;
      this.maxScale = 90;
      this.squareCells = true;
      this.xAspect = 1;
      this.pathWidthFactor = 1;
      this.pathStyle = 'tonal';
      this.viewMode = 'paths';
      this.viewInitialized = false;
      this.framePending = false;
      this.data = null;
      this.geometry = null;
      this.geometryVersion = -1;
      this.backgroundCache = null;
      this.backgroundCacheKey = '';
      this.pointers = new Map();
      this.lastPinch = null;
      this.resizeObserver = null;

      this.attachPointerEvents();
      if (typeof ResizeObserver === 'function' && this.canvas) {
        this.resizeObserver = new ResizeObserver(() => {
          this.invalidateBackground();
          this.fit();
        });
        this.resizeObserver.observe(this.canvas);
      }
    }

    setData(data) {
      if (!data) return;
      const sameShape = this.data && this.data.N === data.N && this.data.M === data.M;
      const preserveView = !!this.geometry && this.viewInitialized && sameShape;
      this.data = data;
      if (data.version !== this.geometryVersion) {
        this.geometry = this.buildGeometry(data);
        this.geometryVersion = data.version;
        if (!preserveView) this.viewInitialized = false;
        this.invalidateBackground();
      }
    }

    setBaseScale(value) {
      const next = Math.max(3, Math.min(80, Number(value) || 20));
      this.minScale = next * 0.0001;
      if (Math.abs(next - this.baseScale) < 0.001) return;
      this.baseScale = next;
      this.maxScale = Math.max(48, next * 5);
      this.invalidateBackground();
    }

    setSquareCells(value) {
      const next = !!value;
      if (next === this.squareCells) return;
      this.squareCells = next;
      this.invalidateBackground();
      this.viewInitialized = false;
    }

    setAspectRatio(value) {
      const next = Math.max(0.001, Math.min(10, Number(value) || 1));
      if (Math.abs(next - this.xAspect) < 0.0001) return;
      this.xAspect = next;
      this.invalidateBackground();
      this.viewInitialized = false;
    }

    setPathWidthFactor(value) {
      const next = Math.max(0.1, Math.min(10, Number(value) || 1));
      if (Math.abs(next - this.pathWidthFactor) < 0.0001) return;
      this.pathWidthFactor = next;
      this.scheduleDraw();
    }

    setPathStyle(value) {
      const next = value === 'legacy' ? 'legacy' : 'tonal';
      if (next === this.pathStyle) return;
      this.pathStyle = next;
      this.invalidateBackground();
    }

    setViewMode(_value) {
      const next = 'paths';
      if (next === this.viewMode) return;
      this.viewMode = next;
      this.viewInitialized = false;
      this.invalidateBackground();
      this.fit();
    }

    snapshotViewport() {
      return {
        viewport: { ...this.viewport },
        viewInitialized: this.viewInitialized,
        baseScale: this.baseScale,
        squareCells: this.squareCells,
        xAspect: this.xAspect,
        pathWidthFactor: this.pathWidthFactor,
        pathStyle: this.pathStyle,
        viewMode: this.viewMode,
      };
    }

    restoreViewport(saved = {}) {
      if (saved.viewport) this.viewport = { ...saved.viewport };
      this.viewInitialized = !!saved.viewInitialized;
      if (saved.baseScale) {
        this.baseScale = saved.baseScale;
        this.minScale = this.baseScale * 0.0001;
      }
      if (typeof saved.squareCells === 'boolean') this.squareCells = saved.squareCells;
      if (saved.xAspect) this.xAspect = Math.max(0.001, Math.min(10, Number(saved.xAspect) || 1));
      if (saved.pathWidthFactor) this.pathWidthFactor = Math.max(0.1, Math.min(10, Number(saved.pathWidthFactor) || 1));
      if (saved.pathStyle) this.pathStyle = saved.pathStyle;
      if (saved.viewMode) this.viewMode = 'paths';
      this.invalidateBackground();
      this.scheduleDraw();
    }

    buildGeometry(data) {
      const n = data.N || 0;
      const m = data.M || 0;
      const totalLevels = n + m;
      const rawBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      const lambdaLevel = m;
      const paths = [];
      const lambdaParticles = [];

      const include = (point) => {
        rawBounds.minX = Math.min(rawBounds.minX, point.x);
        rawBounds.maxX = Math.max(rawBounds.maxX, point.x);
        rawBounds.minY = Math.min(rawBounds.minY, point.y);
        rawBounds.maxY = Math.max(rawBounds.maxY, point.y);
      };

      const positionAt = (track, level) => {
        if (level <= m) {
          const row = data.mu && data.mu[level];
          if (!row || row[track] == null) return null;
          return row[track] + n - track;
        }
        const s = level - m;
        const lamLevel = n - s;
        const lamTrack = track - s;
        if (lamTrack < 0 || lamTrack >= lamLevel) return null;
        const row = data.lam && data.lam[lamLevel];
        if (!row || row[lamTrack] == null) return null;
        return row[lamTrack] + lamLevel - lamTrack;
      };

      for (let track = 0; track < n; track++) {
        const lastLevel = Math.min(m + track, totalLevels);
        const polyline = [];
        const particles = [];
        let previous = null;
        for (let level = 0; level <= lastLevel; level++) {
          const pos = positionAt(track, level);
          if (pos == null) break;
          const point = { x: pos, y: totalLevels - level, level, track };
          particles.push(point);
          include(point);
          if (level === lambdaLevel) lambdaParticles.push(point);
          if (!previous) {
            polyline.push(point);
          } else if (point.x !== previous.x) {
            polyline.push({ x: previous.x, y: point.y, level, track });
            polyline.push(point);
          } else {
            polyline.push(point);
          }
          previous = point;
        }
        if (polyline.length) {
          paths.push({
            track,
            polyline,
            particles,
            endpoint: particles[particles.length - 1],
          });
        }
      }

      if (!Number.isFinite(rawBounds.minX)) {
        rawBounds.minX = 0;
        rawBounds.minY = 0;
        rawBounds.maxX = Math.max(1, n + 1);
        rawBounds.maxY = Math.max(1, totalLevels);
      }

      const centersFromPartition = (row) => (row || []).map((part, index) => part - (index + 1)).sort((a, b) => a - b);
      // Lozenge rows are stored in top-to-bottom order for the final two-sided
      // GT pattern:
      //
      //   lam[0], lam[1], ..., lam[n] = lambda = mu[M],
      //   mu[M-1], ..., mu[0].
      //
      // The renderer's model y-coordinate is also top-to-bottom, so
      // lozengeModelPoint must use +0.85*y, not -0.85*y.
      const lozengeRows = [];
      for (let length = 0; length <= n; length++) {
        lozengeRows.push({ level: length, rank: length, kind: 'lambda', centers: centersFromPartition(data.lam?.[length]) });
      }
      for (let j = m - 1; j >= 0; j--) {
        lozengeRows.push({ level: n + (m - j), rank: n, kind: 'mu', centers: centersFromPartition(data.mu?.[j]) });
      }
      let lozengeMinCenter = Infinity;
      let lozengeMaxCenter = -Infinity;
      for (const row of lozengeRows) {
        for (const center of row.centers) {
          lozengeMinCenter = Math.min(lozengeMinCenter, center);
          lozengeMaxCenter = Math.max(lozengeMaxCenter, center);
        }
      }
      if (!Number.isFinite(lozengeMinCenter)) {
        lozengeMinCenter = -n;
        lozengeMaxCenter = 1;
      }
      const rowCount = Math.max(1, lozengeRows.length);
      const lozengeBounds = {
        minX: lozengeMinCenter - 4,
        maxX: lozengeMaxCenter + rowCount / 2 + 4,
        minY: -2,
        maxY: 0.9 * (rowCount + 2),
      };

      return {
        N: n,
        M: m,
        totalLevels,
        paths,
        lambdaParticles,
        lozengeRows,
        lozengeMinCenter,
        lozengeMaxCenter,
        lozengeBounds,
        rawBounds,
      };
    }

    cssSize() {
      const rect = this.canvas?.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect?.width || this.canvas?.clientWidth || 800));
      const height = Math.max(1, Math.round(rect?.height || this.canvas?.clientHeight || 480));
      return { width, height };
    }

    setupHiDpi() {
      if (!this.canvas || !this.ctx) return { width: 0, height: 0, dpr: 1 };
      const { width, height } = this.cssSize();
      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;
        this.invalidateBackground();
      }
      return { width, height, dpr };
    }

    xStep(_width) {
      if (this.squareCells || !this.geometry) return 1;
      return Math.max(0.001, Math.min(10, this.xAspect || 1));
    }

    layoutBounds(width) {
      if (!this.geometry) return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1, xStep: 1 };
      const xStep = this.xStep(width);
      const raw = this.geometry.rawBounds;
      const exitPad = Math.max(1.2, Math.min(4, (raw.maxX - raw.minX + 1) * 0.08));
      const minX = Math.max(0, raw.minX - 1) * xStep;
      const maxX = (raw.maxX + exitPad) * xStep;
      const minY = Math.max(0, raw.minY - 1);
      const maxY = Math.min(this.geometry.totalLevels + 1, raw.maxY + 1);
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        xStep,
      };
    }

    ensureView(width, height) {
      if (!this.geometry) return;
      if (!this.viewInitialized) this.fitToContent(width, height);
    }

    fitToContent(width, height) {
      const bounds = this.layoutBounds(width);
      const pad = 54;
      const availableW = Math.max(80, width - pad * 2);
      const availableH = Math.max(80, height - pad * 2);
      const fitScale = Math.min(availableW / bounds.width, availableH / bounds.height);
      const targetScale = Math.min(Math.max(this.minScale, fitScale), this.baseScale * 1.25);
      this.viewport.scale = Math.max(this.minScale, Math.min(this.maxScale, targetScale));
      this.viewport.tx = (bounds.minX + bounds.maxX) / 2 - width / (2 * this.viewport.scale);
      this.viewport.ty = (bounds.minY + bounds.maxY) / 2 - height / (2 * this.viewport.scale);
      this.viewInitialized = true;
      this.invalidateBackground();
    }

    fit() {
      const { width, height } = this.setupHiDpi();
      this.fitToContent(width || 800, height || 480);
      this.scheduleDraw();
    }

    setActualSize() {
      const { width, height } = this.setupHiDpi();
      const bounds = this.layoutBounds(width || 800);
      this.viewport.scale = Math.max(this.minScale, Math.min(this.maxScale, this.baseScale));
      this.viewport.tx = (bounds.minX + bounds.maxX) / 2 - (width || 800) / (2 * this.viewport.scale);
      this.viewport.ty = (bounds.minY + bounds.maxY) / 2 - (height || 480) / (2 * this.viewport.scale);
      this.viewInitialized = true;
      this.invalidateBackground();
      this.scheduleDraw();
    }

    zoomAt(canvasX, canvasY, factor) {
      if (!Number.isFinite(factor) || factor <= 0) return;
      const oldScale = this.viewport.scale;
      const modelX = this.viewport.tx + canvasX / oldScale;
      const modelY = this.viewport.ty + canvasY / oldScale;
      const nextScale = Math.max(this.minScale, Math.min(this.maxScale, oldScale * factor));
      this.viewport.scale = nextScale;
      this.viewport.tx = modelX - canvasX / nextScale;
      this.viewport.ty = modelY - canvasY / nextScale;
      this.viewInitialized = true;
      this.invalidateBackground();
      this.scheduleDraw();
    }

    zoomBy(factor) {
      const { width, height } = this.cssSize();
      this.zoomAt(width / 2, height / 2, factor);
    }

    panByScreen(dx, dy) {
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      this.viewport.tx -= dx / this.viewport.scale;
      this.viewport.ty -= dy / this.viewport.scale;
      this.viewInitialized = true;
      this.invalidateBackground();
      this.scheduleDraw();
    }

    screenToModel(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: this.viewport.tx + (clientX - rect.left) / this.viewport.scale,
        y: this.viewport.ty + (clientY - rect.top) / this.viewport.scale,
      };
    }

    pointerMetrics() {
      const points = Array.from(this.pointers.values());
      if (points.length < 2) return null;
      const a = points[0];
      const b = points[1];
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      return { center, distance: Math.hypot(dx, dy) };
    }

    attachPointerEvents() {
      if (!this.canvas) return;

      this.canvas.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.canvas.setPointerCapture?.(event.pointerId);
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.canvas.classList.add('dragging');
        this.lastPinch = this.pointerMetrics();
      });

      this.canvas.addEventListener('pointermove', (event) => {
        if (!this.pointers.has(event.pointerId)) return;
        event.preventDefault();
        const previousPoint = this.pointers.get(event.pointerId);
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (this.pointers.size >= 2) {
          const previousPinch = this.lastPinch;
          const nextPinch = this.pointerMetrics();
          if (previousPinch && nextPinch && previousPinch.distance > 0 && nextPinch.distance > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const anchored = this.screenToModel(previousPinch.center.x, previousPinch.center.y);
            const factor = nextPinch.distance / previousPinch.distance;
            const nextScale = Math.max(this.minScale, Math.min(this.maxScale, this.viewport.scale * factor));
            this.viewport.scale = nextScale;
            this.viewport.tx = anchored.x - (nextPinch.center.x - rect.left) / nextScale;
            this.viewport.ty = anchored.y - (nextPinch.center.y - rect.top) / nextScale;
            this.viewInitialized = true;
            this.invalidateBackground();
            this.scheduleDraw();
          }
          this.lastPinch = nextPinch;
          return;
        }

        if (previousPoint) {
          this.panByScreen(event.clientX - previousPoint.x, event.clientY - previousPoint.y);
        }
      });

      const release = (event) => {
        this.pointers.delete(event.pointerId);
        try {
          if (!this.canvas.hasPointerCapture || this.canvas.hasPointerCapture(event.pointerId)) {
            this.canvas.releasePointerCapture?.(event.pointerId);
          }
        } catch {
          // Some browsers drop capture implicitly when a touch sequence ends.
        }
        this.lastPinch = this.pointerMetrics();
        if (!this.pointers.size) this.canvas.classList.remove('dragging');
      };
      this.canvas.addEventListener('pointerup', release);
      this.canvas.addEventListener('pointercancel', release);
      this.canvas.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'mouse' && this.pointers.has(event.pointerId)) release(event);
      });

      this.canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const factor = Math.exp(-event.deltaY * 0.001);
        this.zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor);
      }, { passive: false });

      this.canvas.addEventListener('dblclick', () => this.fit());
    }

    invalidateBackground() {
      this.backgroundCacheKey = '';
    }

    createLayer(width, height) {
      if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(width, height);
      const layer = document.createElement('canvas');
      layer.width = width;
      layer.height = height;
      return layer;
    }

    theme() {
      const darkAttr = document.documentElement.getAttribute('data-theme') === 'dark';
      const darkMedia = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const dark = darkAttr || (!document.documentElement.getAttribute('data-theme') && darkMedia);
      const uvaPalette = (window.ColorSchemes || []).find(scheme => scheme.name === 'UVA')?.colors || ['#E57200', '#232D4B', '#F9DCBF', '#002D62'];
      const [uvaOrange, uvaBlue, uvaOrange25, uvaDarkBlue] = uvaPalette;
      return dark ? {
        canvas: '#17232d',
        wBand: '#2c241b',
        xBand: '#172b3c',
        grid: 'rgba(214,223,232,0.18)',
        gridMajor: 'rgba(229,114,0,0.30)',
        label: '#d7dde5',
        muted: '#aeb7c0',
        navy: uvaBlue,
        orange: uvaOrange,
        lambda: uvaOrange,
        lozengeA: uvaBlue,
        lozengeB: uvaOrange25,
        lozengeC: uvaOrange25,
        lozengeStroke: 'rgba(230,238,246,0.14)',
        lozengeParticle: uvaOrange,
      } : {
        canvas: '#fbfcff',
        wBand: '#fff4df',
        xBand: '#eef5fb',
        grid: 'rgba(0,47,108,0.12)',
        gridMajor: 'rgba(229,114,0,0.28)',
        label: '#27394f',
        muted: '#66788a',
        navy: uvaBlue,
        orange: uvaOrange,
        lambda: uvaOrange,
        lozengeA: uvaBlue,
        lozengeB: uvaOrange25,
        lozengeC: uvaOrange25,
        lozengeStroke: 'rgba(0,47,108,0.10)',
        lozengeParticle: uvaOrange,
      };
    }

    screenX(rawX, xStep) {
      return (rawX * xStep - this.viewport.tx) * this.viewport.scale;
    }

    screenY(modelY) {
      return (modelY - this.viewport.ty) * this.viewport.scale;
    }

    modelYForLevel(level) {
      return (this.geometry?.totalLevels || 0) - level;
    }

    drawBackgroundLayer(targetCtx, size, xStep, colors) {
      const width = size.width;
      const height = size.height;
      const scale = this.viewport.scale;
      const geometry = this.geometry;
      if (!geometry) return;

      targetCtx.fillStyle = colors.canvas;
      targetCtx.fillRect(0, 0, width, height);

      const bandMinX = this.screenX(Math.max(0, geometry.rawBounds.minX - 1), xStep);
      const bandMaxX = this.screenX(geometry.rawBounds.maxX + 4, xStep);
      const topY = this.screenY(0);
      const middleY = this.screenY(this.modelYForLevel(geometry.M));
      const bottomY = this.screenY(geometry.totalLevels);
      targetCtx.fillStyle = colors.xBand;
      targetCtx.fillRect(bandMinX, topY, bandMaxX - bandMinX, middleY - topY);
      targetCtx.fillStyle = colors.wBand;
      targetCtx.fillRect(bandMinX, middleY, bandMaxX - bandMinX, bottomY - middleY);

      const cellPxX = scale * xStep;
      const cellPxY = scale;
      const viewLeft = this.viewport.tx;
      const viewRight = this.viewport.tx + width / scale;
      const viewTop = this.viewport.ty;
      const viewBottom = this.viewport.ty + height / scale;

      if (cellPxY >= 7) {
        const rowStep = cellPxY < 13 ? 5 : 1;
        const first = Math.max(0, Math.floor(geometry.totalLevels - viewBottom) - 1);
        const last = Math.min(geometry.totalLevels, Math.ceil(geometry.totalLevels - viewTop) + 1);
        targetCtx.strokeStyle = rowStep === 1 ? colors.grid : colors.gridMajor;
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        for (let level = first; level <= last; level += rowStep) {
          const y = this.screenY(this.modelYForLevel(level));
          targetCtx.moveTo(Math.max(0, bandMinX), y);
          targetCtx.lineTo(Math.min(width, bandMaxX), y);
        }
        targetCtx.stroke();
      }

      if (cellPxX >= 5) {
        const colStep = cellPxX < 11 ? 5 : 1;
        const firstCol = Math.max(0, Math.floor(viewLeft / xStep) - 1);
        const lastCol = Math.ceil(viewRight / xStep) + 1;
        targetCtx.strokeStyle = colStep === 1 ? colors.grid : colors.gridMajor;
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        for (let column = firstCol; column <= lastCol; column += colStep) {
          const x = this.screenX(column, xStep);
          targetCtx.moveTo(x, Math.max(0, topY));
          targetCtx.lineTo(x, Math.min(height, bottomY));
        }
        targetCtx.stroke();
      }

      const lambdaY = middleY;
      targetCtx.strokeStyle = colors.orange;
      targetCtx.lineWidth = Math.max(1.4, Math.min(3, scale * 0.08));
      targetCtx.beginPath();
      targetCtx.moveTo(Math.max(0, bandMinX), lambdaY);
      targetCtx.lineTo(Math.min(width, bandMaxX), lambdaY);
      targetCtx.stroke();

      targetCtx.font = '12px "franklingothic-book", Arial, sans-serif';
      targetCtx.fillStyle = colors.muted;
      targetCtx.textBaseline = 'middle';
      if (cellPxY >= 14) {
        targetCtx.textAlign = 'right';
        const labelX = this.screenX(Math.max(0, geometry.rawBounds.minX), xStep) - 8;
        const firstLevel = Math.max(1, Math.floor(geometry.totalLevels - viewBottom));
        const lastLevel = Math.min(geometry.totalLevels, Math.ceil(geometry.totalLevels - viewTop));
        for (let level = firstLevel; level <= lastLevel; level++) {
          const mid = this.modelYForLevel(level - 0.5);
          const y = this.screenY(mid);
          if (y < 12 || y > height - 12) continue;
          if (level <= geometry.M) {
            targetCtx.fillText('w' + sub(level), labelX, y);
          } else {
            const xIndex = geometry.N - (level - geometry.M) + 1;
            targetCtx.fillText('x' + sub(xIndex), labelX, y);
          }
        }
      } else if (cellPxY >= 5) {
        targetCtx.textAlign = 'left';
        targetCtx.fillText('x-stack', Math.max(8, bandMinX + 8), Math.max(16, (topY + middleY) / 2));
        targetCtx.fillText('lambda', Math.max(8, bandMinX + 8), lambdaY - 10);
        targetCtx.fillText('w-stack', Math.max(8, bandMinX + 8), Math.min(height - 16, (middleY + bottomY) / 2));
      }
    }

    drawBackground(size, xStep, colors) {
      const pixelW = Math.max(1, Math.round(size.width * size.dpr));
      const pixelH = Math.max(1, Math.round(size.height * size.dpr));
      const key = [
        pixelW,
        pixelH,
        size.dpr.toFixed(2),
        this.geometryVersion,
        this.viewport.scale.toFixed(4),
        this.viewport.tx.toFixed(4),
        this.viewport.ty.toFixed(4),
        xStep.toFixed(4),
        this.squareCells ? 'sq' : 'wide',
        colors.canvas,
      ].join('|');

      if (!this.backgroundCache || this.backgroundCacheKey !== key ||
          this.backgroundCache.width !== pixelW || this.backgroundCache.height !== pixelH) {
        this.backgroundCache = this.createLayer(pixelW, pixelH);
        this.backgroundCacheKey = key;
        const layerCtx = this.backgroundCache.getContext('2d');
        layerCtx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
        this.drawBackgroundLayer(layerCtx, size, xStep, colors);
      }

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.drawImage(this.backgroundCache, 0, 0);
    }

    tonalStroke(index, count, _colors) {
      const t = count <= 1 ? 0.5 : index / (count - 1);
      const alpha = Math.max(0.68, Math.min(0.96, 0.72 + 0.22 * t));
      // UVA navy from ColorSchemes: #232D4B.
      return `rgba(35,45,75,${alpha.toFixed(3)})`;
    }

    drawPaths(size, xStep, colors) {
      const geometry = this.geometry;
      if (!geometry) return;
      const ctx2d = this.ctx;
      const cellPx = Math.min(this.viewport.scale, this.viewport.scale * xStep);
      const drawAllParticles = cellPx >= 11;
      const drawSomeParticles = cellPx >= 5.5;
      const lineWidth = Math.max(0.1, Math.max(1.15, Math.min(3.2, cellPx * 0.14)) * this.pathWidthFactor);
      const legacyPalette = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
      ];

      ctx2d.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx2d.lineJoin = 'round';
      ctx2d.lineCap = 'round';

      for (const path of geometry.paths) {
        const color = this.pathStyle === 'legacy'
          ? legacyPalette[path.track % legacyPalette.length]
          : this.tonalStroke(path.track, Math.max(1, geometry.paths.length), colors);
        ctx2d.strokeStyle = color;
        ctx2d.lineWidth = lineWidth;
        ctx2d.setLineDash([]);
        ctx2d.beginPath();
        path.polyline.forEach((point, index) => {
          const x = this.screenX(point.x, xStep);
          const y = this.screenY(point.y);
          if (index === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        });
        ctx2d.stroke();

        if (path.endpoint) {
          const ex = this.screenX(path.endpoint.x, xStep);
          const ey = this.screenY(path.endpoint.y);
          const tail = Math.max(16, Math.min(54, this.viewport.scale * 1.8));
          ctx2d.strokeStyle = this.pathStyle === 'legacy' ? color : colors.orange;
          ctx2d.globalAlpha = this.pathStyle === 'legacy' ? 0.55 : 0.42;
          ctx2d.lineWidth = Math.max(1, lineWidth * 0.7);
          ctx2d.setLineDash([5, 5]);
          ctx2d.beginPath();
          ctx2d.moveTo(ex, ey);
          ctx2d.lineTo(ex + tail, ey);
          ctx2d.stroke();
          ctx2d.globalAlpha = 1;
          ctx2d.setLineDash([]);
        }
      }

      if (drawSomeParticles) {
        const particleRadius = Math.max(1.5, Math.min(4.4, cellPx * 0.18));
        for (const path of geometry.paths) {
          const color = this.pathStyle === 'legacy'
            ? legacyPalette[path.track % legacyPalette.length]
            : colors.navy;
          ctx2d.fillStyle = color;
          ctx2d.globalAlpha = this.pathStyle === 'legacy' ? 0.88 : 0.78;
          const particles = drawAllParticles
            ? path.particles
            : path.particles.filter(point => point.level === geometry.M || point === path.endpoint);
          for (const point of particles) {
            ctx2d.beginPath();
            ctx2d.arc(this.screenX(point.x, xStep), this.screenY(point.y), particleRadius, 0, 2 * Math.PI);
            ctx2d.fill();
          }
        }
        ctx2d.globalAlpha = 1;
      }

      const lambdaRadius = Math.max(2.5, Math.min(6.2, cellPx * 0.26));
      ctx2d.fillStyle = colors.lambda;
      ctx2d.strokeStyle = colors.canvas;
      ctx2d.lineWidth = Math.max(1.2, lambdaRadius * 0.36);
      for (const point of geometry.lambdaParticles) {
        const x = this.screenX(point.x, xStep);
        const y = this.screenY(point.y);
        ctx2d.beginPath();
        ctx2d.arc(x, y, lambdaRadius, 0, 2 * Math.PI);
        ctx2d.fill();
        ctx2d.stroke();
      }

      for (const path of geometry.paths) {
        if (!path.endpoint) continue;
        const x = this.screenX(path.endpoint.x, xStep);
        const y = this.screenY(path.endpoint.y);
        ctx2d.fillStyle = colors.canvas;
        ctx2d.strokeStyle = this.pathStyle === 'legacy'
          ? legacyPalette[path.track % legacyPalette.length]
          : colors.orange;
        ctx2d.lineWidth = Math.max(1.4, lineWidth * 0.9);
        ctx2d.beginPath();
        ctx2d.arc(x, y, Math.max(2.4, lambdaRadius * 0.82), 0, 2 * Math.PI);
        ctx2d.fill();
        ctx2d.stroke();
      }
    }

    lozengeModelPoint(x, y) {
      // Use the same y-down model-coordinate convention as the path renderer:
      // screenY(modelY) = (modelY - viewport.ty) * scale.
      //
      // Therefore do NOT negate y here.  The raw lozenge row order is
      //
      //   lam[0], lam[1], ..., lam[n] = lambda = mu[M],
      //   mu[M-1], ..., mu[0],
      //
      // and increasing raw y should move downward on the canvas.
      return { x: x + y / 2, y: 0.85 * y };
    }

    lozengePolygon(kind, x, y) {
      let raw;
      if (kind === 'vertical') {
        raw = [
          [x - 0.5, y],
          [x - 0.5, y + 1],
          [x + 0.5, y],
          [x + 0.5, y - 1],
        ];
      } else if (kind === 's') {
        raw = [
          [x - 0.5, y],
          [x - 0.5, y + 1],
          [x + 0.5, y + 1],
          [x + 0.5, y],
        ];
      } else {
        raw = [
          [x - 0.5, y],
          [x - 1.5, y + 1],
          [x - 0.5, y + 1],
          [x + 0.5, y],
        ];
      }
      return raw.map(([px, py]) => this.lozengeModelPoint(px, py));
    }

    lozengeScreenPoint(point) {
      return {
        x: (point.x - this.viewport.tx) * this.viewport.scale,
        y: (point.y - this.viewport.ty) * this.viewport.scale,
      };
    }

    drawLozengePolygon(ctx2d, kind, x, y, fill, stroke, lineWidth = 1, options = {}) {
      const vertices = this.lozengePolygon(kind, x, y).map(v => this.lozengeScreenPoint(v));
      if (!vertices.length) return;

      ctx2d.beginPath();
      ctx2d.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) ctx2d.lineTo(vertices[i].x, vertices[i].y);
      ctx2d.closePath();

      // Opaque fill.
      ctx2d.fillStyle = fill;
      ctx2d.fill();

      // Same-color seam stroke.  This seals subpixel anti-aliasing cracks
      // without changing the mathematical polygon coordinates.
      const defaultSeal = Math.max(0.45, Math.min(1.15, lineWidth || 0.6));
      const sealWidth = Number.isFinite(options.sealWidth) ? options.sealWidth : defaultSeal;
      if (sealWidth > 0) {
        ctx2d.strokeStyle = fill;
        ctx2d.lineWidth = sealWidth;
        ctx2d.stroke();
      }

      // Optional visible grid/stroke.
      if (stroke && lineWidth > 0) {
        ctx2d.strokeStyle = stroke;
        ctx2d.lineWidth = lineWidth;
        ctx2d.stroke();
      }
    }

    lozengeTileVisible(kind, x, y, view) {
      const pts = this.lozengePolygon(kind, x, y);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of pts) {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      }
      return maxX >= view.left && minX <= view.right && maxY >= view.top && minY <= view.bottom;
    }

    blueLozengeConflictsWithVertical(tx, strip) {
      // The strip is between the upper particle row `prev` and
      // the lower particle row `curr`.
      //
      // A blue s(tx,y) lozenge consists of the two elementary triangles
      // adjacent to the same horizontal position tx.  If either adjacent
      // particle row has a vertical/orange lozenge centered at tx, then
      // s(tx,y) shares a triangle with that vertical lozenge.  Drawing it
      // produces the visible extra blue triangles next to orange lozenges.
      //
      // In that case we leave the pale base layer visible instead.
      const prevSet = strip.prevSet || new Set(strip.prev || []);
      const currSet = strip.currSet || new Set(strip.curr || []);
      return prevSet.has(tx) || currSet.has(tx);
    }

    countCentersAtMost(centers, x) {
      let lo = 0;
      let hi = centers.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (centers[mid] <= x) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    }

    drawLozenges(size, _xStep, colors) {
      const geometry = this.geometry;
      if (!geometry) return;

      const rows = geometry.lozengeRows || [];
      const ctx2d = this.ctx;
      const scale = this.viewport.scale || 1;

      const view = {
        left: this.viewport.tx,
        right: this.viewport.tx + size.width / scale,
        top: this.viewport.ty,
        bottom: this.viewport.ty + size.height / scale,
      };

      const cellPx = scale;
      const stroke = cellPx >= 8 ? colors.lozengeStroke : '';
      const strongStroke = cellPx >= 4 ? (stroke || colors.lozengeStroke) : '';
      const lineWidth = Math.max(0.45, Math.min(1.15, cellPx * 0.03));
      const tileSealWidth = Math.max(0.45, Math.min(1.15, cellPx * 0.035));
      const verticalSealWidth = Math.max(0.9, Math.min(2.0, cellPx * 0.07));

      ctx2d.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);

      // Flat lozenge rendering: no alpha, no shadows, no compositing tricks.
      ctx2d.globalAlpha = 1;
      ctx2d.globalCompositeOperation = 'source-over';
      ctx2d.shadowColor = 'rgba(0,0,0,0)';
      ctx2d.shadowBlur = 0;
      ctx2d.shadowOffsetX = 0;
      ctx2d.shadowOffsetY = 0;
      ctx2d.lineJoin = 'bevel';
      ctx2d.lineCap = 'butt';

      ctx2d.fillStyle = colors.canvas;
      ctx2d.fillRect(0, 0, size.width, size.height);

      const globalMaxX = Number.isFinite(geometry.lozengeMaxCenter)
        ? Math.ceil(geometry.lozengeMaxCenter)
        : -1;

      const stripWindows = [];
      let estimatedFill = 0;

      for (let k = 1; k < rows.length; k++) {
        const prev = rows[k - 1].centers || [];
        const curr = rows[k].centers || [];
        const y = k - 1;
        const rank = Math.max(1, rows[k].rank || k);

        const domainMinX = -rank;
        const domainMaxX = globalMaxX;

        const visibleMinX = Math.floor(view.left - y / 2) - 3;
        const visibleMaxX = Math.ceil(view.right - y / 2) + 3;

        const minX = Math.max(domainMinX, visibleMinX);
        const maxX = Math.min(domainMaxX, visibleMaxX);
        if (maxX < minX) continue;

        stripWindows.push({
          rank,
          y,
          minX,
          maxX,
          prev,
          curr,
          prevSet: new Set(prev),
          currSet: new Set(curr),
        });
        estimatedFill += maxX - minX + 1;
      }

      const drawFill = cellPx >= 3.5 && estimatedFill <= 70000;

      if (drawFill) {
        const lightTiles = [];
        const blueTiles = [];

        for (const strip of stripWindows) {
          for (let x = strip.minX; x <= strip.maxX; x++) {
            const tx = x + 1;

            // First build the pale base layer.  This is deliberately NOT in an
            // `else` branch.  The pale layer must exist even under candidate blue
            // cells, because some candidate blue cells are forbidden near orange
            // vertical lozenges.  If we skip those blue cells without a pale base,
            // white triangular holes appear.
            if (x + strip.rank > 0) {
              if (this.lozengeTileVisible('l', tx, strip.y, view)) {
                lightTiles.push({ kind: 'l', x: tx, y: strip.y });
              }
            }

            const delta =
              this.countCentersAtMost(strip.curr, x) -
              this.countCentersAtMost(strip.prev, x);

            if (delta === 1) {
              // Candidate blue orientation.  Do not draw it when it shares an
              // elementary triangle with an orange vertical lozenge in either
              // adjacent particle row.
              if (this.blueLozengeConflictsWithVertical(tx, strip)) continue;
              if (!this.lozengeTileVisible('s', tx, strip.y, view)) continue;
              blueTiles.push({ kind: 's', x: tx, y: strip.y });
            }
          }
        }

        // Draw pale base orientation first.
        for (const tile of lightTiles) {
          this.drawLozengePolygon(
            ctx2d,
            tile.kind,
            tile.x,
            tile.y,
            colors.lozengeB,
            stroke,
            lineWidth,
            { sealWidth: tileSealWidth }
          );
        }

        // Draw blue orientation second.
        for (const tile of blueTiles) {
          this.drawLozengePolygon(
            ctx2d,
            tile.kind,
            tile.x,
            tile.y,
            colors.lozengeA,
            stroke,
            lineWidth,
            { sealWidth: tileSealWidth }
          );
        }
      }

      // Draw orange vertical lozenges last.  These are the particle lozenges.
      // The slightly larger same-color seam stroke covers anti-aliased slivers
      // from the opaque nonvertical layers underneath, but does not change data.
      let drawnVertical = 0;
      const maxVertical = cellPx >= 3.5 ? 120000 : 45000;

      for (let y = 1; y < rows.length; y++) {
        const row = rows[y];
        for (const center of row.centers || []) {
          if (!this.lozengeTileVisible('vertical', center, y, view)) continue;

          this.drawLozengePolygon(
            ctx2d,
            'vertical',
            center,
            y,
            colors.lozengeParticle,
            strongStroke,
            lineWidth,
            { sealWidth: verticalSealWidth }
          );

          drawnVertical += 1;
          if (drawnVertical >= maxVertical) break;
        }
        if (drawnVertical >= maxVertical) break;
      }

      ctx2d.globalAlpha = 1;
      ctx2d.globalCompositeOperation = 'source-over';

      if (!drawFill && cellPx >= 2.5) {
        ctx2d.font = '12px "franklingothic-book", Arial, sans-serif';
        ctx2d.fillStyle = colors.muted;
        ctx2d.textAlign = 'left';
        ctx2d.textBaseline = 'top';
        ctx2d.fillText('zoom in for filled lozenges', 12, 42);
      }
    }

    updateViewbar() {
      if (!this.viewbar) return;
      const zoomPercent = (this.viewport.scale / Math.max(0.001, this.baseScale)) * 100;
      const percent = zoomPercent >= 10
        ? String(Math.round(zoomPercent))
        : zoomPercent >= 1
          ? zoomPercent.toFixed(1)
          : zoomPercent >= 0.01
            ? zoomPercent.toFixed(2)
            : zoomPercent.toExponential(1);
      const style = this.pathStyle === 'legacy' ? 'legacy paths' : 'paths';
      this.viewbar.textContent = `zoom ${percent}% · ${style}`;
    }

    renderNow() {
      if (!this.canvas || !this.ctx || !this.geometry) return;
      this.viewMode = 'paths';
      const size = this.setupHiDpi();
      this.ensureView(size.width, size.height);
      const colors = this.theme();
      const xStep = this.xStep(size.width);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawBackground(size, xStep, colors);
      this.drawPaths(size, xStep, colors);
      this.updateViewbar();
    }

    scheduleDraw() {
      if (this.framePending) return;
      this.framePending = true;
      const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 16));
      schedule(() => {
        this.framePending = false;
        this.renderNow();
      });
    }
  }

  function syncRendererData() {
    if (!pathRenderer) return;
    pathRenderer.setBaseScale(getDesiredCellSize());
    pathRenderer.setSquareCells(isSquareCells());
    pathRenderer.setAspectRatio(getXAspectRatio());
    pathRenderer.setPathWidthFactor(getPathWidthFactor());
    pathRenderer.setPathStyle(getPathStyle());
    pathRenderer.setData({
      version: renderDataVersion,
      N,
      M,
      mu,
      lam,
      lambda: mu[M] || [],
      stats,
    });
  }

  function invalidateRender(options = {}) {
    if (options.resetView && pathRenderer) pathRenderer.viewInitialized = false;
    if (renderScheduled) return;
    renderScheduled = true;
    const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 16));
    schedule(() => {
      renderScheduled = false;
      draw();
    });
  }

  function draw() {
    syncRendererData();
    pathRenderer?.renderNow();
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  function attachCanvasEvents() {
    // Pointer, wheel, and pinch handling is owned by FactorialPathCanvasRenderer.
  }

  function attachUiEvents() {
    const presetSelect = $('fs-preset-select');
    const presetApply = $('fs-preset-apply');
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        if (presetSelect.value === 'custom') {
          currentPresetKey = 'custom';
          updatePresetDescription('custom');
          applyParamsFromInputs();
        } else {
          applyPreset(presetSelect.value);
        }
      });
    }
    if (presetApply) {
      presetApply.addEventListener('click', () => {
        applyPreset($('fs-preset-select')?.value || currentPresetKey);
      });
    }

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
      N = clampInt($('fs-N').value, 1, 1000);
      M = clampInt($('fs-M').value, 1, 1000);
      $('fs-N').value = String(N);
      $('fs-M').value = String(M);
      applyParamsFromInputs();
      resetFrozen();
    });
    $('fs-reset-btn').addEventListener('click', () => {
      terminateActiveWorker('Active sample canceled by reset.', { className: 'fs-note warn' });
      applyParamsFromInputs();
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
      if (el) el.addEventListener('change', () => {
        markCustomPreset();
        applyParamsFromInputs();
      });
    }

    for (const id of ['fs-N', 'fs-M']) {
      const el = $(id);
      if (el) el.addEventListener('change', () => markCustomPreset());
    }

    const capEl = $('fs-max-cols');
    if (capEl) {
      capEl.addEventListener('change', () => {
        markCustomPreset();
        applyParamsFromInputs();
      });
    }

    const scaleEl = $('fs-scale');
    const scaleValEl = $('fs-scale-val');
    if (scaleEl) {
      const onScaleChange = () => {
        if (scaleValEl) scaleValEl.textContent = scaleEl.value + 'px';
        pathRenderer?.setBaseScale(getDesiredCellSize());
        invalidateRender();
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
        pathRenderer?.setBaseScale(fitted);
        pathRenderer?.fit();
      });
    }
    const square = $('fs-square-cells');
    if (square) square.addEventListener('change', () => {
      syncAspectControls();
      pathRenderer?.setSquareCells(isSquareCells());
      pathRenderer?.fit();
    });

    const aspectEl = $('fs-x-aspect');
    if (aspectEl) aspectEl.addEventListener('change', () => {
      pathRenderer?.setAspectRatio(getXAspectRatio());
      pathRenderer?.fit();
    });

    const pathWidthEl = $('fs-path-width');
    if (pathWidthEl) {
      const onPathWidthChange = () => {
        pathRenderer?.setPathWidthFactor(getPathWidthFactor());
        invalidateRender();
      };
      pathWidthEl.addEventListener('input', onPathWidthChange);
      pathWidthEl.addEventListener('change', onPathWidthChange);
    }

    $('fs-view-fit')?.addEventListener('click', () => pathRenderer?.fit());
    $('fs-view-actual')?.addEventListener('click', () => pathRenderer?.setActualSize());
    $('fs-view-zoom-in')?.addEventListener('click', () => pathRenderer?.zoomBy(1.25));
    $('fs-view-zoom-out')?.addEventListener('click', () => pathRenderer?.zoomBy(0.8));
    $('fs-path-style')?.addEventListener('change', () => {
      pathRenderer?.setPathStyle(getPathStyle());
      invalidateRender();
    });

    window.addEventListener('resize', () => {
      pathRenderer?.fit();
    });
  }

  function init() {
    N = clampInt($('fs-N').value, 1, 1000);
    M = clampInt($('fs-M').value, 1, 1000);
    $('fs-N').value = String(N);
    $('fs-M').value = String(M);
    pathRenderer = new FactorialPathCanvasRenderer(canvas, { viewbar: $('fs-viewbar') });
    attachCanvasEvents();
    attachUiEvents();
    updatePresetDescription(currentPresetKey);
    syncScaleLabel();
    syncAspectControls();
    applyParamsFromInputs();
    resetFrozen();

    window.factorialExactSamplerSample = sampleOnce;
    window.factorialExactSamplerState = () => ({ N, M, xArr, wArr, mu, lam, stats, rows, levels, runState, activeRequestId });
    window.factorialYBERenderer = pathRenderer;
    window.factorialYBEReferenceSample = runReferenceSample;
    window.factorialYBEWorkerSample = sampleOnceWithWorker;
    window.factorialYBEValidateControls = applyParamsFromInputs;
    window.factorialYBEBenchmark = runBenchmark;
    window.factorialYBEApplyPreset = applyPreset;
    window.factorialYBEPresets = FACTORIAL_YBE_PRESETS;
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
