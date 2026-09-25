# 其他语言实现

ai-profile 目前只有 Rust 实现，但它的价值大半与语言无关：预置数据是一份 JSON，地址拼接、错误判定、
模型清洗、`ai.profile` 解析是一组规则。所以我们把这两样单独发布出来 —— 别的语言**不用重抄数据、
不用凭文字猜规则**，数据直接拿，规则照用例写，跑通用例就与 Rust 版行为一致。

::: tip 这些文件由代码生成
全部由 crate 仓库的 `cargo xtask gen-spec` 从 Rust 参考实现现场算出，仓库内有守卫测试
`spec_files_in_sync` 保证它们与代码一致。每个文件头都标着产出它的 crate 版本。
:::

## 下载

| 文件 | 内容 | 什么时候需要 |
|------|------|-------------|
| <a href="/spec/presets.json" target="_blank" rel="noopener"><code>presets.json</code></a> | 全部服务商预置 + 按厂商聚合的目录 | 只想要服务商清单时，**拿这一个就够** |
| <a href="/spec/conformance/endpoint.json" target="_blank" rel="noopener"><code>endpoint.json</code></a> | 端点拼接 | 要拼请求地址 |
| <a href="/spec/conformance/model_filter.json" target="_blank" rel="noopener"><code>model_filter.json</code></a> | 模型清单清洗 | 做「获取模型」下拉 |
| <a href="/spec/conformance/models_response.json" target="_blank" rel="noopener"><code>models_response.json</code></a> | `/models` 响应解析（id 与限额） | 同上 |
| <a href="/spec/conformance/diagnose.json" target="_blank" rel="noopener"><code>diagnose.json</code></a> | 验证失败的错误判定 | 做「测试连接」 |
| <a href="/spec/conformance/ai_profile.json" target="_blank" rel="noopener"><code>ai_profile.json</code></a> | `ai.profile` 解析与生成 | 做粘贴导入 / 分享 |
| <a href="/spec/conformance/limits.json" target="_blank" rel="noopener"><code>limits.json</code></a> | token 限额三层合并 | 做上下文窗口 / 输出上限 |

**只实现你需要的部分。** 不必把全部函数都搬过去。

## 文件格式

每个文件都带同样的头：

```json
{
  "specVersion": 1,
  "crateVersion": "0.1.1",
  "title": "端点拼接",
  "description": "规则摘要",
  "generatedBy": "cargo xtask gen-spec …",
  "cases": [ … ]
}
```

| 字段 | 含义 |
|------|------|
| `specVersion` | **格式**版本。只在字段改名、结构调整时加 1；加用例、改期望值不算。遇到不认识的值应当拒绝运行，别按旧格式硬读 |
| `crateVersion` | 生成这批用例的 crate 版本，期望值跟着它走 |
| `cases` | 用例列表（`presets.json` 没有这一项，换成 `presets` 与 `vendors`） |

每条用例：

```json
{ "fn": "join_api_path", "name": "可选说明", "input": { "base": "…", "path": "models" }, "expected": "…" }
```

- `fn` 对应一个要实现的函数，`input` 是参数（键名 camelCase），`expected` 是返回值。
- 返回 `Result` 的函数，`expected` 是 `{"ok": …}` 或 `{"error": …}` 二选一。
- `expected` 的键名照 Rust 版的线格式原样给出：数据结构是 camelCase，**错误对象是 snake_case**
  （如 `suggested_url`）。这是已发布的格式，照抄即可，别统一成一种。
- 按 **JSON 值**比较（对象键无序），不要比字符串。`to_profile` 的输出也先解析再比。

## 接进你的测试

以 Python + pytest 为例：

```python
import json, pathlib, pytest
from my_ai_profile import join_api_path, join_chat_endpoint, anthropic_base_url

FNS = {
    "join_api_path": lambda i: join_api_path(i["base"], i["path"]),
    "join_chat_endpoint": lambda i: join_chat_endpoint(i["base"], i["path"]),
    "anthropic_base_url": lambda i: anthropic_base_url(i["base"]),
}
spec = json.loads(pathlib.Path("spec/conformance/endpoint.json").read_text("utf-8"))
assert spec["specVersion"] == 1

@pytest.mark.parametrize("case", spec["cases"], ids=lambda c: f'{c["fn"]}:{c["input"]}')
def test_endpoint(case):
    assert FNS[case["fn"]](case["input"]) == case["expected"]
```

TypeScript + Vitest 同理：

```ts
import spec from './spec/conformance/endpoint.json'
import { joinApiPath, joinChatEndpoint, anthropicBaseUrl } from '../src/endpoint'

const fns: Record<string, (i: any) => unknown> = {
  join_api_path: (i) => joinApiPath(i.base, i.path),
  join_chat_endpoint: (i) => joinChatEndpoint(i.base, i.path),
  anthropic_base_url: (i) => anthropicBaseUrl(i.base),
}

test.each(spec.cases)('$fn $input', (c) => {
  expect(fns[c.fn](c.input)).toEqual(c.expected)
})
```

建议把整个 `spec/` 复制进你的仓库，记下来源的 `crateVersion`。升级时整体替换，再看哪些用例红了 ——
红掉的那几条就是这次规则变化的全部内容。

## 规则摘要

用例是权威，这里只帮你读懂用例在测什么。各规则的设计理由见对应的 API 页。

| 规则 | 要点 | 详见 |
|------|------|------|
| 端点拼接 | OpenAI 兼容地址**原样使用**，不补 `/v1`；只剥掉误填的对话端点后缀与末尾 `#`。Anthropic 协议是唯一例外：末段不是 `v<数字>` 就补 `/v1`，末尾 `#` 表示别补 | [端点与模型清单](/api/endpoint) |
| 模型清洗 | 排除法：只滤掉带明确非对话特征的（向量、重排、语音、生图、OCR、审核…），**未知名称一律放行**；去空白、去重、保持顺序；全被滤光时原样返回 | [端点与模型清单](/api/endpoint) |
| `/models` 解析 | `{"data":[…]}` 与裸数组都接受；限额只收录报了的模型，OpenRouter 优先取 `top_provider` | [限额](/api/limits) |
| 错误判定 | 401/403 → `auth_failed`；404 → `not_found`（看不出版本段时带 `suggested_url`）；其余 → `malformed` | [连通性验证](/api/verify) |
| `ai.profile` | 解析**宽进**（多种字段拼写、单条与打包统一成列表、OAuth 条目跳过计数）；生成**严出**（只产出规范写法） | [ai.profile 协议](/api/protocol) |
| 限额合并 | 用户 > 端点 > 预置，两两合并：高层全空时整条换成低层；否则逐字段补空，来源保留高层 | [限额](/api/limits) |

## 边界

- **不要改用例去迁就实现。** 觉得某条期望值不合理，请到
  [crate 仓库](https://github.com/bkywksj/ai-profile/issues)提 issue —— 规则改在 Rust 版，
  重新生成后所有语言一起跟上。
- 目前没有官方维护的其他语言实现。你写了一个，欢迎告诉我们，会列进本页。

## 相关

- [ai.profile 协议](/api/protocol) —— 格式定义与「给其它实现者」的约定
- [版本策略](/reference/versioning) —— 什么改动会让期望值变化
