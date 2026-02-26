/**
 * Batch Generation from YAML Manifests
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import yaml from 'js-yaml';
import { createRegion } from './regions.js';
import { sample, initWasm } from './sampler.js';
import { renderTilingPNG } from './renderer.js';
import { renderSVG } from './svg-renderer.js';
import { generateMetadata } from './metadata.js';
import ColorSchemes, { getScheme } from './colorschemes.js';

/**
 * Run a batch manifest
 * @param {string} manifestPath - Path to YAML manifest
 * @param {Object} options - Override options
 */
export async function runBatch(manifestPath, options = {}) {
    const manifest = yaml.load(readFileSync(manifestPath, 'utf-8'));
    const defaults = manifest.defaults || {};
    const outputDir = options.outputDir || join(dirname(manifestPath), '..', 'output');

    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    await initWasm();

    let totalGenerated = 0;

    for (const design of manifest.designs) {
        const name = design.name;
        const region = design.region || defaults.region || 'hexagon';
        const sizes = design.sizes || [design.size || 10];
        const format = design.format || defaults.format || 'png';
        const sampler = design.sampler || defaults.sampler || 'cftp';
        const outline = design.outline ?? defaults.outline ?? 0.5;
        const variationsPerCombo = design.variations_per_combo || 1;
        const qBiases = design.q_bias || [1.0];
        const product = design.product || 'poster';
        const shapePath = design.shape || defaults.shape || null;
        const holeRecipe = design.hole_recipe || defaults.hole_recipe || null;

        // Parse output size
        const outputSizeStr = design.output_size || defaults.output_size || '4500x5400';
        const [outW, outH] = outputSizeStr.split('x').map(Number);

        // Resolve color schemes
        let schemes;
        const schemeSpec = design.schemes || ['UVA'];
        if (schemeSpec.length === 1 && schemeSpec[0] === 'all') {
            schemes = ColorSchemes;
        } else {
            schemes = schemeSpec.map(s => getScheme(s));
        }

        const designDir = join(outputDir, name);
        if (!existsSync(designDir)) mkdirSync(designDir, { recursive: true });

        console.log(`\n--- Design: ${name} ---`);
        console.log(`  Region: ${region}, Sizes: ${sizes}, Schemes: ${schemes.length}, q-biases: ${qBiases.length}`);
        console.log(`  Variations per combo: ${variationsPerCombo}`);

        for (const size of sizes) {
            for (const scheme of schemes) {
                for (const q of qBiases) {
                    for (let v = 1; v <= variationsPerCombo; v++) {
                        const meta = generateMetadata({
                            region, scheme: scheme.name, size, product,
                            qBias: q, variation: v,
                        });

                        let triangles;
                        if (shapePath) {
                            const shapeData = JSON.parse(readFileSync(resolve(dirname(manifestPath), shapePath), 'utf-8'));
                            const arr = [];
                            for (const t of shapeData.triangles) arr.push(t.n, t.j, t.type);
                            triangles = new Int32Array(arr);
                        } else {
                            triangles = createRegion(region, size);
                        }

                        try {
                            const dimers = await sample(triangles, { method: sampler, q, holeRecipe });

                            if (format === 'svg') {
                                const svg = renderSVG(dimers, scheme, {
                                    width: outW, height: outH,
                                    outlineWidth: outline,
                                });
                                const svgPath = join(designDir, `${meta.filename}.svg`);
                                writeFileSync(svgPath, svg);
                            } else {
                                const png = renderTilingPNG(dimers, scheme, {
                                    width: outW, height: outH,
                                    outlineWidth: outline,
                                });
                                const pngPath = join(designDir, `${meta.filename}.png`);
                                writeFileSync(pngPath, png);
                            }

                            // Write metadata JSON
                            const metaPath = join(designDir, `${meta.filename}.json`);
                            writeFileSync(metaPath, JSON.stringify(meta, null, 2));

                            totalGenerated++;
                            if (options.verbose !== false) {
                                process.stdout.write(`  [${totalGenerated}] ${meta.filename}\r`);
                            }
                        } catch (err) {
                            console.error(`  Error: ${meta.filename}: ${err.message}`);
                        }
                    }
                }
            }
        }
    }

    console.log(`\nBatch complete: ${totalGenerated} designs generated in ${outputDir}`);
    return totalGenerated;
}
