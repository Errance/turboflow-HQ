# v2.1 - SIG Odds Data API

状态：Pending review  
项目：足球预测市场项目  

## 版本目的

v2.1 定义 SIG 足球赔率数据接入协议，覆盖系列赛 code、比赛级 / 系列赛级 market code、WebSocket 实时赔率推送、REST 快照兜底、鉴权、心跳和验收 case。

本版本在原 v2 SIG odds data API 基础上新增 `polymarket_event_id`，用于将 SIG 比赛事件映射到 Polymarket event slug / event ID。

## 主要改动

- 新增可选字段 `polymarket_event_id`。
- 明确 `polymarket_event_id` 不替代 `sig_match_id`。
- 明确 `polymarket_event_id` 不参与 SIG adapter 去重。
- 保留 TurboFlow 使用 `(league_code, sig_match_id, market_code, at_ms)` 做去重 + 排序。

## 文件索引

| 类型 | 状态 | 文件 | 说明 |
| --- | --- | --- | --- |
| 需求文档 | TBD | [需求文档 - SIG odds data API v2.1 TBD.md](<需求文档 - SIG odds data API v2.1 TBD.md>) | 版本级需求文档占位，待从项目背景中整理 |
| API 文档 CN | Pending review | [API文档 - SIG odds data API v2.1 CN.md](<API文档 - SIG odds data API v2.1 CN.md>) | SIG 足球赔率接入中文 API 文档 |
| API 文档 EN | Pending review | [API文档 - SIG odds data API v2.1 EN.md](<API文档 - SIG odds data API v2.1 EN.md>) | SIG 足球赔率接入英文 API 文档 |
| 项目背景 | Reference | [../足球预测市场.md](<../足球预测市场.md>) | 项目背景、原始文档链接和进度记录 |

## 当前注意事项

- 本版本面向 SIG / legacy vendor odds feed。
- 多 Vendor quote book 和 routing 规则不在本版本内，见 [../v2.2 - 多Vendor赔率路由方案/Index.md](<../v2.2 - 多Vendor赔率路由方案/Index.md>)。

## Progress

- [x] `2026-05-25 15:59 +08` 建立 v2.1 版本目录索引，纳入 SIG odds data API CN / EN 文档。
- [x] `2026-05-25 15:59 +08` 补充版本级需求文档 `TBD` placeholder，后续从项目背景中整理。
