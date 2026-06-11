/* sw.js
   Service Worker for World Nexus
   Implements caching for static resources, datasets, and fonts.
*/

const CACHE_NAME = 'world-nexus-v1.1.0';

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './favicon.svg',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/animations.css',
  './css/responsive.css',
  './css/mobileUI.css',
  './css/components/card.css',
  './css/components/button.css',
  './css/components/tags.css',
  './css/components/modal.css',
  './css/components/search.css',
  './js/app.js',
  './js/core/Router.js',
  './js/core/EventBus.js',
  './js/core/StateManager.js',
  './js/core/Loader.js',
  './js/core/Cache.js',
  './js/ui/SvgAnimator.js',
  './js/ui/BackgroundEffect.js',
  './js/ui/Lightbox.js',
  './js/ui/CustomScrollbar.js',
  './js/pages/LandingPage.js',
  './js/pages/WorldPage.js',
  './js/pages/BotPage.js',
  './js/services/SearchService.js',
  './js/services/WorldService.js',
  './js/services/BotService.js',
  './js/services/LoreService.js',
  './js/services/ToolService.js',
  './js/ui/WorldCard.js',
  './js/ui/BotCard.js',
  './js/ui/ToolCard.js',
  './js/ui/HoverPreview.js',
  './js/ui/LazyLoader.js',
  './js/ui/Modal.js',
  './js/ui/Search.js',
  './js/ui/ThemeLoader.js',
  './js/ui/GridManager.js',
  './js/ui/Filter.js',
  './js/ui/Breadcrumbs.js',
  './js/ui/BotProfileView.js',
  './js/ui/BotPanel.js',
  './js/utils/Device.js',
  './js/utils/DOM.js',
  './data/config.json',
  './data/tools.json',
  './Worlds/WorldList.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static core grid...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event (Cleanup Old Caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Purging stale cache grid:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Avoid intercepting POST, PUT, DELETE or API calls from external platforms like Joyland
  if (event.request.method !== 'GET' || url.hostname.includes('api.joyland.ai') || url.hostname.includes('api.joyland')) {
    return;
  }

  // 1. Cache-First Strategy for Web Fonts & Bootstrap Icons
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 2. Stale-While-Revalidate Strategy for local files, JSON, styles, scripts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fetch failed, return fallback if available (offline support)
      });

      return cachedResponse || fetchPromise;
    })
  );
});
