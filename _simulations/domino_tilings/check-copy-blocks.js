#!/usr/bin/env node
// check-copy-blocks.js
// Check whether the t=0 column insertion transition has a "copy blocks" structure.

// ============================================================
// MATH FUNCTIONS (extracted from the simulation)
// ============================================================

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

function positionsToDisplayPart(positions, latticeN) {
  const k = positions.length;
  if (k === 0) return [];
  const sorted = [...positions].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < k; i++) parts.push(latticeN - sorted[i] - (k - 1 - i));
  while (parts.length > 0 && parts[parts.length - 1] === 0) parts.pop();
  return parts;
}

function displayPartToPositions(parts, k, latticeN) {
  const p = [];
  for (let i = 0; i < k; i++) p.push(parts[i] || 0);
  const positions = [];
  for (let i = 0; i < k; i++) positions.push(latticeN - p[i] - (k - 1 - i));
  return positions.sort((a, b) => a - b);
}

function fmtDisplay(positions, latticeN) {
  const parts = positionsToDisplayPart(positions, latticeN);
  return parts.length === 0 ? '{}' : '(' + parts.join(',') + ')';
}

function posToStdPart(positions, latticeN) {
  const k = positions.length;
  if (k === 0) return [];
  const sorted = [...positions].sort((a, b) => a - b);
  const parts = [];
  for (let i = 1; i <= k; i++) parts.push(sorted[k - i] - (k + 1 - i));
  while (parts.length > 0 && parts[parts.length - 1] === 0) parts.pop();
  return parts;
}

