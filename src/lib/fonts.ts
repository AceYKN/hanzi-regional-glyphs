export type FontStyle = "sans" | "serif";
export type Profile = "cn" | "tw" | "hk" | "jp";
interface FontManifest {
  fonts: Record<string, { coverage: number[]; files: string[] }>;
}
let manifest: Promise<FontManifest> | undefined;
const loaded = new Map<string, Promise<FontFace>>();
export function glyphFontFamily(
  char: string,
  profile: Profile,
  style: FontStyle,
): string {
  return `Han ${profile} ${style} ${(char.codePointAt(0)! >> 10).toString(16)}`;
}
export async function loadGlyphFont(
  char: string,
  profile: Profile,
  style: FontStyle,
): Promise<"ready" | "unsupported"> {
  manifest ??= fetch("/fonts/manifest.json")
    .then(async (response) => {
      if (!response.ok) throw new Error("无法加载字体目录");
      const data = await response.json();
      if (!data.fonts) throw new Error("字体目录格式不匹配");
      return data as FontManifest;
    })
    .catch((error) => {
      manifest = undefined;
      throw error;
    });
  const entry = (await manifest).fonts[`${profile}-${style}`];
  if (!entry.coverage.includes(char.codePointAt(0)!)) return "unsupported";
  const group = (char.codePointAt(0)! >> 10).toString(16);
  const file = entry.files.find((file) =>
    file.startsWith(`${profile}-${style}-${group}-`),
  );
  if (!file) throw new Error("字体分片目录不匹配");
  let request = loaded.get(file);
  if (!request) {
    const face = new FontFace(
      glyphFontFamily(char, profile, style),
      `url("/fonts/${file}") format("woff2")`,
      { weight: "400", style: "normal" },
    );
    request = face
      .load()
      .then((font) => {
        document.fonts.add(font);
        return font;
      })
      .catch((error) => {
        loaded.delete(file);
        throw error;
      });
    loaded.set(file, request);
  }
  await request;
  // Initial font requests can precede SW control. Explicitly cache the exact local
  // subset after install, so the first visited character survives an offline reload.
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    const urls = [`/fonts/${file}`];
    void navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage({ type: "CACHE_FONTS", urls });
      })
      .catch(() => undefined);
  }
  return "ready";
}
