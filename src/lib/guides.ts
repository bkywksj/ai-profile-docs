// 使用指南（guides 集合）的查询与排序：侧栏分组、上一篇 / 下一篇、路径都从这里取，页面不各自排序
import { getCollection, type CollectionEntry } from 'astro:content';
import { GUIDE_SECTIONS, type GuideSection } from './guide-sections';
import { pagePath } from './seo';
import { site } from '@/site.config';
import type { SidebarItem } from './sidebar';
import { sidebarPrevNext } from './sidebar';
import guideSidebarData from '@/data/guide-sidebar.json';

export { GUIDE_SECTIONS, type GuideSection };
export type Guide = CollectionEntry<'guides'>;

/** 只依赖排序所需字段，便于单测直接传普通对象 */
interface Sortable {
  id: string;
  data: { section: GuideSection; order: number };
}

/** 侧栏 / 上下篇还要用到标题 */
interface Titled extends Sortable {
  data: Sortable['data'] & { title: string };
}

/**
 * src/data/guide-sidebar.json 的一项：多层侧栏（分组 → 子分组 → 篇目，层数不限）。
 * 文件是空数组时侧栏按 section 一层分组（框架默认）；写了就完全按它排，上一篇 / 下一篇也跟着它走。
 */
export interface GuideSidebarEntry {
  /** 显示文字；指南篇目可省略，默认用该篇 title */
  text?: string;
  /** 指南 id（src/content/guides 下的相对路径去扩展名） */
  id?: string;
  /** 不是指南的链接（站内其它页面或站外） */
  href?: string;
  external?: boolean;
  /** 不写 = 固定展开；false = 可折叠默认展开；true = 默认收起（当前篇所在分组总会展开） */
  collapsed?: boolean;
  items?: GuideSidebarEntry[];
}

/** 侧栏配置（空数组 = 按 section 分组） */
export const GUIDE_SIDEBAR = guideSidebarData as GuideSidebarEntry[];

/**
 * 按「分组顺序 → 组内 order」排；order 相同按 id，保证每次构建顺序稳定。
 * @param list 待排序篇目（不会被修改）
 * @returns 新数组
 */
export function sortGuides<T extends Sortable>(list: T[]): T[] {
  const rank = (g: T) => GUIDE_SECTIONS.indexOf(g.data.section);
  return [...list].sort(
    (a, b) => rank(a) - rank(b) || a.data.order - b.data.order || a.id.localeCompare(b.id),
  );
}

/**
 * 已排序的列表按分组切开。
 * @param sorted sortGuides 的结果
 * @returns 按 GUIDE_SECTIONS 顺序的分组；没有篇目的分组不出现
 */
export function groupBySection<T extends Sortable>(sorted: T[]): { section: GuideSection; items: T[] }[] {
  return GUIDE_SECTIONS.map((section) => ({
    section,
    items: sorted.filter((g) => g.data.section === section),
  })).filter((group) => group.items.length > 0);
}

/**
 * 全站顺序里的上一篇 / 下一篇：跨分组连续，读完「入门」最后一篇直接进「进阶」第一篇。
 * @param sorted sortGuides 的结果
 * @param id 当前篇 id
 * @returns 首篇无 prev、末篇无 next；id 不存在时两边都为空
 */
export function prevNext<T extends Sortable>(sorted: T[], id: string): { prev?: T; next?: T } {
  const i = sorted.findIndex((g) => g.id === id);
  if (i === -1) return {};
  return { prev: sorted[i - 1], next: sorted[i + 1] };
}

/**
 * 指南侧栏树。
 * @param sorted sortGuides 的结果
 * @param config 侧栏配置，默认读 src/data/guide-sidebar.json；空数组 = 按 section 一层分组
 * @returns SidebarTree 组件直接可用的树
 * @throws 配置里写了不存在（或是草稿）的指南 id —— 侧栏出现一条死链比构建失败更难发现
 */
