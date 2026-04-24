import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

@Component({
  selector: "tot-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <header class="shell__header">
        <a class="shell__brand" routerLink="/">
          <span class="shell__brand-accent">λ</span>
          <span>tot</span>
          <span class="shell__brand-dim">/ team-orchestration</span>
        </a>
        <nav class="shell__nav">
          <a
            routerLink="/"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: true }"
            >workspaces</a
          >
          <a class="shell__nav-disabled" title="wave 4.5">mission</a>
        </nav>
      </header>
      <main class="shell__main">
        <router-outlet />
      </main>
      <footer class="shell__footer">
        <span class="shell__footer-dim">tot</span>
        <span class="shell__footer-sep">·</span>
        <span class="shell__footer-dim">read-only dashboard</span>
        <span class="shell__footer-sep">·</span>
        <span class="shell__footer-dim">wave 4 / angular scaffold</span>
      </footer>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
      .shell {
        display: grid;
        grid-template-rows: auto 1fr auto;
        height: 100vh;
        background: var(--bg-0);
        color: var(--fg-0);
        font-family: var(--font-ui);
      }
      .shell__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--sp-3) var(--sp-5);
        border-bottom: 1px solid var(--border);
        background: var(--bg-1);
      }
      .shell__brand {
        display: inline-flex;
        gap: var(--sp-2);
        align-items: baseline;
        font-size: var(--fs-md);
        font-weight: var(--fw-bold);
        letter-spacing: var(--letter-spacing-wide);
        text-transform: uppercase;
      }
      .shell__brand-accent {
        color: var(--accent);
        font-size: var(--fs-lg);
      }
      .shell__brand-dim {
        color: var(--fg-2);
        font-weight: var(--fw-normal);
        text-transform: lowercase;
      }
      .shell__nav {
        display: flex;
        gap: var(--sp-4);
        font-size: var(--fs-sm);
        letter-spacing: var(--letter-spacing-wide);
        text-transform: uppercase;
      }
      .shell__nav a {
        color: var(--fg-1);
        padding: 2px 0;
        border-bottom: 1px solid transparent;
        transition: color var(--motion-fast), border-color var(--motion-fast);
      }
      .shell__nav a:hover {
        color: var(--accent);
      }
      .shell__nav a.is-active {
        color: var(--accent);
        border-bottom-color: var(--accent);
      }
      .shell__nav-disabled {
        color: var(--fg-3) !important;
        cursor: not-allowed;
      }
      .shell__main {
        overflow-y: auto;
        padding: var(--sp-5);
      }
      .shell__footer {
        display: flex;
        gap: var(--sp-2);
        align-items: center;
        padding: var(--sp-2) var(--sp-5);
        border-top: 1px solid var(--border);
        font-size: var(--fs-xs);
        color: var(--fg-2);
      }
      .shell__footer-dim {
        color: var(--fg-2);
      }
      .shell__footer-sep {
        color: var(--fg-3);
      }
    `,
  ],
})
export class AppComponent {}
