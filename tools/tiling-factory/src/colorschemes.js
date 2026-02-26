// Re-export colorschemes from main codebase
// The original file uses CommonJS module.exports, so we read and re-export for ESM

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the original colorschemes.js by evaluating it in a CommonJS-like context
const code = readFileSync(join(__dirname, '../../../js/colorschemes.js'), 'utf-8');

// Strip the window assignment and module.exports, extract the array
const match = code.match(/const ColorSchemes = (\[[\s\S]*?\]);/);
if (!match) throw new Error('Failed to parse colorschemes.js');

const ColorSchemes = eval(match[1]);

// Skull-specific color schemes
const SkullSchemes = [
    { name: 'Skull Bone', colors: ['#F5F4F2', '#D0CCC6', '#8A857E', '#A8A4A0'] },
    { name: 'Skull Neon', colors: ['#FF006E', '#8338EC', '#3A86FF', '#222222'] },
    { name: 'Skull Muertos', colors: ['#FF4081', '#FFD740', '#00E5FF', '#111111'] },
    { name: 'Skull Gothic', colors: ['#2D1B36', '#6B3FA0', '#C77DBA', '#1A0F20'] },
    { name: 'Skull Poison', colors: ['#0D1B0E', '#39FF14', '#00CC66', '#061208'] },
    { name: 'Skull Gilded', colors: ['#1A1A2E', '#C9A84C', '#F4E4BA', '#0F0F1C'] },
];
ColorSchemes.push(...SkullSchemes);

export default ColorSchemes;
export { SkullSchemes };

export function getScheme(name) {
    if (name === 'all') return ColorSchemes;
    const scheme = ColorSchemes.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (!scheme) throw new Error(`Unknown color scheme: "${name}". Available: ${ColorSchemes.map(s => s.name).join(', ')}`);
    return scheme;
}

export function listSchemes() {
    return ColorSchemes.map(s => s.name);
}
