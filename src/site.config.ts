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

/**
 * <head> 里站点图标之外的一组 <link>：PNG 兜底图标、apple-touch-icon、Web App Manifest。
 * VitePress 迁来的站常在 head 里成组写这些，照搬才能让收藏夹、手机主屏图标、Safari 标签图标不变
 */
export interface HeadLink {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
}

export const site = {
  /** 站点全名：出现在 og:site_name、JSON-LD WebSite.name、页脚（旧站 og:site_name 与 siteTitle 都是「ai-profile」） */
  name: 'ai-profile',
  /** 短名：页头 Logo 文字 */
  shortName: 'ai-profile',
  /** 一句话定位（首页与 llms.txt 用），写成「X 是 Y」的定义句 */
  tagline:
    'ai-profile 是给桌面应用用的 AI 模型服务配置层（MIT 开源 Rust crate）：服务商预置、地址拼接、零成本验证、限额与跨应用互通的 ai.profile，统一放进一个库。',
  /** 默认 meta description：页脚简介与没写描述的页面兜底；各页在 frontmatter 里各写一句 */
  description: 'AI 模型服务配置层。一份预置、一个协议、一套验证，多个应用共用。纯 Rust，默认零重依赖，按 feature 裁剪。',
  /** 生产域名（不带结尾斜杠）：旧站 config.ts 的 SITE 常量 */
  url: 'https://ai-profile.ruoyi.plus',
  /**
   * 网址形态。🔴 上线后不要再改。
   * 旧站开了 cleanUrls（config.ts）：叶子页 /guide/introduction（产物 guide/introduction.html），canonical 与 sitemap 都是这一套；旧站没有目录首页
   */
  urlFormat: 'clean' as UrlFormat,
  /** 旧站正文里有 ::: tip / warning / danger / info / details，正文不改，开 vitepress 由兼容插件还原 */
  markdownCompat: 'vitepress' as MarkdownCompat,
  /** 文档正文的代码块显示行号：旧站没开 */
  codeLineNumbers: false,
  /** 文档页右侧的手机实时预览：本站没有 H5 演示站 */
  mobilePreview: { origin: '', qr: '' },
  locale: 'zh-CN',
  /**
   * 品牌主色：靛蓝 #4f46e5（旧站 --vp-c-brand-1，用户定的，不得更改）。
   * 用法见 src/styles/brand.css 与原型 brand.md：主按钮 #4338ca 实底；#4f46e5 只做链路签、下划线、圆点
   */
  brandColor: '#4f46e5',
  author: {
    // 版权方与 crate 仓库 LICENSE 一致
    name: '湛江市麻章区湖光镇若依科技工作室',
    url: 'https://ai-profile.ruoyi.plus',
  },
  /** 页头标志图：旧站 docs/public/logo.svg 原文件（逐字节不动） */
  logo: '/logo.svg',
  /** 顶栏 5 项（文档是四列大下拉）+ 搜索 + GitHub + crates.io / docs.rs + 快速开始，1024 下挤，改 lg */
  navBreakpoint: 'lg' as 'md' | 'lg',
  /** 文档站三栏版心 90rem */
  frameWidth: 'wide' as 'default' | 'wide',
  /** 站点图标：旧站 head 第一条（SVG，现代浏览器） */
  favicon: '/logo.svg',
  /** 旧站 head 里的其余图标与 manifest，一组照搬（文件逐字节来自旧站 docs/public/） */
  headLinks: [
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'manifest', href: '/site.webmanifest' },
  ] as HeadLink[],
  /** 默认分享图（public/ 下），1200×630，由 pnpm og 从 design/og/og-default.html 渲染 */
  ogImage: '/og-default.png',
  imageDomains: [] as string[],
  analytics: {
    // 旧站没有接统计
    provider: 'none' as AnalyticsProvider,
    id: '',
    src: '',
  },
  // 照原型 _src/build.cjs 的页头：为什么 · 文档▾（入门 / API / 参考 / AI 辅助 四列 + 底栏）· 更新日志 · 产品矩阵 · 技术服务
  nav: [
    { label: '为什么', href: '/#why', match: '/#why' },
    {
      label: '文档',
      href: '/guide/introduction',
      match: '/guide/|/api/|/reference/providers|/reference/errors|/reference/versioning|/reference/add-provider|/reference/spec|/public/',
      drawerLast: true,
      children: [
        {
          label: '入门',
          href: '/guide/introduction',
          children: [
            { label: '这是什么', href: '/guide/introduction', desc: '边界与三条设计约定' },
            { label: '安装与 feature', href: '/guide/installation', desc: 'chat · client · image · video · tts' },
            { label: '快速开始', href: '/guide/quick-start', desc: '四步跑通一次真实验证' },
            { label: 'Tauri 应用接入', href: '/guide/tauri-integration', desc: 'AppState · Command · 错误映射' },
            { label: '前端对接', href: '/guide/frontend', desc: 'TypeScript 类型与按 code 给动作' },
            { label: '已发布应用的接入迁移', href: '/guide/migration', desc: '冻结旧规则，存量地址修正' },
          ],
        },
        {
          label: 'API',
          href: '/api/preset',
          children: [
            { label: '预置与服务商目录', href: '/api/preset', desc: 'preset_by_key · vendors' },
            { label: '定制服务商目录', href: '/api/catalog', desc: 'PresetCatalog' },
            { label: 'ai.profile 协议', href: '/api/protocol', desc: 'parse_profiles · to_profile' },
            { label: '端点与模型清单', href: '/api/endpoint', desc: 'join_chat_endpoint' },
            { label: '连通性验证', href: '/api/verify', desc: 'Verifier::verify' },
            { label: '限额与历史裁剪', href: '/api/limits', desc: 'TokenLimits · trim_history' },
            { label: '流式解码', href: '/api/stream', desc: 'StreamDecoder' },
            { label: '生图、视频与配音', href: '/api/media', desc: 'media::{image, video, tts}' },
          ],
        },
        {
          label: '参考',
          href: '/reference/providers',
          children: [
            { label: '服务商清单', href: '/reference/providers', desc: '31 家服务商 · 42 条预置' },
            { label: '错误码对照', href: '/reference/errors', desc: 'VerifyError 变体与界面动作' },
            { label: '更新日志', href: '/reference/changelog', desc: '最新 0.1.7 · 2026-10-08' },
            { label: '版本策略', href: '/reference/versioning', desc: '什么改动算破坏性' },
            { label: '加一家服务商', href: '/reference/add-provider', desc: '改本库，下游只升版本' },
            { label: '规范与多语言实现', href: '/reference/spec', desc: 'presets.json · conformance 用例' },
          ],
        },
        {
          label: 'AI 辅助',
          href: '/guide/ai-assisted',
          children: [
            { label: '用 AI 接入', href: '/guide/ai-assisted', desc: '提示词 · 接入技能 · 文档地址' },
            { label: 'ai-profile-integration.md', href: '/ai/ai-profile-integration.md', desc: '给 AI 读的接入规则原文' },
            { label: 'llms-full.txt', href: '/llms-full.txt', desc: '全文文档，让 AI 先读这个' },
            { label: 'llms.txt', href: '/llms.txt', desc: '目录索引' },
            { label: 'Context7', href: '/reference/spec#ai', desc: 'context7.json 收录的 12 条规则' },
          ],
        },
      ],
      footerLinks: [
        { label: '按场景查找', href: '/guide/cookbook' },
        { label: 'docs.rs 上的 API', href: 'https://docs.rs/ai-profile' },
        { label: '规范文件 /spec/', href: '/reference/spec' },
        { label: '可运行示例', href: 'https://github.com/bkywksj/ai-profile/tree/master/crates/ai-profile/examples' },
      ],
    },
    { label: '更新日志', href: '/reference/changelog' },
    { label: '产品矩阵', href: '/products' },
    { label: '技术服务', href: '/services' },
  ] as NavItem[],
  /** 页脚「社区」一栏 + 页头 GitHub 图标（旧站 socialLinks 的 GitHub 指 crate 主仓库） */
  social: [
    { label: 'GitHub', href: 'https://github.com/bkywksj/ai-profile' },
    { label: 'crates.io', href: 'https://crates.io/crates/ai-profile' },
    { label: 'docs.rs', href: 'https://docs.rs/ai-profile' },
    { label: 'B 站视频介绍', href: 'https://www.bilibili.com/video/BV1dhh16qEvE' },
  ] as SocialLink[],
  socialTitle: '社区',
  /** 页头右侧文字链接：照原型（旧站 nav 里平铺的两个外链） */
  headerLinks: [
    { label: 'crates.io', href: 'https://crates.io/crates/ai-profile' },
    { label: 'docs.rs', href: 'https://docs.rs/ai-profile' },
  ] as NavItem[],
  icp: '',
  /** <title> 后缀：旧站每页是「页名 | ai-profile — AI 模型服务配置层」 */
  titleSuffix: 'ai-profile — AI 模型服务配置层',
  /** 首页 <title>：旧站首页就是这一句 */
  homeTitle: 'ai-profile — AI 模型服务配置层',
  /** 站点关键词：旧站 config.ts head 原值 */
  keywords: [
    'ai-profile', 'Rust crate', '模型服务', 'LLM 配置', 'provider 预置', 'ai.profile', 'OpenAI 兼容', 'Anthropic 协议',
    'Tauri', '生图', '视频生成', '语音合成', 'DeepSeek', '智谱', '火山方舟', 'xAI',
  ] as string[],
  headerCta: { label: '快速开始', href: '/guide/quick-start' } as NavItem | null,
  /** 页脚链接分组：照原型 文档 / API / 规范与 AI（社区一栏由 social 出） */
  footerGroups: [
    {
      title: '文档',
      items: [
        { label: '快速开始', href: '/guide/quick-start' },
        { label: '安装与 feature', href: '/guide/installation' },
        { label: '按场景查找', href: '/guide/cookbook' },
        { label: 'Tauri 应用接入', href: '/guide/tauri-integration' },
        { label: '已发布应用的接入迁移', href: '/guide/migration' },
      ],
    },
    {
      title: 'API',
      items: [
        { label: '预置与服务商目录', href: '/api/preset' },
        { label: 'ai.profile 协议', href: '/api/protocol' },
        { label: '连通性验证', href: '/api/verify' },
        { label: '流式解码', href: '/api/stream' },
        { label: '生图、视频与配音', href: '/api/media' },
      ],
    },
    {
      title: '规范与 AI',
      items: [
        { label: '服务商清单', href: '/reference/providers' },
        { label: '规范与多语言实现', href: '/reference/spec' },
        { label: '/spec/presets.json', href: '/spec/presets.json' },
        { label: 'ai-profile-integration.md', href: '/ai/ai-profile-integration.md' },
        { label: 'llms-full.txt', href: '/llms-full.txt' },
      ],
    },
  ] as FooterGroup[],
  /** 页脚说明行：旧站 footer.message（MIT、欢迎 PR、QQ 交流群）+ 技术服务入口；文档站仓库不链（是否公开以后会变），问题与 PR 走 crate 主仓库 */
  footerNote: {
    text: 'MIT License · 问题与建议请到 crate 主仓库提 issue · QQ 交流群 1087715758 · ',
    link: { label: '技术服务', href: '/services' },
  } as { text: string; link?: NavItem } | null,
  /** 版权行署名：与 crate 仓库 LICENSE 一致 */
  copyrightName: '湛江市麻章区湖光镇若依科技工作室',
  /** 开源库，不放咨询购买入口；联系方式在技术服务页 */
  contact: null as ContactInfo | null,
};

export type SiteConfig = typeof site;
