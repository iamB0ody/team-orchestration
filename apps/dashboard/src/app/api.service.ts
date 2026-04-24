import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import type {
  WorkspaceInfo,
  MissionRegistryRow,
  MissionState,
  SessionSlice,
} from "@team-orchestration/shared-types";

const DEFAULT_BASE = "http://localhost:4117";

/**
 * Thin wrapper around the dashboard-server HTTP contract.
 *
 * In wave 5 (Electron), this service is swapped for an IPC-backed one
 * that calls `window.api.*` instead of fetch. Contracts (types) are
 * identical, so no component code changes.
 */
@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =
    (globalThis as { TOT_API_BASE?: string }).TOT_API_BASE ?? DEFAULT_BASE;

  workspaces(): Promise<WorkspaceInfo[]> {
    return firstValueFrom(
      this.http.get<WorkspaceInfo[]>(`${this.baseUrl}/api/workspaces`),
    );
  }

  missions(workspacePath: string): Promise<MissionRegistryRow[]> {
    const q = new URLSearchParams({ path: workspacePath });
    return firstValueFrom(
      this.http.get<MissionRegistryRow[]>(`${this.baseUrl}/api/missions?${q}`),
    );
  }

  mission(workspacePath: string, id: string): Promise<MissionState> {
    const q = new URLSearchParams({ path: workspacePath, id });
    return firstValueFrom(
      this.http.get<MissionState>(`${this.baseUrl}/api/mission?${q}`),
    );
  }

  telemetry(workspacePath: string, id: string): Promise<SessionSlice> {
    const q = new URLSearchParams({ path: workspacePath, id });
    return firstValueFrom(
      this.http.get<SessionSlice>(`${this.baseUrl}/api/telemetry?${q}`),
    );
  }
}
