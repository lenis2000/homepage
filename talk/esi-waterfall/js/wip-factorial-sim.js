/**
 * Sampling Part: live Yang-Baxter sampler for factorial Schur processes.
 *
 * Drives the site's exact sampler worker /js/factorial-ybe-worker.js (which loads
 * /js/factorial-ybe-wasm.js, built from factorial/factorial-ybe-sampler.cpp).
 * Parameters follow the /factorial/ presets:
 *   waterfall: x_i = 1, y_k = 1.5 q^(k-M), w_j = 2 q^(j-M), M = 2.5 N
 *   Schur:     x_i = 1, y_k = 0,           w_j = 1.5,       M = 2 N
 * Rendering (paths / lozenges) is a compact port of the /factorial/ canvas renderer.
 *
 * Slide ID: 'wip-factorial'
 */

(function initSamplingYbeSim() {
    if (!window.slideEngine) {
        setTimeout(initSamplingYbeSim, 50);
        return;
    }

    const slideId = 'wip-factorial';
    const canvas = document.getElementById('wip-factorial-canvas');
    const statusEl = document.getElementById('wip-factorial-status');
    const paramsEl = document.getElementById('wip-factorial-params');
    const sampleBtn = document.getElementById('wip-factorial-sample');
    const qGroupEl = document.getElementById('wip-factorial-q-group');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const WORKER_URL = '/js/factorial-ybe-worker.js';
    const COLUMN_CAP = 20000;
    const UP_SLANT = 0.58, UP_HEIGHT = 0.86;

    const COLORS = {
        bg: '#ffffff',
        navy: '#232D4B',
        orange: '#E57200',
        cream: '#F9DCBF',
        stroke: 'rgba(0,47,108,0.10)',
        lambdaBand: 'rgba(229,114,0,0.10)',
    };

    const state = {
        spec: 'waterfall',
        q: 0.9,
        n: 40,
        view: 'lozenges',
    };

    let slideActive = false;
    let worker = null;
    let requestId = 0;
    let data = null;       // last sample: {N, M, mu, lam}
    let geometry = null;

    // ===================================================================
    // Parameters
    // ===================================================================

    function currentParams() {
        const N = state.n;
        if (state.spec === 'schur') {
            const M = 2 * N;
            return {
                N, M,
                x: new Float64Array(N).fill(1),
                w: new Float64Array(M).fill(1.5),
                y: new Float64Array(COLUMN_CAP),
            };
        }
        const q = state.q;
        const M = Math.round(2.5 * N);
        const w = new Float64Array(M);
        for (let j = 1; j <= M; j++) w[j - 1] = 2 * Math.pow(q, j - M);
        const y = new Float64Array(COLUMN_CAP);
        for (let k = 1; k <= COLUMN_CAP; k++) y[k - 1] = 1.5 * Math.pow(q, k - M);
        return { N, M, x: new Float64Array(N).fill(1), w, y };
    }

    function paramsHTML() {
        const N = state.n;
        if (state.spec === 'schur') {
            return `\\(x_i = 1,\\ w_j = 1.5,\\ y_k = 0\\);&ensp;\\(N = ${N},\\ M = ${2 * N}\\)`;
        }
        return `\\(x_i = 1,\\ w_j = 2q^{j-M},\\ y_k = 1.5\\,q^{k-M}\\);&ensp;\\(q = ${state.q},\\ N = ${N},\\ M = ${Math.round(2.5 * N)}\\)`;
    }

    function renderParams() {
        if (!paramsEl) return;
        paramsEl.innerHTML = paramsHTML();
        if (typeof renderMathInElement === 'function') {
            try {
                renderMathInElement(paramsEl, {
                    delimiters: [{ left: '\\(', right: '\\)', display: false }],
                    throwOnError: false,
                });
            } catch (e) { /* leave raw TeX */ }
        } else if (typeof katex !== 'undefined') {
            paramsEl.innerHTML = paramsHTML().replace(/\\\((.+?)\\\)/g, (_, tex) => {
                try { return katex.renderToString(tex, { throwOnError: false }); } catch (e) { return tex; }
            });
        }
    }

    // ===================================================================
    // Controls
    // ===================================================================

    const buttons = Array.from(document.querySelectorAll('#wip-factorial .wip-factorial-btn'));

    function syncButtons() {
        for (const btn of buttons) {
            const group = btn.dataset.group;
            const value = btn.dataset.value;
            let active = false;
            if (group === 'spec') active = state.spec === value;
            else if (group === 'q') active = state.q === Number(value);
            else if (group === 'n') active = state.n === Number(value);
            else if (group === 'view') active = state.view === value;
            btn.classList.toggle('active', active);
        }
        if (qGroupEl) qGroupEl.style.opacity = state.spec === 'schur' ? '0.35' : '1';
    }

    for (const btn of buttons) {
        btn.addEventListener('click', () => {
            btn.blur();
            const group = btn.dataset.group;
            const value = btn.dataset.value;
            if (group === 'view') {
                state.view = value;
                syncButtons();
                draw();
                return;
            }
            if (group === 'spec') state.spec = value;
            else if (group === 'q') { state.q = Number(value); state.spec = 'waterfall'; }
            else if (group === 'n') state.n = Number(value);
            syncButtons();
            renderParams();
            if (slideActive) runSample();
        });
    }

    if (sampleBtn) {
        sampleBtn.addEventListener('click', () => {
            sampleBtn.blur();
            if (slideActive) runSample();
        });
    }

    // ===================================================================
    // Worker
    // ===================================================================

    function stopWorker() {
        requestId++;
        if (worker) { worker.terminate(); worker = null; }
        if (sampleBtn) sampleBtn.disabled = false;
    }

    function runSample() {
        stopWorker();
        if (typeof Worker !== 'function') {
            if (statusEl) statusEl.textContent = 'Web Workers unavailable';
            return;
        }
        const p = currentParams();
        const id = ++requestId;
        const seedLo = (Math.random() * 0x100000000) >>> 0;
        const seedHi = (Math.random() * 0x100000000) >>> 0;
        let w;
        try {
            w = new Worker(WORKER_URL);
        } catch (e) {
            if (statusEl) statusEl.textContent = 'worker failed to start';
            console.error('wip-factorial:', e);
            return;
        }
        worker = w;
        if (sampleBtn) sampleBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'sampling…';
        const started = performance.now();

        w.onmessage = (event) => {
            const msg = event.data || {};
            if (msg.requestId !== id || id !== requestId) return;
            const wall = performance.now() - started;
            w.terminate();
            if (worker === w) worker = null;
            if (sampleBtn) sampleBtn.disabled = false;
            if (msg.type === 'result' && msg.result && Array.isArray(msg.result.mu)) {
                const r = msg.result;
                data = { N: r.N, M: r.M, mu: r.mu, lam: r.lam };
                geometry = buildGeometry(data);
                const st = r.stats || {};
                if (statusEl) {
                    statusEl.textContent =
                        `${fmt(st.rowSwaps)} row swaps, ${fmt(st.localMoves)} Yang–Baxter moves, ` +
                        `${fmt(st.randomChoices)} coin flips; ${(wall / 1000).toFixed(2)} s`;
                }
                draw();
            } else {
                if (statusEl) statusEl.textContent = 'sampler error';
                console.error('wip-factorial worker error:', msg.error);
            }
        };
        w.onerror = (event) => {
            if (id !== requestId) return;
            console.error('wip-factorial worker failed:', event.message);
            if (statusEl) statusEl.textContent = 'sampler error';
            stopWorker();
        };
        w.postMessage({
            type: 'sample', requestId: id, N: p.N, M: p.M,
            xBuffer: p.x.buffer, wBuffer: p.w.buffer, yBuffer: p.y.buffer,
            columnCap: COLUMN_CAP, seedLo, seedHi,
        }, [p.x.buffer, p.w.buffer, p.y.buffer]);
    }

    function fmt(v) {
        v = Number(v) || 0;
        if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
        if (v >= 1e4) return Math.round(v / 1e3) + 'K';
        return String(v);
    }

    // ===================================================================
    // Geometry (port of FactorialPathCanvasRenderer.buildGeometry)
    // Level 0..M: mu-stack (N particles), level M+s: lambda^(N-s) (N-s particles)
    // ===================================================================

    function buildGeometry(d) {
        const n = d.N, m = d.M;
        const totalLevels = n + m;
        const positionAt = (track, level) => {
            if (level <= m) {
                const row = d.mu[level];
                if (!row || row[track] == null) return null;
                return row[track] + n - track;
            }
            const s = level - m;
            const lamLevel = n - s;
            const lamTrack = track - s;
            if (lamTrack < 0 || lamTrack >= lamLevel) return null;
            const row = d.lam[lamLevel];
            if (!row || row[lamTrack] == null) return null;
            return row[lamTrack] + lamLevel - lamTrack;
        };
        const paths = [];
        let minX = Infinity, maxX = -Infinity;
        for (let track = 0; track < n; track++) {
            const lastLevel = Math.min(m + track, totalLevels);
            const particles = [];
            for (let level = 0; level <= lastLevel; level++) {
                const pos = positionAt(track, level);
                if (pos == null) break;
                particles.push({ x: pos, level });
                if (pos < minX) minX = pos;
                if (pos > maxX) maxX = pos;
            }
            if (particles.length) paths.push({ track, particles });
        }
        if (!Number.isFinite(minX)) { minX = 0; maxX = n; }
        return { N: n, M: m, totalLevels, paths, minX, maxX };
    }

    // ===================================================================
    // Drawing
    // ===================================================================

    function setupCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        return { w, h };
    }

    function clearCanvas() {
        const { w, h } = setupCanvas();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, w, h);
        return { w, h };
    }

    function draw() {
        if (!slideActive) return;
        const size = clearCanvas();
        if (!geometry) return;
        if (state.view === 'paths') drawPaths(size);
        else drawLozenges(size);
    }

    // Path view: level L drawn at height (totalLevels - L); horizontal = position
    function drawPaths(size) {
        const g = geometry;
        const pad = 0.04;
        const spanX = Math.max(1, g.maxX - g.minX + 2);
        const spanY = Math.max(1, g.totalLevels);
        const sx = size.w * (1 - 2 * pad) / spanX;
        const sy = size.h * (1 - 2 * pad) / spanY;
        const ox = size.w * pad - (g.minX - 1) * sx;
        const oy = size.h * pad;
        const X = (x) => ox + x * sx;
        const Y = (level) => oy + (g.totalLevels - level) * sy;

        // lambda row
        ctx.fillStyle = COLORS.lambdaBand;
        ctx.fillRect(0, Y(g.M) - sy * 0.5, size.w, sy);

        const lw = Math.max(1.5, Math.min(5, Math.min(sx, sy) * 0.5));
        ctx.lineWidth = lw;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (const path of g.paths) {
            const pts = path.particles;
            ctx.strokeStyle = COLORS.navy;
            ctx.beginPath();
            ctx.moveTo(X(pts[0].x), Y(pts[0].level));
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(X(pts[i - 1].x), Y(pts[i].level));
                ctx.lineTo(X(pts[i].x), Y(pts[i].level));
            }
            ctx.stroke();
        }
        const r = Math.max(3.5, Math.min(8, Math.min(sx, sy) * 0.8));
        ctx.fillStyle = COLORS.orange;
        for (const path of g.paths) {
            const p = path.particles.find(pt => pt.level === g.M);
            if (!p) continue;
            ctx.beginPath();
            ctx.arc(X(p.x), Y(p.level), r, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // Lozenge view (port of the /factorial/ path-lozenge renderer)
    function lozPoint(x, level, totalLevels) {
        return { x: x + UP_SLANT * level, y: UP_HEIGHT * (totalLevels - level) };
    }

    function tilePolygon(kind, a) {
        const right = { x: 1, y: 0 };
        const up = { x: UP_SLANT, y: -UP_HEIGHT };
        const upLeft = { x: UP_SLANT - 1, y: -UP_HEIGHT };
        const add = (p, v) => ({ x: p.x + v.x, y: p.y + v.y });
        if (kind === 'up') return [a, add(a, up), add(add(a, up), upLeft), add(a, upLeft)];
        if (kind === 'right') return [a, add(a, right), add(add(a, right), upLeft), add(a, upLeft)];
        return [a, add(a, right), add(add(a, right), up), add(a, up)];
    }

    function drawLozenges(size) {
        const g = geometry;
        const T = g.totalLevels;
        const tiles = [];
        const domain = { minX: Infinity, maxX: -Infinity, minLevel: Infinity, maxLevel: -Infinity };
        const inc = (x, level) => {
            if (x < domain.minX) domain.minX = x;
            if (x > domain.maxX) domain.maxX = x;
            if (level < domain.minLevel) domain.minLevel = level;
            if (level > domain.maxLevel) domain.maxLevel = level;
        };
        const tails = [];
        for (const path of g.paths) {
            const pts = path.particles;
            for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1], cur = pts[i];
                tiles.push({ kind: 'up', poly: tilePolygon('up', lozPoint(prev.x, prev.level, T)) });
                inc(prev.x, prev.level);
                inc(prev.x, prev.level + 1);
                const count = Math.max(0, Math.round(cur.x - prev.x));
                for (let r = 0; r < count; r++) {
                    tiles.push({ kind: 'right', poly: tilePolygon('right', lozPoint(prev.x + r, cur.level, T)) });
                    inc(prev.x + r, cur.level);
                }
            }
            const end = pts[pts.length - 1];
            if (pts.length > 1 && end.level >= g.M) tails.push(end);
        }
        if (!Number.isFinite(domain.minX)) return;

        const padded = {
            minX: Math.floor(domain.minX) - 1,
            maxX: Math.ceil(domain.maxX) + 2,
            minLevel: Math.max(0, Math.floor(domain.minLevel) - 1),
            maxLevel: Math.min(T, Math.ceil(domain.maxLevel) + 1),
        };
        for (const end of tails) {
            for (let x = Math.max(padded.minX, Math.round(end.x)); x <= padded.maxX; x++) {
                tiles.push({ kind: 'right', poly: tilePolygon('right', lozPoint(x, end.level, T)) });
            }
        }

        // Bounds of the background region
        const bgCorners = [
            lozPoint(padded.minX, padded.minLevel, T), lozPoint(padded.maxX + 1, padded.minLevel, T),
            lozPoint(padded.minX, padded.maxLevel + 1, T), lozPoint(padded.maxX + 1, padded.maxLevel + 1, T),
        ];
        let bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity;
        for (const p of bgCorners) {
            bMinX = Math.min(bMinX, p.x); bMaxX = Math.max(bMaxX, p.x);
            bMinY = Math.min(bMinY, p.y); bMaxY = Math.max(bMaxY, p.y);
        }
        const pad = 0.02;
        const scale = Math.min(size.w * (1 - 2 * pad) / (bMaxX - bMinX), size.h * (1 - 2 * pad) / (bMaxY - bMinY));
        const ox = (size.w - scale * (bMaxX - bMinX)) / 2 - scale * bMinX;
        const oy = (size.h - scale * (bMaxY - bMinY)) / 2 - scale * bMinY;

        const stroke = scale >= 8 ? COLORS.stroke : '';
        const seal = Math.max(0.6, Math.min(2.0, scale * 0.06));
        const lineWidth = Math.max(0.35, Math.min(1.0, scale * 0.026));
        ctx.lineJoin = 'bevel';

        function addPoly(path2d, poly) {
            path2d.moveTo(ox + scale * poly[0].x, oy + scale * poly[0].y);
            for (let i = 1; i < poly.length; i++) path2d.lineTo(ox + scale * poly[i].x, oy + scale * poly[i].y);
            path2d.closePath();
        }

        // Background: union of the pale lozenges is one parallelogram
        const bg = new Path2D();
        addPoly(bg, [bgCorners[0], bgCorners[1], bgCorners[3], bgCorners[2]]);
        ctx.fillStyle = COLORS.cream;
        ctx.fill(bg);

        function tracePoly(poly) {
            ctx.beginPath();
            ctx.moveTo(ox + scale * poly[0].x, oy + scale * poly[0].y);
            for (let i = 1; i < poly.length; i++) ctx.lineTo(ox + scale * poly[i].x, oy + scale * poly[i].y);
            ctx.closePath();
        }

        // One small path per tile, as on /factorial/: stroking a single Path2D with ~1e5 subpaths freezes the page
        ctx.lineWidth = seal;
        for (const [kind, fill] of [['right', COLORS.navy], ['up', COLORS.orange]]) {
            ctx.fillStyle = fill;
            ctx.strokeStyle = fill;
            for (const t of tiles) {
                if (t.kind !== kind) continue;
                tracePoly(t.poly);
                ctx.fill();
                ctx.stroke();
            }
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            for (const t of tiles) {
                tracePoly(t.poly);
                ctx.stroke();
            }
        }
    }

    // ===================================================================
    // Slide engine
    // ===================================================================

    syncButtons();
    renderParams();
    window.addEventListener('load', renderParams, { once: true });

    window.slideEngine.registerSimulation(slideId, {
        start() {},
        pause() {},

        onSlideEnter() {
            slideActive = true;
            syncButtons();
            renderParams();
            if (data) draw();
            else clearCanvas();
            runSample();
        },

        onSlideLeave() {
            slideActive = false;
            stopWorker();
        }
    }, 0);

    window.addEventListener('resize', () => { if (slideActive) draw(); });
})();
