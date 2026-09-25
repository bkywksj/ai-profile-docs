# 错误码对照

`VerifyError` 的每个变体都对应**一个具体的界面动作**。这是结构化错误的全部意义 ——
`Err(String)` 只能让你显示一行红字，用户读完仍然不知道下一步该做什么。

## 速查表

| `code` | Rust 变体 | 触发 | 界面应当给的动作 |
|---|---|---|---|
| `auth_failed` | `AuthFailed { detail }` | 401 / 403 | 把错误挂到**密钥输入框**上；若该预置有 `apply_url`，给「去申请密钥」 |
| `not_found` | `NotFound { requested_url, suggested_url }` | 404 | `suggested_url` 非空 → **「一键改用」按钮**；为空 → 显示实际请求的地址 |
| `unreachable` | `Unreachable { proxy_hint }` | 超时 / DNS / TLS | **「重试」**；`proxy_hint` 为真时提示去配代理 |
| `model_not_found` | `ModelNotFound { available }` | 端点不认这个模型 | 把 `available` **展开成下拉**让用户改选 |
| `protocol_mismatch` | `ProtocolMismatch { expect }` | 密钥只接受另一种协议 | 提示切到对应的服务商模板 |
| `missing_extra_field` | `MissingExtraField { key }` | 专有字段没填 | **定位到那个输入框**并标红 |
| `malformed` | `Malformed { detail }` | 端点返回了预期外内容 | 兜底：显示摘要 |

## 唯一「改配置没用」的那个

```rust
if e.is_actionable() {
    // 改配置能解决 —— 光标定位到对应输入框
} else {
    // 只有 Unreachable 属于这类 —— 给「重试」
}
```

网络不通时让用户去改配置是误导 —— 他会开始怀疑地址、怀疑密钥，
而实际上什么都没错。这个区分值得单独一个方法。

## 逐个说明

### auth_failed

```json
{ "code": "auth_failed", "detail": "Invalid API key provided" }
```

`detail` 是端点返回的原始说明摘要（截断 300 字符）。**不含密钥** ——
可以安全地写进日志。

界面上把它挂到密钥输入框，而不是弹一个全局提示 —— 用户需要知道是**哪个字段**有问题。

::: tip probe 里 401 反而是成功信号
本库的 `cargo xtask probe` 不带密钥去探各家端点，此时
**401/403 恰恰说明地址是对的**，404 才是真问题。这个思路在你写健康检查时也用得上。
:::

### not_found

```json
{
  "code": "not_found",
  "requested_url": "https://api.deepseek.com/models",
  "suggested_url": "https://api.deepseek.com/v1"
}
```

`requested_url` **直接展示给用户** —— 省去他猜"到底打了哪个地址"。
这是排查地址问题时最有用的一条信息，而多数客户端不给。

`suggested_url` 非空时给「一键改用」按钮。它只在**确实看不到版本段**时才有值：

| base_url | suggested_url |
|---|---|
| `https://api.deepseek.com` | `https://api.deepseek.com/v1` |
| `https://api.deepseek.com/v1` | `null`（已有版本段） |
| `https://open.bigmodel.cn/api/paas/v4` | `null`（智谱是 v4） |
| `https://generativelanguage.googleapis.com/v1beta/openai` | `null` |

已经有版本段却 404，说明是别的问题 —— 这时候给建议会把用户引向另一个错误答案。

### unreachable

```json
{ "code": "unreachable", "proxy_hint": true }
```

`proxy_hint` 为真表示这个 host 在国内通常需要代理
（`api.openai.com`、`api.anthropic.com`、`generativelanguage.googleapis.com`、
`openrouter.ai`、`api.groq.com`、`api.x.ai`）。

此时提示「国内访问该站点通常需要代理」比单说「连接失败」有用得多 ——
后者会让用户去反复检查自己的密钥。

### model_not_found

```json
{ "code": "model_not_found", "available": ["deepseek-flash", "deepseek-v4-pro"] }
```

`available` 是端点返回的**真实清单**。正确做法是直接填进模型下拉：

```typescript
case "model_not_found":
  setModelOptions(err.available);
  message.warning("端点不认识该模型，已为你载入可用清单");
```

让用户自己去翻文档找模型名是最差的处理 —— 清单明明就在手上。

### protocol_mismatch

```json
{ "code": "protocol_mismatch", "expect": "anthropic" }
```

典型场景：中转站的密钥限定 `/v1/messages`，而用户选了 OpenAI 兼容的模板。
提示他切到「Claude Code 客户端」那一档即可。

### missing_extra_field

```json
{ "code": "missing_extra_field", "key": "appid" }
```

::: tip 这个错误最好永远不要出现
用 `check_required_fields` 在**发起验证之前**就判出来，直接把按钮置灰。

禁用态优于「点了才报错」—— 用户不会浪费一次往返，也不会怀疑是网络问题。
这个变体是第二道闸门（前端可能被绕过，也可能有别的调用方）。
:::

### malformed

兜底变体。端点返回了非 JSON、或结构完全对不上。

`detail` 只取响应体里**端点自己写给人看的那句话**：依次尝试 `error.message`、`error`（本身是字符串时）、
顶层 `message`，去两端空白后截断到 300 个字符；都没有时为 `HTTP <状态码>`。
**响应体的其余内容不进 `detail`** —— 不把整段原文（可能夹带请求回显等内容）带进界面和日志。
`auth_failed` 的 `detail` 取法相同。

## 前端分支的注意事项

```typescript
switch (err.code) {
  // …各分支
  default:
    // 🔴 必须有
    message.error("验证失败，请检查配置");
}
```

::: danger default 分支不能省
`VerifyError` 带 `#[non_exhaustive]` —— 本库新增错误变体只算 **minor** 版本。
没有 `default` 的话，新变体会让界面什么都不显示。

「点了没反应」是最难排查的一类故障，用户也最容易认为是软件坏了。
:::

同理，Rust 侧的 `match` 也必须有 `_` 分支。

## 与 ParseError 的分工

| | 回答的问题 | 阶段 |
|---|---|---|
| `ParseError` | 这段文本**是不是**一条配置 | 粘贴导入时 |
| `VerifyError` | 这条配置**对不对** | 点测试连接时 |

界面表现应当不同：前者是"你粘错东西了"，后者是"配置本身有问题"。
详见 [ai.profile 协议](/api/protocol#错误)。

## 相关

- [连通性验证](/api/verify) —— 产生这些错误的 API
- [前端对接](/guide/frontend) —— 完整的分支处理示例
