# Brief: dashboard-mvp — wave 1 (CLI + parser lib)

## Ask

Deliver wave 1 of the M2 desktop-dashboard MVP planned by Shamil mission 0020 (dashboard-telemetry-join). User approved "go" after mission 0034 scaffolded this repo.

## Scope (wave 1)

Ship a working, runnable CLI that proves the parser + type contract before the Angular+Electron shell is built. Specifically:

1. **`libs/shared-types/src/index.ts`** — canonical TypeScript contracts: `MissionRegistryRow`, `MissionStatus`, `MissionStage`, `MissionType`, `MissionState`, `SessionTokens`, `WorkspaceInfo`, `ActivityLogEntry`.
2. **`libs/core/src/registry.ts`** — parse `missions/REGISTRY.md` → `MissionRegistryRow[]`. Tolerate schema drift (legacy types, empty/dash cells, non-canonical status labels, backtick SHAs, multi-table markdown).
3. **`libs/core/src/workspace.ts`** — read user config at `~/.config/team-orchestration/workspaces.json`, summarize each workspace's mission counts + last-update.
4. **`apps/cli/src/index.ts`** — `tot` CLI. Commands: `workspaces`, `missions <path>`. Flags: `--status`, `--limit`. Hacker-theme terminal output (green accents, bracketed status pills, dim grays, tabular columns).
5. **Tests** — vitest against `libs/core/registry.ts` with fixture covering: legacy type labels, depends_on / blocks arrays, done-table commits, empty cells, no-table input.
6. **Config example** — `config/workspaces.example.json` with the user's 4 known workspaces as a copy-paste starting point.

## Out of scope (later waves)

- Angular 21 app (`apps/dashboard/`)
- Electron main + preload (`apps/dashboard-electron/`)
- `libs/ui/` components (tokens already live from mission 0034)
- `libs/ipc/` contracts
- state.md parser (`libs/core/src/mission.ts`) — parses the `---` frontmatter + activity-log body
- JSONL transcript stream parser (`libs/core/src/transcript.ts`)
- Join engine (`libs/core/src/join.ts`)
- Sub-agent meta.json reader
- File watching for live updates
- Packaging (`electron-builder`, `.dmg` / `.AppImage`)

Each of the above is a follow-up mission in this repo. They can proceed in parallel once wave 1 is committed.

## Assumptions

- **CLI-first is the right first wave.** Validates the parser end-to-end against a real REGISTRY before any UI work. Also ships immediate user value — `pnpm tot missions /path/to/repo` works today.
- **Pure TypeScript, no framework.** `libs/core/` has zero Angular / Electron / React deps. Reusable by the future Angular app AND by the CLI AND by any future tool.
- **Workspace config is user-editable JSON**, not an auto-discovered filesystem scan. Explicit > magical. Config lives at `~/.config/team-orchestration/workspaces.json` following XDG Base Directory conventions.
- **Hacker theme in the CLI too**, not just the Angular app. Uses `picocolors` for ANSI output (tiny, no deps). Tokens conceptually match `libs/ui/tokens/theme.scss` (green, amber, dim gray, bracketed pills).
- **tsx for dev runtime.** The `tot` CLI runs directly from TypeScript source via tsx — no compile step during development. Production packaging compiles to JS + bundles via a later mission.
- **REGISTRY parser is permissive, not strict.** Schema tolerance is a feature. Legacy Shamil rows (mission 0001 uses `feature *(legacy schema)*`) must parse. Unknown cells become `null`.

## Classification

**Type:** `FEATURE-S` (one app/module, single specialist).

**Rationale:** Adds a net-new CLI app + meaningfully populates two libs. Single specialist (supervisor). No cross-cutting architectural concerns — the types + parser + CLI are a vertical slice. Per SKILL.md §3 FEATURE-S: spec | — | plan | 1 specialist | all 3 reviewers | 1 impl + 0–1 fixes. For wave 1 of this ambitious FEATURE-F (M2 as a whole), running as FEATURE-S for the slice is appropriate.

## Pipeline for this type

- Stage 0 — brief (this file).
- Stage 1 — spec (inlined below; no separate spec.md for wave 1 — 0020's architecture.md §9 "Post-M1 — unlocked" already defined success criteria).
- Stage 2 — skipped (FEATURE-S; no architecture).
- Stage 3 — plan (inlined: just T-001 for wave 1).
- Stage 4 — impl T-001 (DONE).
- Stage 5 — build-check: `pnpm -F @team-orchestration/core test` passed 7/7; `pnpm tot missions /Volumes/SanDiskSSD/mine/shamil` rendered correctly against real data.
- Stage 6 — commit gate A (user pre-approved via "go"): atomic C10 staging, then commit.
- Stage 7 — reviewers: self-review for wave 1 (supervisor acts as tech-lead + qa; security is trivially n/a — no secrets, no auth, no fs writes outside CLI-read).
- Stage 12 — done + auto-cost per C11 + SHA backfill per widened C7.

## Pre-existing working-tree drift

`team-orchestration` repo was fresh-scaffolded in commit `3e39a27` (mission 0034). Between then and now, node_modules/ was populated by `pnpm install`. `.gitignore` already excludes it. Nothing else outside this mission's scope changed.

## Spec (inlined)

### Success criteria for wave 1
- `pnpm tot workspaces` lists configured workspaces, or guides the user to create the config when none exist.
- `pnpm tot missions <absolute-path>` prints a hacker-themed table of missions for that workspace, parsed from its `missions/REGISTRY.md`.
- `--status done` / `--status active` filters work.
- `--limit N` caps the output.
- `pnpm -F @team-orchestration/core test` passes cleanly.
- Exit codes: `0` success, `1` usage error, `2` registry not found.

### User-visible rendering rules
- Status pills: `[ACTIVE]` green, `[PAUSED]` amber, `[DONE]` dim gray, `[CANCELLED]` red, `[ARCHIVED]` dim.
- Active-row ID also renders in accent green; others in foreground white.
- Columns tabular-spaced; slug capped at 36 chars with ellipsis.
- ASCII section dividers render in dim gray.
- Summary line: `TOTAL N   X active  Y done  Z paused`.

## Plan (inlined)

| Wave | Task | Owner | Files touched |
|------|------|-------|---------------|
| 1 | T-001 — parser + CLI + tests | supervisor | see `impl/T-001.md` |
| 2 (future) | state.md parser + activity-log join | specialist | `libs/core/src/mission.ts` |
| 3 (future) | JSONL transcript parser + join engine | specialist | `libs/core/src/{transcript,join}.ts` |
| 4 (future) | Angular app scaffold + routes | angular-expert | `apps/dashboard/` |
| 5 (future) | Electron main + preload + IPC | specialist | `apps/dashboard-electron/`, `libs/ipc/` |
| 6 (future) | UI components (hacker theme) | angular-expert | `libs/ui/src/*` |
| 7 (future) | File watching + live updates | specialist | `apps/dashboard-electron/src/watch.ts` |
| 8 (future) | Packaging via electron-builder | devops | `apps/dashboard-electron/electron-builder.json` |

## Next

Stage 4 complete (T-001). Going to commit gate A.
