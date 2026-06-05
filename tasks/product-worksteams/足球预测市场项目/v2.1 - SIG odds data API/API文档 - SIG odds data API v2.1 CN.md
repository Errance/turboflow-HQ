# SIG 赔率数据接入规范与市场代码说明

状态：Pending review  
版本：v2.1 draft

v2.1 变更：新增可选字段 `polymarket_event_id`，用于标识已映射到 Polymarket 的比赛事件。该字段仅作为外部事件引用，不替代 `sig_match_id`。

## 1. 系列赛 Code 对照表

所有 SIG 推送数据必须带 `league_code`，取值如下表。

| `league_code` | 中文名 | 英文名 | 类型 |
| --- | --- | --- | --- |
| `EPL` | 英超 | English Premier League | 联赛 |
| `LL` | 西甲 | La Liga | 联赛 |
| `SA` | 意甲 | Serie A | 联赛 |
| `BL` | 德甲 | Bundesliga | 联赛 |
| `L1` | 法甲 | Ligue 1 | 联赛 |
| `UCL` | 欧冠 | UEFA Champions League | 杯赛 |
| `UEL` | 欧联 | UEFA Europa League | 杯赛 |
| `UECL` | 欧会杯 | UEFA Europa Conference League | 杯赛 |
| `FA_CUP` | 英足总杯 | FA Cup | 杯赛 |
| `EFL_CUP` | 英联赛杯 | EFL Cup | 杯赛 |
| `COPA_DEL_REY` | 国王杯 | Copa del Rey | 杯赛 |
| `COUPE_DE_FRANCE` | 法国杯 | Coupe de France | 杯赛 |
| `WC` | 世界杯 | FIFA World Cup | 国家队 |
| `EURO` | 欧洲杯 | UEFA European Championship | 国家队 |
| `COPA_AMERICA` | 美洲杯 | Copa América | 国家队 |
| `AFC_ASIAN_CUP` | 亚洲杯 | AFC Asian Cup | 国家队 |
| `AFCON` | 非洲杯 | Africa Cup of Nations | 国家队 |
| `WC_QUALIFY_UEFA` | 世预赛欧洲区 | World Cup Qualifying - UEFA | 国家队 |
| `WC_QUALIFY_AFC` | 世预赛亚洲区 | World Cup Qualifying - AFC | 国家队 |
| `WC_QUALIFY_CONMEBOL` | 世预赛南美区 | World Cup Qualifying - CONMEBOL | 国家队 |
| `CSL` | 中超 | Chinese Super League | 联赛 |
| `LIBERTADORES` | 解放者杯 | Copa Libertadores | 杯赛 |
| `AFC_CL` | 亚冠 | AFC Champions League | 杯赛 |

新增赛事流程：SIG 需要推不在表里的赛事时，先发邮件给 TurboFlow。TurboFlow 评估后在本表追加 `league_code`，再下发新版本本文档；SIG 不得自行造 code。

## 2. 标识体系

| 字段 | 谁定义 | 类型 | 含义 |
| --- | --- | --- | --- |
| `league_code` | TurboFlow（§1） | string ≤ 32 | 所属系列赛 code |
| `sig_match_id` | SIG | string ≤ 64 | SIG 内部比赛唯一 ID；每场比赛稳定不变 |
| `polymarket_event_id` | Polymarket / TurboFlow 映射 | string ≤ 128 | 可选 Polymarket event slug 或 event ID，如 `cry-ars-2026-05-24`；用于外部事件匹配 |
| `market_code` | TurboFlow（§3） | string ≤ 32 | 市场类型 code，如 `result_1x2` |
| `outcome_key` | TurboFlow（§3） | string ≤ 32 | 选项稳定 key，如 `home_win` |
| `kickoff_at` | SIG | RFC3339 UTC | 开赛时间 |
| `at_ms` | SIG | int64 ms | 数据生产时间，用于乱序丢弃 |

说明：

