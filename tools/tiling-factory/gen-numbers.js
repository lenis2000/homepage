/**
 * Generate number (0-9) letter JSON files using building blocks.
 * Coordinate system: (n, j) on the triangular lattice.
 * Each "cell" is a pair of type 1 + type 2 triangles at (n, j).
 *
 * Design reference: C letter uses n=-9..-4, j=2..8 (6 wide, 7 tall).
 * We'll use similar dimensions, centered around n=-7, j=5.
 *
 * On the isometric grid, a "horizontal" line requires j to decrease by 1
 * for every 2 n-steps (since y = n/sqrt(3) + j * 2/sqrt(3)).
 * A "vertical" line is constant n, varying j.
 */
import { sample } from './src/sampler.js';
import { renderTilingPNG } from './src/renderer.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const lettersDir = join(import.meta.dirname, '../../letters');
const outDir = join(import.meta.dirname, 'output/letters');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const scheme = { name: 'Albina', colors: ['#47a290', '#ee5a4e', '#f7b948', '#333333'] };

// --- Building blocks ---

/** Fill a rectangular block of cells */
function rect(n1, j1, n2, j2) {
    const tris = [];
    for (let n = Math.min(n1,n2); n <= Math.max(n1,n2); n++) {
        for (let j = Math.min(j1,j2); j <= Math.max(j1,j2); j++) {
            tris.push({ n, j, type: 1 });
            tris.push({ n, j, type: 2 });
        }
    }
    return tris;
}

/** Diagonal line: from (n1,j1), step (dn,dj) for count steps */
function diag(n1, j1, dn, dj, count) {
    const tris = [];
    for (let s = 0; s < count; s++) {
        const n = n1 + s * dn;
        const j = j1 + s * dj;
        tris.push({ n, j, type: 1 });
        tris.push({ n, j, type: 2 });
    }
    return tris;
}

/** Merge triangle lists, deduplicate */
function merge(...lists) {
    const seen = new Set();
    const result = [];
    for (const list of lists) {
        for (const t of list) {
            const key = `${t.n},${t.j},${t.type}`;
            if (!seen.has(key)) {
                seen.add(key);
                result.push(t);
            }
        }
    }
    return result;
}

/** Remove cells from a list */
function subtract(base, remove) {
    const removeSet = new Set();
    for (const t of remove) {
        removeSet.add(`${t.n},${t.j},${t.type}`);
    }
    return base.filter(t => !removeSet.has(`${t.n},${t.j},${t.type}`));
}

/** Make JSON object */
function makeJSON(tris) {
    return { version: 1, triangles: tris.map(t => ({ n: t.n, j: t.j, type: t.type })) };
}

// --- Number designs ---
// Using coordinate range: n = -9..-4 (width 6), j adjusted per number
// Matching C/G scale (~46-66 triangles)

// 0: Copy O letter (known good)
// Actually, O already looks good. Let me just copy it.
function num0() {
    // Based on O which is already good - read it
    const oData = JSON.parse(readFileSync(join(lettersDir, 'O.json'), 'utf-8'));
    return oData.triangles;
}

// 1: Simple vertical bar with small flag
function num1() {
    // Thin center column
    return merge(
        rect(-7, 3, -6, 8),  // main stem
        diag(-8, 8, 0, 1, 1), // small top-left flag
    );
}

// 2: Top curve + diagonal + bottom bar
function num2() {
    return merge(
        rect(-9, 7, -5, 8),   // top bar
        rect(-5, 5, -4, 8),   // top-right column
        rect(-9, 2, -5, 3),   // bottom bar
        rect(-9, 2, -8, 5),   // bottom-left column
        diag(-7, 5, -1, -1, 2), // diagonal connecting middle
        rect(-6, 4, -6, 5),   // fill diagonal gap
    );
}

// 3: Two bumps on right, open left
function num3() {
    return merge(
        rect(-9, 7, -5, 8),   // top bar
        rect(-9, 2, -5, 3),   // bottom bar
        rect(-7, 5, -5, 5),   // middle bar
        rect(-5, 2, -4, 8),   // right column full height
    );
}

// 4: Left column top + crossbar + right column full
function num4() {
    return merge(
        rect(-9, 5, -8, 8),   // left column (top half only)
        rect(-9, 5, -5, 5),   // horizontal crossbar
        rect(-5, 2, -4, 8),   // right column full height
    );
}

// 5: Like 2 mirrored - top bar + left + middle + right bottom + bottom bar
function num5() {
    return merge(
        rect(-9, 7, -5, 8),   // top bar
        rect(-9, 5, -8, 8),   // top-left column
        rect(-9, 5, -5, 5),   // middle bar
        rect(-5, 2, -4, 5),   // bottom-right column
        rect(-9, 2, -5, 3),   // bottom bar
    );
}

// 6: Like C but with bottom loop closed + middle bar
function num6() {
    return merge(
        rect(-9, 7, -5, 8),   // top bar
        rect(-9, 2, -8, 8),   // left column full height
        rect(-9, 2, -5, 3),   // bottom bar
        rect(-5, 2, -4, 5),   // right column bottom half
        rect(-7, 5, -5, 5),   // middle bar
    );
}

// 7: Top bar + right descending column
function num7() {
    return merge(
        rect(-9, 7, -5, 8),   // top bar
        rect(-5, 2, -4, 8),   // right column
    );
}

// 8: 0 with middle bar (two stacked loops)
function num8() {
    return merge(
        rect(-9, 7, -5, 8),   // top bar
        rect(-9, 2, -5, 3),   // bottom bar
        rect(-9, 2, -8, 8),   // left column
        rect(-5, 2, -4, 8),   // right column
        rect(-7, 5, -5, 5),   // middle bar
    );
}

// 9: Mirror of 6 - top loop + right column + bottom bar
function num9() {
    return merge(
        rect(-9, 7, -5, 8),   // top bar
        rect(-9, 5, -8, 8),   // left column top half
        rect(-7, 5, -5, 5),   // middle bar
        rect(-5, 2, -4, 8),   // right column full height
        rect(-9, 2, -5, 3),   // bottom bar
    );
}

// --- Generate all numbers ---
const numbers = {
    '0': num0,
    '1': num1,
    '2': num2,
    '3': num3,
    '4': num4,
    '5': num5,
    '6': num6,
    '7': num7,
    '8': num8,
    '9': num9,
};

let count = 0;
for (const [digit, genFn] of Object.entries(numbers)) {
    const tris = genFn();
    const json = makeJSON(tris);

    // Save JSON
    writeFileSync(join(lettersDir, `${digit}.json`), JSON.stringify(json, null, 2));

    // Convert to Int32Array for CFTP
    const triArr = [];
    for (const tri of tris) {
        triArr.push(tri.n, tri.j, tri.type);
    }
    const triangles = new Int32Array(triArr);

    try {
        const dimers = await sample(triangles, { method: 'cftp' });
        const png = renderTilingPNG(dimers, scheme, {
            width: 800, height: 800,
            outlineWidth: 1.0, outlineColor: '#00000060',
            padding: 0.12,
        });
        writeFileSync(join(outDir, `letter-${digit}.png`), png);
        count++;
        process.stdout.write(`  [${count}] ${digit} (${tris.length} triangles) OK\n`);
    } catch (e) {
        process.stdout.write(`  [!] ${digit} FAILED: ${e.message}\n`);
    }
}
console.log(`\nDone — ${count}/10 numbers generated.`);
