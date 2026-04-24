# team-orchestration

A mission-based workflow for coordinating small software teams — and the tooling built on top of it.

This repo is **one source of truth** for:

1. **The workflow skill** (`skill/SKILL.md`) — rule book that governs how missions run.
2. **Agent prompts** (`agents/*.md`) — 12 role-scoped agents that collaborate on every mission.
3. **The desktop dashboard** (`apps/dashboard/`, coming soon) — read-only multi-workspace view of everything the workflow produces.
4. **Shared libraries** (`libs/{core,ui,shared-types,ipc}/`) — parser, design system, type contracts.
5. **Install + sync scripts** (`scripts/`) — symlink the skill + agents into `~/.claude/**` so every edit is git-tracked.

Originally distilled from the Shamil project (`shamil-orchestration` skill). Published public so anyone can adopt the pattern.

---

## What is the workflow?

A structured pipeline that turns a one-line ask into a shipped, reviewed, committed change. Every non-trivial task becomes a **mission**. Each mission has:

- A **brief** (what we're doing, why, and our assumptions)
- Optional **spec** (PM-level requirements)
- Optional **architecture** (system design)
- Optional **plan** (wave + task breakdown with priority + parallelism)
- **Impl** (one markdown file per task, written by a specialist agent)
- **Reviewers** (tech-lead / QA / security / UX — parallel when independent)
- **Commit gates** — the only points where the supervisor pauses for user approval
- **CTO retro** (meta-audit after close)

Missions track their state in `missions/NNNN-<slug>/state.md` and roll up into `missions/REGISTRY.md`. Every activity-log line carries a `session=<uuid>` tag (per rule **C8**) that joins to the Claude Code transcript on disk — so cost / tokens / agent activity per stage are computable automatically at close (rule **C11**).

See `skill/SKILL.md` for the full, machine-readable spec (~900 lines). It's the most authoritative resource in this repo.

---

## Install (one-machine setup)

```bash
git clone https://github.com/iamB0ody/team-orchestration.git
cd team-orchestration
./scripts/install.sh
```

`install.sh` is idempotent — it detects existing files at the target paths and prompts before overwriting. It:

1. Symlinks `skill/SKILL.md` → `~/.claude/skills/team-orchestration-source/SKILL.md`
2. Symlinks each `agents/*.md` → `~/.claude/agents/*.md`
3. Verifies the symlinks resolve
4. Prints next steps

After install, any edit to `skill/SKILL.md` or `agents/*.md` — whether done via this repo, inside another project's Claude Code session, or manually — becomes a git-tracked change here. That's the point: **one file on disk, many edit paths, one audit trail.**

---

## Cross-repo commit pattern

The `shamil-orchestration` skill evolved while being used inside the Shamil project. Pattern generalizes: you'll often edit workflow rules from inside a consuming project's Claude Code session. Per **C12** in `skill/SKILL.md`:

- **The consuming project's commit** captures only the mission folder + its REGISTRY row.
- **The workflow repo's commit** captures the SKILL.md / agent diff.
- The two commits **cross-reference each other** via a `Source: <workspace-path> :: Mission: NNNN-<slug>` line in the workflow repo's commit body.

Two helper scripts automate the split:

```bash
tot-commit-skill <workspace-path>/missions/NNNN-<slug>/
# auto-detects SKILL.md / agents drift vs HEAD, stages only those,
# creates a properly formatted commit body referencing the mission.

tot-sync
# dry-run diff between ~/.claude/** and this repo's source-of-truth
# files. Catches manual drift. Runs automatically in install.sh.
```

---

## Tech stack

Desktop dashboard (coming next mission):

- **Electron** (main process) + **Angular 21** (renderer, standalone + signals + @if/@for) — `apps/dashboard/` + `apps/dashboard-electron/`
- **Nx 22** workspace (`nx.json`)
- **pnpm** workspaces (`pnpm-workspace.yaml`)
- **Vitest** for libs, **Jest** for Angular apps
- **Angular CDK only** — no Material, no PrimeNG
- **@team-orchestration/ui** — custom hacker-theme component library (`libs/ui/`)
- **Fonts:** JetBrains Mono (default) — swap via `--font-mono` CSS var
- **Distribution:** `electron-builder` → `.dmg` / `.AppImage` / `.msi` + `electron-updater` via GitHub Releases

Parser lib is plain TypeScript (`libs/core/`), Angular-free, runs in both Node and the Electron renderer.

---

## Repo layout

```
team-orchestration/
├── skill/
│   └── SKILL.md                # source of truth for the workflow (912 lines)
├── agents/
│   └── *.md                    # 12 role-scoped agent prompts
├── apps/
│   ├── dashboard/              # Angular 21 renderer (Electron app) — scaffold only; M2 implements
│   └── dashboard-electron/     # Electron main + preload (TS, contextBridge) — scaffold only
├── libs/
│   ├── core/                   # parser: state.md + REGISTRY + JSONL transcripts + time-slice join
│   ├── ui/                     # design system + Angular components (hacker theme)
│   ├── shared-types/           # TS interfaces: MissionState, TranscriptEvent, SessionSlice
│   └── ipc/                    # typed IPC contracts (main ↔ renderer)
├── scripts/
│   ├── install.sh              # symlink into ~/.claude/**
│   ├── tot-commit-skill        # cross-repo helper: commit SKILL.md drift
│   └── tot-sync                # drift-check between ~/.claude/** and repo
├── tools/                      # custom Nx generators (future)
├── .github/workflows/          # CI — TODO
├── nx.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── LICENSE                     # MIT
└── README.md                   # this file
```

---

## Mission 0034 (Shamil-side)

This repo was scaffolded by mission `0034-setup-orchestration-repo` in the Shamil workspace. Full brief + state + impl trail live at `<shamil>/missions/0034-setup-orchestration-repo/`.

---

## License

MIT. See `LICENSE`.
