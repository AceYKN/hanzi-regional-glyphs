import { pinyin } from "pinyin-pro";

export function getMandarinReadings(char: string): string[] {
  const readings = pinyin(char, {
    toneType: "symbol",
    type: "array",
    multiple: true,
    traditional: true,
  });
  return Array.from(new Set(readings.filter((reading) => reading !== char)));
}
