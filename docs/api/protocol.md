# ai.profile 协议

`ai.profile` 是一个跨应用的模型服务配置交换格式。用户在 A 应用配好一条服务，
复制一段 JSON，粘进 B 应用就能用。

任何工具都可以生成或解析它 —— 它是一个格式约定，不依赖本 crate。

## 信封

```json
{
  "kind": "ai.profile",
  "v": 1,
  "data": {
    "name": "我的 DeepSeek",
    "provider": "openai",
    "baseURL": "https://api.deepseek.com/v1",
    "apiKey": "sk-...",
    "model": "deepseek-flash",
    "hints": { "toolId": "claude-code" }
  }
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `kind` | ✅ | 固定 `"ai.profile"` |
| `v` | ✅ | 协议版本，当前 `1` |
| `data.name` | | 配置名；缺失时接收方可用 provider 名兜底 |
| `data.provider` | | 来源软件的 provider 标识，用于推断协议 |
| `data.baseURL` | | 端点地址；缺失 = 走接收方的默认端点 |
| `data.apiKey` | | 明文密钥 |
| `data.model` | | 模型 id；**缺失是常见情况**，见下 |
| `data.hints.toolId` | | 来源工具标识，协议推断的兜底依据 |

## 🔴 字段命名：规范一种，接受三种

规范写法是 `baseURL` / `apiKey`（`URL` 全大写是历史既成事实，不是笔误）。
但现实中各家生成的 JSON 并不统一，所以**解析时同时接受**：

| 规范 | 也接受 |
|---|---|
| `baseURL` | `baseUrl`、`base_url` |
| `apiKey` | `api_key` |

这不是洁癖问题。调研四份既有实现时发现，其中一份的 Rust 解析器只认
`baseURL` / `base_url`，**漏了 `baseUrl`** —— 另一个应用生成的配置它解析不了，
而两边都自认为"实现了 ai.profile"。用户看到的是"复制过去没反应"，
两边的开发者都会觉得是对方的问题。

统一到本 crate 正是为了消掉这类静默不兼容。

::: tip 宽进严出
解析时接受各种别名，**生成时只产出规范写法**。
如果每个实现都"顺手"生成自己偏好的拼写，生态会持续分裂下去。
:::

## 解析

```rust
use ai_profile::{parse_profile, ParseError};

// default_model：来源没给 model 时的兜底值，按你的预置传入
let profile = parse_profile(pasted_text, "deepseek-flash")?;

println!("{} → {}", profile.name, profile.base_url);
if profile.model_fallback {
    // 🔴 来源没给 model，当前值是你补的默认值 —— 提示用户确认
}
```

### ParsedProfile

| 字段 | 说明 |
|---|---|
| `name` | 配置名；来源没给时为空串 |
| `protocol` | **推断出的**协议，决定走 `/v1/messages` 还是 `/v1/chat/completions` |
| `raw_provider` | 来源给的原始 provider 字符串（原样保留，便于让用户确认） |
| `base_url` | 端点地址；空串 = 来源没给 |
| `api_key` | 明文密钥；空串 = 来源没给 |
| `model` | 模型 id |
| `model_fallback` | 🔴 为真表示**来源没给 model**，当前值是你补的默认值 |

序列化为 camelCase（`baseUrl` / `apiKey` / `modelFallback` / `rawProvider`），
可直接从 Tauri Command 返回给粘贴导入表单。

::: danger ParsedProfile 含明文密钥
它序列化后会经 IPC 到达前端 —— 这是粘贴导入功能本身的要求（表单要把密钥填进去）。
但因此：**不要把整个结构体写进日志**，也不要存进任何缓存。
:::

### 为什么 model 不是必填

不少来源分享的是「中转站的 key + 端点」，`model` 留空让接收方自己选 ——
因为中转站暴露的模型名往往与官方不同，来源方自己也不确定接收方该填哪个。

`model_fallback` 就是为这种情况准备的：为真时**提示用户确认模型名**。
猜错的话要等第一次对话才报错，那时用户早已离开设置页，很难联想到根因。

## 协议推断

`provider` 字符串到协议的映射，外加**两条兜底**。这两条都来自真实场景，不是防御性编程：

| 依据 | 判定 |
|---|---|
| `provider` 含 `anthropic` / `claude` | Anthropic |
| `model` 以 `claude-` 开头 | Anthropic |
| `hints.toolId` 含 `claude` / `anthropic` | Anthropic |
| 其余 | OpenAI 兼容 |

**第 2 条**：密钥限定 `/v1/messages` 的中转卖家，`provider` 常写 `custom`，
但 model 就是 `claude-opus` / `claude-sonnet`。

**第 3 条**：某些软件分享中转配置时是 `provider: "custom"` + 空 model +
`toolId: "claude-code"`。不看 `toolId` 会误判成 OpenAI 兼容，然后请求错端点 ——
用户得到的是一个 404，完全看不出是协议判错了。

## 生成

```rust
use ai_profile::{to_profile, Protocol};

let json = to_profile(
    "我的 DeepSeek",
    Protocol::OpenAiCompatible,
    "https://api.deepseek.com/v1",
    "sk-...",
    "deepseek-flash",
);
// 写进剪贴板，或存成文件
```

输出的 `provider` 用通用标签（`"openai"` / `"anthropic"`）而非内部枚举名 ——
`"openai"` 比 `"openai_compatible"` 更容易被别家实现认出来。

::: danger 产物含明文密钥
`to_profile` 的返回值里有密钥原文。调用方自己决定它去哪（剪贴板 / 文件），
并且**不要写进日志**。本 crate 不做任何持久化。

建议在界面上明确告知用户「这段内容包含你的密钥」，别让他随手发到群里。
:::

## 版本兼容

**只拒绝更高的版本**：

```rust
if env.v > AI_PROFILE_VERSION { return Err(UnsupportedVersion { .. }) }
```

低版本能被高版本实现读懂（字段只增不改），拒绝低版本只会把老软件分享的配置挡在外面。

`v` 字段缺失时按当前版本处理 —— 有些手写的配置会漏掉它。

## 错误

`ParseError` 回答的是「这段文本是不是一条配置」，与 `VerifyError`（「这条配置对不对」）
分属两个阶段：

| 变体 | JSON `code` | 含义 |
|---|---|---|
| `Empty` | `empty` | 输入为空 |
| `InvalidJson { detail }` | `invalid_json` | 不是合法 JSON |
| `NotAiProfile { found }` | `not_ai_profile` | `kind` 不是 `ai.profile` |
| `UnsupportedVersion { found, supported }` | `unsupported_version` | 版本高于本实现 |
| `MissingData` | `missing_data` | `data` 缺失或不是对象 |

界面上这两类错误的表现应当不同：`ParseError` 说明"你粘错东西了"，
`VerifyError` 说明"配置本身有问题"。

## 给其它实现者

如果你在别的语言里实现 `ai.profile`，请遵守：

1. **解析接受三种拼写**（`baseURL` / `baseUrl` / `base_url`；`apiKey` / `api_key`）
2. **生成只产出规范写法**
3. **只拒绝更高版本**
4. `model` 缺失是合法的，别当成错误
5. 字段**只增不改** —— 改已有字段名是生态分裂

## 相关

- [前端对接](/guide/frontend) —— 粘贴导入表单的实现
- [版本策略](/reference/versioning) —— 协议改动的版本位判定
