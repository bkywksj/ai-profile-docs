# 预置与服务商目录

预置（`ProviderPreset`）是一条「某家服务商的某种能力」的配置模板。
服务商目录（`Vendor`）是把同一家的多条预置聚合成一张卡片。

界面上**先选服务商、再选能力**，所以目录是给列表用的，预置是给表单用的。

## 取预置

```rust
use ai_profile::{presets, presets_for, preset_by_key, Kind};

let all = presets();                          // &'static [ProviderPreset]，全部
let chat = presets_for(Kind::Chat);           // 迭代器，按 kind 过滤
let p = preset_by_key("deepseek");            // Option<&'static ProviderPreset>
```

全部是 `&'static` —— 编译进二进制的静态数据，取用零分配，可以随意跨线程共享。

::: tip 数组顺序即呈现顺序
预置数组的顺序就是下拉/列表该呈现的顺序，**同一分组必须连续**（有守卫测试盯着）。
调用方直接按顺序渲染即可，不需要自己排序。

排序依据是「用户找到它的概率」：Anthropic 协议档 → 国内 → 国际 → 本地自建。
:::

## ProviderPreset 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `key` | `&'static str` | 模板 key，也是**存量配置回填的锚**。🔴 改名 = major |
| `vendor_id` | `&'static str` | 跨 kind 聚合的依据。同一家的 chat/image/tts 共用它 |
| `kind` | `Kind` | 这条属于哪种能力 |
| `group_key` / `group_label` | `&'static str` | 分组（i18n key / 纯文本） |
| `label_key` / `label` | `&'static str` | 服务商名（i18n key / 纯文本） |
| `hint_key` / `hint` | `Option<&'static str>` | 下拉项副文本 |
| `base_url` | `Option<&'static str>` | 预填地址。**含版本段、不含端点后缀**；`None` = 无预填 |
| `model` | `&'static str` | 默认模型；空串 = 让用户自己填 |
| `models` | `&'static [ModelOption]` | 建议清单 |
| `protocol` | `Protocol` | 走 `/v1/messages` 还是 `/v1/chat/completions` |
| `match_hosts` | `&'static [&'static str]` | 反推用的 host 片段；空 = 靠 protocol 反推 |
| `extra_fields` | `&'static [ExtraField]` | 服务商专有字段 |
| `apply_url` | `Option<&'static str>` | 密钥申请页；`None` = 本地服务不需申请 |
| `is_local` | `bool` | 需用户先把服务跑起来（Ollama / LM Studio / vLLM） |
| `verified_at` | `Option<&'static str>` | 最后一次**实际调通**的日期；`None` = 未核实 |

### 几个字段的用法要点

**`base_url` 为 `None`** 表示没有预填地址。两种情况：官方端点固定（Anthropic 官方），
或这是个「自定义端点」档（Claude Code / Codex 客户端档）。
调用方据此**隐藏或显示地址输入框**。

**`model` 为空串**出现在本地推理服务上 —— Ollama 上装了什么模型因人而异，
预置里写死任何一个都会是错的。

**`is_local` 必须区分对待**：

```rust
if p.is_local {
    // 「先在本机启动 Ollama，再回来测试连接」
} else if let Some(url) = p.apply_url {
    // 「去 {url} 申请密钥」
}
```

不区分的话，用户会按云服务的思路去配本地服务，配好却连不上，而且不知道为什么。

**`verified_at` 为 `None` 不代表不可用**，只代表这条数据是照官方文档抄的、
没有人拿真实密钥调通过。界面可以给一个淡色的「未核实」提示。
留白则会让用户以为"没这回事"，反而不如标出来。

## 服务商目录

```rust
use ai_profile::{vendors, Kind};

// 传入本应用支持的能力
let list = vendors(&[Kind::Chat]);
```

`vendors` 只返回与 `allow_kinds` **有交集**的厂商 —— 只做对话的应用不会看到
一家只提供视频的服务商。返回顺序沿用预置数组顺序。

| 字段 | 说明 |
|---|---|
| `id` | 对应 `vendor_id` |
| `label` | 展示名，取该厂商第一条预置的 `label` |
| `group_key` / `group_label` | 分组 |
| `kinds` | 这家覆盖哪几种能力 |
| `preset_keys` | 该厂商下所有预置的 key，点卡片后据此打开对应表单 |
| `host` | base_url 的 host；`None` = 自定义端点档 |
| `apply_url` | 密钥申请页 |
| `is_local` | 本地服务 |

### 「同密钥多能力」的由来

`vendor_id` 相同的预置，其 `base_url` 的 **host 必须一致** —— 有守卫测试
`vendor_ids_consistent` 盯着。这条约束支撑了目录的核心承诺：

> 同一家的多种能力**共用一个密钥**，配一次就能全部启用。

典型例子是火山方舟：它的对话、生图、视频走的是同一个
`https://ark.cn-beijing.volces.com/api/v3`。用户填一次密钥，三种能力全通。

`vendors_all()` 返回全部厂商，不按 kind 过滤 —— 用于生成文档这类场景。

## 从存量配置反推

老用户的数据库里只有 `base_url` 字符串。`infer_preset_key` 把它认回对应的模板：

```rust
use ai_profile::{preset::infer_preset_key, Protocol};

let key = infer_preset_key(Protocol::OpenAiCompatible, Some("https://api.deepseek.com"));
assert_eq!(key, "deepseek");   // 即使存的地址不带 /v1
```

它不做整串比较，而是看地址（小写后）是否**包含** `match_hosts` 里的某一项（可以带端口，
如 `localhost:11434`），所以带不带版本段、带不带结尾斜杠都认得回来。
只在 OpenAI 兼容的对话预置里找。认不出时返回 `CUSTOM_PRESET_KEY`（`"openai_compatible_custom"`）。

`match_hosts` 为空的预置（自定义端点档）靠 `protocol` 反推 —— 协议是 Anthropic
但 host 不是 `api.anthropic.com` 的，多半是中转站，归到 Claude Code 那一档。

## 专有字段

有些服务商要求额外配置项（如豆包 TTS 的 `appid` / `cluster`）。
这类字段**按服务商而非按能力变化** —— 同是 TTS，硅基流动就不需要 `appid`。

所以它们放在数据里而不是写死在界面上：

```rust
for f in p.extra_fields {
    // f.key / f.label / f.placeholder / f.required
    // 渲染成一个输入框，收集后存进你自己的 extra JSON
}
```

加一家新服务商时只改本 crate 的一个数组字面量，**所有下游应用同时生效**，
不需要任何一方改前端。

## 相关

- [服务商清单](/reference/providers) —— 当前全部预置的实际数据
- [定制服务商目录](/api/catalog) —— 应用自己增删改筛、加私有条目
- [加一家服务商](/reference/add-provider) —— 提 PR 的完整流程
- [前端对接](/guide/frontend) —— 这些类型序列化后的确切 JSON
