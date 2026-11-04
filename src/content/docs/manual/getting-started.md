---
title: "docs 模块快速开始"
description: "docs 模块是 next-ai-astro 的迁移型文档站骨架：旧 VitePress 站的 .md 原样迁入，三栏布局、侧栏、面包屑、站内搜索、站点地图分档开箱即用。"
lastUpdated: 2026-11-03
---

# docs 模块快速开始

docs 模块是给「大型文档站」准备的骨架：正文保持 Markdown（`.md`），一个统一路由按文件路径出网址，左侧栏、正文、右侧「页面导航」三栏并排。

它和「使用指南」（guides 模块）的分工：

| | guides | docs |
|---|---|---|
| 正文 | MDX，可嵌文档组件 | Markdown，旧站原样迁入 |
| 适合 | 十几篇的帮助中心 | 几十到几百篇的文档站、VitePress 迁移 |
| 侧栏 | 按分组 | `src/data/sidebar.json`，全站一棵或每栏目一棵 |

## 三个要改的地方

1. `src/data/docs.json`：栏目、结构化数据、站点地图分档、IndexNow 密钥
2. `src/data/sidebar.json`：侧栏分组与顺序
3. `src/content/docs/`：正文，每篇 frontmatter 写 `title`、`description`、`lastUpdated`

## 网址

页面 id 就是相对路径去掉 `.md`：`manual/getting-started.md` 的网址按 `site.urlFormat` 生成，迁移旧站时选 `file` 或 `preserve` 保住旧网址。
