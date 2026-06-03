# External Developer Handover - Football Prediction Market User API

Last updated: 2026-06-01

This document describes how an external client application can fetch football prediction market data and receive live odds quotes from the TurboFlow user-side API.

This is a user-side integration document. It is not the liquidity-provider / market-maker feed API.

## 1. Integration Overview

Use REST for discovery and initial page data:

1. Fetch active leagues.
2. Fetch upcoming, live, hot, or RFQ-enabled matches.
3. Fetch one match detail.
4. Fetch markets for that match.

Use WebSocket for live updates:

1. Connect to the RFQ WebSocket.
2. Subscribe to `rfq.subject:{matchId}` for live odds.
3. Optionally subscribe to `match.events:{matchId}` for live match events.
4. Update the UI whenever `rfq.odds_refreshed` is received.

## 2. Environment

| Item | Value |
| --- | --- |
| UAT API Base URL | `https://api.turboflow-test.xyz` |
| Frontend | Issued separately by TurboFlow |
| WebSocket URL | `wss://api.turboflow-test.xyz/api/v1/ws/rfq` |
| Response envelope | `{ "errno": "200", "msg": "success", "data": ... }` |
| Read API auth | No auth header required for current UAT read endpoints |
| Example `matchId` | `1780124257374` |

Production endpoint and authentication policy should be confirmed before production release.

## 3. REST APIs

### 3.1 Active Leagues

```http
GET /api/v1/leagues/list?active=true
```

Query parameters:

| Parameter | Type | Description |
| --- | --- | --- |
| `active` | boolean | `true` returns only leagues with active matches. |

Example response:

```json
{
  "errno": "200",
  "msg": "success",
  "data": [
    {
      "id": 39,
      "name": "Premier League",
      "name_zh": "英格兰超级联赛",
      "league_short": "EPL",
      "short_name_zh": "英超",
      "country": "England",
      "logo": "https://static.turboflow.xyz/soccer/images/logos/leagues/premier_league.png",
      "match_count": 0,
      "live_count": 0,
      "upcoming_count": 0,
      "volume_24h_usd": "0.000000",
      "futures": []
    }
  ]
}
```

### 3.2 Match Discovery

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/matches/upcoming` | Upcoming matches |
| GET | `/api/v1/matches/live` | Live matches |
| GET | `/api/v1/matches/hot?limit=3` | Hot / recommended matches |
| GET | `/api/v1/matches/get?id={matchId}` | Single match detail |
| GET | `/api/v1/soccer/rfq/matches` | Matches that support RFQ betting |

Recommended page-load flow:

```http
GET /api/v1/matches/get?id=1780124257374
GET /api/v1/soccer/rfq/matches/1780124257374/markets
```

### 3.3 Match Markets

```http
GET /api/v1/soccer/rfq/matches/{matchId}/markets
```

Purpose:

- Fetch the available betting markets for one match.
- Use this REST response to render the initial market UI.
- Use WebSocket updates to keep displayed odds fresh after page load.

### 3.4 Match Data

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/matches/{matchId}/lineup` | Lineup |
| GET | `/api/v1/matches/{matchId}/h2h` | Head-to-head history |
| GET | `/api/v1/matches/{matchId}/events` | Match events, such as goals and cards |

## 4. WebSocket Live Odds

Connect to:

```text
wss://api.turboflow-test.xyz/api/v1/ws/rfq
```

Subscribe after connection:

```json
{
  "type": "sub",
  "channels": [
    "rfq.subject:1780124257374",
    "match.events:1780124257374"
  ]
}
```

Channels:

| Channel | Description |
| --- | --- |
| `rfq.subject:{matchId}` | Live odds for the match |
| `match.events:{matchId}` | Live match events |

Server acknowledgement:

```json
{
  "type": "ack",
  "data": {
    "sub": [
      "rfq.subject:1780124257374",
      "match.events:1780124257374"
    ]
  }
}
```

Live odds update:

```json
{
  "type": "rfq.odds_refreshed",
  "data": {
    "event_id": "evt_21643003793768623",
    "market_id": "rfq_mock_match_APIFOOTBALL-1540844-1780124257_result_1x2",
    "subject_id": "1780124257374",
    "scope": "match",
    "outcomes": [
      {
        "outcome_id": "home_win",
        "display_decimal_odds": "2.1",
        "implied_probability": "0.47619",
        "share_price": "0.47619"
      },
      {
        "outcome_id": "draw",
        "display_decimal_odds": "3.3",
        "implied_probability": "0.30303",
        "share_price": "0.30303"
      },
      {
        "outcome_id": "away_win",
        "display_decimal_odds": "3.5",
        "implied_probability": "0.285714",
        "share_price": "0.285714"
      }
    ],
    "at": "2026-05-30T07:23:55.5Z"
  }
}
```

Key fields:

| Field | Description |
| --- | --- |
| `type` | Message type. Live odds updates use `rfq.odds_refreshed`. |
| `data.subject_id` | Match ID. Should match the subscribed `{matchId}`. |
| `data.market_id` | Market identifier. |
| `data.scope` | Market scope, for example `match`. |
| `data.outcomes[]` | Outcome odds list. |
| `outcomes[].outcome_id` | Outcome key, for example `home_win`, `draw`, `away_win`. |
| `outcomes[].display_decimal_odds` | Decimal odds for display. |
| `outcomes[].implied_probability` | Implied probability. |
| `outcomes[].share_price` | Share price representation. |
| `data.at` | Server-side update timestamp. |

## 5. Heartbeat

Server to client:

```json
{
  "type": "ping",
  "data": {
    "ts": 1780125836730
  }
}
```

Client should respond:

```json
{
  "type": "pong"
}
```

The client may also send an application-level ping:

```json
{
  "action": "ping"
}
```

Expected server response:

```json
{
  "action": "ping",
  "status": true,
  "data": "pong"
}
```

Recommended client behavior:

- Reconnect automatically if the WebSocket closes.
- Re-subscribe to the same channels after reconnect.
- Keep the latest REST market snapshot as fallback UI state until fresh WebSocket odds arrive.

## 6. Frontend Implementation Notes

- REST is for initial data and discovery.
- WebSocket is for live odds only.
- Use `matchId` as the subscription key for `rfq.subject:{matchId}`.
- Use `display_decimal_odds` for user-visible decimal odds.
- Treat WebSocket messages as incremental refreshes for the displayed market state.
- Do not call vendor-side endpoints such as `/api/v1/vendor/feed` or `/api/v1/vendor/markets` from a user-facing client.

## 7. Minimal Example Flow

1. Fetch leagues:

```http
GET https://api.turboflow-test.xyz/api/v1/leagues/list?active=true
```

2. Fetch RFQ-enabled matches:

```http
GET https://api.turboflow-test.xyz/api/v1/soccer/rfq/matches
```

3. Fetch match markets:

```http
GET https://api.turboflow-test.xyz/api/v1/soccer/rfq/matches/1780124257374/markets
```

4. Connect to WebSocket:

```text
wss://api.turboflow-test.xyz/api/v1/ws/rfq
```

5. Subscribe to live odds:

```json
{
  "type": "sub",
  "channels": ["rfq.subject:1780124257374"]
}
```

6. Update displayed odds whenever `rfq.odds_refreshed` arrives.

## 8. Out of Scope

The following are not part of this user-side handover:

- Liquidity-provider onboarding.
- Vendor quote ingestion.
- Market-maker private keys or signing.
- Internal best-quote routing.
- Settlement and contract-level execution.
