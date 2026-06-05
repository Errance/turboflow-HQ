# Turboflow HQ - Contributor Guide

This HQ repository coordinates the Magic Flow workflow for Turboflow repositories.

## Purpose

- PRDs and planning live here.
- Cross-repo project state is tracked here.
- `ops/*.json` is the source of truth for repo registration, worker state, roles, and infrastructure.

## Read First

1. `prd/`
2. `specs/`
3. `ops/repos.json`
4. `ops/policy.json`
5. `ops/roles.json`
6. `ops/workers.json`

## Key Paths

- `prd/`: product requirements and decomposition inputs
- `specs/`: architecture, API, and domain references
- `specs/technical-assets/`: reviewed technical assets and operating guides
- `releases/`: release notes and changelog outputs
- `ops/repos.json`: registered repos and project routing data
- `ops/policy.json`: project account and oversight policy
- `ops/repo-index.json`: discovered Turboflow organization repositories and sync state
- `ops/roles.json`: role label to GitHub account mapping
- `ops/workers.json`: active and historical worker state

## Registered Repos

See `ops/repos.json` for the complete registry.

## Project Policy

- Product GitHub org: `turboflow-xyz`
- HQ GitHub repo: `wenqingyu/Turboflow-HQ`
- Project GitHub account: `thomson-yee`
- We act as reviewer and supervisor for Turboflow repositories.
- Build and maintain the organization repo index in `ops/repo-index.json` before topology work.
- All current and future Turboflow repo registrations should use `github_account: "thomson-yee"` unless `ops/policy.json` is explicitly updated.
- After successful validation and commit of HQ-only changes, push `main` to `origin/main` without asking for per-change confirmation.

## Workflow Conventions

- Treat this repo as orchestrator context, not the main implementation repo.
- Use product repos for code changes unless the task is explicitly HQ-only.
- Keep repo metadata in `ops/*.json` current.
- Do not create separate Claude-only and Codex-only workflow rules.
- Never force-push or push failing validation without explicit confirmation.

## Product Workstream Documentation

- Product workstream docs live under `tasks/product-worksteams/`.
- For actively iterated products, group docs by version folder, for example `v2.2 - <version purpose>/`.
- Each version folder should contain an `Index.md` with:
  - version status and purpose,
  - a file index with per-file status,
  - a `## Progress` section with timestamped checkbox action logs.
- Standard version folder artifacts are:
  - `需求文档 - ...` for product requirements/design notes,
  - `API文档 - ... CN.md` for implementation/API docs from engineering,
  - `API文档 - ... EN.md` for aligned English translations.
- If an expected artifact does not exist yet, create a clearly named placeholder marked `TBD` in the filename and file body.
- Project-level indexes should list all versions, each version status, and progress summary.
- Do not encode personal responsibility fields such as owner, responsible person, assignee, or named contact in these indexes/placeholders. Use neutral status and support-channel language instead.
- Superseded or prior-version docs should be wrapped into the corresponding previous version folder, not left loose at the project root.

## Environment

- HQ Path: `/Users/wenqingyu/Documents/workspace/turboflow/Turboflow-HQ`
- GitHub org: `turboflow-xyz`
- Linear workspace: `TBD`

## Verification

- Validate JSON files after edits.
- Keep repo paths and project IDs in sync with the actual repos.
- Review release and worker state changes for drift.

If `.claude/CLAUDE.md` also exists, it is the Claude-specific companion to this file. Both files should describe the same project contract.
