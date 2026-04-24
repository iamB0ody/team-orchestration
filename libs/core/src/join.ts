// ============================================================================
// Time-window join engine
// ============================================================================
// Given a MissionState (parsed from state.md), compute the equivalent of
// SKILL.md §12 principle 13's bash recipe as a typed TS function:
//
//   1. For each sessionId in state.transcript_session_ids[]:
//      a. Load the parent jsonl + all sub-agent jsonls under
//         <sessionId>/subagents/.
//      b. Filter events to [state.created, state.finished_at].
//      c. Aggregate message.usage fields + distinct models + tool-use names.
//   2. Return a SessionSlice with the full breakdown — consumable by the CLI
//      (`tot mission --telemetry`) AND the future Angular drill-down view.
//
// No side effects. Pure on its inputs (MissionState + workspacePath). Failure
// modes surface as arrays of `missingTranscripts` rather than exceptions.
// ============================================================================

import type { MissionState, SessionSlice, SessionTokens } from "@team-orchestration/shared-types";
import {
  readTranscriptFile,
  findParentTranscript,
  findSubAgentTranscripts,
  readSubAgentMeta,
} from "./transcript.ts";

interface JoinOptions {
  /** absolute path to the workspace the mission belongs to (used to compute <workspace-hash>) */
  workspacePath: string;
  /** override for HOME (tests mostly) */
  homeOverride?: string;
}

function inWindow(ts: string | null, start: string, end: string): boolean {
  if (!ts) return false;
  return ts >= start && ts <= end;
}

function emptyTokens(): SessionTokens {
  return { input: 0, output: 0, cache_read: 0, cache_creation: 0, total: 0 };
}

function addTokens(a: SessionTokens, u: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }): SessionTokens {
  return {
    input: a.input + u.input_tokens,
    output: a.output + u.output_tokens,
    cache_read: a.cache_read + u.cache_read_input_tokens,
    cache_creation: a.cache_creation + u.cache_creation_input_tokens,
    total: a.total + u.input_tokens + u.output_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens,
  };
}

/**
 * Join a mission's state to its transcript files and return the aggregated slice.
 *
 * Fail-open strategy:
 *   - No `transcript_session_ids` → returns empty slice with windowMatched=false.
 *   - Parent jsonl missing → listed in `missingTranscripts`, skipped.
 *   - Sub-agent folder absent → treated as "no sub-agents fired".
 *   - Malformed .meta.json → agentType defaults to "unknown".
 */
export async function joinMission(
  state: MissionState,
  options: JoinOptions,
): Promise<SessionSlice> {
  const start = state.created;
  const end = state.finished_at ?? new Date().toISOString();

  const slice: SessionSlice = {
    window: { start, end },
    sessionIds: [...state.transcript_session_ids],
    missingTranscripts: [],
    parentFilesRead: 0,
    subAgentFilesRead: 0,
    turnCount: 0,
    tokens: emptyTokens(),
    models: [],
    toolCounts: {},
    subAgents: [],
  };

  if (state.transcript_session_ids.length === 0) return slice;

  const modelSet = new Set<string>();

  for (const sid of state.transcript_session_ids) {
    const parentPath = await findParentTranscript(options.workspacePath, sid, options.homeOverride);
    if (!parentPath) {
      slice.missingTranscripts.push(sid);
      continue;
    }
    slice.parentFilesRead++;
    const parent = await readTranscriptFile(parentPath);

    for (const ev of parent.events) {
      if (ev.type !== "assistant") continue;
      if (!inWindow(ev.timestamp, start, end)) continue;
      slice.turnCount++;
      if (ev.model) modelSet.add(ev.model);
      if (ev.usage) slice.tokens = addTokens(slice.tokens, ev.usage);
      for (const tool of ev.toolUseNames) {
        slice.toolCounts[tool] = (slice.toolCounts[tool] ?? 0) + 1;
      }
    }

    // Sub-agents for this parent session
    const subFiles = await findSubAgentTranscripts(options.workspacePath, sid, options.homeOverride);
    for (const sf of subFiles) {
      slice.subAgentFilesRead++;
      const sub = await readTranscriptFile(sf.path);
      let subStart: string | null = null;
      let subEnd: string | null = null;
      let subTurns = 0;
      for (const ev of sub.events) {
        if (ev.type !== "assistant") continue;
        if (!inWindow(ev.timestamp, start, end)) continue;
        subTurns++;
        if (!subStart) subStart = ev.timestamp;
        subEnd = ev.timestamp;
        slice.turnCount++;
        if (ev.model) modelSet.add(ev.model);
        if (ev.usage) slice.tokens = addTokens(slice.tokens, ev.usage);
        for (const tool of ev.toolUseNames) {
          slice.toolCounts[tool] = (slice.toolCounts[tool] ?? 0) + 1;
        }
      }
      if (subTurns === 0) continue; // sub-agent was out of window — skip reporting
      const meta = await readSubAgentMeta(sf.metaPath);
      slice.subAgents.push({
        agentType: meta?.agentType ?? "unknown",
        description: meta?.description ?? "",
        startTs: subStart ?? "",
        endTs: subEnd ?? "",
        turnCount: subTurns,
      });
    }
  }

  slice.models = [...modelSet].sort();
  return slice;
}
