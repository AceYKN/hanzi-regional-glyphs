import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${encodeURIComponent(pathname)}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the product landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /字形 — 汉字地区字形对照/);
  assert.match(html, /看见同一个字/);
  assert.match(html, /大陆/);
  assert.match(html, /台湾/);
  assert.match(html, /香港/);
  assert.match(html, /日本/);
  assert.match(html, /新加坡/);
  assert.match(html, /马来西亚/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("server-renders a canonical character URL", async () => {
  const response = await render(`/char/${encodeURIComponent("发")}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /发 — 大陆、台湾、香港、日本字形比较/);
  assert.match(html, /發/);
  assert.match(html, /髮/);
});

test("PWA and security assets are present", async () => {
  const [manifest, serviceWorker, headers] = await Promise.all([
    readFile(new URL("public/manifest.webmanifest", root), "utf8"),
    readFile(new URL("public/service-worker.js", root), "utf8"),
    readFile(new URL("public/_headers", root), "utf8"),
  ]);
  assert.match(manifest, /"display": "standalone"/);
  assert.match(serviceWorker, /hanglyph-app-v1/);
  assert.match(headers, /Content-Security-Policy/);
});
