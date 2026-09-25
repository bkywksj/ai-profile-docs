# 历史裁剪与超长重试

`history` 模块回答一个问题：**对话越聊越长时，怎么不让请求超出模型的上下文窗口。**

不依赖 `client` feature，纯函数，移动端也能用。

## 为什么需要

前端驱动工具循环的应用（每轮把全部历史交给后端）会一直往历史里追加：
assistant 的工具调用、工具返回的结果。工具结果往往很大 —— 一次 SSH 命令输出、一段审计日志、
一个文件的内容。聊到一定长度，请求必然超出窗口，用户收到一个看不懂的 HTTP 400。

## 两道防线

| 场景 | 做法 |
|---|---|
| 窗口已知 | 发送前主动裁：`history_budget` → `trim_history` |
| 窗口未知 | **不猜**，照常发；服务端报超长（`is_context_overflow`）后按 `retry_budget` 裁一半重试 |

第二道是为自定义中转准备的：它们多数不在 `/models` 里报限额，只靠第一道的话
这类配置永远不裁，直到每一轮都 400。被动重试不需要知道窗口大小 —— 服务端的报错就是事实。

## 接入：实现 HistoryMessage

消息类型各应用自己定义，只要实现两个方法：

```rust
use ai_profile::history::HistoryMessage;
use serde_json::Value;

impl HistoryMessage for ChatMessage {
    fn role(&self) -> &str { &self.role }
    fn content(&self) -> &Value { &self.content }
}
```

内容按 Anthropic 风格理解：纯文本是字符串，否则是 content block 数组
（`text` / `tool_use` / `tool_result`）。

## 主动裁剪

```rust
use ai_profile::history::{history_budget, trim_history};

// limits 来自 TokenLimits 分层合并（见「连通性验证」一页的限额一节）
let budget = history_budget(limits.as_ref(), max_tokens);   // 窗口 − max_tokens − 8192 余量
let out = trim_history(messages, budget);                    // budget 为 None 时原样返回

// out.messages 可直接发出；out.dropped 要显示给用户
```

裁剪规则：

1. 从最新往回累加，超预算就停 —— 最近的上下文最有价值
2. **不切断 tool_use / tool_result 配对**：要么一起留，要么一起丢
3. 第一条 user 消息（任务描述）预留位置补回 —— 但只在它不超过预算一半时

::: warning 为什么首条消息有条件
用户第一条就贴了一大段日志时，无条件补回会让结果永远超预算：主动裁剪降不下来，
被动重试又因「没有可裁的」而停下，会话从此每一轮都 400。
:::

::: danger dropped 必须显示给用户
「模型不记得前面说过的话」如果没有任何提示，用户只会觉得它变笨了，而且查不出原因。
:::

## 被动重试

```rust
use ai_profile::history::{is_context_overflow, retry_budget, trim_history};

// 在拿到非 2xx 响应的地方识别，用一个专门的错误类型把信号带出去
if is_context_overflow(status, &body) {
    return Err(MyError::ContextOverflow(msg));
}

// 外层循环：最多 3 次，裁无可裁就停
for attempt in 0..3 {
    match send(&req).await {
        Err(MyError::ContextOverflow(_)) => {
            let budget = retry_budget(&req.messages);        // 当前估算的一半
            let out = trim_history(std::mem::take(&mut req.messages), Some(budget));
            if out.dropped == 0 { break; }   // 再试只会重复同一个失败
            req.messages = out.messages;
        }
        other => return other,
    }
}
```

重试要发生在**向前端推送任何流式事件之前** —— 超长报错在 HTTP 状态检查阶段就会返回，
只要在那里识别，前端就不会看到两段流。

## 超长识别：宁可漏判，不可误判

误判会把用户的历史无谓地裁掉一半，所以只认明确的超长报错：

| 覆盖 | 说明 |
|---|---|
| OpenAI / DeepSeek / vLLM | `context_length_exceeded`、`maximum context length` |
| Anthropic | `prompt is too long` |
| Gemini（OpenAI 兼容层） | `exceeds the maximum number of tokens` |
| OpenRouter | `maximum context length` |
| Kimi | `exceeded model token limit` |
| 通义 | `input length` |
| 智谱 | `超长`（中文片段原文比较） |
| `413` | 请求体过大，裁历史同样有效 |

完整片段表是公开常量 `history::CONTEXT_OVERFLOW_PATTERNS`，也随多语言规范发布在 `history.json` 的 `rules` 里。
只检查 `400` 与 `422` 两个状态码（外加一律算超长的 `413`）。

明确**排除**：

- `429` 限流 —— 报错里常出现「tokens per min」，与窗口无关
- 「max_tokens 太大」—— 那是**输出**上限，裁历史解决不了

## 估算而非精确计数

token 数按字符估算并刻意偏保守（约 2 字符 / token）。精确计数要引入各家的 tokenizer，
是几 MB 的体积代价，而这里只需要回答「要不要裁」—— 裁多了只是少几轮上下文，裁少了是整个请求失败。

## 相关

- [连通性验证](/api/verify) —— 限额从哪来（用户 > 端点上报 > 预置 > 未知）
