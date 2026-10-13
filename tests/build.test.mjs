import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url);
const worker = await readFile(new URL("dist/service-worker.js", root), "utf8");
test("ships the app, data and pinned local fonts without external font requests", async () => {
  const html = await readFile(new URL("dist/index.html", root), "utf8");
  assert.ok(!html.includes("fonts.googleapis.com"));
  const fonts = JSON.parse(
    await readFile(new URL("public/fonts/manifest.json", root), "utf8"),
  );
  assert.equal(Object.keys(fonts.fonts).length, 8);
  for (const entry of Object.values(fonts.fonts)) {
    assert.ok(entry.coverage.includes(0x9aa8));
    await Promise.all(
      entry.files.map(async (file) => {
        await access(new URL(`dist/fonts/${file}`, root));
        const hash = createHash("sha256")
          .update(await readFile(new URL(`dist/fonts/${file}`, root)))
          .digest("hex")
          .slice(0, 12);
        assert.equal(hash, file.match(/-([a-f0-9]{12})\.woff2$/)[1]);
      }),
    );
  }
  assert.match(worker, /\/assets\/regional-/);
  assert.match(worker, /\/index\/readings.json/);
  assert.ok(!worker.includes("__BUILD_VERSION__"));
});
function environment(
  network = async () =>
    new Response("new-html", { headers: { "Content-Type": "text/html" } }),
) {
  const events = {};
  const stores = new Map();
  const deleted = [];
  const caches = {
    keys: async () => [
      "other-app",
      "hanglyph-app-v2",
      "hanglyph-runtime-v2",
      ...stores.keys(),
    ],
    delete: async (key) => {
      deleted.push(key);
      return true;
    },
    open: async (key) => {
      if (!stores.has(key)) stores.set(key, new Map());
      const map = stores.get(key);
      return {
        addAll: async (urls) => {
          urls.forEach((url) => map.set(url, new Response("offline-shell")));
        },
        match: async (key) => map.get(typeof key === "string" ? key : key.url),
        put: async (key, value) =>
          map.set(typeof key === "string" ? key : key.url, value),
        keys: async () => [...map.keys()],
        delete: async (key) => map.delete(key),
      };
    },
  };
  vm.runInNewContext(worker, {
    self: {
      location: { origin: "https://example.test" },
      addEventListener: (type, fn) => (events[type] = fn),
      skipWaiting: async () => {},
      clients: { claim: async () => {}, matchAll: async () => [] },
    },
    caches,
    fetch: network,
    URL,
    Response,
  });
  return { events, caches, deleted };
}
async function dispatch(env, type, input = {}) {
  let pending, response;
  env.events[type]({
    ...input,
    waitUntil: (promise) => (pending = promise),
    respondWith: (promise) => (response = promise),
  });
  await pending;
  return response ? await response : undefined;
}
test("fresh navigations reach the network and offline routes use the complete shell", async () => {
  const online = environment();
  await dispatch(online, "install");
  const response = await dispatch(online, "fetch", {
    request: {
      method: "GET",
      url: "https://example.test/char/%E9%AA%A8",
      mode: "navigate",
    },
  });
  assert.equal(await response.text(), "new-html");
  const offline = environment(async () => {
    throw new Error("offline");
  });
  await dispatch(offline, "install");
  const fallback = await dispatch(offline, "fetch", {
    request: {
      method: "GET",
      url: "https://example.test/char/%E9%AA%A8",
      mode: "navigate",
    },
  });
  assert.equal(await fallback.text(), "offline-shell");
});
test("cleans only owned obsolete caches and ignores foreign requests", async () => {
  const env = environment();
  await dispatch(env, "install");
  await dispatch(env, "activate");
  assert.ok(env.deleted.includes("hanglyph-app-v2"));
  assert.ok(!env.deleted.includes("other-app"));
  assert.equal(
    await dispatch(env, "fetch", {
      request: { method: "GET", url: "https://other.test/font.woff2" },
    }),
    undefined,
  );
});
