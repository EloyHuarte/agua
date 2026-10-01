const CACHE_NAME = "agua-cache-v3.0";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-152.png",
  "./icons/icon-167.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/chiquito-face.png",
  "./sounds/chiquito-grito.mp3",
  "./sounds/chiquito-cobarde.mp3",
  "./sounds/chiquito-cuidadin-quieto.mp3",
  "./sounds/chiquito-hasta-luego-lucas.mp3",
  "./sounds/chiquito-tedacuen.mp3"
];

self.addEventListener("install", (event) => {
  // No se llama a skipWaiting() aquí a propósito: así la nueva versión se queda
  // "esperando" y la app puede avisar al usuario y dejar que decida cuándo actualizar.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  // v2.8: solo se gestiona lo propio de la app (mismo origen y GET). Las peticiones a Google
  // (ranking) NUNCA pasan por la caché; antes se guardaba la 1.ª respuesta y se servía siempre esa.
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (event.request.method === "GET" && response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
