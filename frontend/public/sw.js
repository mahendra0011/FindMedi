const CACHE_NAME = 'findmedi-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.png',
  '/logo.png',
  '/favicon.png',
];

// Document 15 §3: Personal & PHI APIs must NEVER be stored in Service Worker cache.
const PHI_API_PATTERNS = [
  '/api/users',
  '/api/patient',
  '/api/records',
  '/api/prescriptions',
  '/api/vitals',
  '/api/bookings',
  '/api/orders',
  '/api/auth',
  '/api/payments',
  '/api/instant-dispatch',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Navigation requests fallback to offline.html if network fails
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // 2. Personal / PHI API: Network-only (no cache)
  if (PHI_API_PATTERNS.some((pattern) => url.pathname.startsWith(pattern))) {
    event.respondWith(fetch(request));
    return;
  }

  // 3. Public static API (categories/cities): Stale-while-revalidate
  if (url.pathname.startsWith('/api/categories/public') || url.pathname.startsWith('/api/service-cities')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(request)
          .then((res) => {
            if (res.status === 200) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cache.match(request))
      )
    );
    return;
  }

  // 4. Other API requests: Network-only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // 5. Static assets: Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.status === 200 && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg'))) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      });
    })
  );
});
