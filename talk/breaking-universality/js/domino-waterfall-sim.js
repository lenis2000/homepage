// Waterfall in dominoes — q-RSK sampling at N=160, q=0, x_i=y_i=0.9^i
// Ported from /simulations/2025-12-04-rsk-sampling/.
// Samples once on page load, caches dominoes JSON in localStorage.

(function() {
    'use strict';

    const SLIDE_ID = 'domino-waterfall';
    const CANVAS_ID = 'dwf-canvas';
    const STATUS_ID = 'dwf-status';

    const N = 200;
    const Q = 0.0;
    const R = 0.95;

    const CACHE_KEY = `dwf-dominoes-N${N}-r${R}-q${Q}-v1`;

    let dominoes = null;
    let bounds = null;
    let sampling = false;
    let sampled = false;

    function setStatus(text) {
        const el = document.getElementById(STATUS_ID);
        if (!el) return;
        if (!text) { el.style.display = 'none'; return; }
        el.style.display = '';
        el.textContent = text;
    }

    // ---- WASM module loader ----
    let wasmMod = null;
    let wasmReadyPromise = null;
    function loadWasm() {
        if (wasmReadyPromise) return wasmReadyPromise;
        wasmReadyPromise = new Promise((resolve, reject) => {
            // Load the script if not already loaded
            if (typeof window.createRSKModule !== 'undefined') {
                window.createRSKModule().then(mod => { wasmMod = mod; resolve(mod); }).catch(reject);
                return;
            }
            const s = document.createElement('script');
            s.src = '/js/2025-12-04-RSK-sampling.js';
            s.async = true;
            s.onload = () => {
                if (typeof window.createRSKModule === 'undefined') {
                    reject(new Error('createRSKModule not defined after script load'));
                    return;
                }
                window.createRSKModule().then(mod => { wasmMod = mod; resolve(mod); }).catch(reject);
            };
            s.onerror = () => reject(new Error('Failed to load /js/2025-12-04-RSK-sampling.js'));
            document.head.appendChild(s);
        });
        return wasmReadyPromise;
    }

    // ---- Sampling ----
    async function runSample() {
        const mod = await loadWasm();
        const sampleAztecRSK = mod.cwrap('sampleAztecRSK', 'number', ['number', 'string', 'string', 'number'], { async: true });
        const freeStringWasm = mod.cwrap('freeString', null, ['number']);

        // Build x = y = [r, r^2, ..., r^N]
        const x = new Array(N);
        let p = 1.0;
        for (let i = 0; i < N; i++) { p *= R; x[i] = p; }
        const y = x.slice();
        const xJson = JSON.stringify(x);
        const yJson = JSON.stringify(y);

        const ptr = await sampleAztecRSK(N, xJson, yJson, Q);
        if (!ptr) throw new Error('sampleAztecRSK returned null (possibly OOM)');
        const json = mod.UTF8ToString(ptr);
        freeStringWasm(ptr);
        const partitions = JSON.parse(json);
        if (partitions && partitions.error) throw new Error('C++ error: ' + partitions.error);
        return partitions;
    }

    // ---- Partition utilities ----
    // ground-set size of diagonal idx (idx = 0..2N)
    function getGroundSetSize(idx) {
        return Math.min(idx + 1, 2 * N + 1 - idx);
    }
    // λ^k (even idx): N - k particles; μ^k (odd idx): N - k + 1 particles
    function getParticleCount(idx) {
        const k = Math.floor((idx + 1) / 2);
        return idx % 2 === 0 ? (N - k) : (N - k + 1);
    }

    function partitionToSubset(partition, numParticles, groundSetSize) {
        const m = groundSetSize;
        const np = numParticles;
        const h = m - np;
        if (h <= 0) {
            const s = new Set();
            for (let i = 1; i <= m; i++) s.add(i);
            return s;
        }
        const lambda = partition || [];
        const lambdaRev = lambda.slice().reverse();
        while (lambdaRev.length < h) lambdaRev.unshift(0);
        const holes = new Set();
        for (let j = 1; j <= h; j++) {
            const u = lambdaRev[j - 1] + j;
            if (u >= 1 && u <= m) holes.add(u);
        }
        const s = new Set();
        for (let pos = 1; pos <= m; pos++) if (!holes.has(pos)) s.add(pos);
        return s;
    }

    // ---- Lattice / dominoes ----
    function generateLatticePoints() {
        const scale = 20;
        const points = [];
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let hx = -N - 0.5; hx <= N + 0.5; hx += 1) {
            for (let hy = -N - 0.5; hy <= N + 0.5; hy += 1) {
                if (Math.abs(hx % 1) !== 0.5 || Math.abs(hy % 1) !== 0.5) continue;
                if (Math.abs(hx) + Math.abs(hy) > N + 0.5) continue;
                const screenX = hx * scale;
                const screenY = -hy * scale;
                const diag = Math.round(hx + hy);
                points.push({ hx, hy, x: screenX, y: screenY, diag });
                if (screenX < minX) minX = screenX;
                if (screenX > maxX) maxX = screenX;
                if (screenY < minY) minY = screenY;
                if (screenY > maxY) maxY = screenY;
            }
        }
        const diagonals = {};
        for (const pt of points) {
            if (!diagonals[pt.diag]) diagonals[pt.diag] = [];
            diagonals[pt.diag].push(pt);
        }
        for (const d in diagonals) {
            diagonals[d].sort((a, b) => (a.hx - a.hy) - (b.hx - b.hy));
            diagonals[d].forEach((p, i) => { p.posInDiag = i + 1; });
        }
        return { points, diagonals, bounds: { minX, minY, maxX, maxY } };
    }

    function latticeKey(hx, hy) {
        const ix = Math.round(hx * 2) + 2 * N + 1;
        const iy = Math.round(hy * 2) + 2 * N + 1;
        return ix * (4 * N + 3) + iy;
    }

    function computeDominoes(points) {
        const lookup = new Map();
        for (const p of points) lookup.set(latticeKey(p.hx, p.hy), p);

        function neighbors(p) {
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            const out = [];
            for (const [dx, dy] of dirs) {
                const n = lookup.get(latticeKey(p.hx + dx, p.hy + dy));
                if (n) out.push(n);
            }
            return out;
        }

        // particles (bottom-left first)
        const particles = points.filter(p => p.inSubset);
        particles.sort((a, b) => {
            const sa = a.hx + a.hy, sb = b.hx + b.hy;
            if (sa !== sb) return sa - sb;
            return (a.hx - a.hy) - (b.hx - b.hy);
        });
        const matchedP = new Set();
        const pDoms = [];
        for (const p of particles) {
            const pk = latticeKey(p.hx, p.hy);
            if (matchedP.has(pk)) continue;
            const ns = neighbors(p).filter(n => n.inSubset && !matchedP.has(latticeKey(n.hx, n.hy)));
            if (ns.length > 0) {
                ns.sort((a, b) => {
                    const sa = a.hx + a.hy, sb = b.hx + b.hy;
                    if (sa !== sb) return sa - sb;
                    return (a.hx - a.hy) - (b.hx - b.hy);
                });
                const n = ns[0];
                matchedP.add(pk);
                matchedP.add(latticeKey(n.hx, n.hy));
                pDoms.push({ p1: p, p2: n });
            }
        }

        // holes (top-right first)
        const holes = points.filter(p => !p.inSubset);
        holes.sort((a, b) => {
            const sa = a.hx + a.hy, sb = b.hx + b.hy;
            if (sa !== sb) return sb - sa;
            return (b.hx - b.hy) - (a.hx - a.hy);
        });
        const matchedH = new Set();
        const hDoms = [];
        for (const p of holes) {
            const pk = latticeKey(p.hx, p.hy);
            if (matchedH.has(pk)) continue;
            const ns = neighbors(p).filter(n => !n.inSubset && !matchedH.has(latticeKey(n.hx, n.hy)));
            if (ns.length > 0) {
                ns.sort((a, b) => {
                    const sa = a.hx + a.hy, sb = b.hx + b.hy;
                    if (sa !== sb) return sb - sa;
                    return (b.hx - b.hy) - (a.hx - a.hy);
                });
                const n = ns[0];
                matchedH.add(pk);
                matchedH.add(latticeKey(n.hx, n.hy));
                hDoms.push({ p1: p, p2: n });
            }
        }

        const scale = 20;
        const out = [];
        for (const d of pDoms) {
            const isH = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
            out.push({
                cx: (d.p1.x + d.p2.x) / 2, cy: (d.p1.y + d.p2.y) / 2,
                w: isH ? 2 * scale : scale, h: isH ? scale : 2 * scale,
                t: 'p', isH
            });
        }
        for (const d of hDoms) {
            const isH = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
            out.push({
                cx: (d.p1.x + d.p2.x) / 2, cy: (d.p1.y + d.p2.y) / 2,
                w: isH ? 2 * scale : scale, h: isH ? scale : 2 * scale,
                t: 'h', isH
            });
        }
        return out;
    }

    function buildDominoesFromPartitions(partitions) {
        const { points, diagonals, bounds: bb } = generateLatticePoints();
        const diagKeys = Object.keys(diagonals).map(Number).sort((a, b) => a - b);
        for (let idx = 0; idx < partitions.length && idx < diagKeys.length; idx++) {
            const diagKey = diagKeys[idx];
            const diagSize = diagonals[diagKey].length;
            const partition = partitions[idx] || [];
            const np = getParticleCount(idx);
            const subset = partitionToSubset(partition, np, diagSize);
            for (const pt of diagonals[diagKey]) pt.inSubset = subset.has(pt.posInDiag);
        }
        const doms = computeDominoes(points);
        return { dominoes: doms, bounds: bb };
    }

    // ---- Render ----
    // UVA-tinted colors: orange/blue/cream/light blue
    const COLORS = {
        pH: '#E57200',   // particle horizontal — UVA orange
        pV: '#F9DCBF',   // particle vertical — UVA cream (was navy; swapped with hH)
        hH: '#232D4B',   // hole horizontal — UVA navy (was cream; swapped with pV)
        hV: '#9FB4D9',   // hole vertical — light blue
    };

    // Pan/zoom state (in canvas pixel space, applied on top of base fit)
    const view = { scale: 1, offsetX: 0, offsetY: 0 };
    let panZoomBound = false;
    let cachedOffscreen = null;  // pre-rendered tiling at exact bounding-box resolution

    function buildOffscreen() {
        if (!dominoes || !bounds) return null;
        const padding = 20;
        const bw = Math.ceil(bounds.maxX - bounds.minX + 2 * padding);
        const bh = Math.ceil(bounds.maxY - bounds.minY + 2 * padding);
        const off = document.createElement('canvas');
        off.width = bw;
        off.height = bh;
        const oct = off.getContext('2d');
        oct.fillStyle = '#fafafa';
        oct.fillRect(0, 0, bw, bh);
        oct.imageSmoothingEnabled = false;
        const ox = -bounds.minX + padding;
        const oy = -bounds.minY + padding;
        const groups = { pH: [], pV: [], hH: [], hV: [] };
        for (const d of dominoes) {
            const key = (d.t === 'p' ? 'p' : 'h') + (d.isH ? 'H' : 'V');
            groups[key].push(d);
        }
        for (const k of Object.keys(groups)) {
            oct.fillStyle = COLORS[k];
            for (const d of groups[k]) {
                const x = ox + (d.cx - d.w / 2);
                const y = oy + (d.cy - d.h / 2);
                oct.fillRect(x, y, d.w + 0.5, d.h + 0.5);
            }
        }
        return { canvas: off, w: bw, h: bh };
    }

    function resetView() { view.scale = 1; view.offsetX = 0; view.offsetY = 0; }

    function render() {
        const canvas = document.getElementById(CANVAS_ID);
        if (!canvas || !dominoes || !bounds) return;
        if (!cachedOffscreen) cachedOffscreen = buildOffscreen();
        if (!cachedOffscreen) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = false;

        const baseScale = Math.min(w / cachedOffscreen.w, h / cachedOffscreen.h);
        const drawScale = baseScale * view.scale;
        const drawW = cachedOffscreen.w * drawScale;
        const drawH = cachedOffscreen.h * drawScale;
        const cx = (w - drawW) / 2 + view.offsetX;
        const cy = (h - drawH) / 2 + view.offsetY;
        ctx.drawImage(cachedOffscreen.canvas, cx, cy, drawW, drawH);

        console.log(
            '[domino-waterfall]',
            'scale:', view.scale.toFixed(3),
            '| offset:', view.offsetX.toFixed(1), view.offsetY.toFixed(1)
        );
    }

    function bindPanZoom() {
        if (panZoomBound) return;
        const canvas = document.getElementById(CANVAS_ID);
        if (!canvas) return;
        panZoomBound = true;

        let dragging = false, lastX = 0, lastY = 0;

        canvas.addEventListener('wheel', (e) => {
            if (!cachedOffscreen) return;
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const my = (e.clientY - rect.top) * (canvas.height / rect.height);
            const factor = Math.exp(-e.deltaY * 0.001);
            const newScale = Math.max(0.2, Math.min(40, view.scale * factor));
            const k = newScale / view.scale;
            view.offsetX = mx - k * (mx - view.offsetX);
            view.offsetY = my - k * (my - view.offsetY);
            view.scale = newScale;
            render();
        }, { passive: false });

        canvas.addEventListener('mousedown', (e) => {
            dragging = true; lastX = e.clientX; lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });
        window.addEventListener('mousemove', (e) => {
            if (!dragging || !cachedOffscreen) return;
            const rect = canvas.getBoundingClientRect();
            const sx = canvas.width / rect.width;
            const sy = canvas.height / rect.height;
            view.offsetX += (e.clientX - lastX) * sx;
            view.offsetY += (e.clientY - lastY) * sy;
            lastX = e.clientX; lastY = e.clientY;
            render();
        });
        window.addEventListener('mouseup', () => {
            if (dragging) { dragging = false; canvas.style.cursor = ''; }
        });
        canvas.addEventListener('dblclick', () => { resetView(); render(); });
        canvas.style.cursor = 'grab';
    }

    // Smooth view animation
    let viewAnimId = null;
    function animateView(targetScale, targetOffsetX, targetOffsetY, duration = 1500) {
        if (viewAnimId) { cancelAnimationFrame(viewAnimId); viewAnimId = null; }
        const sS = view.scale, sX = view.offsetX, sY = view.offsetY;
        const t0 = performance.now();
        function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
        function step() {
            const e = ease(Math.min(1, (performance.now() - t0) / duration));
            view.scale = sS + (targetScale - sS) * e;
            view.offsetX = sX + (targetOffsetX - sX) * e;
            view.offsetY = sY + (targetOffsetY - sY) * e;
            render();
            if (e < 1) viewAnimId = requestAnimationFrame(step); else viewAnimId = null;
        }
        viewAnimId = requestAnimationFrame(step);
    }

    async function sampleAndBuild() {
        if (sampling) {
            while (sampling) await new Promise(r => setTimeout(r, 200));
            return;
        }
        sampling = true;
        setStatus('Sampling…');
        try {
            const partitions = await runSample();
            setStatus('Building tiling…');
            await new Promise(r => setTimeout(r, 0));
            const built = buildDominoesFromPartitions(partitions);
            dominoes = built.dominoes;
            bounds = built.bounds;
            cachedOffscreen = null;  // invalidate so render() re-renders the new sample
            sampled = true;
            setStatus('');
        } catch (e) {
            console.error('[domino-waterfall] sampling failed:', e);
            setStatus('Sampling failed: ' + e.message);
        } finally {
            sampling = false;
        }
    }

    // ---- Slide engine ----
    const FINAL_VIEW = { scale: 3.410, offsetX: 219.6, offsetY: 145.9 };

    function tryInit() {
        if (!window.slideEngine) { setTimeout(tryInit, 100); return; }
        window.slideEngine.registerSimulation(SLIDE_ID, {
            steps: 1,
            start() {}, pause() {},
            async onSlideEnter() {
                resetView();
                await sampleAndBuild();
                if (sampled) {
                    bindPanZoom();
                    setStatus('');
                    render();
                }
            },
            onStep(step) {
                if (step === 1) {
                    animateView(FINAL_VIEW.scale, FINAL_VIEW.offsetX, FINAL_VIEW.offsetY);
                }
            },
            onStepBack(step) {
                if (step === 0) {
                    animateView(1, 0, 0);
                }
            },
            onSlideLeave() {
                if (viewAnimId) { cancelAnimationFrame(viewAnimId); viewAnimId = null; }
            },
            reset() {
                if (viewAnimId) { cancelAnimationFrame(viewAnimId); viewAnimId = null; }
            }
        }, 0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
