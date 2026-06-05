# 预测市场 Chainlink 报价 — 落地方案（实现 / DB / 上线）

> **需求基线**：[predict-market-chainlink-pair-requirements.md](predict-market-chainlink-pair-requirements-max.md)  
> 本文档合并 Oracle / Keeper / API 技术设计、DB 配置、统计链路改造、历史迁移与上线步骤；实现以各仓库代码为准。

---

## 1. 文档目的与范围

| 项 | 说明 |
|----|------|
| 一期币对 | BTC、ETH event（Chainlink Data Streams） |
| Perp | **`pair_id` 5（ETH）、6（BTC）** — oracle / CEX **不变** |
| Event | **`pair_id` 15（ETH）、16（BTC）** — 新 oracle + Chainlink |
| `pair_name` | 5/15=`ETH/USDT`，6/16=`BTC/USDT`（同名，B4） |
| 历史 K 线 | **只读复制** 5→15、6→16（B3）；切流后 event 新价 Chainlink |
| 客户端 | cex-api HTTP + WS；**仅换 `pair_id`**，无 `biz_type` |

**本文结构**：§1～§8 为方案总览（**Chainlink 详见 §4.1**）；**§12 细粒度实施手册**为按阶段、按文件的可执行步骤（**P1 Chainlink 见 §12.2**）。

---

## 2. 总体设计

### 2.1 分叉模型

```text
ETH：pair_id 5 (perp)  → oracle_key_perp_eth  → CEX → kline_{perp_eth_oracle_id}_*
     pair_id 15 (event) → oracle_key_event_eth → CL+CEX → kline_{event_eth_oracle_id}_*

BTC：pair_id 6 (perp)  → oracle_key_perp_btc  → CEX → kline_{perp_btc_oracle_id}_*
     pair_id 16 (event) → oracle_key_event_btc → CL+CEX → kline_{event_btc_oracle_id}_*
```

- **业务路由**：`pair_id`（Keeper / API / 前端配置）。
- **定价 / K 线 / 统计**：`oracle_key`（perp ≠ event，即使 `pair_name` 同名）。

### 2.2 配置域

```text
Perp  ── trade_pool_pairs (5/6, active, enable_predict_market=false)
Event ── chain_predict_config (15/16) → Redis PairConfigs → /pm/config
         trade_pool_pairs (15/16, 非 active, enable_predict_market=true)
```

### 2.3 组件改动一览

| 组件 | 改动 |
|------|------|
| **cex-oracle-service** | Chainlink adapter、方案 C、§4.5 统计改造、§5.6 历史迁移、event oracle 上架 |
| **DB / 配置** | 15/16 行、`chain_predict_config`、`sys_config`、PredictMarketCfg |
| **keeper** | D1 去 `IsOpenTrading`；PredictMarketCfg `pair_caps` 5→15、6→16 |
| **cex-api** | **零改**（D2） |
| **前端** | `/pm/config` 改用 15/16 |

---

## 3. 数据库与配置

### 3.1 pair_id 与 `trade_pool_pairs`

#### Perp（保留）

| 字段 | ETH (5) | BTC (6) |
|------|---------|---------|
| `pair_id` | **5** | **6** |
| `pair_name` | `ETH/USDT` | `BTC/USDT` |
| `enable_predict_market` | false | false |
| `status` | active | active |
| oracle | 现网 CEX | 现网 CEX |

#### Event（新建）

| 字段 | ETH (15) | BTC (16) |
|------|----------|----------|
| `pair_id` | **15** | **16** |
| `pair_name` | `ETH/USDT` | `BTC/USDT` |
| `enable_predict_market` | true | true |
| `max_leverage` | 0 | 0 |
| `auto_adjust_params` | false（默认） | false（默认） |
| `status` | **非 active** | **非 active** |
| `predict_market_cfg` | 从 5 行复制/调整 | 从 6 行复制/调整 |

> 上线前：核对 **15/16 未被占用**；**5/6 仅改 `enable_predict_market=false`**。

### 3.2 `oracle_pairs` + `oracle_infos`

**Perp（5/6）**：不改动。

**Event（15/16）**：新建 ×2

| 字段 | 说明 |
|------|------|
| `pair_id` | ETH=15，BTC=16 |
| `spot_token_key` | `"15"` / `"16"` |
| `oracle_id` / `oracle_key` | DB 自增；`oracle_key=strconv(oracle_id)` |
| `price_rule` | Chainlink + CEX 兜底（§3.4） |
| `price_rule_mode` | 与现网同类一致（如 Latest） |
| `fixed_kline_exchange` | **留空** |

K 线表：`kline_{oracle_id}_minute|hour|day|second` 随 `addOraclePair` 创建。

### 3.3 `chain_predict_config`

- 新增 / 切换：`pair_id` → **15（ETH）、16（BTC）**。
- 旧指向 **5/6** 的配置：**下架或 status 非 active**。

### 3.4 `price_rule` 示例（方案 C，BTC）

```json
[
  { "source": "chainlink", "base_token": "BTC", "quote_token": "USDT" },
  { "source": "binanceFuture", "base_token": "BTC", "quote_token": "USDT" }
]
```

**B2**：CEX 项从 perp **6** 对应 oracle 的 `price_rule` **复制**；首位 **前插** `chainlink`。ETH 同理（perp **5**）。

### 3.5 `sys_config` — Chainlink Data Streams

**键名**：`chainlinkStreamsConfig`（单键 JSON；字段说明见 **§4.1.3**）

```json
{
  "enabled": true,
  "api_key": "<API Key>",
  "api_secret": "<API Secret>",
  "rest_url": "<REST URL>",
  "ws_url": "<WebSocket URL>",
  "ws_ha": false,
  "max_report_age_sec": 120,
  "feeds": {
    "BTC": "0x<BTC/USD feed ID>",
    "ETH": "0x<ETH/USD feed ID>"
  }
}
```

> `enabled=false` 时不订阅 WS；event  oracle 在方案 C 下 **仅走 CEX 兜底**。feed_id 先用 `demo/chainlink-streams-subscriber -list` 获取。

---

## 4. cex-oracle-service

### 4.1 Chainlink 报价源

> **与现网 `application/monitor/chainlink` 无关**：后者是链上 **Balance 余额告警**（`ChainLinkBalanceAlarm`），**不是** Data Streams 报价；Data Streams 走新建 `exchanges/chainlink/`。

#### 4.1.1 架构与数据流

```text
sys_config.chainlinkStreamsConfig
        │
        ▼
exchanges/chainlink/ProcessService
  ├─ streams.New(Config) + StreamWithStatusCallback(feedIDs)
  ├─ report v3 Decode → Price + ObservationsTimestamp
  ├─ feedID → 已 AddSubscribe 的 OracleToken 列表
  └─ 对每个 token 构造 MarketData{Origin=chainlink, OracleKey, Price, Time}
        │
        ▼
datafeed.Server.marketUpdateHandler(data)   // OracleKey 已填，不经 CEX symbol 映射
        │
        ├─ monitorProc → ReplaceTokenStatus 心跳（per oracle_key）
        └─ pushPriceChns → procTickerRoutine → mTokenPrice[oracleKey][chainlink]
        │
        ▼
GetTokenPriceRule（方案 C）→ CalcPairPriceByWeight → Cast / K 线 / ticker_latest
```

