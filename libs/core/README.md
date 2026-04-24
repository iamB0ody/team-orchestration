# @team-orchestration/core

Pure TypeScript parser + join library. Angular-free. Runs in Node and browser (Electron renderer).

## Scope (implemented in M2 — dashboard-mvp)

- `workspace-reader` — list workspaces, watch for mission folder changes
- `mission-parser` — parse `state.md` frontmatter (yaml) + activity-log (markdown)
- `registry-parser` — parse `REGISTRY.md` tables (Active / Done / Cancelled / Archived)
- `transcript-stream` — stream-parse JSONL, emit typed events; tolerant of unknown event types (log-and-skip)
- `join` — time-slice transcripts by mission window `[created, finished_at]`; discover sub-agent jsonl files
- `roll-up` — aggregate tokens / tools / agents / models per stage per mission

## Schema

Zod schemas for every transcript event type, mission state shape, and join output. Source-of-truth for type safety across the Electron main process and Angular renderer.

## Test

```bash
pnpm -F @team-orchestration/core test
```

Status: **scaffold only** — implementation lands in mission M2 (dashboard-mvp).
