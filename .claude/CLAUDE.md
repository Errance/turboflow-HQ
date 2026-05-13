# Turboflow HQ - Orchestration Context

## Project Metadata

- **Project:** Turboflow
- **Linear Workspace:** TBD
- **GitHub Org:** turboflow-xyz
- **HQ GitHub Repo:** wenqingyu/Turboflow-HQ
- **Project GitHub Account:** thomson-yee
- **HQ Path:** /Users/wenqingyu/Documents/workspace/turboflow/Turboflow-HQ
- **Created:** 2026-05-14

## Repos Under This Project

See `ops/repos.json` for full registry.
Quick view: `cat ops/repos.json | jq '.repos[].name'`

## Mode: ORCHESTRATOR

You are in HQ mode. Here you:

- Ingest PRDs from `prd/` and run `/mf-prd-decompose`.
- Monitor progress with `/mf-status`.
- Generate changelogs with `/mf-release-notes`.
- Do not write product code in this repo.

## Project Policy

- Use `thomson-yee` as the GitHub account for this project.
- Treat `turboflow-xyz` as the product repository organization.
- Treat this HQ as reviewer and supervisor context for Turboflow repositories.
- Use `ops/repo-index.json` as the starting point for repo study and later topology work.
- Before dispatching project implementation work, sync and study product repos in `ops/repos.json`.
- After successful validation and commit of HQ-only changes, push `main` to `origin/main` without asking for per-change confirmation.
- Never force-push or push failing validation without explicit confirmation.

## Workflow

1. Drop PRD in `prd/`, then run `/mf-prd-decompose prd/{file}.md`.
2. Review decomposition, then confirm to create Linear issues.
3. Dispatch workers with `/mf-dispatch {ISSUE-ID}` or the dispatcher.
4. Monitor with `/mf-status`.
5. After PRs merge, run `/mf-release-notes v{x.y.z}`.

## Key Files

| File | Purpose |
|------|---------|
| `ops/repos.json` | Repo registry; edit to add repos and fill in TBD fields |
| `ops/policy.json` | Project account and oversight policy |
| `ops/repo-index.json` | Discovered Turboflow organization repositories and sync state |
| `ops/workers.json` | Live worker state, written by hooks |
| `ops/dispatch-log.jsonl` | Audit trail of workers launched |
| `ops/infra.json` | Infrastructure registry |
| `releases/CHANGELOG.md` | Aggregated changelog across repos |

## Linear Project IDs

Fill these in after creating projects in Linear:

| Repo | Linear Project ID |
|------|-------------------|
| Turboflow-HQ | TBD |
