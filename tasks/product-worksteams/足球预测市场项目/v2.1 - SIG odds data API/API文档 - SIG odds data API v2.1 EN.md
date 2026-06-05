# SIG Soccer Game Predict Market Odds Data Integration Specification and Market Code Reference

Version: v2.1 draft

Change in v2.1: add optional `polymarket_event_id` for matches that map to a Polymarket event. This field is an external reference only and does not replace `sig_match_id`.


## 1. Series Code Reference

All odds data pushed by SIG must include `league_code`. Valid values are listed below.

| `league_code` | Chinese Name | English Name | Type |
| --- | --- | --- | --- |
| `EPL` | 英超 | English Premier League | League |
| `LL` | 西甲 | La Liga | League |
| `SA` | 意甲 | Serie A | League |
| `BL` | 德甲 | Bundesliga | League |
| `L1` | 法甲 | Ligue 1 | League |
| `UCL` | 欧冠 | UEFA Champions League | Cup |
| `UEL` | 欧联 | UEFA Europa League | Cup |
| `UECL` | 欧会杯 | UEFA Europa Conference League | Cup |
| `FA_CUP` | 英足总杯 | FA Cup | Cup |
| `EFL_CUP` | 英联赛杯 | EFL Cup | Cup |
| `COPA_DEL_REY` | 国王杯 | Copa del Rey | Cup |
| `COUPE_DE_FRANCE` | 法国杯 | Coupe de France | Cup |
| `WC` | 世界杯 | FIFA World Cup | National Team |
| `EURO` | 欧洲杯 | UEFA European Championship | National Team |
| `COPA_AMERICA` | 美洲杯 | Copa América | National Team |
| `AFC_ASIAN_CUP` | 亚洲杯 | AFC Asian Cup | National Team |
| `AFCON` | 非洲杯 | Africa Cup of Nations | National Team |
| `WC_QUALIFY_UEFA` | 世预赛欧洲区 | World Cup Qualifying - UEFA | National Team |
| `WC_QUALIFY_AFC` | 世预赛亚洲区 | World Cup Qualifying - AFC | National Team |
| `WC_QUALIFY_CONMEBOL` | 世预赛南美区 | World Cup Qualifying - CONMEBOL | National Team |
| `CSL` | 中超 | Chinese Super League | League |
| `LIBERTADORES` | 解放者杯 | Copa Libertadores | Cup |
| `AFC_CL` | 亚冠 | AFC Champions League | Cup |

New series onboarding process: if SIG needs to push data for a series that is not listed above, SIG must email TurboFlow first. TurboFlow will evaluate the request, add a new `league_code` to this table if approved, and then publish a new version of this document. SIG must not create codes independently.

## 2. Identifier System

| Field | Defined By | Type | Meaning |
| --- | --- | --- | --- |
| `league_code` | TurboFlow (§1) | string ≤ 32 | Series code |
| `sig_match_id` | SIG | string ≤ 64 | SIG's internal unique match ID; stable for each match |
| `polymarket_event_id` | Polymarket / TurboFlow mapping | string ≤ 128 | Optional Polymarket event slug or event ID, such as `cry-ars-2026-05-24`; used for external event matching |
| `market_code` | TurboFlow (§3) | string ≤ 32 | Market type code, such as `result_1x2` |
| `outcome_key` | TurboFlow (§3) | string ≤ 32 | Stable outcome key, such as `home_win` |
| `kickoff_at` | SIG | RFC3339 UTC | Match kickoff time |
| `at_ms` | SIG | int64 ms | Data production timestamp, used to discard out-of-order data |

Notes:

- `sig_match_id` must remain stable across all SIG pushes for the same match. Any change is considered an error.
- `polymarket_event_id` is optional. If present, it must remain stable for the same match and should match the Polymarket event slug / event ID used by TurboFlow, for example `cry-ars-2026-05-24` from `https://polymarket.com/sports/epl/epl-cry-ars-2026-05-24`.
- `polymarket_event_id` is not part of the deduplication key. TurboFlow still uses `(league_code, sig_match_id, market_code, at_ms)` for deduplication and ordering.
- All times must use UTC.

## 3. Market Code and Outcome Key

SIG does not need to support markets that are not listed here.

### 3.1 Match-Level Markets (`scope = match`)

