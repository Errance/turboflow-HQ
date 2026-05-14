# Trade System Repo Component Map

Status: Draft
Date: 2026-05-14
Scope: visible local repos relevant to trading, execution, contracts/keepers, APIs, market data, assets, and delivery.

## Reading Guide

This map is intentionally source-oriented. It answers: where should an engineer start reading for each repo, what runtime role does the repo play, and what components appear important for trade-system work?

## Shared Foundation

### `framework`

Location: [`framework`](../../../framework)
Role: infrastructure library.

Key components:

- `http`, `http/ws`: HTTP server, route groups, WebSocket primitives.
- `database`: DB client and examples.
- `redis`: Redis support.
- `config`, `env`: runtime config/environment handling.
- `monitor`: metrics/monitoring helpers.
- `idgen`: ID generation.
- `container`, `queue`, `concurrent`: utility data structures and concurrency helpers.
- `bizcode`: shared business code / response helpers.

### `base`

Location: [`base`](../../../base)
Role: domain/runtime contract library.

Key components:

- `entity`: shared DB entity structs for trade, chain, config, user, asset, oracle, etc.
- `enums`: cross-service constants for order, trade pair, chain, asset, account, approval, Fireblocks, voucher, and config domains.
- `rpc`: service-to-service DTOs and clients for user, pool/order, listen, contract, idgen, config, bizcode.
- `store`: `sys_config` and `trade_config` access helpers.
- `chain`: EVM, Solana, SVM, Tron connection pools, ABI/IDL helpers, tx/event helpers.
- `redis`: Redis key and access helpers for API/oracle/keeper/wallet domains.
- `ws`: WebSocket message helpers.
- `monitor`: Slack/monitoring helpers.

Important caution: many runtime service edges are hidden in `base/rpc` defaults and DB-backed config, so this repo is part of the architecture, not just a helper library.

### `turboflow-fireblocks-sdk-go`

Location: [`turboflow-fireblocks-sdk-go`](../../../turboflow-fireblocks-sdk-go)
Role: Fireblocks/MPC provider integration.

Key components:

- SDK package and examples.
- Chinese handover/setup docs under `docs/`.
- Relevant to DEX/SVM wallet, withdrawal, provider callback, and co-signer flows.

## API And Control Plane

### `cex-api-service`

Location: [`cex-api-service`](../../../cex-api-service)
Role: public API and WebSocket facade.

Important directories:

- `http/router.go`: sets service RPC URLs and registers handlers.
- `http/handler`: REST handler modules.
- `http/wshandler`: `/realtime` WebSocket handling.
- `domain/service`: API-facing service logic and helper aggregation.
- `domain/dao`: local DB access.
- `redis`: API Redis helpers.
- `docs`: swagger/OpenAPI and API docs.

Primary handler surfaces:

- `account_handler.go`: login/logout, account info, orders, trades, positions, wallet, assets, withdrawals, profile, voucher, email, referral, PnL/equity.
- `account_trade_handler.go`: trading-specific account endpoints.
- `pool_handler.go`: pool list/config, add/remove liquidity, LP order/history/balances.
- `market_handler.go`: price, kline, pair decimal config, funding fee history, rate, Rollbit support.
- `token_handler.go`: chain/token list.
- `account_rebate_handler.go`, `agent_portal_*`: rebate/agent portal.
- `dreamfund_handler.go`, `task_handler.go`, `christmas_handler.go`, `inbox_handler.go`: campaign/support surfaces.
- `ws_service.go` and `http/wshandler`: public/private topic subscription.

Key dependencies:

- `base/rpc/user` for CEX and DEX user services.
- `base/rpc/pool` for order/pool service.
- Oracle HTTP/WS paths for market data.

### `cex-mgt-backend`

Location: [`cex-mgt-backend`](../../../cex-mgt-backend)
Role: admin/control backend.

Important directories:

- `http/handler`: admin API routes.
- `service`: business modules.
- `model`: entities/VO/DAO.
- `monitor`: metric/monitor engine.
- `collect`: EVM/Solana/Tron collection.
- `swap`: OKX swap integration.
- `docs/swagger.yaml`: admin API surface.

Service modules:

- `asset`, `finance`, `trade`: funds and trading operations.
- `pair`: pair listing/config/oracle config.
- `risk_control`: admin risk-control surface.
- `rule`: rules/config.
- `sys`: system config.
- `user_client`: user management.
- `rebate_agent`, `adminvoucher`, `bizcodesrv`, `migrate`.

## CEX Perpetual Trading

### `cex-order-service`

Location: [`cex-order-service`](../../../cex-order-service)
Role: CEX/off-chain perpetual order engine.

Important directories:

- `api/router.go`: HTTP route registration and `/ws/events`.
- `api/handles`: API handler layer.
- `domain/services`: trading domain services.
- `domain/model`: order/pool/position models.
- `domain/repo`: data access.
- `common`: handlers, errors, exchange helpers, metrics.
- `docs`: risk/leverage/scalping/decimal service docs.

