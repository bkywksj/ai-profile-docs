// 把 crate 仓库的 spec/*.json 同步到 public/spec/，供其他语言直接下载（VitePress 时代的 scripts/sync-spec.py 原样移植）。
// 为什么原样复制而不是在文档站里另生成：spec 由 `cargo xtask gen-spec` 从 Rust 参考实现算出，crate 仓库里有守卫测试保证它与代码一致，
// 文档站再生成一份就是第二个数据源。
//
// 同步到两处：
//   public/spec/           最新版。目标目录里多出来的旧文件会删掉 —— 否则删掉的用例会一直挂在线上
//   public/spec/v<版本>/    按 crateVersion 存档，给其他语言的实现锁定版本用。只写当前版本的目录，其他版本目录一律不碰（发版后就此冻结）
// 另外维护 public/spec/versions.json：{"latest": "0.1.7", "versions": ["0.1.7", …]}
// 只同步 .json；spec/README.md 的内容由文档站的 reference/spec 页承载（面向读者重写过）。
//
// 用法：node scripts/sync-spec.mjs [ai-profile 仓库根，默认 ../ai-profile] [public/spec 目录，默认 public/spec]
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const repo = process.argv[2] ?? '../ai-profile';
const dst = process.argv[3] ?? 'public/spec';
const src = join(repo, 'spec');

/** 目录下全部 .json 的相对路径（正斜杠） */
const listJson = (dir) => {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.json')) out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
};

const wanted = listJson(src);
if (!wanted.length) {
  console.error(`🔴 ${src} 下没有 json —— 先在 crate 仓库跑 cargo xtask gen-spec`);
  process.exit(1);
}
const version = JSON.parse(readFileSync(join(src, 'presets.json'), 'utf8')).crateVersion;
const VERSION_DIR = /^v\d+\.\d+\.\d+/;

// 🔴 已发布版本的存档是冻结的：其他语言的实现锁的就是这些地址。
// crate 改了规则但还没升版本号时，spec 头里仍写着旧版本 —— 这时同步会把旧版本的存档悄悄改成新行为，所以存档已存在且内容不同一律拒绝
const archive = join(dst, `v${version}`);
if (existsSync(archive)) {
  const changed = wanted.filter((rel) => !existsSync(join(archive, rel)) || !readFileSync(join(archive, rel)).equals(readFileSync(join(src, rel))));
  if (changed.length) {
    console.error(`🔴 v${version} 已发布并冻结，但 crate 仓库的 spec 与它不同：${changed.join(', ')}`);
    console.error('   说明 crate 改了规则还没发版。发版流程里先升版本号、重新 gen-spec，再来同步；');
    console.error('   不要删存档目录绕过 —— 那等于改写已发布的规范。');
    process.exit(1);
  }
}

/** 按字节复制：生成物是 LF + UTF-8，不经文本层就不会被改行尾 */
const copyAll = (to) => {
  for (const rel of wanted) {
    mkdirSync(dirname(join(to, rel)), { recursive: true });
    copyFileSync(join(src, rel), join(to, rel));
  }
};

// 1. 最新版 + 清理旧文件（跳过 v<版本>/ 存档目录）
copyAll(dst);
const stale = listJson(dst).filter((rel) => !VERSION_DIR.test(rel.split('/')[0]) && rel !== 'versions.json' && !wanted.includes(rel));
for (const rel of stale) unlinkSync(join(dst, rel));

// 2. 当前版本的存档
copyAll(archive);

// 3. 版本索引：按语义版本排序，新的在前
const versions = readdirSync(dst)
  .filter((d) => VERSION_DIR.test(d) && statSync(join(dst, d)).isDirectory())
  .map((d) => d.slice(1))
  .sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pb[i] - pa[i];
    return 0;
  });
writeFileSync(join(dst, 'versions.json'), `${JSON.stringify({ latest: version, versions }, null, 2)}\n`);

console.log(`已同步 ${wanted.length} 个文件 → ${dst}（最新）与 ${archive}（存档）${stale.length ? `，删除旧文件 ${stale.length} 个` : ''}`);
console.log(`已有版本：${versions.join(', ')}`);
