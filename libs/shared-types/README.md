# @team-orchestration/shared-types

Type-only library. Zero runtime dependencies.

Exports TypeScript interfaces for:

- `MissionState` — parsed state.md frontmatter + activity log
- `MissionRegistryRow` — one row across Active/Done/Cancelled/Archived tables
- `TranscriptEvent` (union: `AssistantEvent | UserEvent | SystemEvent | AttachmentEvent | PermissionModeEvent | UnknownEvent`)
- `UsageBlock` — per-turn `message.usage` shape (input/output/cache_read/cache_creation + ephemeral buckets)
- `SessionSlice` — output of `@team-orchestration/core`'s time-slice join
- `WorkflowSchemaVersion` — semver token pinned by the dashboard; used in drift-detection banners

Field names match the JSONL schema characterized in `<shamil>/missions/0020-dashboard-telemetry-join/architecture.md` §1d exactly.

Status: **scaffold only** — types land in M2.
