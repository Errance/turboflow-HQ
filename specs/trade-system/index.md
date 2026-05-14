# Turboflow Trade System Index

Status: Draft
Date: 2026-05-14
Scope: cross-repo map for the perpetual / CEX trading system, Surf v2 SVM execution path, prediction/event-contract trading, contracts, keepers, APIs, market data, user assets, and deployment wiring.

## Purpose

This theme is the working entry point for understanding Turboflow as one trading system instead of a set of independent repos. It indexes the visible local repositories, the key code and document sources, the major runtime planes, and the known gaps that need a deeper pass.

For the current organization-wide topology, start with [ADR 0001: Current Turboflow Repo Topology](../architecture-decisions/0001-current-turboflow-topology.md). For risk controls that intersect trading, see [risk-management/index.md](../risk-management/index.md).

## Primary Sources

| Source | Location | Status | Notes |
|------|------|------|------|
| HQ repo registry | [`ops/repo-index.json`](../../ops/repo-index.json) | Structured source | Lists 14 visible repos, local paths, module names, dependency hints, and deployment class. |
| Current topology ADR | [`specs/architecture-decisions/0001-current-turboflow-topology.md`](../architecture-decisions/0001-current-turboflow-topology.md) | Draft | First architecture overview and service-edge map. |
| Risk-management theme | [`specs/risk-management/index.md`](../risk-management/index.md) | Draft | Risk controls, prediction-market band risk, CEX pair risk, leverage/MMR, slippage. |
| API gateway routes | [`cex-api-service/http/router.go`](../../../cex-api-service/http/router.go), [`cex-api-service/http/handler`](../../../cex-api-service/http/handler) | Code evidence | Public HTTP API and WebSocket edge. |
| CEX order service routes | [`cex-order-service/api/router.go`](../../../cex-order-service/api/router.go), [`cex-order-service/domain/services`](../../../cex-order-service/domain/services) | Code evidence | CEX order, pool, risk, matcher, hedging, scheduler logic. |
| Surf/SVM keeper routes | [`surfv2-dex-svm-keeper/api/router.go`](../../../surfv2-dex-svm-keeper/api/router.go), [`surfv2-dex-svm-keeper/domain/services`](../../../surfv2-dex-svm-keeper/domain/services) | Code evidence | SVM keeper, order, pool, prediction/event contract, scan, compensation, vouchers. |
| Surf/SVM user asset routes | [`surfv2-dex-svm-user-service/api/router.go`](../../../surfv2-dex-svm-user-service/api/router.go), [`surfv2-dex-svm-user-service/application`](../../../surfv2-dex-svm-user-service/application) | Code evidence | Wallet, asset, approval, withdraw, provider callback APIs. |
| Oracle routes and datafeed | [`cex-oracle-service/application/handler/router.go`](../../../cex-oracle-service/application/handler/router.go), [`cex-oracle-service/datafeed`](../../../cex-oracle-service/datafeed) | Code evidence | Price WebSockets, trade-pair pricing, exchange adapters, order books, kline repair. |
| Chain listeners | [`cex-chain-listen-service/listen`](../../../cex-chain-listen-service/listen), [`cex-chain-listen-service/bridge-reviewer`](../../../cex-chain-listen-service/bridge-reviewer), [`cex-chain-listen-service/dex`](../../../cex-chain-listen-service/dex) | Code evidence | EVM, Solana, Tron deposit/listen and bridge review paths. |
| Admin backend | [`cex-mgt-backend/service`](../../../cex-mgt-backend/service), [`cex-mgt-backend/http/handler`](../../../cex-mgt-backend/http/handler) | Code evidence | Admin/control surface for finance, pair, risk, rule, user, trade, sys config, monitoring. |
| Shared foundation | [`base`](../../../base), [`framework`](../../../framework), [`turboflow-fireblocks-sdk-go`](../../../turboflow-fireblocks-sdk-go) | Code evidence | Shared entities, enums, config, RPC clients, chain clients, DB/Redis/HTTP utilities, Fireblocks client. |
| Deployment topology | [`amber-helm-charts/apps`](../../../amber-helm-charts/apps), [`amber-cicd-lib`](../../../amber-cicd-lib) | Code/deploy evidence | Helm app surface and reusable GitHub Actions workflow. |

