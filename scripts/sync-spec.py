"""把 crate 仓库的 spec/*.json 原样同步到文档站 public/spec/，供其他语言直接下载。

为什么原样复制而不是在文档站里另生成：spec 由 `cargo xtask gen-spec` 从 Rust 参考实现算出，
crate 仓库里有守卫测试保证它与代码一致。文档站再生成一份就是第二个数据源。

只同步 .json；spec/README.md 的内容由文档站的 reference/spec.md 承载（面向读者重写过）。
目标目录里多出来的旧文件会被删掉 —— 否则删掉的用例文件会一直挂在线上。

用法：python sync-spec.py <ai-profile 仓库根> <文档站 public/spec 目录>
"""
import shutil
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

src = Path(sys.argv[1]) / "spec"
dst = Path(sys.argv[2])

wanted = {p.relative_to(src) for p in src.rglob("*.json")}
if not wanted:
    sys.exit(f"🔴 {src} 下没有 json —— 先在 crate 仓库跑 cargo xtask gen-spec")

for rel in sorted(wanted):
    (dst / rel).parent.mkdir(parents=True, exist_ok=True)
    # 按字节复制：生成物是 LF + UTF-8，不经文本层就不会被改行尾
    shutil.copyfile(src / rel, dst / rel)

stale = [p for p in dst.rglob("*.json") if p.relative_to(dst) not in wanted]
for p in stale:
    p.unlink()

print(f"已同步 {len(wanted)} 个文件 → {dst}" + (f"，删除旧文件 {len(stale)} 个" if stale else ""))
