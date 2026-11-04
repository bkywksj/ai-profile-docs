// posts 集合的查询封装：草稿过滤与排序只在这里写一次，
// 首页、文章列表、文章详情、llms.txt 看到的文章集合与顺序完全一致。
import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 已发布文章（排除 draft），按发布时间倒序 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** 文章地址：glob loader 的 id 可能带子目录（2026/xxx），直接拼接即可 */
export function postPath(id: string): string {
  return `/posts/${id}/`;
}
