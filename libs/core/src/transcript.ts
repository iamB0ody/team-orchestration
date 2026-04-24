// ============================================================================
// JSONL transcript parser
// ============================================================================
// Reads a single Claude Code jsonl transcript file and yields typed events.
// Files live at:
//   ~/.claude/projects/<workspace-hash>/<sessionId>.jsonl           (parent)
//   ~/.claude/projects/<workspace-hash>/<sessionId>/subagents/      (sub-agent)
//     agent-<id>.jsonl  +  agent-<id>.meta.json
//
// Design (from mission 0020's architecture.md §8 drift posture):
//   - Whitelist dispatch on `.type` — events with unknown type become
//     opaque stubs (retains timestamp/sessionId for ordering; never throws).
//   - Field-presence parsing — every `.message.usage.*` read guards with
//     `?? 0`. No assumptions about shape.
//   - Graceful failure — malformed JSON lines are skipped with a counter;
//     file-level errors (missing file, permission denied) surface to caller.
//   - Streaming-friendly even though we use readFile — jsonl files in
//     practice are ~1–10 MB; full-load is fast. Switch to line-stream
//     later if any workspace exceeds ~50 MB.
// ============================================================================

import { readFile, readdir, stat, access } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { TranscriptEvent, TurnUsage } from "@team-orchestration/shared-types";

const KNOWN_TYPES = new Set([
  "assistant",
  "user",
  "system",
  "attachment",
  "permission-mode",
]);

interface AssistantMessage {
  model?: string;
  content?: Array<{ type?: string; name?: string } | unknown>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

interface RawEvent {
  type?: string;
  timestamp?: string;
  sessionId?: string;
  isSidechain?: boolean;
  message?: AssistantMessage;
}

/** Pure — normalize one JSONL line (already JSON.parsed) into a TranscriptEvent. */
export function parseTranscriptEvent(raw: unknown): TranscriptEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as RawEvent;
  if (!e.type || typeof e.type !== "string") return null;

  const type = e.type;
  const timestamp = typeof e.timestamp === "string" ? e.timestamp : null;
  const sessionId = typeof e.sessionId === "string" ? e.sessionId : null;
  const isSidechain = !!e.isSidechain;

  let model: string | null = null;
  let toolUseNames: string[] = [];
  let usage: TurnUsage | null = null;

  if (type === "assistant" && e.message && typeof e.message === "object") {
    const m = e.message;
    model = typeof m.model === "string" ? m.model : null;
    if (Array.isArray(m.content)) {
      for (const block of m.content) {
        if (
          block &&
          typeof block === "object" &&
          "type" in block &&
          (block as { type?: string }).type === "tool_use"
        ) {
          const name = (block as { name?: string }).name;
          if (typeof name === "string") toolUseNames.push(name);
        }
      }
    }
    if (m.usage && typeof m.usage === "object") {
      usage = {
        input_tokens: Number(m.usage.input_tokens) || 0,
        output_tokens: Number(m.usage.output_tokens) || 0,
        cache_read_input_tokens: Number(m.usage.cache_read_input_tokens) || 0,
        cache_creation_input_tokens: Number(m.usage.cache_creation_input_tokens) || 0,
      };
    }
  }

  return {
    type,
    timestamp,
    sessionId,
    model,
    toolUseNames,
    usage,
    isSidechain,
  };
}

export interface StreamResult {
  events: TranscriptEvent[];
  skipped: number; // count of malformed JSON lines + events we couldn't normalize
  unknownTypes: Record<string, number>; // count per unknown event-type string
}

/**
 * Read + parse one jsonl file. Per the drift posture: unknown event types
 * are counted but the events they ride on are still emitted so callers can
 * skip them or render schema-drift warnings.
 */
export async function readTranscriptFile(path: string): Promise<StreamResult> {
  const content = await readFile(path, "utf8");
  const lines = content.split("\n");
  const events: TranscriptEvent[] = [];
  const unknownTypes: Record<string, number> = {};
  let skipped = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch {
      skipped++;
      continue;
    }
    const event = parseTranscriptEvent(raw);
    if (!event) {
      skipped++;
      continue;
    }
    if (!KNOWN_TYPES.has(event.type)) {
      unknownTypes[event.type] = (unknownTypes[event.type] ?? 0) + 1;
    }
    events.push(event);
  }

  return { events, skipped, unknownTypes };
}

// ----------------------------------------------------------------------------
// Workspace-hash discovery helpers
// ----------------------------------------------------------------------------

/**
 * Compute the `~/.claude/projects/<hash>/` directory name for a workspace.
 * Per SKILL.md principle 14: it's a literal `/` → `-` path transform,
 * not a hash function. Stable but breaks if you move the workspace.
 */
export function workspaceHash(workspacePath: string): string {
  return workspacePath.replace(/\//g, "-");
}

/**
 * Absolute path to the Claude Code projects dir for this workspace.
 */
export function jsonlDir(
  workspacePath: string,
  homeOverride?: string,
): string {
  return join(homeOverride ?? homedir(), ".claude", "projects", workspaceHash(workspacePath));
}

/**
 * Locate the parent jsonl file for a given session id in a workspace.
 * Returns absolute path if present; null otherwise.
 */
export async function findParentTranscript(
  workspacePath: string,
  sessionId: string,
  homeOverride?: string,
): Promise<string | null> {
  const path = join(jsonlDir(workspacePath, homeOverride), `${sessionId}.jsonl`);
  try {
    await access(path);
    return path;
  } catch {
    return null;
  }
}

/**
 * Locate sub-agent jsonl files for a parent session. Returns array of
 * `{ path, metaPath }` entries (possibly empty if no subagents folder or
 * no sub-agent events fired in that session).
 */
export async function findSubAgentTranscripts(
  workspacePath: string,
  parentSessionId: string,
  homeOverride?: string,
): Promise<Array<{ path: string; metaPath: string; agentId: string }>> {
  const subDir = join(jsonlDir(workspacePath, homeOverride), parentSessionId, "subagents");
  try {
    const info = await stat(subDir);
    if (!info.isDirectory()) return [];
  } catch {
    return [];
  }
  const entries = await readdir(subDir);
  return entries
    .filter((n) => n.endsWith(".jsonl"))
    .map((n) => {
      const agentId = n.replace(/\.jsonl$/, "");
      return {
        path: join(subDir, n),
        metaPath: join(subDir, `${agentId}.meta.json`),
        agentId,
      };
    });
}

/**
 * Read a sub-agent's .meta.json — `{ agentType, description }`.
 * Tolerant of missing file or bad JSON.
 */
export async function readSubAgentMeta(
  metaPath: string,
): Promise<{ agentType: string; description: string } | null> {
  try {
    const raw = await readFile(metaPath, "utf8");
    const parsed = JSON.parse(raw) as { agentType?: string; description?: string };
    return {
      agentType: typeof parsed.agentType === "string" ? parsed.agentType : "unknown",
      description: typeof parsed.description === "string" ? parsed.description : "",
    };
  } catch {
    return null;
  }
}
