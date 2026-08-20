import type { Metadata } from "next";
import HanGlyphApp from "../../components/HanGlyphApp";

export async function generateMetadata({ params }: { params: Promise<{ char: string }> }): Promise<Metadata> {
  const { char } = await params;
  const decoded = decodeURIComponent(char);
  return {
    title: `${decoded} — 大陆、台湾、香港、日本字形比较`,
    description: `比较“${decoded}”在中国大陆、台湾、香港、日本、新加坡和马来西亚的汉字字形。`,
  };
}

export default async function CharacterPage({ params }: { params: Promise<{ char: string }> }) {
  const { char } = await params;
  const decoded = Array.from(decodeURIComponent(char))[0] || "骨";
  return <HanGlyphApp initialCharacter={decoded} />;
}
