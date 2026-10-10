/*
 * SL4 webs from 4-row rectangular standard Young tableaux.
 *
 * - uniform random r x c SYT via the Greene-Nijenhuis-Wilf hook walk
 * - promotion permutations prom_1..prom_{r-1} via first balance points
 *   (Gaetz-Pechenik-Pfannerer-Striker-Swanson, "Promotion permutations for tableaux")
 * - the growth algorithm of GPPSS, "Rotation-invariant web bases from hourglass
 *   plabic graphs", arXiv:2306.12501, Algorithm 5.1 with the rules of Figure 24
 *   (short rules transcribed from the authors' verification notebook)
 * - conversion of the symmetrized six-vertex configuration to an hourglass plabic graph
 * - trip permutations trip_1, trip_2, trip_3
 * - harmonic (Tutte) layout in the disk
 *
 * Conventions. Labels are signed integers in {+-1,...,+-4}; positive strands point down
 * (into the disk), negative strands point up. Slots of a crossing are numbered clockwise on
 * screen (y axis pointing down): 0 = top-left, 1 = top-right, 2 = bottom-right,
 * 3 = bottom-left. Boundary vertices b_1..b_n sit left to right on top, which is clockwise
 * around the disk below them. An endpoint is node * 4 + slot.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SL4Webs = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- hook walk ----------

  // Uniform SYT of rectangular shape r x c. Returns the lattice word: word[k-1] = row of k.
  function sampleRectSYT(r, c, rng) {
    const n = r * c;
    const lam = new Int32Array(r).fill(c);
    const word = new Int8Array(n);
    for (let m = n; m >= 1; m--) {
      let t = Math.floor(rng() * m);
      let i = 0;
      while (t >= lam[i]) { t -= lam[i]; i++; }
      let j = t;
      for (;;) {
        const arm = lam[i] - j - 1;
        let leg = 0;
        for (let k = i + 1; k < r && lam[k] > j; k++) leg++;
        const h = arm + leg;
        if (h === 0) break;
        const s = Math.floor(rng() * h);
        if (s < arm) j += 1 + s; else i += 1 + (s - arm);
      }
      word[m - 1] = i + 1;
      lam[i]--;
    }
    return word;
  }

  // Returns null if word is the lattice word of a rectangular r-row SYT, else a message.
  function validateWord(word, r) {
    const cnt = new Int32Array(r + 2);
    for (let k = 0; k < word.length; k++) {
      const a = word[k];
      if (!(a >= 1 && a <= r)) return 'letters must be 1..' + r;
      cnt[a]++;
      if (a > 1 && cnt[a] > cnt[a - 1]) return 'not a lattice word (prefix ' + (k + 1) + ')';
    }
    for (let a = 2; a <= r; a++) if (cnt[a] !== cnt[1]) return 'not rectangular (unequal row lengths)';
    if (word.length === 0) return 'empty word';
    return null;
  }

  function wordToTableau(word, r) {
    const rows = [];
    for (let i = 0; i < r; i++) rows.push([]);
    for (let k = 0; k < word.length; k++) rows[word[k] - 1].push(k + 1);
    return rows;
  }

  // ---------- promotion ----------

  // First balance points j_1 <= ... <= j_{r-1} (0-indexed positions) of a standard
  // rectangular lattice word; js[0] = 0.
  function balancePoints(w, r, js, cnt) {
    cnt.fill(0);
    js[0] = 0;
    let level = 1;
    for (let k = 0; k < w.length && level < r; k++) {
      cnt[w[k]]++;
      while (level < r && k >= js[level - 1] && cnt[level] === cnt[level + 1]) {
        js[level] = k;
        level++;
      }
    }
    if (level < r) throw new Error('balance point not found: word is not balanced');
  }

  function promoteWord(word, r) {
    const n = word.length;
    const js = new Int32Array(r), cnt = new Int32Array(r + 2);
    balancePoints(word, r, js, cnt);
    const w = Int8Array.from(word);
    for (let i = 1; i < r; i++) w[js[i]]--;
    const out = new Int8Array(n);
    out.set(w.subarray(1));
    out[n - 1] = r;
    return out;
  }

  // prom[i-1][b] = prom_i(b+1) - 1  (0-indexed), i = 1..r-1.
  function promotionPermutations(word, r) {
    const n = word.length;
    const perms = [];
    for (let i = 1; i < r; i++) perms.push(new Int32Array(n));
    const js = new Int32Array(r), cnt = new Int32Array(r + 2);
    // w holds the current promotion P^b(T) in buf[off .. off+n-1]
    const buf = new Int8Array(2 * n);
    buf.set(word);
    let off = 0;
    for (let b = 0; b < n; b++) {
      const w = buf.subarray(off, off + n);
      balancePoints(w, r, js, cnt);
      for (let i = 1; i < r; i++) perms[i - 1][b] = (js[i] + b) % n;
      for (let i = 1; i < r; i++) w[js[i]]--;
      buf[off + n] = r;
      off++;
      if (off === n) { buf.copyWithin(0, n, 2 * n); off = 0; }
    }
    return perms;
  }

  function inversePerm(p) {
    const q = new Int32Array(p.length);
    for (let i = 0; i < p.length; i++) q[p[i]] = i;
    return q;
  }

  // ---------- growth rules (arXiv:2306.12501, Fig. 24) ----------

  // Short rules from the authors' notebook github.com/Hourglass-Plabic-Graphs/sl4-web-basis:
  // [top, bottom, offset of the crossing inside the rule] ; length-2 rules have offset 0.
  const SHORT_RULES = [
    [[1, -2], [-2, 1], 0], [[2, -1], [-1, 2], 0], [[-3, 4], [4, -3], 0], [[-4, 3], [3, -4], 0],
    [[2, -2], [-1, 1], 0], [[-3, 3], [4, -4], 0],

    [[1, -3, -1], [-3, 1, -1], 0], [[1, -3, 2], [-3, 1, 2], 0],
    [[1, 3, -1], [1, -1, 3], 1], [[-2, 3, -1], [-2, -1, 3], 1],
    [[-4, -2, 4], [-4, 4, -2], 1], [[3, -2, 4], [3, 4, -2], 1],
    [[-4, 2, 4], [2, -4, 4], 0], [[-4, 2, -3], [2, -4, -3], 0],

    [[1, 2, -1], [2, 1, -1], 0], [[1, 2, 2], [2, 1, 2], 0],
    [[1, -2, -1], [1, -1, -2], 1], [[-2, -2, -1], [-2, -1, -2], 1],
    [[-4, 3, 4], [-4, 4, 3], 1], [[3, 3, 4], [3, 4, 3], 1],
    [[-4, -3, 4], [-3, -4, 4], 0], [[-4, -3, -3], [-3, -4, -3], 0],

    [[1, 3, -1], [3, 1, -1], 0], [[1, 3, 2], [3, 1, 2], 0], [[1, 3, 3], [3, 1, 3], 0],
    [[1, -3, -1], [1, -1, -3], 1], [[-2, -3, -1], [-2, -1, -3], 1], [[-3, -3, -1], [-3, -1, -3], 1],
    [[-4, 2, 4], [-4, 4, 2], 1], [[3, 2, 4], [3, 4, 2], 1], [[2, 2, 4], [2, 4, 2], 1],
    [[-4, -2, 4], [-2, -4, 4], 0], [[-4, -2, -3], [-2, -4, -3], 0], [[-4, -2, -2], [-2, -4, -2], 0],

    [[1, 4, -1], [4, 1, -1], 0], [[1, 4, 2], [4, 1, 2], 0], [[1, 4, 3], [4, 1, 3], 0], [[1, 4, 4], [4, 1, 4], 0],
    [[1, -4, -1], [1, -1, -4], 1], [[-2, -4, -1], [-2, -1, -4], 1],
    [[-3, -4, -1], [-3, -1, -4], 1], [[-4, -4, -1], [-4, -1, -4], 1],
    [[-4, 1, 4], [-4, 4, 1], 1], [[3, 1, 4], [3, 4, 1], 1], [[2, 1, 4], [2, 4, 1], 1], [[1, 1, 4], [1, 4, 1], 1],
    [[-4, -1, 4], [-1, -4, 4], 0], [[-4, -1, -3], [-1, -4, -3], 0],
    [[-4, -1, -2], [-1, -4, -2], 0], [[-4, -1, -1], [-1, -4, -1], 0],

    [[1, 2, -3], [-3, -4, -3], 0], [[1, 2, 4], [-3, -4, 4], 0],
    [[3, -2, -1], [3, 4, 3], 1], [[-4, -2, -1], [-4, 4, 3], 1],
    [[-2, 3, 4], [-2, -1, -2], 1], [[1, 3, 4], [1, -1, -2], 1],
    [[-4, -3, 2], [2, 1, 2], 0], [[-4, -3, -1], [2, 1, -1], 0],

    [[1, 3, -2], [-2, -4, -2], 0], [[1, 3, -3], [-2, -4, -3], 0], [[1, 3, 4], [-2, -4, 4], 0],
    [[2, -3, -1], [2, 4, 2], 1], [[3, -3, -1], [3, 4, 2], 1], [[-4, -3, -1], [-4, 4, 2], 1],
    [[-3, 2, 4], [-3, -1, -3], 1], [[-2, 2, 4], [-2, -1, -3], 1], [[1, 2, 4], [1, -1, -3], 1],
    [[-4, -2, 3], [3, 1, 3], 0], [[-4, -2, 2], [3, 1, 2], 0], [[-4, -2, -1], [3, 1, -1], 0],

    [[2, 3, -1], [-1, -4, -1], 0], [[2, 3, -2], [-1, -4, -2], 0],
    [[2, 3, -3], [-1, -4, -3], 0], [[2, 3, 4], [-1, -4, 4], 0],
    [[1, -3, -2], [1, 4, 1], 1], [[2, -3, -2], [2, 4, 1], 1],
    [[3, -3, -2], [3, 4, 1], 1], [[-4, -3, -2], [-4, 4, 1], 1],
    [[-4, 2, 3], [-4, -1, -4], 1], [[-3, 2, 3], [-3, -1, -4], 1],
    [[-2, 2, 3], [-2, -1, -4], 1], [[1, 2, 3], [1, -1, -4], 1],
    [[-3, -2, 4], [4, 1, 4], 0], [[-3, -2, 3], [4, 1, 3], 0],
    [[-3, -2, 2], [4, 1, 2], 0], [[-3, -2, -1], [4, 1, -1], 0],
  ];

  // Long rules (two families and their images under tau, epsilon, varpi):
  //   1 4 x^k w -> 4 1 x^k w,  x in {2bar,3bar}, w in {1bar,2,3,4}, and
  //   2 3 x^k w -> 1bar 4bar x^k w,  x in {2,3}, w in {1bar,2bar,3bar,4}.
  // side 'R': crossing first, witnesses to the right; side 'L': witnesses to the left.
  const LONG_RULES = [
    { side: 'R', top: [1, 4], bot: [4, 1], star: [-2, -3], wit: [-1, 2, 3, 4] },
    { side: 'L', top: [-4, -1], bot: [-1, -4], star: [2, 3], wit: [1, -2, -3, -4] },
    { side: 'L', top: [1, 4], bot: [4, 1], star: [-3, -2], wit: [-4, 3, 2, 1] },
    { side: 'R', top: [-4, -1], bot: [-1, -4], star: [3, 2], wit: [4, -3, -2, -1] },
    { side: 'R', top: [2, 3], bot: [-1, -4], star: [2, 3], wit: [-1, -2, -3, 4] },
    { side: 'L', top: [-3, -2], bot: [4, 1], star: [-2, -3], wit: [1, 2, 3, -4] },
    { side: 'L', top: [2, 3], bot: [-1, -4], star: [3, 2], wit: [-4, -3, -2, 1] },
    { side: 'R', top: [-3, -2], bot: [4, 1], star: [-3, -2], wit: [4, 3, 2, -1] },
  ];

  const li = (a) => a + 4;            // label -> 0..8 (index 4 unused)
  const key2 = (a, b) => li(a) * 9 + li(b);
  const key3 = (a, b, c) => (li(a) * 9 + li(b)) * 9 + li(c);

  const CAPS = new Uint8Array(81);
  CAPS[key2(1, -1)] = 1;
  CAPS[key2(-4, 4)] = 1;
  const X2 = new Array(81).fill(null);       // crossing (a,b) -> [c,d]
  const XR = new Array(729).fill(null);      // crossing (a,b) with right witness w, key3(a,b,w)
  const XL = new Array(729).fill(null);      // left witness w then crossing (a,b), key3(w,a,b)
  for (const [top, bot, off] of SHORT_RULES) {
    if (top.length === 2) {
      X2[key2(top[0], top[1])] = [bot[0], bot[1]];
    } else if (off === 0) {
      const k = key3(top[0], top[1], top[2]);
      if (XR[k] === null) XR[k] = [bot[0], bot[1]];
    } else {
      const k = key3(top[0], top[1], top[2]);
      if (XL[k] === null) XL[k] = [bot[1], bot[2]];
    }
  }
  const LONG_BY_PAIR = { R: new Array(81).fill(null), L: new Array(81).fill(null) };
  for (const rule of LONG_RULES) {
    const r = {
      bot: rule.bot,
      star: new Uint8Array(9), wit: new Uint8Array(9),
    };
    for (const s of rule.star) r.star[li(s)] = 1;
    for (const s of rule.wit) r.wit[li(s)] = 1;
    LONG_BY_PAIR[rule.side][key2(rule.top[0], rule.top[1])] = r;
  }

  // Vertex types of the symmetrized six-vertex configuration.
  const SINK = 0, SOURCE = 1, TRANS = 2;

  /*
   * Growth algorithm. Input: lattice word (letters 1..4). Output: a symmetrized six-vertex
   * configuration with growth labeling, plus the growth geometry.
   *   opts.recordRounds: keep the dangling word after every round (for step-through)
   */
  function grow(word, opts) {
    opts = opts || {};
    const n = word.length;
    const maxRounds = opts.maxRounds || (20 * n * n + 100);

    // edges
    const eu = [], ev = [], elab = [], edir = [], epts = [];
    // crossings: slots[4 * x + s] = edge index, xpos/ypos geometry, xtype
    const xslotEdge = [], xpos = [], ypos = [], xround = [], xrule = [];
    // dangling strands: {lab, start (endpoint), pts}
    let cur = [];
    for (let i = 0; i < n; i++) {
      cur.push({ lab: word[i], start: i * 4, pts: [i - (n - 1) / 2, 0] });
    }
    const roundWords = opts.recordRounds ? [cur.map((s) => s.lab)] : null;
    const roundEvents = opts.recordRounds ? [] : null;
    const roundX = opts.recordRounds ? [cur.map((s) => s.pts[0])] : null;

    function closeEdge(strand, endEp, lab, extraPts) {
      const e = eu.length;
      // positive label: oriented from the strand start (above) to the end (below)
      eu.push(strand.start);
      ev.push(endEp);
      elab.push(Math.abs(lab));
      edir.push(lab > 0 ? 1 : -1);
      const pts = strand.pts.slice();
      if (extraPts) for (const p of extraPts) pts.push(p);
      epts.push(pts);
      return e;
    }

    let round = 0;
    while (cur.length > 0) {
      if (round >= maxRounds) throw new Error('growth did not terminate');
      const L = cur.length;
      const y0 = round, ym = round + 0.5, y1 = round + 1;
      const next = [];
      // events: {type:'x'|'cap', inIdx: k, outIdx: index in next}
      const events = [];
      let p = 0;
      while (p < L) {
        let applied = false;
        if (p + 1 < L) {
          const A = cur[p], B = cur[p + 1];
          const a = A.lab, b = B.lab;
          let bot = null, rule = null;
          if (CAPS[key2(a, b)]) {
            rule = 'cap';
          } else if (X2[key2(a, b)]) {
            bot = X2[key2(a, b)]; rule = 'x2';
          } else if (p + 2 < L && XR[key3(a, b, cur[p + 2].lab)]) {
            bot = XR[key3(a, b, cur[p + 2].lab)]; rule = 'xr';
          } else if (next.length > 0 && XL[key3(next[next.length - 1].lab, a, b)]) {
            bot = XL[key3(next[next.length - 1].lab, a, b)]; rule = 'xl';
          } else {
            const lr = LONG_BY_PAIR.R[key2(a, b)];
            if (lr) {
              let q = p + 2;
              while (q < L && lr.star[li(cur[q].lab)]) q++;
              if (q < L && lr.wit[li(cur[q].lab)]) { bot = lr.bot; rule = 'longR'; }
            }
            if (!bot) {
              const ll = LONG_BY_PAIR.L[key2(a, b)];
              if (ll) {
                let q = next.length - 1;
                while (q >= 0 && ll.star[li(next[q].lab)]) q--;
                if (q >= 0 && ll.wit[li(next[q].lab)]) { bot = ll.bot; rule = 'longL'; }
              }
            }
          }
          if (rule === 'cap') {
            const xa = A.pts[A.pts.length - 2], xb = B.pts[B.pts.length - 2];
            const capPts = [xa, y0, xa, ym, (xa + xb) / 2, ym + 0.2, xb, ym, xb, y0];
            // merge into one edge from A.start to B.start; the flow runs along a positive strand
            const e = eu.length;
            const pts = A.pts.slice();
            for (let t = 2; t < capPts.length; t += 2) pts.push(capPts[t], capPts[t + 1]);
            const bp = B.pts;
            for (let t = bp.length - 4; t >= 0; t -= 2) pts.push(bp[t], bp[t + 1]);
            eu.push(A.start); ev.push(B.start);
            elab.push(Math.abs(a));
            edir.push(a > 0 ? 1 : -1);
            epts.push(pts);
            events.push({ type: 'cap', k: p, lab: [a, b], e });
            p += 2;
            applied = true;
          } else if (bot) {
            const xa = A.pts[A.pts.length - 2], xb = B.pts[B.pts.length - 2];
            const xm = (xa + xb) / 2;
            const x = xpos.length;
            const node = n + x;
            xpos.push(xm); ypos.push(ym); xround.push(round); xrule.push([a, b, bot[0], bot[1], rule]);
            const e0 = closeEdge(A, node * 4 + 0, a, [xm, ym]);
            const e1 = closeEdge(B, node * 4 + 1, b, [xm, ym]);
            xslotEdge.push(e0, e1, -1, -1);
            next.push({ lab: bot[0], start: node * 4 + 3, pts: [xm, ym], x });
            next.push({ lab: bot[1], start: node * 4 + 2, pts: [xm, ym], x });
            events.push({ type: 'x', k: p, out: next.length - 2, lab: [a, b, bot[0], bot[1]], rule, x });
            p += 2;
            applied = true;
          }
        }
        if (!applied) {
          const S = cur[p];
          next.push({ lab: S.lab, start: S.start, pts: S.pts });
          p += 1;
        }
      }
      if (events.length === 0) throw new Error('no growth rule applies (round ' + round + ')');
      // respace the new dangling strands
      const L2 = next.length;
      for (let k = 0; k < L2; k++) {
        const xNew = k - (L2 - 1) / 2;
        const S = next[k];
        const pts = (S.x !== undefined) ? S.pts : S.pts.slice();
        if (S.x === undefined) {
          // straight strand: add the point at mid-round only if it bends
          const xOld = pts[pts.length - 2];
          if (pts[pts.length - 1] < y0) pts.push(xOld, y0);
        }
        pts.push(xNew, y1);
        next[k] = { lab: S.lab, start: S.start, pts };
      }
      // fix up the bottom slots of the new crossings' edges later, when they close
      cur = next;
      round++;
      if (roundWords) {
        roundWords.push(cur.map((s) => s.lab));
        roundEvents.push(events);
        roundX.push(cur.map((s) => s.pts[s.pts.length - 2]));
      }
    }

    // fill xslotEdge bottom slots and orient
    const nx = xpos.length;
    for (let e = 0; e < eu.length; e++) {
      for (const ep of [eu[e], ev[e]]) {
        const node = ep >> 2, slot = ep & 3;
        if (node >= n) xslotEdge[4 * (node - n) + slot] = e;
      }
    }
    // vertex types
    const xtype = new Int8Array(nx);
    const xin = new Uint8Array(4 * nx);
    for (let x = 0; x < nx; x++) {
      const node = n + x;
      let nin = 0;
      for (let s = 0; s < 4; s++) {
        const e = xslotEdge[4 * x + s];
        if (e < 0) throw new Error('crossing ' + x + ' slot ' + s + ' has no edge');
        // edge oriented eu -> ev when edir = 1
        const head = edir[e] > 0 ? ev[e] : eu[e];
        const isIn = (head === node * 4 + s) ? 1 : 0;
        xin[4 * x + s] = isIn;
        nin += isIn;
      }
      if (nin === 4) xtype[x] = SINK;
      else if (nin === 0) xtype[x] = SOURCE;
      else if (nin === 2) {
        let ok = false;
        for (let s = 0; s < 4; s++) {
          if (xin[4 * x + s] && xin[4 * x + ((s + 1) & 3)]) ok = true;
        }
        if (!ok) throw new Error('crossing ' + x + ': opposite in-edges');
        xtype[x] = TRANS;
      } else {
        throw new Error('crossing ' + x + ' has ' + nin + ' incoming edges');
      }
    }
    return {
      n, nx, rounds: round,
      eu: Int32Array.from(eu), ev: Int32Array.from(ev),
      elab: Int8Array.from(elab), edir: Int8Array.from(edir), epts,
      xslotEdge: Int32Array.from(xslotEdge), xpos: Float64Array.from(xpos), ypos: Float64Array.from(ypos),
      xround: Int32Array.from(xround), xrule, xtype, xin,
      boundarySign: Int8Array.from(word, (a) => (a > 0 ? 1 : -1)),
      roundWords, roundEvents, roundX,
    };
  }

  // Proper labeling check (Def. 3.10 of arXiv:2306.12501, six-vertex form).
  function checkProperLabeling(G) {
    for (let x = 0; x < G.nx; x++) {
      const labs = [], ins = [], outs = [];
      for (let s = 0; s < 4; s++) {
        const l = G.elab[G.xslotEdge[4 * x + s]];
        labs.push(l);
        (G.xin[4 * x + s] ? ins : outs).push(l);
      }
      if (G.xtype[x] === TRANS) {
        if (ins[0] === ins[1]) return 'crossing ' + x + ': equal incoming labels';
        const a = ins.slice().sort().join(), b = outs.slice().sort().join();
        if (a !== b) return 'crossing ' + x + ': in ' + a + ' out ' + b;
      } else if (new Set(labs).size !== 4) {
        return 'crossing ' + x + ': labels ' + labs.join();
      }
    }
    return null;
  }

  /*
   * Hourglass plabic graph from the six-vertex configuration (inverse of Def. 3.12):
   * sinks -> white, sources -> black, transmitting vertex -> white W (incoming edges)
   * joined by a 2-hourglass to black B (outgoing edges).
   * link[4*v+s] = endpoint at the other end of the strand leaving slot s of node v.
   * Slots at W: 0,1 = incoming edges (clockwise), 2,3 = hourglass; same at B with outgoing.
   * The hourglass is twisted: (W,2)<->(B,2), (W,3)<->(B,3).
   */
  function toHourglass(G) {
    const n = G.n, nx = G.nx;
    // map six-vertex endpoint (x, slot) -> hourglass endpoint
    const epMap = new Int32Array(4 * nx);
    const color = [], kind = [], owner = [];
    for (let i = 0; i < n; i++) { color.push(G.boundarySign[i] > 0 ? 1 : -1); kind.push(-1); owner.push(-1); }
    const wOf = new Int32Array(nx).fill(-1), bOf = new Int32Array(nx).fill(-1);
    const transStart = new Int8Array(nx).fill(-1);
    for (let x = 0; x < nx; x++) {
      const t = G.xtype[x];
      if (t === SINK || t === SOURCE) {
        const v = color.length;
        color.push(t === SINK ? -1 : 1); kind.push(t); owner.push(x);
        if (t === SINK) wOf[x] = v; else bOf[x] = v;
        for (let s = 0; s < 4; s++) epMap[4 * x + s] = v * 4 + s;
      } else {
        let s0 = 0;
        while (!(G.xin[4 * x + s0] && G.xin[4 * x + ((s0 + 1) & 3)])) s0++;
        transStart[x] = s0;
        const W = color.length;
        color.push(-1); kind.push(TRANS); owner.push(x);
        const B = color.length;
        color.push(1); kind.push(TRANS); owner.push(x);
        wOf[x] = W; bOf[x] = B;
        epMap[4 * x + s0] = W * 4 + 0;
        epMap[4 * x + ((s0 + 1) & 3)] = W * 4 + 1;
        epMap[4 * x + ((s0 + 2) & 3)] = B * 4 + 0;
        epMap[4 * x + ((s0 + 3) & 3)] = B * 4 + 1;
      }
    }
    const N = color.length;
    const link = new Int32Array(4 * N).fill(-1);
    const mapEp = (ep) => {
      const node = ep >> 2;
      if (node < n) return ep;
      return epMap[4 * (node - n) + (ep & 3)];
    };
    for (let e = 0; e < G.eu.length; e++) {
      const a = mapEp(G.eu[e]), b = mapEp(G.ev[e]);
      link[a] = b; link[b] = a;
    }
    for (let x = 0; x < nx; x++) {
      if (G.xtype[x] !== TRANS) continue;
      const W = wOf[x], B = bOf[x];
      link[W * 4 + 2] = B * 4 + 2; link[B * 4 + 2] = W * 4 + 2;
      link[W * 4 + 3] = B * 4 + 3; link[B * 4 + 3] = W * 4 + 3;
    }
    return {
      n, N, color: Int8Array.from(color), kind: Int8Array.from(kind), owner: Int32Array.from(owner),
      link, wOf, bOf, transStart, epMap,
    };
  }

  // trip_a: a-th leftmost turn (clockwise) at white, a-th rightmost (counterclockwise) at black.
  // Returns {perm (0-indexed), paths (array of node lists, if wanted)}.
  function tripPermutation(H, a, wantPaths) {
    const n = H.n;
    const perm = new Int32Array(n);
    const paths = wantPaths ? [] : null;
    const maxSteps = 8 * H.N + 16;
    for (let i = 0; i < n; i++) {
      let ep = H.link[i * 4];
      const path = wantPaths ? [i * 4, ep] : null;
      let steps = 0;
      for (;;) {
        const node = ep >> 2;
        if (node < n) { perm[i] = node; break; }
        const slot = ep & 3;
        const exit = H.color[node] < 0 ? (slot + a) & 3 : (slot - a + 4) & 3;
        const from = node * 4 + exit;
        ep = H.link[from];
        if (ep < 0) throw new Error('dangling slot ' + from);
        if (wantPaths) path.push(from, ep);
        if (++steps > maxSteps) throw new Error('trip loops');
      }
      if (wantPaths) paths.push(path);
    }
    return { perm, paths };
  }

  function boundaryEdges(G) {
    if (G.boundaryEdge) return G.boundaryEdge;
    const be = new Int32Array(G.n).fill(-1);
    for (let k = 0; k < G.eu.length; k++) {
      if ((G.eu[k] >> 2) < G.n) be[G.eu[k] >> 2] = k;
      if ((G.ev[k] >> 2) < G.n) be[G.ev[k] >> 2] = k;
    }
    G.boundaryEdge = be;
    return be;
  }

  // Six-vertex trip_2 strands: straight through every crossing. Returns the list of crossings
  // visited by the strand starting at boundary i.
  function trip2Crossings(G, i) {
    const n = G.n;
    const out = [];
    let e = boundaryEdges(G)[i];
    let from = i * 4;
    for (;;) {
      const to = G.eu[e] === from ? G.ev[e] : G.eu[e];
      const node = to >> 2;
      if (node < n) return out;
      const x = node - n;
      out.push(x);
      const s = (to & 3) ^ 2; // opposite slot: 0<->2, 1<->3
      from = node * 4 + s;
      e = G.xslotEdge[4 * x + s];
    }
  }

  // ---------- layouts ----------

  // Boundary positions on the unit circle, b_1..b_n clockwise on screen starting just right of
  // the top (the base face, between b_n and b_1, is at the top).
  function circlePos(n, i) {
    const phi = 2 * Math.PI * (i + 0.5) / n;
    return [Math.sin(phi), -Math.cos(phi)];
  }

  // Tutte (harmonic) embedding of the six-vertex graph with b_i on the unit circle.
  // Returns Float64Array(2*nx).
  function harmonicLayout(G, opts) {
    opts = opts || {};
    const n = G.n, nx = G.nx;
    const deg = new Float64Array(nx);
    const bx = new Float64Array(nx), by = new Float64Array(nx);
    const nbrStart = new Int32Array(nx + 1);
    const tmp = [];
    for (let x = 0; x < nx; x++) tmp.push([]);
    for (let e = 0; e < G.eu.length; e++) {
      const u = G.eu[e] >> 2, v = G.ev[e] >> 2;
      if (u >= n && v >= n) {
        if (u !== v) { tmp[u - n].push(v - n); tmp[v - n].push(u - n); }
        deg[u - n] += 1; deg[v - n] += 1;
        if (u === v) deg[u - n] -= 2;
      } else if (u >= n || v >= n) {
        const x = (u >= n ? u : v) - n, b = (u >= n ? v : u);
        const p = circlePos(n, b);
        bx[x] += p[0]; by[x] += p[1]; deg[x] += 1;
      }
    }
    for (let x = 0; x < nx; x++) nbrStart[x + 1] = nbrStart[x] + tmp[x].length;
    const nbr = new Int32Array(nbrStart[nx]);
    for (let x = 0; x < nx; x++) nbr.set(tmp[x], nbrStart[x]);

    function solve(rhs, x0) {
      // CG on (D - A) x = rhs, Jacobi preconditioned
      const xs = x0 ? Float64Array.from(x0) : new Float64Array(nx);
      const r = new Float64Array(nx), z = new Float64Array(nx), p = new Float64Array(nx), Ap = new Float64Array(nx);
      const mul = (v, out) => {
        for (let i = 0; i < nx; i++) {
          let s = deg[i] * v[i];
          for (let k = nbrStart[i]; k < nbrStart[i + 1]; k++) s -= v[nbr[k]];
          out[i] = s;
        }
      };
      mul(xs, Ap);
      let bnorm = 0;
      for (let i = 0; i < nx; i++) { r[i] = rhs[i] - Ap[i]; bnorm += rhs[i] * rhs[i]; }
      bnorm = Math.sqrt(bnorm) || 1;
      for (let i = 0; i < nx; i++) { z[i] = r[i] / deg[i]; p[i] = z[i]; }
      let rz = 0;
      for (let i = 0; i < nx; i++) rz += r[i] * z[i];
      const maxIt = opts.maxIt || 5000;
      for (let it = 0; it < maxIt; it++) {
        mul(p, Ap);
        let pAp = 0;
        for (let i = 0; i < nx; i++) pAp += p[i] * Ap[i];
        if (pAp <= 0) break;
        const alpha = rz / pAp;
        let rn = 0;
        for (let i = 0; i < nx; i++) { xs[i] += alpha * p[i]; r[i] -= alpha * Ap[i]; rn += r[i] * r[i]; }
        if (Math.sqrt(rn) < 1e-11 * bnorm) break;
        for (let i = 0; i < nx; i++) z[i] = r[i] / deg[i];
        let rz2 = 0;
        for (let i = 0; i < nx; i++) rz2 += r[i] * z[i];
        const beta = rz2 / rz;
        rz = rz2;
        for (let i = 0; i < nx; i++) p[i] = z[i] + beta * p[i];
      }
      return xs;
    }
    const X = solve(bx), Y = solve(by);
    const pos = new Float64Array(2 * nx);
    for (let i = 0; i < nx; i++) { pos[2 * i] = X[i]; pos[2 * i + 1] = Y[i]; }
    return pos;
  }

  // Membership in trip_2 strands, a strand being named by its smaller boundary index.
  // edgeStrand[e] = strand through edge e; crossStrand[2x], crossStrand[2x+1] = strands at x.
  function trip2Strands(G, trip2) {
    const n = G.n, nx = G.nx;
    const edgeStrand = new Int32Array(G.eu.length).fill(-1);
    const crossStrand = new Int32Array(2 * nx).fill(-1);
    const be = boundaryEdges(G);
    for (let i = 0; i < n; i++) {
      if (i > trip2[i]) continue;
      let e = be[i], from = i * 4;
      for (;;) {
        edgeStrand[e] = i;
        const to = G.eu[e] === from ? G.ev[e] : G.eu[e];
        const node = to >> 2;
        if (node < n) break;
        const x = node - n;
        if (crossStrand[2 * x] < 0) crossStrand[2 * x] = i; else crossStrand[2 * x + 1] = i;
        const s = (to & 3) ^ 2;
        from = node * 4 + s;
        e = G.xslotEdge[4 * x + s];
      }
    }
    return { edgeStrand, crossStrand };
  }

  // Crossing of the straight chords of the two trip_2 strands through each crossing.
  function chordLayout(G, trip2) {
    const n = G.n, nx = G.nx;
    const strandOf = trip2Strands(G, trip2).crossStrand;
    const pos = new Float64Array(2 * nx);
    for (let x = 0; x < nx; x++) {
      const i1 = strandOf[2 * x], i2 = strandOf[2 * x + 1];
      const a = circlePos(n, i1), b = circlePos(n, trip2[i1]);
      const c = circlePos(n, i2), d = circlePos(n, trip2[i2]);
      const d1x = b[0] - a[0], d1y = b[1] - a[1], d2x = d[0] - c[0], d2y = d[1] - c[1];
      const den = d1x * d2y - d1y * d2x;
      let t = 0.5;
      if (Math.abs(den) > 1e-15) t = ((c[0] - a[0]) * d2y - (c[1] - a[1]) * d2x) / den;
      pos[2 * x] = a[0] + t * d1x;
      pos[2 * x + 1] = a[1] + t * d1y;
    }
    return pos;
  }

  // The inverse map: the antiexcedances of trip_a (k with trip_a^{-1}(k) > k) are the entries
  // in rows 1..a, so row(k) = 1 + #{a : trip_a^{-1}(k) < k}.
  function wordFromTrips(perms) {
    const n = perms[0].length;
    const invs = perms.map(inversePerm);
    const w = new Int8Array(n);
    for (let k = 0; k < n; k++) {
      let row = 1;
      for (const inv of invs) if (inv[k] < k) row++;
      w[k] = row;
    }
    return w;
  }

  // Full pipeline for a lattice word.
  function buildWeb(word, opts) {
    const G = grow(word, opts);
    const H = toHourglass(G);
    const trips = [1, 2, 3].map((a) => tripPermutation(H, a, !!(opts && opts.paths)));
    return { G, H, trips };
  }

  return {
    mulberry32, sampleRectSYT, validateWord, wordToTableau,
    promoteWord, promotionPermutations, inversePerm, balancePoints,
    SHORT_RULES, LONG_RULES, SINK, SOURCE, TRANS,
    grow, checkProperLabeling, toHourglass, tripPermutation, trip2Crossings, trip2Strands, boundaryEdges,
    circlePos, harmonicLayout, chordLayout, wordFromTrips, buildWeb,
  };
});
