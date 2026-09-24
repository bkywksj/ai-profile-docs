# 已发布应用的接入迁移

新项目直接按[快速开始](/guide/quick-start)接入即可。本页写给**已经发布过、用户手里存着配置**的应用 ——
换成本库之前，有一件事必须先做：**把存量地址修正成本库的语义**。

## 为什么要修

本库的约定是 base_url **原样使用、不推断版本段**。而几乎每个应用原先的拼接逻辑都会「帮用户补一段」：

| 应用 | 原拼接规则 | 换成本库后会坏的存量地址 |
|---|---|---|
| Reeve | 末段不是版本号就补 `/v1`，末尾 `#` 可禁止 | `https://api.deepseek.com` |
| 知识库 | 同上，但把 `v1.5` 也算版本段 | 同上 |
| 一站通 | 只有主机名时补 `/v1`，带路径就直接拼 | `https://api.anthropic.com` |
| StoryLoom | OpenAI 兼容从不补；**Anthropic** 不以 `/v1` 结尾就补 | `https://api.anthropic.com`、`…/proxy/anthropic` |

这些地址在老版本里一直能用，因为库在背后补了 `/v1`。直接换成本库，它们会全部 404，而用户看不出原因。

::: tip 四家的规则各不相同
上表就是证据：**不能共用一份修正逻辑**。每个应用冻结自己的旧规则，这正是修正逻辑留在应用、不进本库的理由。
:::

## 做法：冻结旧规则 + 对照测试

### 1. 在测试里冻结一份旧规则

把原来的拼接函数**原样**复制进测试模块，改名 `legacy_*`，注释写明「不要改」：

```rust
#[cfg(test)]
mod tests {
    /// 🔴 旧拼接规则的冻结副本，**不要改** —— 它是对照测试的基准
    fn legacy_join(base: &str, path: &str) -> String {
        let b = base.trim().trim_end_matches('/');
        let after_scheme = b.splitn(2, "://").nth(1).unwrap_or(b);
        if after_scheme.contains('/') { format!("{b}/{path}") } else { format!("{b}/v1/{path}") }
    }
}
```

### 2. 写修正函数

输入旧地址，输出「在本库语义下与旧规则等价」的地址；不用改时返回 `None`：

```rust
pub fn fix_legacy_base_url(raw: &str) -> Option<String> {
    let b = raw.trim().trim_end_matches('/');
    if b.is_empty() { return None; }
    let after_scheme = b.split_once("://").map_or(b, |(_, rest)| rest);
    if after_scheme.contains('/') { None } else { Some(format!("{b}/v1")) }
}
```

### 3. 对照测试是判据

对一批真实可能出现的地址、每一条会用到的端点路径，断言**旧规则(原值) == 本库(修正值)**：

```rust
#[test]
fn fixed_url_hits_same_endpoint_as_legacy_rule() {
    for raw in RAWS {
        let fixed = fix_legacy_base_url(raw).unwrap_or_else(|| raw.to_string());
        for path in ["chat/completions", "messages", "models", "embeddings", "images/generations", "audio/speech"] {
            assert_eq!(crate_join(&fixed, path), legacy_join(raw, path), "raw={raw} path={path}");
        }
    }
}
```

这条测试证明的是「升级前后请求的是**同一个地址**」—— 不是「修正后的地址看起来对」。

### 4. 修正必须幂等

修过的地址再修一次必须不变。迁移可能因为崩溃重跑，整库恢复后也可能再跑一遍：

```rust
#[test]
fn fix_is_idempotent() {
    for raw in RAWS {
        if let Some(fixed) = fix_legacy_base_url(raw) {
            assert_eq!(fix_legacy_base_url(&fixed), None);
        }
    }
}
```

带 `#` 这类「禁止推断」标记的地址原样保留 —— 去掉 `#` 再修一次会被补成 `…/v1`。

## 只对旧来源修正

🔴 这是最容易出错的一条：**新数据不能再修**。
用户在新版本里刻意只填主机名（某个服务商就是这么要求的），被你悄悄补上 `/v1`，同样是 404。

| 入口 | 修不修 |
|---|---|
| 数据库升级迁移（一次） | ✅ |
| 整库恢复（备份文件、同步盘） | ✅ 按备份的 schema 版本判断是不是旧数据 |
| 应用自己的旧版导出格式 | ✅ 按信封里的版本 / 标记判断 |
| 新建、编辑 | ❌ |
| `ai.profile` 导入 | ❌ 跨应用协议，来源导出的就是完整地址，按本库语义原样用 |

迁移放进事务：要么全改、要么全不改。

## 协议判断也要冻结

如果旧版按地址猜协议（例如「端点含 anthropic 就走 Anthropic」），迁移里判断「这条是不是 Anthropic 配置」
**也要用旧口径** —— 否则一条旧版当成 Anthropic 用了半年的配置，会因为新口径不同而漏修。

同理，旧版按域名识别的专有协议（例如某个 New API 视频中转站），换成本库后要在迁移里
把标记补进 `extra`（`video_api = newapi`），见[定制服务商目录](/api/catalog#default-extra-预置定死的配置)。

## 上线前的检查

- 拿一份**真实用户库的拷贝**跑迁移（只读原库），看改了哪几条、有没有误伤
- 对照测试覆盖到应用实际会拼的**每一条**路径（对话、模型列表、向量、生图、配音……）
- 迁移跑两遍，结果不变

## 相关章节

- [端点与模型清单](/api/endpoint) —— 本库的拼接规则
- [Tauri 应用接入](/guide/tauri-integration) —— 接入的其余步骤
