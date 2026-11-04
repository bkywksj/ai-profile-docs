// 页面上长网址的折行：只在路径分隔处折（插 <wbr>），不再按字符把域名拦腰拆开（原型复审遗留）。
// 放在独立 .ts 里而不是写在 .astro 的 frontmatter：Astro 编译器扫 frontmatter 时会把正则里的 (?<! 当成标签开头，构建失败

/** HTML 转义（文本放进 set:html 之前用） */
export const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 网址在 / 后可折行（协议里的 // 不算）
 * @param url 原始网址
 * @param dots 是否也在 . 后可折（表格窄列里的长域名用）
 * @returns 转义后的 HTML
 */
export function breakUrl(url: string, dots = false): string {
  let s = escapeHtml(url).replace(/(?<!\/)\/(?!\/)/g, '/<wbr>');
  if (dots) s = s.replace(/\./g, '.<wbr>');
  return s;
}
