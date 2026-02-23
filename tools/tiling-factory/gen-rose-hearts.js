import { createRegion } from './src/regions.js';
import { sample } from './src/sampler.js';
import { renderTilingPNG } from './src/renderer.js';
import ColorSchemes from './src/colorschemes.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const roseSchemes = [
    'Dusty Rose', 'Blush Pink', 'Rosewood', 'Pink Champagne', 'Valentina',
];

const dir = 'output/hearts';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

let count = 0;
for (const name of roseSchemes) {
    const scheme = ColorSchemes.find(s => s.name === name);
    if (!scheme) { console.error(`Scheme not found: ${name}`); continue; }

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
console.log(`Done — ${count} rose hearts, each with a unique tiling!`);
