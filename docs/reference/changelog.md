# 更新日志

面向使用者的版本说明：每个版本带来了什么、升级时要不要改代码。
开发过程的完整记录见仓库里的 [CHANGELOG.md](https://github.com/bkywksj/ai-profile/blob/master/CHANGELOG.md)。

## 0.1.7 · 2026-10-08

**升级只需 `cargo update -p ai-profile`，不用改代码；不调用新接口的下游行为完全不变。** 新增「关掉思考」的服务商参数表，来自 sigil 的网页翻译：
用户的 deepseek-flash 默认带思考，一批网页段落光思考就用掉 4000 多 token，译文一个字都没回来。

### 新增

- **按服务商登记「关掉思考」的参数**：翻译、摘要这类不需要推理的任务，用 `preset::thinking_off_params(protocol, base_url)`
  取到要并进请求体顶层的字段（已有的同名键不覆盖），返回 `None` 就什么都不发。只登记官方文档写明了的（2026-10-08 逐家核对）：

  | 预置 | 字段 |
  |---|---|
  | `deepseek`、`zhipu`、`volcengine_ark`、`anthropic_official`、`claude_code` | `{"thinking":{"type":"disabled"}}` |
  | `qwen`（百炼 OpenAI 兼容模式）、`siliconflow` | `{"enable_thinking":false}` |

  其余预置都是 `None`：OpenAI 官方遇到不认识的参数直接 400，查不到的不猜。详见[关掉思考](/api/preset#关掉思考-0-1-7-起)
- 已经拿到预置时用 `ProviderPreset::thinking_off_params()`；应用自建的预置用 `with_thinking_off(..)` 登记，
  常用的两种写法有常量 `THINKING_TYPE_DISABLED` / `ENABLE_THINKING_FALSE`
- 预置序列化后多一个 `thinkingOff` 字段（解析好的对象或 `null`），[前端类型](/guide/frontend#typescript-类型)已同步
- [多语言规范](/reference/spec)：`presets.json` 每条预置多一个 `thinkingOff`；`preset_lookup.json` 新增 11 条 `thinking_off_params` 用例（共 347 条）。**已有用例一条未改**

### 说明

- 🔴 **这是尽力而为**：同一家里也有关不掉思考的模型（智谱 GLM-5.3 / 5.3-FLASH「强制思考」、百炼 `qwq-plus` 等只能思考的模型），
  请求被拒（4xx）时**去掉这些字段重试一次**，而不是直接报错
- 只用在不需要推理的任务上，正常对话别关
- `with_thinking_off` 写成非 JSON 对象（数组、字符串、`null` 等）时，取参数返回 `None`，序列化这条预置直接报错

## 0.1.6 · 2026-10-02

**升级只需 `cargo update -p ai-profile`，不用改代码；没有任何预置的默认模型变化。**

### 新增

- **Sonnet 5.5 进候选清单**（2026-09-28 发布，接替 Sonnet 5，单价不变）：Anthropic 官方档与 Claude Code 档加 `claude-sonnet-5-5`，
  OpenRouter 档加 `anthropic/claude-sonnet-5.5`（点号写法）。**只加候选，不改默认模型**，也不填静态限额
  （同一个 id 官方端点是 1M、经中转站按 200k，这份清单又被两档共用，填哪个都会对其中一档说错，交给端点上报或用户手填）
- [多语言规范](/reference/spec)里的 `presets.json` 同步多了这几条候选；用例没有变化（仍是 336 条）

## 0.1.5 · 2026-10-01

**升级只需 `cargo update -p ai-profile`，不用改代码；默认行为与 0.1.4 完全一致。** 两项新增都是 `stream` 的，来自 reeve 接入流式的前置要求。

### 新增

- **可选保留 Anthropic 的 thinking 块（含 `signature`）**：`StreamDecoder::with_thinking_blocks(true)`，默认关闭。
  Anthropic 要求带工具调用的多轮对话把上一轮的 thinking 块连同签名原样回传，否则下一轮请求被拒；0.1.4 有意不保留它们。
  开启后 `outcome.content` 按 `index` 顺序带上 `thinking` 与 `redacted_thinking` 块，事件序列不变。
  🔴 只有流完整结束才带思考块，断流 / 取消 / 出错时只留文字（签名不全，发回去服务端必拒）。详见[流式解码](/api/stream#思考块与回传-0-1-5-起-可选)
- **Anthropic 缓存用量**：`outcome.usage` 增加 `cache_creation_input_tokens` / `cache_read_input_tokens`，默认就读，
  只在 `outcome.usage` 里（不进 `Usage` 事件，以免破坏下游的模式匹配），没有缓存时序列化省略
- [多语言规范](/reference/spec)的 `stream.json` 新增 11 条用例（共 336 条）；`decode` 用例的 `input` 增加可选的 `thinkingBlocks`（缺省 = 关闭）。**已有用例一条未改**

### 说明

- OpenAI 兼容协议的缓存字段（`cached_tokens` 等）本次未覆盖，恒为 0

## 0.1.4 · 2026-10-01

**升级只需 `cargo update -p ai-profile`，不用改代码。** 两处新增，都是兼容的。

### 新增

- **[流式解码 `stream`](/api/stream)**：把 OpenAI 兼容 / Anthropic 的 SSE 字节流解成统一事件
  （文字、思考、工具调用、用量、结束原因、流内错误）。
  各应用原来都在各写一套，网关怪癖覆盖参差不齐，现在收成一份：
  - **只吃字节、吐事件**：不发 HTTP、不绑异步运行时、没有新依赖，移动端也能编。请求、取消、工具循环仍留在应用
  - 吸收了常见网关的怪癖：`\r\n`、心跳行、工具调用缺 `index`、id 或名字晚到、只以 `[DONE]` 收尾、末尾只带用量的帧、流内报错等
  - 断流、取消、流内错误有明确的收尾状态，且只保留文字、丢弃不完整的工具调用，避免把半截参数当成完整调用去执行
  - 一个汉字被切在两个网络包中间也不会乱码：无论怎么分包，结果完全一致
  - 已经自己写了 SSE 解析的应用不用急着换，下次改到对话功能时再迁即可
- **`preset::infer_preset_key_for(kind, protocol, base_url)`**：按能力类别，从已存的配置反推出是哪个预置。
  对话类的结果与 `infer_preset_key` 完全一致；生图 / 视频 / 配音只在该能力的预置里按域名认，
  认不出的落到该能力的自定义端点档（`custom_image` / `custom_video` / `custom_tts`）。
  通义、硅基流动、火山方舟的同一个域名横跨多种能力，所以必须先按能力过滤，不能只看域名
- [多语言规范](/reference/spec)新增 `stream.json`，`preset_lookup.json` 增加 `infer_preset_key_for` 用例，共 325 条

### 说明

- `ImageGenParams::size` 是**请求值，不保证是出图的实际尺寸**：OpenAI 兼容的生图请求里，这个值只会以硅基流动认的 `image_size` 发出；
  火山方舟 Seedream 和 OpenAI 官方认的是 `size`，对它们不起作用（方舟按模型默认尺寸出图）。要记录图片尺寸，请从返回的图片字节里读

## 0.1.3 · 2026-09-25

**升级只需 `cargo update -p ai-profile`，不用改代码。** 这三处问题来自一个外部实现者（C++）照[规范](/reference/spec)实现时的反馈。

### 修复

- **「Anthropic 官方」不填地址时，「获取模型」直接报缺 `base_url`**：这一档刻意不写地址（界面据此隐藏地址框），
  验证却只认 `base_url`。新增 `ProviderPreset::endpoint()`：预置没写地址、但该协议的官方端点属于它自己的域名时，
  回落到官方端点；自定义端点类预置不受影响，照旧要求用户填写
- **端点返回 2xx 但内容是网页时，被判为「验证成功、模型清单为空」**：地址指到网站根目录时，
  网站常把未知路径回成首页、状态码 200。现在报 [`not_found`](/reference/errors#not-found)，并附一键改用的建议地址；
  判定逻辑是公开纯函数 `client::diagnose_success`，自己发请求的调用方也能直接用

### 新增

- `TokenLimits` 增加逐字段来源 `context_window_source` / `max_output_source`（JSON 为 `contextWindowSource` /
  `maxOutputSource`）：用户只填了上下文窗口、输出上限由预置补上时，界面可以分别标注来源。原有的整条 `source` 含义不变
- [多语言规范](/reference/spec)新增 `preset_endpoint`、`diagnose_success` 两组用例，共 259 条

## 0.1.2 · 2026-09-25

**升级只需 `cargo update -p ai-profile`，不用改代码。**

### 修复

- **「获取模型」的对话下拉里混进了生图 / 视频 / 配音模型**：`dall-e-3`、火山的 seedream / seedance、
  通义万相文生图、各家图生视频、智谱 cogvideox、MiniMax 海螺、fish-speech，以及 OpenAI 的语音转写模型，
  现在都会被正确滤掉。它们仍在 `dropped_models` 里 —— 按它排生图 / 视频 / 配音下拉的应用，这些模型会排到正确位置
- `suggest_url` 对以 `/v1beta` 结尾的地址会建议出 `…/v1beta/v1` 这种错地址，现在不再给建议
- 误填的端点后缀按路径段识别：`…/v1/mymessages` 此前会被当成误填的 `/messages` 剥掉
- `ai.profile` 顶层必须是 JSON 对象：数组形式此前也能导入，协议里没有这种写法

### 新增

- 公开常量 `NON_CHAT_MARKERS` / `NON_CHAT_PREFIXES`、`CONTEXT_OVERFLOW_PATTERNS`、
  `CONTEXT_WINDOW_FIELDS` / `MAX_OUTPUT_FIELDS`：模型清洗、超长识别、限额解析用到的数据表
- **[其他语言实现](/reference/spec)**：与语言无关的预置数据和 246 条一致性用例，按版本存档。
  非 Rust 项目（Python / TypeScript / Java…）照着它实现，跑通用例即与本库行为一致

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
