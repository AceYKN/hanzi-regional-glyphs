import { useEffect, useState } from "react";
import {
  loadGlyphFont,
  glyphFontFamily,
  type FontStyle,
  type Profile,
} from "../../src/lib/fonts";

export default function Glyph({
  char,
  profile,
  style,
}: {
  char: string;
  profile: Profile;
  style: FontStyle;
}) {
  const [state, setState] = useState<{
    key: string;
    status: "ready" | "unsupported" | "error";
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const key = `${char}-${profile}-${style}-${retry}`;
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setState({ key, status: "error" });
    }, 15000);
    loadGlyphFont(char, profile, style)
      .then((status) => {
        if (active) setState({ key, status });
      })
      .catch(() => {
        if (active) setState({ key, status: "error" });
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [char, profile, style, key]);
  const status = state?.key === key ? state.status : "loading";
  if (status === "ready")
    return (
      <span
        className="glyph"
        lang={{ cn: "zh-CN", tw: "zh-TW", hk: "zh-HK", jp: "ja" }[profile]}
        style={{ fontFamily: `"${glyphFontFamily(char, profile, style)}"` }}
      >
        {char}
      </span>
    );
  return (
    <span className="glyph-status" role="status">
      {status === "unsupported" ? (
        "此字体未收录该字"
      ) : status === "error" ? (
        <>
          字体加载失败
          <button
            className="text-button"
            onClick={(event) => {
              event.stopPropagation();
              setRetry((value) => value + 1);
            }}
          >
            重试
          </button>
        </>
      ) : (
        "正在加载字形…"
      )}
    </span>
  );
}
