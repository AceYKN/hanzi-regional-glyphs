import { Link } from "react-router-dom";
export default function AboutPage() {
  return (
    <main className="about-page">
      <header className="topbar">
        <Link to="/" className="wordmark">
          <span className="wordmark-mark">字</span>返回字形
        </Link>
      </header>
      <article>
        <p className="eyebrow">资料与说明</p>
        <h1>看清差异，也了解依据。</h1>
        <p>
          字形帮助学习者比较汉字的地区字体、查阅读音与简繁对应。所有查询在浏览器中完成，字体及数据由本站提供。
        </p>
        <h2>两种对照方式</h2>
        <p>
          “同字字形”保留输入的 Unicode 字符，比较中国、台湾、香港、日本四套 Noto
          CJK 字体的笔画与构件。“用字转换”按你选择的输入写法提供 OpenCC
          单字转换参考，再显示相应字体。
        </p>
        <p>
          单字转换不能识别词义。例如“发”可以对应“發”或“髮”，需先选择；“后”既有“皇后”的本义，也可对应“後”。即使资料只列一个简繁对应，也不代表任何上下文都应转换。地区字体是特定字体的设计，不等同于每个地区所有人的手写字形或法定用字标准。
        </p>
        <h2>数据来源与版本</h2>
        <ul className="source-list">
          <li>
            <a
              href="https://www.unicode.org/reports/tr38/tr38-39.html"
              target="_blank"
              rel="noreferrer"
            >
              Unicode Unihan 17.0.0
            </a>
            ：普通话 kMandarin、kHanyuPinyin，日语
            kJapaneseOn、kJapaneseKun，简繁对应
            kTraditionalVariant、kSimplifiedVariant，总笔画
            kTotalStrokes。读音反查由这些字段生成，多值保留，词中读音可能不同。未收录表示资料缺失，不表示没有读音或对应字。
          </li>
          <li>
            <a
              href="https://github.com/notofonts/noto-cjk/tree/f8d157532fbfaeda587e826d4cd5b21a49186f7c"
              target="_blank"
              rel="noreferrer"
            >
              Noto Sans / Serif CJK
            </a>
            ：固定上游版本 f8d1575，四地区常规字重的静态字体，按 Unicode
            范围分片。字体实际未收录的字符不会冒用系统字体展示。
          </li>
          <li>
            <a
              href="https://github.com/nk2028/opencc-js/tree/v1.4.1"
              target="_blank"
              rel="noreferrer"
            >
              OpenCC / opencc-js 1.4.1
            </a>
            ：地区用字转换参考。源写法需由用户选择，不能把简繁、日文异体之间的关系视为可逆或唯一对应。
          </li>
        </ul>
        <h2>地区与覆盖范围</h2>
        <p>
          新加坡、马来西亚复用中国简体配置，页面用一条说明代替重复卡片。支持
          Unicode
          汉字及扩展区输入；数据覆盖、读音收录和字体覆盖彼此不同。暂不支持带异体字选择符的字形序列。
        </p>
        <h2>离线使用</h2>
        <p>
          首次联网加载并完成缓存后，应用与字符资料可离线打开。字体按需缓存，未曾加载的字体分片仍需联网；清除网站数据后需重新缓存。字体或数据加载失败会提示重试，避免展示误导结果。
        </p>
        <h2>许可与反馈</h2>
        <p>
          源码使用 MIT License，Noto 字体使用 SIL OFL 1.1，Unihan 使用 Unicode
          License。版本、生成脚本、校验值及第三方许可随
          <a
            href="https://github.com/AceYKN/hanzi-regional-glyphs"
            target="_blank"
            rel="noreferrer"
          >
            源码仓库
          </a>
          公开。发现错字或读音问题时，请提供汉字、来源字段及可核对的资料。
        </p>
      </article>
    </main>
  );
}
