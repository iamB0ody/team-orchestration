#!/usr/bin/env tsx
// ============================================================================
// tot — team-orchestration CLI
// ============================================================================
// Usage:
//   tot workspaces                         # list configured workspaces
//   tot missions <workspace-path>          # list missions in one workspace
//   tot missions --workspace <path>        # same, explicit flag
//   tot missions --workspace <path> --status done
//   tot missions <path> --limit 20
//
// All output uses ANSI color + the hacker theme aesthetic defined in
// libs/ui/tokens/theme.scss (green accents on black, bracketed status pills,
// ASCII dividers, monospace tabular figures).
//
// Exit codes:
//   0 — success
//   1 — usage error / no workspaces configured
//   2 — workspace path doesn't exist or has no missions/REGISTRY.md
// ============================================================================

import { readRegistryFile, listWorkspaces, WORKSPACE_CONFIG_PATH } from "@team-orchestration/core";
import type { MissionRegistryRow, MissionStatus } from "@team-orchestration/shared-types";
import pc from "picocolors";
import { resolve, join } from "node:path";
import { access } from "node:fs/promises";

const ACCENT = pc.green;
const DIM = pc.gray;
const WARN = pc.yellow;
const ERR = pc.red;
const INFO = pc.cyan;
const FG = pc.white;
const LABEL = (s: string) => DIM(s.toUpperCase());

function divider(label?: string): string {
  const bar = "─".repeat(60);
  if (!label) return DIM(bar);
  const side = "─".repeat(10);
  return `${DIM(side)} ${DIM(label.toUpperCase())} ${DIM(bar.slice(label.length + 12))}`;
}

function statusPill(status: MissionStatus | string): string {
  const s = status.toLowerCase();
  const color =
    s === "active" ? ACCENT :
    s === "paused" ? WARN :
    s === "done" ? DIM :
    s === "cancelled" ? ERR :
    s === "archived" ? DIM : FG;
  const token = s.toUpperCase().padEnd(9, " ");
  return color(`[${token}]`);
}

function pad(s: string | null | undefined, width: number): string {
  const v = s ?? "—";
  if (v.length > width) return v.slice(0, width - 1) + "…";
  return v.padEnd(width, " ");
}

function printHelp(): void {
  console.log(`${ACCENT(">")} tot — team-orchestration CLI`);
  console.log("");
  console.log("Commands:");
  console.log(`  ${ACCENT("tot")} workspaces`);
  console.log("      list configured workspaces + their mission counts.");
  console.log("");
  console.log(`  ${ACCENT("tot")} missions <workspace-path>`);
  console.log(`  ${ACCENT("tot")} missions --workspace <path>`);
  console.log("      list missions in one workspace.");
  console.log("");
  console.log("Flags (missions subcommand):");
  console.log(`  ${INFO("--status")} <active|paused|done|cancelled|archived>`);
  console.log(`  ${INFO("--limit")} <n>`);
  console.log("");
  console.log(`Config: ${DIM(WORKSPACE_CONFIG_PATH)}`);
}

function printMissions(rows: MissionRegistryRow[], workspacePath: string, filters: {
  status?: string;
  limit?: number;
}): void {
  let filtered = rows;
  if (filters.status) {
    const want = filters.status.toLowerCase();
    filtered = filtered.filter((r) => r.status === want || r.table === want);
  }
  if (filters.limit && filters.limit > 0) {
    filtered = filtered.slice(0, filters.limit);
  }

  console.log("");
  console.log(divider(`missions @ ${workspacePath}`));
  console.log("");

  if (filtered.length === 0) {
    console.log(DIM("  (no missions match the filter)"));
    return;
  }

  // Header
  console.log(
    "  " +
    DIM(pad("status", 11)) +
    " " +
    DIM(pad("id", 4)) +
    "  " +
    DIM(pad("slug", 36)) +
    " " +
    DIM(pad("type", 10)) +
    " " +
    DIM(pad("duration", 14)) +
    " " +
    DIM(pad("last", 10))
  );

  for (const row of filtered) {
    const idColor = row.status === "active" ? ACCENT : FG;
    const lastDate = row.completed ?? row.last_update ?? null;
    console.log(
      "  " +
      statusPill(row.status) +
      " " +
      idColor(pad(row.id, 4)) +
      "  " +
      FG(pad(row.slug, 36)) +
      " " +
      INFO(pad(row.type, 10)) +
      " " +
      pc.dim(pad(row.duration, 14)) +
      " " +
      pc.dim(pad(lastDate, 10))
    );
  }

  console.log("");
  const byStatus = filtered.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(byStatus)
    .map(([k, v]) => `${ACCENT(String(v))} ${DIM(k)}`)
    .join("  ");
  console.log(`  ${LABEL("total")} ${ACCENT(String(filtered.length))}   ${summary}`);
}

