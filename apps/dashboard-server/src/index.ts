#!/usr/bin/env tsx
// ============================================================================
// dashboard-server — tiny HTTP server exposing @team-orchestration/core
// ============================================================================
// Zero external deps (just Node stdlib `http` + `url`). Contract:
//
//   GET  /api/health              → { ok: true, version }
//   GET  /api/workspaces          → WorkspaceInfo[]
//   GET  /api/missions?path=<ws>  → MissionRegistryRow[]
//   GET  /api/mission?path=<ws>&id=<NNNN>       → MissionState
//   GET  /api/telemetry?path=<ws>&id=<NNNN>     → SessionSlice
//
// CORS enabled for localhost:4200 (Angular dev server) + any origin in dev.
//
// Design mirror: this contract is what Electron's IPC (wave 5+) will expose
// to the renderer via contextBridge. Swap `fetch('/api/…')` for
// `window.api.…()` and the Angular app runs inside Electron unchanged.
// ============================================================================

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { join } from "node:path";
import { access } from "node:fs/promises";
import {
  listWorkspaces,
  readRegistryFile,
  readMissionStateFile,
  findMissionFolder,
  joinMission,
} from "@team-orchestration/core";

const PORT = Number(process.env["TOT_DASHBOARD_PORT"] ?? 4117);
const VERSION = "0.0.1";

// ---------- helpers ----------

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

function notFound(res: ServerResponse, msg: string): void {
  json(res, 404, { error: msg });
}

function badRequest(res: ServerResponse, msg: string): void {
  json(res, 400, { error: msg });
}

function serverError(res: ServerResponse, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  json(res, 500, { error: "internal", detail: message });
}

async function workspaceRegistryPath(workspacePath: string): Promise<string | null> {
  const candidate = join(workspacePath, "missions", "REGISTRY.md");
  try {
    await access(candidate);
    return candidate;
  } catch {
    return null;
  }
}

// ---------- route handlers ----------

async function handleWorkspaces(res: ServerResponse): Promise<void> {
  const workspaces = await listWorkspaces();
  json(res, 200, workspaces);
}

async function handleMissions(res: ServerResponse, url: URL): Promise<void> {
  const wsPath = url.searchParams.get("path");
  if (!wsPath) return badRequest(res, "missing ?path=<workspace>");
  const registryPath = await workspaceRegistryPath(wsPath);
  if (!registryPath) return notFound(res, `no missions/REGISTRY.md under ${wsPath}`);
  const rows = await readRegistryFile(registryPath);
  json(res, 200, rows);
}

async function handleMission(res: ServerResponse, url: URL): Promise<void> {
  const wsPath = url.searchParams.get("path");
  const id = url.searchParams.get("id");
  if (!wsPath || !id) return badRequest(res, "missing ?path= or ?id=");
  const padded = id.padStart(4, "0");
  const folder = await findMissionFolder(wsPath, padded);
  if (!folder) return notFound(res, `no mission ${padded} under ${wsPath}`);
  const state = await readMissionStateFile(join(folder, "state.md"));
  json(res, 200, state);
}

async function handleTelemetry(res: ServerResponse, url: URL): Promise<void> {
  const wsPath = url.searchParams.get("path");
  const id = url.searchParams.get("id");
  if (!wsPath || !id) return badRequest(res, "missing ?path= or ?id=");
  const padded = id.padStart(4, "0");
  const folder = await findMissionFolder(wsPath, padded);
  if (!folder) return notFound(res, `no mission ${padded} under ${wsPath}`);
  const state = await readMissionStateFile(join(folder, "state.md"));
  const slice = await joinMission(state, { workspacePath: wsPath });
  json(res, 200, slice);
}

// ---------- dispatcher ----------

async function dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    return json(res, 405, { error: "method not allowed" });
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    if (pathname === "/api/health") {
      return json(res, 200, { ok: true, version: VERSION, timestamp: new Date().toISOString() });
    }
    if (pathname === "/api/workspaces") return await handleWorkspaces(res);
    if (pathname === "/api/missions") return await handleMissions(res, url);
    if (pathname === "/api/mission") return await handleMission(res, url);
    if (pathname === "/api/telemetry") return await handleTelemetry(res, url);
    return notFound(res, `no route for ${pathname}`);
  } catch (err) {
    return serverError(res, err);
  }
}

// ---------- boot ----------

const server = createServer((req, res) => {
  dispatch(req, res).catch((err) => serverError(res, err));
});

server.listen(PORT, () => {
  const accent = "\x1b[32m";
  const dim = "\x1b[2m";
  const reset = "\x1b[0m";
  console.log(`${accent}▶${reset} team-orchestration dashboard-server v${VERSION}`);
  console.log(`${dim}  listening on http://localhost:${PORT}${reset}`);
  console.log(`${dim}  routes: /api/{health, workspaces, missions, mission, telemetry}${reset}`);
});

process.on("SIGINT", () => {
  console.log("\nshutting down.");
  server.close(() => process.exit(0));
});
