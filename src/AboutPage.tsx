export default function AboutPage() {
  return (
    <main className="about-page">
      <a href="/" className="wordmark"><span className="wordmark-mark">字</span> 返回字形</a>
      <article>
        <p className="section-kicker">ABOUT</p>
        <h1>让地区写法与字形差异，<br />一眼就能看懂。</h1>
        <p className="about-lead">字形是一款面向普通学习者的 CJK 地区汉字比较工具。它同时处理地区常用字转换与受控字体字形，而不是只切换字体。</p>
        <h2>先转换地区写法，再渲染地区字形</h2>
        <p>例如输入“见”，中国显示“见”，台湾、香港和日本显示“見”；输入“東”，中国、新加坡和马来西亚显示“东”，台湾、香港和日本显示“東”。每个结果随后再使用对应地区的 Source Han / Noto CJK 字体配置渲染。</p>
        <h2>地区范围</h2>
        <p>首版提供中国、台湾、香港、日本、新加坡和马来西亚。新加坡与马来西亚采用简体中文 CN 写法与字形配置，并明确标注“与中国一致”。</p>
        <h2>资料与许可</h2>
        <p>地区用字转换使用 OpenCC 字典，拼音反查使用 pinyin-pro 生成的静态索引；字形使用 Adobe Source Han 的 Google Noto CJK 发行版本。应用源码采用 MIT License。</p>
      </article>
    </main>
  );
}
