import { asObject } from '@/lib/shared/unknown';
// Service Worker for Nexus PWA
const CACHE_NAME = 'nexus-v1';

function getString(obj, key, fallback) {
  const v = obj && obj[key];
  if (typeof v === 'string') return v;
  return v == null ? (fallback || '') : String(v);
}

function resolveVibratePattern(behavior) {
  // Android Chrome supports vibration pattern. iOS may ignore.
  if (behavior === 'vibrate' || behavior === 'vibrate_sound') {
    return [30, 40, 30];
  }
  return undefined;
}

function resolveSilent(behavior) {
  // For web push, sound is controlled by OS/browser, but we can hint.
  // When behavior is 'vibrate' we mark silent to avoid sound where possible.
  return behavior === 'vibrate';
}

// Push event - display notification when app is closed
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    const text = event && event.data ? event.data.text() : '';
    payload = asObject(text ? JSON.parse(text) : {}) || {};
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
    icon: '/icon-192.png',
    badge: '/icon-192.png',
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

