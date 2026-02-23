#!/usr/bin/env node

/**
 * Tiling Factory CLI
 * Generate high-resolution lozenge tiling artwork for print-on-demand.
 *
 * Usage:
 *   node src/cli.js generate --region hexagon --size 12 --scheme UVA --output out.png
 *   node src/cli.js batch manifests/redbubble-poster.yaml
 *   node src/cli.js profile --avatar --cover
 *   node src/cli.js schemes                    # list all color schemes
 *   node src/cli.js grid --size 8 --output grid.png  # render all schemes
 */

import { program } from 'commander';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { createRegion, REGION_TYPES } from './regions.js';
import { sample, initWasm } from './sampler.js';
import { renderTilingPNG, renderTiling, renderSchemeGrid } from './renderer.js';
import { renderAvatarPNG, render3D } from './renderer-3d.js';
import { renderSVG } from './svg-renderer.js';
import { generateMetadata } from './metadata.js';
import { runBatch } from './batch.js';
import ColorSchemes, { getScheme, listSchemes } from './colorschemes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

program
    .name('tiling-factory')
    .description('Generate high-resolution lozenge tiling artwork')
    .version('1.0.0');

// --- generate command ---
program
    .command('generate')
    .description('Generate a single tiling design')
    .option('--region <type>', 'Region type: hexagon, diamond, heart', 'hexagon')
    .option('--size <n>', 'Region size parameter', parseInt, 10)
    .option('--sides <a,b,c>', 'Asymmetric hexagon sides (e.g. 5,30,5)')
    .option('--shape <path>', 'Load region from JSON shape file (from ultimate lozenge sim)')
    .option('--scheme <name>', 'Color scheme name', 'UVA')
    .option('--sampler <method>', 'Sampling method: cftp, glauber', 'cftp')
    .option('--q <bias>', 'q-bias for weighted sampling', parseFloat, 1.0)
    .option('--output-size <WxH>', 'Output dimensions', '4500x5400')
    .option('--format <fmt>', 'Output format: png, svg', 'png')
    .option('--outline <width>', 'Outline width in pixels', parseFloat, 0.5)
    .option('--output <path>', 'Output file path')
    .option('--render-3d', 'Use 3D isometric renderer')
    .option('--background <color>', 'Background color', '#FFFFFF')
    .option('--glauber-steps <n>', 'Steps for Glauber dynamics', parseInt, 10000)
    .option('--hole-height <n>', 'Hole winding height (for shapes with holes)', parseInt, 0)
    .option('--no-outline', 'Disable outlines')
    .action(async (opts) => {
        const [outW, outH] = opts.outputSize.split('x').map(Number);
        const scheme = getScheme(opts.scheme);

        // Build region — support shape file, asymmetric hexagon, or named region
        let triangles;
        let regionLabel;
        if (opts.shape) {
            const shapeData = JSON.parse(readFileSync(resolve(opts.shape), 'utf-8'));
            const arr = [];
            for (const t of shapeData.triangles) {
                arr.push(t.n, t.j, t.type);
            }
            triangles = new Int32Array(arr);
            regionLabel = `shape(${shapeData.triangles.length} triangles)`;
        } else if (opts.sides) {
            const [a, b, c] = opts.sides.split(',').map(Number);
            const { hexagon } = await import('./regions.js');
            triangles = hexagon(a, b, c);
            regionLabel = `hexagon(${a},${b},${c})`;
        } else {
            triangles = createRegion(opts.region, opts.size);
            regionLabel = `${opts.region}(${opts.size})`;
        }

        console.log(`Generating ${regionLabel} with ${scheme.name}...`);
        console.log(`  Region: ${triangles.length / 3} triangles`);

        const dimers = await sample(triangles, {
            method: opts.sampler,
            q: opts.q,
            glauberSteps: opts.glauberSteps,
            holeHeight: opts.holeHeight,
        });
        console.log(`  Sampled: ${dimers.length} dimers`);

        const meta = generateMetadata({
            region: opts.region,
            scheme: scheme.name,
            size: opts.size,
            qBias: opts.q,
        });

        const outputPath = opts.output || `output/${meta.filename}.${opts.format}`;
        const outputDir = dirname(resolve(outputPath));
        if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

        if (opts.format === 'svg') {
            const svg = renderSVG(dimers, scheme, {
                width: outW, height: outH,
                outlineWidth: opts.outline,
                backgroundColor: opts.background,
            });
            writeFileSync(outputPath, svg);
        } else if (opts.render3d) {
            const canvas = render3D(dimers, scheme, {
                width: outW, height: outH,
                outlineWidth: opts.outline,
                backgroundColor: opts.background,
            });
            writeFileSync(outputPath, canvas.toBuffer('image/png'));
        } else {
            const png = renderTilingPNG(dimers, scheme, {
                width: outW, height: outH,
                outlineWidth: opts.outline,
                backgroundColor: opts.background,
            });
            writeFileSync(outputPath, png);
        }

        // Write metadata
        const metaPath = outputPath.replace(/\.[^.]+$/, '.json');
        writeFileSync(metaPath, JSON.stringify(meta, null, 2));

        console.log(`  Saved: ${outputPath}`);
        console.log(`  Metadata: ${metaPath}`);
    });