| `market_code` | Chinese Name | `outcome_key` List | Notes |
| --- | --- | --- | --- |
| `result_1x2` | Full-time result | `home_win` / `draw` / `away_win` | - |
| `result_ht` | Half-time result | `home_win_ht` / `draw_ht` / `away_win_ht` | - |
| `btts` | Both teams to score | `yes` / `no` | both-teams-to-score |
| `over_under_2_5` | Over/under 2.5 | `over` / `under` | Total goals vs 2.5 |
| `over_under_1_5` | Over/under 1.5 | `over` / `under` | - |
| `over_under_3_5` | Over/under 3.5 | `over` / `under` | - |
| `correct_score` | Correct score | `s_<H>_<A>`, such as `s_2_1` | Home goals - away goals |
| `next_goal` | Next goal | `home_win` / `away_win` / `no_goal` | - |

### 3.2 Series-Level Markets (`scope = series`)

Binary YES/NO model. Each candidate is an independent market.

| `market_code` | Chinese Name | `outcome_key` List | Meaning of `candidate_id` |
| --- | --- | --- | --- |
| `series_champion` | Champion | `yes` / `no` | Team / national team code. SIG uses its own team_id; TurboFlow maintains the mapping. |
| `series_top_scorer` | Top scorer | `yes` / `no` | Player ID |
| `series_top_4` | Top 4 | `yes` / `no` | Team ID |
| `series_relegation` | Relegation | `yes` / `no` | Team ID |
| `series_group_first` | Group winner | `yes` / `no` | Team ID |
| `series_group_qualify` | Group qualification | `yes` / `no` | Team ID |

### 3.3 Common Outcome Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `outcome_key` | string | Yes | Corresponds to the `outcome_key` values in §3.1 and §3.2 |
| `decimal_odds` | string | Yes | Decimal odds with 6 decimal places, such as `"2.150000"` |
| `status` | enum | Yes | `active` / `suspended`. Suspended means betting is paused, but odds may still be pushed for display. |

## 4. WebSocket Real-Time Odds Stream

SIG continuously pushes odds data through WebSocket.

### 4.1 Connection

```text
wss://ws.sig.example.com/v1/odds?token=<api_key>
```

- Protocol: WebSocket (`wss://`, TLS 1.2+)
- Authentication: URL query `token=<api_key>` or `Authorization: Bearer <api_key>` header
- Heartbeat: both sides send `ping` / `pong` every 30s. If no upstream frame is received for 60s, SIG disconnects.
- Reconnect: TurboFlow uses exponential backoff: 1s / 2s / 4s / 8s, capped at 30s.

### 4.2 Subscription

After TurboFlow connects, it sends one subscription request. SIG then continuously pushes data.

```json
{
  "op": "sub",
  "league_codes": ["EPL", "UCL", "WC"]
}
```

| Field | Required | Description |
| --- | --- | --- |
| `op` | Yes | Fixed value `sub`; future extensions may include `unsub` / `replace` |
| `league_codes` | Yes | List of subscribed series codes. Empty array means subscribe to all. |

SIG response:

```json
{
  "op": "sub_ack",
  "league_codes": ["EPL", "UCL", "WC"],
  "at": "2026-05-19T10:00:00Z"
}
```

### 4.3 Odds Data

SIG pushes proactively. One frame = one odds snapshot for one market. TurboFlow uses `(league_code, sig_match_id, market_code, at_ms)` for deduplication and ordering.

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

#### Field Description

| Field | Required | Description |
| --- | --- | --- |
| `league_code` | Yes | Must be from the table in §1 |
| `sig_match_id` | Required when `scope=match` | Recommended for `scope=series` when associated with a match; may be empty |
| `polymarket_event_id` | No | Optional external Polymarket event slug / event ID. Include only when the match maps to a Polymarket event. Not used for deduplication. |
| `scope` | Yes | `match` / `series` |
| `kickoff_at` | Required when `scope=match` | Match kickoff time |
| `market_code` | Yes | Must be from the table in §3 |
| `market_status` | Yes | `open` / `closed`. Closed means betting is no longer accepted. |
| `outcomes` | Yes | Latest odds snapshot for all outcomes in this market; follows §3.3 |
| `at_ms` | Yes | Timestamp when SIG produced this snapshot, in UTC milliseconds |

#### `scope=series` Example

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

| Extra Field | Description |
| --- | --- |
| `candidate_id` | Required when `scope=series`; such as team / player ID |
| `candidate_label` | Required when `scope=series`; display text |

#### Market Close Example

When a market is closed, `market_status=closed`. `outcomes` may still include the final odds for display only.

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

### 4.4 Push Frequency

