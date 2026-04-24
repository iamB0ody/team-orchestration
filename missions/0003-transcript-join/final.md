# Final: transcript-join — wave 3 shipping

## What shipped

Last pure-parser wave. `libs/core` now has the typed TS equivalent of SKILL.md §12 principle 13's bash+jq recipe — the same logic that computes mission cost from JSONL transcripts, now callable from any consumer (CLI, Angular, future VSCode ext).

**New:** `tot mission <ws> <id> --telemetry` flag that runs the live join on disk and compares against the frontmatter's stored values.

## Try it

```bash
cd /Volumes/SanDiskSSD/mine/team-orchestration

# Drill-down + live-computed cost from transcripts
pnpm tot mission /Volumes/SanDiskSSD/mine/shamil 0029 --telemetry
pnpm tot mission /Volumes/SanDiskSSD/mine/shamil 0020 --telemetry -t  # short form
pnpm tot mission /Volumes/SanDiskSSD/mine/shamil 0034 --telemetry
```

You'll see the usual drill-down **plus** a live-telemetry block showing:
- Window bounds + file counts (parent + sub-agent jsonls scanned)
- Turn count, aggregated tokens (all 4 categories), models used
- **Tool-use top-8** — what the supervisor + agents actually ran
- **Sub-agents list** — by `agentType` (shamil-product-manager, shamil-solutions-architect, etc.) with turn counts + descriptions
- **Frontmatter vs Live delta** — `+0 (<1%) ✓` when backfilled values match; `+N (X.X%) !` if drifted

## Numbers

- **310 lines of TS** in 2 new source files (transcript 180 + join 130)
- **17 new vitest tests** — 9 unit + 8 integration against a tempdir fixture
- **32/32 total tests green**
- **~7 min active work** (consistent with waves 1-2 per-wave budget)
- **Zero new deps** — pure Node fs/readFile + existing `@team-orchestration/shared-types`

## Commit plan (atomic C10 pair)

1. `feat(cli,core,shared-types): JSONL transcript parser + time-window join + --telemetry (mission 0003)` — 9 files + REGISTRY
2. `chore(missions): backfill 0003 SHA` — per widened C7

## What unlocks

The entire data pipeline for the dashboard is now done:
- Workspace registry → list workspaces (wave 1)
- REGISTRY.md → list missions (wave 1)
- state.md → mission detail (wave 2)
- JSONL transcripts → live cost + tool-use + sub-agent timeline (wave 3, this)

Every number the Angular dashboard will render already exists as a typed value in `libs/core`. Wave 4+ is presentation-layer work only: Angular routes + components around the same three parsers.

## What's next

**Wave 4 — Angular 21 app scaffold** (~45 min mission, my estimate)
- `nx g @nx/angular:app dashboard`
- Routes: workspaces → missions → mission-detail
- Standalone components + signals + @if/@for
- Import `libs/ui/tokens/theme.scss`
- Runs in a browser first (`ng serve`); no Electron yet

After wave 4, you'll have a clickable dashboard at localhost.

## Known limitations

- **Multi-session undercount** (carry-over from mission 0034) — if a mission's work spread across concurrent Claude Code sessions, join only walks `transcript_session_ids[]` which may list one. Follow-up mission: expand the recipe to include mtime-based fallback discovery of sessions whose events fall in the window.
- **`<synthetic>` model** surfaces in model list. Real data, not noise. Presentation layer can filter if desired; `libs/core` preserves signal.
- **Per-stage slicing not implemented.** Join is on `[created, finished_at]` — full-mission window. To answer "which stage used most tokens," slice by activity-log timestamp boundaries. Follow-up wave.

## Deliverables index

- `brief.md` — scope, classification, pipeline
- `state.md` — frontmatter + activity log
- `impl/T-001.md` — what built, decisions, self-verification, handoff signals
- `final.md` (this) — commit-ready synthesis
