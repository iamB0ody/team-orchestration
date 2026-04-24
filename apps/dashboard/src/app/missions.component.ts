import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { ApiService } from "./api.service";
import type {
  MissionRegistryRow,
  MissionStatus,
} from "@team-orchestration/shared-types";

type Filter = "all" | MissionStatus;

const FILTERS: Filter[] = ["all", "active", "paused", "done", "cancelled", "archived"];

@Component({
  selector: "tot-missions",
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="missions">
      <div class="missions__topbar">
        <a routerLink="/" class="missions__back">← workspaces</a>
        <div class="missions__path">{{ workspacePath() || "—" }}</div>
      </div>

      <div class="ascii-divider">missions</div>

      <div class="missions__filters">
        @for (f of filters; track f) {
          <button
            type="button"
            class="missions__filter"
            [class.is-active]="filter() === f"
            (click)="setFilter(f)"
          >
            {{ f }}
            <span class="missions__filter-count">{{ countFor(f) }}</span>
          </button>
        }
      </div>

      @if (loading()) {
        <div class="tot-loading">loading missions…</div>
      } @else if (error()) {
        <div class="tot-error">{{ error() }}</div>
      } @else if (filtered().length === 0) {
        <div class="missions__empty">no missions match the current filter.</div>
      } @else {
        <table class="missions__table">
          <thead>
            <tr>
              <th class="missions__th-status">status</th>
              <th class="missions__th-id">id</th>
              <th>slug</th>
              <th class="missions__th-type">type</th>
              <th class="missions__th-duration">duration</th>
              <th class="missions__th-date">last</th>
            </tr>
          </thead>
          <tbody>
            @for (m of filtered(); track m.id) {
              <tr class="missions__row" [class.is-active]="m.status === 'active'">
                <td>
                  <span class="status-pill" [attr.data-status]="m.status">
                    {{ m.status }}
                  </span>
                </td>
                <td class="missions__td-id">{{ m.id }}</td>
                <td class="missions__td-slug">{{ m.slug }}</td>
                <td class="missions__td-type">{{ m.type }}</td>
                <td class="missions__td-duration">{{ m.duration || "—" }}</td>
                <td class="missions__td-date">
                  {{ m.last_update || m.completed || "—" }}
                </td>
              </tr>
            }
          </tbody>
        </table>

        <div class="missions__summary">
          <span class="prompt-label" data-prompt="$">total</span>
          <span class="missions__summary-num">{{ filtered().length }}</span>
          <span class="missions__summary-sep">·</span>
          @for (pair of countsByStatus(); track pair.status) {
            <span class="missions__summary-stat">
              <span class="missions__summary-stat-num">{{ pair.count }}</span>
              <span class="missions__summary-stat-label">{{ pair.status }}</span>
            </span>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      .missions__topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sp-3);
        margin-bottom: var(--sp-4);
        font-size: var(--fs-sm);
      }
      .missions__back {
        color: var(--fg-1);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);
        font-size: var(--fs-xs);
      }
      .missions__back:hover { color: var(--accent); }
      .missions__path {
        color: var(--fg-2);
        font-size: var(--fs-xs);
      }
      .missions__filters {
        display: flex;
        gap: var(--sp-2);
        margin: var(--sp-3) 0 var(--sp-4);
        flex-wrap: wrap;
      }
      .missions__filter {
        all: unset;
        cursor: pointer;
        padding: 4px 10px;
        font-family: var(--font-ui);
        font-size: var(--fs-xs);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);
        color: var(--fg-1);
        border: 1px solid var(--border);
        background: var(--bg-1);
        display: inline-flex;
        gap: var(--sp-2);
        align-items: center;
      }
      .missions__filter:hover {
        color: var(--fg-0);
        border-color: var(--border-bright);
      }
      .missions__filter.is-active {
        color: var(--accent);
        border-color: var(--accent);
      }
      .missions__filter-count {
        font-variant-numeric: tabular-nums;
        color: var(--fg-2);
      }
      .missions__filter.is-active .missions__filter-count { color: var(--accent); }

      .missions__table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--fs-sm);
      }
      .missions__table th {
        text-align: left;
        padding: var(--sp-2) var(--sp-3);
        font-size: var(--fs-xs);
        font-weight: var(--fw-medium);
        color: var(--fg-2);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);
        border-bottom: 1px solid var(--border-bright);
      }
      .missions__th-status { width: 110px; }
      .missions__th-id { width: 60px; }
      .missions__th-type { width: 110px; }
      .missions__th-duration { width: 140px; }
      .missions__th-date { width: 120px; }

      .missions__row {
        transition: background var(--motion-fast);
      }
      .missions__row:hover {
        background: var(--bg-1);
      }
      .missions__row td {
        padding: var(--sp-2) var(--sp-3);
        border-bottom: 1px solid var(--border);
        color: var(--fg-0);
        font-variant-numeric: tabular-nums;
      }
      .missions__td-id {
        color: var(--fg-0);
        font-weight: var(--fw-medium);
      }
      .missions__row.is-active .missions__td-id { color: var(--accent); }
      .missions__td-type {
        color: var(--info);
        font-size: var(--fs-xs);
      }
      .missions__td-duration,
      .missions__td-date {
        color: var(--fg-2);
        font-size: var(--fs-xs);
      }

      .missions__summary {
        margin-top: var(--sp-4);
        padding-top: var(--sp-3);
        border-top: 1px dashed var(--border);
        display: flex;
        gap: var(--sp-3);
        align-items: baseline;
        font-size: var(--fs-xs);
        color: var(--fg-2);
        flex-wrap: wrap;
      }
      .missions__summary-num {
        color: var(--accent);
        font-size: var(--fs-base);
        font-weight: var(--fw-bold);
        font-variant-numeric: tabular-nums;
      }
      .missions__summary-sep { color: var(--fg-3); }
      .missions__summary-stat {
        display: inline-flex;
        gap: 4px;
      }
      .missions__summary-stat-num {
        color: var(--fg-0);
        font-variant-numeric: tabular-nums;
      }
      .missions__summary-stat-label {
        color: var(--fg-2);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);
      }

      .missions__empty {
        color: var(--fg-2);
        padding: var(--sp-5);
      }
    `,
  ],
})
export class MissionsComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly filters = FILTERS;
  readonly filter = signal<Filter>("all");
  readonly missions = signal<MissionRegistryRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: null,
  });

  readonly workspacePath = computed(
    () => this.queryParams()?.get("path") ?? "",
  );

  readonly filtered = computed(() => {
    const all = this.missions();
    const f = this.filter();
    return f === "all" ? all : all.filter((m) => m.status === f);
  });

  readonly countsByStatus = computed(() => {
    const out: Record<string, number> = {};
    for (const m of this.filtered()) out[m.status] = (out[m.status] ?? 0) + 1;
    return Object.entries(out).map(([status, count]) => ({ status, count }));
  });

  constructor() {
    effect(() => {
      const path = this.workspacePath();
      if (!path) {
        void this.router.navigate(["/"]);
        return;
      }
      void this.load(path);
    });
  }

  private async load(path: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.api.missions(path);
      this.missions.set(data);
    } catch (err) {
      this.error.set(
        err instanceof Error
          ? `failed to load missions: ${err.message}`
          : "failed to load missions",
      );
    } finally {
      this.loading.set(false);
    }
  }

  setFilter(f: Filter): void {
    this.filter.set(f);
  }

  countFor(f: Filter): number {
    const all = this.missions();
    return f === "all" ? all.length : all.filter((m) => m.status === f).length;
  }
}
