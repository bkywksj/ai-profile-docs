// 旧站营销页里的 Vue 组件（AProductCard / APricingCard / ImagePreview / DownloadSection / ReferralNotice / BilibiliVideo）与 VitePress 内置的 <Badge> → 构建期静态 HTML，信息一项不丢
// 为什么在 remark 里做：这几页正文仍是迁来的 .md（不转 MDX），组件标签被解析成 html 节点，在这里按旧组件的模板逐字段输出；
// 视觉在第 5 步重做，这里只保证内容与旧站等价（产品名 / 标语 / 描述 / 亮点 / 按钮、价格 / 原价 / 节省 / 功能 / 按钮 / 页脚、全部图片）。
// 绑定属性（:highlights="[...]"）是旧站作者写的字面量数组 / 对象，用 Function 求值；只在构建期跑、只处理本仓库自己的文档。
import { iconSvg } from './vp-compat.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 解析组件标签的属性：name="…" 是字符串，:name="…" 是 JS 字面量（数组 / 对象 / 数字 / 布尔）。kebab-case 转 camelCase
 * @param tag 整个标签文本（<X a="1" :b="[…]" />）
 * @returns 属性对象
 * @throws 绑定属性求值失败（写错了宁可构建失败，也不在页面上静默丢一段内容）
 */
export function parseAttrs(tag) {
  const props = {};
  const toCamel = (n) => n.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  // 不带值的布尔属性（旧站 demo.md 的 `recommended`）：去掉标签名与全部 name="…" 之后剩下的单词
  const rest = tag
    .replace(/^<[A-Za-z]\w*/, '')
    .replace(/(:?)([A-Za-z][\w-]*)="[^"]*"/g, ' ')
    .replace(/\/?>\s*$/, '');
  for (const m of rest.matchAll(/[A-Za-z][\w-]*/g)) props[toCamel(m[0])] = true;
  for (const m of tag.matchAll(/(:?)([A-Za-z][\w-]*)="([^"]*)"/g)) {
    const [, bound, rawName, raw] = m;
    const name = toCamel(rawName);
    if (!bound) props[name] = raw;
    else {
      try {
        props[name] = Function(`"use strict"; return (${raw});`)();
      } catch (e) {
        throw new Error(`组件属性 :${rawName} 求值失败：${e.message}`);
      }
    }
  }
  return props;
}

/** 旧站 AProductCard：左（logo / 名称 / 角标 / 标语 / 描述 / 按钮），右（亮点列表） */
export function productCard(p, icons) {
  const logo = p.logo
    ? `<img src="${esc(p.logo)}" alt="${esc(p.name)}" class="vc-product-logo" loading="lazy" />`
    : p.icon
      ? iconSvg(icons, p.icon, 'vc-product-icon')
      : '';
  const actions = (p.actions ?? [])
    .map(
      (a, i) =>
        `<a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer" class="vc-btn${i === 0 ? ' vc-btn-primary' : ''}">${esc(a.text)}</a>`,
    )
    .join('');
  const highlights = (p.highlights ?? []).map((h) => `<li>${esc(h)}</li>`).join('');
  // 锚点取 logo 文件名（/products/aicoder.png → product-aicoder）：产品矩阵首屏的图标带按它跳转，名字含空格中文不适合做 id
  const anchor = p.logo ? ` id="product-${esc(String(p.logo).split('/').pop().replace(/\.\w+$/, ''))}"` : '';
  return `<div${anchor} class="vc-product vc-theme-${esc(p.theme ?? 'blue')}"><div class="vc-product-main"><div class="vc-product-head">${logo}<div><div class="vc-product-title"><h3 class="vc-product-name">${esc(p.name)}</h3>${
    p.badge ? `<span class="vc-badge">${esc(p.badge)}</span>` : ''
  }</div>${p.slogan ? `<p class="vc-product-slogan">${esc(p.slogan)}</p>` : ''}</div></div>${
    p.description ? `<p class="vc-product-desc">${esc(p.description)}</p>` : ''
  }<div class="vc-actions">${actions}</div></div><ul class="vc-product-highlights">${highlights}</ul></div>`;
}

