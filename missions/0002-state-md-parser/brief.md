# Brief: state-md-parser — wave 2 of dashboard-mvp

## Ask

Continue building M2 dashboard MVP. Wave 1 shipped the REGISTRY parser + CLI list view (mission 0001). Wave 2 adds per-mission drill-down: parse `state.md` (YAML frontmatter + activity log) + `tot mission <workspace> <id>` subcommand to render full detail.

## Scope

1. **`libs/core/src/mission.ts`** — parse `state.md` files:
   - YAML frontmatter → `MissionState` (all 20+ fields)
   - Activity-log markdown section → `ActivityLogEntry[]` with C8 `session=<uuid>` tag extraction
   - Graceful handling of malformed YAML / missing frontmatter / pre-C8 lines / YAML leading-zero coercion (mission IDs like `0029` lose their zeros in YAML — pad back)
   - `findMissionFolder(workspacePath, id)` helper
2. **CLI `tot mission <workspace> <id>`** subcommand with full rendering:
   - Identity block (id, slug, type, status pill, stage, phase, task, gate, iterations)
   - Timing block (created, finished, last update, duration, active duration with human formatting)
   - Dependencies (depends_on in green, blocks in amber)
   - **Cost block (C11)** — turns, total tokens with k/M abbreviations, breakdown (input/output/cache_read/cache_creation), models, USD-or-null explanation
   - Transcript session IDs
   - Cross-repo commits (C12) if present
   - Activity log with `--log-limit N` (default 10, 0 = all), session-tag badge per entry, timestamp in short `HH:MM:SSZ` form
3. **Tests** — 8 vitest tests covering: full frontmatter parse, structured `session_tokens` object, array fields, C8 session tag extraction, pre-C8 bare lines, section-boundary respect, no-frontmatter tolerance, malformed YAML tolerance.
4. **Dependency** — add `yaml` to `libs/core/package.json`.

## Out of scope (later waves)

- JSONL transcript parser + time-slice join (wave 3)
- state.md activity-log writer (the dashboard is read-only per hard constraint)
- Angular app (wave 4+)
- File watching for live updates

## Assumptions

- YAML library = `yaml` package (already a listed dep in the stack plan; 2.6.x is the stable major)
- Leading-zero mission IDs must be handled at parse time (coerce back to 4-digit string)
- Activity-log section stops at the next `##` heading — Gate history / Pause history are out of scope for wave 2 (wave 3 may parse them if the drill-down view wants them)
- Text truncation at 140 chars per activity-log entry in the list view (user can `--log-limit 0` to see all; future "show full entry" gesture lands in the UI, not the CLI)

## Classification

`FEATURE-S` — single specialist (supervisor), single app + library slice, no cross-cutting architecture. Same shape as wave 1.

## Pipeline

- Stage 0 brief (this).
- Stage 1 inline spec (in brief §Scope).
- Stage 2 skipped.
- Stage 3 inline plan (single T-001).
- Stage 4 impl T-001 (DONE — see impl/T-001.md).
- Stage 5 build-check: all 15/15 vitest tests green (7 registry + 8 mission); end-to-end smoke against Shamil 0029 renders correctly.
- Stage 6 commit gate A (user pre-approved via "continue"): atomic C10 pair.
- Stage 12 done + auto-cost per C11 + SHA backfill per C7.

## Next

Stage 4 complete. Commit gate A.
