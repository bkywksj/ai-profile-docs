// 核对手写在页面里、但能从代码算出来的事实：服务商数、预置数、各能力条数、用例数、当前版本号（旧站 scripts/check-facts.py 的移植，登记项按新站扩充）。
// 数据源是 public/spec/（pnpm sync-spec 从 crate 仓库原样同步，发版时才更新）：presets.json → 条数；versions.json → 当前版本；v<最新>/conformance → 用例数
// 为什么要脚本：这些数字写在首页、产品矩阵、导航、介绍页、版本策略页、规范页里，改了预置或发了版不会有任何报错，只会悄悄过时。
// 能不写死的尽量别写（服务商清单页、规范页的用例表都是构建期从 public/spec 读的，不在这里）；写了的，在这里登记一条。
// 用法：node scripts/check-facts.mjs；有不一致退出码 1
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const spec = join(ROOT, 'public/spec');
const presetsJson = JSON.parse(readFileSync(join(spec, 'presets.json'), 'utf8'));
const { latest } = JSON.parse(readFileSync(join(spec, 'versions.json'), 'utf8'));
const presets = presetsJson.presets;
const n = (k) => presets.filter((p) => p.kind === k).length;
const chat = n('chat');
const media = presets.length - chat;
const vendors = presetsJson.vendors.length;
const caseDir = join(spec, `v${latest}`, 'conformance');
const caseFiles = readdirSync(caseDir).filter((f) => f.endsWith('.json'));
const cases = caseFiles.reduce((a, f) => a + (JSON.parse(readFileSync(join(caseDir, f), 'utf8')).cases ?? []).length, 0);
const thinking = presets.filter((p) => p.thinkingOff).length;

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** [文件, 正则（第一个分组是文档里写的值）, 期望值, 说明] */
const CHECKS = [
  ['src/pages/index.astro', /<li>(\d+) 家服务商 · \d+ 条预置<\/li>/g, vendors, '首页首屏：服务商数'],
  ['src/pages/index.astro', /<li>\d+ 家服务商 · (\d+) 条预置<\/li>/g, presets.length, '首页首屏：预置数'],
  ['src/pages/index.astro', /对话 (\d+) 家 \+ 多模态 \d+ 条预置/g, chat, '首页能力索引：对话预置数'],
  ['src/pages/index.astro', /对话 \d+ 家 \+ 多模态 (\d+) 条预置/g, media, '首页能力索引：多模态预置数'],
  ['src/pages/index.astro', /对话能力共 (\d+) 家/g, chat, '首页 30 秒示例：对话预置数'],
  ['src/pages/index.astro', /(\d+) 条用例/g, cases, '首页能力索引：用例数'],
  ['src/pages/index.astro', /\/spec\/v(\d+\.\d+\.\d+)\//g, latest, '首页：固定版本示例地址'],
  ['src/pages/index.astro', /输出取自 (\d+\.\d+\.\d+) 的预置数据/g, latest, '首页 30 秒示例：数据版本'],
  ['src/pages/products.astro', /<li>(\d+) 家服务商 · \d+ 条预置/g, vendors, '产品矩阵：服务商数'],
  ['src/pages/products.astro', /<li>\d+ 家服务商 · (\d+) 条预置/g, presets.length, '产品矩阵：预置数'],
  ['src/pages/products.astro', /(\d+) 组 \d+ 条一致性用例/g, caseFiles.length, '产品矩阵：用例文件数'],
  ['src/pages/products.astro', /\d+ 组 (\d+) 条一致性用例/g, cases, '产品矩阵：用例数'],
  ['src/pages/products.astro', /引用同一个版本 (\d+\.\d+\.\d+)/g, latest, '产品矩阵：当前版本'],
  ['src/pages/services.astro', /spec\/v(\d+\.\d+\.\d+)\//g, latest, '技术服务：固定版本示例'],
  ['src/pages/services.astro', /<span>(\d+) 个文件<\/span>/g, caseFiles.length, '技术服务：用例文件数'],
  ['src/pages/services.astro', /<span>(\d+) 条全过<\/span>/g, cases, '技术服务：用例数'],
  ['src/site.config.ts', /'(\d+) 家服务商 · \d+ 条预置'/g, vendors, '页头下拉：服务商数'],
  ['src/site.config.ts', /'\d+ 家服务商 · (\d+) 条预置'/g, presets.length, '页头下拉：预置数'],
  ['src/site.config.ts', /'最新 (\d+\.\d+\.\d+) · /g, latest, '页头下拉：最新版本'],
  ['src/data/llms-facts.md', /(\d+) 家服务商、\d+ 条预置/g, vendors, 'llms-facts：服务商数'],
  ['src/data/llms-facts.md', /\d+ 家服务商、(\d+) 条预置/g, presets.length, 'llms-facts：预置数'],
  ['src/data/llms-facts.md', /（对话 (\d+)、/g, chat, 'llms-facts：对话预置数'],
  ['src/data/llms-facts.md', /crate (\d+\.\d+\.\d+)）/g, latest, 'llms-facts：当前版本'],
  ['src/content/docs/guide/introduction.md', /\| `chat` \| (\d+) 家 \|/g, chat, '介绍页：对话预置数'],
  ['src/content/docs/reference/versioning.md', /当前 `(\d+\.\d+\.\d+)`/g, latest, '版本策略页：当前版本'],
  ['src/content/docs/reference/spec.md', /"crateVersion": "(\d+\.\d+\.\d+)"/g, latest, '规范页：文件头示例'],
  ['src/content/docs/reference/spec.md', /来自 https:\/\/ai-profile\.ruoyi\.plus\/spec\/v(\d+\.\d+\.\d+)\//g, latest, '规范页：AI 提示词里的版本'],
  ['src/pages/reference/providers.astro', /只登记官方文档写明了的 \{count\(\(p\) => !!p\.thinkingOff\)\} (条)/g, '条', '服务商清单：关思考条数由数据算（只核对写法没被改回手写数字）'],
];

const problems = [];
for (const [rel, re, want, what] of CHECKS) {
  const found = [...read(rel).matchAll(re)].map((m) => m[1]);
  // 找不到 = 文字被改写了，核对规则也要跟着改，不能静默跳过
  if (!found.length) problems.push(`${what}：${rel} 里找不到 ${re} —— 文字改了就同步改本脚本的核对规则`);
  for (const got of found) if (got !== String(want)) problems.push(`${what}：${rel} 写的是 ${got}，应为 ${want}`);
}

console.log(`核对 ${CHECKS.length} 项（服务商 ${vendors} 家、预置 ${presets.length} 条 = 对话 ${chat} + 多模态 ${media}、关思考 ${thinking} 条、用例 ${caseFiles.length} 个文件 ${cases} 条、当前版本 ${latest}）`);
if (problems.length) {
  console.log(`\n❌ ${problems.length} 处与代码不一致：`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log('✅ 页面里手写的数字与版本号都与 public/spec 一致');
