#!/usr/bin/env node
// Generate letters/penrose.json - Penrose triangle shape (4x scaled) for the lozenge tiling
// Run: node data-art-2026/gen-penrose.js > letters/penrose.json

'use strict';

const slope = 1 / Math.sqrt(3);
const deltaC = 2 / Math.sqrt(3);

function getVertex(n, j) {
    return { x: n, y: slope * n + j * deltaC };
}

// Base Penrose triangle shape (12 triangles) from data-art/triangle/js/config.js
const BASE_SHAPE = [
    { n: -9, j: 5, type: 2 },
    { n: -9, j: 6, type: 1 },
    { n: -9, j: 6, type: 2 },
    { n: -9, j: 7, type: 1 },
    { n: -8, j: 6, type: 2 },
    { n: -8, j: 7, type: 1 },
    { n: -7, j: 6, type: 1 },
    { n: -7, j: 5, type: 2 },
    { n: -7, j: 5, type: 1 },
    { n: -8, j: 5, type: 2 },
    { n: -8, j: 5, type: 1 },
    { n: -9, j: 7, type: 2 }
];

// Get triangle vertices as lattice [n,j] pairs
function getTriangleVerts(n, j, type) {
    if (type === 1) return [[n, j], [n, j - 1], [n + 1, j - 1]];
    else            return [[n, j], [n + 1, j], [n + 1, j - 1]];
}

// Find boundary edges (unordered pairs that appear in only one triangle)
function findBoundaryEdgeSet(triangles) {
    const edgeCount = new Map(); // canonical key → count
    for (const tri of triangles) {
        const verts = getTriangleVerts(tri.n, tri.j, tri.type);
        for (let i = 0; i < 3; i++) {
            const a = verts[i], b = verts[(i + 1) % 3];
            // Canonical key: sort vertices
            const key = (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]))
                ? `${a[0]},${a[1]}|${b[0]},${b[1]}`
                : `${b[0]},${b[1]}|${a[0]},${a[1]}`;
            edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
        }
    }
    // Return edges with count=1 as [a,b] pairs (unordered)
    const result = [];
    for (const [key, count] of edgeCount) {
        if (count === 1) {
            const [left, right] = key.split('|');
            const [an, aj] = left.split(',').map(Number);
            const [bn, bj] = right.split(',').map(Number);
            result.push([[an, aj], [bn, bj]]);
        }
    }
    return result;
}

// Trace boundary edges into closed polygons using undirected adjacency
function traceBoundaries(boundaryEdges) {
    // Build undirected adjacency: each boundary vertex has exactly 2 neighbors
    const adj = new Map(); // key → [{to:[n,j], key:string}]
    for (const [[an, aj], [bn, bj]] of boundaryEdges) {
        const ka = `${an},${aj}`;
        const kb = `${bn},${bj}`;
        if (!adj.has(ka)) adj.set(ka, []);
        if (!adj.has(kb)) adj.set(kb, []);
        adj.get(ka).push({ to: [bn, bj], key: kb });
        adj.get(kb).push({ to: [an, aj], key: ka });
    }

    const usedEdges = new Set(); // "ka|kb" sorted
    const polygons = [];

    for (const [[an, aj], [bn, bj]] of boundaryEdges) {
        const ka = `${an},${aj}`, kb = `${bn},${bj}`;
        const ek = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        if (usedEdges.has(ek)) continue;

        // Start a new polygon from this edge
        const poly = [[an, aj]];
        usedEdges.add(ek);
        let prevKey = ka;
        let currentKey = kb;

        while (currentKey !== ka) {
            const [cn, cj] = currentKey.split(',').map(Number);
            poly.push([cn, cj]);

            const neighbors = adj.get(currentKey) || [];
            // Pick an unused edge that's not going back
            const next = neighbors.find(nb => {
                const ek2 = currentKey < nb.key ? `${currentKey}|${nb.key}` : `${nb.key}|${currentKey}`;
                return !usedEdges.has(ek2);
            });

            if (!next) break;
            const ek2 = currentKey < next.key ? `${currentKey}|${next.key}` : `${next.key}|${currentKey}`;
            usedEdges.add(ek2);
            prevKey = currentKey;
            currentKey = next.key;
        }

        if (poly.length >= 3) polygons.push(poly);
    }
    return polygons;
}

// Signed area of a polygon given as [[n,j],...] in world coords
function signedArea(latticePoly) {
    const pts = latticePoly.map(([n, j]) => getVertex(n, j));
    let area = 0;
    for (let i = 0, k = pts.length - 1; i < pts.length; k = i++) {
        area += pts[k].x * pts[i].y - pts[i].x * pts[k].y;
    }
    return area / 2;
}

