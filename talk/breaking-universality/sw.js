// Service Worker for Breaking Universality Talk — Aggressive Precaching
const CACHE_NAME = 'breaking-universality-talk-v1';

// All local assets to precache
const PRECACHE_ASSETS = [
  // Main page
  '/talk/breaking-universality/',

  // Core JS libraries
  '/js/three.min.js',
  '/js/OrbitControls.js',
  '/js/colorschemes.js',
  '/js/slide-engine.js',
  '/js/theme-toggle.js',
  '/js/2025-06-08-q-vol-3d.js',
  '/js/webgpu-lozenge-engine.js',
  '/js/webgpu-qpartition-engine.js',

  // WASM modules
  '/talk/visual/sim/visual-lozenge.js',
  '/talk/visual/sim/visual-lozenge-threaded.js',
  '/talk/visual/sim/q-partition-cftp.js',
  '/js/2025-12-11-t-embedding-shuffling.js',

  // CSS
  '/css/main.css',
  '/css/slides.css',
  '/css/fontawesome-free-6.2.1-web/css/all.min.css',

  // KaTeX (self-hosted)
  '/katex-0.16.9/katex.min.css',
  '/katex-0.16.9/katex.min.js',
  '/katex-0.16.9/contrib/auto-render.min.js',

  // Fonts (self-hosted)
  '/fonts/unna.css',
  '/fonts/unna-regular.woff2',
  '/fonts/unna-italic.woff2',
  '/fonts/unna-bold.woff2',
  '/fonts/unna-bold-italic.woff2',

  // KaTeX fonts
  '/katex-0.16.9/fonts/KaTeX_AMS-Regular.woff2',
  '/katex-0.16.9/fonts/KaTeX_Caligraphic-Bold.woff2',
  '/katex-0.16.9/fonts/KaTeX_Caligraphic-Regular.woff2',
  '/katex-0.16.9/fonts/KaTeX_Fraktur-Bold.woff2',
  '/katex-0.16.9/fonts/KaTeX_Fraktur-Regular.woff2',
  '/katex-0.16.9/fonts/KaTeX_Main-Bold.woff2',
  '/katex-0.16.9/fonts/KaTeX_Main-BoldItalic.woff2',
  '/katex-0.16.9/fonts/KaTeX_Main-Italic.woff2',
  '/katex-0.16.9/fonts/KaTeX_Main-Regular.woff2',
  '/katex-0.16.9/fonts/KaTeX_Math-BoldItalic.woff2',
  '/katex-0.16.9/fonts/KaTeX_Math-Italic.woff2',
  '/katex-0.16.9/fonts/KaTeX_SansSerif-Bold.woff2',
  '/katex-0.16.9/fonts/KaTeX_SansSerif-Italic.woff2',
  '/katex-0.16.9/fonts/KaTeX_SansSerif-Regular.woff2',
  '/katex-0.16.9/fonts/KaTeX_Script-Regular.woff2',
  '/katex-0.16.9/fonts/KaTeX_Size1-Regular.woff2',
  '/katex-0.16.9/fonts/KaTeX_Size2-Regular.woff2',
  '/katex-0.16.9/fonts/KaTeX_Size3-Regular.woff2',
  '/katex-0.16.9/fonts/KaTeX_Size4-Regular.woff2',
  '/katex-0.16.9/fonts/KaTeX_Typewriter-Regular.woff2',

  // Simulation JS files — Part I
  '/talk/breaking-universality/js/title-sim.js',
  '/talk/breaking-universality/js/2to3d-sim.js',
  '/talk/breaking-universality/js/limit-shape-sim.js',
  '/talk/breaking-universality/js/local-patches-sim.js',
  '/talk/breaking-universality/js/universality-zoom-sim.js',
  '/talk/breaking-universality/js/gff-fluctuations-sim.js',
  '/talk/breaking-universality/js/domino-intro-sim.js',
  '/talk/breaking-universality/js/domino-gff-sim.js',

  // Simulation JS files — Part II
  '/talk/breaking-universality/js/q-volume-sim.js',
  '/talk/breaking-universality/js/q-racah-measure-sim.js',
  '/talk/breaking-universality/js/q-racah-large-hexagons-sim.js',
  '/talk/breaking-universality/js/dimensional-collapse-sim.js',
  '/talk/breaking-universality/js/qracah-ope-sim.js',
  '/talk/breaking-universality/js/spectral-projection-sim.js',
  '/talk/breaking-universality/js/vertical-slice-sim.js',
  '/talk/breaking-universality/js/spectral-transversal-sim.js',
  '/talk/breaking-universality/js/inter-slice-sim.js',
  '/talk/breaking-universality/js/why-2-periodic-sim.js',
  '/talk/breaking-universality/js/barcode-conjecture-sim.js',

  // Simulation JS files — Part III
  '/talk/breaking-universality/js/random-weights-sim.js',
  '/talk/breaking-universality/js/limit-shape-deformation-sim.js',
  '/talk/breaking-universality/js/other-disorder-models-sim.js',
  '/talk/breaking-universality/js/straight-disorder-sim.js',
  '/talk/breaking-universality/js/gamma-disorder-sim.js',

  // Thank You
  '/talk/breaking-universality/waterfall-js/thankyou-sim.js',

  // Letter data (for title + thank you slides)
  '/letters/golden_gate.json',
  '/letters/T.json',
  '/letters/H.json',
  '/letters/A.json',
  '/letters/N.json',
  '/letters/K.json',
  '/letters/Y.json',
  '/letters/O.json',
  '/letters/U.json',

  // Shape data
  '/letters/big_snoflake.json',
  '/letters/shape_for_arctic_small.json',
  '/letters/shape_for_arctic.json',

  // 3D models
  '/talk/breaking-universality/images/big_shape.obj',
  '/talk/waterfall/images/big_shape.obj',

  // Local images
  '/talk/breaking-universality/images/frozen_sample.png',
  '/talk/breaking-universality/images/nonsimplyconn_sample.png',
  '/talk/breaking-universality/images/lozenge_small_sample.png',
  '/talk/breaking-universality/images/hexagon-small-sample.png',
  '/talk/breaking-universality/images/fig_lozenge_and_paths.svg',
  '/talk/breaking-universality/images/nsf-logo.png',
  '/talk/breaking-universality/images/simons-logo.svg',

  // Manifest
  '/talk/breaking-universality/manifest.json',
];

