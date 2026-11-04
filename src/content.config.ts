// 内容集合定义 —— 站点的「数据库表」
// 三类集合对应内容站的三种典型数据：
//   categories：分类（手工维护的分类体系，也是分类落地页的来源）
//   works：     作品条目（通常由 scripts/sync 从外部接口同步生成 JSON，也可手写）
//   posts：     Markdown 文章（手写长文，GEO 的主要承载体）
//   guides：    使用指南（MDX，正文里嵌 Steps / Callout / Screenshot 等文档组件；分组与排序见 src/lib/guides.ts）
//   docs：      迁移型文档（旧 VitePress 站的 .md 原样迁入；定义在 src/lib/docs-schema.ts，栏目与侧栏见 src/data/docs.json、sidebar.json）
// 改 schema 后跑一次 `pnpm astro sync` 刷新类型。
import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { GUIDE_SECTIONS } from './lib/guide-sections';
import { docsCollection } from './lib/docs-schema';

const categories = defineCollection({
  loader: file('src/data/categories.json'),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/, '分类 id 只能用小写字母、数字、连字符（会直接进 URL）'),
    name: z.string(),
    /** 分类落地页的导语，也是该页 meta description，写成完整的定义句 */
    description: z.string(),
    order: z.number().default(0),
  }),
});

const works = defineCollection({
  loader: file('src/data/works.json'),
  schema: z.object({
    id: z.string().regex(/^[A-Za-z0-9_-]+$/, '作品 id 会进 URL，只能用字母、数字、下划线、连字符'),
    title: z.string(),
    /** 一两句话的摘要：卡片与 meta description 用 */
    summary: z.string(),
    /** 详情页正文（纯文本，按空行分段） */
    description: z.string().optional(),
    category: reference('categories'),
    tags: z.array(z.string()).default([]),
    date: z.coerce.date(),
    /** 封面：外链（域名需在 site.imageDomains 中才会被优化）或 public/ 下的路径 */
    cover: z.string(),
    /**
     * 作品原始地址（如视频平台链接），详情页的主 CTA。
     * 🔴 必须限定 http/https：Zod 4 的 z.url() 默认放行 javascript: 与 data:，
     *    而这个字段会渲染进 <a href>，数据源被污染时就是存储型 XSS。
     */
    url: z.url({ protocol: /^https?$/ }).optional(),
    featured: z.boolean().default(false),
    /** 可选数值指标：播放量、点赞数、时长（秒）等，键名自定 */
    metrics: z.record(z.string(), z.number()).optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    /** 必填：meta description + 指南首页卡片摘要 */
    description: z.string(),
    /** 侧栏分组；可选值与顺序在 src/lib/guide-sections.ts */
    section: z.enum(GUIDE_SECTIONS),
    /** 组内顺序，越小越靠前 */
    order: z.number().int(),
    /** 「约 3 分钟」这类读者可感知的用时 */
    duration: z.string().optional(),
    /** 说明对应的最低产品版本，如 1.2.0；文档描述某个软件 / 接口版本时填 */
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/, '版本号写成 1.2.0 这样的三段数字')
      .optional(),
    /** 需要提前准备的东西，如「一个 API Key」 */
    prepare: z.string().optional(),
    /**
     * 本篇常见问题：页尾渲染成可展开的问答，同时输出 FAQPage 结构化数据。
     * 只写页面上真会显示的内容（不可见内容标 FAQ 属于违规），答案用纯文本
     */
    faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).default([]),
    updated: z.coerce.date(),
    /** false：H1 下不渲染 description 导语（从别的站迁来的篇目，描述常取自正文首段，再渲染一遍就重复了） */
    lead: z.boolean().default(true),
    /** 右侧显示手机实时预览：预览站（site.mobilePreview.origin）上的路径，或完整 https 地址；有它时右侧不显示「本页内容」 */
    preview: z
      .string()
      .refine(
        (v) => v.startsWith('/') || v.startsWith('https://'),
        'preview 写站内路径（/ 开头）或 https 地址',
      )
      .optional(),
    draft: z.boolean().default(false),
  }),
});

const docs = docsCollection;

export const collections = { categories, works, posts, guides, docs };
