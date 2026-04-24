// ============================================================================
// REGISTRY.md parser
// ============================================================================
// Parses <workspace>/missions/REGISTRY.md into a flat list of MissionRegistryRow
// values. Tolerates schema evolution: column counts vary slightly between
// table variants (Active=12, Done=9, Cancelled/Archived=9), legacy rows have
// non-canonical type labels, Notes may contain pipe chars inside backticks.
//
// Strategy:
//   1. Read file line-by-line.
//   2. Track which H2 section we're in: `## Active`, `## Done`, `## Cancelled`,
//      `## Archived`.
//   3. Skip the header row (the one with `| ID | Slug | ...`) and the
//      separator row (`|----|...`).
//   4. For each data row: split on `|`, strip padding, map to the table's
//      schema.
// ============================================================================

import { readFile } from "node:fs/promises";
import type {
  MissionRegistryRow,
  MissionStatus,
  MissionStage,
} from "@team-orchestration/shared-types";

type TableName = "active" | "done" | "cancelled" | "archived";

const HEADING_TO_TABLE: Record<string, TableName> = {
  "## Active": "active",
  "## Done": "done",
  "## Cancelled": "cancelled",
  "## Archived": "archived",
};

/**
 * Splits one markdown-table row into cells, stripping padding.
 * Markdown rows look like `| a | b | c |` → ["a", "b", "c"].
 * We split on `|` and drop empty leading/trailing cells.
 */
function splitRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return [];
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}

/**
 * "0003, 0005" / "[0003, 0005]" / "—" / "" → ["0003", "0005"] or [].
 */
function parseIdList(raw: string | undefined): string[] {
  if (!raw) return [];
  const s = raw.trim();
  if (!s || s === "—" || s === "-") return [];
  return s
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * "`abc1234`, `def5678`" → ["abc1234", "def5678"].
 * Tolerates empty / dash / pending markers.
 */
function parseCommits(raw: string | undefined): string[] {
  if (!raw) return [];
  const s = raw.trim();
  if (!s || s === "—" || s.startsWith("_(pending")) return [];
  return s
    .split(",")
    .map((x) => x.replace(/`/g, "").trim())
    .map((x) => x.replace(/\s*\(.*\)\s*$/, "").trim()) // drop trailing "(docs)" etc.
    .filter((x) => x.length >= 4 && /^[0-9a-f]+$/i.test(x));
}

/**
 * "1" / "0" / "—" / "" → number | null.
 */
function parseIntOrNull(raw: string | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || s === "—") return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function parseStatus(raw: string): MissionStatus {
  const s = raw.trim().toLowerCase();
  if (s.startsWith("active")) return "active";
  if (s.startsWith("paused")) return "paused";
  if (s.startsWith("done")) return "done";
  if (s.startsWith("cancelled")) return "cancelled";
  if (s.startsWith("archived")) return "archived";
  return "active"; // permissive fallback
}

function rowFromActive(cells: string[]): MissionRegistryRow | null {
  // Active schema: | ID | Slug | Type | Status | Stage | Phase/Task | Depends on | Blocks | Duration | Cost | Last Update | Updated by |
  if (cells.length < 12) return null;
  const [
    id,
    slug,
    type,
    status,
    stage,
    phase,
    dependsOn,
    blocks,
    duration,
    cost,
    lastUpdate,
    updatedBy,
  ] = cells;
  if (!id || !/^\d{4}$/.test(id)) return null;
  return {
    id,
    slug,
    type: type.replace(/\*.*?\*/g, "").trim(), // strip italic "*(legacy schema)*" markers
    status: parseStatus(status),
    stage: stage as MissionStage,
    phase_or_task: phase && phase !== "—" ? phase : null,
    depends_on: parseIdList(dependsOn),
    blocks: parseIdList(blocks),
    commits: [],
    iterations: null,
    duration: duration && duration !== "—" ? duration : null,
    cost: cost && cost !== "—" ? cost : null,
    last_update: lastUpdate && lastUpdate !== "—" ? lastUpdate : null,
    completed: null,
    updated_by: updatedBy || null,
    notes: null,
    table: "active",
  };
}

function rowFromDoneLike(cells: string[], table: TableName): MissionRegistryRow | null {
  // Done schema: | ID | Slug | Type | Stage | Commit(s) | Iterations | Duration | Completed | Notes |
  if (cells.length < 9) return null;
  const [id, slug, type, stage, commits, iterations, duration, completed, notes] = cells;
  if (!id || !/^\d{4}$/.test(id)) return null;
  return {
    id,
    slug,
    type: type.replace(/\*.*?\*/g, "").trim(),
    status: table === "cancelled" ? "cancelled" : table === "archived" ? "archived" : "done",
    stage: stage as MissionStage,
    phase_or_task: null,
    depends_on: [],
    blocks: [],
    commits: parseCommits(commits),
    iterations: parseIntOrNull(iterations),
    duration: duration && duration !== "—" ? duration : null,
    cost: null, // Done table doesn't have a Cost column; cost lives in Notes or state.md
    last_update: null,
    completed: completed && completed !== "—" ? completed : null,
    updated_by: null,
    notes: notes || null,
    table,
  };
}

/**
 * Parse REGISTRY.md content into mission rows.
 */
export function parseRegistry(markdown: string): MissionRegistryRow[] {
  const lines = markdown.split(/\r?\n/);
  const rows: MissionRegistryRow[] = [];
  let currentTable: TableName | null = null;
  let sawHeader = false; // waiting past the `| ID | Slug | ...` header

  for (const line of lines) {
    const trimmed = line.trim();

    // Section switch — canonicalize headings like "## Active" / "## Done".
    if (trimmed.startsWith("## ")) {
      const matched = Object.entries(HEADING_TO_TABLE).find(([h]) =>
        trimmed === h
      );
      if (matched) {
        currentTable = matched[1];
        sawHeader = false;
        continue;
      }
      // A different H2 — leave the table.
      currentTable = null;
      continue;
    }

    if (!currentTable) continue;
    if (!trimmed.startsWith("|")) continue;

    // Skip the separator row like `|---|---|`.
    if (/^\|[\s:-]+\|[\s|:-]*$/.test(trimmed)) continue;

    // Skip the header row. Heuristic: first cell is "ID".
    const cells = splitRow(trimmed);
    if (cells.length === 0) continue;
    if (!sawHeader) {
      if (cells[0] === "ID") {
        sawHeader = true;
      }
      continue;
    }

    // Data row.
    const row =
      currentTable === "active"
        ? rowFromActive(cells)
        : rowFromDoneLike(cells, currentTable);
    if (row) rows.push(row);
  }

  return rows;
}

/**
 * Convenience: read + parse a REGISTRY.md file.
 */
export async function readRegistryFile(path: string): Promise<MissionRegistryRow[]> {
  const content = await readFile(path, "utf8");
  return parseRegistry(content);
}