// S3 storage assets (best-effort caching)
const STORAGE_URL = 'https://storage.lpetrov.cc';
const STORAGE_ASSETS = [
  // Part III static images
  '/img/talks/aztec-4-grid-weights.png',
  '/img/talks/bpz_particles.png',
  '/img/talks/bpz_Bernoulli_arctic.png',
  '/img/talks/bpz_cont_uni_arctic.png',

  // Diagonal disorder double-dimer
  '/img/talks/bpz_dd_diagonal_uniform_annealed.png',
  '/img/talks/bpz_dd_diagonal_uniform_quenched.png',

  // Straight disorder
  '/img/talks/bpz_tiling_straight_periodic.png',
  '/img/talks/bpz_tiling_straight_layered.png',
  '/img/talks/bpz_dd_straight_layered_annealed.png',
  '/img/talks/bpz_dd_straight_layered_quenched.png',

  // Gamma disorder tilings
  '/img/talks/bpz_tiling_gamma.png',
  '/img/talks/bpz_tiling_gamma_a1_b1.png',

  // Gamma disorder double-dimer (all parameter combos)
  '/img/talks/bpz_dd_gamma_a0.2_b0.25_annealed.png',
  '/img/talks/bpz_dd_gamma_a0.2_b0.25_quenched.png',
  '/img/talks/bpz_dd_gamma_a0.5_b0.5_annealed.png',
  '/img/talks/bpz_dd_gamma_a0.5_b0.5_quenched.png',
  '/img/talks/bpz_dd_gamma_a1.0_b1.0_annealed.png',
  '/img/talks/bpz_dd_gamma_a1.0_b1.0_quenched.png',
  '/img/talks/bpz_dd_gamma_a2.0_b2.0_annealed.png',
  '/img/talks/bpz_dd_gamma_a2.0_b2.0_quenched.png',
];

// CDN assets
const CDN_ASSETS = [
  'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.6/css/bootstrap.min.css',
];

// Install: precache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const localPromise = cache.addAll(PRECACHE_ASSETS);

      const storagePromise = Promise.allSettled(
        STORAGE_ASSETS.map(path =>
          fetch(STORAGE_URL + path, { mode: 'cors' })
            .then(response => {
              if (response.ok) return cache.put(STORAGE_URL + path, response);
            })
            .catch(() => {})
        )
      );

      const cdnPromise = Promise.allSettled(
        CDN_ASSETS.map(url =>
          fetch(url, { mode: 'cors' })
            .then(response => {
              if (response.ok) return cache.put(url, response);
            })
            .catch(() => {})
        )
      );

      return Promise.all([localPromise, storagePromise, cdnPromise]);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('breaking-universality-talk-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for known assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  const isLocalAsset = url.origin === self.location.origin;
  const isStorage = url.origin === STORAGE_URL;
  const isKnownCDN = CDN_ASSETS.some(cdn => event.request.url.startsWith(cdn.split('?')[0]));

  if (isLocalAsset || isStorage || isKnownCDN) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
  }
});

// Handle messages
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'getCacheStatus') {
    caches.open(CACHE_NAME).then(cache => {
      cache.keys().then(keys => {
        event.ports[0].postMessage({
          cached: keys.length,
          total: PRECACHE_ASSETS.length + STORAGE_ASSETS.length
        });
      });
    });
  }
});
