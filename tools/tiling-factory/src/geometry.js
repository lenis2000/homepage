/**
 * Lozenge Tiling Geometry
 * Extracted from talk/visual/js/shared/lozenge-utils.js
 *
 * Triangular lattice coordinate system:
 *   Vertex (n, j) → Cartesian (x, y) where:
 *     x = n
 *     y = slope * n + j * deltaC
 *
 * Triangle types:
 *   1 = Black (right-pointing): vertices (n,j), (n,j-1), (n+1,j-1)
 *   2 = White (left-pointing): vertices (n,j), (n+1,j), (n+1,j-1)
 *
 * Dimer types (edge connecting black triangle at (bn,bj) to white neighbor):
 *   type 0: diagonal     → white at (bn, bj)
 *   type 1: bottom       → white at (bn, bj-1)
 *   type 2: left-vertical → white at (bn-1, bj)
 */

const slope = 1 / Math.sqrt(3);
const deltaC = 2 / Math.sqrt(3);

export { slope, deltaC };

export function getVertex(n, j) {
    return { x: n, y: slope * n + j * deltaC };
}

export function getLozengeVerts(d) {
    const { bn, bj, t } = d;
    if (t === 0) {
        return [getVertex(bn, bj), getVertex(bn + 1, bj),
                getVertex(bn + 1, bj - 1), getVertex(bn, bj - 1)];
    } else if (t === 1) {
        return [getVertex(bn, bj), getVertex(bn + 1, bj - 1),
                getVertex(bn + 1, bj - 2), getVertex(bn, bj - 1)];
    } else {
        return [getVertex(bn - 1, bj), getVertex(bn, bj),
                getVertex(bn + 1, bj - 1), getVertex(bn, bj - 1)];
    }
}

export function getRightTriangleCentroid(n, j) {
    const v1 = getVertex(n, j), v2 = getVertex(n, j - 1), v3 = getVertex(n + 1, j - 1);
    return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
}

export function getLeftTriangleCentroid(n, j) {
    const v1 = getVertex(n, j), v2 = getVertex(n + 1, j), v3 = getVertex(n + 1, j - 1);
    return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
}

export function pointInPolygon(x, y, polygon) {
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
}

/**
 * Compute bounding box of a set of dimers in Cartesian coordinates
 */
export function dimerBoundingBox(dimers) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const d of dimers) {
        const verts = getLozengeVerts(d);
        for (const v of verts) {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
            maxY = Math.max(maxY, v.y);
        }
    }
    return { minX, maxX, minY, maxY };
}

/**
 * Compute 3D coordinates for isometric view
 * Height function: type 0 → h=n, type 1 → h=n-1, type 2 → h=n-1
 * 3D mapping: x=h, y=-(n+h), z=j-h
 */
export function to3D(n, j, h) {
    return { x: h, y: -(n + h), z: j - h };
}

/**
 * Compute height at a black triangle based on dimer type
 */
export function dimerHeight(d) {
    if (d.t === 0) return d.bn;
    return d.bn - 1;
}

/**
 * Get the 4 vertices of a 3D cube face for a given dimer
 * Returns the top face, front face, or right face depending on type
 */
export function get3DCubeVertices(d) {
    const h = dimerHeight(d);
    const n = d.bn, j = d.bj;

    if (d.t === 0) {
        // Top face (horizontal rhombus) — looking down
        return [
            to3D(n, j, h), to3D(n + 1, j, h),
            to3D(n + 1, j - 1, h), to3D(n, j - 1, h)
        ];
    } else if (d.t === 1) {
        // Front face (facing viewer)
        return [
            to3D(n, j, h + 1), to3D(n + 1, j - 1, h + 1),
            to3D(n + 1, j - 2, h), to3D(n, j - 1, h)
        ];
    } else {
        // Right face (side)
        return [
            to3D(n - 1, j, h + 1), to3D(n, j, h + 1),
            to3D(n + 1, j - 1, h), to3D(n, j - 1, h)
        ];
    }
}

/**
 * Project 3D isometric coordinates to 2D screen coordinates
 * Standard isometric projection: x goes right-down, y goes left-down, z goes up
 */
export function isoProject(p3d) {
    const cos30 = Math.sqrt(3) / 2;
    return {
        x: (p3d.x - p3d.y) * cos30,
        y: (p3d.x + p3d.y) * 0.5 - p3d.z
    };
}
