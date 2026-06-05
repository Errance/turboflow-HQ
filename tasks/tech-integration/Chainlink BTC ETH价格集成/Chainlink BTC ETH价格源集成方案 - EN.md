# Chainlink BTC/ETH Price Feed Integration Plan

> Scope: integrate Chainlink BTC and ETH pricing into the current prediction/event-contract product as the primary price source, with the existing Turboflow oracle aggregation as backup.

## Executive Summary

Use Chainlink Data Streams inside `cex-oracle-service` as a new market-data adapter, then keep `surfv2-dex-svm-keeper` unchanged as the consumer of `/ws/price` unless a later contract requirement demands on-chain report verification.

This is the least disruptive integration path because the current prediction-market order and settlement flow already depends on `cex-oracle-service` prices:

- `cex-oracle-service` aggregates exchange prices and broadcasts `base/entity.PriceData` over `/ws/price`.
- `surfv2-dex-svm-keeper` subscribes to the oracle WebSocket and writes ticks into `model.GlobalCfgMgr`.
- Prediction order opening rejects stale ticks and settlement uses `GlobalCfgMgr.GetPairPriceTimeout(order.PairID)`.

Important current limitation: the existing oracle rule schema lists sources, but the aggregation code does not implement true source priority. `CalcPairPriceByWeight` treats each valid source with equal weight (`weight := 1.0`) and computes a median/average style price. To make Chainlink primary and existing sources backup, the team should add explicit primary/fallback selection logic instead of only adding Chainlink to `oracle_rule_token.price_rule`.

## Chainlink Product Choice

The P1 task mentions Data Streams testnet/mainnet credentials and a preference for Go. Use Chainlink Data Streams, not EVM `AggregatorV3Interface`, for the first implementation.

Recommended streams:

- Primary pair mapping: `BTCUSDT` -> Chainlink `BTC / USDT` stream, `ETHUSDT` -> Chainlink `ETH / USDT` stream.
- Confirm full feed IDs from Chainlink dashboard or `GetFeeds()` using the provisioned credentials before deployment. Public dashboard currently shows truncated IDs only:
  - `BTC / USDT`: `0x0003...9d37`
  - `ETH / USDT`: `0x0003...011d`
- Alternative if USDT streams are unavailable under the account: use `BTC / USD` and `ETH / USD`, then derive USDT-denominated prices using `USDT / USD`. This adds conversion risk and should not be the default.

Chainlink references:

- Data Streams overview: https://docs.chain.link/data-streams
- Data Streams reference: https://docs.chain.link/data-streams/reference/data-streams-api
- Data Streams dashboard: https://data.chain.link/streams
- Go SDK: `github.com/smartcontractkit/data-streams-sdk/go`

## Current Turboflow Price Flow

Relevant files:

- `cex-oracle-service/datafeed/models/marketdata.go`
  - `MarketData` is the internal source tick shape: source (`Origin`), symbol (`Token`), price (`Price`), timestamp (`Time`), pair id, oracle key, and `OriginType`.
- `cex-oracle-service/datafeed/server.go`
  - `SubscribePrice` subscribes every configured source in a pair's `PriceRule`.
  - `OnReceiveTicker` routes CEX-like sources into `pushPriceByCexChn`.
  - `recvPriceRoutine` maps source symbol to `OracleKey`, then calls `marketUpdateHandler`.
  - `procTickerRoutine` stores source prices and publishes final `PriceData` through `Cast`.
- `cex-oracle-service/datafeed/service_check.go`
  - `CalcPairPriceByWeight` computes the aggregate price. Despite the name, current code uses equal source weights.
- `cex-oracle-service/application/handler/router.go`
  - `/ws/price` is the current runtime price stream.
  - `/trade/pair/price/list` is used for startup price preload.
- `base/entity/marketdata.go`
  - `PriceData` is the WebSocket payload consumed by keeper.
- `surfv2-dex-svm-keeper/domain/services/schedule_service.go`
  - Starts the oracle WebSocket subscription and preloads `/trade/pair/price/list`.
- `surfv2-dex-svm-keeper/domain/services/order_price_processor.go`
  - Writes each received tick to `GlobalCfgMgr.SetPairTicker`.
- `surfv2-dex-svm-keeper/domain/services/api_order_service.go`
  - Prediction-market opening rejects ticks older than 1 second.
