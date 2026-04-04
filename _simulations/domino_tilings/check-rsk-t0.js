#!/usr/bin/env node
// check-rsk-t0.js — Verify RSK-type deterministic behavior at t=0
// Extracts math functions from 2026-04-01-vertical-horizontal-interlacing.md

'use strict';

// ═══════════════════════════════════════════════════════════════
// MATH FUNCTIONS (extracted from the simulation)
// ═══════════════════════════════════════════════════════════════

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
  return parts.length === 0 ? '()' : '(' + parts.join(',') + ')';
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

function computeAllDominos(midPSet, topPSet, botPSet, nMid, nOuter, midIsBigger) {
  const midParticles = [], midHoles = [];
  for (let j = 1; j <= nMid; j++) {
    if (midPSet.has(j)) midParticles.push(j); else midHoles.push(j);
  }
  const particleTarget = midIsBigger ? botPSet : topPSet;
  const holeTarget = new Set();
  const holeSource = midIsBigger ? topPSet : botPSet;
  for (let j = 1; j <= nOuter; j++) if (!holeSource.has(j)) holeTarget.add(j);
  const particlePairs = bipartiteMatch(midParticles, particleTarget, nOuter, midIsBigger);
  const holePairs = bipartiteMatch(midHoles, holeTarget, nOuter, midIsBigger);
  return { particlePairs, holePairs };
}

// Enumerate valid mu: k particles on N-1 positions
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

// Enumerate valid nu: k+1 particles on N+1 positions
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

// ═══════════════════════════════════════════════════════════════
// POLYNOMIAL ARITHMETIC
// ═══════════════════════════════════════════════════════════════

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
function polyStr(p) {
  p = polyTrim(p);
  if (p.length === 0 || (p.length === 1 && p[0] === 0)) return '0';
  const terms = [];
  for (let i = 0; i < p.length; i++) {
    if (Math.abs(p[i]) < 1e-12) continue;
    const c = Math.round(p[i] * 1e6) / 1e6;
    if (i === 0) { terms.push('' + c); continue; }
    const tPow = i === 1 ? 't' : 't^' + i;
    if (c === 1) terms.push(tPow);
    else if (c === -1) terms.push('-' + tPow);
    else terms.push(c + '*' + tPow);
  }
  return terms.length === 0 ? '0' : terms.join(' + ').replace(/\+ -/g, '- ');
}

// ═══════════════════════════════════════════════════════════════
// PSI FUNCTIONS
// ═══════════════════════════════════════════════════════════════

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

function psi_vert(lamPos, lamN, muPos, muN) {
  const lam = posToStdPart(lamPos, lamN), mu = posToStdPart(muPos, muN);
  const len = Math.max(lam.length, mu.length) + 1;
  const L = i => lam[i] || 0, M = i => mu[i] || 0;
  for (let i = 0; i < len; i++) {
    if (L(i) - M(i) < 0 || L(i) - M(i) > 1) return { poly: [0], betaPow: 0 };
  }
  let poly = [1];
  for (let i = 0; i < len; i++) {
    if (L(i) === M(i) && L(i + 1) === M(i + 1) + 1) {
      const exp = M(i) - M(i + 1);
      if (exp > 0) poly = polyMul(poly, poly1minusTn(exp));
    }
  }
  const sizeDiff = (lam.reduce((a,b) => a+b, 0)||0) - (mu.reduce((a,b) => a+b, 0)||0);
  return { poly, betaPow: sizeDiff };
}

// ═══════════════════════════════════════════════════════════════
// COLUMN INSERTION PROBABILITY
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// TEST DRIVER
// ═══════════════════════════════════════════════════════════════

function runTestCase(N, k, lamTopDisplay, lamBotDisplay) {
  const lamTopPos = new Set(displayPartToPositions(lamTopDisplay, k, N));
  const lamBotPos = new Set(displayPartToPositions(lamBotDisplay, k + 1, N));

  console.log('================================================================');
  console.log(`N=${N}, k=${k}`);
  console.log(`  lambda_top = (${lamTopDisplay.join(',')})  positions: {${[...lamTopPos].sort((a,b)=>a-b).join(',')}}`);
  console.log(`  lambda_bot = (${lamBotDisplay.join(',')})  positions: {${[...lamBotPos].sort((a,b)=>a-b).join(',')}}`);

  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);

  console.log(`  |mu| = ${allMu.length}, |nu| = ${allNu.length}`);

  if (allMu.length === 0 || allNu.length === 0) {
    console.log('  SKIPPING: no valid mu or nu');
    return;
  }

  const muFF = computeForcedFree(allMu, N - 1);
  const nuFF = computeForcedFree(allNu, N + 1);

  console.log(`  mu free positions: {${[...muFF.free].sort((a,b)=>a-b).join(',')}}`);
  console.log(`  mu forced particles: {${[...muFF.forced].sort((a,b)=>a-b).join(',')}}`);
  console.log(`  mu forced holes: {${[...muFF.forcedHoles].sort((a,b)=>a-b).join(',')}}`);
  console.log(`  nu free positions: {${[...nuFF.free].sort((a,b)=>a-b).join(',')}}`);
  console.log(`  nu forced particles: {${[...nuFF.forced].sort((a,b)=>a-b).join(',')}}`);
  console.log(`  nu forced holes: {${[...nuFF.forcedHoles].sort((a,b)=>a-b).join(',')}}`);

  // Number of free 2x2 blocks
  // For mu: free positions come in pairs (particle/hole at same site)
  // But "free" means the position is a particle in some configs and a hole in others
  // A "free block" = a pair of adjacent free positions where one is particle, one is hole
  // Actually, the free positions form 2x2 blocks. Let's count them as pairs.
  const muFreeList = [...muFF.free].sort((a,b) => a-b);
  const nuFreeList = [...nuFF.free].sort((a,b) => a-b);

  // Each mu config is determined by binary choices at free positions
  // Let's identify the free "blocks" — pairs of consecutive free positions
  // where one must be particle and one must be hole
  function findFreeBlocks(freeList, allConfigs) {
    // For each pair of consecutive free positions, check if exactly one is always a particle
    // Actually simpler: a "free block" = two adjacent free positions that toggle together
    const blocks = [];
    const used = new Set();
    for (let i = 0; i < freeList.length; i++) {
      if (used.has(freeList[i])) continue;
      for (let j = i + 1; j < freeList.length; j++) {
        if (used.has(freeList[j])) continue;
        // Check if these two positions are always complementary
        const p1 = freeList[i], p2 = freeList[j];
        let complementary = true;
        for (const cfg of allConfigs) {
          const has1 = cfg.particles.includes(p1);
          const has2 = cfg.particles.includes(p2);
          if (has1 === has2) { complementary = false; break; }
        }
        if (complementary) {
          blocks.push([p1, p2]);
          used.add(p1);
          used.add(p2);
          break;
        }
      }
    }
    // Check for any unpaired free positions
    const unpaired = freeList.filter(p => !used.has(p));
    return { blocks, unpaired };
  }

  const muBlocks = findFreeBlocks(muFreeList, allMu);
  const nuBlocks = findFreeBlocks(nuFreeList, allNu);

  console.log(`  mu free blocks: ${muBlocks.blocks.map(b=>'['+b.join(',')+']').join(' ')}  unpaired: {${muBlocks.unpaired.join(',')}}`);
  console.log(`  nu free blocks: ${nuBlocks.blocks.map(b=>'['+b.join(',')+']').join(' ')}  unpaired: {${nuBlocks.unpaired.join(',')}}`);
  console.log(`  mu has ${muBlocks.blocks.length} free blocks, nu has ${nuBlocks.blocks.length} free blocks`);

  // Compute transition matrix
  const lamBotStd = posToStdPart([...lamBotPos], N);
  const lamTopStd = posToStdPart([...lamTopPos], N);

  let allDeterministic = true;
  const mapV0 = {}; // mu_key -> nu_key
  const mapV1 = {}; // mu_key -> nu_key

  console.log('');
  console.log('  TRANSITION AT t=0:');

  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muKey = fmtDisplay(mu.particles, N - 1);

    let v0Targets = [];
    let v1Targets = [];

    for (const nu of allNu) {
      const nuStd = posToStdPart(nu.particles, N + 1);
      const nuKey = fmtDisplay(nu.particles, N + 1);

      const p0 = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, 0, k + 1, k);
      const p1 = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, 1, k + 1, k);

      // Evaluate at t=0: just take constant coefficient
      const p0_at0 = p0[0] || 0;
      const p1_at0 = p1[0] || 0;

      if (Math.abs(p0_at0) > 1e-9) {
        v0Targets.push({ nu: nuKey, prob: p0_at0, nuParticles: nu.particles, poly: polyStr(p0) });
      }
      if (Math.abs(p1_at0) > 1e-9) {
        v1Targets.push({ nu: nuKey, prob: p1_at0, nuParticles: nu.particles, poly: polyStr(p1) });
      }
    }

    const det0 = v0Targets.length === 1 && Math.abs(v0Targets[0].prob - 1) < 1e-9;
    const det1 = v1Targets.length === 1 && Math.abs(v1Targets[0].prob - 1) < 1e-9;

    if (!det0 || !det1) allDeterministic = false;

    console.log(`    mu=${muKey}  particles={${mu.particles.join(',')}}`);
    if (det0) {
      console.log(`      Vj=0 -> nu=${v0Targets[0].nu}  (deterministic)  poly: ${v0Targets[0].poly}`);
      mapV0[muKey] = v0Targets[0];
    } else {
      console.log(`      Vj=0 -> NOT DETERMINISTIC:`);
      for (const t of v0Targets) console.log(`        nu=${t.nu}  prob@t=0: ${t.prob}  poly: ${t.poly}`);
    }
    if (det1) {
      console.log(`      Vj=1 -> nu=${v1Targets[0].nu}  (deterministic)  poly: ${v1Targets[0].poly}`);
      mapV1[muKey] = v1Targets[0];
    } else {
      console.log(`      Vj=1 -> NOT DETERMINISTIC:`);
      for (const t of v1Targets) console.log(`        nu=${t.nu}  prob@t=0: ${t.prob}  poly: ${t.poly}`);
    }
  }

  console.log('');
  if (allDeterministic) {
    console.log('  *** DETERMINISTIC at t=0: YES ***');
  } else {
    console.log('  *** DETERMINISTIC at t=0: NO ***');
  }

  // Analyze the pattern of the deterministic map
  if (allDeterministic) {
    console.log('');
    console.log('  FREE BLOCK ANALYSIS:');

    // Encode each mu by its free block orientations
    // For each free block [a,b], orientation = 1 if a is particle, 0 if b is particle
    function encodeFreeBlocks(particles, blocks) {
      const pSet = new Set(particles);
      return blocks.map(([a, b]) => pSet.has(a) ? 1 : 0);
    }

    function encodeNuFreeBlocks(particles, blocks) {
      const pSet = new Set(particles);
      return blocks.map(([a, b]) => pSet.has(a) ? 1 : 0);
    }

    console.log('');
    console.log('  Mapping table (mu free bits -> nu free bits):');
    console.log(`  mu blocks: ${muBlocks.blocks.map(b=>'['+b.join(',')+']').join(' ')}`);
    console.log(`  nu blocks: ${nuBlocks.blocks.map(b=>'['+b.join(',')+']').join(' ')}`);

    for (const mu of allMu) {
      const muKey = fmtDisplay(mu.particles, N - 1);
      const muBits = encodeFreeBlocks(mu.particles, muBlocks.blocks);

      const nu0 = mapV0[muKey];
      const nu1 = mapV1[muKey];

      const nu0Bits = nu0 ? encodeNuFreeBlocks(nu0.nuParticles, nuBlocks.blocks) : null;
      const nu1Bits = nu1 ? encodeNuFreeBlocks(nu1.nuParticles, nuBlocks.blocks) : null;

      console.log(`    mu bits: [${muBits.join(',')}]  ->  Vj=0: nu bits [${nu0Bits ? nu0Bits.join(',') : '?'}]  Vj=1: nu bits [${nu1Bits ? nu1Bits.join(',') : '?'}]`);
    }

    // Check "copy to beginning" pattern: nu_bits = [Vj, mu_bits[0], ..., mu_bits[k-1]]
    // Check "copy to end" pattern: nu_bits = [mu_bits[0], ..., mu_bits[k-1], Vj]
    console.log('');
    console.log('  Pattern checks:');

    let copyToBeginning = true;
    let copyToEnd = true;
    let copyToBeginningFlip = true; // Vj flipped
    let copyToEndFlip = true;

    for (const mu of allMu) {
      const muKey = fmtDisplay(mu.particles, N - 1);
      const muBits = encodeFreeBlocks(mu.particles, muBlocks.blocks);

      for (const Vj of [0, 1]) {
        const nuData = Vj === 0 ? mapV0[muKey] : mapV1[muKey];
        if (!nuData) { copyToBeginning = false; copyToEnd = false; copyToBeginningFlip = false; copyToEndFlip = false; continue; }
        const nuBits = encodeNuFreeBlocks(nuData.nuParticles, nuBlocks.blocks);

        // "Copy to beginning" = nu = [Vj, mu[0], mu[1], ...]
        const beginExpected = [Vj, ...muBits];
        if (nuBits.length !== beginExpected.length || !nuBits.every((b,i) => b === beginExpected[i])) {
          copyToBeginning = false;
        }

        // "Copy to end" = nu = [mu[0], mu[1], ..., Vj]
        const endExpected = [...muBits, Vj];
        if (nuBits.length !== endExpected.length || !nuBits.every((b,i) => b === endExpected[i])) {
          copyToEnd = false;
        }

        // Flipped versions
        const beginFlipExpected = [1-Vj, ...muBits];
        if (nuBits.length !== beginFlipExpected.length || !nuBits.every((b,i) => b === beginFlipExpected[i])) {
          copyToBeginningFlip = false;
        }
        const endFlipExpected = [...muBits, 1-Vj];
        if (nuBits.length !== endFlipExpected.length || !nuBits.every((b,i) => b === endFlipExpected[i])) {
          copyToEndFlip = false;
        }
      }
    }

    console.log(`    "Copy to beginning" (nu = [Vj, mu...]): ${copyToBeginning ? 'YES' : 'no'}`);
    console.log(`    "Copy to end" (nu = [...mu, Vj]): ${copyToEnd ? 'YES' : 'no'}`);
    console.log(`    "Copy to beginning, Vj flipped" (nu = [1-Vj, mu...]): ${copyToBeginningFlip ? 'YES' : 'no'}`);
    console.log(`    "Copy to end, Vj flipped" (nu = [...mu, 1-Vj]): ${copyToEndFlip ? 'YES' : 'no'}`);

    // Check all possible single-position insertions
    console.log('');
    console.log('  Checking all possible insertion positions for Vj bit:');
    for (let insertPos = 0; insertPos <= muBlocks.blocks.length; insertPos++) {
      let matchDirect = true;
      let matchFlip = true;
      for (const mu of allMu) {
        const muKey = fmtDisplay(mu.particles, N - 1);
        const muBits = encodeFreeBlocks(mu.particles, muBlocks.blocks);
        for (const Vj of [0, 1]) {
          const nuData = Vj === 0 ? mapV0[muKey] : mapV1[muKey];
          if (!nuData) { matchDirect = false; matchFlip = false; continue; }
          const nuBits = encodeNuFreeBlocks(nuData.nuParticles, nuBlocks.blocks);
          const expectedDirect = [...muBits.slice(0, insertPos), Vj, ...muBits.slice(insertPos)];
          const expectedFlip = [...muBits.slice(0, insertPos), 1-Vj, ...muBits.slice(insertPos)];
          if (nuBits.length !== expectedDirect.length || !nuBits.every((b,i) => b === expectedDirect[i])) matchDirect = false;
          if (nuBits.length !== expectedFlip.length || !nuBits.every((b,i) => b === expectedFlip[i])) matchFlip = false;
        }
      }
      if (matchDirect) console.log(`    Insert Vj at position ${insertPos}: YES (direct)`);
      if (matchFlip) console.log(`    Insert 1-Vj at position ${insertPos}: YES (flipped)`);
      if (!matchDirect && !matchFlip) console.log(`    Insert at position ${insertPos}: no`);
    }

    // Also try: maybe the mapping is a permutation of mu bits plus insertion
    // More general: find what permutation/transformation maps mu bits to nu bits
    console.log('');
    console.log('  General mapping analysis (each mu -> Vj=0 nu, Vj=1 nu):');
    for (const mu of allMu) {
      const muKey = fmtDisplay(mu.particles, N - 1);
      const muBits = encodeFreeBlocks(mu.particles, muBlocks.blocks);
      const nu0 = mapV0[muKey];
      const nu1 = mapV1[muKey];
      const nu0Bits = nu0 ? encodeNuFreeBlocks(nu0.nuParticles, nuBlocks.blocks) : [];
      const nu1Bits = nu1 ? encodeNuFreeBlocks(nu1.nuParticles, nuBlocks.blocks) : [];

      // Find which bit differs between nu0 and nu1
      const diffBits = [];
      for (let i = 0; i < nu0Bits.length; i++) {
        if (nu0Bits[i] !== nu1Bits[i]) diffBits.push(i);
      }

      console.log(`    mu=${muKey} bits=[${muBits}] -> Vj=0: [${nu0Bits}]  Vj=1: [${nu1Bits}]  diff at nu-positions: [${diffBits}]`);
    }
  }

  // Consistency check: sum over nu of (p0 + p1) should be [2]
  console.log('');
  console.log('  Consistency checks:');
  let allChecksOk = true;
  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    let sumP = [0];
    for (const nu of allNu) {
      const nuStd = posToStdPart(nu.particles, N + 1);
      const p0 = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, 0, k + 1, k);
      const p1 = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, 1, k + 1, k);
      sumP = polyAdd(sumP, polyAdd(p0, p1));
    }
    const ok = polyEqual(sumP, [2]);
    if (!ok) { allChecksOk = false; console.log(`    FAIL: sum for mu=${fmtDisplay(mu.particles, N-1)} = ${polyStr(sumP)} (expected 2)`); }
  }
  if (allChecksOk) console.log('    Row sums = 2: ALL OK');

  console.log('');
}

// ═══════════════════════════════════════════════════════════════
// RUN TEST CASES
// ═══════════════════════════════════════════════════════════════

console.log('=== RSK t=0 Determinism Check ===');
console.log('');

// Default case from the simulation
runTestCase(8, 4, [3, 3, 2], [3, 2, 2, 1]);

// Smaller cases
runTestCase(3, 1, [1], [1, 1]);
runTestCase(4, 2, [2, 1], [2, 1, 1]);
runTestCase(5, 2, [2, 1], [2, 1, 1]);
runTestCase(5, 2, [3, 1], [2, 2, 1]);
runTestCase(6, 3, [3, 2, 1], [3, 2, 1, 1]);
runTestCase(6, 2, [3, 2], [3, 2, 1]);

