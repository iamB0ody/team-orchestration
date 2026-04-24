# Final: angular-scaffold — wave 4 live

## What shipped

Two new apps. First browser-rendered dashboard.

### `apps/dashboard-server` — Node stdlib HTTP server
Zero external deps, ~200 lines. 5 routes: `/api/{health, workspaces, missions, mission, telemetry}`. CORS enabled. Port 4117 default. Wraps `@team-orchestration/core` directly. Architecture mirror of the future Electron IPC contract.

### `apps/dashboard` — Angular 21 standalone zoneless app
~670 lines. Signals, `@if`/`@for`, OnPush, `inject()`, esbuild builder. Hacker theme from `libs/ui/tokens/theme.scss`. JetBrains Mono. Two routes: workspaces grid + missions table with filter pills. 68.85 KB initial transfer (production build).

## Try it (in two terminals)

```bash
cd /Volumes/SanDiskSSD/mine/team-orchestration

# Terminal 1
pnpm dashboard:server
# ▶ team-orchestration dashboard-server v0.0.1
#   listening on http://localhost:4117

# Terminal 2
pnpm dashboard:serve
# Opens browser at http://localhost:4200 automatically
```

Flow:
1. Browser opens to workspace grid — shows the 2 workspaces seeded in your `~/.config/team-orchestration/workspaces.json` (Shamil + team-orchestration) with their live mission counts.
2. Click a workspace card → missions table for that workspace with filter pills (all / active / paused / done / cancelled / archived) and per-status counts.
3. Hacker theme throughout: black bg, terminal-green accents, JetBrains Mono, bracketed status pills, ASCII dividers, no rounded corners.

## Numbers

- **2 new apps** — dashboard-server (Node stdlib) + dashboard (Angular 21)
- **~870 lines of new code** (~200 server + ~670 Angular app incl. SCSS)
- **15 new files**
- **32/32 vitest tests still green** — no parser regressions
- **Build:** 68.85 KB initial transfer, 3.6s esbuild
- **End-to-end verified** — curl against all 3 content endpoints returns correct JSON; Shamil renders 17 active / 21 done / 38 total missions
- **TS bumped 5.6 → 5.9** across all packages (Angular 21 peer requirement)
- **~7 min active work** (consistent per-wave budget)

## Commit plan (atomic C10 pair)

1. `feat(dashboard,dashboard-server): Angular 21 scaffold + HTTP server for browser-rendered dashboard (mission 0004)` — ~20 files including both app trees, mission folder, REGISTRY row with `_(pending, backfill)_`
2. `chore(missions): backfill 0004 SHA` — per widened C7

## What's shipped end-to-end across waves 1-4

| Wave | Output | User-facing |
|------|--------|-------------|
| 1 | Parser + CLI list | `pnpm tot missions <path>` |
| 2 | state.md parser + drill-down | `pnpm tot mission <path> <id>` |
| 3 | JSONL parser + live join | `pnpm tot mission <path> <id> --telemetry` |
| **4** | **HTTP server + Angular app** | **browser at localhost:4200** |

After wave 4 you can actually *see* the data in a themed UI, not just in a terminal. It's a real app that renders real data.

## What's next

**Wave 4.5 — mission drill-down in the UI** (~30 min)
- New `/mission?path=&id=` route + `MissionDetailComponent`
- Consumes `/api/mission` + `/api/telemetry`
- Renders identity / timing / cost / tool-use / sub-agents / activity log
- ~200 lines of pure Angular presentation work

**Wave 5 — Electron shell** (~45 min)
- `apps/dashboard-electron/` main + preload
- Replace `fetch` in `ApiService` with `window.api.*`
- IPC contracts in `libs/ipc/`
- electron-builder → `.dmg` / `.AppImage` / `.msi`
- electron-updater via GitHub Releases

**Wave 6 — polish** (~hour)
- Workspace card responsive sizing
- Click-to-sort on missions table
- Command-palette search (`Cmd+K`)
- Optional CRT scanline toggle in settings

## Known gaps

- **No mission drill-down in browser yet** — use the CLI. Wave 4.5 adds it.
- **No auto-refresh** — manually refresh the browser for now. File-watcher + live push comes in wave 5+.
- **No workspace add/remove UI** — user edits JSON config by hand. Wave 6 polish concern.
- **`<synthetic>` model name** still surfaces in future telemetry view — UI layer can filter in wave 4.5.

## Deliverables index

- `brief.md` — scope, classification, pipeline, assumptions
- `state.md` — frontmatter + activity log
- `impl/T-001.md` — what built, decisions, self-verification, handoff
- `final.md` (this file)
