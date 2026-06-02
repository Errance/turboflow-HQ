# Turboflow Repo Index

This document summarizes repository discovery for the `turboflow-xyz` GitHub organization. The structured source of truth is `ops/repo-index.json`.

## Current Sync

- Source org: `https://github.com/turboflow-xyz`
- Sync method: authenticated GitHub CLI API
- Active GitHub account: `thomson-yee`
- Private repos visible: `14`
- Local checkouts cloned: `14`
- Local root: `/Users/wenqingyu/Documents/workspace/turboflow`

## Indexed Repos

| Repo | Stack | Module / Purpose | Local Path |
|------|-------|------------------|------------|
| `base` | Go library | `github.com/turboflow-xyz/base` | `/Users/wenqingyu/Documents/workspace/turboflow/base` |
| `framework` | Go library | `github.com/turboflow-xyz/framework` | `/Users/wenqingyu/Documents/workspace/turboflow/framework` |
| `cex-api-service` | Go service | `github.com/turboflow-xyz/cex-api-service` | `/Users/wenqingyu/Documents/workspace/turboflow/cex-api-service` |
| `cex-chain-listen-service` | Go service | `github.com/turboflow-xyz/cex-chain-listen-service` | `/Users/wenqingyu/Documents/workspace/turboflow/cex-chain-listen-service` |
| `cex-mgt-backend` | Go service | `github.com/turboflow-xyz/cex-mgt-backend` | `/Users/wenqingyu/Documents/workspace/turboflow/cex-mgt-backend` |
| `cex-oracle-service` | Go service | `github.com/turboflow-xyz/cex-oracle-service` | `/Users/wenqingyu/Documents/workspace/turboflow/cex-oracle-service` |
| `cex-order-service` | Go service | `github.com/turboflow-xyz/order-service` | `/Users/wenqingyu/Documents/workspace/turboflow/cex-order-service` |
| `surfv2-dex-svm-keeper` | Go service | `github.com/turboflow-xyz/surfv2-dex-svm-keeper` | `/Users/wenqingyu/Documents/workspace/turboflow/surfv2-dex-svm-keeper` |
| `surfv2-dex-svm-user-service` | Go service | `github.com/turboflow-xyz/surfv2-dex-svm-user-service` | `/Users/wenqingyu/Documents/workspace/turboflow/surfv2-dex-svm-user-service` |
| `oracle-slippage` | Go service | `github.com/turboflow-xyz/oracle-slippage` | `/Users/wenqingyu/Documents/workspace/turboflow/oracle-slippage` |
| `turbo-soccer-book-service` | Go service | `github.com/turboflow-xyz/soccer-book-service` | `/Users/wenqingyu/Documents/workspace/turboflow/turbo-soccer-book-service` |
| `turboflow-fireblocks-sdk-go` | Go library | `github.com/turboflow-xyz/turboflow-fireblocks-sdk-go` | `/Users/wenqingyu/Documents/workspace/turboflow/turboflow-fireblocks-sdk-go` |
| `amber-helm-charts` | Helm charts | ArgoCD deployment charts | `/Users/wenqingyu/Documents/workspace/turboflow/amber-helm-charts` |
| `amber-cicd-lib` | GitHub Actions library | reusable CI/CD workflows | `/Users/wenqingyu/Documents/workspace/turboflow/amber-cicd-lib` |
| `qa-grocery` | QA assets | `thomson-yee/qa-grocery`; product API docs, test cases, and simulators for football prediction market and event contracts | `/Users/wenqingyu/Documents/workspace/turboflow/qa-grocery` |

## Initial Dependency Signals

- `framework` is a foundational Go library.
- `base` depends on `framework` and `turboflow-fireblocks-sdk-go`.
- Most Go services depend on `base` and `framework`.
- Chain/order/user-service repos also depend on `turboflow-fireblocks-sdk-go`.
- `amber-helm-charts` contains deployment charts for many services, including repos not yet visible as code repos in this org sync.
- `amber-cicd-lib` provides shared GitHub Actions workflows.

## Next Topology Work

1. Parse each `go.mod` into a dependency graph.
2. Map Helm chart apps to service repos and identify charts without corresponding code repos.
3. Inspect service entrypoints, ports, queues, databases, and external APIs.
4. Produce a repo topology document under `specs/architecture-decisions/`.

The first topology draft is now tracked in `specs/architecture-decisions/0001-current-turboflow-topology.md`.
