# 足球预测市场 — 用户端 API 文档（User-Side API）

> 抓取来源：Playwright 实抓 SIT 前端页面
> 页面：`https://sit.turboflow-test.xyz/football-markets/bet/1780124257374`
> 抓取日期：2026-05-30

## 基础信息

| 项 | 值 |
|----|----|
| API Base URL (SIT) | `https://sit-api.turboflow-test.xyz` |
| 前端 (SIT) | `https://sit.turboflow-test.xyz` |
| 响应信封 | `{ "errno": "200", "msg": "success", "data": ... }` |
| 鉴权 | 读接口无需 auth header（已用 curl 验证 leagues/list） |
| 示例 matchId | `1780124257374` |

---

## 一、REST 接口

### 联赛信息（League Info）✅

```
GET /api/v1/leagues/list?active=true
```

**Query 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `active` | bool | `true` 仅返回有活动赛事的联赛 |

**响应示例**

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

### 其余赛事 / 比赛接口

| Method | Endpoint | 用途 |
|--------|----------|------|
| GET | `/api/v1/matches/upcoming` | 即将开始的比赛 |
| GET | `/api/v1/matches/live` | 进行中的比赛 |
| GET | `/api/v1/matches/hot?limit=3` | 热门 / 推荐比赛 |
| GET | `/api/v1/matches/get?id={matchId}` | 单场比赛详情 |
| GET | `/api/v1/soccer/rfq/matches` | 支持 RFQ 下注的比赛列表 |
| GET | `/api/v1/soccer/rfq/matches/{matchId}/markets` | 某场比赛的盘口（markets） |
| GET | `/api/v1/matches/{matchId}/lineup` | 阵容 |
| GET | `/api/v1/matches/{matchId}/h2h` | 历史交锋 |
| GET | `/api/v1/matches/{matchId}/events` | 比赛事件（进球、红黄牌等） |

---

## 二、WebSocket 接口 — 实时赔率（Live Odds）

```
wss://sit-api.turboflow-test.xyz/api/v1/ws/rfq
```

### 频道（Channels）

| 频道 | 说明 |
|------|------|
| `rfq.subject:{matchId}` | 实时赔率 |
| `match.events:{matchId}` | 比赛事件流 |

### 消息流程

```jsonc
// 1) 客户端订阅
{ "type": "sub", "channels": ["rfq.subject:1780124257374", "match.events:1780124257374"] }

// 2) 服务端 ack
{ "type": "ack", "data": { "sub": ["rfq.subject:1780124257374", "match.events:1780124257374"] } }

// 3) 服务端推送赔率刷新
{
  "type": "rfq.odds_refreshed",
  "data": {
    "event_id": "evt_21643003793768623",
    "market_id": "rfq_mock_match_APIFOOTBALL-1540844-1780124257_result_1x2",
    "subject_id": "1780124257374",
    "scope": "match",
    "outcomes": [
      { "outcome_id": "home_win", "display_decimal_odds": "2.1", "implied_probability": "0.47619", "share_price": "0.47619" },
      { "outcome_id": "draw",     "display_decimal_odds": "3.3", "implied_probability": "0.30303", "share_price": "0.30303" },
      { "outcome_id": "away_win", "display_decimal_odds": "3.5", "implied_probability": "0.285714", "share_price": "0.285714" }
    ],
    "at": "2026-05-30T07:23:55.5Z"
  }
}
```

### 心跳（Heartbeat）

```jsonc
// 服务端 → 客户端
{ "type": "ping", "data": { "ts": 1780125836730 } }
// 客户端 → 服务端
{ "type": "pong" }

// 客户端也会发应用层 ping
{ "action": "ping" }
{ "action": "ping", "status": true, "data": "pong" }   // 服务端回复
```

### 另一条 WebSocket（仅心跳）

```
wss://sit-api.turboflow-test.xyz/realtime?PLATFORM=web&Authorization=&isDex=true
```

DEX/全局通道，本页面仅 ping/pong，不承载赔率或联赛数据，获取赔率/联赛无需关注。

---

## 关键结论

- **联赛信息是 REST 接口**（`/api/v1/leagues/list`），**不是** WebSocket。
- WebSocket `ws/rfq` 仅用于**实时赔率**，按 `subject_id`（matchId）订阅。
- 页面加载时 `ws/rfq` 会因 React 重渲染多次断开重连（即 hint 中 `WebSocket is closed before the connection is established` 报错），但每次都会成功重连并重新订阅。
