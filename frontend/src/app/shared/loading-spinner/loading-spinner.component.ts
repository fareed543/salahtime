import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

/**
 * The app's one loading indicator (the theme's "loader3" ring), for use wherever content is
 * loading: <app-loading-spinner [label]="'PAGE.LOADING' | translate"></app-loading-spinner>.
 *
 * - size "md" (48px) for page/section loading, "sm" (24px) inside cards and rows.
 * - The label is announced to screen readers but not shown, so screens stay text-free while loading.
 * - Styles are self-contained so it works before the runtime theme stylesheet has loaded.
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <span class="app-loading-ring" aria-hidden="true"></span>
    <span class="visually-hidden">{{ label }}</span>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 0;
    }

    :host(.app-loading-sm) {
      display: inline-flex;
      padding: 0.5rem 0;
    }

    .app-loading-ring {
      position: relative;
      display: block;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      animation: app-loading-spin 1s linear infinite;
    }

    :host(.app-loading-sm) .app-loading-ring {
      width: 24px;
      height: 24px;
    }

    .app-loading-ring::before,
    .app-loading-ring::after {
      content: '';
      position: absolute;
      inset: 0;
      box-sizing: border-box;
      border: 5px solid var(--adminuiux-theme-accent-1, #f2c46d);
      border-radius: 50%;
      animation: app-loading-clip 2s linear infinite;
    }

    .app-loading-ring::after {
      inset: 6px;
      border-color: var(--adminuiux-theme-1, #117463);
      animation: app-loading-clip-inner 2s linear infinite, app-loading-spin 0.5s linear infinite reverse;
    }

    :host(.app-loading-sm) .app-loading-ring::before,
    :host(.app-loading-sm) .app-loading-ring::after {
      border-width: 3px;
    }

    :host(.app-loading-sm) .app-loading-ring::after {
      inset: 4px;
    }

    @keyframes app-loading-spin {
      to { transform: rotate(360deg); }
    }

    /* Same keyframes as the theme's loader3anim2 (outer) and loader1anim2 (inner). */
    @keyframes app-loading-clip-inner {
      0% { clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0); }
      50% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0); }
      75%, 100% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%); }
    }

    @keyframes app-loading-clip {
      0% { clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0); }
      25% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0); }
      50% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%); }
      75% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 100%); }
      100% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .app-loading-ring,
      .app-loading-ring::before,
      .app-loading-ring::after {
        animation-duration: 3s;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSpinnerComponent {
  @Input() label = 'Loading';
  @Input() size: 'sm' | 'md' = 'md';

  @HostBinding('attr.role') readonly role = 'status';

  @HostBinding('class.app-loading-sm') get small(): boolean {
    return this.size === 'sm';
  }
}
