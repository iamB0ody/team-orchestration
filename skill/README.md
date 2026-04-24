# skill/

Source of truth for the team-orchestration workflow skill.

## Files

- **`SKILL.md`** — ~900-line machine-readable spec. Single authoritative document. Originally distilled from the Shamil project's `shamil-orchestration` skill and its compounding CTO-retro evolution (see C1–C11 anchors inside).

## How it gets into Claude Code

Symlinked by `scripts/install.sh`:

```
skill/SKILL.md
  └──► ~/.claude/skills/team-orchestration-source/SKILL.md
```

Anyone editing `~/.claude/skills/team-orchestration-source/SKILL.md` is actually editing this file. `tot-sync` (also in `scripts/`) verifies no drift.

## Editing

- Edit from anywhere (inside a consuming project's Claude Code session, this repo, or directly)
- The edit lands in `skill/SKILL.md` via the symlink
- Commit it via `./scripts/tot-commit-skill <path-to-originating-mission-folder>` to keep the cross-repo audit trail per C12

## Versioning

The workflow has no explicit semver today (proposed for CI); anchors C1–C11 are the effective version markers. Each anchor cites its originating mission (mission 0007 spawned C1/C2/C4/C5; mission 0020 spawned C6/C7; mission 0027 spawned C8/C9; mission 0028 spawned C10; mission 0029 spawned C11; mission 0034 spawns C12).
