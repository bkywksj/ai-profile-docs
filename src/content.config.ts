// 内容集合定义 —— 站点的「数据库表」
// 三类集合对应内容站的三种典型数据：
//   docs：      迁移型文档（旧 VitePress 站的 .md 原样迁入；定义在 src/lib/docs-schema.ts，栏目与侧栏见 src/data/docs.json、sidebar.json）
// 改 schema 后跑一次 `pnpm astro sync` 刷新类型。
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsCollection } from './lib/docs-schema';

const docs = docsCollection;

export const collections = { docs };
