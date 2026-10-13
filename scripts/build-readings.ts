import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { parsePinyin } from "../src/lib/query.ts";
import { mandarin, type UnihanRecord } from "../src/lib/data.ts";
import { toRomaji, toHiragana } from "wanakana";
const root = new URL("../public/", import.meta.url);
const pinyin: Record<string, Set<string>> = {};
const japanese: Record<string, Set<string>> = {};
function add(index: Record<string, Set<string>>, key: string, char: string) {
  (index[key] ??= new Set()).add(char);
}
const common = Array.from(
  "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经见骨古谷故顾鼓东冬懂京令直龙雨欢迎食髮發國龍東",
);
const rank = new Map(common.map((char, index) => [char, index]));
for (const file of (await readdir(new URL("data/unihan/", root))).filter(
  (file) => file.endsWith(".json") && file !== "manifest.json",
)) {
  const data = JSON.parse(
    await readFile(new URL(`data/unihan/${file}`, root), "utf8"),
  );
  for (const [cp, record] of Object.entries(data.entries) as [
    string,
    UnihanRecord,
  ][]) {
    const char = String.fromCodePoint(Number.parseInt(cp, 16));
    for (const reading of mandarin(record)) {
      const parsed = parsePinyin(reading);
      if (!parsed) continue;
      add(pinyin, parsed.syllable, char);
      add(pinyin, `${parsed.syllable}${parsed.tone ?? 5}`, char);
    }
    for (const reading of `${record.kJapaneseOn ?? ""} ${record.kJapaneseKun ?? ""}`
      .trim()
      .split(/\s+/)
      .filter(Boolean)) {
      const key = toRomaji(toHiragana(reading.toLowerCase())).toLowerCase();
      add(japanese, key, char);
    }
  }
}
function serialize(index: Record<string, Set<string>>) {
  return Object.fromEntries(
    Object.entries(index)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, chars]) => [
        key,
        [...chars]
          .sort(
            (a, b) =>
              (rank.get(a) ?? 100000 + a.codePointAt(0)!) -
              (rank.get(b) ?? 100000 + b.codePointAt(0)!),
          )
          .join(""),
      ]),
  );
}
await mkdir(new URL("index/", root), { recursive: true });
await writeFile(
  new URL("index/readings.json", root),
  JSON.stringify({
    version: "unihan-17.0.0",
    pinyin: serialize(pinyin),
    japanese: serialize(japanese),
  }) + "\n",
);
console.log(
  `Generated ${Object.keys(pinyin).length} pinyin and ${Object.keys(japanese).length} Japanese reading keys.`,
);
