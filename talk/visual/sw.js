// Service Worker for Visual Talk — Aggressive Precaching
const CACHE_NAME = 'visual-talk-v2';

// All assets to precache
const PRECACHE_ASSETS = [
  // Main page
  '/talk/visual/',

  // Core JS libraries
  '/js/three.min.js',
  '/js/OrbitControls.js',
  '/js/colorschemes.js',
  '/js/slide-engine.js',
  '/js/theme-toggle.js',
  '/js/webgpu-qpartition-engine.js',
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

  // Simulation JS files — Part I
  '/talk/visual/js/title-sim.js',
  '/talk/visual/js/nature-builds-sim.js',
  '/talk/visual/js/grid-paths-sim.js',
  '/talk/visual/js/random-path-sim.js',
  '/talk/visual/js/fluctuations-gaussian-sim.js',
  '/talk/visual/js/q-deformation-sim.js',
  '/talk/visual/js/q-limit-shape-sim.js',
  // Simulation JS files — Part II
  '/talk/visual/js/2to3d-sim.js',
  '/talk/visual/js/limit-shape-sim.js',
  '/talk/visual/js/energy-sim.js',
  '/talk/visual/js/gff-simplified-sim.js',
  '/talk/visual/js/q-volume-visual-sim.js',

  // Simulation JS files — Part III
  '/talk/visual/js/glauber-dynamics-sim.js',
  '/talk/visual/js/cftp-sim.js',
  '/talk/visual/js/hard-to-sample-sim.js',

  // Shared utilities
  '/talk/visual/js/shared/wasm-loader.js',
  '/talk/visual/js/shared/threejs-setup.js',
  '/talk/visual/js/shared/lozenge-utils.js',
  '/talk/visual/js/shared/height-function.js',

  // Letter data (for THANK YOU slide)
  '/letters/Rotunda.json',
  '/letters/T.json',
  '/letters/H.json',
  '/letters/A.json',
  '/letters/N.json',
  '/letters/K.json',
  '/letters/Y.json',
  '/letters/O.json',
  '/letters/U.json',

  // 3D models
  '/talk/visual/images/big_shape.obj',

  // Images
  '/talk/visual/images/frozen_sample.png',
  '/talk/visual/images/hexagon.png',
  '/talk/visual/images/nsf-logo.png',
  '/talk/visual/images/q_1.025.png',
  '/talk/visual/images/qr-lozenge-draw.png',
  '/talk/visual/images/simons-logo.svg',
  '/talk/visual/images/salt-halite-doronenko-cc-by-3.jpg',
  '/talk/visual/images/salt-halite-lavinsky-irocks-cc-by-sa-3.jpg',
  '/talk/visual/images/salt-micro-public-domain.jpg',
  '/talk/visual/images/salt-smooth-deadsea-xta11-cc-by-sa-4.jpg',

  // Manifest
  '/talk/visual/manifest.json',
];

// CDN assets (best-effort caching)
const CDN_ASSETS = [
  'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.6/css/bootstrap.min.css',
];

// Install: precache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const localPromise = cache.addAll(PRECACHE_ASSETS);

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
          .filter(name => name.startsWith('visual-talk-') && name !== CACHE_NAME)
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
  const isKnownCDN = CDN_ASSETS.some(cdn => event.request.url.startsWith(cdn.split('?')[0]));

  if (isLocalAsset || isKnownCDN) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          return cached;
        }
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
          total: PRECACHE_ASSETS.length
        });
      });
    });
  }
});
