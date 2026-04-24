# Brief: transcript-join — wave 3 of dashboard-mvp

## Ask

Continue M2 dashboard MVP. Wave 1 shipped REGISTRY parsing (mission 0001); wave 2 shipped state.md parsing + drill-down (mission 0002). Wave 3 is the last pure-parser wave: JSONL transcript parser + time-window join engine, surfaced via a `tot mission --telemetry` flag that live-recomputes cost from disk and compares against the frontmatter values.

This is the typed TS implementation of SKILL.md §12 principle 13's bash+jq recipe. Same logic; reusable by the Angular app (wave 4+) without shelling out.

## Scope

1. **`libs/core/src/transcript.ts`** — JSONL reader + typed event normalizer. Whitelist dispatch on `.type`, log-and-skip unknowns, field-presence parsing for `.message.usage.*`, sub-agent jsonl/meta.json discovery helpers, `workspaceHash` path-transform utility.
2. **`libs/core/src/join.ts`** — `joinMission(state, options)` — for each `transcript_session_ids[]`, load parent + sub-agent jsonls, filter by `[created, finished_at]`, aggregate tokens / models / tool-counts / sub-agent breakdown. Returns typed `SessionSlice`.
3. **Shared types** — new `TranscriptEvent`, `TurnUsage`, `SessionSlice` in `@team-orchestration/shared-types`.
4. **Tests** — 9 vitest tests on transcript parser + 8 on join engine (integration-style against a synthetic tempdir jsonl). Total project tests now **32/32 green**.
5. **CLI** — `tot mission <ws> <id> --telemetry` flag. Renders a live-telemetry block: window, sessions scanned, files read, turns, tokens breakdown, models, top-8 tool-use frequencies, sub-agents with agentType + description + turn-count, and a **frontmatter-vs-live delta** with green ✓ when within 1%, amber ! otherwise.

## Out of scope (later waves)

- File watching (`chokidar` in Electron main) — reruns join on jsonl mtime change
- Angular renderer for the same data — wave 4
- Per-stage slicing within a mission — slice by activity-log entry windows, not just [created, finished_at]. Useful for "which stage used most tokens" — follow-up mission.
- Multi-workspace aggregation — "show me total cost across all my missions this week"
- Cost estimation in USD for API-plan users — compute from list price per model

## Assumptions

- Full-load of jsonl files is fine at current scale (~1–10 MB files; up to ~50 MB is still under 1s). Switch to streaming only if any workspace exceeds ~100 MB.
- Sub-agent discovery: `<workspace-hash>/<sessionId>/subagents/agent-*.jsonl` + companion `.meta.json`. Verified against real Claude Code layout.
- Empty `transcript_session_ids[]` is valid — returns empty slice, not an error. Legitimate for pre-C8 missions.
- Unknown event types (e.g., future `image-attachment`) are counted into `unknownTypes` and the events still emit, so future upgrades degrade rather than crash.

## Classification

`FEATURE-S` — one library slice (`libs/core`) + one CLI flag + tests. Single specialist (supervisor).

## Pipeline

- Stage 0 brief.
- Stage 1 inline spec (in Scope).
- Stage 2 skipped.
- Stage 3 inline plan (single T-001).
- Stage 4 impl T-001 DONE.
- Stage 5 build-check: 32/32 tests green; `tot mission 0029 --telemetry` produces reconciled frontmatter-vs-live output with 0-delta ✓.
- Stage 6 commit gate A (user "continue" pre-approval): atomic C10 pair.
- Stage 12 done; auto-cost; SHA backfill.

## Next

Wave 4 = Angular 21 app scaffold. First non-CLI surface. Parser library is feature-complete; renderer layer is what remains.
