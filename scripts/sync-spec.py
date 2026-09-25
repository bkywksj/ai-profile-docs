"""把 crate 仓库的 spec/*.json 同步到文档站 public/spec/，供其他语言直接下载。

为什么原样复制而不是在文档站里另生成：spec 由 `cargo xtask gen-spec` 从 Rust 参考实现算出，
crate 仓库里有守卫测试保证它与代码一致。文档站再生成一份就是第二个数据源。

同步到两处：
- public/spec/            最新版。目标目录里多出来的旧文件会删掉 —— 否则删掉的用例会一直挂在线上
- public/spec/v<版本>/     按 crateVersion 存档，给其他语言的实现**锁定版本**用。
                           只写当前版本的目录，其他版本目录一律不碰 —— 发版后旧版本就此冻结
另外维护 public/spec/versions.json：{"latest": "0.1.1", "versions": ["0.1.1", …]}

只同步 .json；spec/README.md 的内容由文档站的 reference/spec.md 承载（面向读者重写过）。

用法：python sync-spec.py <ai-profile 仓库根> <文档站 public/spec 目录>
"""
import json
import re
import shutil
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

src = Path(sys.argv[1]) / "spec"
dst = Path(sys.argv[2])

wanted = {p.relative_to(src) for p in src.rglob("*.json")}
if not wanted:
    sys.exit(f"🔴 {src} 下没有 json —— 先在 crate 仓库跑 cargo xtask gen-spec")

version = json.loads((src / "presets.json").read_text(encoding="utf-8"))["crateVersion"]
VERSION_DIR = re.compile(r"^v\d+\.\d+\.\d+")

# 🔴 已发布版本的存档是冻结的：其他语言的实现锁的就是这些地址。
# crate 仓库改了规则但还没升版本号时，spec 头里仍写着旧版本 —— 这时同步会把旧版本的存档
# 悄悄改成新行为，锁定旧版本的实现随之莫名变红。所以存档已存在且内容不同，一律拒绝。
archive = dst / f"v{version}"
if archive.exists():
    changed = [
        rel.as_posix()
        for rel in sorted(wanted)
        if not (archive / rel).exists() or (archive / rel).read_bytes() != (src / rel).read_bytes()
    ]
    if changed:
        sys.exit(
            f"🔴 v{version} 已发布并冻结，但 crate 仓库的 spec 与它不同：{', '.join(changed)}\n"
            f"   说明 crate 改了规则还没发版。发版流程里先升版本号、重新 gen-spec，再来同步；\n"
            f"   不要删存档目录绕过 —— 那等于改写已发布的规范。"
        )


def copy_all(to: Path):
    for rel in sorted(wanted):
        (to / rel).parent.mkdir(parents=True, exist_ok=True)
        # 按字节复制：生成物是 LF + UTF-8，不经文本层就不会被改行尾
        shutil.copyfile(src / rel, to / rel)


# 1. 最新版 + 清理旧文件（跳过 v<版本>/ 存档目录）
copy_all(dst)
stale = [
    p
    for p in dst.rglob("*.json")
    if not VERSION_DIR.match(p.relative_to(dst).parts[0])
    and p.name != "versions.json"
    and p.relative_to(dst) not in wanted
]
for p in stale:
    p.unlink()

# 2. 当前版本的存档
copy_all(dst / f"v{version}")

# 3. 版本索引：按语义版本排序，新的在前
versions = sorted(
    (d.name[1:] for d in dst.iterdir() if d.is_dir() and VERSION_DIR.match(d.name)),
    key=lambda v: tuple(int(x) for x in v.split(".")),
    reverse=True,
)
(dst / "versions.json").write_text(
    json.dumps({"latest": version, "versions": versions}, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
    newline="\n",
)

print(
    f"已同步 {len(wanted)} 个文件 → {dst}（最新）与 {dst / ('v' + version)}（存档）"
    + (f"，删除旧文件 {len(stale)} 个" if stale else "")
)
print(f"已有版本：{', '.join(versions)}")