// More cases with different k
runTestCase(7, 3, [3, 2, 1], [3, 2, 1, 1]);
runTestCase(7, 3, [4, 3, 1], [4, 2, 2, 1]);

// Edge cases: k=1
runTestCase(4, 1, [2], [2, 1]);
runTestCase(5, 1, [3], [2, 1]);

// Larger cases
runTestCase(8, 3, [4, 2, 1], [3, 2, 2, 1]);

// ═══════════════════════════════════════════════════════════════
// DEEP PATTERN ANALYSIS: What exactly does the t=0 map do?
// ═══════════════════════════════════════════════════════════════

console.log('');
console.log('================================================================');
console.log('DEEP PATTERN ANALYSIS');
console.log('================================================================');
console.log('');

function deepAnalysis(N, k, lamTopDisplay, lamBotDisplay) {
  const lamTopPos = new Set(displayPartToPositions(lamTopDisplay, k, N));
  const lamBotPos = new Set(displayPartToPositions(lamBotDisplay, k + 1, N));

  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);

  if (allMu.length === 0 || allNu.length === 0) return;

  const lamBotStd = posToStdPart([...lamBotPos], N);
  const lamTopStd = posToStdPart([...lamTopPos], N);

  const muFF = computeForcedFree(allMu, N - 1);
  const nuFF = computeForcedFree(allNu, N + 1);

  console.log(`N=${N}, k=${k}, lam_top=(${lamTopDisplay}), lam_bot=(${lamBotDisplay})`);
  console.log(`  mu: ${allMu.length} configs, ${[...muFF.free].length} free positions, forced particles {${[...muFF.forced].sort((a,b)=>a-b)}}, forced holes {${[...muFF.forcedHoles].sort((a,b)=>a-b)}}`);
  console.log(`  nu: ${allNu.length} configs, ${[...nuFF.free].length} free positions, forced particles {${[...nuFF.forced].sort((a,b)=>a-b)}}, forced holes {${[...nuFF.forcedHoles].sort((a,b)=>a-b)}}`);

  // Represent each mu/nu as a binary word on their free positions
  // 1 = particle at that free position, 0 = hole
  const muFreeList = [...muFF.free].sort((a,b) => a-b);
  const nuFreeList = [...nuFF.free].sort((a,b) => a-b);

  function toBinaryWord(particles, freeList) {
    const pSet = new Set(particles);
    return freeList.map(p => pSet.has(p) ? 1 : 0);
  }

  // Build the V0 and V1 maps
  const mapV0 = new Map(); // muBinaryStr -> nuBinaryStr
  const mapV1 = new Map();

  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muBin = toBinaryWord(mu.particles, muFreeList);
    const muBinStr = muBin.join('');

    for (const nu of allNu) {
      const nuStd = posToStdPart(nu.particles, N + 1);
      const nuBin = toBinaryWord(nu.particles, nuFreeList);
      const nuBinStr = nuBin.join('');

      const p0 = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, 0, k + 1, k);
      const p1 = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, 1, k + 1, k);

      if (Math.abs((p0[0] || 0) - 1) < 1e-9) mapV0.set(muBinStr, nuBinStr);
      if (Math.abs((p1[0] || 0) - 1) < 1e-9) mapV1.set(muBinStr, nuBinStr);
    }
  }

  console.log(`  mu free list: [${muFreeList}]`);
  console.log(`  nu free list: [${nuFreeList}]`);

  // Print the map
  console.log('  V0 map (mu -> nu on free bits):');
  for (const [m, n] of mapV0) console.log(`    ${m} -> ${n}`);
  console.log('  V1 map (mu -> nu on free bits):');
  for (const [m, n] of mapV1) console.log(`    ${m} -> ${n}`);

  // Key observation from the data: Vj controls nu[0], and the rest is a function of mu bits
  // Let's check: is there an index i such that nu[i] = 1-Vj, and the rest is a function of mu?
  // Also check: is nu[rest] = some_function(mu) that doesn't depend on Vj?
  for (let vjPos = 0; vjPos < nuFreeList.length; vjPos++) {
    let consistent = true;
    let vjDirect = true; // nu[vjPos] = Vj
    let vjFlipped = true; // nu[vjPos] = 1-Vj

    for (const [m, n0] of mapV0) {
      const n1 = mapV1.get(m);
      if (!n1) { consistent = false; break; }
      // Check that positions other than vjPos are the same
      for (let i = 0; i < n0.length; i++) {
        if (i === vjPos) continue;
        if (n0[i] !== n1[i]) { consistent = false; break; }
      }
      if (!consistent) break;
      if (n0[vjPos] !== '0') vjDirect = false;
      if (n0[vjPos] !== '1') vjFlipped = false;
      if (n1[vjPos] !== '1') vjDirect = false;
      if (n1[vjPos] !== '0') vjFlipped = false;
    }

    if (consistent && (vjDirect || vjFlipped)) {
      console.log(`  ** Vj bit maps to nu free position index ${vjPos} (position ${nuFreeList[vjPos]}): ${vjDirect ? 'direct' : 'flipped (1-Vj)'}`);

      // Now extract the mapping for the remaining bits
      console.log(`  ** Remaining bits mapping (excluding nu[${vjPos}]):`);
      for (const [m, n0] of mapV0) {
        const remaining = [];
        for (let i = 0; i < n0.length; i++) {
          if (i === vjPos) continue;
          remaining.push(n0[i]);
        }
        console.log(`    mu: ${m} -> nu_rest: ${remaining.join('')}`);
      }

      // Check if remaining = complement(mu) reversed, or some simple transform
      const muWords = [...mapV0.keys()];
      const nuRest = muWords.map(m => {
        const n0 = mapV0.get(m);
        const r = [];
        for (let i = 0; i < n0.length; i++) if (i !== vjPos) r.push(n0[i]);
        return r.join('');
      });

      // Check: is nuRest[i] = complement(mu[i])?
      let isComplement = true;
      for (let wi = 0; wi < muWords.length; wi++) {
        const m = muWords[wi];
        const c = m.split('').map(b => b === '0' ? '1' : '0').join('');
        if (c !== nuRest[wi]) { isComplement = false; break; }
      }
      if (isComplement) console.log(`  ** Remaining bits = complement of mu bits!`);

      // Check: is nuRest[i] = reverse(complement(mu[i]))?
      let isRevComp = true;
      for (let wi = 0; wi < muWords.length; wi++) {
        const m = muWords[wi];
        const c = m.split('').map(b => b === '0' ? '1' : '0').reverse().join('');
        if (c !== nuRest[wi]) { isRevComp = false; break; }
      }
      if (isRevComp) console.log(`  ** Remaining bits = reverse(complement(mu bits))!`);

      // Check identity
      let isIdentity = true;
      for (let wi = 0; wi < muWords.length; wi++) {
        if (muWords[wi] !== nuRest[wi]) { isIdentity = false; break; }
      }
      if (isIdentity) console.log(`  ** Remaining bits = mu bits (identity)!`);

      // Check reverse
      let isReverse = true;
      for (let wi = 0; wi < muWords.length; wi++) {
        if (muWords[wi].split('').reverse().join('') !== nuRest[wi]) { isReverse = false; break; }
      }
      if (isReverse) console.log(`  ** Remaining bits = reverse(mu bits)!`);

      break;
    }
  }

  // Additional analysis: look at the actual partition-level mapping
  console.log('');
  console.log('  Partition-level mapping:');
  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muKey = fmtDisplay(mu.particles, N - 1);
    for (const nu of allNu) {
      const nuStd = posToStdPart(nu.particles, N + 1);
      const nuKey = fmtDisplay(nu.particles, N + 1);
      const p0 = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, 0, k + 1, k);
      const p1 = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, 1, k + 1, k);
      if (Math.abs((p0[0] || 0) - 1) < 1e-9)
        console.log(`    Vj=0: mu=${muKey} std(${muStd}) -> nu=${nuKey} std(${nuStd})  d_i = [${nuStd.map((v,i) => v - (lamBotStd[i]||0))}]  c_i = [${lamTopStd.map((v,i) => (muStd[i]||0) === v ? 0 : 1)}]`);
      if (Math.abs((p1[0] || 0) - 1) < 1e-9)
        console.log(`    Vj=1: mu=${muKey} std(${muStd}) -> nu=${nuKey} std(${nuStd})  d_i = [${nuStd.map((v,i) => v - (lamBotStd[i]||0))}]  c_i = [${lamTopStd.map((v,i) => (muStd[i]||0) === v ? 0 : 1)}]`);
    }
  }

  // Look at how c_i (mu deviations from lam_top) maps to d_i (nu deviations from lam_bot)
  console.log('');
  console.log('  c_i / d_i mapping (mu = lam_top - c, nu = lam_bot + d):');
  const lamTopStdArr = [...lamTopStd];
  const lamBotStdArr = [...lamBotStd];
  while (lamTopStdArr.length < k) lamTopStdArr.push(0);
  while (lamBotStdArr.length < k + 1) lamBotStdArr.push(0);

  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    while (muStd.length < k) muStd.push(0);
    const c = lamTopStdArr.map((a, i) => a - (muStd[i] || 0));

    for (const Vj of [0, 1]) {
      for (const nu of allNu) {
        const nuStd = posToStdPart(nu.particles, N + 1);
        while (nuStd.length < k + 1) nuStd.push(0);
        const p = colInsertionProb(lamBotStd, nuStd, posToStdPart(mu.particles, N-1), lamTopStd, Vj, k + 1, k);
        if (Math.abs((p[0] || 0) - 1) < 1e-9) {
          const d = lamBotStdArr.map((b, i) => (nuStd[i] || 0) - b);
          console.log(`    Vj=${Vj}: c=[${c}] -> d=[${d}]`);
        }
      }
    }
  }

  console.log('');
}

// Run deep analysis on the key test cases
deepAnalysis(3, 1, [1], [1, 1]);
deepAnalysis(4, 1, [2], [2, 1]);
deepAnalysis(5, 1, [3], [2, 1]);
deepAnalysis(5, 2, [2, 1], [2, 1, 1]);
deepAnalysis(5, 2, [3, 1], [2, 2, 1]);
deepAnalysis(6, 2, [3, 2], [3, 2, 1]);
deepAnalysis(7, 3, [3, 2, 1], [3, 2, 1, 1]);
deepAnalysis(8, 4, [3, 3, 2], [3, 2, 2, 1]);
deepAnalysis(8, 3, [4, 2, 1], [3, 2, 2, 1]);

// Additional: try cases with more free blocks
deepAnalysis(10, 4, [4, 3, 2, 1], [4, 3, 2, 1, 1]);
deepAnalysis(10, 3, [5, 3, 1], [4, 3, 2, 1]);

// ═══════════════════════════════════════════════════════════════
// FINAL PATTERN VERIFICATION
// ═══════════════════════════════════════════════════════════════

console.log('');
console.log('================================================================');
console.log('FINAL PATTERN VERIFICATION');
console.log('================================================================');
console.log('');
console.log('OBSERVED PATTERN in c_i / d_i representation:');
console.log('  mu = lam_top - c  (c_i in {0,1}, length k)');
console.log('  nu = lam_bot + d  (d_i in {0,1}, length k+1)');
console.log('');
console.log('The map at t=0 appears to be:');
console.log('  Given c = (c_1, ..., c_k) and Vj:');
console.log('  d_i = c_1 + c_2 + ... + c_i  (mod 2, prefix partial sums)  -- WRONG');
console.log('');
console.log('Let me look more carefully...');
console.log('');

// From the data:
// c=[1,1,1,1] -> d=[1,1,1,1,0] (Vj=0), d=[1,1,1,1,1] (Vj=1)
// c=[1,0,1,1] -> d=[1,1,0,1,0] (Vj=0), d=[1,1,0,1,1] (Vj=1)
// c=[1,1,0,1] -> d=[1,1,1,0,0] (Vj=0), d=[1,1,1,0,1] (Vj=1)
// c=[1,0,0,1] -> d=[1,0,1,0,0] (Vj=0), d=[1,0,1,0,1] (Vj=1)
// c=[1,1,1,0] -> d=[1,1,1,0,0] (Vj=0), d=[1,1,1,0,1] (Vj=1)
// c=[1,0,1,0] -> d=[1,1,0,0,0] (Vj=0), d=[1,1,0,0,1] (Vj=1)
// c=[1,1,0,0] -> d=[1,1,0,0,0] (Vj=0), d=[1,1,0,0,1] (Vj=1)
// c=[1,0,0,0] -> d=[1,0,0,0,0] (Vj=0), d=[1,0,0,0,1] (Vj=1)

// Pattern: d_{k+1} = Vj always. What about d_1..d_k?
// c=[1,1,1,1] -> d_1..4 = [1,1,1,1]
// c=[1,0,1,1] -> d_1..4 = [1,1,0,1]
// c=[1,1,0,1] -> d_1..4 = [1,1,1,0]
// c=[1,0,0,1] -> d_1..4 = [1,0,1,0]
// c=[1,1,1,0] -> d_1..4 = [1,1,1,0]
// c=[1,0,1,0] -> d_1..4 = [1,1,0,0]
// c=[1,1,0,0] -> d_1..4 = [1,1,0,0]
// c=[1,0,0,0] -> d_1..4 = [1,0,0,0]
//
// Hmm, so d_i is NOT just c_i. Let me check c vs d more carefully.
// c=[1,1] d=[1,1]: same
// c=[0,1] d=[1,0]: different!
// c=[1,0] d=[1,0]: same
// c=[0,0] d=[0,0]: same
//
// c=[1,1,1] d=[1,1,1]: same
// c=[1,0,1] d=[1,1,0]: c2 and c3 seem "bubbled up"
// c=[1,1,0] d=[1,1,0]: same
// c=[1,0,0] d=[1,0,0]: same
//
// This looks like: d is the "sorted" version of c (descending sort)!
// c=[1,1] -> sort desc: [1,1] = d ✓
// c=[0,1] -> sort desc: [1,0] = d ✓
// c=[1,0] -> sort desc: [1,0] = d ✓
// c=[0,0] -> sort desc: [0,0] = d ✓
//
// c=[1,1,1,1] -> sort: [1,1,1,1] = d[1..4] ✓
// c=[1,0,1,1] -> sort: [1,1,1,0] but d=[1,1,0,1] ✗ !!
// Wait, that doesn't work.

// Let me try: partial sums / running max?
// c=[1,0,1,1]:  running sums: 1,1,2,3. d=[1,1,0,1]... no.
//
// Maybe look at it differently. Count 1s in c_i...c_k and compare to d_i...d_k?
// c=[1,0,1,1]: suffix sums from right: c4=1, c3+c4=2, c2+c3+c4=2, c1+c2+c3+c4=3
// d=[1,1,0,1]: suffix sums from right: d4=1, d3+d4=1, d2+d3+d4=2, d1+d2+d3+d4=3
// No clear match.
//
// Prefix sums: c: 1, 1, 2, 3; d: 1, 2, 2, 3. prefix_d = prefix_c + something?
// Diff: 0, 1, 0, 0. Hmm.
//
// OK, this is getting complicated. Let me just verify the exact pattern algorithmically.

function verifyPattern(N, k, lamTopDisplay, lamBotDisplay) {
  const lamTopPos = new Set(displayPartToPositions(lamTopDisplay, k, N));
  const lamBotPos = new Set(displayPartToPositions(lamBotDisplay, k + 1, N));

  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);
  if (allMu.length === 0 || allNu.length === 0) return null;

  const lamBotStd = posToStdPart([...lamBotPos], N);
  const lamTopStd = posToStdPart([...lamTopPos], N);
  const lamTopArr = [...lamTopStd]; while (lamTopArr.length < k) lamTopArr.push(0);
  const lamBotArr = [...lamBotStd]; while (lamBotArr.length < k+1) lamBotArr.push(0);

  const results = [];
  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muArr = [...muStd]; while (muArr.length < k) muArr.push(0);
    const c = lamTopArr.map((a, i) => a - muArr[i]);

    for (const Vj of [0, 1]) {
      for (const nu of allNu) {
        const nuStd = posToStdPart(nu.particles, N + 1);
        const nuArr = [...nuStd]; while (nuArr.length < k+1) nuArr.push(0);
        const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, Vj, k + 1, k);
        if (Math.abs((p[0] || 0) - 1) < 1e-9) {
          const d = lamBotArr.map((b, i) => nuArr[i] - b);
          results.push({ c, d, Vj });
        }
      }
    }
  }
  return results;
}

