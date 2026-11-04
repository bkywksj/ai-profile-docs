# ai-profile 文档站迁移：VitePress → Astro（next-ai-astro docs 模块）

## 目标 / 验收

把 `E:/my/桌面软件tauri/ai-profile-docs`（VitePress，26 页，https://ai-profile.ruoyi.plus）迁到 Astro，
外观按工作站原型 `E:/my/AI工作站/output/UI原型/20261104_ai-profile文档站重构/`（8 页，三轮复审，用户 2026-11-04 确认「可以 其他的按你建议」）实现，
并对照 crate 源码逐页核查完善内容（另见 `内容核对-aiprofile.md`）。

验收：
- 旧网址 100% 保留（clean 形态：/guide/introduction），sitemap 条数不少于旧站 26 条；robots、llms.txt、llms-full.txt、逐页 .md 都在
- 对外契约逐字节一致：/spec/**、/ai/ai-profile-integration.md；context7.json 只改 folders / excludeFolders
- 正文逐页比对通过（差异只能是 known-diffs 登记过的有意改动），compare-site 全过
- 删 data-store.json 后 `pnpm build` 0 错误；`pnpm test`、`check:anchors`、`check:seo`、`check:skills` 全过；dist 站内链接与资源 0 断链
- 1440 / 390 无横向溢出、无脚本报错、交互可用；容器内相邻文本块间距为 0 的处数为 0；正文残留 ** 为 0；计算样式只出现白名单色值；页头 Logo 与旧站逐字节一致
- 不推送、不部署、不切换（切换时问用户）

## 已定的决定

- 2026-11-04 用户：原型定稿；Logo / favicon / 主题色不改，配色只用旧站 style.css 的值（见 .claude/PROJECT.md「品牌」）；
  「其他语言实现」改名「规范与多语言实现」；更新日志日期以 crate CHANGELOG.md 为准；「谁在用」补 Prism 与 AI 标书工作站；
  产品矩阵加 Agile-Qt（链 https://qt.ruoyi.plus）；Codex 客户端分组数据不改，服务商页在「这张表的几条口径」里说明
- 定位：MIT 开源库。页脚「MIT License · © 2026 湛江市麻章区湖光镇若依科技工作室」；旧站「在 GitHub 上编辑此页」（指文档站仓库）不做，
  改链 crate 主仓库的 issue
- 网址：旧站 `cleanUrls: true`（config.ts），线上 sitemap 26 条，全是叶子页（含 VitePress 把 docs/public/ai/ai-profile-integration.md 也渲染成的
  /public/ai/ai-profile-integration 页）→ urlFormat clean
- 页面形态：首页、产品矩阵、技术服务（新页 /services）是 `src/pages/*.astro` 营销页；服务商清单是 `src/pages/reference/providers.astro`
  （数据从 public/spec/presets.json 构建期读，原型 _src/gen_data.cjs 的逻辑）；/public/ai/ai-profile-integration 由独立页直接渲染 public 里那份原文件
  （不在内容集合里再存一份，免得与 crate 同步的那份分叉）；其余 22 篇是三栏文档（.md）

## 盘点（旧站）

| 项 | 内容 | 新站做法 |
|---|---|---|
| 页面 | 25 个 .md（guide 8、api 9、reference 6、index、products）+ docs/public/ai/ai-profile-integration.md 被渲染成页 | docs 集合 22 篇；index / products 由 .astro 营销页出；providers 独立页；integration 独立页 |
| 扩展语法 | `::: warning` 40、`::: tip` 37、`::: danger` 24、`::: info` 4、`::: details` 2；首页 `layout: home` | convert 预转换；首页重做 |
| Vue 组件 | AProductCard（产品矩阵）、Icon | 产品矩阵 .astro 重做 |
| public | logo.svg、favicon.ico / 16 / 32、apple-touch-icon、android-chrome 192 / 512、maskable-icon-512、site.webmanifest、robots.txt、products/×9、ai/ai-profile-integration.md、spec/**（10 + 版本目录 7 个） | 原样拷 public/；robots 改框架生成；products 补原型新增的 5 张 |
| 构建期生成 | vitepress-plugin-llms：llms.txt、llms-full.txt、逐页 .md（23 个 + public/ai/ai-profile-integration.md） | llms.txt 由 build-llms（事实 + 侧栏索引）；llms-full.txt 与逐页 .md 由 scripts/build-llms-full.mjs 构建后写进 dist |
| head | title「页名 \| ai-profile — AI 模型服务配置层」、全站同一条 description、keywords、theme-color、og、icon 一组 + manifest | titleSuffix / homeTitle / keywords 照旧；description 每页单写（metaFrom 登记）；icon 一组走 site.headLinks（框架 a4fec53） |
| JSON-LD | 每页 SoftwareSourceCode（codeRepository、license MIT） | site-jsonld.ts 照旧；文档页另有 TechArticle |
| sitemap | /sitemap.xml，无分档 | docs.json sitemap.rules；/sitemap.xml 端点保留 |
| 统计 / 站长验证 | 无 / 无 | 无 |
| 脚本 | check-links.py、check-facts.py、sync-providers.py、sync-spec.py | 移植成 .mjs（pnpm check / sync-providers / sync-spec 命令名不变，crate 技能里的命令照旧可用） |

## 步骤

- [x] P0.1 孵化（7be2df1）、裁掉 examples / posts / works / faq / guides（874b218）
- [x] P0.1b 框架补 headLinks / headerLinks / socialTitle（框架 a4fec53，本站同步 b2ebbf3）
- [ ] P0.2 site.config / docs.json / sidebar.json / PROJECT.md / 台账；public 素材；llms-facts；context7.json；脚本移植
- [ ] P1 旧站复制到 $TEMP 再 vitepress build（--outDir 到 .migrate/baseline-dist，旧仓库 git status 为空）→ manifest → convert
- [ ] P2 结构化数据
- [ ] P3 页头
- [ ] P4 品牌与页面
- [ ] P5 验收
- [ ] P5.5 源码核查与完善
- [ ] P6 切换上线（本轮不做，等用户确认）

## 当前进度 / 下一步

见上方步骤。

## 卡点 / 决策

（随做随记）