- `surfv2-dex-svm-keeper/domain/services/predict_market_service.go`
  - Prediction settlement reads `GlobalCfgMgr.GetPairPriceTimeout`.

## Target Architecture

Add a Chainlink Data Streams adapter to `cex-oracle-service`:

```text
Chainlink Data Streams
  -> cex-oracle-service/exchanges/chainlinkstreams
  -> datafeed.OnReceiveTicker(MarketData{Origin: "chainlinkDataStreams", ...})
  -> primary/fallback price selector
  -> existing PriceData over /ws/price
  -> surfv2-dex-svm-keeper unchanged
  -> prediction open and settlement unchanged
```

Primary/fallback behavior:

1. If Chainlink tick for `BTCUSDT` or `ETHUSDT` is fresh, positive, and within deviation guardrails, publish Chainlink as final price.
2. If Chainlink is stale, disconnected, missing, or fails validation, publish existing aggregate price from the current source set.
3. If both Chainlink and existing aggregate are unavailable, publish nothing and let keeper stale-price protections reject opens/settlement.

## Implementation Tasks

### Task 1: Add Chainlink Adapter Skeleton

Repo: `cex-oracle-service`

Files:

- Add `exchanges/chainlinkstreams/processor.go`
- Add `exchanges/chainlinkstreams/config.go`
- Modify `constants/constants.go`
- Modify `datafeed/server.go`

Implementation:

- Add source constant:

```go
const ChainlinkDataStreams = "chainlinkDataStreams"
```

- Add the adapter to `ExchangeFactory` and `GetSubscribeMap`.
- Adapter must implement `datafeed/models.Exchange`:
  - `AddSubscribe(models.TokenChange)`
  - `Subscribe(constants.SubscribeType) models.AdapterFunc`
  - `IsSymbolOnline(symbol string) bool`
  - `GetSymbolPrice(symbol string) (float64, bool)`
  - `GetAllSymbolPrices() map[string]decimal.Decimal`
  - `IsRpcHealthy() bool`
  - `Sync() error`
  - `SaveSymbols()`

### Task 2: Configure Chainlink Credentials and Feed Mapping

Do not store API key or secret in the task markdown or DB rows. Move the credentials currently pasted in the HQ task into the environment/secret system used by deployment.

Suggested config:

```text
CHAINLINK_STREAMS_API_KEY
CHAINLINK_STREAMS_API_SECRET
CHAINLINK_STREAMS_REST_URL
CHAINLINK_STREAMS_WS_URL
CHAINLINK_STREAMS_WS_HA=true
```

Suggested pair/feed config, stored in `sys_config` or service config:

```json
{
  "BTCUSDT": {
    "feed_id": "<full Chainlink BTC/USDT feed id>",
    "max_staleness_ms": 2000,
    "max_deviation_from_backup": "0.01"
  },
  "ETHUSDT": {
    "feed_id": "<full Chainlink ETH/USDT feed id>",
    "max_staleness_ms": 2000,
    "max_deviation_from_backup": "0.01"
  }
}
```

Use `client.GetFeeds(ctx)` from the Go SDK during SIT setup to verify that the configured feed IDs are visible to the account.

### Task 3: Decode Data Streams Reports

Use `github.com/smartcontractkit/data-streams-sdk/go`.

SDK capabilities to use:

- `streams.New(streams.Config{ApiKey, ApiSecret, RestURL, WsURL, WsHA: true})`
- `client.Stream(ctx, []feed.ID{...})`
- `stream.Read(ctx)`
- `report.Decode[v3.Data](report.FullReport)` for bid/ask/benchmark payloads

Price selection:

- Use `BenchmarkPrice` as the published price.
- Keep `Bid` and `Ask` for metrics/logging.
- Use `report.ObservationsTimestamp` or decoded `ValidFromTimestamp` as source time, converted to Unix seconds for `MarketData.Time`.
- Reject reports with expired timestamps, non-positive benchmark, invalid feed ID, or malformed decode.

### Task 4: Implement Primary/Fallback Aggregation

Repo: `cex-oracle-service`

Do not rely only on `oracle_rule_token.price_rule` because the current aggregator does not support source priority.

Recommended implementation:

