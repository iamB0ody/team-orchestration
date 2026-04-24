// ============================================================================
// registry.spec.ts — REGISTRY.md parser tests
// ============================================================================

import { describe, it, expect } from "vitest";
import { parseRegistry } from "./registry.ts";

const FIXTURE = `# Mission Registry

## Active

| ID | Slug | Type | Status | Stage | Phase/Task | Depends on | Blocks | Duration | Cost | Last Update | Updated by |
|----|------|------|--------|-------|------------|------------|--------|----------|------|-------------|------------|
| 0001 | shamil-ai | feature *(legacy schema)* | active | impl | per phases.md | — | — | — | — | 2026-04-23 | (legacy workflow) |
| 0019 | agent-loop-core | FEATURE-F | active | impl | P2/T-005 | [0007] | [0030] | — | — | 2026-04-24 | supervisor |

## Done

| ID | Slug | Type | Stage | Commit(s) | Iterations | Duration | Completed | Notes |
|----|------|------|-------|-----------|------------|----------|-----------|-------|
| 0002 | shipping-indicator | FEATURE-S | done | \`16f23b8\` | 1 | ~38m | 2026-04-23 | Short notes. |
| 0020 | dashboard-research | RESEARCH | done | \`caa7f6e\` | 0 | ~20m | 2026-04-24 | Cost: ~29M tok. |
| 0034 | setup-repo | DEVOPS | done | \`477ec82\` | 0 | ~11m active | 2026-04-24 | Scaffolded sibling repo. |

## Cancelled

_(none yet)_

## Archived

_(none yet)_
`;

describe("parseRegistry", () => {
  it("parses active-table rows with legacy type labels", () => {
    const rows = parseRegistry(FIXTURE);
    const legacy = rows.find((r) => r.id === "0001");
    expect(legacy).toBeDefined();
    expect(legacy?.slug).toBe("shamil-ai");
    expect(legacy?.type).toBe("feature"); // italic markers stripped
    expect(legacy?.status).toBe("active");
    expect(legacy?.table).toBe("active");
  });

  it("parses active-table depends_on + blocks arrays", () => {
    const rows = parseRegistry(FIXTURE);
    const mission = rows.find((r) => r.id === "0019");
    expect(mission?.depends_on).toEqual(["0007"]);
    expect(mission?.blocks).toEqual(["0030"]);
  });

  it("parses done-table commits with backtick SHAs", () => {
    const rows = parseRegistry(FIXTURE);
    const mission = rows.find((r) => r.id === "0020");
    expect(mission?.commits).toEqual(["caa7f6e"]);
    expect(mission?.status).toBe("done");
    expect(mission?.table).toBe("done");
    expect(mission?.completed).toBe("2026-04-24");
  });

  it("captures iteration count + duration + notes", () => {
    const rows = parseRegistry(FIXTURE);
    const mission = rows.find((r) => r.id === "0002");
    expect(mission?.iterations).toBe(1);
    expect(mission?.duration).toBe("~38m");
    expect(mission?.notes).toBe("Short notes.");
  });

  it("skips the separator row and header row", () => {
    const rows = parseRegistry(FIXTURE);
    // Only data rows. 2 active + 3 done = 5 total.
    expect(rows).toHaveLength(5);
  });

  it("handles empty / dash cells for optional fields", () => {
    const rows = parseRegistry(FIXTURE);
    const legacy = rows.find((r) => r.id === "0001");
    expect(legacy?.depends_on).toEqual([]);
    expect(legacy?.blocks).toEqual([]);
    expect(legacy?.duration).toBeNull();
    expect(legacy?.cost).toBeNull();
  });

  it("returns [] on content with no recognized tables", () => {
    expect(parseRegistry("# No tables here\n\nJust text.\n")).toEqual([]);
  });
});
