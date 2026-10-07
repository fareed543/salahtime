// v3: pages are prerendered per URL, so only the bare /index.html shell is the offline page.
const CACHE_NAME = 'salahtime-shell-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

// Angular build output has a content hash in the name (main.1a2b3c4d5e6f7a8b.js), so it never changes.
const HASHED_FILE = /\.[0-9a-f]{16,}\.(?:css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/i;
const STATIC_FILE = /\.(?:css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/i;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

const cacheResponse = (request, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
  }
  return response;
};

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Each URL has its own prerendered page, so keep the bare app shell as the offline page
          // (refreshed in the background) instead of storing whichever page was visited.
          if (response.ok) {
            fetch('/index.html')
              .then(shell => cacheResponse('/index.html', shell))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (HASHED_FILE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => cacheResponse(request, response)))
    );
    return;
  }

  // Unhashed files (assets/css/app.css, images, icons) keep their URL across releases:
  // fetch fresh copies and fall back to the cache only when offline.
  if (STATIC_FILE.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then(response => cacheResponse(request, response))
        .catch(() => caches.match(request))
    );
  }
});
