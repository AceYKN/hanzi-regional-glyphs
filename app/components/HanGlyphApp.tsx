import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LocaleId, RegionalForms } from "../../src/lib/regional";

type FontStyle = "sans" | "serif";
type Theme = "light" | "dark" | "system";

interface CharacterRecord {
  char: string;
  codePoint: number;
  radical?: string;
  strokes?: number;
  mandarin?: string[];
  japaneseOn?: string[];
  japaneseKun?: string[];
  simplified?: string[];
  traditional?: string[];
}

const LOCALES: Record<LocaleId, { flag: string; name: string; profile: "cn" | "tw" | "hk" | "jp" }> = {
  cn: { flag: "🇨🇳", name: "中国", profile: "cn" },
  tw: { flag: "🇹🇼", name: "台湾", profile: "tw" },
  hk: { flag: "🇭🇰", name: "香港", profile: "hk" },
  jp: { flag: "🇯🇵", name: "日本", profile: "jp" },
  sg: { flag: "🇸🇬", name: "新加坡", profile: "cn" },
  my: { flag: "🇲🇾", name: "马来西亚", profile: "cn" },
};

const RECORDS: Record<string, Omit<CharacterRecord, "codePoint">> = {
  骨: { char: "骨", radical: "骨", strokes: 10, mandarin: ["gǔ"], japaneseOn: ["コツ"], japaneseKun: ["ほね"] },
  发: { char: "发", radical: "又", strokes: 5, mandarin: ["fā", "fà"], traditional: ["發", "髮"] },
  發: { char: "發", radical: "癶", strokes: 12, mandarin: ["fā"], simplified: ["发"] },
  髮: { char: "髮", radical: "髟", strokes: 15, mandarin: ["fà"], simplified: ["发"] },
  国: { char: "国", radical: "囗", strokes: 8, mandarin: ["guó"], traditional: ["國"] },
  國: { char: "國", radical: "囗", strokes: 11, mandarin: ["guó"], japaneseOn: ["コク"], simplified: ["国"] },
  龙: { char: "龙", radical: "龙", strokes: 5, mandarin: ["lóng"], traditional: ["龍"] },
  龍: { char: "龍", radical: "龍", strokes: 16, mandarin: ["lóng"], japaneseOn: ["リュウ"], simplified: ["龙"] },
  竜: { char: "竜", radical: "立", strokes: 10, japaneseOn: ["リュウ"], japaneseKun: ["たつ"] },
  東: { char: "東", radical: "木", strokes: 8, mandarin: ["dōng"], japaneseOn: ["トウ"], simplified: ["东"] },
  东: { char: "东", radical: "一", strokes: 5, mandarin: ["dōng"], traditional: ["東"] },
  歡: { char: "歡", radical: "欠", strokes: 21, mandarin: ["huān"], simplified: ["欢"] },
  欢: { char: "欢", radical: "欠", strokes: 6, mandarin: ["huān"], traditional: ["歡"] },
  來: { char: "來", radical: "人", strokes: 8, mandarin: ["lái"], simplified: ["来"] },
  来: { char: "来", radical: "木", strokes: 7, mandarin: ["lái"], japaneseOn: ["ライ"], japaneseKun: ["くる"], traditional: ["來"] },
  京: { char: "京", radical: "亠", strokes: 8, mandarin: ["jīng"], japaneseOn: ["キョウ"], japaneseKun: ["みやこ"] },
  迎: { char: "迎", radical: "辶", strokes: 7, mandarin: ["yíng"], japaneseOn: ["ゲイ"], japaneseKun: ["むかえる"] },
  令: { char: "令", radical: "人", strokes: 5, mandarin: ["lìng"], japaneseOn: ["レイ"] },
  直: { char: "直", radical: "目", strokes: 8, mandarin: ["zhí"], japaneseOn: ["チョク"], japaneseKun: ["なおす"] },
  糸: { char: "糸", radical: "糸", strokes: 6, mandarin: ["mì"], japaneseOn: ["シ"], japaneseKun: ["いと"] },
  食: { char: "食", radical: "食", strokes: 9, mandarin: ["shí"], japaneseOn: ["ショク"], japaneseKun: ["たべる"] },
  雨: { char: "雨", radical: "雨", strokes: 8, mandarin: ["yǔ"], japaneseOn: ["ウ"], japaneseKun: ["あめ"] },
};

const FONT_SIZE_STEPS = [64, 96, 128, 160, 192, 256];
const HAN_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u;

function getRecord(char: string): CharacterRecord {
  const base = RECORDS[char] ?? { char };
  return { ...base, char, codePoint: char.codePointAt(0) ?? 0 };
}