- 同一比赛在 SIG 多次推送中，`sig_match_id` 必须稳定；变更视为错误。
- `polymarket_event_id` 为可选字段。如果提供，同一比赛应保持稳定，并应与 TurboFlow 使用的 Polymarket event slug / event ID 一致。例如 `https://polymarket.com/sports/epl/epl-cry-ars-2026-05-24` 对应 `cry-ars-2026-05-24`。
- `polymarket_event_id` 不参与去重。TurboFlow 仍使用 `(league_code, sig_match_id, market_code, at_ms)` 去重 + 排序。
- 时间统一使用 UTC。

## 3. Market Code 与 Outcome Key

未列出的市场 SIG 不需要支持。

### 3.1 比赛级市场（`scope = match`）

| `market_code` | 中文 | `outcome_key` 列表 | 说明 |
| --- | --- | --- | --- |
| `result_1x2` | 全场胜平负 | `home_win` / `draw` / `away_win` | - |
| `result_ht` | 半场胜平负 | `home_win_ht` / `draw_ht` / `away_win_ht` | - |
| `btts` | 双方都进球 | `yes` / `no` | both-teams-to-score |
| `over_under_2_5` | 大小球 2.5 | `over` / `under` | 总进球 vs 2.5 |
| `over_under_1_5` | 大小球 1.5 | `over` / `under` | - |
| `over_under_3_5` | 大小球 3.5 | `over` / `under` | - |
| `correct_score` | 比分 | `s_<H>_<A>`，如 `s_2_1` | 主队进球-客队进球 |
| `next_goal` | 下一球 | `home_win` / `away_win` / `no_goal` | - |

### 3.2 系列赛级市场（`scope = series`）

二元 YES/NO 模型；每个候选独立一条市场。

| `market_code` | 中文 | `outcome_key` 列表 | `candidate_id` 含义 |
| --- | --- | --- | --- |
| `series_champion` | 夺冠 | `yes` / `no` | 球队 / 国家 code（SIG 用自家 team_id，TurboFlow 维护映射） |
| `series_top_scorer` | 最佳射手 | `yes` / `no` | 球员 ID |
| `series_top_4` | 前四 | `yes` / `no` | 球队 ID |
| `series_relegation` | 降级 | `yes` / `no` | 球队 ID |
| `series_group_first` | 小组第一 | `yes` / `no` | 球队 ID |
| `series_group_qualify` | 小组出线 | `yes` / `no` | 球队 ID |

### 3.3 Outcome 公共字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `outcome_key` | string | 是 | 对应 §3.1 和 §3.2 中的 `outcome_key` |
| `decimal_odds` | string | 是 | 欧式赔率，6 位小数；如 `"2.150000"` |
| `status` | enum | 是 | `active` / `suspended`（暂停接受投注，赔率仍可推用于展示） |

## 4. WebSocket（实时赔率数据流）

SIG 通过 WebSocket 持续推送赔率数据。

### 4.1 连接

```text
wss://ws.sig.example.com/v1/odds?token=<api_key>
```

- 协议：WebSocket（`wss://`，TLS 1.2+）
- 鉴权：URL query `token=<api_key>` 或 `Authorization: Bearer <api_key>` 头
- 心跳：双方互发 `ping` / `pong`（30s 周期）；60s 无任何上行帧，则 SIG 断开
- 重连：TurboFlow 端指数退避（1s / 2s / 4s / 8s，封顶 30s）

### 4.2 订阅

TurboFlow 连接后发起一次订阅，SIG 持续推送：

