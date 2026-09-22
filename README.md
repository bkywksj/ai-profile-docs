# ai-profile-docs

[ai-profile](https://github.com/bkywksj/ai-profile) 的文档站点。VitePress 1.6 构建。

## 本地开发

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # 产物在 docs/.vitepress/dist
pnpm preview      # 预览构建产物
```

## 目录

```
docs/
├── index.md                    首页
├── guide/                      指南：介绍 / 安装 / 快速开始 / Tauri 接入 / 前端对接
├── api/                        API 参考：预置 / 验证 / 协议 / 端点
└── reference/                  参考：服务商清单 / 错误码 / 版本策略 / 加 provider
```

## 🔴 providers.md 不要手改

`docs/reference/providers.md` 是**生成物**，来源链条是：

```
crate 的 preset/*.rs
   ↓  cargo xtask gen-docs
ai-profile/docs/providers.md
   ↓  scripts/sync-providers.py
本仓库 docs/reference/providers.md
```

手改会让它变成第二份会漂移的数据源 —— 而 ai-profile 存在的全部理由
正是消掉重复数据源。改预置请改 crate 里的 `preset/*.rs`。

同步命令（主仓库更新预置后跑一次）：

```bash
python scripts/sync-providers.py ../ai-profile docs/reference/providers.md
```

## 部署

推送到远程后由托管平台自动构建。构建配置：

| 项 | 值 |
|---|---|
| 构建命令 | `pnpm build` |
| 输出目录 | `docs/.vitepress/dist` |
| Node 版本 | ≥ 18 |

部署失败先在本地 `pnpm build` 复现。

## 站点域名

配置在 `docs/.vitepress/config.ts` 顶部的 `SITE` 常量，
canonical / og:url / sitemap 都从它派生 —— **换域名只改这一处**。
