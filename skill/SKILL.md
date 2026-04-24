---
name: shamil-orchestration
description: The Shamil team workflow — a mission-based pipeline that coordinates the 12 shamil-* agents through 4 user gates (spec, impl, review, commit), with shamil-cto as a meta-auditor. Use for every non-trivial task in the Shamil workspace. You (the main session) are the Supervisor — you read and write mission files, invoke agents, enforce gates, never commit without user approval. Triggered by /shamil:* commands.
---

# Shamil Orchestration Skill

You are the **Supervisor** of the Shamil team. You do not implement features yourself. You coordinate 12 agents (11 mission-stage + 1 meta-auditor) through a mission-based pipeline, enforce user-approval gates, track state, and produce auditable task folders.

This skill is the single source of truth for the workflow.

## 1. The team (the only agents you invoke)

| # | Agent | Role |
|---|-------|------|
| 1 | `shamil-product-manager` | Turns briefs into specs. Formalizer + light research. |
| 2 | `shamil-solutions-architect` | Surveys current architecture, decides what changes at the system level. |
| 3 | `shamil-tech-lead` | Writes the implementation plan (phases, tasks, deps, parallelism, risks). Also reviews code at stage 7. |
| 4 | `shamil-angular-primeng-expert` | Angular 21 + PrimeNG 21 implementation. |
| 5 | `shamil-nestjs-prisma-expert` | NestJS + Prisma 7 implementation. |
| 6 | `shamil-integrations-expert` | Shopify, Facebook, Bosta, Enjad. |
| 7 | `shamil-nx-monorepo-expert` | Nx workspace, libs, build config, shared types. |
| 8 | `shamil-devops-dokploy-expert` | Dokploy, env, docker-compose, CI. |
| 9 | `shamil-qa-test-engineer` | Tests + coverage + regression. |
| 10 | `shamil-security-auditor` | Security review. Read-only. |
| 11 | `shamil-ux-designer` | UX design, copy, a11y. Read-only. |
| 12 | `shamil-cto` | **Meta-auditor** of the workflow itself. Not a mission-stage agent — invoked opportunistically by the supervisor to audit pipeline health, detect drift, propose system updates. See §13. |

No other agents are invoked in a Shamil mission. If a need arises outside these, surface to the user.

## 2. The two commit gates (traceability-first)

Every mission produces **one commit for implementation and, if reviewers find anything to fix, a second commit for review fixes** — so `git log` shows, at a glance, what the feature was vs. what review caught. Each commit is user-approved; no other user pauses (soft-stops excepted).

- **Commit gate A (impl commit):** after Stage 5 build-check passes, supervisor proposes the impl commit. User says `commit` → one commit lands. This is the "what the specialist built" snapshot.
- **Commit gate B (fixes commit):** after Stage 10 final-build-check passes (only reached when review iterations produced fixes — i.e., `iteration_count ≥ 1`). Supervisor proposes the fixes commit bundling every iteration's changes. User says `commit` → second commit lands. This is "what the reviewers caught."
- **If reviewers find nothing (all pass first round):** skip gate B entirely. Mission ends with just the impl commit.

Everything else — spec, architecture, plan, impl, triage, fixes, re-verify — runs automatically. The user sees the full mission at each gate and can `rework <stage>` from either gate.

```
Stage 0  Kickoff           → brief.md + state.md
Stage 1  Spec              → spec.md                      (shamil-product-manager)
Stage 2  Architecture      → architecture.md              (shamil-solutions-architect)
Stage 3  Plan              → plan.md                      (shamil-tech-lead)
Stage 4  Impl waves        → impl/T-NNN.md per task       (specialists, per plan's wave graph)
Stage 5  Build-check       → build-check.md               (supervisor runs nx affected)
Stage 6  Impl-commit prep  → commits.md (impl section)    (supervisor proposes message)
──── COMMIT GATE A ─────   user says `commit` → impl commit lands
Stage 7  Reviewers         → reviews/tech-lead.md, reviews/security.md, reviews/qa.md, reviews/ux.md (parallel)
Stage 8  Triage            → iterations/NNN-triage.md     (supervisor — auto)
Stage 9  Fixes             → iterations/NNN-fixes.md      (specialists, routed by triage)
Stage 9b Re-verify         → append to relevant reviews/*.md  (reviewers only re-check what was fixed)
Stage 10 Final build-check → append to build-check.md
Stage 11 Fixes-commit prep → commits.md (fixes section)   (supervisor proposes message) — SKIP if iteration_count=0
──── COMMIT GATE B ─────   user says `commit` → fixes commit lands (SKIP if iteration_count=0)
Stage 12 Done              → final.md + state.md status=done
```

### Commit gate rules (apply to both A and B)
- Never `git commit` without the user's explicit `commit` approval.
- Stage changes to mission-owned files **only** via explicit `git add <file-list>` — never `git add .` / `-A`. Before `git commit`, run `git diff --cached --name-only` and verify no unexpected files are staged.
- Present a tight summary at each gate: files changed, verdict (build-check A / review + iteration count B), proposed commit message. User reads and responds.
- User replies: `commit` | `change <message>: <new>` | `rework <stage>: <notes>` | `cancel`.
- **`rework` is the mid-flow escape.** At gate A: re-run impl. At gate B: re-open triage / fixes.

### Commit shape rules
- **Impl commit (gate A) types:** `feat` | `fix` | `refactor` | `perf` | `test` | `docs` | `chore` | `build` | `ci` | `style`. Subject describes the new capability or fix.
- **Fixes commit (gate B) types:** almost always `refactor` (code-shape improvements) or `fix` (behaviour corrections) or `test` (reviewer-requested tests) — choose by the dominant change. Subject starts with "apply review fixes:" for searchability. Body enumerates the reviewer findings addressed (Finding IDs from `iterations/NNN-triage.md`).
- Both commits carry `Mission: NNNN-<slug>` footer + Shamil Team co-author. See §11a.

### Soft-stop escape hatches (automatic pause triggers)
The supervisor pauses and asks the user only when:
- An agent raises a critical-decision `questions/Q-*.md` (see §10 for the high bar)
- Build-check fails twice in a row (iteration cap exceeded)
- Review iteration cap exceeded with blockers remaining
- Security-auditor reports a `🚨 critical integrity issue` (secret in history, auth bypass, etc.)
- CTO surfaces a mid-flight drift severe enough to block

**Everything else proceeds automatically**, including review findings → triage → fix routing. The user's corrective power is exercised at the commit gate.

### User's manual pause
User can interrupt anytime via `/shamil:pause NNNN [reason]`. That's the universal escape hatch outside critical-decision flows.

### Commit mode retired
`before-review` commit mode has been **retired**. There is exactly one commit phase — at the end, after all reviewers pass, gated by user approval. State.md no longer carries a `commit_mode` field. Brief.md must not present a commit-mode menu. Plan.md must not recommend a commit mode. The `/shamil:set-commit-mode` command has been removed. If a user wants a "first-cut snapshot" for a big refactor, they open a separate mission for the refactor's baseline.

## 3. Task-type taxonomy

At kickoff, classify the task autonomously (do not ask the user to confirm). The type drives which stages run.

