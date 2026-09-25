# 更新日志

面向使用者的版本说明：每个版本带来了什么、升级时要不要改代码。
开发过程的完整记录见仓库里的 [CHANGELOG.md](https://github.com/bkywksj/ai-profile/blob/master/CHANGELOG.md)。

## 0.1.1 · 2026-09-24

**文档修复，无代码变更。** 升级无需改动。

- docs.rs 改为按全部 feature 构建。0.1.0 在 docs.rs 上只有默认的 `chat`，
  `client`（验证）与 `media`（生图 / 视频 / 配音）两大块在文档里看不到

## 0.1.0 · 2026-09-24

首个 crates.io 版本。发布前已被五个应用按提交号接入并跑通（Sigil、Reeve、知识库、一站通、StoryLoom）。

### 能力

| 模块 | 内容 |
|---|---|
| 预置 | 对话 25 家 + 生图 / 视频 / 配音 17 条，按厂商聚合成目录 |
| 定制目录 | `PresetCatalog`：应用自己增删改筛、加私有服务商 |
| `ai.profile` | 跨应用配置交换，单条与多条打包 |
| 端点 | 拼接与模型清单清洗；OpenAI 兼容原样使用，**Anthropic 自动补 `/v1`** |
| 验证 | 零成本「获取模型」，六个结构化错误各对应一个界面动作 |
| 限额 | 窗口与输出上限四层取值、历史裁剪、上下文超长识别 |
| 多模态调用 | 生图 2 套、视频 6 套、配音 2 套协议（`client` + 对应 feature） |

### 发布前值得知道的几个行为

- **Anthropic 协议的地址填不填 `/v1` 都能用**：末段不是版本号时自动补 `/v1`，末尾写 `#` 表示别替我补。
  从 Claude Code 等工具粘来的「只填主机名」的配置因此能直接用
- **多模态 HTTP 客户端创建失败时直接报错**，不会悄悄退回一个丢了代理与超时的默认客户端
- 最低 Rust 版本 **1.88**

### 从 git 依赖切过来

发布前按提交号接入的项目，把依赖改成版本号即可：

```toml
# 之前
ai-profile = { git = "https://github.com/bkywksj/ai-profile", rev = "…", features = ["chat", "client"] }
# 之后
ai-profile = { version = "0.1", features = ["chat", "client"] }
```

如果你的应用已经发布、并且用自己的旧规则给存量 Anthropic 地址补过 `/v1`，不受影响（带 `/v1` 的地址原样使用）；
旧规则对带路径的地址**直接拼**的，要先读[已发布应用的接入迁移](/guide/migration)。