// Point-in-polygon (ray casting) for world-coordinate polygon [{x,y}]
function pointInPolygon(x, y, polygon) {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

function getRightCentroid(n, j) {
    const v1 = getVertex(n, j), v2 = getVertex(n, j - 1), v3 = getVertex(n + 1, j - 1);
    return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
}
function getLeftCentroid(n, j) {
    const v1 = getVertex(n, j), v2 = getVertex(n + 1, j), v3 = getVertex(n + 1, j - 1);
    return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
}

// Double the shape: scale 2× around centroid, fill with triangles
function doubleShape(triangles) {
    const boundaryEdges = findBoundaryEdgeSet(triangles);
    process.stderr.write(`  Boundary edges: ${boundaryEdges.length}\n`);

    const latticePoly = traceBoundaries(boundaryEdges);
    process.stderr.write(`  Boundary polygons: ${latticePoly.length}, sizes: ${latticePoly.map(p => p.length).join(', ')}\n`);

    if (latticePoly.length === 0) {
        process.stderr.write('  ERROR: No boundaries found!\n');
        return triangles;
    }

    // Determine outer vs holes by largest absolute signed area
    const areas = latticePoly.map(signedArea);
    let outerIdx = 0;
    let maxAbsArea = 0;
    for (let i = 0; i < areas.length; i++) {
        if (Math.abs(areas[i]) > maxAbsArea) {
            maxAbsArea = Math.abs(areas[i]);
            outerIdx = i;
        }
    }
    process.stderr.write(`  Outer polygon index: ${outerIdx}, area: ${areas[outerIdx].toFixed(2)}\n`);

    // Compute centroid of outer boundary in lattice coords
    const outerLattice = latticePoly[outerIdx];
    let cenN = 0, cenJ = 0;
    for (const [n, j] of outerLattice) { cenN += n; cenJ += j; }
    const anchorN = Math.round(cenN / outerLattice.length);
    const anchorJ = Math.round(cenJ / outerLattice.length);
    process.stderr.write(`  Centroid (lattice): n=${anchorN}, j=${anchorJ}\n`);

    // Scale all boundary polygons 2× around anchor in lattice coords, convert to world
    const scaledWorldPolys = latticePoly.map(poly =>
        poly.map(([n, j]) => getVertex(anchorN + (n - anchorN) * 2, anchorJ + (j - anchorJ) * 2))
    );

    const scaledOuter = scaledWorldPolys[outerIdx];
    const scaledHoles = scaledWorldPolys.filter((_, i) => i !== outerIdx);

    // Bounding box of scaled outer
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of scaledOuter) {
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }

    const searchMinN = Math.floor(minX) - 2;
    const searchMaxN = Math.ceil(maxX) + 2;
    const nRange = searchMaxN - searchMinN;
    const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
    const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;
    process.stderr.write(`  Search range: n=[${searchMinN}..${searchMaxN}], j=[${searchMinJ}..${searchMaxJ}]\n`);

    const newTriangles = [];
    for (let n = searchMinN; n <= searchMaxN; n++) {
        for (let j = searchMinJ; j <= searchMaxJ; j++) {
            const rc = getRightCentroid(n, j);
            if (pointInPolygon(rc.x, rc.y, scaledOuter)) {
                if (!scaledHoles.some(h => pointInPolygon(rc.x, rc.y, h))) {
                    newTriangles.push({ n, j, type: 1 });
                }
            }
            const lc = getLeftCentroid(n, j);
            if (pointInPolygon(lc.x, lc.y, scaledOuter)) {
                if (!scaledHoles.some(h => pointInPolygon(lc.x, lc.y, h))) {
                    newTriangles.push({ n, j, type: 2 });
                }
            }
        }
    }
    return newTriangles;
}

// Start from BASE_SHAPE and double 4 times
let triangles = BASE_SHAPE.slice();
process.stderr.write(`Starting: ${triangles.length} triangles\n`);

for (let iter = 0; iter < 4; iter++) {
    process.stderr.write(`Doubling ${iter + 1}...\n`);
    triangles = doubleShape(triangles);
    process.stderr.write(`After doubling ${iter + 1}: ${triangles.length} triangles\n`);
}

// Output as JSON compatible with loadLetterTriangles
const output = { triangles: triangles.map(t => ({ n: t.n, j: t.j, t: t.type })) };
process.stdout.write(JSON.stringify(output));
process.stderr.write('\nDone.\n');