function parseDirectQuery(input: string): { chars: string[]; notice?: string } {
  const query = input.trim();
  const unicodeMatch = query.match(/^U\+?([0-9A-F]{4,6})$/i);
  if (unicodeMatch) {
    const cp = Number.parseInt(unicodeMatch[1], 16);
    if (cp <= 0x10ffff) return { chars: [String.fromCodePoint(cp)] };
  }
  const reading = query.toLowerCase().replace(/[\s-]/g, "");
  if (["hone", "ほね", "ホネ"].includes(reading)) return { chars: ["骨"] };
  const chars = Array.from(query).filter((char) => HAN_RE.test(char));
  if (chars.length) return { chars };
  return { chars: [], notice: "" };
}

function normalizePinyinInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ǖǘǚǜü]/g, "v")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[1-5\s'’·-]/g, "");
}

function Glyph({ char, locale, style, size }: { char: string; locale: LocaleId; style: FontStyle; size: number }) {
  const family = `han-${LOCALES[locale].profile}-${style}`;
  return <span className={`glyph glyph-${family}`} style={{ fontSize: `${size}px` }}>{char}</span>;
}

function LocaleBadge({ locale }: { locale: LocaleId }) {
  const item = LOCALES[locale];
  return <span className="locale-badge"><span aria-hidden="true">{item.flag}</span> {item.name}</span>;
}

