import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toHiragana, toKatakana, toRomaji } from "wanakana";
import {
  getCharacterData,
  mandarin,
  variants,
  type UnihanRecord,
} from "../../src/lib/data";
import type { FontStyle, Profile } from "../../src/lib/fonts";
import { readPreference, savePreference } from "../../src/lib/preferences";
import {
  findCandidates,
  parseCharacters,
  type SearchIndex,
} from "../../src/lib/query";
import type { RegionalForms, SourceLocale } from "../../src/lib/regional";
import Glyph from "./Glyph";
import Modal from "./Modal";

const LOCALES: Record<Profile, { name: string; description: string }> = {
  cn: { name: "中国", description: "简体中文字体" },
  tw: { name: "台湾", description: "繁体中文字体" },
  hk: { name: "香港", description: "香港繁体字体" },
  jp: { name: "日本", description: "日文字体" },
};
const PROFILES = Object.keys(LOCALES) as Profile[];
const SIZES = [64, 96, 128, 160, 192, 256];
let searchIndex: Promise<SearchIndex> | undefined;
function loadIndex() {
  searchIndex ??= fetch("/index/readings.json")
    .then(async (response) => {
      if (!response.ok) throw new Error("索引加载失败");
      const index = await response.json();
      if (index.version !== "unihan-17.0.0" || !index.pinyin || !index.japanese)
        throw new Error("索引格式不匹配");
      return index as SearchIndex;
    })
    .catch((error) => {
      searchIndex = undefined;
      throw error;
    });
  return searchIndex;
}

