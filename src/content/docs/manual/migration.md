---
title: "从 VitePress 迁移"
description: "用 docs 模块迁移 VitePress 站：转换正文、抽取侧栏、逐页比对新旧站，切换上线前旧网址逐条确认返回 200。"
lastUpdated: 2026-11-03
---

# 从 VitePress 迁移

迁移脚本在 `scripts/migrate/`，按这个顺序用：

1. `convert.mjs`：旧站 `.md` 转成本站正文，标题与描述取旧站渲染结果，`::: code-group` 转成纯 CSS 选项卡
2. `extract-sidebar.mjs`：从旧站构建产物读出侧栏，写入 `src/data/sidebar.json`
3. `manifest.mjs` + `compare-baseline.mjs`：新旧两站逐页比对正文、图片、链接、标题、canonical
4. `compare-site.mjs`：全站比对，旧站每个网址在新站都要有对应页面

有意的改动登记在 `scripts/migrate/known-diffs.json`，比对时按登记放行。

> 切换上线前，把旧站全部网址逐条请求一遍，非 200 应为 0。正文里的 `::: tip` 这类 VitePress 写法要把 `site.markdownCompat` 设为 `vitepress` 才会还原成提示框。
