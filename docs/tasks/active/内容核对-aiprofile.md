# ai-profile 文档站内容核对清单（按 crate 源码，2026-11-04）

用户 2026-11-04：「到时候你也根据源码核查和完善一下文档」。以 crate 仓库 `E:/my/桌面软件tauri/ai-profile`（0.1.7，Cargo.toml workspace version 与 CHANGELOG.md 最新版一致）为准，
逐页核对新站正文。依据里的路径：`crates/ai-profile/src/...` 简写为 `src/...`。

## 关键事实（多页共用）

| 事实 | 依据 |
|---|---|
| 当前版本 0.1.7（2026-10-08），最低 Rust 1.88，MIT | `Cargo.toml:10、15、16`；`CHANGELOG.md:6` |
| feature：默认 `chat`；`image` / `video`（带 img 解码）/ `tts`；`client` = reqwest + tokio + base64 + log | `crates/ai-profile/Cargo.toml` [features] |
| 公开重导出：`VerifyError`、`Kind` / `Protocol`、`LimitSource` / `TokenLimits`、`preset_by_key` / `presets` / `presets_for` / `vendors` / `ProviderPreset` / `Vendor`、`parse_profile(s)` / `to_profile` / `ParseError` / `ParsedProfile(s)`；client 下 `verify` / `ServiceConfig` / `Verifier` / `VerifyOk` 与 `reqwest` | `src/lib.rs` pub use |
| 31 家服务商、42 条预置（对话 25 + 生图 5 + 视频 8 + 配音 4）、7 条登记关思考、2 条经真实密钥核实 | `public/spec/presets.json`（= crate `spec/presets.json`，逐字节相同） |
| 一致性用例 0.1.7：9 个文件 347 条；历史 0.1.1 127 / 0.1.2 246 / 0.1.3 259 / 0.1.4 325 / 0.1.5、0.1.6 336 | `public/spec/v*/conformance` 实数 |
| 下游 7 家（sigil、knowledge_base、onestop、story_loom、reeve、prism、aibid），全部引用 0.1.7 | `docs/downstream.md:12-19` |
| 验证：总超时 20 秒、连接 10 秒、禁重定向 | `src/client/mod.rs:147、204-207` |
| `TokenLimits` 0.1.3 起带 `context_window_source` / `max_output_source` | `src/limits.rs:104-115` |
| `cargo xtask probe` 探所有非本地、写了地址的预置（当前 32 条） | `xtask/src/main.rs:83-88` |
| 版本日期以 CHANGELOG.md 为准：0.1.6 = 2026-10-01、0.1.4 = 2026-10-01（crates.io 发布日；CHANGELOG 原写 09-30，已一并改正） | `CHANGELOG.md:35、76` |

## 逐页修订

