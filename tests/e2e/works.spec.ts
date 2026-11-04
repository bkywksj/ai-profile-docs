// 作品模块 E2E：首页入口、列表筛选与 URL 同步、详情页结构（需要先 pnpm build；module-strip 的 works 预设会删除本文件）
import { expect, test } from '@playwright/test';
import { waitForHydration } from './helpers';

test('首页能进入作品列表', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: '浏览全部作品' }).click();
  await expect(page).toHaveURL(/\/works\/$/);
});

test('作品列表：搜索与分类筛选同步到 URL', async ({ page }) => {
  await page.goto('/works/');
  await waitForHydration(page);
  const search = page.getByPlaceholder('搜索标题、标签、分类…');
  // 「静态站」只命中示例作品 03 的标题
  await search.fill('静态站');
  await expect(page).toHaveURL(/q=/);
  await expect(page.locator('article')).toHaveCount(1);
  await search.fill('');
  await page.getByRole('button', { name: /^实战案例/ }).click();
  await expect(page).toHaveURL(/c=case-study/);
  await expect(page.locator('article')).toHaveCount(2);
});

test('作品列表：带参数的分享链接打开后直接呈现筛选结果', async ({ page }) => {
  await page.goto('/works/?c=deep-dive');
  await waitForHydration(page);
  await expect(page.getByRole('button', { name: /^深入原理/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('article')).toHaveCount(2);
});

test('作品列表：水合完成前输入的搜索词不会被清掉（慢网络回归）', async ({ page }) => {
  // 拖慢 island 脚本，模拟用户在水合完成前就开始打字
  await page.route('**/_astro/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto('/works/');
  const search = page.getByPlaceholder('搜索标题、标签、分类…');
  await search.fill('静态站');
  await waitForHydration(page);
  await expect(search).toHaveValue('静态站');
  await expect(page).toHaveURL(/q=/);
  await expect(page.locator('article')).toHaveCount(1);
});

test('详情页：面包屑、结构化数据、canonical', async ({ page }) => {
  await page.goto('/works/sample-01/');
  await expect(page.getByRole('navigation', { name: '面包屑' })).toBeVisible();
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toMatch(/\/works\/sample-01\/$/);
  expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThanOrEqual(2);
});
