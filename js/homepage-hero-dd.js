/**
 * Homepage hero: Lozenge double-dimer simulation (WASM-backed)
 *
 * Uses LozengeModule (CFTP) to produce two exact uniform lozenge tiling
 * samples of a regular hexagon. Double-dimer loops (XOR of the two
 * matchings) are level lines of the integer height difference h0-h1.
 * Loop interiors are flood-filled as polygons (painter's algorithm,
 * largest first) with flat colors from a diverging UVA palette.
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

  function generateHexagonBoundary(a, b, c) {
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
    return boundary;
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
        points.push(getRightTriangleCentroid(bc[0], bc[1]));
        points.push(getLeftTriangleCentroid(wc[0], wc[1]));
        curB = m1.w2b.get(w);
      } while (curB && curB !== bk);

      if (points.length >= 4) loops.push(points);
    }

    return loops;
  }

  /* ── Region flood-fill (Union-Find on triangles between loops) ──────── */

  function computeRegions(triArr, dimers0, dimers1) {
    function rkey(n, j) { return n * 100000 + j; }
    function lkey(n, j) { return n * 100000 + j + 50000000; }

    function buildMatchMap(dimers) {
      var m = new Map();
      for (var i = 0; i < dimers.length; i++) {
        var d = dimers[i];
        var rk = rkey(d.bn, d.bj);
        if (d.t === 0) m.set(rk, lkey(d.bn, d.bj));
        else if (d.t === 1) m.set(rk, lkey(d.bn, d.bj - 1));
        else m.set(rk, lkey(d.bn - 1, d.bj));
      }
      return m;
    }

    var match0 = buildMatchMap(dimers0);
    var match1 = buildMatchMap(dimers1);

    var numTri = triArr.length / 3;
    var triIdx = new Map();
    for (var i = 0; i < numTri; i++) {
      var n = triArr[i * 3], j = triArr[i * 3 + 1], t = triArr[i * 3 + 2];
      triIdx.set((t === 1) ? rkey(n, j) : lkey(n, j), i);
    }

    var parent = new Int32Array(numTri);
    var ufRank = new Uint8Array(numTri);
    for (var i = 0; i < numTri; i++) parent[i] = i;

    function find(x) {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    }
    function union(a, b) {
      a = find(a); b = find(b);
      if (a === b) return;
      if (ufRank[a] < ufRank[b]) { var tmp = a; a = b; b = tmp; }
      parent[b] = a;
      if (ufRank[a] === ufRank[b]) ufRank[a]++;
    }

    for (var i = 0; i < numTri; i++) {
      if (triArr[i * 3 + 2] !== 1) continue;
      var n = triArr[i * 3], j = triArr[i * 3 + 1];
      var rk = rkey(n, j);
      var m0 = match0.get(rk);
      var m1 = match1.get(rk);

      var adjKeys = [lkey(n, j), lkey(n - 1, j), lkey(n, j - 1)];
      for (var ai = 0; ai < 3; ai++) {
        var lk = adjKeys[ai];
        var li = triIdx.get(lk);
        if (li === undefined) continue;
        if ((m0 === lk) === (m1 === lk)) {
          union(i, li);
        }
      }
    }

    var regionOf = new Int32Array(numTri);
    for (var i = 0; i < numTri; i++) regionOf[i] = find(i);
    return regionOf;
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

    // Height functions (integer-valued)
    var h0 = computeHeightFunction(dimers0);
    var h1 = computeHeightFunction(dimers1);

    // Integer height difference h0 - h1 (only at vertices in BOTH maps)
    var fluct = new Map();
    var absMax = 0;
    for (var entry of h0) {
      var key = entry[0], val0 = entry[1];
      if (!h1.has(key)) continue;
      var f = val0 - h1.get(key);
      fluct.set(key, f);
      var af = f < 0 ? -f : f;
      if (af > absMax) absMax = af;
    }

    // Flood-fill regions between loops (for level lookup)
    var regionOf = computeRegions(triArr, dimers0, dimers1);

    // Assign each region a level via majority vote of vertex h0-h1 values
    var regionVotes = new Map();
    for (var i = 0; i < triArr.length; i += 3) {
      var reg = regionOf[i / 3];
      if (!regionVotes.has(reg)) regionVotes.set(reg, new Map());
      var votes = regionVotes.get(reg);
      var n = triArr[i], j = triArr[i + 1], t = triArr[i + 2];
      var verts = (t === 1)
        ? [[n, j], [n, j - 1], [n + 1, j - 1]]
        : [[n, j], [n + 1, j], [n + 1, j - 1]];
      for (var k = 0; k < 3; k++) {
        var vkey = verts[k][0] + ',' + verts[k][1];
        if (fluct.has(vkey)) {
          var lv = fluct.get(vkey);
          votes.set(lv, (votes.get(lv) || 0) + 1);
        }
      }
    }
    var regionLevel = new Map();
    for (var entry of regionVotes) {
      var bestLevel = 0, bestCount = 0;
      for (var vEntry of entry[1]) {
        if (vEntry[1] > bestCount) { bestCount = vEntry[1]; bestLevel = vEntry[0]; }
      }
      regionLevel.set(entry[0], bestLevel);
    }

    var loops = computeLoops(dimers0, dimers1);
    var hexBoundary = generateHexagonBoundary(HEX_SIDE, HEX_SIDE, HEX_SIDE);

    console.log('homepage-hero-dd: dimers', dimers0.length, dimers1.length,
      'absMax', absMax, 'loops', loops.length);

    renderToCanvas(canvas, triArr, regionOf, regionLevel, absMax, loops, hexBoundary);
  }

  /* ── Rendering: fill loop polygons (painter's algorithm) ─────────────── */

  function renderToCanvas(canvas, triArr, regionOf, regionLevel, absMax, loops, hexBoundary) {
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

    // Compute bounding box from hexagon boundary
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

    // Helper: find which triangle contains a point in lattice coords
    function findTriangleAt(px, py) {
      for (var i = 0; i < triArr.length; i += 3) {
        var n = triArr[i], j = triArr[i + 1], t = triArr[i + 2];
        var v0, v1, v2;
        if (t === 1) {
          v0 = getVertex(n, j); v1 = getVertex(n, j - 1); v2 = getVertex(n + 1, j - 1);
        } else {
          v0 = getVertex(n, j); v1 = getVertex(n + 1, j); v2 = getVertex(n + 1, j - 1);
        }
        var d = (v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y);
        if (Math.abs(d) < 1e-10) continue;
        var u = ((v1.y - v2.y) * (px - v2.x) + (v2.x - v1.x) * (py - v2.y)) / d;
        var v = ((v2.y - v0.y) * (px - v2.x) + (v0.x - v2.x) * (py - v2.y)) / d;
        if (u >= -0.01 && v >= -0.01 && u + v <= 1.01) return i / 3;
      }
      return -1;
    }

    // Helper: find a point reliably inside a polygon
    function findInteriorPoint(pts) {
      // Try centroid
      var cx = 0, cy = 0;
      for (var i = 0; i < pts.length; i++) { cx += pts[i].x; cy += pts[i].y; }
      cx /= pts.length; cy /= pts.length;
      if (pointInPolygon(cx, cy, pts)) return { x: cx, y: cy };
      // Fallback: try midpoints of edges, nudged toward centroid
      for (var i = 0; i < pts.length; i++) {
        var j = (i + 1) % pts.length;
        var mx = (pts[i].x + pts[j].x) / 2;
        var my = (pts[i].y + pts[j].y) / 2;
        var dx = cx - mx, dy = cy - my;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1e-6) {
          var px = mx + dx * 0.1 / dist;
          var py = my + dy * 0.1 / dist;
          if (pointInPolygon(px, py, pts)) return { x: px, y: py };
        }
      }
      return { x: cx, y: cy };
    }

    // Determine the level for the outermost region (near hexagon boundary)
    var outerLevel = 0;
    // Use a point near the first hexagon boundary vertex
    var bv0 = hexBoundary[0], bv1 = hexBoundary[1];
    var testPt = { x: (bv0.x + bv1.x) / 2, y: (bv0.y + bv1.y) / 2 };
    // Nudge slightly inward
    var bcx = 0, bcy = 0;
    for (var i = 0; i < hexBoundary.length; i++) { bcx += hexBoundary[i].x; bcy += hexBoundary[i].y; }
    bcx /= hexBoundary.length; bcy /= hexBoundary.length;
    var ndx = bcx - testPt.x, ndy = bcy - testPt.y;
    var ndist = Math.sqrt(ndx * ndx + ndy * ndy);
    if (ndist > 0) { testPt.x += ndx * 0.5 / ndist; testPt.y += ndy * 0.5 / ndist; }
    var outerTri = findTriangleAt(testPt.x, testPt.y);
    if (outerTri >= 0) {
      outerLevel = regionLevel.get(regionOf[outerTri]) || 0;
    }

    // 1. Fill hexagon background with outermost level color
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

    // 2. Compute loop data: area, interior level
    var loopData = [];
    for (var li = 0; li < loops.length; li++) {
      var pts = loops[li];
      if (pts.length < 4) continue;

      // Signed area (shoelace formula)
      var area = 0;
      for (var pi = 0; pi < pts.length; pi++) {
        var pj = (pi + 1) % pts.length;
        area += pts[pi].x * pts[pj].y - pts[pj].x * pts[pi].y;
      }
      area /= 2;

      // Find a point inside the loop and look up its region level
      var ip = findInteriorPoint(pts);
      var triI = findTriangleAt(ip.x, ip.y);
      var level = (triI >= 0) ? (regionLevel.get(regionOf[triI]) || 0) : 0;

      loopData.push({ pts: pts, area: Math.abs(area), level: level });
    }

    // 3. Sort by area descending (painter's algorithm: largest first)
    loopData.sort(function(a, b) { return b.area - a.area; });

    // 4. Fill each loop polygon with its interior level color
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

    // 5. Stroke all loops
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