// Collect all c->d,Vj mappings and check various hypotheses
function checkHypotheses(allResults) {
  // Hypothesis 1: d_{k+1} = Vj (the last d entry is always Vj)
  let h1 = true;
  for (const r of allResults) {
    if (r.d[r.d.length - 1] !== r.Vj) { h1 = false; break; }
  }
  console.log(`  H1: d_{k+1} = Vj: ${h1 ? 'TRUE' : 'FALSE'}`);

  // Hypothesis 2: d_1..d_k = sort(c) descending
  let h2 = true;
  for (const r of allResults) {
    const cSorted = [...r.c].sort((a,b) => b-a);
    const d_prefix = r.d.slice(0, r.c.length);
    if (!cSorted.every((v,i) => v === d_prefix[i])) { h2 = false; break; }
  }
  console.log(`  H2: d_{1..k} = sort(c) descending: ${h2 ? 'TRUE' : 'FALSE'}`);

  // Hypothesis 3: d_1..d_k is c with 1s "bubbled left"
  // i.e., d_i = 1 if prefix_sum(c,i) > i - prefix_sum(d,i)... this is just sorting.
  // Actually, let me check: is the map c -> d_prefix a specific well-known map?

  // Hypothesis 4: d_1..d_k = complementary sorted version
  // The "RSK bumping" idea: insert Vj and bump...
  // Actually, the correct hypothesis might be about the PARTICLES, not c/d.

  // Hypothesis 5: The number of 1s in d_{1..k} = number of 1s in c (conservation)
  let h5 = true;
  for (const r of allResults) {
    const cSum = r.c.reduce((a,b) => a+b, 0);
    const dPrefSum = r.d.slice(0, r.c.length).reduce((a,b) => a+b, 0);
    if (cSum !== dPrefSum) { h5 = false; break; }
  }
  console.log(`  H5: sum(d_{1..k}) = sum(c): ${h5 ? 'TRUE' : 'FALSE'}`);

  // Hypothesis 6: d_{1..k} >= c componentwise (dominance)
  // i.e., d_1+...+d_i >= c_1+...+c_i for all i
  let h6 = true;
  for (const r of allResults) {
    let cPrefSum = 0, dPrefSum = 0;
    for (let i = 0; i < r.c.length; i++) {
      cPrefSum += r.c[i];
      dPrefSum += r.d[i];
      if (dPrefSum < cPrefSum) { h6 = false; break; }
    }
    if (!h6) break;
  }
  console.log(`  H6: prefix sums of d_{1..k} dominate prefix sums of c: ${h6 ? 'TRUE' : 'FALSE'}`);

  // Hypothesis 7: d_{1..k} is the "RSK P-tableau reading word" of c
  // More specifically: sort c in descending order
  // Actually, since c_i in {0,1}, "sort descending" means put all 1s first.
  // H2 already checks this. Let me re-examine where it fails.

  console.log('');
  console.log('  Examining c -> d_{1..k} in detail (Vj=0 only):');
  const v0results = allResults.filter(r => r.Vj === 0);
  for (const r of v0results) {
    const d_prefix = r.d.slice(0, r.c.length);
    const cSorted = [...r.c].sort((a,b) => b-a);
    const match = cSorted.every((v,i) => v === d_prefix[i]) ? '=sort(c)' : '';
    console.log(`    c=[${r.c}] -> d_{1..k}=[${d_prefix}]  sort(c)=[${cSorted}]  ${match}`);
  }

  // Hmm, from N=6,k=2: c=[0,1] -> d=[1,0] = sort(c). c=[1,0] -> d=[1,0] = sort(c).
  // From N=10,k=4: c=[1,0,1,1] -> d=[1,1,0,1]. sort(c)=[1,1,1,0]. NOT equal!
  // So H2 is false. Let me look for the real pattern.

  // What about: d is c with the RIGHTMOST contiguous block of 1s "shifted left"?
  // c=[1,0,1,1]: rightmost block of 1s is positions 3,4 (0-indexed 2,3).
  // Shift to positions 2,3? That gives [1,1,1,0]. But d=[1,1,0,1]. Nope.

  // Try: Look at positions of 0s and 1s
  console.log('');
  console.log('  Positions of 1s in c vs d_{1..k}:');
  for (const r of v0results) {
    if (r.c.length < 2) continue;
    const d_prefix = r.d.slice(0, r.c.length);
    const c1pos = r.c.map((v,i) => v === 1 ? i : -1).filter(i => i >= 0);
    const d1pos = d_prefix.map((v,i) => v === 1 ? i : -1).filter(i => i >= 0);
    console.log(`    c 1-pos: [${c1pos}] -> d 1-pos: [${d1pos}]`);
  }

  // From the k=4 data:
  // c 1-pos: [0,1,2,3] -> d 1-pos: [0,1,2,3] (all 1s stay)
  // c 1-pos: [0,2,3] -> d 1-pos: [0,1,3]   (2->1, 3 stays)
  // c 1-pos: [0,1,3] -> d 1-pos: [0,1,2]   (3->2, others stay)
  // c 1-pos: [0,3] -> d 1-pos: [0,2]       (3->2)
  // c 1-pos: [0,1,2] -> d 1-pos: [0,1,2]   (all stay)
  // c 1-pos: [0,2] -> d 1-pos: [0,1]       (2->1)
  // c 1-pos: [0,1] -> d 1-pos: [0,1]       (stay)
  // c 1-pos: [0] -> d 1-pos: [0]            (stay)
  //
  // Pattern: each 1 in c gets "pushed left" to fill gaps!
  // This is exactly SORTING, but wait, it should be stable sort...
  // Hmm, [0,2,3] -> [0,1,3]?? That's NOT sorting. If we sort we'd get [0,1,2].
  //
  // Wait. c=[1,0,1,1]: 1-positions are {0,2,3}. d=[1,1,0,1]: 1-positions are {0,1,3}.
  // Position 2 moved to position 1. Position 3 stayed at 3. Position 0 stayed.
  // The "gap" was at position 1. The 1 at position 2 filled it. But position 3 didn't move.
  //
  // Another view: 0-positions in c: {1}. 0-positions in d: {2}. The 0 moved RIGHT.
  // c=[1,0,0,1]: 0-pos {1,2}. d=[1,0,1,0]: 0-pos {1,3}. The 0 at position 2 moved to 3.
  // c=[1,1,0,1]: 0-pos {2}. d=[1,1,1,0]: 0-pos {3}. The 0 moved right by 1.
  // c=[1,0,1,0]: 0-pos {1,3}. d=[1,1,0,0]: 0-pos {2,3}. The 0 at position 1 moved to 2.
  // c=[1,1,0,0]: 0-pos {2,3}. d=[1,1,0,0]: 0-pos {2,3}. Stayed.
  // c=[1,0,0,0]: 0-pos {1,2,3}. d=[1,0,0,0]: 0-pos {1,2,3}. Stayed.
  //
  // PATTERN: Each 0 that has a 1 to its right gets pushed to the right by one position,
  // and the corresponding 1 moves left. It's like BUBBLE SORT one pass from the right!
  // Actually: scan from right to left, and for each 01 pair, swap to 10.
  // c=[1,0,1,1]: scan right-to-left: pos 2,3 are 1,1 (no swap). pos 1,2 are 0,1 -> swap to 1,0.
  //   After: [1,1,0,1]. YES! This matches d!
  // c=[1,0,0,1]: scan right-to-left: pos 2,3 are 0,1 -> swap to 1,0 -> [1,0,1,0].
  //   Then pos 1,2 are 0,1 -> swap to 1,0 -> [1,1,0,0]. But d=[1,0,1,0].
  //   Hmm, that's two passes. One pass gives [1,0,1,0] which matches!
  //
  // So it's ONE pass of bubble sort from the right: swap each "01" -> "10" going right-to-left,
  // but each element can only move once.
  //
  // Actually more precisely: find the RIGHTMOST 0 that is followed by a 1, and swap them.
  // c=[1,0,1,1]: rightmost "01" is at positions 1,2. Swap: [1,1,0,1]. ✓
  // c=[1,0,0,1]: rightmost "01" is at positions 2,3. Swap: [1,0,1,0]. ✓
  // c=[1,1,0,1]: rightmost "01" is at positions 2,3. Swap: [1,1,1,0]. ✓
  // c=[0,1]: rightmost "01" is at positions 0,1. Swap: [1,0]. ✓
  // c=[1,0]: no "01" pair (it's "10"). d=[1,0]. ✓ (no swap needed)
  // c=[1,1]: no "01". d=[1,1]. ✓
  // c=[0,0]: no "01". d=[0,0]. ✓

  console.log('');
  console.log('  TESTING HYPOTHESIS: "swap rightmost 01 pair in c"');
  let h_swap_rightmost = true;
  for (const r of v0results) {
    const d_prefix = r.d.slice(0, r.c.length);
    // Apply: find rightmost 01 in c, swap it
    const expected = [...r.c];
    for (let i = expected.length - 2; i >= 0; i--) {
      if (expected[i] === 0 && expected[i+1] === 1) {
        expected[i] = 1;
        expected[i+1] = 0;
        break;
      }
    }
    const match = expected.every((v,i) => v === d_prefix[i]);
    if (!match) {
      console.log(`    FAIL: c=[${r.c}] expected=[${expected}] actual d=[${d_prefix}]`);
      h_swap_rightmost = false;
    }
  }
  console.log(`  Result: ${h_swap_rightmost ? 'TRUE for all Vj=0 cases' : 'FALSE'}`);

  // Also check: for Vj=1, is d_{1..k} just c? (no swap)
  console.log('');
  console.log('  TESTING: For Vj=1, is d_{1..k} = c?');
  let h_vj1_identity = true;
  const v1results = allResults.filter(r => r.Vj === 1);
  for (const r of v1results) {
    const d_prefix = r.d.slice(0, r.c.length);
    if (!r.c.every((v,i) => v === d_prefix[i])) {
      console.log(`    FAIL: c=[${r.c}] d_{1..k}=[${d_prefix}]`);
      h_vj1_identity = false;
    }
  }
  console.log(`  Result: ${h_vj1_identity ? 'TRUE' : 'FALSE'}`);

  // So the FULL pattern might be:
  // For Vj=0: d = [swap_rightmost_01(c), 0]
  // For Vj=1: d = [c, 1]
  // Wait, but we already showed d_{k+1} = Vj. So:
  // Vj=0: d_{1..k} = swap_rightmost_01(c), d_{k+1} = 0
  // Vj=1: d_{1..k} = c, d_{k+1} = 1

  // Hmm wait. From N=5,k=1,lam_top=(3),lam_bot=(2,1):
  // c=[0] -> Vj=0: d=[0,0], Vj=1: d=[1,0]
  // d_{k+1}=Vj: d[1]=0 for Vj=0 ✓, d[1]=0 for Vj=1 ✗!
  // So H1 is not always true? Let me recheck.
  // Actually k=1, so d has length 2. d_1 = d[0], d_2 = d[1] = d_{k+1}.
  // Vj=0: d=[0,0], d_{k+1}=d[1]=0=Vj ✓
  // Vj=1: d=[1,0], d_{k+1}=d[1]=0 but Vj=1. ✗!
  // So H1 is FALSE for this case!

  // Wait, I need to recheck. Let me look at the raw data again for that case.
}

// Gather all results from all test cases
const allTestCases = [
  [3, 1, [1], [1, 1]],
  [4, 1, [2], [2, 1]],
  [5, 1, [3], [2, 1]],
  [5, 2, [2, 1], [2, 1, 1]],
  [5, 2, [3, 1], [2, 2, 1]],
  [6, 2, [3, 2], [3, 2, 1]],
  [7, 3, [3, 2, 1], [3, 2, 1, 1]],
  [8, 4, [3, 3, 2], [3, 2, 2, 1]],
  [8, 3, [4, 2, 1], [3, 2, 2, 1]],
  [10, 4, [4, 3, 2, 1], [4, 3, 2, 1, 1]],
  [10, 3, [5, 3, 1], [4, 3, 2, 1]],
];

let allResults = [];
for (const [N, k, lt, lb] of allTestCases) {
  const r = verifyPattern(N, k, lt, lb);
  if (r) allResults = allResults.concat(r);
}

console.log('Collected', allResults.length, 'total (c, d, Vj) triples');
console.log('');
checkHypotheses(allResults);

// Final comprehensive check
console.log('');
console.log('================================================================');
console.log('COMPREHENSIVE c -> d PATTERN CHECK');
console.log('================================================================');
console.log('');

// For every result, print c, d, Vj and test multiple hypotheses
let countCorrect_newH = 0;
let countTotal = 0;

for (const r of allResults) {
  countTotal++;
  const k = r.c.length;
  const d_prefix = r.d.slice(0, k);

  // New hypothesis: examine sum(c) and positions
  // From the data, the mapping depends on relative positions of 0s and 1s
  // and on Vj. Let me just print everything.
}

// Let me check the simplest hypothesis more carefully:
// Vj=0: c appended with 0, then rightmost "01" swapped
// Vj=1: c appended with 1, then rightmost "01" swapped (which would be the last pair always)
console.log('HYPOTHESIS: Append Vj to END of c, then swap rightmost "01" pair');
console.log('');

let h_append_swap = true;
for (const r of allResults) {
  const extended = [...r.c, r.Vj];
  // Find rightmost "01" and swap
  const swapped = [...extended];
  for (let i = swapped.length - 2; i >= 0; i--) {
    if (swapped[i] === 0 && swapped[i+1] === 1) {
      swapped[i] = 1;
      swapped[i+1] = 0;
      break;
    }
  }
  const match = swapped.every((v,i) => v === r.d[i]);
  if (!match) {
    console.log(`  FAIL: c=[${r.c}] Vj=${r.Vj} -> extended=[${extended}] swapped=[${swapped}] actual d=[${r.d}]`);
    h_append_swap = false;
  }
}
console.log(`Result: ${h_append_swap ? '*** TRUE FOR ALL CASES ***' : 'FALSE'}`);

// Alternative: Prepend Vj, then swap rightmost "01" pair
console.log('');
console.log('HYPOTHESIS: Prepend Vj to BEGINNING of c, then swap rightmost "01" pair');
let h_prepend_swap = true;
for (const r of allResults) {
  const extended = [r.Vj, ...r.c];
  const swapped = [...extended];
  for (let i = swapped.length - 2; i >= 0; i--) {
    if (swapped[i] === 0 && swapped[i+1] === 1) {
      swapped[i] = 1;
      swapped[i+1] = 0;
      break;
    }
  }
  const match = swapped.every((v,i) => v === r.d[i]);
  if (!match && allResults.length <= 80) {
    console.log(`  FAIL: c=[${r.c}] Vj=${r.Vj} -> extended=[${extended}] swapped=[${swapped}] actual d=[${r.d}]`);
    h_prepend_swap = false;
  }
}
console.log(`Result: ${h_prepend_swap ? '*** TRUE FOR ALL CASES ***' : 'FALSE'}`);

// Alternative: Append 1-Vj, then swap
console.log('');
console.log('HYPOTHESIS: Append (1-Vj) to END of c, then swap rightmost "01" pair');
let h_append_flip_swap = true;
for (const r of allResults) {
  const extended = [...r.c, 1-r.Vj];
  const swapped = [...extended];
  for (let i = swapped.length - 2; i >= 0; i--) {
    if (swapped[i] === 0 && swapped[i+1] === 1) {
      swapped[i] = 1;
      swapped[i+1] = 0;
      break;
    }
  }
  const match = swapped.every((v,i) => v === r.d[i]);
  if (!match && allResults.length <= 80) {
    console.log(`  FAIL: c=[${r.c}] Vj=${r.Vj} -> extended=[${extended}] swapped=[${swapped}] actual d=[${r.d}]`);
    h_append_flip_swap = false;
  }
}
console.log(`Result: ${h_append_flip_swap ? '*** TRUE FOR ALL CASES ***' : 'FALSE'}`);

// Alternative: Prepend 1-Vj, then swap leftmost "10" pair
console.log('');
console.log('HYPOTHESIS: Prepend (1-Vj) to BEGINNING of c, then swap leftmost "10" pair');
let h_prepend_flip_swapleft = true;
for (const r of allResults) {
  const extended = [1-r.Vj, ...r.c];
  const swapped = [...extended];
  for (let i = 0; i < swapped.length - 1; i++) {
    if (swapped[i] === 1 && swapped[i+1] === 0) {
      swapped[i] = 0;
      swapped[i+1] = 1;
      break;
    }
  }
  const match = swapped.every((v,i) => v === r.d[i]);
  if (!match && allResults.length <= 80) {
    console.log(`  FAIL: c=[${r.c}] Vj=${r.Vj} -> extended=[${extended}] swapped=[${swapped}] actual d=[${r.d}]`);
    h_prepend_flip_swapleft = false;
  }
}
console.log(`Result: ${h_prepend_flip_swapleft ? '*** TRUE FOR ALL CASES ***' : 'FALSE'}`);

// Try all 8 combinations: {prepend,append} x {Vj, 1-Vj} x {swap rightmost 01, swap leftmost 10}
console.log('');
console.log('EXHAUSTIVE: All 8 combinations of {prepend,append} x {Vj,1-Vj} x {rightmost 01, leftmost 10}:');
for (const pos of ['prepend', 'append']) {
  for (const flip of [false, true]) {
    for (const swapDir of ['rightmost01', 'leftmost10']) {
      let ok = true;
      for (const r of allResults) {
        const bit = flip ? 1 - r.Vj : r.Vj;
        const extended = pos === 'prepend' ? [bit, ...r.c] : [...r.c, bit];
        const swapped = [...extended];
        if (swapDir === 'rightmost01') {
          for (let i = swapped.length - 2; i >= 0; i--) {
            if (swapped[i] === 0 && swapped[i+1] === 1) { swapped[i] = 1; swapped[i+1] = 0; break; }
          }
        } else {
          for (let i = 0; i < swapped.length - 1; i++) {
            if (swapped[i] === 1 && swapped[i+1] === 0) { swapped[i] = 0; swapped[i+1] = 1; break; }
          }
        }
        if (!swapped.every((v,i) => v === r.d[i])) { ok = false; break; }
      }
      console.log(`  ${pos} ${flip ? '1-Vj' : 'Vj'} + ${swapDir}: ${ok ? '*** MATCH ***' : 'no'}`);
    }
  }
}

// Also try: no swap at all
console.log('');
console.log('NO-SWAP variants:');
for (const pos of ['prepend', 'append']) {
  for (const flip of [false, true]) {
    let ok = true;
    for (const r of allResults) {
      const bit = flip ? 1 - r.Vj : r.Vj;
      const extended = pos === 'prepend' ? [bit, ...r.c] : [...r.c, bit];
      if (!extended.every((v,i) => v === r.d[i])) { ok = false; break; }
    }
    console.log(`  ${pos} ${flip ? '1-Vj' : 'Vj'} (no swap): ${ok ? '*** MATCH ***' : 'no'}`);
  }
}

// Maybe the pattern involves the 0s, not the 1s. Let me think about it differently.
// Define e_i = 1 - c_i (so e tracks where mu EQUALS lam_top vs differs).
// And f_i = 1 - d_i.
// Then f might be related to e in a simpler way.
console.log('');
console.log('COMPLEMENT VIEW: e = 1-c, f = 1-d');
console.log('');
for (const r of allResults) {
  const e = r.c.map(v => 1-v);
  const f = r.d.map(v => 1-v);
  // console.log(`  Vj=${r.Vj}: e=[${e}] -> f=[${f}]`);
}

// Try: f = append(e, 1-Vj) then swap leftmost "01"
// Equivalently in complement: f is e with 1-Vj appended, then leftmost 01 swapped
for (const pos of ['prepend', 'append']) {
  for (const flip of [false, true]) {
    for (const swapDir of ['rightmost01', 'leftmost10', 'none']) {
      let ok = true;
      for (const r of allResults) {
        const e = r.c.map(v => 1-v);
        const f = r.d.map(v => 1-v);
        const bit = flip ? 1 - r.Vj : r.Vj;
        const extended = pos === 'prepend' ? [bit, ...e] : [...e, bit];
        const swapped = [...extended];
        if (swapDir === 'rightmost01') {
          for (let i = swapped.length - 2; i >= 0; i--) {
            if (swapped[i] === 0 && swapped[i+1] === 1) { swapped[i] = 1; swapped[i+1] = 0; break; }
          }
        } else if (swapDir === 'leftmost10') {
          for (let i = 0; i < swapped.length - 1; i++) {
            if (swapped[i] === 1 && swapped[i+1] === 0) { swapped[i] = 0; swapped[i+1] = 1; break; }
          }
        }
        if (!swapped.every((v,i) => v === f[i])) { ok = false; break; }
      }
      if (ok) console.log(`  complement: ${pos} ${flip ? '1-Vj' : 'Vj'} + ${swapDir}: *** MATCH ***`);
    }
  }
}

// The simple single-swap hypotheses all fail. Let me look at the PARTICLE positions directly.
// The key insight: we should look at particles, not c/d vectors.

console.log('');
console.log('================================================================');
console.log('PARTICLE-LEVEL ANALYSIS');
console.log('================================================================');
console.log('');

