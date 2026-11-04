// llms.txt：给 AI 的站点摘要（https://llmstxt.org 约定格式）
// 由集合数据自动生成，内容与站点永远同步；不要手写静态文件放 public/
import type { APIRoute } from 'astro';
import { site } from '@/site.config';
import { absoluteUrl } from '@/lib/seo';
import { getPosts, postPath } from '@/lib/posts';
import { getGuides, guidePath } from '@/lib/guides';
import { categoryPath, countByCategory, getCategories, getWorks, workPath } from '@/lib/works';

/** 作品太多时只列最新的 N 条，完整列表交给 sitemap */
const MAX_WORKS = 200;

export const GET: APIRoute = async () => {
  const [works, categories, posts] = await Promise.all([getWorks(), getCategories(), getPosts()]);
  const guides = await getGuides();
  const counts = countByCategory(works);

  const sections = [
    `# ${site.name}`,
    '',
    `> ${site.tagline}`,
    '',
    site.description,
    '',
    '## 分类',
    '',
    ...categories.map(
      (category) =>
        `- [${category.data.name}](${absoluteUrl(categoryPath(category.id))}): ${category.data.description}（${counts.get(category.id) ?? 0} 条）`,
    ),
    '',
    `## 作品${works.length > MAX_WORKS ? `（最新 ${MAX_WORKS} 条，共 ${works.length} 条）` : ''}`,
    '',
    ...works
      .slice(0, MAX_WORKS)
      .map((work) => `- [${work.data.title}](${absoluteUrl(workPath(work.id))}): ${work.data.summary}`),
    '',
    '## 文章',
    '',
    ...posts.map(
      (post) => `- [${post.data.title}](${absoluteUrl(postPath(post.id))}): ${post.data.description}`,
    ),
    '',
    '## 使用指南',
    '',
    ...guides.map(
      (guide) => `- [${guide.data.title}](${absoluteUrl(guidePath(guide.id))}): ${guide.data.description}`,
    ),
    '',
    // llmstxt.org 约定：「Optional」分组里的链接可在上下文不够时被 AI 跳过
    '## Optional',
    '',
    `- [关于本站](${absoluteUrl('/about/')})`,
    `- [站点地图](${absoluteUrl('/sitemap-index.xml')})`,
    '',
  ];

  return new Response(sections.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
