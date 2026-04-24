# team-orchestration — Mission Registry

Missions that evolve this repo. Consuming-project missions (e.g., Shamil's 0020 / 0034) live in their own project's `missions/` and cross-reference this registry via C12.

## Conventions

Same schema as the workflow defines in SKILL.md §4 (REGISTRY row format). Four tables: Active / Done / Cancelled / Archived.

## Active

| ID | Slug | Type | Status | Stage | Phase/Task | Depends on | Blocks | Duration | Cost | Last Update | Updated by |
|----|------|------|--------|-------|------------|------------|--------|----------|------|-------------|------------|

_(none yet)_

## Done

| ID | Slug | Type | Stage | Commit(s) | Iterations | Duration | Completed | Notes |
|----|------|------|-------|-----------|------------|----------|-----------|-------|
| 0001 | dashboard-mvp-wave-1-cli | FEATURE-S | done | _(pending, backfill)_ | 0 | ~20m active | 2026-04-24 | Wave 1 of M2 dashboard MVP: parser + CLI. libs/shared-types + libs/core (registry.ts + workspace.ts + 7 vitest tests green) + apps/cli (hacker theme + ANSI colors). Validated against Shamil. Angular/Electron shell in later waves. |

## Cancelled

_(none yet)_

## Archived

_(none yet)_
