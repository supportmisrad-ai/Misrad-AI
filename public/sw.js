// Service Worker for MISRAD AI PWA
const CACHE_NAME = 'misrad-ai-v4';

// Capacitor WebView sets a stable hostname (app.misrad-ai.com).
// Skip SW caching entirely for Capacitor — it proxies to the live server anyway,
// and SW overhead adds latency without benefit in a native WebView context.
const isCapacitorWebView = self.location.hostname === 'app.misrad-ai.com';

function getString(obj, key, fallback) {
  const v = obj && obj[key];
  if (typeof v === 'string') return v;
  return v == null ? (fallback || '') : String(v);
}

function asObject(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  return undefined;
}

function resolveVibratePattern(behavior) {
  if (behavior === 'vibrate' || behavior === 'vibrate_sound') {
    return [30, 40, 30];
  }
  return undefined;
}

function resolveSilent(behavior) {
  return behavior === 'vibrate';
}

// Push event - display notification when app is closed
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    const text = event && event.data ? event.data.text() : '';
    const parsed = text ? JSON.parse(text) : {};
    payload = asObject(parsed) || {};
  } catch {
    payload = {};
  }

  const title = getString(payload, 'title', 'Misrad AI');
  const body = getString(payload, 'body', '');
  const url = getString(payload, 'url', '/');
  const tag = getString(payload, 'tag', 'misrad-push');
  const behavior = getString(payload, 'behavior', 'vibrate_sound');

  const options = {
    body,
    icon: '/icons/misrad-maskable-192.png',
    badge: '/icons/misrad-maskable-192.png',
    tag,
    data: {
      url,
    },
    requireInteraction: true,
    silent: resolveSilent(behavior),
    vibrate: resolveVibratePattern(behavior),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle click on notification
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification && notification.data ? notification.data : {};
  const url = data && data.url ? String(data.url) : '/';

  notification.close();

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clientsArr) {
        try {
          if (c && 'focus' in c) {
            await c.focus();
            if ('navigate' in c) {
              await c.navigate(url);
            }
            return;
          }
        } catch {
          // ignore
        }
      }
      if (self.clients && self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Only cache essential resources, don't fail on errors
        return Promise.allSettled([
          cache.add('/me').catch(() => {}),
          cache.add('/login').catch(() => {}),
          cache.add('/offline').catch(() => {}),
          cache.add('/manifest.json').catch(() => {}),
          cache.add('/icons/misrad-maskable-192.png').catch(() => {})
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
  // In Capacitor WebView, skip SW entirely — native proxy handles all requests
  if (isCapacitorWebView) return;

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
  
  // Skip service worker for API routes, external requests, and dynamic HTML pages
  if (url.pathname.startsWith('/api/') || 
      url.origin !== self.location.origin ||
      // NEVER cache dynamic pages that require auth - they cause stale data issues
      url.pathname.startsWith('/w/') ||
      url.pathname.startsWith('/workspaces/') ||
      url.pathname.startsWith('/me') ||
      url.pathname === '/login' ||
      url.pathname.startsWith('/login/') ||
      url.pathname === '/client' ||
      url.pathname.startsWith('/client/') ||
      url.pathname === '/system' ||
      url.pathname.startsWith('/system/') ||
      url.pathname === '/nexus' ||
      url.pathname.startsWith('/nexus/') ||
      url.pathname === '/operations' ||
      url.pathname.startsWith('/operations/') ||
      url.pathname === '/social' ||
      url.pathname.startsWith('/social/') ||
      url.pathname === '/finance' ||
      url.pathname.startsWith('/finance/')) {
    return;
  }

  // Skip service worker for non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const isNavigationRequest =
    event.request.mode === 'navigate' ||
    (event.request.headers && String(event.request.headers.get('accept') || '').includes('text/html'));

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
            // Navigation fallback: show offline page from cache
            if (isNavigationRequest) {
              return caches.match('/offline').then((offline) => {
                if (offline) return offline;
                return new Response('Offline', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/plain' },
                });
              });
            }

            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
      .catch((err) => {
        console.warn('Cache match failed:', err);
        // Try to fetch from network as fallback
        return fetch(event.request).catch((fetchErr) => {
          console.warn('Network fetch also failed:', fetchErr);
          if (isNavigationRequest) {
            return caches.match('/offline').then((offline) => {
              if (offline) return offline;
              return new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' },
              });
            });
          }

          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
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

