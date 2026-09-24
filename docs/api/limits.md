# 限额：上下文窗口与输出上限

`limits` 模块只回答一个问题：**发这次请求之前，该按多大的窗口裁历史、`max_tokens` 最多给多少？**

它刻意**不是**一张全量模型能力表。那类数据周级变动，同一个模型在不同中转站的实际限额也不一样 ——
真要全量表，去拉 models.dev 这类专门的项目。

## TokenLimits

```rust
pub struct TokenLimits {
    pub context_window: Option<u32>,   // 上下文窗口（输入 + 输出总量），用来裁历史
    pub max_output: Option<u32>,       // 单次输出上限，用来给 max_tokens 封顶
    pub source: LimitSource,           // 这两个数字是谁给的
}
```

两个数字都是 `Option`：**拿不到就是拿不到，不填一个猜的数字**。

## 四层来源

| 优先级 | 来源 | 构造 | 可信度 |
|---|---|---|---|
| 0 | 用户手填 | `TokenLimits::from_user` | 用户说了算 —— 中转站另有限制时唯一的出口 |
| 1 | 端点上报 | `TokenLimits::from_endpoint` | 最准：中转站报的就是它自己的真实限额 |
| 2 | 预置静态值 | `ModelOption::preset_limits` / `preset::model_limits` | 保守兜底，可能过时，应允许用户改 |
| 3 | 都没有 | `None` | 让用户填，别猜 |

🔴 **来源必须能被界面分辨**。调研过的真实故障几乎都是「把猜的数字当成真的」——
共同点不是数字错了，而是**错了也看不出来**。所以 `source` 是必填字段，
界面可以据此显示「端点上报 128K」还是「预估 128K，可修改」。

### 为什么多数端点不报

OpenAI 的 `/v1/models` 规范里**就没有**上下文字段。实测：

| 端点 | `/models` 带不带限额 |
|---|---|
| OpenRouter | ✅ 全覆盖，还有「当前服务商实际提供」的那一份 |
| DeepSeek | ✅ `context_window` + `max_output_tokens` |
| LM Studio / Ollama 的兼容层 | ❌ 只有 `{id, object, owned_by}` |

所以预置静态值不是可选项 —— 不做的话，多数端点上这个能力等于不存在。

## 逐字段合并

```rust
use ai_profile::TokenLimits;

let user = TokenLimits::from_user(Some(64_000), None);              // 用户只知道窗口
let preset = TokenLimits::from_preset(Some(128_000), Some(8192));

let l = user.or(preset);
assert_eq!(l.context_window, Some(64_000));   // 用户的
assert_eq!(l.max_output, Some(8192));         // 预置补的
```

`or` 是**逐字段**回退：用户常常只知道窗口大小（文档写了），不知道输出上限。
整条替换的话，填了窗口反而丢了预置里的输出上限。`source` 取优先级最高、真正起作用的那一层。

典型的三层叠法：

```rust
use ai_profile::{preset, Protocol};

let preset_l = preset::model_limits(Protocol::OpenAiCompatible, Some(&base_url), &model);
let effective = [user_l, endpoint_l, preset_l]
    .into_iter()
    .flatten()
    .reduce(|hi, lo| hi.or(lo));
```

## 端点上报从哪来

「获取模型」（[连通性验证](/api/verify)）已经发了 `/models` 请求，限额顺带解析出来，不多花一分钱：

| `VerifyOk` 字段 | 内容 |
|---|---|
| `limits` | **当前填的那个模型**的限额；端点不报时为 `None` |
| `model_limits` | 端点上报了限额的全部模型 `(id, 限额)` —— 切换模型时不必再打一次端点 |

各家字段名不统一，`parse_model_limits` 按固定顺序依次尝试（`context_length`、`context_window`、
`max_input_tokens`……），OpenRouter 优先取「当前服务商实际提供」的那一份。

## 用起来

### 裁历史的预算

```rust
let budget = l.input_budget(max_tokens);   // 窗口 − 本次要用的 max_tokens；窗口未知返回 None
```

`reserve_output` 传**本次请求实际要用的** `max_tokens`，不是模型的输出上限 —— 用上限会把预算压得过小。
直接喂给历史裁剪用 `history::history_budget`，它会再扣掉系统提示与工具定义的余量，见[历史裁剪与超长重试](/api/history)。

### 给 max_tokens 封顶

```rust
let cap = l.max_output.map_or(requested, |m| requested.min(m));
```

已知上限只用来**收窄**，别把请求放大到模型标称的最大值 —— 聚合站可能按上限预扣额度，超长生成也更容易超时。

### 持久化

`LimitSource::as_str` / `parse` 与序列化格式同一套拼写（`user` / `endpoint` / `preset`）。
🔴 **预置来源不要落库** —— 它随本库版本更新，存下来就冻结在旧值上了；每次现查即可。

## 相关章节

- [连通性验证](/api/verify) —— 端点上报限额的来源
- [历史裁剪与超长重试](/api/history) —— 预算的消费方
- [预置与服务商目录](/api/preset) —— 预置里的静态限额
