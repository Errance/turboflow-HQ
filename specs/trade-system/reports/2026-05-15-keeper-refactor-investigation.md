# Keeper Core Refactor Investigation

Status: Draft architecture/refactor investigation
Date: 2026-05-15
Scope: current `surfv2-dex-svm-keeper` core, Surf/SVM perpetual DEX execution path, prediction/event-contract path, and adjacent API/deployment topology.

## Objective

This report turns the keeper architecture study into an actionable refactor investigation. The goal is not to rewrite the keeper for style. The goal is to raise reliability, performance, and scaling ceiling by making runtime ownership explicit, reducing change blast radius, and allowing selected roles to scale independently without corrupting order, position, pool, chain, or settlement state.

## Existing Problems

| Symptom | Brief explanation | Example from codebase/case |
| --- | --- | --- |
| Small changes require full service rollout | API, execution, scanner, scheduler, pool, prediction, voucher, reward, monitor, task, and DreamFund are constructed and started in one process lifecycle. | [`main.go`](../../../../surfv2-dex-svm-keeper/main.go) wires all major services together and starts them through one `SerialCall` path. See service construction around lines 85-101 and startup around lines 111-125. |
| One binary owns unrelated business domains | Perpetual DEX execution, event/prediction orders, pool/liquidity, operations, campaigns, monitoring, rewards, and compensation share the same deployable artifact. | The keeper HTTP router exposes order, prediction, pool, system/admin, compensation, brush-trade, DreamFund, and WebSocket routes in one server. See [`api/router.go`](../../../../surfv2-dex-svm-keeper/api/router.go), especially lines 18-71. |
| The service is process-stateful | Correctness depends on in-memory managers and local queues, not just DB/chain state. Restart and multi-pod behavior therefore need careful replay/ownership rules. | `GlobalOrderMgr` stores order books, market orders, account orders, active keys, and an LRU cache in memory. See [`manager_orders.go`](../../../../surfv2-dex-svm-keeper/domain/model/manager_orders.go), lines 99-128. |
| Scaling replicas can duplicate singleton work | Scanner, scheduler, pool jobs, prediction settlement, liquidation scans, funding fee jobs, and cron jobs are started inside the same process without an explicit leader/lease boundary. | `ScheduleService.Start` subscribes prices, starts liquidation scanning every 500 ms, and registers multiple cron jobs. See [`schedule_service.go`](../../../../surfv2-dex-svm-keeper/domain/services/schedule_service.go), lines 95-184. |
| API facade is coupled to execution internals | The keeper API layer is not only a stateless command adapter; it has direct dependencies on keeper, validator, reward, prediction market, voucher, and repository state. | `NewApiService` is created in `main.go` with repo, keeper, reward, validator, prediction market, and voucher dependencies around lines 89-101. |
| The shared repository has too many responsibilities | `Repositories` is not only persistence; it owns DB, Redis, worker pools, singleflight, stream producers, scan/update channels, publish channels, and background goroutines. | [`repository.go`](../../../../surfv2-dex-svm-keeper/domain/repo/repository.go), lines 43-67 define the broad object; lines 87-115 initialize DB/Redis, pools, channels, producers, and goroutines. |
| Chain execution capacity is centralized | Execution queues, executor keys, delayed order queue, limit-check queue, blockhash cache, 500-worker order pool, and 100-worker funding fee pool are all in one runtime role. | [`keeper_service.go`](../../../../surfv2-dex-svm-keeper/domain/services/keeper_service.go), lines 67-108 define these local channels and pools. |
| Scanner and compensation are tied to the main service | The chain scanner owns block parsing, event queues, cashbook writes, balance updates, pair stats, account notices, DreamFund hooks, and compensation service creation. | [`scan_service.go`](../../../../surfv2-dex-svm-keeper/domain/services/scan_service.go), lines 76-145 define scanner state and channels; lines 154-183 start scanner/compensation/account-sync loops. |
| Pool jobs start through a hidden global singleton | Pool service is initialized globally and starts its own cron instance, separate from the main cron variable, which makes ownership harder to reason about. | [`api_pool_service.go`](../../../../surfv2-dex-svm-keeper/domain/services/api_pool_service.go), lines 36-69 define `globalPoolSrvInstance`; lines 69-105 register pool cron jobs. |
| Prediction/event-contract settlement has fixed in-process partitions | Prediction settlement groups are hard-coded in-process and use local delay queues, so the partition model is not externally visible or safely scalable. | [`predict_market_service.go`](../../../../surfv2-dex-svm-keeper/domain/services/predict_market_service.go), lines 38-64 define service state; lines 75-113 create local groups and delay queues. |
| Runtime config is scattered and implicit | Behavior is controlled by many `sys_config` keys read directly in services and model helpers. This makes operational patches quick but hard to audit. | `ScheduleService` reads `keeperLiquidateMinIntervalMs`, refreshes trading config, and loads prices/config into `GlobalCfgMgr`. See [`schedule_service.go`](../../../../surfv2-dex-svm-keeper/domain/services/schedule_service.go), lines 83-113 and 157-164. |
| Public API routes hide keeper vs order-service selection | Upstream API dynamically selects CEX order service or SVM keeper based on request type, so keeper refactor changes must preserve external routing compatibility. | `cex-api-service` switches from `OrderServiceAddress` to `KeeperServiceAddress` for non-CEX order requests. See [`account_handler.go`](../../../../cex-api-service/http/handler/account_handler.go), lines 893-897 and 988-992. Prediction-market submit calls keeper directly in [`account_trade_handler.go`](../../../../cex-api-service/http/handler/account_trade_handler.go), line 78. |
| Production deployment encodes singleton assumptions | The production chart uses one replica and disables autoscaling. That is consistent with code behavior, but it confirms current horizontal scaling ceiling. | [`values.yaml`](../../../../amber-helm-charts/apps/surfv2-dex-svm-keeper/main/chart/values.yaml), line 18 sets `replicaCount: 1`; lines 323-328 disable autoscaling. |
| Files are too large for reliable local reasoning | Core workflows span multi-thousand-line files, increasing review cost and accidental side effects. | Current line counts include `keeper_execute_service.go` 3728, `api_order_service.go` 3367, `scan_service.go` 2895, and `schedule_service.go` 2653. |

