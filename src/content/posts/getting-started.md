---
title: 示例文章：用 next-ai-astro 搭一个内容站需要几步
description: 示例文章。next-ai-astro 是一个 AI 驱动的 Astro 内容站框架，本文按从孵化到上线的顺序说明每一步做什么、产出什么。
date: 2026-09-20
tags: [入门, 框架]
---

next-ai-astro 是一个 AI 驱动的 Astro 内容站框架：页面默认零 JavaScript，SEO 与 GEO 字段由框架统一输出，开发流程由一套 AI 技能体系驱动。

> 这是一篇示例文章，孵化新项目后可以删除或替换。

## 第一步：孵化项目

在框架目录里运行 `/kickoff <一句话想法>`。前两段只产出文档：先联网调研写需求文档，再经 AI 工作站生成原型，每一段都停下来等你确认。确认后由 `project-init` 把框架复制到你指定的目录，并改好站点名、域名和品牌色。

## 第二步：定义内容

站点的数据结构写在 `src/content.config.ts`，相当于数据库表。作品类数据通常由 `scripts/sync` 从外部接口同步，文章类内容直接写 Markdown。

| 内容类型 | 存放位置 | 维护方式 |
| --- | --- | --- |
| 分类 | `src/data/categories.json` | 手工维护 |
| 作品 | `src/data/works.json` | 数据同步脚本生成 |
| 文章 | `src/content/posts/*.md` | 手写 |

## 第三步：自主开发

需求和原型就位后，在新项目里运行 `/loop /dev-loop`。每一轮只做一个最小任务，通过构建、SEO 校验和截图比对后才提交。

## 第四步：验收与上线

上线前运行 `/seo-check`，逐页核对 canonical、描述、结构化数据与 llms.txt；通过后用 `/deploy` 构建 Docker 镜像并部署。
