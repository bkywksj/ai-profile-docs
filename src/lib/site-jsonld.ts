// 全站结构化数据（项目文件，框架同步不覆盖）：docs 模块的 DocsLayout 在每一页都输出 siteJsonLd，营销页（src/pages/*.astro）同样带上。
// 照抄旧站 docs/.vitepress/config.ts head 里的那一段 SoftwareSourceCode（每页都有），取值逐字照搬，改动时两边对一下。
// 与旧站的差异：补 WebSite（站点这一层的身份，框架每站都有）与 SoftwareSourceCode 的 copyrightHolder（与 crate LICENSE 的版权方一致）
import type { JsonLd } from '@/lib/seo';
import { site } from '@/site.config';
import { docsConfig } from '@/lib/docs-config';

const SITE = site.url;
/** crate 仓库 LICENSE 的版权方：站内凡是版权的说法都与它一致 */
export const COPYRIGHT_HOLDER = '湛江市麻章区湖光镇若依科技工作室';
/** crate 主仓库（旧站 config.ts 的 REPO） */
export const REPO = 'https://github.com/bkywksj/ai-profile';
/** 旧站 config.ts 的 DESC 原文（SoftwareSourceCode.description 逐字照搬） */
const OLD_DESC =
  'ai-profile 是给桌面应用用的 AI 模型服务配置层：对话 25 家与生图 / 视频 / 配音预置、生图视频配音调用、' +
  'ai.profile 跨应用互通协议、端点拼接、连通性验证与限额。纯 Rust，默认零重依赖，按 feature 裁剪。';

export const siteJsonLd: JsonLd[] = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: SITE,
    description: 'ai-profile（AI 模型服务配置层，MIT 开源 Rust crate）的官方文档站',
    inLanguage: site.locale,
    publisher: { '@type': 'Organization', name: COPYRIGHT_HOLDER },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'ai-profile',
    description: OLD_DESC,
    programmingLanguage: 'Rust',
    codeRepository: REPO,
    license: 'https://opensource.org/licenses/MIT',
    copyrightHolder: { '@type': 'Organization', name: COPYRIGHT_HOLDER },
  },
];

/** 文档站没有常见问题页（docs.json 的 faqPage 为空） */
export const faqJsonLd: JsonLd | null = null;

/**
 * 营销页与独立页（src/pages/*.astro）的 TechArticle：字段与文档页同源（docs.json 的 article）
 * @param headline 页面标题（与 <title> 的页名一致）
 * @param description 与 meta description 一致
 * @param path 站内网址（clean 形态，如 /products）
 * @param dateModified 与 src/data/page-dates.json 登记的日期一致
 */
export function pageArticle(headline: string, description: string, path: string, dateModified: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline,
    description,
    url: `${SITE}${path}`,
    dateModified,
    inLanguage: site.locale,
    isPartOf: { '@type': 'WebSite', name: site.name, url: SITE },
    about: docsConfig.article.about,
    proficiencyLevel: docsConfig.article.proficiencyLevel,
    author: docsConfig.article.author ?? { '@type': 'Organization', name: COPYRIGHT_HOLDER },
  };
}
