# 流式解码

`stream` 模块回答一个问题：**把 OpenAI 兼容 / Anthropic 的 SSE 字节流，解成一套统一的事件。**

0.1.4 起可用，在默认的 `chat` feature 里，没有新增依赖，移动端也能编。

## 为什么放进库里

每个做对话的应用都要写一套 SSE 解析，而各家网关的怪癖随服务商变化：

- 换行用 `\r\n`，或者中途插 `: keep-alive` 心跳行
- 工具调用缺 `index`，或者 id、名字晚到
- 只以 `[DONE]` 收尾、不给结束原因
- 流断在半路，却没有任何报错
- 流里夹着 `{"error":…}`
- 返回 2xx，内容却是网页

同一份知识复制 N 份，必然漏改。所以把「字节 → 事件」这一层收进来，让所有应用共用一份修过的实现。

## 🔴 只吃字节、吐事件

本模块**不发 HTTP、不持有连接、不绑任何异步运行时**。这是它没有变成又一个 LLM SDK 的原因。

| 在库里 | 留在你的应用里 |
|---|---|
| SSE 帧解析、各家网关怪癖 | 请求体构造 |
| 两种协议统一成同一套事件 | HTTP 客户端、代理、超时 |
| 断流 / 取消 / 流内错误的收尾判定 | 取消信号怎么接线 |
| 工具调用按块号拼装成完整 `content` | 推给前端、执行工具、存历史 |
| `is_stream_options_rejected` 判定函数 | 「某地址不带 `stream_options`」的记忆状态 |

## 接入

```rust
use ai_profile::stream::{StreamDecoder, StreamEvent};
use ai_profile::Protocol;

let mut dec = StreamDecoder::new(Protocol::OpenAiCompatible).with_stream_id("chat-42");

// 用你自己的 HTTP 客户端读响应，读到一段就喂一段，切在哪里都行
while let Some(chunk) = body_stream.next().await {
    for ev in dec.push(&chunk?) {
        match ev {
            StreamEvent::TextDelta { text, .. } => ui.append(&text),
            StreamEvent::ToolUseStart { name, .. } => ui.show_tool(&name),
            _ => {} // 事件枚举会新增成员，别漏了这个兜底
        }
    }
}

// 读到 EOF：补发最后的事件，拿到收尾结果
let (tail, outcome) = dec.finish();
```

用户点了「停止」时，不调 `finish`，改调 `abort`：

```rust
let outcome = dec.abort(); // 返回已收到的文字，工具调用一律丢
```

## 事件

| 事件 | 含义 |
|---|---|
| `TextDelta` | 正文增量，带块号 |
| `ReasoningDelta` | 思考增量，不占块号、不进最终内容 |
| `ToolUseStart` | 一个工具调用开始（id、工具名） |
| `ToolUseDelta` | 工具参数的 JSON 片段，拼起来才是完整参数 |
| `Usage` | 用量变化（累计值，不是增量） |
| `Finish` | 流正常结束时的最后一个事件，带归一化的结束原因 |
| `Error` | 流内错误，终态，之后的输入被忽略 |

序列化为 JSON 时，事件用 `kind` 区分，字段名是 camelCase，可以直接推给前端。

### 块号

| 协议 | 文字 | 第 k 个工具调用 |
|---|---|---|
| OpenAI 兼容 | 固定是块 0 | 块 k+1 |
| Anthropic | 协议自带的 `index` | 协议自带的 `index` |

两种协议因此对齐成同一套编号，前端不用区分。

### 工具调用何时开始

`ToolUseStart` **等到工具名已知**（并且 id 已到或参数已经开始）才发，所以前端一收到就能显示「正在调用 xxx」。
始终没等到的，在 `finish()` 时补发。

网关没给 id 的，库会补一个 `call_<流id>_<块号>`，补出来之后不再改变。
想让补出来的 id 在应用重启后也不重复，传应用自己的流 id（`with_stream_id`）。

## 收尾

`finish()` 返回的 `StreamOutcome` 里，`end` 说明流是怎么结束的：

| 情形 | `end` | 内容 |
|---|---|---|
| 有 `finish_reason` / `stop_reason` / `message_stop` | `Complete` | 全部块 |
| 只有 `[DONE]`，没有结束原因 | `Complete` | 有工具调用记为 `tool_use`，否则 `end_turn` |
| 既无结束原因也无 `[DONE]` | `Truncated` | 🔴 只留文字，丢全部工具调用 |
| 调用了 `abort` | `Cancelled` | 同上 |
| 流内 `{"error":…}` / Anthropic `error` 事件 | `Failed` | 只留文字，之后的输入忽略 |
| 2xx，但整段没有一行 SSE | `NotEventStream` | 带原始响应体（最多 1 MiB） |

::: danger 断流时不要执行工具
`Truncated` / `Cancelled` / `Failed` 时，此前已经发出的 `ToolUseStart` 对应的工具调用是不完整的。
按 `end` 判断，收回即可，**不要执行**。
:::

结果里的其它字段：

