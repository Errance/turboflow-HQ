# Trade System Gap Register

Status: Draft
Date: 2026-05-14
Scope: known gaps and follow-ups discovered while building the first trade-system theme.

## Gap Summary

| ID | Severity | Area | Gap | Evidence | Next action | Status |
|------|------|------|------|------|------|------|
| TS-GAP-001 | High | Runtime topology | Helm references many runtime apps that are not present as local code repos. | `amber-helm-charts/apps` includes `cex-user-service`, `wallet-service`, `quote-service`, `sign-service`, `settlement-service`, `conditional-order-service`, `match-service`, frontends, and chain support services. | Decide whether to clone/index the missing repos or mark them external/runtime-only. | Open |
| TS-GAP-002 | High | User/account plane | `cex-api-service` routes to `cex-user-service-svc:8010`, but `cex-user-service` is not visible locally. | `cex-api-service/http/router.go` sets the CEX user RPC URL; Helm has `cex-user-service`. | Add `cex-user-service` to repo index if available, then map account/auth/asset ownership accurately. | Open |
| TS-GAP-003 | High | Service contracts | Service-to-service contracts are spread across `base/rpc` wrappers, route handlers, and config keys, but no generated contract map exists. | `base/rpc/*` and services call each other by HTTP/RPC wrappers and sys_config/default URLs. | Generate a `base/rpc` method and endpoint inventory. | Open |
| TS-GAP-004 | High | Config governance | Trading behavior is controlled by DB-backed `sys_config` and `trade_config` JSON, but canonical production values are not in repo. | README SQL snippets, `base/store`, keeper `common/config.go`, order service docs/code. | Build a config-key register with owner, consumer, default, source of truth, and admin surface. | Open |
| TS-GAP-005 | High | Prediction/event-contract architecture | Prediction-market behavior is implemented in keeper, but the contract-level state machine and settlement lifecycle need a dedicated trace. | Keeper `CreatePredictMarketOrder`, prediction risk services, SVM IDL, README chain-status notes. | Trace event-contract order creation, risk checks, chain execution, settlement, and asset effects. | Open |
| TS-GAP-006 | High | CEX perpetual architecture | The CEX order create/match/settle lifecycle needs a code-level flow document. | `cex-order-service` has many services but router leaves most routes commented; API calls may come through `base/rpc` or internal paths. | Trace API route to order service method, DB writes, matcher loop, position/fill updates, and client push. | Open |
| TS-GAP-007 | Medium | Oracle/slippage ownership | `cex-oracle-service` and `oracle-slippage` are structurally similar; their exact division of responsibility is unclear. | Both repos share many directories/components; `oracle-slippage` has slippage design docs. | Diff repo responsibilities and decide whether `oracle-slippage` is active, forked, or specialized. | Open |
| TS-GAP-008 | Medium | Admin/control ownership | Admin config surfaces in `cex-mgt-backend` are not yet mapped to the runtime config keys consumed by order/keeper/oracle services. | `cex-mgt-backend/service/{pair,risk_control,rule,sys}` and service config consumers. | Map admin API fields to DB config keys and downstream consumers. | Open |
| TS-GAP-009 | Medium | Contract artifacts | SVM contract IDL and generated Go models exist, but source contract repo/artifacts are not visible in the current repo list. | Keeper README references IDL generation from `surf_prep_v2.json`; `base/chain/svm_idl` and keeper `domain/model/svm_idl` exist. | Locate contract source repo or document the IDL as the current canonical artifact. | Open |
| TS-GAP-010 | Medium | WebSocket/event push | API, oracle, order, and keeper each expose WebSocket-related paths, but topic ownership and payload schemas are not centrally documented. | `cex-api-service/http/wshandler`, oracle `/ws/price`, order/keeper `/ws/events`, README subscription examples. | Build WebSocket topic registry: producer, consumer, auth scope, payload schema. | Open |
| TS-GAP-011 | Medium | Data model | Tables are scattered across READMEs, entities, DAOs, and migrations. No cross-system trade data model exists. | CEX and keeper READMEs list core tables; `base/entity`, service `domain/model`, migrations/docs. | Inventory order, fill, position, pool, asset, cashbook, chain event tables by owner. | Open |
| TS-GAP-012 | Medium | Deployment ownership | GitHub Actions, Helm, ECR, and ArgoCD flow is known at a high level but app/env/values ownership is not fully mapped. | Existing topology ADR and `amber-helm-charts/apps`. | Extract ports, image names, values paths, health endpoints, and environment overlays per service. | Open |
| TS-GAP-013 | Low | README quality | Several service READMEs are GitLab templates or operational scratchpads with SQL snippets, not canonical design docs. | `cex-order-service`, `surfv2-dex-svm-user-service`, `cex-chain-listen-service` READMEs. | Treat READMEs as evidence only when backed by code; write curated HQ docs for canonical understanding. | Open |
| TS-GAP-014 | Low | Module naming | `cex-order-service` module path differs from repo name. | `ops/repo-index.json` shows `github.com/turboflow-xyz/order-service`. | Account for module/repo mismatch in import graph tooling. | Open |

## Recommended Next Documents

| Document | Purpose |
|------|------|
| `cex-order-lifecycle.md` | Trace CEX perpetual order from API request through validation, risk, DB writes, matcher/fill/position updates, and client update. |
| `svm-keeper-lifecycle.md` | Trace Surf/SVM order and pool operations through keeper, chain submission, scanner, compensation, and asset effects. |
| `prediction-event-contracts.md` | Explain prediction/event-contract order lifecycle, oracle dependence, risk gates, settlement, and contract artifacts. |
| `service-contracts.md` | Inventory `base/rpc` clients, service endpoints, ports, and runtime URLs. |
| `config-key-register.md` | Inventory `sys_config` and `trade_config` keys, owners, consumers, defaults, and admin surfaces. |
| `websocket-topic-register.md` | Inventory public/private topics, producers, consumers, schemas, and auth requirements. |
| `data-model-map.md` | Map tables and model ownership across CEX order, SVM keeper, user asset, oracle, and admin services. |
| `deployment-map.md` | Map GitHub Actions, images, Helm apps, values files, ports, health/metrics endpoints, and missing runtime services. |