| 页面 | 原说法 | 新说法 | 依据 |
|---|---|---|---|
| api/preset | 「同一分组必须连续」 | 「同一能力内同一分组必须连续」，整体按 对话 → 生图 → 视频 → 配音 排 | `src/preset/mod.rs:19-22、469-490` |
| api/preset | 字段表缺 `default_extra` | 补类型、用途、线格式 `[[key, value], …]`，注明内置预置目前都为空 | `src/preset/mod.rs:218-224`；`spec/presets.json` |
| api/preset | 「base_url 为 None」一节没提 `endpoint()` | 补 `p.endpoint()`（0.1.3 起）：写了地址就用、官方档回落官方端点、自定义档 None | `src/preset/mod.rs:308-326`；CHANGELOG 0.1.3 |
| api/protocol | `InvalidJson` =「不是合法 JSON」 | 补「顶层不是对象（0.1.2 起）、字段类型不对也归这里」 | `src/protocol.rs:307-322、334-339` |
| api/endpoint | 「端点拼接不用 `ends_with_version_segment`」 | OpenAI 兼容一侧不用；`anthropic_base_url` 用它判断要不要补 /v1 | `src/endpoint.rs:70-78` |
| api/endpoint | `而**"藏起来"…**` 渲染出字面 **（旧站同样） | 加粗前补空格 | CommonMark 分界规则 |
| api/history | 只说「实现两个方法」 | 补：trait 要求类型实现 `Clone`；限额改指独立的限额页 | `src/history.rs:68` |
| api/media | 视频示例 `use` 缺 `explain_error` | 补上（下面的轮询代码用到） | `src/media/video.rs:1280` |
| api/verify | `TokenLimits` 结构只有三个字段 | 补 `context_window_source` / `max_output_source` | `src/limits.rs:112-115` |
| api/verify | 纯函数表四个 | 补 `diagnose_success`、`parse_model_limits` | `src/client/mod.rs:395、451` |
| api/verify | `check_required_fields(Some("some_preset"), …)` 会置灰 | 不认识的 key 直接放行；改用真实配音预置 `volc_tts`（要开 tts） | `src/client/mod.rs` check_required_fields；`presets.json` volc_tts 必填 appid |
| api/verify | 「25 家串行最坏 8 分钟」 | 「当前 32 条，串行最坏 10 分钟以上」 | `xtask/src/main.rs:83-88`；超时 20 秒 |
| api/verify | （无） | 新增「一次验证做了什么」四步卡（原型）：查必填 → 拼 /models → GET（20 秒 / 10 秒 / 禁重定向）→ 判结果 | `src/client/mod.rs:147、204-207` |
| api/stream、protocol、guide/ai-assisted、reference/changelog | 链接文字「其他语言实现」 | 「规范与多语言实现」（用户定的） | — |
| guide/introduction | 「不做流式解析」 | 0.1.4 起 `stream` 在库里：改「不构造请求体、不管 HTTP 客户端」，加一段指向流式解码；边界表补一行 ✅ 流式解码，❌ 那行改为「请求体构造、HTTP 客户端与取消接线、工具调用循环、视频轮询编排」 | `src/lib.rs:10-13`；CHANGELOG 0.1.4 |
| guide/introduction | 谁在用 5 家 | 7 家：补 Prism、AI 标书工作站；sigil、知识库、一站通、Prism、AI 标书工作站补「流式解码」，Reeve 补「桌面端含流式解码与 thinking 块回传」 | `docs/downstream.md:12-19` 与 2026-10-02 备注 |
| guide/installation | chat 组合、「不开 client 时得到什么」漏项 | 补限额、历史裁剪、流式解码（都是 chat 下的纯函数） | `src/lib.rs:39-47`；`src/stream.rs:11` |
| guide/frontend | TS `TokenLimits` 缺两个字段 | 补 `contextWindowSource` / `maxOutputSource: LimitSource \| null`；camelCase 一行补 `VerifyOk`、`TokenLimits`、`ParsedProfile` | `src/limits.rs:112-115`；`src/client/mod.rs:108`；`src/protocol.rs:73`；实测序列化输出 |
| guide/ai-assisted | 「五个应用接入时踩过的坑」 | 「七个应用」 | `docs/downstream.md` |
| guide/quick-start | （无） | 按原型补页首链路签、「环境与依赖」、「完整示例」（代码组 + 运行结果示意） | 示例已在临时 cargo 项目编译并运行 |
| guide/quick-start | 输出 `Ollama [本地 / 自建]` | `Ollama（本地） [本地 / 自建]` | `presets.json` vendors |
| guide/quick-start | `ModelNotFound` 当作会发生的分支 | 注明是预留变体，当前版本的 verify 不产生，看 `ok.model_in_list` | `src/error.rs`；reference/errors |
| guide/quick-start | `some_preset` 示例 | 同 api/verify，改 `volc_tts` | 同上 |
| reference/errors | `missing_extra_field` 触发条件 | 补：没填地址、预置也给不出端点时 `key` 为 `"base_url"` | `src/client/mod.rs:359-380` |
| reference/errors | `malformed` =「非 JSON 或结构对不上」 | 401 / 403 / 404 以外的非 2xx（429、500…）与构造客户端失败；2xx 非 JSON 归 `not_found`；2xx JSON 没有 data 数组 = 空清单不算失败 | `src/client/mod.rs:202-213、395-420、473-488` |
| reference/versioning | 版本位表 | 补「0.x 阶段的换算」提示框；发版前检查补 `gen-spec`、`cargo doc -D warnings`、`cargo package` 与「0.1.0 漏掉的三条」 | crate `docs/versioning.md` |
| reference/add-provider | 预置字面量缺 `thinking_off` | 补 `thinking_off: None`（crate 内这么写才编得过） | `src/preset/mod.rs:257-258` |
| reference/add-provider | 测试只写 `cargo test -p ai-profile` | 补 `--all-features`（多模态预置与 `providers_md_in_sync` 要三个 feature 全开） | `src/preset/docgen.rs:145` |
| reference/add-provider | 「25 家并发探测」 | 「当前 32 条（含生图 / 视频 / 配音）」 | `xtask/src/main.rs:83-88` |
| reference/spec | 页名「其他语言实现」 | 「规范与多语言实现」（用户定的） | — |
| reference/spec | 成功结果示例的 `limits` 三个字段 | 补 `contextWindowSource` / `maxOutputSource`（实测序列化输出） | `src/limits.rs:112-115` |
| reference/spec | 下载表、最新版与固定版本两节（手写） | 换成构建期读 `public/spec` 的地址框（可切 7 个版本）与用例文件表（文件、要实现的函数、链路段、用例数） | `public/spec/versions.json`、`v*/conformance` |
| reference/changelog | 0.1.6 · 2026-10-02、0.1.4 · 2026-10-01 | 0.1.6 · 2026-10-01、0.1.4 · 2026-09-30（以 CHANGELOG 为准，用户定的） | `CHANGELOG.md:35、76` |
| reference/providers | 手写分类表（生成物） | 页面改为构建期读 `presets.json`：统计、总表（协议 → 最终端点、关思考、核实日期）、按服务商表；口径补 Codex 分组说明（用户定的）与 CLAUDE.md 入口；crate 生成的 providers.md 文字版保留给 llms-full.txt | `public/spec/presets.json`；`docs/providers.md` |
| 全站 | 26 页共用一条 description（「对话 25 家…」） | 每页各写一句；原句保留在 SoftwareSourceCode.description | known-diffs `metaFrom` |
| 首页 / 产品矩阵 / 页头 / llms-facts | 手写数字 | 31 家 / 42 条 / 25 / 17 / 9 个文件 347 条 / 0.1.7，`pnpm check:facts` 28 项核对 | `scripts/check-facts.mjs` |

