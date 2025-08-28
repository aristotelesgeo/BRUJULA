const CACHE_NAME = 'compass-digital-v1.3.0';
const urlsToCache = [
  '/BRUJULA/',
  '/BRUJULA/index.html',
  '/BRUJULA/manifest.json',
  '/BRUJULA/icon-72x72.png',
  '/BRUJULA/icon-96x96.png',
  '/BRUJULA/icon-128x128.png',
  '/BRUJULA/icon-144x144.png',
  '/BRUJULA/icon-152x152.png',
  '/BRUJULA/icon-192x192.png',
  '/BRUJULA/icon-384x384.png',
  '/BRUJULA/icon-512x512.png',
  '/BRUJULA/screenshot-phone.png'
];
const CACHE_NAME = 'compass-digital-v1.5.0'; // Cambia a nueva versión
// Install service worker immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened:', CACHE_NAME);
        return cache.addAll(urlsToCache).catch(err => {
          console.log('[SW] Error caching files:', err);
          // Cache critical files at minimum
          return cache.addAll(['/BRUJULA/', '/BRUJULA/index.html', '/BRUJULA/manifest.json']);
        });
      })
      .then(() => {
        console.log('[SW] Files cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate and clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Intercept network requests with cache-first strategy
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') {
    return;
  }

// AGREGAR ESTA VALIDACIÓN:
  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // If cached, return it
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // If not cached, try to get from network
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response to cache it
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('[SW] File cached:', event.request.url);
              });

            return response;
          })
          .catch((error) => {
            console.log('[SW] Network error:', error);
            // If main page and no network, serve offline page
            if (event.request.destination === 'document') {
              return caches.match('/BRUJULA/');
            }
            throw error;
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: 'The compass is ready to use',
    icon: '/BRUJULA/icon-192x192.png',
    badge: '/BRUJULA/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'compass-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Digital Compass', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/BRUJULA/')
  );
});

// Background Sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'compass-sync') {
    event.waitUntil(syncCompassData());
  }
});

function syncCompassData() {
  // Sync compass data when connection returns
  return Promise.resolve()
    .then(() => {
      console.log('[SW] Compass data synchronized');
    });
}

// Handle location sharing
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/BRUJULA/share-location')) {
    event.respondWith(
      new Response('Location shared', {
        headers: { 'Content-Type': 'text/plain' }
      })
    );
  }
});

console.log('[SW] Service Worker loaded successfully');
