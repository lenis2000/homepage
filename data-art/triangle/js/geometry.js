// Triangle data-art geometry — lattice helpers, shape scaling
(function() {
    'use strict';

    // Triangular lattice constants
    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);

    function getVertex(n, j) {
        return {
            x: n,
            y: slope * n + j * deltaC
        };
    }

    function getTriangleCentroid(n, j, type) {
        if (type === 1) {
            const v0 = getVertex(n, j);
            const v1 = getVertex(n, j - 1);
            const v2 = getVertex(n + 1, j - 1);
            return { x: (v0.x + v1.x + v2.x) / 3, y: (v0.y + v1.y + v2.y) / 3 };
        } else {
            const v0 = getVertex(n, j);
            const v1 = getVertex(n + 1, j);
            const v2 = getVertex(n + 1, j - 1);
            return { x: (v0.x + v1.x + v2.x) / 3, y: (v0.y + v1.y + v2.y) / 3 };
        }
    }

    function pointInPolygon(x, y, polygon) {
        if (!polygon || polygon.length < 3) return false;
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

    function trianglesToMap(triangles) {
        const map = new Map();
        for (const t of triangles) {
            map.set(`${t.n},${t.j},${t.type}`, { n: t.n, j: t.j, type: t.type });
        }
        return map;
    }

    function worldToLattice(x, y) {
        const n = Math.round(x);
        const j = Math.round((y - slope * n) / deltaC);
        return { n, j };
    }

    function doubleMeshWithBoundaries(triangles, boundaries) {
        if (triangles.size === 0 || !boundaries || boundaries.length === 0) return triangles;

        let outerIdx = 0;
        let maxDiag = -1;
        const latticeBoundaries = boundaries.map(b => b.map(v => worldToLattice(v.x, v.y)));

        latticeBoundaries.forEach((b, i) => {
            let mn = Infinity, mxn = -Infinity, mj = Infinity, mxj = -Infinity;
            for (const v of b) {
                mn = Math.min(mn, v.n); mxn = Math.max(mxn, v.n);
                mj = Math.min(mj, v.j); mxj = Math.max(mxj, v.j);
            }
            const diag = (mxn - mn) ** 2 + (mxj - mj) ** 2;
            if (diag > maxDiag) { maxDiag = diag; outerIdx = i; }
        });

        const outerLattice = latticeBoundaries[outerIdx];
        let cenN = 0, cenJ = 0;
        for (const v of outerLattice) { cenN += v.n; cenJ += v.j; }
        const anchorN = Math.round(cenN / outerLattice.length);
        const anchorJ = Math.round(cenJ / outerLattice.length);

        const scaledBoundaries = latticeBoundaries.map(b => {
            return b.map(v => {
                const newN = anchorN + (v.n - anchorN) * 2;
                const newJ = anchorJ + (v.j - anchorJ) * 2;
                return getVertex(newN, newJ);
            });
        });

        const scaledOuter = scaledBoundaries[outerIdx];
        const scaledHoles = scaledBoundaries.filter((_, i) => i !== outerIdx);

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of scaledOuter) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }

        const newTriangles = new Map();
        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {
                const c1 = getTriangleCentroid(n, j, 1);
                if (pointInPolygon(c1.x, c1.y, scaledOuter)) {
                    let inHole = false;
                    for (const hole of scaledHoles) {
                        if (pointInPolygon(c1.x, c1.y, hole)) { inHole = true; break; }
                    }
                    if (!inHole) newTriangles.set(`${n},${j},1`, { n, j, type: 1 });
                }
                const c2 = getTriangleCentroid(n, j, 2);
                if (pointInPolygon(c2.x, c2.y, scaledOuter)) {
                    let inHole = false;
                    for (const hole of scaledHoles) {
                        if (pointInPolygon(c2.x, c2.y, hole)) { inHole = true; break; }
                    }
                    if (!inHole) newTriangles.set(`${n},${j},2`, { n, j, type: 2 });
                }
            }
        }

        return newTriangles;
    }

    async function generateScaledShape(simInterface) {
        var TC = window.TriangleConfig;
        let triangles = trianglesToMap(TC.BASE_SHAPE);

        for (let i = 0; i < TC.SCALE_ITERATIONS; i++) {
            simInterface.initFromTriangles(triangles);
            if (!simInterface.isValid || !simInterface.boundaries || simInterface.boundaries.length === 0) {
                break;
            }
            triangles = doubleMeshWithBoundaries(triangles, simInterface.boundaries);
        }

        return triangles;
    }

    window.TriangleGeometry = {
        slope: slope,
        deltaC: deltaC,
        getVertex: getVertex,
        getTriangleCentroid: getTriangleCentroid,
        pointInPolygon: pointInPolygon,
        trianglesToMap: trianglesToMap,
        worldToLattice: worldToLattice,
        doubleMeshWithBoundaries: doubleMeshWithBoundaries,
        generateScaledShape: generateScaledShape
    };
})();
