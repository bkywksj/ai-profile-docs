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
- [x] P0.2 site.config / docs.json / sidebar.json / PROJECT.md / 台账；public 素材（旧站 docs/public 原样 + 原型新增 5 张产品图）；llms-facts；
  context7.json（只改 folders / excludeFolders）；sync-providers / sync-spec 移植成 .mjs，新增 build-llms-full、check-links（81bc50e）
- [x] P1 旧站 `git archive` 到 $TEMP 再 `vitepress build --outDir .migrate/baseline-dist`（旧仓库 git status 为空）→ manifest → convert 23 篇（6253805）
- [x] P2 JSON-LD 照旧站 SoftwareSourceCode，补 WebSite 与版权方（646afb1）；文档页另有 TechArticle
- [x] P3 页头：文档四列大下拉（入门 / API / 参考 / AI 辅助）+ 底栏、crates.io / docs.rs 文字链接（框架 headerLinks）、抽屉手风琴；
  页底「这一页有错漏？在 crate 仓库提 issue」（框架 e9f3135，本站 4eb9e02）
- [x] P4 品牌与页面：brand.css + aiprofile.css + 图标与交互（165c203）、首页 / 产品矩阵 / 技术服务（70e19cf）、
  服务商清单 / 规范 / 更新日志数据驱动页与 /public/ai 旧网址（969a55a）、分享图与 README（57cb003）、补回旧站链接（ef9374a）、
  版权行（框架 8cb8cef，本站 56bea6f）、渲染扫描修正（290d57a、3850a36）
- [x] P5 验收（2026-11-04）：见下方读数
- [x] P5.5 源码核查与完善（6d80797、c563b76）：见 `内容核对-aiprofile.md`
- [ ] P6 切换上线（本轮不做，等用户确认）

## 验收读数（2026-11-04，删 node_modules/.astro/data-store.json 后全量构建）

