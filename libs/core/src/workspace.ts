// ============================================================================
// Workspace registry
// ============================================================================
// A workspace is one on-disk repo that follows the team-orchestration
// mission folder convention (carries a `missions/REGISTRY.md`).
//
// Workspaces are user-registered in a simple JSON config file so the
// dashboard doesn't have to scan the whole filesystem.
//
// Default config path: $XDG_CONFIG_HOME/team-orchestration/workspaces.json
//                       (falls back to ~/.config/team-orchestration/workspaces.json)
//
// Shape:
//   {
//     "workspaces": [
//       { "path": "/absolute/path", "label": "optional display label" },
//       ...
//     ]
//   }
// ============================================================================

import { access, readFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import type { WorkspaceInfo, MissionRegistryRow } from "@team-orchestration/shared-types";
import { readRegistryFile } from "./registry.ts";

export const WORKSPACE_CONFIG_PATH = join(
  process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config"),
  "team-orchestration",
  "workspaces.json",
);

interface WorkspaceConfigEntry {
  path: string;
  label?: string;
}

interface WorkspaceConfig {
  workspaces: WorkspaceConfigEntry[];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadConfig(configPath: string): Promise<WorkspaceConfig | null> {
  if (!(await fileExists(configPath))) return null;
  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as WorkspaceConfig;
    if (!Array.isArray(parsed?.workspaces)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function maxDate(dates: (string | null)[]): string | null {
  const present = dates.filter((d): d is string => !!d).sort();
  return present.length ? present[present.length - 1] ?? null : null;
}

async function summarizeWorkspace(entry: WorkspaceConfigEntry): Promise<WorkspaceInfo> {
  const label = entry.label ?? basename(entry.path);
  const registryPath = join(entry.path, "missions", "REGISTRY.md");
  const exists = await fileExists(registryPath);

  if (!exists) {
    return {
      path: entry.path,
      label,
      registry_exists: false,
      mission_count: { active: 0, done: 0, total: 0 },
      last_mission_update: null,
    };
  }

  let rows: MissionRegistryRow[] = [];
  try {
    rows = await readRegistryFile(registryPath);
  } catch {
    // Corrupted REGISTRY — report as empty but flag registry_exists=true.
  }

  const active = rows.filter((r) => r.table === "active").length;
  const done = rows.filter((r) => r.table === "done").length;
  const lastUpdate = maxDate(rows.map((r) => r.last_update ?? r.completed ?? null));

  return {
    path: entry.path,
    label,
    registry_exists: true,
    mission_count: { active, done, total: rows.length },
    last_mission_update: lastUpdate,
  };
}

/**
 * List all configured workspaces with live mission counts.
 *
 * If no config exists, returns an empty array — caller is responsible for
 * prompting the user to register workspaces.
 */
export async function listWorkspaces(
  configPath: string = WORKSPACE_CONFIG_PATH,
): Promise<WorkspaceInfo[]> {
  const config = await loadConfig(configPath);
  if (!config) return [];

  // Dedup by absolute path (case-sensitive is fine — fs case-sensitivity varies
  // but the user's config already reflects their preferred casing).
  const seen = new Set<string>();
  const uniqueEntries = config.workspaces.filter((entry) => {
    if (seen.has(entry.path)) return false;
    seen.add(entry.path);
    return true;
  });

  return Promise.all(uniqueEntries.map(summarizeWorkspace));
}

// Exported for tests / callers that want raw access.
export { loadConfig, summarizeWorkspace };
