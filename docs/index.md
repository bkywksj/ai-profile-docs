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
      text: 这是什么
      link: /guide/introduction
    - theme: alt
      text: GitHub
      link: https://github.com/bkywksj/ai-profile

features:
  - title: 25 家服务商预置
    details: base_url、模型 id、协议类型、专有字段、密钥申请页，全部作为静态数据内置。按厂商聚合成目录 —— 同一家的多种能力共用一个密钥，配一次就能全开。
    link: /reference/providers
    linkText: 看完整清单
  - title: ai.profile 跨应用互通
    details: 用户在 A 应用配好的模型服务，复制一段 JSON 就能粘进 B 应用。解析宽进（接受三种字段拼写）、生成严出（只产出规范写法）。
    link: /api/protocol
    linkText: 协议详情
  - title: 结构化错误，不是一行红字
    details: 六个错误变体各对应一个界面动作。404 带上推断出的正确地址，界面才能给「一键改用」；缺专有字段在发请求之前就能判出来，直接禁用按钮。
    link: /reference/errors
    linkText: 错误码对照
  - title: 零成本验证
    details: 只打端点的模型列表接口，不产生任何生成费用。顺带把真实模型清单拉回来 —— 用户不必去翻文档抄模型名。
    link: /api/verify
    linkText: 验证 API
  - title: 默认零重依赖
    details: 默认只有 serde 与 thiserror，纯数据 + 纯函数，能编到移动端。需要真发 HTTP 时才开 client feature 拉 reqwest；不用的能力不编进二进制。
    link: /guide/installation
    linkText: feature 矩阵
  - title: base_url 原样使用
    details: 不做版本段推断。各家并不统一 —— 多数 /v1、智谱 /v4、Gemini 的 /v1beta/openai 甚至不在末尾。推断错的代价是隐性的：用户照文档填对了，库悄悄加了一段，他只看到 404。
    link: /api/endpoint
    linkText: 端点拼接
---

## 为什么要有这个库

多个桌面应用都要做同一件事：让用户配置 AI 模型服务。这套逻辑此前在每个应用里各写一遍 ——
约 1.5 万行代码做同一件事，且**模型 id 变动时必然漏改**。

一个真实的例子：DeepSeek 在 2026-07-24 下线了 `deepseek-chat` 别名，
某个应用两个月后才发现自己的预置「点开即报错」—— 因为没人会主动去核对另外三个应用里的同一份清单。

ai-profile 把**变动最频繁、而跨应用差异为零**的那部分抽出来，做成一份可依赖的库。

## 它不做什么

| | 内容 | 归属 |
|---|---|---|
| ✅ | 预置清单、`ai.profile` 协议、端点拼接、模型清单清洗、验证与结构化错误 | 本 crate |
| ❌ | **密钥存储与加密** | 留给应用 —— 各家差异极大（系统密钥环 / SQLCipher 金库 / 明文配置各有各的取舍） |
| ❌ | 数据库、CRUD、哪条配置是「当前启用」 | 同上 |

**本 crate 不持久化任何东西**。它只在验证时接收调用方传入的密钥，用完即弃，
密钥也绝不会出现在任何错误信息里 —— 调用方可以放心把错误写进日志。
