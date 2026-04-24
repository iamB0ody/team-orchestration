# CI — TODO

Planned workflows (scaffolded in mission M2 or a dedicated CI mission):

## `lint-and-test.yml`

- On: push / PR
- Steps: pnpm install → `nx run-many -t lint test`
- Matrix: Node 20, Node 22
- Cache: pnpm store + nx cache

## `build-dashboard.yml`

- On: tag push `dashboard-v*`
- Steps: build Angular renderer → build Electron main → package for `.dmg` / `.AppImage` / `.msi` → upload artifacts to GitHub Releases
- Runs on: macos-latest, ubuntu-latest, windows-latest

## `sync-check.yml`

- On: push to main
- Steps: verify `skill/SKILL.md` hasn't drifted from the previous HEAD without a matching `docs(skill):` / `chore(skill):` commit
- Purpose: catch accidental edits that skipped `tot-commit-skill`

## `schema-version-bump.yml`

- On: PR labeled `schema-breaking`
- Steps: bump `WorkflowSchemaVersion` token in `libs/shared-types/`
- Purpose: dashboard pins by schema version and shows a drift banner when mismatched

Nothing here yet. CI infra lands in its own mission.
