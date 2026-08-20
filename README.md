# 字形 · HanGlyph

输入一个汉字，立即比较它在中国大陆、台湾、香港、日本、新加坡和马来西亚环境下的实际字形。

## 当前版本

这是依照《汉字地区字形展示网站——软件设计说明书 v1.0》实现的前端 MVP：

- 六地区字形卡片；SG / MY 明确复用 CN 字形配置
- 黑体 / 宋体切换与 64–256 px 字号控制
- 单字、词语、文本、Unicode、`gu` 与 `ほね` 查询示例
- 逐字选择、简繁多对多映射、普通话和日语读音
- 点击全屏查看、任意两地区 DOM 叠加比较
- 响应式横向滑动、键盘操作、深浅色主题与本地偏好
- Canonical 字符 URL、SEO metadata、PWA 与离线运行时缓存
- 安全响应头与不收集个人数据的静态架构

内置字符记录是一组可验证的 MVP 示例数据；`CharacterRecord` 与 UI 已按 Unihan 字段结构解耦，后续可接入完整的分片数据生成管线。

## 本地开发

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

生产构建与测试：

```bash
npm run build
npm test
```

## 部署

项目输出为 Cloudflare Worker 兼容的静态前端，可通过 Cloudflare Pages / Sites 发布。仓库包含 `_headers`、`_redirects`、PWA manifest 和 Service Worker。

## 字体与数据

界面使用 Google Fonts 提供的 Noto Sans/Serif CJK 地区字体，它们是 Adobe Source Han 系列的发行版本。字符数据模型参考 Unicode Unihan。应用源码、字体和 Unicode 数据的许可彼此独立，详见 [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md)。

## License

应用源码采用 [MIT License](./LICENSE)。
