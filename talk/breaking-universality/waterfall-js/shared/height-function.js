/**
 * Height Function computation for lozenge tilings
 * BFS algorithm to compute heights from dimers
 */

window.HeightFunction = {
    // Triangular lattice constants (same as LozengeUtils)
    slope: 1 / Math.sqrt(3),
    deltaC: 2 / Math.sqrt(3),

    /**
     * Compute height function from dimers using BFS
     * @param {Array} dimers - Array of dimer objects {bn, bj, t}
     * @returns {Map} Map of "n,j" -> height
     */
    computeHeightFunction(dimers) {
        if (!dimers || dimers.length === 0) return new Map();

        // Build vertex adjacency from lozenges
        const vertexAdjacency = new Map();

        function addEdge(v1, v2, heightDiff) {
            const key1 = `${v1.n},${v1.j}`;
            const key2 = `${v2.n},${v2.j}`;
            if (!vertexAdjacency.has(key1)) vertexAdjacency.set(key1, []);
            if (!vertexAdjacency.has(key2)) vertexAdjacency.set(key2, []);
            vertexAdjacency.get(key1).push({ target: key2, diff: heightDiff });
            vertexAdjacency.get(key2).push({ target: key1, diff: -heightDiff });
        }

        // Each lozenge type has specific height differences
        for (const d of dimers) {
            const bn = d.bn, bj = d.bj, t = d.t;

            if (t === 0) {
                // Horizontal lozenge: vertices at (bn,bj), (bn+1,bj), (bn+1,bj-1), (bn,bj-1)
                addEdge({n: bn, j: bj}, {n: bn+1, j: bj}, 0);
                addEdge({n: bn+1, j: bj}, {n: bn+1, j: bj-1}, 1);
                addEdge({n: bn+1, j: bj-1}, {n: bn, j: bj-1}, 0);
                addEdge({n: bn, j: bj-1}, {n: bn, j: bj}, -1);
            } else if (t === 1) {
                // Type 1 lozenge
                addEdge({n: bn, j: bj}, {n: bn+1, j: bj-1}, 1);
                addEdge({n: bn+1, j: bj-1}, {n: bn+1, j: bj-2}, 1);
                addEdge({n: bn+1, j: bj-2}, {n: bn, j: bj-1}, 0);
                addEdge({n: bn, j: bj-1}, {n: bn, j: bj}, -2);
            } else {
                // Type 2 lozenge
                addEdge({n: bn-1, j: bj}, {n: bn, j: bj}, 0);
                addEdge({n: bn, j: bj}, {n: bn+1, j: bj-1}, 1);
                addEdge({n: bn+1, j: bj-1}, {n: bn, j: bj-1}, 0);
                addEdge({n: bn, j: bj-1}, {n: bn-1, j: bj}, 1);
            }
        }

        // BFS from arbitrary starting vertex
        const heights = new Map();
        const vertices = Array.from(vertexAdjacency.keys());
        if (vertices.length === 0) return heights;

        const startKey = vertices[0];
        heights.set(startKey, 0);
        const queue = [startKey];

        while (queue.length > 0) {
            const current = queue.shift();
            const currentHeight = heights.get(current);
            const neighbors = vertexAdjacency.get(current) || [];

            for (const { target, diff } of neighbors) {
                if (!heights.has(target)) {
                    heights.set(target, currentHeight + diff);
                    queue.push(target);
                }
            }
        }

        // Normalize so minimum height is 0
        let minH = Infinity;
        for (const h of heights.values()) {
            minH = Math.min(minH, h);
        }
        for (const [k, h] of heights) {
            heights.set(k, h - minH);
        }

        return heights;
    },

    /**
     * Convert (n, j, h) to 3D coordinates
     * @param {number} n - lattice n coordinate
     * @param {number} j - lattice j coordinate
     * @param {number} h - height value
     * @param {number} scale - scale factor (default 1)
     * @returns {{x: number, y: number, z: number}} 3D coordinates
     */
    to3D(n, j, h, scale = 1) {
        const x2d = n;
        const y2d = this.slope * n + j * this.deltaC;
        return {
            x: x2d * scale,
            y: y2d * scale,
            z: h * scale
        };
    },

    /**
     * Get 3D lozenge vertices with height
     * @param {Object} d - Dimer {bn, bj, t}
     * @param {Map} heights - Height map from computeHeightFunction
     * @param {number} scale - Scale factor
     * @returns {Array} Array of 4 {x, y, z} vertices
     */
    get3DLozengeVerts(d, heights, scale = 1) {
        const bn = d.bn, bj = d.bj, t = d.t;
        let coords;

        if (t === 0) {
            coords = [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
        } else if (t === 1) {
            coords = [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
        } else {
            coords = [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
        }

        return coords.map(([n, j]) => {
            const h = heights.get(`${n},${j}`) || 0;
            return this.to3D(n, j, h, scale);
        });
    }
};
