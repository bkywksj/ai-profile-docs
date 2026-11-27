---
title: "采样参数约束"
description: "采样参数约束：fixed_sampling 查出锁死 temperature / top_p 的模型及其唯一接受的值，is_sampling_rejected 判定被拒后去掉采样参数重发一次。"
lastUpdated: 2026-11-27
---
# 采样参数约束

`sampling` 模块回答一个问题：**这个模型接不接受我发的 temperature。**

不依赖 `client` feature，纯函数，移动端也能用。0.1.9 起可用。

## 为什么需要

有的模型把采样参数锁死了，传别的值直接 HTTP 400。实例（2026-11-27 用户反馈）：
选 Kimi 的 `kimi-k3`，应用发 `temperature: 0`，Moonshot 回

```text
invalid temperature: only 1 is allowed for this model
```

用户换什么设置都 400，而报错里看不出是应用的问题。同一家的老模型不限、新模型锁死，
这类约束随模型变化，正是该放进公共库、而不是每个应用各写一份的知识。

## 两道防线

| 场景 | 做法 |
|---|---|
| 模型在表里 | 发送前按 `fixed_sampling` 换成它唯一接受的值（只发 temperature 的用 `temperature_for`） |
| 表里没有 | 照常发；被拒（`is_sampling_rejected`）后**去掉全部采样参数重发一次** |

第二道不能省：表只收真实请求核对过的模型，新模型上线总会先于本表更新。
去掉采样参数 = 用服务端默认值，对所有模型都合法。

## 已登记的模型

| 模型 id 前缀 | temperature | top_p | presence_penalty | frequency_penalty |
|---|---|---|---|---|
| `kimi-k3`（含 `kimi-k3.1-pro` 等） | 1 | 0.95 | 0 | 0 |
| `kimi-k2.5` | 1 | 0.95 | 0 | 0 |
| `kimi-k2.6` | 1 | 0.95 | 0 | 0 |

匹配规则：取模型 id 最后一个 `/` 之后的部分、ASCII 小写，按前缀匹配。
所以聚合站的写法也能命中（OpenRouter `moonshotai/kimi-k3`、硅基 `Pro/moonshotai/Kimi-K2.5`）。

只在 OpenAI 兼容的 `/chat/completions` 上生效：Moonshot 的 Anthropic 兼容地址带 `temperature: 0` 照样 200。

## 用法

只发 temperature 的应用（最常见）：

```rust
use ai_profile::sampling;

let temperature = sampling::temperature_for(&model, Some(0.7));
// kimi-k3 → Some(1.0)；其他模型 → Some(0.7)；调用方传 None 仍是 None
```

还发 `top_p` 等的，逐项处理：

```rust
if let Some(fixed) = sampling::fixed_sampling(&model) {
    if let Some(t) = fixed.temperature { body["temperature"] = t.into(); }
    if let Some(p) = fixed.top_p { body["top_p"] = p.into(); }
}
```

被拒后重发：

```rust
let resp = send(&body).await?;
if !resp.status().is_success() {
    let status = resp.status().as_u16();
    let text = resp.text().await?;
    if sampling::is_sampling_rejected(status, &text) {
        for k in sampling::SAMPLING_PARAMS {
            body.as_object_mut().unwrap().remove(*k);
        }
        // 只重发一次：去掉后仍被拒，说明不是采样参数的问题，照常报错
        return send(&body).await;
    }
}
```

`is_sampling_rejected` 的规则：状态码 400 或 422、响应体提到 `temperature` / `top_p` /
`presence_penalty` / `frequency_penalty`、且不是上下文超长（超长要裁历史，见[历史裁剪](/api/history)）。
也覆盖 OpenAI 推理模型的 `Unsupported value: 'temperature' does not support 0.2 with this model`。

## ⚠️ 用 f64，别在请求体里放 f32

`0.95_f32` 转成 JSON 数字时先变成 `f64`，写出来是 `0.949999988079071`，服务端按「只接受 0.95」精确比较，照样 400。
本模块的值一律 `f64`。应用的温度字段若是 `f32`：`1.0` / `0.0` 这类能精确表示的值没事，`0.95` 这类要先转 `f64` 再写进请求体。

## 多语言规范

用例在 [`spec/conformance/sampling.json`](/spec/conformance/sampling.json)，`rules` 里给出前缀表与参数名。
