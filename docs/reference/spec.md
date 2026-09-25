# 其他语言实现

ai-profile 目前只有 Rust 实现，但它的价值大半与语言无关：预置数据是一份 JSON，地址拼接、错误判定、
模型清洗、`ai.profile` 解析是一组规则。所以我们把这两样单独发布出来 —— 别的语言**不用重抄数据、
不用凭文字猜规则**：数据直接拿，规则照用例写，跑通用例就与 Rust 版行为一致。

::: tip 这些文件由代码生成
全部由 crate 仓库的 `cargo xtask gen-spec` 从 Rust 参考实现现场算出，仓库内有守卫测试
`spec_files_in_sync` 保证它们与代码一致。每个文件头都标着产出它的 crate 版本。
:::

## 三种配合方式

| 你的需求 | 做法 | 工作量 |
|---------|------|--------|
| 只要服务商清单（地址、模型、密钥申请页） | 读 `presets.json`，[按 kind 筛](#只用数据) | 几十行 |
| 要完整能力（拼地址、测试连接、粘贴导入…） | 按[实现范围](#实现范围)写函数，跑通对应用例 | 一到两天 |
| 同上，但想省事 | 把用例交给 AI，[让它照着写并跑通](#用-ai-实现) | 半天 |

三种方式都建议**锁定版本**（见下），升级时有意识地换，而不是被动跟着变。

## 下载

| 文件 | 内容 |
|------|------|
| <a href="/spec/presets.json" target="_blank" rel="noopener"><code>presets.json</code></a> | 全部服务商预置 + 按厂商聚合的目录 |
| <a href="/spec/conformance/endpoint.json" target="_blank" rel="noopener"><code>conformance/endpoint.json</code></a> | 端点拼接 |
| <a href="/spec/conformance/model_filter.json" target="_blank" rel="noopener"><code>conformance/model_filter.json</code></a> | 模型清单清洗 |
| <a href="/spec/conformance/models_response.json" target="_blank" rel="noopener"><code>conformance/models_response.json</code></a> | `/models` 响应解析（id 与限额） |
| <a href="/spec/conformance/diagnose.json" target="_blank" rel="noopener"><code>conformance/diagnose.json</code></a> | 验证失败的错误判定、必填字段检查 |
| <a href="/spec/conformance/ai_profile.json" target="_blank" rel="noopener"><code>conformance/ai_profile.json</code></a> | `ai.profile` 解析与生成 |
| <a href="/spec/conformance/limits.json" target="_blank" rel="noopener"><code>conformance/limits.json</code></a> | token 限额三层合并 |
| <a href="/spec/conformance/preset_lookup.json" target="_blank" rel="noopener"><code>conformance/preset_lookup.json</code></a> | 从已存配置反推预置、查预置登记的限额 |
| <a href="/spec/conformance/history.json" target="_blank" rel="noopener"><code>conformance/history.json</code></a> | 超长报错识别 |

### 最新版与固定版本

| 地址 | 用途 |
|------|------|
| `https://ai-profile.ruoyi.plus/spec/…` | **最新版**，跟着 crate 发版变 |
| `https://ai-profile.ruoyi.plus/spec/v0.1.1/…` | **固定版本**，发布后不再改动。自动下载、写进构建脚本时用这个 |
| <a href="/spec/versions.json" target="_blank" rel="noopener"><code>/spec/versions.json</code></a> | 已有版本清单：`{"latest": "0.1.1", "versions": [...]}` |

最稳妥的做法是把整个目录复制进你的仓库（`spec/`），记下来源版本 —— 构建不依赖网络，
升级时整体替换、看哪些用例红了，红掉的就是这次规则变化的全部内容。

## 实现范围

「必要性」按你要做的功能看：只做服务商下拉，前两行就够了。

| 功能 | 要实现的函数（用例里的 `fn`） | 用例 | 什么时候需要 |
|------|----------------------|------|-------------|
| 预置数据 | `presets` / `preset_by_key` / `vendors` | 无，直接读 `presets.json` | 所有场景 |
| 端点拼接 | `join_api_path` / `join_chat_endpoint` / `anthropic_base_url` / `ends_with_version_segment` | `endpoint.json` | 发任何请求 |
| 反推预置 | `infer_preset_key` / `model_limits` | `preset_lookup.json` | 打开老配置时认出是哪家、取预置限额 |
| 模型清洗 | `is_chat_model_id` / `clean_fetched_models` | `model_filter.json` | 做「获取模型」下拉 |
| `/models` 解析 | `parse_models_response`（= Rust 的 `parse_model_ids` + `parse_model_limits`，结果合成 `{ids, limits}`） | `models_response.json` | 同上 |
| 错误判定 | `diagnose` / `suggest_url` / `check_required_fields` | `diagnose.json` | 做「测试连接」 |
| 测试连接 | `verify` | 无，按[下面的流程](#测试连接的网络层)把上面几个串起来 | 做「测试连接」 |
| 导入导出 | `parse_profiles` / `to_profile` | `ai_profile.json` | 做粘贴导入、分享 |
| 限额 | `merge_limits`（= 从左往右折叠 Rust 的 `TokenLimits::or`） | `limits.json` | 显示上下文窗口 / 输出上限 |
| 超长识别 | `is_context_overflow` | `history.json` | 对话报错后决定要不要裁历史重试 |
| 历史裁剪、生图 / 视频 / 配音调用 | `trim_history` / `media` 模块 | **暂无** | 见[未覆盖的部分](#未覆盖的部分) |

函数名、参数名在你的语言里按惯例改（`join_api_path` → `joinApiPath`），行为一致即可。

::: warning 先读每个用例文件的 description 和 rules
- **`description` 是完整规则**：处理顺序、边界值（比如 `parse_profiles` 先查版本再查 kind、
  `suggest_url` 只认字面的 `/v1beta/` 与 `/v1/`）。用例只是抽样，光看用例会有多种读法。
- **`rules` 是规则用到的数据表**：模型清洗的特征词（`model_filter.json`）、超长报错片段（`history.json`）、
  限额字段名（`models_response.json`）。**实现时读这张表，不要对着用例凑** ——
  第一次外部试写就是这样：用例全过，凑出来的词表却把 `FLUX.1-dev` 判成了对话模型。
:::

### 只用数据

`presets.json` 里的 `vendors` 是全部 kind 的聚合。只做对话的应用应当先按 kind 筛预置，再按
`vendorId` 聚合 —— 直接用 `vendors` 的话，里面会混着「只提供视频」的厂商和你不支持的 `presetKeys`。

```python
chat = [p for p in spec["presets"] if p["kind"] == "chat"]
by_vendor = {}
for p in chat:                       # 保持原数组顺序 = 分组顺序
    by_vendor.setdefault(p["vendorId"], []).append(p)
```

字段含义见[预置与服务商目录](/api/preset)。

### 测试连接的网络层

`verify` 发网络请求，没法写成用例，但它只是把几个有用例的纯函数串起来。按这个顺序实现：

1. **发请求前**：`check_required_fields(presetKey, extra)`，缺字段直接返回 `missing_extra_field`
   —— 更好的做法是用它禁用「测试」按钮。
2. **定地址**：表单填了 `base_url` 用表单的，没填用预置的；都为空返回
   `{"code": "missing_extra_field", "key": "base_url"}`。
   Anthropic 协议先过 `anthropic_base_url`，然后 `url = join_api_path(base, "models")`。
3. **发 GET**，超时 20 秒（连接 10 秒），**禁止跟随重定向**：

   | 协议 | 请求头 | 密钥为空时 |
   |------|--------|-----------|
   | OpenAI 兼容 | `Authorization: Bearer <key>` | 不带这个头（本地 Ollama / vLLM 常不校验密钥） |
   | Anthropic | `x-api-key: <key>` + `anthropic-version: 2023-06-01` | 只带 `anthropic-version` |

   ::: danger 为什么必须禁重定向
   HTTP 库跨域跳转时通常只剥 `Authorization` 这类标准头，**不剥自定义头** ——
   Anthropic 的 `x-api-key` 会被原样发给跳转目标。
   :::
4. **连不上 / 超时** → `{"code": "unreachable", "proxy_hint": …}`。`proxy_hint` 表示「这个域名在国内通常要代理」，
   Rust 版对 `api.openai.com`、`api.anthropic.com`、`generativelanguage.googleapis.com`、`openrouter.ai`、
   `api.groq.com`、`api.x.ai` 置为 `true`。
5. **非 2xx** → `diagnose(status, body, url, base)`，其中 `base` 用第 2 步补过 `/v1` 的那个。
6. **2xx** → 组装成功结果：

   ```json
   {
     "latencyMs": 320,
     "models": ["…清洗后的清单"],
     "dropped": 2,
     "droppedModels": ["…被滤掉的"],
     "modelInList": true,
     "limits": { "contextWindow": 128000, "maxOutput": 8192, "source": "endpoint" },
     "modelLimits": [["deepseek-flash", { "contextWindow": 128000, "maxOutput": 8192, "source": "endpoint" }]]
   }
   ```

   - `models` / `dropped` / `droppedModels`：`clean_fetched_models(parse_model_ids(body))`
   - `modelInList`：当前填的 model 为空、或清单为空、或在清单里 → `true`。
     **模型不在清单里不算失败**，界面据此提示「端点没有这个模型，要换一个吗」
   - `limits`：`parse_model_limits(body)` 里当前 model 那一条，没有就是 `null`
   - `modelLimits`：`parse_model_limits(body)` 的全部结果，**每项是 `[id, 限额]` 二元数组**
     （注意与 `models_response.json` 用例里的 `{id, limits}` 写法不同，这里照线格式输出）

错误对象的字段与各自该给用户的动作见[错误码对照](/reference/errors)。

### 未覆盖的部分

- **历史裁剪**（`trim_history`）：规则见[历史裁剪与超长重试](/api/history)，目前没有用例（超长识别有），
  请对照 Rust 源码的测试实现。这部分最容易出错的是「tool 调用与结果必须成对保留」。
- **生图 / 视频 / 配音**（`media`）：本质是对各家 HTTP 协议的封装，每家请求格式不同，写成用例意义不大。
  协议细节见[生图、视频与配音](/api/media)与 crate 源码 `src/media/`。

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
  🔴 当心语言里的宽松相等：Python 的 `True == 1`、`1 == 1.0` 都成立，会放过类型错误 ——
  先把两边规范化成 JSON 文本（键排序）再比。
- 返回空的 `Result` 写成 `{"ok": null}`。
- 用例可能带 `"ignore": ["error.detail"]`：比较前从两边删掉这些路径。目前只用于 `invalid_json`
  的 `detail` —— 那是 Rust JSON 库的报错原文，别的语言不可能逐字复现，只要求 `code` 一致。
- `check_required_fields` 的 `extra` 在用例里写成 `[{key, value}]`。

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

def canon(v):
    # 规范化后再比：避免 True == 1、1 == 1.0 这类宽松相等放过类型错误
    return json.dumps(v, sort_keys=True, ensure_ascii=False)

def drop(v, path):
    # 处理用例的 "ignore"：删掉 "error.detail" 这样的路径
    *parents, last = path.split(".")
    for p in parents:
        v = v.get(p, {}) if isinstance(v, dict) else {}
    if isinstance(v, dict):
        v.pop(last, None)

@pytest.mark.parametrize("case", spec["cases"], ids=lambda c: f'{c["fn"]}:{c["input"]}')
def test_endpoint(case):
    got, want = FNS[case["fn"]](case["input"]), case["expected"]
    for path in case.get("ignore", []):
        drop(got, path); drop(want, path)
    assert canon(got) == canon(want)
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

**一条用例都别跳过。** 跳过的那条往往正是规则里最反直觉的地方（比如 Anthropic 补 `/v1` 而 OpenAI 兼容不补）。

## 用 AI 实现

用例本身就是最好的需求说明：AI 照着写、跑测试、看哪条红、再改，直到全绿。把下面这段连同用例文件一起交给它：

```text
请用 <语言> 实现 ai-profile 的 <功能，如：端点拼接 + 获取模型 + 测试连接>。

规范与用例：
- 实现说明：https://ai-profile.ruoyi.plus/reference/spec.md
- 用例文件已放在本仓库 spec/ 目录（来自 https://ai-profile.ruoyi.plus/spec/v0.1.1/）

要求：
1. 先读实现说明的「实现范围」与「测试连接的网络层」两节，再动手
2. 为每个 conformance/*.json 写一个参数化测试，按 JSON 值比较 expected，一条都不许跳过
3. 不许修改用例文件来让测试通过；觉得某条期望值不合理就停下来告诉我
4. 预置数据运行时读 spec/presets.json，不要把服务商清单抄进代码
5. 全部用例通过后，列出你实现了哪些函数、哪些没实现（按实现说明里的表）
```

第 3 条最要紧：AI 遇到过不去的用例，最省事的做法就是改用例。

## 跟进更新

- 发版记录在 [更新日志](/reference/changelog)，也可以在 GitHub 上 Watch
  [bkywksj/ai-profile](https://github.com/bkywksj/ai-profile) 的 Releases。
- 升级 = 把 `spec/` 换成新版本目录 → 跑测试 → 修红掉的。
- `specVersion` 变了说明格式有调整，先看更新日志再动手。
- 预置数据（新增服务商、模型换代）是更新最频繁的部分；只用数据的场景，跟得越勤越好。

## 规则摘要

用例是权威，这里只帮你读懂用例在测什么。各规则的设计理由见对应的 API 页。

| 规则 | 要点 | 详见 |
|------|------|------|
| 端点拼接 | OpenAI 兼容地址**原样使用**，不补 `/v1`；只剥掉误填的对话端点后缀与末尾 `#`。Anthropic 协议是唯一例外：末段不是 `v<数字>` 就补 `/v1`，末尾 `#` 表示别补 | [端点与模型清单](/api/endpoint) |
| 模型清洗 | 排除法：只滤掉带明确非对话特征的（向量、重排、语音、生图、OCR、审核…），**未知名称一律放行**；去空白、去重、保持顺序；全被滤光时原样返回 | [端点与模型清单](/api/endpoint) |
| `/models` 解析 | `{"data":[…]}` 与裸数组都接受；限额只收录报了的模型，OpenRouter 优先取 `top_provider` | [限额](/api/limits) |
| 错误判定 | 401/403 → `auth_failed`；404 → `not_found`（看不出版本段时带 `suggested_url`）；其余 → `malformed`。必填专有字段缺失 → `missing_extra_field` | [连通性验证](/api/verify) |
| `ai.profile` | 解析**宽进**（多种字段拼写、单条与打包统一成列表、OAuth 条目跳过计数）；生成**严出**（只产出规范写法） | [ai.profile 协议](/api/protocol) |
| 限额合并 | 用户 > 端点 > 预置，两两合并：高层全空时整条换成低层；否则逐字段补空，来源保留高层 | [限额](/api/limits) |

`model_not_found`、`protocol_mismatch` 两个错误码已在格式里预留，但目前 Rust 版不会产生，实现时可以先不管。

## 边界

- **不要改用例去迁就实现。** 觉得某条期望值不合理，请到
  [crate 仓库](https://github.com/bkywksj/ai-profile/issues)提 issue —— 规则改在 Rust 版，
  重新生成后所有语言一起跟上。
- 目前没有官方维护的其他语言实现。你写了一个，欢迎告诉我们，会列进本页。

## 相关

- [ai.profile 协议](/api/protocol) —— 格式定义与「给其它实现者」的约定
- [版本策略](/reference/versioning) —— 什么改动会让期望值变化
- [用 AI 接入](/guide/ai-assisted) —— Rust 项目用 AI 接入本库
