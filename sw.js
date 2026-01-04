const CACHE = "fitness-2026-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/db.js",
  "./js/seed.js",
  "./js/ui.js",
  "./js/charts.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      // cache-on-fetch for same-origin GET
      try {
        const url = new URL(req.url);
        if (url.origin === location.origin && req.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, clone));
        }
      } catch {}
      return res;
    }).catch(() => cached))
  );
});