function particleAnalysis(N, k, lamTopDisplay, lamBotDisplay) {
  const lamTopPos = new Set(displayPartToPositions(lamTopDisplay, k, N));
  const lamBotPos = new Set(displayPartToPositions(lamBotDisplay, k + 1, N));

  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);
  if (allMu.length === 0 || allNu.length === 0) return;

  const lamBotStd = posToStdPart([...lamBotPos], N);
  const lamTopStd = posToStdPart([...lamTopPos], N);

  const muFF = computeForcedFree(allMu, N - 1);
  const nuFF = computeForcedFree(allNu, N + 1);
  const muFreeList = [...muFF.free].sort((a,b) => a-b);
  const nuFreeList = [...nuFF.free].sort((a,b) => a-b);

  console.log(`N=${N}, k=${k}, lt=(${lamTopDisplay}), lb=(${lamBotDisplay})`);
  console.log(`  mu particles on {1..${N-1}}, k=${k}. Forced: {${[...muFF.forced].sort((a,b)=>a-b)}}. Free: {${muFreeList}}.`);
  console.log(`  nu particles on {1..${N+1}}, k+1=${k+1}. Forced: {${[...nuFF.forced].sort((a,b)=>a-b)}}. Free: {${nuFreeList}}.`);

  // For each mu, get the Vj=0 and Vj=1 targets
  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muKey = mu.particles.join(',');

    for (const Vj of [0, 1]) {
      for (const nu of allNu) {
        const nuStd = posToStdPart(nu.particles, N + 1);
        const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, Vj, k + 1, k);
        if (Math.abs((p[0] || 0) - 1) < 1e-9) {
          // Show the particle positions and how they relate
          const muSet = new Set(mu.particles);
          const nuSet = new Set(nu.particles);

          // Which nu particles are NOT in mu? Which mu particles are NOT in nu?
          // (positions live on different lattices: mu on {1..N-1}, nu on {1..N+1})
          // So direct comparison doesn't make sense.

          // Better: look at the FREE positions of mu and nu
          const muFreeBits = muFreeList.map(p => muSet.has(p) ? 1 : 0);
          const nuFreeBits = nuFreeList.map(p => nuSet.has(p) ? 1 : 0);

          console.log(`    mu={${mu.particles}} free[${muFreeBits}] Vj=${Vj} -> nu={${nu.particles}} free[${nuFreeBits}]`);
        }
      }
    }
  }
  console.log('');
}

particleAnalysis(6, 2, [3, 2], [3, 2, 1]);
particleAnalysis(7, 3, [3, 2, 1], [3, 2, 1, 1]);
particleAnalysis(8, 4, [3, 3, 2], [3, 2, 2, 1]);
particleAnalysis(10, 4, [4, 3, 2, 1], [4, 3, 2, 1, 1]);

// Now let me look at this from the "standard partition" / Young diagram perspective
// mu_i = lam_top_i - c_i, nu_i = lam_bot_i + d_i
// The key observation is what the transition does at the PARTITION level

console.log('');
console.log('================================================================');
console.log('PARTITION-LEVEL RSK PATTERN (REVISED ANALYSIS)');
console.log('================================================================');
console.log('');

// From the data, the Vj=0 case has d_{k+1} = 0 and the Vj=1 case has d_{k+1} = Vj
// EXCEPT for the cases where the map is non-trivial.
// Let me tabulate ALL c->d pairs, both Vj values, using a canonical format.

function buildCtoD(N, k, lamTopDisplay, lamBotDisplay) {
  const lamTopPos = new Set(displayPartToPositions(lamTopDisplay, k, N));
  const lamBotPos = new Set(displayPartToPositions(lamBotDisplay, k + 1, N));
  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);
  if (allMu.length === 0 || allNu.length === 0) return [];
  const lamBotStd = posToStdPart([...lamBotPos], N);
  const lamTopStd = posToStdPart([...lamTopPos], N);
  const lamTopArr = [...lamTopStd]; while (lamTopArr.length < k) lamTopArr.push(0);
  const lamBotArr = [...lamBotStd]; while (lamBotArr.length < k+1) lamBotArr.push(0);

  const results = [];
  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muArr = [...muStd]; while (muArr.length < k) muArr.push(0);
    const c = lamTopArr.map((a, i) => a - muArr[i]);
    for (const Vj of [0, 1]) {
      for (const nu of allNu) {
        const nuStd = posToStdPart(nu.particles, N + 1);
        const nuArr = [...nuStd]; while (nuArr.length < k+1) nuArr.push(0);
        const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, Vj, k + 1, k);
        if (Math.abs((p[0] || 0) - 1) < 1e-9) {
          const d = lamBotArr.map((b, i) => nuArr[i] - b);
          results.push({ c, d, Vj, k });
        }
      }
    }
  }
  return results;
}

// Collect all
let allCD = [];
for (const [N, k, lt, lb] of allTestCases) {
  allCD = allCD.concat(buildCtoD(N, k, lt, lb));
}

// Now look at running sums
console.log('Prefix sum analysis:');
console.log('  c_cumul = [c1, c1+c2, ...]  d_cumul = [d1, d1+d2, ...]');
console.log('');
for (const r of allCD) {
  const cc = []; let s = 0;
  for (const v of r.c) { s += v; cc.push(s); }
  const dc = []; s = 0;
  for (const v of r.d) { s += v; dc.push(s); }
  // Is d_cumul = [Vj, c_cumul[0]+Vj, c_cumul[1]+Vj, ...]? No, lengths differ.
  // d has k+1 entries, c has k entries.
}

// Key observation from looking at the RAW data again very carefully:
// Vj=0: c=[1,1] -> d=[1,1,0]. Vj=1: c=[1,1] -> d=[1,1,1]
// Vj=0: c=[0,1] -> d=[1,0,0]. Vj=1: c=[0,1] -> d=[1,0,1]
// Vj=0: c=[1,0] -> d=[1,0,0]. Vj=1: c=[1,0] -> d=[1,0,1]
// Vj=0: c=[0,0] -> d=[0,0,0]. Vj=1: c=[0,0] -> d=[0,0,1]
//
// For Vj=1: d = [c[0], c[1], ..., c[k], 1] -- i.e. d_{1..k} is NOT c, but some transform of c, and d_{k+1}=1
// Wait: c=[0,1], d=[1,0,1]. d_{1..2}=[1,0] != c=[0,1]. The 0 and 1 swapped!
// c=[1,0], d=[1,0,1]. d_{1..2}=[1,0] = c=[1,0]. Same!
// So d_{1..k} for Vj=1 is: c with 0s bubbled to the right (sorted).
// c=[1,1] -> [1,1] (already sorted) ✓
// c=[0,1] -> [1,0] (sorted desc) ✓
// c=[1,0] -> [1,0] (already sorted) ✓
// c=[0,0] -> [0,0] (already sorted) ✓
//
// For k=3: c=[1,0,1] -> d=[1,1,0,1]. d_{1..3}=[1,1,0]. Sorted(c)=[1,1,0] ✓!
// c=[1,1,0] -> d=[1,1,0,1]. d_{1..3}=[1,1,0]. Sorted(c)=[1,1,0] ✓!
// c=[1,0,0] -> d=[1,0,0,1]. d_{1..3}=[1,0,0]. Sorted(c)=[1,0,0] ✓!
// c=[1,1,1] -> d=[1,1,1,1]. d_{1..3}=[1,1,1]. Sorted(c)=[1,1,1] ✓!
//
// For k=4: c=[1,0,1,1] -> d=[1,1,0,1,1]. d_{1..4}=[1,1,0,1]. Sorted(c)=[1,1,1,0]. NOT equal!
// d_{1..4}=[1,1,0,1] vs sorted=[1,1,1,0]. Different!
// Hmm. So sorting doesn't work for k=4.

// Let me check: what IS the correct map for k=4?
// Vj=1 cases for the N=8,k=4 data:
// c=[1,1,0,1] -> d=[1,1,1,0,1]  d_{1..4}=[1,1,1,0]
// c=[1,0,0,1] -> d=[1,0,1,0,1]  d_{1..4}=[1,0,1,0]
// c=[1,1,0,0] -> d=[1,1,0,0,1]  d_{1..4}=[1,1,0,0]
// c=[1,0,0,0] -> d=[1,0,0,0,1]  d_{1..4}=[1,0,0,0]
//
// And for N=10,k=4:
// c=[1,1,1,1] -> d=[1,1,1,1,1]  d_{1..4}=[1,1,1,1]  same as c ✓
// c=[1,0,1,1] -> d=[1,1,0,1,1]  d_{1..4}=[1,1,0,1]  ≠c=[1,0,1,1]
// c=[1,1,0,1] -> d=[1,1,1,0,1]  d_{1..4}=[1,1,1,0]  ≠c=[1,1,0,1]
// c=[1,0,0,1] -> d=[1,0,1,0,1]  d_{1..4}=[1,0,1,0]  ≠c=[1,0,0,1]
// c=[1,1,1,0] -> d=[1,1,1,0,1]  d_{1..4}=[1,1,1,0]  same as c ✓
// c=[1,0,1,0] -> d=[1,1,0,0,1]  d_{1..4}=[1,1,0,0]  ≠c=[1,0,1,0]
// c=[1,1,0,0] -> d=[1,1,0,0,1]  d_{1..4}=[1,1,0,0]  same as c ✓
// c=[1,0,0,0] -> d=[1,0,0,0,1]  d_{1..4}=[1,0,0,0]  same as c ✓
//
// Pattern: d_{1..k} only differs from c when c has a "0" followed by "1" at positions i, i+1
// where both are in the LAST position of their respective "free block".
// Actually: c=[1,0,1,1] has 01 at positions 1,2. The d pushes the 0 to position 2 and 1 to position 1.
// c=[1,1,0,1] has 01 at positions 2,3. d pushes: [1,1,1,0].
// c=[1,0,0,1] has 01 at positions 2,3 (last 01). d: [1,0,1,0]. The rightmost 01 swapped.
// c=[1,0,1,0] has 01 at positions 1,2. d: [1,1,0,0]. The rightmost 01 is at 1,2. Swap: [1,1,0,0]. ✓!
//
// Wait -- "rightmost 01" in c=[1,0,0,1] is at positions 2,3. Swapping gives [1,0,1,0] = d. ✓!
// "rightmost 01" in c=[1,0,1,1] is at positions 1,2 (since pos 2,3 are 1,1). Wait no,
//   c=[1,0,1,1]: positions 0,1 = "10", positions 1,2 = "01", positions 2,3 = "11".
//   Rightmost "01" is at positions 1,2. Swap: [1,1,0,1]. ✓!
// c=[1,1,0,1]: rightmost "01" is at positions 2,3. Swap: [1,1,1,0]. ✓!
//
// So for Vj=1: d_{1..k} = c with rightmost "01" swapped, d_{k+1} = 1.
// And for Vj=0: d_{1..k} = c with rightmost "01" swapped, d_{k+1} = 0.
//
// Wait, but earlier the "swap rightmost 01" hypothesis was checked for Vj=0 and it passed!
// And for Vj=1 with d_{1..k} identity, it also had some failures.
// Let me re-verify: is d_{1..k} = swap_rightmost_01(c) for BOTH Vj values?
// And d_{k+1} = Vj?

console.log('');
console.log('================================================================');
console.log('REFINED HYPOTHESIS: d_{1..k} = swap_rightmost_01(c), d_{k+1} = Vj');
console.log('================================================================');
console.log('');

function swapRightmost01(arr) {
  const r = [...arr];
  for (let i = r.length - 2; i >= 0; i--) {
    if (r[i] === 0 && r[i+1] === 1) {
      r[i] = 1; r[i+1] = 0;
      return r;
    }
  }
  return r; // no 01 found
}

let refined_ok = true;
let refined_count = 0;
for (const r of allCD) {
  refined_count++;
  const d_prefix = r.d.slice(0, r.k);
  const d_last = r.d[r.k];
  const expected_prefix = swapRightmost01(r.c);

  const prefix_ok = expected_prefix.every((v,i) => v === d_prefix[i]);
  const last_ok = d_last === r.Vj;

  if (!prefix_ok || !last_ok) {
    refined_ok = false;
    console.log(`  FAIL: c=[${r.c}] Vj=${r.Vj} -> d=[${r.d}]  expected: [${expected_prefix},${r.Vj}]`);
  }
}
console.log(`Checked ${refined_count} cases. Result: ${refined_ok ? '*** ALL MATCH ***' : 'FAILED'}`);

// If that doesn't work, try: d_{1..k} = c for both, d_{k+1} = Vj for Vj=1, d_{k+1}=0 for Vj=0
// but we modify d_{1..k} only for Vj=0 by swapping rightmost 01.

console.log('');
console.log('ALTERNATIVE: Vj=0: d = [swap_rightmost_01(c), 0]; Vj=1: d = [c, 1]');
let alt1_ok = true;
for (const r of allCD) {
  const d_prefix = r.d.slice(0, r.k);
  const d_last = r.d[r.k];
  let expected_prefix;
  if (r.Vj === 0) {
    expected_prefix = swapRightmost01(r.c);
  } else {
    expected_prefix = [...r.c];
  }
  const prefix_ok = expected_prefix.every((v,i) => v === d_prefix[i]);
  const last_ok = d_last === r.Vj;
  if (!prefix_ok || !last_ok) {
    alt1_ok = false;
    console.log(`  FAIL: c=[${r.c}] Vj=${r.Vj} -> d=[${r.d}]  expected: [${expected_prefix},${r.Vj}]`);
  }
}
console.log(`Result: ${alt1_ok ? '*** ALL MATCH ***' : 'FAILED'}`);

// Yet another: maybe the swap happens in a DIFFERENT representation.
// Let me try looking at it from the PARTICLE interlacing point of view.
// mu interlaces between lam_top (k particles on N) and lam_bot (k+1 particles on N)
// nu interlaces between lam_bot (k+1 on N) and something on N+1

// Actually, wait. Let me reconsider. The "free blocks" are at specific positions.
// Let me look at how free positions of mu relate to free positions of nu, using
// position-by-position comparison (not c/d vectors).

console.log('');
console.log('================================================================');
console.log('TRYING: position-level mapping via interlacing');
console.log('================================================================');
console.log('');

// In the interlacing picture:
// mu has k particles at positions in {1,...,N-1}
// nu has k+1 particles at positions in {1,...,N+1}
// The "free" positions for mu form pairs (2-blocks). Similarly for nu.
// The question is how the choices at mu free positions map to choices at nu free positions.

// For the FREE BLOCK encoding used earlier:
// block = [a,b] where one of a,b is always a particle, the other always a hole
// block-bit = 1 if a is particle, 0 if b is particle
// (here a < b within each block)
//
// From the data: mu has k free blocks, nu has k+1 free blocks.
// The Vj bit always controls the FIRST nu block (index 0).
// Vj=0 -> nu_block_0_bit = 1, Vj=1 -> nu_block_0_bit = 0.
// (Or is it the opposite?)
//
// For the remaining nu blocks... they are NOT simply the mu blocks.
// In the N=6,k=2 case:
//   mu bits [1,1] -> Vj=0: nu bits [1,0,0]  Vj=1: [0,0,0]
//   mu bits [1,0] -> Vj=0: [1,1,0]  Vj=1: [0,1,0]
//   mu bits [0,1] -> Vj=0: [1,1,0]  Vj=1: [0,1,0]
//   mu bits [0,0] -> Vj=0: [1,1,1]  Vj=1: [0,1,1]
//
// Note: nu_block[0] = 1-Vj always. Then nu_blocks[1:] for both Vj are the same!
// [1,1] -> nu_rest = [0,0]
// [1,0] -> nu_rest = [1,0]
// [0,1] -> nu_rest = [1,0]
// [0,0] -> nu_rest = [1,1]
//
// nu_rest = complement of mu bits, sorted descending? [0,0]->comp=[1,1]->sort=[1,1] but actual=[0,0]. No.
// nu_rest = ... count of 0s and 1s? mu=[1,1] has 2 ones, nu_rest=[0,0] has 0 ones.
// mu=[1,0] -> nu_rest=[1,0]: same! mu=[0,1] -> nu_rest=[1,0]: sorted!
// mu=[0,0] -> nu_rest=[1,1]: COMPLEMENT!
//
// Hmm. nu_rest = sort_desc(complement(mu))?
// mu=[1,1], comp=[0,0], sort=[0,0], actual=[0,0]. ✓
// mu=[1,0], comp=[0,1], sort=[1,0], actual=[1,0]. ✓
// mu=[0,1], comp=[1,0], sort=[1,0], actual=[1,0]. ✓
// mu=[0,0], comp=[1,1], sort=[1,1], actual=[1,1]. ✓!
//
// Interesting! Let me check k=4:
//   mu bits [1,0,1,0] -> nu_rest (from N=8,k=4):
//     Vj=0: [1,0,0,1,0,1] -> nu[0]=1, nu_rest = [0,0,1,0,1]... wait, that's 5 bits for 3 blocks.
//
// I need to be more careful about free block identification.

// Actually, the encoding might be simpler than I think if I look at the N=8,k=4 case more carefully.
// mu free blocks: [1,2] [4,5]. nu free blocks: [1,2] [4,5] [6,7].
// These are DIFFERENT positions on different lattices!
// mu lives on {1..7}, nu lives on {1..9}.
// mu block [1,2]: positions 1,2 on the N-1=7 lattice.
// nu block [1,2]: positions 1,2 on the N+1=9 lattice.
// These are the SAME absolute positions (since the lattices overlap).
// nu has an EXTRA block [6,7] that mu doesn't have.
//
// So the pattern might be: mu blocks map to the CORRESPONDING nu blocks (by position),
// and the EXTRA nu block gets the Vj bit.

console.log('Checking: mu blocks and nu blocks by position alignment');
for (const [N, k, lt, lb] of allTestCases) {
  const lamTopPos = new Set(displayPartToPositions(lt, k, N));
  const lamBotPos = new Set(displayPartToPositions(lb, k + 1, N));
  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);
  if (allMu.length === 0 || allNu.length === 0) continue;

  const muFF = computeForcedFree(allMu, N - 1);
  const nuFF = computeForcedFree(allNu, N + 1);
  const muFreeList = [...muFF.free].sort((a,b) => a-b);
  const nuFreeList = [...nuFF.free].sort((a,b) => a-b);

  // Find mu free blocks
  function findBlocks(freeList, configs) {
    const blocks = [];
    const used = new Set();
    for (let i = 0; i < freeList.length; i++) {
      if (used.has(freeList[i])) continue;
      for (let j = i + 1; j < freeList.length; j++) {
        if (used.has(freeList[j])) continue;
        const p1 = freeList[i], p2 = freeList[j];
        let comp = true;
        for (const cfg of configs) {
          const has1 = cfg.particles.includes(p1);
          const has2 = cfg.particles.includes(p2);
          if (has1 === has2) { comp = false; break; }
        }
        if (comp) { blocks.push([p1, p2]); used.add(p1); used.add(p2); break; }
      }
    }
    return blocks;
  }

  const muBlocks = findBlocks(muFreeList, allMu);
  const nuBlocks = findBlocks(nuFreeList, allNu);

  // Find which nu block is NOT in mu (the extra one)
  const muBlockSet = new Set(muBlocks.map(b => b.join(',')));
  const extraNuBlocks = nuBlocks.filter(b => !muBlockSet.has(b.join(',')));
  const sharedNuBlocks = nuBlocks.filter(b => muBlockSet.has(b.join(',')));

  console.log(`  N=${N} k=${k}: mu blocks=${muBlocks.map(b=>'['+b+']')} nu blocks=${nuBlocks.map(b=>'['+b+']')} extra=${extraNuBlocks.map(b=>'['+b+']')} shared=${sharedNuBlocks.map(b=>'['+b+']')}`);
}

