import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "字形 — 汉字地区字形对照", template: "%s · 字形" },
  description: "输入一个汉字，立即比较它在大陆、台湾、香港、日本、新加坡和马来西亚环境下的实际字形。",
  applicationName: "字形",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  keywords: ["汉字", "字形", "CJK", "繁体字", "简体字", "日本汉字"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "字形",
    title: "字形 — 看见汉字在不同地区的样子",
    description: "大陆、台湾、香港、日本、新加坡与马来西亚汉字字形对照工具。",
    images: [{ url: "/og.png", width: 1729, height: 910, alt: "字形 — 看见汉字在不同地区的样子" }],
  },
  twitter: { card: "summary_large_image", title: "字形 — 汉字地区字形对照", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111310" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><body>{children}</body></html>;
}
