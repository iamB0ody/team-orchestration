# @team-orchestration/dashboard-electron

Electron main process + preload script for the dashboard.

## Responsibilities

- Create BrowserWindow(s) — strict context isolation ON, Node integration OFF in renderer, sandbox ON
- Preload script exposes typed APIs via `contextBridge` (contracts from `@team-orchestration/ipc`)
- Filesystem reads — `~/.claude/projects/<hash>/*.jsonl`, `<workspace>/missions/**`
- File watching via `chokidar` — emit typed events to renderer
- Auto-update via `electron-updater` pointed at GitHub Releases
- Package via `electron-builder` — `.dmg` / `.AppImage` / `.msi`

## Security posture

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- CSP in renderer `index.html` — `default-src 'self'`
- No `remote` module
- No inline scripts
- All fs reads happen in main; renderer asks via IPC

## Status

**Scaffold only.** Main/preload implementation in M2.