| 字段 | 内容 |
|---|---|
| `stop_reason` | 归一化的结束原因，只有 `Complete` 才有。OpenAI 的 `stop` / `tool_calls` / `length` 对应 `end_turn` / `tool_use` / `max_tokens` |
| `content` | Anthropic 风格的 content block 数组，与[历史裁剪](/api/history)用的消息是同一种形状，可以直接存进历史 |
| `usage` | 取流里最后一次给出的值，覆盖不累加 |
| `reasoning` | 累积的思考文字 |
| `model` | 流里上报的模型名 |
| `skipped_frames` | 解析失败被跳过的帧数，排查网关问题用 |

判断要不要跑工具，以 `content` 里有没有 `tool_use` 块为准。
个别网关带着工具调用却给 `finish_reason: "stop"`，`stop_reason` 照实透传，不替它改写。

## 已经吸收的网关怪癖

| 类别 | 处理 |
|---|---|
| 换行与格式 | `\r\n`、单独的 `\r`、BOM、`data:` 后没有空格、多行 `data`、事件之间漏空行 |
| 工具调用 | 缺 `index`（按 id 或位置分块）、`index` 全是 0 但 id 不同、id 或名字晚到、`arguments` 是对象而不是字符串 |
| 结束 | `finish_reason` 为空串、末尾只带 usage 的帧、只以 `[DONE]` 收尾 |
| 用量 | 后面的值覆盖前面的，不累加；Anthropic 的缓存读写 token 见[下文](#anthropic-的缓存用量-0-1-5-起) |
| 其它 | 多个 choices 只读第一个、`reasoning_content` / `thinking_delta` 思考内容、Anthropic 缺 `event:` 行时按 `data.type` 分派 |
| 流内错误 | 统一成终态事件 |

### 多字节字符不会丢字

解码按完整一行进行，所以把一个汉字或一个 `\r\n` 切在两个网络包中间也不会乱码，
**无论怎么分包，结果完全一致**（有专门的守卫测试）。

## 思考块与回传（0.1.5 起，可选）

Anthropic 的扩展思考配合工具调用时有一条硬要求：多轮对话里，上一轮 assistant 消息的 **thinking 块要连同 `signature` 原样回传**，
否则下一轮请求会被服务端拒绝。默认情况下 `stream` 不保留它们（`ReasoningDelta` 只用来展示思考过程），
需要回传的应用显式开启：

```rust
let mut dec = StreamDecoder::new(Protocol::Anthropic).with_thinking_blocks(true);
```

开启后，`outcome.content` 按流里的顺序带上两种块，形状和 Anthropic 的请求格式一致，可以直接存进历史、下一轮原样发回去：

| 块 | 形状 |
|---|---|
| 思考块 | `{"type":"thinking","thinking":"…","signature":"…"}` |
| 被遮蔽的思考块 | `{"type":"redacted_thinking","data":"…"}` |

| 规则 | 说明 |
|---|---|
| 默认关闭 | 关闭时输出与 0.1.4 完全一致，已有应用不受影响 |
| 只影响 `content` | 事件序列完全不变，`ReasoningDelta` 照发 |
| 块的顺序 | 沿用 Anthropic 自带的 `index`，`content` 按 `index` 升序排好 |
| 🔴 只有 `Complete` 才带思考块 | 断流 / 取消 / 流内错误时 `content` 只留文字：签名不全，发回去服务端必拒 |
| 没有签名的思考块不进 `content` | 个别 Anthropic 兼容网关不转发 `signature_delta`，这种块发不回官方端点；思考文字仍在 `outcome.reasoning` |
| OpenAI 兼容协议 | 开关不起作用：`reasoning_content` 没有签名，也没有回传要求 |

## Anthropic 的缓存用量（0.1.5 起）

`outcome.usage` 多了两个字段，来自 Anthropic 的 `message_start` 与 `message_delta`（累计值，覆盖不累加，0 不覆盖非零）：

| 字段 | 序列化名 |
|---|---|
| `cache_creation_input_tokens` | `cacheCreationInputTokens` |
| `cache_read_input_tokens` | `cacheReadInputTokens` |

这两项**默认就读**（不改 `content`），且只在 `outcome.usage` 里，不进 `Usage` 事件；没有缓存时序列化省略，和 0.1.4 的 JSON 逐字节一致。
OpenAI 兼容协议的缓存字段（如 `cached_tokens`）暂未覆盖，恒为 0。

## 不做的事

| 不做 | 原因 |
|---|---|
| Ollama 原生 NDJSON | 不是 SSE，留给应用 |
| 剥 `<think>` 标签、「正文为空就把思考提升为正文」 | 产品取舍 |
| OpenAI 兼容协议的缓存用量字段 | 暂未覆盖，`cache_*` 恒为 0 |

## 辅助函数

| 函数 | 用途 |
|---|---|
| `is_stream_options_rejected(status, body)` | 服务端回 400 / 422 且提到 `stream_options` 或 `include_usage` 时为真。去掉该参数重试一次，并记住这个地址不支持 |
| `looks_like_html(body)` | 响应体像不像一个网页，用来区分「地址填成了网站首页」 |
| `StopReason::from_openai(s)` | OpenAI 兼容的 `finish_reason` 归一化 |

## 其他语言

规范里有对应的 `stream.json`，含分包、断流、取消、流内错误等用例，见[其他语言实现](/reference/spec)。

## 相关

- [历史裁剪与超长重试](/api/history) —— 解码出的 `content` 就是历史消息的形状
- [连通性验证](/api/verify) —— 发对话请求之前，先把地址和模型算对
