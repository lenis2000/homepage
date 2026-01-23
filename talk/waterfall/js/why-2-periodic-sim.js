/**
 * Why 2-Periodic slide - Sample N=8, T=16, S=8 waterfall with q=0.5 and show in 2D
 * Shows N non-intersecting paths on a simple rectangular grid
 */

(function() {
    'use strict';

    const slideId = 'why-2-periodic';

    // Parameters
    const N_param = 8;
    const T_param = 16;
    const S_target = 8;
    const Q_VALUE = 0.5;
    const KAPPA = 3.0;

    // UVA Colors
    const pathColors = [
        '#E57200', '#232D4B', '#E57200', '#232D4B',
        '#E57200', '#232D4B', '#E57200', '#232D4B'
    ];  // Alternating orange and blue
    const gridColor = '#dddddd';
    const borderColor = '#000000';
    const backgroundColor = '#ffffff';

    let canvas = null;
    let ctx = null;
    let paths = null;
    let S_param = 0;

    // WASM interface
    let wasmReady = false;
    const wasmInterface = {
        ready: false,

        initialize() {
            if (typeof Module === 'undefined' || typeof Module.cwrap !== 'function') {
                return false;
            }
            this.initializeTiling = Module.cwrap('initializeTiling', 'number', ['number', 'number', 'number', 'number', 'number'], {async: true});
            this.performSOperator = Module.cwrap('performSOperator', 'number', [], {async: true});
            this.exportPaths = Module.cwrap('exportPaths', 'number', [], {async: true});
            this.setImaginaryQ = Module.cwrap('setImaginaryQ', null, ['number']);
            this.freeString = Module.cwrap('freeString', null, ['number']);
            this.ready = true;
            return true;
        },

        async refreshPaths() {
            try {
                const ptr = await this.exportPaths();
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    this.freeString(ptr);
                    const result = JSON.parse(jsonStr);
                    return result.paths;
                }
            } catch (e) { console.error('Export paths failed:', e); }
            return [];
        }
    };

    let wasmInitAttempts = 0;
    function tryInitWasm() {
        wasmInitAttempts++;
        if (typeof Module !== 'undefined' && typeof Module.cwrap === 'function') {
            if (wasmInterface.initialize()) {
                wasmReady = true;
            }
        } else if (wasmInitAttempts < 100) {
            setTimeout(tryInitWasm, 100);
        }
    }
    tryInitWasm();

    // Convert raw paths to coordinate sequences
    function pathsToCoords(rawPaths) {
        const coordsList = [];

        for (let i = 0; i < rawPaths.length; i++) {
            const pathCopy = rawPaths[i].slice().reverse();
            const firstElement = pathCopy[0];
            const adjustedPath = pathCopy.map(val => firstElement - val);

            const coords = [];
            let x = 0, y = 0;
            coords.push([x, y]);

            for (let j = 1; j < adjustedPath.length; j++) {
                const prev = adjustedPath[j - 1];
                const curr = adjustedPath[j];

                if (curr === prev + 1) {
                    x++;  // Right step
                } else if (curr === prev) {
                    y++;  // Up step
                }
                coords.push([x, y]);
            }
            coordsList.push(coords);
        }

        return coordsList;
    }

    function drawPaths() {
        if (!ctx || !paths || paths.length === 0) return;

        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, w, h);

        const coordsList = pathsToCoords(paths);
        if (coordsList.length === 0) return;

        const N = coordsList.length;

        // Grid dimensions: (T-S) x S = 8 x 8
        const gridW = T_param - S_param;
        const gridH = S_param;

        // Calculate scaling with padding
        const padding = 40;
        const availW = w - 2 * padding;
        const availH = h - 2 * padding;
        const step = Math.min(availW / gridW, availH / gridH);
        const actualW = gridW * step;
        const actualH = gridH * step;
        const baseX = (w - actualW) / 2;
        const baseY = (h - actualH) / 2;

        // Draw grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (let i = 0; i <= gridW; i++) {
            ctx.beginPath();
            ctx.moveTo(baseX + i * step, baseY);
            ctx.lineTo(baseX + i * step, baseY + actualH);
            ctx.stroke();
        }
        for (let j = 0; j <= gridH; j++) {
            ctx.beginPath();
            ctx.moveTo(baseX, baseY + actualH - j * step);
            ctx.lineTo(baseX + actualW, baseY + actualH - j * step);
            ctx.stroke();
        }

        // Draw paths (from top path to bottom, so higher z paths are drawn last/on top)
        for (let pathIdx = N - 1; pathIdx >= 0; pathIdx--) {
            const coords = coordsList[pathIdx];
            if (coords.length === 0) continue;

            const color = pathColors[pathIdx % pathColors.length];

            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            const [startX, startY] = coords[0];
            ctx.moveTo(baseX + startX * step, baseY + actualH - startY * step);

            for (let i = 1; i < coords.length; i++) {
                const [x, y] = coords[i];
                ctx.lineTo(baseX + x * step, baseY + actualH - y * step);
            }
            ctx.stroke();
        }

        // Draw border around grid
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(baseX, baseY, actualW, actualH);
    }

    async function sampleTiling() {
        if (!wasmReady) return;

        wasmInterface.setImaginaryQ(Q_VALUE);

        const kappasq = KAPPA * KAPPA;
        const ptr = await wasmInterface.initializeTiling(N_param, T_param, 0, 7, -kappasq);
        if (ptr) {
            const jsonStr = Module.UTF8ToString(ptr);
            wasmInterface.freeString(ptr);
            const result = JSON.parse(jsonStr);
            S_param = result.s || 0;
        }

        paths = await wasmInterface.refreshPaths();

        while (S_param < S_target) {
            wasmInterface.setImaginaryQ(Q_VALUE);
            const sPtr = await wasmInterface.performSOperator();
            if (sPtr) {
                const jsonStr = Module.UTF8ToString(sPtr);
                wasmInterface.freeString(sPtr);
                const result = JSON.parse(jsonStr);
                S_param = result.s;
                paths = await wasmInterface.refreshPaths();
            } else {
                break;
            }
        }

        drawPaths();
    }

    function init() {
        canvas = document.getElementById('why-2p-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sampling...', canvas.width / 2, canvas.height / 2);

        setTimeout(() => {
            if (wasmReady) {
                sampleTiling();
            } else {
                const checkWasm = setInterval(() => {
                    if (wasmReady) {
                        clearInterval(checkWasm);
                        sampleTiling();
                    }
                }, 100);
            }
        }, 100);
    }

    function reset() {
        paths = null;
        S_param = 0;
    }

    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() {},
                pause() {},
                onSlideEnter() {
                    reset();
                    init();
                },
                onSlideLeave() {
                    reset();
                }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
