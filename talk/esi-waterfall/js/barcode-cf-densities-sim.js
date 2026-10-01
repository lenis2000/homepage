// Barcode kernel, closed form [Knizel-P., in preparation]: interactive densities.
// Everything is computed from the formulas, in double precision:
//   d_a       : the paired regularized eigenfunction series (the definition), M pairs
//   Pc(w)     : -(q^2;q^2)^2/(q;q)^4 * theta_q(w)/theta_q(-w)
//   K(s,t)    : the off-diagonal closed form, s != t
// Theta factors that blow up at w in q^Z are folded as in the balanced-point lemma,
// theta_{sqrt q}(k)/theta_{sqrt q}(k q^{m/2}) = (-1)^m q^{m(m-1)/4} k^m, so nothing is singular there.
(function() {
    'use strict';

    // ---------- q-Pochhammer and theta ----------
    function qpInf(u, p) {
        let r = 1;
        for (let i = 0; i < 4000; i++) {
            const t = u * Math.pow(p, i);
            if (Math.abs(t) < 1e-18 && i > 2) break;
            r *= (1 - t);
        }
        return r;
    }
    function theta(z, p) { return qpInf(z, p) * qpInf(p / z, p); }

    // log|theta_{q^2}(q^n w)| and its sign, via theta_{q^2}(q^{2j} z) = (-1)^j q^{-j(j-1)} z^{-j} theta_{q^2}(z)
    function logTheta2(n, q, w) {
        const e = ((n % 2) + 2) % 2;
        const j = (n - e) / 2;
        const z0 = Math.pow(q, e) * w;
        const t0 = theta(z0, q * q);
        return {
            log: -j * (j - 1) * Math.log(q) - j * Math.log(z0) + Math.log(Math.abs(t0)),
            sign: (j % 2 === 0 ? 1 : -1) * Math.sign(t0)
        };
    }

    function makeModel(q, w, M) {
        const k = Math.sqrt(w);
        const lq = Math.log(q), lk = Math.log(k);
        const Q = qpInf(q, q), Q2 = qpInf(q * q, q * q);
        const Btil = 1 / (w * theta(-1 / w, q));          // B / theta_{sqrt q}(k)^2
        const Pc = -Q2 * Q2 / (Q * Q * Q * Q) * theta(w, q) / theta(-w, q);

        // (q;q)_j for j = 0..2M+2
        const qq = [1];
        for (let j = 1; j <= 2 * M + 3; j++) qq[j] = qq[j - 1] * (1 - Math.pow(q, j));

        // theta_{sqrt q}(k) / theta_{sqrt q}(k q^{m/2}),  m in Z
        function Aratio(m) {
            const s = (m % 2 === 0) ? 1 : -1;
            return s * Math.exp(m * (m - 1) / 4 * lq + m * lk);
        }
        function sqrtPref(x) { return Math.sqrt(1 + Math.pow(q, -2 * x) / w); }

        // Ftilde_n(x) = theta_{sqrt q}(k) F_n(x); n = n2/2
        function Ftil(n2, x) {
            const n = n2 / 2;
            let s = 0;
            for (let i = -n; i <= n + 1e-9; i += 1) {
                const nmi = Math.round(n - i), npi = Math.round(n + i);
                const sgn = (npi % 2 === 0) ? 1 : -1;
                const m = Math.round(2 * x + 2 * i + 1);
                s += sgn * Math.pow(q, -i / 2) / (qq[nmi] * qq[npi]) * Aratio(m);
            }
            return sqrtPref(x) * s;
        }
        function Paa(a) {
            return Math.sqrt(w * Math.pow(q, 1 - a) / ((1 + w * Math.pow(q, 2 - a)) * (1 + w * Math.pow(q, 1 - a))));
        }
        // paired diagonal series, M+1 indices of each parity
        function dSeries(a) {
            const xa = (1 - a) / 2, xb = xa + 0.5;
            let tot = 0;
            for (let n2 = 0; n2 <= 2 * M + 1; n2++) {
                tot += -Ftil(n2, xa) * Ftil(n2, xb) / qpInf(Math.pow(q, n2 + 1), q);
            }
            return Paa(a) * Btil * tot;
        }

        // theta_{sqrt q}(k) C(x) V_p(x): log-magnitude and sign
        function logH(p, x) {
            const m = Math.round(2 * x + 1);
            let L = Math.log(sqrtPref(x)) + Math.log(Q2 / (Q * Q)) + m * (m - 1) / 4 * lq + m * lk;
            let S = (m % 2 === 0) ? 1 : -1;
            const th = logTheta2(m + p, q, w);
            L += th.log; S *= th.sign;
            if (p === 1) L += lk + (x + 0.25) * lq;
            return { log: L, sign: S };
        }
        const lBtil = Math.log(Math.abs(Btil)), sBtil = Math.sign(Btil);
        function cP(p, s, t) {
            const h1 = logH(p, (1 - s) / 2), h2 = logH(p, (1 - (t - 1)) / 2);
            return sBtil * h1.sign * h2.sign * Math.exp(lBtil + h1.log + h2.log);
        }
        function Pst(s, t) {
            const sg = (((t - s) % 2) + 2) % 2 === 0 ? 1 : -1;
            return sg * Math.sqrt(w * Math.pow(q, 1 - s) / ((1 + w * Math.pow(q, 2 - t)) * (1 + w * Math.pow(q, 1 - s))));
        }
        // closed form, s != t
        function Kcf(s, t) {
            if (s < t) { const u = s; s = t; t = u; }
            const r = s - t;
            const sg = (r % 2 === 0) ? -1 : 1;              // (-1)^{r+1}
            return Pst(s, t) * sg / (Math.pow(q, -r) - 1) * (cP(0, s, t) + Math.pow(q, -r / 2) * cP(1, s, t));
        }
        return { q, w, Pc, dSeries, Kcf };
    }

    // ---------- DPP sampling on a window ----------
    function jacobiEigen(A, n) {
        const a = A.map(r => r.slice());
        const V = [];
        for (let i = 0; i < n; i++) { V.push(new Array(n).fill(0)); V[i][i] = 1; }
        for (let sweep = 0; sweep < 60; sweep++) {
            let off = 0;
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
            if (off < 1e-22) break;
            for (let p = 0; p < n; p++) {
                for (let r = p + 1; r < n; r++) {
                    const apr = a[p][r];
                    if (Math.abs(apr) < 1e-15) continue;
                    const tau = (a[r][r] - a[p][p]) / (2 * apr);
                    const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
                    const c = 1 / Math.sqrt(1 + t * t), s = t * c;
                    for (let k = 0; k < n; k++) {
                        const akp = a[k][p], akr = a[k][r];
                        a[k][p] = c * akp - s * akr;
                        a[k][r] = s * akp + c * akr;
                    }
                    for (let k = 0; k < n; k++) {
                        const apk = a[p][k], ark = a[r][k];
                        a[p][k] = c * apk - s * ark;
                        a[r][k] = s * apk + c * ark;
                    }
                    for (let k = 0; k < n; k++) {
                        const vkp = V[k][p], vkr = V[k][r];
                        V[k][p] = c * vkp - s * vkr;
                        V[k][r] = s * vkp + c * vkr;
                    }
                }
            }
        }
        const vals = [];
        for (let i = 0; i < n; i++) vals.push(a[i][i]);
        return { vals, V };
    }

    function sampleDPP(eig, n) {
        // choose eigenvectors independently with prob lambda_i, then sample the projection DPP
        let cols = [];
        for (let i = 0; i < n; i++) {
            const lam = Math.min(1, Math.max(0, eig.vals[i]));
            if (Math.random() < lam) cols.push(eig.V.map(row => row[i]));
        }
        const pts = [];
        while (cols.length > 0) {
            const kdim = cols.length;
            const prob = new Array(n).fill(0);
            for (const v of cols) for (let x = 0; x < n; x++) prob[x] += v[x] * v[x];
            let u = Math.random() * kdim, x = 0, acc = 0;
            for (x = 0; x < n; x++) { acc += prob[x]; if (acc >= u) break; }
            if (x >= n) x = n - 1;
            pts.push(x);
            // eliminate coordinate x
            let jmax = 0;
            for (let j = 1; j < kdim; j++) if (Math.abs(cols[j][x]) > Math.abs(cols[jmax][x])) jmax = j;
            const piv = cols[jmax];
            const rest = [];
            for (let j = 0; j < kdim; j++) {
                if (j === jmax) continue;
                const f = cols[j][x] / piv[x];
                rest.push(cols[j].map((val, y) => val - f * piv[y]));
            }
            // Gram-Schmidt
            const ortho = [];
            for (const v of rest) {
                const u2 = v.slice();
                for (const e of ortho) {
                    let d = 0;
                    for (let y = 0; y < n; y++) d += u2[y] * e[y];
                    for (let y = 0; y < n; y++) u2[y] -= d * e[y];
                }
                let nr = 0;
                for (let y = 0; y < n; y++) nr += u2[y] * u2[y];
                nr = Math.sqrt(nr);
                if (nr > 1e-10) ortho.push(u2.map(val => val / nr));
            }
            cols = ortho;
        }
        return pts;
    }

    // ---------- node test hook ----------
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { makeModel, jacobiEigen, sampleDPP };
        return;
    }

    // ---------- slide UI ----------
    const slideId = 'barcode-cf-densities';
    const M_PAIRS = 60;
    const NSITES = 48;
    const NROWS = 14;
    const Q0 = 1 / 7, CHI0 = 3;
    const Q_MIN = 0.02, Q_MAX = 0.95;
    const LCHI_MIN = Math.log(0.1), LCHI_MAX = Math.log(20);
    const NAVY = '#232D4B', ORANGE = '#E57200';

    let q = Q0, chi = CHI0;
    let pending = false;
    let initialized = false;
    let lastModel = null, lastD = null;

    function $(id) { return document.getElementById(id); }
    function fmt(v) {
        if (!isFinite(v)) return '\u2014';
        if (Math.abs(v) < 5e-11) v = 0;
        return (v < 0 ? '\u2212' : '') + v.toFixed(10).replace('-', '');
    }
    function sup(n) {
        const d = '\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079';
        return (n < 0 ? '\u207B' : '') + String(Math.abs(n)).split('').map(c => d[+c]).join('');
    }

    function setupCanvas(cv) {
        const dpr = window.devicePixelRatio || 1;
        const rect = cv.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return null;
        cv.width = Math.round(rect.width * dpr);
        cv.height = Math.round(rect.height * dpr);
        const ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, W: rect.width, H: rect.height };
    }

    function drawPlot(model, dSer) {
        const cv = $('bcf-plot');
        if (!cv) return;
        const s = setupCanvas(cv);
        if (!s) return;
        const { ctx, W, H } = s;
        ctx.clearRect(0, 0, W, H);
        const fs = Math.max(11, Math.round(H * 0.075));
        const padL = fs * 3.2, padR = fs * 0.8, padT = fs * 0.8, padB = fs * 1.9;
        // x = log w over the chi-slider range; y = I on the fixed range [-1, 1] (|d_0 - d_1| <= 1)
        const x0 = 2 * LCHI_MIN, x1 = 2 * LCHI_MAX;
        const NPT = Math.max(400, Math.ceil((x1 - x0) / (2 * Math.abs(Math.log(model.q))) * 48));
        const curve = [];
        for (let i = 0; i <= NPT; i++) {
            const lw = x0 + (x1 - x0) * i / NPT;
            const ww = Math.exp(lw);
            const v = model.Q2sq_over_Q4 * theta(ww, model.q) / theta(-ww, model.q);
            curve.push([lw, v]);
        }
        const ymax = 1;
        const X = lw => padL + (lw - x0) / (x1 - x0) * (W - padL - padR);
        const Y = v => padT + (ymax - v) / (2 * ymax) * (H - padT - padB);
        ctx.font = fs + 'px sans-serif';
        // axes
        ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(W - padR, Y(0)); ctx.stroke();
        ctx.strokeStyle = '#888';
        ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H - padB); ctx.lineTo(W - padR, H - padB); ctx.stroke();
        ctx.fillStyle = '#555'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        [-ymax, 0, ymax].forEach(v => ctx.fillText(v === 0 ? '0' : (v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(1), padL - fs * 0.4, Y(v)));
        // zeros of Pc at w = q^m, drawn while they are at least ~1.5 labels apart
        const lq = Math.log(model.q);
        if (Math.abs(X(lq) - X(0)) > fs * 1.5) {
            ctx.strokeStyle = '#e4e4e4';
            for (let m = Math.ceil(x1 / lq); m <= Math.floor(x0 / lq); m++) {
                ctx.beginPath(); ctx.moveTo(X(m * lq), padT); ctx.lineTo(X(m * lq), H - padB); ctx.stroke();
            }
        }
        // fixed labeled ticks in chi (w = chi^2)
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.strokeStyle = '#888'; ctx.fillStyle = '#555';
        [0.1, 0.3, 1, 3, 10].forEach(ct => {
            const lw = 2 * Math.log(ct);
            if (lw < x0 || lw > x1) return;
            ctx.beginPath(); ctx.moveTo(X(lw), H - padB); ctx.lineTo(X(lw), H - padB + fs * 0.35); ctx.stroke();
            ctx.fillText(String(ct), X(lw), H - padB + fs * 0.45);
        });
        ctx.textAlign = 'left';
        ctx.fillStyle = '#555';
        ctx.fillText('\u03C7', W - padR - fs * 0.8, H - padB - fs * 1.2);
        // curve Pc(w)
        ctx.strokeStyle = NAVY; ctx.lineWidth = 2.5;
        ctx.beginPath();
        curve.forEach(([lw, v], i) => { if (i === 0) ctx.moveTo(X(lw), Y(v)); else ctx.lineTo(X(lw), Y(v)); });
        ctx.stroke();
        // current point: series value of d_0 - d_1
        const lwc = Math.log(model.w);
        const Iser = dSer[0] - dSer[1];
        ctx.fillStyle = ORANGE; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(lwc), Y(Iser), fs * 0.55, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    }

    function drawBarcode(model, dSer) {
        const cv = $('bcf-barcode');
        if (!cv) return;
        const s = setupCanvas(cv);
        if (!s) return;
        const { ctx, W, H } = s;
        ctx.clearRect(0, 0, W, H);
        // kernel on sites 0..NSITES-1 (two-periodic, so K(s,t) = K(s mod 2 + ..., ...))
        const Kb = [[], []];
        for (let a = 0; a < 2; a++) for (let r = 1; r < NSITES; r++) Kb[a][r] = model.Kcf(a, a - r);
        const A = [];
        for (let i = 0; i < NSITES; i++) {
            A.push(new Array(NSITES));
            for (let j = 0; j < NSITES; j++) {
                if (i === j) { A[i][j] = dSer[i % 2]; continue; }
                const hi = Math.max(i, j), lo = Math.min(i, j);
                A[i][j] = Kb[hi % 2][hi - lo];
            }
        }
        const eig = jacobiEigen(A, NSITES);
        const cellW = W / NSITES, rowH = H / NROWS;
        for (let row = 0; row < NROWS; row++) {
            const pts = sampleDPP(eig, NSITES);
            for (const x of pts) {
                ctx.fillStyle = (x % 2 === 0) ? NAVY : ORANGE;
                ctx.fillRect(x * cellW + cellW * 0.12, row * rowH + rowH * 0.1, cellW * 0.76, rowH * 0.8);
            }
        }
    }

    function recompute() {
        pending = false;
        const w = chi * chi;
        const model = makeModel(q, w, M_PAIRS);
        const Q = qpInf(q, q), Q2 = qpInf(q * q, q * q);
        model.Q2sq_over_Q4 = -Q2 * Q2 / (Q * Q * Q * Q);
        // closed-form densities; the truncated series loses all precision as q -> 1
        const dSer = [(1 + model.Pc) / 2, (1 - model.Pc) / 2];
        lastModel = model; lastD = dSer;
        const set = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
        set('bcf-qval', q.toFixed(4));
        set('bcf-chival', chi.toFixed(3));
        set('bcf-d0s', fmt(dSer[0]));
        set('bcf-d1s', fmt(dSer[1]));
        set('bcf-sums', fmt(dSer[0] + dSer[1]));
        set('bcf-d0c', fmt((1 + model.Pc) / 2));
        set('bcf-d1c', fmt((1 - model.Pc) / 2));
        set('bcf-Is', fmt(dSer[0] - dSer[1]));
        set('bcf-Ic', fmt(model.Pc));
        drawPlot(model, dSer);
        drawBarcode(model, dSer);
    }

    function schedule() {
        if (pending) return;
        pending = true;
        setTimeout(recompute, 0);
    }

    function syncSliders() {
        const qs = $('bcf-q'), cs = $('bcf-chi');
        if (qs) qs.value = String(q);
        if (cs) cs.value = String(Math.log(chi));
    }

    function init() {
        if (initialized) return;
        const qs = $('bcf-q'), cs = $('bcf-chi'), rb = $('bcf-reset'), resample = $('bcf-resample');
        if (!qs || !cs) return;
        initialized = true;
        qs.min = Q_MIN; qs.max = Q_MAX; qs.step = 'any';
        cs.min = LCHI_MIN; cs.max = LCHI_MAX; cs.step = 'any';
        qs.addEventListener('input', () => { q = parseFloat(qs.value); schedule(); });
        cs.addEventListener('input', () => { chi = Math.exp(parseFloat(cs.value)); schedule(); });
        // give the arrow keys back to the slide engine
        qs.addEventListener('change', () => qs.blur());
        cs.addEventListener('change', () => cs.blur());
        if (rb) rb.addEventListener('click', () => { q = Q0; chi = CHI0; syncSliders(); schedule(); rb.blur(); });
        if (resample) resample.addEventListener('click', () => { if (lastModel) drawBarcode(lastModel, lastD); resample.blur(); });
    }

    function onEnter() {
        init();
        q = Q0; chi = CHI0;
        syncSliders();
        schedule();
    }

    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 0,
                onSlideEnter: onEnter,
                onSlideLeave() { }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
    window.addEventListener('resize', () => { if (initialized) schedule(); });
})();
