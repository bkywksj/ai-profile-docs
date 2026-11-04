# PROJECT.md - ai-profile 文档站

## 项目事实（只写用户确认过的内容）
- 站点定位：ai-profile 是 MIT 开源的 Rust crate（AI 模型服务配置层：服务商预置、ai.profile 跨应用互通、端点拼接、零成本验证、限额与历史裁剪、流式解码、生图 / 视频 / 配音调用）。本站是它的文档站
- 生产域名：https://ai-profile.ruoyi.plus；旧站 VitePress 仓库 `E:/my/桌面软件tauri/ai-profile-docs`（远程 gitee / github / gitcode，上线触发源是 gitee）。
  本目录 `E:/my/桌面软件tauri/ai-profile-docs-astro` 是 2026-11-04 起的 Astro 迁移版，**尚未切换上线**
- 迁移台账 `docs/tasks/active/迁移-aiprofile.md`；源码核对台账 `docs/tasks/active/内容核对-aiprofile.md`
- 🔴 真相源：crate 仓库 `E:/my/桌面软件tauri/ai-profile`（公开 API 以 `crates/ai-profile/src/lib.rs` 的 pub use 与各模块 pub 项为准；版本看 Cargo.toml 与 CHANGELOG.md；
  下游名单看 `docs/downstream.md`）。不编数字：服务商数、预置数、用例数都从 `public/spec/` 读
- 🔴 品牌（用户定的，不得更改）：Logo 用旧站 `docs/public/logo.svg` 原文件（逐字节不动），favicon 一组与 site.webmanifest 照搬；
  主题色靛蓝，配色只用旧站 style.css 的值：主按钮 #4338ca 实底；#4f46e5 只做链路签当前段、下划线、圆点；深色代码窗里用 #a5b4fc / #818cf8；
  焦点环与图形线条 #6366f1；品牌浅底 rgba(79,70,229,.14)；红线记号 #B42318（浅底 #FDECEA）只表示「照这样做会 404 或与本库行为分叉」。不用渐变、不用毛玻璃
- 定位口径：MIT 开源库。页脚「MIT License · © 2026 湛江市麻章区湖光镇若依科技工作室」；不出现「商业授权」类口径；不链文档站仓库（是否公开以后会变），
  问题与建议链 crate 主仓库 github.com/bkywksj/ai-profile 的 issue
- 设计：按工作站原型 `E:/my/AI工作站/output/UI原型/20261104_ai-profile文档站重构/`（三轮复审，用户 2026-11-04 确认）实现
- 骨架：next-ai-astro @3bb744b 孵化，只留 docs 模块（见 .framework-sync.json）。本站差异只在 `src/site.config.ts`、`src/data/*`、
  `src/styles/brand.css`、`src/styles/aiprofile.css`、`src/lib/site-jsonld.ts`、`src/components/aiprofile/`、独立页面与 `scripts/` 下本站自己的脚本。
  🔴 发现模块文件的问题修在框架（`E:/my/AI框架/next-ai-astro`）再同步；就地改了要单独 `feat|fix(framework)` 提交并回流框架

## 参考代码位置（覆盖 CLAUDE.md）
| 开发类型 | 参考文件 |
|---|---|
| 文档页（.md + 三栏） | `src/pages/[...slug].astro` + `src/layouts/DocsLayout.astro` + `src/lib/docs.ts`（配置 `src/data/docs.json`、侧栏 `src/data/sidebar.json`） |
| 营销页（首页、产品矩阵、技术服务） | `src/pages/index.astro`、`src/pages/products.astro`、`src/pages/services.astro`；样式 `src/styles/aiprofile.css`（全部挂在 `.ap` 作用域下），交互 `src/components/aiprofile/PageScript.astro` |
| 数据驱动的文档页（服务商清单） | `src/pages/reference/providers.astro`（数据 `src/lib/spec-data.ts` 读 `public/spec/`） |
| llms.txt / llms-full.txt / 逐页 .md（原生成型端点 src/pages/llms.txt.ts，本站不用） | `scripts/build-llms.mjs` + `src/data/llms-facts.md`（产物 `public/llms.txt`）；`scripts/build-llms-full.mjs`（构建后写进 dist） |
| robots / sitemap / 结构化数据 | `src/pages/robots.txt.ts`、`src/data/ai-crawlers.json`、`src/data/docs.json` 的 `sitemap`、独立页日期 `src/data/page-dates.json`、`src/lib/site-jsonld.ts` |

## 外部依赖本站的文件（crate 仓库的技能会读写）
| 路径 | 谁在用 |
|---|---|
| `public/spec/**`（presets.json、versions.json、v<版本>/、conformance/） | crate 的 `downstream-sync` / `crate-release`：发版后 `pnpm sync-spec`。🔴 对外契约，已发布版本目录冻结 |
| `src/content/docs/reference/providers.md` | `pnpm sync-providers`（crate 的 `docs/providers.md` 生成物，不要手改） |
| `src/content/docs/api/*.md`、`guide/frontend.md`、`reference/changelog.md` | crate 改 API / 发版时同步改 |
| `public/ai/ai-profile-integration.md` | crate 的 `change-impact`：外部 AI 照它写代码，API 变了它要跟上。🔴 对外契约，线上 /ai/ai-profile-integration.md |
| `context7.json` | Context7 收录范围与规则（folders 指 src/content/docs 与 public/ai） |

## 专属禁令（优先级高于 CLAUDE.md）
- 🔴 **推送与上线前必须问用户**
- 🔴 Logo、favicon、主题色见上方「品牌」；`grep -rniE "#(6366f1|818cf8|a5b4fc)" src/styles` 只允许出现在深色代码窗 / 图形线条规则里
- 🔴 数字（服务商 31 家、预置 42 条、用例数、当前版本）写在页面里的，`pnpm check:facts` 有登记；改了数字或发了版先跑它
- 加粗两端别紧挨全角标点又紧跟汉字（`**x**，` 后面直接接汉字会露出 **）
- 营销页 / 页面自己的重置样式要加 `:not(.vp-doc *)`，别压掉正文间距；收起的 details 内容 display:none

## 与框架的差异
- 裁剪掉的模块：examples、posts、works、faq、guides
- 网址：urlFormat clean（旧站 cleanUrls: true，叶子页 /guide/introduction）；markdownCompat vitepress
- 构建末尾多一步 `scripts/build-llms-full.mjs`（llms-full.txt 与逐页 .md，旧站 vitepress-plugin-llms 的产物）

## 部署（切换上线后）
- EdgeOne Pages 连 gitee `bkywksj/ai-profile-docs`：构建预设改 Astro，构建命令 `pnpm build`、输出目录 `dist`、Node ≥ 22.12
- 托管平台必须把 `/guide/introduction` 解析到 `guide/introduction.html`（EdgeOne Pages 默认如此）
