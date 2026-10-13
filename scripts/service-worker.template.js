const VERSION = "__BUILD_VERSION__";
const APP_CACHE = `hanglyph-app-${VERSION}`;
const FONT_CACHE = "hanglyph-fonts-v1";
// Replaced by the build script after asset filenames and data hashes are known.
const PRECACHE = /* __PRECACHE__ */ [];
const APP_FILES = new Set(PRECACHE);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const obsolete = keys.filter(
        (key) =>
          key.startsWith("hanglyph-") && ![APP_CACHE, FONT_CACHE].includes(key),
      );
      const upgrading = obsolete.some((key) => key.startsWith("hanglyph-app-"));
      await Promise.all(obsolete.map((key) => caches.delete(key)));
      await self.clients.claim();
      if (upgrading) {
        // An old page can still reference removed hashed assets. Navigate only on
        // an actual version upgrade, preserving character/text/mode in its URL.
        // Do not await navigation: fetches must wait for activation to finish.
        for (const client of await self.clients.matchAll({ type: "window" })) {
          void client.navigate(client.url).catch(() => undefined);
        }
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (
            !response.ok ||
            !response.headers.get("Content-Type")?.includes("text/html")
          )
            throw new Error("Navigation unavailable");
          return response;
        })
        .catch(() =>
          caches.open(APP_CACHE).then((cache) => cache.match("/index.html")),
        ),
    );
    return;
  }
  if (APP_FILES.has(url.pathname)) {
    event.respondWith(
      caches
        .open(APP_CACHE)
        .then(
          async (cache) => (await cache.match(url.pathname)) ?? fetch(request),
        ),
    );
    return;
  }
  if (url.pathname.startsWith("/fonts/") && url.pathname.endsWith(".woff2")) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        // Immutable same-origin font files are identical across the Vary: Origin
        // request header difference between initial prefetch and browser font loads.
        const cached = await cache.match(request, { ignoreVary: true });
        if (cached) return cached;
        const response = await fetch(request);
        if (
          response.ok &&
          response.headers.get("Content-Type")?.includes("font")
        ) {
          const copy = response.clone();
          event.waitUntil(
            (async () => {
              await cache.put(request, copy);
              const keys = await cache.keys();
              await Promise.all(
                keys
                  .slice(0, Math.max(0, keys.length - 128))
                  .map((key) => cache.delete(key)),
              );
            })(),
          );
        }
        return response;
      }),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_FONTS" || !Array.isArray(event.data.urls))
    return;
  const urls = event.data.urls
    .filter(
      (url) =>
        typeof url === "string" && /^\/fonts\/[a-z0-9-]+\.woff2$/.test(url),
    )
    .slice(0, 8);
  event.waitUntil(
    caches
      .open(FONT_CACHE)
      .then(async (cache) => {
        for (const url of urls) {
          const response = await fetch(url);
          if (
            response.ok &&
            response.headers.get("Content-Type")?.includes("font")
          )
            await cache.put(url, response);
        }
        const keys = await cache.keys();
        await Promise.all(
          keys
            .slice(0, Math.max(0, keys.length - 128))
            .map((key) => cache.delete(key)),
        );
      })
      .catch(() => undefined),
  );
});