**设计要点**：

| 项 | 决策 |
|----|------|
| 订阅粒度 | **全局 WS** 订阅 `feeds.BTC` + `feeds.ETH` 两个 feed；**不按 CEX 那样**拉全市场 miniTicker |
| 路由键 | **feed_id → AddSubscribe 注册的 OracleToken**；一期每 feed 仅对应 **一个 event oracle**（15/16） |
| 写入管道 | **`marketUpdateHandler`**（与 BirdEye / UniSushi 同类）；**不要**走 `pushPriceByCexChn` + `GetTokenMapInfo` |
| 价格字段 | **BenchmarkPrice**（首选）；备选 `(Bid+Ask)/2`；**产品确认后冻结** |
| Quote | Chainlink 为 **USD** index；event `quote_token=USDT` 时 **1:1 使用 benchmark**（与常见 event 产品一致）；若需严格 USD→USDT 换算，二期接 USDT/USD 源 |
| 时间戳 | `Time = report.ObservationsTimestamp`（秒）；用于 maker-token 超时与 K 线对齐 |

#### 4.1.2 SDK 与依赖

| 项 | 内容 |
|----|------|
| SDK | `github.com/smartcontractkit/data-streams-sdk/go` |
| 参考 | `demo/chainlink-streams-subscriber/main.go` |
| go.mod | Oracle 仓库新增 require；版本与 demo 对齐，CI 跑 `go mod tidy` |
| 核心 API | `streams.New` → `GetFeeds`（可选校验 feed_id）→ `StreamWithStatusCallback(ctx, feedIDs, statusCB)` → `stream.Read` → `report.Decode[v3.Data](FullReport)` |

**v3 report 字段（实现必用）**：

| 字段 | 用途 |
|------|------|
| `d.BenchmarkPrice` | 写入 `MarketData.Price` |
| `d.Bid` / `d.Ask` | 监控 spread；benchmark 缺失时 fallback |
| `report.ObservationsTimestamp` | `MarketData.Time` |
| `d.ValidFromTimestamp` | 可选：丢弃「观测时间过旧」report（见 §4.1.7） |
| `report.FeedID` | 反查 `feeds.BTC` / `feeds.ETH` 配置 |

#### 4.1.3 配置

**键名**：`sys_config.chainlinkStreamsConfig`（单键 JSON，进程内 `store.GetSysConfig` 读取；**不强制**环境变量，与 demo 的 env 二选一或互为 fallback）

```json
{
  "enabled": true,
  "api_key": "<API Key>",
  "api_secret": "<API Secret>",
  "rest_url": "<REST URL>",
  "ws_url": "<WebSocket URL>",
  "ws_ha": false,
  "max_report_age_sec": 120,
  "feeds": {
    "BTC": "0x<66-char feed id>",
    "ETH": "0x<66-char feed id>"
  }
}
```

| 字段 | 说明 |
|------|------|
| `enabled` | `false` 时不建 WS、不订阅；event oracle 仅靠方案 C 走 CEX 兜底 |
| `max_report_age_sec` | `now - ObservationsTimestamp` 超过则丢弃并打 warn |
| `feeds` | key 为 **BaseToken**（`BTC`/`ETH`），与 `price_rule[].base_token` 对齐 |

**`quote_source` 种子**（与 CEX 源同级注册超时）：

```sql
INSERT INTO quote_source (name, offline_time_out, status)
VALUES ('chainlink', 30, 1)
ON CONFLICT (name) DO UPDATE SET offline_time_out = 30;
```

#### 4.1.4 目录与核心类型

```text
cex-oracle-service/exchanges/chainlink/
  config.go          // ChainlinkStreamsConfig、LoadFromSysConfig()
  feed_registry.go   // feedID ↔ baseToken；AddSubscribe 维护 feedID → []OracleToken
  client.go          // WS 生命周期、StreamWithStatusCallback、重连
  decoder.go         // Decode[v3.Data]、PickPrice(d)、ValidateAge
  process_service.go // models.Exchange 实现
  process_service_test.go
```

**ProcessService 内存结构（建议）**：

```go
type ProcessService struct {
    svr          models.Service
    cfg          *Config
    feedToTokens sync.Map // feed.ID → []*entities.OracleToken
    baseToFeedID map[string]feed.ID // "BTC"/"ETH" → id
    lastPrice    sync.Map // oracleKey → decimal.Decimal（GetSymbolPrice 用）
}
```

#### 4.1.5 Exchange 接口实现要点

对照 `exchanges/binance/binance.go` + `exchanges/birdEye/processor.go`：

| 方法 | 实现 |
|------|------|
| `Subscribe(subscribeType)` | 若 `!cfg.Enabled` 直接 return no-op AdapterFunc；否则 `RecallOnDone` 包一层 WS 循环（同 Binance） |
| WS 连接成功 | `svr.OnGatewayConnected(constants.Chainlink)` → `setMakerStatus(chainlink, true)` |
| WS 断开 | `svr.OnGatewayDisconnected(constants.Chainlink, err)` |
| `AddSubscribe(topic)` | 读 `topic.Token.BaseToken`，查 `cfg.Feeds[baseToken]` → `feedToTokens.Store`；**并** `ReplaceTokenStatus(GenerateKey(chainlink, oracleKey, mode), offlineTimeout)` |
| `GetSubLen()` | `feedToTokens` 中 token 总数 |
| `GetSymbolPrice(symbol)` | 从 `lastPrice` 读（运维探针用，非主路径） |
| `IsSymbolOnline(symbol)` | 该 base 是否在 `cfg.Feeds` 中 |
| `Sync` / `SaveSymbols` | no-op 或 `GetFeeds` 校验 feed_id 仍有效 |

**Report → MarketData（核心循环伪代码）**：

```go
report, err := stream.Read(ctx)
decoded, err := streamsReport.Decode[v3.Data](report.FullReport)
price := PickPrice(decoded.Data) // BenchmarkPrice，否则 (Bid+Ask)/2
if !ValidateAge(report.ObservationsTimestamp, cfg.MaxReportAgeSec) { continue }

tokens := ps.lookupTokens(report.FeedID)
for _, token := range tokens {
    models.WithMarketData(func(data models.MarketData) {
        data.Origin = constants.Chainlink
        data.Token = token.BaseToken + token.QuoteToken // 如 BTCUSDT
        data.OracleKey = token.OracleKey
        data.PairId = token.PairId
        data.Price = price
        data.Time = report.ObservationsTimestamp
        data.TokenType = constants.TokenCoinType
        data.PriceType = constants.TokenPriceType
        ps.lastPrice.Store(token.OracleKey, price)
        ps.svr.(*datafeed.Server).DispatchChainlinkTicker(data) // 见 §4.1.6
    })
}
```

