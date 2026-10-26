// Service worker: keeps the app working without internet.
// Change VERSION whenever app files change, so phones pick up the new version.

const VERSION = "stock-v3";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/app.js",
  "./js/store.js",
  "./js/model.js",
  "./js/format.js",
  "./js/seed.js",
  "./js/ui.js",
  "./js/illus.js",
  "./js/views/stock.js",
  "./js/views/produit.js",
  "./js/views/vente.js",
  "./js/views/arrivage.js",
  "./js/views/acheteurs.js",
  "./js/views/acheteur.js",
  "./js/views/journal.js",
  "./js/views/reglages.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// GitHub Pages lets browsers reuse a file for 10 minutes. "reload" skips that, so a new version
// never stores the previous version's files.
self.addEventListener("install", (event) => {
  const fresh = SHELL.map((url) => new Request(url, { cache: "reload" }));
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "fonts").map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // The Manrope font: serve from cache, refresh in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open("fonts").then(async (cache) => {
        const cached = await cache.match(request);
        const fresh = fetch(request).then((response) => {
          if (response.ok || response.type === "opaque") cache.put(request, response.clone());
          return response;
        }).catch(() => cached);
        return cached ?? fresh;
      }),
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // App files: cache first, update in the background, fall back to the app shell offline.
  // The background update revalidates with the server instead of trusting the browser's own cache.
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const fresh = fetch(request.mode === "navigate" ? request.url : request, { cache: "no-cache" }).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => cached ?? cache.match("./index.html"));
      return cached ?? fresh;
    }),
  );
});
