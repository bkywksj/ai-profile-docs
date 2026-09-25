# 加一家服务商

服务商清单是这个库变动最频繁的部分，也是最欢迎 PR 的部分。
加一家只改一个数组字面量，**所有下游应用同时生效**。

## 先判断：该不该进本库

「所有下游同时生效」是双刃剑 —— 进了本库，**每个**应用的下拉里都会出现它。

| 服务商 | 去哪 |
|---|---|
| 公开可注册的官方服务、通用聚合平台 | ✅ 本库，按下面的流程提 PR |
| 只有某个应用在用的合作渠道、内部网关 | ❌ 那个应用用[定制服务商目录](/api/catalog)自己加 |

拿不准就问一句：换一个毫不相关的应用接入，它的用户会想在下拉里看到这一家吗？

## 流程

### 1. 加一条 ProviderPreset

在 `crates/ai-profile/src/preset/<kind>.rs`（`chat` / `image` / `video` / `tts`）里按分组插入。
🔴 **数组顺序即呈现顺序，同一分组必须连续** —— 有守卫测试盯着。

```rust
ProviderPreset {
    key: "acme",
    vendor_id: "acme",
    kind: Kind::Chat,
    group_key: GROUP_CHINA.0,
    group_label: GROUP_CHINA.1,
    label_key: "providerTemplate.acme.label",
    label: "Acme AI",
    hint_key: None,
    hint: None,
    base_url: Some("https://api.acme.com/v1"),
    model: "acme-medium",
    models: &[
        ModelOption::plain("acme-large"),
        ModelOption::plain("acme-medium"),
    ],
    protocol: Protocol::OpenAiCompatible,
    match_hosts: &["api.acme.com"],
    extra_fields: NO_EXTRA,
    default_extra: &[],
    apply_url: Some("https://console.acme.com/keys"),
    is_local: false,
    verified_at: None,
},
```

### 2. base_url 照抄文档原文

**含版本段、不含端点后缀。**

| ✅ | ❌ |
|---|---|
| `https://api.acme.com/v1` | `https://api.acme.com`（缺版本段） |
| `https://open.bigmodel.cn/api/paas/v4` | `https://api.acme.com/v1/chat/completions`（带了端点后缀） |

OpenAI 兼容一侧不做任何版本段推断 —— 你写什么，用户的请求就打到哪里。
Anthropic 协议例外（末段不是版本号时自动补 `/v1`），但预置里照样写全，守卫测试要求每条都看得到版本段。

### 3. 默认 model 选「够用档」

```rust
model: "acme-medium",              // ✅ 够用档
models: &[
    ModelOption::plain("acme-large"),   // 最强档留在清单里随时可选
    ModelOption::plain("acme-medium"),
],
```

::: warning 别把旗舰塞进默认值
用户点开预置是奔着"能用"来的，不是奔着"最贵"。默认选旗舰等于替他做了一个
他没同意的花钱决定。
:::

守卫测试 `default_model_is_in_its_own_list` 会检查默认值在不在自己的清单里 ——
不一致的话用户打开表单会看到一个下拉里选不中的值，以为是自己配错了。

### 4. verified_at：没调通就留 None

| 情况 | 填什么 |
|---|---|
| 拿真实密钥实际调通过 | `Some("2026-09-22")` |
| 照官方文档抄的，没验过 | `None` |

::: danger 不要为了"好看"填上日期
这个字段是给**后来人**判断「这条数据该不该信」用的。
照抄文档填个日期，等于把一条未验证的数据伪装成已验证。

`cargo xtask probe` 能验地址可达性，但**验不了 model id 对不对**（那要真实密钥），
所以 probe 通过不构成填 `verified_at` 的理由。
:::

文档生成器会把 `None` 显示成「未核实」而不是留白 ——
留白会让读者以为"没这个概念"，标出来才知道该自己验一下。

### 5. vendor_id：同一家用同一个

```rust
// 硅基流动的四种能力共用一个 vendor_id
vendor_id: "siliconflow",
```

这是「同密钥多能力」的依据。守卫测试 `vendor_ids_consistent` 要求
**同 `vendor_id` 的 base_url host 必须一致** —— 否则服务商目录会把两家并成一张卡。

新加的能力如果与已有预置是同一家，务必复用已有的 `vendor_id`。

### 6. 跑测试

```bash
cargo test -p ai-profile
cargo test -p ai-profile --features client
```

九个守卫测试必须全绿。它们防的是：

| 测试 | 防什么 |
|---|---|
| `preset_groups_are_contiguous` | 同组不连续会切出重复的分组标题 |
| `preset_base_urls_are_well_formed` | base_url 漏版本段 = 下游 404 |
| `preset_keys_are_unique` | key 重复会让回填逻辑静默错乱 |
| `vendor_ids_consistent` | 同 vendor_id 的 host 必须一致 |
| `default_model_is_in_its_own_list` | 默认值在下拉里选不中 |
| `join_api_path_never_infers_version_segment` | 防止有人把 OpenAI 兼容一侧的版本段推断加回来 |
| `protocol_roundtrip` | ai.profile 解析→生成→解析 不丢字段 |
| `providers_md_in_sync` | 防止文档变成又一份会漂移的副本 |
| `service_config_builder_is_usable_from_outside` | `non_exhaustive` 入参类型缺 builder 时下游报 E0639 |

### 7. 重新生成文档

```bash
cargo xtask gen-docs
```

`docs/providers.md` 是**生成物，不要手改** —— 手改会让它变成第二份数据源，
而这个库存在的全部理由正是消掉重复数据源。

### 8. 版本位

加一家 provider 是 **patch** —— 纯数据更新，不动 API 形状。
详见[版本策略](/reference/versioning)。

## 探活现有端点

```bash
cargo xtask probe
```

不带密钥打所有非本地预置的地址，验**地址是否还有效**。
25 家并发探测，实测几秒跑完。

```text
  ✅ deepseek         地址可达（未带密钥，返回鉴权失败属正常）
  ✅ openrouter       937ms  433 个模型
  ❌ gemini           端点不存在：https://generativelanguage.googleapis.com/v1beta/openai/models
```

判读规则：

- **401 / 403 = 地址对了** —— 没带密钥，鉴权失败恰恰说明端点存在
- **404 = 真问题** —— 地址失效了，需要核对服务商文档

::: warning probe 是人工触发的季度体检，不进 CI
每次 PR 都去打各家服务商的接口既是滥用，也会让 CI 随网络波动随机红。
:::

::: tip 404 也可能是假阳性
有些服务商（如 Google）用 404 隐藏未授权资源 —— 不带密钥访问存在的端点也会得到 404。
遇到 404 先查服务商文档，**别直接改预置**。
:::

## 提 PR 时请说明

- 数据来源（官方文档链接）
- 有没有用真实密钥验过（决定 `verified_at` 填不填）
- 如果是已有厂商的新能力，说明为什么复用/不复用现有 `vendor_id`

## 相关

- [服务商清单](/reference/providers) —— 当前的全部数据
- [预置与服务商目录](/api/preset) —— 每个字段的含义
- [版本策略](/reference/versioning) —— 改动的版本位判定
