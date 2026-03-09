/**
 * Homepage hero: Lozenge double-dimer simulation (WASM-backed)
 *
 * Uses LozengeModule (CFTP) to produce two exact uniform lozenge tiling
 * samples of a regular hexagon, computes height difference (h1-h2)/sqrt(2),
 * and renders the fluctuation field as a triangle heatmap with UVA colors.
 * Double-dimer loops (XOR cycles) are drawn as closed curves.
 *
 * A fresh sample is generated on every page load.
 */
(function () {
  'use strict';

  var HEX_SIDE = 22;

  // UVA brand palette (diverging: navy <- off-white -> orange)
  var NAVY   = [35, 45, 75];
  var ORANGE = [229, 114, 0];
  var BASE   = [248, 245, 240];
  var GAMMA  = 0.5;

  // Triangular lattice constants
  var SLOPE  = 1 / Math.sqrt(3);
  var DELTAC = 2 / Math.sqrt(3);

  /* ── Geometry helpers (inlined from lozenge-utils.js) ────────────────── */

  function getVertex(n, j) {
    return { x: n, y: SLOPE * n + j * DELTAC };
  }

  function getRightTriangleCentroid(n, j) {
    var v1 = getVertex(n, j), v2 = getVertex(n, j - 1), v3 = getVertex(n + 1, j - 1);
    return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
  }

  function getLeftTriangleCentroid(n, j) {
    var v1 = getVertex(n, j), v2 = getVertex(n + 1, j), v3 = getVertex(n + 1, j - 1);
    return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
  }

  function pointInPolygon(x, y, polygon) {
    var inside = false;
    for (var i = 0, pj = polygon.length - 1; i < polygon.length; pj = i++) {
      var xi = polygon[i].x, yi = polygon[i].y;
      var xj = polygon[pj].x, yj = polygon[pj].y;
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  function generateHexagonTriangles(a, b, c) {
    var directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
    var sideLengths = [a, b, c, a, b, c];
    var boundary = [];
    var bn = 0, bj = 0;
    for (var dir = 0; dir < 6; dir++) {
      for (var step = 0; step < sideLengths[dir]; step++) {
        boundary.push(getVertex(bn, bj));
        bn += directions[dir][0];
        bj += directions[dir][1];
      }
    }

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < boundary.length; i++) {
      var v = boundary[i];
      if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    }
    var searchMinN = Math.floor(minX) - 2;
    var searchMaxN = Math.ceil(maxX) + 2;
    var nRange = searchMaxN - searchMinN;
    var searchMinJ = Math.floor(minY / DELTAC) - nRange - 5;
    var searchMaxJ = Math.ceil(maxY / DELTAC) + nRange + 5;

    var triangleArr = [];
    for (var n = searchMinN; n <= searchMaxN; n++) {
      for (var j = searchMinJ; j <= searchMaxJ; j++) {
        var rc = getRightTriangleCentroid(n, j);
        if (pointInPolygon(rc.x, rc.y, boundary)) {
          triangleArr.push(n, j, 1);
        }
        var lc = getLeftTriangleCentroid(n, j);
        if (pointInPolygon(lc.x, lc.y, boundary)) {
          triangleArr.push(n, j, 2);
        }
      }
    }
    return triangleArr;
  }

  /* ── Height function (from ultimate-lozenge.md pattern-based BFS) ───── */

  function getVertexKeys(bn, bj, t) {
    if (t === 0) return [[bn, bj], [bn + 1, bj], [bn + 1, bj - 1], [bn, bj - 1]];
    if (t === 1) return [[bn, bj], [bn + 1, bj - 1], [bn + 1, bj - 2], [bn, bj - 1]];
    return [[bn - 1, bj], [bn, bj], [bn + 1, bj - 1], [bn, bj - 1]];
  }

  var HEIGHT_PATTERNS = [[0, 0, 0, 0], [1, 0, 0, 1], [1, 1, 0, 0]];

  function computeHeightFunction(dimers) {
    if (!dimers || dimers.length === 0) return new Map();

    var vertexToDimers = new Map();
    for (var i = 0; i < dimers.length; i++) {
      var d = dimers[i];
      var verts = getVertexKeys(d.bn, d.bj, d.t);
      for (var vi = 0; vi < 4; vi++) {
        var key = verts[vi][0] + ',' + verts[vi][1];
        if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
        vertexToDimers.get(key).push(i);
      }
    }

    var heights = new Map();
    var firstKey = vertexToDimers.keys().next().value;
    heights.set(firstKey, 0);
    var queue = [firstKey];
    var head = 0;
    var visited = new Set();

    while (head < queue.length) {
      var currentKey = queue[head++];
      if (visited.has(currentKey)) continue;
      visited.add(currentKey);
      var currentH = heights.get(currentKey);
      var parts = currentKey.split(',');
      var cn = parseInt(parts[0]), cj = parseInt(parts[1]);

      var dimerIndices = vertexToDimers.get(currentKey) || [];
      for (var di = 0; di < dimerIndices.length; di++) {
        var dimer = dimers[dimerIndices[di]];
        var verts = getVertexKeys(dimer.bn, dimer.bj, dimer.t);
        var pattern = HEIGHT_PATTERNS[dimer.t];

        var myIdx = -1;
        for (var vi = 0; vi < 4; vi++) {
          if (verts[vi][0] === cn && verts[vi][1] === cj) { myIdx = vi; break; }
        }
        if (myIdx < 0) continue;

        for (var vi = 0; vi < 4; vi++) {
          var vkey = verts[vi][0] + ',' + verts[vi][1];
          if (!heights.has(vkey)) {
            heights.set(vkey, currentH + (pattern[vi] - pattern[myIdx]));
            queue.push(vkey);
          }
        }
      }
    }

    var minH = Infinity;
    for (var h of heights.values()) { if (h < minH) minH = h; }
    if (minH !== 0) {
      for (var entry of heights) { heights.set(entry[0], entry[1] - minH); }
    }

    return heights;
  }

  /* ── Double-dimer loop computation (XOR of two matchings) ──────────── */

  function computeLoops(dimers0, dimers1) {
    // Each lozenge type matches one black triangle to one white triangle:
    //   Type 0 at (bn,bj): black(bn,bj) ↔ white(bn,bj)
    //   Type 1 at (bn,bj): black(bn,bj) ↔ white(bn,bj-1)
    //   Type 2 at (bn,bj): black(bn,bj) ↔ white(bn-1,bj)

    function bkey(n, j) { return n * 100000 + j; }
    function wkey(n, j) { return n * 100000 + j + 50000000; }

    function buildMatching(dimers) {
      var b2w = new Map(), w2b = new Map();
      var bCoord = new Map(), wCoord = new Map();
      for (var i = 0; i < dimers.length; i++) {
        var d = dimers[i];
        var bk = bkey(d.bn, d.bj);
        var wn, wj;
        if (d.t === 0) { wn = d.bn; wj = d.bj; }
        else if (d.t === 1) { wn = d.bn; wj = d.bj - 1; }
        else { wn = d.bn - 1; wj = d.bj; }
        var wk = wkey(wn, wj);
        b2w.set(bk, wk);
        w2b.set(wk, bk);
        bCoord.set(bk, [d.bn, d.bj]);
        wCoord.set(wk, [wn, wj]);
      }
      return { b2w: b2w, w2b: w2b, bCoord: bCoord, wCoord: wCoord };
    }

    var m0 = buildMatching(dimers0);
    var m1 = buildMatching(dimers1);

    // Trace XOR cycles: B →(M0)→ W →(M1)→ B' →(M0)→ W' → ...
    var visited = new Set();
    var loops = [];

    for (var entry of m0.b2w) {
      var bk = entry[0], wk0 = entry[1];
      if (visited.has(bk)) continue;
      if (m1.b2w.get(bk) === wk0) continue; // Same matching — skip

      var points = [];
      var curB = bk;
      do {
        visited.add(curB);
        var w = m0.b2w.get(curB);
        var bc = m0.bCoord.get(curB);
        var wc = m0.wCoord.get(w);
        points.push(getRightTriangleCentroid(bc[0], bc[1]));
        points.push(getLeftTriangleCentroid(wc[0], wc[1]));
        curB = m1.w2b.get(w);
      } while (curB && curB !== bk);

      if (points.length >= 4) loops.push(points);
    }

    return loops;
  }

  /* ── Color mapping ───────────────────────────────────────────────────── */

  function valueToColor(val, absMax) {
    if (absMax === 0) return 'rgb(248,245,240)';
    var t = val / absMax;
    var s, tgt;
    if (t < 0) {
      s = Math.pow(-t, GAMMA);
      tgt = NAVY;
    } else {
      s = Math.pow(t, GAMMA);
      tgt = ORANGE;
    }
    var r = BASE[0] + (tgt[0] - BASE[0]) * s;
    var g = BASE[1] + (tgt[1] - BASE[1]) * s;
    var b = BASE[2] + (tgt[2] - BASE[2]) * s;
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  /* ── WASM helpers ────────────────────────────────────────────────────── */

  function wasmParseAndFree(wasm, freeString, ptr) {
    var str = wasm.UTF8ToString(ptr);
    freeString(ptr);
    return JSON.parse(str);
  }

  /* ── Main render pipeline ────────────────────────────────────────────── */

  async function render(canvas) {
    var wasm = await LozengeModule();
    var initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
    var initFluctCFTP = wasm.cwrap('initFluctuationsCFTP', 'number', ['number']);
    var stepFluctCFTP = wasm.cwrap('stepFluctuationsCFTP', 'number', []);
    var exportFluctSample = wasm.cwrap('exportFluctuationSample', 'number', ['number']);
    var freeString = wasm.cwrap('freeString', null, ['number']);

    var triArr = generateHexagonTriangles(HEX_SIDE, HEX_SIDE, HEX_SIDE);
    var ptr = wasm._malloc(triArr.length * 4);
    for (var i = 0; i < triArr.length; i++) {
      wasm.setValue(ptr + i * 4, triArr[i], 'i32');
    }
    var initResult = wasmParseAndFree(wasm, freeString, initFromTriangles(ptr, triArr.length));
    wasm._free(ptr);

    if (initResult.status !== 'valid') {
      console.error('homepage-hero-dd: initFromTriangles failed', initResult);
      return;
    }

    wasmParseAndFree(wasm, freeString, initFluctCFTP(2));

    var maxIter = 500;
    var coalesced = false;
    for (var iter = 0; iter < maxIter; iter++) {
      var stepResult = wasmParseAndFree(wasm, freeString, stepFluctCFTP());
      if (stepResult.status === 'coalesced') { coalesced = true; break; }
      if (iter % 5 === 0) {
        await new Promise(function (r) { requestAnimationFrame(r); });
      }
    }
    console.log('homepage-hero-dd: CFTP', coalesced ? 'coalesced at iter ' + iter : 'did NOT coalesce after ' + maxIter);

    var sample0 = wasmParseAndFree(wasm, freeString, exportFluctSample(0));
    var sample1 = wasmParseAndFree(wasm, freeString, exportFluctSample(1));
    var dimers0 = sample0.dimers;
    var dimers1 = sample1.dimers;

    var h0 = computeHeightFunction(dimers0);
    var h1 = computeHeightFunction(dimers1);

    console.log('homepage-hero-dd: dimers', dimers0.length, dimers1.length,
      'heights', h0.size, h1.size);

    // Compute fluctuations (h0 - h1) / sqrt(2)
    var fluct = new Map();
    var sqrt2 = Math.sqrt(2);
    var absMax = 0;
    for (var entry of h0) {
      var key = entry[0], val0 = entry[1];
      var val1 = h1.has(key) ? h1.get(key) : 0;
      var f = (val0 - val1) / sqrt2;
      fluct.set(key, f);
      var af = f < 0 ? -f : f;
      if (af > absMax) absMax = af;
    }

    // Compute double-dimer loops
    var loops = computeLoops(dimers0, dimers1);
    console.log('homepage-hero-dd: absMax', absMax.toFixed(3), 'loops', loops.length);

    renderToCanvas(canvas, triArr, fluct, absMax, loops);
  }

  function renderToCanvas(canvas, triArr, fluct, absMax, loops) {
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth;
    if (!W) W = canvas.parentElement ? canvas.parentElement.clientWidth : 400;
    if (!W) W = 400;
    var H = W;
    canvas.width = (W * dpr) | 0;
    canvas.height = (H * dpr) | 0;

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Rotate 90° clockwise so hexagon has flat top
    ctx.translate(W / 2, H / 2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-W / 2, -H / 2);

    // Compute bounding box
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < triArr.length; i += 3) {
      var tn = triArr[i], tj = triArr[i + 1], tt = triArr[i + 2];
      var verts;
      if (tt === 1) {
        verts = [[tn, tj], [tn, tj - 1], [tn + 1, tj - 1]];
      } else {
        verts = [[tn, tj], [tn + 1, tj], [tn + 1, tj - 1]];
      }
      for (var k = 0; k < 3; k++) {
        var v = getVertex(verts[k][0], verts[k][1]);
        if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
      }
    }

    var pad = 6;
    var rangeX = maxX - minX, rangeY = maxY - minY;
    var scale = Math.min((W - 2 * pad) / rangeX, (H - 2 * pad) / rangeY);
    var offX = (W - rangeX * scale) / 2 - minX * scale;
    var offY = (H - rangeY * scale) / 2 - minY * scale;

    function toCanvas(vx, vy) {
      return [vx * scale + offX, vy * scale + offY];
    }

    function getF(n, j) {
      var val = fluct.get(n + ',' + j);
      return val !== undefined ? val : 0;
    }

    // Draw each triangle (heatmap)
    for (var i = 0; i < triArr.length; i += 3) {
      var tn = triArr[i], tj = triArr[i + 1], tt = triArr[i + 2];
      var vertKeys, screenVerts;

      if (tt === 1) {
        vertKeys = [[tn, tj], [tn, tj - 1], [tn + 1, tj - 1]];
      } else {
        vertKeys = [[tn, tj], [tn + 1, tj], [tn + 1, tj - 1]];
      }

      screenVerts = [];
      var avgF = 0;
      for (var k = 0; k < 3; k++) {
        var gv = getVertex(vertKeys[k][0], vertKeys[k][1]);
        screenVerts.push(toCanvas(gv.x, gv.y));
        avgF += getF(vertKeys[k][0], vertKeys[k][1]);
      }
      avgF /= 3;

      ctx.beginPath();
      ctx.moveTo(screenVerts[0][0], screenVerts[0][1]);
      ctx.lineTo(screenVerts[1][0], screenVerts[1][1]);
      ctx.lineTo(screenVerts[2][0], screenVerts[2][1]);
      ctx.closePath();
      ctx.fillStyle = valueToColor(avgF, absMax);
      ctx.fill();
    }

    // Draw double-dimer loops
    if (loops) {
      ctx.strokeStyle = 'rgba(35, 45, 75, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (var li = 0; li < loops.length; li++) {
        var pts = loops[li];
        if (pts.length < 4) continue;
        ctx.beginPath();
        var sv = toCanvas(pts[0].x, pts[0].y);
        ctx.moveTo(sv[0], sv[1]);
        for (var pi = 1; pi < pts.length; pi++) {
          sv = toCanvas(pts[pi].x, pts[pi].y);
          ctx.lineTo(sv[0], sv[1]);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

  }

  /* ── Bootstrap ───────────────────────────────────────────────────────── */

  function init() {
    var canvas = document.getElementById('hero-dd');
    if (!canvas) return;

    if (typeof LozengeModule === 'undefined') {
      console.warn('homepage-hero-dd: LozengeModule not available');
      return;
    }

    render(canvas).catch(function (err) {
      console.error('homepage-hero-dd: render failed', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
