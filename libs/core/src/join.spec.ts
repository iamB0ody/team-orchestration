// ============================================================================
// join.spec.ts
// ============================================================================
// Integration-style test: writes a synthetic transcript file to a tempdir
// shaped like ~/.claude/projects/<hash>/ and runs joinMission against it.
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join as joinPath } from "node:path";
import { tmpdir } from "node:os";
import { joinMission } from "./join.ts";
import type { MissionState } from "@team-orchestration/shared-types";

function line(obj: Record<string, unknown>): string {
  return JSON.stringify(obj);
}

function assistantEvent(ts: string, tokens: number, model = "claude-opus-4-7", tools: string[] = []) {
  return {
    type: "assistant",
    timestamp: ts,
    sessionId: "PARENT_SESSION",
    isSidechain: false,
    message: {
      model,
      content: [
        { type: "text", text: "…" },
        ...tools.map((t) => ({ type: "tool_use", name: t, id: t })),
      ],
      usage: {
        input_tokens: tokens,
        output_tokens: tokens * 2,
        cache_read_input_tokens: tokens * 10,
        cache_creation_input_tokens: 5,
      },
    },
  };
}

let homeOverride: string;
let workspacePath: string;

const PARENT_SID = "parent-sid-12345678";
const SUB_AGENT_ID = "agent-sub123";

const MISSION_WINDOW = {
  start: "2026-04-24T01:00:00Z",
  end: "2026-04-24T02:00:00Z",
};

beforeAll(async () => {
  homeOverride = await mkdtemp(joinPath(tmpdir(), "tot-join-"));
  workspacePath = "/fake/workspace/path";
  // workspaceHash("/fake/workspace/path") = "-fake-workspace-path"
  const projectDir = joinPath(homeOverride, ".claude", "projects", "-fake-workspace-path");
  const subagentDir = joinPath(projectDir, PARENT_SID, "subagents");
  await mkdir(subagentDir, { recursive: true });

  // Parent jsonl: 3 events — 2 inside window, 1 outside
  const parentLines = [
    line(assistantEvent("2026-04-24T00:59:00Z", 1, "claude-opus-4-7", [])), // outside
    line(assistantEvent("2026-04-24T01:10:00Z", 100, "claude-opus-4-7", ["Bash", "Read"])),
    line(assistantEvent("2026-04-24T01:20:00Z", 200, "claude-haiku-4-5", ["Read"])),
    line(assistantEvent("2026-04-24T02:30:00Z", 999, "claude-opus-4-7", [])), // outside
    "", // blank line tolerated
    "not valid json", // malformed skipped
  ].join("\n");
  await writeFile(joinPath(projectDir, `${PARENT_SID}.jsonl`), parentLines);

  // Sub-agent jsonl: 2 events in window
  const subLines = [
    line(assistantEvent("2026-04-24T01:15:00Z", 50, "claude-opus-4-7", ["Write"])),
    line(assistantEvent("2026-04-24T01:16:00Z", 75, "claude-opus-4-7", ["Edit"])),
  ].join("\n");
  await writeFile(joinPath(subagentDir, `${SUB_AGENT_ID}.jsonl`), subLines);
  await writeFile(
    joinPath(subagentDir, `${SUB_AGENT_ID}.meta.json`),
    JSON.stringify({ agentType: "shamil-nestjs-prisma-expert", description: "T-001 backend" }),
  );
});

afterAll(async () => {
  await rm(homeOverride, { recursive: true, force: true });
});

function makeState(overrides: Partial<MissionState> = {}): MissionState {
  return {
    mission: "0001",
    slug: "test",
    type: "FEATURE-S",
    status: "done",
    stage: "done",
    current_phase: null,
    current_task: null,
    gate_pending: null,
    iteration_count: 0,
    depends_on_missions: [],
    blocks_missions: [],
    last_update: MISSION_WINDOW.end,
    last_agent: "supervisor",
    created: MISSION_WINDOW.start,
    finished_at: MISSION_WINDOW.end,
    duration_sec: 3600,
    active_duration_sec: 3600,
    session_cost_usd: null,
    session_tokens: null,
    session_models: [],
    session_turn_count: null,
    transcript_session_ids: [PARENT_SID],
    activity_log: [],
    ...overrides,
  };
}

describe("joinMission", () => {
  it("aggregates usage from in-window parent events only", async () => {
    const slice = await joinMission(makeState(), { workspacePath, homeOverride });
    // 2 in-window parent events + 2 sub-agent events = 4 total turns
    expect(slice.turnCount).toBe(4);
    expect(slice.parentFilesRead).toBe(1);
    expect(slice.subAgentFilesRead).toBe(1);
  });

  it("sums tokens correctly across parent + sub-agent", async () => {
    const slice = await joinMission(makeState(), { workspacePath, homeOverride });
    // parent: tokens=100 and 200 → input=300, output=600, cache_read=3000, cache_creation=10
    // sub-agent: tokens=50 and 75 → input=125, output=250, cache_read=1250, cache_creation=10
    // totals: input=425, output=850, cache_read=4250, cache_creation=20
    expect(slice.tokens.input).toBe(425);
    expect(slice.tokens.output).toBe(850);
    expect(slice.tokens.cache_read).toBe(4250);
    expect(slice.tokens.cache_creation).toBe(20);
    expect(slice.tokens.total).toBe(425 + 850 + 4250 + 20);
  });

  it("collects distinct models across parent + sub-agent", async () => {
    const slice = await joinMission(makeState(), { workspacePath, homeOverride });
    expect(slice.models).toEqual(["claude-haiku-4-5", "claude-opus-4-7"]);
  });

  it("counts tools across parent + sub-agent", async () => {
    const slice = await joinMission(makeState(), { workspacePath, homeOverride });
    expect(slice.toolCounts["Bash"]).toBe(1);
    expect(slice.toolCounts["Read"]).toBe(2);
    expect(slice.toolCounts["Write"]).toBe(1);
    expect(slice.toolCounts["Edit"]).toBe(1);
  });

  it("surfaces sub-agent with meta + turn count", async () => {
    const slice = await joinMission(makeState(), { workspacePath, homeOverride });
    expect(slice.subAgents).toHaveLength(1);
    expect(slice.subAgents[0]?.agentType).toBe("shamil-nestjs-prisma-expert");
    expect(slice.subAgents[0]?.description).toBe("T-001 backend");
    expect(slice.subAgents[0]?.turnCount).toBe(2);
  });

  it("reports missing transcripts without throwing", async () => {
    const state = makeState({ transcript_session_ids: [PARENT_SID, "does-not-exist"] });
    const slice = await joinMission(state, { workspacePath, homeOverride });
    expect(slice.missingTranscripts).toEqual(["does-not-exist"]);
    expect(slice.parentFilesRead).toBe(1);
  });

  it("returns an empty slice when no session ids are present", async () => {
    const state = makeState({ transcript_session_ids: [] });
    const slice = await joinMission(state, { workspacePath, homeOverride });
    expect(slice.turnCount).toBe(0);
    expect(slice.tokens.total).toBe(0);
    expect(slice.parentFilesRead).toBe(0);
  });

  it("tolerates malformed JSON lines (skipped, not thrown)", async () => {
    // The fixture parent file has one invalid line. If that line threw,
    // turnCount would be 0. It doesn't.
    const slice = await joinMission(makeState(), { workspacePath, homeOverride });
    expect(slice.turnCount).toBeGreaterThan(0);
  });
});
