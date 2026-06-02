# 足球预测市场项目 Index

## Original Docs

当前文档链接：[https://www.notion.so/2026-03-07-33325ba7e7958071a2c7eebec639e21e](https://www.notion.so/2026-03-07-33325ba7e7958071a2c7eebec639e21e)  
demo：[https://errance.github.io/TurboFlow/soccer](https://errance.github.io/TurboFlow/soccer)

内部开发同步文档：
https://tf-team-vbfwtqkg.atlassian.net/wiki/spaces/T/pages/28180743/Vendor?atlOrigin=eyJpIjoiOWViNDIxOTlhMjI5NGYwMDg5MmRhNmYwYjQ5ZTM0ODYiLCJwIjoiYyJ9

对外 API 文档 - 做市商 CN：
https://tf-team-vbfwtqkg.atlassian.net/wiki/spaces/T/pages/28246216/Vendor?atlOrigin=eyJpIjoiZTMyNzY4Nzc1NDdhNDNkOThhNjA0ODQxZDc2ZGZjZjkiLCJwIjoiYyJ9

## 版本目录

| 版本 | 状态 | 目录 | 进度 / 说明 |
| --- | --- | --- | --- |
| v2.1 | Pending review | [v2.1 - SIG odds data API/Index.md](<v2.1 - SIG odds data API/Index.md>) | 需求文档 TBD；CN API Pending review；EN API Pending review。SIG football odds data API，新增 `polymarket_event_id` |
| v2.2 | Ready for review | [v2.2 - 多Vendor赔率路由方案/Index.md](<v2.2 - 多Vendor赔率路由方案/Index.md>) | 需求文档 Done；CN API Ready for review；EN API Ready for review。Football multi-vendor quote book、best quote routing、5 分钟报价有效期、Vendor `best_quote` 订阅；当前 v2.2.4 API 文档覆盖 SIG odds WebSocket stream、REST fallback、Ed25519 鉴权、buy/sell 双边赔率、Polymarket `events[]` / slug 快照、`polymarket_event_slug` 精确匹配字段、fallback `event_slug` 规则与 WS 单 outcome 推送；v2.2.2 patch TODO：按 trading pair / market 配置单笔与 rolling window 交易量保护 |
| v2.3 | Draft | [v2.3 - 二级分销池渠道隔离升级/Index.md](<v2.3 - 二级分销池渠道隔离升级/Index.md>) | 二级分销池渠道隔离升级。渠道独立身份域、独立资金域、足球预测渠道 markup、分销池路由开关、渠道收入与池子盈亏对账 |

## 项目背景

| 文件 | 说明 |
| --- | --- |
| [足球预测市场.md](<足球预测市场.md>) | 原始项目背景、Notion 链接、demo 链接和早期进度 |
| [用户端API文档-football-markets.md](<用户端API文档-football-markets.md>) | 内部抓取整理的用户端 API 记录 |
| [External Developer Handover - Football Prediction Market User API EN.md](<External Developer Handover - Football Prediction Market User API EN.md>) | 可交付外部开发者的用户侧赛事、盘口与实时赔率 API handover |
| [../../../../qa-grocery/products/football-prediction-market/simulators/polymarket-quote-bridge/README.md](<../../../../qa-grocery/products/football-prediction-market/simulators/polymarket-quote-bridge/README.md>) | Polymarket quote bridge API test 已迁移到 `qa-grocery`：从 Polymarket 拉取 orderbook 价格并按 TF vendor feed v2.2.4 单 outcome 帧推送 |

## Progress

- [x] `2026-06-02 09:45 +08` 新增 Polymarket quote bridge API test，后续已迁移到 `qa-grocery/products/football-prediction-market/simulators/polymarket-quote-bridge/`：连接 TF vendor feed，读取 `market_info`，按 `polymarket_event_slug` / `event_slug` 匹配 Polymarket market slug，拉取 Gamma / CLOB 价格并推送 `buy_decimal_odds` / `sell_decimal_odds` 单 outcome quote frame。
- [x] `2026-06-01 13:26 +08` 根据足球预测市场 v2.2.4 CN API 文档覆盖 EN 翻译，并同步 `match_id`、`polymarket_event_slug`、盘口 `status`、fallback `event_slug`、SLA 与字段词典；同步更新 v2.2 索引。
- [x] `2026-06-01 10:31 +08` 新增 external developer handover：整理用户侧 REST 赛事 / 盘口接口、`ws/rfq` 实时赔率订阅、heartbeat 与前端接入流程。
- [x] `2026-05-30 01:02 +08` 根据新增足球预测市场 v2.2.3 CN API 文档创建 EN 翻译，并同步 v3.4 单 outcome WebSocket 推送与 v3.5 `market_info` / `/api/v1/vendor/markets` `events[]` + Polymarket slug 结构。
- [x] `2026-05-29 22:44 +08` 根据 2026-05-29 更新后的足球预测市场 v2.2 CN API 文档覆盖 EN 翻译，并同步 Ed25519 鉴权、buy/sell 双边赔率、`market_info` 首帧与 `/api/v1/vendor/markets`。
- [x] `2026-05-27 16:03 +08` 在足球预测市场 v2.2 需求文档中新增 v2.2.2 patch TODO：按 trading pair / market 配置单笔 500U 与 5 秒 rolling window 全平台 2000U 交易量保护。
- [x] `2026-05-26 16:32 +08` 根据再次更新后的 v2.2 CN API 文档覆盖 EN 翻译，并同步 v3.2.1 凭据、入口、代理与鉴权说明。
- [x] `2026-05-26 15:58 +08` 根据更新后的 v2.2 CN API 文档覆盖 EN 翻译，并同步 mandatory `polymarket_event_id` 说明。
- [x] `2026-05-25 17:22 +08` Review engineering-provided v2.2 CN API document, normalize filename, create EN translation, and update v2.2 status.
- [x] `2026-05-25 17:02 +08` 新增 v2.3 二级分销池渠道隔离升级目录，并接入统一 PRD。
- [x] `2026-05-25 17:02 +08` 明确足球预测市场 v2.3 支持渠道 markup、分销池路由开关、渠道独立身份域与独立资金域。
- [x] `2026-05-25 15:59 +08` 按版本目录规范更新项目 index，补充每个版本的状态和进度摘要。
- [x] `2026-05-25 15:59 +08` 为 v2.1 需求文档、v2.2 CN API、v2.2 EN API 创建 `TBD` placeholder 文件。
- [x] `2026-05-22` 新增足球预测市场多 Vendor odds routing 方案。
- [x] `2026-05-22` 复用事件合约多 Vendor 规则：同价先到先赢、上一笔报价 5 分钟内持续有效、Vendor privileged `best_quote` 订阅。
- [x] `2026-05-22` 明确 `best_quote` 不暴露 winning Vendor 身份或竞争 Vendor 明细。
- [x] `2026-05-21` 在 SIG API 中新增 `polymarket_event_id` 需求，用于匹配 Polymarket event slug，例如 `cry-ars-2026-05-24`。
- [x] `2026-05-19` 完成预测市场足球 Game API 的初步确定。
- [ ] `2026-05-19` 等待最终 API Spec，并整合成给 SIG 使用的集成文档。
