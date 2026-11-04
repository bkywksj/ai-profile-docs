// 全站结构化数据（项目文件，框架同步不覆盖）：docs 模块的 DocsLayout / LandingLayout 在每一页都输出 siteJsonLd，
// 迁移旧站时照抄旧站 config.ts head 里的那几段（SoftwareApplication / Organization / ProfessionalService……），取值逐字照搬，改动时两边对一下。
// 常见问题页的 FAQPage 在 faqJsonLd，由文档布局按 docs.json 的 faqPage 追加；没有常见问题页时为 null
import type { JsonLd } from '@/lib/seo';
import { site } from '@/site.config';

export const siteJsonLd: JsonLd[] = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: site.locale,
  },
];

/**
 * 常见问题页的 FAQPage。🔴 结构化数据必须与页面可见内容一致：改常见问题页的这几问时同步这里
 */
export const faqJsonLd: JsonLd | null = null;
