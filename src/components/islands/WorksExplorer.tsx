// 作品浏览器（React island）：搜索 + 分类 + 标签 + 排序 + 分页加载
// 用法：<WorksExplorer client:load works={...} categories={...} />
// 服务端会先按默认状态把第一页渲染成 HTML（爬虫可见），浏览器水合后再接管交互；
// 筛选状态同步到 URL 查询参数（?q=&c=&tag=&sort=），筛选结果可以直接分享。
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { WorkCard, type WorkCardData } from '@/components/works/WorkCard';
import { searchItems } from '@/lib/search';

type SortKey = 'latest' | 'oldest' | 'popular';

interface CategoryOption {
  id: string;
  name: string;
  count: number;
}

interface WorksExplorerProps {
  works: WorkCardData[];
  categories: CategoryOption[];
  /** 每次「加载更多」追加的条数 */
  pageSize?: number;
  /** 标签栏最多展示多少个（按出现次数排序） */
  maxTags?: number;
}

const SORT_LABELS: Record<SortKey, string> = {
  latest: '最新发布',
  oldest: '最早发布',
  popular: '最多浏览',
};

function readParams() {
  const params = new URLSearchParams(window.location.search);
  const sort = params.get('sort');
  return {
    query: params.get('q') ?? '',
    category: params.get('c') ?? 'all',
    tags: params.getAll('tag'),
    sort: (sort && sort in SORT_LABELS ? sort : 'latest') as SortKey,
  };
}

export default function WorksExplorer({
  works,
  categories,
  pageSize = 24,
  maxTags = 12,
}: WorksExplorerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>('latest');
  const [limit, setLimit] = useState(pageSize);
  // 读完 URL 之前不回写 URL，否则第一次渲染的默认状态会把分享链接里的参数抹掉
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 水合后再读 URL：服务端渲染用默认状态，避免首屏 hydration mismatch
  useEffect(() => {
    const initial = readParams();
    // 慢网络下用户可能在水合完成前就开始打字：输入框里已有的文字比 URL 参数更新，优先保留，
    // 否则水合会用空状态把它清掉（实测可复现）
    const typedBeforeHydration = inputRef.current?.value ?? '';
    setQuery(typedBeforeHydration || initial.query);
    setCategory(initial.category);
    setTags(initial.tags);
    setSort(initial.sort);
    setReady(true);
  }, []);

  // 状态 → URL（replaceState 不产生历史记录，返回键仍回到上一页）
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'all') params.set('c', category);
    tags.forEach((tag) => params.append('tag', tag));
    if (sort !== 'latest') params.set('sort', sort);
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ''}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', next);
    }
  }, [ready, query, category, tags, sort]);

  // 筛选条件变化时回到第一页
  useEffect(() => setLimit(pageSize), [query, category, tags, sort, pageSize]);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    works.forEach((work) => work.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
      .slice(0, maxTags)
      .map(([tag]) => tag);
  }, [works, maxTags]);

  const results = useMemo(() => {
    const filtered = works.filter(
      (work) =>
        (category === 'all' || work.categoryId === category) && tags.every((tag) => work.tags.includes(tag)),
    );
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'oldest') return a.timestamp - b.timestamp;
      if (sort === 'popular') return b.popularity - a.popularity || b.timestamp - a.timestamp;
      return b.timestamp - a.timestamp;
    });
    // 有搜索词时按相关度排，没有时保持上面的排序
    return searchItems(
      sorted.map((work) => ({ ...work, category: work.categoryName })),
      query,
    );
  }, [works, category, tags, sort, query]);

  const hasFilters = query !== '' || category !== 'all' || tags.length > 0;
  const visible = results.slice(0, limit);

  const toggleTag = (tag: string) =>
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));

  const clearAll = () => {
    setQuery('');
    setCategory('all');
    setTags([]);
  };

  const chipBase =
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors';
  const chipOn = 'border-transparent bg-ink text-canvas';
  const chipOff = 'border-line bg-elevated text-muted hover:border-ink/30 hover:text-ink';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">搜索作品</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、标签、分类…"
            className="h-11 w-full rounded-xl border border-line bg-elevated pr-4 pl-10 text-sm outline-hidden placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="shrink-0">排序</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-11 rounded-xl border border-line bg-elevated px-3 text-sm text-ink outline-hidden focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 窄屏横向滑动：隐藏滚动条（桌面浏览器窄窗口下会显示一条很粗的横向滚动条） */}
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="按分类筛选"
      >
        <button
          type="button"
          aria-pressed={category === 'all'}
          className={`${chipBase} ${category === 'all' ? chipOn : chipOff}`}
          onClick={() => setCategory('all')}
        >
          全部 <span className="tabular-nums opacity-60">{works.length}</span>
        </button>
        {categories.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={category === option.id}
            className={`${chipBase} ${category === option.id ? chipOn : chipOff}`}
            onClick={() => setCategory(option.id)}
          >
            {option.name} <span className="tabular-nums opacity-60">{option.count}</span>
          </button>
        ))}
      </div>

      {topTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="按标签筛选">
          <span className="text-xs text-muted">标签</span>
          {topTags.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTag(tag)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${
                  active
                    ? 'bg-brand-soft font-medium text-brand-ink'
                    : 'text-muted hover:bg-surface hover:text-ink'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted" aria-live="polite">
        <span>
          共 <strong className="font-semibold text-ink tabular-nums">{results.length}</strong> 条
        </span>
        {hasFilters && (
          <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 hover:text-ink">
            <X aria-hidden="true" className="size-3.5" /> 清除筛选
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((work, index) => (
            <WorkCard key={work.id} work={work} eager={index < 3} priority={index === 0} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-16 text-center">
          <p className="font-medium">没有找到匹配的作品</p>
          <p className="text-sm text-muted">换个关键词，或者清除筛选条件看看全部内容。</p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-2 rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface"
          >
            清除筛选
          </button>
        </div>
      )}

      {results.length > limit && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((current) => current + pageSize)}
            className="rounded-xl border border-line bg-elevated px-6 py-2.5 text-sm font-medium hover:bg-surface"
          >
            加载更多（还有 {results.length - limit} 条）
          </button>
        </div>
      )}
    </div>
  );
}
