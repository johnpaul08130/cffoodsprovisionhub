// ============================================================
// ProvisionHub - Service Worker (Basic Offline Support)
// ============================================================

const CACHE_NAME = 'provisionhub-v1';
const OFFLINE_URL = 'offline.html';

// Core files to cache for offline use
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/pos.html',
  '/products.html',
  '/inventory.html',
  '/sales.html',
  '/users.html',
  '/offline.html',
  '/assets/css/style.css',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/layout.js',
  '/js/products.js',
  '/js/inventory.js',
  '/js/pos.js',
  '/manifest.json',
  // CDN fallbacks are harder; we cache what we can
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
];

// Install – cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core assets');
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate – clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and Firebase/Google API calls (let them go to network)
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebasestorage.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('securetoken.googleapis.com')) {
    return; // Network only for Firebase
  }

  // HTML pages: Network first, fall back to cache, then offline page
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Other assets: Cache first, fall back to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Optional: return a fallback for images etc.
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});