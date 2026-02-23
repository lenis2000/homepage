import { sample } from './src/sampler.js';
import { renderTilingPNG } from './src/renderer.js';
import ColorSchemes from './src/colorschemes.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const SKIP = new Set(['UVA','Harvard','MIT','Stanford','Yale','Princeton','Columbia',
    'Berkeley','Carnegie Mellon','Michigan','Cornell','Northwestern','Northeastern',
    'Duke','Notre Dame','The Ohio State','UCLA','IPAM','No Colors']);

const schemes = [
    'Albina', 'Cherry Blossom', 'Ocean Breeze', 'Escher',
    'Dracula', 'Nord', 'Monokai', 'Italy', 'Ukraine',
    'Tropical', 'Royal Purple', 'Emerald Dream', 'Midnight Sky', 'Coral Reef',
    'Sunset Glow', 'Arctic Frost', 'Lavender Fields', 'Rose Garden',
    'Amber Glow', 'Forest Calm', 'Solarized Dark', 'Sage Green',
];

const dir = 'output/impossible-triangle';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

// Load shape
const shapeData = JSON.parse(readFileSync('/Users/leo/Downloads/lozenge_shape_n6144_unif_WCXQ.json', 'utf-8'));
const arr = [];
for (const t of shapeData.triangles) arr.push(t.n, t.j, t.type);
const triangles = new Int32Array(arr);

let count = 0;
for (const name of schemes) {
    const scheme = ColorSchemes.find(s => s.name === name);
    if (!scheme || SKIP.has(name)) continue;

    // FRESH sample for each color
    const dimers = await sample(triangles, { method: 'cftp', holeHeight: 16 });

    const png = renderTilingPNG(dimers, scheme, {
        width: 5000, height: 5000, outlineWidth: 0.2, outlineColor: '#00000020'
    });
    const fname = name.toLowerCase().replace(/\s+/g, '-');
    writeFileSync(dir + '/penrose-' + fname + '.png', png);
    count++;
    process.stdout.write(`  [${count}] ${name}\n`);
}
console.log(`Done — ${count} impossible triangles, each with a unique tiling!`);
