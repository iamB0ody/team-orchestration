# Brief: angular-scaffold — wave 4 of dashboard-mvp

## Ask

User `continue`. Wave 4 ships two new apps and the first **browser-rendered** dashboard: (a) a tiny Node HTTP server wrapping `@team-orchestration/core`, (b) an Angular 21 standalone app consuming it over fetch with the hacker theme + signals + zoneless change detection.

## Scope (wave 4)

1. **`apps/dashboard-server/`** — Node stdlib `http` server (zero external deps). Routes: `/api/health`, `/api/workspaces`, `/api/missions?path=`, `/api/mission?path=&id=`, `/api/telemetry?path=&id=`. CORS enabled. Port `4117` (overridable via `TOT_DASHBOARD_PORT`).
2. **`apps/dashboard/`** — Angular 21 app:
   - Standalone components everywhere; no NgModules.
   - Signals for state (no RxJS where avoidable); `provideZonelessChangeDetection()`.
   - `@if` / `@for` control flow (Angular 17+).
   - `inject()` over constructor DI.
   - OnPush change detection on every component.
   - Hash-based router, 2 routes: `/` (workspaces), `/workspace?path=` (missions).
   - Hacker theme tokens imported from `libs/ui/tokens/theme.scss`.
   - `@angular/build` (esbuild) builder.
   - JetBrains Mono via Google Fonts CDN.
3. **`ApiService`** — fetch-based client against the HTTP server. Same contract as future IPC (wave 5) — swap axis, keep types.
4. **Root scripts** — `pnpm dashboard:server` + `pnpm dashboard:serve` for dev.
5. **Workspaces view** — card grid with label, path, active/done/total counts, last-update; click-through to missions.
6. **Missions view** — filter pills (all/active/paused/done/cancelled/archived), tabular list with status pills, counts summary, query-param workspace path.

## Out of scope (wave 4.5 candidates)

- Mission drill-down view (`/mission?path=&id=`) — leave for 4.5
- Live telemetry rendering in UI (backend endpoint exists; frontend doesn't consume yet)
- File watching (live refresh on state.md changes)
- Electron main + preload (wave 5)
- Per-workspace breakdown charts / historical view

## Assumptions

- User has `~/.config/team-orchestration/workspaces.json` configured (or will see empty-state copy pointing at the example config).
- Browser can reach `localhost:4117` — no CORS issues because server sets `Access-Control-Allow-Origin: *`.
- Angular 21 requires TypeScript ≥ 5.9 — bumping from 5.6. No downstream breakage.
- `@angular/build` (esbuild) is the stable default builder in Angular 21.
- Zoneless change detection works fine for this data; all async state goes through signals, not `Zone.onMicrotaskEmpty`.
- Hacker theme's SCSS tokens load correctly via `@use "libs/ui/tokens/theme"` with the `stylePreprocessorOptions.includePaths: ["../.."]` workspace-root trick.

## Classification

`FEATURE-F` — two new apps, cross-cutting (HTTP contract spanning Angular + future Electron). Single specialist (supervisor).

## Pipeline

- Stage 0 — brief.
- Stage 1 — inline spec (this file).
- Stage 2 — architecture — HTTP contract that future IPC mirrors (inlined in dashboard-server src header).
- Stage 3 — plan — single T-001 since the 2 apps are written in tandem.
- Stage 4 — impl T-001 DONE.
- Stage 5 — build-check:
  - 32/32 vitest tests green (no regressions)
  - `pnpm dashboard:build` succeeds — 68.85 KB initial transfer, 3.6s build
  - `curl /api/health` + `/api/workspaces` + `/api/missions?path=shamil` all return correct JSON
- Stage 6 — commit gate A (user "continue" pre-approval): atomic C10 pair.
- Stage 12 — done.

## Next

Wave 4.5 — `/mission?path=&id=` route: parse query params, fetch `/api/mission` + `/api/telemetry`, render drill-down with same hacker-theme components. Reuses `ApiService` + tokens — pure presentation work.