## Architectural Issues With Priority

| Priority | Issue | Why it matters | Direction |
| --- | --- | --- | --- |
| P0 | Missing runtime ownership model | Before scaling or splitting, the system needs to know which actor owns each order, position, pool, pair, account, chain cursor, settlement task, and cron job. | Define shard keys and single-writer rules for `chain_id`, `pair_id`, `pool_id`, `account_id`, `order_id`, and prediction market/time bucket. |
| P0 | No leader/lease model for singleton loops | Extra replicas can duplicate scanner, settlement, pool cron, liquidation, funding fee, compensation, and config sync work. | Add lease/role gating before increasing replicas or splitting workers. |
| P0 | Stateful API/execution coupling | API traffic, stateful order books, chain execution, and recovery share process fate. | Move toward stateless command intake plus durable command/outbox and stateful workers. |
| P0 | In-memory state is not externally replayable by contract | Global managers are rebuilt from DB/chain paths, but the replay contract and expected recovery windows are not explicit. | Define state rebuild inputs, checkpoint/cursor rules, idempotency keys, and recovery SLOs. |
| P1 | Broad shared repository object | Persistence, queues, streams, worker pools, and batch jobs are hidden behind one object that every domain imports. | Split into role-specific ports: order store, chain event store, command store, price publisher, asset store, config source. |
| P1 | Product domains are mixed | Perp DEX, prediction/event, pool/liquidity, campaign, reward, referral, and notification changes share review and release scope. | Extract low-risk operational/campaign roles first, then stateful trading workers. |
| P1 | Runtime config governance is weak | Fast operational config changes can alter trading behavior without a typed owner registry, rollout process, or test map. | Create config registry: key, owner, default, production value source, reader paths, risk level, rollback plan. |
| P1 | Observability does not yet describe capacity ceiling | Metrics exist, but the architecture needs role-specific saturation signals and SLOs. | Track scanner lag, command lag, order trigger latency, execution queue depth, tx confirm latency, settlement lag, DB/Redis saturation, and recovery time. |
| P2 | Code organization limits team ownership | Large files and global state make small scoped changes difficult to review independently. | Split files by domain boundary after interfaces/ports are introduced. Avoid moving code before ownership contracts exist. |
| P2 | Shared `base` package can hide runtime coupling | DTOs and config helpers are useful, but runtime service discovery and behavior hidden in shared helpers can make topology unclear. | Keep shared DTOs/entities, but document runtime edges and avoid new behavior-heavy shared helpers. |

