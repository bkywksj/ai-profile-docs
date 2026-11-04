// 旧站 Vue 组件转换（vue-components.mjs）：用 Astro 自己的 unified 管线渲染再断言
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { describe, expect, it } from 'vitest';
import { remarkVueComponents } from '@/lib/markdown/vue-components.mjs';

const processor = await createMarkdownProcessor({ smartypants: false, remarkPlugins: [remarkVueComponents] });
const render = async (md: string) => (await processor.render(md)).code;

describe('ReferralNotice', () => {
  // 漏转时 <ReferralNotice /> 留成自定义元素，自定义元素不自闭合 → 后面整页正文都被它包进去（Reeve 下载页实测）
  it('转成隐藏的推荐提示块，不留自定义标签，后面的正文仍在块外', async () => {
    const html = await render('前言\n\n<ReferralNotice product="Reeve" app-code="reeve" />\n\n## 系统要求\n\n正文\n');
    expect(html).not.toMatch(/<ReferralNotice/i);
    expect(html).toMatch(/<div class="vc-ref" data-app="reeve" data-pagefind-ignore(="")? hidden>/);
    // 提示块在系统要求标题之前就闭合了：两者之间只隔着内联脚本
    expect(html).toMatch(/<\/div><script>[\s\S]*?<\/script>\s*<h2[^>]*>系统要求<\/h2>/);
  });

  it('产品名进文案、推荐码按旧组件同口径校验，中转前缀不变', async () => {
    const html = await render('<ReferralNotice product="Reeve" app-code="reeve" />\n');
    expect(html).toContain('Reeve 是 <strong>电脑端</strong> 软件');
    expect(html).toContain('/^[A-Za-z0-9]{1,32}$/');
    expect(html).toContain("'https://license.ruoyi.plus/flm/public/dl/'+el.dataset.app+'/'+code");
  });
});

describe('BilibiliVideo', () => {
  // 渲染管线会把属性里的 & 序列化成 &#x26;（与 &amp; 等价），断言前统一还原，只比地址本身
  const plain = (s: string) => s.replace(/&#x26;|&amp;/g, '&');
  // 旧站写法是跨行的自闭合标签（tauri-cc-docs features/pet.md），标题 / 说明 / 兜底链接文字要与旧站逐字一致，逐页比对才过
  it('跨行标签转成标题 + 说明 + 懒加载播放器 + 兜底链接，不留自定义标签', async () => {
    const html = plain(await render('前言\n\n<BilibiliVideo\n  bvid="BV1BX786cELZ"\n  title="视频演示：桌宠"\n  desc="一句说明"\n/>\n\n## 下一节\n'));
    expect(html).not.toMatch(/<BilibiliVideo/i);
    expect(html).toContain('<h3 class="vc-bili-title">视频演示：桌宠</h3>');
    expect(html).toContain('<p class="vc-bili-desc">一句说明</p>');
    expect(html).toContain('https://player.bilibili.com/player.html?isOutside=true&bvid=BV1BX786cELZ&p=1&autoplay=0&danmaku=0');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('href="https://www.bilibili.com/video/BV1BX786cELZ"');
    expect(html).toContain('在哔哩哔哩观看');
    expect(html).toMatch(/<\/div>\s*<h2[^>]*>下一节<\/h2>/);
  });

  it('分 P 参数生效；没有标题时不输出标题区', async () => {
    const html = plain(await render('<BilibiliVideo bvid="BV1xx" :page="3" />\n'));
    expect(html).toContain('&p=3&');
    expect(html).not.toContain('vc-bili-head');
  });

  it('缺 bvid 时构建失败，不静默输出空播放器', async () => {
    await expect(render('<BilibiliVideo title="x" />\n')).rejects.toThrow(/缺 bvid/);
  });
});

describe('Badge（VitePress 内置）', () => {
  it('标题里的 <Badge> 转成 VPBadge 小标签，文字照旧、不留 <badge> 元素', async () => {
    const html = await render('# 技能体系 <Badge type="tip" text="⭐ 核心" />\n');
    expect(html).not.toMatch(/<badge/i);
    expect(html).toContain('<span class="VPBadge tip">⭐ 核心</span>');
  });

  it('type 缺省或写错时按 tip 处理', async () => {
    expect(await render('x <Badge text="新" />\n')).toContain('<span class="VPBadge tip">新</span>');
    expect(await render('x <Badge type="bogus" text="新" />\n')).toContain('<span class="VPBadge tip">新</span>');
  });
});

describe('链接属性块 {…}（markdown-it-attrs）', () => {
  // tauri-cc-docs faq.md / mobile/preview.md：[文字](地址){target="_blank"}，不处理时花括号原样显示在正文里
  it('target 挂到链接上、花括号从正文删掉', async () => {
    const html = await render('欢迎反馈：[Gitee Issues](https://gitee.com/x/issues){target="_blank"} — 提交 Bug\n');
    expect(html).toContain('<a href="https://gitee.com/x/issues" target="_blank">Gitee Issues</a> — 提交 Bug');
    expect(html).not.toContain('{target');
  });

  it('类名与 id 也认；不是紧跟链接的花括号、认不出属性的花括号原样保留', async () => {
    const html = await render('[按钮](/a.html){.vp-button .brand #go} 与 {{变量}} 和 [b](/b.html){不是属性}\n');
    expect(html).toMatch(/<a href="\/a.html"[^>]*class="vp-button brand"/);
    expect(html).toMatch(/<a [^>]*id="go"/);
    expect(html).toContain('{{变量}}');
    expect(html).toContain('{不是属性}');
  });
});
