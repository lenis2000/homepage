import { createRegion } from './src/regions.js';
import { sample } from './src/sampler.js';
import { renderTilingPNG } from './src/renderer.js';
import ColorSchemes from './src/colorschemes.js';
import { getLozengeVerts } from './src/geometry.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const dir = 'output/hearts';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

// --- Rainbow Pride gradient color functions ---

const PRIDE_STOPS = [
    { t: 0.00, h: 0 },    // red
    { t: 0.17, h: 30 },   // orange
    { t: 0.33, h: 55 },   // yellow
    { t: 0.50, h: 130 },  // green
    { t: 0.67, h: 220 },  // blue
    { t: 0.84, h: 275 },  // indigo
    { t: 1.00, h: 300 },  // violet
];

function prideHue(t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < PRIDE_STOPS.length; i++) {
        if (t <= PRIDE_STOPS[i].t) {
            const prev = PRIDE_STOPS[i - 1];
            const curr = PRIDE_STOPS[i];
            const frac = (t - prev.t) / (curr.t - prev.t);
            return prev.h + frac * (curr.h - prev.h);
        }
    }
    return 300;
}

const FACE_LIGHTNESS = [55, 42, 32];
const FACE_SATURATION = [92, 88, 82];

function rainbowColorFn(d, bbox) {
    const verts = getLozengeVerts(d);
    const cy = (verts[0].y + verts[1].y + verts[2].y + verts[3].y) / 4;
    const t = 1 - (cy - bbox.minY) / (bbox.maxY - bbox.minY);
    const h = prideHue(t);
    return `hsl(${h}, ${FACE_SATURATION[d.t]}%, ${FACE_LIGHTNESS[d.t]}%)`;
}

function rainbowVerticalColorFn(d, bbox) {
    const verts = getLozengeVerts(d);
    const cx = (verts[0].x + verts[1].x + verts[2].x + verts[3].x) / 4;
    const t = (cx - bbox.minX) / (bbox.maxX - bbox.minX);
    const h = prideHue(t);
    return `hsl(${h}, ${FACE_SATURATION[d.t]}%, ${FACE_LIGHTNESS[d.t]}%)`;
}

// --- Background color variants ---
const BACKGROUNDS = [
    { suffix: '',            bg: '#FFFFFF', label: 'White' },
    { suffix: '-transparent', bg: null,      label: 'Transparent' },
    { suffix: '-black',      bg: '#000000', label: 'Black' },
    { suffix: '-navy',       bg: '#1B2A4A', label: 'Navy' },
    { suffix: '-charcoal',   bg: '#36454F', label: 'Charcoal' },
    { suffix: '-cream',      bg: '#FAF0E6', label: 'Cream/Linen' },
    { suffix: '-olive',      bg: '#3C4A2B', label: 'Olive' },
    { suffix: '-burgundy',   bg: '#4A0E2E', label: 'Burgundy' },
];

// --- Designs ---
const designs = [
    {
        name: 'rainbow-pride',
        label: 'Rainbow Pride',
        colorFn: rainbowColorFn,
        scheme: null,
    },
    {
        name: 'rainbow-pride-vertical',
        label: 'Rainbow Pride Vertical',
        colorFn: rainbowVerticalColorFn,
        scheme: null,
    },
    {
        name: 'trans-pride',
        label: 'Trans Pride',
        colorFn: null,
        scheme: ColorSchemes.find(s => s.name === 'Trans Pride'),
        outlineColor: '#000000', outlineWidth: 1.5,
    },
    {
        name: 'bi-pride',
        label: 'Bi Pride',
        colorFn: null,
        scheme: ColorSchemes.find(s => s.name === 'Bi Pride'),
    },
];

let count = 0;
for (const design of designs) {
    // Sample ONCE per design, render on all backgrounds
    const triangles = createRegion('heart', 16);
    const dimers = await sample(triangles, { method: 'cftp' });

    for (const bg of BACKGROUNDS) {
        const opts = {
            width: 5000, height: 5000,
            outlineWidth: design.outlineWidth || 0.3,
            outlineColor: design.outlineColor || '#00000030',
            backgroundColor: bg.bg,
        };
        if (design.colorFn) opts.colorFn = design.colorFn;

        const scheme = design.scheme || { name: design.label, colors: ['#fff', '#fff', '#fff'] };
        const png = renderTilingPNG(dimers, scheme, opts);

        const fname = `heart-${design.name}${bg.suffix}.png`;
        writeFileSync(`${dir}/${fname}`, png);
        count++;
        process.stdout.write(`  [${count}] ${design.label} on ${bg.label}\n`);
    }
}
console.log(`\nDone — ${count} pride heart images generated!`);
