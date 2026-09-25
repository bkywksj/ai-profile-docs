# 安装与 feature

ai-profile 已发布到 [crates.io](https://crates.io/crates/ai-profile)，API 文档见 [docs.rs](https://docs.rs/ai-profile)（按全部 feature 构建）。

## 加依赖

```toml
# Cargo.toml
[dependencies]
ai-profile = { version = "0.1", features = ["chat", "client"] }
```

按场景选一行就够：

| 你要做的 | 写法 |
|---|---|
| 只要预置数据与纯函数（HTTP 自己发 / 移动端） | `ai-profile = "0.1"` |
| 再加「获取模型」零成本验证 | `ai-profile = { version = "0.1", features = ["client"] }` |
| 再加生图 / 视频 / 配音调用 | `ai-profile = { version = "0.1", features = ["client", "image", "video", "tts"] }` |

::: tip 版本号怎么升
`0.1` 表示接受 `0.1.x` 的所有补丁版本（新模型、新服务商、修 bug），`cargo update -p ai-profile` 即可拿到；
升到 `0.2` 意味着有破坏性变更，要读[更新日志](/reference/changelog)再动手。判定规则见[版本策略](/reference/versioning)。
:::

**最低 Rust 版本：1.88**（由开启多模态时的图像解码依赖决定；只开 `chat` 的形态实际能在更老的编译器上编，
但 `rust-version` 只能写一个值，按最严的写）。

## feature 矩阵

| feature | 默认 | 作用 | 带来的依赖 |
|---|---|---|---|
| `chat` | ✅ | 对话能力的预置与类型 | 无 |
| `image` | ❌ | 生图预置；与 `client` 同开时加上生图调用 | 无 |
| `video` | ❌ | 视频预置；与 `client` 同开时加上视频调用 | 图像解码库（大首帧压缩用） |
| `tts` | ❌ | 配音预置；与 `client` 同开时加上配音调用 | 无 |
| `client` | ❌ | 真实 HTTP 调用（`Verifier` / `verify`，以及开了能力后的 `media`） | `reqwest`、`tokio`、`base64`、`log` |

### 组合出什么

| 开的 feature | 得到 |
|---|---|
| `chat` | 预置、服务商目录、`ai.profile`、端点拼接、模型清洗、限额、历史裁剪 —— 全是纯数据与纯函数 |
| `chat` + `client` | 再加「获取模型」零成本验证 |
| + `image` / `video` / `tts` | 再加对应能力的预置 |
| + `client` 且开了某个能力 | 再加该能力的真实调用（[生图、视频与配音](/api/media)） |

默认只开 `chat`：

```toml
ai-profile = "0.1"                      # = features = ["chat"]
```

### 不开 client 时你得到什么

纯数据 + 纯函数：预置清单、服务商目录、`ai.profile` 解析生成、端点拼接、模型清单清洗。
**全部不需要网络，也不需要异步运行时** —— 依赖只有 `serde` / `serde_json` / `thiserror`。

这个形态能编到 Android / iOS，也适合只想用预置数据、HTTP 走自己那一套的项目。

```toml
# 只要数据层，HTTP 我自己发
ai-profile = { version = "0.1", default-features = false, features = ["chat"] }
```

### 开 client 时多了什么

`Verifier`、`verify()` 以及围绕它们的纯函数（`diagnose` / `suggest_url` / `parse_model_ids` …）。

`reqwest` 以 `default-features = false` + `rustls-tls` 引入 —— 不拉 OpenSSL，
避免在 Windows 上触发「要装 Perl 才能编译」这类构建依赖。

::: warning 开了 client 就把 reqwest 拉进了你的公开依赖
`Verifier::from_builder` 接收 `reqwest::ClientBuilder`，所以 **reqwest 的大版本进入了本 crate 的公开 API**。
reqwest `0.12 → 0.13` 会是本 crate 的 major 变更。

这是刻意付的代价，理由见[版本策略](/reference/versioning#_3-reqwest-的大版本在公开-api-里)。
:::

## 多能力应用

需要多种能力时一起开。能力之间互不依赖，开哪个就有哪个的预置：

```toml
# StoryLoom：对话 + 生图 + 视频 + 语音全都要
ai-profile = { version = "0.1", features = ["chat", "image", "video", "tts", "client"] }
```

```toml
# sigil：只做对话
ai-profile = { version = "0.1", features = ["chat", "client"] }
```

`Kind` 枚举的成员是按 feature 编译的 —— 没开 `video` 时 `Kind::Video` 根本不存在，
不会有「界面上出现了一个本应用不支持的选项」这种问题。

::: danger 下游 match 必须带 `_` 分支
`Kind`、`Protocol`、`VerifyError` 等公开枚举都带 `#[non_exhaustive]`。
这让本 crate 加枚举值只算 minor 版本，代价是你的 `match` 必须写 `_ => ...` 兜底。
:::

## 验证安装

```rust
fn main() {
    let all = ai_profile::presets();
    println!("内置 {} 条预置", all.len());
    for p in all.iter().take(3) {
        println!("  {} — {}", p.key, p.label);
    }
}
```

```text
内置 25 条预置
  anthropic_official — Anthropic 官方
  claude_code — Claude Code 客户端（自定义接口地址）
  codex — Codex 客户端（自定义接口地址）
```

## 下一步

- [快速开始](/guide/quick-start) —— 跑通一次真实验证
- [Tauri 应用接入](/guide/tauri-integration) —— 存进 `AppState`、包成 Command
- [已发布应用的接入迁移](/guide/migration) —— 用户手里已有配置时先读这篇
