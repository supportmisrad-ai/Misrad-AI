// Service Worker for Nexus PWA
const CACHE_NAME = 'nexus-v1';

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Only cache essential resources, don't fail on errors
        return Promise.allSettled([
          cache.add('/').catch(() => {}),
          cache.add('/login').catch(() => {}),
          cache.add('/manifest.json').catch(() => {})
        ]);
      })
      .catch((err) => {
        console.warn('Service Worker install failed:', err);
      })
  );
  self.skipWaiting();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip service worker for Next.js dev server chunks and HMR
  if (url.pathname.startsWith('/_next/') || 
      url.pathname.startsWith('/_turbopack/') ||
      url.pathname.includes('turbopack') ||
      url.pathname.includes('hmr-client') ||
      url.pathname.includes('[root-of-the-server]') ||
      url.pathname.includes('webpack') ||
      url.pathname.includes('hot-update')) {
    return; // Let browser handle these requests normally
  }
  
  // Skip service worker for API routes and external requests
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }

  // Skip service worker for non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache failed responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            // Cache successful responses for future use
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            });
            
            return response;
          })
          .catch((err) => {
            console.warn('Fetch failed:', err);
            // Return a basic offline page or error response
            return new Response('Offline', { 
              status: 503, 
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
      .catch((err) => {
        console.warn('Cache match failed:', err);
        // Try to fetch from network as fallback
        return fetch(event.request).catch((fetchErr) => {
          console.warn('Network fetch also failed:', fetchErr);
          return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

