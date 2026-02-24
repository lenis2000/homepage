/**
 * 2D Flat Lozenge Renderer (node-canvas)
 * Renders a flat lozenge tiling to a Canvas, suitable for high-res PNG output.
 */

import { createCanvas } from 'canvas';
import { getLozengeVerts, dimerBoundingBox } from './geometry.js';

/**
 * Render a lozenge tiling to a canvas
 * @param {Array} dimers - Array of {bn, bj, wn, wj, t} dimer objects
 * @param {Object} colorScheme - {name, colors: [c0, c1, c2]}
 * @param {Object} options - Rendering options
 * @returns {Canvas} node-canvas Canvas object
 */
export function renderTiling(dimers, colorScheme, options = {}) {
    const {
        width = 4500,
        height = 5400,
        padding = 0.08,         // fraction of canvas size for padding
        outlineWidth = 0.5,     // outline width in pixels (0 = no outline)
        outlineColor = '#000000',
        backgroundColor = '#FFFFFF',
        antiAlias = true,
        colorFn = null,         // optional (dimer, bbox) => color string; overrides flat colors
    } = options;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background (null = transparent)
    if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
    }

    if (dimers.length === 0) return canvas;

    // Compute bounding box of the tiling in lattice coordinates
    const bbox = dimerBoundingBox(dimers);
    const tilingWidth = bbox.maxX - bbox.minX;
    const tilingHeight = bbox.maxY - bbox.minY;

    // Compute scale to fit tiling into canvas with padding
    const padX = width * padding;
    const padY = height * padding;
    const availW = width - 2 * padX;
    const availH = height - 2 * padY;
    const scale = Math.min(availW / tilingWidth, availH / tilingHeight);

    // Center the tiling
    const centerX = (bbox.minX + bbox.maxX) / 2;
    const centerY = (bbox.minY + bbox.maxY) / 2;
    const offsetX = width / 2 - centerX * scale;
    const offsetY = height / 2 + centerY * scale; // flip Y

    function toScreen(v) {
        return {
            x: v.x * scale + offsetX,
            y: -v.y * scale + offsetY
        };
    }

    const colors = colorScheme.colors;

    // Draw each lozenge
    for (const d of dimers) {
        const verts = getLozengeVerts(d);
        const screenVerts = verts.map(toScreen);

        ctx.beginPath();
        ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
        for (let i = 1; i < screenVerts.length; i++) {
            ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
        }
        ctx.closePath();

        // Fill with type color or gradient function
        ctx.fillStyle = colorFn ? colorFn(d, bbox) : colors[d.t];
        ctx.fill();

        // Outline
        if (outlineWidth > 0) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = outlineWidth;
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    }

    return canvas;
}

/**
 * Render a tiling and return a PNG buffer
 */
export function renderTilingPNG(dimers, colorScheme, options = {}) {
    const canvas = renderTiling(dimers, colorScheme, options);
    return canvas.toBuffer('image/png');
}

/**
 * Render a grid of all color schemes (preview image)
 */
export function renderSchemeGrid(dimers, schemes, options = {}) {
    const { cellSize = 400, cols = 8 } = options;
    const rows = Math.ceil(schemes.length / cols);
    const canvas = createCanvas(cellSize * cols, cellSize * rows);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < schemes.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const cell = renderTiling(dimers, schemes[i], {
            width: cellSize,
            height: cellSize,
            padding: 0.05,
            outlineWidth: 0.3,
        });
        ctx.drawImage(cell, col * cellSize, row * cellSize);

        // Label
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(schemes[i].name, col * cellSize + cellSize / 2, (row + 1) * cellSize - 5);
    }

    return canvas.toBuffer('image/png');
}
