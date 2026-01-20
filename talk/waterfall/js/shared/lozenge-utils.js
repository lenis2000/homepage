/**
 * Lozenge Tiling Utilities
 * Geometry helpers for triangular lattice and lozenge tilings
 */

window.LozengeUtils = {
    // Triangular lattice constants (equilateral triangles)
    slope: 1 / Math.sqrt(3),
    deltaC: 2 / Math.sqrt(3),

    /**
     * Get vertex coordinates on triangular lattice
     * @param {number} n - horizontal coordinate
     * @param {number} j - vertical coordinate
     * @returns {{x: number, y: number}} Cartesian coordinates
     */
    getVertex(n, j) {
        return { x: n, y: this.slope * n + j * this.deltaC };
    },

    /**
     * Get lozenge vertices from dimer data
     * @param {Object} d - Dimer object with bn, bj, t
     * @returns {Array} Array of 4 vertex objects
     */
    getLozengeVerts(d) {
        const bn = d.bn, bj = d.bj, t = d.t;
        if (t === 0) {
            return [this.getVertex(bn, bj), this.getVertex(bn + 1, bj),
                    this.getVertex(bn + 1, bj - 1), this.getVertex(bn, bj - 1)];
        } else if (t === 1) {
            return [this.getVertex(bn, bj), this.getVertex(bn + 1, bj - 1),
                    this.getVertex(bn + 1, bj - 2), this.getVertex(bn, bj - 1)];
        } else {
            return [this.getVertex(bn - 1, bj), this.getVertex(bn, bj),
                    this.getVertex(bn + 1, bj - 1), this.getVertex(bn, bj - 1)];
        }
    },

    /**
     * Get triangle centroid (right-pointing, type=1)
     */
    getRightTriangleCentroid(n, j) {
        const v1 = this.getVertex(n, j), v2 = this.getVertex(n, j - 1), v3 = this.getVertex(n + 1, j - 1);
        return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
    },

    /**
     * Get triangle centroid (left-pointing, type=2)
     */
    getLeftTriangleCentroid(n, j) {
        const v1 = this.getVertex(n, j), v2 = this.getVertex(n + 1, j), v3 = this.getVertex(n + 1, j - 1);
        return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
    },

    /**
     * Point in polygon test (ray casting)
     */
    pointInPolygon(x, y, polygon) {
        if (polygon.length < 3) return false;
        let inside = false;
        for (let i = 0, pj = polygon.length - 1; i < polygon.length; pj = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[pj].x, yj = polygon[pj].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    },

    /**
     * Generate triangles for a×b×c hexagon region
     * @returns {Array} Flat array [n1, j1, type1, n2, j2, type2, ...]
     */
    generateHexagonTriangles(a, b, c) {
        // Generate asymmetric hexagon boundary: sides [a, b, c, a, b, c]
        const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
        const sideLengths = [a, b, c, a, b, c];
        const boundary = [];
        let bn = 0, bj = 0;
        for (let dir = 0; dir < 6; dir++) {
            for (let step = 0; step < sideLengths[dir]; step++) {
                boundary.push(this.getVertex(bn, bj));
                bn += directions[dir][0];
                bj += directions[dir][1];
            }
        }

        // Bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of boundary) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }
        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / this.deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / this.deltaC) + nRange + 5;

        // Generate triangles inside hexagon
        const triangleArr = [];
        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {
                const rc = this.getRightTriangleCentroid(n, j);
                if (this.pointInPolygon(rc.x, rc.y, boundary)) {
                    triangleArr.push(n, j, 1);
                }
                const lc = this.getLeftTriangleCentroid(n, j);
                if (this.pointInPolygon(lc.x, lc.y, boundary)) {
                    triangleArr.push(n, j, 2);
                }
            }
        }
        return triangleArr;
    },

    // Standard color palettes
    colors: {
        uva: ['#E57200', '#232D4B', '#F9DCBF'],
        white: ['#FFFFFF', '#FFFFFF', '#FFFFFF'],
        gray: { gray1: '#FFFFFF', gray2: '#FFFFFF', gray3: '#FFFFFF' }
    }
};
