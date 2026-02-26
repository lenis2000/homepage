/**
 * WASM Sampler Wrapper
 * Wraps the lozenge tiling WASM module for Node.js usage.
 */

import LozengeModule from './wasm/lozenge.mjs';

let moduleInstance = null;
let wasmFns = null;

/**
 * Initialize the WASM module (call once)
 */
export async function initWasm() {
    if (moduleInstance) return;

    moduleInstance = await LozengeModule();

    wasmFns = {
        seedRng: moduleInstance.cwrap('seedRng', null, ['number', 'number']),
        initFromTriangles: moduleInstance.cwrap('initFromTriangles', 'number', ['number', 'number']),
        performGlauberSteps: moduleInstance.cwrap('performGlauberSteps', 'number', ['number']),
        exportDimers: moduleInstance.cwrap('exportDimers', 'number', []),
        runCFTP: moduleInstance.cwrap('runCFTP', 'number', []),
        initCFTP: moduleInstance.cwrap('initCFTP', 'number', []),
        stepCFTP: moduleInstance.cwrap('stepCFTP', 'number', []),
        finalizeCFTP: moduleInstance.cwrap('finalizeCFTP', 'number', []),
        setQBias: moduleInstance.cwrap('setQBias', null, ['number']),
        getQBias: moduleInstance.cwrap('getQBias', 'number', []),
        setUseRandomSweeps: moduleInstance.cwrap('setUseRandomSweeps', null, ['number']),
        repairRegion: moduleInstance.cwrap('repairRegion', 'number', []),
        freeString: moduleInstance.cwrap('freeString', null, ['number']),
        getTotalSteps: moduleInstance.cwrap('getTotalSteps', 'number', []),
        getFlipCount: moduleInstance.cwrap('getFlipCount', 'number', []),
        getAcceptRate: moduleInstance.cwrap('getAcceptRate', 'number', []),
        getHoleCount: moduleInstance.cwrap('getHoleCount', 'number', []),
        getAllHolesInfo: moduleInstance.cwrap('getAllHolesInfo', 'number', []),
        adjustHoleWinding: moduleInstance.cwrap('adjustHoleWindingExport', 'number', ['number', 'number']),
        setHoleBaseHeight: moduleInstance.cwrap('setHoleBaseHeight', 'number', ['number', 'number']),
        recomputeHoleInfo: moduleInstance.cwrap('recomputeHoleInfo', null, []),
    };
}

function ensureWasm() {
    if (!moduleInstance || !wasmFns) throw new Error('WASM not initialized. Call initWasm() first.');
}

/**
 * Initialize a tiling region from triangle data
 * @param {Int32Array} triangles - Flat array [n1, j1, type1, ...]
 * @returns {string} Status message from WASM
 */
export function initRegion(triangles) {
    ensureWasm();
    const count = triangles.length;
    const ptr = moduleInstance._malloc(count * 4);
    for (let i = 0; i < count; i++) {
        moduleInstance.setValue(ptr + i * 4, triangles[i], 'i32');
    }
    const resultPtr = wasmFns.initFromTriangles(ptr, count);
    const result = moduleInstance.UTF8ToString(resultPtr);
    wasmFns.freeString(resultPtr);
    moduleInstance._free(ptr);
    return result;
}

/**
 * Set the q-bias for weighted sampling
 */
export function setQBias(q) {
    ensureWasm();
    wasmFns.setQBias(q);
}

/**
 * Get number of detected holes in the region
 */
export function getHoleCount() {
    ensureWasm();
    return wasmFns.getHoleCount();
}

/**
 * Get info about all detected holes
 */
export function getAllHolesInfo() {
    ensureWasm();
    const ptr = wasmFns.getAllHolesInfo();
    const json = moduleInstance.UTF8ToString(ptr);
    wasmFns.freeString(ptr);
    return JSON.parse(json);
}

