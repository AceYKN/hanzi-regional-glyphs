const APP_CACHE = "hanglyph-app-v2";
const RUNTIME_CACHE = "hanglyph-runtime-v2";
const SHELL = ["/", "/about", "/manifest.webmanifest", "/favicon.svg", "/index/pinyin.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => ![APP_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => event.request.mode === "navigate" ? caches.match("/") : Response.error())));
});
