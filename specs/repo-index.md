# Turboflow Repo Index

This document summarizes repository discovery for the `turboflow-xyz` GitHub organization. The structured source of truth is `ops/repo-index.json`.

## Current Sync

- Source org: `https://github.com/turboflow-xyz`
- Sync method: authenticated GitHub CLI API with local clone verification; final fetch verification transport-degraded
- Active GitHub account: `thomson-yee`
- Visible org repos: `13`
- Private repos visible: `11`
- Public repos visible: `2`
- Local org checkouts cloned: `13`
- Local root: `/Users/wenqingyu/Documents/workspace/turboflow`
- Last checked: `2026-06-05T02:55:20Z`

## Indexed Repos

| Repo | Stack | Module / Purpose | Local Path |
|------|-------|------------------|------------|
| `DefiLlama-Adapters` | DefiLlama adapters | External analytics adapter repo | `/Users/wenqingyu/Documents/workspace/turboflow/DefiLlama-Adapters` |
| `base` | Go library | `github.com/turboflow-xyz/base` | `/Users/wenqingyu/Documents/workspace/turboflow/base` |
| `cex-api-service` | Go service | `github.com/turboflow-xyz/cex-api-service` | `/Users/wenqingyu/Documents/workspace/turboflow/cex-api-service` |
| `cex-mgt-backend` | Go service | `github.com/turboflow-xyz/cex-mgt-backend` | `/Users/wenqingyu/Documents/workspace/turboflow/cex-mgt-backend` |
| `cex-oracle-service` | Go service | `github.com/turboflow-xyz/cex-oracle-service` | `/Users/wenqingyu/Documents/workspace/turboflow/cex-oracle-service` |
| `cex-order-service` | Go service | `github.com/turboflow-xyz/order-service` | `/Users/wenqingyu/Documents/workspace/turboflow/cex-order-service` |
| `explorer` | Frontend | Public explorer web app | `/Users/wenqingyu/Documents/workspace/turboflow/explorer` |
| `framework` | Go library | `github.com/turboflow-xyz/framework` | `/Users/wenqingyu/Documents/workspace/turboflow/framework` |
| `oracle-slippage` | Go service | `github.com/turboflow-xyz/oracle-slippage` | `/Users/wenqingyu/Documents/workspace/turboflow/oracle-slippage` |
| `surfv2-dex-svm-keeper` | Go service | `github.com/turboflow-xyz/surfv2-dex-svm-keeper` | `/Users/wenqingyu/Documents/workspace/turboflow/surfv2-dex-svm-keeper` |
| `turbo-manabesh-data-service` | TypeScript service | Manabesh data service | `/Users/wenqingyu/Documents/workspace/turboflow/turbo-manabesh-data-service` |
| `turbo-soccer-book-service` | Go service | `github.com/turboflow-xyz/soccer-book-service` | `/Users/wenqingyu/Documents/workspace/turboflow/turbo-soccer-book-service` |
| `turboflow-fireblocks-sdk-go` | Go library | `github.com/turboflow-xyz/turboflow-fireblocks-sdk-go` | `/Users/wenqingyu/Documents/workspace/turboflow/turboflow-fireblocks-sdk-go` |
| `qa-grocery` | QA assets | `thomson-yee/qa-grocery`; product API docs, test cases, and simulators for football prediction market and event contracts | `/Users/wenqingyu/Documents/workspace/turboflow/qa-grocery` |

## Registry Changes on 2026-06-05

Newly visible and cloned org repos:

- `DefiLlama-Adapters`
- `explorer`
- `turbo-manabesh-data-service`

Removed from active HQ governance because GitHub returned 404 for the registered org URLs:

- `cex-chain-listen-service`
- `surfv2-dex-svm-user-service`
- `amber-helm-charts`
- `amber-cicd-lib`

The stale local checkout folders were left on disk for inspection, but they are no longer active entries in `ops/repos.json`.

Final fetch verification note: GitHub HTTPS/API transport returned EOF or SSL reset errors during the last live fetch check. The active repo set is cloned and indexed; commit heads in `ops/repo-index.json` are local checkout heads.

## Initial Dependency Signals

- `framework` is a foundational Go library.
- `base` depends on `framework` and `turboflow-fireblocks-sdk-go`.
- Most Go services depend on `base` and `framework`.
- `cex-order-service` also depends on `turboflow-fireblocks-sdk-go`.
- `DefiLlama-Adapters`, `explorer`, and `turbo-manabesh-data-service` are now tracked as visible org repos, but their product/runtime ownership needs a follow-up topology pass.

## Next Topology Work

1. Parse each `go.mod` into a dependency graph.
2. Inspect TypeScript repos for package scripts, runtime entrypoints, and deployment ownership.
3. Decide whether the stale local checkout folders should be archived, deleted, or mapped to renamed repos.
4. Inspect service entrypoints, ports, queues, databases, and external APIs.
5. Refresh `specs/architecture-decisions/0001-current-turboflow-topology.md` from the upgraded registry.
