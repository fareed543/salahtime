import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export interface ScanResult {
  kind: 'ok' | 'duplicate' | 'invalid';
  member?: { name: string; gender?: string; image?: string | null; token?: number | null } | null;
  packets?: number | null;
  at?: string | null;
  by?: string | null;
  /** API reason code for 'invalid' (bad_pass, other_program, not_today, not_member, waitlisted, not_program_day). */
  reason?: string | null;
}

/** NF-025: full-screen green / red card shown to the volunteer after a scan. */
@Component({
  selector: 'app-scan-result',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="scan-result" [class.scan-ok]="result.kind === 'ok'" [class.scan-bad]="result.kind !== 'ok'"
      role="alertdialog" aria-modal="true" [attr.aria-label]="title | translate">
      <div class="scan-icon" aria-hidden="true">
        <i class="bi" [ngClass]="result.kind === 'ok' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'"></i>
      </div>
      <h2 class="scan-title">{{ title | translate }}</h2>

      <ng-container *ngIf="result.member">
        <img *ngIf="result.member.image" class="scan-photo" [src]="result.member.image" alt="">
        <p class="scan-name">{{ result.member.name }}</p>
        <p class="scan-meta">
          <ng-container *ngIf="result.member.gender">{{ (result.member.gender === 'f' ? 'PROGRAM_CONSOLE.SISTER' : 'PROGRAM_CONSOLE.BROTHER') | translate }}</ng-container>
          <ng-container *ngIf="result.member.token"> · {{ 'PROGRAM_SCAN.TOKEN' | translate:{ token: result.member.token } }}</ng-container>
        </p>
      </ng-container>

      <p class="scan-give" *ngIf="result.kind === 'ok'">{{ 'PROGRAM_SCAN.GIVE' | translate:{ count: result.packets } }}</p>
      <p class="scan-detail" *ngIf="result.kind === 'duplicate'">{{ 'PROGRAM_SCAN.DUPLICATE_AT' | translate:{ time: time(result.at), name: result.by || '—' } }}</p>
      <p class="scan-detail" *ngIf="result.kind === 'invalid'">{{ ('PROGRAM_SCAN.REASON.' + (result.reason || 'bad_pass').toUpperCase()) | translate }}</p>

      <div class="scan-actions">
        <button type="button" class="btn btn-light btn-lg" (click)="next.emit()"><i class="bi bi-qr-code-scan me-2" aria-hidden="true"></i>{{ 'PROGRAM_SCAN.NEXT' | translate }}</button>
        <button type="button" class="btn btn-outline-light btn-lg" (click)="closed.emit()">{{ 'PROGRAM_SCAN.CLOSE' | translate }}</button>
      </div>
    </div>
  `,
  styles: [`
    .scan-result { position: fixed; inset: 0; z-index: 1900; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.35rem; padding: max(1.5rem, env(safe-area-inset-top)) 1.5rem max(1.5rem, env(safe-area-inset-bottom)); color: #fff; text-align: center; }
    .scan-ok { background: #138a4b; }
    .scan-bad { background: #b3261e; }
    .scan-icon { font-size: 4.5rem; line-height: 1; }
    .scan-title { margin: 0.5rem 0 0.75rem; font-size: 1.6rem; font-weight: 800; color: #fff; }
    .scan-photo { width: 6rem; height: 6rem; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255, 255, 255, 0.7); }
    .scan-name { margin: 0.25rem 0 0; font-size: 1.5rem; font-weight: 700; }
    .scan-meta { margin: 0; font-size: 1rem; opacity: 0.9; }
    .scan-give { margin: 1rem 0 0; padding: 0.6rem 1.2rem; border-radius: 1rem; background: rgba(255, 255, 255, 0.18); font-size: 1.75rem; font-weight: 800; }
    .scan-detail { margin: 1rem 0 0; font-size: 1.15rem; max-width: 22rem; }
    .scan-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; margin-top: 2rem; }
  `]
})
export class ScanResultComponent {
  @Input() result!: ScanResult;
  @Output() next = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  get title(): string {
    return this.result.kind === 'ok' ? 'PROGRAM_SCAN.OK' : this.result.kind === 'duplicate' ? 'PROGRAM_SCAN.DUPLICATE' : 'PROGRAM_SCAN.INVALID';
  }

  time(value?: string | null): string {
    const match = /(\d{2}):(\d{2})/.exec(String(value ?? '').split(' ')[1] ?? String(value ?? ''));
    if (!match) {
      return '';
    }
    const hour = Number(match[1]);
    return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
  }
}
