# v2.2 - 多 Vendor 流动性路由方案

状态：Ready for review  
项目：事件合约（猜涨跌）  

## 版本目的

v2.2 将事件合约 / 猜涨跌从单一 SIG/SCB 报价源，升级为多 Vendor 主动推送报价、TurboFlow 内部维护 quote book、下单时按最优报价路由到对应 Vendor 专属 liquidity pool 的方案。

## 主要改动

- 新增 TurboFlow inbound WebSocket quote API，Vendor 主动推送报价。
- 建立 normalized quote book，支持多 Vendor 同时报价。
- 下单时服务端重新执行 routing，并锁定选中的 Vendor quote 和 liquidity pool。
- 新增同价先到先赢规则。
- 新增上一笔报价 5 分钟内持续有效规则。
- 新增 Vendor heartbeat / liveness 要求。
- 新增具备报价权限 Vendor 的 `best_quote` 订阅能力。
- `best_quote` 不暴露 winning Vendor 身份、竞争 Vendor 明细或 second-best quote。
- v2.2.2 patch TODO：按 trading pair 增加 `single_trade_max_usd`、`rolling_volume_max_usd`、`rolling_window_seconds` 三个可配置交易量保护变量。

## 文件索引

| 类型 | 状态 | 文件 | 说明 |
| --- | --- | --- | --- |
| 需求文档 | Done | [需求文档 - 多vendor流动性路由方案 v2.2.md](<需求文档 - 多vendor流动性路由方案 v2.2.md>) | 当前 v2.2 方案说明、背景、目标、代码链路调查与推荐架构 |
| API 文档 CN | Ready for review | [API文档 - 多vendor流动性路由方案 v2.2 CN.md](<API文档 - 多vendor流动性路由方案 v2.2 CN.md>) | 已按最新 EN API 文档同步翻译，包含 Ed25519 `API-KEY / SIGN / TIMESTAMP` 鉴权、外部 UAT endpoint `api.turboflow-test.xyz` 与各类 WebSocket message 示例 |
| API 文档 EN | Ready for review | [API文档 - 多vendor流动性路由方案 v2.2 EN.md](<API文档 - 多vendor流动性路由方案 v2.2 EN.md>) | English source refreshed with TurboFlow API auth, fresh signature generation, UAT `api.turboflow-test.xyz`, explicit `best_quote` subscribe payload, and message examples for every `type` |
| Live odds API sample | Done | [live-odds-api/README.md](<live-odds-api/README.md>) | 当前官网事件合约列表、Higher/Lower return rate 与实时 open-interest quote 抓取说明和 Node sample |

## 当前注意事项

- 文件夹版本为 v2.2，表示当前产品迭代版本。
- CN / EN API 文档当前均按 engineering v2.2 外部接口文档维护；2026-06-03 已升级为 TurboFlow API Ed25519 鉴权方式，并补充各类消息示例。
- v2.1 及更早期文档已归档到 [../v2.1 - 多vendor流动性路由方案早期版本/Index.md](<../v2.1 - 多vendor流动性路由方案早期版本/Index.md>)。

## Progress

- [x] `2026-06-03 16:05 +08` 将事件合约 v2.2 CN / EN API 文档中的外部 UAT endpoint 统一更新为 `api.turboflow-test.xyz`，并移除外部文档中的 SIT endpoint 暴露。
- [x] `2026-06-03 10:42 +08` 更新事件合约 v2.2 EN API 文档鉴权方式为 TurboFlow Ed25519 `API-KEY / SIGN / TIMESTAMP`，补充每类 WebSocket message 示例；同步翻译覆盖 CN 文档。
- [x] `2026-05-29 12:15 +08` 新增官网事件合约 live odds API sample，包含 REST config、WebSocket 订阅和 Node probe script。
- [x] `2026-05-27 16:03 +08` 在需求文档中新增 v2.2.2 patch TODO：按 trading pair 配置单笔 500U、5 秒 rolling window 全平台 2000U 的交易量保护规则。
- [x] `2026-05-27 14:18 +08` 以更新后的 v2.2 EN API 为源同步 CN 翻译，并将 SIT / UAT endpoint 更新为 shared endpoint reference。
- [x] `2026-05-27 14:04 +08` 根据升级后的 v2.2 CN API 文档覆盖 EN 翻译，同步 HMAC 鉴权、`quote_batch`、`best_quote`、heartbeat、错误码与限流说明。
- [x] `2026-05-25 16:27 +08` Review engineering-provided v2.2 CN API document and create aligned EN translation.
- [x] `2026-05-25 16:27 +08` Update v2.2 file statuses: CN API and EN API are now ready for review.
- [x] `2026-05-25 15:59 +08` 建立 v2.2 版本目录索引，列出需求文档、CN API 文档和 EN API TBD 占位文件。
- [x] `2026-05-25 15:59 +08` 将缺失的 EN API 文档补为 `TBD` placeholder，避免版本目录出现空缺。
