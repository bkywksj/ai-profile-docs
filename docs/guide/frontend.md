# 前端对接

本页讲 Rust 侧的类型序列化成 JSON 之后，前端拿到的确切形状，以及怎么按错误码分支。

## 🔴 先说一个坑：两套命名风格并存

这不是疏忽，但确实需要记住：

| 类型 | 字段风格 | 例子 |
|---|---|---|
| `ProviderPreset`、`Vendor`、`ModelOption`、`ExtraField` | **camelCase** | `vendorId`、`baseUrl`、`isLocal`、`applyUrl` |
| `VerifyError`、`ParseError` | **snake_case** | `requested_url`、`suggested_url`、`proxy_hint` |

原因是两类数据的定位不同：预置是**喂给界面渲染的数据**，跟着前端习惯走 camelCase；
错误是**带判别标签的协议**，`code` 的取值本身就是 snake_case（`not_found`、`auth_failed`），
字段跟着保持一致更好认。

记混的表现是 `err.suggestedUrl` 永远是 `undefined`，而且不会报错 —— 所以这里明确列出来。

## 预置数据的真实形状

`ProviderPreset` 序列化后：

```json
{
  "key": "deepseek",
  "vendorId": "deepseek",
  "kind": "chat",
  "groupKey": "providerGroup.china",
  "groupLabel": "国内",
  "labelKey": "providerTemplate.deepseek.label",
  "label": "DeepSeek",
  "hintKey": null,
  "hint": null,
  "baseUrl": "https://api.deepseek.com/v1",
  "model": "deepseek-flash",
  "models": [
    { "value": "deepseek-flash", "label": "deepseek-flash" },
    { "value": "deepseek-v4-pro", "label": "deepseek-v4-pro" }
  ],
  "protocol": "openai_compatible",
  "matchHosts": ["api.deepseek.com"],
  "extraFields": [],
  "applyUrl": "https://platform.deepseek.com/api_keys",
  "isLocal": false,
  "verifiedAt": "2026-09-17"
}
```

`protocol` 取值为 `"openai_compatible"` 或 `"anthropic"`，与 Rust 侧 `Protocol::as_str()` 同一套拼写 ——
前端可以直接拿它和后端存的值比较，不需要转换层。

`Vendor`（服务商目录卡片）：

```json
{
  "id": "deepseek",
  "label": "DeepSeek",
  "groupKey": "providerGroup.china",
  "groupLabel": "国内",
  "kinds": ["chat"],
  "presetKeys": ["deepseek"],
  "host": "api.deepseek.com",
  "applyUrl": "https://platform.deepseek.com/api_keys",
  "isLocal": false
}
```

### TypeScript 类型

```typescript
// src/types/model-service.ts
export type Kind = "chat" | "image" | "video" | "tts";
export type Protocol = "anthropic" | "openai_compatible";

export interface ModelOption {
  value: string;
  label: string;
}

export interface ExtraField {
  key: string;
  labelKey: string;
  label: string;
  placeholder: string | null;
  required: boolean;
}

export interface ProviderPreset {
  key: string;
  vendorId: string;
  kind: Kind;
  groupKey: string;
  groupLabel: string;
  labelKey: string;
  label: string;
  hintKey: string | null;
  hint: string | null;
  /** null = 没有预填地址，应显示地址输入框让用户自己填 */
  baseUrl: string | null;
  model: string;
  models: ModelOption[];
  protocol: Protocol;
  matchHosts: string[];
  extraFields: ExtraField[];
  applyUrl: string | null;
  isLocal: boolean;
  /** null = 未实际核实过，可给一个淡色提示 */
  verifiedAt: string | null;
}

export interface Vendor {
  id: string;
  label: string;
  groupKey: string;
  groupLabel: string;
  kinds: Kind[];
  presetKeys: string[];
  host: string | null;
  applyUrl: string | null;
  isLocal: boolean;
}

/** 限额数字的来源 —— 决定界面是直接用还是让用户能改 */
export type LimitSource = "endpoint" | "preset";

export interface TokenLimits {
  /** 上下文窗口（输入 + 输出总量）；null = 未知，让用户手填 */
  contextWindow: number | null;
  /** 单次输出上限；null = 未知 */
  maxOutput: number | null;
  /** 🔴 endpoint = 端点保证的事实；preset = 本库的估计值，应允许用户修改 */
  source: LimitSource;
}

export interface VerifyOk {
  latencyMs: number;
  models: string[];
  /** 滤掉的非对话模型条数 —— 用于「已滤掉 N 个」提示 */
  dropped: number;
  modelInList: boolean;
  /** 当前填的那个模型的限额；null = 端点没报，回落到预置静态值 */
  limits: TokenLimits | null;
  /** 端点报了限额的全部模型，[id, 限额]。用于「换个模型立刻显示新窗口」 */
  modelLimits: [string, TokenLimits][];
}
```