Key services:

- `api_order_service.go`: order create/cancel/remend/quick/predict behavior.
- `api_pool_service.go`, `api_pool_util_service.go`: pool, liquidity, collateral, pair configuration.
- `matcher_service.go`: matching loop.
- `schedule_service.go`, `task_service.go`: background work.
- `order_hedge_service.go`, `order_hedge_schedule_service.go`, `update_hege_params_service.go`: hedge logic.
- `pair_risk_service.go`: dynamic pair risk.
- `max_leverage_service.go`: leverage/MMR/order-size rules.
- `pm_rm_service.go`: PM/RM-related logic.
- `scalping_service.go`, `scalpingv2_service.go`: scalping controls.
- `price_decimal_service.go`: price/balance decimal sync.
- `atr_calculator_service.go`: ATR calculation from oracle kline tables.
- `monitor_service.go`: monitoring and periodic checks.
- `reward_service.go`, `statistic_service.go`: rewards/statistics.

Important docs:

- [`docs/pair_risk_service_README.md`](../../../cex-order-service/docs/pair_risk_service_README.md)
- [`docs/max_leverage_service_README.md`](../../../cex-order-service/docs/max_leverage_service_README.md)
- [`docs/pm_rm_service_README.md`](../../../cex-order-service/docs/pm_rm_service_README.md)
- [`docs/scalping_service.md`](../../../cex-order-service/docs/scalping_service.md)
- [`docs/price_decimal_service_README.md`](../../../cex-order-service/docs/price_decimal_service_README.md)

Core tables named in README:

- `trade_pools`, `trade_config`, `vault_asset`, `user_asset`
- `trade_fill_fresh`, `trade_order_fresh`, `trade_position_fresh`
- `user_cashbooks`

## Surf/SVM Execution And Event Contracts

### `surfv2-dex-svm-keeper`

Location: [`surfv2-dex-svm-keeper`](../../../surfv2-dex-svm-keeper)
Role: SVM keeper, on-chain execution coordinator, prediction/event-contract engine.

Important directories:

- `api/router.go`: order, pool, system, compensation, dreamfund routes.
- `api/handles`: HTTP handler layer.
- `domain/services`: keeper domain services.
- `domain/model`: SVM IDL and domain models.
- `domain/repo`: repository layer.
- `common`: config, metrics, errors, rate-limit executor, SVM helpers.
- `tests`: SVM/order/prediction tests and probes.

Key services:

- `api_order_service.go`: order lifecycle and prediction order integration.
- `predict_market_service.go`: prediction/event-market behavior.
- `predict_market_risk_service.go`: band risk and volatility/risk-weight logic.
- `predict_risk_pub.go`: slim risk/config publication.
- `keeper_service.go`, `keeper_execute_service.go`, `keeper_helper.go`: keeper execution.
- `scan_service.go`, `compensate_service.go`: chain scan and compensation.
- `api_pool_service.go`, `api_pool_liquidity_service.go`: pool/liquidity operations.
- `api_validate_service.go`: validation.
- `order_price_processor.go`: order price processing.
- `order_hedge_service.go`, `order_hedge_schedule_service.go`: hedge behavior.
- `reward_service.go`, `statistic_service.go`, `monitor_service.go`: reward/stat/monitor.
- `voucher_service.go`, `voucher_notice_service.go`, `dreamfund_service.go`: campaign/product surfaces.

Important docs:

- [`README.md`](../../../surfv2-dex-svm-keeper/README.md)
- [`架构图.md`](../../../surfv2-dex-svm-keeper/架构图.md)
- [`数据一致性分析.md`](../../../surfv2-dex-svm-keeper/数据一致性分析.md)
- [`止盈止损单逻辑梳理.md`](../../../surfv2-dex-svm-keeper/止盈止损单逻辑梳理.md)
- [`预测市场json配置文档.md`](../../../surfv2-dex-svm-keeper/预测市场json配置文档.md)

Core tables named in README:

- `chain_pool_pairs`, `chain_pools`, `chain_pool_asset`, `chain_pool_asset_stats`, `chain_pool_lp_asset`, `chain_pool_order`
- `dex_user_asset`, `chain_fill_fresh`, `chain_order_fresh`, `chain_position_fresh`, `dex_user_cashbooks`
- Shared `trade_config`, `vault_asset`, and pool sync/config tables.

Key config families:

- `ChainRpcHosts:{chain_id}`
- `ContractConfig:{chain_id}`
- `IsHttpScanForKeeper:{chain_id}`
- Prediction risk, slippage, signal, and blackout keys in `common/config.go`.

### `surfv2-dex-svm-user-service`

Location: [`surfv2-dex-svm-user-service`](../../../surfv2-dex-svm-user-service)
Role: DEX/SVM user, wallet, asset, withdrawal, approval service.