## System Planes

| Plane | Primary repos | Role |
|------|------|------|
| Public API and WebSocket edge | `cex-api-service` | Auth/session entry, account/trade APIs, market APIs, public/private WebSocket subscriptions, route fan-out to user/order/keeper/oracle services. |
| CEX perpetual trading engine | `cex-order-service` | Off-chain order/position/pool execution, matching, risk controls, max leverage, PM/RM, hedging, schedulers, statistics and rewards. |
| Surf/SVM keeper and contracts | `surfv2-dex-svm-keeper`, `base/chain/svm_idl` | On-chain/SVM execution, pool operations, order lifecycle, event compensation, scanner, chain status transitions, prediction/event-contract order path. |
| Prediction/event contract trading | `surfv2-dex-svm-keeper`, `cex-api-service`, `cex-oracle-service` | Prediction market order creation, oracle-price checks, settlement-window controls, signal/risk blocks, risk publication to API/frontend consumers. |
| User asset and wallet plane | `surfv2-dex-svm-user-service`, `cex-chain-listen-service`, `turboflow-fireblocks-sdk-go` | Wallets, asset balances, withdrawals, internal transfers, token approvals, Fireblocks/provider callbacks, deposits/listeners. |
| Oracle and market data | `cex-oracle-service`, `oracle-slippage` | Exchange/DEX adapters, price and kline data, order-book/slippage metrics, price WebSockets, pair validation. |
| Admin/control plane | `cex-mgt-backend` | Pair/listing configuration, finance, risk controls, rules, user management, monitoring, migration/control operations. |
| Shared runtime foundation | `base`, `framework` | Service contracts, entities, enums, RPC wrappers, sys_config/trade_config access, chain connections, Redis, DB, monitoring. |
| Delivery platform | `amber-helm-charts`, `amber-cicd-lib` | Docker image publishing, Helm values, ArgoCD app surface, environment-specific deployment config. |

## Repo Theme Index

| Repo | Theme role | Key functionality | Important components |
|------|------|------|------|
| `cex-api-service` | API edge | Login, account, trade, pool, market, wallet, asset, referral/rebate, inbox, activity, WebSocket subscriptions | `http/handler`, `http/wshandler`, `domain/service`, `domain/dao`, `http/router.go` |
| `cex-order-service` | CEX perpetual engine | Order submit/cancel/remend/quick order, positions, pools, liquidity, matching, risk/leverage, hedging, rewards, statistics | `api/router.go`, `api/handles`, `domain/services`, `domain/model`, `domain/repo` |
| `surfv2-dex-svm-keeper` | SVM keeper and event-contract engine | Chain-backed orders, pool/liquidity execution, SVM scanner, compensation, prediction-market orders, vouchers, dreamfund, keeper execution | `api/router.go`, `domain/services`, `domain/model/svm_idl`, `domain/repo`, `common/config.go` |
| `surfv2-dex-svm-user-service` | DEX/SVM user asset plane | Wallet list/key setup, token approvals, user assets, withdraws, provider transaction logs, co-signer callbacks | `api`, `application/asset`, `application/user`, `domain/asset`, `domain/user`, `utils/*chain` |
| `cex-oracle-service` | Oracle and market-data plane | Exchange adapters, price/kline/order-book ingestion, price WebSocket, pair add/check, kline volume repair, TWAP, buffer rate | `application/handler`, `application/quote`, `datafeed`, `exchanges`, `setting`, `prometheus` |
| `oracle-slippage` | Slippage-specialized oracle variant | Slippage and order-book calculation pipeline, close cousin of `cex-oracle-service` | `docs/design`, `application`, `datafeed`, `exchanges` |
| `cex-chain-listen-service` | Chain ingestion and bridge events | EVM/Solana/Tron listeners, wallet account generation, manual/call compensation, DEX bridge review | `listen`, `bridge-reviewer`, `dex`, `api/wallet`, `domain/listen` |
| `cex-mgt-backend` | Admin/control plane | Admin APIs for pair/risk/rule/finance/user/trade/sys config, collection, swap, monitoring, migrations | `http/handler`, `service`, `model`, `monitor`, `collect`, `swap` |
| `base` | Shared domain/runtime library | Entities, enums, chain clients, RPC clients, sys_config/trade_config access, Redis namespaces, WebSocket helpers | `entity`, `enums`, `rpc`, `chain`, `store`, `redis`, `ws`, `monitor` |
| `framework` | Shared infrastructure library | HTTP server, DB, Redis, config/env, monitoring, idgen, concurrency, queue/container helpers | `http`, `database`, `redis`, `monitor`, `config`, `env`, `idgen` |
| `turboflow-fireblocks-sdk-go` | Fireblocks integration | Fireblocks/MPC SDK wrapper and examples | `docs`, `examples`, SDK package |
| `amber-helm-charts` | Deployment topology | Helm apps and ArgoCD/Kubernetes deployment config | `apps`, `mixins`, `lib`, app templates |
| `amber-cicd-lib` | CI/CD library | Reusable GitHub Actions workflow for Go build/image/update flow | `.github/workflows/build-golang.yml` |
| `turbo-soccer-book-service` | Adjacent event/betting app | Soccer-book domain with match, market, bet, settle, account, chain modules | `main.go`, domain-oriented service structure |