## Upgrading Direction

### Recommended Approach

Use a staged "modular monolith to role-based workers" path:

1. Stabilize current keeper with explicit ownership, metrics, idempotency, and config registry.
2. Add internal role boundaries inside the same repo/binary.
3. Add role flags and leases so one binary can run as API-only, executor-only, scanner-only, settlement-only, or ops-worker-only.
4. Move non-critical ops/campaign jobs out of the critical execution runtime first.
5. Introduce durable commands/outbox for trading and chain actions.
6. Split physical deployments only after command replay and leases are proven.

This approach gives reliability wins before a risky rewrite, and it keeps existing DB, chain status, and API contracts stable during migration.

### Alternatives Considered

| Option | Benefit | Risk | Recommendation |
| --- | --- | --- | --- |
| Big-bang microservice rewrite | Clean target architecture quickly on paper | High behavior regression risk, long freeze, hard chain-state migration | Avoid |
| Only split files/packages | Low immediate risk, easier review | Does not solve runtime scaling or singleton ownership | Do only as part of Phase 1 |
| Role-based extraction with durable commands | Practical path to autoscaling and lower blast radius | Requires discipline around idempotency, leases, and migration tests | Recommended |

### Target Runtime Roles

| Role | Purpose | State/scaling rule |
| --- | --- | --- |
| `keeper-api-command` | Stateless HTTP command intake, validation, idempotency key generation | Scale by HTTP load; no local order book ownership |
| `keeper-executor` | Submit/retry SVM chain tasks and manage signer/executor capacity | Partition by chain/task shard; one owner per command |
| `keeper-indexer` | Scan SVM chain, parse events, update DB/read models, run compensation | Lease by chain/topic/cursor partition |
| `keeper-scheduler-risk` | Price subscription, trigger/liquidation/funding decisions, risk config snapshots | Partition by pair/account; deterministic ownership |
| `keeper-event-settlement` | Prediction/event settlement queues and settlement chain actions | Partition by market/time bucket/account |
| `keeper-pool-worker` | Pool/liquidity cron, LP price, pool snapshots, pool asset reconciliation | Partition by pool ID |
| `keeper-ops-worker` | Voucher, DreamFund, notice, reward, rebate, statistic jobs | Partition by account/campaign; separate release cadence |
| `read-model-publisher` | Redis stream/WebSocket/materialized view publication | Partition by topic/account shard |

## Refactoring Complexity And Migration Cost

| Workstream | Complexity | Risk | Cost driver | Notes |
| --- | --- | --- | --- | --- |
| Runtime inventory and ownership matrix | Low to medium | Low | Requires careful source/config tracing | High leverage; should start immediately. |
| Metrics and SLO expansion | Medium | Low | Needs metric naming, dashboards, alert thresholds | Needed before proving any refactor helps. |
| Config registry | Medium | Medium | Many scattered `sys_config` reads and implicit defaults | Must include owner and rollback plan for trading keys. |
| Idempotency register and command status | High | Medium | Requires DB schema or durable queue changes and replay rules | Foundation for safe worker split. |
| Lease/leader gating | Medium to high | Medium | Need reliable lease store and failure semantics | Required before multiple replicas or role workers. |
| API command separation | High | High | Must preserve client/API behavior while changing write path | Should be staged route by route. |
| Executor extraction | High | High | Chain tx lifecycle, signer keys, retries, finality, duplicate prevention | Needs shadow mode and replay tests. |
| Indexer/scanner extraction | High | High | Chain cursor correctness and compensation correctness | Needs deterministic cursor ownership and lag metrics. |
| Prediction/event settlement extraction | High | High | Settlement timing and asset correctness | Do after command/outbox and leases exist. |
| Campaign/notice/reward extraction | Medium | Medium | Many DB side effects, but lower chain-critical risk | Best early extraction target. |
| File/package decomposition | Medium | Low to medium | Merge conflicts and hidden dependencies | Safer after interfaces are introduced. |

