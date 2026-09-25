# 用 AI 接入

用 Claude Code、Codex、Cursor 等 AI 编程助手把本库接进你的项目。
本库 2026-09 才发布，**AI 的训练数据里没有它** —— 不给它资料，它只能凭印象猜 API，
还会踩几个我们在五个应用接入时踩过的坑。下面三样东西就是为此准备的。

| 给 AI 的材料 | 地址 | 用途 |
|---|---|---|
| 全文文档（纯文本） | [`/llms-full.txt`](/llms-full.txt) | 整站文档合成一个文件，AI 一次读完 |
| 文档索引 | [`/llms.txt`](/llms.txt) | 页面清单与摘要，AI 按需取页 |
| 接入技能 | <a href="/ai/ai-profile-integration.md" target="_blank" rel="noopener"><code>/ai/ai-profile-integration.md</code></a> | 放进项目，AI 以后每次改相关代码都会照它做 |
| 可运行示例 | [GitHub · examples](https://github.com/bkywksj/ai-profile/tree/master/crates/ai-profile/examples) | 能编译的完整代码，AI 照着改最可靠 |

## 方式一：贴一段提示词（一次性接入）

把下面这段贴给 AI 助手，按你的项目改一下方括号里的内容：

```text
帮我把 ai-profile（Rust crate，crates.io 上的 ai-profile 0.1）接进这个项目，
用来做 [模型服务设置页 / 粘贴导入 / 对话前的历史裁剪 / 生图视频配音]。

开始前先读这两份资料，不要凭印象写，这个库很新：
1. 接入规则：https://ai-profile.ruoyi.plus/ai/ai-profile-integration.md
2. 完整文档：https://ai-profile.ruoyi.plus/llms-full.txt
示例代码在 https://github.com/bkywksj/ai-profile/tree/master/crates/ai-profile/examples

要求：
- 先找出项目里已有的服务商清单、模型列表、地址拼接、ai.profile 解析，列给我看，接入后删掉它们
- [本项目已经发布过 / 还没发布]。如果发布过，先按文档里的「已发布应用的接入迁移」写存量地址修正和对照测试
- 改完跑全量测试
```

::: tip 为什么强调「先读资料」
AI 最常见的错误都来自凭印象写：给地址手动补 `/v1`、`match` 枚举不写 `_` 兜底、每次调用都新建客户端、
在项目里又抄一份服务商清单。接入规则里把这些逐条写明了。
:::

## 方式二：把接入技能放进项目（长期维护）

一次性提示词只管这一次。把接入技能放进项目，AI 以后每次改模型服务相关的代码都会自动遵守同样的规则。

下载 <a href="/ai/ai-profile-integration.md" target="_blank" rel="noopener"><code>ai-profile-integration.md</code></a>（浏览器里打开后另存为），按你用的工具放：

| 工具 | 放到哪 |
|---|---|
| Claude Code | `.claude/skills/ai-profile-integration/SKILL.md`（文件自带触发条件，会按需自动启用） |
| Codex | `.codex/skills/ai-profile-integration/SKILL.md`，或把正文贴进项目根的 `AGENTS.md` |
| Cursor | 正文存为 `.cursor/rules/ai-profile.mdc` |
| 其他工具 | 贴进该工具的项目级说明文件 |

接入完成后，建议在技能末尾补上**本项目自己的接入点**（设置页组件在哪、验证器存在哪个全局状态里、
密钥怎么存），以后 AI 找代码更快。

## 方式三：只给文档地址

AI 工具支持读取网址时，直接给它 [`https://ai-profile.ruoyi.plus/llms-full.txt`](/llms-full.txt) 即可。
这是整站文档的纯文本版本，随文档自动更新。

## 接入完怎么检查

不管用哪种方式，AI 交活后对照这几条看一眼：

- [ ] 项目里**没有**残留的服务商清单、模型列表、地址拼接函数（搜一下 `api.deepseek.com`、`/chat/completions` 这类字符串）
- [ ] `match VerifyError` / `match ParseError` 都带了 `_` 分支
- [ ] `Verifier` 只建了一次，存在全局状态里
- [ ] 「获取模型」失败时界面给的是动作（一键改用地址、高亮密钥框），不只是一行红字
- [ ] 项目已经发布过的：有存量地址修正和对照测试，并用真实库副本跑过迁移
- [ ] 全量测试通过

## 相关章节

- [快速开始](/guide/quick-start) —— 人读的入门
- [按场景查找](/guide/cookbook) —— 按要做的事查 API
- [已发布应用的接入迁移](/guide/migration) —— 用户手里已有配置时必读