## Critical Cross-Repo Flows

| Flow | Current map |
|------|------|
| Client trading API | Client calls `cex-api-service`; API authenticates and fans out through `base/rpc` wrappers to `cex-user-service` / `surfv2-dex-svm-user-service`, `cex-order-service`, or `surfv2-dex-svm-keeper` depending on route and platform. |
| Market data to clients | `cex-oracle-service` ingests exchange/DEX data, stores/caches prices and klines, exposes `/ws/price` and trade-pair HTTP APIs; `cex-api-service` consumes oracle data and exposes user-facing market APIs and `/realtime` subscriptions. |
| CEX perpetual order | `cex-api-service` account order endpoints call `cex-order-service`; order service validates, runs risk/leverage/pair controls, updates order/position/pool state, and executes matcher/scheduler logic. |
| Surf/SVM order | `cex-api-service` routes DEX/SVM trading paths to `surfv2-dex-svm-keeper`; keeper handles order lifecycle, chain submit/confirm/finish states, pool/asset effects, scan and compensation. |
| Prediction/event-contract order | API calls keeper prediction endpoints; keeper checks oracle freshness/slippage, applies prediction risk/blocking rules, writes order state, and participates in settlement/execution. |
| Deposit/withdraw/asset | `cex-chain-listen-service` listens for chain deposits/bridge events; `surfv2-dex-svm-user-service` owns wallet, asset, approval, withdrawal and provider-callback APIs; Fireblocks SDK supports MPC/provider paths. |
| Admin config propagation | `cex-mgt-backend` and service/system endpoints mutate DB-backed configuration such as `sys_config` and `trade_config`; services read via `base/store` and local config wrappers. |
| Deploy | Service repos build Docker images via GitHub Actions / shared workflow; charts under `amber-helm-charts/apps/*` define visible runtime app names and include services not present as local code repos. |

## Companion Documents

- [architecture.md](architecture.md): system architecture and runtime data/control flow.
- [repo-component-map.md](repo-component-map.md): repo-by-repo component and source index.
- [gap-register.md](gap-register.md): known gaps, missing repos, stale docs, and next investigation tasks.
- [reports/2026-05-14-trading-engine-architecture-brief.md](reports/2026-05-14-trading-engine-architecture-brief.md): brief diagram report with part status, gaps, and likely bottlenecks. PDF: [reports/2026-05-14-trading-engine-architecture-brief.pdf](reports/2026-05-14-trading-engine-architecture-brief.pdf).
- [reports/2026-05-14-keeper-service-architecture-study.md](reports/2026-05-14-keeper-service-architecture-study.md): focused keeper-service architecture study covering coupling, statefulness, cross-repo topology, scaling limits, gaps, bottlenecks, and migration directions.
