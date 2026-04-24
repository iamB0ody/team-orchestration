#!/usr/bin/env bash
# ============================================================================
# team-orchestration — install.sh
# ============================================================================
# Wires the skill + agents into ~/.claude/** via symlinks so every edit in
# either place is a git-tracked change here. Idempotent: detects existing
# files at targets and prompts before overwriting.
#
# Usage:
#   ./scripts/install.sh          # interactive (prompts on conflict)
#   ./scripts/install.sh --force  # non-interactive, replace non-symlinks
#   ./scripts/install.sh --dry    # preview, no writes
#
# Requirements: bash 4+, macOS or Linux, ~/.claude/ directory exists.
# ============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="${HOME}/.claude"
SKILL_NAME="team-orchestration-source"

FORCE=0
DRY=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --dry)   DRY=1 ;;
    -h|--help)
      sed -n '2,15p' "$0"
      exit 0
      ;;
  esac
done

echo "┌─── team-orchestration install ─────────────────────────────────────┐"
echo "│ repo:         $REPO_ROOT"
echo "│ claude dir:   $CLAUDE_DIR"
echo "│ skill target: $CLAUDE_DIR/skills/$SKILL_NAME/"
echo "│ mode:         $( (( DRY )) && echo DRY-RUN || ( (( FORCE )) && echo FORCE || echo INTERACTIVE ) )"
echo "└────────────────────────────────────────────────────────────────────┘"

if [[ ! -d "$CLAUDE_DIR" ]]; then
  echo "ERROR: $CLAUDE_DIR does not exist. Is Claude Code installed?" >&2
  exit 1
fi

link_or_skip() {
  local source="$1"
  local target="$2"
  local label="$3"

  if [[ -L "$target" ]]; then
    local current_dest
    current_dest="$(readlink "$target")"
    if [[ "$current_dest" == "$source" ]]; then
      echo "  ✓ $label — already linked"
      return
    fi
    echo "  ! $label — symlink points elsewhere: $current_dest"
    if (( DRY )); then return; fi
    if (( FORCE )); then
      ln -sf "$source" "$target"
      echo "  → $label — relinked"
    else
      read -r -p "     replace? [y/N] " ans
      [[ "$ans" =~ ^[Yy]$ ]] && ln -sf "$source" "$target" && echo "  → $label — relinked"
    fi
    return
  fi

  if [[ -e "$target" ]]; then
    echo "  ! $label — existing non-symlink file"
    if (( DRY )); then return; fi
    if (( FORCE )); then
      mv "$target" "${target}.pre-install.bak"
      ln -s "$source" "$target"
      echo "  → $label — backed up to .pre-install.bak + linked"
    else
      read -r -p "     backup + replace? [y/N] " ans
      if [[ "$ans" =~ ^[Yy]$ ]]; then
        mv "$target" "${target}.pre-install.bak"
        ln -s "$source" "$target"
        echo "  → $label — backed up + linked"
      else
        echo "     skipped."
      fi
    fi
    return
  fi

  # fresh symlink
  if (( DRY )); then
    echo "  + $label — would create"
  else
    mkdir -p "$(dirname "$target")"
    ln -s "$source" "$target"
    echo "  + $label — created"
  fi
}

echo
echo "─── skill ─────────────────────────────────────────────────────────────"
link_or_skip \
  "$REPO_ROOT/skill/SKILL.md" \
  "$CLAUDE_DIR/skills/$SKILL_NAME/SKILL.md" \
  "SKILL.md (team-orchestration-source)"

# If a legacy shamil-orchestration skill already exists on this machine
# (consuming project that seeded this repo), also point its SKILL.md at
# the source-of-truth so /shamil:start uses the same content.
LEGACY_SKILL="$CLAUDE_DIR/skills/shamil-orchestration/SKILL.md"
if [[ -d "$CLAUDE_DIR/skills/shamil-orchestration" ]] || [[ -f "$LEGACY_SKILL" ]]; then
  link_or_skip \
    "$REPO_ROOT/skill/SKILL.md" \
    "$LEGACY_SKILL" \
    "SKILL.md (legacy shamil-orchestration — unified)"
fi

echo
echo "─── agents ────────────────────────────────────────────────────────────"
shopt -s nullglob
for agent_file in "$REPO_ROOT"/agents/*.md; do
  base="$(basename "$agent_file")"
  # Skip repo docs (README.md etc.) — only actual agent prompts get symlinked
  if [[ "$base" == "README.md" ]]; then continue; fi
  link_or_skip "$agent_file" "$CLAUDE_DIR/agents/$base" "$base"
done

echo
echo "─── verify ────────────────────────────────────────────────────────────"
if [[ -r "$CLAUDE_DIR/skills/$SKILL_NAME/SKILL.md" ]]; then
  lines=$(wc -l < "$CLAUDE_DIR/skills/$SKILL_NAME/SKILL.md")
  echo "  ✓ SKILL.md resolves + readable ($lines lines)"
else
  echo "  ✗ SKILL.md target not readable"
fi

agent_count=$(ls -1 "$CLAUDE_DIR/agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
echo "  ✓ $agent_count agent files in $CLAUDE_DIR/agents/"

echo
if (( DRY )); then
  echo "DRY-RUN complete — nothing written."
else
  echo "Install complete. Next:"
  echo "  • Run \`./scripts/tot-sync\` to verify no drift."
  echo "  • Run \`pnpm install\` (when ready to develop apps/libs)."
  echo "  • Launch Claude Code in any workspace — skill resolves via symlink."
fi