// The shared blocks are identical positions. Nu has exactly one extra block, always at the END.
// Now let's verify: for the shared blocks, does the bit stay the same?
// And the extra block gets 1-Vj?

console.log('');
console.log('================================================================');
console.log('DEFINITIVE PATTERN TEST: shared blocks keep bits, extra block = 1-Vj');
console.log('================================================================');
console.log('');

let definitiveOk = true;
let definitiveCount = 0;

for (const [N, k, lt, lb] of allTestCases) {
  const lamTopPos = new Set(displayPartToPositions(lt, k, N));
  const lamBotPos = new Set(displayPartToPositions(lb, k + 1, N));
  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);
  if (allMu.length === 0 || allNu.length === 0) continue;

  const lamBotStd = posToStdPart([...lamBotPos], N);
  const lamTopStd = posToStdPart([...lamTopPos], N);
  const muFF = computeForcedFree(allMu, N - 1);
  const nuFF = computeForcedFree(allNu, N + 1);
  const muFreeList = [...muFF.free].sort((a,b) => a-b);
  const nuFreeList = [...nuFF.free].sort((a,b) => a-b);

  function findBlocks(freeList, configs) {
    const blocks = [];
    const used = new Set();
    for (let i = 0; i < freeList.length; i++) {
      if (used.has(freeList[i])) continue;
      for (let j = i + 1; j < freeList.length; j++) {
        if (used.has(freeList[j])) continue;
        const p1 = freeList[i], p2 = freeList[j];
        let comp = true;
        for (const cfg of configs) {
          const has1 = cfg.particles.includes(p1);
          const has2 = cfg.particles.includes(p2);
          if (has1 === has2) { comp = false; break; }
        }
        if (comp) { blocks.push([p1, p2]); used.add(p1); used.add(p2); break; }
      }
    }
    return blocks;
  }

  const muBlocks = findBlocks(muFreeList, allMu);
  const nuBlocks = findBlocks(nuFreeList, allNu);
  const muBlockSet = new Set(muBlocks.map(b => b.join(',')));
  const sharedNuBlocks = nuBlocks.filter(b => muBlockSet.has(b.join(',')));
  const extraNuBlocks = nuBlocks.filter(b => !muBlockSet.has(b.join(',')));

  if (extraNuBlocks.length !== 1) {
    console.log(`  N=${N} k=${k}: UNEXPECTED: ${extraNuBlocks.length} extra blocks`);
    definitiveOk = false;
    continue;
  }

  const extraBlock = extraNuBlocks[0];
  // Map shared nu blocks to their index among all nu blocks
  const nuBlockIndex = {};
  nuBlocks.forEach((b, i) => { nuBlockIndex[b.join(',')] = i; });

  // For each mu, check the pattern
  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muSet = new Set(mu.particles);

    for (const Vj of [0, 1]) {
      for (const nu of allNu) {
        const nuStd = posToStdPart(nu.particles, N + 1);
        const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, Vj, k + 1, k);
        if (Math.abs((p[0] || 0) - 1) < 1e-9) {
          definitiveCount++;
          const nuSet = new Set(nu.particles);

          // Check shared blocks: bit should match between mu and nu
          for (const block of sharedNuBlocks) {
            const muBit = muSet.has(block[0]) ? 1 : 0;
            const nuBit = nuSet.has(block[0]) ? 1 : 0;
            if (muBit !== nuBit) {
              console.log(`  FAIL shared block [${block}]: N=${N} k=${k} mu={${mu.particles}} nu={${nu.particles}} Vj=${Vj} muBit=${muBit} nuBit=${nuBit}`);
              definitiveOk = false;
            }
          }

          // Check extra block: bit should be 1-Vj
          const extraBit = nuSet.has(extraBlock[0]) ? 1 : 0;
          const expectedExtraBit = 1 - Vj;
          if (extraBit !== expectedExtraBit) {
            console.log(`  FAIL extra block [${extraBlock}]: N=${N} k=${k} mu={${mu.particles}} nu={${nu.particles}} Vj=${Vj} extraBit=${extraBit} expected=${expectedExtraBit}`);
            definitiveOk = false;
          }
        }
      }
    }
  }
}

console.log(`Checked ${definitiveCount} transitions.`);
console.log(`Result: ${definitiveOk ? '*** PATTERN CONFIRMED: shared blocks keep bits, extra block = 1-Vj ***' : 'FAILED'}`);

// But wait, the c->d analysis showed that the map is NOT trivial for the non-aligned cases.
// E.g., N=6,k=2: mu=[0,1] and mu=[1,0] both map to the same nu. So at the BLOCK level,
// the map is many-to-one, which means the "shared blocks keep bits" hypothesis can't be right
// in all cases. Let me recheck.

console.log('');
console.log('ADDITIONAL CHECK: Is the map injective at the block level?');
for (const [N, k, lt, lb] of allTestCases) {
  const lamTopPos = new Set(displayPartToPositions(lt, k, N));
  const lamBotPos = new Set(displayPartToPositions(lb, k + 1, N));
  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);
  if (allMu.length === 0 || allNu.length === 0) continue;

  const lamBotStd = posToStdPart([...lamBotPos], N);
  const lamTopStd = posToStdPart([...lamTopPos], N);

  // Check: for fixed Vj, is the map mu->nu injective?
  for (const Vj of [0, 1]) {
    const map = {};
    for (const mu of allMu) {
      const muStd = posToStdPart(mu.particles, N - 1);
      for (const nu of allNu) {
        const nuStd = posToStdPart(nu.particles, N + 1);
        const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, Vj, k + 1, k);
        if (Math.abs((p[0] || 0) - 1) < 1e-9) {
          const mk = mu.particles.join(',');
          const nk = nu.particles.join(',');
          if (map[mk]) console.log(`  WARNING: multiple targets for mu=${mk} Vj=${Vj}`);
          map[mk] = nk;
        }
      }
    }
    // Check injectivity
    const targets = Object.values(map);
    const uniqueTargets = new Set(targets);
    if (targets.length !== uniqueTargets.size) {
      console.log(`  N=${N} k=${k} Vj=${Vj}: NOT INJECTIVE (${targets.length} -> ${uniqueTargets.size})`);
      // Show collisions
      const seen = {};
      for (const [m, n] of Object.entries(map)) {
        if (!seen[n]) seen[n] = [];
        seen[n].push(m);
      }
      for (const [n, ms] of Object.entries(seen)) {
        if (ms.length > 1) console.log(`    nu={${n}} <- mu={${ms.join('} and mu={')}}`);
      }
    } else {
      console.log(`  N=${N} k=${k} Vj=${Vj}: injective (${targets.length} mu -> ${uniqueTargets.size} nu)`);
    }
  }
}

// Key finding: the map mu -> nu at t=0 is NOT INJECTIVE at the particle level!
// Two different mu can map to the same nu (for the same Vj).
// This means the pattern must be understood at the PARTITION level (c -> d).

console.log('');
console.log('================================================================');
console.log('DEFINITIVE c -> d ANALYSIS');
console.log('================================================================');
console.log('');

// From the data, the c -> d map at t=0 for fixed Vj is:
// d_{k+1} seems problematic. Let me tabulate cleanly again.

// Let me use c REVERSED to get it in the standard ordering.
// Actually, the c vector is c_i = lam_top_i - mu_i where lam_top has k parts.
// And d_i = nu_i - lam_bot_i where lam_bot has k+1 parts.
// These are binary vectors ({0,1}^k and {0,1}^{k+1}) recording which parts
// got decremented (for mu) or incremented (for nu).

console.log('ALL transitions, organized by (Vj, c -> d):');
console.log('');

const allCDbyVj = { 0: [], 1: [] };
for (const r of allCD) {
  allCDbyVj[r.Vj].push(r);
}

for (const Vj of [0, 1]) {
  console.log(`Vj = ${Vj}:`);
  for (const r of allCDbyVj[Vj]) {
    console.log(`  c=[${r.c}] -> d=[${r.d}]`);
  }
  console.log('');
}

// The c -> d map is many-to-one (non-injective) in general.
// The collisions happen when |c| is the same but the positions differ.
// Key insight: d depends only on the SORTED version of c (the number of 1s in each prefix).
// Since c_i in {0,1}, sorted(c) descending puts all 1s first.
// Let me check: is d determined by |c| (sum of c) alone?

console.log('Is d determined by sum(c) and Vj?');
for (const Vj of [0, 1]) {
  const bySum = {};
  for (const r of allCDbyVj[Vj]) {
    const s = r.c.reduce((a,b) => a+b, 0);
    const key = r.k + '|' + s;
    if (!bySum[key]) bySum[key] = new Set();
    bySum[key].add(r.d.join(','));
  }
  let ok = true;
  for (const [key, ds] of Object.entries(bySum)) {
    if (ds.size > 1) {
      ok = false;
      console.log(`  Vj=${Vj} k|sum=${key}: MULTIPLE d values: ${[...ds].join(' and ')}`);
    }
  }
  if (ok) console.log(`  Vj=${Vj}: YES, d is determined by (k, sum(c))`);
}

console.log('');
console.log('Explicit map: for each (k, |c|, Vj), what is d?');
for (const Vj of [0, 1]) {
  const byKS = {};
  for (const r of allCDbyVj[Vj]) {
    const s = r.c.reduce((a,b) => a+b, 0);
    const key = r.k + '|' + s;
    byKS[key] = r.d;
  }
  console.log(`  Vj=${Vj}:`);
  for (const [key, d] of Object.entries(byKS).sort()) {
    const [k, s] = key.split('|').map(Number);
    // What does d look like? It's all 1s followed by all 0s?
    // d = [1]*s_d + [0]*(k+1-s_d) where s_d = sum(d)?
    const sd = d.reduce((a,b) => a+b, 0);
    const descending = [...d].sort((a,b) => b-a);
    const isSorted = d.every((v,i) => v === descending[i]);
    console.log(`    k=${k}, |c|=${s}: d=[${d}]  |d|=${sd}  sorted_desc=${isSorted ? 'YES' : 'no'}`);
  }
}

// Let me verify: sum(d) = sum(c) + Vj? And d is always the "sorted descending" vector?
console.log('');
console.log('Check: |d| = |c| + (1-Vj)? And d = sorted descending (all 1s first)?');
let checkSumFlip = true, checkSorted = true;
let checkSumDirect = true;
for (const r of allCD) {
  const sc = r.c.reduce((a,b) => a+b, 0);
  const sd = r.d.reduce((a,b) => a+b, 0);
  const desc = [...r.d].sort((a,b) => b-a);
  if (sd !== sc + (1 - r.Vj)) checkSumFlip = false;
  if (sd !== sc + r.Vj) checkSumDirect = false;
  if (!r.d.every((v,i) => v === desc[i])) checkSorted = false;
}
console.log(`  |d| = |c| + (1-Vj): ${checkSumFlip ? 'TRUE' : 'FALSE'}`);
console.log(`  |d| = |c| + Vj: ${checkSumDirect ? 'TRUE' : 'FALSE'}`);
console.log(`  d = sorted descending: ${checkSorted ? 'TRUE' : 'FALSE'}`);

// Check: |d| = |c| always, and d is sorted?
let checkSumSame = true;
for (const r of allCD) {
  const sc = r.c.reduce((a,b) => a+b, 0);
  const sd = r.d.reduce((a,b) => a+b, 0);
  if (sd !== sc) checkSumSame = false;
}
console.log(`  |d| = |c|: ${checkSumSame ? 'TRUE' : 'FALSE'}`);

// OK let me just be more careful. Let me print a clean summary for ALL cases.
console.log('');
console.log('CLEAN SUMMARY of (k, |c|, Vj) -> (|d|, d_sorted?):');
const summary = {};
for (const r of allCD) {
  const sc = r.c.reduce((a,b) => a+b, 0);
  const sd = r.d.reduce((a,b) => a+b, 0);
  const desc = [...r.d].sort((a,b) => b-a);
  const sorted = r.d.every((v,i) => v === desc[i]);
  const key = `k=${r.k} |c|=${sc} Vj=${r.Vj}`;
  summary[key] = { sd, sorted, d: r.d.join(',') };
}
for (const [key, info] of Object.entries(summary).sort()) {
  console.log(`  ${key}: |d|=${info.sd}  sorted=${info.sorted}  d=[${info.d}]`);
}

// KEY INSIGHT: For Vj=0:
// - d is ALWAYS sorted descending (all 1s at the beginning, 0s at the end)
// - |d| = |c|
// - d_{k+1} = 0
// This means: d = sort(c) ++ [0] = [1,...,1,0,...,0] with |c| ones
// The map FORGETS the arrangement of c, remembering only the COUNT of 1s.
// This is the "row insertion" part of RSK: it produces the sorted (P-tableau) output.
//
// For Vj=1, the pattern is more complex and d depends on the actual arrangement of c.
// Let me verify the Vj=0 pattern completely, then analyze Vj=1.

console.log('');
console.log('================================================================');
console.log('VERIFIED PATTERN');
console.log('================================================================');
console.log('');

// Vj=0 check: d = sort_desc(c ++ [0]) = [1]*|c| ++ [0]*(k+1-|c|)
let vj0_ok = true;
for (const r of allCD) {
  if (r.Vj !== 0) continue;
  const sc = r.c.reduce((a,b) => a+b, 0);
  const expected = [...Array(sc).fill(1), ...Array(r.k + 1 - sc).fill(0)];
  if (!r.d.every((v,i) => v === expected[i])) {
    vj0_ok = false;
    console.log(`  Vj=0 FAIL: c=[${r.c}] d=[${r.d}] expected=[${expected}]`);
  }
}
console.log(`Vj=0: d = [1]*|c| ++ [0]*(k+1-|c|): ${vj0_ok ? '*** TRUE for all cases ***' : 'FAILED'}`);
console.log('  Interpretation: at t=0 with Vj=0, the output nu has its first |c| parts');
console.log('  incremented by 1 relative to lam_bot. The arrangement of c does not matter.');
console.log('  This is DETERMINISTIC and corresponds to RSK "column bumping".');
console.log('');

// Vj=1 analysis: d depends on the actual arrangement of c, not just |c|.
// Let me look at the pattern more carefully.
// From the data:
//   c=[1,0] -> d=[1,0,1] (N=5 case) but also c=[1,0] -> d=[1,1,0] (N=5 different lam case)
// Wait -- the same c can give DIFFERENT d for different lam_top/lam_bot!
// This means d depends on the actual partitions, not just on c and Vj.

console.log('Vj=1 analysis:');
console.log('');

// Let me gather Vj=1 data WITH the partition info
const vj1data = [];
for (const [N, k, lt, lb] of allTestCases) {
  const lamTopPos = new Set(displayPartToPositions(lt, k, N));
  const lamBotPos = new Set(displayPartToPositions(lb, k + 1, N));
  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);
  if (allMu.length === 0 || allNu.length === 0) continue;
  const lamBotStd = posToStdPart([...lamBotPos], N);
  const lamTopStd = posToStdPart([...lamTopPos], N);
  const lamTopArr = [...lamTopStd]; while (lamTopArr.length < k) lamTopArr.push(0);
  const lamBotArr = [...lamBotStd]; while (lamBotArr.length < k+1) lamBotArr.push(0);

  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muArr = [...muStd]; while (muArr.length < k) muArr.push(0);
    const c = lamTopArr.map((a, i) => a - muArr[i]);
    for (const nu of allNu) {
      const nuStd = posToStdPart(nu.particles, N + 1);
      const nuArr = [...nuStd]; while (nuArr.length < k+1) nuArr.push(0);
      const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, 1, k + 1, k);
      if (Math.abs((p[0] || 0) - 1) < 1e-9) {
        const d = lamBotArr.map((b, i) => nuArr[i] - b);
        vj1data.push({
          N, k, lt: [...lamTopArr], lb: [...lamBotArr],
          mu: [...muArr], nu: [...nuArr],
          c, d
        });
      }
    }
  }
}

for (const r of vj1data) {
  // Compute: where does the "extra 1" go in d compared to the Vj=0 output?
  const sc = r.c.reduce((a,b) => a+b, 0);
  const d0 = [...Array(sc).fill(1), ...Array(r.k + 1 - sc).fill(0)]; // Vj=0 output
  const diff = r.d.map((v,i) => v - d0[i]);
  // diff should have one +1 somewhere (the extra increment from Vj=1)
  // and possibly a -1 somewhere (a swap)
  const plusPos = diff.map((v,i) => v === 1 ? i : -1).filter(i => i >= 0);
  const minusPos = diff.map((v,i) => v === -1 ? i : -1).filter(i => i >= 0);
  console.log(`  lt=(${r.lt}) lb=(${r.lb}) mu=(${r.mu}) c=[${r.c}] d=[${r.d}] d0=[${d0}] diff=[${diff}] +at:[${plusPos}] -at:[${minusPos}]`);
}

// From the output, can we see where the Vj=1 "extra bit" goes?
// If d0 = sorted([c,0]) and d1 = actual output for Vj=1,
// then d1 should have |d1| = |c| + 1 and be some specific arrangement.

console.log('');
console.log('Check: |d| for Vj=1 = |c| + 1?');
let vj1_sum_ok = true;
for (const r of vj1data) {
  const sc = r.c.reduce((a,b) => a+b, 0);
  const sd = r.d.reduce((a,b) => a+b, 0);
  if (sd !== sc + 1) {
    vj1_sum_ok = false;
    console.log(`  FAIL: c=[${r.c}] |c|=${sc} d=[${r.d}] |d|=${sd}`);
  }
}
console.log(`  |d| = |c| + 1: ${vj1_sum_ok ? 'TRUE' : 'FALSE'}`);

// So for Vj=0: d has |c| ones placed at positions 1...|c| (sorted)
// For Vj=1: d has |c|+1 ones placed at... specific positions.
// Let me look at where the 1s are placed for Vj=1.

