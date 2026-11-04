# ai-profile-docs

[ai-profile](https://github.com/bkywksj/ai-profile)（AI 模型服务配置层，MIT 开源 Rust crate）的文档站，线上 https://ai-profile.ruoyi.plus 。
Astro 7 构建，骨架是 next-ai-astro 的 docs 模块（2026-11 从 VitePress 迁来，旧网址全部保留）。

## 本地开发

```bash
pnpm install
pnpm dev            # http://localhost:4321
pnpm build          # 产物在 dist/（含 Pagefind 索引、llms-full.txt 与逐页 .md）
pnpm preview
```

## 目录

```
src/content/docs/   文档正文（.md）：guide/ 指南、api/ API、reference/ 参考
src/pages/          首页、产品矩阵、技术服务；服务商清单 / 规范 / 更新日志的页面组件（reference/*.astro）
public/spec/        🔴 对外契约：presets.json、versions.json、v<版本>/、conformance/（pnpm sync-spec 从 crate 同步）
public/ai/          🔴 对外契约：ai-profile-integration.md（给 AI 读的接入规则原文）
context7.json       Context7 收录范围与规则
```

## 与 crate 仓库同步

```bash
pnpm sync-providers   # crate 的 docs/providers.md → src/content/docs/reference/providers.md（不要手改那份）
pnpm sync-spec        # 🔴 只在 crate 发版升版本号之后跑：spec/ → public/spec/，并新建 v<版本>/ 存档
pnpm build
pnpm check            # astro check + 页面里的数字与版本号对照 public/spec（check-facts）+ dist 站内断链（check-links）
```

服务商清单页的表格、统计、规范页的用例数都在构建时从 `public/spec/` 读，不手写数字。

## 部署

推送到 Gitee 后由 EdgeOne Pages 自动构建：构建命令 `pnpm build`、输出目录 `dist`、Node ≥ 22.12。
