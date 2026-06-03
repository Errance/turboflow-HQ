# 猜涨跌 - 流动性池相关 Index

## 项目目标

将猜涨跌从单一 SIG/SCB 报价源升级为多数据供应商报价模式。

核心选择逻辑：价格优先，即谁给的报价更高，订单优先使用谁家的 liquidity route。

## 版本目录

| 版本 | 状态 | 目录 | 进度 / 说明 |
| --- | --- | --- | --- |
| v2.1 | Superseded | [v2.1 - 多vendor流动性路由方案早期版本/Index.md](<v2.1 - 多vendor流动性路由方案早期版本/Index.md>) | v2.1 及更早期方案已归档；当前接口以 v2.2 为准 |
| v2.2 | Ready for review | [v2.2 - 多vendor流动性路由方案/Index.md](<v2.2 - 多vendor流动性路由方案/Index.md>) | 需求文档 Done；CN API Ready for review；EN API Ready for review。多 Vendor quote push、quote book、best quote routing、Vendor 专属 liquidity pool、`best_quote` 订阅；API 已升级 TurboFlow Ed25519 `API-KEY / SIGN / TIMESTAMP` 鉴权，UAT endpoint 使用 `api.turboflow-test.xyz`，并补充各类 WebSocket message 示例；v2.2.2 patch TODO：按 trading pair 配置单笔与 rolling window 交易量保护 |
| v2.3 | Draft | [v2.3 - 二级分销池渠道隔离升级/Index.md](<v2.3 - 二级分销池渠道隔离升级/Index.md>) | 二级分销池渠道隔离升级。渠道独立身份域、独立资金域、事件合约渠道 markup、收入对账；事件合约订单仍 100% 进入 TF 公共池 |

## 历史 / 参考文档

| 文件 | 说明 |
| --- | --- |
| [v2.1 - 多vendor流动性路由方案早期版本/Index.md](<v2.1 - 多vendor流动性路由方案早期版本/Index.md>) | v2.1 及更早期历史文档归档 |

## 当前平台用户池子创建流程

1. 用户登录 `tf.xyz` 并完成充值。
2. 用户把 UID 信息分享给 TurboFlow。
3. TurboFlow 为客户创建专属独立池子。
4. TurboFlow 将链上池子信息分享给用户，用户可通过链上查询和监控。

## 外部 Vendor 报价方向

当前：与 SIG 拉群或提供文档进行单独对接。
未来：TurboFlow 提供接口，让流动性供应商主动推送和订阅：

- WebSocket quote push
- 多 Vendor 推送
- `best_quote` 订阅

参考原始 feed 文档：
https://peridot-may-b2f.notion.site/Up-down-feed-SCB-TF-349d8bbd2331805f8d81e1462e09ad1e

## Progress

- [x] `2026-06-03 16:05 +08` 统一事件合约外部 API 文档 UAT endpoint 为 `api.turboflow-test.xyz`，外部文档不再暴露 SIT endpoint。
- [x] `2026-06-03 10:42 +08` 更新事件合约 v2.2 CN / EN API 文档：鉴权升级为 TurboFlow Ed25519 签名，并补充 `quote_batch`、`subscribe`、`unsubscribe`、`ack`、`best_quote`、heartbeat 与 error 示例。
- [x] `2026-05-27 16:03 +08` 在事件合约 v2.2 需求文档中新增 v2.2.2 patch TODO：按 trading pair 配置单笔 500U 与 5 秒 rolling window 全平台 2000U 交易量保护。
- [x] `2026-05-27 14:18 +08` 同步事件合约 v2.2 CN API 翻译，并更新 CN / EN 文档中的 SIT / UAT endpoint。
- [x] `2026-05-27 14:04 +08` 根据升级后的事件合约 v2.2 CN API 文档覆盖 EN 翻译，并更新 v2.2 版本索引。
- [x] `2026-05-25 17:02 +08` 新增 v2.3 二级分销池渠道隔离升级目录，并接入统一 PRD。
- [x] `2026-05-25 17:02 +08` 明确事件合约 v2.3 采用渠道独立身份域、独立资金域、渠道 markup；不启用渠道分销池。
- [x] `2026-05-25 16:27 +08` 将 v2.1 和更早期根目录文档归档到 v2.1 目录，并更新项目 index。
- [x] `2026-05-25 16:27 +08` Review engineering-provided v2.2 CN API document, create EN translation, and update version status.
- [x] `2026-05-25 15:59 +08` 按版本目录规范更新项目 index，补充版本状态和每个版本的进度摘要。
- [x] `2026-05-25 15:59 +08` 将 v2.2 缺失的 EN API 文档以 `TBD` placeholder 形式纳入版本目录。
- [x] `2026-05-20` 创建任务追踪：https://tf-team-vbfwtqkg.atlassian.net/browse/TFPJ-335?atlOrigin=eyJpIjoiZDU5ZTBlZTk4N2Y4NGMyMGFjYmVlYWVlYTRhMDA4M2YiLCJwIjoiaiJ9
- [x] `2026-05-20` 完成技术方案对接。
- [ ] `TBD` 确认方案与 UAT 时间，当前预估两天以内。
- [ ] `TBD` 方案确认并上线 UAT 后，给 Tony 与客户对接。
