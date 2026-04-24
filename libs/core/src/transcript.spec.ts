// ============================================================================
// transcript.spec.ts
// ============================================================================

import { describe, it, expect } from "vitest";
import { parseTranscriptEvent, workspaceHash } from "./transcript.ts";

describe("parseTranscriptEvent", () => {
  it("parses an assistant event with usage + model + tool_use blocks", () => {
    const raw = {
      type: "assistant",
      timestamp: "2026-04-24T05:30:00.123Z",
      sessionId: "abc-123",
      isSidechain: false,
      message: {
        model: "claude-opus-4-7",
        content: [
          { type: "text", text: "…" },
          { type: "tool_use", name: "Bash", id: "t1" },
          { type: "tool_use", name: "Read", id: "t2" },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_read_input_tokens: 200,
          cache_creation_input_tokens: 10,
        },
      },
    };
    const ev = parseTranscriptEvent(raw);
    expect(ev).not.toBeNull();
    expect(ev?.type).toBe("assistant");
    expect(ev?.model).toBe("claude-opus-4-7");
    expect(ev?.toolUseNames).toEqual(["Bash", "Read"]);
    expect(ev?.usage?.input_tokens).toBe(100);
    expect(ev?.usage?.output_tokens).toBe(50);
    expect(ev?.usage?.cache_read_input_tokens).toBe(200);
    expect(ev?.timestamp).toBe("2026-04-24T05:30:00.123Z");
  });

  it("returns null on non-object input", () => {
    expect(parseTranscriptEvent(null)).toBeNull();
    expect(parseTranscriptEvent("string")).toBeNull();
    expect(parseTranscriptEvent(42)).toBeNull();
  });

  it("returns null on objects missing .type", () => {
    expect(parseTranscriptEvent({})).toBeNull();
    expect(parseTranscriptEvent({ timestamp: "x" })).toBeNull();
  });

  it("tolerates unknown .type but still emits the event", () => {
    const ev = parseTranscriptEvent({
      type: "some-future-type",
      timestamp: "2026-04-24T01:00:00Z",
    });
    expect(ev?.type).toBe("some-future-type");
    expect(ev?.usage).toBeNull();
    expect(ev?.model).toBeNull();
  });

  it("defaults missing usage fields to 0 (field-presence parsing)", () => {
    const ev = parseTranscriptEvent({
      type: "assistant",
      timestamp: "x",
      message: { usage: { input_tokens: 5 } },
    });
    expect(ev?.usage?.input_tokens).toBe(5);
    expect(ev?.usage?.output_tokens).toBe(0);
    expect(ev?.usage?.cache_read_input_tokens).toBe(0);
  });

  it("returns empty toolUseNames when content has no tool_use blocks", () => {
    const ev = parseTranscriptEvent({
      type: "assistant",
      timestamp: "x",
      message: { model: "m", content: [{ type: "text" }] },
    });
    expect(ev?.toolUseNames).toEqual([]);
  });

  it("marks sub-agent events via isSidechain", () => {
    const ev = parseTranscriptEvent({
      type: "assistant",
      timestamp: "x",
      isSidechain: true,
      sessionId: "s",
    });
    expect(ev?.isSidechain).toBe(true);
  });
});

describe("workspaceHash", () => {
  it("replaces / with -", () => {
    expect(workspaceHash("/Volumes/SanDiskSSD/mine/shamil")).toBe(
      "-Volumes-SanDiskSSD-mine-shamil",
    );
  });

  it("handles trailing slash consistently", () => {
    // Principle 14 says literal path transform — we don't normalize trailing /.
    expect(workspaceHash("/foo/bar/")).toBe("-foo-bar-");
    expect(workspaceHash("/foo/bar")).toBe("-foo-bar");
  });
});