#### 4.1.6 server.go 注册与分发（必改清单）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `constants/constants.go` | `const Chainlink = "chainlink"` |
| 2 | `datafeed/server.go` `ExchangeFactory` | 字段 `chainlinkExchange`；`InitExchanges`：`chainlink.NewProcessService(svr)` |
| 3 | 同文件 `GetExchange` | `case constants.Chainlink: return ef.chainlinkExchange` |
| 4 | 同文件 `GetSubscribeMap` | `m[constants.Chainlink] = svr.chainlinkExchange.Subscribe(subType)` |
| 5 | 同文件 `SubscribePrice` | `switch` 增加 `case constants.Chainlink:` → `GetExchange` + `AddSubscribe` + `ReplaceTokenStatus` |
| 6 | 同文件 **新增** | `DispatchChainlinkTicker(data)` → `marketUpdateHandler(data)`（OracleKey 非空校验） |
| 7 | `datafeed/service_price.go` `GetSymbolPriceByOnline` | 增加 `case constants.Chainlink:`（可选 REST 兜底） |

**SubscribePrice 新增分支（示意）**：

```go
case constants.Chainlink:
    if sourceMap[source] == nil || !cfg.Enabled { continue }
    exchange := GetDataFeedServer().GetExchange(constants.Chainlink)
    nameKey := svr.monitorServer.GenerateKey(source, OracleKey, token.PriceRuleMode)
    svr.monitorServer.ReplaceTokenStatus(nameKey, offlineTimeout)
    exchange.AddSubscribe(models.TokenChange{Token: *token, Action: constants.AddToken})
```

> **注意**：仅 **`price_rule` 含 `chainlink` 的 token**（event 15/16）会走进该分支；perp 5/6 **不会**订阅 Chainlink WS。

#### 4.1.7 健康检查与超时语义

现网 `isValid(origin, oracleKey, mode)`：**返回 `true` = 源中断**（`service_check.go:24`）。

| 层级 | 机制 | Chainlink |
|------|------|-----------|
| 源级 | `isMakerStatusTimeout("chainlink")` | WS `StreamWithStatusCallback(connected=false)` 或长时间无 report |
| 品种级 | `isMakerTokenStatusTimeout("chainlink", oracleKey, mode)` | `marketUpdateHandler` → `monitorProc` 刷新该 oracle_key 心跳 |
| 全局超时 | `quote_source.offline_time_out = 30` | 30s 无新 report → 源级 timeout → 方案 C 切 CEX |
| 陈旧 report | adapter 内 `max_report_age_sec` | 丢弃过旧观测，**不**刷新心跳（避免假活） |

**方案 C 联动**（§4.2）：`isValid(chainlink, …)==false`（健康）→ 仅 Chainlink 规则；`==true`（中断）→ 去掉 chainlink，仅 CEX 兜底。

#### 4.1.8 监控与告警

| 项 | 实现 |
|----|------|
| 连接 | 复用 `OnGatewayConnected/Disconnected` → 现有 Slack / `PriceDisconnectType` |
| 延迟 | 日志 / Prometheus：`chainlink_report_lag_sec = now - ObservationsTimestamp` |
| 解码失败 | `decode error feed=…` 计数告警 |
| 配置 | `enabled=false` 或 feed_id 缺失 → 启动 warn，不 fatal（便于灰度） |
| 余额 | 仍用 **`application/monitor/chainlink`**（链上充值地址），与 Streams **分开**运维 |

#### 4.1.9 联调与验收（Oracle 侧）

```bash
# 1. 本地 smoke（demo，与 Oracle 进程无关）
cd demo/chainlink-streams-subscriber
export CHAINLINK_STREAMS_API_KEY=... CHAINLINK_STREAMS_API_SECRET=...
export CHAINLINK_STREAMS_REST_URL=... CHAINLINK_STREAMS_WS_URL=...
go run . -list
go run . -max 5   # 确认 feed_id、benchmark 有值

# 2. Oracle 进程：sys_config 写入 chainlinkStreamsConfig + quote_source
# 3. 仅上架 event ETH(15)，price_rule 首位 chainlink
# 4. 查日志：chainlink ws connected / benchmark 写入
# 5. SQL：
SELECT oracle_key, price, timestamp FROM ticker_latest WHERE oracle_key = '<event_eth_oracle_key>';
# 6. 断 WS 或 enabled=false → isValid=true → GetTokenPriceRule 仅剩 binanceFuture 等 CEX
```

| 验收项 | 期望 |
|--------|------|
| perp 5/6 | **无** chainlink 订阅日志；价格与现网一致 |
| event 15 | ticker 更新；`mTokenPrice` 含 `chainlink` 源 |
| CL 中断 | 30s 内切 CEX；恢复后回 CL |
| 与 perp 价差 | 允许不同（不同 oracle_key）；**不得**写错 oracle_key |

### 4.2 方案 C：主备过滤

**插入点**：`datafeed/service_rule.go` → `GetTokenPriceRule`

```go
func (svr *Server) GetTokenPriceRule(pair *entities.OracleToken) entities.PriceRules {
    rules := pair.PriceRule

    if hasSource(rules, constants.Chainlink) {
        if !svr.isValid(constants.Chainlink, pair.OracleKey, pair.PriceRuleMode) {
            // Chainlink 健康（isValid=false）→ 仅 Chainlink
            return filterRules(rules, constants.Chainlink)
        }
        // Chainlink 不可用 → CEX 兜底
        return excludeSource(rules, constants.Chainlink)
    }
    return applyExistingWeekendAndOtherFilters(rules, pair)
}
```

- `isValid == true` 表示源 **中断/超时**（现网语义）。
- `CalcPairPriceByWeight` **不改**；仅含 Chainlink 的 **event oracle** 走方案 C。

### 4.3 K 线 / Tick

- 新 `oracle_id` 后，`quote` / `klineStash` / `POST /kline` **按 oracle_key 零改造**。
- event pair **不参与** `kline_volume_fix`。

### 4.4 开发任务清单

| 序号 | 任务 | 优先级 |
|------|------|--------|
| O1 | `exchanges/chainlink` adapter + 联调 | P0 |
| O2 | 常量 + Factory 注册 | P0 |
| O3 | `GetTokenPriceRule` 方案 C | P0 |
| O4 | `sys_config` 读取 | P0 |
| O5 | 断线重连、maker-status、延迟监控 | P1 |
| O6 | §4.5 统计链路 | **P0** |
| O7 | §5 历史 K 线复制脚本 | **P0** |

### 4.5 统计 / 风控链路改造（P0）

**背景**：5/15、6/16 **`pair_name` 同名**；现网 `Where("pair_name=?")` 会误伤。本期 **必须** 完成：

