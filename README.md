# 字形 · HanGlyph

查询一个汉字，或一段文字，比较中国、台湾、香港、日本的地区字体字形，查阅普通话、日语读音及简繁对应。

在线体验：[hanzi-regional-glyphs.pages.dev](https://hanzi-regional-glyphs.pages.dev/)

- **同字字形**：默认保留同一 Unicode 字符，比较四套实际加载的 Noto CJK 字体。
- **用字转换**：选择输入写法，查看 OpenCC 单字转换参考。一对多对应要求先选择，不能代替词义判断。
- **查询**：汉字、文本、Unicode、带/不带声调的单音节拼音、日语假名或罗马字。日语罗马字需选择“日语读音”。候选可继续展开。
- **查看**：黑体/宋体、字号、放大、两地区叠加；适配手机和键盘操作。
- **数据**：Unihan 17.0.0 生成的 102,998 条字符记录，包含读音、简繁对应、总笔画；每个字段在资料页说明来源和限制。
- **离线**：应用和资料预缓存，字体按需缓存。未加载过的字体分片需要联网。加载失败有明确提示及重试。

新加坡、马来西亚复用中国简体配置，页面注明而不重复显示卡片。字体设计、地区用字转换、Unicode 对应关系是不同层次，均不能等同于所有地区的手写字形或官方用字规范。

## 开发与验证

Node.js 22.13+：

```sh
npm ci
npm run dev
npm run build
npm run lint
npm test
npm run preview
```

测试需要先构建。CI 在 Linux / Node 22 执行构建、lint、测试和生产依赖审计。真实浏览器验证流程见 `docs/verification.md`。

## 数据与字体生成

生成结果随仓库发布，普通构建无需 Python 或在线下载。`npm run data:build` 从已固定的 Unihan 记录生成反查索引，结果可复现。

```sh
# 维护数据版本时执行，不是部署前提
npm run data:unihan
python -m pip install fonttools brotli
npm run data:fonts
```

`build-unihan.py` 下载 Unicode 17.0.0，并验证固定 SHA-256。`build-fonts.py` 下载固定 Noto CJK Git 提交中的八套常规字体，保留实际码点覆盖并按 1024 码点分片，输出来源、哈希、覆盖目录和许可。维护时在空目录重新生成字体，避免遗留旧分片；具体版本见 `public/data/unihan/manifest.json` 和 `public/fonts/manifest.json`。生成器的 Python 依赖见 `scripts/requirements.txt`。

## Cloudflare Pages

静态 React + TypeScript + Vite 站点。构建命令 `npm run build`，发布目录 `dist`。构建后自动生成带内容版本的 Service Worker，预缓存真实资产路径与全部字符数据。导航优先联网，断网时回退已缓存应用；不会长期返回旧 HTML，也不会删除其他应用的缓存。

所有字体与查询数据由本站提供，无 Google Fonts 或第三方运行时请求。响应头配置在 `public/_headers`，SPA 路由在 `public/_redirects`。

## 许可

源码 MIT；Noto CJK 为 SIL OFL 1.1；Unihan 为 Unicode License。来源与完整许可见 [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md)。
