"""核对手写文档里「从代码可以算出来」的事实：预置数量、当前版本号。

数据源是 public/spec/（由 sync-spec 从 crate 仓库原样同步，发版时才更新）：
- presets.json → 各 kind 的预置条数
- versions.json → 当前发布版本

为什么要脚本：这些数字写在首页、介绍页、版本策略页、规范页里，改了预置或发了版
不会有任何报错，只会悄悄过时（crate 仓库的 CLAUDE.md 就曾写成「26 家」，实际 25）。
能不写死的尽量别写；写了的，在这里登记一条核对。

用法：python check-facts.py <docs 目录>
"""
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

docs = Path(sys.argv[1])
spec = docs / "public" / "spec"
presets = json.loads((spec / "presets.json").read_text(encoding="utf-8"))["presets"]
latest = json.loads((spec / "versions.json").read_text(encoding="utf-8"))["latest"]

chat = sum(1 for p in presets if p["kind"] == "chat")
media = len(presets) - chat


def read(rel: str) -> str:
    return (docs / rel).read_text(encoding="utf-8")


# (文件, 正则, 期望值, 说明) —— 正则的第一个分组是文档里写的值
CHECKS = [
    ("index.md", r"对话 (\d+) 家 \+ 多模态 \d+ 条", str(chat), "首页：对话预置数"),
    ("index.md", r"对话 \d+ 家 \+ 多模态 (\d+) 条", str(media), "首页：多模态预置数"),
    ("guide/introduction.md", r"\| `chat` \| (\d+) 家 \|", str(chat), "介绍页：对话预置数"),
    ("reference/versioning.md", r"当前 `(\d+\.\d+\.\d+)`", latest, "版本策略页：当前版本"),
    ("reference/spec.md", r"/spec/v(\d+\.\d+\.\d+)/…", latest, "规范页：固定版本示例地址"),
    ("reference/spec.md", r'"latest": "(\d+\.\d+\.\d+)"', latest, "规范页：versions.json 示例"),
    ("reference/spec.md", r'"crateVersion": "(\d+\.\d+\.\d+)"', latest, "规范页：文件头示例"),
    ("reference/spec.md", r"来自 https://ai-profile\.ruoyi\.plus/spec/v(\d+\.\d+\.\d+)/", latest, "规范页：AI 提示词里的版本"),
]

problems = []
for rel, pattern, want, what in CHECKS:
    found = re.findall(pattern, read(rel))
    if not found:
        # 找不到 = 文字被改写了，核对规则也要跟着改，不能静默跳过
        problems.append(f"{what}：{rel} 里找不到 /{pattern}/ —— 文字改了就同步改本脚本的核对规则")
    for got in found:
        if got != want:
            problems.append(f"{what}：{rel} 写的是 {got}，应为 {want}")

print(f"核对 {len(CHECKS)} 项（对话 {chat} 家、多模态 {media} 条、当前版本 {latest}）")
if problems:
    print(f"\n❌ {len(problems)} 处与代码不一致：")
    for p in problems:
        print("  " + p)
    sys.exit(1)
print("✅ 手写文档里的数字与版本号都与代码一致")