## 已核对无误（未改动）

api/catalog、api/limits、guide/cookbook、guide/tauri-integration、guide/migration。

## 示例编译

临时项目 `$TEMP/aibid-wm/aiprofile-astro/examples-check`（依赖本地 path，开 client / image / video / tts；`CARGO_TARGET_DIR` 独立），`cargo run` 编译通过、断言全过（最后一行「全部示例断言通过」）。
纳入：api 的 preset / catalog / protocol / endpoint / limits / history / stream / media，guide 的 installation / tauri-integration（去掉 Tauri 宏）/ migration / quick-start（含页首完整示例、volc_tts 必填检查）、api/verify 的示例。
未纳入（故意的片段或伪代码）：版本兼容的 `if env.v > …`、`join_all` 并发片段、tauri command 本体、`default_extra` 数组元素片段。

## 用户已定（2026-11-04，按建议）

1. 0.1.4 的日期：写 crates.io 发布日 2026-10-01；crate CHANGELOG 原写 09-30，已一并改正（crate 仓库提交）
2. 0.1.0 一节「六个结构化错误」保留：那是 0.1.0 当时的事实（第 7 个 Malformed 后来才加），历史版本说明不回改
3. introduction「谁在用」各家「用到的部分」按 downstream.md 归纳的措辞，用户认可
4. 原型里的「这篇有帮助吗」反馈按钮与文档页右栏的小卡（让 AI 带你接等）没做：右栏用框架的目录（≥1536 宽显示），页底改为「这一页有错漏？在 crate 仓库提 issue」
