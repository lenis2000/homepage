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

export default ColorSchemes;

export function getScheme(name) {
    if (name === 'all') return ColorSchemes;
    const scheme = ColorSchemes.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (!scheme) throw new Error(`Unknown color scheme: "${name}". Available: ${ColorSchemes.map(s => s.name).join(', ')}`);
    return scheme;
}

export function listSchemes() {
    return ColorSchemes.map(s => s.name);
}
