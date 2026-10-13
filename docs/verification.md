# 验证记录

日期：2026-10-13（Asia/Taipei）。本地仓库：`D:\Documents\GitHub\hanzi-regional-glyphs`。修改基线：`5af6f60`。

## 自动检查

- `npm ci`：成功。
- `npm run build`：类型检查及生产构建成功；Service Worker 根据实际构建产物生成，预缓存 38 个应用/数据文件。
- `npm run lint`：通过。
- `npm test`：9 项通过，覆盖生产转换函数、码点与声调、真实生成数据、偏好异常、构建资产和缓存策略。
- `npm audit`：全部依赖 0 条已知漏洞；不等于不存在未知漏洞。
- `git diff --check`：通过。

## Chromium 真实浏览器流程

在生产 `dist` 的 Vite preview（非开发服务器）上运行，使用真实页面、浏览器字体和 Service Worker。成功完成以下 18 组检查：

1. 默认同字模式，四张独立地区卡片、实际地区字体全部加载；没有第三方请求。
2. “歡迎來到東京”六字保留，选中“京”后刷新；宋体、192 px 与深色主题刷新保留。
3. “𠮷”、U+20BB7 可查询；U+D800 与 `/char/%25` 可恢复提示，无白屏。
4. gu1/gu3 不混淆；lǜ 与分解 Unicode 等价；候选可展开；コク/koku 查询正常。
5. “发”不擅自选择繁体，选择“髮”后四地区为“发/髮/髮/髪”；对应字 URL 同步。
6. 弹窗键盘循环、Escape、焦点恢复；叠加地区及透明度操作。
7. 390×844、320×740 手机视口无页面横向溢出；四地区顺序可见。
8. 来源页及返回导航正常；正常使用过程中没有未捕获页面错误。
9. 首次联网完成缓存后断网刷新、拼音查询、资料页深链接刷新正常。
10. 人为注入旧 HTML 缓存后，联网导航仍获取新版 HTML。
11. 字体请求被阻断时不显示系统回退字形；解除阻断并重试恢复。
12. localStorage 抛出 SecurityError 时页面仍正常运行。
13. 字符资料请求失败后重试恢复。
14. 转换模块请求失败后重试恢复；浏览器会缓存失败的模块，重试通过保留 URL 状态的页面重新加载实现。
15. 读音索引失败后重试恢复。
16. 分享取消不会误报成功，分享失败提供可复制链接。取消/失败通过浏览器 API 故障注入验证，未执行真实外部分享。
17. Unicode 17 扩展 J 的 U+33479 能输入；字体未收录时明确提示，无伪地区字形。
18. 延迟旧搜索响应，随后直接选“令”：旧响应不能重新覆盖候选或锁住查询按钮。

另在同一 localhost 来源切换真实旧版 `5af6f60` 与新版生产文件，完成旧 Service Worker v2 → 新版升级验证：清理本应用旧缓存，已有页面自动加载新版，恢复四张实际字体卡片。升级导航仅在已有旧应用缓存时发生；首次安装不强制刷新。

检查并查看桌面、深色、手机及叠加截图。此证据是 Chromium 浏览器及模拟手机视口，不是实体手机、Safari、Firefox 或独立人工验收。没有把“当前测试通过”写成对未来所有场景“绝无 bug”的保证。

## 可复用命令

先构建，再在一个终端执行 `npm run preview -- --host 127.0.0.1 --port 4175`，另一个终端执行：

```sh
npx --yes --package @playwright/cli playwright-cli -s=hanglyph-check open http://127.0.0.1:4175
npx --yes --package @playwright/cli playwright-cli -s=hanglyph-check run-code --filename tests/browser-check.js
npx --yes --package @playwright/cli playwright-cli -s=hanglyph-check run-code --filename tests/browser-recovery.js
npx --yes --package @playwright/cli playwright-cli -s=hanglyph-check close
```

截图保存在 `.playwright-cli/`，该目录不提交。函数脚本由 Playwright CLI 直接消费，不加入 Node 单元测试入口。

## 数据及资源边界

- Unihan 17.0.0：102,998 条记录，28 个分片，生成器检查上游压缩包 SHA-256。
- 固定 Noto CJK 上游提交中的八套 Regular 字体，经完整源码 SHA-256 验证后分片；码点覆盖来自字体真实 cmap。
- 生成字体共 700 个分片，最大文件约 456 KB；浏览器按当前字符、地区、风格加载对应分片，未缓存分片需要联网。
- 普通话主要读音来自 kMandarin；kHanyuPinyin 的其他字典读法折叠显示，避免把历史或其他字典读法当作日常常用读音。
- OpenCC 字典包仍约 1.18 MB（gzip 约 515 KB）。只有“用字转换”会执行其加载与初始化；离线预缓存会在后台下载它。没有通过隐藏构建警告冒充优化。
- 新的应用入口 JS gzip 约 87 KB，移除约 142 KB gzip 的运行时 pinyin-pro 模块；读音展示改为查询可追溯静态记录。
