// 构建产物站内断链检查：dist 里每个 HTML / CSS 引用的站内地址（href、src、srcset、CSS url()）都必须指向产物里真实存在的文件。
// 为什么查产物而不查源文件：旧站的 check-links.py 查 .md 源文件，导航、页脚、营销页、组件里写的链接都漏查；
// 构建成功 ≠ 链接没断，死链会照样构建出来，只在读者点击时 404。
// 网址形态是 clean（旧站 cleanUrls）：/guide/a → guide/a.html，/x/ → x/index.html，与托管平台的解析规则一致。
// 锚点（#xxx）不在这里查，交给 pnpm check:anchors。
//
// 用法：node scripts/check-links.mjs [dist 目录，默认 dist]；有断链退出码 1
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
if (!existsSync(DIST)) {
  console.error(`× 没有 ${DIST}/：先 pnpm build`);
  process.exit(1);
}

const files = [];
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(DIST, p).split(sep).join('/'));
  }
};
walk(DIST);
const exists = new Set(files);

/**
 * 站内地址是否有对应文件（clean 网址：先找原样，再找 .html，再找 index.html）
 * @param path 解码后的路径，以 / 开头，已去掉 ? 与 #
 */
const resolves = (path) => {
  const p = path.replace(/^\/+/, '');
  if (p === '') return exists.has('index.html');
  if (p.endsWith('/')) return exists.has(`${p}index.html`);
  return exists.has(p) || exists.has(`${p}.html`) || exists.has(`${p}/index.html`);
};

const problems = [];
let total = 0;
const ATTR = /\s(?:href|src|poster)="([^"]+)"|\ssrcset="([^"]+)"/g;
const CSS_URL = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
for (const file of files) {
  const isHtml = file.endsWith('.html');
  const isCss = file.endsWith('.css');
  if (!isHtml && !isCss) continue;
  const text = readFileSync(join(DIST, file), 'utf8');
  const refs = [];
  if (isHtml) {
    // 内联脚本里的模板字符串、代码块里的示例 HTML 不算链接：先去掉 <script>、<pre>、<code>
    const html = text.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '');
    for (const m of html.matchAll(ATTR)) {
      if (m[1]) refs.push(m[1]);
      else for (const part of m[2].split(',')) refs.push(part.trim().split(/\s+/)[0]);
    }
    for (const m of html.matchAll(/<style[\s\S]*?<\/style>|style="[^"]*"/g)) for (const u of m[0].matchAll(CSS_URL)) refs.push(u[1]);
  } else {
    for (const u of text.matchAll(CSS_URL)) refs.push(u[1]);
  }
  for (const raw of refs) {
    const ref = raw.replace(/&amp;/g, '&');
    if (!ref || /^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/.test(ref)) continue;
    total++;
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) continue;
    let path;
    try {
      path = decodeURI(clean.startsWith('/') ? clean : posix.join('/', posix.dirname(file), clean));
    } catch {
      path = clean;
    }
    if (!resolves(path)) problems.push(`${file} → ${ref}`);
  }
}

console.log(`扫描 ${files.filter((f) => /\.(html|css)$/.test(f)).length} 个 HTML / CSS，站内引用 ${total} 处`);
if (problems.length) {
  const uniq = [...new Set(problems)];
  console.log(`\n❌ ${uniq.length} 处断链：`);
  for (const p of uniq.slice(0, 80)) console.log(`  ${p}`);
  process.exit(1);
}
console.log('✅ 站内链接与资源全部有效');
