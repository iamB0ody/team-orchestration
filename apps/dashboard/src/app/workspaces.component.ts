import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { ApiService } from "./api.service";
import type { WorkspaceInfo } from "@team-orchestration/shared-types";

@Component({
  selector: "tot-workspaces",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="workspaces">
      <div class="workspaces__header">
        <div class="ascii-divider">workspaces</div>
        @if (workspaces().length > 0) {
          <div class="workspaces__count">
            <span class="prompt-label" data-prompt="$">count</span>
            <span class="workspaces__count-num">{{ workspaces().length }}</span>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="tot-loading">loading workspaces…</div>
      } @else if (error()) {
        <div class="tot-error">
          <div><strong>{{ error() }}</strong></div>
          <div class="workspaces__hint">
            make sure the dashboard-server is running:
            <code>pnpm -F &#64;team-orchestration/dashboard-server start</code>
          </div>
        </div>
      } @else if (workspaces().length === 0) {
        <div class="workspaces__empty">
          <p>no workspaces registered.</p>
          <p class="workspaces__hint">
            copy <code>config/workspaces.example.json</code> to
            <code>~/.config/team-orchestration/workspaces.json</code>
            and edit with your own paths.
          </p>
        </div>
      } @else {
        <div class="workspaces__grid">
          @for (w of workspaces(); track w.path) {
            <button
              type="button"
              class="workspace-card"
              (click)="openWorkspace(w.path)"
            >
              <div class="workspace-card__label">{{ w.label }}</div>
              <div class="workspace-card__path">{{ w.path }}</div>
              <div class="workspace-card__stats">
                <div class="workspace-card__stat">
                  <span class="workspace-card__stat-label">active</span>
                  <span
                    class="workspace-card__stat-value"
                    [class.is-accent]="w.mission_count.active > 0"
                  >
                    {{ w.mission_count.active }}
                  </span>
                </div>
                <div class="workspace-card__stat">
                  <span class="workspace-card__stat-label">done</span>
                  <span class="workspace-card__stat-value">
                    {{ w.mission_count.done }}
                  </span>
                </div>
                <div class="workspace-card__stat">
                  <span class="workspace-card__stat-label">total</span>
                  <span class="workspace-card__stat-value">
                    {{ w.mission_count.total }}
                  </span>
                </div>
              </div>
              @if (w.last_mission_update) {
                <div class="workspace-card__updated">
                  last <span class="workspace-card__updated-date">{{ w.last_mission_update }}</span>
                </div>
              }
              @if (!w.registry_exists) {
                <span class="status-pill" data-status="archived">no registry</span>
              }
            </button>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .workspaces__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--sp-5);
      }
      .workspaces__count {
        display: inline-flex;
        gap: var(--sp-2);
        align-items: center;
        font-size: var(--fs-xs);
        letter-spacing: var(--letter-spacing-wide);
      }
      .workspaces__count-num {
        color: var(--accent);
        font-weight: var(--fw-bold);
        font-size: var(--fs-base);
      }
      .workspaces__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: var(--sp-3);
      }
      .workspace-card {
        all: unset;
        display: block;
        cursor: pointer;
        padding: var(--sp-4);
        background: var(--bg-1);
        border: 1px solid var(--border);
        color: var(--fg-0);
        font-family: var(--font-ui);
        transition:
          border-color var(--motion-fast),
          background var(--motion-fast);
        position: relative;
      }
      .workspace-card:hover {
        background: var(--bg-2);
        border-color: var(--accent-dim);
      }
      .workspace-card:focus-visible {
        border-color: var(--accent);
        box-shadow: var(--focus-ring);
      }
      .workspace-card__label {
        font-size: var(--fs-lg);
        font-weight: var(--fw-medium);
        letter-spacing: var(--letter-spacing-tight);
        color: var(--accent);
      }
      .workspace-card__path {
        margin-top: var(--sp-1);
        font-size: var(--fs-xs);
        color: var(--fg-2);
        word-break: break-all;
      }
      .workspace-card__stats {
        margin-top: var(--sp-4);
        display: flex;
        gap: var(--sp-4);
        padding-top: var(--sp-3);
        border-top: 1px dashed var(--border);
      }
      .workspace-card__stat {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .workspace-card__stat-label {
        font-size: var(--fs-xs);
        color: var(--fg-2);
        letter-spacing: var(--letter-spacing-wide);
        text-transform: uppercase;
      }
      .workspace-card__stat-value {
        font-size: var(--fs-lg);
        color: var(--fg-0);
        font-variant-numeric: tabular-nums;
      }
      .workspace-card__stat-value.is-accent {
        color: var(--accent);
      }
      .workspace-card__updated {
        margin-top: var(--sp-3);
        font-size: var(--fs-xs);
        color: var(--fg-2);
      }
      .workspace-card__updated-date {
        color: var(--fg-1);
      }
      .status-pill {
        position: absolute;
        top: var(--sp-3);
        right: var(--sp-3);
      }
      .workspaces__empty,
      .workspaces__hint {
        color: var(--fg-2);
        font-size: var(--fs-sm);
        margin: var(--sp-2) 0;
      }
      .workspaces__empty code,
      .workspaces__hint code {
        color: var(--accent);
        background: var(--bg-2);
        padding: 2px 6px;
      }
    `,
  ],
})
export class WorkspacesComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly workspaces = signal<WorkspaceInfo[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.api.workspaces();
      this.workspaces.set(data);
    } catch (err) {
      this.error.set(
        err instanceof Error
          ? `failed to load workspaces: ${err.message}`
          : "failed to load workspaces",
      );
    } finally {
      this.loading.set(false);
    }
  }

  openWorkspace(path: string): void {
    void this.router.navigate(["/workspace"], { queryParams: { path } });
  }
}
