// Service Worker for ESI Waterfall Talk — Aggressive Precaching
const CACHE_NAME = 'esi-waterfall-talk-v22';

// All local assets to precache
const PRECACHE_ASSETS = [
  // Main page
  '/talk/esi-waterfall/',

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

  // Simulation JS files — Title
  '/talk/esi-waterfall/js/title-rotunda-sim.js',

  // Simulation JS files — Part I
  '/talk/esi-waterfall/js/2to3d-sim.js',
  '/talk/esi-waterfall/js/limit-shape-sim.js',
  '/talk/esi-waterfall/js/local-patches-sim.js',
  '/talk/esi-waterfall/js/universality-zoom-sim.js',

  // Simulation JS files — Part II
  '/talk/esi-waterfall/js/q-volume-sim.js',
  '/talk/esi-waterfall/js/q-racah-measure-sim.js',
  '/talk/esi-waterfall/js/q-racah-large-hexagons-sim.js',
  '/talk/esi-waterfall/js/dimensional-collapse-sim.js',
  '/talk/esi-waterfall/js/qracah-ope-sim.js',
  '/talk/esi-waterfall/js/spectral-projection-sim.js',
  '/talk/esi-waterfall/js/vertical-slice-sim.js',
  '/talk/esi-waterfall/js/spectral-transversal-sim.js',
  '/talk/esi-waterfall/js/inter-slice-sim.js',
  '/talk/esi-waterfall/js/why-2-periodic-sim.js',
  '/talk/esi-waterfall/js/barcode-conjecture-sim.js',
  '/talk/esi-waterfall/js/barcode-cf-densities-sim.js',

  // Simulation JS files — Part IV (sampling)
  '/talk/esi-waterfall/js/sampling-cftp-sim.js',
  '/talk/esi-waterfall/js/sampling-shuffling-sim.js',
  '/talk/esi-waterfall/js/wip-factorial-sim.js',
  '/js/factorial-ybe-worker.js',
  '/js/factorial-ybe-wasm.js',
  '/talk/visual/sim/qracah-coupled.js',

  // Thank You
  '/talk/esi-waterfall/js/thankyou-sim.js',

  // Letter data (for title + thank you slides)
  '/letters/Rotunda.json',
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
  '/talk/esi-waterfall/images/big_shape.obj',

  // Local images
  '/talk/esi-waterfall/images/person-knizel.jpg',
  '/talk/esi-waterfall/images/person-li.jpg',
  '/talk/esi-waterfall/images/lozenge_small_sample.png',
  '/talk/esi-waterfall/images/hexagon-small-sample.png',
  '/talk/esi-waterfall/images/fig_lozenge_and_paths.svg',
  '/talk/esi-waterfall/images/nsf-logo.png',
  '/talk/esi-waterfall/images/simons-logo.svg',
  '/talk/esi-waterfall/images/qr-lozenge.svg',
  '/talk/esi-waterfall/images/details-concentration-paths.png',

  // Manifest
  '/talk/esi-waterfall/manifest.json',
];

// S3 storage assets (best-effort caching)
const STORAGE_URL = 'https://storage.lpetrov.cc';
const STORAGE_ASSETS = [];

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
          .filter(name => name.startsWith('esi-waterfall-talk-') && name !== CACHE_NAME)
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
