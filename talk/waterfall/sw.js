// Service Worker for Waterfall Talk - Aggressive Precaching
const CACHE_NAME = 'waterfall-talk-v4';

// All assets to precache
const PRECACHE_ASSETS = [
  // Main page
  '/talk/waterfall/',

  // Core JS libraries
  '/js/three.min.js',
  '/js/OrbitControls.js',
  '/js/2025-06-08-q-vol-3d.js',
  '/js/colorschemes.js',
  '/js/slide-engine.js',
  '/js/theme-toggle.js',
  '/js/webgpu-lozenge-engine.js',

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

  // Simulation JS files
  '/talk/waterfall/js/title-sim.js',
  '/talk/waterfall/js/nature-builds-sim.js',
  '/talk/waterfall/js/grid-paths-sim.js',
  '/talk/waterfall/js/random-path-sim.js',
  '/talk/waterfall/js/q-deformation-sim.js',
  '/talk/waterfall/js/q-local-sim.js',
  '/talk/waterfall/js/2to3d-sim.js',
  '/talk/waterfall/js/limit-shape-sim.js',
  '/talk/waterfall/js/energy-sim.js',
  '/talk/waterfall/js/universality-zoom-sim.js',
  '/talk/waterfall/js/q-volume-sim.js',
  '/talk/waterfall/js/q-racah-measure-sim.js',
  '/talk/waterfall/js/q-racah-large-hexagons-sim.js',
  '/talk/waterfall/js/dimensional-collapse-sim.js',
  '/talk/waterfall/js/qracah-ope-sim.js',
  '/talk/waterfall/js/spectral-projection-sim.js',
  '/talk/waterfall/js/vertical-slice-sim.js',
  '/talk/waterfall/js/spectral-transversal-sim.js',
  '/talk/waterfall/js/inter-slice-sim.js',
  '/talk/waterfall/js/why-2-periodic-sim.js',
  '/talk/waterfall/js/barcode-density-sim.js',
  '/talk/waterfall/js/barcode-conjecture-sim.js',
  '/talk/waterfall/js/summary-sim.js',
  '/talk/waterfall/js/thankyou-sim.js',

  // Shared utilities
  '/talk/waterfall/js/shared/wasm-loader.js',
  '/talk/waterfall/js/shared/threejs-setup.js',
  '/talk/waterfall/js/shared/lozenge-utils.js',
  '/talk/waterfall/js/shared/height-function.js',

  // Data files
  '/letters/Rotunda.json',

  // 3D models
  '/talk/waterfall/g.obj',
  '/talk/waterfall/m.obj',
  '/talk/waterfall/u.obj',
  '/talk/waterfall/images/big_shape.obj',

  // Images
  '/talk/waterfall/images/1_4_2-10517.png',
  '/talk/waterfall/images/2_4_1-10516.png',
  '/talk/waterfall/images/2_4_3-10518.png',
  '/talk/waterfall/images/askey-book-cover.png',
  '/talk/waterfall/images/basalt-columns-boyabat-cc-by-sa-3.jpg',
  '/talk/waterfall/images/concentration-large.png',
  '/talk/waterfall/images/concentration-paths.png',
  '/talk/waterfall/images/fig_hexagon_zones.png',
  '/talk/waterfall/images/fig_hexagon_zones.svg',
  '/talk/waterfall/images/fig_lozenge_and_paths.png',
  '/talk/waterfall/images/fig_lozenge_and_paths.svg',
  '/talk/waterfall/images/fig_lozenge_intro.png',
  '/talk/waterfall/images/fig_lozenge_intro.svg',
  '/talk/waterfall/images/frozen_sample.png',
  '/talk/waterfall/images/hexagon.png',
  '/talk/waterfall/images/hypergeometric-book.png',
  '/talk/waterfall/images/nsf-logo.png',
  '/talk/waterfall/images/orthogonal-hierarchy.png',
  '/talk/waterfall/images/q_1.025.png',
  '/talk/waterfall/images/qr-arxiv-2507.22011.png',
  '/talk/waterfall/images/qr-lozenge-draw.png',
  '/talk/waterfall/images/qr-lozenge.png',
  '/talk/waterfall/images/salt-halite-doronenko-cc-by-3.jpg',
  '/talk/waterfall/images/salt-halite-lavinsky-irocks-cc-by-sa-3.jpg',
  '/talk/waterfall/images/salt-micro-public-domain.jpg',
  '/talk/waterfall/images/salt-smooth-deadsea-xta11-cc-by-sa-4.jpg',
  '/talk/waterfall/images/simons-logo.svg',
  '/talk/waterfall/images/waterfall-2d-paths.png',
  '/talk/waterfall/images/waterfall-3d-1.png',
  '/talk/waterfall/images/waterfall-3d-2.png',
  '/talk/waterfall/images/waterfall-3d-3.png',
  '/talk/waterfall/images/waterfall-thin-1.png',
  '/talk/waterfall/images/waterfall-thin-2.png',
];

// Bootstrap is still from CDN (small, not critical for offline)
const CDN_ASSETS = [
  'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.6/css/bootstrap.min.css',
];

// Install: precache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets
      const localPromise = cache.addAll(PRECACHE_ASSETS);

      // Try to cache CDN assets (may fail due to CORS, that's ok)
      const cdnPromise = Promise.allSettled(
        CDN_ASSETS.map(url =>
          fetch(url, { mode: 'cors' })
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            })
            .catch(() => {})
        )
      );

      return Promise.all([localPromise, cdnPromise]);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('waterfall-talk-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first strategy for known assets, network-first for others
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // For local assets and known CDN assets: cache-first
  const isLocalAsset = url.origin === self.location.origin;
  const isKnownCDN = CDN_ASSETS.some(cdn => event.request.url.startsWith(cdn.split('?')[0]));

  if (isLocalAsset || isKnownCDN) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          return cached;
        }
        return fetch(event.request).then(response => {
          // Cache successful responses
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

// Handle messages from the page
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  // Report cache status
  if (event.data === 'getCacheStatus') {
    caches.open(CACHE_NAME).then(cache => {
      cache.keys().then(keys => {
        event.ports[0].postMessage({
          cached: keys.length,
          total: PRECACHE_ASSETS.length
        });
      });
    });
  }
});
