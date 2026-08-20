import type { Metadata } from "next";
import HanGlyphApp from "./components/HanGlyphApp";

export const metadata: Metadata = {
  title: "字形 — 汉字地区字形对照",
  description: "输入一个汉字，立即比较它在大陆、台湾、香港、日本、新加坡和马来西亚环境下的实际字形。",
};

export default function Home() {
  return <HanGlyphApp initialCharacter="骨" />;
}
