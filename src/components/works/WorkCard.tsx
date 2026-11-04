// 作品卡片：同一个组件两种用法 ——
//   1) 在 .astro 页面里直接渲染（不加 client:*）→ 纯静态 HTML，零 JS
//   2) 在 WorksExplorer island 里渲染 → 跟随筛选状态重绘
// 所以这里只能用「服务端已算好」的数据（WorkCardData），不能在组件里调 getImage / getCollection。
import type { CSSProperties } from 'react';
import type { ResolvedImage } from '@/lib/images';

export interface WorkCardData {
  id: string;
  title: string;
  summary: string;
  href: string;
  categoryId: string;
  categoryName: string;
  tags: string[];
  /** 可见日期文本，如 2026-09-25 */
  date: string;
  /** <time datetime> 用的 ISO 字符串 */
  dateISO: string;
  /** 排序用时间戳 */
  timestamp: number;
  cover: ResolvedImage;
  /** 时长角标文本（有才显示） */
  duration?: string;
  /** 播放量等热度文本（有才显示） */
  views?: string;
  /** 「最热」排序用的原始数值 */
  popularity: number;
}

interface WorkCardProps {
  work: WorkCardData;
  /** 首屏可见的几张设为 true：不懒加载（loading=eager） */
  eager?: boolean;
  /**
   * 整页最重要的那一张图设为 true：fetchpriority=high，帮 LCP。
   * 每页只给一张——多张同时 high 等于没有优先级。
   */
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
}

/** view-transition-name 必须是合法 CSS 标识符 */
export function coverTransitionName(id: string): string {
  return `cover-${id.replace(/[^A-Za-z0-9_-]/g, '-')}`;
}

export function WorkCard({ work, eager = false, priority = false, headingLevel = 'h3' }: WorkCardProps) {
  const Heading = headingLevel;
  // 只有被悬停/聚焦的那张卡才真正拿到 view-transition-name（CSS 见 .vt-card 规则），
  // 列表上几百张卡同时命名会让浏览器在跳转时截几百张快照。
  const vtStyle = { '--vt-name': coverTransitionName(work.id) } as CSSProperties;

  return (
    <article
      className="vt-card group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated shadow-[var(--shadow-card)] transition duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand"
      style={vtStyle}
    >
      <div className="relative aspect-video overflow-hidden bg-surface">
        <img
          className="vt-cover size-full object-cover transition duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
          src={work.cover.src}
          srcSet={work.cover.srcSet}
          sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
          width={work.cover.width}
          height={work.cover.height}
          alt=""
          loading={eager || priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
        />
        {work.duration && (
          <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
            {work.duration}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="font-medium text-brand-ink">{work.categoryName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={work.dateISO}>{work.date}</time>
          {work.views && (
            <>
              <span aria-hidden="true">·</span>
              <span>{work.views} 次浏览</span>
            </>
          )}
        </div>
        <Heading className="line-clamp-2 text-base leading-snug font-semibold">
          {/* 整卡可点：链接的 ::after 铺满卡片，比给 <article> 套 <a> 更利于读屏与 SEO */}
          <a
            href={work.href}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-hidden"
          >
            {work.title}
          </a>
        </Heading>
        <p className="line-clamp-2 text-sm leading-6 text-muted">{work.summary}</p>
      </div>
    </article>
  );
}

export default WorkCard;
