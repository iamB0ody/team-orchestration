# Final: state-md-parser — wave 2 shipping

## What shipped

`tot mission <workspace> <id>` drill-down works. Per-mission rendering includes identity, timing, deps, cost (C11 auto-captured), transcript sessions, cross-repo commits (C12), and activity log with C8 session tags.

## Try it (you can test now)

```bash
cd /Volumes/SanDiskSSD/mine/team-orchestration

# Drill into a known mission
pnpm tot mission /Volumes/SanDiskSSD/mine/shamil 0029

# Short ID works (auto-pads)
pnpm tot mission /Volumes/SanDiskSSD/mine/shamil 29

# Show full activity log
pnpm tot mission /Volumes/SanDiskSSD/mine/shamil 0019 --log-limit 0

# List view still works
pnpm tot missions /Volumes/SanDiskSSD/mine/shamil --status done
```

## Numbers

- **2 new source files + 1 barrel update + 1 dep addition + 1 CLI expansion**
- **~495 lines of new TypeScript** (parser 190 + tests 125 + CLI additions 180)
- **15/15 vitest tests green** (7 registry + 8 mission)
- **~7 min active** (faster than wave 1 — less scaffolding)
- **1 dep added** — `yaml@^2.6.0`; pnpm install 2.6s
- **End-to-end validated** against real Shamil state.md files (0001 legacy, 0029 modern w/ tokens, 0034 w/ cross-repo commits)

## Commit plan (atomic C10 pair)

1. `feat(cli,core): add state.md parser + tot-mission drill-down (mission 0002)` — 7 files + lock
2. `chore(missions): backfill 0002 SHA` — per widened C7

## Known limitations

- **Gate history + pause history not rendered yet.** Activity log stops at next `##` heading. Wave 3 decides UX.
- **No telemetry recomputation.** Drill-down shows numbers from `state.md` frontmatter. If that frontmatter is null (common for pre-C11 missions), cost section hides. Wave 3 adds live-compute from JSONL transcripts.
- **No file watching.** Run the CLI to refresh.
- **Activity text truncated at 140 chars.** `--log-limit 0` shows all entries, each still truncated per-entry. `--full` flag for per-entry full text is a follow-up.

## What's next

Wave 3 = JSONL transcript parser + time-window join. Unlocks live cost recomputation (what principle 13's recipe does in bash, now in TS, reusable by the Angular app). After wave 3, the CLI rendering is feature-complete; wave 4+ is presentation-only.

## Deliverables index

- `brief.md` — ~70 lines; scope, classification, pipeline
- `state.md` — frontmatter + activity log
- `impl/T-001.md` — what built, decisions, self-verification, handoff
- `final.md` (this) — commit-ready synthesis
