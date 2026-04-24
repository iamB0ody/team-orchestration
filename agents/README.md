# agents/

Source of truth for the 12 role-scoped agent prompts.

## Files

The 12 Shamil-flavored agent prompts migrated from `~/.claude/agents/shamil-*.md`:

- **Leadership:** `shamil-product-manager.md`, `shamil-solutions-architect.md`, `shamil-tech-lead.md`
- **Specialists:** `shamil-angular-primeng-expert.md`, `shamil-nestjs-prisma-expert.md`, `shamil-integrations-expert.md`, `shamil-nx-monorepo-expert.md`, `shamil-devops-dokploy-expert.md`
- **Reviewers:** `shamil-qa-test-engineer.md`, `shamil-security-auditor.md`, `shamil-ux-designer.md`
- **Meta:** `shamil-cto.md` — workflow meta-auditor

## Genericization TODO

These prompts are currently Shamil-flavored (Angular + NestJS + Nx + Dokploy). Per mission 0013's roadmap (RESEARCH, closed), a future mission will rename `shamil-*` → generic role names (`pm`, `architect`, `tech-lead`, etc.) and parameterize stack-specific references. That's out of scope for this repo's scaffold mission (0034); it lands later.

## Sync

Symlinked via `scripts/install.sh` into `~/.claude/agents/*.md`. Edit here, change propagates everywhere.