- Preserve current `CalcPairPriceByWeight(token)` as `calcBackupPrice(token)` behavior.
- Add `SelectFinalPrice(token, triggeringSource)` or a small policy object:
  - If `token.OracleKey` maps to Chainlink primary and Chainlink source status is valid, return Chainlink price.
  - Else call existing `CalcPairPriceByWeight(token)` and return backup price.
- Add deviation guardrail:
  - If Chainlink and backup are both available and `abs(chainlink - backup) / backup > max_deviation_from_backup`, do not auto-publish Chainlink.
  - For first release, fallback to backup and emit `PriceQualityCheck` monitor.
  - Suggested starting threshold: `1%` for BTC/ETH; final value should be confirmed by risk.

Reasoning: prediction-market opening currently rejects prices older than 1 second, so a stale Chainlink stream should fail quickly into backup instead of letting keeper reject all orders.

### Task 5: Runtime DB/Config Changes

Add `chainlinkDataStreams` as a quote source and enable it only for BTC/ETH prediction pairs first.

Minimum DB/config changes:

- `quote_source`: add source `chainlinkDataStreams`, with offline timeout aligned to Data Streams report cadence.
- `oracle_rule_token.price_rule`: include `chainlinkDataStreams` for the target `OracleKey` rows so `SubscribePrice` subscribes it.
- Chainlink primary mapping config: pair/oracle key -> feed ID and freshness/deviation thresholds.

Rollout sequence:

1. SIT: add source but run in shadow mode, no primary selection. Log Chainlink vs existing aggregate.
2. UAT: enable primary selection for BTC only, then ETH.
3. Production: enable for a small traffic window, monitor fallback rate and deviation alerts, then keep enabled.

### Task 6: Observability and Alerts

Add metrics/log fields:

- `chainlink_stream_connected{feed_id,pair}`
- `chainlink_report_age_ms{feed_id,pair}`
- `chainlink_decode_errors_total{feed_id,pair}`
- `chainlink_fallback_total{pair,reason}`
- `chainlink_backup_deviation{pair}`
- `oracle_final_price_source{pair,source}`

Alert conditions:

- No Chainlink report for BTC/ETH for `> 2s` during trading.
- Fallback rate above threshold for `> 1m`.
- Chainlink vs backup deviation above configured threshold.
- Data Streams SDK stream reconnect loop or HA active connections below target.

### Task 7: Test Plan

Unit tests in `cex-oracle-service`:

- Decode valid Chainlink report fixture into `MarketData`.
- Reject non-positive benchmark.
- Reject stale report.
- Select Chainlink when primary is fresh.
- Select backup when Chainlink is stale.
- Select backup and alert when Chainlink/backup deviation exceeds threshold.
- Keep existing `CalcPairPriceByWeight` behavior unchanged for non-Chainlink pairs.

Integration tests:

- Run oracle with mocked Chainlink stream and existing exchange source.
- Verify `/ws/price` emits unchanged `PriceData` schema.
- Verify `/trade/pair/price/list` returns Chainlink-selected final price after cache has a fresh Chainlink tick.
- Verify keeper consumes the emitted price without code changes and `MarketPriceUnix` is fresh enough for prediction open.

UAT checks:

- Compare Chainlink and existing aggregate for BTC/ETH over at least one high-volatility and one quiet market window.
- Confirm fallback when Chainlink credentials are invalid.
- Confirm fallback when WS disconnects.
- Confirm fallback when report is stale.
- Confirm no price schema change breaks API/front end.

## Open Questions for Tech/Risk

- Are prediction pairs configured as `BTCUSDT`/`ETHUSDT`, or do any active pairs use USD-denominated names?
- Should `max_staleness_ms` be tighter than keeper's current 1-second prediction open threshold, or should keeper's hardcoded 1-second threshold become config?
- Should Chainlink/backup deviation fallback block prediction settlement, or always settle using backup when Chainlink fails validation?
- Is on-chain report verification required by the event contract roadmap, or is oracle-service-level integration sufficient for this P1?
- Who owns the Chainlink account, key rotation, and production feed entitlement verification?

## Handoff Recommendation

Implement Chainlink in `cex-oracle-service` first. Treat `surfv2-dex-svm-keeper` and the prediction contract path as consumers of the existing `PriceData` stream. This limits blast radius to the oracle plane and lets the team roll back by disabling `chainlinkDataStreams` primary selection without changing order or settlement code.

