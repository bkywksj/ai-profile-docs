"""校验文档站的内部链接与 sidebar/nav 配置是否都指向真实存在的页面。

VitePress 构建成功 != 链接没断：死链会照样构建出来，只在用户点击时 404。
"""
import io
import sys

# Windows 控制台默认 GBK，emoji 会直接抛 UnicodeEncodeError ——
# 在脚本内固定输出编码，不指望调用方记得设 PYTHONIOENCODING。
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import re
from pathlib import Path

docs = Path(sys.argv[1])
# 跳过 .vitepress/：dist 里有 llms 插件导出的逐页 .md 副本，会把每条问题报两遍
md_files = sorted(f for f in docs.rglob("*.md") if ".vitepress" not in f.relative_to(docs).parts)

# 构建时才生成、源码里不存在的文件（vitepress-plugin-llms 产出）
BUILD_GENERATED = {"/llms.txt", "/llms-full.txt"}

# 站内所有可用路径（VitePress cleanUrls：/guide/foo.md → /guide/foo）
pages = set()
for f in md_files:
    rel = f.relative_to(docs).as_posix()[:-3]  # 去 .md
    pages.add("/" + rel)
    if rel.endswith("index"):
        pages.add("/" + rel[: -len("index")].rstrip("/"))
pages.add("/")

problems = []

# 1. 正文里的站内链接：markdown 链接 + 原生 <a href>
#    （下载静态文件必须用原生 <a>，否则 cleanUrls 会改写路径，所以这类链接不能漏检）
link_res = [
    re.compile(r"\[[^\]]*\]\((/[^)#\s]*)(#[^)\s]*)?\)"),
    re.compile(r"<a\s[^>]*href=\"(/[^\"#]*)(#[^\"]*)?\""),
]
for f in md_files:
    text = io.open(f, encoding="utf-8", newline="").read()
    for m in (m for r in link_res for m in r.finditer(text)):
        target = m.group(1).rstrip("/") or "/"
        if target in pages or target in BUILD_GENERATED:
            continue
        # public/ 下的静态资源也算数
        if (docs / "public" / target.lstrip("/")).exists():
            continue
        problems.append(f"{f.relative_to(docs).as_posix()} → {m.group(1)}")

# 2. config.ts 里 nav / sidebar 的 link
cfg = io.open(docs / ".vitepress" / "config.ts", encoding="utf-8", newline="").read()
for m in re.finditer(r"link:\s*'(/[^']*)'", cfg):
    target = m.group(1).rstrip("/") or "/"
    if target not in pages:
        problems.append(f"config.ts → {m.group(1)}")

print(f"扫描 {len(md_files)} 篇文档，站内路径 {len(pages)} 个")
if problems:
    print(f"\n❌ {len(problems)} 条死链：")
    for p in problems:
        print("  " + p)
    sys.exit(1)
print("✅ 内部链接全部有效")
