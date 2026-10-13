import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { convertRegionalForms } from "../src/lib/regional.ts";
import {
  parseCharacters,
  parsePinyin,
  findCandidates,
  type SearchIndex,
} from "../src/lib/query.ts";
import { mandarin, variants } from "../src/lib/data.ts";
import { readPreference, savePreference } from "../src/lib/preferences.ts";
const root = new URL("../", import.meta.url);
const index = JSON.parse(
  await readFile(new URL("public/index/readings.json", root), "utf8"),
) as SearchIndex;

test("parses supplementary ideographs, rejects invalid scalars and IVS, and bounds text", () => {
  assert.deepEqual(parseCharacters("𠮷 骨 骨"), { chars: ["𠮷", "骨"] });
  assert.deepEqual(parseCharacters("U+20BB7"), { chars: ["𠮷"] });
  assert.deepEqual(parseCharacters("U+33479"), {
    chars: [String.fromCodePoint(0x33479)],
  });
  for (const value of [
    "U+D800",
    "U+110000",
    "U+0041",
    "U+ZZZZ",
    "骨\u{E0100}",
    "骨".repeat(2001),
  ])
    assert.ok(parseCharacters(value).error, value);
});
test("keeps tones and ü across composed, decomposed, numeric and u: spelling", () => {
  assert.deepEqual(parsePinyin("lǜ"), { syllable: "lv", tone: 4 });
  assert.deepEqual(parsePinyin("lǜ"), { syllable: "lv", tone: 4 });
  assert.deepEqual(parsePinyin("lu:4"), { syllable: "lv", tone: 4 });
  assert.deepEqual(parsePinyin("gu1"), { syllable: "gu", tone: 1 });
  assert.deepEqual(parsePinyin("gǔ"), { syllable: "gu", tone: 3 });
  assert.equal(parsePinyin("gǔ1"), null);
  assert.equal(parsePinyin("gu9"), null);
});
test("searches authoritative readings without stripping tone or truncating candidates", () => {
  assert.ok(findCandidates(index, "gu3").includes("古"));
  assert.ok(!findCandidates(index, "gu1").includes("古"));
  assert.deepEqual(findCandidates(index, "lǜ"), findCandidates(index, "lǜ"));
  assert.ok(findCandidates(index, "gu").length > 60);
  assert.ok(findCandidates(index, "koku", true).includes("國"));
  assert.ok(findCandidates(index, "hone", true).includes("骨"));
  assert.deepEqual(findCandidates(index, "gu9"), []);
  assert.deepEqual(findCandidates(index, "constructor"), []);
});
test("converts the actual production function with explicit source and preserves hair meaning", () => {
  assert.equal(convertRegionalForms("见", "cn").tw, "見");
  assert.equal(convertRegionalForms("髮", "t").jp, "髪");
  assert.equal(convertRegionalForms("髮", "t").tw, "髮");
  assert.equal(convertRegionalForms("竜", "jp").tw, "龍");
  assert.equal(convertRegionalForms("皇后", "cn").tw, "皇后");
});
test("keeps missing data distinct from no variants and preserves all recorded readings", async () => {
  const data = JSON.parse(
    await readFile(new URL("public/data/unihan/5.json", root), "utf8"),
  );
  assert.deepEqual(variants(data.entries["53D1"].kTraditionalVariant), [
    "發",
    "髮",
  ]);
  const bones = JSON.parse(
    await readFile(new URL("public/data/unihan/9.json", root), "utf8"),
  ).entries["9AA8"];
  assert.ok(mandarin(bones).includes("gǔ"));
  assert.ok(mandarin(bones).includes("gū"));
  assert.deepEqual(mandarin(null), []);
});
test("preferences safely degrade when storage is blocked", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("blocked");
    },
  });
  try {
    assert.equal(readPreference("theme", "system", ["light"]), "system");
    assert.doesNotThrow(() => savePreference("theme", "light"));
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