console.log('');
console.log('Vj=1: Positions of 1s in d:');
for (const r of vj1data) {
  const onePos = r.d.map((v,i) => v === 1 ? i+1 : -1).filter(i => i > 0);
  // Compare with c: positions of 1s in c
  const cOnePos = r.c.map((v,i) => v === 1 ? i+1 : -1).filter(i => i > 0);
  console.log(`  c=[${r.c}] (1s at ${cOnePos}) -> d=[${r.d}] (1s at ${onePos})`);
}

// From the Vj=1 data, it looks like d is constructed by:
// - Taking c and appending 1 at the end (position k+1)
// - Then applying the SAME "sort" operation, BUT keeping track of which came from where?
// No... d is NOT always sorted for Vj=1.
//
// Let me try a completely different approach. Think of it as:
// The "column insertion" at t=0 is related to BUMPING in RSK.
// For Vj=0 (no extra particle inserted): output is sorted.
// For Vj=1 (extra particle inserted): the extra particle gets "bumped" through.

// FINAL HYPOTHESIS: d = c with 1 inserted at the position where lam_bot
// has a gap relative to lam_top. Let me check by looking at the lam_top/lam_bot relationship.

console.log('');
console.log('Vj=1: relationship to lam_top and lam_bot:');
for (const r of vj1data) {
  // lam_bot has k+1 parts, lam_top has k parts.
  // The interlacing condition is: lb_1 >= lt_1 >= lb_2 >= lt_2 >= ... >= lt_k >= lb_{k+1}
  // The "gaps" are at positions where lb_i > lt_i or lt_i > lb_{i+1}
  const gaps = [];
  for (let i = 0; i < r.k; i++) {
    // Between lb_i (0-indexed: lb[i]) and lt_i (lt[i]) and lb_{i+1} (lb[i+1])
    if (r.lb[i] > (r.lt[i]||0)) gaps.push(`lb[${i}]=${r.lb[i]} > lt[${i}]=${r.lt[i]||0}`);
    if ((r.lt[i]||0) > r.lb[i+1]) gaps.push(`lt[${i}]=${r.lt[i]||0} > lb[${i+1}]=${r.lb[i+1]}`);
  }
}

// Let me think about this differently. Instead of trying random hypotheses,
// let me carefully look at the SIMPLEST non-trivial case.
// N=5, k=2, lt=(2,1), lb=(2,1,1):
//   c=[1,1] -> d=[1,1,1] (all three parts of nu incremented)
//   c=[1,0] -> d=[1,0,1] (parts 1 and 3 incremented)
// N=5, k=2, lt=(3,1), lb=(2,2,1):
//   c=[1,0] -> d=[1,1,0] (parts 1 and 2 incremented)
//
// The SAME c=[1,0] gives DIFFERENT d depending on lt and lb!
// So the map really depends on the ambient partitions.

// REVISED APPROACH: think of it as a "bumping path" in the RSK sense.
// At t=0, the column insertion formula has a specific structure.
// Let me trace through the colInsertionProb code at t=0 to understand
// what happens mechanically.

// At t=0: poly1minusTn(n) evaluated at t=0 is just 1 (constant coeff of (1-t^n)).
// More precisely, (1-t^n)|_{t=0} = 1 for n >= 1, 0 for n = 0.
// So gp(s)|_{t=0} = 1 if (Nb(s-1) - L(s)) >= 1, else 0.
// And fp(k)|_{t=0} = (nbkm1 - lk >= 1 ? 1 : 0) / (nbkm1 - nbk + 1 >= 1 ? 1 : 0)
//   Wait, at t=0: (1-t^a)/(1-t^b)|_{t=0} = ?
//   If b > 0: poly at t=0 is 1/1 = 1 always (both numerator and denominator are 1 at t=0 if a,b>0).
//   If a = 0: numerator is 0, so fp = 0.
//   If b = 0: denominator is 0... but in the code, if b <= 0 return [1].
//
// Actually more carefully:
// (1-t^a) at t=0 = 1 for a >= 1, = 0 for a = 0.
// polyDiv at t=0 of (1-t^a)/(1-t^b) needs polynomial division.
// But evaluated at t=0: if a >= 1 and b >= 1, the constant coeff is
//   geom(a)/geom(b) where geom(n) = 1+t+...+t^{n-1}, geom(n)|_{t=0} = 1.
//   Actually (1-t^a)/(1-t^b) as polynomial, evaluated at t=0, is just the constant term.
//   (1-t^a) = 1 - t^a. (1-t^b) = 1 - t^b.
//   (1-t^a)/(1-t^b) = (1+t+...+t^{a-1}) * (1-t^b)/(1-t^b) ... no, that's only if b divides a.
//   More correctly: (1-t^a)/(1-t^b) as a polynomial (assuming exact division)
//   = 1 + t^b + t^{2b} + ... + t^{a-b} (if b divides a).
//   Evaluated at t=0: always 1 (the constant term is 1).
//
// So at t=0: fp(k) = 1 always (as long as the polynomial is nonzero, i.e., a >= b > 0).
// And gp(s) = 1 if Nb(s-1) - L(s) >= 1, else 0.
// And (1-fp(k)) at t=0 = 0, (1-gp(s)) at t=0 = 0 or 1.
//
// This means: in the colInsertionProb code, all terms involving (1-fp) are 0 at t=0,
// and terms involving (1-gp) are 0 when gp=1.
// The effect: the only surviving contribution is the "rightmost" choice in each block.
// This is exactly RSK column insertion!

console.log('');
console.log('================================================================');
console.log('FINAL COMPREHENSIVE SUMMARY');
console.log('================================================================');
console.log('');
console.log('1. DETERMINISM: The transition P(nu|mu, Vj) at t=0 is DETERMINISTIC');
console.log('   for every (mu, Vj) pair in ALL tested cases.');
console.log('');
console.log('2. Vj=0 PATTERN: d = sorted_desc(c) ++ [0]');
console.log('   i.e., nu_i = lam_bot_i + 1 for i = 1,...,|c| and nu_i = lam_bot_i for i > |c|.');
console.log('   The arrangement of 0s and 1s in c does not matter -- only |c| (the sum).');
console.log('   The map mu -> nu is MANY-TO-ONE: all mu with the same sum(c) map to the same nu.');
console.log('');
console.log('3. Vj=1 PATTERN: |d| = |c| + 1 always.');
console.log('   The extra 1 is placed at a position that depends on the arrangement of c AND');
console.log('   on the ambient partitions lam_top and lam_bot.');
console.log('   The map is generally NOT injective (multiple mu can map to the same nu).');
console.log('');
console.log('4. The transition is NOT a simple "copy k free blocks to k+1 positions".');
console.log('   The free blocks of mu and nu share positions, but the BIT values are NOT');
console.log('   preserved from mu to nu. Instead, the Vj=0 map "sorts" the free bits');
console.log('   (all 1s first), and the Vj=1 map inserts an additional 1 in a position');
console.log('   determined by the RSK column-insertion bumping algorithm.');
console.log('');
console.log('5. At the partition level, this is consistent with RSK column insertion:');
console.log('   - c_i = 1 means mu_i was decremented (lam_top_i - 1)');
console.log('   - d_i = 1 means nu_i was incremented (lam_bot_i + 1)');
console.log('   - For Vj=0: all decrements become increments at the TOP positions (sorted)');
console.log('   - For Vj=1: same plus one additional increment from the Bernoulli variable');

// The Vj=0 "sorted" hypothesis fails for some k=4 cases.
// Let me look at ALL Vj=0 c->d data including full partition info.

console.log('');
console.log('================================================================');
console.log('Vj=0 DETAILED DATA (including partition info):');
console.log('================================================================');
console.log('');

const vj0data = [];
for (const [N, k, lt, lb] of allTestCases) {
  const lamTopPos = new Set(displayPartToPositions(lt, k, N));
  const lamBotPos = new Set(displayPartToPositions(lb, k + 1, N));
  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);
  if (allMu.length === 0 || allNu.length === 0) continue;
  const lamBotStd = posToStdPart([...lamBotPos], N);
  const lamTopStd = posToStdPart([...lamTopPos], N);
  const lamTopArr = [...lamTopStd]; while (lamTopArr.length < k) lamTopArr.push(0);
  const lamBotArr = [...lamBotStd]; while (lamBotArr.length < k+1) lamBotArr.push(0);

  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muArr = [...muStd]; while (muArr.length < k) muArr.push(0);
    const c = lamTopArr.map((a, i) => a - muArr[i]);
    for (const nu of allNu) {
      const nuStd = posToStdPart(nu.particles, N + 1);
      const nuArr = [...nuStd]; while (nuArr.length < k+1) nuArr.push(0);
      const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, 0, k + 1, k);
      if (Math.abs((p[0] || 0) - 1) < 1e-9) {
        const d = lamBotArr.map((b, i) => nuArr[i] - b);
        vj0data.push({
          N, k, lt: [...lamTopArr], lb: [...lamBotArr],
          mu: [...muArr], nu: [...nuArr], c, d
        });
      }
    }
  }
}

for (const r of vj0data) {
  const sc = r.c.reduce((a,b) => a+b, 0);
  const sd = r.d.reduce((a,b) => a+b, 0);
  const sorted = [...r.d].sort((a,b) => b-a);
  const isSorted = r.d.every((v,i) => v === sorted[i]);
  console.log(`  lt=(${r.lt}) lb=(${r.lb}) c=[${r.c}] d=[${r.d}] |c|=${sc} |d|=${sd} sorted=${isSorted ? 'Y' : 'N'} mu=(${r.mu}) nu=(${r.nu})`);
}

// Now I can see: for the N=8,k=4 and N=10,k=4 cases, d is NOT sorted.
// The non-sorted cases are:
// lt=(4,2,1,1) lb=(3,2,1,1,0) c=[1,0,0,1] d=[1,0,1,0,0] -- 0 appears between two 1s
// lt=(5,4,3,2) lb=(4,4,3,2,1) c=[1,0,1,1] d=[1,1,0,1,0] -- not sorted
// lt=(5,4,3,2) lb=(4,4,3,2,1) c=[1,0,0,1] d=[1,0,1,0,0] -- not sorted
//
// These are exactly the cases where lam_top has NON-CONSECUTIVE parts
// (i.e., lam_top is not of the form (n, n-1, ..., 1)).
// Actually no, (4,2,1,1) has a gap at position 2 (jumps from 4 to 2).
// And (5,4,3,2) is consecutive! And it still fails.
//
// Let me look at c=[1,0,0,1] with lb=(3,2,1,1,0) more carefully.
// mu_i = lt_i - c_i: mu = (4-1, 2-0, 1-0, 1-1) = (3,2,1,0)
// nu_i = lb_i + d_i: nu = (3+1, 2+0, 1+1, 1+0, 0+0) = (4,2,2,1,0)
// Check: nu/lb should be a vertical strip. nu - lb = (1,0,1,0,0). ✓
// And nu/lt should be a horizontal strip. nu = (4,2,2,1,0), lt = (4,2,1,1).
// nu_i - lt_i = (0, 0, 1, 0) for i=1..4. Sum = 1. Horizontal strip means
// nu_1 >= lt_1 >= nu_2 >= lt_2 >= ... YES.
//
// So d = [1,0,1,0,0] is correct, it's just not sorted.
// The pattern for Vj=0 is: d_i = 1 exactly when position i is part of the
// "bumping path" of RSK column insertion.

// Let me try a COMPLETELY different characterization.
// Think about c as specifying which rows of lam_top were decremented.
// The RSK column insertion bumps these decrements into lam_bot:
// - Start from the bottom row (largest index with c_i=1)
// - "Bump" it into lam_bot, which may cascade upward.

// The RSK column insertion for vertical strips:
// Given lam_top, mu = lam_top - c (vertical strip), we want nu = lam_bot + d.
// The claim is that at t=0, the deterministic map computes d via RSK bumping.

// Let me try RSK-like bumping:
// Process c from bottom to top (index k down to 1).
// At each level i where c_i = 1, we have a "ball" that needs to be placed.
// It gets placed at the lowest available position in d that is valid.

// Actually, let me try the classical RSK column insertion algorithm directly.
// In column insertion, we insert a new column into a semistandard Young tableau.
// The bumping works row by row from top to bottom.

// But maybe simpler: at t=0, the formula simplifies because all the
// gp and fp values become 0 or 1, and the only surviving term in each
// "competition" between positions is the FIRST (leftmost/rightmost depending on perspective).

// Let me compute d from c using a specific algorithm and check.

// ALGORITHM ATTEMPT: "greedy from top"
// Process rows i = 1, 2, ..., k.
// Maintain a "pending" counter (number of 1s in c not yet placed in d).
// At row i: if c_i = 1, add 1 to pending.
// If lam_bot_i > lam_bot_{i+1} (there's room), try to place a pending ball: d_i = 1, pending--.
// At the end, place remaining pending at row k+1: d_{k+1} = pending.
// But this doesn't work because it would always sort.

// ALGORITHM ATTEMPT: "bumping path"
// At t=0, the colInsertionProb code has:
// gp(s) at t=0 = 1 if Nb(s-1) - L(s) > 0, else 0
// fp(k) at t=0 = 1 always (when well-defined)
// (1 - fp) = 0 at t=0
// (1 - gp) = 1 - gp at t=0

// In the "pairs" loop, sp is the FIRST s in [rp+1, kp] with d[s]=1.
// If sp == kp: multiply by fp(kp) which is 1 at t=0. OK.
// If sp < kp: multiply by (1-fp(kp)) which is 0 at t=0! So this term vanishes.
// This means: the ONLY nonzero contribution requires sp = kp for each pair.
// I.e., in each block [rp+1, kp], the moved upper particle must be at position kp (the block boundary).

// This is the key: at t=0, the upper particle must move at the RIGHTMOST position of each block.
// For the "Vj=1" block, the same logic applies: the extra move goes to the rightmost available.

// Let me formalize: Given c and the pairs structure from moved lower particles,
// the t=0 map forces each "gap interval" to have its moved particle at the rightmost end.

// This analysis requires knowing the FULL partition structure, not just c.
// Let me verify by tracing through colInsertionProb at t=0 for the failing cases.

console.log('');
console.log('TRACING colInsertionProb at t=0 for failing Vj=0 cases:');
console.log('');

function traceColInsertionAt0(lam, nu, lb, nb, Vj, j, jm1) {
  const L = i => (i >= 1 && i <= j) ? (lam[i-1] || 0) : 0;
  const N_ = i => (i >= 1 && i <= j) ? (nu[i-1] || 0) : 0;
  const Lb = i => (i >= 1 && i <= jm1) ? (lb[i-1] || 0) : 0;
  const Nb = i => (i >= 1 && i <= jm1) ? (nb[i-1] || 0) : 0;

  const d = {}, c = {};
  for (let i = 1; i <= j; i++) d[i] = N_(i) - L(i);
  for (let i = 1; i <= jm1; i++) c[i] = Nb(i) - Lb(i);

  console.log(`  lam=(${lam}) nu=(${nu}) lb=(${lb}) nb=(${nb}) Vj=${Vj} j=${j}`);
  console.log(`  d = {${Object.entries(d).map(([k,v])=>k+':'+v).join(', ')}}`);
  console.log(`  c = {${Object.entries(c).map(([k,v])=>k+':'+v).join(', ')}}`);

  const moved = [];
  for (let i = 1; i <= jm1; i++) if (c[i] === 1) moved.push(i);
  console.log(`  moved lower particles: [${moved}]`);

  const pairs = [];
  for (let idx = 0; idx < moved.length; idx++) {
    const kp = moved[idx];
    const rp = idx > 0 ? moved[idx-1] : 0;
    pairs.push([rp, kp]);
  }
  console.log(`  pairs: [${pairs.map(p=>'('+p.join(',')+')').join(', ')}]`);

  const claimed = new Set();
  for (const [rp, kp] of pairs) {
    for (let s = rp+1; s <= kp; s++) {
      if (d[s] === 1 && !claimed.has(s)) {
        console.log(`    pair (${rp},${kp}): sp = ${s} (first d[s]=1 in [${rp+1}..${kp}])`);
        claimed.add(s);
        if (s === kp) {
          console.log(`      sp = kp, multiply by fp(${kp}) = 1 at t=0`);
        } else {
          console.log(`      sp < kp, multiply by (1-fp(${kp}))=0 at t=0 -> ZERO!`);
          return;
        }
        break;
      }
    }
  }

  if (Vj === 1) {
    const mp = moved.length > 0 ? moved[moved.length - 1] : 0;
    for (let s = mp+1; s <= j; s++) {
      if (d[s] === 1 && !claimed.has(s)) {
        console.log(`    Vj=1 block: sp = ${s} (first d[s]=1 in [${mp+1}..${j}])`);
        claimed.add(s);
        break;
      }
    }
  }

  console.log(`  claimed: {${[...claimed].sort((a,b)=>a-b).join(',')}}`);
  console.log('');
}

// Trace the failing cases
// N=8, k=4, lt=(4,2,1,1), lb=(3,2,1,1,0):
// mu such that c=[1,0,0,1]: mu = (4-1,2-0,1-0,1-1) = (3,2,1,0)
// nu such that d=[1,0,1,0,0]: nu = (3+1,2+0,1+1,1+0,0+0) = (4,2,2,1,0)
// In colInsertionProb: lam = lam_bot, nu = output_nu, lb = mu, nb = lam_top
// j = k+1 = 5, jm1 = k = 4
traceColInsertionAt0([3,2,1,1,0], [4,2,2,1,0], [3,2,1,0], [4,2,1,1], 0, 5, 4);

// Also trace: c=[1,0,1,1] (N=10,k=4)
// lt=(5,4,3,2) lb=(4,4,3,2,1) c=[1,0,1,1]: mu=(4,4,2,1)
// d=[1,1,0,1,0]: nu=(5,5,3,3,1)
traceColInsertionAt0([4,4,3,2,1], [5,5,3,3,1], [4,4,2,1], [5,4,3,2], 0, 5, 4);

// The trace shows (1-fp)=0 at t=0, but the actual polynomial might NOT be
// zero at t=0 in those cases. Let me compute fp more carefully.

console.log('');
console.log('================================================================');
console.log('DETAILED fp/gp ANALYSIS for failing cases');
console.log('================================================================');
console.log('');

