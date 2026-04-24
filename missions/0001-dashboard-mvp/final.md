# Final: dashboard-mvp wave 1 — CLI + parser shipped

## What shipped

Wave 1 of M2 is live: a working `tot` CLI that parses any workspace's `missions/REGISTRY.md` and renders it in a dark-terminal aesthetic. All of this runs on top of pure TypeScript types + parser in `libs/shared-types/` and `libs/core/`, which the Angular+Electron shell will consume unchanged in later waves.

**Run it today:**
```bash
cd /Volumes/SanDiskSSD/mine/team-orchestration
pnpm tot missions /Volumes/SanDiskSSD/mine/shamil --status done
pnpm tot missions /Volumes/SanDiskSSD/mine/shamil --limit 10
pnpm tot workspaces      # prompts to create config on first run
```

## Numbers

- **5 new TS files** in 2 libs + 1 app + 1 config
- **~550 lines of TypeScript** (types + parser + workspace reader + CLI)
- **7/7 vitest tests green** on registry.spec.ts
- **~20 min active work** after `pnpm install` completed (install itself was 2m 28s)
- **Validated against real data** — Shamil's full 35+ row REGISTRY renders cleanly
- **Zero Angular / Electron code** — shipped CLI-first intentionally

## Commit plan (atomic C10 pair)

1. `feat(cli,core,shared-types): ship M2 wave 1 — tot CLI + registry parser (mission 0001)` — full wave-1 tree + mission folder + REGISTRY row with `_(pending, backfill)_`
2. `chore(missions): backfill 0001 SHA` — per widened C7

Push both to `origin/main`.

## What unlocks

- Next wave can tackle state.md parsing + per-mission detail drill-down
- Next wave can start the Angular shell, wrapping the parser that's already working
- The user can add more workspaces to `~/.config/team-orchestration/workspaces.json` and start tracking multi-project status today

## Deliverables index

- `brief.md` (~90 lines) — ask, scope, assumptions, classification, inlined spec + plan
- `state.md` — auto-cost frontmatter (session_tokens null; see known limitations)
- `impl/T-001.md` — what built, decisions, self-verification
- `final.md` (this file)

## Known limitations (flagged, not blocking)

- **Auto-cost for this mission is null.** Principle 13's recipe needs both `created` and `finished_at` to compute — both are set, but the current session's transcript `62dfe4ef-...` hasn't flushed recent events (jsonl files buffer; last event visible was 07:04:54Z while I'm writing final.md at 08:01Z). Rather than write stale numbers, records null + notes the limitation. Multi-session aggregation follow-up from mission 0034 applies here too.
- **No state.md parser yet.** `libs/core/src/mission.ts` doesn't exist. Registry rows render; drilling into one mission's full detail comes in wave 2.
- **No file watching.** The CLI reads REGISTRY on invocation and exits. The Angular app in later waves will add a file watcher via `chokidar` in the Electron main process.
- **Workspace config must be manually created.** `tot workspaces` prints the config template on first run; no auto-import of existing workspace paths. Acceptable for MVP.
