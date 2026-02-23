/**
 * SVG Renderer for Lozenge Tilings
 * Outputs SVG files suitable for Spoonflower fabric prints.
 */

import { getLozengeVerts, dimerBoundingBox } from './geometry.js';

/**
 * Render a lozenge tiling as an SVG string
 */
export function renderSVG(dimers, colorScheme, options = {}) {
    const {
        width = 3600,
        height = 3600,
        padding = 0.05,
        outlineWidth = 0.5,
        outlineColor = '#000000',
        backgroundColor = '#FFFFFF',
    } = options;

    if (dimers.length === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${backgroundColor}"/></svg>`;
    }

    const bbox = dimerBoundingBox(dimers);
    const tilingW = bbox.maxX - bbox.minX;
    const tilingH = bbox.maxY - bbox.minY;
    const padX = width * padding;
    const padY = height * padding;
    const scale = Math.min((width - 2 * padX) / tilingW, (height - 2 * padY) / tilingH);
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    const ox = width / 2 - cx * scale;
    const oy = height / 2 + cy * scale;

    function toScreen(v) {
        return `${(v.x * scale + ox).toFixed(2)},${(-v.y * scale + oy).toFixed(2)}`;
    }

    const colors = colorScheme.colors;
    let polygons = '';

    for (const d of dimers) {
        const verts = getLozengeVerts(d);
        const points = verts.map(toScreen).join(' ');
        const strokeAttr = outlineWidth > 0
            ? `stroke="${outlineColor}" stroke-width="${outlineWidth}" stroke-linejoin="round"`
            : 'stroke="none"';
        polygons += `  <polygon points="${points}" fill="${colors[d.t]}" ${strokeAttr}/>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
${polygons}</svg>`;
}
