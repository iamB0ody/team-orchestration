# Brief: branding-prep — app icon (SVG master) + Electron de-branding checklist

## Ask

User directive (2026-04-24):
> "Let's add to the remaining the app icon, we need to make on using svg for now, and support and replace all default electron, make fully sure of that."

Interpretation:
1. Create the app icon as an SVG master (no raster pipeline yet — that's wave 7 packaging concern).
2. Commit a **complete** Electron de-branding checklist that wave 5 (Electron shell) and wave 7 (packaging) are bound to execute + verify. Every default-Electron surface named explicitly.

## Scope (wave 5 prep, not implementation)

1. `apps/dashboard-electron/icons/icon.svg` — 1024×1024 master. Design: pure black bg, 12% corner radius, centered λ glyph in accent-green, thin accent-dim frame, 4 corner-marker clips.
2. `apps/dashboard-electron/icons/README.md` — raster-pipeline spec (how we go from this SVG to `.icns` / `.ico` / `.png` at package time).
3. `apps/dashboard-electron/BRANDING-CHECKLIST.md` — 50+ line verifiable checklist covering:
   - Product identity: name, appId, bundle id, AppUserModelId
   - Runtime branding: `app.setName`, `setAboutPanelOptions`, user-data paths (`userData`, `sessionData`, `logs`, crash dir), window (title, backgroundColor, icon, titleBarStyle, dimensions)
   - Menu bar: full replacement of default Electron menu + app / edit / view / window / help items
   - Dock/taskbar: macOS dock icon + dock menu, Windows AppUserModelId, Linux desktop file
   - Protocol handler (`tot://`)
   - Renderer title + per-route titles
   - DevTools: enabled only in dev
   - Electron-builder config (wave 7): full electron-builder.json spec with mac/dmg/win/nsis/linux sections + publish config pointed at the GitHub repo
   - Verification gates: what must be checked at wave-5 + wave-7 commit gates
4. `apps/dashboard/public/favicon.svg` — refreshed to match the master's visual language (keep in sync per icons/README guidance).

## Out of scope

- Rasterization (`.icns` / `.ico` / `.png`) — wave 7 (electron-builder can auto-generate from SVG, or we pre-generate then). We ship `icon.svg` + empty `mac/`, `win/`, `linux/` subdirs as placeholders.
- Actual Electron code that consumes the icons or applies the checklist — wave 5.
- DMG background PNG — deferred to wave 7 (design needs the pattern-grid treatment).
- Code signing / notarization config — wave 7.

## Assumptions

- λ (lambda) is the brand glyph. Consistent with existing favicon + terminal aesthetic. Non-negotiable for this mission.
- Accent-green `#00ff41` and black `#000000` are the brand palette (already locked in `libs/ui/tokens/theme.scss`).
- App ID = `com.iamB0ody.tot` (user's GitHub handle + short product name). Reverses to domain; works on macOS / Windows / Linux.
- Product name = `tot` lowercase (matches the CLI binary). Display contexts may use "tot — team orchestration".
- Copyright held by user (name from git config: Abdelrahman Ahmed). License MIT.
- Icon masters ship committed to the repo (not `.gitignore`d). At ~2 KB for the SVG, it's source-of-truth and tiny.
- Wave 5 (Electron shell) and wave 7 (packaging) will reference this checklist at their commit gates — commits blocked if any line unchecked.

## Classification

**Type:** `TRIVIAL`

**Rationale:** Pure asset + documentation commit. No code. 4 new files (icon.svg, icons/README, BRANDING-CHECKLIST.md, updated favicon). Single specialist (supervisor). Prep for subsequent waves.

## Pipeline

- Stage 0 brief (this).
- Stages 1–3 skipped (TRIVIAL).
- Stage 4 impl T-001 DONE.
- Stage 5 build-check: assets render (SVG valid XML), no code impact (no install/build needed).
- Stage 6 commit gate A — user directive autonomous.
- Stage 12 done + SHA backfill.

## Next

Wave 4.5 (mission drill-down in browser) OR wave 5 (Electron shell consuming this icon + executing the checklist). User's call.
