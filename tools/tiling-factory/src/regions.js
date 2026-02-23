/**
 * Region Presets for Lozenge Tilings
 * Each region generator returns a flat Int32Array [n1, j1, type1, n2, j2, type2, ...]
 * compatible with the WASM initFromTriangles interface.
 */

import { getVertex, getRightTriangleCentroid, getLeftTriangleCentroid, pointInPolygon, deltaC } from './geometry.js';

/**
 * Asymmetric hexagon with sides a, b, c, a, b, c
 * The standard tileable hexagonal region.
 */
export function hexagon(a, b, c) {
    if (b === undefined) { b = a; c = a; } // symmetric hexagon(n)
    const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
    const sideLengths = [a, b, c, a, b, c];
    const boundary = [];
    let bn = 0, bj = 0;
    for (let dir = 0; dir < 6; dir++) {
        for (let step = 0; step < sideLengths[dir]; step++) {
            boundary.push(getVertex(bn, bj));
            bn += directions[dir][0];
            bj += directions[dir][1];
        }
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of boundary) {
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }
    const searchMinN = Math.floor(minX) - 2;
    const searchMaxN = Math.ceil(maxX) + 2;
    const nRange = searchMaxN - searchMinN;
    const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
    const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

    const triangleArr = [];
    for (let n = searchMinN; n <= searchMaxN; n++) {
        for (let j = searchMinJ; j <= searchMaxJ; j++) {
            const rc = getRightTriangleCentroid(n, j);
            if (pointInPolygon(rc.x, rc.y, boundary)) {
                triangleArr.push(n, j, 1);
            }
            const lc = getLeftTriangleCentroid(n, j);
            if (pointInPolygon(lc.x, lc.y, boundary)) {
                triangleArr.push(n, j, 2);
            }
        }
    }
    return new Int32Array(triangleArr);
}

/**
 * Diamond = symmetric hexagon(n, n, n)
 */
export function diamond(n) {
    return hexagon(n, n, n);
}

/**
 * Heart-shaped region (for novelty sticker designs)
 * Builds a heart from the hexagon boundary system
 */
export function heart(n) {
    // Build a heart shape using polygon boundary
    const steps = 64;
    const boundary = [];
    for (let i = 0; i < steps; i++) {
        const t = (i / steps) * 2 * Math.PI;
        // Heart parametric curve
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        boundary.push({ x: x * n / 16, y: y * n / 16 });
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of boundary) {
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }
    const searchMinN = Math.floor(minX) - 2;
    const searchMaxN = Math.ceil(maxX) + 2;
    const nRange = searchMaxN - searchMinN;
    const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
    const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

    const triangleArr = [];
    let blackCount = 0, whiteCount = 0;
    for (let n_ = searchMinN; n_ <= searchMaxN; n_++) {
        for (let j = searchMinJ; j <= searchMaxJ; j++) {
            const rc = getRightTriangleCentroid(n_, j);
            if (pointInPolygon(rc.x, rc.y, boundary)) {
                triangleArr.push(n_, j, 1);
                blackCount++;
            }
            const lc = getLeftTriangleCentroid(n_, j);
            if (pointInPolygon(lc.x, lc.y, boundary)) {
                triangleArr.push(n_, j, 2);
                whiteCount++;
            }
        }
    }

    // Heart shapes may not have equal black/white triangles.
    // The WASM will validate and repair if needed.
    return new Int32Array(triangleArr);
}

/**
 * Available region types and their parameters
 */
export const REGION_TYPES = {
    hexagon: { fn: hexagon, params: ['a', 'b', 'c'], description: 'Hexagon with sides a,b,c' },
    diamond: { fn: diamond, params: ['n'], description: 'Symmetric hexagon (a=b=c=n)' },
    heart: { fn: heart, params: ['n'], description: 'Heart-shaped region' },
};

/**
 * Create a region from a name and size parameter
 */
export function createRegion(type, size, params = {}) {
    switch (type) {
        case 'hexagon':
            return hexagon(params.a || size, params.b || size, params.c || size);
        case 'diamond':
            return diamond(size);
        case 'heart':
            return heart(size);
        default:
            throw new Error(`Unknown region type: ${type}. Available: ${Object.keys(REGION_TYPES).join(', ')}`);
    }
}
