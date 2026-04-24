// ============================================================================
// state.md parser
// ============================================================================
// Parses missions/NNNN-<slug>/state.md files into MissionState records.
//
// state.md structure (from SKILL.md §5):
//   ---
//   mission: 0029
//   slug: auto-cost-capture
//   type: TRIVIAL
//   ... (YAML frontmatter)
//   ---
//
//   ## Activity log
//   - <ISO>  <agent>  session=<uuid>  <text>
//   - <ISO>  <agent>  <text>                    (pre-C8 entries)
//
//   ## Gate history
//   - gate-name: status ...
//
//   ## Pause history
//   - <ISO>  paused by ...
//
// We parse the frontmatter with `yaml`, then walk the body sections looking
// for bullet lines under "## Activity log" to extract structured entries.
// Everything else (gate history, pause history, stage durations) is left as
// raw markdown accessible via `extra` when needed.
// ============================================================================

import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import type {
  MissionState,
  ActivityLogEntry,
  MissionStatus,
  MissionStage,
  MissionType,
  SessionTokens,
} from "@team-orchestration/shared-types";

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
const ACTIVITY_LOG_HEADING_RE = /^##\s+Activity log\s*$/;
const SECTION_HEADING_RE = /^##\s+/;
// "- <ISO>  <agent>  [session=<uuid>  ]<text>"
// ISO accepts: YYYY-MM-DDTHH:MM:SS[.sss]Z or with local offset.
const ENTRY_RE = /^-\s+(\S+)\s+(\S+)\s+(.*)$/;
const SESSION_TAG_RE = /^session=([0-9a-f-]{36})\s+(.*)$/i;

function coerceStatus(v: unknown): MissionStatus {
  const s = typeof v === "string" ? v.toLowerCase().trim() : "";
  if (s === "active" || s === "paused" || s === "done" || s === "cancelled" || s === "archived") {
    return s;
  }
  return "active";
}

function coerceStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

function coerceNumOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return null;
}

function coerceStringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  return null;
}

function coerceTokens(v: unknown): SessionTokens | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  const input = coerceNumOrNull(obj["input"]);
  const output = coerceNumOrNull(obj["output"]);
  const cacheRead = coerceNumOrNull(obj["cache_read"]);
  const cacheCreation = coerceNumOrNull(obj["cache_creation"]);
  const total = coerceNumOrNull(obj["total"]);
  if (input === null && output === null && total === null) return null;
  return {
    input: input ?? 0,
    output: output ?? 0,
    cache_read: cacheRead ?? 0,
    cache_creation: cacheCreation ?? 0,
    total: total ?? (input ?? 0) + (output ?? 0) + (cacheRead ?? 0) + (cacheCreation ?? 0),
  };
}

/**
 * Splits a markdown file into `{ frontmatter: object | null, body: string }`.
 * Tolerates files without frontmatter.
 */
function splitFrontmatter(source: string): { frontmatter: Record<string, unknown> | null; body: string } {
  const match = FRONTMATTER_RE.exec(source);
  if (!match) return { frontmatter: null, body: source };
  const yamlText = match[1] ?? "";
  const body = match[2] ?? "";
  try {
    const parsed = parseYaml(yamlText) as Record<string, unknown> | null;
    return { frontmatter: parsed ?? {}, body };
  } catch {
    return { frontmatter: null, body };
  }
}

/**
 * Walks body looking for the Activity log section and parses each bullet line.
 */
function parseActivityLog(body: string): ActivityLogEntry[] {
  const lines = body.split(/\r?\n/);
  const entries: ActivityLogEntry[] = [];
  let inSection = false;

  for (const line of lines) {
    if (ACTIVITY_LOG_HEADING_RE.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && SECTION_HEADING_RE.test(line)) {
      // Next section — stop.
      break;
    }
    if (!inSection) continue;

    const m = ENTRY_RE.exec(line);
    if (!m) continue;

    const [, timestamp, agent, rest] = m;

    // Check if `rest` starts with "session=<uuid>  ..."
    let sessionId: string | null = null;
    let text = rest ?? "";
    const sessionMatch = SESSION_TAG_RE.exec(text);
    if (sessionMatch) {
      sessionId = sessionMatch[1] ?? null;
      text = sessionMatch[2] ?? "";
    }

    entries.push({
      timestamp: timestamp ?? "",
      agent: agent ?? "",
      session_id: sessionId,
      text,
    });
  }

  return entries;
}

