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
| 0001 | dashboard-mvp-wave-1-cli | FEATURE-S | done | `2c8781c` | 0 | ~20m active | 2026-04-24 | Wave 1 of M2 dashboard MVP: parser + CLI. libs/shared-types + libs/core (registry.ts + workspace.ts + 7 vitest tests green) + apps/cli (hacker theme + ANSI colors). Validated against Shamil. Angular/Electron shell in later waves. |
| 0002 | state-md-parser | FEATURE-S | done | `3caf8ea` | 0 | ~7m active | 2026-04-24 | Wave 2 of M2: state.md parser (libs/core/mission.ts, 8 vitest tests) + `tot mission <id>` drill-down CLI with cost/activity rendering. YAML leading-zero fix. Depends: 0001. |
| 0003 | transcript-join | FEATURE-S | done | `08aa5d9` | 0 | ~7m active | 2026-04-24 | Wave 3 of M2: JSONL transcript parser (transcript.ts) + time-window join engine (join.ts) + `tot mission --telemetry` CLI flag. 17 new tests → 32/32 green. Reconciles frontmatter vs live cost at ±1%. Depends: 0001, 0002. |
| 0004 | angular-scaffold | FEATURE-F | done | `2a40c2c` | 0 | ~8m active | 2026-04-24 | Wave 4 of M2: Node stdlib HTTP server (5 routes) + Angular 21 standalone zoneless app (2 routes, hacker theme, 68.85 KB bundle). 32/32 tests still green. TS 5.6→5.9. Depends: 0001-0003. |
| 0005 | branding-prep | TRIVIAL | done | _(pending, backfill)_ | 0 | ~2m active | 2026-04-24 | App-icon SVG master (1024×1024 λ) + Electron de-branding checklist (40+ items for waves 5 & 7). User: "make fully sure of [de-branding]". Depends: 0004. |

## Cancelled

_(none yet)_

## Archived

_(none yet)_