```text
采集 / 聚合 / 中间表  →  oracle_key（+ 冗余 pair_id、pair_name）
回写 trade_pool_pairs  →  Where("pair_id=?", ?)
```

#### 4.5.1 映射缓存

| 缓存 | 内容 | 来源 |
|------|------|------|
| `oracle_key → Meta` | `pair_id`, `pair_name`, `auto_adjust_params` | `RangeOracleToken` + reload |

#### 4.5.2 表结构

| 表 | 改动 |
|----|------|
| `oracle_price_log_partition_v1` | 加 `oracle_key`、`pair_id`；聚合按 **oracle_key** |
| `volatility_summary` | 加列；唯一键 **oracle_key** |
| `simple_buffer_rate_results` | 加列；唯一键 **oracle_key** |
| `oracle_pair_summary_partition` | 加 `oracle_key`、`pair_id` |
| `buffer_rate_*_data` | 唯一键 `pair_name` → **oracle_key** |
| `trade_pool_pairs` | 主键仍 `pair_id` |

> 统计中间表 **不回填**；K/Tick 历史见 §5。

#### 4.5.3 代码改造（R1～R6）

| # | 模块 | 文件 | 要点 |
|---|------|------|------|
| R1 | 价格采集 | `quote/price_collector.go`, `price_history.go` | key 改 **oracle_key** |
| R2 | buffer_rate | `buffer_rate/data_service.go`, `models.go`, `calculator.go` | 聚合 **oracle_key**；回写 **pair_id** |
| R3 | choppiness | `statistics/choppiness_strategy.go` | 同上 |
| R4 | doji | `statistics/doji_strategy.go` | 读 **pair_id**；去掉 pair_name 写库 |
| R5 | orderbook | `datafeed/orderbook_optimizer.go` | 查询 **oracle_key** |
| R6 | 准入 | `getPairNameToIdMap` → **`getPairMetaByOracleKey`** | 按 `auto_adjust_params`，非仅 status=1 |

**删除**：`Where("pair_name=?").Updates` 写 `trade_pool_pairs`（含 `data_service.go` #1499、choppiness #188 等）。

#### 4.5.4 验收

- 5/15（ETH）、6/16（BTC）**同名**下，perp / event **oracle_key 各一条**，回写 **不交叉**。
- perp 5/6 buffer 行为与改造前一致（允许冷启动）。

### 4.6 建议实施顺序

```text
1. R6 映射缓存 + 表结构迁移（§4.5.2）
2. R1～R5 统计链路
3. Chainlink + 方案 C + DB 上架 15/16
4. §5 历史复制 + T_cutover
5. Keeper D1 + 配置切换
6. E2E（§7.3）
```

---

## 5. 历史 Tick / K 线迁移（B3）

### 5.1 复制映射

| 资产 | 源（perp，保留） | 目标（event） |
|------|-----------------|---------------|
| ETH | pair **5** → `oracle_id_perp_eth` | pair **15** → `oracle_id_event_eth` |
| BTC | pair **6** → `oracle_id_perp_btc` | pair **16** → `oracle_id_event_btc` |

**只读 INSERT … SELECT**；**不删** 5/6 侧数据。

### 5.2 迁移对象

| 对象 | 操作 |
|------|------|
| `kline_{oracle_id}_{minute\|hour\|day\|second}` | 复制，改写 **oracle_key** |
| `kline_latest` | 目标 oracle_key **upsert** |
| `ticker_latest` | 目标 oracle_key **upsert** |
| Quote / Redis 热缓存 | 复制后 **reload** |

**不迁移**：`surf_v2_oracle_price_log`、`volatility_summary` 等（§4.5 新 key 冷启动）。

### 5.3 切流边界

```text
T_cutover = 复制完成、Chainlink 对 event oracle 开始写价（UTC）

timestamp < T_cutover   → 来自 5/6 oracle 复制
timestamp ≥ T_cutover   → 仅 15/16 oracle（Chainlink 主 / CEX 备）
```

### 5.4 工具要求

- Oracle 侧 **一次性 CLI**；idempotent；分批 INSERT（~1000 行/批）。
- 执行时机：**§7.1 步骤 4**（event oracle 已建，Chainlink 尚未写 event）。

---

## 6. surfv2-dex-svm-keeper

| 项 | 方案 |
|----|------|
| 价格 WS | **零改**：`ReceivePriceData` → `SetPairTicker(pairID)` |
| 预测开/结算 | **`pair_id` 15/16** → `GetPairPriceTimeout` |
| 风控 K 线 | `GetSpotTokenKey(15/16)` → Oracle `/kline` |
| **D1** | `CreateOrderForPredictMarket` **移除** `IsOpenTrading(common.IsCexTrading)` |
| PredictMarketCfg | `pair_caps`：**5→15（ETH）、6→16（BTC）** |

**文件**：`domain/services/api_order_service.go`（D1 ~3004 行）、`predict_market_risk_service.go`

---

## 7. cex-api-service

| 项 | 方案 |
|----|------|
| K 线 | event：`POST /market/kline`，`spot_token_key`=`"15"`/`"16"` |
| Ticker WS | `dex_ticker.15` / `dex_ticker.16` |
| 预测配置 | Redis ← `chain_predict_config` |
| perp 列表 | **D2 零改**；15/16 非 active 自然排除 |

---

## 8. 切流、测试、回滚

### 8.1 切流 SOP

```text
1. PredictMarketCfg.EnableOrder = false
2. 在途预测单全部结算
3. 发布 Oracle + 新建 15/16 oracle/pair
4. §5 历史复制 5→15、6→16，记录 T_cutover
5. chain_predict_config / Redis / PredictMarketCfg → 15/16；下架 5/6 event 配置
6. perp 5/6：enable_predict_market=false，status=active 不变
7. 启动 Chainlink 写 event oracle（≥ T_cutover）；E2E
8. 开启预测市场
```

### 8.2 测试范围

| 类型 | 内容 |
|------|------|
| 预测 E2E | 15/16 配置、Ticker、K 线、开结算、Chainlink 价 |
| 历史 B3 | 5→15、6→16 连续；切流边界 |
| 主备 | Chainlink 断线 → CEX → 恢复 |
| Perp 回归 | **5/6** CEX 不变 |
| §4.5 | oracle_key 分桶；pair_id 回写不交叉 |
| D2 | 15/16 不进 perp 列表；event 可开平仓 |

### 8.3 验收标准

- 预测订单 **15/16**；价来自 event oracle（Chainlink 主路径）。
- K 线：`T_cutover` 前与 5/6 同源复制一致；之后 Chainlink。
- **5/6 perp** 与升级前一致。
- perp 列表 **含 5/6、不含 15/16**。
- Chainlink 与 perp CEX 价 **允许差异**。

### 8.4 回滚