- `pnpm build`：astro check 0 错误 0 警告；llms-full.txt 23 页 + 逐页 .md 23 个 + public/ai/ai-profile-integration.md；Pagefind 索引 27 页
- `pnpm test` 15 个文件 174 条全过；`check:seo` 28 页全部通过；`check:anchors` 锚点 26 个、失效 0；`check:skills` 全部通过（只有「原表引用已裁模块」的预期警告）
- `check:facts` 28 项全对（31 家 / 42 条 = 25 + 17 / 关思考 7 / 9 个文件 347 条 / 0.1.7）；`check:links` dist 35 个 HTML / CSS、站内引用 4184 处，0 断链；`llms --check` 已是最新（29 条）
- compare-baseline：26 页通过 26（description 按 metaFrom 整句换写；21 页登记 edited，代码块数 / 图片 / 链接 / canonical / JSON-LD 都守住）
- compare-site：网址 26/26、旧 sitemap 26 条全在（新站 27 条，多 /services）、/sitemap.xml 可用、静态文件 125 个全在、SoftwareSourceCode 27/27 页、robots 保留旧站 UA 与 Sitemap —— 全部通过
- 对外契约逐字节：dist 与旧站基线产物比 /spec/**（76 个）+ /ai/ai-profile-integration.md 共 77 个文件 0 不一致；
  dist 与旧仓库提交内容（git cat-file）比 /spec/**、/ai/…md、logo.svg、favicon 一组、site.webmanifest 共 86 个文件 0 不一致；
  context7.json 除 folders / excludeFolders 外与旧站逐字段相同（12 条 rules）
- Logo：dist/logo.svg 与旧站 396 字节逐字节相同（旧仓库工作区那份因 autocrlf 是 397 字节 CRLF，提交内容与线上都是 LF 的 396 字节）
- 27 页 × 1440 / 390：横向溢出 0、脚本报错 0、相邻文本块间距 ≤2px 0 处（共 739 对）、正文残留 ** 0、计算样式白名单外彩色 0
- 交互实测 19 项全过：文档大下拉、站内搜索（Verifier 23 条）、复制按钮（剪贴板内容正确）、首页代码页签、服务商分段 / 关键词 / 类型下拉 / 展开全部 31 家、
  规范页切 v0.1.1（地址与 127 条用例）、更新日志按类型筛、快速开始代码组、折叠展开、产品矩阵分类、手机抽屉与手风琴、手机「本栏目菜单」，全程无脚本报错
- 截图：$TEMP/aibid-wm/aiprofile-astro/shots/（home / quickstart / verify / providers / spec × 1440 / 390）

## 原型复审遗留小项的落地

| 复审意见 | 做法 |
|---|---|
| 右侧目录到页尾被页脚切掉 | 文档页用框架 DocsLayout 的目录（只有目录，没有下方小卡），不会再出现整列被切；原型右栏的小卡没做 |
| verify 两处断行 | 四步卡改 2×2、函数名不换行；「安全约定」一节是旧站正文原句，没有原型那段 .nw 写法 |
| 服务商表长网址词中间折行 | 渲染时在 / 与 . 后插 `<wbr>`，去掉按字符折行 |
| changelog、spec 末行孤字 | 正文 `text-wrap: pretty`；changelog 那句改「正常对话请保持开启」；spec 那句是原型文字，新站正文没有 |
| 首页 §1、§3 右侧偏空 | 标题 20px，右半边放 vendors() 三行输出与「连通 · 320ms / not_found / auth_failed」结果签 |
| 「展开全部 31 家」与下方标题过近 | 按钮下方 40px 段落间距 |
| context7 卡代码签折行 | 拆成两枚签 |
| 首页图 1「/models」挤到第二行 | ≥1280 三格按 .9 / 1.55 / .95 分、地址不换行 12px |
| services 七个图标缺名字 | 32px 图标 + 名字，单独一行放在勾选项下面，前面加「已交付」 |

## 外部依赖（crate 仓库）

crate 仓库的技能会读写文档站：命令名保持不变（`pnpm sync-providers` / `sync-spec` / `build` / `check`），路径变化在 crate 仓库同步改了技能与 CLAUDE.md（crate 提交 bf08367，本地未推送）：
downstream-sync、change-impact、git-workflow（.claude 与 .codex 两份）、CLAUDE.md 的 EdgeOne 输出目录、docs/downstream/integration-skill-template.md。
`.docs-meta.json` 的历史记录里的 `.vitepress/config.ts` 是旧同步记录，未改。

## 当前进度 / 下一步

迁移完成，本地提交，未推送、未部署、未切换。下一步 P6 等用户确认：
1. 接入旧仓库历史（`merge -s ours`）、目录改名接替 `ai-profile-docs`、补回 gitee / github / gitcode 三个远程、重装依赖
2. EdgeOne 构建预设改 Astro、输出目录 `dist`、Node ≥ 22.12（用户在后台改）
3. 推送（gitee 是上线触发源）后核对旧网址全部 200、/spec/**、/ai/…md、/llms-full.txt、逐页 .md
4. 文档站 GitHub 仓库可见性（现在公开，Context7 从这里收录）由用户定；crate 仓库 bf08367 随下次推送

## 卡点 / 决策

1. 旧站 VitePress 把 docs/public/ai/ai-profile-integration.md 也渲染成了页面 /public/ai/ai-profile-integration（旧 sitemap 有它），并由 llms 插件产出带 url 的 .md 副本。
   新站两样都保留：页面直接渲染 public 那份文件（内容集合 integration），副本由 build-llms-full 生成
2. 旧 llms.txt 列的是逐页 .md 地址（/guide/introduction.md …），框架 build-llms 只出 llms.txt：新增 build-llms-full 构建后生成 llms-full.txt 与逐页 .md，网址全部保住；
   新 llms.txt 改为框架格式（事实 + 侧栏索引 + 其他文件），条目链到页面网址
3. 框架工作区干净，三处框架改动（a4fec53、e9f3135、8cb8cef）都先修在框架、单独提交、再同步；框架只本地提交，未推送
4. Astro 编译器扫 .astro frontmatter 时，会把模板字符串里的 `/spec/…`、正则里的 `(?<!` 误判（报「Expected } but found :」），
   这类拼装挪到 src/lib/spec-page.ts、ap-format.ts
5. 本机没有 Playwright 自带的 Chromium：截图、扫描、交互、分享图渲染都用本机 Edge（channel msedge）；`pnpm og` 未跑，分享图由同一份 design/og/og-default.html 用 Edge 渲染
6. 提交粒度：56bea6f 同步框架的同时改了 site.config.ts 的版权行配置（项目配置，非框架文件）
