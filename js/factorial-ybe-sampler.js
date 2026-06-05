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
    const note = $('fs-validation-note');
    if (note) {
      note.textContent = message;
      note.className = 'fs-note err';
    }
    throw new Error(message);
  }

  function clearValidation(message) {
    const note = $('fs-validation-note');
    if (note) {
      note.textContent = message || '';
      note.className = message ? 'fs-note ok' : 'fs-note';
    }
  }

  // ---------------------------------------------------------------------------
  // Parameter parsing
  // ---------------------------------------------------------------------------

  function numericEnv() {
    return {
      q: parseFloat($('fs-q')?.value || '0.95'),
      alpha: parseFloat($('fs-alpha')?.value || '0.5'),
      beta: parseFloat($('fs-beta')?.value || '0'),
      gamma: parseFloat($('fs-gamma')?.value || '1.5'),
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

  function expandRepeatedPatterns(str) {
    return String(str).replace(/\(([^)]+)\)\^(\d+)/g, (m, pattern, count) => {
      const n = parseInt(count, 10);
      const vals = pattern.split(',').map(v => v.trim()).filter(Boolean);
      const out = [];
      for (let i = 0; i < n; i++) out.push(...vals);
      return out.join(',');
    });
  }

  function parseFiniteList(str) {
    const s = expandRepeatedPatterns(str);
    const out = [];
    for (const token of s.split(',')) {
      const tr = token.trim();
      if (!tr) continue;
      const rep = tr.match(/^([-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\^(\d+)$/);
      if (rep) {
        const value = Number(rep[1]);
        const count = parseInt(rep[2], 10);
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

  function parseArrayInput(input, len, label) {
    const str = String(input || '').trim();
    if (!str) throw new Error(`${label} is empty`);
    let arr;
    if (looksLikeExpression(str)) {
      const fn = compileExpression(str);
      arr = [];
      for (let i = 1; i <= len; i++) arr.push(evalExpression(fn, i));
    } else {
      arr = parseFiniteList(str);
      if (arr.length === 1 && len > 1) {
        arr = Array(len).fill(arr[0]);
      }
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
    const arr = parseFiniteList(str);
    for (const v of arr) {
      if (!Number.isFinite(v)) throw new Error('y contains a non-finite value');
    }
    return {
      kind: 'array',
      preview: arr.slice(0, Math.min(arr.length, 120)),
      value(k) {
        if (k <= 0) return 0;
        return k <= arr.length ? arr[k - 1] : 0;
      },
      length: arr.length,
    };
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
    try {
      xArr = parseArrayInput($('fs-x').value, N, 'x');
      wArr = parseArrayInput($('fs-w').value, M, 'w');
      ySpec = parseYInput($('fs-y').value);

      $('fs-x-note').textContent = `x: [${summarize(xArr)}]`;
      $('fs-w-note').textContent = `w: [${summarize(wArr)}]`;
      const ySummary = summarize(ySpec.preview || []);
      $('fs-y-note').textContent = ySpec.kind === 'expr'
        ? `y: expression, first values [${ySummary}]`
        : `y: [${ySummary}]${ySpec.length ? `  (length ${ySpec.length}; y_k=0 beyond this)` : ''}`;
      validateParameters();
      return true;
    } catch (e) {
      const note = $('fs-validation-note');
      if (note) {
        note.textContent = e.message;
        note.className = 'fs-note err';
      }
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
    $('fs-x').value = `0.5^${N}`;
    $('fs-w').value = `1^${M}`;
    $('fs-y').value = `0^${Math.max(120, 4 * (N + M))}`;
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
    let u = Math.random() * total;
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
    const columnCap = clampInt($('fs-max-cols')?.value || '20000', 100, 1000000);

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

  function rebuildMuLamFromLevels() {
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
    $('fs-lambda').textContent = lambda.length ? `(${lambda.join(', ')})` : '∅';
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
    stats.elapsedMs = 0;
    $('fs-lambda').textContent = '∅';
    refreshStats();
    draw();
  }

  function sampleOnce() {
    if (!applyParamsFromInputs()) return false;
    const t0 = performance.now();
    stats.rowSwaps = 0;
    stats.localMoves = 0;
    stats.randomChoices = 0;
    try {
      sampleRows();
      rebuildMuLamFromLevels();
      stats.samples += 1;
      stats.elapsedMs = performance.now() - t0;
      refreshStats();
      draw();
      return true;
    } catch (e) {
      const note = $('fs-validation-note');
      if (note) {
        note.textContent = e.message;
        note.className = 'fs-note err';
      }
      console.error(e);
      return false;
    }
  }

  function sampleMany(count) {
    let ok = true;
    for (let i = 0; i < count; i++) {
      ok = sampleOnce();
      if (!ok) break;
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
      applyQSpecToInputs();
      resetFrozen();
    });
    $('fs-uniform-btn').addEventListener('click', () => {
      applySafeConstantsToInputs();
      resetFrozen();
    });
    $('fs-resize-btn').addEventListener('click', () => {
      N = clampInt($('fs-N').value, 1, 120);
      M = clampInt($('fs-M').value, 1, 120);
      $('fs-N').value = String(N);
      $('fs-M').value = String(M);
      applyParamsFromInputs();
      viewInitialized = false;
      resetFrozen();
    });
    $('fs-reset-btn').addEventListener('click', () => {
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
    window.factorialExactSamplerState = () => ({ N, M, xArr, wArr, mu, lam, stats, rows, levels });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
