// Assigned Unified_Ideograph ranges from Unicode 17.0.0 PropList.txt, plus
// compatibility ideographs and ideographic zero. Independent of engine Unicode age.
export const HAN_RE =
  /^[\u3007\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFA6D\uFA70-\uFAD9\u{20000}-\u{2A6DF}\u{2A700}-\u{2B81D}\u{2B820}-\u{2CEAD}\u{2CEB0}-\u{2EBE0}\u{2EBF0}-\u{2EE5D}\u{2F800}-\u{2FA1D}\u{30000}-\u{3134A}\u{31350}-\u{33479}]$/u;
export const MAX_TEXT_LENGTH = 2000;
export function parseCharacters(input: string): {
  chars: string[];
  error?: string;
} {
  const query = input.trim();
  if (query.length > MAX_TEXT_LENGTH)
    return { chars: [], error: "每次最多输入 2000 个字符，请分段查询。" };
  if (/^U\+/i.test(query)) {
    const match = query.match(/^U\+([0-9a-f]{4,6})$/i);
    const cp = match ? Number.parseInt(match[1], 16) : -1;
    if (cp < 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff))
      return { chars: [], error: "请输入有效的汉字码点，例如 U+9AA8。" };
    const char = String.fromCodePoint(cp);
    return HAN_RE.test(char)
      ? { chars: [char] }
      : { chars: [], error: "这个码点不是汉字，请输入汉字的 Unicode 码点。" };
  }
  // Variation selectors are deliberately rejected: a base code point is not an IVS glyph.
  if (/[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/u.test(query))
    return {
      chars: [],
      error: "暂不支持异体字选择序列，请查询不带选择符的汉字。",
    };
  return {
    chars: [...new Set(Array.from(query).filter((char) => HAN_RE.test(char)))],
  };
}

export function parsePinyin(
  input: string,
): { syllable: string; tone?: number } | null {
  let value = input.trim().toLowerCase().normalize("NFC").replace(/u:/g, "ü");
  const numeric = value.match(/([0-5])$/);
  if (numeric) value = value.slice(0, -1);
  const toneMarks =
    value.normalize("NFD").match(/[\u0304\u0301\u030c\u0300]/g) ?? [];
  if (toneMarks.length > 1) return null;
  const tone = toneMarks.length
    ? ["\u0304", "\u0301", "\u030c", "\u0300"].indexOf(toneMarks[0]!) + 1
    : numeric
      ? Number(numeric[1]) || 5
      : undefined;
  if (numeric && toneMarks.length && tone !== (Number(numeric[1]) || 5))
    return null;
  value = value
    .normalize("NFD")
    .replace(/u\u0308/g, "v")
    .replace(/[\u0300-\u036f]/g, "");
  return /^[a-zv]+$/.test(value) ? { syllable: value, tone } : null;
}

export interface SearchIndex {
  version: string;
  pinyin: Record<string, string>;
  japanese: Record<string, string>;
}
export function findCandidates(
  index: SearchIndex,
  input: string,
  japanese = false,
): string[] {
  if (japanese) {
    const value = index.japanese[input.toLowerCase().trim()];
    return typeof value === "string" ? Array.from(value) : [];
  }
  const reading = parsePinyin(input);
  if (!reading) return [];
  const value = index.pinyin[`${reading.syllable}${reading.tone ?? ""}`];
  return typeof value === "string" ? Array.from(value) : [];
}
