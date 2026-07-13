const CACHE_NAME = 'meshsrp-v2';

// tutto cio' che serve per far partire l'interfaccia senza rete.
// le librerie da CDN sono incluse: una volta scaricate la prima volta
// restano in cache e l'app si apre anche senza internet.
const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/tweetnacl/1.0.2/nacl.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Strategia differenziata:
// - file dell'app (stesso dominio: index.html, app.js, app.css, ...) -> NETWORK-FIRST,
//   cosi' un aggiornamento dell'app si vede subito appena c'e' rete, senza dover
//   cancellare manualmente la cache del sito. Se sei offline, si usa la cache.
// - librerie esterne da CDN (tweetnacl, Leaflet) -> CACHE-FIRST, cambiano di rado
//   e cosi' risparmiamo banda; funzionano comunque offline una volta scaricate.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isSameOrigin = new URL(event.request.url).origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        });
      })
    );
  }
});
