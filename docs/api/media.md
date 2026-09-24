# 生图、视频与配音

需要 `client` 加上对应能力的 feature（`image` / `video` / `tts`）。

`media` 模块负责**一次 HTTP 调用怎么发、怎么解析**：生图 `generate`、视频 `submit` / `poll`、配音 `synthesize`。
实现整体来自 StoryLoom 在生产环境跑过的代码，各家协议细节、错误翻译、超时策略都是实测踩出来的。

## 边界：任务编排归你

| 本模块 | 调用方 |
|---|---|
| 按地址识别协议、组装请求、解析响应 | 建任务记录、写数据库 |
| 生图结果**立即下载**成字节（临时链接常 1 小时失效） | 落盘、生成缩略图 |
| 视频的一次提交、一次查询 | **轮询循环**、取消、断点续跑、进度事件 |
| 把上游报错翻成可操作的中文 | 决定展示在哪、要不要重试 |

视频尤其如此：轮询间隔、超时、用户点「停止」后怎么办、应用重启后怎么续跑，
都和你的存储与界面绑定，本库不替你决定。

## 协议按地址识别

各家协议不同，却都只给一个 base_url，所以协议从**地址**（和供应商的 `extra`）里认。
**改预置地址之前先看这张表** —— 地址决定走哪套协议。

| 能力 | 识别规则 | 函数 |
|---|---|---|
| 生图 | 含 `dashscope` → 通义万相异步任务；其余 → OpenAI `/images/generations` | `ImageProtocol::detect` |
| 视频 | `minimaxi` → 海螺；`dashscope` → Vidu；`bigmodel` / `zhipu` → 智谱；`siliconflow` → 硅基流动；`extra.video_api = "newapi"` → New API 中转站；其余 → 火山方舟 | `VideoProtocol::detect` |
| 配音 | 含 `openspeech` → 火山语音专有协议；火山**方舟**地址 → 直接报配置错误；其余 → OpenAI `/audio/speech` | `TtsProtocol::detect` |

