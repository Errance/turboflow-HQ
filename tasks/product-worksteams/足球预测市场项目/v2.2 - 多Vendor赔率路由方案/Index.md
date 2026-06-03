# v2.2 - 多 Vendor 赔率路由方案

状态：Current draft  
项目：足球预测市场项目  

## 版本目的

v2.2 在 v2.1 SIG football odds API 之上，补充足球预测市场的多 Vendor quote book、best quote routing、同价先到先赢、报价有效期和 Vendor `best_quote` 订阅能力。

本版本不替代 SIG 专用 API 文档。SIG API 仍作为 SIG adapter / legacy vendor contract 使用。

## 主要改动

- 新增 football multi-vendor quote book 与 routing key。
- 使用 `football_event_id + market_code + outcome_key` 作为跨 Vendor routing key。
- 新增 `polymarket_event_id` 作为必填 Polymarket event 映射；同一 `sig_match_id` 生命周期内必须稳定，无对应 event 时使用 `pm:none:<sig_match_id>` 占位。
- 新增 first-in-first-win 同价规则。
- 新增上一笔 quote 5 分钟内持续有效规则。
- 新增 Vendor privileged `best_quote` subscription。
- 明确 `best_quote` 不暴露 winning Vendor 身份、Vendor event ID 或竞争 Vendor 明细。
- v2.2.2 patch TODO：按 trading pair / market 增加 `single_trade_max_usd`、`rolling_volume_max_usd`、`rolling_window_seconds` 三个可配置交易量保护变量。

## 文件索引

| 类型 | 状态 | 文件 | 说明 |
| --- | --- | --- | --- |
| 需求文档 | Done | [需求文档 - 多Vendor赔率路由方案 v2.2.md](<需求文档 - 多Vendor赔率路由方案 v2.2.md>) | 当前 v2.2 多 Vendor 赔率路由设计方案 |
| API 文档 CN v2.2 | Ready for review | [API文档 - 多Vendor赔率路由方案 v2.2 CN.md](<足球预测市场做市商赔率报价接口 v2.2 CN.md>) | 工程团队提供的足球预测市场做市商赔率报价接口，覆盖 SIG odds WebSocket stream、REST 兜底、Ed25519 鉴权、buy/sell 双边赔率与 Polymarket-style `market_info` slug 快照 |
| API 文档 EN v2.2 | Ready for review | [API文档 - 多Vendor赔率路由方案 v2.2 EN.md](<足球预测市场做市商赔率报价接口 v2.2 EN.md>) | 已按 2026-05-29 更新后的 CN API 文档覆盖翻译，包含 `API-KEY / SIGN / TIMESTAMP`、`buy_decimal_odds` / `sell_decimal_odds`、Polymarket-style `market_info` slug schema 与 `/api/v1/vendor/markets` |
| API 文档 CN v2.2.4 | Ready for review | [足球预测市场做市商赔率报价接口v2.2.4 CN.md](<足球预测市场做市商赔率报价接口v2.2.4 CN.md>) | 2026-06-01 更新版，补充 `match_id`、`polymarket_event_slug`、盘口 `status`、未确认 Polymarket event 时的 fallback `event_slug` 规则、UAT endpoint `api.turboflow-test.xyz`，以及最新 Ed25519 Header 鉴权说明 |
| API 文档 EN v2.2.4 | Ready for review | [足球预测市场做市商赔率报价接口 v2.2.4 EN.md](<足球预测市场做市商赔率报价接口 v2.2.4 EN.md>) | 已按 v2.2.4 CN 文档覆盖翻译，覆盖 v3.4 单 outcome 帧、v3.5 `market_info` / `/api/v1/vendor/markets` events 结构、UAT endpoint `api.turboflow-test.xyz`、Polymarket slug 精确匹配字段与 SLA / 字段词典 |
| 上一版本 API | Reference | [../v2.1 - SIG odds data API/Index.md](<../v2.1 - SIG odds data API/Index.md>) | SIG odds data API v2.1 文档入口 |

## 当前注意事项

- 需求文档仍描述多 Vendor quote book / routing 设计。
- 当前 API 文档来自工程团队，主要定义 vendor odds feed 合同；最新 v2.2.4 文档已切换为 Ed25519 签名鉴权、buy/sell 双边赔率、连接后首帧 Polymarket-style `market_info` slug 快照、`events[]` 结构、`polymarket_event_slug` 精确匹配字段、fallback `event_slug` 规则，以及 WebSocket 单 outcome 推送。
- 如后续工程补充 `best_quote` subscription 或多 Vendor route 查询接口，需要在本版本 API 文档中继续追加。

## Progress

- [x] `2026-06-03 16:05 +08` 将足球预测市场 v2.2 / v2.2.4 CN / EN API 文档中的 UAT endpoint 统一更新为 `api.turboflow-test.xyz`。
- [x] `2026-06-01 13:26 +08` 根据 v2.2.4 CN API 文档覆盖 EN 翻译；同步 `match_id`、`polymarket_event_slug`、盘口 `status`、未确认 Polymarket event 时的 fallback `event_slug` 规则、SLA 与字段词典。
- [x] `2026-05-30 01:02 +08` 根据新增 v2.2.3 CN API 文档创建 EN 翻译；同步 v3.4 单 outcome WebSocket 推送与 v3.5 `market_info` / `/api/v1/vendor/markets` `events[]` + Polymarket slug 结构。
- [x] `2026-05-29 23:20 +08` 更新 CN / EN API 文档的 `market_info` schema：从 flat `markets[]` 改为 `events[] -> market_groups[] -> markets[]`，每个 binary market 携带 Polymarket-style `slug`。
- [x] `2026-05-29 22:44 +08` 根据 2026-05-29 更新后的 CN API 文档覆盖 EN 翻译；同步 Ed25519 鉴权、buy/sell 双边赔率、`market_info` 首帧与 `/api/v1/vendor/markets` 查询能力。
- [x] `2026-05-27 16:03 +08` 在需求文档中新增 v2.2.2 patch TODO：按 trading pair / market 配置单笔 500U、5 秒 rolling window 全平台 2000U 的交易量保护规则。
- [x] `2026-05-26 16:32 +08` 根据再次更新后的 CN API 文档覆盖 EN 翻译；补充 Integration Entry、`vendor_api_keys`、SIT credential handoff、cex-api-service reverse proxy、v3.2.1 changelog。
- [x] `2026-05-26 15:58 +08` 根据更新后的 CN API 文档覆盖 EN 翻译；同步 mandatory `polymarket_event_id` 与 v3.1 changelog。
- [x] `2026-05-25 17:22 +08` 将工程团队提供的 CN API 文档按命名规范重命名为 `API文档 - 多Vendor赔率路由方案 v2.2 CN.md`。
- [x] `2026-05-25 17:22 +08` 根据最新 CN API 文档创建 EN 翻译，并更新 CN / EN 状态为 Ready for review。
- [x] `2026-05-25 15:59 +08` 建立 v2.2 版本目录索引，纳入需求文档并标记 API 文档状态。
- [x] `2026-05-25 15:59 +08` 新增 CN / EN API 文档 `TBD` placeholder，等待 Developer 实现文档和后续翻译。
