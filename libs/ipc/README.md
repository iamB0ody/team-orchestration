# @team-orchestration/ipc

Type-only IPC contracts between Electron main process and Angular renderer. Zero runtime.

## Pattern

- **Request/response** channels — `api.invoke<TReq, TRes>(channel, req)`
- **Event stream** channels — `api.on<TEvent>(channel, handler)` for file-watch updates
- Every channel has a string constant + TS interface pair
- Preload script exposes only these channels via `contextBridge` — no raw `ipcRenderer` in renderer

Planned channels (M2):

- `workspaces:list` — get registered workspace paths
- `workspaces:add` / `workspaces:remove`
- `missions:list` — per workspace, paginated
- `mission:get` — full detail for one mission
- `transcript:slice` — join telemetry for a mission stage window
- `watch:mission-folder` → event stream on state.md / REGISTRY changes
- `watch:transcript` → event stream on new jsonl events (for active missions)

Status: **scaffold only — contracts written alongside M2 impl.**