1. 关闭预测市场。
2. `chain_predict_config` / Redis **指回 5/6**（若保留旧配置）。
3. Oracle 回滚；event oracle 15/16 可停用。
4. **5/6 无需回滚**。

### 8.5 监控（A2）

| 告警 | 说明 |
|------|------|
| Chainlink 断线 | `maker-status` → `MonitorServer.Alarm` |
| 30s 无 Tick | `offline_time_out=30` |
| 主备切换 | 日志 + Slack |
| 无价 | event **oracle_key** 长时间无效 |

**Slack**：`GetSendTarget` + `sys_config.DataFeedSlackTargets`（与现网 Oracle 一致）。

---

## 9. 关键文件清单

### cex-oracle-service

**Chainlink（§4.1 / §12.2）**

- `exchanges/chainlink/config.go`、`feed_registry.go`、`client.go`、`decoder.go`、`process_service.go`（新）
- `constants/constants.go`（`Chainlink` 常量）
- `datafeed/server.go`（Factory、`GetSubscribeMap`、`SubscribePrice`、`DispatchChainlinkTicker`）
- `datafeed/service_rule.go`（方案 C + helper）
- `datafeed/service_price.go`（`GetSymbolPriceByOnline`，可选）
- `demo/chainlink-streams-subscriber/main.go`（联调参考，非运行时依赖）

**统计 / 迁移**

- `application/buffer_rate/data_service.go`、`calculator.go`、`models.go`
- `application/statistics/choppiness_strategy.go`
- `application/quote/price_collector.go`
- `datafeed/orderbook_optimizer.go`
- 历史迁移 CLI（新）

> `application/monitor/chainlink/` 为链上余额告警，**不修改**即可。

### surfv2-dex-svm-keeper

- `domain/services/api_order_service.go`（D1）
- `domain/services/predict_market_risk_service.go`（PredictMarketCfg）

### cex-api-service

- **零改**（D2）；E2E 验证 perp 列表

---

## 10. 工作量估算（参考）

| 模块 | 人天 |
|------|------|
| Chainlink adapter + sys_config | 5～8 |
| 方案 C | 1～2 |
| DB/配置（15/16 上架 + PredictMarketCfg） | 2～3 |
| §4.5 统计链路 | 5～8 |
| §5 历史迁移 | 2～3 |
| E2E + QA | 4～6 |
| 前端 pair_id | 1～2 |
| Keeper D1 | 0.5～1 |
| **合计** | **约 20.5～33** |

---

## 11. 风险与规避

| 风险 | 规避 |
|------|------|
| 同名 `pair_name` 误伤 buffer | **§4.5 硬性**：oracle_key + pair_id |
| event 价写入 perp ticker | 不同 **pair_id**（15/16 vs 5/6） |
| 历史断档 | B3 复制 + 记录 T_cutover |
| Chainlink 长断线 | 方案 C CEX 兜底 |
| PredictMarketCfg 仍指 5/6 | 切流 SOP 步骤 5 显式迁移 |

---

## 12. 细粒度实施手册

> 按 **阶段 → 步骤 → 文件 → 验收** 组织；pair 常量：**ETH 5→15，BTC 6→16**。

### 12.0 阶段总览

| 阶段 | 名称 | 依赖 | 产出 |
|------|------|------|------|
| **P0** | 统计链路 §4.5 | 无 | oracle_key 分桶 + pair_id 回写可上线 |
| **P1** | Chainlink + 方案 C | P0 建议先合 | adapter、GetTokenPriceRule |
| **P2** | DB 上架 15/16 | P1 联调通过 | oracle 行、K 线表、配置 |
| **P3** | 历史迁移 B3 | P2 | CLI + T_cutover |
| **P4** | Keeper + 切流 | P3 | D1、配置切换、E2E |

```text
P0 ──► P1 ──► P2 ──► P3 ──► P4
         │              │
         └─ 可并行写 CLI 骨架
```

---

### 12.1 阶段 P0：统计链路（§4.5，必须先做）

**原因**：5/15、6/16 `pair_name` 同名后，不改统计链路则 buffer/choppiness **必误伤**。

#### 12.1.1 步骤 1 — Oracle 元数据缓存

| 项 | 说明 |
|----|------|
| 新建 | `cex-oracle-service/application/meta/oracle_pair_meta.go`（路径可并入 `datafeed`，团队自定） |
| 结构 | `type OraclePairMeta struct { OracleKey, PairID int64; PairName string; AutoAdjust bool }` |
| 加载 | 启动 + 定时：`JOIN oracle_pairs / tokens` ↔ `trade_pool_pairs`（按 `pair_id`） |
| 索引 | `map[string]OraclePairMeta` keyed by **oracle_key** |
| 暴露 | `GetByOracleKey(key) (OraclePairMeta, ok)` |

**验收**：日志打印 event 新 oracle_key（上架后）能解析到 pair_id=15/16。

#### 12.1.2 步骤 2 — DDL 迁移脚本

新建 `cex-oracle-service/scripts/migrations/YYYYMMDD_oracle_key_stats.sql`（示例）：

```sql
-- 示例：volatility_summary（以现网列名为准，上线前 \d 核对）
ALTER TABLE volatility_summary
  ADD COLUMN IF NOT EXISTS oracle_key VARCHAR(64),
  ADD COLUMN IF NOT EXISTS pair_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_volatility_summary_oracle_window
  ON volatility_summary (oracle_key, created_at);  -- 窗口列名按现网调整

-- buffer_rate_period_data 等：pair_name 唯一键 → oracle_key
-- simple_buffer_rate_results、oracle_price_log_partition_v1 同理
```

**注意**：分区表、现网唯一约束名 **必须在目标库 `\d+ 表名` 后写准**；脚本需 **可重复执行**（`IF NOT EXISTS`）。

#### 12.1.3 步骤 3 — R1 价格采集

| 文件 | 现网行为 | 目标行为 |
|------|----------|----------|
| `application/quote/price_collector.go` ~L56-66 | `pairName := Base/Quote` 作 key | **`oracleKey`** 作 `priceHistoryMgr` / `priceChan` key |
| `application/quote/price_history.go` | map key = pairName | map key = **oracle_key** |
| `base/entity` `SurfV2OraclePriceLog` | 仅 `pair_name` | 增加 **`oracle_key`、`pair_id`** 写入 |

**伪代码（price_collector 核心）**：

```go
for oracleKey, tickerInfo := range pc.app.ticker.originalTickerMap.Load() {
    pair := datafeed.GetDataFeedServer().GetTokenOracleKeyMapInfo(oracleKey)
    if pair == nil { continue }
    meta := metaCache.GetByOracleKey(oracleKey)
    priceLog := entities.SurfV2OraclePriceLog{
        OracleKey:  oracleKey,
        PairId:     meta.PairID,
        PairName:   meta.PairName,
        FinalPrice: tickerInfo.Price,
        CreatedAt:  createdAt,
    }
    // ...
}
```

