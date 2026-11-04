// 内容集合定义 —— 站点的「数据库表」
//   docs：       迁移型文档（旧 VitePress 站的 .md 原样迁入；定义在 src/lib/docs-schema.ts，栏目与侧栏见 src/data/docs.json、sidebar.json）
//   integration：给 AI 读的接入技能原文 public/ai/ai-profile-integration.md（对外契约，线上 /ai/ai-profile-integration.md 原样提供）。
//                旧站 VitePress 把 docs/public 下的这份 .md 也渲染成了页面 /public/ai/ai-profile-integration，网址要保住：
//                直接把 public 里那一份当集合读，渲染成页（src/pages/public/ai/ai-profile-integration.astro），不在 src/content 里另存一份（免得与 crate 同步的那份分叉）
// 改 schema 后跑一次 `pnpm astro sync` 刷新类型。
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsCollection } from './lib/docs-schema';

const docs = docsCollection;

const integration = defineCollection({
  loader: glob({ pattern: 'ai-profile-integration.md', base: './public/ai' }),
  // 技能文件的 frontmatter（name / description 是技能系统的字段）
  schema: z.object({ name: z.string(), description: z.string() }),
});

export const collections = { docs, integration };
