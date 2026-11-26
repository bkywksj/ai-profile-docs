// E2E 公共工具：各模块的 spec 共用，不属于任何可裁剪模块
import type { Page } from '@playwright/test';

/**
 * 等页面上的 island 水合完成：Astro 水合后会移除 astro-island 的 ssr 属性。
 * astro-island 是 display: contents，永远不「可见」，只能等 attached。
 * @param page 当前页面
 * @returns 第一个 island 水合完成后 resolve；页面上没有 island 时会一直等到超时，所以只在有 island 的页面调用
 */
export async function waitForHydration(page: Page) {
  await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
}

/** 一处对比度不达标的文字 */
export interface ContrastIssue {
  ratio: number;
  /** 前景 / 背景（背景已按半透明层逐层合成），rgb(r,g,b) */
  fg: string;
  bg: string;
  /** 标签名 + class，定位用 */
  sel: string;
  text: string;
}

/**
 * 找出当前页面上对比度低于 WCAG AA 的可见文字（正文 4.5:1，大字 3:1）。
 * 为什么要有：深色模式下「底色写死成浅色、文字却跟主题翻成浅色」这类问题，构建、check:seo、单测全都是绿的，只有算对比度才抓得到（知识库首页对比表实录）。
 * 边界：
 * - 背景层带 background-image（渐变 / 图片）的文字无法判定，跳过；
 * - pre 里的代码高亮由代码主题负责、svg / aria-hidden 不是正文，跳过；
 * - 有意固定配色的区域（如应用界面示意图）给容器加 data-contrast-ignore 跳过；
 * - 只看当前可见的元素，未打开的弹层、抽屉不在其内。
 * @param page 已加载完成的页面
 * @returns 不达标的文字，按对比度从低到高；同一选择器 + 同样文字只报一次
 */
export async function findLowContrast(page: Page): Promise<ContrastIssue[]> {
  return page.evaluate(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true })!;
    // 交给 canvas 解析颜色：computed 值可能是 oklab() / color-mix 结果，canvas 能读成 sRGB
    const toRgba = (c: string): number[] => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = c;
      cx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const blend = (top: number[], bottom: number[]) => [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1);
    // 从元素往上收集背景层，直到遇到不透明的一层；遇到背景图返回 null
    const bgOf = (el: Element): number[] | null => {
      const layers: number[][] = [];
      for (let n: Element | null = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        // 荧光笔式的 linear-gradient(transparent …) 只盖住下半截文字，不影响判定
        if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('linear-gradient(transparent')) return null;
        const c = toRgba(cs.backgroundColor);
        if (c[3] > 0) layers.push(c);
        if (c[3] >= 1) break;
      }
      let base = [255, 255, 255, 1];
      if (!layers.length || layers[layers.length - 1][3] < 1) {
        const root = toRgba(getComputedStyle(document.documentElement).backgroundColor);
        if (root[3] >= 1) base = root;
      }
      return layers.reverse().reduce((acc, l) => blend(l, acc), base);
    };

    const out: { ratio: number; fg: string; bg: string; sel: string; text: string }[] = [];
    const seen = new Set<string>();
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('svg, pre, script, style, noscript, [aria-hidden="true"], [data-contrast-ignore]')) continue;
      const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      if (!text) continue;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const bg = bgOf(el);
      if (!bg) continue;
      const cs = getComputedStyle(el);
      const fg = blend(toRgba(cs.color), bg);
      const [l1, l2] = [lum(fg), lum(bg)];
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      // WCAG 的「大字」：≥ 18pt（24px），或 ≥ 14pt（18.66px）且加粗
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      if (ratio >= (large ? 3 : 4.5)) continue;
      const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '';
      const sel = el.tagName.toLowerCase() + cls;
      const key = sel + '|' + text.slice(0, 20);
      if (seen.has(key)) continue;
      seen.add(key);
      const rgb = (c: number[]) => `rgb(${c.slice(0, 3).map(Math.round).join(',')})`;
      out.push({ ratio: Math.round(ratio * 100) / 100, fg: rgb(fg), bg: rgb(bg), sel, text: text.slice(0, 40) });
    }
    return out.sort((a, b) => a.ratio - b.ratio);
  });
}
