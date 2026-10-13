import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
const dist = new URL("../dist/", import.meta.url);
const files = [
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/fonts/fonts.css",
  "/fonts/manifest.json",
  "/index/readings.json",
  "/data/unihan/manifest.json",
];
files.push(
  ...(await readdir(new URL("assets/", dist))).map((file) => `/assets/${file}`),
);
files.push(
  ...(await readdir(new URL("data/unihan/", dist)))
    .filter((file) => file.endsWith(".json") && file !== "manifest.json")
    .map((file) => `/data/unihan/${file}`),
);
const hash = createHash("sha256");
for (const file of files)
  hash.update(await readFile(new URL(file.slice(1), dist)));
const template = await readFile(
  new URL("service-worker.template.js", import.meta.url),
  "utf8",
);
await writeFile(
  new URL("service-worker.js", dist),
  template
    .replace(
      '"__BUILD_VERSION__"',
      JSON.stringify(hash.digest("hex").slice(0, 16)),
    )
    .replace("/* __PRECACHE__ */ []", JSON.stringify(files)),
);
console.log(
  `Generated versioned Service Worker with ${files.length} application files.`,
);
