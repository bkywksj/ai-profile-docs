import { defineConfig } from 'vitepress'

// 站点规范域名 —— canonical / og:url / sitemap 统一引用它。
// 🔴 尚未绑定域名时改这一个常量即可，其余引用都从它派生。
const SITE = 'https://ai-profile.ruoyi.plus'

const REPO = 'https://github.com/bkywksj/ai-profile'

const DESC =
  'ai-profile 是给桌面应用用的 AI 模型服务配置层：19 家服务商预置、ai.profile 跨应用互通协议、' +
  '端点拼接与连通性验证。纯 Rust，默认零重依赖，按 feature 裁剪。'

export default defineConfig({
  lang: 'zh-CN',
  title: 'ai-profile — AI 模型服务配置层',
  description: DESC,
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', {
      name: 'keywords',
      content: 'ai-profile,Rust crate,模型服务,LLM 配置,provider 预置,ai.profile,OpenAI 兼容,Anthropic 协议,Tauri,DeepSeek,智谱,火山方舟,xAI',
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
      { text: '指南', link: '/guide/introduction' },
      { text: 'API', link: '/api/preset' },
      {
        text: '参考',
        items: [
          { text: '服务商清单', link: '/reference/providers' },
          { text: '错误码对照', link: '/reference/errors' },
          { text: '版本策略', link: '/reference/versioning' },
          { text: '加一家服务商', link: '/reference/add-provider' },
        ],
      },
      { text: 'GitHub', link: REPO },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          collapsed: false,
          items: [
            { text: '这是什么', link: '/guide/introduction' },
            { text: '安装与 feature', link: '/guide/installation' },
            { text: '快速开始', link: '/guide/quick-start' },
          ],
        },
        {
          text: '接入实战',
          collapsed: false,
          items: [
            { text: 'Tauri 应用接入', link: '/guide/tauri-integration' },
            { text: '前端对接', link: '/guide/frontend' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          collapsed: false,
          items: [
            { text: '预置与服务商目录', link: '/api/preset' },
            { text: '连通性验证', link: '/api/verify' },
            { text: 'ai.profile 协议', link: '/api/protocol' },
            { text: '端点与模型清单', link: '/api/endpoint' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '参考',
          collapsed: false,
          items: [
            { text: '服务商清单', link: '/reference/providers' },
            { text: '错误码对照', link: '/reference/errors' },
            { text: '版本策略', link: '/reference/versioning' },
            { text: '加一家服务商', link: '/reference/add-provider' },
          ],
        },
      ],
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