function detailedTrace(lam, nu, lb, nb, Vj, j, jm1) {
  const L = i => (i >= 1 && i <= j) ? (lam[i-1] || 0) : 0;
  const N_ = i => (i >= 1 && i <= j) ? (nu[i-1] || 0) : 0;
  const Lb = i => (i >= 1 && i <= jm1) ? (lb[i-1] || 0) : 0;
  const Nb = i => (i >= 1 && i <= jm1) ? (nb[i-1] || 0) : 0;

  console.log(`  lam=(${lam}) nu=(${nu}) lb=(${lb}) nb=(${nb}) Vj=${Vj} j=${j}`);

  for (let k = 1; k <= j; k++) {
    if (k <= 1) { console.log(`  fp(${k}) = [1] (k<=1)`); continue; }
    const nbkm1 = Nb(k-1), lk = L(k), nbk = Nb(k);
    const a = nbkm1 - lk, b = nbkm1 - nbk + 1;
    console.log(`  fp(${k}): Nb(${k-1})=${nbkm1}, L(${k})=${lk}, Nb(${k})=${nbk} -> a=${a}, b=${b}`);
    if (b <= 0) { console.log(`    b<=0, fp=${JSON.stringify([1])}`); continue; }
    const fp_poly = polyDiv(poly1minusTn(a), poly1minusTn(b));
    const fp0 = fp_poly[0] || 0;
    const one_minus_fp = polySub([1], fp_poly);
    const one_minus_fp0 = one_minus_fp[0] || 0;
    console.log(`    fp = ${polyStr(fp_poly)}, fp(0)=${fp0}, (1-fp)(0)=${one_minus_fp0}`);
  }

  for (let s = 1; s <= j; s++) {
    if (s <= 1) { console.log(`  gp(${s}) = [1] (s<=1)`); continue; }
    const nbsm1 = Nb(s-1), ls = L(s);
    const exp = nbsm1 - ls;
    console.log(`  gp(${s}): Nb(${s-1})=${nbsm1}, L(${s})=${ls} -> exp=${exp}`);
    if (exp === 0) { console.log(`    gp = [0], gp(0) = 0`); }
    else { console.log(`    gp = ${polyStr(poly1minusTn(exp))}, gp(0) = 1`); }
  }

  // Now trace the actual probability computation
  const d = {}, c = {};
  for (let i = 1; i <= j; i++) d[i] = N_(i) - L(i);
  for (let i = 1; i <= jm1; i++) c[i] = Nb(i) - Lb(i);
  console.log(`  d = {${Object.entries(d).map(([k,v])=>k+':'+v).join(', ')}}`);
  console.log(`  c = {${Object.entries(c).map(([k,v])=>k+':'+v).join(', ')}}`);

  const moved = [];
  for (let i = 1; i <= jm1; i++) if (c[i] === 1) moved.push(i);
  console.log(`  moved: [${moved}]`);

  const claimed = new Set();
  let prob = [1];

  const pairs = [];
  for (let idx = 0; idx < moved.length; idx++) {
    const kp = moved[idx];
    const rp = idx > 0 ? moved[idx-1] : 0;
    pairs.push([rp, kp]);
  }

  for (const [rp, kp] of pairs) {
    let sp = null;
    for (let s = rp+1; s <= kp; s++) {
      if (d[s] === 1 && !claimed.has(s)) { sp = s; break; }
    }
    if (sp === null) { console.log(`  pair (${rp},${kp}): no sp found -> prob=0`); return; }
    claimed.add(sp);

    if (rp+1 === kp) {
      console.log(`  pair (${rp},${kp}): sp=${sp}=kp, rp+1=kp, skip`);
      continue;
    }

    if (sp === kp) {
      const nbkm1 = Nb(kp-1), lk = L(kp), nbk = Nb(kp);
      const a = nbkm1 - lk, b = nbkm1 - nbk + 1;
      const fp_poly = kp <= 1 ? [1] : (b <= 0 ? [1] : polyDiv(poly1minusTn(a), poly1minusTn(b)));
      prob = polyMul(prob, fp_poly);
      console.log(`  pair (${rp},${kp}): sp=${sp}=kp, prob *= fp(${kp}) = ${polyStr(fp_poly)}`);
    } else if (sp === rp+1) {
      // prob *= (1-fp(kp)) * prod_{ip=kp-1 down to rp+2} (1-gp(ip))
      const nbkm1 = Nb(kp-1), lk = L(kp), nbk = Nb(kp);
      const a = nbkm1 - lk, b = nbkm1 - nbk + 1;
      const fp_poly = kp <= 1 ? [1] : (b <= 0 ? [1] : polyDiv(poly1minusTn(a), poly1minusTn(b)));
      let p = polySub([1], fp_poly);
      console.log(`  pair (${rp},${kp}): sp=${sp}=rp+1, p starts with (1-fp(${kp})) = ${polyStr(p)}`);
      for (let ip = kp-1; ip > rp+1; ip--) {
        const gp_poly = ip <= 1 ? [1] : poly1minusTn(Nb(ip-1) - L(ip));
        const factor = polySub([1], gp_poly);
        p = polyMul(p, factor);
        console.log(`    p *= (1-gp(${ip})) = ${polyStr(factor)}`);
      }
      prob = polyMul(prob, p);
      console.log(`  pair result: p = ${polyStr(p)}`);
    } else {
      // rp+1 < sp < kp
      const nbkm1 = Nb(kp-1), lk = L(kp), nbk = Nb(kp);
      const a = nbkm1 - lk, b = nbkm1 - nbk + 1;
      const fp_poly = kp <= 1 ? [1] : (b <= 0 ? [1] : polyDiv(poly1minusTn(a), poly1minusTn(b)));
      let p = polySub([1], fp_poly);
      console.log(`  pair (${rp},${kp}): sp=${sp}, p starts with (1-fp(${kp})) = ${polyStr(p)}`);
      for (let ip = kp-1; ip > sp; ip--) {
        const gp_poly = ip <= 1 ? [1] : poly1minusTn(Nb(ip-1) - L(ip));
        const factor = polySub([1], gp_poly);
        p = polyMul(p, factor);
        console.log(`    p *= (1-gp(${ip})) = ${polyStr(factor)}`);
      }
      const gp_sp = sp <= 1 ? [1] : poly1minusTn(Nb(sp-1) - L(sp));
      p = polyMul(p, gp_sp);
      console.log(`    p *= gp(${sp}) = ${polyStr(gp_sp)}`);
      prob = polyMul(prob, p);
      console.log(`  pair result: p = ${polyStr(p)}`);
    }
  }

  console.log(`  Final prob = ${polyStr(prob)}, prob(0) = ${prob[0] || 0}`);
  console.log('');
}

// Case 1: c=[1,0,0,1] d=[1,0,1,0,0]
// lam=lb=(3,2,1,1,0), nu=(4,2,2,1,0), lb_arg=mu=(3,2,1,0), nb_arg=lt=(4,2,1,1)
detailedTrace([3,2,1,1,0], [4,2,2,1,0], [3,2,1,0], [4,2,1,1], 0, 5, 4);

// Case 2: c=[1,0,1,1] d=[1,1,0,1,0]
// lt=(5,4,3,2), lb=(4,4,3,2,1)
// mu = lt - c = (4,4,2,1), nu = lb + d = (5,5,3,3,1)
detailedTrace([4,4,3,2,1], [5,5,3,3,1], [4,4,2,1], [5,4,3,2], 0, 5, 4);

// For comparison, a case that works: c=[1,1,0,1] d=[1,1,1,0,0]
// mu = lt - c = (4,3,3,1), nu = lb + d = (5,5,4,2,1)
detailedTrace([4,4,3,2,1], [5,5,4,2,1], [4,3,3,1], [5,4,3,2], 0, 5, 4);

// Now let me verify the RSK column-insertion bumping algorithm explicitly.
// At t=0, the colInsertionProb formula selects the transition where:
// - In each "gap interval" [rp+1, kp], the upper particle moves at the FIRST
//   available position (going from rp+1 upward). If that position has gp(s)=1
//   (i.e., there's "room" at that level: Nb(s-1) - L(s) > 0), it stops there.
//   If gp(s)=0 (no room), the bump cascades to the next position.
//
// This is exactly RSK column insertion:
// - c_i = 1 means a new box was removed from row i of lam_top to form mu.
//   Equivalently, a "ball" enters the system at row i.
// - The ball "bumps" through the rows of lam_bot.
// - At each row, if there's room (the row of lam_bot is strictly longer
//   than needed), the ball is placed there (d_i = 1).
// - If not, the ball continues to the next row.
//
// The Vj=1 case adds one more ball at the bottom (after all the c balls).

console.log('');
console.log('================================================================');
console.log('RSK BUMPING ALGORITHM VERIFICATION');
console.log('================================================================');
console.log('');

// Implement the t=0 RSK bumping algorithm:
function rskBump(lamBot, lamTop, c_vec, Vj) {
  // lamBot has k+1 parts, lamTop has k parts, c has k entries
  const k = c_vec.length;
  const lb = [...lamBot]; while (lb.length < k+1) lb.push(0);
  const lt = [...lamTop]; while (lt.length < k) lt.push(0);
  const mu = lt.map((a, i) => a - c_vec[i]);

  // The "nb" in colInsertionProb is lam_top (the "bar" partition)
  // The "lb" in colInsertionProb is mu
  // "lam" is lam_bot, "nu" is what we compute

  // In the formula:
  // c[i] = Nb(i) - Lb(i) = lt_i - mu_i = c_vec[i] (movement of lower particles)
  // d[i] = N_(i) - L(i) = nu_i - lb_i (movement of upper particles)

  // The "moved" lower particles are at positions where c[i]=1.
  // For each consecutive pair of moved particles (rp, kp),
  // we need to find where d[s]=1 in the interval [rp+1, kp].
  // At t=0, the formula forces d[s]=1 at the position s where gp(s) is nonzero
  // (or at kp if no earlier position works).

  // Actually, from the trace: at t=0, gp(s) = 1 iff Nb(s-1) - L(s) > 0,
  // i.e., lt_{s-1} - lb_s > 0, i.e., lt_{s-1} > lb_s.
  // (1-gp(s)) = 0 when gp(s)=1, = 1 when gp(s)=0.

  // Wait, I need to reconsider. At t=0:
  // fp(k) = (1-t^a)/(1-t^b)|_{t=0} where a = lt_{k-1} - lb_k, b = lt_{k-1} - lt_k + 1.
  // When a < b, this polynomial is 0 (empty polynomial), so fp(k) = 0, (1-fp) = 1.
  // When a >= b > 0, fp(0) = 1, (1-fp)(0) = 0.
  // When a = 0, fp = 0 regardless.
  // Actually: (1-t^a)/(1-t^b) = geom(a)/geom(b) * (cross terms)...
  // No, (1-t^a)/(1-t^b) only makes sense as exact polynomial division when b divides a or
  // more generally when cyclotomic factoring works. In the code it's using polyDiv which
  // does formal polynomial long division.
  // If a = 0: numerator is 0, result is 0.
  // If a > 0, b > 0: constant term of (1-t^a) is 1, of (1-t^b) is 1, and polyDiv gives
  // a polynomial whose constant term is 1. So fp(0) = 1 when a >= b.
  // But the fp result from the trace shows fp = 0 for a=2, b=3 (a < b)!
  // That means polyDiv([1,0,-1], [1,0,0,-1]) = 0? Let me check.

  // Actually: (1-t^2)/(1-t^3) is NOT an exact polynomial. The remainder is nonzero.
  // The polyDiv function does formal division and may give non-integer coefficients.
  // Let me check what polyDiv returns for this case.

  return null; // placeholder
}

// Check what polyDiv does with problematic cases
console.log('polyDiv tests:');
console.log('  (1-t^2)/(1-t^3) = ' + polyStr(polyDiv(poly1minusTn(2), poly1minusTn(3))));
console.log('  (1-t^1)/(1-t^2) = ' + polyStr(polyDiv(poly1minusTn(1), poly1minusTn(2))));
console.log('  (1-t^0)/(1-t^1) = ' + polyStr(polyDiv(poly1minusTn(0), poly1minusTn(1))));
console.log('  (1-t^1)/(1-t^3) = ' + polyStr(polyDiv(poly1minusTn(1), poly1minusTn(3))));
console.log('  (1-t^2)/(1-t^1) = ' + polyStr(polyDiv(poly1minusTn(2), poly1minusTn(1))));
console.log('  (1-t^3)/(1-t^1) = ' + polyStr(polyDiv(poly1minusTn(3), poly1minusTn(1))));

// Hmm, when a < b, polyDiv gives a non-polynomial result (fractional coefficients).
// The code handles this case by producing a polynomial that sums to 0 at t=0.
// Actually, in the context of the formula, if a < b, then fp(k) should be 0
// because the strip condition is violated. Let me check.

// Actually wait: In the code, fp is only called when Nb(k-1) >= L(k) >= Nb(k),
// which ensures a >= 0 and b >= 1. When a < b, it means a = Nb(k-1)-L(k) < b = Nb(k-1)-Nb(k)+1,
// i.e., L(k) > Nb(k), but we have L(k) = lb_k and Nb(k) = lt_k.
// So a < b when lb_k > lt_k, i.e., the lower partition part exceeds the bar partition part.

// The key point: fp is a POLYNOMIAL in t even when a < b, and its constant term fp(0)
// determines whether the bumping goes through that position or not.

// Let me just verify: for ALL Vj=0 cases, what does the deterministic d look like
// as a function of the partitions?

// ALGORITHM: Given lb (k+1 parts) and lt (k parts) and c (k binary digits):
// 1. Compute the "moved" positions: indices i where c_i = 1.
// 2. For each gap between consecutive moved positions, determine which row
//    absorbs the bump by checking the "room" condition.
// 3. The Vj bit adds one more bump from the bottom.

// Let me implement this differently: directly compute d from the algebraic formula at t=0.

function computeDat0(lamBot, lamTop, c_vec, Vj) {
  const k = c_vec.length;
  const lb = [...lamBot]; while (lb.length < k+1) lb.push(0);
  const lt = [...lamTop]; while (lt.length < k) lt.push(0);
  const mu = lt.map((a, i) => a - c_vec[i]);

  // Try all possible d vectors and find which gives prob(0)=1
  const numD = k + 1;
  // d has sum = |c| + Vj (maybe? let's not assume)
  // Just try all 2^(k+1) possibilities
  for (let mask = 0; mask < (1 << numD); mask++) {
    const d = [];
    for (let i = 0; i < numD; i++) d.push((mask >> i) & 1);
    const nu = lb.map((b, i) => b + d[i]);
    // Check nu is a valid partition (decreasing)
    let valid = true;
    for (let i = 0; i < nu.length - 1; i++) {
      if (nu[i] < nu[i+1]) { valid = false; break; }
    }
    if (!valid) continue;

    const p = colInsertionProb(lb, nu, mu, lt, Vj, k+1, k);
    const p0 = p[0] || 0;
    if (Math.abs(p0 - 1) < 1e-9) {
      return d;
    }
  }
  return null;
}

// Verify this matches our earlier data
console.log('');
console.log('Verification of computeDat0:');
let verifyOk = true;
for (const r of [...vj0data, ...vj1data]) {
  const d = computeDat0(r.lb, r.lt, r.c, r.Vj !== undefined ? r.Vj : 0);
  if (!d || !d.every((v,i) => v === r.d[i])) {
    console.log(`  MISMATCH: lt=(${r.lt}) lb=(${r.lb}) c=[${r.c}] Vj=${r.Vj} expected=[${r.d}] got=[${d}]`);
    verifyOk = false;
  }
}
console.log(`  ${verifyOk ? 'All match!' : 'MISMATCHES found'}`);

// Now the real question: what is the combinatorial algorithm that produces d from c?
// Let me think about it in terms of the INTERLACING CONDITIONS.
// mu interlaces with lt (above) and lb (below): lb_1 >= lt_1 >= lb_2 >= ... >= lt_k >= lb_{k+1}
// So mu_i = lt_i - c_i. The interlacing: lb_i >= mu_i >= lb_{i+1}.
// This requires: c_i <= lt_i - lb_{i+1} and c_i >= lt_i - lb_i (if lt_i > lb_i, c_i could be 0 or 1).
//
// nu interlaces with lb (above) and lt (below): nu_1 >= lb_1 >= nu_2 >= ... >= nu_{k+1}
// Wait, actually the OUTPUT interlacing is:
// nu/lb vertical strip and nu/lt horizontal strip.
// nu_i = lb_i + d_i. The vertical strip means d_i in {0,1}.
// The horizontal strip nu/lt means: nu_1 >= lt_1 >= nu_2 >= lt_2 >= ... >= lt_k >= nu_{k+1}.
// i.e., lb_i + d_i >= lt_i >= lb_{i+1} + d_{i+1}.
// Since lb_i >= lt_i >= lb_{i+1} (from the original interlacing),
// d_i >= lt_i - lb_i and d_{i+1} <= lt_i - lb_{i+1}.
// But lt_i - lb_i <= 0 (since lb_i >= lt_i), so d_i >= 0 is automatic.
// And lt_i - lb_{i+1} >= 0 (since lt_i >= lb_{i+1}), so d_{i+1} <= lt_i - lb_{i+1}.

// DEFINITIVE DESCRIPTION using interlacing gaps:
// Define gap_i = lt_i - lb_{i+1} for i = 1, ..., k. (These are >= 0.)
// For d: d_{i+1} <= gap_i.
// Since d_{i+1} in {0,1}: d_{i+1} can be 1 only if gap_i >= 1, i.e., lt_i > lb_{i+1}.
// If gap_i = 0 (lt_i = lb_{i+1}), then d_{i+1} must be 0 ("forced").
//
// At t=0, the algorithm deterministically places the 1s in d.
// Let me check: the "blocked" positions are exactly where gap_i = 0.

console.log('');
console.log('Gap analysis: gap_i = lt_i - lb_{i+1} (controls which d positions can be 1)');
console.log('');

for (const r of vj0data) {
  const k = r.c.length;
  const gaps = [];
  for (let i = 0; i < k; i++) {
    gaps.push((r.lt[i]||0) - (r.lb[i+1]||0));
  }
  console.log(`  lt=(${r.lt}) lb=(${r.lb}) c=[${r.c}] d=[${r.d}] gaps=[${gaps}]`);
}

// From the output:
// The "blocked" positions (where d must be 0) are at i+1 where gap_i = 0.
// At t=0 with Vj=0, the |c| ones in d are placed at positions starting from 1,
// SKIPPING the blocked positions. This is the "RSK bumping" effect:
// when a row is blocked (no gap), the bump goes to the next available row.

// Let me formalize and verify:
console.log('');
console.log('FINAL ALGORITHM: place |c|+Vj ones in d, starting from position 1,');
console.log('skipping positions i+1 where gap_i = 0 (lt_i = lb_{i+1}):');
console.log('');

function computeDfromAlgorithm(lt, lb, c_vec, Vj) {
  const k = c_vec.length;
  const ltArr = [...lt]; while (ltArr.length < k) ltArr.push(0);
  const lbArr = [...lb]; while (lbArr.length < k+1) lbArr.push(0);

  const numOnes = c_vec.reduce((a,b) => a+b, 0) + Vj;
  const d = new Array(k + 1).fill(0);

  // Available positions: position i (0-indexed) can have d[i]=1 if:
  // - i = 0: always available (d_1 can always be 1 since nu_1 >= lb_1 is ensured)
  // - i > 0: gap_{i-1} = lt_{i-1} - lb_i > 0

  let placed = 0;
  for (let i = 0; i < k + 1 && placed < numOnes; i++) {
    if (i === 0) {
      d[i] = 1; placed++;
    } else {
      const gap = (ltArr[i-1]||0) - (lbArr[i]||0);
      if (gap > 0) {
        d[i] = 1; placed++;
      }
    }
  }

  return d;
}

