# Final: branding-prep — icon master + de-branding spec shipped

## What shipped

- `apps/dashboard-electron/icons/icon.svg` — 1024×1024 master app icon. Black bg, accent-green λ glyph, dim accent frame, corner markers.
- `apps/dashboard-electron/icons/README.md` — raster pipeline spec (SVG → icns/ico/png at package time).
- `apps/dashboard-electron/BRANDING-CHECKLIST.md` — **100+ line verifiable spec** of every Electron default-branding surface that wave 5 + wave 7 must replace. 40+ individual verification items.
- `apps/dashboard/public/favicon.svg` — browser favicon refreshed to match the master's design language.

User directive: "make fully sure of [de-branding]". Checklist is the enforcement mechanism — every item is a code token, shell command, or file check. No subjective lines.

## Updated roadmap

| Wave | Scope | Branding/icon responsibility |
|------|-------|-------------------------------|
| ✅ 0005 (this) | SVG master + checklist | master + spec shipped |
| 4.5 | Mission drill-down UI | — |
| 5 | Electron main + preload + IPC | **executes all 19 wave-5 items; gate-blocks if any unchecked** |
| 6 | UI polish | — |
| 7 | electron-builder packaging + auto-update | **executes all wave-7 items; platform verification (macOS / Windows / Linux) per checklist** |

## Commit plan

Tiny atomic C10 pair:
1. `docs(electron): add SVG app-icon master + full de-branding checklist (mission 0005)`
2. `chore(missions): backfill 0005 SHA`

## Deliverables index

- `brief.md` — scope, assumptions, classification
- `state.md` — frontmatter + activity log
- `impl/T-001.md` — what built, decisions, self-verification, handoff
- `final.md` (this)