Important directories:

- `api/router.go`: registers wallet, account, asset, withdraw, provider tx log, co-signer callback handlers.
- `api/user`: wallet/account handlers.
- `api/asset`: asset/withdraw/provider callback handlers.
- `application/asset`, `application/user`: application service layer.
- `domain/asset`, `domain/user`, `domain/position`, `domain/listen`: domain/repository layers.
- `infra/exchange`: exchange integration helpers.
- `utils/evm`, `utils/solana`, `utils/tron`, `utils/ton`, `utils/ichain`: chain helpers.
- `monitor/metric`, `redis`, `db`, `config`.

Primary APIs:

- Wallet: list, set key, token approval tx/info/submit, LP approval, pending approve tokens.
- Asset: asset list/records, simulation/balance change, benefit claims, swap, internal transfer, support deposit token config, Fireblocks tx cancellation.
- Withdraw: sign-info, submit, param/page, internal transfer, MFA setup/check, lock info, risk-control check, audit/switch operations.
- Provider: transaction-log create/update and co-signer verification.

## Oracle And Slippage

### `cex-oracle-service`

Location: [`cex-oracle-service`](../../../cex-oracle-service)
Role: market-data, oracle, exchange/DEX adapter, price WebSocket service.

Important directories:

- `application/handler`: HTTP and WebSocket handlers.
- `application/quote`: ticker, kline, TWAP, price history, trend, Hurst, cache.
- `application/buffer_rate`: buffer-rate calculations and migrations.
- `datafeed`: price/order-book/rule/funding/fee/monitoring core.
- `exchanges`: exchange/DEX adapters.
- `setting`: source-specific settings.
- `dao`: DB access.
- `prometheus`: metrics.

Primary routes from router:

- `/ws/price`, `/v2/ws/price`, `/v3/ws/price`
- `/trade/pair/add/pool`, `/trade/pair/add/pair/list`
- `/trade/pair/update/status`
- `/trade/pair/price`, `/price/list`, `/price/v2`, `/prices`
- `/trade/pair/twap/price`
- `/trade/pair/check/price`, `/check/pool`, `/check/address`, `/search`
- `/trade/pair/rule`, `/weight`, `/reset/price`, `/kline/volume/fix`

### `oracle-slippage`

Location: [`oracle-slippage`](../../../oracle-slippage)
Role: slippage/order-book focused oracle variant.

Important directories:

- `docs/design`: slippage design documentation.
- `application`, `datafeed`, `exchanges`: same broad shape as `cex-oracle-service`.

Important doc:

- [`docs/design/SLIPPAGE_CALCULATION_LOGIC.md`](../../../oracle-slippage/docs/design/SLIPPAGE_CALCULATION_LOGIC.md)

## Chain Ingestion

### `cex-chain-listen-service`

Location: [`cex-chain-listen-service`](../../../cex-chain-listen-service)
Role: deposit/listen and bridge event ingestion.

Important directories:

- `listen/evm`, `listen/solana`, `listen/tron`: chain listener implementations.
- `bridge-reviewer`: bridge review for EVM/Solana/SVM.
- `dex`: DEX bridge/listen support.
- `api/wallet`: wallet account and compensation APIs.
- `domain/listen`, `domain/wallet`: domain logic.
- `token`, `wallet`, `db`, `monitor`.

Primary APIs:

- `/wallet/newAccount`
- `/wallet/newDexAccount`
- `/wallet/manualCompensation`
- `/wallet/callCompensation`

## Product-Adjacent Event App

### `turbo-soccer-book-service`

Location: [`turbo-soccer-book-service`](../../../turbo-soccer-book-service)
Role: adjacent event/betting app, not currently integrated into the CEX/SVM trade path in the visible topology.

Notes:

- More self-contained domain design than older services.
- Useful as a reference for future event-contract product decomposition, but not yet evidence of the current Surf/SVM prediction-market path.

## Delivery Repos

### `amber-helm-charts`

Location: [`amber-helm-charts`](../../../amber-helm-charts)
Role: Kubernetes/ArgoCD app inventory and Helm values.

Trade-system relevant chart apps include:

- Visible code repos: `cex-api-service`, `cex-chain-listen-service`, `cex-mgt-backend`, `cex-oracle-service`, `cex-order-service`, `oracle-slippage`, `surfv2-dex-svm-keeper`, `surfv2-dex-svm-user-service`.
- Referenced but not visible as local code repos: `cex-user-service`, `wallet-service`, `quote-service`, `sign-service`, `settlement-service`, `conditional-order-service`, `match-service`, `chain-token-service`, `chain-subscription-service`, `chain-blocknative-service`, `support-service`, frontends.

### `amber-cicd-lib`

Location: [`amber-cicd-lib`](../../../amber-cicd-lib)
Role: reusable GitHub Actions build/deploy library.

Key component:

- `.github/workflows/build-golang.yml`
