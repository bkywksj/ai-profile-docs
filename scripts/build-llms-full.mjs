// 构建后生成给 AI 编程助手读的 Markdown：dist/llms-full.txt（全部文档页正文拼成一份）与逐页 dist/<页面>.md。
// 为什么要它：旧站（VitePress + vitepress-plugin-llms）就提供这两样，旧 llms.txt 里列的正是逐页 .md 地址
// （https://ai-profile.ruoyi.plus/guide/introduction.md），「用 AI 接入」页也让读者把 llms-full.txt 交给 AI。网址要保住，内容要跟正文同源。
// 框架的 scripts/build-llms.mjs 只出 llms.txt（索引），这两样是本站自己的，放在 astro build 之后跑（写进 dist，不进仓库，不会过时）。
//
// 每页的形状与旧站插件一致：
//   ---
//   url: https://ai-profile.ruoyi.plus/guide/introduction.md
//   ---
//   # 这是什么
//   正文（源文件原样，去掉 frontmatter）
// 正文里的 HTML 块（迁移时 ::: 容器预转成的提示框、按原型做的卡片与表格）换回 Markdown 能读的样子：
//   提示框 → `::: tip 标题` … `:::`（与旧站正文一致）；其余整行 HTML 只留文字
// 另外照旧站补一份 dist/public/ai/ai-profile-integration.md（旧插件把 docs/public 下的 .md 也当成了页面，旧 llms.txt 列着这个地址）。
//
// 用法：node scripts/build-llms-full.mjs（pnpm build 末尾自动执行）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSiteMeta } from './lib/site-meta.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SITE = readSiteMeta(ROOT).url;
if (!existsSync(DIST)) {
  console.error('× 没有 dist/：先 astro build');
  process.exit(1);
}

/** 侧栏顺序的全部页面 id（llms-full.txt 按这个顺序拼，与旧站一致） */
const ids = [];
const walk = (items) => {
  for (const item of items) {
    if (item.id) ids.push(item.id);
    if (item.items) walk(item.items);
  }
};
walk(JSON.parse(readFileSync(join(ROOT, 'src/data/sidebar.json'), 'utf8')).docs);

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&amp;': '&' };
const decode = (s) => s.replace(/&(lt|gt|quot|#39|nbsp|amp);/g, (m) => ENTITIES[m]);

/**
 * 页面源文件 → 给 AI 读的 Markdown
 * @param src 源文件全文
 * @returns 去掉 frontmatter、HTML 块换成文字后的正文
 */
export function toLlmsMarkdown(src) {
  const body = src.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '');
  const out = [];
  let fence = null;
  // 提示框嵌套深度：只有提示框自己的 </div> 换成 :::
  const stack = [];
  for (const line of body.split('\n')) {
    const f = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      out.push(line);
      continue;
    }
    if (f) {
      fence = f[1];
      out.push(line);
      continue;
    }
    const callout = line.match(/^<(div|details) class="vp-callout vp-callout-(\w+)"><(?:p class="vp-callout-title"|summary)>(.*?)<\/(?:p|summary)>\s*$/);
    if (callout) {
      stack.push('callout');
      out.push(`::: ${callout[2]} ${decode(callout[3].replace(/<[^>]+>/g, ''))}`);
      continue;
    }
    if (/^<\/(div|details)>\s*$/.test(line) && stack.length) {
      stack.pop();
      out.push(':::');
      continue;
    }
    if (/^\s*</.test(line)) {
      // 整行 HTML（卡片、表格、图示）：只留文字，标签之间补空格免得词粘在一起
      const text = decode(line.replace(/<br\s*\/?>/g, ' ').replace(/<\/(td|th|li|p|div|h\d|span|b|code)>/g, '$& ').replace(/<[^>]+>/g, ''))
        .replace(/[ \t]+/g, ' ')
        .trim();
      if (text) out.push(text);
      continue;
    }
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const pages = [];
for (const id of ids) {
  const file = join(ROOT, 'src/content/docs', `${id}.md`);
  if (!existsSync(file)) continue;
  const url = `${SITE}/${id}.md`;
  const src = readFileSync(file, 'utf8');
  let body = toLlmsMarkdown(src);
  // 页面自己出一级标题的文档（src/pages 下的独立页，.md 正文里不写 # 标题）：按 frontmatter 的 title 补回
  if (!/^# /m.test(body.replace(/^(```|~~~)[\s\S]*?^\1/gm, ''))) {
    const title = JSON.parse((src.match(/^title:\s*(".*")\s*$/m) ?? [null, '""'])[1]);
    body = `# ${title}\n\n${body}`;
  }
  const md = `---\nurl: ${url}\n---\n${body}\n`;
  mkdirSync(dirname(join(DIST, `${id}.md`)), { recursive: true });
  writeFileSync(join(DIST, `${id}.md`), md);
  pages.push(md);
}
writeFileSync(join(DIST, 'llms-full.txt'), pages.join('\n'));

// 接入技能原文：旧插件把 docs/public/ai/ai-profile-integration.md 当页面，产出带 url 的副本（原文件 /ai/ai-profile-integration.md 照常由 public/ 原样拷贝）
const skill = readFileSync(join(ROOT, 'public/ai/ai-profile-integration.md'), 'utf8').replace(/\r\n/g, '\n');
const skillUrl = `${SITE}/public/ai/ai-profile-integration.md`;
const withUrl = skill.startsWith('---\n') ? skill.replace(/^---\n/, `---\nurl: ${skillUrl}\n`) : `---\nurl: ${skillUrl}\n---\n${skill}`;
mkdirSync(join(DIST, 'public/ai'), { recursive: true });
writeFileSync(join(DIST, 'public/ai/ai-profile-integration.md'), withUrl);

console.log(`llms-full.txt：${pages.length} 页；逐页 .md ${pages.length} 个；public/ai/ai-profile-integration.md 1 个`);
