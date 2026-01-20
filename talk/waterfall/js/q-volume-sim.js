/**
 * Q-volume Slide Simulation
 * Five canvases showing q-weighted tilings
 */

function initQVolumeSim() {
    (async function() {
        'use strict';

        const canvases = [0,1,2,3,4].map(i => document.getElementById(`qvol-canvas-${i}`));
        const qInputs = [0,1,2,3,4].map(i => document.getElementById(`qvol-input-${i}`));
        const sampleBtn = document.getElementById('qvol-sample-btn');
        if (canvases.some(c => !c) || qInputs.some(i => !i)) return;

        function getQValues() {
            return qInputs.map(input => parseFloat(input.value) || 1.0);
        }

        // Wait for LozengeModule
        if (typeof LozengeModule === 'undefined') {
            console.error('LozengeModule not loaded');
            return;
        }

        // Create 5 separate WASM instances
        const wasms = await Promise.all([0,1,2,3,4].map(() => LozengeModule()));

        function setupWasm(wasm) {
            return {
                wasm,
                initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
                performGlauberSteps: wasm.cwrap('performGlauberSteps', 'number', ['number']),
                exportDimers: wasm.cwrap('exportDimers', 'number', []),
                freeString: wasm.cwrap('freeString', null, ['number']),
                setQBias: wasm.cwrap('setQBias', null, ['number']),
                setUseRandomSweeps: wasm.cwrap('setUseRandomSweeps', null, ['number']),
                initCFTP: wasm.cwrap('initCFTP', 'number', []),
                runCFTP: wasm.cwrap('runCFTP', 'number', []),
                getGridBounds: wasm.cwrap('getGridBounds', 'number', []),
                getCFTPMinGridData: wasm.cwrap('getCFTPMinGridData', 'number', []),
                getCFTPMaxGridData: wasm.cwrap('getCFTPMaxGridData', 'number', [])
            };
        }

        const sims = wasms.map(w => setupWasm(w));

        const colors = ['#E57200', '#232D4B', '#F9DCBF'];
        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);

        function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

        function getRightTriangleCentroid(n, j) {
            const v1 = getVertex(n, j), v2 = getVertex(n, j - 1), v3 = getVertex(n + 1, j - 1);
            return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
        }
        function getLeftTriangleCentroid(n, j) {
            const v1 = getVertex(n, j), v2 = getVertex(n + 1, j), v3 = getVertex(n + 1, j - 1);
            return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
        }

        function pointInPolygon(x, y, polygon) {
            if (polygon.length < 3) return false;
            let inside = false;
            for (let i = 0, pj = polygon.length - 1; i < polygon.length; pj = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[pj].x, yj = polygon[pj].y;
                if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }
            return inside;
        }

        function generateHexagonTriangles(a, b, c) {
            const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
            const sideLengths = [a, b, c, a, b, c];
            const boundary = [];
            let bn = 0, bj = 0;
            for (let dir = 0; dir < 6; dir++) {
                for (let step = 0; step < sideLengths[dir]; step++) {
                    boundary.push(getVertex(bn, bj));
                    bn += directions[dir][0];
                    bj += directions[dir][1];
                }
            }

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const v of boundary) {
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            }
            const searchMinN = Math.floor(minX) - 2;
            const searchMaxN = Math.ceil(maxX) + 2;
            const nRange = searchMaxN - searchMinN;
            const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
            const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

            const triangleArr = [];
            for (let n = searchMinN; n <= searchMaxN; n++) {
                for (let j = searchMinJ; j <= searchMaxJ; j++) {
                    const rc = getRightTriangleCentroid(n, j);
                    if (pointInPolygon(rc.x, rc.y, boundary)) {
                        triangleArr.push(n, j, 1);
                    }
                    const lc = getLeftTriangleCentroid(n, j);
                    if (pointInPolygon(lc.x, lc.y, boundary)) {
                        triangleArr.push(n, j, 2);
                    }
                }
            }
            return triangleArr;
        }

        const HEXAGON_SIZE = 20;

        function getTrianglesArray() {
            return generateHexagonTriangles(HEXAGON_SIZE, HEXAGON_SIZE, HEXAGON_SIZE);
        }

        function initSim(sim, triangles) {
            const dataPtr = sim.wasm._malloc(triangles.length * 4);
            for (let i = 0; i < triangles.length; i++) {
                sim.wasm.setValue(dataPtr + i * 4, triangles[i], 'i32');
            }
            const ptr = sim.initFromTriangles(dataPtr, triangles.length);
            sim.freeString(ptr);
            sim.wasm._free(dataPtr);
            sim.setUseRandomSweeps(1);
        }

        function runCFTP(sim) {
            const ptr = sim.runCFTP();
            sim.freeString(ptr);
        }

        function getDimers(sim) {
            const ptr = sim.exportDimers();
            const json = sim.wasm.UTF8ToString(ptr);
            sim.freeString(ptr);
            const parsed = JSON.parse(json);
            return parsed.dimers || [];
        }

        function drawTiling(canvas, dimers) {
            const ctx = canvas.getContext('2d');
            const w = canvas.width, h = canvas.height;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            if (!dimers || dimers.length === 0) return;

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const d of dimers) {
                const verts = getLozengeVerts(d);
                for (const v of verts) {
                    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
                }
            }

            const scale = Math.min(w / (maxY - minY), h / (maxX - minX)) * 0.9;
            const cx = w / 2;
            const cy = h / 2;
            const offsetX = (minY + maxY) / 2;
            const offsetY = (minX + maxX) / 2;

            for (const d of dimers) {
                const verts = getLozengeVerts(d);
                ctx.beginPath();
                ctx.moveTo(cx + (verts[0].y - offsetX) * scale, cy + (verts[0].x - offsetY) * scale);
                for (let i = 1; i < 4; i++) {
                    ctx.lineTo(cx + (verts[i].y - offsetX) * scale, cy + (verts[i].x - offsetY) * scale);
                }
                ctx.closePath();
                ctx.fillStyle = colors[d.t];
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        function getLozengeVerts(d) {
            const { bn, bj, t } = d;
            if (t === 0) return [getVertex(bn, bj), getVertex(bn+1, bj), getVertex(bn+1, bj-1), getVertex(bn, bj-1)];
            if (t === 1) return [getVertex(bn, bj), getVertex(bn+1, bj-1), getVertex(bn+1, bj-2), getVertex(bn, bj-1)];
            return [getVertex(bn-1, bj), getVertex(bn, bj), getVertex(bn+1, bj-1), getVertex(bn, bj-1)];
        }

        const triangles = getTrianglesArray();
        let sampling = false;
        let sampled = false;

        async function sampleAll() {
            if (sampling) return;
            sampling = true;
            sampled = true;

            const qValues = getQValues();

            for (let i = 0; i < qValues.length; i++) {
                const q = qValues[i];
                const sim = sims[i];

                const ctx = canvases[i].getContext('2d');
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, canvases[i].width, canvases[i].height);
                ctx.fillStyle = '#999';
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Sampling...', canvases[i].width/2, canvases[i].height/2);

                await new Promise(r => setTimeout(r, 50));

                initSim(sim, triangles);
                sim.setQBias(q);
                runCFTP(sim);
                drawTiling(canvases[i], getDimers(sim));

                await new Promise(r => setTimeout(r, 100));
            }

            sampling = false;
        }

        sampleBtn.addEventListener('click', sampleAll);

        function waitForSlideEngine() {
            if (window.slideEngine) {
                window.slideEngine.registerSimulation('q-volume', {
                    start() {},
                    pause() {},
                    onSlideEnter() { if (!sampled) sampleAll(); },
                    onSlideLeave() {}
                }, 0);
            } else {
                setTimeout(waitForSlideEngine, 50);
            }
        }
        waitForSlideEngine();
    })();
}

// Initialize when WASM is loaded
if (typeof LozengeModule !== 'undefined') {
    initQVolumeSim();
} else {
    window.addEventListener('wasm-loaded', initQVolumeSim, { once: true });
}
