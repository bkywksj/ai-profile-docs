---
layout: home

hero:
  name: "ai-profile"
  text: "AI 模型服务配置层"
  tagline: 一份预置、一个协议、一套验证 —— 多个桌面应用共用。模型 id 变了只改一处，所有应用同时生效。
  image:
    src: /logo.svg
    alt: ai-profile
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 按场景查找
      link: /guide/cookbook
    - theme: alt
      text: 这是什么
      link: /guide/introduction

features:
  - title: 对话 25 家 + 多模态 17 条预置
    details: 地址、模型 id、协议、专有字段、密钥申请页全部内置。按厂商聚合成目录 —— 同一家的多种能力共用一个密钥，配一次就能全开。
    link: /reference/providers
    linkText: 看完整清单
  - title: ai.profile 跨应用互通
    details: 在 A 应用配好的模型服务，复制一段 JSON 就能粘进 B 应用，支持一次分享一整组。解析宽进（兼容多种字段拼写）、生成严出。
    link: /api/protocol
    linkText: 协议详情
  - title: 零成本验证，结构化错误
    details: 「获取模型」只打模型列表接口，不产生生成费用。失败时七种错误各对应一个界面动作 —— 404 带上推断出的正确地址，界面能给「一键改用」。
    link: /api/verify
    linkText: 验证 API
  - title: 地址规则确定、不猜
    details: OpenAI 兼容地址原样使用（智谱 /v4、Gemini /v1beta/openai 各不相同，猜错只会 404）；Anthropic 只有 v1，填不填 /v1 都能用。
    link: /api/endpoint
    linkText: 端点拼接
  - title: 限额与历史裁剪
    details: 上下文窗口、输出上限按「用户 > 端点上报 > 预置 > 未知」逐字段取值，来源可见。历史按窗口裁剪，服务端报超长时自动裁一半重试。
    link: /api/limits
    linkText: 限额
  - title: 生图 / 视频 / 配音调用
    details: 六套视频提交与轮询协议、两套生图、两套配音，按配置自动识别。来自生产环境的实现：错误翻成可操作的中文，出图不会被超时误杀却照样扣费。
    link: /api/media
    linkText: 多模态调用
  - title: 应用可以定制目录
    details: 公共服务商放在库里，只属于某个应用的条目由它自己加；也能删掉、筛掉自己用不上的几家。私有条目自动插进对应分组。
    link: /api/catalog
    linkText: 定制目录
  - title: 默认零重依赖
    details: 默认只有 serde、serde_json 与 thiserror，纯数据 + 纯函数，能编到移动端。真要发 HTTP 才开 client；不用的能力不编进二进制。
    link: /guide/installation
    linkText: feature 矩阵
---

## 30 秒上手

```toml
[dependencies]
ai-profile = { version = "0.1", features = ["chat", "client"] }
```

```rust
use ai_profile::{preset_by_key, vendors, Kind};

// 设置页的服务商下拉：只做对话的应用不会看到「只提供视频」的厂商
for v in vendors(&[Kind::Chat]) {
    println!("{} [{}]", v.label, v.group_label);
}

// 用户选了一家：预填地址与默认模型
let p = preset_by_key("deepseek").expect("预置存在");
println!("{:?} / {}", p.base_url, p.model);
```

验证、粘贴导入、限额、多模态见[快速开始](/guide/quick-start)；不知道从哪看起，按[你要做的事](/guide/cookbook)找。

## 为什么要有这个库

多个桌面应用都要做同一件事：让用户配置 AI 模型服务。这套逻辑此前在每个应用里各写一遍，
而且**模型 id 一变就必然漏改** —— DeepSeek 在 2026-07-24 下线了 `deepseek-chat` 别名，
有个应用两个月后才发现自己的预置「点开即报错」。

ai-profile 把**变动最频繁、跨应用差异为零**的那部分抽出来。密钥存储、数据库、对话请求这些各应用差异大的部分**不进本库**，
边界见[这是什么](/guide/introduction)。

## 谁在用

