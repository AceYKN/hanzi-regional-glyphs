export interface UnihanRecord {
  kMandarin?: string;
  kHanyuPinyin?: string;
  kJapaneseOn?: string;
  kJapaneseKun?: string;
  kSimplifiedVariant?: string;
  kTraditionalVariant?: string;
  kTotalStrokes?: string;
}
const requests = new Map<string, Promise<Record<string, UnihanRecord>>>();
export async function getCharacterData(
  char: string,
): Promise<UnihanRecord | null> {
  const cp = char.codePointAt(0)!;
  const shard = (cp >> 12).toString(16);
  // Unihan 17.0.0 includes these blocks; other valid ideographs have no record.
  if (
    ![
      3, 4, 5, 6, 7, 8, 9, 15, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
      44, 45, 46, 47, 48, 49, 50, 51,
    ].includes(cp >> 12)
  )
    return null;
  let request = requests.get(shard);
  if (!request) {
    request = fetch(`/data/unihan/${shard}.json`)
      .then(async (response) => {
        if (!response.ok) throw new Error("无法加载字符资料");
        const data = await response.json();
        if (data.version !== "17.0.0" || !data.entries)
          throw new Error("字符资料格式不匹配");
        return data.entries as Record<string, UnihanRecord>;
      })
      .catch((error) => {
        requests.delete(shard);
        throw error;
      });
    requests.set(shard, request);
  }
  return (await request)[cp.toString(16).toUpperCase()] ?? null;
}
export function variants(value?: string): string[] {
  return [
    ...new Set(
      (value?.match(/U\+[0-9A-F]{4,6}/g) ?? []).map((cp) =>
        String.fromCodePoint(Number.parseInt(cp.slice(2), 16)),
      ),
    ),
  ];
}
export function mandarin(record: UnihanRecord | null): string[] {
  const dictionary =
    record?.kHanyuPinyin
      ?.split(/\s+/)
      .flatMap((part) => part.split(":")[1]?.split(",") ?? []) ?? [];
  return [
    ...new Set([...(record?.kMandarin?.split(/\s+/) ?? []), ...dictionary]),
  ];
}