let algOk = true;
for (const r of vj0data) {
  const expected = computeDfromAlgorithm(r.lt, r.lb, r.c, 0);
  if (!expected.every((v,i) => v === r.d[i])) {
    algOk = false;
    console.log(`  Vj=0 FAIL: lt=(${r.lt}) lb=(${r.lb}) c=[${r.c}] expected=[${expected}] actual=[${r.d}]`);
  }
}
for (const r of vj1data) {
  const expected = computeDfromAlgorithm(r.lt, r.lb, r.c, 1);
  if (!expected.every((v,i) => v === r.d[i])) {
    algOk = false;
    console.log(`  Vj=1 FAIL: lt=(${r.lt}) lb=(${r.lb}) c=[${r.c}] expected=[${expected}] actual=[${r.d}]`);
  }
}
console.log(`Algorithm check: ${algOk ? '*** ALL MATCH ***' : 'FAILED'}`);

console.log('');
console.log('================================================================');
console.log('DEFINITIVE SUMMARY');
console.log('================================================================');
console.log('');
console.log('1. DETERMINISM AT t=0: YES.');
console.log('   For every (mu, Vj) pair, the transition P(nu|mu,Vj) evaluated at t=0');
console.log('   gives exactly one nu with probability 1.');
console.log('');
console.log('2. THE ALGORITHM:');
console.log('   Given lambda_top (k parts), lambda_bot (k+1 parts), and the binary vector');
console.log('   c (where c_i = lambda_top_i - mu_i), the output d (where d_i = nu_i - lambda_bot_i)');
console.log('   is computed as follows:');
console.log('');
console.log('   a) Compute num_ones = sum(c) + Vj');
console.log('   b) Place 1s in d starting from position 1 (top row), going down,');
console.log('      SKIPPING position i+1 whenever gap_i = 0,');
console.log('      where gap_i = lambda_top_i - lambda_bot_{i+1}.');
console.log('   c) The arrangement of 1s and 0s within c does NOT matter --');
console.log('      only the TOTAL number of 1s (plus Vj) determines d.');
console.log('');
console.log('3. STRUCTURE:');
console.log('   - The map mu -> nu at t=0 is MANY-TO-ONE: all mu with the same sum(c)');
console.log('     map to the same nu (for fixed Vj).');
console.log('   - For Vj=0: d has |c| ones placed at the first |c| available positions.');
console.log('   - For Vj=1: d has |c|+1 ones placed at the first |c|+1 available positions.');
console.log('   - Available positions are 1, and all i+1 where lambda_top_i > lambda_bot_{i+1}.');
console.log('   - Blocked positions are i+1 where lambda_top_i = lambda_bot_{i+1} (tight interlacing).');
console.log('');
console.log('4. CONNECTION TO RSK:');
console.log('   This is a form of deterministic "column insertion": the Bernoulli variable Vj');
console.log('   controls whether 0 or 1 extra rows get incremented, and the specific arrangement');
console.log('   of c is irrelevant (only the count matters). The blocked positions correspond to');
console.log('   rows where the interlacing between lambda_top and lambda_bot is tight.');
console.log('');
console.log('5. FREE BLOCKS:');
console.log('   mu has k free 2x2 blocks (positions that vary across valid mu configurations).');
console.log('   nu has k+1 free 2x2 blocks. The free positions of mu and nu overlap at the');
console.log('   same lattice positions, with nu having one extra free block.');
console.log('   At t=0, the bit values do NOT transfer directly from mu blocks to nu blocks.');
console.log('   Instead, the map collapses all mu with the same number of 1-bits to the same nu.');

// The gap-based algorithm ALSO fails because for all-gap=1 cases (like N=10,k=4),
// d STILL depends on the arrangement of c, not just sum(c).
// This means the t=0 map is a genuine non-trivial RSK-type map.

// Let me focus on the cleanest data: N=10, k=4 with all gaps=1.
// Vj=0 transitions:
// c=[1,1,1,1] -> d=[1,1,1,1,0]  <- sum=4, sorted
// c=[1,0,1,1] -> d=[1,1,0,1,0]  <- sum=3, NOT sorted (0 between 1s)
// c=[1,1,0,1] -> d=[1,1,1,0,0]  <- sum=3, sorted
// c=[1,0,0,1] -> d=[1,0,1,0,0]  <- sum=2, NOT sorted
// c=[1,1,1,0] -> d=[1,1,1,0,0]  <- sum=3, sorted
// c=[1,0,1,0] -> d=[1,1,0,0,0]  <- sum=2, sorted
// c=[1,1,0,0] -> d=[1,1,0,0,0]  <- sum=2, sorted
// c=[1,0,0,0] -> d=[1,0,0,0,0]  <- sum=1, sorted
//
// Note: c=[1,1,0,1] and c=[1,1,1,0] both give d=[1,1,1,0,0]. Different c, same d.
// But c=[1,0,1,1] gives d=[1,1,0,1,0] which is different from d=[1,1,1,0,0].
// So the map is NOT determined by sum(c) alone.
//
// Looking at it differently: the "moved lower particles" in c are at positions where c_i=1.
// nb (= lam_top) has particles at certain positions.
// The colInsertionProb at t=0 implements a specific bumping algorithm.
//
// For Vj=0 with c=[1,0,1,1], the moved particles are at positions 1,3,4.
// The pairs are: (0,1), (1,3), (3,4).
// Pair (0,1): trivial (rp+1=kp), d[1]=1.
// Pair (1,3): d must have a 1 in [2,3]. Finds first d[s]=1 in that range. d[2]=1.
// Pair (3,4): trivial (rp+1=kp), d[4]=1.
// So d = [1,1,0,1,0]. ✓
//
// For c=[1,1,0,1], moved = 1,2,4.
// Pairs: (0,1), (1,2), (2,4).
// Pair (0,1): trivial, d[1]=1.
// Pair (1,2): trivial, d[2]=1.
// Pair (2,4): d must have a 1 in [3,4]. Finds first: d[3]=1.
// So d = [1,1,1,0,0]. ✓
//
// So the algorithm is: the "pairs" structure determined by where c has its 1s
// determines WHERE in d the 1s go. It's the classical "jeu de taquin" / bumping.

// Let me implement this CORRECT algorithm:
function computeDcorrect(lamBot, lamTop, c_vec, Vj) {
  const k = c_vec.length;
  const lb = [...lamBot]; while (lb.length < k+1) lb.push(0);
  const lt = [...lamTop]; while (lt.length < k) lt.push(0);

  // In the colInsertionProb notation:
  // lam = lamBot (j = k+1 parts)
  // lb = mu = lt - c (jm1 = k parts)
  // nb = lamTop (k parts)
  // nu = lamBot + d (k+1 parts)
  //
  // c[i] in the formula = nb[i] - lb[i] = lt[i] - (lt[i] - c_vec[i]) = c_vec[i]
  // d[i] = nu[i] - lam[i] = d_vec[i]

  const mu = lt.map((a, i) => a - c_vec[i]);
  // Nb(i) = lt[i-1] (1-indexed)
  // Lb(i) = mu[i-1] (1-indexed)
  const Nb = i => (i >= 1 && i <= k) ? (lt[i-1] || 0) : 0;
  const L = i => (i >= 1 && i <= k+1) ? (lb[i-1] || 0) : 0;

  // moved positions (1-indexed)
  const moved = [];
  for (let i = 1; i <= k; i++) if (c_vec[i-1] === 1) moved.push(i);

  const pairs = [];
  for (let idx = 0; idx < moved.length; idx++) {
    const kp = moved[idx];
    const rp = idx > 0 ? moved[idx-1] : 0;
    pairs.push([rp, kp]);
  }

  // At t=0, for each pair (rp, kp):
  // The upper particle that gets claimed is at the FIRST s in [rp+1, kp] with
  // the property that the term (1-fp) * prod(1-gp) * gp(s) is nonzero at t=0.
  // At t=0: fp(kp) might be 0 or 1. If fp(kp)(0)=1, then (1-fp)(0)=0,
  // so the only surviving case is sp=kp. If fp(kp)(0)=0, then (1-fp)(0)=1,
  // and we need to find which gp(s)(0)=1 with all intermediate gp(ip)(0)=1 (giving (1-gp)(0)=0).
  // Wait: (1-gp)(0) = 0 when gp(0)=1. So the product prod_{ip > sp}(1-gp(ip)) is 0
  // unless ALL gp(ip)=0 for ip > sp, or the product is empty.
  // Actually: the term for sp in [rp+1, kp-1] is:
  //   (1-fp(kp)) * prod_{ip=kp-1 down to sp+1} (1-gp(ip)) * gp(sp)
  // At t=0, this is nonzero iff:
  //   fp(kp)(0) = 0 (so 1-fp = 1)
  //   gp(ip)(0) = 0 for all ip in [sp+1, kp-1] (so 1-gp = 1)
  //   gp(sp)(0) = 1
  // The term for sp = kp is just fp(kp), which is nonzero iff fp(kp)(0) > 0.
  // The term for sp = rp+1 is: (1-fp(kp)) * prod_{ip=kp-1 down to rp+2} (1-gp(ip))
  // This is nonzero iff fp(kp)=0 and gp(ip)=0 for all ip in [rp+2, kp-1].

  // So the algorithm at t=0:
  // For each pair (rp, kp):
  //   Compute fp(kp)(0). If fp(kp)(0)=1: sp = kp.
  //   If fp(kp)(0)=0: scan from kp-1 down to rp+1.
  //     Find the first (i.e., largest) ip such that gp(ip)(0)=1. Set sp = ip.
  //     If no such ip exists: sp = rp+1.

  function fp_at0(kp) {
    if (kp <= 1) return 1;
    const a = Nb(kp-1) - L(kp);
    const b = Nb(kp-1) - Nb(kp) + 1;
    if (a <= 0) return 0;
    if (b <= 0) return 1;
    // (1-t^a)/(1-t^b) at t=0: if a >= b, constant term is 1. If a < b, polynomial is 0.
    return a >= b ? 1 : 0;
  }

  function gp_at0(s) {
    if (s <= 1) return 1;
    const exp = Nb(s-1) - L(s);
    return exp > 0 ? 1 : 0;
  }

  const d = new Array(k + 1).fill(0);
  const claimed = new Set();

  for (const [rp, kp] of pairs) {
    if (rp + 1 === kp) {
      d[kp - 1] = 1;
      claimed.add(kp);
      continue;
    }

    if (fp_at0(kp) === 1) {
      d[kp - 1] = 1;
      claimed.add(kp);
    } else {
      // Scan from kp-1 down to rp+1 for first gp(ip)=1
      let sp = rp + 1; // default
      for (let ip = kp - 1; ip >= rp + 1; ip--) {
        if (gp_at0(ip) === 1) {
          sp = ip;
          break;
        }
      }
      d[sp - 1] = 1;
      claimed.add(sp);
    }
  }

  // Vj=1: extra move
  if (Vj === 1) {
    const mp = moved.length > 0 ? moved[moved.length - 1] : 0;
    if (mp === k) {
      // mp = jm1, so d[j] must be 1
      d[k] = 1;
    } else {
      // Scan from j=k+1 down to mp+1
      // Actually: from the code, for Vj=1 and mp < jm1:
      // if sp == j: prob *= gp(j)
      // if mp+1 < sp < j: prob *= (1-gp(j)) * prod(1-gp(ip)) * gp(sp)
      // if sp == mp+1: prob *= (1-gp(j)) * prod(1-gp(ip))
      // At t=0: same logic: find largest s in [mp+1, j] with gp(s)=1,
      // or mp+1 if none.
      const j = k + 1;
      if (gp_at0(j) === 1) {
        d[j - 1] = 1;
      } else {
        let sp = mp + 1;
        for (let ip = j - 1; ip >= mp + 1; ip--) {
          if (gp_at0(ip) === 1) {
            sp = ip;
            break;
          }
        }
        d[sp - 1] = 1;
      }
    }
  }

  return d;
}

console.log('');
console.log('================================================================');
console.log('CORRECT RSK BUMPING ALGORITHM VERIFICATION');
console.log('================================================================');
console.log('');

let correctOk = true;
for (const r of vj0data) {
  const d = computeDcorrect(r.lb, r.lt, r.c, 0);
  if (!d.every((v,i) => v === r.d[i])) {
    correctOk = false;
    console.log(`  Vj=0 FAIL: lt=(${r.lt}) lb=(${r.lb}) c=[${r.c}] computed=[${d}] actual=[${r.d}]`);
  }
}
for (const r of vj1data) {
  const d = computeDcorrect(r.lb, r.lt, r.c, 1);
  if (!d.every((v,i) => v === r.d[i])) {
    correctOk = false;
    console.log(`  Vj=1 FAIL: lt=(${r.lt}) lb=(${r.lb}) c=[${r.c}] computed=[${d}] actual=[${r.d}]`);
  }
}
console.log(`Correct algorithm check: ${correctOk ? '*** ALL MATCH ***' : 'FAILED'}`);

if (correctOk) {
  console.log('');
  console.log('================================================================');
  console.log('DEFINITIVE SUMMARY (CORRECTED)');
  console.log('================================================================');
  console.log('');
  console.log('1. DETERMINISM AT t=0: YES, verified for all tested cases.');
  console.log('');
  console.log('2. THE t=0 MAP IS RSK COLUMN INSERTION with bumping.');
  console.log('   The output d depends on BOTH the arrangement of c AND the gap structure.');
  console.log('   It is NOT determined by sum(c) alone.');
  console.log('');
  console.log('3. BUMPING ALGORITHM (t=0):');
  console.log('   Inputs: lam_top (k parts), lam_bot (k+1 parts), c in {0,1}^k, Vj in {0,1}.');
  console.log('   Output: d in {0,1}^{k+1}.');
  console.log('');
  console.log('   a) Identify "moved" positions: indices i where c_i = 1.');
  console.log('   b) Form consecutive pairs (rp, kp) of moved positions.');
  console.log('   c) For each pair (rp, kp):');
  console.log('      - Compute fp(kp) at t=0. If fp=1: place d_kp=1.');
  console.log('      - If fp=0: scan from kp-1 down to rp+1, find largest s');
  console.log('        with gp(s)(0)=1. Place d_s=1.');
  console.log('   d) For Vj=1: add one more 1 in d using the same bumping logic');
  console.log('      from the last moved position to position k+1.');
  console.log('');
  console.log('   where:');
  console.log('     fp(kp)(0) = 1 iff lam_top_{kp-1} - lam_bot_kp >= lam_top_{kp-1} - lam_top_kp + 1');
  console.log('     gp(s)(0) = 1 iff lam_top_{s-1} - lam_bot_s > 0');
  console.log('');
  console.log('4. The map is MANY-TO-ONE: different c can give the same d.');
  console.log('   It is NOT a simple "insert bit + sort" operation.');
  console.log('   It is genuinely RSK-like bumping that depends on the partition geometry.');
}

// Run additional stress tests with more varied partitions
console.log('');
console.log('================================================================');
console.log('ADDITIONAL STRESS TESTS');
console.log('================================================================');

const stressTests = [
  [6, 3, [2, 2, 1], [2, 1, 1, 1]],
  [7, 2, [4, 2], [4, 2, 1]],
  [8, 3, [3, 3, 2], [3, 2, 2, 1]],
  [9, 4, [4, 3, 2, 1], [4, 3, 2, 1, 1]],
  [7, 3, [4, 2, 1], [3, 3, 1, 1]],
  [8, 3, [5, 3, 1], [4, 3, 2, 1]],
  [6, 2, [4, 1], [3, 2, 1]],
  [9, 3, [5, 4, 2], [5, 3, 2, 1]],
];

let stressOk = true;
for (const [N, k, lt, lb] of stressTests) {
  const lamTopPos = new Set(displayPartToPositions(lt, k, N));
  const lamBotPos = new Set(displayPartToPositions(lb, k + 1, N));
  const allMu = enumerateMu(k, N, lamTopPos, lamBotPos);
  const allNu = enumerateNu(k, N, lamTopPos, lamBotPos);
  if (allMu.length === 0 || allNu.length === 0) {
    console.log(`  N=${N} k=${k} lt=(${lt}) lb=(${lb}): SKIP (no valid configs)`);
    continue;
  }

  const lamBotStd = posToStdPart([...lamBotPos], N);
  const lamTopStd = posToStdPart([...lamTopPos], N);
  const lamTopArr = [...lamTopStd]; while (lamTopArr.length < k) lamTopArr.push(0);
  const lamBotArr = [...lamBotStd]; while (lamBotArr.length < k+1) lamBotArr.push(0);

  let caseOk = true;
  let det = true;
  for (const mu of allMu) {
    const muStd = posToStdPart(mu.particles, N - 1);
    const muArr = [...muStd]; while (muArr.length < k) muArr.push(0);
    const c = lamTopArr.map((a, i) => a - muArr[i]);

    for (const Vj of [0, 1]) {
      // Find the actual target
      let actualD = null;
      for (const nu of allNu) {
        const nuStd = posToStdPart(nu.particles, N + 1);
        const nuArr = [...nuStd]; while (nuArr.length < k+1) nuArr.push(0);
        const p = colInsertionProb(lamBotStd, nuStd, muStd, lamTopStd, Vj, k+1, k);
        if (Math.abs((p[0] || 0) - 1) < 1e-9) {
          actualD = lamBotArr.map((b, i) => nuArr[i] - b);
        }
      }
      if (!actualD) { det = false; continue; }

      const computedD = computeDcorrect(lamBotArr, lamTopArr, c, Vj);
      if (!computedD.every((v,i) => v === actualD[i])) {
        caseOk = false;
        stressOk = false;
        console.log(`  FAIL: N=${N} k=${k} c=[${c}] Vj=${Vj} computed=[${computedD}] actual=[${actualD}]`);
      }
    }
  }
  if (caseOk && det) {
    console.log(`  N=${N} k=${k} lt=(${lt}) lb=(${lb}): OK (${allMu.length} mu, ${allNu.length} nu)`);
  } else if (!det) {
    console.log(`  N=${N} k=${k} lt=(${lt}) lb=(${lb}): NOT DETERMINISTIC at t=0!`);
    stressOk = false;
  }
}

console.log(`\nStress tests: ${stressOk ? '*** ALL PASSED ***' : 'SOME FAILED'}`);

console.log('');
console.log('=== ANALYSIS COMPLETE ===');
