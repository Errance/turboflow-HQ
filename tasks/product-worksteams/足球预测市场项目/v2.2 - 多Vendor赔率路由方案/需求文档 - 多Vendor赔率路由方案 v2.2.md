# 足球预测市场多 Vendor 赔率 API 设计方案

版本：v2.2 draft

最后更新：2026-05-22

状态：Proof-of-concept API design，供技术评审、Vendor 对接讨论与后续实现拆解使用；最终字段、鉴权、限流和部署方式以实现评审结果为准。

## 版本记录

进度说明：`[x]` 表示已纳入当前方案；`[ ]` 表示仍在评审或待确认。

| 进度    | 版本     | 日期         | 变更                                                                                                                                                                                                                                                         |
| ----- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[x]` | `v2.1` | 2026-05-21 | - 在 SIG football odds API 中新增可选 `polymarket_event_id`。<br>- 明确 `polymarket_event_id` 不替代 `sig_match_id`，也不参与 SIG adapter dedupe。                                                                                                                           |
| `[ ]` | `v2.2` | 2026-05-22 | - 新增 football multi-vendor quote book 与 routing key。<br>- 新增 first-in-first-win 同价规则。<br>- 新增 last quote remains valid with 5-minute expiry。<br>- 新增 Vendor privileged `best_quote` subscription。<br>- 明确 `best_quote` 不暴露 winning Vendor 身份或竞争 Vendor 明细。 |
| `[ ]` | `v2.2.2 patch` | 2026-05-27 | - TODO：新增按 trading pair / market 配置的交易量保护规则。<br>- TODO：每个 trading pair 增加 `single_trade_max_usd`、`rolling_volume_max_usd`、`rolling_window_seconds` 三个可配置变量。<br>- TODO：默认建议值为单笔最高 `500U`、全平台 rolling window 内最高 `2000U`、rolling window 默认 `5s`。 |

## 1. 目标

足球预测市场当前文档以 SIG 单 Vendor odds feed 为主。多 Vendor 后，TurboFlow 需要在内部建立统一 quote book，并在用户下单时选择当前最优赔率对应的 liquidity route。

本方案补充多 Vendor routing 与 Vendor 订阅能力，不替代现有 SIG 专用 API 文档。SIG 文档仍作为 SIG adapter / legacy vendor contract 使用。

目标：

- 支持多个 Vendor 为同一足球 event / market / outcome 报价。
- 支持服务端选择 best quote。
- 支持同价时 first-in-first-win。
- 支持上一笔报价在 5 分钟内持续有效。
- 支持 Vendor 订阅当前 best quote。
- `best_quote` 返回中不暴露 winning Vendor 身份或竞争 Vendor 明细。

## v2.2.2 Patch TODO：Trading Pair / Market 交易量保护

为避免单个足球预测 market 或对应流动性池在短时间内被过大交易量压垮，足球预测市场需要在每个 trading pair / market 维度增加交易量保护规则。

### 配置变量

| 变量 | 默认建议值 | 说明 |
| --- | --- | --- |
| `single_trade_max_usd` | `500` | 单个 trading pair / market 的单笔交易最高名义金额，单位 U |
| `rolling_volume_max_usd` | `2000` | 单个 trading pair / market 在 rolling window 内全平台累计成交名义金额上限，单位 U |
| `rolling_window_seconds` | `5` | rolling window 时间窗口，单位秒 |

### 校验规则

- [ ] TODO：在用户下单前，按 trading pair / market 校验 `single_trade_max_usd`。
- [ ] TODO：在用户下单前，按 trading pair / market 统计 `rolling_window_seconds` 内全平台累计成交量，并校验 `rolling_volume_max_usd`。
- [ ] TODO：rolling window 应覆盖全平台同一 trading pair / market 的订单，而不是只按单用户、单 Vendor 或单 pool 统计。
- [ ] TODO：如果单笔金额超过 `single_trade_max_usd`，订单应被拒绝，并返回可识别错误码，例如 `SINGLE_TRADE_LIMIT_EXCEEDED`。
- [ ] TODO：如果 rolling window 总量超过 `rolling_volume_max_usd`，订单应被拒绝，并返回可识别错误码，例如 `ROLLING_VOLUME_LIMIT_EXCEEDED`。
- [ ] TODO：配置应支持按 trading pair / market 独立调整，并支持后续热更新或管理后台配置。
- [ ] TODO：订单审计字段中应记录命中的限额配置版本 / 数值，便于复盘。

## 2. Key Model

足球多 Vendor quote book 不应直接使用 `sig_match_id` 作为跨 Vendor event key，因为 `sig_match_id` 是 SIG 的 vendor-native ID。

建议内部统一 key：

```text
football_event_id + market_code + outcome_key
```

其中：

- `football_event_id`: TurboFlow 内部 canonical event ID。
- `polymarket_event_id`: 可选外部映射 ID，用于 Polymarket event 对齐，不参与 quote dedupe / routing。
- `vendor_event_id`: Vendor 自己的 event ID，例如 SIG 的 `sig_match_id`。
- `market_code`: 例如 `result_1x2`、`btts`。
- `outcome_key`: 例如 `home_win`、`draw`、`away_win`。

Vendor ID、Vendor event ID、原始 payload 应保留在内部审计字段中，但不应出现在对 Vendor 返回的 `best_quote` 中。

## 3. Vendor Quote Push

Vendor 通过 WebSocket 主动推送足球赔率。

建议 endpoint：

```text
/ws/vendor/football-odds
```

Quote payload：

```json
{
  "type": "quote_batch",
  "vendor_quote_id": "vendor-20260524-001",
  "sent_at": 1779619200000,
  "quotes": [
    {
      "football_event_id": "tf-football-20260524-arsenal-crystal",
      "polymarket_event_id": "cry-ars-2026-05-24",
      "vendor_event_id": "sig-2026-05-24-arsenal-crystal",
      "league_code": "EPL",
      "market_code": "result_1x2",
      "market_status": "open",
      "outcomes": [
        {
          "outcome_key": "home_win",
          "decimal_odds": "2.150000",
          "status": "active"
        },
        {
          "outcome_key": "draw",
          "decimal_odds": "3.500000",
          "status": "active"
        },
        {
          "outcome_key": "away_win",
          "decimal_odds": "4.000000",
          "status": "active"
        }
      ]
    }
  ]
}
```

Ack：

```json
{
  "type": "ack",
  "vendor_quote_id": "vendor-20260524-001",
  "accepted": 3,
  "rejected": 0,
  "server_ts": 1779619200123
}
```

## 4. Quote Book

建议 quote book key：

```text
football:vendor_quotes:{football_event_id}:{market_code}:{outcome_key}
```

Hash field：

```text
{vendor_id}
```

Hash value：

```json
{
  "football_event_id": "tf-football-20260524-arsenal-crystal",
  "polymarket_event_id": "cry-ars-2026-05-24",
  "vendor_event_id": "sig-2026-05-24-arsenal-crystal",
  "market_code": "result_1x2",
  "outcome_key": "home_win",
  "decimal_odds": "2.150000",
  "status": "active",
  "quote_ts": 1779619200000,
  "received_at": 1779619200123,
  "first_seen_at": 1779619200123,
  "expires_at": 1779619500123
}
```

TTL 建议：

- Redis key TTL 应大于 `max_quote_lifetime_ms`，例如 6-10 分钟。
- Router 必须基于 `expires_at` / `max_quote_lifetime_ms` 判断有效性，不能只依赖 Redis TTL。

## 5. Routing Rules

### 5.1 Best Quote

足球市场的 best quote 按具体 outcome 选择：

```text
football_event_id + market_code + outcome_key
```

默认策略：

1. 找到同一 `football_event_id + market_code + outcome_key` 下所有 Vendor quote。
2. 过滤不可用 quote：
   - Vendor disabled。
   - Vendor 无该 league / market 权限。
   - Vendor WebSocket disconnected 或 heartbeat unhealthy。
   - outcome status 非 `active`。
   - market status 非 `open`。
   - quote 已超过 5 分钟有效期。
   - pool disabled / unhealthy / capacity 不足。
3. 选择最高 `decimal_odds`。

### 5.2 First-In-First-Win

如果多个 Vendor 对同一 event / market / outcome 给出相同最高 `decimal_odds`，先进入 TurboFlow quote book 的报价获胜。

判断依据：

- 使用 TurboFlow 服务端记录的 `received_at` / `first_seen_at`。
- 不使用 Vendor 自报的 `sent_at`、`quote_ts` 或 Vendor event timestamp 作为同价排序依据。
- 如果当前 winning quote 的 `decimal_odds` 没变，且该 quote 仍有效，则后到的同价 quote 不会抢占 winner。
- 如果 `decimal_odds` 相同且 `first_seen_at` 无法区分，才使用 Vendor priority 作为最终 deterministic tie-breaker。

### 5.3 Last Quote Remains Valid With 5-Minute Expiry

Vendor 的上一笔 quote 默认持续有效，但最长有效期为 5 分钟。

如果 5 分钟内没有新 quote 进入，该 quote 过期，该 Vendor 对应 `football_event_id + market_code + outcome_key` 不再参与 routing，直到 Vendor 重新报价。

即使价格没有变化，Vendor 也必须至少每 5 分钟重新 quote 一次，以维持 quoting status。

有效期终止条件：

- 同一 Vendor 对同一 event / market / outcome 推送新 quote，新 quote 覆盖旧 quote。
- Vendor 连接断开且超过 heartbeat grace window。
- Vendor 被禁用或失去该 league / market 权限。
- market closed / suspended。
- outcome suspended。
- quote 超过 5 分钟有效期，即 `max_quote_lifetime_ms = 300000`。

示例：

Vendor A 先报价 `home_win = 2.150000`，之后未更新。Vendor B 稍后也报价 `home_win = 2.150000`。只要 Vendor A 的 quote 尚未超过 5 分钟且仍满足其他有效性条件，Vendor A 继续作为同价 winner。

## 6. Vendor Best Quote Subscription

具备 quote permission 的 Vendor 可以订阅 TurboFlow 当前 football best quote。

Subscribe：

```json
{
  "type": "subscribe",
  "topic": "best_quote",
  "football_event_ids": ["tf-football-20260524-arsenal-crystal"],
  "markets": ["result_1x2"],
  "outcomes": ["home_win", "draw", "away_win"]
}
```

Snapshot / update：

```json
{
  "type": "best_quote",
  "event": "snapshot",
  "football_event_id": "tf-football-20260524-arsenal-crystal",
  "polymarket_event_id": "cry-ars-2026-05-24",
  "league_code": "EPL",
  "market_code": "result_1x2",
  "outcome_key": "home_win",
  "status": "valid",
  "decimal_odds": "2.150000",
  "quote_ts": 1779619200000,
  "selected_at": 1779619200123,
  "quote_age_ms": 123,
  "routing_strategy": "best_decimal_odds"
}
```

No valid quote：

```json
{
  "type": "best_quote",
  "event": "update",
  "football_event_id": "tf-football-20260524-arsenal-crystal",
  "market_code": "result_1x2",
  "outcome_key": "home_win",
  "status": "no_valid_quote",
  "reason": "all_quotes_expired_or_unavailable",
  "selected_at": 1779619500124
}
```

`best_quote` 不返回以下信息：

- `winning_vendor_id`
- `vendor_id`
- `vendor_event_id`
- `quote_id`
- `is_own_quote`
- `second_best_quote`
- 任何单个竞争 Vendor 的报价或身份信息

## 7. Heartbeat / Liveness

Vendor WebSocket 必须支持 heartbeat。

推荐应用层 heartbeat：

```json
{
  "type": "heartbeat",
  "server_ts": 1779619200123
}
```

Vendor response：

```json
{
  "type": "heartbeat_ack",
  "server_ts": 1779619200123,
  "client_ts": 1779619200130
}
```

建议参数：

```text
heartbeat_interval_ms = 10000
heartbeat_timeout_ms = 30000
heartbeat_grace_ms = 5000
max_quote_lifetime_ms = 300000
```

连接被标记 disconnected 后，该 Vendor 的 quote 不再参与 routing。Vendor 重新连接后，默认必须重新推送当前 quote。

## 8. Relationship With Existing SIG API

现有 SIG 文档仍然有效，但它应该被视为 SIG-specific adapter contract：

- `sig_match_id` 映射为 `vendor_event_id`。
- `polymarket_event_id` 继续作为可选外部 event mapping。
- SIG 原始 `(league_code, sig_match_id, market_code, at_ms)` 仍可用于 SIG adapter 内部去重和排序。
- 多 Vendor routing 不应直接使用 `sig_match_id` 作为跨 Vendor event key。
