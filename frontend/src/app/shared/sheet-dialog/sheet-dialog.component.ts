import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild } from '@angular/core';

/**
 * Modal shell: backdrop + panel with a title and close button; content is projected.
 * Centred on every screen size. Escape or the backdrop closes it, the page
 * behind does not scroll while it is open. Same look as the User Details dialog.
 *   <app-sheet-dialog title="Add member" (closed)="open = false">...</app-sheet-dialog>
 */
@Component({
  selector: 'app-sheet-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sheet-backdrop" (click)="closed.emit()"></div>
    <div class="sheet-wrap">
      <section #panel class="sheet-panel" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" tabindex="-1">
        <header class="sheet-header">
          <div class="sheet-heading">
            <span class="sheet-eyebrow" *ngIf="eyebrow">{{ eyebrow }}</span>
            <h2 class="sheet-title" [id]="titleId">{{ title }}</h2>
            <p class="sheet-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
          </div>
          <button type="button" class="btn-close" [attr.aria-label]="closeLabel" (click)="closed.emit()"></button>
        </header>
        <div class="sheet-body"><ng-content></ng-content></div>
      </section>
    </div>
  `,
  styles: [`
    .sheet-backdrop { position: fixed; inset: 0; z-index: 1080; background: rgba(10, 31, 27, 0.46); }
    .sheet-wrap { position: fixed; inset: 0; z-index: 1081; display: grid; place-items: center; padding: 1rem; pointer-events: none; }
    .sheet-panel {
      width: min(640px, 100%); max-height: min(86vh, 780px); display: flex; flex-direction: column;
      border-radius: 1rem; background: #f8fbfa; box-shadow: 0 1.5rem 4rem rgba(10, 31, 27, 0.28);
      pointer-events: auto; outline: none;
    }
    .sheet-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1rem 1rem 0.5rem; }
    .sheet-heading { min-width: 0; }
    .sheet-eyebrow { display: inline-block; margin-bottom: 0.25rem; padding: 0.1rem 0.5rem; border-radius: 999px; background: rgba(17, 116, 99, 0.12); color: #0d5a4d; font-size: 0.75rem; font-weight: 600; }
    .sheet-title { margin: 0; font-size: 1.1rem; font-weight: 700; overflow-wrap: anywhere; }
    .sheet-subtitle { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #5f7470; }
    .sheet-body { padding: 0.5rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px)); overflow-y: auto; }
    @media (max-width: 575.98px) { .sheet-wrap { padding: 0.75rem; } .sheet-panel { max-height: 88vh; } }
  `]
})
export class SheetDialogComponent implements AfterViewInit, OnDestroy {
  @Input() title = '';
  @Input() subtitle: string | null = '';
  @Input() eyebrow = '';
  @Input() closeLabel = 'Close';
  @Output() closed = new EventEmitter<void>();
  @ViewChild('panel') panel?: ElementRef<HTMLElement>;

  readonly titleId = `sheet-title-${Math.random().toString(36).slice(2, 8)}`;
  private previousOverflow = '';
  private previousFocus: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.panel?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.previousOverflow;
    this.previousFocus?.focus?.();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
