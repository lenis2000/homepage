/**
 * Homepage hero: Lozenge double-dimer simulation (WASM-backed)
 *
 * Uses LozengeModule (CFTP) to produce two exact uniform lozenge tiling
 * samples of a regular hexagon. Double-dimer loops (XOR of the two
 * matchings) are level lines of the integer height difference h0-h1.
 * Loop interiors are filled as polygons (painter's algorithm, largest
 * first). Level at each loop is computed via signed winding numbers.
 *
 * A fresh sample is generated on every page load.
 */
(function () {
  'use strict';

  var HEX_SIDE = 20 + Math.floor(Math.random() * 41); // random 20–60

  // UVA brand palette (diverging: navy <- off-white -> orange)
  var NAVY   = [35, 45, 75];
  var ORANGE = [229, 114, 0];
  var BASE   = [248, 245, 240];
  var GAMMA  = 0.5;

  // Triangular lattice constants
  var SLOPE  = 1 / Math.sqrt(3);
  var DELTAC = 2 / Math.sqrt(3);

  /* ── Geometry helpers ────────────────────────────────────────────────── */

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
        if (pointInPolygon(rc.x, rc.y, boundary)) triangleArr.push(n, j, 1);
        var lc = getLeftTriangleCentroid(n, j);
        if (pointInPolygon(lc.x, lc.y, boundary)) triangleArr.push(n, j, 2);
      }
    }
    return triangleArr;
  }

  function generateHexagonBoundary(a, b, c) {
    var directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
    var sideLengths = [a, b, c, a, b, c];
    var boundary = [];
    var lattice = [];
    var bn = 0, bj = 0;
    for (var dir = 0; dir < 6; dir++) {
      for (var step = 0; step < sideLengths[dir]; step++) {
        boundary.push(getVertex(bn, bj));
        lattice.push([bn, bj]);
        bn += directions[dir][0];
        bj += directions[dir][1];
      }
    }
    return { boundary: boundary, lattice: lattice };
  }

  /* ── Height function (pattern-based BFS) ─────────────────────────────── */

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
    var visited = new Set();
    var loops = [];

    for (var entry of m0.b2w) {
      var bk = entry[0], wk0 = entry[1];
      if (visited.has(bk)) continue;
      if (m1.b2w.get(bk) === wk0) continue;
      var points = [];
      var curB = bk;
      do {
        visited.add(curB);
        var w = m0.b2w.get(curB);
        var bc = m0.bCoord.get(curB);
        var wc = m0.wCoord.get(w);
        var rc = getRightTriangleCentroid(bc[0], bc[1]);
        var lc = getLeftTriangleCentroid(wc[0], wc[1]);
        // Determine dimer type to find the apex vertex on each side
        // (apex = the vertex NOT on the dimer shared edge)
        var dt;
        if (wc[0] === bc[0] && wc[1] === bc[1]) dt = 0;
        else if (wc[0] === bc[0] && wc[1] === bc[1] - 1) dt = 1;
        else dt = 2;
        var rA, lA; // right apex, left apex
        if (dt === 0) { rA = [bc[0], bc[1]-1];   lA = [bc[0]+1, bc[1]]; }
        else if (dt === 1) { rA = [bc[0], bc[1]]; lA = [bc[0]+1, bc[1]-2]; }
        else               { rA = [bc[0]+1, bc[1]-1]; lA = [bc[0]-1, bc[1]]; }
        points.push({ x: rc.x, y: rc.y, bn: rA[0], bj: rA[1] });
        points.push({ x: lc.x, y: lc.y, wn: lA[0], wj: lA[1] });
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

    // Height functions (for outerLevel calibration + sign validation)
    var h0 = computeHeightFunction(dimers0);
    var h1 = computeHeightFunction(dimers1);
    var fluct = new Map();
    for (var entry of h0) {
      var key = entry[0], val0 = entry[1];
      if (!h1.has(key)) continue;
      fluct.set(key, val0 - h1.get(key));
    }

    var loops = computeLoops(dimers0, dimers1);
    var hexData = generateHexagonBoundary(HEX_SIDE, HEX_SIDE, HEX_SIDE);

    // Outer level from a boundary vertex
    var outerLevel = 0;
    for (var i = 0; i < hexData.lattice.length; i++) {
      var vkey = hexData.lattice[i][0] + ',' + hexData.lattice[i][1];
      if (fluct.has(vkey)) { outerLevel = fluct.get(vkey); break; }
    }

    console.log('homepage-hero-dd: dimers', dimers0.length, dimers1.length,
      'loops', loops.length, 'outerLevel', outerLevel);

    renderToCanvas(canvas, hexData.boundary, loops, outerLevel, fluct);
  }

  /* ── Rendering: fill loop polygons (painter's algorithm) ─────────────── */

  function renderToCanvas(canvas, hexBoundary, loops, outerLevel, fluct) {
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

    // Bounding box from hexagon boundary
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < hexBoundary.length; i++) {
      var v = hexBoundary[i];
      if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    }
    var pad = 6;
    var rangeX = maxX - minX, rangeY = maxY - minY;
    var scale = Math.min((W - 2 * pad) / rangeX, (H - 2 * pad) / rangeY);
    var offX = (W - rangeX * scale) / 2 - minX * scale;
    var offY = (H - rangeY * scale) / 2 - minY * scale;

    function toCanvas(vx, vy) {
      return [vx * scale + offX, vy * scale + offY];
    }

    // ── Compute loop data: signed area, levels from height function ──

    var loopData = [];
    for (var li = 0; li < loops.length; li++) {
      var pts = loops[li];
      if (pts.length < 4) continue;
      var area = 0;
      for (var pi = 0; pi < pts.length; pi++) {
        var pj = (pi + 1) % pts.length;
        area += pts[pi].x * pts[pj].y - pts[pj].x * pts[pi].y;
      }
      area /= 2;

      // Look up fluct at right-triangle vertices (even indices)
      var rLevel = null;
      for (var pi = 0; pi < pts.length; pi += 2) {
        if (pts[pi].bn !== undefined) {
          var key = pts[pi].bn + ',' + pts[pi].bj;
          if (fluct.has(key)) { rLevel = fluct.get(key); break; }
        }
      }
      // Look up fluct at left-triangle vertices (odd indices)
      var lLevel = null;
      for (var pi = 1; pi < pts.length; pi += 2) {
        if (pts[pi].wn !== undefined) {
          var key = pts[pi].wn + ',' + pts[pi].wj;
          if (fluct.has(key)) { lLevel = fluct.get(key); break; }
        }
      }

      loopData.push({
        pts: pts,
        absArea: Math.abs(area),
        sign: area > 0 ? 1 : -1,
        rLevel: rLevel,
        lLevel: lLevel
      });
    }

    // ── Scanline interior point finder (for winding number fallback) ──
    function findInteriorPoint(pts) {
      var cx = 0, cy = 0;
      for (var i = 0; i < pts.length; i++) { cx += pts[i].x; cy += pts[i].y; }
      cx /= pts.length; cy /= pts.length;
      if (pointInPolygon(cx, cy, pts)) return { x: cx, y: cy };
      // Edge midpoints nudged inward
      var sa = 0;
      for (var i = 0; i < pts.length; i++) {
        var j = (i + 1) % pts.length;
        sa += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
      }
      var ws = sa > 0 ? 1 : -1;
      var EPS = 0.02;
      for (var i = 0; i < pts.length; i++) {
        var j = (i + 1) % pts.length;
        var mx = (pts[i].x + pts[j].x) / 2, my = (pts[i].y + pts[j].y) / 2;
        var dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-10) continue;
        var px = mx + ws * dy / len * EPS, py = my + ws * (-dx) / len * EPS;
        if (pointInPolygon(px, py, pts)) return { x: px, y: py };
      }
      // Scanline
      var minY = Infinity, maxY = -Infinity;
      for (var i = 0; i < pts.length; i++) {
        if (pts[i].y < minY) minY = pts[i].y;
        if (pts[i].y > maxY) maxY = pts[i].y;
      }
      for (var si = 1; si < 30; si++) {
        var y = minY + (maxY - minY) * si / 30;
        var xs = [];
        for (var ei = 0, ej = pts.length - 1; ei < pts.length; ej = ei++) {
          var yi = pts[ei].y, yj = pts[ej].y;
          if ((yi <= y && yj > y) || (yj <= y && yi > y))
            xs.push(pts[ei].x + (y - yi) / (yj - yi) * (pts[ej].x - pts[ei].x));
        }
        if (xs.length >= 2) {
          xs.sort(function(a, b) { return a - b; });
          for (var k = 0; k + 1 < xs.length; k += 2) {
            var mx = (xs[k] + xs[k + 1]) / 2;
            if (pointInPolygon(mx, y, pts)) return { x: mx, y: y };
          }
        }
      }
      return { x: cx, y: cy };
    }

    // ── Assign interior level: apex lookup when distinct, winding number fallback ──
    // parity=0 (validated empirically): CCW loops have interior on right-apex side,
    //   CW loops have interior on left-apex side.
    // Winding number sign convention is backwards → use negated sum.
    for (var li = 0; li < loopData.length; li++) {
      var ld = loopData[li];
      if (ld.rLevel !== null && ld.lLevel !== null && ld.rLevel !== ld.lLevel) {
        // Apex lookup is unambiguous — use it directly (parity=0)
        ld.level = (ld.sign > 0) ? ld.rLevel : ld.lLevel;
      } else {
        // Fallback: winding number with negated sign convention
        var ip = findInteriorPoint(ld.pts);
        var level = outerLevel;
        for (var oi = 0; oi < loopData.length; oi++) {
          if (pointInPolygon(ip.x, ip.y, loopData[oi].pts)) {
            level -= loopData[oi].sign;
          }
        }
        ld.level = level;
      }
    }
    console.log('homepage-hero-dd: loops', loopData.length, 'outerLevel', outerLevel);

    // ── Compute absMax for color normalization ──

    var absMax = Math.abs(outerLevel);
    for (var li = 0; li < loopData.length; li++) {
      var al = Math.abs(loopData[li].level);
      if (al > absMax) absMax = al;
    }

    // ── Sort by area descending (painter's algorithm) ──

    loopData.sort(function(a, b) { return b.absArea - a.absArea; });

    // ── 1. Fill hexagon background with outerLevel color ──

    ctx.beginPath();
    var sv = toCanvas(hexBoundary[0].x, hexBoundary[0].y);
    ctx.moveTo(sv[0], sv[1]);
    for (var i = 1; i < hexBoundary.length; i++) {
      sv = toCanvas(hexBoundary[i].x, hexBoundary[i].y);
      ctx.lineTo(sv[0], sv[1]);
    }
    ctx.closePath();
    ctx.fillStyle = valueToColor(outerLevel, absMax);
    ctx.fill();

    // ── 2. Fill each loop polygon (largest first) ──

    for (var li = 0; li < loopData.length; li++) {
      var ld = loopData[li];
      ctx.beginPath();
      sv = toCanvas(ld.pts[0].x, ld.pts[0].y);
      ctx.moveTo(sv[0], sv[1]);
      for (var pi = 1; pi < ld.pts.length; pi++) {
        sv = toCanvas(ld.pts[pi].x, ld.pts[pi].y);
        ctx.lineTo(sv[0], sv[1]);
      }
      ctx.closePath();
      ctx.fillStyle = valueToColor(ld.level, absMax);
      ctx.fill();
    }

    // ── 3. Stroke all loops ──

    ctx.strokeStyle = 'rgba(35, 45, 75, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (var li = 0; li < loopData.length; li++) {
      var pts = loopData[li].pts;
      ctx.beginPath();
      sv = toCanvas(pts[0].x, pts[0].y);
      ctx.moveTo(sv[0], sv[1]);
      for (var pi = 1; pi < pts.length; pi++) {
        sv = toCanvas(pts[pi].x, pts[pi].y);
        ctx.lineTo(sv[0], sv[1]);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  /* ── Bootstrap ───────────────────────────────────────────────────────── */

  function init() {
    var canvas = document.getElementById('hero-dd-mobile');
    if (!canvas || canvas.offsetParent === null) {
      canvas = document.getElementById('hero-dd');
    }
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
