// works / categories 集合的查询封装：页面只调这里，不直接写 getCollection + 排序逻辑，
// 保证列表页、分类页、详情页、llms.txt 看到的顺序和字段完全一致。
import { getCollection, type CollectionEntry } from 'astro:content';
import { formatCount, formatDate, formatDuration, isoDate } from './format';
import { resolveCover } from './images';
import type { WorkCardData } from '@/components/works/WorkCard';

export type Work = CollectionEntry<'works'>;
export type Category = CollectionEntry<'categories'>;

/** 全部作品，按发布时间倒序 */
export async function getWorks(): Promise<Work[]> {
  const works = await getCollection('works');
  return works.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** 全部分类，按 order 升序 */
export async function getCategories(): Promise<Category[]> {
  const categories = await getCollection('categories');
  return categories.sort((a, b) => a.data.order - b.data.order);
}

export function workPath(id: string): string {
  return `/works/${id}/`;
}

export function categoryPath(id: string): string {
  return `/works/category/${id}/`;
}

/** 同分类的其他作品，用于详情页「相关推荐」 */
export function relatedWorks(all: Work[], current: Work, limit = 3): Work[] {
  return all
    .filter((work) => work.id !== current.id && work.data.category.id === current.data.category.id)
    .slice(0, limit);
}

/** 统计每个分类下的作品数 */
export function countByCategory(works: Work[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const work of works) {
    const id = work.data.category.id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** 转成卡片数据（服务端执行：封面在这里完成构建期优化） */
export async function toCardData(work: Work, categories: Category[]): Promise<WorkCardData> {
  const category = categories.find((item) => item.id === work.data.category.id);
  const metrics = work.data.metrics ?? {};
  return {
    id: work.id,
    title: work.data.title,
    summary: work.data.summary,
    href: workPath(work.id),
    categoryId: work.data.category.id,
    categoryName: category?.data.name ?? work.data.category.id,
    tags: work.data.tags,
    date: formatDate(work.data.date),
    dateISO: isoDate(work.data.date),
    timestamp: work.data.date.getTime(),
    cover: await resolveCover(work.data.cover),
    duration: typeof metrics.duration === 'number' ? formatDuration(metrics.duration) : undefined,
    views: typeof metrics.views === 'number' ? formatCount(metrics.views) : undefined,
    popularity: typeof metrics.views === 'number' ? metrics.views : 0,
  };
}

export async function toCardList(works: Work[], categories: Category[]): Promise<WorkCardData[]> {
  return Promise.all(works.map((work) => toCardData(work, categories)));
}
