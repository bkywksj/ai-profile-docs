# 端点与模型清单

两个纯函数模块，不需要 `client` feature，也不碰网络。

## 端点拼接

### 核心契约：base_url 原样使用

```rust
use ai_profile::endpoint::join_api_path;

assert_eq!(
    join_api_path("https://api.deepseek.com/v1", "models"),
    "https://api.deepseek.com/v1/models"
);
```

**写什么就是什么，版本段由用户自己填。** 预置清单里各家都已带上完整版本段。
唯一的例外是 Anthropic 协议，见下方[「Anthropic 协议自动补 /v1」](#anthropic-协议自动补-v1)。

### 为什么不自动补 /v1

这里曾经是推断式的：「末段是 `v<数字>` 就不补、否则补 `/v1`、末尾 `#` 可以强制不补」。
推断看着聪明，但它的例外一直在变多：

| 情况 | 实际地址 |
|---|---|
| 多数服务商 | `/v1` |
| 智谱 | `/v4` |
| Gemini OpenAI 兼容层 | `/v1beta/openai` —— 版本段**不在末尾** |
| 各类中转站 | `/api/openai/v1`、`/proxy/anthropic` … |

Gemini 那条只能靠末尾 `#` 开后门。**「需要一个转义符才能表达的规则」本身就说明规则不对。**

而推断错的代价是隐性的：用户照着服务商文档填了正确的 base_url，
库悄悄加了一段，他只看到 404 —— 而且第一反应是怀疑自己填错了，
根本不会想到是库擅自改了地址。

::: tip 这条契约有守卫测试
`join_api_path_never_infers_version_segment` 与 `openai_side_still_never_infers` 盯着，防止有人日后"好心"把 OpenAI 兼容一侧的推断加回来。
:::

### 仅有的两处容错

```rust
// 1. 误填了完整对话端点 —— 剥回 base
join_api_path("https://api.x.com/v1/chat/completions", "models")
//  → "https://api.x.com/v1/models"

// 2. 旧契约遗留的末尾 # 标记（存量配置里可能有）
join_api_path("https://api.x.com/v1#", "models")
//  → "https://api.x.com/v1/models"
```

第 1 条对应一个很常见的用户行为：「同一个字段填了两种东西」——
有人把文档里的完整请求地址整个粘进来。

### join_chat_endpoint：只对对话端点成立的捷径

```rust
use ai_profile::endpoint::join_chat_endpoint;

// 用户粘了完整端点 → 原样使用
join_chat_endpoint("https://relay.example/v1/chat/completions", "chat/completions")
//  → "https://relay.example/v1/chat/completions"
```

`path` 传 `"chat/completions"`（OpenAI 兼容）或 `"messages"`（Anthropic）。

::: warning 为什么它和 join_api_path 是两个函数
「获取模型」走的是 `<base>/models`。如果共用一套判断，
用户填了完整的 `/chat/completions` 会让它拿这个地址去 GET，必然失败。

表现是「能聊天却拉不到模型列表」—— 一个很难联想到根因的故障。
:::

### Anthropic 协议自动补 /v1

「不推断版本段」的理由只对 OpenAI 兼容一侧成立 —— 那边各家确实不统一。Anthropic 协议没有这个问题：
它**只有 v1**，而且整个生态都约定 base 填到版本段之前、由客户端补 `/v1/messages`
（官方 SDK、Claude Code 的 `ANTHROPIC_BASE_URL`、各家的 Anthropic 兼容入口）。
所以 Anthropic 协议按这个约定补，是确定的协议翻译，不是猜。

```rust
use ai_profile::endpoint::{anthropic_base_url, join_chat_endpoint};

// 只填到主机名（Claude Code 的习惯）→ 补 /v1
join_chat_endpoint("https://relay.example:8443", "messages")
//  → "https://relay.example:8443/v1/messages"

// 自己填了 /v1 → 原样用，不会补成 /v1/v1
join_chat_endpoint("https://api.anthropic.com/v1", "messages")
//  → "https://api.anthropic.com/v1/messages"

// Anthropic 兼容入口
anthropic_base_url("https://api.deepseek.com/anthropic")
//  → "https://api.deepseek.com/anthropic/v1"

// 末尾 # = 别替我补（留给路径特殊的网关）
anthropic_base_url("https://odd.gateway/raw#")
//  → "https://odd.gateway/raw"
```

两种写法用户都能用，填不填 `/v1` 结果一样。「获取模型」（`Verifier`）对 Anthropic 协议走同一规则，
两边口径一致，不会出现「获取通过、对话 404」。

::: warning 不补时踩过的坑
从别的工具粘来 `https://x.com:8443` 这种地址，对话打到 `/messages`，
中转网关（如 Sub2API）对不认识的路径回 **200 + 前端网页**，报出来是「解析失败」，完全看不出是少了 `/v1`。
而它的 `/models` 不带 `/v1` 也能用 —— 于是「获取模型」是绿的，只有对话挂。
:::

### ends_with_version_segment

```rust
use ai_profile::endpoint::ends_with_version_segment;

assert!(ends_with_version_segment("https://api.deepseek.com/v1"));
assert!(ends_with_version_segment("https://open.bigmodel.cn/api/paas/v4"));
assert!(!ends_with_version_segment("https://api.deepseek.com"));
assert!(!ends_with_version_segment("https://v4.example.com"));  // 这是主机名
```

只认「`v` + 全数字」，所以主机名以 `v4.` 开头的不会被误判。

**端点拼接不用它** —— 保留是为两件事：守住「预置 base_url 必须自带版本段」这条契约，
以及给前端「这个地址看着缺版本段」的提醒保持同一口径。

## 模型清单清洗

端点返回的 `/models` 往往混着向量、重排、语音、OCR 等非对话模型。
聚合平台尤其明显 —— 硅基流动一次能返回上百条，OpenRouter 实测 433 条。

```rust
use ai_profile::model_filter::{clean_fetched_models, is_chat_model_id};

let cleaned = clean_fetched_models(ids);
println!("{} 个可用，滤掉 {} 个", cleaned.models.len(), cleaned.dropped);
```

`dropped` 用于「已滤掉 N 个向量 / 重排 / 语音等」这类提示文案 ——
让用户知道清单被处理过，而不是以为端点就这么几个。

### 排除法，不是白名单

判断依据是**特征词排除**（`embed`、`rerank`、`whisper`、`tts`、`image`、`ocr` 等），
而不是「认识的模型才留」。完整的特征词表是公开常量 `model_filter::NON_CHAT_MARKERS`
（前缀排除见 `NON_CHAT_PREFIXES`），也随多语言规范发布在 `model_filter.json` 的 `rules` 里。

本库自己的生图 / 视频 / 配音预置有守卫测试：它们的模型名必须全部被识别为非对话，
新增一条非对话预置而特征词没覆盖到，测试直接失败。

理由：厂商上新速度远快于特征词更新。白名单必然把新模型误藏，
而**"藏起来"对用户是不可见的** —— 他只会觉得"这个端点怎么没有那个模型"，
不会想到是客户端滤掉了。排除法最多漏掉几个该滤的，代价小得多。

### 全被滤光时原样返回

```rust
// 🔴 如果过滤后一个不剩，返回去重后的原始清单，并把 dropped 记 0
```

那说明这套特征词在这个端点上判错了。此时宁可把原始清单摆给用户看，
也不能给他一个空下拉 —— **增强而非依赖**：任何一步出错都不该让用户卡在"选不了模型"。

### CleanedModels

| 字段 | 说明 |
|---|---|
| `models` | 可用于对话的清单（已去重） |
| `dropped` | 被滤掉的条数 |
| `dropped_models` | 被滤掉的模型 id（端点顺序），`len() == dropped` |

`is_chat_model_id(id)` 是单条判断，可以单独使用。

## 相关

- [连通性验证](/api/verify) —— `verify` 会自动调用清洗
- [服务商清单](/reference/providers) —— 各家的 base_url 实际长什么样