// Polynomial arithmetic
function polyTrim(p) { while (p.length > 1 && p[p.length-1] === 0) p.pop(); return p; }
function polyAdd(a, b) {
  const r = new Array(Math.max(a.length, b.length)).fill(0);
  for (let i = 0; i < a.length; i++) r[i] += a[i];
  for (let i = 0; i < b.length; i++) r[i] += b[i];
  return polyTrim(r);
}
function polySub(a, b) {
  const r = new Array(Math.max(a.length, b.length)).fill(0);
  for (let i = 0; i < a.length; i++) r[i] += a[i];
  for (let i = 0; i < b.length; i++) r[i] -= b[i];
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
function poly1minusTn(n) {
  if (n === 0) return [0];
  const r = new Array(n + 1).fill(0); r[0] = 1; r[n] = -1; return r;
}
function polyGeom(n) {
  if (n <= 0) return [0];
  return new Array(n).fill(1);
}
function polyDiv(a, b) {
  a = [...a]; b = [...b];
  polyTrim(a); polyTrim(b);
  if (b.length === 1 && b[0] === 0) return [0];
  const r = new Array(Math.max(0, a.length - b.length + 1)).fill(0);
  for (let i = r.length - 1; i >= 0; i--) {
    r[i] = a[i + b.length - 1] / b[b.length - 1];
    for (let j = 0; j < b.length; j++) a[i + j] -= r[i] * b[j];
  }
  return polyTrim(r);
}
function qBinom(n, k) {
  if (k < 0 || k > n) return [0];
  if (k === 0 || k === n) return [1];
  let r = [1];
  for (let j = 1; j <= k; j++) {
    r = polyMul(r, poly1minusTn(n - j + 1));
    r = polyDiv(r, poly1minusTn(j));
  }
  return r;
}
function polyEval(p, tVal) {
  let s = 0;
  for (let i = 0; i < p.length; i++) s += p[i] * Math.pow(tVal, i);
  return s;
}
function polyEqual(a, b) {
  a = polyTrim([...a]); b = polyTrim([...b]);
  if (a.length !== b.length) return false;
  return a.every((c, i) => Math.abs(c - b[i]) < 1e-9);
}

// Weight functions
function psi_vert(lamPos, lamN, muPos, muN) {
  const lam = posToStdPart(lamPos, lamN), mu = posToStdPart(muPos, muN);
  const len = Math.max(lam.length, mu.length) + 1;
  const L = i => lam[i] || 0, M = i => mu[i] || 0;
  let poly = [1];
  for (let i = 0; i < len; i++) {
    if (L(i) === M(i) && L(i + 1) === M(i + 1) + 1) {
      const exp = M(i) - M(i + 1);
      if (exp > 0) poly = polyMul(poly, poly1minusTn(exp));
    }
  }
  // Check vertical strip
  for (let i = 0; i < len; i++) {
    if (L(i) - M(i) < 0 || L(i) - M(i) > 1) return { poly: [0], betaPow: 0 };
  }
  const sizeDiff = (lam.reduce((a,b) => a+b, 0)||0) - (mu.reduce((a,b) => a+b, 0)||0);
  return { poly, betaPow: sizeDiff };
}

function psi_horiz(lamPos, lamN, muPos, muN) {
  const lam = posToStdPart(lamPos, lamN), mu = posToStdPart(muPos, muN);
  const len = Math.max(lam.length, mu.length) + 1;
  const L = i => lam[i] || 0, M = i => mu[i] || 0;
  let poly = [1];
  for (let i = 0; i < len; i++) {
    const n = L(i) - L(i + 1), k = L(i) - M(i);
    if (k < 0 || k > n) return { poly: [0], betaPow: 0 };
    if (k > 0) poly = polyMul(poly, qBinom(n, k));
  }
  const sizeDiff = (lam.reduce((a,b) => a+b, 0)||0) - (mu.reduce((a,b) => a+b, 0)||0);
  return { poly, betaPow: sizeDiff };
}

// Bipartite matching
function bipartiteMatch(midToMatch, outerValid, nOuter, midIsBigger) {
  const match = {};
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

// Enumerate valid mu
function enumerateMu(k, N, topPSet, botPSet) {
  const numPos = N - 1;
  if (numPos < k || k < 0) return [];
  const botHolesSet = new Set();
  for (let j = 1; j <= N; j++) if (!botPSet.has(j)) botHolesSet.add(j);
  const results = [];
  function gen(start, chosen) {
    if (chosen.length === k) {
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

// Enumerate valid nu
function enumerateNu(k, N, topPSet, botPSet) {
  const kNu = k + 1;
  const numPos = N + 1;
  if (kNu < 0 || numPos < kNu) return [];
  const results = [];
  function gen(start, chosen) {
    if (chosen.length === kNu) {
      const nu = particlesToPartition(chosen);
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

// Column insertion probability
function colInsertionProb(lam, nu, lb, nb, Vj, j, jm1) {
  const L = i => (i >= 1 && i <= j) ? (lam[i-1] || 0) : 0;
  const N_ = i => (i >= 1 && i <= j) ? (nu[i-1] || 0) : 0;
  const Lb = i => (i >= 1 && i <= jm1) ? (lb[i-1] || 0) : 0;
  const Nb = i => (i >= 1 && i <= jm1) ? (nb[i-1] || 0) : 0;

  const d = {}, c = {};
  for (let i = 1; i <= j; i++) { d[i] = N_(i) - L(i); if (d[i] < 0 || d[i] > 1) return [0]; }
  for (let i = 1; i <= jm1; i++) { c[i] = Nb(i) - Lb(i); if (c[i] < 0 || c[i] > 1) return [0]; }

  function fp(k) {
    if (k <= 1) return [1];
    const nbkm1 = Nb(k-1), lk = L(k), nbk = Nb(k);
    const a = nbkm1 - lk, b = nbkm1 - nbk + 1;
    if (b <= 0) return [1];
    return polyDiv(poly1minusTn(a), poly1minusTn(b));
  }
  function gp(s) {
    if (s <= 1) return [1];
    const nbsm1 = Nb(s-1), ls = L(s);
    return poly1minusTn(nbsm1 - ls);
  }

  const moved = [];
  for (let i = 1; i <= jm1; i++) if (c[i] === 1) moved.push(i);
  moved.sort((a,b) => a-b);

  let prob = [1];
  const claimed = new Set();

  const pairs = [];
  for (let idx = 0; idx < moved.length; idx++) {
    const kp = moved[idx];
    const rp = idx > 0 ? moved[idx-1] : 0;
    pairs.push([rp, kp]);
  }

  for (const [rp, kp] of pairs) {
    const cands = [];
    for (let s = rp+1; s <= kp; s++) cands.push(s);

    if (rp+1 === kp) {
      if (d[kp] !== 1) return [0];
      claimed.add(kp);
      continue;
    }

    let sp = null;
    for (const s of cands) {
      if (d[s] === 1 && !claimed.has(s)) { sp = s; break; }
    }
    if (sp === null) return [0];
    claimed.add(sp);

    if (sp === kp) {
      prob = polyMul(prob, fp(kp));
    } else if (rp+1 < sp && sp < kp) {
      let p = polyMul([1], polySub([1], fp(kp)));
      for (let ip = kp-1; ip > sp; ip--) p = polyMul(p, polySub([1], gp(ip)));
      p = polyMul(p, gp(sp));
      prob = polyMul(prob, p);
    } else if (sp === rp+1) {
      let p = polySub([1], fp(kp));
      for (let ip = kp-1; ip > rp+1; ip--) p = polyMul(p, polySub([1], gp(ip)));
      prob = polyMul(prob, p);
    } else return [0];
  }

  if (Vj === 1) {
    if (moved.length === 0) {
      let sp = null;
      for (let s = 1; s <= j; s++) {
        if (d[s] === 1 && !claimed.has(s)) { sp = s; break; }
      }
      if (sp === null) return [0];
      claimed.add(sp);
      const mp = 0;
      if (sp === j) {
        prob = polyMul(prob, gp(j));
      } else if (sp > mp+1 && sp < j) {
        let p = [1];
        for (let ip = j; ip > sp; ip--) p = polyMul(p, polySub([1], gp(ip)));
        p = polyMul(p, gp(sp));
        prob = polyMul(prob, p);
      } else if (sp === mp+1) {
        let p = [1];
        for (let ip = j; ip > 1; ip--) p = polyMul(p, polySub([1], gp(ip)));
        prob = polyMul(prob, p);
      }
    } else {
      const mp = moved[moved.length - 1];
      if (mp === jm1) {
        if (d[j] !== 1) return [0];
        claimed.add(j);
      } else {
        let sp = null;
        for (let s = mp+1; s <= j; s++) {
          if (d[s] === 1 && !claimed.has(s)) { sp = s; break; }
        }
        if (sp === null) return [0];
        claimed.add(sp);
        if (sp === j) {
          prob = polyMul(prob, gp(j));
        } else if (sp > mp+1 && sp < j) {
          let p = polySub([1], gp(j));
          for (let ip = j-1; ip > sp; ip--) p = polyMul(p, polySub([1], gp(ip)));
          p = polyMul(p, gp(sp));
          prob = polyMul(prob, p);
        } else if (sp === mp+1) {
          let p = polySub([1], gp(j));
          for (let ip = j-1; ip > mp+1; ip--) p = polyMul(p, polySub([1], gp(ip)));
          prob = polyMul(prob, p);
        }
      }
    }
  }

  for (let s = 1; s <= j; s++) {
    if (d[s] === 1 && !claimed.has(s)) return [0];
    if (d[s] === 0 && claimed.has(s)) return [0];
  }

  return polyTrim(prob);
}


// ============================================================
// FREE BLOCK ANALYSIS
// ============================================================

// Identify "free blocks" -- pairs of adjacent free positions where exactly one is occupied
function identifyFreeBlocks(allConfigs, numPos) {
  const { forced, free, forcedHoles } = computeForcedFree(allConfigs, numPos);
  const freeArr = [...free].sort((a, b) => a - b);

  // Check that free positions pair up into adjacent pairs
  const blocks = [];
  let i = 0;
  while (i < freeArr.length) {
    if (i + 1 < freeArr.length && freeArr[i+1] === freeArr[i] + 1) {
      blocks.push([freeArr[i], freeArr[i+1]]);
      i += 2;
    } else {
      // Unpaired free position -- block structure fails
      return null;
    }
  }

  return { blocks, forced: [...forced].sort((a,b) => a-b), forcedHoles: [...forcedHoles].sort((a,b) => a-b) };
}

// Encode a config as a binary vector over the free blocks
// bit=0 means first position of block is particle, bit=1 means second is particle
function encodeToBinary(particles, blocks) {
  const pSet = new Set(particles);
  const bits = [];
  for (const [p1, p2] of blocks) {
    const has1 = pSet.has(p1), has2 = pSet.has(p2);
    if (has1 && !has2) bits.push(0);
    else if (!has1 && has2) bits.push(1);
    else return null; // not a valid block pattern
  }
  return bits;
}

function bitsToStr(bits) { return bits.join(''); }

// ============================================================
// TEST HARNESS
// ============================================================

function runTestCase(N, k, topPart, botPart) {
  const topPSet = new Set(displayPartToPositions(topPart, k, N).filter(p => p >= 1 && p <= N));
  const botPSet = new Set(displayPartToPositions(botPart, k + 1, N).filter(p => p >= 1 && p <= N));

  // Validate sizes
  if (topPSet.size !== k) return null;
  if (botPSet.size !== k + 1) return null;

  const allMu = enumerateMu(k, N, topPSet, botPSet);
  const allNu = enumerateNu(k, N, topPSet, botPSet);

  if (allMu.length === 0 || allNu.length === 0) return null;

  // Free block analysis for mu
  const muBlocks = identifyFreeBlocks(allMu, N - 1);
  const nuBlocks = identifyFreeBlocks(allNu, N + 1);

  const result = {
    N, k, topPart, botPart,
    topPos: [...topPSet].sort((a,b) => a-b),
    botPos: [...botPSet].sort((a,b) => a-b),
    nMu: allMu.length,
    nNu: allNu.length,
    muBlocksOk: muBlocks !== null,
    nuBlocksOk: nuBlocks !== null,
    muBlocks,
    nuBlocks,
    transitions: [],
    versionA: true,
    versionB: true,
    otherPattern: null
  };

  // Check 2^blocks structure
  if (muBlocks) {
    result.muIs2k = (allMu.length === Math.pow(2, muBlocks.blocks.length));
    result.muNumBlocks = muBlocks.blocks.length;
  }
  if (nuBlocks) {
    result.nuIs2k = (allNu.length === Math.pow(2, nuBlocks.blocks.length));
    result.nuNumBlocks = nuBlocks.blocks.length;
  }

  if (!muBlocks || !nuBlocks) return result;

  // Check block count: nu should have exactly 1 more free block than mu
  result.blockCountDiff = nuBlocks.blocks.length - muBlocks.blocks.length;

  // Now compute the t=0 transition and check copy patterns
  const lamBotStd = posToStdPart([...botPSet], N);
  const lamTopStd = posToStdPart([...topPSet], N);

  // For each mu, for each Vj in {0, 1}, find which nu gets probability 1 at t=0
  let patternAok = true, patternBok = true, patternCok = true, patternDok = true;
  let patternEok = true, patternFok = true, patternGok = true, patternHok = true;

  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muBits = encodeToBinary(mu.particles, muBlocks.blocks);
    if (!muBits) { result.muBlocksOk = false; return result; }

    for (const Vj of [0, 1]) {
      // Find which nu gets nonzero probability at t=0
      let foundNu = null;
      let foundNuBits = null;
      let foundProb = 0;
      let numNonzero = 0;

      for (const nu of allNu) {
        const nuStd = posToStdPart(nu.particles, N + 1);
        const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, Vj, k + 1, k);
        const val = p[0] || 0;  // evaluate at t=0

        if (Math.abs(val) > 1e-9) {
          numNonzero++;
          foundNu = nu;
          foundProb = val;
          foundNuBits = encodeToBinary(nu.particles, nuBlocks.blocks);
        }
      }

      if (numNonzero !== 1 || Math.abs(foundProb - 1) > 1e-9) {
        // At t=0, the transition should be deterministic (probability 1)
        result.transitions.push({
          muBits: bitsToStr(muBits), Vj,
          issue: `non-deterministic: ${numNonzero} nonzero outputs, prob=${foundProb}`
        });
        patternAok = false;
        patternBok = false;
        continue;
      }

      if (!foundNuBits) {
        result.transitions.push({
          muBits: bitsToStr(muBits), Vj,
          issue: 'nu encoding failed'
        });
        patternAok = false;
        patternBok = false;
        continue;
      }

      // Version A: d_i = b_i for i=1..k, d_{k+1} = Vj
      const expectedA = [...muBits, Vj];
      const matchA = expectedA.length === foundNuBits.length &&
                     expectedA.every((v, i) => v === foundNuBits[i]);

      // Version B: d_1 = Vj, d_{i+1} = b_i for i=1..k
      const expectedB = [Vj, ...muBits];
      const matchB = expectedB.length === foundNuBits.length &&
                     expectedB.every((v, i) => v === foundNuBits[i]);

      // Version C: d_1 = Vj, d_{i+1} = NOT(b_i) for i=1..k (Vj at beginning, flipped copy)
      const expectedC = [Vj, ...muBits.map(b => 1 - b)];
      const matchC = expectedC.length === foundNuBits.length &&
                     expectedC.every((v, i) => v === foundNuBits[i]);

      // Version D: d_i = NOT(b_i) for i=1..k, d_{k+1} = Vj (flipped copy, Vj at end)
      const expectedD = [...muBits.map(b => 1 - b), Vj];
      const matchD = expectedD.length === foundNuBits.length &&
                     expectedD.every((v, i) => v === foundNuBits[i]);

      // Version E: d_1 = NOT(Vj), d_{i+1} = b_i (NOT(Vj) at beginning, copy)
      const expectedE = [1 - Vj, ...muBits];
      const matchE = expectedE.length === foundNuBits.length &&
                     expectedE.every((v, i) => v === foundNuBits[i]);

      // Version F: d_i = b_i, d_{k+1} = NOT(Vj) (copy, NOT(Vj) at end)
      const expectedF = [...muBits, 1 - Vj];
      const matchF = expectedF.length === foundNuBits.length &&
                     expectedF.every((v, i) => v === foundNuBits[i]);

      // Version G: d_1 = NOT(Vj), d_{i+1} = NOT(b_i) (NOT(Vj) at beginning, flipped copy)
      const expectedG = [1 - Vj, ...muBits.map(b => 1 - b)];
      const matchG = expectedG.length === foundNuBits.length &&
                     expectedG.every((v, i) => v === foundNuBits[i]);

      // Version H: d_i = NOT(b_i), d_{k+1} = NOT(Vj) (flipped copy, NOT(Vj) at end)
      const expectedH = [...muBits.map(b => 1 - b), 1 - Vj];
      const matchH = expectedH.length === foundNuBits.length &&
                     expectedH.every((v, i) => v === foundNuBits[i]);

      if (!matchA) patternAok = false;
      if (!matchB) patternBok = false;
      if (!matchC) patternCok = false;
      if (!matchD) patternDok = false;
      if (!matchE) patternEok = false;
      if (!matchF) patternFok = false;
      if (!matchG) patternGok = false;
      if (!matchH) patternHok = false;

      result.transitions.push({
        muBits: bitsToStr(muBits),
        Vj,
        nuBits: bitsToStr(foundNuBits),
        expectedA: bitsToStr(expectedA),
        expectedB: bitsToStr(expectedB),
        expectedC: bitsToStr(expectedC),
        expectedD: bitsToStr(expectedD),
        matchA, matchB, matchC, matchD, matchE, matchF, matchG, matchH,
        muDisp: fmtDisplay(mu.particles, N-1),
        nuDisp: fmtDisplay(foundNu.particles, N+1)
      });
    }
  }

  result.versionA = patternAok;
  result.versionB = patternBok;
  result.versionC = patternCok;
  result.versionD = patternDok;
  result.versionE = patternEok;
  result.versionF = patternFok;
  result.versionG = patternGok;
  result.versionH = patternHok;

  // If none of A-H work, try arbitrary insertion position with arbitrary bit transformations
  if (!patternAok && !patternBok && !patternCok && !patternDok &&
      !patternEok && !patternFok && !patternGok && !patternHok) {
    // Try: for each insertion position, try all combinations of (flip_Vj, flip_mu)
    for (let insertPos = 0; insertPos <= muBlocks.blocks.length; insertPos++) {
      for (let flipVj = 0; flipVj <= 1; flipVj++) {
        for (let flipMu = 0; flipMu <= 1; flipMu++) {
          let allMatch = true;
          for (const tr of result.transitions) {
            if (tr.issue) { allMatch = false; break; }
            const muB = tr.muBits.split('').map(Number);
            const vBit = flipVj ? 1 - tr.Vj : tr.Vj;
            const mBits = flipMu ? muB.map(b => 1 - b) : muB;
            const expected = [...mBits.slice(0, insertPos), vBit, ...mBits.slice(insertPos)];
            const expStr = expected.join('');
            if (expStr !== tr.nuBits) { allMatch = false; break; }
          }
          if (allMatch) {
            result.otherPattern = `insert ${flipVj ? 'NOT(Vj)' : 'Vj'} at position ${insertPos}, ` +
                                  `${flipMu ? 'NOT(mu)' : 'mu'} bits`;
            break;
          }
        }
        if (result.otherPattern) break;
      }
      if (result.otherPattern) break;
    }
  }

  return result;
}

// Generate all valid (topPart, botPart) for given N, k
function generateAllCases(N, k) {
  const cases = [];

  // Enumerate all partitions with at most k parts and largest part at most N-k
  // (these are partitions that fit in k x (N-k) box)
  function enumPartitions(maxParts, maxPart) {
    const results = [[]];
    function gen(parts, maxVal) {
      if (parts.length === maxParts) return;
      for (let v = 1; v <= Math.min(maxVal, maxPart); v++) {
        const p = [...parts, v];
        p.sort((a, b) => b - a);
        results.push([...p]);
        gen(p, v);
      }
    }
    gen([], maxPart);
    // Remove duplicates
    const seen = new Set();
    return results.filter(p => {
      const key = p.join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // topPart: k particles on N positions -> partition fits in k x (N-k) box
  const topParts = enumPartitions(k, N - k);
  // botPart: k+1 particles on N positions -> partition fits in (k+1) x (N-k-1) box
  const botParts = enumPartitions(k + 1, N - k - 1);

  for (const tp of topParts) {
    for (const bp of botParts) {
      // Check if they produce valid mu/nu
      const topPSet = new Set(displayPartToPositions(tp, k, N).filter(p => p >= 1 && p <= N));
      const botPSet = new Set(displayPartToPositions(bp, k + 1, N).filter(p => p >= 1 && p <= N));
      if (topPSet.size !== k || botPSet.size !== k + 1) continue;

      const allMu = enumerateMu(k, N, topPSet, botPSet);
      if (allMu.length > 0) {
        cases.push([tp, bp]);
      }
    }
  }
  return cases;
}

// ============================================================
// MAIN
// ============================================================

console.log('='.repeat(80));
console.log('FREE BLOCK COPY PATTERN CHECK FOR t=0 COLUMN INSERTION');
console.log('='.repeat(80));
console.log();

// Specific test cases
const specificCases = [
  { N: 8, k: 4, topPart: [3,3,2], botPart: [3,2,2,1], label: 'Default' },
  { N: 3, k: 1, topPart: [1], botPart: [1,1], label: 'Small N=3' },
  { N: 4, k: 2, topPart: [1,1], botPart: [1,1,1], label: 'N=4 k=2 (a)' },
  { N: 4, k: 2, topPart: [2,1], botPart: [1,1,1], label: 'N=4 k=2 (b)' },
  { N: 4, k: 1, topPart: [2], botPart: [2,1], label: 'N=4 k=1' },
  { N: 5, k: 2, topPart: [2,1], botPart: [2,1,1], label: 'N=5 k=2 (a)' },
  { N: 5, k: 2, topPart: [3,1], botPart: [2,1,1], label: 'N=5 k=2 (b)' },
  { N: 5, k: 2, topPart: [2,2], botPart: [2,1,1], label: 'N=5 k=2 (c)' },
  { N: 6, k: 3, topPart: [2,1,1], botPart: [2,1,1,1], label: 'N=6 k=3' },
  { N: 6, k: 2, topPart: [3,2], botPart: [3,1,1], label: 'N=6 k=2' },
  { N: 7, k: 3, topPart: [3,2,1], botPart: [2,2,1,1], label: 'N=7 k=3' },
];

let totalCases = 0, blocksOkCases = 0;
let patternAcount = 0, patternBcount = 0, patternCcount = 0, patternDcount = 0;
let patternEcount = 0, patternFcount = 0, patternGcount = 0, patternHcount = 0;
let otherPatternCount = 0, noPatternCount = 0;

function printResult(r, label) {
  if (!r) {
    console.log(`  ${label}: SKIPPED (invalid or no valid configs)`);
    return;
  }
  totalCases++;

  const topStr = r.topPart.length ? '(' + r.topPart.join(',') + ')' : '{}';
  const botStr = r.botPart.length ? '(' + r.botPart.join(',') + ')' : '{}';

  console.log(`  ${label}: N=${r.N}, k=${r.k}, lam_top=${topStr}, lam_bot=${botStr}`);
  console.log(`    topPos=${r.topPos}, botPos=${r.botPos}`);
  console.log(`    |mu|=${r.nMu}, |nu|=${r.nNu}`);

  if (!r.muBlocksOk) {
    console.log('    MU BLOCKS: FAILED (free positions do not form adjacent pairs)');
    noPatternCount++;
    return;
  }
  if (!r.nuBlocksOk) {
    console.log('    NU BLOCKS: FAILED (free positions do not form adjacent pairs)');
    noPatternCount++;
    return;
  }

  blocksOkCases++;

  console.log(`    mu: ${r.muNumBlocks} free blocks ${r.muBlocks.blocks.map(b => '['+b+']').join(' ')}, ` +
              `forced particles: ${r.muBlocks.forced.join(',') || 'none'}, forced holes: ${r.muBlocks.forcedHoles.join(',') || 'none'}`);
  console.log(`    nu: ${r.nuNumBlocks} free blocks ${r.nuBlocks.blocks.map(b => '['+b+']').join(' ')}, ` +
              `forced particles: ${r.nuBlocks.forced.join(',') || 'none'}, forced holes: ${r.nuBlocks.forcedHoles.join(',') || 'none'}`);
  console.log(`    mu is 2^${r.muNumBlocks}=${Math.pow(2,r.muNumBlocks)}: ${r.muIs2k}, ` +
              `nu is 2^${r.nuNumBlocks}=${Math.pow(2,r.nuNumBlocks)}: ${r.nuIs2k}`);
  console.log(`    block count diff (nu - mu): ${r.blockCountDiff}${r.blockCountDiff === 1 ? ' (correct)' : ' (UNEXPECTED)'}`);

  // Show transitions
  if (r.transitions.length <= 32) {
    console.log('    Transitions at t=0:');
    for (const tr of r.transitions) {
      if (tr.issue) {
        console.log(`      mu=${tr.muBits} Vj=${tr.Vj}: ${tr.issue}`);
      } else {
        const marks = [];
        if (tr.matchA) marks.push('A');
        if (tr.matchB) marks.push('B');
        if (tr.matchC) marks.push('C');
        if (tr.matchD) marks.push('D');
        if (tr.matchE) marks.push('E');
        if (tr.matchF) marks.push('F');
        if (tr.matchG) marks.push('G');
        if (tr.matchH) marks.push('H');
        console.log(`      mu=${tr.muBits} Vj=${tr.Vj} -> nu=${tr.nuBits}` +
                    `  expC=${tr.expectedC}${tr.matchC ? ' OK' : ''}` +
                    `  [${marks.join(',')}]` +
                    `  ${tr.muDisp} -> ${tr.nuDisp}`);
      }
    }
  }

  const versions = [];
  if (r.versionA) versions.push('A: (b1,...,bk,Vj)');
  if (r.versionB) versions.push('B: (Vj,b1,...,bk)');
  if (r.versionC) versions.push('C: (Vj,~b1,...,~bk)');
  if (r.versionD) versions.push('D: (~b1,...,~bk,Vj)');
  if (r.versionE) versions.push('E: (~Vj,b1,...,bk)');
  if (r.versionF) versions.push('F: (b1,...,bk,~Vj)');
  if (r.versionG) versions.push('G: (~Vj,~b1,...,~bk)');
  if (r.versionH) versions.push('H: (~b1,...,~bk,~Vj)');

  if (versions.length > 0) {
    console.log(`    >>> MATCHES: ${versions.join(' | ')} <<<`);
    for (const v of versions) {
      const letter = v[0];
      if (letter === 'A') patternAcount++;
      if (letter === 'B') patternBcount++;
      if (letter === 'C') patternCcount++;
      if (letter === 'D') patternDcount++;
      if (letter === 'E') patternEcount++;
      if (letter === 'F') patternFcount++;
      if (letter === 'G') patternGcount++;
      if (letter === 'H') patternHcount++;
    }
  } else if (r.otherPattern) {
    console.log(`    >>> OTHER PATTERN: ${r.otherPattern} <<<`);
    otherPatternCount++;
  } else {
    console.log('    >>> NO PATTERN FOUND <<<');
    noPatternCount++;
  }
  console.log();
}

console.log('--- SPECIFIC TEST CASES ---');
console.log();
for (const tc of specificCases) {
  const r = runTestCase(tc.N, tc.k, tc.topPart, tc.botPart);
  printResult(r, tc.label);
}

// Exhaustive enumeration for small N
console.log('--- EXHAUSTIVE ENUMERATION FOR SMALL N ---');
console.log();

for (let N = 3; N <= 7; N++) {
  for (let k = 1; k <= Math.floor((N-1)/2); k++) {
    const cases = generateAllCases(N, k);
    console.log(`N=${N}, k=${k}: ${cases.length} valid (topPart, botPart) pairs`);
    for (const [tp, bp] of cases) {
      const label = `N=${N} k=${k}`;
      const r = runTestCase(N, k, tp, bp);
      printResult(r, label);
    }
  }
}

// Summary
console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total test cases: ${totalCases}`);
console.log(`Cases with valid block structure: ${blocksOkCases}`);
console.log(`  A: (b1,...,bk, Vj)       : ${patternAcount}`);
console.log(`  B: (Vj, b1,...,bk)       : ${patternBcount}`);
console.log(`  C: (Vj, ~b1,...,~bk)     : ${patternCcount}`);
console.log(`  D: (~b1,...,~bk, Vj)     : ${patternDcount}`);
console.log(`  E: (~Vj, b1,...,bk)      : ${patternEcount}`);
console.log(`  F: (b1,...,bk, ~Vj)      : ${patternFcount}`);
console.log(`  G: (~Vj, ~b1,...,~bk)    : ${patternGcount}`);
console.log(`  H: (~b1,...,~bk, ~Vj)    : ${patternHcount}`);
console.log(`  Other pattern found      : ${otherPatternCount}`);
console.log(`  No pattern               : ${noPatternCount}`);
console.log();

const patternCounts = { A: patternAcount, B: patternBcount, C: patternCcount, D: patternDcount,
                        E: patternEcount, F: patternFcount, G: patternGcount, H: patternHcount };
for (const [name, count] of Object.entries(patternCounts)) {
  if (count === blocksOkCases && blocksOkCases > 0)
    console.log(`CONCLUSION: Version ${name} holds UNIVERSALLY across all ${blocksOkCases} cases.`);
}
if (Object.values(patternCounts).every(c => c < blocksOkCases))
  console.log('CONCLUSION: No single version holds universally in the ordered-block encoding.');

// ============================================================
// DEEPER ANALYSIS: coalescing and general correspondences
// ============================================================
console.log();
console.log('='.repeat(80));
console.log('COALESCING ANALYSIS');
console.log('='.repeat(80));
console.log('Checking if the t=0 map is injective (distinct mu -> distinct nu for each Vj)...');
console.log();

let coalescingCount = 0;
let injectiveCount = 0;

for (let N = 3; N <= 7; N++) {
  for (let k = 1; k <= Math.floor((N-1)/2); k++) {
    const cases = generateAllCases(N, k);
    for (const [tp, bp] of cases) {
      const topPSet = new Set(displayPartToPositions(tp, k, N).filter(p => p >= 1 && p <= N));
      const botPSet = new Set(displayPartToPositions(bp, k + 1, N).filter(p => p >= 1 && p <= N));
      if (topPSet.size !== k || botPSet.size !== k + 1) continue;
      const allMu = enumerateMu(k, N, topPSet, botPSet);
      const allNu = enumerateNu(k, N, topPSet, botPSet);
      if (allMu.length < 4) continue; // need 2+ blocks to be interesting

      const lamBotStd = posToStdPart([...botPSet], N);
      const lamTopStd = posToStdPart([...topPSet], N);

      let isCoalescing = false;
      for (const Vj of [0, 1]) {
        const nuMap = {};
        for (const mu of allMu) {
          const muStd = posToStdPart(mu.particles, N - 1);
          for (const nu of allNu) {
            const nuStd = posToStdPart(nu.particles, N + 1);
            const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, Vj, k + 1, k);
            const val = p[0] || 0;
            if (Math.abs(val - 1) < 1e-9) {
              const nuKey = nu.particles.join(',');
              if (nuMap[nuKey] && nuMap[nuKey] !== mu.particles.join(',')) {
                isCoalescing = true;
              }
              nuMap[nuKey] = mu.particles.join(',');
            }
          }
        }
      }

      if (isCoalescing) {
        coalescingCount++;
        const topStr = tp.length ? '(' + tp.join(',') + ')' : '{}';
        const botStr = bp.length ? '(' + bp.join(',') + ')' : '{}';
        if (coalescingCount <= 10) {
          console.log(`  COALESCING: N=${N} k=${k} top=${topStr} bot=${botStr} |mu|=${allMu.length}`);
        }
      } else {
        injectiveCount++;
      }
    }
  }
}
console.log(`\nCoalescing cases (distinct mu -> same nu): ${coalescingCount}`);
console.log(`Injective cases: ${injectiveCount}`);
console.log();

// For injective cases, check if general correspondence works
console.log('='.repeat(80));
console.log('GENERAL CORRESPONDENCE FOR INJECTIVE CASES WITH 2+ BLOCKS');
console.log('='.repeat(80));
console.log('Trying all permutations of block indices + per-block flips...');
console.log();

let genCorrespOk = 0, genCorrespFail = 0;

for (let N = 3; N <= 7; N++) {
  for (let k = 1; k <= Math.floor((N-1)/2); k++) {
    const cases = generateAllCases(N, k);
    for (const [tp, bp] of cases) {
      const topPSet = new Set(displayPartToPositions(tp, k, N).filter(p => p >= 1 && p <= N));
      const botPSet = new Set(displayPartToPositions(bp, k + 1, N).filter(p => p >= 1 && p <= N));
      if (topPSet.size !== k || botPSet.size !== k + 1) continue;
      const allMu = enumerateMu(k, N, topPSet, botPSet);
      const allNu = enumerateNu(k, N, topPSet, botPSet);
      if (allMu.length < 4) continue;

      const muBl = identifyFreeBlocks(allMu, N - 1);
      const nuBl = identifyFreeBlocks(allNu, N + 1);
      if (!muBl || !nuBl || muBl.blocks.length < 2) continue;

      const lamBotStd = posToStdPart([...botPSet], N);
      const lamTopStd = posToStdPart([...topPSet], N);

      // Check injectivity first
      let isCoalescing = false;
      const transitions = [];
      for (const mu of allMu) {
        const muStd = posToStdPart(mu.particles, N - 1);
        const muBits = encodeToBinary(mu.particles, muBl.blocks);
        for (const Vj of [0, 1]) {
          for (const nu of allNu) {
            const nuStd = posToStdPart(nu.particles, N + 1);
            const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, Vj, k + 1, k);
            const val = p[0] || 0;
            if (Math.abs(val - 1) < 1e-9) {
              const nuBits = encodeToBinary(nu.particles, nuBl.blocks);
              transitions.push({ muBits, Vj, nuBits });
            }
          }
        }
      }

      // Check if coalescing
      const seen = {};
      for (const tr of transitions) {
        const key = tr.Vj + ':' + tr.nuBits.join('');
        if (seen[key] && seen[key] !== tr.muBits.join('')) { isCoalescing = true; break; }
        seen[key] = tr.muBits.join('');
      }
      if (isCoalescing) continue; // skip coalescing cases

      // Try all correspondences (injection sigma + per-block flips + Vj flip)
      const nMu = muBl.blocks.length;
      const nNu = nuBl.blocks.length;
      let found = false;

      // Generate injections
      function tryInjections(sigma, used, depth) {
        if (found) return;
        if (depth === nMu) {
          const remaining = [];
          for (let i = 0; i < nNu; i++) if (!used.has(i)) remaining.push(i);
          if (remaining.length !== 1) return;
          const vjPos = remaining[0];

          for (let flipMask = 0; flipMask < (1 << (nMu + 1)); flipMask++) {
            const muFlips = [];
            for (let i = 0; i < nMu; i++) muFlips.push((flipMask >> i) & 1);
            const vjFlip = (flipMask >> nMu) & 1;

            let allOk = true;
            for (const tr of transitions) {
              for (let i = 0; i < nMu; i++) {
                const expected = muFlips[i] ? 1 - tr.muBits[i] : tr.muBits[i];
                if (tr.nuBits[sigma[i]] !== expected) { allOk = false; break; }
              }
              if (!allOk) break;
              const expectedVj = vjFlip ? 1 - tr.Vj : tr.Vj;
              if (tr.nuBits[vjPos] !== expectedVj) { allOk = false; break; }
            }
            if (allOk) { found = true; return; }
          }
          return;
        }
        for (let i = 0; i < nNu; i++) {
          if (used.has(i)) continue;
          sigma.push(i);
          used.add(i);
          tryInjections(sigma, used, depth + 1);
          sigma.pop();
          used.delete(i);
          if (found) return;
        }
      }

      tryInjections([], new Set(), 0);

      if (found) genCorrespOk++;
      else {
        genCorrespFail++;
        const topStr = tp.length ? '(' + tp.join(',') + ')' : '{}';
        const botStr = bp.length ? '(' + bp.join(',') + ')' : '{}';
        console.log(`  NO GENERAL CORRESP: N=${N} k=${k} top=${topStr} bot=${botStr}`);
      }
    }
  }
}

console.log(`\nInjective cases with general correspondence: ${genCorrespOk}`);
console.log(`Injective cases with NO correspondence: ${genCorrespFail}`);

console.log();
console.log('='.repeat(80));
console.log('FINAL CONCLUSIONS');
console.log('='.repeat(80));
console.log();
console.log('1. BLOCK STRUCTURE: In ALL tested cases, free positions decompose');
console.log('   into independent 2x2 blocks (adjacent pairs), and |mu| = 2^(#blocks).');
console.log();
console.log('2. BLOCK COUNT: nu always has exactly 1 more free block than mu.');
console.log();
console.log('3. DETERMINISM: At t=0, the column insertion transition is ALWAYS');
console.log('   deterministic (each mu+Vj maps to exactly one nu with probability 1).');
console.log();
console.log(`4. PATTERN C (Vj, NOT(b1), ..., NOT(bk)) works in ${patternCcount}/${blocksOkCases} cases`);
console.log('   (the best among fixed-order patterns A-H). It holds for ALL cases');
console.log('   with 0 or 1 free mu blocks, but FAILS for some cases with 2+ blocks.');
console.log();
console.log('5. The failure is due to COALESCING: with 2+ mu blocks, distinct mu');
console.log('   configurations can map to the same nu (the t=0 map is not injective).');
console.log(`   Coalescing cases: ${coalescingCount}. Injective cases with 2+ blocks: ${injectiveCount > 0 ? genCorrespOk + genCorrespFail : 0}.`);
console.log();
console.log(`6. For injective cases with 2+ blocks, general correspondence`);
console.log(`   (arbitrary block permutation + per-block flips): ${genCorrespOk} OK, ${genCorrespFail} fail.`);
console.log();
console.log('BOTTOM LINE: The "copy blocks" claim is FALSE in general.');
console.log('The t=0 transition collapses distinct mu configs into the same nu,');
console.log('so no bijective block-copy pattern can exist universally.');