/**
 * Parse state.md content into a MissionState.
 */
export function parseMissionState(source: string): MissionState {
  const { frontmatter, body } = splitFrontmatter(source);
  const fm = frontmatter ?? {};

  const activityLog = parseActivityLog(body);

  // Track which frontmatter keys we recognize so we can stash the rest in .extra.
  const recognized = new Set([
    "mission", "slug", "type", "status", "stage",
    "current_phase", "current_task", "gate_pending",
    "iteration_count", "iteration_cap",
    "depends_on_missions", "blocks_missions",
    "last_update", "last_agent", "created",
    "started_at", "finished_at",
    "duration_sec", "active_duration_sec",
    "session_cost_usd", "session_tokens",
    "session_models", "session_turn_count",
    "transcript_session_ids", "cross_repo_commits",
  ]);

  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) {
    if (!recognized.has(k)) extra[k] = v;
  }

  // Mission ID: YAML strips leading zeros from "0029" → 29. Pad back to 4 digits.
  const rawMission = fm["mission"];
  const missionStr =
    typeof rawMission === "number" && Number.isFinite(rawMission)
      ? String(rawMission).padStart(4, "0")
      : typeof rawMission === "string"
      ? rawMission
      : "";

  const state: MissionState = {
    mission: missionStr,
    slug: String(fm["slug"] ?? ""),
    type: String(fm["type"] ?? "") as MissionType,
    status: coerceStatus(fm["status"]),
    stage: String(fm["stage"] ?? "brief") as MissionStage,
    current_phase: coerceStringOrNull(fm["current_phase"]),
    current_task: coerceStringOrNull(fm["current_task"]),
    gate_pending: coerceStringOrNull(fm["gate_pending"]),
    iteration_count: coerceNumOrNull(fm["iteration_count"]) ?? 0,
    iteration_cap: coerceNumOrNull(fm["iteration_cap"]) ?? undefined,
    depends_on_missions: coerceStringArray(fm["depends_on_missions"]),
    blocks_missions: coerceStringArray(fm["blocks_missions"]),
    last_update: String(fm["last_update"] ?? ""),
    last_agent: String(fm["last_agent"] ?? ""),
    created: String(fm["created"] ?? ""),
    started_at: coerceStringOrNull(fm["started_at"]) ?? undefined,
    finished_at: coerceStringOrNull(fm["finished_at"]),
    duration_sec: coerceNumOrNull(fm["duration_sec"]),
    active_duration_sec: coerceNumOrNull(fm["active_duration_sec"]),
    session_cost_usd: coerceNumOrNull(fm["session_cost_usd"]),
    session_tokens: coerceTokens(fm["session_tokens"]),
    session_models: coerceStringArray(fm["session_models"]),
    session_turn_count: coerceNumOrNull(fm["session_turn_count"]),
    transcript_session_ids: coerceStringArray(fm["transcript_session_ids"]),
    cross_repo_commits: coerceStringArray(fm["cross_repo_commits"]) || undefined,
    activity_log: activityLog,
  };

  if (Object.keys(extra).length > 0) state.extra = extra;

  return state;
}

/**
 * Convenience: read + parse a state.md file.
 */
export async function readMissionStateFile(path: string): Promise<MissionState> {
  const content = await readFile(path, "utf8");
  return parseMissionState(content);
}

/**
 * Find a mission folder under <workspace>/missions/ by ID (4-digit).
 * Returns the absolute path, or null if not found.
 */
export async function findMissionFolder(
  workspacePath: string,
  missionId: string,
): Promise<string | null> {
  const { readdir } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const missionsDir = join(workspacePath, "missions");
  let entries: string[];
  try {
    entries = await readdir(missionsDir);
  } catch {
    return null;
  }
  const prefix = `${missionId}-`;
  const match = entries.find((e) => e.startsWith(prefix));
  return match ? join(missionsDir, match) : null;
}