export function buildGuideTree<T extends Titled>(
  sorted: T[],
  config: GuideSidebarEntry[] = GUIDE_SIDEBAR,
): SidebarItem[] {
  if (config.length === 0) {
    return groupBySection(sorted).map(({ section, items }) => ({
      text: section,
      items: items.map((g) => ({ text: g.data.title, href: guidePath(g.id) })),
    }));
  }
  const byId = new Map(sorted.map((g) => [g.id, g]));
  const convert = (entry: GuideSidebarEntry): SidebarItem => {
    let href = entry.href;
    let text = entry.text;
    if (entry.id) {
      const guide = byId.get(entry.id);
      if (!guide) throw new Error(`guide-sidebar.json 里的指南 ${entry.id} 不存在（或是 draft）`);
      href = guidePath(entry.id);
      text ??= guide.data.title;
    }
    if (!text) throw new Error('guide-sidebar.json 有一项既没有 text 也没有 id');
    return {
      text,
      href,
      external: entry.external,
      collapsed: entry.collapsed,
      items: entry.items?.map(convert),
    };
  };
  return config.map(convert);
}

/**
 * 当前篇的上一篇 / 下一篇：配了侧栏按侧栏顺序（不在侧栏里的篇目没有上下篇，与 VitePress 一致），否则按全站排序。
 * @param sorted sortGuides 的结果
 * @param id 当前篇 id
 * @param config 侧栏配置，默认读 src/data/guide-sidebar.json
 */
export function guidePrevNext<T extends Titled>(
  sorted: T[],
  id: string,
  config: GuideSidebarEntry[] = GUIDE_SIDEBAR,
): { prev?: T; next?: T } {
  if (config.length === 0) return prevNext(sorted, id);
  const byHref = new Map(sorted.map((g) => [guidePath(g.id), g]));
  const { prev, next } = sidebarPrevNext(buildGuideTree(sorted, config), guidePath(id));
  return { prev: prev && byHref.get(prev.href!), next: next && byHref.get(next.href!) };
}

/**
 * 指南首页的分组：没配侧栏按 section；配了就按侧栏顶层分组，组内是该分组下（含子分组）全部指南。
 * @param sorted sortGuides 的结果
 * @param config 侧栏配置，默认读 src/data/guide-sidebar.json
 */
export function guideIndexGroups<T extends Titled>(
  sorted: T[],
  config: GuideSidebarEntry[] = GUIDE_SIDEBAR,
): { title: string; items: T[] }[] {
  if (config.length === 0)
    return groupBySection(sorted).map(({ section, items }) => ({ title: section, items }));
  const byId = new Map(sorted.map((g) => [g.id, g]));
  const ids = (entry: GuideSidebarEntry): string[] => [
    ...(entry.id ? [entry.id] : []),
    ...(entry.items ?? []).flatMap(ids),
  ];
  return config
    .map((entry) => ({
      title: entry.text ?? byId.get(entry.id ?? '')?.data.title ?? '',
      items: ids(entry).flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * 手机预览的实际地址：完整 https 地址原样用；站内路径拼到 site.mobilePreview.origin 上（留空 = 本站）。
 * @param preview 指南 frontmatter 的 preview
 * @param origin 预览站地址，默认读站点配置
 */
export function previewUrl(preview: string, origin: string = site.mobilePreview.origin): string {
  if (preview.startsWith('https://')) return preview;
  return origin ? `${origin.replace(/\/+$/, '')}${preview}` : preview;
}

/** 指南地址：网址形态跟随 site.urlFormat（见 lib/seo.ts 的 pagePath） */
export function guidePath(id: string): string {
  return pagePath(`/guide/${id}`);
}

/** 全部已发布指南（排除 draft），已排序 */
export async function getGuides(): Promise<Guide[]> {
  return sortGuides(await getCollection('guides', (g) => !g.data.draft));
}
