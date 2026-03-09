/**
 * Homepage hero: Lozenge double-dimer simulation
 *
 * Samples two independent uniform lozenge tilings of the hexagon (as plane
 * partitions in an NxNxN box) via Glauber dynamics, computes the height
 * difference h1-h2, and renders the double-dimer loop picture:
 *   - Regions between loops colored by height difference (UVA palette)
 *   - Loop boundaries drawn as thin dark lines
 *
 * A fresh sample is generated on every page load.
 */
(function () {
  'use strict';

  var N = 30;
  var SWEEPS = 300;

  // UVA brand palette (diverging: navy ← off-white → orange)
  var NAVY   = [35, 45, 75];
  var ORANGE = [229, 114, 0];
  var BASE   = [248, 245, 240];

  /* ── Plane-partition sampler (Glauber dynamics) ──────────────────────── */
  function samplePP() {
    var i, j, s, v, nv;
    var pp = [];
    for (i = 0; i < N; i++) {
      pp[i] = new Int8Array(N);
      for (j = 0; j < N; j++) {
        // Staircase initialisation — close to the typical (limit-shape) config
        v = N - i - j;
        pp[i][j] = v > 0 ? (v < N ? v : N) : 0;
      }
    }
    var steps = N * N * SWEEPS;
    for (s = 0; s < steps; s++) {
      i = (Math.random() * N) | 0;
      j = (Math.random() * N) | 0;
      v = pp[i][j];
      if (Math.random() < 0.5) {
        nv = v + 1;
        if (nv <= N &&
            (i === 0 || nv <= pp[i - 1][j]) &&
            (j === 0 || nv <= pp[i][j - 1])) {
          pp[i][j] = nv;
        }
      } else {
        nv = v - 1;
        if (nv >= 0 &&
            (i === N - 1 || nv >= pp[i + 1][j]) &&
            (j === N - 1 || nv >= pp[i][j + 1])) {
          pp[i][j] = nv;
        }
      }
    }
    return pp;
  }

  /* ── Renderer ────────────────────────────────────────────────────────── */
  function render(canvas) {
    var pp1 = samplePP();
    var pp2 = samplePP();

    // Height difference
    var diff = [], maxAbs = 1;
    var i, j, d, a;
    for (i = 0; i < N; i++) {
      diff[i] = new Int8Array(N);
      for (j = 0; j < N; j++) {
        d = pp1[i][j] - pp2[i][j];
        diff[i][j] = d;
        a = d < 0 ? -d : d;
        if (a > maxAbs) maxAbs = a;
      }
    }

    // Retina-aware sizing
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth;
    if (!W) W = canvas.parentElement ? canvas.parentElement.clientWidth : 400;
    if (!W) W = 400;
    var H = W;
    canvas.width  = (W * dpr) | 0;
    canvas.height = (H * dpr) | 0;

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Diamond grid geometry
    var pad = 1;
    var cellW = (W - 2 * pad) / (2 * N);
    var cellH = (H - 2 * pad) / (2 * N);
    var cx = W / 2;
    var topY = pad + cellH;

    // Fill each cell
    var x, y, t, tgt, r, g, b;
    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) {
        x = cx + (i - j) * cellW;
        y = topY + (i + j) * cellH;
        d = diff[i][j];
        a = d < 0 ? -d : d;
        t = Math.pow(a / maxAbs, 0.55);
        tgt = d >= 0 ? ORANGE : NAVY;
        r = BASE[0] + (tgt[0] - BASE[0]) * t;
        g = BASE[1] + (tgt[1] - BASE[1]) * t;
        b = BASE[2] + (tgt[2] - BASE[2]) * t;

        ctx.beginPath();
        ctx.moveTo(x, y - cellH);
        ctx.lineTo(x + cellW, y);
        ctx.lineTo(x, y + cellH);
        ctx.lineTo(x - cellW, y);
        ctx.closePath();
        ctx.fillStyle = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
        ctx.fill();
      }
    }

    // Double-dimer loop boundaries (batch into single stroke)
    ctx.strokeStyle = 'rgba(35, 45, 75, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) {
        x = cx + (i - j) * cellW;
        y = topY + (i + j) * cellH;
        // Edge shared with (i+1, j)
        if (i < N - 1 && diff[i][j] !== diff[i + 1][j]) {
          ctx.moveTo(x + cellW, y);
          ctx.lineTo(x, y + cellH);
        }
        // Edge shared with (i, j+1)
        if (j < N - 1 && diff[i][j] !== diff[i][j + 1]) {
          ctx.moveTo(x - cellW, y);
          ctx.lineTo(x, y + cellH);
        }
      }
    }
    ctx.stroke();
  }

  /* ── Bootstrap ───────────────────────────────────────────────────────── */
  function init() {
    var canvas = document.getElementById('hero-dd');
    if (!canvas) return;
    render(canvas);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