Expected migration complexity is high overall because keeper correctness spans API, DB, Redis, chain RPC, signer execution, scanner events, eventual consistency, and in-memory state. The cost becomes manageable if split into role boundaries and verified with replay/load tests.

## Decomposed Roadmap

### Phase 0: Baseline And Guardrails

Goal: make the current monolith observable and explicitly owned.

- Build keeper runtime inventory: endpoints, goroutines, cron jobs, queues, global managers, Redis keys, DB tables, sys_config keys, external callers.
- Define owner matrix by domain: perp order, position, pool, prediction/event, scanner, risk, campaign, notice, reward, admin config.
- Add SLOs and dashboards for scanner lag, execution queue depth, order trigger latency, tx submit/confirm latency, settlement lag, config reload failures, and restart recovery time.
- Add release checklist labels: API-only, execution, scanner, scheduler/risk, prediction/event, pool, campaign, config/admin.

### Phase 1: Ports And Internal Boundaries

Goal: keep one binary, but stop new work from depending on package globals.

- Introduce ports/interfaces for order store, position store, command store, price source, chain executor, scanner event sink, config source, risk evaluator, and notification publisher.
- Wrap `GlobalOrderMgr`, `GlobalMatcher`, `GlobalPositionMgr`, and `GlobalCfgMgr` behind role-specific adapters.
- Split large files by responsibility only where interfaces already exist.
- Add domain tests that can boot a role with fake ports instead of the whole service.

### Phase 2: Idempotency And Durable Commands

Goal: make write operations replay-safe before moving them across processes.

- Define command schema for create/update/cancel/execute order, liquidity, prediction open/settle, compensation, admin sync, and reward/notice jobs.
- Add idempotency keys and dedupe rules per command type.
- Persist command status, retries, owner shard, last error, and chain tx hash.
- Add replay tests for duplicate command receive, worker crash after chain submit, scanner lag, and compensation retry.

### Phase 3: Runtime Role Flags And Leases

Goal: run one codebase as multiple roles safely.

- Add role flags such as `api`, `executor`, `indexer`, `scheduler-risk`, `event-settlement`, `pool-worker`, `ops-worker`.
- Add leases for singleton loops and shard assignments.
- Disable non-owned loops by default per role.
- Run staging with separate role deployments but same codebase.

### Phase 4: Extract Low-Risk Roles

Goal: reduce blast radius before touching execution correctness.

- Move voucher notices, DreamFund scheduled jobs, reward/statistic jobs, and account notices into `keeper-ops-worker`.
- Move pool cron/snapshot/LP price jobs into `keeper-pool-worker` if pool ownership is clear.
- Keep user-facing API and chain execution unchanged during this phase.

### Phase 5: Extract Execution And Indexer

Goal: unlock real scalability and reliability for core trading.

- Run `keeper-api-command` stateless for command intake.
- Run `keeper-executor` from durable command queue/outbox.
- Run `keeper-indexer` with explicit chain cursor leases and compensation ownership.
- Prove recovery: kill worker during chain submit, restart scanner, replay pending commands, verify no duplicate settlement/order execution.

### Phase 6: Prediction/Event Vertical

Goal: prepare for prediction market expansion.

- Give prediction/event orders their own state machine document, config registry, settlement ownership, and load-test plan.
- Move event settlement to its own worker role.
- Keep shared execution primitives, but separate product-specific risk/config/settlement code from perpetual DEX order logic.

## Other Thoughts

- Do not start by moving repos. The first unit of decoupling should be runtime roles and durable contracts, not repository boundaries.
- Do not enable HPA on the current all-in-one keeper binary. HPA should wait until singleton loops are protected by leases or disabled per role.
- Keep the public API stable during migration. `cex-api-service` already routes SVM/perp and prediction traffic to keeper endpoints; avoid changing this contract until the backend command path is proven.
- Make observability a blocking dependency for refactor success. Without lag/depth/latency/recovery metrics, the team cannot tell whether a split improved reliability or just moved bottlenecks.
- Treat prediction/event-contract growth as a forcing function. The existing keeper can carry MVP expansion, but new prediction-market scale should not inherit perpetual DEX singleton assumptions.
- Define "done" for the upgrade as operational behavior, not code structure: API can scale horizontally, singleton workers have leases, commands are replay-safe, scanner lag is bounded, restart recovery is measured, and campaign changes no longer restart core execution.
