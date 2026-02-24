/**
 * Render all letter/number JSON files as small PNGs for visual inspection.
 * Uses CFTP sampling + flat Escher palette for clarity.
 */
import { sample } from './src/sampler.js';
import { renderTilingPNG } from './src/renderer.js';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const lettersDir = join(import.meta.dirname, '../../letters');
const outDir = join(import.meta.dirname, 'output/letters');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const scheme = { name: 'Albina', colors: ['#47a290', '#ee5a4e', '#f7b948', '#333333'] };

// Get all single-character JSON files (A-Z, 0-9)
const files = readdirSync(lettersDir)
    .filter(f => f.endsWith('.json') && (f.length === 6 || f.length === 7)) // X.json or XX.json (for numbers like 0-9)
    .filter(f => {
        const name = f.replace('.json', '');
        return /^[A-Z0-9]$/.test(name);
    })
    .sort();

console.log(`Found ${files.length} letter/number files: ${files.map(f => f.replace('.json', '')).join(' ')}`);

let count = 0;
for (const file of files) {
    const name = file.replace('.json', '');
    const data = JSON.parse(readFileSync(join(lettersDir, file), 'utf-8'));

    // Convert JSON triangles to Int32Array
    const triArr = [];
    for (const tri of data.triangles) {
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
        writeFileSync(join(outDir, `letter-${name}.png`), png);
        count++;
        process.stdout.write(`  [${count}] ${name} (${data.triangles.length} triangles)\n`);
    } catch (e) {
        process.stdout.write(`  [!] ${name} FAILED: ${e.message}\n`);
    }
}
console.log(`\nDone — ${count} letter/number images rendered to output/letters/`);
