# 按场景查找

不知道从哪一页看起？按你**正在做的那件事**找，每行直接给出要用的 API 和详细说明所在页。

## 做「模型服务」设置页

| 你要做的 | 用什么 | 详见 |
|---|---|---|
| 服务商下拉：列出有哪些家 | `vendors(&[Kind::Chat])`（按厂商聚合，同一家多种能力共用一个密钥） | [预置与服务商目录](/api/preset) |
| 选了某家后预填地址、模型、申请密钥链接 | `preset_by_key(key)` → `base_url` / `model` / `models` / `apply_url` | [预置与服务商目录](/api/preset) |
| 只保留本应用调得通的几家、加自己的私有服务商 | `PresetCatalog::new().retain(…).extend(&LOCAL).build()` | [定制服务商目录](/api/catalog) |
| 用户点「获取」：验证地址与密钥，顺带拉模型清单 | `Verifier::verify(ServiceConfig…)` —— 只打 `/models`，不花钱 | [连通性验证](/api/verify) |
| 验证失败时给出「一键修正」而不是一行红字 | 匹配 `VerifyError` 的七个变体，404 带 `suggested_url` | [错误码对照](/reference/errors) |
| 拉回的模型清单里混着向量 / 生图 / 审核模型 | `model_filter::clean_fetched_models`（排除法，滤掉的也带回） | [端点与模型清单](/api/endpoint) |
| 上下文窗口、输出上限框显示多少 | `TokenLimits` 四层取值：用户 > 端点上报 > 预置 > 未知 | [限额](/api/limits) |

## 配置在应用之间互通

| 你要做的 | 用什么 | 详见 |
|---|---|---|
| 「粘贴导入」：用户从别的应用复制了一段配置 | `parse_profiles(text, default_model)`（单条与打包统一返回列表） | [ai.profile 协议](/api/protocol) |
| 「分享 / 导出」：生成一段别的应用能粘的配置 | `to_profile(…)` | [ai.profile 协议](/api/protocol) |
| 用户粘的不是 ai.profile，给出准确提示 | 匹配 `ParseError`（`not_ai_profile` / `missing_data` / `empty_bundle` …） | [ai.profile 协议](/api/protocol) |

## 发对话请求之前

| 你要做的 | 用什么 | 详见 |
|---|---|---|
| 拼出对话端点地址 | `endpoint::join_chat_endpoint(base, "chat/completions" \| "messages")` | [端点与模型清单](/api/endpoint) |
| Anthropic 地址用户只填了主机名 | 不用管 —— Anthropic 协议自动补 `/v1`，填不填都能用 | [端点与模型清单](/api/endpoint#anthropic-协议自动补-v1) |
| 历史太长，按窗口裁掉旧消息 | `history::history_budget` + `history::trim_history` | [历史裁剪与超长重试](/api/history) |
| 服务端报「上下文超长」，自动裁一半重试 | `history::is_context_overflow` + `history::retry_budget` | [历史裁剪与超长重试](/api/history) |
| `max_tokens` 别超过模型上限 | `TokenLimits::max_output` 只用来收窄 | [限额](/api/limits) |

::: tip 对话请求本身不在本库
请求格式、流式解析、鉴权头都是应用自己的 —— 本库只负责在那之前把地址、模型、窗口算对。
:::

## 生图、视频、配音

| 你要做的 | 用什么 | 详见 |
|---|---|---|
| 按配置出一张图（自动识别协议） | `media::image::AnyImageProvider::from_config_with(cfg, &http).generate(…)` | [生图、视频与配音](/api/media) |
| 提交视频任务、轮询结果 | `media::video::AnyVideoProvider::from_config_with(…)` 的 `submit` / `poll` | [生图、视频与配音](/api/media) |
| 这家视频支不支持首尾帧 | `media::video::supports_last_frame(endpoint, extra)` | [生图、视频与配音](/api/media) |
| 合成一段配音 | `media::tts::synthesize_with(…)` | [生图、视频与配音](/api/media) |
| 调用要走用户配的代理 | `media::MediaHttp::from_fn(\|\| builder)` —— 超时仍由本库施加 | [生图、视频与配音](/api/media) |

## 接入与维护

| 你要做的 | 看哪篇 |
|---|---|
| 第一次接入一个 Tauri 应用 | [Tauri 应用接入](/guide/tauri-integration) → [前端对接](/guide/frontend) |
| 应用**已经发布过**，用户手里存着旧配置 | [已发布应用的接入迁移](/guide/migration)（先读这篇再换库） |
| 想加一家服务商 / 一个新模型 | [加一家服务商](/reference/add-provider) —— 改本库，下游只升版本 |
| 升级本库时判断要不要改代码 | [更新日志](/reference/changelog) + [版本策略](/reference/versioning) |
