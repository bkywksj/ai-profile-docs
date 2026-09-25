import { defineConfig } from 'vitepress'

// 站点规范域名 —— canonical / og:url / sitemap 统一引用它。
// 🔴 尚未绑定域名时改这一个常量即可，其余引用都从它派生。
const SITE = 'https://ai-profile.ruoyi.plus'

const REPO = 'https://github.com/bkywksj/ai-profile'

const DESC =
  'ai-profile 是给桌面应用用的 AI 模型服务配置层：对话 25 家与生图 / 视频 / 配音预置、生图视频配音调用、' +
  'ai.profile 跨应用互通协议、端点拼接、连通性验证与限额。纯 Rust，默认零重依赖，按 feature 裁剪。'

// 统一侧边栏：入门 → 接入实战 → API（按用途分组）→ 参考
const SIDEBAR = [
  {
    text: '入门',
    items: [
      { text: '这是什么', link: '/guide/introduction' },
      { text: '安装与 feature', link: '/guide/installation' },
      { text: '快速开始', link: '/guide/quick-start' },
      { text: '按场景查找', link: '/guide/cookbook' },
    ],
  },
  {
    text: '接入实战',
    items: [
      { text: 'Tauri 应用接入', link: '/guide/tauri-integration' },
      { text: '前端对接', link: '/guide/frontend' },
      { text: '已发布应用的接入迁移', link: '/guide/migration' },
    ],
  },
  {
    text: 'API · 服务商目录',
    items: [
      { text: '预置与服务商目录', link: '/api/preset' },
      { text: '定制服务商目录', link: '/api/catalog' },
    ],
  },
  {
    text: 'API · 配置与连接',
    items: [
      { text: 'ai.profile 协议', link: '/api/protocol' },
      { text: '端点与模型清单', link: '/api/endpoint' },
      { text: '连通性验证', link: '/api/verify' },
    ],
  },
  {
    text: 'API · 对话辅助',
    items: [
      { text: '限额：窗口与输出上限', link: '/api/limits' },
      { text: '历史裁剪与超长重试', link: '/api/history' },
    ],
  },
  {
    text: 'API · 多模态调用',
    items: [{ text: '生图、视频与配音', link: '/api/media' }],
  },
  {
    text: '参考',
    items: [
      { text: '服务商清单', link: '/reference/providers' },
      { text: '错误码对照', link: '/reference/errors' },
      { text: '更新日志', link: '/reference/changelog' },
      { text: '版本策略', link: '/reference/versioning' },
      { text: '加一家服务商', link: '/reference/add-provider' },
    ],
  },
]

export default defineConfig({
  lang: 'zh-CN',
  title: 'ai-profile — AI 模型服务配置层',
  description: DESC,
  cleanUrls: true,
  lastUpdated: true,

  head: [
    // SVG 给现代浏览器；ICO / PNG 兜底旧浏览器与不认 SVG favicon 的 Safari
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['meta', { name: 'theme-color', content: '#4f46e5' }],
    ['meta', {
      name: 'keywords',
      content: 'ai-profile,Rust crate,模型服务,LLM 配置,provider 预置,ai.profile,OpenAI 兼容,Anthropic 协议,Tauri,生图,视频生成,语音合成,DeepSeek,智谱,火山方舟,xAI',
    }],

    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'zh-CN' }],
    ['meta', { property: 'og:site_name', content: 'ai-profile' }],
    ['meta', { property: 'og:title', content: 'ai-profile — AI 模型服务配置层' }],
    ['meta', { property: 'og:description', content: '一份预置、一个协议、一套验证 —— 多个桌面应用共用。' }],

    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareSourceCode',
      name: 'ai-profile',
      description: DESC,
      programmingLanguage: 'Rust',
      codeRepository: REPO,
      license: 'https://opensource.org/licenses/MIT',
    })],
  ],

  // canonical + og:url 逐页注入，避免非首页出现重复标签
  transformPageData(pageData) {
    const path = pageData.relativePath.replace(/index\.md$/, '').replace(/\.md$/, '')
    const url = `${SITE}/${path}`
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
    )
  },

  sitemap: { hostname: SITE },

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'ai-profile',

    nav: [
      { text: '指南', link: '/guide/introduction', activeMatch: '^/guide/' },
      { text: 'API', link: '/api/preset', activeMatch: '^/api/' },
      { text: '参考', link: '/reference/providers', activeMatch: '^/reference/' },
      { text: '产品矩阵', link: '/products' },
      {
        text: 'v0.1.1',
        items: [
          { text: '更新日志', link: '/reference/changelog' },
          { text: 'crates.io', link: 'https://crates.io/crates/ai-profile' },
          { text: 'docs.rs（Rust API 文档）', link: 'https://docs.rs/ai-profile' },
        ],
      },
    ],

    // 🔴 一棵统一的侧边栏：指南 / API / 参考之间互相跳是常态
    //（读快速开始时想看错误码、读验证 API 时想看接入示例），按目录拆成三套会让读者「看不见另外两块」
    sidebar: {
      '/guide/': SIDEBAR,
      '/api/': SIDEBAR,
      '/reference/': SIDEBAR,
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除查询',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },

    outline: { label: '本页目录', level: [2, 3] },
    lastUpdated: { text: '最后更新' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '深色模式',

    socialLinks: [{ icon: 'github', link: REPO }],

    editLink: {
      pattern: 'https://github.com/bkywksj/ai-profile-docs/edit/master/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    footer: {
      message: 'MIT 协议开源 · 文档同样欢迎 PR',
      copyright: '© 2026 若依科技工作室',
    },
  },
})