/** 旧站 APricingCard。按钮原来是「复制微信号 + 弹窗」，零 JS 版改成可展开的同一段联系方式 */
export function pricingCard(p, icons) {
  const features = (p.features ?? [])
    .map((f) => `<li>${iconSvg(icons, 'lucide:check', 'vc-check')}<span>${esc(f)}</span></li>`)
    .join('');
  const price = typeof p.price === 'number' ? `<span class="vc-currency">¥</span><span class="vc-price-value">${p.price}</span>` : `<span class="vc-price-value">${esc(p.price ?? '')}</span>`;
  return `<div class="vc-pricing${p.recommended ? ' is-recommended' : ''}">${
    p.recommended ? `<p class="vc-recommended">${iconSvg(icons, 'lucide:star', 'vc-star')} 推荐</p>` : ''
  }<h3 class="vc-plan">${esc(p.plan)}</h3>${p.description ? `<p class="vc-plan-desc">${esc(p.description)}</p>` : ''}<div class="vc-price">${price}</div>${
    p.originalPrice ? `<p class="vc-original">原价 ¥${esc(p.originalPrice)}</p>` : ''
  }${p.savingText ? `<p class="vc-saving">${esc(p.savingText)}</p>` : ''}<ul class="vc-features">${features}</ul><details class="vc-contact"><summary class="vc-btn${
    p.recommended ? ' vc-btn-primary' : ''
  }">${esc(p.buttonText ?? '立即咨询')}</summary><div data-migrate-ignore><p>微信同QQ：<strong>770492966</strong></p><p>请添加好友咨询</p></div></details>${
    p.footerText ? `<p class="vc-footer">${esc(p.footerText)}</p>` : ''
  }</div>`;
}

/**
 * 旧站 ImagePreview：src 逗号分隔多张。旧组件首屏只露第一张、其余在点击预览里；这里全部输出（图片一张不丢），多张排成可横向滚动的图廊。
 * opts.groupQr 命中时在图下追加 opts.groupNote：微信群码 7 天就过期，换图前访客扫到的是失效码，得告诉他另一条路。
 * 提示带 data-migrate-ignore（旧站没有这句，迁移比对不计）
 */
