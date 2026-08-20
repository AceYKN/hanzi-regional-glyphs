"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type LocaleId = "cn" | "tw" | "hk" | "jp" | "sg" | "my";
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
  cn: { flag: "🇨🇳", name: "大陆", profile: "cn" },
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

function normalizeQuery(input: string): { chars: string[]; notice?: string } {
  const query = input.trim();
  const unicodeMatch = query.match(/^U\+?([0-9A-F]{4,6})$/i);
  if (unicodeMatch) {
    const cp = Number.parseInt(unicodeMatch[1], 16);
    if (cp <= 0x10ffff) return { chars: [String.fromCodePoint(cp)] };
  }
  const reading = query.toLowerCase().replace(/[\s-]/g, "");
  if (["gu", "gǔ", "骨"].includes(reading)) return { chars: ["骨"] };
  if (["hone", "ほね", "ホネ"].includes(reading)) return { chars: ["骨"] };
  const chars = Array.from(query).filter((char) => HAN_RE.test(char));
  if (chars.length) return { chars };
  return { chars: [], notice: "暂未找到结果。试试“骨”、“gu”、“ほね”或“U+9AA8”。" };
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
  const modalCloseRef = useRef<HTMLButtonElement>(null);

  const selectedChar = chars[selectedIndex] ?? "骨";
  const record = useMemo(() => getRecord(selectedChar), [selectedChar]);

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

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const result = normalizeQuery(query);
    if (!result.chars.length) {
      setNotice(result.notice ?? "暂未找到结果");
      return;
    }
    const unique = Array.from(new Set(result.chars));
    setChars(unique);
    setSelectedIndex(0);
    setNotice(unique.length > 1 ? `已拆分为 ${unique.length} 个不重复汉字，点击下方字符即可逐字查看。` : "");
    const next = `/char/${encodeURIComponent(unique[0])}`;
    window.history.replaceState({}, "", next);
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
        <Link href="/" className="wordmark" aria-label="字形首页"><span className="wordmark-mark">字</span> 字形</Link>
        <nav className="top-actions" aria-label="网站导航">
          <a href="#compare">比较</a>
          <Link href="/about">关于</Link>
          <button className="icon-button" onClick={() => setTheme(theme === "system" ? "light" : theme === "light" ? "dark" : "system")} aria-label={`主题：${theme}`} title={`主题：${theme}`}>
            {theme === "light" ? "☀" : theme === "dark" ? "☾" : "◐"}
          </button>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">CJK 地区字形对照</p>
          <h1 id="hero-title">看见同一个字，<br /><span>在不同地区的样子。</span></h1>
          <p className="hero-copy">输入汉字、词语、Unicode 或读音，立即比较大陆、台湾、香港与日本的实际字形。</p>
          <form className="search-form" onSubmit={handleSearch} role="search">
            <label className="sr-only" htmlFor="han-search">输入汉字、词语或读音</label>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input id="han-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="试试：骨、发、gu、ほね、U+9AA8" autoComplete="off" />
            <button type="submit">查看字形 <span aria-hidden="true">→</span></button>
          </form>
          {notice && <p className="search-notice" role="status">{notice}</p>}
          <div className="quick-examples" aria-label="搜索示例">
            <span>快速示例</span>
            {["骨", "发", "國", "龍", "歡迎來到東京"].map((example) => (
              <button key={example} onClick={() => { setQuery(example); const result = normalizeQuery(example); setChars(Array.from(new Set(result.chars))); setSelectedIndex(0); setNotice(result.chars.length > 1 ? `已拆分为 ${Array.from(new Set(result.chars)).length} 个不重复汉字。` : ""); }}>{example}</button>
            ))}
          </div>
        </section>

        <section className="compare-section" id="compare" aria-labelledby="compare-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">同一 Unicode 字符 · U+{record.codePoint.toString(16).toUpperCase()}</p>
              <h2 id="compare-title">“{selectedChar}”的地区字形</h2>
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
                <div className="card-top"><LocaleBadge locale={locale} />{(locale === "sg" || locale === "my") && <span className="same-label">与大陆一致</span>}</div>
                <div className="glyph-stage"><Glyph char={selectedChar} locale={locale} style={fontStyle} size={glyphSize} /></div>
                <div className="card-bottom"><span>{fontStyle === "sans" ? "Source Han Sans" : "Source Han Serif"} · {LOCALES[locale].profile.toUpperCase()}</span><span aria-hidden="true">↗</span></div>
              </button>
            ))}
          </div>
        </section>

        <section className="details-section" aria-label="字符信息">
          <article className="info-block">
            <p className="section-kicker">READINGS</p>
            <h3>读音</h3>
            <dl className="reading-list">
              <div><dt>普通话</dt><dd>{record.mandarin?.join("、") || "暂无数据"}</dd></div>
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
            <p>各地区的汉字字体规范可能采用不同的笔画形态或构件布局。因此，即使 Unicode 字符完全相同，实际显示的字形也可能不同。</p>
            <details><summary>详细信息</summary><p>字符：{selectedChar} · U+{record.codePoint.toString(16).toUpperCase()} {record.radical ? `· 部首：${record.radical}` : ""} {record.strokes ? `· ${record.strokes} 画` : ""}<br />字体：Source Han / Noto CJK 地区字形配置<br />数据结构：Unicode Unihan 兼容字段</p></details>
          </article>
        </section>

        <section className="method-section">
          <div><p className="section-kicker">HOW IT WORKS</p><h2>不是换字，<br />而是换字形。</h2></div>
          <div className="method-copy"><p>地区字形区域始终渲染同一个字符，只切换受控的地区字体配置。简繁、日文常用对应字等字符替换关系，另行展示。</p><p>新加坡与马来西亚在首版采用简体中文 CN 字形配置，不虚构独立字形标准。</p></div>
        </section>
      </main>

      <footer><div className="footer-mark"><span className="wordmark-mark">字</span><div><strong>字形</strong><p>开源的 CJK 地区字形学习工具</p></div></div><div className="footer-links"><a href="https://github.com" target="_blank" rel="noreferrer">GitHub ↗</a><Link href="/about">资料来源</Link><span>不收集个人数据</span></div></footer>

      {fullscreenLocale && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${LOCALES[fullscreenLocale].name}字形全屏查看`}>
          <button ref={modalCloseRef} className="modal-close" onClick={() => setFullscreenLocale(null)} aria-label="关闭全屏">×</button>
          <div className="fullscreen-card"><LocaleBadge locale={fullscreenLocale} /><Glyph char={selectedChar} locale={fullscreenLocale} style={fontStyle} size={256} /><p>{fontStyle === "sans" ? "Source Han Sans" : "Source Han Serif"} · {LOCALES[fullscreenLocale].profile.toUpperCase()}</p></div>
        </div>
      )}

      {overlayOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="叠加比较">
          <button ref={modalCloseRef} className="modal-close" onClick={() => setOverlayOpen(false)} aria-label="关闭叠加比较">×</button>
          <div className="overlay-panel">
            <div className="overlay-heading"><p className="section-kicker">OVERLAY</p><h2>叠加比较“{selectedChar}”</h2><p>两个地区字形共享同一坐标，可用透明度观察细微差异。</p></div>
            <div className="overlay-stage" aria-label={`${LOCALES[overlayBase].name}和${LOCALES[overlayCompare].name}的叠加字形`}>
              <span className={`glyph glyph-han-${LOCALES[overlayBase].profile}-${fontStyle} overlay-one`} style={{ opacity: baseOpacity / 100 }}>{selectedChar}</span>
              <span className={`glyph glyph-han-${LOCALES[overlayCompare].profile}-${fontStyle} overlay-two`} style={{ opacity: compareOpacity / 100 }}>{selectedChar}</span>
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
