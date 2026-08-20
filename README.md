# 字形 · HanGlyph

输入一个汉字，立即比较它在中国大陆、台湾、香港、日本、新加坡和马来西亚的地区写法与实际字形。

## 功能

- 地区用字转换：`见 → 見`、`東 → 东`、`國 → 国`、`龍 → 竜`
- 六地区卡片；新加坡和马来西亚明确复用大陆简体配置
- 对应地区的 Noto / Source Han 黑体和宋体渲染
- 覆盖 CJK 基本区的静态拼音反查索引，支持无声调、声调符号及数字声调输入
- 单字、词语、文本、Unicode 和日语读音查询
- 全屏查看、任意两地区叠加、64–256 px 字号控制
- 响应式布局、深浅色主题、PWA、离线缓存和安全响应头

地区写法转换与字体字形是两个连续步骤：先用 OpenCC 得到各地区现代常用字符，再使用对应地区字体配置渲染。

## 本地开发

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

验证生产版本：

```bash
npm run build
npm run lint
npm test
```

`npm run data:build` 会使用 pinyin-pro 重新生成 `public/index/pinyin.json`。

## Cloudflare Pages

这是纯 React + TypeScript + Vite 静态站点，生产输出目录为 `dist`。仓库包含 `_headers`、`_redirects`、PWA manifest 和 Service Worker，可直接部署到 Cloudflare Pages。

## 资料与许可

地区转换使用 OpenCC，拼音索引使用 pinyin-pro，字形使用 Google Fonts 提供的 Noto Sans/Serif CJK 地区字体。应用源码采用 [MIT License](./LICENSE)，第三方许可见 [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md)。
