// q-Shuffling Algorithm Engine
// Pure math logic — no DOM, no canvas, no UI.
// Used by: _simulations/domino_tilings/2026-03-22-q-shuffling-algo.md

(function(exports) {

  // State
  let currentN = 0;
  let targetN = 5;
  // Dominoes: {x, y, type} where type is 'N', 'S', 'E', 'W'
  // N/S are horizontal, E/W are vertical
  let dominoes = [];
  let phase = 'complete';  // 'complete', 'badblocks', 'deleted', 'slid'
  let badDominoes = new Set();
  let history = [];
  const MAX_HISTORY = 200;

  // --- Accessors ---

  function getState() {
    return { currentN, targetN, dominoes, phase, badDominoes, historyLen: history.length };
  }

  function setTargetN(n) { targetN = n; }

  // --- History ---

  function saveSnapshot() {
    history.push({ currentN, dominoes: dominoes.map(d => ({...d})), phase, badDominoes: new Set(badDominoes) });
    if (history.length > MAX_HISTORY) history.shift();
  }

  function restoreSnapshot() {
    if (history.length === 0) return false;
    const snap = history.pop();
    currentN = snap.currentN;
    dominoes = snap.dominoes;
    phase = snap.phase;
    badDominoes = snap.badDominoes;
    return true;
  }

  // --- Geometry ---

  // Check if cell (x, y) is inside Aztec diamond A_n
  // A_n: cells where |x + 0.5| + |y + 0.5| <= n
  function inDiamond(x, y, n) {
    return Math.abs(x + 0.5) + Math.abs(y + 0.5) <= n;
  }

  // Get cells covered by a domino
  function dominoCells(d) {
    if (d.type === 'N' || d.type === 'S') {
      return [{x: d.x, y: d.y}, {x: d.x + 1, y: d.y}];
    } else {
      return [{x: d.x, y: d.y}, {x: d.x, y: d.y + 1}];
    }
  }

  // Build a map from cell to domino index
  function buildCellMap() {
    const map = new Map();
    dominoes.forEach((d, idx) => {
      dominoCells(d).forEach(c => map.set(`${c.x},${c.y}`, idx));
    });
    return map;
  }

  // --- Shuffling steps ---

  // Find bad blocks: 2x2 blocks filled by N-S pair or E-W pair
  function findBadBlocks(n) {
    const cellMap = buildCellMap();
    const bad = new Set();

    for (let bx = -n; bx < n; bx++) {
      for (let by = -n; by < n; by++) {
        if (!inDiamond(bx, by, n) || !inDiamond(bx+1, by, n) ||
            !inDiamond(bx, by+1, n) || !inDiamond(bx+1, by+1, n)) continue;

        const d00 = cellMap.get(`${bx},${by}`);
        const d10 = cellMap.get(`${bx+1},${by}`);
        const d01 = cellMap.get(`${bx},${by+1}`);
        const d11 = cellMap.get(`${bx+1},${by+1}`);

        if (d00 === undefined || d10 === undefined || d01 === undefined || d11 === undefined) continue;

        // Bad N-S pair: bottom=N, top=S
        if (d00 === d10 && d01 === d11 && d00 !== d01) {
          if (dominoes[d00].type === 'N' && dominoes[d01].type === 'S') {
            bad.add(d00);
            bad.add(d01);
          }
        }

        // Bad E-W pair: left=E, right=W
        if (d00 === d01 && d10 === d11 && d00 !== d10) {
          if (dominoes[d00].type === 'E' && dominoes[d10].type === 'W') {
            bad.add(d00);
            bad.add(d10);
          }
        }
      }
    }
    return bad;
  }

  function deleteBadDominoes(badSet) {
    dominoes = dominoes.filter((_, idx) => !badSet.has(idx));
  }

  function slideDominoes() {
    dominoes.forEach(d => {
      if (d.type === 'N') d.y += 1;
      else if (d.type === 'S') d.y -= 1;
      else if (d.type === 'E') d.x += 1;
      else if (d.type === 'W') d.x -= 1;
    });
  }

  // Fill empty 2x2 blocks with uniform random choice
  function createDominoes(n) {
    const occupied = new Set();
    dominoes.forEach(d => {
      dominoCells(d).forEach(c => occupied.add(`${c.x},${c.y}`));
    });

    function isBlockEmpty(bx, by) {
      return !occupied.has(`${bx},${by}`) && !occupied.has(`${bx+1},${by}`) &&
             !occupied.has(`${bx},${by+1}`) && !occupied.has(`${bx+1},${by+1}`);
    }

    function fillBlock(bx, by, vertical) {
      if (vertical) {
        dominoes.push({x: bx, y: by, type: 'W'});
        dominoes.push({x: bx + 1, y: by, type: 'E'});
      } else {
        dominoes.push({x: bx, y: by, type: 'S'});
        dominoes.push({x: bx, y: by + 1, type: 'N'});
      }
      occupied.add(`${bx},${by}`);
      occupied.add(`${bx+1},${by}`);
      occupied.add(`${bx},${by+1}`);
      occupied.add(`${bx+1},${by+1}`);
    }

    for (let bx = -n; bx < n; bx++) {
      for (let by = -n; by < n; by++) {
        if (!inDiamond(bx, by, n) || !inDiamond(bx+1, by, n) ||
            !inDiamond(bx, by+1, n) || !inDiamond(bx+1, by+1, n)) continue;

        if (isBlockEmpty(bx, by)) {
          fillBlock(bx, by, Math.random() < 0.5);
        }
      }
    }
  }

  // Initialize A_1
  function initN1() {
    dominoes = [];
    if (Math.random() < 0.5) {
      dominoes.push({x: -1, y: -1, type: 'W'});
      dominoes.push({x: 0, y: -1, type: 'E'});
    } else {
      dominoes.push({x: -1, y: -1, type: 'S'});
      dominoes.push({x: -1, y: 0, type: 'N'});
    }
    currentN = 1;
  }

  // --- Composite steps ---

  // Full shuffle step: delete bad → slide → fill
  function shuffleStep() {
    if (currentN === 0) {
      initN1();
      return;
    }
    const bad = findBadBlocks(currentN);
    deleteBadDominoes(bad);
    slideDominoes();
    currentN++;
    createDominoes(currentN);
  }

  // Granular steps: complete → badblocks → deleted → slid → complete
  function granularStep() {
    if (currentN === 0) {
      initN1();
      phase = 'complete';
      return;
    }

    if (phase === 'complete') {
      badDominoes = findBadBlocks(currentN);
      phase = 'badblocks';
    } else if (phase === 'badblocks') {
      deleteBadDominoes(badDominoes);
      badDominoes = new Set();
      phase = 'deleted';
    } else if (phase === 'deleted') {
      slideDominoes();
      phase = 'slid';
    } else if (phase === 'slid') {
      currentN++;
      createDominoes(currentN);
      phase = 'complete';
    }
  }

  function resetState() {
    currentN = 0;
    dominoes = [];
    phase = 'complete';
    badDominoes = new Set();
    history = [];
  }

  function runToTarget() {
    currentN = 0;
    dominoes = [];
    phase = 'complete';
    history = [];
    while (currentN < targetN) {
      shuffleStep();
    }
  }

  // --- Partition analysis ---

  function toSup(n) {
    const sups = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    return String(n).split('').map(c => sups[parseInt(c)] || c).join('');
  }

  function computeDiagonalPartitions(nDiag) {
    const sDom = new Set();
    const wDom = new Set();
    dominoes.forEach(d => {
      if (d.type === 'S') sDom.add(`${d.x},${d.y}`);
      if (d.type === 'W') wDom.add(`${d.x},${d.y}`);
    });
    const result = [];
    for (let k = 0; k <= 2 * nDiag; k++) {
      const diag = k - (nDiag + 1);
      const cells = [];
      for (let x = -nDiag - 1; x <= nDiag + 1; x++) {
        const y = diag - x;
        if (inDiamond(x, y, nDiag)) cells.push({x, y});
      }
      const particlePos = [];
      cells.forEach((c, i) => {
        if (sDom.has(`${c.x - 1},${c.y}`) || wDom.has(`${c.x},${c.y - 1}`) ||
            sDom.has(`${c.x},${c.y}`) || wDom.has(`${c.x},${c.y}`))
          particlePos.push(i + 1);
      });
      const h = particlePos.length;
      const partitionRaw = [];
      for (let i = 1; i <= h; i++) partitionRaw.push(particlePos[h - i] - (h + 1 - i));
      const partition = partitionRaw.slice(0, partitionRaw.findLastIndex(v => v > 0) + 1);
      const isLambda = k % 2 === 1;
      const num = isLambda ? (k + 1) / 2 : k / 2;
      result.push({ k, d: diag, label: (isLambda ? 'λ' : 'μ') + toSup(num), partition, cells, isLambda });
    }
    return result;
  }

  // --- Public API ---

  exports.QShufflingEngine = {
    getState,
    setTargetN,
    saveSnapshot,
    restoreSnapshot,
    shuffleStep,
    granularStep,
    resetState,
    runToTarget,
    inDiamond,
    dominoCells,
    computeDiagonalPartitions,
    toSup
  };

})(window);
