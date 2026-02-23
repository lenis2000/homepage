/**
 * 3D-style Renderer for Lozenge Tilings
 * The flat 2D lozenge rendering IS the isometric 3D cube view —
 * type 0 = top face, type 1 = front face, type 2 = side face.
 * This module provides avatar/cover convenience wrappers with appropriate defaults.
 */

import { createCanvas } from 'canvas';
import { renderTiling } from './renderer.js';

const ALBINA = { name: 'Albina', colors: ['#47a290', '#ee5a4e', '#f7b948'] };

/**
 * Render the avatar: hexagonal tiling on clean white background (400x400)
 */
export function renderAvatar(dimers, options = {}) {
    const scheme = options.colorScheme || ALBINA;
    const canvas = renderTiling(dimers, scheme, {
        width: 400,
        height: 400,
        padding: 0.06,
        outlineWidth: 0.4,
        outlineColor: '#00000025',
        backgroundColor: '#FFFFFF',
        ...options,
    });

    // Add subtle drop shadow around the hexagon shape
    if (options.shadow !== false) {
        const shadowCanvas = createCanvas(400, 400);
        const ctx = shadowCanvas.getContext('2d');
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.drawImage(canvas, 0, 0);
        // Draw original on top (shadow only affects the composite)
        ctx.shadowColor = 'transparent';
        ctx.drawImage(canvas, 0, 0);
        return shadowCanvas;
    }

    return canvas;
}

/**
 * Render the avatar as a PNG buffer
 */
export function renderAvatarPNG(dimers, options = {}) {
    return renderAvatar(dimers, options).toBuffer('image/png');
}

/**
 * Re-export render3D as an alias for renderTiling (since they're equivalent)
 */
export { renderTiling as render3D } from './renderer.js';
