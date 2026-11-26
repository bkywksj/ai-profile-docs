// 全站文字对比度回归：站点地图里的每一页，浅色、深色两种主题下都不许有低于 WCAG AA 的可见文字（需要先 pnpm build）
// 与具体内容模块无关，裁剪模块时保留；有意固定配色的区域在容器上加 data-contrast-ignore（见 helpers.ts findLowContrast）
import { expect, test, type APIRequestContext } from '@playwright/test';
import { findLowContrast } from './helpers';

/**
 * 从站点地图取全站页面路径：sitemap-index.xml → 各分片 → 每条 <loc> 的 pathname。
 * loc 写的是线上域名（site.url），只取路径部分拼到本地预览地址上。
 * @param request Playwright 的请求上下文（带 baseURL）
 * @returns 去重后的页面路径
 */
async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
  const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const index = await (await request.get('/sitemap-index.xml')).text();
  const paths: string[] = [];
  for (const part of locs(index)) paths.push(...locs(await (await request.get(part)).text()));
  return [...new Set(paths)];
}

for (const scheme of ['light', 'dark'] as const) {
  test(`${scheme === 'dark' ? '深色' : '浅色'}主题下全站文字对比度达标`, async ({ page, request }) => {
    const paths = await sitemapPaths(request);
    expect(paths.length, '站点地图里没有页面').toBeGreaterThan(0);
    test.setTimeout(30_000 + paths.length * 3_000);

    // 只模拟系统偏好、不写 localStorage：走的是 ThemeScript「跟随系统」那条路径
    await page.emulateMedia({ colorScheme: scheme });
    const report: string[] = [];
    for (const path of paths) {
      await page.goto(path);
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(isDark, `${path} 的主题类与系统偏好不一致`).toBe(scheme === 'dark');
      for (const i of await findLowContrast(page)) {
        report.push(`${path}  ${i.ratio}:1  ${i.fg} on ${i.bg}  <${i.sel}> ${i.text}`);
      }
    }
    expect(report, `对比度不达标 ${report.length} 处：\n${report.join('\n')}`).toEqual([]);
  });
}
