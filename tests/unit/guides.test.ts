// 使用指南的排序与上下篇（src/lib/guides.ts 的纯函数）：侧栏、指南首页、上一篇 / 下一篇都靠它定顺序
import { describe, expect, it, vi } from 'vitest';

// guides.ts 顶部引了 astro:content（只给 getGuides 用），单测只测纯函数，替身一下避免解析虚拟模块
vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

const {
  GUIDE_SECTIONS,
  sortGuides,
  groupBySection,
  prevNext,
  guidePath,
  buildGuideTree,
  guidePrevNext,
  guideIndexGroups,
  previewUrl,
} = await import('@/lib/guides');

type Section = (typeof GUIDE_SECTIONS)[number];
// 分组名一律从 GUIDE_SECTIONS 取：派生站会按自己的文档改分组（见 guides-docs 技能），写死框架示例的分组名会让它编译不过
const [S1, S2, S3] = GUIDE_SECTIONS as readonly Section[];
const g = (id: string, section: Section, order: number) => ({ id, data: { section, order } });

describe('sortGuides', () => {
  it('先按分组顺序，再按组内 order（不是按文件名、也不是按写入顺序）', () => {
    const list = [g('advanced-b', S2, 2), g('faq', S3, 1), g('start', S1, 1), g('advanced-a', S2, 1)];
    expect(sortGuides(list).map((x) => x.id)).toEqual(['start', 'advanced-a', 'advanced-b', 'faq']);
  });

  it('order 相同时按 id 排，构建结果稳定', () => {
    expect(sortGuides([g('b', S1, 1), g('a', S1, 1)]).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('不改动传入的数组', () => {
    const list = [g('b', S1, 2), g('a', S1, 1)];
    sortGuides(list);
    expect(list.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('groupBySection', () => {
  it('按 GUIDE_SECTIONS 的顺序分组，没有篇目的分组不出现', () => {
    const groups = groupBySection(sortGuides([g('f', S3, 1), g('s', S1, 1)]));
    expect(groups.map((x) => x.section)).toEqual([S1, S3]);
  });
});

describe('prevNext', () => {
  const sorted = sortGuides([g('start', S1, 1), g('advanced', S2, 1), g('faq', S3, 1)]);

  it('跨分组连续：第一组最后一篇的下一篇是第二组第一篇', () => {
    expect(prevNext(sorted, 'start').next?.id).toBe('advanced');
    expect(prevNext(sorted, 'faq').prev?.id).toBe('advanced');
  });

  it('首篇没有上一篇、末篇没有下一篇', () => {
    expect(prevNext(sorted, 'start').prev).toBeUndefined();
    expect(prevNext(sorted, 'faq').next).toBeUndefined();
  });

  it('不存在的 id 两边都为空', () => {
    expect(prevNext(sorted, 'nope')).toEqual({});
  });
});

describe('guidePath', () => {
  it('网址跟随 site.urlFormat（框架默认 directory：带结尾斜杠）', () => {
    expect(guidePath('quick-start')).toBe('/guide/quick-start/');
  });
});

describe('多层侧栏（guide-sidebar.json）', () => {
  // 带标题的篇目；配置显式传入，不依赖框架示例里那份（空数组）
  const t = (id: string, section: Section, order: number, title: string) => ({
    id,
    data: { section, order, title },
  });
  const sorted = sortGuides([
    t('a', S1, 1, 'A 篇'),
    t('b', S1, 2, 'B 篇'),
    t('c', S2, 1, 'C 篇'),
    t('d', S2, 2, 'D 篇'),
  ]);
  const config = [
    {
      text: '基础',
      items: [{ id: 'b' }, { text: '深入', collapsed: true, items: [{ id: 'c', text: '自定义标题' }] }],
    },
    { text: '外链', href: 'https://example.org', external: true },
    { id: 'a' },
  ];

  it('空配置 = 按 section 一层分组（与只有分组的站原来一致）', () => {
    expect(buildGuideTree(sorted, [])).toEqual([
      {
        text: S1,
        items: [
          { text: 'A 篇', href: '/guide/a/' },
          { text: 'B 篇', href: '/guide/b/' },
        ],
      },
      {
        text: S2,
        items: [
          { text: 'C 篇', href: '/guide/c/' },
          { text: 'D 篇', href: '/guide/d/' },
        ],
      },
    ]);
  });

  it('按配置建树：id 转网址、省略 text 用篇目标题，层级与折叠原样保留', () => {
    const tree = buildGuideTree(sorted, config);
    expect(tree[0].items?.[0]).toMatchObject({ text: 'B 篇', href: '/guide/b/' });
    expect(tree[0].items?.[1]).toMatchObject({ text: '深入', collapsed: true });
    expect(tree[0].items?.[1].items?.[0]).toMatchObject({ text: '自定义标题', href: '/guide/c/' });
    expect(tree[2]).toMatchObject({ text: 'A 篇', href: '/guide/a/' });
  });

  it('配置里写了不存在的指南 id → 构建失败（不让侧栏出现死链）', () => {
    expect(() => buildGuideTree(sorted, [{ id: 'nope' }])).toThrow(/nope/);
  });

  it('配了侧栏，上一篇 / 下一篇按侧栏顺序；没进侧栏的篇目（d）没有上下篇', () => {
    expect(guidePrevNext(sorted, 'c', config)).toEqual({ prev: sorted[1], next: sorted[0] });
    expect(guidePrevNext(sorted, 'd', config)).toEqual({});
    // 空配置退回全站排序
    expect(guidePrevNext(sorted, 'b', []).next?.id).toBe('c');
  });

  it('指南首页分组：配了侧栏按顶层分组收齐子分组里的篇目', () => {
    expect(guideIndexGroups(sorted, config).map((g) => [g.title, g.items.map((x) => x.id)])).toEqual([
      ['基础', ['b', 'c']],
      ['A 篇', ['a']],
    ]);
    expect(guideIndexGroups(sorted, []).map((g) => g.title)).toEqual([S1, S2]);
  });
});

describe('previewUrl', () => {
  it('完整 https 地址原样用；站内路径拼到预览站上；预览站留空 = 本站路径', () => {
    expect(previewUrl('https://m.a.com/x', 'https://m.b.com')).toBe('https://m.a.com/x');
    expect(previewUrl('/pages/grid', 'https://m.b.com/')).toBe('https://m.b.com/pages/grid');
    expect(previewUrl('/pages/grid', '')).toBe('/pages/grid');
  });
});