// --- batch command ---
program
    .command('batch <manifest>')
    .description('Run batch generation from a YAML manifest')
    .option('--output-dir <dir>', 'Override output directory')
    .option('-q, --quiet', 'Suppress per-design output')
    .action(async (manifest, opts) => {
        await runBatch(resolve(manifest), {
            outputDir: opts.outputDir ? resolve(opts.outputDir) : undefined,
            verbose: !opts.quiet,
        });
    });

// --- profile command (avatar + cover) ---
program
    .command('profile')
    .description('Generate Redbubble profile assets (avatar + cover)')
    .option('--avatar', 'Generate avatar (400x400)')
    .option('--cover', 'Generate cover image (2400x600)')
    .option('--output-dir <dir>', 'Output directory', 'output/profile')
    .action(async (opts) => {
        const outputDir = resolve(opts.outputDir);
        if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

        const generateAvatar = opts.avatar || (!opts.avatar && !opts.cover);
        const generateCover = opts.cover || (!opts.avatar && !opts.cover);

        if (generateAvatar) {
            console.log('Generating avatar (400x400)...');
            const triangles = createRegion('hexagon', 8);
            const dimers = await sample(triangles, { method: 'cftp' });
            const png = renderAvatarPNG(dimers);
            const avatarPath = `${outputDir}/avatar.png`;
            writeFileSync(avatarPath, png);
            console.log(`  Saved: ${avatarPath}`);
        }

        if (generateCover) {
            console.log('Generating cover (2400x600) — cropping center of hex(80)...');
            const { createCanvas } = await import('canvas');
            const triangles = createRegion('hexagon', 80);
            const dimers = await sample(triangles, { method: 'cftp' });
            const scheme = getScheme('Albina');
            const bigCanvas = renderTiling(dimers, scheme, {
                width: 6000, height: 6000, padding: 0.02,
                outlineWidth: 0.15, outlineColor: '#00000015'
            });
            const coverCanvas = createCanvas(2400, 600);
            const ctx = coverCanvas.getContext('2d');
            const sx = (6000 - 2400) / 2, sy = (6000 - 600) / 2;
            ctx.drawImage(bigCanvas, sx, sy, 2400, 600, 0, 0, 2400, 600);
            const png = coverCanvas.toBuffer('image/png');
            const coverPath = `${outputDir}/cover.png`;
            writeFileSync(coverPath, png);
            console.log(`  Saved: ${coverPath}`);
        }
    });

// --- schemes command ---
program
    .command('schemes')
    .description('List all available color schemes')
    .action(() => {
        const names = listSchemes();
        console.log(`Available color schemes (${names.length}):`);
        names.forEach((n, i) => console.log(`  ${(i + 1).toString().padStart(2)}. ${n}`));
    });

// --- grid command ---
program
    .command('grid')
    .description('Generate a grid preview of all color schemes')
    .option('--size <n>', 'Hexagon size for preview', parseInt, 6)
    .option('--cell-size <px>', 'Cell size in pixels', parseInt, 400)
    .option('--cols <n>', 'Columns in grid', parseInt, 8)
    .option('--output <path>', 'Output file path', 'output/scheme-grid.png')
    .action(async (opts) => {
        console.log(`Generating scheme grid (hex size ${opts.size})...`);
        const triangles = createRegion('hexagon', opts.size);
        const dimers = await sample(triangles, { method: 'cftp' });

        const png = renderSchemeGrid(dimers, ColorSchemes, {
            cellSize: opts.cellSize,
            cols: opts.cols,
        });

        const outputPath = resolve(opts.output);
        const outputDir = dirname(outputPath);
        if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
        writeFileSync(outputPath, png);
        console.log(`  Saved: ${outputPath} (${ColorSchemes.length} schemes)`);
    });

program.parse();
