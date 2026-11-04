// 读 site.config 里后来新增的可选字段（headLinks / headerLinks / socialTitle / copyrightPrefix）。
// 为什么不直接 site.xxx：site.config.ts 是各站自己的文件、框架同步不覆盖，已孵化站点的配置里可能还没有这些字段，
// 直接读会让 astro check 报「属性不存在」——经这里读，站点没写就按缺省值处理，加字段不必每站补一行才编译得过
import { site } from '@/site.config';

/** <head> 里站点图标之外的一条 <link>（与 site.config 的 HeadLink 同形） */
export interface HeadLinkOption {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
}

/** 页头文字链接（与 site.config 的 NavItem 取用到的字段同形） */
export interface HeaderLinkOption {
  label: string;
  href: string;
}

interface OptionalSiteFields {
  headLinks: HeadLinkOption[];
  headerLinks: HeaderLinkOption[];
  socialTitle: string;
  /** 版权行「© 年份 署名」前面的文字，如开源库的「MIT License · 」；默认空 */
  copyrightPrefix: string;
}

const DEFAULTS: OptionalSiteFields = { headLinks: [], headerLinks: [], socialTitle: '', copyrightPrefix: '' };

/**
 * 取一个可选字段
 * @param key 字段名
 * @returns 站点配置里的值；没写（或写成 undefined）时返回缺省值：两个列表为空、两个文字字段为空串
 */
export function siteOption<K extends keyof OptionalSiteFields>(key: K): OptionalSiteFields[K] {
  return ((site as Partial<OptionalSiteFields>)[key] ?? DEFAULTS[key]) as OptionalSiteFields[K];
}
