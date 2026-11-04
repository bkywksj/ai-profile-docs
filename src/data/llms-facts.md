# ai-profile

> AI 模型服务配置层（MIT 开源 Rust crate，crates.io: ai-profile）。一份预置、一个协议、一套验证 —— 多个桌面应用共用。模型 id 变了只改一处，各应用升级依赖即可拿到。

## 它管什么

- 服务商预置：31 家服务商、42 条预置（对话 25、生图 5、视频 8、配音 4），每条带 base_url、默认模型与候选清单、协议、专有字段、申请密钥页；数据随 crate 版本发布，同一份也以 JSON 发在 /spec/presets.json
- ai.profile：跨应用的配置交换格式（粘贴导入 parse_profiles、分享 to_profile），宽进严出
- 端点拼接：OpenAI 兼容地址原样使用、不替用户补 /v1（智谱是 /v4、Gemini 是 /v1beta/openai）；Anthropic 协议用 endpoint::join_chat_endpoint(base, "messages")
- 零成本验证：Verifier 只打 /models，不花生成费用，失败返回结构化的 VerifyError（每个变体对应一个界面动作）
- 对话辅助：TokenLimits（用户手填 > 端点上报 > 预置，逐字段叠加）、历史裁剪与上下文超长重试、流式解码 StreamDecoder（OpenAI 兼容 / Anthropic SSE → 统一事件，sans-IO）、关思考参数 thinking_off_params
- 多模态调用：生图、视频、配音（media 模块，要开 client 与对应 feature）

它不是对话 SDK：不替应用发起对话请求、不存密钥、不做任务编排。

## 用法要点

- 依赖：`ai-profile = { version = "0.1", features = [...] }`。默认 feature 只有 chat（纯数据 + 纯函数、零重依赖，能编到 Android / iOS）；验证加 client；生图 / 视频 / 配音再加 image / video / tts。最低 Rust 1.88
- 公开枚举（VerifyError、ParseError、Kind、Protocol 等）都是 #[non_exhaustive]，match 要带 `_` 分支
- ServiceConfig 只能用 builder 构造：ServiceConfig::new(protocol, base_url).with_api_key(..).with_model(..)
- Verifier 建一次、存进全局状态反复用；要代理用 Verifier::from_builder(ai_profile::reqwest::Client::builder().proxy(..))
- 应用私有的服务商用 PresetCatalog 叠在本库预置上，不要把预置整份抄进应用

## 非 Rust 实现

预置数据读 https://ai-profile.ruoyi.plus/spec/v<版本>/presets.json，规则按同目录 conformance/*.json 的用例实现并全部跑通；不许改用例迁就实现。版本清单见 /spec/versions.json。

## 谁在用

同一作者的 7 个桌面应用：Sigil、Reeve、本地知识库、一站通、StoryLoom、Prism、AI 标书工作站（全部引用 0.1.7）。

## 出品方

湛江市麻章区湖光镇若依科技工作室，MIT License。源码与 issue：https://github.com/bkywksj/ai-profile ；API 参考：https://docs.rs/ai-profile 。

最后更新：2026-11-04（crate 0.1.7）