## 错误的真实形状

`VerifyError` 带 `code` 判别字段。六个变体：

```json
{ "code": "auth_failed", "detail": "Invalid API key" }
{ "code": "not_found", "requested_url": "https://api.deepseek.com/models", "suggested_url": "https://api.deepseek.com/v1" }
{ "code": "unreachable", "proxy_hint": true }
{ "code": "model_not_found", "available": ["deepseek-flash", "deepseek-v4-pro"] }
{ "code": "protocol_mismatch", "expect": "anthropic" }
{ "code": "missing_extra_field", "key": "appid" }
{ "code": "malformed", "detail": "端点返回了无法解析的内容" }
```

`suggested_url` 在推断不出时是 `null`，不是缺字段 —— 判断用 `!= null` 而不是 `in`。

### TypeScript 判别联合

```typescript
export type VerifyError =
  | { code: "auth_failed"; detail: string }
  | { code: "not_found"; requested_url: string; suggested_url: string | null }
  | { code: "unreachable"; proxy_hint: boolean }
  | { code: "model_not_found"; available: string[] }
  | { code: "protocol_mismatch"; expect: Protocol }
  | { code: "missing_extra_field"; key: string }
  | { code: "malformed"; detail: string };
```

## 按 code 给动作

结构化错误的意义就在这一步 —— 每个分支给的是**按钮**，不是文案：

```tsx
import { message, Button } from "antd";
import { invoke } from "@tauri-apps/api/core";

async function handleVerify() {
  setTesting(true);
  try {
    const ok = await invoke<VerifyOk>("verify_model_service", {
      presetKey: form.presetKey,
      baseUrl: form.baseUrl,
      apiKey: form.apiKey,
      model: form.model,
    });
    setModelOptions(ok.models);          // 顺带把真实清单填进下拉
    message.success(`连通 · ${ok.latencyMs}ms`);
    if (!ok.modelInList) {
      message.warning("当前模型不在端点清单里，请确认模型名");
    }
  } catch (e) {
    handleVerifyError(e as VerifyError);
  } finally {
    setTesting(false);
  }
}

function handleVerifyError(err: VerifyError) {
  switch (err.code) {
    case "not_found":
      // 有推断地址 → 给「一键改用」，没有 → 只说明打了哪个地址
      if (err.suggested_url) {
        const fix = err.suggested_url;
        message.error({
          content: (
            <span>
              端点不存在
              <Button size="small" type="link" onClick={() => form.setFieldValue("baseUrl", fix)}>
                改用 {fix}
              </Button>
            </span>
          ),
        });
      } else {
        message.error(`端点不存在：${err.requested_url}`);
      }
      break;

    case "model_not_found":
      // 端点给了真实清单 → 直接展开下拉，不让用户自己猜
      setModelOptions(err.available);
      message.warning("端点不认识该模型，已为你载入可用清单");
      break;

    case "missing_extra_field":
      // 定位到那个输入框，比弹一句提示有用
      form.scrollToField(err.key);
      form.setFields([{ name: err.key, errors: ["该服务商要求填写此项"] }]);
      break;

    case "unreachable":
      // 唯一「改配置也没用」的错误 —— 给重试，不是给修改
      message.error(err.proxy_hint ? "无法连接，国内访问该站点通常需要代理" : "无法连接到端点");
      break;

    case "auth_failed":
      form.setFields([{ name: "apiKey", errors: [err.detail] }]);
      break;

    case "protocol_mismatch":
      message.error(`该密钥要求 ${err.expect} 协议，请切换对应的服务商模板`);
      break;

    default:
      // 🔴 必须有：VerifyError 会增加变体（minor 版本），别让新变体把界面打空
      message.error("验证失败，请检查配置");
  }
}
```

::: danger default 分支不能省
`VerifyError` 带 `#[non_exhaustive]` —— 本库新增错误变体只算 minor 版本。
没有 `default` 的话，新变体会让你的界面什么都不显示，而这是最难排查的一类故障。
:::

## 表单顺序的一个建议

按用户**实际填写的顺序**排字段，而不是按数据结构的顺序：

```
服务商  →  基础连接（接口地址、密钥）  →  模型
```

模型下拉依赖「先能连上端点」才能拉到真实清单。把模型放在地址前面，
用户会先面对一个空下拉，然后才明白要先填地址 —— 顺序反了，界面就在制造困惑。

## 下一步

- [错误码对照](/reference/errors) —— 每个变体对应的界面动作完整清单
- [预置与服务商目录](/api/preset) —— 字段含义