export default function HanGlyphApp({ initialCharacter = "骨" }: { initialCharacter?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [chars, setChars] = useState(() => [initialCharacter]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fontStyle, setFontStyle] = useState<FontStyle>("sans");
  const [glyphSize, setGlyphSize] = useState(160);
  const [theme, setTheme] = useState<Theme>("system");
  const [notice, setNotice] = useState("");
  const [fullscreenLocale, setFullscreenLocale] = useState<LocaleId | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayBase, setOverlayBase] = useState<LocaleId>("cn");
  const [overlayCompare, setOverlayCompare] = useState<LocaleId>("tw");
  const [baseOpacity, setBaseOpacity] = useState(50);
  const [compareOpacity, setCompareOpacity] = useState(50);
  const [copied, setCopied] = useState(false);
  const [regionalState, setRegionalState] = useState<{ source: string; forms: RegionalForms } | null>(null);
  const [mandarinState, setMandarinState] = useState<{ source: string; readings: string[] } | null>(null);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchLabel, setSearchLabel] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const modalCloseRef = useRef<HTMLButtonElement>(null);

  const selectedChar = chars[selectedIndex] ?? "骨";
  const record = useMemo(() => getRecord(selectedChar), [selectedChar]);
  const regionalForms = regionalState?.source === selectedChar ? regionalState.forms : null;
  const mandarinReadings = mandarinState?.source === selectedChar ? mandarinState.readings : [];

  useEffect(() => {
    let active = true;
    const loadRegionalForms = window.setTimeout(() => {
      Promise.all([
        import("../../src/lib/regional"),
        import("../../src/lib/pinyin"),
      ]).then(([regional, readings]) => {
        if (!active) return;
        setRegionalState({ source: selectedChar, forms: regional.convertRegionalForms(selectedChar) });
        setMandarinState({ source: selectedChar, readings: readings.getMandarinReadings(selectedChar) });
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(loadRegionalForms);
    };
  }, [selectedChar]);

  useEffect(() => {
    const restorePreferences = window.setTimeout(() => {
      const savedStyle = localStorage.getItem("hanglyph.fontStyle") as FontStyle | null;
      const savedSize = Number(localStorage.getItem("hanglyph.glyphSize"));
      const savedTheme = localStorage.getItem("hanglyph.theme") as Theme | null;
      if (savedStyle === "sans" || savedStyle === "serif") setFontStyle(savedStyle);
      if (FONT_SIZE_STEPS.includes(savedSize)) setGlyphSize(savedSize);
      if (["light", "dark", "system"].includes(savedTheme ?? "")) setTheme(savedTheme!);
    }, 0);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => undefined);
    return () => window.clearTimeout(restorePreferences);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("hanglyph.theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("hanglyph.fontStyle", fontStyle);
    localStorage.setItem("hanglyph.glyphSize", String(glyphSize));
  }, [fontStyle, glyphSize]);

  useEffect(() => {
    if (!fullscreenLocale && !overlayOpen) return;
    modalCloseRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenLocale(null);
        setOverlayOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreenLocale, overlayOpen]);

  function selectCharacters(nextChars: string[], message = "") {
    const unique = Array.from(new Set(nextChars));
    if (!unique.length) return;
    setChars(unique);
    setSelectedIndex(0);
    setSearchResults([]);
    setSearchLabel("");
    setNotice(message || (unique.length > 1 ? `已拆分为 ${unique.length} 个不重复汉字，点击下方字符即可逐字查看。` : ""));
    navigate(`/char/${encodeURIComponent(unique[0])}`, { replace: true });
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const direct = parseDirectQuery(query);
    if (direct.chars.length) {
      selectCharacters(direct.chars, direct.notice);
      return;
    }

    const normalized = normalizePinyinInput(query);
    if (!/^[a-zv]+$/.test(normalized)) {
      setSearchResults([]);
      setNotice("暂未找到结果。可输入汉字、拼音、日语读音或 U+9AA8。 ");
      return;
    }

    setSearchLoading(true);
    setNotice("");
    try {
      const response = await fetch("/index/pinyin.json");
      const data = await response.json() as { entries: Record<string, string> };
      const exact = Array.from(data.entries[normalized] ?? "");
      const prefixes = exact.length
        ? []
        : Object.entries(data.entries)
            .filter(([syllable]) => syllable.startsWith(normalized))
            .flatMap(([, charsForSyllable]) => Array.from(charsForSyllable));
      const results = Array.from(new Set([...exact, ...prefixes])).slice(0, 60);
      setSearchResults(results);
      setSearchLabel(results.length ? `拼音 “${query.trim()}” 的候选字` : "");
      setNotice(results.length ? `找到 ${results.length} 个候选字，选择一个查看地区写法。` : `没有找到“${query.trim()}”的拼音结果。`);
    } catch {
      setSearchResults([]);
      setNotice("拼音索引暂时无法载入，请稍后再试。");
    } finally {
      setSearchLoading(false);
    }
  }

  function stepSize(direction: -1 | 1) {
    const current = FONT_SIZE_STEPS.indexOf(glyphSize);
    const next = Math.min(FONT_SIZE_STEPS.length - 1, Math.max(0, current + direction));
    setGlyphSize(FONT_SIZE_STEPS[next]);
  }

  function handleCharKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = Math.min(chars.length - 1, Math.max(0, index + (event.key === "ArrowRight" ? 1 : -1)));
    setSelectedIndex(next);
  }

  async function shareCharacter() {
    const url = `${window.location.origin}/char/${encodeURIComponent(selectedChar)}`;
    if (navigator.share) await navigator.share({ title: `${selectedChar}的地区字形`, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a href="/" className="wordmark" aria-label="字形首页"><span className="wordmark-mark">字</span> 字形</a>
        <nav className="top-actions" aria-label="网站导航">
          <a href="#compare">比较</a>
          <a href="/about">关于</a>
          <button className="icon-button" onClick={() => setTheme(theme === "system" ? "light" : theme === "light" ? "dark" : "system")} aria-label={`主题：${theme}`} title={`主题：${theme}`}>
            {theme === "light" ? "☀" : theme === "dark" ? "☾" : "◐"}
          </button>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">CJK 地区字形对照</p>
          <h1 id="hero-title">看见同一个字，<br /><span>在不同地区的样子。</span></h1>
          <p className="hero-copy">输入汉字、词语、Unicode 或拼音，先转换地区常用写法，再用中国、台湾、香港与日本字体呈现实际字形。</p>
          <form className="search-form" onSubmit={handleSearch} role="search">
            <label className="sr-only" htmlFor="han-search">输入汉字、词语或读音</label>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input id="han-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="试试：见、東、jian、dōng、U+898B" autoComplete="off" />
            <button type="submit" disabled={searchLoading}>{searchLoading ? "搜索中" : "查看字形"} <span aria-hidden="true">→</span></button>
          </form>
          {notice && <p className="search-notice" role="status">{notice}</p>}
          {searchResults.length > 0 && (
            <div className="pinyin-results" aria-label={searchLabel}>
              <div className="pinyin-results-heading"><strong>{searchLabel}</strong><span>最多显示 60 个</span></div>
              <div className="pinyin-result-grid">
                {searchResults.map((char) => <button key={char} onClick={() => selectCharacters([char])} aria-label={`查看${char}的地区写法`}>{char}</button>)}
              </div>
            </div>
          )}
          <div className="quick-examples" aria-label="搜索示例">
            <span>快速示例</span>
            {["见", "東", "國", "龍", "歡迎來到東京"].map((example) => (
              <button key={example} onClick={() => { setQuery(example); selectCharacters(parseDirectQuery(example).chars); }}>{example}</button>
            ))}
          </div>
        </section>

        <section className="compare-section" id="compare" aria-labelledby="compare-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">地区常用写法 + 地区字体 · 输入 U+{record.codePoint.toString(16).toUpperCase()}</p>
              <h2 id="compare-title">“{selectedChar}”的地区写法与字形</h2>
            </div>
            <button className="share-button" onClick={shareCharacter}>{copied ? "已复制链接" : "↗ 分享这个字"}</button>
          </div>

          {chars.length > 1 && (
            <div className="character-strip" role="tablist" aria-label="文本中的汉字">
              {chars.map((char, index) => (
                <button key={`${char}-${index}`} role="tab" aria-selected={selectedIndex === index} className={selectedIndex === index ? "active" : ""} onClick={() => setSelectedIndex(index)} onKeyDown={(event) => handleCharKey(event, index)}>{char}</button>
              ))}
            </div>
          )}

          <div className="toolbar" aria-label="字形显示设置">
            <div className="segmented" role="group" aria-label="字体风格">
              <button aria-pressed={fontStyle === "sans"} className={fontStyle === "sans" ? "active" : ""} onClick={() => setFontStyle("sans")}>黑体</button>
              <button aria-pressed={fontStyle === "serif"} className={fontStyle === "serif" ? "active" : ""} onClick={() => setFontStyle("serif")}>宋体</button>
            </div>
            <div className="size-control" role="group" aria-label="字形大小">
              <button onClick={() => stepSize(-1)} disabled={glyphSize === FONT_SIZE_STEPS[0]} aria-label="缩小字形">−</button>
              <output aria-live="polite">{glyphSize}<small> px</small></output>
              <button onClick={() => stepSize(1)} disabled={glyphSize === FONT_SIZE_STEPS.at(-1)} aria-label="放大字形">＋</button>
            </div>
            <button className="overlay-trigger" onClick={() => setOverlayOpen(true)}>◫ 叠加比较</button>
          </div>

          <div className="glyph-grid">
            {(Object.keys(LOCALES) as LocaleId[]).map((locale) => (
              <button className="glyph-card" key={locale} onClick={() => setFullscreenLocale(locale)} aria-label={`全屏查看${LOCALES[locale].name}字形`}>
                <div className="card-top"><LocaleBadge locale={locale} />{(locale === "sg" || locale === "my") && <span className="same-label">与中国一致</span>}</div>
                <div className="glyph-stage">{regionalForms ? <Glyph char={regionalForms[locale]} locale={locale} style={fontStyle} size={glyphSize} /> : <span className="glyph-loading" aria-label="正在转换地区写法">···</span>}</div>
                <div className="card-bottom"><span>{regionalForms && regionalForms[locale] !== selectedChar ? `${selectedChar} → ${regionalForms[locale]} · ` : ""}{fontStyle === "sans" ? "Source Han Sans" : "Source Han Serif"} · {LOCALES[locale].profile.toUpperCase()}</span><span aria-hidden="true">↗</span></div>
              </button>
            ))}
          </div>
        </section>

        <section className="details-section" aria-label="字符信息">
          <article className="info-block">
            <p className="section-kicker">READINGS</p>
            <h3>读音</h3>
            <dl className="reading-list">
              <div><dt>普通话</dt><dd>{mandarinReadings.join("、") || record.mandarin?.join("、") || "暂无数据"}</dd></div>
              <div><dt>日本語 · 音</dt><dd>{record.japaneseOn?.join("、") || "—"}</dd></div>
              <div><dt>日本語 · 訓</dt><dd>{record.japaneseKun?.join("、") || "—"}</dd></div>
            </dl>
          </article>
          <article className="info-block variant-block">
            <p className="section-kicker">VARIANTS</p>
            <h3>对应字</h3>
            {record.traditional?.length ? <div><span>繁体对应</span><div className="variant-list">{record.traditional.map((char) => <button key={char} onClick={() => { setChars([char]); setSelectedIndex(0); }}>{char}</button>)}</div></div> : record.simplified?.length ? <div><span>简体对应</span><div className="variant-list">{record.simplified.map((char) => <button key={char} onClick={() => { setChars([char]); setSelectedIndex(0); }}>{char}</button>)}</div></div> : <p className="muted">此字暂无简繁对应差异。</p>}
            {selectedChar === "发" && <p className="mapping-note">“发”对应“發”和“髮”，具体用字取决于语义；本工具不替你猜测。</p>}
          </article>
          <article className="info-block explanation-block">
            <p className="section-kicker">WHY DIFFERENT?</p>
            <h3>为什么看起来不同？</h3>
            <p>结果包含两层差异：先把输入转换为各地区常用字符，例如“见 → 見”“東 → 东”；再用对应地区字体展示相同字符可能存在的笔画与构件差异。</p>
            <details><summary>详细信息</summary><p>输入字符：{selectedChar} · U+{record.codePoint.toString(16).toUpperCase()} {record.radical ? `· 部首：${record.radical}` : ""} {record.strokes ? `· ${record.strokes} 画` : ""}<br />地区用字：OpenCC 地区转换字典<br />字体：Source Han / Noto CJK 地区字形配置</p></details>
          </article>
        </section>

        <section className="method-section">
          <div><p className="section-kicker">HOW IT WORKS</p><h2>先换地区写法，<br />再看字体字形。</h2></div>
          <div className="method-copy"><p>第一层根据中国、台湾、香港与日本的现代用字习惯转换字符；第二层再用对应地区的 Source Han 字体配置渲染。这样既能看到“见 / 見”“东 / 東”，也能观察同一字符的细微字形差异。</p><p>新加坡与马来西亚采用简体中文 CN 写法与字形配置。</p></div>
        </section>
      </main>

      <footer><div className="footer-mark"><span className="wordmark-mark">字</span><div><strong>字形</strong><p>开源的 CJK 地区字形学习工具</p></div></div><div className="footer-links"><a href="https://github.com/AceYKN/hanzi-regional-glyphs" target="_blank" rel="noreferrer">GitHub ↗</a><a href="/about">资料来源</a><span>不收集个人数据</span></div></footer>

      {fullscreenLocale && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${LOCALES[fullscreenLocale].name}字形全屏查看`}>
          <button ref={modalCloseRef} className="modal-close" onClick={() => setFullscreenLocale(null)} aria-label="关闭全屏">×</button>
          <div className="fullscreen-card"><LocaleBadge locale={fullscreenLocale} />{regionalForms && <Glyph char={regionalForms[fullscreenLocale]} locale={fullscreenLocale} style={fontStyle} size={256} />}<p>{regionalForms && regionalForms[fullscreenLocale] !== selectedChar ? `${selectedChar} → ${regionalForms[fullscreenLocale]} · ` : ""}{fontStyle === "sans" ? "Source Han Sans" : "Source Han Serif"} · {LOCALES[fullscreenLocale].profile.toUpperCase()}</p></div>
        </div>
      )}

      {overlayOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="叠加比较">
          <button ref={modalCloseRef} className="modal-close" onClick={() => setOverlayOpen(false)} aria-label="关闭叠加比较">×</button>
          <div className="overlay-panel">
            <div className="overlay-heading"><p className="section-kicker">OVERLAY</p><h2>叠加比较“{selectedChar}”</h2><p>两个地区字形共享同一坐标，可用透明度观察细微差异。</p></div>
            <div className="overlay-stage" aria-label={`${LOCALES[overlayBase].name}和${LOCALES[overlayCompare].name}的叠加字形`}>
              <span className={`glyph glyph-han-${LOCALES[overlayBase].profile}-${fontStyle} overlay-one`} style={{ opacity: baseOpacity / 100 }}>{regionalForms?.[overlayBase] ?? selectedChar}</span>
              <span className={`glyph glyph-han-${LOCALES[overlayCompare].profile}-${fontStyle} overlay-two`} style={{ opacity: compareOpacity / 100 }}>{regionalForms?.[overlayCompare] ?? selectedChar}</span>
            </div>
            <div className="overlay-controls">
              <div><span><select aria-label="基础地区" value={overlayBase} onChange={(event) => setOverlayBase(event.target.value as LocaleId)}>{(Object.keys(LOCALES) as LocaleId[]).map((id) => <option key={id} value={id}>{LOCALES[id].flag} {LOCALES[id].name}</option>)}</select><output>{baseOpacity}%</output></span><input aria-label={`${LOCALES[overlayBase].name}透明度`} type="range" min="0" max="100" value={baseOpacity} onChange={(event) => setBaseOpacity(Number(event.target.value))} /></div>
              <div><span><select aria-label="比较地区" value={overlayCompare} onChange={(event) => setOverlayCompare(event.target.value as LocaleId)}>{(Object.keys(LOCALES) as LocaleId[]).map((id) => <option key={id} value={id}>{LOCALES[id].flag} {LOCALES[id].name}</option>)}</select><output>{compareOpacity}%</output></span><input aria-label={`${LOCALES[overlayCompare].name}透明度`} type="range" min="0" max="100" value={compareOpacity} onChange={(event) => setCompareOpacity(Number(event.target.value))} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
