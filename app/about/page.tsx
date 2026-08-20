import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "关于与资料来源", description: "了解字形工具的数据、字体来源与地区字形处理原则。" };

export default function AboutPage() {
  return (
    <main className="about-page">
      <Link href="/" className="wordmark"><span className="wordmark-mark">字</span> 返回字形</Link>
      <article>
        <p className="section-kicker">ABOUT</p>
        <h1>让地区字形差异，<br />一眼就能看懂。</h1>
        <p className="about-lead">字形是一款面向普通学习者的 CJK 地区汉字比较工具。它专注于查询、观察、比较和理解，不试图成为完整的 Unicode 研究平台。</p>
        <h2>字形与对应字分开</h2>
        <p>地区字形比较始终使用同一个 Unicode 字符，通过不同地区的 Source Han / Noto CJK 字体配置渲染。简繁映射单独列出，因为“发”可能对应“發”或“髮”，不能由字体替换替用户猜测。</p>
        <h2>地区范围</h2>
        <p>首版提供大陆、台湾、香港、日本、新加坡和马来西亚。新加坡与马来西亚采用简体中文 CN 字形配置，并明确标注“与大陆一致”，不声称存在单独维护的地区字形标准。</p>
        <h2>资料与许可</h2>
        <p>字符数据结构基于 Unicode Unihan 字段设计；字形使用 Adobe Source Han 的 Google Noto CJK 发行版本。应用源码采用 MIT License，字体和 Unicode 数据遵循各自的第三方许可。</p>
      </article>
    </main>
  );
}