**验收**：`surf_v2_oracle_price_log` 新行含 oracle_key；5 与 15 的 ETH 行 **oracle_key 不同**。

#### 12.1.4 步骤 4 — R2 buffer_rate

| 文件 | 改动要点 |
|------|----------|
| `application/buffer_rate/models.go` | 结果 struct 增加 `OracleKey`、`PairID`；`PairName` 仅展示 |
| `application/buffer_rate/calculator.go` | `GROUP BY` / map key → **oracle_key** |
| `application/buffer_rate/data_service.go` | 见下表 |

**`data_service.go` 必改点（grep 已确认）**：

| 行号（约） | 现网 | 改为 |
|-----------|------|------|
| L798 | `Where("pair_name=?", results[i].Pair)` | **`Where("pair_id=?", pairID)`** 或删除死路径 |
| L1217, L1265 | `Where("pair_name=?", …PairName)` | 同上 |
| **L1499** | `Where("pair_name=?", result.PairName)` | **`Where("pair_id=?", result.PairID)`**（活跃路径） |
| L1350 `getPairNameToIdMap` | 仅 `status=1` | 重命名为 **`getPairMetaByOracleKey`**：按 **oracle_key** 返回 `{pair_id, auto_adjust}` |

**准入逻辑**：predict 行 15/16 `status≠active` 时，若 `auto_adjust_params=true` 仍纳入计算；**不能**只靠 `status=1`。

**验收**：

```sql
-- 同名 ETH 下应有两条（示意）
SELECT oracle_key, pair_id, pair_name FROM simple_buffer_rate_results
 WHERE pair_name = 'ETH/USDT' ORDER BY created_at DESC LIMIT 10;
```

回写后：

```sql
SELECT pair_id, offset, choppiness FROM trade_pool_pairs WHERE pair_id IN (5,15);
-- 仅被对应 oracle 计算命中的行发生变化
```

#### 12.1.5 步骤 5 — R3 choppiness

| 文件 | 改动 |
|------|------|
| `application/statistics/choppiness_strategy.go` ~L39 | `GetOraclePriceLogs` 按 **oracle_key** 分桶（非 pair_name） |
| 同文件 ~L188 | `Where("pair_name=?", pairName)` → **`Where("pair_id=?", pairID)`** |

#### 12.1.6 步骤 6 — R4 / R5

| 文件 | 改动 |
|------|------|
| `application/statistics/doji_strategy.go` | 读 summary 带 oracle_key；写库不带 pair_name 作 key |
| `datafeed/orderbook_optimizer.go` ~L174 | `Where("pair_name = ?")` → **`Where("oracle_key = ?")`**（或 DAO `GetOrderBookDataByOracleKey`） |

#### 12.1.7 P0 阶段验收清单

- [ ] 全仓库无 **`Where("pair_name=?").Updates`** 写 `trade_pool_pairs`（grep 为零）
- [ ] perp 5/6 buffer 回归通过（与改造前口径一致，允许冷启动 1～2 周期）
- [ ] 模拟插入 15/16 行后，统计 **不更新** 5/6 的 offset（或反之）

---

### 12.2 阶段 P1：Chainlink adapter + 方案 C

> 总览见 **§4.1**；本节为 **逐步编码清单**。

#### 12.2.1 Step 0 — 依赖与 demo 验证

```bash
cd demo/chainlink-streams-subscriber
go run . -list
go run . -max 3
# 记录 BTC/ETH 的 feed_id 写入 sys_config.feeds
```

在 `cex-oracle-service/go.mod` 增加：

```go
require github.com/smartcontractkit/data-streams-sdk/go vX.Y.Z  // 与 demo go.mod 一致
```

#### 12.2.2 Step 1 — config.go

```go
type StreamsConfig struct {
    Enabled         bool              `json:"enabled"`
    APIKey          string            `json:"api_key"`
    APISecret       string            `json:"api_secret"`
    RestURL         string            `json:"rest_url"`
    WSURL           string            `json:"ws_url"`
    WSHA            bool              `json:"ws_ha"`
    MaxReportAgeSec int64             `json:"max_report_age_sec"` // 默认 120
    Feeds           map[string]string `json:"feeds"`              // BTC/ETH → feed_id hex
}

func LoadStreamsConfig() (*StreamsConfig, error) {
    raw := store.GetSysConfig("chainlinkStreamsConfig")
    // fnutil.ParseToObject；校验 enabled 时四元组非空
}
```

#### 12.2.3 Step 2 — feed_registry.go + AddSubscribe

```go
func (ps *ProcessService) AddSubscribe(topic models.TokenChange) {
    base := topic.Token.BaseToken // "BTC" / "ETH"
    feedIDStr, ok := ps.cfg.Feeds[base]
    if !ok { log.Warn(...); return }
    var id feed.ID
    id.FromString(feedIDStr)
    ps.appendToken(id, &topic.Token)
}
```

- reload token 时：`SubscribePrice` 会对每个含 chainlink 的 rule 再次 `AddSubscribe`。
- `RemoveToken`（若现网 exchange 支持）：从 slice 移除，避免 oracle 下架后仍推价。

#### 12.2.4 Step 3 — client.go（WS + 重连）

对齐 `binance.go` 的 `ws.RecallOnDone` 模式：

```go
func (ps *ProcessService) Subscribe(subType constants.SubscribeType) models.AdapterFunc {
    return func(svr models.Service, ctx context.Context, name string) {
        if !ps.cfg.Enabled { <-ctx.Done(); return }
        ws.RecallOnDone(ctx, 500*time.Millisecond, 3*time.Second, 5, func() error {
            feedIDs := ps.allFeedIDs()
            stream, err := ps.client.StreamWithStatusCallback(ctx, feedIDs, func(ok bool, host, origin string) {
                if ok { svr.OnGatewayConnected(name) } else { svr.OnGatewayDisconnected(name, "ws down") }
            })
            // defer stream.Close()
            for {
                select {
                case <-ctx.Done(): return nil
                default:
                    report, err := stream.Read(ctx)
                    if err != nil { return err }
                    ps.handleReport(svr, report)
                }
            }
        })
    }
}
```

#### 12.2.5 Step 4 — decoder.go

```go
func PickPrice(d v3.Data) (decimal.Decimal, error) {
    if d.BenchmarkPrice.Sign() > 0 {
        return decimal.NewFromBigInt(d.BenchmarkPrice, 0).Shift(-18), nil // decimals 以 feed 为准，上线前 GetFeeds 确认
    }
    if d.Bid.Sign() > 0 && d.Ask.Sign() > 0 {
        mid := new(big.Int).Add(d.Bid, d.Ask)
        mid.Div(mid, big.NewInt(2))
        return decimal.NewFromBigInt(mid, 0).Shift(-18), nil
    }
    return decimal.Zero, errors.New("empty price")
}
```