export default function HanGlyphApp({
  initialCharacters = ["骨"],
  routeError = "",
}: {
  initialCharacters?: string[];
  routeError?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [searchKind, setSearchKind] = useState("auto");
  const [fontStyle, setFontStyle] = useState<FontStyle>(
    () => readPreference("fontStyle", "sans", ["sans", "serif"]) as FontStyle,
  );
  const [glyphSize, setGlyphSize] = useState(() =>
    Number(readPreference("glyphSize", "160", SIZES.map(String))),
  );
  const [theme, setTheme] = useState(() =>
    readPreference("theme", "system", ["system", "light", "dark"]),
  );
  const [notice, setNotice] = useState("");
  const searchNotice = notice || (!query.trim() ? routeError : "");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [visibleResults, setVisibleResults] = useState(48);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchSerial = useRef(0);
  const parameters = new URLSearchParams(location.search);
  const mode = parameters.get("view") === "forms" ? "forms" : "glyph";
  const sourceParameter = parameters.get("source");
  const sourceLocale: SourceLocale =
    sourceParameter === "t" || sourceParameter === "jp"
      ? sourceParameter
      : "cn";
  const [data, setData] = useState<{
    char: string;
    record: UnihanRecord | null;
    error?: string;
  } | null>(null);
  const [dataRetry, setDataRetry] = useState(0);
  const [regional, setRegional] = useState<{
    key: string;
    forms?: RegionalForms;
    error?: string;
  } | null>(null);
  const [fullscreen, setFullscreen] = useState<Profile | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [base, setBase] = useState<Profile>("cn");
  const [compare, setCompare] = useState<Profile>("tw");
  const [opacity, setOpacity] = useState(50);
  const [shareStatus, setShareStatus] = useState("");
  const chars = initialCharacters;
  const urlIndex = Number(
    new URLSearchParams(location.search).get("index") ?? 0,
  );
  const selectedIndex =
    Number.isInteger(urlIndex) && urlIndex >= 0 && urlIndex < chars.length
      ? urlIndex
      : 0;
  const selectedChar = chars[selectedIndex];
  const record = data?.char === selectedChar ? data.record : null;
  const dataError = data?.char === selectedChar ? data.error : undefined;
  const isDataLoading = data?.char !== selectedChar;
  const readings = useMemo(() => mandarin(record), [record]);
  const primaryReadings = record?.kMandarin?.split(/\s+/) ?? [];
  const otherReadings = readings.filter(
    (reading) => !primaryReadings.includes(reading),
  );
  const traditional = variants(record?.kTraditionalVariant).filter(
    (char) => char !== selectedChar,
  );
  const simplified = variants(record?.kSimplifiedVariant).filter(
    (char) => char !== selectedChar,
  );
  const ambiguous =
    mode === "forms" && sourceLocale === "cn" && traditional.length > 1;
  const regionalKey = `${selectedChar}-${sourceLocale}`;
  const regionalError =
    regional?.key === regionalKey ? regional.error : undefined;
  const forms =
    mode === "glyph"
      ? (Object.fromEntries(
          PROFILES.map((profile) => [profile, selectedChar]),
        ) as Record<Profile, string>)
      : !ambiguous &&
          !isDataLoading &&
          !dataError &&
          regional?.key === regionalKey
        ? regional.forms
        : undefined;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    savePreference("theme", theme);
  }, [theme]);
  useEffect(() => {
    savePreference("fontStyle", fontStyle);
    savePreference("glyphSize", String(glyphSize));
  }, [fontStyle, glyphSize]);
  useEffect(() => {
    let active = true;
    getCharacterData(selectedChar)
      .then((record) => {
        if (active) setData({ char: selectedChar, record });
      })
      .catch(() => {
        if (active)
          setData({
            char: selectedChar,
            record: null,
            error: "字符资料加载失败，请检查网络后重试。",
          });
      });
    return () => {
      active = false;
    };
  }, [selectedChar, dataRetry]);
  useEffect(() => {
    if (mode !== "forms" || isDataLoading || dataError || ambiguous) return;
    let active = true;
    import("../../src/lib/regional")
      .then((module) => {
        if (active)
          setRegional({
            key: regionalKey,
            forms: module.convertRegionalForms(selectedChar, sourceLocale),
          });
      })
      .catch(() => {
        if (active)
          setRegional({
            key: regionalKey,
            error: "用字转换暂时无法加载，请重试。",
          });
      });
    return () => {
      active = false;
    };
  }, [
    mode,
    selectedChar,
    sourceLocale,
    regionalKey,
    isDataLoading,
    dataError,
    ambiguous,
  ]);
  useEffect(
    () => () => {
      searchSerial.current += 1;
    },
    [location.pathname, location.search],
  );

  function updateDisplay(nextMode: "glyph" | "forms", source: SourceLocale) {
    const next = new URLSearchParams(location.search);
    if (nextMode === "forms") {
      next.set("view", "forms");
      next.set("source", source);
    } else {
      next.delete("view");
      next.delete("source");
    }
    searchSerial.current += 1;
    setSearchLoading(false);
    navigate(`${location.pathname}${next.size ? `?${next}` : ""}`, {
      replace: true,
    });
  }
  function setMode(next: "glyph" | "forms") {
    updateDisplay(next, sourceLocale);
  }
  function setSourceLocale(source: SourceLocale) {
    updateDisplay(mode, source);
  }
  function selectCharacters(next: string[], source = sourceLocale) {
    searchSerial.current += 1;
    setSearchLoading(false);
    setSearchResults([]);
    setNotice("");
    const parameters = new URLSearchParams();
    if (next.length > 1) parameters.set("text", next.join(""));
    if (mode === "forms") {
      parameters.set("view", "forms");
      parameters.set("source", source);
    }
    navigate(
      `/char/${encodeURIComponent(next[0])}${parameters.size ? `?${parameters}` : ""}`,
    );
  }
  function chooseIndex(index: number) {
    searchSerial.current += 1;
    setSearchLoading(false);
    const parameters = new URLSearchParams(location.search);
    if (chars.length > 1) parameters.set("text", chars.join(""));
    if (index) parameters.set("index", String(index));
    else parameters.delete("index");
    navigate(`${location.pathname}${parameters.size ? `?${parameters}` : ""}`, {
      replace: true,
    });
  }
  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const serial = ++searchSerial.current;
    const input = query.trim();
    const direct = parseCharacters(input);
    if (direct.error) {
      setNotice(direct.error);
      setSearchResults([]);
      return;
    }
    if (direct.chars.length) {
      selectCharacters(direct.chars);
      return;
    }
    if (!input) {
      setNotice("输入汉字、拼音或 Unicode 码点即可查询。");
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setSearchResults([]);
    setNotice("");
    try {
      const japanese =
        searchKind === "japanese" || /[\u3040-\u30ff]/.test(input);
      const normalized = japanese ? toRomaji(input).toLowerCase() : input;
      const results = findCandidates(await loadIndex(), normalized, japanese);
      if (serial !== searchSerial.current) return;
      setSearchResults(results);
      setVisibleResults(48);
      setNotice(
        results.length
          ? `找到 ${results.length} 个候选字，请选择。`
          : japanese
            ? "没有找到该日语读音。可尝试 ほね、コク 或 koku。"
            : "没有找到该读音。请输入单个拼音音节，例如 gu、gǔ 或 gu3。",
      );
    } catch {
      if (serial === searchSerial.current)
        setNotice("读音索引加载失败，请检查网络后重试。");
    } finally {
      if (serial === searchSerial.current) setSearchLoading(false);
    }
  }
  async function shareCharacter() {
    setShareStatus("");
    const url = `${window.location.origin}/char/${encodeURIComponent(selectedChar)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${selectedChar} · 地区字形`, url });
        setShareStatus("已分享");
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus("链接已复制");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setShareStatus("无法自动复制，请复制链接地址。");
    }
  }
  function selectVariant(char: string) {
    setQuery(char);
    selectCharacters([char], traditional.includes(char) ? "t" : "cn");
  }

  return (
    <div
      className="site-shell"
      style={{ "--glyph-size": `${glyphSize}px` } as CSSProperties}
    >
      <header className="topbar">
        <Link className="wordmark" to="/" aria-label="字形首页">
          <span className="wordmark-mark">字</span>
          <span>
            字形<small>HanGlyph</small>
          </span>
        </Link>
        <nav aria-label="网站导航">
          <Link to="/about">资料与说明</Link>
          <button
            className="icon-button"
            onClick={() =>
              setTheme(
                theme === "system"
                  ? "light"
                  : theme === "light"
                    ? "dark"
                    : "system",
              )
            }
            aria-label={`主题：${{ system: "跟随系统", light: "浅色", dark: "深色" }[theme]}`}
            title="切换主题"
          >
            {theme === "dark" ? "☾" : theme === "light" ? "☀" : "◐"}
          </button>
        </nav>
      </header>
      <main>
        <section className="search-section" aria-labelledby="hero-title">
          <div className="intro">
            <p className="eyebrow">汉字 · 地区字形对照</p>
            <h1 id="hero-title">
              一字之间，<span>看见差异。</span>
            </h1>
            <p>查一个字，或一段文字。比较字形，也了解读音与对应写法。</p>
          </div>
          <form className="search-form" onSubmit={handleSearch} role="search">
            <label className="sr-only" htmlFor="han-search">
              汉字或读音
            </label>
            <input
              id="han-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                searchSerial.current += 1;
                setSearchLoading(false);
                setSearchResults([]);
                setNotice("");
              }}
              maxLength={2001}
              placeholder="汉字、拼音、U+9AA8"
              autoComplete="off"
            />
            <select
              aria-label="读音查询类型"
              value={searchKind}
              onChange={(event) => {
                setSearchKind(event.target.value);
                searchSerial.current += 1;
                setSearchResults([]);
                setSearchLoading(false);
              }}
            >
              <option value="auto">汉字 / 拼音</option>
              <option value="japanese">日语读音</option>
            </select>
            <button type="submit" disabled={searchLoading}>
              {searchLoading ? "搜索中…" : "查询"}
              <span aria-hidden="true"> ↗</span>
            </button>
          </form>
          <div className="quick-examples">
            <span>试试</span>
            {["骨", "令", "直", "发", "歡迎來到東京"].map((char) => (
              <button
                key={char}
                onClick={() => {
                  setQuery(char);
                  selectCharacters(parseCharacters(char).chars);
                }}
              >
                {char}
              </button>
            ))}
          </div>
          {searchNotice && (
            <p className="notice" role="status">
              {searchNotice}
            </p>
          )}
          {searchResults.length > 0 && (
            <div className="search-results">
              <div className="candidate-grid">
                {searchResults.slice(0, visibleResults).map((char) => (
                  <button
                    key={char}
                    aria-label={`查看${char}`}
                    onClick={() => selectCharacters([char])}
                  >
                    {char}
                  </button>
                ))}
              </div>
              {searchResults.length > visibleResults && (
                <button
                  className="text-button"
                  onClick={() => setVisibleResults((value) => value + 48)}
                >
                  显示更多（剩余 {searchResults.length - visibleResults} 个）
                </button>
              )}
            </div>
          )}
        </section>
        <section className="compare-section" aria-labelledby="compare-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                U+{selectedChar.codePointAt(0)!.toString(16).toUpperCase()}
              </p>
              <h2 id="compare-title">
                {selectedChar}
                <span>的地区{mode === "glyph" ? "字形" : "写法"}</span>
              </h2>
            </div>
            <div className="share-area">
              <button className="secondary-button" onClick={shareCharacter}>
                分享这个字 ↗
              </button>
              {shareStatus && <span role="status">{shareStatus}</span>}
              {shareStatus.startsWith("无法") && (
                <a
                  href={`${window.location.origin}/char/${encodeURIComponent(selectedChar)}`}
                >
                  链接地址
                </a>
              )}
            </div>
          </div>
          {chars.length > 1 && (
            <div className="character-strip" role="group" aria-label="逐字查看">
              {chars.map((char, index) => (
                <button
                  key={char}
                  aria-pressed={selectedIndex === index}
                  className={selectedIndex === index ? "active" : ""}
                  onClick={() => chooseIndex(index)}
                >
                  {char}
                </button>
              ))}
            </div>
          )}
          <div className="toolbar">
            <div className="segmented" role="group" aria-label="对照方式">
              <button
                aria-pressed={mode === "glyph"}
                onClick={() => setMode("glyph")}
              >
                同字字形
              </button>
              <button
                aria-pressed={mode === "forms"}
                onClick={() => setMode("forms")}
              >
                用字转换
              </button>
            </div>
            <div className="segmented" role="group" aria-label="字体风格">
              <button
                aria-pressed={fontStyle === "sans"}
                onClick={() => setFontStyle("sans")}
              >
                黑体
              </button>
              <button
                aria-pressed={fontStyle === "serif"}
                onClick={() => setFontStyle("serif")}
              >
                宋体
              </button>
            </div>
            <label className="size-control">
              最大字号{" "}
              <select
                aria-label="最大字号"
                value={glyphSize}
                onChange={(event) => setGlyphSize(Number(event.target.value))}
              >
                {SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} px
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button overlay-trigger"
              onClick={() => setOverlay(true)}
              disabled={!forms}
            >
              叠加比较
            </button>
          </div>
          <div className="mode-note">
            {mode === "glyph" ? (
              <p>保留同一个字符，只比较地区字体的笔画与构件。</p>
            ) : (
              <>
                <label>
                  输入写法{" "}
                  <select
                    value={sourceLocale}
                    aria-label="输入写法"
                    onChange={(event) =>
                      setSourceLocale(event.target.value as SourceLocale)
                    }
                  >
                    <option value="cn">简体中文</option>
                    <option value="t">繁体中文</option>
                    <option value="jp">日文新字体</option>
                  </select>
                </label>
                <p>OpenCC 单字转换参考，不能代替词义判断或地区用字规范。</p>
              </>
            )}
          </div>
          {ambiguous && (
            <div className="ambiguity" role="status">
              <strong>
                “{selectedChar}”有多个繁体对应，请先选择含义对应的字。
              </strong>
              <div className="variant-list">
                {traditional.map((char) => (
                  <button key={char} onClick={() => selectVariant(char)}>
                    {char}
                  </button>
                ))}
              </div>
              <span>来源：Unihan kTraditionalVariant；单字无法确定词义。</span>
            </div>
          )}
          {(regionalError || (mode === "forms" && dataError)) && (
            <p className="notice" role="alert">
              {regionalError || dataError}{" "}
              <button
                className="text-button"
                onClick={() => {
                  // Failed dynamic imports stay failed in the browser module map.
                  // Reload the document to retry while preserving character, mode,
                  // source and text selection in the URL.
                  if (regionalError) window.location.reload();
                  else setDataRetry((value) => value + 1);
                }}
              >
                重试
              </button>
            </p>
          )}
          <div className="glyph-grid">
            {PROFILES.map((profile) => (
              <article className="glyph-card" key={profile}>
                <div className="card-top">
                  <div>
                    <h3>{LOCALES[profile].name}</h3>
                    <span>{LOCALES[profile].description}</span>
                  </div>
                  <button
                    className="icon-button"
                    disabled={!forms}
                    onClick={() => setFullscreen(profile)}
                    aria-label={`放大${LOCALES[profile].name}字形`}
                  >
                    ↗
                  </button>
                </div>
                <div className="glyph-stage">
                  {forms ? (
                    <Glyph
                      char={forms[profile]}
                      profile={profile}
                      style={fontStyle}
                    />
                  ) : (
                    <span className="glyph-status">
                      {ambiguous
                        ? "选择对应字后查看"
                        : regionalError || dataError
                          ? "暂时无法转换"
                          : "正在转换…"}
                    </span>
                  )}
                </div>
                <div className="card-bottom">
                  <span>
                    {forms && forms[profile] !== selectedChar
                      ? `${selectedChar} → ${forms[profile]}`
                      : "同一字符"}
                  </span>
                  <span>
                    Noto {fontStyle === "sans" ? "Sans" : "Serif"} CJK ·{" "}
                    {profile.toUpperCase()}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <p className="shared-profile">
            新加坡、马来西亚复用中国简体写法及字体配置，不重复展示。
          </p>
        </section>
        <section className="character-info" aria-label="字符资料">
          <div>
            <h3>读音</h3>
            {isDataLoading ? (
              <p className="muted">正在加载资料…</p>
            ) : dataError ? (
              <p role="alert">
                {dataError}
                <button
                  className="text-button"
                  onClick={() => setDataRetry((value) => value + 1)}
                >
                  重试
                </button>
              </p>
            ) : (
              <dl>
                <div>
                  <dt>普通话</dt>
                  <dd>
                    {(primaryReadings.length ? primaryReadings : readings).join(
                      "、",
                    ) || "未收录"}
                  </dd>
                </div>
                <div>
                  <dt>日语音读</dt>
                  <dd>
                    {record?.kJapaneseOn
                      ?.split(" ")
                      .map((value) => toKatakana(value.toLowerCase()))
                      .join("、") || "未收录"}
                  </dd>
                </div>
                <div>
                  <dt>日语训读</dt>
                  <dd>
                    {record?.kJapaneseKun
                      ?.split(" ")
                      .map((value) => toHiragana(value.toLowerCase()))
                      .join("、") || "未收录"}
                  </dd>
                </div>
              </dl>
            )}
            {primaryReadings.length > 0 && otherReadings.length > 0 && (
              <details>
                <summary>其他字典读音</summary>
                <p>
                  {otherReadings.join("、")}（Unihan
                  kHanyuPinyin，包含字典中的其他读法，不代表现代常用读音。）
                </p>
              </details>
            )}
            <p className="info-caption">Unihan 字典读音；词中读音可能不同。</p>
          </div>
          <div>
            <h3>对应字</h3>
            {traditional.length > 0 && (
              <div className="variant-row">
                <span>繁体</span>
                <div className="variant-list">
                  {traditional.map((char) => (
                    <button key={char} onClick={() => selectVariant(char)}>
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {simplified.length > 0 && (
              <div className="variant-row">
                <span>简体</span>
                <div className="variant-list">
                  {simplified.map((char) => (
                    <button key={char} onClick={() => selectVariant(char)}>
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!traditional.length && !simplified.length && (
              <p className="muted">
                {isDataLoading
                  ? "正在加载…"
                  : dataError
                    ? "资料暂不可用"
                    : "资料中未列出简繁对应。"}
              </p>
            )}
            <p className="info-caption">对应关系可能一对多，需结合词义。</p>
          </div>
          <div>
            <h3>字符资料</h3>
            <dl>
              <div>
                <dt>Unicode</dt>
                <dd>
                  U+{selectedChar.codePointAt(0)!.toString(16).toUpperCase()}
                </dd>
              </div>
              <div>
                <dt>总笔画</dt>
                <dd>
                  {isDataLoading
                    ? "加载中"
                    : dataError
                      ? "暂不可用"
                      : record?.kTotalStrokes?.split(" ").join(" / ") ||
                        "未收录"}
                </dd>
              </div>
            </dl>
            <details>
              <summary>数据来源与范围</summary>
              <p>
                Unihan 17.0.0：普通话 kMandarin / kHanyuPinyin，日语 kJapaneseOn
                / kJapaneseKun，对应字 kTraditionalVariant /
                kSimplifiedVariant，总笔画
                kTotalStrokes。多值保留原资料；笔画数可能因地区而异。
              </p>
              <Link to="/about">查看来源、版本与限制 ↗</Link>
            </details>
          </div>
        </section>
      </main>
      <footer>
        <span>字形 · HanGlyph</span>
        <div>
          <Link to="/about">资料与说明</Link>
          <a
            href="https://github.com/AceYKN/hanzi-regional-glyphs"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </footer>
      {fullscreen && forms && (
        <Modal
          title={`${LOCALES[fullscreen].name} · ${forms[fullscreen]}`}
          onClose={() => setFullscreen(null)}
        >
          <div className="fullscreen-stage">
            <Glyph
              char={forms[fullscreen]}
              profile={fullscreen}
              style={fontStyle}
            />
          </div>
          <p className="info-caption">
            Noto {fontStyle === "sans" ? "Sans" : "Serif"} CJK ·{" "}
            {LOCALES[fullscreen].description}
          </p>
        </Modal>
      )}
      {overlay && forms && (
        <Modal
          title={`叠加比较 · ${selectedChar}`}
          onClose={() => setOverlay(false)}
        >
          <div className="overlay-stage">
            <div
              className="overlay-one"
              style={{ opacity: (100 - opacity) / 100 }}
            >
              <Glyph char={forms[base]} profile={base} style={fontStyle} />
            </div>
            <div className="overlay-two" style={{ opacity: opacity / 100 }}>
              <Glyph
                char={forms[compare]}
                profile={compare}
                style={fontStyle}
              />
            </div>
          </div>
          <div className="overlay-controls">
            <label>
              底层{" "}
              <select
                aria-label="底层地区"
                value={base}
                onChange={(event) => setBase(event.target.value as Profile)}
              >
                {PROFILES.map((profile) => (
                  <option key={profile} value={profile}>
                    {LOCALES[profile].name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              上层{" "}
              <select
                aria-label="上层地区"
                value={compare}
                onChange={(event) => setCompare(event.target.value as Profile)}
              >
                {PROFILES.map((profile) => (
                  <option key={profile} value={profile}>
                    {LOCALES[profile].name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="opacity-control">
            上层透明度 {opacity}%
            <input
              aria-label="上层透明度"
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
          </label>
          <p className="info-caption">
            {forms[base] === forms[compare]
              ? "对齐同一字符的字框，红色为底层，蓝色为上层。"
              : "当前两个地区对应不同字符，叠加结果包含用字差异。"}
          </p>
        </Modal>
      )}
    </div>
  );
}