/**
 * Adjust hole winding number (height constraint)
 * This is how hole heights are set — call after initRegion, before sampling.
 * @param {number} holeIdx - hole index (0-based)
 * @param {number} delta - height delta to apply
 */
export function adjustHoleWinding(holeIdx, delta) {
    ensureWasm();
    const ptr = wasmFns.adjustHoleWinding(holeIdx, delta);
    const json = moduleInstance.UTF8ToString(ptr);
    wasmFns.freeString(ptr);
    return JSON.parse(json);
}

/**
 * Run CFTP exact sampling
 * @returns {string} Status or error message
 */
export function runCFTP() {
    ensureWasm();
    const resultPtr = wasmFns.runCFTP();
    const result = moduleInstance.UTF8ToString(resultPtr);
    wasmFns.freeString(resultPtr);
    return result;
}

/**
 * Run Glauber dynamics for the given number of steps
 */
export function runGlauber(steps) {
    ensureWasm();
    wasmFns.setUseRandomSweeps(1);
    wasmFns.performGlauberSteps(steps);
}

/**
 * Export the current dimer configuration
 * @returns {Array} Array of dimer objects {bn, bj, wn, wj, t}
 */
export function exportDimers() {
    ensureWasm();
    const resultPtr = wasmFns.exportDimers();
    const json = moduleInstance.UTF8ToString(resultPtr);
    wasmFns.freeString(resultPtr);
    const data = JSON.parse(json);
    // exportDimers returns {boundaries, segments, dimers, black, white}
    return data.dimers || data;
}

/**
 * Sample a tiling from a region
 * @param {Int32Array} triangles - Region definition
 * @param {Object} options - Sampling options
 * @returns {Array} Array of dimer objects
 */
export async function sample(triangles, options = {}) {
    const { method = 'cftp', q = 1.0, glauberSteps = 10000, holeHeight = 0, holeRecipe = null } = options;

    await initWasm();

    // Save RNG state by advancing it first, then reinit region (which resets RNG), then re-seed
    const savedSeed = (Date.now() & 0xFFFFFFFF) ^ (Math.random() * 0xFFFFFFFF >>> 0);
    const savedSeedHi = (Math.random() * 0xFFFFFFFF >>> 0);

    const initResult = initRegion(triangles);
    if (initResult.startsWith('Error')) {
        throw new Error(`Region init failed: ${initResult}`);
    }

    // Re-seed after initRegion (which resets RNG to deterministic state)
    moduleInstance._seedRng(savedSeed, savedSeedHi);

    // Set uniform hole height constraint before sampling (if no recipe)
    if (!holeRecipe && holeHeight !== 0) {
        const holeCount = getHoleCount();
        if (holeCount > 0) {
            console.log(`  Holes detected: ${holeCount}, setting height=${holeHeight}`);
            for (let h = 0; h < holeCount; h++) {
                const result = adjustHoleWinding(h, holeHeight);
                if (!result.success) {
                    console.warn(`  Warning: hole ${h} winding adjustment failed`);
                }
            }
        }
    }

    if (q !== 1.0) {
        setQBias(q);
    }

    // Apply hole recipe BEFORE CFTP as winding constraints
    // (applying after CFTP would use Dinic's rebuild which erases randomness)
    if (holeRecipe && holeRecipe.length > 0) {
        const holeCount = getHoleCount();
        console.log(`  Holes detected: ${holeCount}, applying ${holeRecipe.length} recipe steps as constraints`);
        let ok = 0, fail = 0;
        for (const step of holeRecipe) {
            const result = adjustHoleWinding(step.hole, step.delta);
            if (result.success) ok++; else fail++;
        }
        console.log(`  Constraints: ${ok} succeeded, ${fail} failed`);
    }

    if (method === 'cftp') {
        const cftpResult = runCFTP();
        if (cftpResult.startsWith('Error')) {
            throw new Error(`CFTP failed: ${cftpResult}`);
        }
    } else if (method === 'glauber') {
        runGlauber(glauberSteps);
    }

    return exportDimers();
}
