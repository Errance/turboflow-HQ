# Turboflow-HQ

HQ for Turboflow repos.

This repository is the Magic Flow orchestration context for Turboflow.

## Project Policy

- Product GitHub org: `turboflow-xyz`
- HQ GitHub repo: `wenqingyu/Turboflow-HQ`
- Project GitHub account: `thomson-yee`
- This HQ is the reviewer and supervisor context for Turboflow repositories.

## Key Paths

- `ops/repos.json`: repo registry and routing metadata
- `ops/policy.json`: project account and oversight policy
- `ops/repo-index.json`: discovered organization repositories and sync state
- `ops/workers.json`: active and historical worker state
- `specs/technical-assets/`: reviewed technical assets and internal operating guides
- `ops/infra.json`: infrastructure registry
- `prd/`: PRDs for decomposition into Linear work
- `specs/`: architecture, API, and data model references
- `releases/`: changelog and release notes

## Environment

```sh
export MAGIC_HQ_PATH="/Users/wenqingyu/Documents/workspace/turboflow/Turboflow-HQ"
export CLAUDE_HQ_PATH="/Users/wenqingyu/Documents/workspace/turboflow/Turboflow-HQ"
```
