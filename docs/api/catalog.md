# 定制服务商目录

本库内置的预置是「所有应用都该看到」的公共部分。但总有只属于某个应用的条目 ——
自家的合作渠道、公司内网网关；或者某个应用的调用实现只支持部分协议，要藏掉一些家。

把这些塞进本库，**所有**应用的下拉里都会出现它；让应用整份抄走预置，又回到了「各存一份、各自漂移」。
所以本库只放公共数据，应用用 `PresetCatalog` 在它上面叠自己的改动。

## 增、删、改、筛

```rust
use ai_profile::preset::{ModelOption, PresetCatalog, ProviderPreset, GROUP_CHINA};
use ai_profile::Kind;

// 只属于本应用的条目：写成静态表
static LOCAL: &[ProviderPreset] = &[
    ProviderPreset::new("my_gateway", Kind::Chat, "公司内网网关", Some("https://llm.corp.example/v1"))
        .with_group(GROUP_CHINA)
        .with_hint("内网专用，出差时连不上")
        .with_models("qwen-max", &[ModelOption::plain("qwen-max")]),
];

let list: Vec<ProviderPreset> = PresetCatalog::new()   // 从本库的全部预置起步
    .remove(&["groq", "xai"])                          // 本应用不想露出的
    .retain(|p| p.kind == Kind::Chat)                  // 只要对话
    .extend(LOCAL)                                     // 加上自己的
    .build();
```

| 方法 | 作用 |
|---|---|
| `new()` | 从本库全部预置起步（只含本次编译开启的能力） |
| `empty()` | 从空目录起步（完全自定义，一般用不到） |
| `remove(&[key…])` | 按 key 删，不认识的 key 忽略 |
| `retain(条件)` | 只留满足条件的 |
| `map(函数)` | 逐条改（如给没地址的条目补默认地址） |
| `extend(&[…])` | 加入自己的条目，规则见下 |
| `build()` | 得到最终目录，顺序即下拉顺序 |
| `vendors(&[kind…])` | 按厂商聚合当前目录（服务商卡片用） |

### extend 插在哪

- **key 与已有条目相同 → 原位覆盖**。想改某家内置预置的模型清单或说明时用它
- 否则插到**同能力、同分组**的最后一条之后 —— 下拉的分组标题不会被切成两段
- 该能力里没有这个分组 → 插到该能力的最后；该能力一条都没有 → 追加到末尾

## 写自己的预置

`ProviderPreset` 带 `#[non_exhaustive]`，应用不能直接写结构体字面量。
用这组 `const fn` 构造器，照样能写成静态表：

| 方法 | 作用 | 缺省值 |
|---|---|---|
| `new(key, kind, label, base_url)` | 最小构造 | — |
| `with_vendor(id)` | 服务商聚合 id（同一家多种能力共用） | = key |
| `with_group(GROUP_…)` | 下拉分组 | 「本地 / 自建」 |
| `with_hint(text)` | 下拉第二行的要点 | 无 |
| `with_models(默认, &[…])` | 默认模型与候选清单 | 空 |
| `with_protocol(Protocol::…)` | 对话协议 | OpenAI 兼容 |
| `with_match_hosts(&[…])` | 从已存地址反推是哪条预置 | 空 |
| `with_extra_fields(&[…])` | 需要用户填的专有字段 | 空 |
| `with_default_extra(&[…])` | 预置定死的配置（见下） | 空 |
| `with_apply_url(url)` | 密钥申请页 | 无 |
| `local()` | 标记为本机服务（需用户先把服务跑起来） | 否 |

构造器不设 i18n key（`label_key` 为空）。接了多语言的界面遇到空 key 应直接显示 `label`。

::: tip key 别和内置预置重名
重名就是原位覆盖 —— 通常不是本意。建议在应用里写一条测试：
逐条断言 `ai_profile::preset_by_key(p.key).is_none()`。
:::

## default_extra：预置定死的配置

有的服务商需要**显式指定协议**。比如一个 New API 视频中转站，地址看上去和别家毫无区别，
本库也不按域名猜品牌 —— 那就让预置带上标记：

```rust
ProviderPreset::new("my_relay_video", Kind::Video, "某中转站 视频", Some("https://relay.example.com/v1"))
    .with_group(GROUP_CHINA)
    .with_default_extra(&[("video_api", "newapi")])
    .with_models("doubao-seedance-2.0", &[ModelOption::plain("doubao-seedance-2.0")]),
```

用户用这条预置新建配置时，**应用负责把这些键值并进供应商的 `extra`**（已有同名键不覆盖）。
之后 `VideoProtocol::detect(endpoint, extra)` 就会按 New API 处理。

| | `extra_fields` | `default_extra` |
|---|---|---|
| 谁决定值 | 用户填 | 预置定死 |
| 典型用途 | 火山语音的 `appid` | 指定协议 `video_api = newapi` |
| 线格式 | `[{ key, label, placeholder, required }]` | `[[key, value], …]` |

::: warning 已存的旧配置要自己补
如果你的应用以前靠别的方式识别（例如按域名），换成 `default_extra` 后，
**已经存下的配置里没有这个标记**。写一次数据迁移补上，否则它们会按兜底协议去调、必然失败。
:::

## 服务商卡片

按厂商聚合（「硅基流动：对话 / 生图 / 视频 / 配音，一个密钥」）要跟着你定制后的目录走：

```rust
let catalog = PresetCatalog::new().extend(LOCAL);
let cards = catalog.vendors(&[Kind::Chat, Kind::Image]);

// 或者对已经 build 出来的列表
let cards = ai_profile::preset::vendors_in(&list, &[Kind::Chat]);
```

`vendors()`（不带 `_in`）聚合的是本库的全量预置，看不到你的私有条目。

## 实例

| 应用 | 定制方式 |
|---|---|
| StoryLoom | `extend` 加一家合作渠道的对话 / 生图 / 视频 / 配音四条，视频那条带 `video_api = newapi` |
| 一站通 | `retain` 只留自己调用实现支持的协议（OpenAI 生图、火山方舟视频、OpenAI 配音），其余藏掉 |

## 相关章节

- [预置与服务商目录](/api/preset) —— 预置的字段含义
- [生图、视频与配音](/api/media) —— 协议识别规则
- [加一家服务商](/reference/add-provider) —— 该进本库的公共服务商怎么提 PR
