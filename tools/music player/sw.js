/**
 * Nexus Player — Service Worker
 * Caches: player HTML, thumbnails, Piped API responses
 *
 * Strategy:
 *   - HTML shell   → Cache-first (stale-while-revalidate)
 *   - Piped API    → Network-first, fallback to cache (5-min TTL)
 *   - Thumbnails   → Cache-first (long TTL, they never change)
 */

const CACHE_NAME    = 'nexus-player-v2';
const API_CACHE     = 'nexus-api-v1';
const THUMB_CACHE   = 'nexus-thumbs-v1';
const API_TTL_MS    = 5 * 60 * 1000;   // 5 minutes for stream URLs

// Assets to precache on install
const PRECACHE = [
    './mw.html',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
    );
    self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME && k !== API_CACHE && k !== THUMB_CACHE)
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle GET
    if (request.method !== 'GET') return;

    // 1. Piped API responses (streams + search) — network-first, cache fallback
    if (isPipedAPI(url)) {
        event.respondWith(networkFirstWithTTL(request, API_CACHE, API_TTL_MS));
        return;
    }

    // 2. YouTube / img.youtube.com thumbnails — cache-first (immutable)
    if (url.hostname === 'img.youtube.com'
        || url.pathname.includes('hqdefault')
        || url.pathname.includes('mqdefault')) {
        event.respondWith(cacheFirst(request, THUMB_CACHE));
        return;
    }

    // 3. Player HTML shell — stale-while-revalidate
    if (url.pathname.endsWith('mw.html') || url.pathname === '/') {
        event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
        return;
    }

    // Everything else — pass through
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function isPipedAPI(url) {
    const PIPED_HOSTS = [
        'pipedapi.kavin.rocks',
        'pipedapi.adminforge.de',
        'piped-api.garudalinux.org',
        'api.piped.yt',
        'pipedapi.tokhmi.xyz',
        'piped.smnz.de',
        'piped.video',
    ];
    return PIPED_HOSTS.some(h => url.hostname === h);
}

async function networkFirstWithTTL(request, cacheName, ttlMs) {
    try {
        const networkRes = await fetch(request.clone());
        if (networkRes.ok) {
            const cache = await caches.open(cacheName);
            // Attach timestamp header for TTL checking
            const headers = new Headers(networkRes.headers);
            headers.set('x-sw-cached-at', Date.now().toString());
            const stamped = new Response(await networkRes.clone().blob(), {
                status: networkRes.status,
                statusText: networkRes.statusText,
                headers,
            });
            cache.put(request, stamped);
        }
        return networkRes;
    } catch {
        // Network failed — try cache
        const cache   = await caches.open(cacheName);
        const cached  = await cache.match(request);
        if (cached) {
            const ts = parseInt(cached.headers.get('x-sw-cached-at') || '0', 10);
            if (Date.now() - ts < ttlMs) return cached;
            // Cache is stale; delete and let it fail naturally
            cache.delete(request);
        }
        return new Response(JSON.stringify({ error: 'Offline and no cached data' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

async function cacheFirst(request, cacheName) {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
    } catch {
        return new Response('', { status: 408 });
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);
    const fetchPromise = fetch(request).then(res => {
        if (res.ok) cache.put(request, res.clone());
        return res;
    }).catch(() => null);
    return cached || fetchPromise;
}
