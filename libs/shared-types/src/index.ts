// ============================================================================
// @team-orchestration/shared-types
// ============================================================================
// Type contracts shared across apps + libs. Zero runtime.
//
// Scope (wave 1): mission registry + mission state shapes.
// Scope (later waves): transcript events, session slices, IPC contracts.
// ============================================================================

/**
 * Missions can be in one of five lifecycle states.
 */
export type MissionStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "done"
  | "archived";

/**
 * Task-type taxonomy from SKILL.md §3.
 * Legacy missions may carry non-canonical strings (e.g., "feature (legacy schema)").
 */
export type MissionType =
  | "TRIVIAL"
  | "BUGFIX-S"
  | "BUGFIX-A"
  | "FEATURE-S"
  | "FEATURE-F"
  | "REFACTOR"
  | "DEVOPS"
  | "RESEARCH"
  | "SPIKE"
  | "UX"
  | string; // tolerate legacy

/**
 * Canonical stage values per SKILL.md §5.
 */
export type MissionStage =
  | "brief"
  | "spec"
  | "architecture"
  | "plan"
  | "impl"
  | "build-check"
  | "commit-gate-a"
  | "commit-impl"
  | "review"
  | "triage"
  | "fix"
  | "re-verify"
  | "final-build-check"
  | "commit-gate-b"
  | "commit-fixes"
  | "final-report"
  | "done"
  | "cancelled"
  | "archived"
  | string; // tolerate unknowns

/**
 * One row from REGISTRY.md — unified schema across Active / Done / Cancelled
 * / Archived tables. Fields absent from a given table become null.
 */
export interface MissionRegistryRow {
  id: string; // zero-padded 4-digit (e.g., "0020")
  slug: string; // kebab-case
  type: MissionType;
  status: MissionStatus;
  stage: MissionStage;
  phase_or_task: string | null; // Active-table only
  depends_on: string[]; // parsed from "[0003, 0005]" → ["0003", "0005"]
  blocks: string[];
  commits: string[]; // Done-table — short SHAs
  iterations: number | null; // Done-table
  duration: string | null; // human-readable ("~38m", "2h 10m")
  cost: string | null; // USD for API plans, "~29M tok" for subscription, null for in-flight
  last_update: string | null; // YYYY-MM-DD
  completed: string | null; // YYYY-MM-DD (Done only)
  updated_by: string | null;
  notes: string | null; // Done/Cancelled/Archived — ≤ 150 chars
  table: "active" | "done" | "cancelled" | "archived";
}

/**
 * Token aggregate from JSONL `message.usage` fields.
 */
export interface SessionTokens {
  input: number;
  output: number;
  cache_read: number;
  cache_creation: number;
  total: number;
}

/**
 * Full state.md frontmatter + computed fields. Superset of the REGISTRY row.
 *
 * Field names match SKILL.md §5 exactly.
 */
export interface MissionState {
  mission: string;
  slug: string;
  type: MissionType;
  status: MissionStatus;
  stage: MissionStage;
  current_phase: string | null;
  current_task: string | null;
  gate_pending: string | null;
  iteration_count: number;
  iteration_cap?: number;
  depends_on_missions: string[];
  blocks_missions: string[];
  last_update: string; // ISO 8601
  last_agent: string;
  created: string; // ISO 8601
  started_at?: string;
  finished_at: string | null;
  duration_sec: number | null;
  active_duration_sec: number | null;
  session_cost_usd: number | null;
  session_tokens: SessionTokens | null;
  session_models: string[];
  session_turn_count: number | null;
  transcript_session_ids: string[];
  cross_repo_commits?: string[]; // C12 cross-repo refs, optional
  activity_log: ActivityLogEntry[];
  // Anything else the frontmatter carried we didn't recognize.
  extra?: Record<string, unknown>;
}

/**
 * One `- <ISO>  <agent>  <text>` line from state.md's Activity log section.
 * session= tag (C8) is extracted if present.
 */
export interface ActivityLogEntry {
  timestamp: string; // ISO 8601
  agent: string; // free-text slug
  session_id: string | null; // extracted from "session=<uuid>" token (C8)
  text: string; // rest of the line (session= tag already stripped)
}

/**
 * Top-level workspace record — one repo the user has registered for tracking.
 */
export interface WorkspaceInfo {
  path: string; // absolute filesystem path
  label: string; // display name (basename of path by default)
  registry_exists: boolean;
  mission_count: { active: number; done: number; total: number };
  last_mission_update: string | null; // max(last_update) across missions
}

/**
 * Single per-turn usage block extracted from an `assistant` JSONL event's
 * `.message.usage`. Fields are the ones we actually aggregate; unknown
 * fields on the wire are tolerated + ignored.
 */
export interface TurnUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

/**
 * Typed event shape after `parseTranscriptEvent()` normalizes a JSONL line.
 * Fields present vary by `.type`; unknown types become `{ type, timestamp }`
 * stubs so the stream-walker can skip them without losing order.
 */
export interface TranscriptEvent {
  type: "assistant" | "user" | "system" | "attachment" | "permission-mode" | string;
  timestamp: string | null; // null on types like file-history-snapshot
  sessionId: string | null;
  model: string | null; // populated on "assistant" only
  toolUseNames: string[]; // list of tool names in content[] (empty if none)
  usage: TurnUsage | null; // populated on "assistant" only
  isSidechain: boolean; // sub-agent events; top-level file is always false
}

/**
 * Result of joining a mission's [created, finished_at] window against
 * its transcript_session_ids[]. What the live-cost recipe from
 * SKILL.md §12 principle 13 computes, now as typed TS.
 */
export interface SessionSlice {
  window: { start: string; end: string };
  sessionIds: string[];
  missingTranscripts: string[]; // sessionIds with no jsonl on disk
  parentFilesRead: number;
  subAgentFilesRead: number;
  turnCount: number;
  tokens: SessionTokens;
  models: string[];
  toolCounts: Record<string, number>;
  subAgents: Array<{
    agentType: string;
    description: string;
    startTs: string;
    endTs: string;
    turnCount: number;
  }>;
}