```json
{
  "op": "sub",
  "league_codes": ["EPL", "UCL", "WC"]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `op` | 是 | 固定 `sub`；未来扩展 `unsub` / `replace` |
| `league_codes` | 是 | 订阅的系列赛 code 列表；空数组表示全订阅 |

SIG 响应：

```json
{
  "op": "sub_ack",
  "league_codes": ["EPL", "UCL", "WC"],
  "at": "2026-05-19T10:00:00Z"
}
```

### 4.3 赔率数据（核心）

SIG 主动推送。单帧 = 单市场的一次赔率快照。TurboFlow 用 `(league_code, sig_match_id, market_code, at_ms)` 去重 + 排序。

```json
{
  "league_code": "EPL",
  "sig_match_id": "sig-2026-05-24-arsenal-crystal",
  "polymarket_event_id": "cry-ars-2026-05-24",
  "scope": "match",
  "kickoff_at": "2026-05-24T19:00:00Z",
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
  ],
  "at_ms": 1748764830123
}
```

#### 字段说明

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `league_code` | 是 | 必须取自 §1 表 |
| `sig_match_id` | `scope=match` 必填 | `scope=series` 时仍建议填关联比赛 ID，可空 |
| `polymarket_event_id` | 否 | 可选外部 Polymarket event slug / event ID。仅当该比赛已映射 Polymarket event 时提供；不参与去重。 |
| `scope` | 是 | `match` / `series` |
| `kickoff_at` | `scope=match` 必填 | 开赛时间 |
| `market_code` | 是 | 必须取自 §3 表 |
| `market_status` | 是 | `open` / `closed`（关盘，不再接受投注） |
| `outcomes` | 是 | 该市场所有 outcome 的最新赔率快照；按 §3.3 |
| `at_ms` | 是 | SIG 生产此快照的时间戳（UTC 毫秒） |

#### `scope=series` 示例

```json
{
  "league_code": "WC",
  "scope": "series",
  "market_code": "series_champion",
  "candidate_id": "team_argentina",
  "candidate_label": "Argentina",
  "market_status": "open",
  "outcomes": [
    {
      "outcome_key": "yes",
      "decimal_odds": "4.200000",
      "status": "active"
    },
    {
      "outcome_key": "no",
      "decimal_odds": "1.240000",
      "status": "active"
    }
  ],
  "at_ms": 1748764830123
}
```

| 额外字段 | 说明 |
| --- | --- |
| `candidate_id` | `scope=series` 必填；如球队 / 球员 ID |
| `candidate_label` | `scope=series` 必填；展示文案 |

#### 关盘示例

关盘时 `market_status=closed`，`outcomes` 仍可携带最后一刻赔率（仅展示）：

```json
{
  "league_code": "EPL",
  "sig_match_id": "sig-20260601-arsenal-chelsea",
  "polymarket_event_id": "cry-ars-2026-05-24",
  "scope": "match",
  "market_code": "result_1x2",
  "market_status": "closed",
  "outcomes": [
    {
      "outcome_key": "home_win",
      "decimal_odds": "1.910000",
      "status": "suspended"
    },
    {
      "outcome_key": "draw",
      "decimal_odds": "3.700000",
      "status": "suspended"
    },
    {
      "outcome_key": "away_win",
      "decimal_odds": "4.400000",
      "status": "suspended"
    }
  ],
  "at_ms": 1748767200000
}
```

### 4.4 推送频率

- 赔率变化即推；即使无变化，也作为活跃心跳推送。
- 同一 `(league_code, sig_match_id, market_code)` 不允许在一帧内分多包；必须整市场快照。
- 历史 / 重发不允许（不补推过去的旧帧）；TurboFlow 用 `at_ms` 严格判定丢弃旧帧。

### 4.5 心跳

SIG → TurboFlow：

```json
{
  "op": "ping",
  "at_ms": 1748767200000
}
```

TurboFlow → SIG：

```json
{
  "op": "pong",
  "at_ms": 1748767200005
}
```

任意一端 10s 无对端帧即断开重连。

## 5. REST（启动同步 / 断线补齐）

REST 仅作为兜底，不是实时通道；正常运行只用 WebSocket。

### 5.1 全量赔率（按系列赛）

```http
GET /v1/odds/snapshot?league_code=EPL
```

响应与 WebSocket 数据帧格式一致，外层包数组：

```json
{
  "league_code": "EPL",
  "items": [
    {
      "sig_match_id": "...",
      "polymarket_event_id": "...",
      "scope": "match",
      "market_code": "result_1x2",
      "market_status": "open",
      "outcomes": [],
      "at_ms": 1748764830123
    },
    {
      "sig_match_id": "...",
      "polymarket_event_id": "...",
      "scope": "match",
      "market_code": "btts",
      "market_status": "open",
      "outcomes": [],
      "at_ms": 1748764830200
    }
  ]
}
```

用途：服务启动 / WebSocket 长时间断开后调一次拉全量。

### 5.2 单场比赛全市场

```http
GET /v1/odds/match?league_code=EPL&sig_match_id=sig-20260601-arsenal-chelsea
```

响应同上，`items[]` 仅该比赛的全部市场。

### 5.3 错误响应

```json
{
  "code": "INVALID_LEAGUE_CODE",
  "message": "league_code not in spec table"
}
```

| `code` | 含义 |
| --- | --- |
| `INVALID_LEAGUE_CODE` | `league_code` 不在 §1 表内 |
| `MATCH_NOT_FOUND` | 比赛不存在 |
| `RATE_LIMIT` | 限流，配合 HTTP 429 + `Retry-After` |
| `UNAUTHORIZED` | 鉴权失败 |

## 6. 鉴权与限流

### 6.1 凭据

- REST：`Authorization: Bearer <api_key>`
- WebSocket：`Authorization: Bearer <api_key>` 或 URL query `?token=<api_key>`

## 7. 验收 Case

### 7.1 WebSocket

- 订阅 `league_codes: ["EPL"]` 后能持续收到该联赛全部比赛 + 全部市场的赔率帧。
- 赔率变化时 1s 内能收到新帧。
- 无变化时单市场 5s 内至少 1 帧。
- 关盘时 `market_status=closed`。
- 断网 10s 后重连，重新订阅后能收到新帧。
- `ping` / `pong` 心跳正常。

### 7.2 REST

- `GET /v1/odds/snapshot?league_code=EPL` 拉到全部比赛全部市场。
- `GET /v1/odds/match` 拉到单场比赛全市场。
- 用未注册 `league_code` 请求，返回 `INVALID_LEAGUE_CODE`。
- 故意发限流，返回 HTTP 429 + `Retry-After`。

### 7.3 通用

- 同一 `sig_match_id` 在不同帧中稳定。
- 如提供 `polymarket_event_id`，同一比赛中应保持稳定，并在 WebSocket 与 REST 快照中一致返回。
- `at_ms` 单调递增（同市场范围内）。
- 所有 `league_code` 取自 §1，所有 `market_code` / `outcome_key` 取自 §3。

## 8. 字段词典

| 字段 | 类型 | 谁定义 | 含义 |
| --- | --- | --- | --- |
| `league_code` | string ≤ 32 | TurboFlow（§1） | 系列赛 code |
| `sig_match_id` | string ≤ 64 | SIG | 比赛唯一 ID（稳定） |
| `polymarket_event_id` | string ≤ 128 | Polymarket / TurboFlow 映射 | 可选外部 Polymarket event slug / event ID；不参与去重 |
| `scope` | enum | TurboFlow | `match` / `series` |
| `kickoff_at` | RFC3339 UTC | SIG | 开赛时间 |
| `market_code` | string ≤ 32 | TurboFlow（§3） | 市场类型 code |
| `market_status` | enum | SIG | `open` / `closed` |
| `outcome_key` | string ≤ 32 | TurboFlow（§3） | 选项 key |
| `decimal_odds` | string（6 位小数） | SIG | 欧式赔率 |
| `status`（outcome 内） | enum | SIG | `active` / `suspended` |
| `candidate_id` | string ≤ 64 | SIG | `scope=series` 候选 ID（如球队 / 球员） |
| `candidate_label` | string ≤ 64 | SIG | 候选展示文案 |
| `at_ms` | int64 | SIG | 数据生产时间戳（UTC 毫秒） |
