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

import {
  readRegistryFile,
  listWorkspaces,
  WORKSPACE_CONFIG_PATH,
  readMissionStateFile,
  findMissionFolder,
} from "@team-orchestration/core";
import type {
  MissionRegistryRow,
  MissionStatus,
  MissionState,
  ActivityLogEntry,
} from "@team-orchestration/shared-types";
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
  console.log(`  ${ACCENT("tot")} mission <workspace-path> <mission-id>`);
  console.log(`  ${ACCENT("tot")} mission --workspace <path> --id <NNNN>`);
  console.log("      drill-down: full detail for one mission.");
  console.log("");
  console.log("Flags (missions subcommand):");
  console.log(`  ${INFO("--status")} <active|paused|done|cancelled|archived>`);
  console.log(`  ${INFO("--limit")} <n>`);
  console.log("");
  console.log("Flags (mission drill-down):");
  console.log(`  ${INFO("--log-limit")} <n>   (default: 10; use 0 for all)`);
  console.log("");
  console.log(`Config: ${DIM(WORKSPACE_CONFIG_PATH)}`);
}

function fmtNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtDurationSec(s: number | null | undefined): string {
  if (s === null || s === undefined) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function kv(label: string, value: string): string {
  return `  ${LABEL(label.padEnd(18, " "))} ${value}`;
}

function printMissionDetail(state: MissionState, logLimit: number): void {
  console.log("");
  console.log(divider(`${state.mission} — ${state.slug}`));
  console.log("");

  // Identity / status
  console.log(kv("id", ACCENT(state.mission)));
  console.log(kv("slug", FG(state.slug)));
  console.log(kv("type", INFO(state.type)));
  console.log(kv("status", statusPill(state.status)));
  console.log(kv("stage", FG(state.stage)));
  if (state.current_phase) console.log(kv("phase", FG(state.current_phase)));
  if (state.current_task) console.log(kv("task", FG(state.current_task)));
  if (state.gate_pending) console.log(kv("gate pending", WARN(state.gate_pending)));
  if (state.iteration_count > 0) console.log(kv("iterations", WARN(String(state.iteration_count))));

  // Timing
  console.log("");
  console.log(divider("timing"));
  console.log(kv("created", DIM(state.created)));
  if (state.finished_at) console.log(kv("finished", DIM(state.finished_at)));
  console.log(kv("last update", DIM(state.last_update)));
  console.log(kv("last agent", DIM(state.last_agent)));
  if (state.duration_sec !== null) console.log(kv("duration", ACCENT(fmtDurationSec(state.duration_sec))));
  if (state.active_duration_sec !== null) {
    console.log(kv("active duration", ACCENT(fmtDurationSec(state.active_duration_sec))));
  }

  // Dependencies
  if (state.depends_on_missions.length > 0 || state.blocks_missions.length > 0) {
    console.log("");
    console.log(divider("dependencies"));
    if (state.depends_on_missions.length > 0) {
      console.log(kv("depends on", state.depends_on_missions.map((d) => ACCENT(d)).join(" ")));
    }
    if (state.blocks_missions.length > 0) {
      console.log(kv("blocks", state.blocks_missions.map((d) => WARN(d)).join(" ")));
    }
  }

  // Cost (C11)
  if (state.session_tokens || state.session_models.length > 0 || state.session_turn_count !== null) {
    console.log("");
    console.log(divider("cost (auto — C11)"));
    if (state.session_turn_count !== null) {
      console.log(kv("turns", ACCENT(String(state.session_turn_count))));
    }
    if (state.session_tokens) {
      const t = state.session_tokens;
      console.log(kv("total tokens", ACCENT(fmtNumber(t.total))));
      console.log(kv("  input", DIM(fmtNumber(t.input))));
      console.log(kv("  output", DIM(fmtNumber(t.output))));
      console.log(kv("  cache read", DIM(fmtNumber(t.cache_read))));
      console.log(kv("  cache create", DIM(fmtNumber(t.cache_creation))));
    }
    if (state.session_models.length > 0) {
      console.log(kv("models", state.session_models.map((m) => INFO(m)).join(" ")));
    }
    if (state.session_cost_usd !== null) {
      console.log(kv("cost (USD)", ACCENT(`$${state.session_cost_usd.toFixed(2)}`)));
    } else if (state.session_tokens) {
      console.log(kv("cost (USD)", DIM("null — subscription plan; tokens are ground truth")));
    }
  }

  // Transcript sessions
  if (state.transcript_session_ids.length > 0) {
    console.log("");
    console.log(divider("transcript sessions"));
    for (const sid of state.transcript_session_ids) {
      console.log(`  ${DIM("•")} ${DIM(sid)}`);
    }
  }

  // Cross-repo commits (C12)
  if (state.cross_repo_commits && state.cross_repo_commits.length > 0) {
    console.log("");
    console.log(divider("cross-repo commits (C12)"));
    for (const c of state.cross_repo_commits) {
      console.log(`  ${DIM("•")} ${FG(c)}`);
    }
  }

  // Activity log
  console.log("");
  const totalLog = state.activity_log.length;
  const logLabel = logLimit === 0 || totalLog <= logLimit ? `activity log (${totalLog})` : `activity log (showing ${logLimit} of ${totalLog})`;
  console.log(divider(logLabel));

  const slice = logLimit === 0 ? state.activity_log : state.activity_log.slice(-logLimit);
  if (slice.length === 0) {
    console.log(`  ${DIM("(empty)")}`);
  } else {
    for (const entry of slice) {
      printActivityLogEntry(entry);
    }
  }

  console.log("");
}

function printActivityLogEntry(entry: ActivityLogEntry): void {
  // Timestamp — short form HH:MM:SSZ for densification
  const tsShort = entry.timestamp.replace(/^\d{4}-\d{2}-\d{2}T/, "").replace(/\.\d+Z$/, "Z");
  const sessionBadge = entry.session_id
    ? ` ${DIM("[" + entry.session_id.slice(0, 8) + "]")}`
    : "";
  // Text may be long; truncate at 140 chars for list view
  const text = entry.text.length > 140 ? entry.text.slice(0, 137) + "…" : entry.text;
  console.log(
    `  ${DIM(tsShort)}${sessionBadge} ${INFO(entry.agent.padEnd(24, " "))} ${FG(text)}`,
  );
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

async function cmdMission(args: string[]): Promise<number> {
  let workspacePath: string | undefined;
  let missionId: string | undefined;
  let logLimit = 10;

  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--workspace" || arg === "-w") {
      workspacePath = args[++i];
    } else if (arg === "--id" || arg === "-i") {
      missionId = args[++i];
    } else if (arg === "--log-limit") {
      const n = Number.parseInt(args[++i] ?? "", 10);
      if (Number.isFinite(n) && n >= 0) logLimit = n;
    } else if (arg && !arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  if (!workspacePath && positional.length > 0) workspacePath = positional.shift();
  if (!missionId && positional.length > 0) missionId = positional.shift();

  if (!workspacePath || !missionId) {
    console.error(ERR("error: workspace path + mission id required."));
    console.error(
      DIM("  usage: tot mission <workspace-path> <mission-id> [--log-limit N]"),
    );
    return 1;
  }

  // Normalize mission id to zero-padded 4-digit.
  const idPadded = missionId.padStart(4, "0");
  if (!/^\d{4}$/.test(idPadded)) {
    console.error(ERR(`error: mission id must be 1-4 digits (got "${missionId}").`));
    return 1;
  }

  const absPath = resolve(workspacePath);
  const missionFolder = await findMissionFolder(absPath, idPadded);
  if (!missionFolder) {
    console.error(
      ERR(`error: no mission folder matching "${idPadded}-*" under ${absPath}/missions/`),
    );
    return 2;
  }

  const statePath = join(missionFolder, "state.md");
  try {
    await access(statePath);
  } catch {
    console.error(ERR(`error: ${statePath} not found.`));
    return 2;
  }

  const state = await readMissionStateFile(statePath);
  printMissionDetail(state, logLimit);
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
    } else if (command === "mission") {
      code = await cmdMission(argv.slice(1));
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
