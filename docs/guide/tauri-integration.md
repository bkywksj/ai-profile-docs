# Tauri 应用接入

本页是一份完整的接入示例：从加依赖到前端拿到结构化错误。
示例基于 Tauri 2.x + React，但除了 Command 那一层，其余对任何 Rust 应用都适用。

## 1. 加依赖

```toml
# src-tauri/Cargo.toml
[dependencies]
ai-profile = { git = "https://github.com/bkywksj/ai-profile", features = ["chat", "client"] }
```

如果你的应用还要生图 / 语音，在 `features` 里一并开启 —— 见 [feature 矩阵](/guide/installation#feature-矩阵)。

## 2. 把 Verifier 存进 AppState

`Verifier` 内部持有 `reqwest::Client` 的连接池。**它是需要长期持有的资源，不是每次调用现建的临时对象**。

```rust
// src-tauri/src/state.rs
use ai_profile::client::Verifier;

pub struct AppState {
    pub db: Database,
    /// 模型服务验证器 —— 持有连接池，全应用共用一个。
    ///
    /// 🔴 不要在 Command 里现建：reqwest::Client 的连接池是它的全部价值，
    /// 每次新建等于每次都从 TCP + TLS 握手重来，跨境端点尤其明显。
    pub verifier: Verifier,
}
```

### 带上应用自己的代理设置

多数桌面应用有自己的代理配置。用 `from_builder` 把它注入进来：

```rust
// src-tauri/src/lib.rs —— setup 阶段
use ai_profile::client::Verifier;

// 用本 crate 重导出的 reqwest 建 builder，版本必然匹配
let builder = crate::proxy::apply_proxy(ai_profile::reqwest::Client::builder());
let verifier = Verifier::from_builder(builder)
    .map_err(|e| AppError::Custom(format!("模型服务验证器初始化失败: {e}")))?;

app.manage(AppState { db, verifier });
```

::: tip 用 `ai_profile::reqwest`，不要用自己依赖树里的 reqwest
两边版本一旦不同，报错会是 `expected ClientBuilder, found ClientBuilder` 这种看不懂的形式。
本 crate 重导出 `reqwest` 就是为了消掉这个坑。
:::

::: warning 超时与禁重定向你覆盖不掉
`from_builder` 会在**你的配置之后**再施加超时和禁重定向。

禁重定向不是可选项：跨 host 跳转时 reqwest 只剥 `Authorization` 等标准头、
**不剥自定义头** —— Anthropic 的 `x-api-key` 会被原样发往跳转目标。
:::

## 3. Service 层

按三层架构，Command 只做 IPC 包装，逻辑放 Service：

```rust
// src-tauri/src/services/model_service.rs
use ai_profile::client::{ServiceConfig, Verifier, check_required_fields};
use ai_profile::{Kind, ProviderPreset, VerifyError, Vendor, vendors, preset_by_key};

/// 本应用声明支持的能力 —— 只做对话。
const SUPPORTED: &[Kind] = &[Kind::Chat];

pub struct ModelService;

impl ModelService {
    /// 服务商目录，给设置页的卡片列表用
    pub fn vendor_catalog() -> Vec<Vendor> {
        vendors(SUPPORTED)
    }

    /// 某一条预置的完整信息，给表单预填用
    pub fn preset(key: &str) -> Option<&'static ProviderPreset> {
        preset_by_key(key)
    }

    /// 验证一条配置
    pub async fn verify(
        verifier: &Verifier,
        preset_key: Option<&str>,
        base_url: &str,
        api_key: &str,
        model: &str,
        extra: &[(&str, &str)],
    ) -> Result<ai_profile::client::VerifyOk, VerifyError> {
        // 缺必填专有字段的话不必发请求 —— 但前端本就该把按钮置灰，
        // 这里是第二道闸门（前端可能被绕过，也可能是别的调用方）
        check_required_fields(preset_key, extra)?;

        let protocol = preset_key
            .and_then(preset_by_key)
            .map(|p| p.protocol)
            // 没有预置就按 base_url 反推
            .unwrap_or_else(|| {
                let key = ai_profile::preset::infer_preset_key(
                    ai_profile::Protocol::OpenAiCompatible,
                    Some(base_url),
                );
                preset_by_key(key).map(|p| p.protocol)
                    .unwrap_or(ai_profile::Protocol::OpenAiCompatible)
            });

        let mut cfg = ServiceConfig::new(protocol, base_url)
            .with_api_key(api_key)
            .with_model(model)
            .with_extra(extra);
        if let Some(k) = preset_key {
            cfg = cfg.with_preset(k);
        }
        verifier.verify(cfg).await
    }
}
```

## 4. 错误映射：别把结构拍扁

这是最容易做错的一步。**不要**这样写：

```rust
// ❌ 结构没了，前端只能显示一行红字
.map_err(|e| CommandError { code: "VERIFY_FAILED".into(), message: e.to_string() })
```

这样做等于把本库最有价值的部分丢掉了：`suggested_url` 没了，「一键改用」按钮就做不出来。

正确做法是**让 `VerifyError` 原样序列化到前端**。它自带 `code` 判别字段：

```rust
// src-tauri/src/commands/model_service.rs
use crate::state::AppState;
use ai_profile::VerifyError;

/// 🔴 错误类型直接用 VerifyError，不转成应用的 CommandError ——
///    它自身就是结构化的，转换只会丢掉 suggested_url / available 这些
///    「让界面能给出动作」的字段。
#[tauri::command]
pub async fn verify_model_service(
    state: tauri::State<'_, AppState>,
    preset_key: Option<String>,
    base_url: String,
    api_key: String,
    model: String,
) -> Result<ai_profile::client::VerifyOk, VerifyError> {
    ModelService::verify(
        &state.verifier,
        preset_key.as_deref(),
        &base_url,
        &api_key,
        &model,
        &[],
    )
    .await
}

#[tauri::command]
pub fn list_model_vendors() -> Vec<ai_profile::Vendor> {
    ModelService::vendor_catalog()
}
```

别忘了注册：

```rust
// src-tauri/src/lib.rs
.invoke_handler(tauri::generate_handler![
    // …既有的
    commands::model_service::verify_model_service,
    commands::model_service::list_model_vendors,
])
```

::: danger 密钥不要写进日志
`VerifyError` 的所有 `detail` 字段只放端点返回的文本摘要（截断 300 字符），
**密钥绝不会进错误信息** —— 所以你可以放心 `log::warn!("{e}")`。

但别自己把 `api_key` 拼进日志行。
:::

## 5. 批量验证

设置页常有「全部测试」按钮。`verify` 只借 `&self`，直接并发即可：

```rust
use futures_util::future::join_all;

let results = join_all(configs.iter().map(|c| {
    let v = &state.verifier;
    async move { (c.id, ModelService::verify(v, /* … */).await) }
}))
.await;
```

共用一个 `Verifier` 意味着共用连接池 —— 同一家的多条配置只握手一次。

## 6. 迁移存量配置

用户升级前已经存了一堆配置。`infer_preset_key` 能从 `base_url` 反推出对应的预置模板，
让老配置回到「认识的服务商」而不是掉进「自定义端点」：

```rust
use ai_profile::{preset::infer_preset_key, Protocol};

let key = infer_preset_key(Protocol::OpenAiCompatible, Some(&row.base_url));
// "deepseek" —— 即使用户存的是不带版本段的 https://api.deepseek.com
```

它按 **host 而非完整字符串**匹配，所以带不带 `/v1`、带不带结尾斜杠都认得回来。

::: warning `preset.key` 是存量配置的锚
改预置的 `key` 会让所有老配置掉进「自定义端点」—— 用户看到的是
"我配好的服务商突然不认识了"。这在本库里被定为 **major 变更**，
你的应用侧同理：别把 `key` 当可以随手改的展示文本。
:::

## 下一步

- [前端对接](/guide/frontend) —— 字段命名的坑、按 `code` 分支
- [连通性验证](/api/verify) —— `Verifier` 的完整 API
