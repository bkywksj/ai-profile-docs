---
title: "docs.json 配置项"
description: "docs 模块的站点配置 src/data/docs.json：栏目与入口、最后更新日期、TechArticle 结构化数据、站点地图分档、IndexNow 与 llms.txt。"
lastUpdated: 2026-11-03
---

# docs.json 配置项

站点相关的值都在 `src/data/docs.json`，模块代码在各站逐字节相同，框架同步时不会冲突。用 JSON 而不是 TypeScript，是因为 `scripts/` 下的 Node 脚本也要读它。

## 栏目

```json
"sections": [{ "id": "guide", "label": "入门", "home": "guide/getting-started" }]
```

`home` 是面包屑上栏目名点过去的地方：写文档 id 指向那一篇，写 `/features` 这样的站内路径指向独立栏目页，省略时指向栏目首页 `guide/index`。

## 最后更新

| 字段 | 取值 | 作用 |
|---|---|---|
| `lastUpdated` | `required` / `optional` / `off` | 每篇 frontmatter 的 `lastUpdated` 是否必填、页底是否显示 |
| `sitemapLastmod` | `strict` / `known` / `off` | 站点地图的 lastmod：缺日期时构建失败 / 有就写 / 不写 |

## 站点地图分档

`sitemap.rules` 按顺序匹配，第一条命中的生效：`paths` 是整条相等，`prefixes` 是前缀。没命中的走 `fallback`。

## IndexNow

`indexnow.key` 对应 `public/<key>.txt`，脚本推送前会检查这个文件在不在，避免推出去被搜索引擎拒收。