async function cmdWorkspaces(): Promise<number> {
  const workspaces = await listWorkspaces();
  console.log("");
  console.log(divider("workspaces"));
  console.log("");
  if (workspaces.length === 0) {
    console.log(DIM(`  no workspaces registered.`));
    console.log(DIM(`  create ${WORKSPACE_CONFIG_PATH} with content:`));
    console.log("");
    console.log(DIM(`    {`));
    console.log(DIM(`      "workspaces": [`));
    console.log(DIM(`        { "path": "/absolute/path/to/your/repo" }`));
    console.log(DIM(`      ]`));
    console.log(DIM(`    }`));
    console.log("");
    return 1;
  }
  console.log(
    "  " +
    DIM(pad("label", 20)) +
    " " +
    DIM(pad("active", 6)) +
    " " +
    DIM(pad("done", 6)) +
    " " +
    DIM(pad("last", 12)) +
    " " +
    DIM("path")
  );
  for (const w of workspaces) {
    console.log(
      "  " +
      FG(pad(w.label, 20)) +
      " " +
      (w.mission_count.active > 0 ? ACCENT : DIM)(pad(String(w.mission_count.active), 6)) +
      " " +
      DIM(pad(String(w.mission_count.done), 6)) +
      " " +
      pc.dim(pad(w.last_mission_update, 12)) +
      " " +
      pc.dim(w.path)
    );
  }
  console.log("");
  return 0;
}

async function cmdMissions(args: string[]): Promise<number> {
  let workspacePath: string | undefined;
  let statusFilter: string | undefined;
  let limit: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--workspace" || arg === "-w") {
      workspacePath = args[++i];
    } else if (arg === "--status" || arg === "-s") {
      statusFilter = args[++i];
    } else if (arg === "--limit" || arg === "-l") {
      limit = Number.parseInt(args[++i] ?? "0", 10);
    } else if (arg && !arg.startsWith("-") && !workspacePath) {
      workspacePath = arg;
    }
  }

  if (!workspacePath) {
    console.error(ERR(`error: workspace path required.`));
    console.error(DIM(`  usage: tot missions <workspace-path> [--status ...] [--limit N]`));
    return 1;
  }

  const absPath = resolve(workspacePath);
  const registryPath = join(absPath, "missions", "REGISTRY.md");
  try {
    await access(registryPath);
  } catch {
    console.error(ERR(`error: no missions/REGISTRY.md found at ${absPath}.`));
    return 2;
  }

  const rows = await readRegistryFile(registryPath);
  printMissions(rows, absPath, { status: statusFilter, limit });
  return 0;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];
  let code = 0;

  try {
    if (!command || command === "help" || command === "--help" || command === "-h") {
      printHelp();
      code = 0;
    } else if (command === "workspaces") {
      code = await cmdWorkspaces();
    } else if (command === "missions") {
      code = await cmdMissions(argv.slice(1));
    } else {
      console.error(ERR(`unknown command: ${command}`));
      printHelp();
      code = 1;
    }
  } catch (err) {
    console.error(ERR(`fatal: ${err instanceof Error ? err.message : String(err)}`));
    code = 1;
  }

  process.exit(code);
}

void main();
