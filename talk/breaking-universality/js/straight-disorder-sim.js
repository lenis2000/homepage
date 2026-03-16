(function() {
    'use strict';

    const SLIDE_ID = 'straight-disorder';
    const STORAGE = (document.querySelector('meta[name="storage-url"]') || {}).content
        || 'https://storage.lpetrov.cc';

    function setupCanvasPanZoom(canvasId, imgUrl) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');

        const state = { zoom: 1, panX: 0, panY: 0 };
        let img = null;
        let dragging = false, lastX = 0, lastY = 0;

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!img || !img.complete) return;
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;
            const baseScale = Math.max(canvas.width / iw, canvas.height / ih);
            const s = baseScale * state.zoom;
            const x = state.panX + (canvas.width - iw * baseScale) / 2;
            const y = state.panY + (canvas.height - ih * baseScale) / 2;
            ctx.drawImage(img, x, y, iw * s, ih * s);
        }

        canvas.addEventListener('wheel', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const my = (e.clientY - rect.top) * (canvas.height / rect.height);
            const factor = e.deltaY < 0 ? 1.04 : 1 / 1.04;
            state.panX = mx - (mx - state.panX) * factor;
            state.panY = my - (my - state.panY) * factor;
            state.zoom *= factor;
            draw();
            console.log(`[${canvasId}] zoom: ${state.zoom.toFixed(3)}, panX: ${state.panX.toFixed(1)}, panY: ${state.panY.toFixed(1)}`);
        }, { passive: false });

        canvas.addEventListener('mousedown', function(e) {
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        });

        window.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            const rect = canvas.getBoundingClientRect();
            state.panX += (e.clientX - lastX) * (canvas.width / rect.width);
            state.panY += (e.clientY - lastY) * (canvas.height / rect.height);
            lastX = e.clientX;
            lastY = e.clientX;
            lastY = e.clientY;
            draw();
            console.log(`[${canvasId} drag] zoom: ${state.zoom.toFixed(3)}, panX: ${state.panX.toFixed(1)}, panY: ${state.panY.toFixed(1)}`);
        });

        window.addEventListener('mouseup', function() {
            if (!dragging) return;
            dragging = false;
            canvas.style.cursor = 'grab';
        });

        img = new Image();
        img.onload = draw;
        img.src = imgUrl;

        return { draw, state, reset() { state.zoom = 1; state.panX = 0; state.panY = 0; draw(); } };
    }

    let pzA = null, pzQ = null;

    function tryInit() {
        if (!window.slideEngine) { setTimeout(tryInit, 100); return; }
        window.slideEngine.registerSimulation(SLIDE_ID, {
            steps: 2,
            start() {},
            pause() {},

            onStep(step) {
                if (step === 1) {
                    // Show layered tiling
                    const lw = document.getElementById('sd-layered-wrap');
                    if (lw) lw.style.opacity = '1';
                }
                if (step === 2) {
                    // Switch to double-dimer fluctuations
                    const tilings = document.getElementById('sd-tilings');
                    const fluct = document.getElementById('sd-fluctuations');
                    if (tilings) tilings.style.display = 'none';
                    if (fluct) fluct.style.display = '';
                    if (!pzA) {
                        pzA = setupCanvasPanZoom('sd-canvas-annealed',
                            STORAGE + '/img/talks/bpz_dd_straight_layered_annealed.png');
                        pzQ = setupCanvasPanZoom('sd-canvas-quenched',
                            STORAGE + '/img/talks/bpz_dd_straight_layered_quenched.png');
                    } else {
                        pzA.draw();
                        pzQ.draw();
                    }
                }
            },

            onStepBack(step) {
                if (step <= 1) {
                    const tilings = document.getElementById('sd-tilings');
                    const fluct = document.getElementById('sd-fluctuations');
                    if (tilings) tilings.style.display = '';
                    if (fluct) fluct.style.display = 'none';
                }
                if (step === 0) {
                    const lw = document.getElementById('sd-layered-wrap');
                    if (lw) lw.style.opacity = '0';
                }
            },

            onSlideEnter() {
                const pw = document.getElementById('sd-periodic-wrap');
                const lw = document.getElementById('sd-layered-wrap');
                const tilings = document.getElementById('sd-tilings');
                const fluct = document.getElementById('sd-fluctuations');
                if (pw) pw.style.opacity = '1';
                if (lw) lw.style.opacity = '0';
                if (tilings) tilings.style.display = '';
                if (fluct) fluct.style.display = 'none';
            },
            onSlideLeave() {
                pzA = null;
                pzQ = null;
            }
        }, 0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
