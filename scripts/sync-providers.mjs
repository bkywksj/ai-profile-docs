// 把 crate 生成的 docs/providers.md 同步成本站的 src/content/docs/reference/providers.md（VitePress 时代 scripts/sync-providers.py 的移植）。
// 为什么要脚本：providers.md 由 `cargo xtask gen-docs` 从代码生成，手抄进文档站就等于制造第二份会漂移的数据源。
// 这里只做「套一层前言 + 改写相对链接」，正文一个字不改。
//
// 这份 .md 给谁用：网页 /reference/providers 由 src/pages/reference/providers.astro 直接从 public/spec/presets.json 渲染（筛选、分段、总表），
// 这份生成物是同一份数据的文字版 —— 进 llms-full.txt、逐页 .md、Context7 与站内搜索之外的 AI 读者都读它。
// lastUpdated：正文变了才改成今天，没变保留原日期（页面「最后更新」与 sitemap lastmod 不因空跑而跳）
//
// 用法：node scripts/sync-providers.mjs [ai-profile 仓库根，默认 ../ai-profile] [目标，默认 src/content/docs/reference/providers.md]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = process.argv[2] ?? '../ai-profile';
const dst = process.argv[3] ?? 'src/content/docs/reference/providers.md';

let body = readFileSync(join(repo, 'docs', 'providers.md'), 'utf8').replace(/\r\n/g, '\n');
// 去掉生成器写给仓库维护者的 HTML 注释头（文档站读者不需要看到它）
if (body.trimStart().startsWith('<!--')) body = body.slice(body.indexOf('-->') + 3).trimStart();
// 正文里的相对链接指向仓库文件，在文档站里走不通 → 指回 GitHub
body = body.replace('[`CLAUDE.md`](../CLAUDE.md)', '[`CLAUDE.md`](https://github.com/bkywksj/ai-profile/blob/master/CLAUDE.md)');
// 生成物自带一级标题，去掉它以免与下面的重复
body = body
  .split('\n')
  .filter((l) => l.trim() !== '# 支持的服务商')
  .join('\n')
  .trimStart();

const intro = `<!-- 🔴 本页由 scripts/sync-providers.mjs 从 ai-profile 仓库的 docs/providers.md 同步而来。
     那份文件又由 \`cargo xtask gen-docs\` 从 Rust 源码生成。
     不要手改本页 —— 改预置请改 crate 里的 preset/*.rs。 -->

# 服务商清单

::: tip 这份清单由代码生成
数据源是 crate 里的 \`preset/*.rs\`，经 \`cargo xtask gen-docs\` 生成，
再同步到这里。仓库内有守卫测试 \`providers_md_in_sync\` 保证它与代码一致。

要新增或修正一家，见[加一家服务商](/reference/add-provider)。
:::

`;
const next = intro + body;

// 已有文件：拆出 frontmatter 与正文，正文没变就原样保留日期
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
let lastUpdated = today;
if (existsSync(dst)) {
  const old = readFileSync(dst, 'utf8').replace(/\r\n/g, '\n');
  const m = old.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (m && m[2] === next) lastUpdated = (m[1].match(/^lastUpdated:\s*(\S+)/m) ?? [])[1] ?? today;
}
const front = `---
title: "服务商清单"
description: "ai-profile 内置的全部服务商预置：每条的 key、能力、Base URL、默认模型与候选数、协议与最终端点、关思考参数与真实密钥核实日期，同一家共用一个密钥。"
lastUpdated: ${lastUpdated}
---
`;
writeFileSync(dst, front + next);
console.log(`已同步 ${next.length} 字符 → ${dst}（lastUpdated ${lastUpdated}）`);