> **decimals**：v3 常为 18 位定点；**上线前**对真实 feed 跑 demo 核对 `BenchmarkPrice` 数量级，必要时按 `GetFeeds` 元数据配置 scale。

#### 12.2.6 Step 5 — handleReport + 分发

```go
func (ps *ProcessService) handleReport(svr models.Service, report *streamsReport.Report) {
    decoded, err := streamsReport.Decode[v3.Data](report.FullReport)
    // ValidateAge ...
    price, err := PickPrice(decoded.Data)
    tokens := ps.tokensForFeed(report.FeedID)
    for _, tok := range tokens {
        models.WithMarketData(func(data models.MarketData) {
            data.Origin = constants.Chainlink
            data.Token = tok.BaseToken + tok.QuoteToken
            data.OracleKey = tok.OracleKey
            data.PairId = tok.PairId
            data.Price = price
            data.Time = report.ObservationsTimestamp
            data.TokenType = constants.TokenCoinType
            data.PriceType = constants.TokenPriceType
            svr.(ChainlinkDispatcher).DispatchChainlinkTicker(data)
        })
    }
}
```

**server.go 新增**（避免改 `OnReceiveTicker` 大 switch）：

```go
func (svr *Server) DispatchChainlinkTicker(data models.MarketData) {
    if data.OracleKey == "" || !data.Price.IsPositive() { return }
    svr.marketUpdateHandler(data)
}
```

#### 12.2.7 Step 6 — Factory / SubscribeMap / SubscribePrice

按 **§4.1.6 表格 #1～#5** 逐项提交；`SubscribePrice` 的 `case constants.Chainlink` **不要**调 `IsSymbolOnline`（无 CEX symbol 表）。

#### 12.2.8 Step 7 — 方案 C（GetTokenPriceRule）

**文件**：`datafeed/service_rule.go`，函数 `GetTokenPriceRule`（~L199）。

在 **步骤 1 取 `originalRules` 之后、周末模式之前** 插入：

```go
if hasSource(originalRules, constants.Chainlink) {
    chainlinkDown := svr.isValid(constants.Chainlink, pair.OracleKey, pair.PriceRuleMode)
    if !chainlinkDown {
        return filterRulesBySource(originalRules, constants.Chainlink)
    }
    return excludeSource(originalRules, constants.Chainlink)
}
```

**辅助函数**（同文件或 `service_rule_chainlink.go`）：

```go
func hasSource(rules entities.PriceRules, source string) bool { ... }
func filterRulesBySource(rules entities.PriceRules, source string) entities.PriceRules { ... }
func excludeSource(rules entities.PriceRules, source string) entities.PriceRules { ... }
```

**语义核对**（与 `service_check.go:24` 一致）：

| `isValid(chainlink, …)` | 含义 | `GetTokenPriceRule` 返回 |
|-------------------------|------|--------------------------|
| `false` | CL **正常** | **仅** `{source: chainlink}` |
| `true` | CL **中断/超时** | **去掉** chainlink，保留 CEX 兜底项 |

**单测**（`service_rule_test.go`）：

| case | 输入 | 期望 rules |
|------|------|------------|
| CL 健康 | rules=[CL, binanceFuture], isValid=false | 仅 CL |
| CL 挂 | 同上, isValid=true | 仅 binanceFuture |
| 无 CL | perp 5/6 原 rules | 不变（不走方案 C） |
| 周末+贵金属 | XAU 等 | **不进入** 方案 C 分支 |

#### 12.2.9 Step 8 — DB 与进程

```sql
INSERT INTO quote_source (name, offline_time_out, status)
VALUES ('chainlink', 30, 1) ON CONFLICT (name) DO UPDATE SET offline_time_out = EXCLUDED.offline_time_out;

-- sys_config（运维台或 SQL）
-- key = chainlinkStreamsConfig, value = §4.1.3 JSON
```

重启 Oracle 或触发 `reloadMakerStatus` → 日志应出现 `chainlink ws connected`。

#### 12.2.10 P1 联调步骤

| 步 | 操作 | 期望 |
|----|------|------|
| 1 | demo `-list` 确认 feed_id | BTC/ETH id 写入 config |
| 2 | `enabled=true`，仅上架 **ETH event(15)** | 仅 15 的 oracle_key 有 CL 价 |
| 3 | `SELECT * FROM ticker_latest WHERE oracle_key=?` | price 随 report 更新 |
| 4 | perp **5** 同查 | **无** CL 写入；仍 CEX |
| 5 | 断 WS / 改错 secret | ~30s 后 `GetTokenPriceRule` 仅 CEX；event 仍有价 |
| 6 | 恢复 WS | 回到仅 CL |
| 7 | 对比 5 与 15 同时段价格 | 允许偏差；oracle_key 不得串 |

#### 12.2.11 常见坑

| 坑 | 说明 |
|----|------|
| 走 CEX 管道 | Chainlink **不能**只设 `Origin` 不设 `OracleKey` 就丢进 `pushPriceByCexChn` |
| `MarketData.Check` | `Token` 必填（如 `BTCUSDT`），否则 `OnReceiveTicker` 前就被滤掉 |
| perp 误订阅 | `SubscribePrice` 必须只在 `price_rule` 含 chainlink 时 `AddSubscribe` |
| decimals 错 | benchmark 数量级差 1e18 → 先 demo 肉眼核对 |
| 与 monitor/chainlink 混淆 | 余额告警模块 **不要** 混进 Streams 代码 |
| 周末模式 | 方案 C 在周末逻辑 **之前**；event BTC/ETH **不是**贵金属，不受影响 |


### 12.3 阶段 P2：DB 上架 15/16

#### 12.3.1 前置 SQL 检查

```sql
SELECT pair_id, pair_name, status FROM trade_pool_pairs WHERE pair_id IN (5,6,15,16);
-- 15/16 应不存在；5/6 存在且为 perp 现网行

SELECT pair_id, oracle_key FROM oracle_pairs WHERE pair_id IN (5,6);
-- 记下 perp_eth_oracle_id、perp_btc_oracle_id 供 B3 复制
```

#### 12.3.2 创建 event oracle（推荐路径）

**优先**：走现网 **`addOraclePair` / 运维 API**（`application/handler/addOraclePair.go`），自动：

- 插入 `oracle_infos`、`oracle_pairs`（tokens）
- 创建 `kline_{oracle_id}_*` 四张表
- 设置 `oracle_key = strconv(oracle_id)`

**手工要点**（若 SQL）：

| 表 | ETH (15) | BTC (16) |
|----|----------|----------|
| `trade_pool_pairs` | 从 pair **5** copy 字段，改 pair_id/name/flags | 从 **6** copy |
| `oracle_pairs.pair_id` | 15 | 16 |
| `spot_token_key` | `'15'` | `'16'` |
| `price_rule` | `[chainlink, …CEX from perp5]` | `[chainlink, …CEX from perp6]` |

#### 12.3.3 配置切换 SQL（切流前可先写、status 置 inactive）

