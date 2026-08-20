import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import OpenCC from "opencc-js";

const root = new URL("../", import.meta.url);

function regionalForms(input) {
  const toTraditional = OpenCC.Converter({ from: "cn", to: "t" });
  const japaneseToTraditional = OpenCC.Converter({ from: "jp", to: "t" });
  const traditional = japaneseToTraditional(toTraditional(input));
  return {
    cn: OpenCC.Converter({ from: "t", to: "cn" })(traditional),
    tw: OpenCC.Converter({ from: "t", to: "tw" })(traditional),
    hk: OpenCC.Converter({ from: "t", to: "hk" })(traditional),
    jp: OpenCC.Converter({ from: "t", to: "jp" })(traditional),
  };
}

test("builds a static Cloudflare Pages site", async () => {
  const html = await readFile(new URL("dist/index.html", root), "utf8");
  assert.match(html, /字形 — 汉字地区写法与字形对照/);
  assert.match(html, /<div id="root"><\/div>/);
  await Promise.all([
    access(new URL("dist/_headers", root)),
    access(new URL("dist/_redirects", root)),
    access(new URL("dist/service-worker.js", root)),
    access(new URL("dist/index/pinyin.json", root)),
  ]);
});

test("converts characters before regional glyph rendering", () => {
  assert.deepEqual(regionalForms("见"), { cn: "见", tw: "見", hk: "見", jp: "見" });
  assert.deepEqual(regionalForms("東"), { cn: "东", tw: "東", hk: "東", jp: "東" });
  assert.equal(regionalForms("國").jp, "国");
  assert.equal(regionalForms("龍").jp, "竜");
});

test("provides broad pinyin candidates with useful ordering", async () => {
  const index = JSON.parse(await readFile(new URL("public/index/pinyin.json", root), "utf8"));
  assert.ok(Object.keys(index.entries).length >= 400);
  assert.match(index.entries.gu.slice(0, 20), /骨/);
  assert.match(index.entries.jian.slice(0, 20), /见/);
  assert.match(index.entries.dong.slice(0, 20), /东/);
});