| 应用 | 用到的部分 |
|---|---|
| [Sigil 掌玺](https://sigil.ruoyi.plus) | 对话：预置、验证、限额、历史裁剪、`ai.profile` |
| [Reeve](https://reeve.ruoyi.plus) | 对话（桌面 + 移动端） |
| [本地知识库](https://kb.ruoyi.plus/) | 对话：预置、验证、限额、超长识别、`ai.profile` |
| 一站通 | 对话 + 生图 / 视频 / 配音预置 |
| StoryLoom | 四种能力全用 —— 生图 / 视频 / 配音的调用实现就来自它 |

在其中任何一个应用里配好的模型服务，复制一段 `ai.profile` 就能粘进另一个。

## 视频介绍与交流

- **B 站视频介绍**：<a href="https://www.bilibili.com/video/BV1dhh16qEvE" target="_blank" rel="noopener">BV1dhh16qEvE</a>- **QQ 交流群**：**1087715758** —— 接入问题、新服务商需求、Bug 反馈都可以在群里提

## 产品矩阵

抓蛙师出品，覆盖智能编程、凭据安全、服务器运维、知识管理、桌面框架、全栈开发等场景 —— [看完整介绍](/products)

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin: 30px 0;">

<a href="https://sigil.ruoyi.plus" target="_blank" rel="noopener noreferrer" class="product-preview-card">
  <img src="/products/sigil.svg" alt="Sigil 掌玺" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 12px;" />
  <h4 style="margin: 0 0 8px; font-size: 18px; color: var(--vp-c-text-1);">Sigil 掌玺</h4>
  <p style="margin: 0 0 8px; font-size: 13px; color: #0B6EF0; font-weight: 500;">AI 凭据金库 · MCP 协议代理</p>
  <p style="margin: 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6;">凭据零明文 | 160+ 内置能力 | 完整审计</p>
</a>

<a href="https://ruoyi.plus/" target="_blank" rel="noopener noreferrer" class="product-preview-card">
  <img src="/products/ruoyi-plus-uniapp.png" alt="RuoYi-Plus-UniApp" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 12px;" />
  <h4 style="margin: 0 0 8px; font-size: 18px; color: var(--vp-c-text-1);">RuoYi-Plus-UniApp</h4>
  <p style="margin: 0 0 8px; font-size: 13px; color: #0B6EF0; font-weight: 500;">Spring Boot 3 + Vue 3 + UniApp 全栈框架</p>
  <p style="margin: 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6;">四层架构 | 多租户 | AI集成 | 80+企业信赖</p>
</a>

<a href="https://ai-workstation.ruoyi.plus/" target="_blank" rel="noopener noreferrer" class="product-preview-card">
  <img src="/products/ai-workstation.svg" alt="AI 全能工作站" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 12px;" />
  <h4 style="margin: 0 0 8px; font-size: 18px; color: var(--vp-c-text-1);">AI 全能工作站</h4>
  <p style="margin: 0 0 8px; font-size: 13px; color: #0B6EF0; font-weight: 500;">一句话搞定一切 · 61个模块 · 1246 AI技能</p>
  <p style="margin: 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6;">八大领域全覆盖 | 智能路由 | 42集视频教程</p>
</a>

<a href="https://aicoder.ruoyi.plus/" target="_blank" rel="noopener noreferrer" class="product-preview-card">
  <img src="/products/aicoder.png" alt="智码 AiCoder" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 12px;" />
  <h4 style="margin: 0 0 8px; font-size: 18px; color: var(--vp-c-text-1);">智码 AiCoder</h4>
  <p style="margin: 0 0 8px; font-size: 13px; color: #8B5CF6; font-weight: 500;">给 Claude Code、Codex、Gemini CLI 一个统一的家</p>
  <p style="margin: 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6;">多标签会话 | Token费用追踪 | 零额外开销</p>
</a>

<a href="https://tauri.ruoyi.plus/" target="_blank" rel="noopener noreferrer" class="product-preview-card">
  <img src="/products/tauri-desktop.svg" alt="灵动桌面框架" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 12px;" />
  <h4 style="margin: 0 0 8px; font-size: 18px; color: var(--vp-c-text-1);">灵动桌面框架</h4>
  <p style="margin: 0 0 8px; font-size: 13px; color: #10B981; font-weight: 500;">React 19 + Rust + TypeScript · AI驱动跨平台</p>
  <p style="margin: 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6;">Tauri 2.x | 33个AI技能 | 三引擎协同</p>
</a>

<a href="https://reeve.ruoyi.plus" target="_blank" rel="noopener noreferrer" class="product-preview-card">
  <img src="/products/reeve.png" alt="Reeve" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 12px;" />
  <h4 style="margin: 0 0 8px; font-size: 18px; color: var(--vp-c-text-1);">Reeve</h4>
  <p style="margin: 0 0 8px; font-size: 13px; color: #0EA5E9; font-weight: 500;">服务器庄园总管 · 你持钥 AI 借道</p>
  <p style="margin: 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6;">SSH 管理 | MCP 受控接入 | 四重关卡 + 审计</p>
</a>

<a href="https://agileshot.ruoyi.plus" target="_blank" rel="noopener noreferrer" class="product-preview-card">
  <img src="/products/agileshot.png" alt="AgileShot" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 12px;" />
  <h4 style="margin: 0 0 8px; font-size: 18px; color: var(--vp-c-text-1);">AgileShot</h4>
  <p style="margin: 0 0 8px; font-size: 13px; color: #F59E0B; font-weight: 500;">AI 时代的桌面截图与标注工具</p>
  <p style="margin: 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6;">11 种标注 | AI OCR/翻译 | MCP 扩展</p>
</a>

<a href="https://kb.ruoyi.plus/" target="_blank" rel="noopener noreferrer" class="product-preview-card">
  <img src="/products/knowledge-base.png" alt="本地知识库" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 12px;" />
  <h4 style="margin: 0 0 8px; font-size: 18px; color: var(--vp-c-text-1);">本地知识库</h4>
  <p style="margin: 0 0 8px; font-size: 13px; color: #8B5CF6; font-weight: 500;">全文搜索 · 双链 · 知识图谱 · MCP</p>
  <p style="margin: 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6;">12 工具 MCP | 双链图谱 | 多端同步</p>
</a>

<a href="https://officia.ruoyi.plus" target="_blank" rel="noopener noreferrer" class="product-preview-card">
  <img src="/products/officia.svg" alt="Officia" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 12px;" />
  <h4 style="margin: 0 0 8px; font-size: 18px; color: var(--vp-c-text-1);">Officia</h4>
  <p style="margin: 0 0 8px; font-size: 13px; color: #F59E0B; font-weight: 500;">零依赖 Java 办公套件 · 无损转 PDF · Aspose 平替</p>
  <p style="margin: 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6;">Word/Excel/PPT 无损转 PDF | PDF 加密 | OCR | 仅需 JDK</p>
</a>

</div>
