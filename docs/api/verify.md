# 连通性验证

需要 `client` feature。

验证只打端点的**模型列表**接口 —— 它回答「这个地址 + 这个密钥能不能用」，
并顺带把真实模型清单带回来，**不产生任何生成费用**。

## 为什么验证和试运行要分开

四种能力的单次调用成本差几个数量级：

| 能力 | 一次真实调用的代价 |
|---|---|
| 对话 | 几十 token |
| 生图 | 几毛钱 |
| 视频 | 约 ¥1–5，且要等 90 秒 |

一个「测试」按钮如果对所有能力都做真实调用，用户点一下视频测试就是实打实的钱和一分半等待。
所以本库把**零成本验证**（本页）与**试运行**（`dry_run`，规划中）分开，
且视频能力不提供试运行 —— 这是成本约束，不是实现遗漏。

## Verifier

`Verifier` 持有一个可复用的 `reqwest::Client`。**建一次、存起来、反复用。**

```rust
use ai_profile::client::Verifier;

let verifier = Verifier::new()?;      // 应用启动时
```

::: danger 不要在每次验证时现建
`reqwest::Client` 内部持有连接池，这是它的全部价值。每次现建等于连接池永远是空的，
每次都从 TCP + TLS 握手重来 —— 跨境端点尤其明显。

「全部测试」这种一次点四下的按钮，会连做四次完整握手。
:::

### 注入代理与自定义配置

```rust
use ai_profile::client::Verifier;

let builder = my_app::proxy::apply_proxy(ai_profile::reqwest::Client::builder());
let verifier = Verifier::from_builder(builder)?;
```

用本 crate 重导出的 `ai_profile::reqwest` 建 builder —— 版本必然匹配。
用自己依赖树里的 reqwest 会在版本不同时报出
`expected ClientBuilder, found ClientBuilder` 这种极难懂的错误。

::: warning 三项安全默认值你覆盖不掉
`from_builder` 在**你的配置之后**再施加：

| 项 | 值 | 为什么不可覆盖 |
|---|---|---|
| 总超时 | 20 秒 | 用户正看着转圈，交互式动作的预算比对话请求短得多 |
| 连接超时 | 10 秒 | 同上 |
| 重定向 | **禁止** | 跨 host 跳转时 reqwest 只剥 `Authorization` 等标准头、**不剥自定义头**，Anthropic 的 `x-api-key` 会被原样发往跳转目标。同时堵死二段跳 SSRF |

LLM 端点正常返回 200，不需要重定向。
:::

### 自由函数 verify

图省事的一次性场景可以直接用自由函数，它走进程级共享的默认实例：

```rust
use ai_profile::client::{verify, ServiceConfig};

let ok = verify(cfg).await?;
```

::: warning 需要代理就不能用它
默认实例没有任何代理配置。桌面应用应当自己建一个 `Verifier::from_builder` 存进全局状态。
:::

## ServiceConfig

全部字段都是借用 —— 调用方通常直接从表单字段取，不该为验证一次而 clone。

```rust
use ai_profile::client::ServiceConfig;
use ai_profile::Protocol;

let extra = [("appid", "123")];
let cfg = ServiceConfig::new(Protocol::OpenAiCompatible, "https://api.deepseek.com/v1")
    .with_preset("deepseek")
    .with_api_key("sk-…")
    .with_model("deepseek-flash")
    .with_extra(&extra);
```

| 方法 | 作用 |
|---|---|
| `new(protocol, base_url)` | 最小构造 |
| `with_preset(key)` | 校验该预置的必填专有字段；`base_url` 为空时用预置地址兜底 |
| `with_api_key(key)` | 明文密钥。空串 = 不带鉴权（本地服务常见） |
| `with_model(model)` | 给了就校验它在不在端点清单里 |
| `with_extra(&[(k, v)])` | 专有字段的实际值 |

::: warning 只能用 builder
`ServiceConfig` 带 `#[non_exhaustive]`，外部 crate 写不了 `ServiceConfig { .. }` 字面量（E0639）。

