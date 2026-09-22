"""把 crate 生成的 docs/providers.md 同步进文档站。

为什么要脚本：providers.md 由 `cargo xtask gen-docs` 从代码生成，
手抄进文档站就等于制造第二份会漂移的数据源 —— 而本 crate 存在的全部理由
正是消掉重复数据源。所以这里只做「套一层 VitePress 前言 + 改写相对链接」，
正文一个字不改。

用法：python sync_providers.py <ai-profile 仓库根> <文档站 md 路径>
"""
import io
import sys

# Windows 控制台默认 GBK，emoji 会直接抛 UnicodeEncodeError ——
# 在脚本内固定输出编码，不指望调用方记得设 PYTHONIOENCODING。
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from pathlib import Path

src = Path(sys.argv[1]) / "docs" / "providers.md"
dst = Path(sys.argv[2])

body = io.open(src, encoding="utf-8", newline="").read()

# 去掉生成器写给仓库维护者的 HTML 注释头（文档站读者不需要看到它）
if body.lstrip().startswith("<!--"):
    body = body[body.index("-->") + 3:].lstrip()

# 正文里的相对链接指向仓库文件，在文档站里走不通 → 指回 GitHub
body = body.replace(
    "[`CLAUDE.md`](../CLAUDE.md)",
    "[`CLAUDE.md`](https://github.com/bkywksj/ai-profile/blob/master/CLAUDE.md)",
)

front = """<!-- 🔴 本页由 scripts/sync-providers 从 ai-profile 仓库的 docs/providers.md 同步而来。
     那份文件又由 `cargo xtask gen-docs` 从 Rust 源码生成。
     不要手改本页 —— 改预置请改 crate 里的 preset/*.rs。 -->

# 服务商清单

::: tip 这份清单由代码生成
数据源是 crate 里的 `preset/*.rs`，经 `cargo xtask gen-docs` 生成，
再同步到这里。仓库内有守卫测试 `providers_md_in_sync` 保证它与代码一致。

要新增或修正一家，见[加一家服务商](/reference/add-provider)。
:::

"""

# 生成物自带一级标题，去掉它以免与上面的重复
lines = body.split("\n")
lines = [l for l in lines if l.strip() != "# 支持的服务商"]
body = "\n".join(lines).lstrip()

io.open(dst, "w", encoding="utf-8", newline="\n").write(front + body)
print(f"已同步 {len(front) + len(body)} 字节 → {dst}")