export function imagePreview(p, _icons, opts = {}) {
  const urls = String(p.src ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const size = (v) => (v === undefined ? '' : typeof v === 'number' ? `${v}px` : v);
  const style = [p.width !== undefined && `width:${size(p.width)}`, p.height !== undefined && p.height !== 'auto' && urls.length === 1 && `height:${size(p.height)}`, p.objectFit && `object-fit:${p.objectFit}`]
    .filter(Boolean)
    .join(';');
  const img = (u) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="" loading="lazy"${style ? ` style="${style}"` : ''} /></a>`;
  const note =
    opts.groupQr && opts.groupNote && urls.length === 1 && urls[0] === opts.groupQr
      ? `<span class="vc-qr-note" data-migrate-ignore data-pagefind-ignore>${esc(opts.groupNote)}</span>`
      : '';
  return urls.length === 1
    ? `<span class="vc-image">${img(urls[0])}${note}</span>`
    : `<div class="vc-gallery">${urls.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="" loading="lazy" /></a>`).join('')}</div>`;
}

/**
 * 旧站下载页的 DownloadSection（构建时注入 R2 版本快照、运行时渲染下载卡与历史版本）：
 * 新站由 src/pages/download.astro 用 src/data/releases.json 渲染同样的内容，正文里这个标签输出空，避免留下一个不认识的自定义元素
 */
const downloadSection = () => '<!-- 下载卡与历史版本：见 src/pages/download.astro -->';

/**
 * 旧站下载页的 ReferralNotice：网址带 ?ref=推荐码 时提示走 FLM 下载中转（记埋点 + 安装包文件名带推荐码，装好后自动归因）。
 * 推荐码只能在浏览器里读，所以输出一个隐藏块 + 内联脚本；没有 ref 或 ref 不合法时整块不显示（与旧组件一致）。
 * 漏转的话 <ReferralNotice /> 会留成不认识的自定义元素——自定义元素不自闭合，后面整页正文都会被它包进去
 * @param p { product?, appCode? }
 */
export function referralNotice(p) {
  const product = esc(p.product ?? '');
  const appCode = esc(p.appCode ?? '');
  // 推荐码校验与手机判定照抄旧组件（与 FLM 后端同口径）：纯字母数字 ≤32；先认移动端关键词，iPhone UA 里也有 Mac OS X
  const script = `(()=>{const el=document.currentScript.previousElementSibling;const code=new URLSearchParams(location.search).get('ref')||'';if(!/^[A-Za-z0-9]{1,32}$/.test(code))return;const ua=navigator.userAgent.toLowerCase();const mobile=/iphone|ipad|ipod|android|harmonyos/.test(ua)||!/windows nt|macintosh|cros|linux/.test(ua);const link='https://license.ruoyi.plus/flm/public/dl/'+el.dataset.app+'/'+code;el.querySelector(mobile?'.vc-ref-pc':'.vc-ref-mobile').remove();el.querySelectorAll('.vc-ref-link').forEach((a)=>{a.textContent=a.tagName==='CODE'?link:a.textContent;if(a.tagName==='A')a.href=link});el.querySelectorAll('.vc-ref-code').forEach((s)=>s.textContent=code);if(mobile){el.classList.add('is-mobile');const btn=el.querySelector('.vc-ref-btn');btn.onclick=()=>navigator.clipboard.writeText(link).then(()=>{btn.textContent='已复制';setTimeout(()=>btn.textContent='复制链接',2000)})}el.hidden=false})()`;
  // 两半块先删掉一块再填内容：推荐码只在电脑那半块、复制按钮只在手机那半块，取单个元素要么 querySelectorAll 要么放进 if(mobile)，
  // 否则取到 null 报错、整块一直隐藏（预览里电脑端、手机端各踩过一次）
  return (
    `<div class="vc-ref" data-app="${appCode}" data-pagefind-ignore hidden>` +
    `<div class="vc-ref-mobile"><div class="vc-ref-title">你正在手机上打开这个链接</div>` +
    `<p class="vc-ref-desc">${product} 是 <strong>电脑端</strong> 软件，手机装不了。复制下面的链接，在电脑浏览器里打开即可直接开始下载，推荐关系会自动带上，无需手动填任何邀请码。</p>` +
    `<div class="vc-ref-row"><code class="vc-ref-link"></code><button class="vc-ref-btn" type="button">复制链接</button></div></div>` +
    `<div class="vc-ref-pc"><div class="vc-ref-title">已识别推荐码 <span class="vc-ref-code"></span></div>` +
    `<p class="vc-ref-desc">通过 <a class="vc-ref-link" href="#">推荐链接下载</a> 可自动关联推荐人；直接点下方版本列表里的直链下载则不会关联。</p></div>` +
    `</div><script>${script}</script>`
  );
}

/**
 * 旧站文档页的 BilibiliVideo（tauri-cc-docs 等）：标题 + 一句说明 + 16:9 内嵌播放器 +「在哔哩哔哩观看」兜底链接。
 * 播放器地址与参数照抄旧组件：isOutside=true 是站外嵌入必需参数（否则新版播放器拒绝加载），autoplay=0 / danmaku=0 教程观看更清爽。
 * iframe loading=lazy：一页有好几个视频时不会一次拉起全部播放器。标题仍用 h3（旧站就是 h3，逐页比对会核对标题层级）
 * @param p { bvid, title?, desc?, page? }
 * @throws 没有 bvid（旧组件里是必填，漏了宁可构建失败）
 */
export function bilibiliVideo(p) {
  if (!p.bvid) throw new Error('缺 bvid');
  const page = Number(p.page ?? 1) || 1;
  const src = `https://player.bilibili.com/player.html?isOutside=true&bvid=${encodeURIComponent(p.bvid)}&p=${page}&autoplay=0&danmaku=0`;
  const head = p.title
    ? `<div class="vc-bili-head"><h3 class="vc-bili-title">${esc(p.title)}</h3>${p.desc ? `<p class="vc-bili-desc">${esc(p.desc)}</p>` : ''}</div>`
    : '';
  return (
    `<div class="vc-bili">${head}` +
    `<div class="vc-bili-frame"><iframe src="${esc(src)}" title="${esc(p.title || 'Bilibili 视频')}" loading="lazy" allow="fullscreen" allowfullscreen scrolling="no"></iframe></div>` +
    `<div class="vc-bili-foot"><a href="https://www.bilibili.com/video/${esc(p.bvid)}" target="_blank" rel="noopener noreferrer" class="vc-bili-link"><span class="vc-bili-icon" aria-hidden="true">▶</span> 在哔哩哔哩观看</a></div>` +
    `</div>`
  );
}

/**
 * VitePress 内置 <Badge type="tip" text="⭐ 核心" />（标题旁的小标签）→ 与 VitePress 同结构的 <span class="VPBadge tip">。
 * 不转时它被当成未知元素 <badge> 原样输出、文字是属性值，页面上什么都不显示（agile-qt-docs 技能体系页标题实测）。
 * 标题 id 不受影响：VitePress 生成 slug 时同样不算 Badge 的文字，这里输出的是 html 节点，rehypeVpHeadingIds 只取文本节点
 * @param p { type?: 'info' | 'tip' | 'warning' | 'danger', text?: string }；type 缺省 tip，与 VitePress 一致
 */
export function badge(p) {
  const type = /^(info|tip|warning|danger)$/.test(p.type ?? '') ? p.type : 'tip';
  return `<span class="VPBadge ${type}">${esc(p.text ?? '')}</span>`;
}

const RENDER = {
  Badge: badge,
  AProductCard: productCard,
  APricingCard: pricingCard,
  ImagePreview: imagePreview,
  DownloadSection: downloadSection,
  ReferralNotice: referralNotice,
  BilibiliVideo: bilibiliVideo,
};
const NAMES = Object.keys(RENDER).join('|');

/**
 * Markdown 相对链接按 VitePress 规则补 .html（./changelog → ./changelog.html）。
 * 框架 remarkVpLinks（fixLink）只处理 / 开头的站内链接，相对链接会落成 /changelog 这种旧站没有的网址；本插件先跑，补完后框架那步不再改它。
 * 站外、根路径、纯锚点、已有扩展名、以 / 结尾的不动
 * @param url 链接
 */
export function fixRelativeLink(url) {
  if (!url || /^(https?:|mailto:|tel:|#|\/)/.test(url)) return url;
  const [path, rest = ''] = url.split(/(?=[#?])/);
  if (!path || path.endsWith('/') || /\.[a-z0-9]+$/i.test(path)) return url;
  return `${path}.html${rest}`;
}

/**
 * 正文原始 HTML 里的站内 <a href>（如首页 <a href="./changelog">）按 VitePress 规则补 .html：
 * 相对或根路径、没有扩展名、不以 / 结尾的才补；锚点 / 查询串保留。Markdown 链接由框架 remarkVpLinks 处理，这里只管 html 节点
 * @param html html 节点文本
 */
export function fixRawLinks(html) {
  return html.replace(/(<a\b[^>]*?\bhref=")(\.{0,2}\/[^"#?]*?)([#?][^"]*)?"/g, (whole, pre, path, rest = '') =>
    path.endsWith('/') || /\.[a-z0-9]+$/i.test(path) ? whole : `${pre}${path}.html${rest}"`,
  );
}
const TAG = new RegExp(`<(${NAMES})\\b([\\s\\S]*?)\\/>`, 'g');

/**
 * 链接后紧跟的属性块（VitePress 自带 markdown-it-attrs）：[文字](地址){target="_blank"}、{.a .b}、{#id}。
 * 新站不认这种写法，花括号会原样显示在正文里（tauri-cc-docs 的 faq.md、mobile/preview.md 实测）。
 * 只认紧贴在链接后面、以 { 开头的文字：属性挂到这个链接上、花括号从正文删掉；其余位置的花括号不动
 * @param attrs 花括号里的内容（不含花括号）
 * @returns hast 属性对象；认不出任何属性时返回 null（当成普通文字）
 */
export function parseLinkAttrs(attrs) {
  const props = {};
  const classes = [];
  for (const m of attrs.matchAll(/([.#])([\w-]+)|([A-Za-z][\w-]*)=(?:"([^"]*)"|'([^']*)'|(\S+))/g)) {
    if (m[1] === '.') classes.push(m[2]);
    else if (m[1] === '#') props.id = m[2];
    else props[m[3]] = m[4] ?? m[5] ?? m[6];
  }
  if (classes.length) props.className = classes;
  return Object.keys(props).length ? props : null;
}

/** 遍历一个父节点的子节点，把「链接 + {属性}」合并到链接上 */
function applyLinkAttrs(parent) {
  const kids = parent.children;
  if (!kids) return;
  for (let i = 0; i < kids.length - 1; i++) {
    const link = kids[i];
    const next = kids[i + 1];
    if (link.type !== 'link' || next.type !== 'text') continue;
    const m = next.value.match(/^\{([^{}\n]+)\}/);
    if (!m) continue;
    const props = parseLinkAttrs(m[1]);
    if (!props) continue;
    link.data = { ...link.data, hProperties: { ...link.data?.hProperties, ...props } };
    next.value = next.value.slice(m[0].length);
  }
}

/**
 * remark 插件：html 节点里的旧站组件（见 RENDER）替换成静态 HTML。要放在 remarkVpMarks 之前（它会把剩下的大写组件当未处理报出来）
 * @param {{ icons: Record<string, { body: string, width?: number, height?: number }>, groupQr?: string, groupNote?: string, clean?: boolean }} opts
 *   groupQr / groupNote：交流群二维码地址与图下的兜底提示（见 imagePreview）；clean：网址不带 .html，相对链接与原始 HTML 里的链接不补
 */
export function remarkVueComponents(opts = {}) {
  const icons = opts.icons ?? {};
  return (tree, file) => {
    // 段落里只有组件标签（旧站写法：标签与上下文之间有空行）→ 整段换成块级 html 节点，避免输出 <p><div>…</div></p> 这种非法嵌套
    const lift = (parent) => {
      parent.children = parent.children?.map((c) => {
        if (
          c.type === 'paragraph' &&
          c.children.some((x) => x.type === 'html' && new RegExp(`<(${NAMES})\\b`).test(x.value)) &&
          c.children.every((x) => x.type === 'html' || (x.type === 'text' && x.value.trim() === ''))
        )
          return { type: 'html', value: c.children.map((x) => (x.type === 'html' ? x.value : '')).join('\n') };
        lift(c);
        return c;
      });
    };
    lift(tree);
    const walk = (node) => {
      applyLinkAttrs(node);
      // clean 网址形态（VitePress cleanUrls: true）旧站链接本来就不带 .html，不补
      if (node.type === 'html' && !opts.clean) node.value = fixRawLinks(node.value);
      if ((node.type === 'link' || node.type === 'definition') && !opts.clean) node.url = fixRelativeLink(node.url);
      if (node.type === 'html' && TAG.test(node.value)) {
        TAG.lastIndex = 0;
        node.value = node.value.replace(TAG, (whole, name) => {
          try {
            return RENDER[name](parseAttrs(whole), icons, opts);
          } catch (e) {
            throw new Error(`${name}（${file.path ?? ''}）：${e.message}`);
          }
        });
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
