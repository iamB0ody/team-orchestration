# @team-orchestration/dashboard

Angular 21 renderer for the desktop dashboard. Runs inside Electron.

## Status

**Scaffold only.** Full Angular project generation + implementation happens in mission **M2 (dashboard-mvp)**. See `<shamil>/missions/0020-dashboard-telemetry-join/architecture.md` §9 for scope.

## Stack

- Angular 21 standalone components
- Signals for state (no NgRx, no RxJS where avoidable)
- `@if` / `@for` / `@switch` control flow
- `inject()` pattern
- OnPush change detection by default
- File-size limits: 200-line SFC / 150-line class / 150-line template / 150-line SCSS / 150-line service

## Dependencies

- `@team-orchestration/core` — parser + join lib
- `@team-orchestration/ui` — hacker-theme components
- `@team-orchestration/shared-types` — TS types
- `@team-orchestration/ipc` — IPC contracts
- `@angular/cdk` — overlays, tables, virtual scroll (NO Material, NO PrimeNG)

## Scope (for M2)

Sub-waves per 0020's architecture:

1. Workspace list + add/remove
2. Mission list per workspace (live status)
3. Mission detail view + stage timeline
4. Drill-down: stage → session slice → agent/tool/token breakdown
5. Settings (font swap, scanline toggle, workspace paths)

Nothing here until M2.