这是刻意的：`non_exhaustive` 让本 crate 以后加字段只算 minor 版本。
代价就是入参类型**必须配完整的 builder**，否则下游根本没法用。
:::

## VerifyOk

```rust
pub struct VerifyOk {
    pub latency_ms: u32,      // 往返耗时 —— 界面显示「正常 · 320ms」，中转站慢不慢一眼看出
    pub models: Vec<String>,  // 端点返回的可对话模型清单（已去重 + 清洗）
    pub dropped: usize,       // 滤掉的条数 —— 用于「已滤掉 N 个向量 / 重排 / 语音等」
    pub model_in_list: bool,  // 当前填的 model 在不在清单里
}
```

序列化为 camelCase（`latencyMs` / `modelInList`），可直接从 Tauri Command 返回。

`dropped` 别忽略：聚合平台一次能返回几百条，滤掉的往往比留下的多。
不告诉用户清单被处理过，他会以为这个端点就这么几个模型。

`models` 的正确用法是**把它填进模型下拉** —— 用户不必再去翻文档抄模型名。
这是验证顺带产生的价值，别浪费。

`model_in_list` 为 `false` 时给一个提示而不是报错：端点清单未必完整，
用户也可能刻意用一个未公开的模型名。

## 并发验证

`verify` 只借 `&self`，且 `Verifier` 是 `Send + Sync + 'static`：

```rust
use futures_util::future::join_all;

let results = join_all(rows.iter().map(|r| {
    let v = &verifier;
    async move { (r.id, v.verify(make_cfg(r)).await) }
})).await;
```

共用一个 `Verifier` 就是共用连接池 —— 同一家的多条配置只握手一次。

本库自己的 `cargo xtask probe` 就是这么做的：19 家串行最坏要 6 分钟，
并发后实测 12 家 4.5 秒跑完。

## 不发请求也能判的事

有些失败不必等网络往返。**在发请求之前**判出来，界面直接禁用按钮：

```rust
use ai_profile::client::check_required_fields;

let extra = [("appid", "")];
if check_required_fields(Some("some_preset"), &extra).is_err() {
    // 「测试连接」按钮置灰
}
```

禁用态优于「点了才报错」—— 用户不会浪费一次点击，也不会怀疑是网络问题。

## 可单测的纯函数

错误映射是本模块最容易写错的地方，所以判断逻辑与发请求是分开的。
这些函数**不碰网络**，你也可以直接用：

| 函数 | 作用 |
|---|---|
| `diagnose(status, body, requested_url, base_url)` | HTTP 状态码 + 响应体 → `VerifyError` |
| `suggest_url(base_url)` | 404 时推断正确地址；已有版本段时返回 `None` |
| `check_required_fields(preset_key, extra)` | 必填专有字段校验 |
| `parse_model_ids(body)` | 从 `/models` 响应抽 id，容错裸数组格式 |

`suggest_url` 只在**确实看不到版本段**时给建议：

```rust
use ai_profile::client::suggest_url;

assert_eq!(suggest_url("https://api.deepseek.com").as_deref(), Some("https://api.deepseek.com/v1"));
assert_eq!(suggest_url("https://api.deepseek.com/v1"), None);           // 已有 /v1
assert_eq!(suggest_url("https://open.bigmodel.cn/api/paas/v4"), None);  // 智谱是 /v4
assert_eq!(suggest_url("https://generativelanguage.googleapis.com/v1beta/openai"), None);
```

已经有版本段却 404 说明是别的问题 —— 乱给建议会把用户引向另一个错误答案。

## 安全约定

- **密钥绝不进错误信息**：所有 `detail` 字段只放端点返回的文本摘要（截断 300 字符），
  调用方可以安全地 `log::warn!("{e}")`
- **不持久化任何东西**：密钥用完即弃
- **禁重定向**：见上方

## 相关

- [错误码对照](/reference/errors) —— 六个变体各自对应的界面动作
- [Tauri 应用接入](/guide/tauri-integration) —— 存进 AppState 的完整示例
