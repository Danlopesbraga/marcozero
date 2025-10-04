const CACHE_NAME = "pwa-cache-v2.0";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/static/css/style.css",
  "/static/js/script.js",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
