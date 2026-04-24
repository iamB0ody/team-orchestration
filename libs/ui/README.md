# @team-orchestration/ui

Angular 21 component library. Hacker theme. No PrimeNG, no Material — only Angular CDK primitives + custom components.

## Design tokens

All tokens live in `tokens/theme.scss` as CSS custom properties:

- **Palette** — surfaces (`--bg-*`), foreground (`--fg-*`), semantic accents (`--accent` green, `--warn` amber, `--err` red, `--info` cyan)
- **Typography** — `--font-mono` (JetBrains Mono default, swappable), `--fs-*` size scale, `--fw-*` weights
- **Geometry** — `--radius: 0` (sharp corners, period) with a `--radius-sm: 2px` exception for inputs
- **Spacing** — 4px grid (`--sp-0` → `--sp-8`)
- **Motion** — fast + functional (`--motion-fast: 80ms ease-out`, `--motion-base: 120ms`); no bounces
- **Status pills** — semantic color tokens for active/paused/done/cancelled/archived

Utility classes:

- `.ascii-divider` — `─── LABEL ───` style horizontal rules
- `.prompt-label` — renders `$` / `>` / `λ` prompt prefix via `data-prompt` attr
- `.status-pill` — bracketed `[DONE]` / `[ACTIVE]` tokens, color per status
- `.cursor-blink` — terminal cursor for live status
- `.grid-bg` — 8px dotted grid background
- `[data-scanlines]` — opt-in CRT scan-line overlay (`::after` at 3% opacity)

## Components (implemented in M2)

- **Primitives:** button, input, select, checkbox, textarea, dialog, tooltip
- **Data:** data-grid (virtual scroll via CDK), tree, tag, badge, stat-card
- **Layout:** panel (ASCII-bordered), terminal-pane, tabs, split-pane
- **Domain:** mission-row, workspace-card, stage-timeline, drilldown-panel

## Usage

```typescript
// apps/dashboard/src/styles.scss
@use "@team-orchestration/ui/tokens";
```

Then use component imports from `@team-orchestration/ui` in standalone Angular components.

Status: **scaffold only — tokens ready; components land in M2.**
