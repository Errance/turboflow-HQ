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
4. `ops/roles.json`
5. `ops/workers.json`

## Key Paths

- `prd/`: product requirements and decomposition inputs
- `specs/`: architecture, API, and domain references
- `releases/`: release notes and changelog outputs
- `ops/repos.json`: registered repos and project routing data
- `ops/roles.json`: role label to GitHub account mapping
- `ops/workers.json`: active and historical worker state

## Registered Repos

See `ops/repos.json` for the complete registry.

## Workflow Conventions

- Treat this repo as orchestrator context, not the main implementation repo.
- Use product repos for code changes unless the task is explicitly HQ-only.
- Keep repo metadata in `ops/*.json` current.
- Do not create separate Claude-only and Codex-only workflow rules.

## Environment

- HQ Path: `/Users/wenqingyu/Documents/workspace/turboflow/Turboflow-HQ`
- GitHub org: `wenqingyu`
- Linear workspace: `TBD`

## Verification

- Validate JSON files after edits.
- Keep repo paths and project IDs in sync with the actual repos.
- Review release and worker state changes for drift.

If `.claude/CLAUDE.md` also exists, it is the Claude-specific companion to this file. Both files should describe the same project contract.