::: warning New API 中转站只认显式标记
New API / one-api 是通用的中转架构，站点千千万。本库**不按域名猜** ——
需要走这套协议的配置要在 `extra` 里带 `{"video_api":"newapi"}`。
预置可以用 [`default_extra`](/api/catalog#default-extra-预置定死的配置) 自动写上。
:::

302.AI 这类聚合站走透传地址（`api.302.ai/minimaxi/v1`），靠路径里的厂商名命中对应协议。

## 生图

```rust
use ai_profile::media::image::{AnyImageProvider, ImageGenConfig, ImageGenParams};

let provider = AnyImageProvider::from_config(ImageGenConfig {
    endpoint: "https://api.siliconflow.cn/v1".into(),
    model: "Kwai-Kolors/Kolors".into(),
    api_key: key,
});

let img = provider
    .generate(&ImageGenParams {
        prompt: "竖屏漫画分镜：少女站在雨中的站台".into(),
        size: "720x1280".into(),
        ..Default::default()
    })
    .await?;

std::fs::write(format!("shot.{}", img.ext), &img.bytes)?;
```

| 参数 | 说明 |
|---|---|
| `prompt` / `negative_prompt` | 提示词 / 反向提示词 |
| `seed` | 同一角色复用同一 seed 求一致性；`None` 由服务端随机 |
| `size` | `宽x高`，默认 `720x1280`（9:16 竖屏） |
| `images` | 参考图（URL 或 base64 data URL）：0 张纯文生图，1 张图生图，多张多图融合 |

返回的 `ImageResult` 已经把图片下载成字节，`ext` 按响应推断（png / jpg / webp）。
小于 `MIN_IMAGE_BYTES`（1 KB）的响应一律当失败 —— 中转站异常时常返回空内容或错误页，却给 200。

## 视频

视频必然是异步的：提交拿任务号，再轮询到完成。

```rust
use ai_profile::media::video::{AnyVideoProvider, VideoGenConfig, VideoGenParams, VideoProvider, VideoTaskStatus};

let provider = AnyVideoProvider::from_config(
    VideoGenConfig { endpoint, model, api_key },
    &provider_extra,           // 供应商的 extra JSON，可为空串
);

let task_id = provider
    .submit(&VideoGenParams {
        prompt: "镜头缓慢推进，人物自然眨眼".into(),
        image: first_frame_data_url,     // 首帧
        last_image: String::new(),       // 尾帧，空 = 纯首帧模式
        duration: 5,
        ..Default::default()
    })
    .await?;

// 轮询循环由调用方负责
loop {
    match provider.poll(&task_id).await? {
        VideoTaskStatus::Pending => tokio::time::sleep(std::time::Duration::from_secs(5)).await,
        VideoTaskStatus::Succeeded(url) => break download(url).await?,
        VideoTaskStatus::Failed(msg) => return Err(explain_error(&msg).into()),
    }
}
```

`AnyVideoProvider` 实现了 `VideoProvider`，可以直接 move 进 `tokio::spawn` 做后台轮询。

### 首尾帧

给了 `last_image` 就走首尾帧模式：AI 在首帧和尾帧之间补出过程，终点被钉死。
不是每家都支持，**发请求前先问** `supports_last_frame(endpoint, extra)`：

| 服务商 | 支持 | 方式 |
|---|---|---|
| 火山方舟 Seedance | ✅ | `content` 里第二个 `image_url` 带 `role: "last_frame"` |
| 海螺 | ✅ | 顶层 `last_frame_image`（Hailuo-02 及以上） |
| 智谱 CogVideoX | ✅ | `image_url` 传 `[首帧, 尾帧]` |
| Vidu / 硅基流动 / New API 中转站 | ❌ | 宁可不给，也不发一个会被忽略或报错的字段 |

### 错误翻译

`explain_error(raw)` 把审核类拦截翻成可操作的中文（「首帧被判为真人 / 敏感内容，建议换画风或换供应商」），
其余原样截断到 300 字。提交阶段被拒和轮询阶段失败都可以过它一遍再展示。

## 配音

```rust
use ai_profile::media::tts::{audio_format_for, synthesize, TtsParams};

let bytes = synthesize(
    &provider.endpoint,
    &provider.model,
    &provider.extra,          // 火山语音从这里取 appid / cluster
    key,
    &TtsParams {
        text: "你终于来了。".into(),
        voice: "alex".into(),
        format: audio_format_for(&provider.model).into(),
        ..Default::default()
    },
)
.await?;
```

| 函数 | 用途 |
|---|---|
| `audio_format_for(model)` | glm-tts 只出 wav，其余 mp3 —— 合成格式、落盘扩展名、播放 mime 三者要对齐 |
| `voice_catalog(model)` | 按模型给出可选音色（火山 / CosyVoice / glm-tts 各一套） |
| `parse_volc_extra(extra)` | 从 extra 解析火山语音的 `appid` 与 `cluster`（缺省 `volcano_tts`） |

::: danger 火山方舟没有语音合成
配音填了火山**方舟**的地址（`ark.cn-beijing.volces.com`）会被直接拦下，不会发出请求。
语音合成在「火山语音」（`openspeech.bytedance.com`），是另一条产品线、另一个密钥。
:::

## 代理与证书

每个 provider 都会自己建 HTTP 客户端。要走代理时传一个**底座**进来：

```rust
use ai_profile::media::MediaHttp;

let http = MediaHttp::from_fn(move || {
    let b = ai_profile::reqwest::Client::builder();
    match ai_profile::reqwest::Proxy::all(&proxy_url) {
        Ok(p) => b.proxy(p),
        Err(_) => b,
    }
});

let img = AnyImageProvider::from_config_with(config, &http);
let video = AnyVideoProvider::from_config_with(config, &extra, &http);
let audio = synthesize_with(endpoint, model, extra, key, &params, &http).await?;
```

底座由你配，**超时策略由本库在其后施加，覆盖不掉**：出图用「读超时」而不是整体超时 ——
整体超时会在算图慢时误杀请求，而中转站此时已经算完并照常计费，用户得到「有扣费却没图」。

## 错误

所有调用返回 `MediaError`，只有两类：

| 变体 | 含义 | 界面动作 |
|---|---|---|
| `InvalidInput` | 入参或配置不对（文本为空、缺 App ID、端点填错产品线） | 让用户改配置，重试没用 |
| `Failed` | 其余一切（网络、上游拒绝、解析失败），消息已是可读中文 | 展示并允许重试 |

`MediaError::message()` 取不带前缀的原文。

## 相关章节

- [安装与 feature](/guide/installation) —— 开哪些 feature 得到哪些调用
- [定制服务商目录](/api/catalog) —— 私有预置与 `default_extra`
- [服务商清单](/reference/providers) —— 生图 / 视频 / 配音的内置预置
