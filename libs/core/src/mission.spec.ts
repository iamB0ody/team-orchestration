// ============================================================================
// mission.spec.ts — state.md parser tests
// ============================================================================

import { describe, it, expect } from "vitest";
import { parseMissionState } from "./mission.ts";

const FULL_FIXTURE = `---
mission: 0029
slug: auto-cost-capture
type: TRIVIAL
status: done
stage: done
current_phase: null
current_task: null
gate_pending: null
iteration_count: 0
last_update: 2026-04-24T05:34:51Z
last_agent: supervisor
created: 2026-04-24T02:48:00Z
finished_at: 2026-04-24T05:34:51Z
duration_sec: 10011
active_duration_sec: 600
depends_on_missions: ["0027", "0028"]
blocks_missions: []
transcript_session_ids: ["74435542-4f3c-4a28-b362-8e90ce2b7ead"]
session_cost_usd: null
session_tokens:
  input: 49
  output: 18595
  cache_read: 10182434
  cache_creation: 1955323
  total: 12156401
session_models: ["claude-opus-4-7"]
session_turn_count: 20
---

## Activity log
- 2026-04-24T02:48:00Z  supervisor  session=74435542-4f3c-4a28-b362-8e90ce2b7ead  mission created, type=TRIVIAL; triggered by user directive.
- 2026-04-24T05:34:51Z  supervisor  session=74435542-4f3c-4a28-b362-8e90ce2b7ead  T-001 impl complete.
- 2026-04-23T01:00:00Z  shamil-product-manager  spec.md written (no C8 session tag here — pre-C8 line)

## Gate history
- commit-gate-a: approved 2026-04-24T05:34:51Z by user

## Pause history
- (none)
`;

const NO_FRONTMATTER = `## Just a body
no frontmatter at all.
`;

const MALFORMED_YAML = `---
mission: [broken yaml
---

## Activity log
- 2026-04-24T01:00:00Z  supervisor  dangling bracket
`;

describe("parseMissionState", () => {
  it("parses all frontmatter fields from a well-formed state.md", () => {
    const s = parseMissionState(FULL_FIXTURE);
    expect(s.mission).toBe("0029");
    expect(s.slug).toBe("auto-cost-capture");
    expect(s.type).toBe("TRIVIAL");
    expect(s.status).toBe("done");
    expect(s.stage).toBe("done");
    expect(s.iteration_count).toBe(0);
    expect(s.duration_sec).toBe(10011);
    expect(s.active_duration_sec).toBe(600);
  });

  it("parses session_tokens as a structured object", () => {
    const s = parseMissionState(FULL_FIXTURE);
    expect(s.session_tokens).not.toBeNull();
    expect(s.session_tokens?.input).toBe(49);
    expect(s.session_tokens?.output).toBe(18595);
    expect(s.session_tokens?.total).toBe(12156401);
  });

  it("parses depends_on_missions + transcript_session_ids arrays", () => {
    const s = parseMissionState(FULL_FIXTURE);
    expect(s.depends_on_missions).toEqual(["0027", "0028"]);
    expect(s.blocks_missions).toEqual([]);
    expect(s.transcript_session_ids).toEqual([
      "74435542-4f3c-4a28-b362-8e90ce2b7ead",
    ]);
    expect(s.session_models).toEqual(["claude-opus-4-7"]);
  });

  it("extracts session=<uuid> tag (C8) from activity-log lines", () => {
    const s = parseMissionState(FULL_FIXTURE);
    expect(s.activity_log.length).toBeGreaterThanOrEqual(3);
    const tagged = s.activity_log.find((e) =>
      e.text.includes("mission created"),
    );
    expect(tagged?.session_id).toBe(
      "74435542-4f3c-4a28-b362-8e90ce2b7ead",
    );
    expect(tagged?.timestamp).toBe("2026-04-24T02:48:00Z");
    expect(tagged?.agent).toBe("supervisor");
  });

  it("handles pre-C8 activity-log lines without session tag", () => {
    const s = parseMissionState(FULL_FIXTURE);
    const preC8 = s.activity_log.find(
      (e) => e.agent === "shamil-product-manager",
    );
    expect(preC8?.session_id).toBeNull();
    expect(preC8?.text).toContain("pre-C8 line");
  });

  it("stops parsing at the next section heading", () => {
    const s = parseMissionState(FULL_FIXTURE);
    // Activity log has 3 bullet lines; Gate history is ignored.
    expect(s.activity_log).toHaveLength(3);
    // No activity-log entry should be for "commit-gate-a" (that's gate history).
    expect(
      s.activity_log.every((e) => !e.text.includes("commit-gate-a")),
    ).toBe(true);
  });

  it("tolerates files with no frontmatter", () => {
    const s = parseMissionState(NO_FRONTMATTER);
    expect(s.mission).toBe("");
    expect(s.activity_log).toEqual([]);
  });

  it("tolerates malformed YAML by falling back gracefully", () => {
    const s = parseMissionState(MALFORMED_YAML);
    // mission should be empty (fallback), but activity log should still parse.
    expect(s.mission).toBe("");
    expect(s.activity_log.length).toBeGreaterThan(0);
  });
});
