(function() {
    'use strict';

    const SLIDE_ID = 'gamma-disorder';
    const STORAGE = (document.querySelector('meta[name="storage-url"]') || {}).content
        || 'https://storage.lpetrov.cc';

    const PARAMS = [
        { a: '0.2', b: '0.25', label: 'α = 0.2, β = 0.25' },
        { a: '0.5', b: '0.5', label: 'α = 0.5, β = 0.5' },
        { a: '1.0', b: '1.0', label: 'α = 1.0, β = 1.0' },
        { a: '2.0', b: '2.0', label: 'α = 2.0, β = 2.0' }
    ];

    // Preloaded images keyed by "a_b_type"
    const images = {};

    function preloadImages() {
        for (const p of PARAMS) {
            for (const type of ['annealed', 'quenched']) {
                const key = `${p.a}_${p.b}_${type}`;
                const img = new Image();
                img.src = STORAGE + `/img/talks/bpz_dd_gamma_a${p.a}_b${p.b}_${type}.png`;
                images[key] = img;
            }
        }
    }

    function drawToCanvas(canvasId, imgKey) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const img = images[imgKey];
        if (!img || !img.complete || !img.naturalWidth) {
            img.onload = function() { drawToCanvas(canvasId, imgKey); };
            return;
        }
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const s = Math.min(canvas.width / iw, canvas.height / ih);
        const x = (canvas.width - iw * s) / 2;
        const y = (canvas.height - ih * s) / 2;
        ctx.drawImage(img, x, y, iw * s, ih * s);
    }

    function showParams(idx) {
        const p = PARAMS[idx];
        const ap = document.getElementById('gd-annealed-params');
        const qp = document.getElementById('gd-quenched-params');
        if (ap) ap.textContent = p.label;
        if (qp) qp.textContent = p.label;
        drawToCanvas('gd-canvas-annealed', `${p.a}_${p.b}_annealed`);
        drawToCanvas('gd-canvas-quenched', `${p.a}_${p.b}_quenched`);
    }

    function tryInit() {
        if (!window.slideEngine) { setTimeout(tryInit, 100); return; }
        console.log('[gamma-disorder] registering simulation');
        window.slideEngine.registerSimulation(SLIDE_ID, {
            // step 1: show first params, steps 2-4: cycle through rest
            steps: 4,
            start() {},
            pause() {},

            onStep(step) {
                if (step >= 1 && step <= 4) {
                    const tiling = document.getElementById('gd-tiling');
                    const fluct = document.getElementById('gd-fluctuations');
                    if (tiling) tiling.style.display = 'none';
                    if (fluct) fluct.style.display = '';
                    showParams(step - 1);
                }
            },

            onStepBack(step) {
                if (step === 0) {
                    const tiling = document.getElementById('gd-tiling');
                    const fluct = document.getElementById('gd-fluctuations');
                    if (tiling) tiling.style.display = 'grid';
                    if (fluct) fluct.style.display = 'none';
                }
                if (step >= 1 && step <= 3) {
                    showParams(step - 1);
                }
            },

            onSlideEnter() {
                preloadImages();
                const tiling = document.getElementById('gd-tiling');
                const fluct = document.getElementById('gd-fluctuations');
                if (tiling) tiling.style.display = 'grid';
                if (fluct) fluct.style.display = 'none';
            },
            onSlideLeave() {}
        }, 0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
