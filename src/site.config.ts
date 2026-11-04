// 站点全局配置 —— 单一真相源
// project-init 孵化新项目时只改这一个文件；canonical / sitemap / robots / llms.txt / 品牌色全部从这里取，
// 所以不要在页面或组件里再硬编码域名、站名、主色。
// 🔴 本文件被 astro.config.ts 引用，而 Astro 不会把 .env 加载进配置文件的执行环境：
//    这里不要读 import.meta.env，需要按环境切换的值见 env-config 技能（loadEnv / 系统环境变量）。

export type AnalyticsProvider = 'none' | 'umami' | 'baidu';

/**
 * 网址形态：
 * - directory = /guide/a/（框架默认）
 * - file      = /guide/a.html；目录首页也折成 /guide.html（保住旧站已收录的 .html 网址，旧站没有目录首页时用）
 * - preserve  = 叶子页 /guide/a.html、目录首页 /guide/（产物 guide/index.html）——与 VitePress cleanUrls: false 的产物一模一样，
 *               旧站有 /backend/ 这类目录首页时必须用它，否则目录首页 404
 * - clean     = 网址 /guide/a（不带 .html、不带结尾斜杠），产物仍是 guide/a.html；目录首页同 preserve（产物 guide/index.html、网址 /guide/）
 *               —— 与 VitePress cleanUrls: true 的产物、canonical、sitemap 一模一样；
 *               托管平台要把 /guide/a 解析到 guide/a.html（EdgeOne Pages / Cloudflare Pages / Netlify 默认如此，nginx 要 try_files $uri $uri.html）
 */
export type UrlFormat = 'directory' | 'file' | 'preserve' | 'clean';

/**
 * Markdown 兼容模式：none = Astro 默认处理器（Sätteri，快）；vitepress = 换成 unified 管线并装 VitePress 写法兼容插件
 * （::: 容器、<Ok/> 状态标记、<Icon>、.md 链接、VitePress 锚点规则，见 src/lib/markdown/vp-compat.mjs）。迁移 VitePress 站时开
 */
export type MarkdownCompat = 'none' | 'vitepress';

export interface NavItem {
  label: string;
  href: string;
  /**
   * 高亮前缀：一组页面共用一个导航项时填（如「功能」指向 /features/writing.html，match 写 /features/，整组都高亮）。
   * 省略时按 href 本身判断；多个前缀用 | 隔开（如 '/guide/|/features/|/faq.html'）
   */
  match?: string;
  /** 下拉子项：有它时页头渲染成下拉菜单（窄屏抽屉里平铺成一组），自身 href 只在无 JS 时兜底；任一子项命中即高亮 */
  children?: NavItem[];
  /** 下拉子项的一行说明（只在下拉菜单里显示） */
  desc?: string;
  /** 下拉子项的小签（如「从这里开始」），只在下拉菜单里显示 */
  badge?: string;
  /** 下拉里的「查看全部」类链接：显示为带箭头的品牌色链接 */
  more?: boolean;
  /**
   * 多列下拉的底栏链接（如 常见问题 · 路线图 · 更新日志）。
   * children 的每一项自己也带 children 时，下拉按列排：每项是一列（label 做列标题），footerLinks 排在下方一行
   */
  footerLinks?: NavItem[];
  /** 窄屏抽屉里排到最后（多列下拉内容多，放后面让其余主入口留在第一屏），桌面顺序不变 */
  drawerLast?: boolean;
}

/** 页脚的一组链接 */
export interface FooterGroup {
  title: string;
  items: NavItem[];
}

/**
 * 联系方式：页脚「联系」一栏、窄屏抽屉的联系按钮、docs 模块的咨询悬浮按钮与弹窗都从这里取。为 null 时这些入口都不出现
 */
export interface ContactInfo {
  /** 微信号（同时当 QQ 展示） */
  wechat: string;
  /** 展示用电话（可带空格） */
  phone: string;
  /** tel: 链接用的纯数字电话 */
  tel: string;
  /** 作者微信二维码（public/ 下路径） */
  wechatQr: string;
  /** 交流群二维码；留空 = 不放群码（群码 7 天过期、只对已购用户开放的站点留空） */
  groupQr: string;
  /** 咨询弹窗「购买」模式的须知（各站口径不同） */
  buyNote?: string;
  /** 窄屏抽屉里联系按钮的文字，默认「联系作者」；卖授权的站写「咨询购买」 */
  label?: string;
}

export interface SocialLink {
  label: string;
  href: string;
}

