(function() {
    'use strict';

    const SLIDE_ID = 'other-disorder-models';
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
            if (!img) return;
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;
            // Base scale: cover the canvas
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
        }, { passive: false });

        canvas.addEventListener('mousedown', function(e) {
            dragging = true;
            const rect = canvas.getBoundingClientRect();
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        });

        window.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            state.panX += (e.clientX - lastX) * scaleX;
            state.panY += (e.clientY - lastY) * scaleY;
            lastX = e.clientX;
            lastY = e.clientY;
            draw();
        });

        window.addEventListener('mouseup', function() {
            if (!dragging) return;
            dragging = false;
            canvas.style.cursor = 'grab';
        });

        // Load image
        img = new Image();
        img.onload = draw;
        img.src = imgUrl;

        function animateTo(target, duration) {
            const from = { zoom: state.zoom, panX: state.panX, panY: state.panY };
            const t0 = performance.now();
            function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
            function step() {
                const elapsed = performance.now() - t0;
                const t = Math.min(elapsed / duration, 1);
                const e = ease(t);
                state.zoom = from.zoom + (target.zoom - from.zoom) * e;
                state.panX = from.panX + (target.panX - from.panX) * e;
                state.panY = from.panY + (target.panY - from.panY) * e;
                draw();
                if (t < 1) requestAnimationFrame(step);
            }
            step();
        }

        return { draw, state, animateTo, reset() { state.zoom = 1; state.panX = 0; state.panY = 0; draw(); } };
    }

    const ZOOM_TARGET = { zoom: 3.508, panX: -1624.8, panY: 9.7 };

    let pz1 = null, pz2 = null;

    function tryInit() {
        if (!window.slideEngine) { setTimeout(tryInit, 100); return; }
        window.slideEngine.registerSimulation(SLIDE_ID, {
            steps: 1,
            start() {},
            pause() {},
            onStep(step) {
                if (step === 1) {
                    if (pz1) { Object.assign(pz1.state, ZOOM_TARGET); pz1.draw(); }
                    if (pz2) { Object.assign(pz2.state, ZOOM_TARGET); pz2.draw(); }
                }
            },
            onStepBack(step) {
                if (step === 0) {
                    if (pz1) pz1.reset();
                    if (pz2) pz2.reset();
                }
            },
            onSlideEnter() {
                pz1 = setupCanvasPanZoom('odm-canvas-annealed',
                    STORAGE + '/img/talks/bpz_dd_diagonal_uniform_annealed.png');
                pz2 = setupCanvasPanZoom('odm-canvas-quenched',
                    STORAGE + '/img/talks/bpz_dd_diagonal_uniform_quenched.png');
            },
            onSlideLeave() {
                pz1 = null;
                pz2 = null;
            }
        }, 0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
