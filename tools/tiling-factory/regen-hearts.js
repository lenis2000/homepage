import { createRegion } from './src/regions.js';
import { sample } from './src/sampler.js';
import { renderTilingPNG } from './src/renderer.js';
import ColorSchemes from './src/colorschemes.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const SKIP = new Set(['UVA','Harvard','MIT','Stanford','Yale','Princeton','Columbia',
    'Berkeley','Carnegie Mellon','Michigan','Cornell','Northwestern','Northeastern',
    'Duke','Notre Dame','The Ohio State','UCLA','IPAM','No Colors']);

const heartSchemes = [
    'Albina', 'Cherry Blossom', 'Ocean Breeze', 'Sunset Glow',
    'Royal Purple', 'Tropical', 'Emerald Dream', 'Cosmic Blue', 'Autumn Leaves',
    'Coral Reef', 'Rose Garden', 'Arctic Frost', 'Lavender Fields', 'Midnight Sky',
    'Dracula', 'Nord', 'Escher', 'Italy', 'Ukraine',
    'Amber Glow', 'Steel Blue', 'Sage Green', 'Desert Sand',
    'Forest Calm', 'Monokai', 'Solarized Dark',
];

const dir = 'output/hearts';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

let count = 0;
for (const name of heartSchemes) {
    const scheme = ColorSchemes.find(s => s.name === name);
    if (!scheme || SKIP.has(name)) continue;

    // FRESH sample for each color — every design is unique
    const triangles = createRegion('heart', 16);
    const dimers = await sample(triangles, { method: 'cftp' });

    const png = renderTilingPNG(dimers, scheme, {
        width: 5000, height: 5000, outlineWidth: 0.3, outlineColor: '#00000030'
    });
    const fname = name.toLowerCase().replace(/\s+/g, '-');
    writeFileSync(dir + '/heart-' + fname + '.png', png);
    count++;
    process.stdout.write(`  [${count}] ${name}\n`);
}
console.log(`Done — ${count} hearts, each with a unique tiling!`);