export const site = {
  /** 站点全名：出现在 <title> 后缀、og:site_name、JSON-LD WebSite.name */
  name: 'next-ai-astro 示例站',
  /** 短名：页头 Logo 文字、移动端空间不够时使用 */
  shortName: '示例站',
  /** 一句话定位（首页 H1 下方 + 默认 meta description），写成「X 是 Y」的定义句对 GEO 更友好 */
  tagline:
    'next-ai-astro 是一个 AI 驱动的 Astro 内容站框架，把作品、文章和分类整理成对搜索引擎与 AI 都友好的静态站点。',
  /** 默认 meta description：页面没传 description 时兜底，建议 70~160 字 */
  description:
    'next-ai-astro 示例站：展示作品目录、分类筛选、文章与常见问题的标准写法，默认零 JS、SEO 与 GEO 字段齐全，可直接作为新项目的起点。',
  /**
   * 生产域名（不带结尾斜杠）。canonical、og:url、sitemap、robots、llms.txt 的绝对地址都基于它。
   * 🔴 上线前必须改成真实域名，否则所有 canonical 都会指向 example.com。
   */
  url: 'https://example.com',
  /**
   * 网址形态。astro.config 的 build.format / trailingSlash、lib/seo.ts 的 pagePath() 都读它，站内链接用 pagePath() 生成。
   * 🔴 上线后不要再改：改了等于全站换网址，旧链接与搜索收录全部失效（迁移旧站时按旧网址选，见 vitepress-migration 技能）
   */
  urlFormat: 'directory' as UrlFormat,
  /** Markdown 兼容模式，见 MarkdownCompat。两种模式都关掉了「智能标点」：技术文档里的 'none'、"x" 被改成弯引号，读者照抄就错了 */
  markdownCompat: 'none' as MarkdownCompat,
  /** 文档正文的代码块显示行号（VitePress 的 markdown.lineNumbers）；行号用 CSS 画，不进复制内容 */
  codeLineNumbers: false,
  /**
   * 文档页右侧的手机实时预览（指南 frontmatter 写 preview 时出现）：
   * origin = 预览站地址（H5 演示站，如 https://m.example.com）；留空 = 预览本站页面。qr = 扫码预览的二维码图（public/ 下路径），留空不显示「扫码预览」
   */
  mobilePreview: { origin: '', qr: '' },
  /** <html lang> 与 og:locale */
  locale: 'zh-CN',
  /** 品牌主色：注入为 CSS 变量 --brand，Tailwind 里用 bg-brand / text-brand */
  brandColor: '#FF5D2E',
  author: {
    name: '示例作者',
    url: 'https://example.com/about/',
  },
  /** 页头标志图（放 public/ 下，正方形）；留空则用品牌色圆点。标志自带底色的直接用，不要再套背景 */
  logo: '',
  /** 导航横排的断点：导航项多（6 个以上）时改 'lg'（页头到 1280 才横排），否则平板宽度下会挤出页头 */
  navBreakpoint: 'md' as 'md' | 'lg',
  /** 页头页脚的版心宽度，与正文对齐：default = 72rem（Container 默认）；文档站（docs 模块三栏布局）用 wide = 90rem */
  frameWidth: 'default' as 'default' | 'wide',
  /** 站点图标（放 public/ 下）：svg / png / ico 都行，BaseLayout 按扩展名输出 type */
  favicon: '/favicon.svg',
  /** 默认分享图（放 public/ 下），1200×630 */
  ogImage: '/og-default.png',
  /**
   * 允许构建期下载并优化的远程图片域名（astro:assets image.domains）。
   * 数据源里的封面是外链（如 B 站 i0.hdslb.com）时加进来，构建时会下载转成 WebP 自托管，顺带绕开防盗链。
   */
  imageDomains: [] as string[],
  analytics: {
    provider: 'none' as AnalyticsProvider,
    /** umami: website-id；baidu: hm.js 后面那串 id */
    id: '',
    /** umami 自托管脚本地址，provider=umami 时必填 */
    src: '',
  },
  nav: [
    { label: '首页', href: '/' },
    { label: '关于', href: '/about/' },
  ] as NavItem[],
  social: [{ label: 'GitHub', href: 'https://github.com/' }] as SocialLink[],
  /** 备案号（国内服务器必填，显示在页脚；为空则不显示） */
  icp: '',
  /**
   * <title> 后缀：每页是「页名 | 后缀」，留空用站名。
   * 迁移旧站时填旧站的完整后缀（如「站名 — 一句话定位」），保住搜索结果里已收录的标题；站名本身仍用于页头 / 页脚 / og:site_name
   */
  titleSuffix: '',
  /** 首页 <title>：留空用后缀（或站名）。旧站首页标题是一整句定位、已被收录时填那一句 */
  homeTitle: '',
  /** 全站 meta keywords；页面可用 keywords 参数整条替换。为空不输出 */
  keywords: [] as string[],
  /** 页头右侧主按钮（如「免费下载」）；null = 不显示 */
  headerCta: null as NavItem | null,
  /** 页脚链接分组；为空时退回一栏「站内」列出全部 nav */
  footerGroups: [] as FooterGroup[],
  /** 页脚底部说明行（公司 / 业务一句话，可带一个链接）；null = 不显示 */
  footerNote: null as { text: string; link?: NavItem } | null,
  /** 版权行署名；留空用 author.name */
  copyrightName: '',
  /** 联系方式，见 ContactInfo；null = 不显示任何联系入口 */
  contact: null as ContactInfo | null,
};

export type SiteConfig = typeof site;
