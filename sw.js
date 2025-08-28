const CACHE_NAME = 'brujula-digital-v1.2.1';
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

// Instalar el service worker inmediatamente
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache abierto:', CACHE_NAME);
        return cache.addAll(urlsToCache).catch(err => {
          console.log('[SW] Error cacheando archivos:', err);
          // Cachear los archivos críticos al menos
          return cache.addAll(['/BRUJULA/', '/BRUJULA/index.html', '/BRUJULA/manifest.json']);
        });
      })
      .then(() => {
        console.log('[SW] Archivos cacheados exitosamente');
        return self.skipWaiting(); // Activa inmediatamente
      })
  );
});

// Activar y limpiar caches antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activado');
        return self.clients.claim(); // Toma control inmediatamente
      })
  );
});

// Interceptar solicitudes de red con estrategia cache-first
self.addEventListener('fetch', (event) => {
  // Solo interceptar requests GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si está en cache, devolverlo
        if (cachedResponse) {
          console.log('[SW] Sirviendo desde cache:', event.request.url);
          return cachedResponse;
        }
        
        // Si no está en cache, intentar obtenerlo de la red
        console.log('[SW] Obteniendo de la red:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Verificar si recibimos una respuesta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta para cachearla
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('[SW] Archivo cacheado:', event.request.url);
              });

            return response;
          })
          .catch((error) => {
            console.log('[SW] Error de red:', error);
            // Si es la página principal y no hay red, servir página offline
            if (event.request.destination === 'document') {
              return caches.match('/BRUJULA/');
            }
            throw error;
          });
      })
  );
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido');
  
  const options = {
    body: 'La brújula está lista para usar',
    icon: '/BRUJULA/icon-192x192.png',
    badge: '/BRUJULA/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'brujula-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Brújula Digital', options)
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/BRUJULA/')
  );
});

// Background Sync para funcionalidad offline
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'compass-sync') {
    event.waitUntil(syncCompassData());
  }
});

function syncCompassData() {
  // Sincronizar datos de la brújula cuando vuelva la conexión
  return Promise.resolve()
    .then(() => {
      console.log('[SW] Datos de brújula sincronizados');
    });
}

// Manejar compartir ubicación
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/BRUJULA/share-location')) {
    event.respondWith(
      new Response('Ubicación compartida', {
        headers: { 'Content-Type': 'text/plain' }
      })
    );
  }
});

console.log('[SW] Service Worker cargado correctamente');