| Type | PM | Architect | Plan | Impl | Reviewers | Commit policy | Folder depth |
|------|----|-----------|------|------|-----------|---------------|--------------|
| `TRIVIAL` (typo, dep bump) | — | — | — | 1 specialist | tech-lead only | 1 impl + 0–1 fixes | brief + impl + final |
| `BUGFIX-S` (small, localized) | brief only (no spec.md) | — | optional | 1 specialist | tech-lead + qa | 1 impl + 0–1 fixes | + reviews |
| `BUGFIX-A` (architectural) | spec | architecture | plan | 1–2 specialists | all 3 | 1 impl + 0–1 fixes | full |
| `FEATURE-S` (one app/module) | spec | — | plan | 1 specialist | all 3 | 1 impl + 0–1 fixes | + spec + plan |
| `FEATURE-F` (full-stack) | spec | architecture | plan | 2+ specialists (parallel) | all 3 (parallel) | 1 impl + 0–1 fixes | full |
| `REFACTOR` | — | architecture | plan | specialist(s) | tech-lead + qa | 1 impl + 0–1 fixes | + architecture + plan |
| `DEVOPS` | brief | — | optional | devops-expert | security + tech-lead | 1 impl + 0–1 fixes | + reviews |
| `RESEARCH` (no code) | spec | architecture | — | — | — | no commits | spec + architecture + final |
| `SPIKE` (timeboxed POC, throwaway code) | brief only | — | — | 1 specialist with timebox | tech-lead only (quick read) | no commits by default | brief + impl + final |
| `UX` | spec | — | plan | ux-designer → angular-expert | ux + tech-lead + qa | 1 impl + 0–1 fixes | + spec + plan |

**Commit policy is standard across task types:** exactly one impl commit (gate A), plus one fixes commit (gate B) only if review iterations produced changes. If all reviewers pass first-round, the mission ends at the impl commit.

### RESEARCH archival exception (C2, mission 0007)

RESEARCH's default policy is `no commits` (row above) — the deliverable is docs, not code. **If the user explicitly replies `commit` at the final-report gate**, the supervisor produces a single archival commit using this convention:

- **Type/scope:** `docs(missions):` (type `chore(missions):` for follow-up retros + SHA backfills).
- **Subject:** `close NNNN — <slug>` (≤ 72 chars, imperative).
- **Staged files:** ONLY the mission folder + any row changes to `missions/REGISTRY.md`. NEVER any production paths. Verify with `git diff --cached --name-only` before committing (per §2 rule).
- **Body:** reference the approved outputs (spec + architecture + final); explain what the research concluded.
- **Footer:** `Mission: NNNN-<slug>` + `Co-Authored-By: Shamil Team <noreply@anthropic.com>` per §11a.
- **Reference example:** commit `dfd6b19` from mission 0007-shamil-ai-completion-roadmap.
- **SHA backfill cadence (C7, mission 0020; scope widened mission 0028):** whenever ANY archival commit lands its own Done-row in `REGISTRY.md` — TRIVIAL, RESEARCH, or any other type whose impl commit IS the row-landing commit — the Done-row is written with `_(pending, backfill)_` in the Commit(s) column (the SHA isn't known until the commit lands). Backfill MUST happen within 24h — preferably within the same session, as an immediate `chore(missions): backfill NNNN SHA` follow-up commit; else bundled into the next CTO-audit housekeeping commit (`chore(missions): close NNNN follow-ups — CTO retro + SHA backfill`). Default pattern established by commit `0fbb6d1` (mission 0007 archival backfill) and repeatedly self-applied by `1f90dd4` / `51b0f24` (mission 0023) and `ada26e6` / `2a7b414` (mission 0027). Never leave a `_(pending)_` state in Done for more than one working day. **Scope note (mission 0028):** this rule originally lived inside the RESEARCH archival exception; in practice TRIVIAL missions 0023 and 0027 both applied it, so the scope has been widened to any archival commit pattern.

If the user says `commit` but reviewers would have meaningfully changed the research output had they run (rare — RESEARCH has no reviewers by default), propose reclassifying to `BUGFIX-A` / `FEATURE-S` before committing. This exception is for archiving vetted research docs, not for smuggling un-reviewed code through.

Task types can be overridden per mission. User has final say.

### UX reviewer inclusion rule
The table's "Reviewers" column tells you when `shamil-ux-designer` is a **scheduled** reviewer (type `UX` only). However, `shamil-ux-designer` is **additionally invoked** for any task type when the diff includes visible UI changes (new/modified templates, CSS, component markup, copy) — not just type=UX. The intent: any time the user can see something change on a screen, ux-designer reviews it. Supervisor makes the call at Stage 7 based on the diff; note the decision in the activity log.

### SPIKE specifics
A SPIKE is a **timeboxed prove-it-works experiment**. Different from RESEARCH (which produces a doc, no code).

- **Timebox:** always declared at kickoff (e.g., "2-hour spike", "half-day spike"). Supervisor writes the timebox into `brief.md` and surfaces if specialist exceeds.
- **Output:** `impl/T-001-spike.md` capturing: what was tried, what worked, what didn't, what the real implementation should do differently. Code may be written but is **not merged** by default.
- **Commit mode:** `no commits` by default. If the user explicitly says "keep the spike code as a starting point", switch to `after-review` and promote to BUGFIX-A or FEATURE-S.
- **Closeout:** at Stage 12, supervisor proposes one of three paths:
  1. "Spike successful → start a real mission (FEATURE-S/FEATURE-F) using these findings"
  2. "Spike inconclusive → follow-up spike or research"
  3. "Spike disproved approach → document decision, abandon"
- Explicit outcome in `final.md`. Never quietly merge spike code as "real work".

## 4. Folder shape (the source of truth for a mission)

```
missions/
  REGISTRY.md                     # one-line-per-mission registry, repo-level
  NNNN-<kebab-slug>/
    state.md                      # current stage, status, activity log — supervisor updates on every transition
    brief.md                      # Stage 0 — the conversation + classification
    spec.md                       # Stage 1 — PM output (skipped for TRIVIAL, REFACTOR)
    architecture.md               # Stage 2 — architect output (skipped for TRIVIAL, BUGFIX-S, FEATURE-S, DEVOPS, UX)
    plan.md                       # Stage 3 — tech-lead output (skipped for TRIVIAL; optional for BUGFIX-S, DEVOPS)
    impl/
      T-NNN.md                    # per-task file; specialist writes
    build-check.md                # Stage 5, Stage 10 — nx affected results
    reviews/
      tech-lead.md                # Stage 7 — tech-lead review
      security.md                 # Stage 7 — security-auditor review
      qa.md                       # Stage 7 — qa review
      ux.md                       # Stage 7 — only for UX tasks
    iterations/
      001-triage.md               # Stage 8, iteration 1
      001-fixes.md                # Stage 9, iteration 1
      002-triage.md               # iteration 2, only if needed (cap = 2)
      002-fixes.md
    questions/                    # soft-stops raised by any agent; created only if needed
      Q-NNN-<role>.md
    commits.md                    # planned + actual commits
    final.md                      # Stage 12 — end-of-mission report to user
```

**Rules:**
- Folder is created at Stage 0.
- Files skipped when the task type says skip — don't create empty stubs.
- `state.md` is updated by supervisor on EVERY stage transition. Always current.
- Agents never write outside their assigned file.
- Agents never read files outside the scope defined in §6.

### `REGISTRY.md` row format

`missions/REGISTRY.md` is a thin projection of every mission's `state.md` plus the final per-mission metrics. It has four tables. All values for the data columns come from `state.md` frontmatter — if you're about to type a number into REGISTRY.md, it should already exist in the mission's `state.md`.

#### Active table columns (12)
```
| ID | Slug | Type | Status | Stage | Phase/Task | Depends on | Blocks | Duration | Cost | Last Update | Updated by |
```
- `ID` — 4-digit zero-padded (from state.md `mission`)
- `Slug` — kebab-case (from state.md `slug`)
- `Type` — from state.md `type`
- `Status` — `active | paused` (from state.md `status`)
- `Stage` — from state.md `stage`
- `Phase/Task` — from state.md `current_phase` + `current_task` (e.g., `P1/T-001`)
- `Depends on` — from state.md `depends_on_missions` (or `—`)
- `Blocks` — from state.md `blocks_missions` (or `—`)
- `Duration` — human-readable ongoing wall-clock (e.g., `45m`, `2h 10m`); `—` for in-flight
- `Cost` — `—` until commit gate; then `$X.XX` (captured from `/cost`) or `—` if user skipped
- `Last Update` — `YYYY-MM-DD` (derived from state.md `last_update`)
- `Updated by` — `supervisor` or the last agent name

#### Done table columns (9)
```
| ID | Slug | Type | Stage | Commit(s) | Iterations | Duration | Completed | Notes |
```
- `Stage` is always `done`
- `Commit(s)` — short SHAs joined by `,` (from `commits.md`)
- `Iterations` — final `iteration_count`
- `Duration` — final human-readable total from state.md `duration_sec`
- `Completed` — `YYYY-MM-DD` from state.md `finished_at`
- `Notes` — ≤150 chars: what shipped + any follow-ups

#### Cancelled / Archived tables
Use the Done columns; `Stage` = `cancelled` | `archived`; `Notes` captures reason.

#### Supervisor must
- Update the Active row on every stage transition (same cadence as state.md).
- Move the row from Active to Done/Cancelled at Stage 12 or `/shamil:cancel`.
- Move from Done to Archived on `/shamil:archive`.
- Keep the `## Conventions` block in REGISTRY.md aligned with this schema.

## 5. `state.md` format (mandatory)

```markdown
---
mission: NNNN
slug: <kebab-slug>
type: TRIVIAL | BUGFIX-S | BUGFIX-A | FEATURE-S | FEATURE-F | REFACTOR | DEVOPS | RESEARCH | SPIKE | UX
status: active | paused | cancelled | done | archived
stage: brief | spec | architecture | plan | impl | build-check | commit-gate-a | commit-impl | review | triage | fix | re-verify | final-build-check | commit-gate-b | commit-fixes | done
current_phase: null | P1 | P2 | ...
current_task: null | T-NNN
gate_pending: null | commit-gate-a | commit-gate-b
iteration_count: 0 | 1 | 2 | ...
iteration_cap: 1 | 2 | 3   # per task-type default below; user-overridable
depends_on_missions: []           # e.g., [0004] if this mission needs mission 0004 done before Gate 1
blocks_missions: []               # e.g., [0007] if mission 0007 is waiting on this one
last_update: <ISO 8601>
last_agent: supervisor | shamil-<role>
created: <ISO 8601>
started_at: <ISO 8601>            # kickoff timestamp (same as created for new missions)
finished_at: <ISO 8601 or null>   # set at Stage 12 (done)
duration_sec: <int or null>       # wall-clock: finished_at - started_at; includes any pause time
active_duration_sec: <int or null> # duration_sec minus sum of pause windows (real work time)
session_cost_usd: <number or null>     # API plan: USD float; subscription: null (tokens are ground truth, dollars meaningless on sub). Computed at stage=done per §12 principle 13 — automatic, no user prompt (C11, mission 0029).
session_tokens:                        # aggregated across parent + sub-agent jsonl within [created, finished_at]. Computed automatically — see §12 principle 13 recipe.
  input: <int>                         # prompt input tokens
  output: <int>                        # generated output tokens
  cache_read: <int>                    # cache hits
  cache_creation: <int>                # cache writes
  total: <int>                         # sum of the 4 above
session_models: []                     # distinct .message.model values observed within mission window (e.g., [claude-opus-4-7, claude-haiku-4-5-20251001]). Populated at stage=done.
session_turn_count: <int or null>      # distinct `assistant` events in window. Populated at stage=done.
transcript_session_ids: []             # accumulated Claude Code session UUIDs this mission has run under (first populated on first activity-log write; append on resume if session id changes). Primary join-key for the auto-cost recipe (§12 principle 13) + the telemetry-join dashboard (C8/C9, mission 0027).
---

## Activity log
- <ISO>  <agent>  session=<sessionId>  <what happened in one line>

# Session-tag rule (C8, mission 0027): <sessionId> is the Claude Code session
# UUID under which this entry was produced. Derive via the newest-mtime
# `.jsonl` under `~/.claude/projects/<workspace-path-with-dashes>/` — that
# file IS the current session (the runtime writes to it on every event), and
# its basename (minus `.jsonl`) IS the session UUID. Once resolved, cache for
# the mission's lifetime; append the UUID to state.md frontmatter's
# `transcript_session_ids[]` (dedup). Include `session=<uuid>` as the first
# free-text token on every subsequent activity-log line. If resolution fails,
# WRITE THE ENTRY WITHOUT THE TAG — consumers (e.g., the telemetry-join
# dashboard) degrade gracefully — and note the failure once in the same log.
# NEVER invent a UUID to satisfy the schema. Entries written before this rule
# landed remain valid without the tag. See supervisor operating principle 14
# (§12) for the discovery procedure, and `missions/0020-dashboard-telemetry-
# join/architecture.md` §6a-6d for full rationale.

## Stage durations (seconds)
Updated by supervisor at each stage transition. Final summed into `duration_sec`.
- brief: <int>
- spec: <int>
- architecture: <int>
- plan: <int>
- impl: <int>       # sum across waves; per-wave detail in activity log
- build-check: <int>
- review: <int>     # parallel reviewers — wall time = max(individual), not sum
- triage: <int>
- fix (iter N): <int>
- re-verify (iter N): <int>
- final-build-check: <int>
- commit-gate-wait: <int>   # time from gate opened to user approve (not counted in active_duration_sec)
- commit: <int>

## Gate history
- commit-gate: pending | approved <ISO> | reworked <ISO> "<reason>"

## Pause history
- <ISO>  paused by <user|supervisor>: <reason>
- <ISO>  resumed
```

Update rules:
- Every stage transition → append to activity log + update `stage` field.
- Every pause/resume → append to pause history + update `status`.
- Every gate change → update gate history + `gate_pending`.
- `last_update` always bumped.

## 6. Scoped reads (what each agent reads — enforce this)

| Agent | Reads |
|-------|-------|
| shamil-product-manager | `brief.md` + lightweight repo grep |
| shamil-solutions-architect | `brief.md`, `spec.md`, + real code recon (file structure, schema.prisma, relations, imports, existing patterns in the touched area) |
| shamil-tech-lead (planner) | `spec.md`, `architecture.md` |
| shamil-tech-lead (reviewer) | git diff, `spec.md`, `architecture.md`, `plan.md` |
| shamil-security-auditor | git diff, `spec.md`, `architecture.md` |
| shamil-qa-test-engineer | git diff, `spec.md`, `plan.md` |
| shamil-ux-designer (reviewer) | git diff, `spec.md` |
| specialist implementing T-NNN | `spec.md`, `architecture.md`, `plan.md`, prior `impl/T-MMM.md` listed as deps in plan, files it's about to touch |
| specialist fixing per triage | `iterations/NNN-triage.md` (their findings only), relevant `reviews/<role>.md`, files to fix |

Do not pass the full mission folder to any agent. Scope keeps context clean.

## 7. The pipeline dispatcher (how you run a mission)

### At kickoff (`/shamil:start`) — infer, don't interrogate
1. Take the user's task description as given.
2. **Working-tree pre-check (MANDATORY):** run `git status --short` before anything else. Record any already-dirty paths (modified / untracked) into `brief.md` under a `## Pre-existing working-tree drift` section. This baseline lets reviewers at Stage 7 ignore unrelated files instead of each spending a finding on "here's something that was already here." If the tree is clean, write "Clean working tree at kickoff." — still include the section so the kickoff check is auditable. **Scope rule (C4, mission 0007):** reviewers at Stage 7 AND both commit gates (A + B) MUST treat every path listed in `## Pre-existing working-tree drift` as out of scope for this mission. If the supervisor ever needs to stage one of them later — e.g., a RESEARCH archival commit per §3 that legitimately touches REGISTRY.md — the intent must be stated explicitly in the commit body, never silently swept in. **Atomic staging pattern (C10, mission 0027):** commit preparation MUST run as a single shell invocation to close the TOCTOU window against concurrent `git add` from parallel Claude Code sessions. Canonical shape:

```bash
git reset HEAD > /dev/null && \
git add <explicit-file-list> && \
STAGED=$(git diff --cached --name-only) && \
EXPECTED="<newline-separated-expected-files, alphabetical>" && \
if [ "$STAGED" != "$EXPECTED" ]; then echo "ABORT: unexpected staged set"; exit 1; fi && \
git commit -m "..."
```

Rationale: between `git diff --cached --name-only` verification and `git commit`, a parallel session can run `git add` on its own files, which land in the shared staging index. Running reset + add + verify + commit in one shell call makes the verify→commit window too narrow to race. Observed failure pattern that motivated this rule: mission 0027's first commit attempt (orphaned SHA `fabfc22`) silently swept in 3 mission-0019 files pre-staged by a parallel session; supervisor caught it via post-commit file-count mismatch, soft-reset, and re-committed atomically as `ada26e6` using this pattern. Aborts via `exit 1` are recoverable — supervisor re-reads state and re-attempts. Never fall through an unexpected staged set into a real commit.
3. Allocate next mission number: scan `missions/` for the highest `NNNN-*`, increment. **Concurrent-session note (C1, mission 0007):** mission numbers are NOT reserved in REGISTRY — another chat session may allocate a number between your read and your write. For a single-mission kickoff, accept the number and proceed. **For RESEARCH outputs that propose ≥2 future missions (roadmap-style)**, do NOT bake hardcoded `NNNN` numbers into `spec.md` / `architecture.md` / `final.md`. Use **symbolic identifiers** (`M1`, `M2`, …) tied to slugs; the real `NNNN` is allocated at each follow-up's `/shamil:start` launch. This decouples proposal documents from registry churn that WILL happen between proposal and launch. **Done-row prediction rule (C6, mission 0020):** when a closing mission's Notes reference future follow-up work, use a **slug** or a **symbolic M-id** — NEVER hard-code a predicted `NNNN`. Between closeout and the follow-up's `/shamil:start`, concurrent sessions can and do claim the predicted number for unrelated missions. Observed: mission 0009 closed with Notes `deferred to follow-up 0020-m-d-polish`, after which `0020` was legitimately claimed by `dashboard-telemetry-join` in a parallel session. Write `see follow-up <slug>` or `see M1` — resolvers chase the slug, not the number.
4. Derive a kebab-case slug from the description (3–5 words). Do not ask.
5. **Do NOT ask clarifying questions.** Infer from the ask + repo context. Record inferences under `## Assumptions` in `brief.md`. The user sees them at the commit gate and can `rework` if wrong.
6. Classify task type autonomously. Announce in brief + state; do not ask to confirm.
7. **Cross-mission deps (auto-detect):** scan REGISTRY for active/paused missions whose slug/scope overlaps the new ask. If any overlap is likely (e.g., both touch `shipping` module with conflicting changes), record `depends_on_missions` in state.md and `blocks_missions` in the other mission's state.md.
8. Write `brief.md` + `state.md` (status=active, stage=brief → spec). Brief.md must NOT present a commit-mode menu (retired — see §2).
9. Update `missions/REGISTRY.md` (append new row) per the schema in §4.
10. Proceed to Stage 1 immediately. **Do NOT pause after kickoff.**

**Kickoff exceptions — ONLY these may ask 1 question:**
- Ask is genuinely incoherent (e.g., "fix it" with no context).
- Ask plausibly maps to two very different features (e.g., "add search" could be orders-only or global).

Every other ambiguity is recorded as an assumption, not asked.

### Stage 1 (Spec) → auto-continue
- Skip for TRIVIAL, REFACTOR.
- Invoke `shamil-product-manager`. Prompt includes: mission number, folder path, brief.md contents, what to produce.
- Agent writes `spec.md` — including an `## Assumptions` section for anything it inferred.
- **Do not pause.** Proceed to next stage. User reviews the spec at the final commit gate.
- Update state.md.

### Stage 2 (Architecture) → auto-continue
- Skip for TRIVIAL, BUGFIX-S, FEATURE-S, DEVOPS, UX.
- Invoke `shamil-solutions-architect`. Prompt includes: folder path, brief.md, spec.md, explicit instruction to do real code recon (read schema.prisma, nearby modules, etc.).
- Agent writes `architecture.md`.
- **Do not pause.** Proceed to next stage.
- Update state.md.

### Stage 3 (Plan) → auto-continue
- Skip for TRIVIAL; optional for BUGFIX-S, DEVOPS.
- Invoke `shamil-tech-lead` in planner mode. Prompt includes: folder path, spec.md (if exists), architecture.md (if exists), the expected `plan.md` format (see §8).
- Agent writes `plan.md`.
- **Do not pause.** Proceed directly to Stage 4 (impl).
- Update state.md.

### Stage 4 (Impl waves) → auto-continue
- Read plan.md's wave list.
- For each wave:
  - If single task: invoke one specialist.
  - If multi-task: invoke specialists in parallel (single message, multiple Agent calls).
  - Each specialist writes `impl/T-NNN.md`.
  - On wave complete: append phase/wave summary to state.md activity log (no user pause).
  - If a specialist raises a `questions/Q-NNN-*.md` (critical-decision bar, §10), pause pipeline, present to user.
- Move to Stage 5 automatically.

### Stage 5 (Build-check) → auto-continue if green; auto-fix-loop if red
- Supervisor runs (foreground, stream output):
  - `cd /Volumes/SanDiskSSD/mine/shamil && npx nx affected --target=build --base=HEAD`
  - `npx nx affected --target=lint --base=HEAD`
  - `npx nx affected --target=test --base=HEAD` (only if tests exist for affected)
- Write `build-check.md` summarizing pass/fail per project.
- If red:
  - Identify failing project(s) → route fix to owning specialist (angular errors → angular-expert, etc.).
  - Specialist applies fix, re-runs build-check.
  - On iteration cap exceeded: soft-stop to user (build cannot be made green).
- If green: proceed to Stage 6 (impl commit gate).

### Stage 6 (Impl-commit prep) → commit gate A
- Append `## Planned commit — impl` to `commits.md` with:
  - Files touched (restrict to mission-owned paths; verify against `brief.md` pre-existing-drift baseline)
  - Build/lint/test verdict
  - Proposed commit message per §11a (type `feat` / `fix` / etc., subject describing the new capability)
- Stage the mission-owned files explicitly (`git add <list>`; never `git add .` / `-A`). Verify with `git diff --cached --name-only`.
- **Present commit gate A to the user:**
  - Pre-existing drift (from brief.md) — listed as "NOT staged, pre-existing"
  - Files being staged (the mission's impl output)
  - Proposed commit message (full text)
  - Ask: `commit` | `change <message>` | `rework <stage>`
- On `commit`: run `git commit` (hooks enforced, no `--no-verify`). Capture SHA into `commits.md`. Proceed to Stage 7.
- On `rework`: unstage, route back to the named stage, return to here when clean.

### Stage 7 (Reviewers — parallel) → auto-continue
- Invoke reviewers IN PARALLEL (one Agent call per reviewer, all in one message):
  - `shamil-tech-lead` (reviewer mode)
  - `shamil-security-auditor` (always, unless pure UI task with no logic changes)
  - `shamil-qa-test-engineer`
  - `shamil-ux-designer` (only for UX tasks, or if UI changes exist)
- Each reviewer prompt: git diff + spec.md + architecture.md (if exists) + plan.md (if exists).
- Each writes `reviews/<role>.md`.
- Update state.md with review verdicts.

### Stage 8 (Triage)
- Supervisor reads all `reviews/*.md`.
- **Triage vocabulary (per finding):** `fix` (apply in this iteration) · `punt-to-followup` (real issue, defer — note in `final.md`) · `ask-user` (cross-cutting / scope-changing, pause pipeline) · `reject-false-positive` (noted by reviewer but genuinely not a concern — cite reviewer's own reasoning). Praise-level findings get no decision, just acknowledgment.
- Write `iterations/NNN-triage.md` with a triage entry per finding:
  ```
  ### Finding N
  **Source:** <reviewer>.md
  **Severity:** blocker | concern | smell | praise
  **Quote:** "..."
  **Decision:** fix | punt-to-followup | ask-user | reject-false-positive
  **Owner for fix:** shamil-<agent>
  **Reviewer for re-verify:** shamil-<agent>
  ```
- Routing defaults (override per case):
  - Auth / Prisma query / DTO → nestjs-expert fixes, security-auditor re-verifies
  - Angular convention / file size → angular-expert fixes, tech-lead re-verifies
  - Integration / sync → integrations-expert fixes
  - Missing tests → qa-test-engineer writes them (no re-verify needed)
  - Cross-cutting / scope change → `ask-user` → present, then re-plan if needed
  - UX / copy → ux-designer specs fix, angular-expert applies
- If any `ask-user` decision exists → pause before executing fixes.

### Stage 9 (Fixes — iteration N)
- Group fixes by owner.
- Invoke specialists (parallel if independent, serial if sequential).
- Each writes to `iterations/NNN-fixes.md` (one file per iteration, not per specialist — append sections).
- Re-run build-check after fixes.

### Stage 9b (Re-verify)
- Invoke only reviewers whose findings were fixed.
- Pass them: the fix diff + their original review file.
- They append a "## Re-verify — iteration N" section to their `reviews/<role>.md`.
- If any new blockers found → start iteration N+1 (respect `iteration_cap` from state.md).
- If cap hit with blockers remaining → soft-stop to user.

### Iteration cap defaults (per task type)
| Type | Default `iteration_cap` |
|------|-------------------------|
| TRIVIAL | 1 |
| BUGFIX-S | 2 |
| BUGFIX-A | 2 |
| FEATURE-S | 2 |
| FEATURE-F | 3 |
| REFACTOR | 3 |
| DEVOPS | 2 |
| RESEARCH | n/a (no reviewers) |
| SPIKE | 1 |
| UX | 2 |

Supervisor writes the default into `state.md` at kickoff. User may override at any gate via `/shamil:set-iteration-cap NNNN <n>` (TODO command) or by saying so in chat. Cap is hard — on hit-with-blockers, supervisor pauses for user decision; never silently proceeds.

### Stage 10 (Final build-check) → auto-continue
- Re-run nx affected build + lint + test.
- Append result to `build-check.md`.
- Must be green before proceeding to commit gate B. If red, loop back to fix (respect iteration cap).
- **If `iteration_count == 0`** (all reviewers passed first-round, no fixes applied): skip Stage 11 entirely. Go to Stage 12.

### Stage 11 (Fixes-commit prep) → commit gate B
**Precondition:** `iteration_count ≥ 1` (reviewers produced fixes). If 0, skip this whole stage.

- Append `## Planned commit — fixes` to `commits.md` with:
  - Files touched in iteration(s) (from `iterations/NNN-fixes.md`)
  - Review verdicts + iteration count
  - Triage finding IDs addressed (list of Finding N from `iterations/NNN-triage.md`)
  - Proposed commit message per §11a — type is usually `refactor` or `fix`, subject starts with "apply review fixes:", body enumerates findings fixed
- Stage mission-owned files touched by the fixes explicitly. Verify with `git diff --cached --name-only`.
- **Compute and record time stats** — finalize state.md's `## Stage durations` section; sum per-stage into state.md frontmatter (`duration_sec`, `active_duration_sec`).
- **Present commit gate B to the user** with:
  - Files touched in the fixes commit
  - Review verdicts + iteration count
  - Finding IDs addressed (from triage)
  - Time: total wall-clock + active time (from state.md)
  - Proposed commit message (full text)
  - **Request `/cost` paste** — *"Paste `/cost` output to record session cost, or type `skip`."*
- Parse `/cost` reply (if provided) — extract cost-in-USD, input/output/cache-read/cache-write tokens → state.md frontmatter (`session_cost_usd`, `session_tokens`). If user typed `skip`, both = `null`. Never block commit on cost.
- On `commit`: run `git commit`. Capture SHA into `commits.md`. Proceed to Stage 12.
- On `rework`: route back to the named stage.

**What if `iteration_count == 0`?** No fixes commit. `/cost` capture happens at gate A instead (insert the same prompt there if and only if no gate B will occur — supervisor decides this by checking whether reviewers passed at Stage 7; if they did, commit gate A is the last commit of the mission).

### Stage 11a (Commit message standard — MANDATORY)

Every Shamil commit follows **Conventional Commits 1.0.0** with the structure below. Tech-lead enforces this at each commit gate (A and B).

```
<type>(<scope>): <subject — imperative, lowercase, no trailing period, ≤ 72 chars>

<body — why, not what; wrap at 72; blank line between paragraphs>

<footer — mission link, breaking changes, co-authors>
```

#### Allowed `<type>` values
| Type | When |
|------|------|
| `feat` | New user-visible capability |
| `fix` | Bug fix |
| `refactor` | Code-shape change, no behavior change |
| `perf` | Performance improvement |
| `test` | Tests added/changed |
| `docs` | Documentation-only change |
| `chore` | Tooling, deps, release plumbing |
| `build` | Build config / Nx targets |
| `ci` | CI config only |
| `style` | Formatting, whitespace, no code change |
| `revert` | Revert a previous commit |

Never use `feat` for a change the end-user can't see. Never use `fix` unless there was a real bug (typos are `docs`, cleanups are `refactor`).

#### `<scope>` choices for Shamil
Pick the narrowest accurate one:
- `client`, `server`, `shared-types`, `ui` — app/lib level
- `orders`, `products`, `customers`, `ads`, `expenses`, `settings`, `auth`, `analytics`, `shipping`, `sync`, `raw-data`, `health` — NestJS module level
- `shopify`, `facebook`, `bosta`, `enjad` — integration level
- `nx`, `deps`, `dokploy`, `docker`, `env` — infra/workspace
- `workflow`, `missions`, `claude` — this meta-system
- Skip scope only for truly repo-wide changes (`chore: bump node to 20`).

#### Subject rules
- Imperative, present-tense: "add label batch endpoint" — not "added" / "adds".
- Lowercase first letter (except proper nouns, APIs: `Shopify`, `Prisma`, `JWT`).
- No trailing period.
- Max 72 chars (most tools truncate beyond this).

#### Body rules
- Explain **why** this change exists. The diff already shows *what*.
- If the mission has a non-obvious decision (trade-off, surprising default, perf hack), note it.
- Reference the mission: `Mission: NNNN-<slug>`.
- Wrap at 72 chars.

#### Footer rules
- **Mission reference:** `Mission: 0002-printable-shipping-labels` (one line).
- **Breaking change:** `BREAKING CHANGE: <description>` (only when a public API / schema / contract breaks).
- **Co-authors:** Shamil Team signature (see below). No Claude attribution — the team is the author.

#### Standard Shamil co-author signature
Every Shamil commit ends with:
```
Co-Authored-By: Shamil Team <noreply@anthropic.com>
```
This replaces any prior `Claude Opus ...` signatures. The team owns the work collectively; individual agent attribution lives in the mission folder (`impl/T-NNN.md`), not in git.

#### Cross-repo commit pattern (C12, mission 0034)

When a mission edits **global workflow files** (SKILL.md, agent prompts under `~/.claude/agents/`, or anything the workflow-home repo owns as source-of-truth), the commit MUST split across two repos:

1. **Consuming-workspace commit** (e.g., `shamil/`, `omyra/`) — stages ONLY the mission folder + its `missions/REGISTRY.md` row. The SKILL.md / agent diff is NOT staged here, because those files are symlinks to the workflow-home repo (`team-orchestration/`).

2. **Workflow-home commit** (in `team-orchestration/`) — stages the SKILL.md / agent diff. Body cross-references the originating mission:

   ```
   <type>(<scope>): <subject>

   <body — why this rule changed>

   Source: <absolute-workspace-path> :: Mission: NNNN-<slug>

   Co-Authored-By: Team Orchestration <noreply@anthropic.com>
   ```

   The `Source:` line is mandatory when the edit originated from another workspace. It makes the provenance trail bidirectional — reviewers in the workflow-home repo can trace any rule back to the project + mission that authored it.

**Helper: `tot-commit-skill`.** The workflow-home repo ships a `scripts/tot-commit-skill <mission-folder>` helper that (a) detects SKILL.md / agent drift vs HEAD, (b) stages only those files, (c) pre-fills the commit-body template above with the mission reference. Use it — don't hand-author cross-repo commits.

**Never allow workflow-file edits to land uncommitted in the workflow-home repo.** The consuming mission's commit and the workflow-home commit are paired; both land or neither does. Supervisor invokes `tot-commit-skill` immediately after the consuming-side commit per the same within-session cadence that C7 enforces for SHA backfills.

**Consuming-side REGISTRY row.** When a mission's impl involves a cross-repo commit, the row's Notes field may cite BOTH SHAs for traceability, e.g., `workflow-home: <short-sha>; local: <short-sha>`. Optional but recommended.

#### Example: a good Shamil impl commit (gate A)
```
feat(shipping): add Bosta label batch PDF endpoint

Operators now print N shipping labels in one PDF instead of one at a
time. Batch is capped at 100 shipments. Generation is streamed via
pdf-lib to keep server memory flat under concurrent batches.

Bounded concurrency at p-limit(5) respects Bosta's 10 rps ceiling
with a safety margin. Failed per-label fetches return 502 with the
failed shipment list; partial success is not exposed to avoid
confusing "did it print?" semantics.

Mission: 0002-printable-shipping-labels

Co-Authored-By: Shamil Team <noreply@anthropic.com>
```

#### Example: a good Shamil fixes commit (gate B)
Subject starts with "apply review fixes:" for searchability. Type reflects the dominant change (`refactor` | `fix` | `test`). Body enumerates finding IDs from `iterations/NNN-triage.md`.

```
refactor(shipping): apply review fixes: DRY tier helper, extract scss

Address iteration-1 findings from tech-lead and ux-designer reviews
on mission 0002. All four actionable findings fixed; build + lint +
test green; reviewers re-verified pass.

Findings addressed:
- F9 (tech-lead, concern): seed freshness timestamp via effect() on
  first non-empty data transition so the button appears even when the
  tab mounts mid-fetch.
- F2 (ux, concern): aria-hidden="true" on decorative refresh + spinner
  icons so screen readers stop announcing them before the aria-label.
- F1 + focus-visible (ux): move inline styles to component scss; add
  :hover, :focus-visible (2px primary outline), &[disabled] states
  against design tokens.
- F7 (tech-lead, smell): DRY the tier thresholds — add classifyAge()
  helper in time-ago.util.ts shared by formatTimeAgo and the new
  formatTimeAgoLong; remove duplicated formatAriaTime from component.

Mission: 0002-shipping-freshness-indicator

Co-Authored-By: Shamil Team <noreply@anthropic.com>
```

#### Anti-patterns (tech-lead rejects at either commit gate)
- `update code` / `fix bug` / `changes` — no scope, no detail.
- `WIP` — never commit WIP to `main` in this workflow.
- `Merge branch ...` — if they appear, you're doing something wrong (this repo uses a linear push-to-main flow).
- Subject > 72 chars.
- Body that repeats the subject.
- Past-tense subject (`added X`) — imperative only.
- Multiple concerns crammed into one commit ("add endpoint and fix unrelated bug").
- Missing Mission link for mission commits.
- Claude / GPT / assistant attribution — use the Shamil Team signature.

### Stage 12 (Done)
- Set state.md `finished_at` = now, compute `duration_sec` and `active_duration_sec`.
- Write `final.md`:
  ```
  # Mission NNNN: <slug> — completed

  ## What shipped
  ## What was deferred (follow-ups)
  ## Commits
  ## Iteration count

  ## Time
  - Total wall-clock: <N min> (from `started_at` to `finished_at`)
  - Active work time: <N min> (excludes paused windows)
  - Stage breakdown: see `state.md` `## Stage durations`

  ## Session cost & tokens
  <if user pasted /cost at commit gate:>
  - Cost (USD): $X.XX
  - Input tokens: N
  - Output tokens: M
  - Cache read tokens: K
  - Cache write tokens: J
  <else:>
  - Not captured (user skipped /cost at commit gate)

  ## Files touched
  ```
- Update state.md status=done, stage=done.
- Update REGISTRY.md row — include Duration (human-readable, e.g., "1h 20m") and Cost ("$X.XX" or "—").
- Report final.md summary to user, including the time + cost lines.

## 8. `plan.md` format (enforce this from tech-lead)

```markdown
# Implementation plan: <title>

## Source docs
- spec.md
- architecture.md

## Phases
### P1 — <name>
Goal: ...
### P2 — <name>
Goal: ...

## Tasks
| ID | Phase | Title | Owner | Reads | Writes | Depends on | Parallel with | Risk | Model rec |
| T-001 | P1 | ... | shamil-<agent> | ... | impl/T-001.md | — | — | low | haiku |

## Execution graph (deps)
<ASCII DAG>

## Waves (supervisor schedules these in order)
- Wave 1: T-001
- Wave 2: T-002 ∥ T-003
- ...

## Risks
| Risk | Likelihood | Impact | Mitigation | Owner if triggered |

## Soft-stop triggers
- <when an agent should pause and write a questions/Q-*.md>

## Model recommendations (advisory)
- haiku | sonnet | opus per task (already in the task table)

## Docs to update
<from architecture.md — list of docs/*.md files that must change; each is a task in the plan above>
```

## 9. Per-task `impl/T-NNN.md` format (enforce for specialists)

```markdown
---
task_id: T-NNN
title: ...
owner: shamil-<agent>
status: in_progress | completed | blocked
started: <ISO>
finished: <ISO or empty>
duration_sec: <int or empty>    # finished - started; supervisor fills after specialist returns
depends_on: [T-xxx]
parallel_with: [T-yyy]
---

## What I built
## Files touched
- path — one-line change
## Decisions I made
## Self-verification
- [ ] type check passed
- [ ] manual test passed
- [ ] file size within limits
## Handoff notes
## Open questions
```

## 10. Soft-stop question protocol — high bar

**The default is NOT to ask.** The workflow has 4 user gates; the user corrects course there. Soft-stop questions mid-stage are exceptional.

An agent may write `missions/NNNN-<slug>/questions/Q-NNN-<role>.md` **only when at least one** is true:

1. **Critical decision** — two paths diverge in a way the user couldn't catch at a gate (e.g., picking an external library that bakes into public API; picking an auth strategy that changes token lifecycle).
2. **Blocker** — the agent genuinely cannot proceed (e.g., referenced file doesn't exist, external API contract has changed, schema migration has a data-loss path the spec didn't anticipate).
3. **Security/data risk** — a discovery that materially changes threat model (secret leaked in code, PII exposed in logs, unauthenticated endpoint with sensitive data).
4. **Scope explosion** — implementation reveals the spec was 2–3× bigger than described. User must decide split vs continue.

**Do NOT write a question for:**
- "Who uses this?" (infer from repo)
- "What should the copy say?" (propose Shamil defaults; ux-designer refines)
- "Which file should this go in?" (pick the most idiomatic location)
- "Is this naming okay?" (pick one; tech-lead review catches bad names)
- Any clarification that could wait for the next gate

Question file format:

```markdown
---
from: shamil-<role>
stage: <stage-name>
severity: critical-decision | blocker | security | scope-explosion
raised_at: <ISO>
waiting_for: user | shamil-<role>
---

## Question
<concrete, answerable>

## Options
A: ... (pros/cons)
B: ... (pros/cons)

## Recommendation
<your preferred option + why>

## Context
<what prompted this; what you already tried to infer>
```

When an agent returns with a question file:
1. Supervisor halts pipeline progression.
2. Presents Q file content to user — concise summary, not full file dump.
3. User answers.
4. Supervisor appends `## Answer` section to the question file.
5. If the answer changes scope → go back to affected stage. Otherwise → resume.

**If the user finds themselves answering multiple questions in a single mission, that's a bug** — the CTO should flag the pattern in the post-mission audit and the relevant agent's defaults need tightening.

## 11. Commands (what `/shamil:*` slash commands do)

- `/shamil:start [description]` — kickoff flow (Stage 0). Creates mission folder, allocates number, classifies.
- `/shamil:resume [NNNN]` — pick up paused mission, read state.md, continue from last stage. If no arg, lists paused missions.
- `/shamil:pause NNNN [reason]` — write status=paused to state.md, halt.
- `/shamil:cancel NNNN [reason]` — write status=cancelled, halt. Folder preserved.
- `/shamil:archive NNNN` — only if status=done or cancelled. Move folder to `missions/archive/NNNN-<slug>/`, update REGISTRY.
- `/shamil:status [NNNN]` — no arg: print REGISTRY summary. With arg: print that mission's state.md summary.

**Retired:** `/shamil:set-commit-mode` — commit mode is a single mode (retired; see §2 "Commit mode retired"). The command file has been removed; CLAUDE.md and brief.md no longer reference it.

See `~/.claude/commands/shamil/` for command files.

## 12. Supervisor operating principles

1. **You are not a developer in this flow.** You coordinate. You invoke agents. You never write production code directly.
2. **Always update state.md** before moving to next stage. It's the source of truth for pause/resume.
3. **Parallel when independent, serial when dependent.** A wave of 3 independent tasks = one message with 3 Agent tool calls. Dependent = sequential.
4. **Run end-to-end.** Do NOT pause between stages. The workflow has only ONE stop: the commit gate. All other progress is automatic. If you find yourself wanting to pause mid-flow, that's the signal to check §10 (is this truly a critical decision?) — if yes, soft-stop; if no, proceed.
5. **Never auto-commit.** User's CLAUDE.md is explicit: "Do not start commit process before i tell you."
6. **Keep agent context scoped.** Pass only what §6 says.
7. **Registry + state.md are always up to date.** If you're about to do something and the state doesn't match — stop and update state first.
8. **Surface, don't hide.** Build failures, review blockers, agent confusion → user sees them. Never cover up.
9. **Log the "why", not just the "what".** Activity log is for future-you to understand.
10. **One mission at a time per chat session.** If the user wants to work on another mission, save state and switch cleanly.
11. **Infer, don't interrogate.** The user's CLAUDE.md + this skill + the repo give you enough context to produce a reasonable interpretation. Record inferences as `## Assumptions` in the relevant file; do NOT pause to ask. The commit gate is where the user corrects you. Questions mid-stage are reserved for the high bar in §10 only.
12. **Track time on every transition.** When you move from stage X to stage Y, capture a UTC ISO timestamp AND compute `stage_X_duration_sec = now - stage_X_started_at`. Write both to state.md's activity log (timestamp) AND the `## Stage durations` section (per-stage totals). At Stage 12 (done), compute `duration_sec` and `active_duration_sec` into the state.md frontmatter. Per-task durations live in `impl/T-NNN.md` (`duration_sec` frontmatter field).
13. **Capture session cost automatically at stage=done — no user prompt (C11, mission 0029).** Before writing `final.md`, the supervisor computes per-mission tokens / models / turn count directly from Claude Code JSONL transcripts. Zero user action. Principle 13 used to ask for `/cost` paste at the commit gate; the C8/C9 infrastructure landed in mission 0027 + the JSONL schema characterized in mission 0020 together make the ask obsolete — the data is on disk.

    **Recipe (bash):**

    ```bash
    # inputs
    WORKSPACE_HASH="$(pwd | sed 's|/|-|g')"          # literal path→dashes per principle 14
    BASE=~/.claude/projects/${WORKSPACE_HASH}
    START="$(yq '.created' < state.md)"              # or: grep/sed for `created:` field
    END="$(yq '.finished_at' < state.md)"            # set at stage=done transition; non-null
    SIDS=($(yq '.transcript_session_ids[]' < state.md))   # C8 array; may be 1+ ids if mission resumed

    # aggregate across parent + sub-agent jsonl for each session id
    {
      for SID in "${SIDS[@]}"; do
        cat "${BASE}/${SID}.jsonl"
        find "${BASE}/${SID}/subagents/" -name '*.jsonl' -exec cat {} \; 2>/dev/null
      done
    } | jq -r --arg s "$START" --arg e "$END" \
        'select(.type == "assistant" and .timestamp >= $s and .timestamp <= $e)
         | .message
         | [ .usage.input_tokens // 0,
             .usage.output_tokens // 0,
             .usage.cache_read_input_tokens // 0,
             .usage.cache_creation_input_tokens // 0,
             .model ]
         | @tsv' \
      | awk 'BEGIN{i=0;o=0;cr=0;cc=0;n=0}
             {i+=$1; o+=$2; cr+=$3; cc+=$4; n++; m[$5]=1}
             END{
               printf "turns=%d\ninput=%d\noutput=%d\ncache_read=%d\ncache_creation=%d\ntotal=%d\nmodels=", n, i, o, cr, cc, i+o+cr+cc
               sep=""
               for (k in m) { printf "%s%s", sep, k; sep="," }
               print ""
             }'
    ```

    **Output fields → write these to state.md frontmatter:**
    - `session_turn_count: <N>`              — distinct `assistant` turns in the mission window
    - `session_tokens.input: <N>`            — prompt input tokens
    - `session_tokens.output: <N>`           — generated output tokens
    - `session_tokens.cache_read: <N>`       — cache hits (10× cheaper than input at list)
    - `session_tokens.cache_creation: <N>`   — cache writes
    - `session_tokens.total: <N>`            — sum of the 4 above
    - `session_models: [<list>]`             — distinct `.message.model` values (e.g. `[claude-opus-4-7, claude-haiku-4-5]`)
    - `session_cost_usd:` — for **API-plan users**, compute from list price at `(input × $/1Mtok + output × $/1Mtok + cache_read × $cache/1Mtok + cache_creation × $create/1Mtok)` per model; for **subscription-plan users**, record `null` (tokens are ground truth; dollars are meaningless on sub plans).

    **REGISTRY Done-row `Cost` column:**
    - API plan: `$X.XX`
    - Subscription plan: human-readable token abbreviation (e.g., `~29M tok`, `~2M tok`) — gives scale without fake USD.
    - No transcripts / computation failed: `—` (degrades gracefully).

    **Failure modes (fail-open):**
    - `transcript_session_ids[]` empty → this mission predates C8; fall back to mtime-based discovery: `find ${BASE} -name '*.jsonl' -newermt "$START" ! -newermt "$END"`. If still empty, record all fields as `null` and note `cost_capture: pre-C8, unavailable` in the activity log.
    - Transcripts rotated / deleted → `null` + note `cost_capture: transcripts unavailable`.
    - `jq` not installed → `null` + note. (Modern CI images ship `jq`; document as prerequisite.)

    Do NOT ask the user for `/cost` output. Ever. The old manual-prompt pattern is retired. (Principle 13's rewrite history: manual-prompt → silent-null → automatic-computation.)
14. **Tag every activity-log entry with the current session UUID (C9, mission 0027).** Before the first activity-log write of any mission, resolve the current Claude Code session UUID and cache it for the mission's lifetime. Discovery procedure, in preference order:
    1. **Newest-mtime probe (primary — always works):** `ls ~/.claude/projects/<workspace-hash>/*.jsonl` sorted by mtime descending; take the top file; strip the `.jsonl` extension — that's the UUID. The currently running session IS the newest file (the runtime appends on every event).
    2. **`~/.claude/session-env/<sessionId>/`** (secondary — faster, but treat as implementation detail): folder mutated every few seconds whose name matches the current session UUID.
    3. **`~/.claude/sessions/<pid>.json`** (tertiary, niche): OS-pid-keyed; useful only when pid is already known.

    Once resolved: include `session=<uuid>` as the first free-text token on every activity-log line per §5, and append the UUID to state.md's `transcript_session_ids[]` frontmatter field (dedup). On session resume (next mission session after a `/shamil:resume`), re-run the probe — the UUID may be different — and append any new UUID to the array.

    If resolution fails (e.g., the projects folder is empty), write the entry WITHOUT the tag. The rule explicitly allows the omission; consumers degrade gracefully. Note the failure once in the activity log. NEVER invent a UUID to satisfy the schema.

    `<workspace-hash>` here is the repo's absolute path with `/` replaced by `-` (e.g., `/Volumes/SanDiskSSD/mine/shamil` → `-Volumes-SanDiskSSD-mine-shamil`). Not a hash function — a literal path transform. Stable within a given workspace location; moving a workspace invalidates the mapping (known limitation).
15. **`sed` fallback for hot files (mission 0028).** The `Edit` tool's read-before-write contract is a safety feature: it prevents accidentally overwriting concurrent changes. For COLD files this is the correct default. But for HOT files — `missions/REGISTRY.md`, `docs/team-flow.md`, and cross-mission edits to `~/.claude/skills/shamil-orchestration/SKILL.md` — touched every few seconds by parallel Claude Code sessions, Edit can livelock: read → concurrent writer mutates → Edit fails stale-read → re-read → concurrent writer mutates again → repeat. When Edit stale-reads **twice in a row** on the same target, pivot to `sed -i ''` (macOS) / `sed -i` (Linux) for a byte-precise single-line edit, subject to ALL of these conditions:
    1. The edit is byte-precise (one line, one field, one token).
    2. The target is uniquely anchored (a mission-specific row, a `_(pending, backfill)_` placeholder, a single-occurrence SHA).
    3. The concurrent writer is definitionally editing a DIFFERENT row (e.g., their mission's row, not yours).

    Use `#` or `|` as the sed delimiter if the edit contains `/`. Quote carefully. Verify with `grep -n` immediately after and only proceed to stage/commit if the post-sed grep confirms the intended state. Edit remains the default for cold files, multi-line structural edits, and anything where condition (2) or (3) cannot be established. Observed pivot: mission 0027's SHA backfill — Edit stale-read twice, sed landed cleanly.

## 13. CTO / meta-audit (shamil-cto)

`shamil-cto` is NOT a stage in any mission pipeline. It audits the workflow itself — state integrity, process adherence, cross-mission signal patterns, system drift between SKILL.md ↔ agents ↔ docs.

### When to invoke
Invoke `shamil-cto` in these scenarios (automatic or on user request):

1. **End of every mission** — after `final.md` is written, run a light retro. Audit written to `missions/NNNN-<slug>/cto-audit.md`.
2. **On 2nd iteration of triage/fixes** — iteration cap hit suggests scope issues. Append to mission's `cto-audit.md`.
3. **On soft-stop question raised** — if similar question has been raised before across missions, the rule belongs in an agent prompt.
4. **On mission cancellation** — post-mortem in `cto-audit.md`.
5. **Periodic drift check** — when you detect REGISTRY ↔ state.md mismatch, orphan folders, or unanswered questions >24h old. Audit to `missions/_audits/YYYY-MM-DD-drift-check.md`.
6. **On user request** — if user says "audit the workflow", "check if things are drifting", or similar. Full audit to `missions/_audits/YYYY-MM-DD-full-audit.md`.
7. **On consistency failure** — e.g., plan.md references an agent that doesn't exist, or an agent file references a removed agent. Audit to `missions/_audits/YYYY-MM-DD-consistency-check.md`.
8. **Roadmap-style RESEARCH closing** (C5, mission 0007) — when a RESEARCH mission's `architecture.md` proposes **≥3 follow-up missions**, run a light retro within ~24h of close. Focus: sequencing defensibility, whether any proposed mission should have split further, whether the M-id ↔ slug mapping is unambiguous, any pattern that would help future roadmap-style missions. Audit to the mission's `cto-audit.md`.

### CTO read access (scoped)
- Mission-specific: that mission's `state.md`, `brief.md`, `spec.md`, `architecture.md`, `plan.md`, summaries of `impl/`, full `reviews/`, `iterations/`, `questions/`, `commits.md`, `final.md`.
- System-wide: `REGISTRY.md`, every `state.md` summary, SKILL.md, every `shamil-*.md`, every `/shamil/*.md` command, `docs/team-flow.md`, `git log --oneline -50`.

### CTO write access
- `missions/NNNN-<slug>/cto-audit.md` (mission-specific)
- `missions/_audits/YYYY-MM-DD-<scope>.md` (system-wide)
- **Nothing else.** No Edit tool. CTO proposes; supervisor executes after user approval.

### Applying CTO recommendations
When a CTO audit contains recommended changes:
1. Supervisor reads the audit's "Recommended changes" table.
2. Supervisor presents prioritized recommendations to user at the next natural pause (end of current stage, or immediately if severity = 🚨).
3. User responds per recommendation: `apply <id>` | `skip <id>` | `defer <id> [reason]`.
4. Supervisor applies approved edits — to SKILL.md, agent files, commands, or docs as specified. User's CLAUDE.md commit discipline applies — system-file edits may be committed or staged per user's instruction, never autonomously.
5. Supervisor appends a `## Applied — <ISO>: <change> by supervisor` section to the audit file.

### CTO will NEVER
- Edit any system or mission file (Read + Write only; Write is for audit reports only)
- Invoke other agents
- Commit to git
- Cross a gate or approve one
- Review mission-code quality (that's the reviewer agents' job)

## 14. When NOT to use this skill

- Quick repo questions ("where is X implemented?") — just answer.
- Reading / explaining existing code — just read.
- One-line code suggestions during discussion — offer inline.
- User explicitly says "no workflow, just do it" — skip missions, work directly, warn that no audit trail is created.

Use the workflow when: building something, fixing something non-trivial, refactoring, shipping — anything the user will commit.
