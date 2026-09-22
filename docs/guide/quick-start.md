# 快速开始

本页用四步跑通一次真实验证：列出服务商 → 取一条预置 → 验证密钥 → 处理错误。

前置：已按[安装与 feature](/guide/installation) 加好依赖，并开启了 `client` feature。

## 1. 列出服务商给用户选

用户面对的是「有哪些家」，而不是「有哪些条预置」—— 同一家可能提供对话、生图、语音多种能力，
但**共用一个密钥**。所以给界面用的是按厂商聚合后的目录：

```rust
use ai_profile::{vendors, Kind};

// 传入本应用声明支持的能力 —— 只做对话的应用不会看到「只提供视频」的厂商
for v in vendors(&[Kind::Chat]) {
    println!("{} [{}] {}", v.label, v.group_label, if v.is_local { "本地服务" } else { "云端" });
}
```

```text
Anthropic 官方 [Anthropic / 协议档] 云端
DeepSeek [国内] 云端
智谱 GLM [国内] 云端
火山方舟（豆包） [国内] 云端
…
Ollama [本地 / 自建] 本地服务
```

`is_local` 是必须区分的：云端服务要引导用户「去申请密钥」，
本地服务要引导他「先把服务跑起来」。不区分的话，用户会按云服务的思路去配，配好却连不上。

## 2. 取预置填进表单

用户点了某家之后，用 `preset_keys` 拿到对应的预置：

```rust
use ai_profile::preset_by_key;

let p = preset_by_key("deepseek").expect("预置存在");

println!("地址：{}", p.base_url.unwrap_or(""));   // https://api.deepseek.com/v1
println!("默认模型：{}", p.model);                 // deepseek-flash
println!("申请密钥：{:?}", p.apply_url);
for m in p.models {
    println!("  候选：{}", m.value);
}
```

`base_url` 为 `None` 的预置（如 Anthropic 官方、Claude Code 自定义端点档）表示
**没有预填地址** —— 调用方据此决定隐藏还是显示地址输入框。

## 3. 验证

`Verifier` 内部持有一个可复用的 HTTP 客户端。**建一次、存起来、反复用** ——
每次现建会让连接池永远是空的，每次都从 TLS 握手重来。

```rust
use ai_profile::client::{ServiceConfig, Verifier};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 应用启动时建一次
    let verifier = Verifier::new()?;

    let cfg = ServiceConfig::new(p.protocol, "https://api.deepseek.com/v1")
        .with_preset("deepseek")
        .with_api_key("sk-你的密钥")
        .with_model("deepseek-flash");

    match verifier.verify(cfg).await {
        Ok(ok) => {
            println!("连通 · {}ms · 端点提供 {} 个模型", ok.latency_ms, ok.models.len());
            if !ok.model_in_list {
                println!("⚠️ 当前填的模型不在端点清单里，建议让用户确认");
            }
        }
        Err(e) => println!("失败：{e}"),
    }
    Ok(())
}
```

::: tip 验证是零成本的
`verify` 只打端点的**模型列表**接口，不产生任何生成费用。
顺带把真实模型清单拉了回来 —— 用户不必去翻文档抄模型名，直接从下拉里选。
:::

::: warning `ServiceConfig` 只能用 builder 构造
它带 `#[non_exhaustive]`，外部 crate 不能写 `ServiceConfig { .. }` 字面量。
用 `new()` 起手，再链式调用 `with_*`。
:::

## 4. 处理错误：给动作，不只给文字

六个错误变体各自对应一个界面动作。**这是本库存在的重点之一** ——
只显示一行红字的话，用户不知道下一步该做什么。

```rust
use ai_profile::VerifyError;

match verifier.verify(cfg).await {
    Ok(ok) => { /* 填充模型下拉 */ }

    // 404 且能推断出正确地址 → 给「一键改用」按钮
    Err(VerifyError::NotFound { requested_url, suggested_url }) => {
        println!("打的是 {requested_url}");
        if let Some(fix) = suggested_url {
            println!("[一键改用 {fix}]");
        }
    }

    // 端点不认这个模型，但它给了真实清单 → 直接展开成下拉让用户改选
    Err(VerifyError::ModelNotFound { available }) => {
        println!("请改选：{available:?}");
    }

    // 少填了服务商专有字段 → 定位到那个输入框
    Err(VerifyError::MissingExtraField { key }) => {
        println!("请先填写「{key}」");
    }

    // 网络不通 —— 唯一「改配置也没用」的错误，给重试而不是给修改
    Err(e @ VerifyError::Unreachable { .. }) => {
        println!("{e} · [重试]");
    }

    Err(e) => println!("{e}"),
}
```

`is_actionable()` 可以快速判断该给「去修改」还是「重试」：

```rust
if e.is_actionable() {
    // 改配置能解决 —— 光标定位到对应输入框
} else {
    // 只有 Unreachable 属于这类 —— 给重试按钮
}
```

## 一个可以少走的弯路

有些服务商要求填专有字段（如豆包 TTS 的 `appid`）。**在发请求之前**就能判出来，
不必等用户点了才报错：

```rust
use ai_profile::client::check_required_fields;

let extra = [("appid", "")];
let can_submit = check_required_fields(Some("some_preset"), &extra).is_ok();
// can_submit == false → 直接把「测试连接」按钮置灰
```

禁用态优于「点了才报错」—— 用户不会浪费一次点击，也不会怀疑是自己网络的问题。

## 下一步

- [Tauri 应用接入](/guide/tauri-integration) —— 存进 `AppState`、包成 Command、映射错误
- [预置与服务商目录](/api/preset) —— 全部字段的含义
- [连通性验证](/api/verify) —— 代理配置、并发验证
