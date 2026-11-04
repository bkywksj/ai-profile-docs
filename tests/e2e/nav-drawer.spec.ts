// 窄屏右侧抽屉（框架核心 SiteHeader 的 <dialog data-nav-drawer>）：开合、关闭途径、焦点去向、与搜索弹窗的交接。
// 框架示例站没配 site.headerCta 与 site.contact；派生站配了的，主按钮 / 联系按钮 / 咨询弹窗交接在站点自己的 e2e 里测
import { expect, test } from '@playwright/test';

test.describe('手机抽屉菜单', () => {
  test.skip(({ isMobile }) => !isMobile, '宽屏显示桌面导航、抽屉按钮隐藏');

  const opener = (page: import('@playwright/test').Page) => page.getByRole('button', { name: '打开菜单' });
  const drawer = (page: import('@playwright/test').Page) => page.locator('dialog[data-nav-drawer]');

  test('打开：抽屉可见、当前栏目高亮、底下页面不滚', async ({ page }) => {
    await page.goto('/posts/');
    await opener(page).click();
    await expect(drawer(page)).toBeVisible();
    await expect(opener(page)).toHaveAttribute('aria-expanded', 'true');
    // 打开后焦点落在关闭按钮上（不是第一个可聚焦的 Logo 链接）：读屏与键盘用户一进来就知道怎么退出
    await expect(drawer(page).getByRole('button', { name: '关闭菜单' })).toBeFocused();
    const nav = drawer(page).getByRole('navigation', { name: '站点导航' });
    await expect(nav.getByRole('link', { name: '文章' })).toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
  });

  test('关闭途径：关闭按钮、Esc、点遮罩；关后焦点回到菜单按钮', async ({ page }) => {
    await page.goto('/about/');
    for (const how of ['button', 'esc', 'backdrop'] as const) {
      await opener(page).click();
      await expect(drawer(page)).toBeVisible();
      if (how === 'button') await drawer(page).getByRole('button', { name: '关闭菜单' }).click();
      if (how === 'esc') await page.keyboard.press('Escape');
      // 抽屉贴右、宽度不到满屏，左边那条是遮罩
      if (how === 'backdrop') await page.mouse.click(8, 400);
      await expect(drawer(page), how).toBeHidden();
      await expect(opener(page), how).toHaveAttribute('aria-expanded', 'false');
      await expect(opener(page), how).toBeFocused();
    }
  });

  test('点内容区不关；点导航项跳到对应页', async ({ page }) => {
    await page.goto('/');
    await opener(page).click();
    // 等滑入动画停下再量位置（动画中 computed transform 是中间值）
    await expect(drawer(page)).toHaveCSS('transform', 'none');
    // 抽屉顶栏里 Logo 与关闭按钮之间的空白：按两者实际位置取中点（站名长短不同，顶栏正中不一定空——站名长的站就伸过了中线）
    const logo = (await drawer(page).locator('a').first().boundingBox())!;
    const close = (await drawer(page).getByRole('button', { name: '关闭菜单' }).boundingBox())!;
    const x = (logo.x + logo.width + close.x) / 2;
    const y = close.y + close.height / 2;
    expect(close.x - (logo.x + logo.width)).toBeGreaterThan(8);
    expect(await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('a, button') ?? null, [x, y])).toBeNull();
    await page.mouse.click(x, y);
    await expect(drawer(page)).toBeVisible();
    await drawer(page).getByRole('link', { name: '关于' }).click();
    await expect(page).toHaveURL(/\/about\/$/);
    await expect(drawer(page)).toBeHidden();
  });

  test('搜索：抽屉收起，搜索框打开且输入框拿到焦点', async ({ page }) => {
    await page.goto('/about/');
    await opener(page).click();
    await drawer(page).locator('[data-search-open]').click();
    await expect(drawer(page)).toBeHidden();
    await expect(page.getByRole('searchbox').or(page.locator('dialog[open] input')).first()).toBeFocused();
  });

  test('没配 site.contact：抽屉里没有联系按钮', async ({ page }) => {
    await page.goto('/');
    await opener(page).click();
    await expect(drawer(page)).toBeVisible();
    await expect(drawer(page).locator('[data-nav-drawer-contact]')).toHaveCount(0);
  });
});