- Push whenever odds change. Even if there is no change, data is still pushed as an active heartbeat.
- The same `(league_code, sig_match_id, market_code)` must not be split across multiple packages in one frame. It must be sent as a full market snapshot.
- Historical / replay pushes are not allowed. Old frames are not backfilled. TurboFlow uses `at_ms` strictly to discard stale frames.

### 4.5 Heartbeat

SIG → TurboFlow:

```json
{
  "op": "ping",
  "at_ms": 1748767200000
}
```

TurboFlow → SIG:

```json
{
  "op": "pong",
  "at_ms": 1748767200005
}
```

Either side disconnects and reconnects if no frame is received from the other side for 10s.

## 5. REST Startup Sync / Disconnect Recovery

REST is only a fallback and is not the real-time channel. Under normal operation, only WebSocket is used.

### 5.1 Full Odds Snapshot by Series

```http
GET /v1/odds/snapshot?league_code=EPL
```

Response: same format as WebSocket data frames, wrapped in an outer array package:

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

Purpose: call once on service startup or after a long WebSocket disconnection to fetch a full snapshot.

### 5.2 All Markets for a Single Match

```http
GET /v1/odds/match?league_code=EPL&sig_match_id=sig-20260601-arsenal-chelsea
```

Response is the same as above. `items[]` contains only all markets for the specified match.

### 5.3 Error Response

```json
{
  "code": "INVALID_LEAGUE_CODE",
  "message": "league_code not in spec table"
}
```

| `code` | Meaning |
| --- | --- |
| `INVALID_LEAGUE_CODE` | `league_code` is not in the table in §1 |
| `MATCH_NOT_FOUND` | Match does not exist |
| `RATE_LIMIT` | Rate limited; returned with HTTP 429 + `Retry-After` |
| `UNAUTHORIZED` | Authentication failed |

## 6. Authentication and Rate Limits

### 6.1 Credentials

- REST: `Authorization: Bearer <api_key>`
- WebSocket: `Authorization: Bearer <api_key>` or URL query `?token=<api_key>`

## 7. Acceptance Cases

### 7.1 WebSocket

- After subscribing with `league_codes: ["EPL"]`, TurboFlow can continuously receive odds frames for all matches and all markets in that league.
- When odds change, a new frame is received within 1s.
- When there is no change, each market emits at least 1 frame within 5s.
- When a market closes, `market_status=closed`.
- After 10s network disconnection, reconnect and resubscribe, then receive new frames.
- `ping` / `pong` heartbeat works correctly.

### 7.2 REST

- `GET /v1/odds/snapshot?league_code=EPL` returns all matches and all markets.
- `GET /v1/odds/match` returns all markets for a single match.
- Requesting with an unregistered `league_code` returns `INVALID_LEAGUE_CODE`.
- Intentionally triggering rate limiting returns HTTP 429 + `Retry-After`.

### 7.3 Common

- The same `sig_match_id` remains stable across different frames.
- If provided, `polymarket_event_id` remains stable for the same match and is returned consistently in WebSocket and REST snapshots.
- `at_ms` is monotonically increasing within the same market scope.
- All `league_code` values come from §1. All `market_code` / `outcome_key` values come from §3.

## 8. Field Dictionary

| Field | Type | Defined By | Meaning |
| --- | --- | --- | --- |
| `league_code` | string ≤ 32 | TurboFlow (§1) | Series code |
| `sig_match_id` | string ≤ 64 | SIG | Unique match ID, stable across pushes |
| `polymarket_event_id` | string ≤ 128 | Polymarket / TurboFlow mapping | Optional external Polymarket event slug / event ID; not part of dedupe |
| `scope` | enum | TurboFlow | `match` / `series` |
| `kickoff_at` | RFC3339 UTC | SIG | Match kickoff time |
| `market_code` | string ≤ 32 | TurboFlow (§3) | Market type code |
| `market_status` | enum | SIG | `open` / `closed` |
| `outcome_key` | string ≤ 32 | TurboFlow (§3) | Outcome key |
| `decimal_odds` | string, 6 decimal places | SIG | Decimal odds |
| `status` inside outcome | enum | SIG | `active` / `suspended` |
| `candidate_id` | string ≤ 64 | SIG | Candidate ID for `scope=series`, such as team / player |
| `candidate_label` | string ≤ 64 | SIG | Candidate display text |
| `at_ms` | int64 | SIG | Data production timestamp, in UTC milliseconds |