```sql
-- chain_predict_config：示例
UPDATE chain_predict_config SET status = 0 WHERE pair_id IN (5, 6);
INSERT INTO chain_predict_config (pair_id, status, ...) VALUES (15, 1, ...), (16, 1, ...);

-- perp 行（切流步骤 6 执行）
UPDATE trade_pool_pairs SET enable_predict_market = false WHERE pair_id IN (5, 6);
```

**PredictMarketCfg**（Keeper JSON / sys_config）：`band_risk.pair_caps[].pair_id` **5→15、6→16**。

#### 12.3.4 Reload

- Oracle：`RangeOracleToken` / token sync 触发 reload（或进程重启）。
- Keeper：`procPredictConfigs` → Redis `PairConfigs`。
- Quote：重启或触发 kline 内存 cache reload。

---

### 12.4 阶段 P3：历史 K 线迁移 CLI（B3）

#### 12.4.1 命令设计（建议）

```bash
# 包路径示例：cmd/kline-migrate/main.go
go run ./cmd/kline-migrate \
  --pair 5:15,6:16 \
  --periods minute,hour,day,second \
  --before "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \  # = T_cutover
  --batch 1000 \
  --dry-run
```

#### 12.4.2 核心 SQL 模板

```sql
INSERT INTO kline_{dst_oid}_minute (oracle_key, timestamp, open, high, low, close, vol, created_at, updated_at)
SELECT '{dst_oracle_key}', timestamp, open, high, low, close, vol, created_at, updated_at
FROM kline_{src_oid}_minute
WHERE timestamp < :t_cutover
ON CONFLICT (timestamp) DO NOTHING;   -- 唯一约束以现网为准
```

对 `kline_latest` / `ticker_latest`：

```sql
INSERT INTO ticker_latest (oracle_key, price, open24, high24, low24, timestamp, ...)
SELECT '{dst_oracle_key}', price, open24, high24, low24, timestamp, ...
FROM ticker_latest WHERE oracle_key = '{src_oracle_key}'
ON CONFLICT (oracle_key) DO UPDATE SET ...;
```

#### 12.4.3 迁移后校验

```sql
SELECT COUNT(*), MIN(timestamp), MAX(timestamp)
FROM kline_{dst_oid}_minute;

-- 与 src 对比（timestamp < T_cutover 范围内应相等）
```

```bash
# API 抽查
curl -X POST .../market/kline -d '{"spot_token_key":"15","granularity":"1m","limit":10}'
```

---

### 12.5 阶段 P4：Keeper D1 + 切流

#### 12.5.1 D1 精确改动

**文件**：`surfv2-dex-svm-keeper/domain/services/api_order_service.go`

**函数**：`CreateOrderForPredictMarket`（~L2927）

**现网（~L3003-3006）**：

```go
if !helper.TradingPair.IsOpenTrading(common.IsCexTrading) || !helper.TradingPair.EnablePredictMarket {
    return nil, common.ErrPoolPairStatus
}
```

**改为**：

```go
if !helper.TradingPair.EnablePredictMarket {
    return nil, common.ErrPoolPairStatus
}
```

**勿改**：永续路径中所有 `IsOpenTrading(common.IsCexTrading)`（如 L675、L2124 等）。

#### 12.5.2 切流执行表（与 §8.1 逐步对应）

| 步骤 | 操作 | 负责人 | 回滚点 |
|------|------|--------|--------|
| 1 | `EnableOrder=false` | Keeper 配置 | 置 true |
| 2 | 等待在途单结算 | 运维 | — |
| 3 | 发版 Oracle（含 P0+P1）+ P2 上架 | 后端 | Oracle 回滚版本 |
| 4 | 跑 kline-migrate，记 **T_cutover** | DBA/后端 | 删 dst 重复行 |
| 5 | chain_predict_config / Redis / PredictMarketCfg → 15/16 | 运维 | 指回 5/6 |
| 6 | 5/6 `enable_predict_market=false` | DBA | 置 true |
| 7 | 开 CL 写价；E2E | QA | 步骤 1 |
| 8 | `EnableOrder=true` | 运维 | 步骤 1 |

---

### 12.6 E2E 验证命令清单

| # | 场景 | 操作 | 期望 |
|---|------|------|------|
| E1 | event 价 | 下预测单 pair_id=15 | 成交价与 CL 主路径一致（允许 ±CEX 备切换） |
| E2 | perp 价 | 永续开平仓 pair_id=5/6 | 与升级前一致 |
| E3 | 列表 | `getDefaultPairList` | 含 5/6，**不含** 15/16 |
| E4 | K 线历史 | `/market/kline` spot_token_key=15 | T_cutover 前与 5 同源 |
| E5 | 主备 | 断 CL 30s+ | event 价走 CEX；Slack 告警 |
| E6 | buffer | 查 5 与 15 offset | 互不影响 |
| E7 | 预测非 active | pair 15 status≠active | **仍可** 预测开仓（D1） |

---

### 12.7 关键文件索引（开发速查）

| 仓库 | 路径 | 阶段 |
|------|------|------|
| cex-oracle-service | `exchanges/chainlink/config.go` | P1 |
| cex-oracle-service | `exchanges/chainlink/client.go` + `decoder.go` | P1 |
| cex-oracle-service | `exchanges/chainlink/process_service.go` | P1 |
| cex-oracle-service | `datafeed/server.go`（SubscribePrice + DispatchChainlinkTicker） | P1 |
| cex-oracle-service | `datafeed/service_rule.go` | P1 |
| cex-oracle-service | `constants/constants.go` | P1 |
| cex-oracle-service | `demo/chainlink-streams-subscriber/`（联调） | P1 |
| cex-oracle-service | `application/quote/price_collector.go` | P0 |
| cex-oracle-service | `application/buffer_rate/data_service.go` | P0 |
| cex-oracle-service | `application/statistics/choppiness_strategy.go` | P0 |
| cex-oracle-service | `datafeed/orderbook_optimizer.go` | P0 |
| cex-oracle-service | `cmd/kline-migrate/*` | P3 |
| cex-oracle-service | `application/handler/addOraclePair.go` | P2 |
| surfv2-dex-svm-keeper | `domain/services/api_order_service.go` ~L3004 | P4 |
| surfv2-dex-svm-keeper | `domain/services/predict_market_risk_service.go` | P4 |
| cex-api-service | （零改，E2E 即可） | P4 |

---

## 13. 文档关系

| 文档 | 用途 |
|------|------|
| [predict-market-chainlink-pair-requirements.md](predict-market-chainlink-pair-requirements-max.md) | 需求说明、联调清单 |
| **本文档** | 开发、DB、上线 |
| [DATABASE_SCHEMA.md](../cex-oracle-service/docs/design/DATABASE_SCHEMA.md) | Oracle 表结构总览 |

---

*文档版本：2026-05 v2.1；含 §4.1 Chainlink 细化与 §12 实施手册。*
