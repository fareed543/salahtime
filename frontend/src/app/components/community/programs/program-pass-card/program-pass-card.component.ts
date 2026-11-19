import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { ProgramQrService } from '../program-qr.service';

const POLL_MS = 10000;

/**
 * NF-025 (DST-R4, DST-R6): the subscriber's pass for today — program name, date, name, token and a QR
 * the volunteer scans. Once collected it turns into the day's receipt. Refreshes every 10 s while open.
 */
@Component({
  selector: 'app-program-pass-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <section class="card adminuiux-card shadow-sm border-0 mb-3 pass-card" *ngIf="data">
      <div class="card-body text-center">
        <h2 class="pass-title">{{ 'PROGRAM_PASS.TITLE' | translate }}</h2>
        <p class="pass-program">{{ data.program?.name }}</p>
        <p class="pass-date">{{ data.date | date:'EEEE, d MMMM y' }}</p>

        <ng-container *ngIf="data.collected as receipt; else passTpl">
          <div class="pass-receipt" role="status">
            <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
            <strong>{{ 'PROGRAM_PASS.COLLECTED' | translate }}</strong>
            <span>{{ 'PROGRAM_PASS.RECEIPT' | translate:{ packets: receipt.packets, time: time(receipt.at), name: receipt.by || '—' } }}</span>
          </div>
        </ng-container>

        <ng-template #passTpl>
          <ng-container *ngIf="data.pass; else noDay">
            <img *ngIf="qr" class="pass-qr" [src]="qr" [alt]="'PROGRAM_PASS.TITLE' | translate">
            <p class="pass-hint">{{ 'PROGRAM_PASS.HINT' | translate }}</p>
            <p class="pass-packets">{{ 'PROGRAM_PASS.PACKETS_TODAY' | translate:{ count: data.packets_today } }}</p>
          </ng-container>
          <ng-template #noDay><p class="pass-hint">{{ 'PROGRAM_PASS.NO_DAY' | translate }}</p></ng-template>
        </ng-template>

        <div class="pass-person">
          <span>{{ data.member?.name }}</span>
          <span class="pass-token" *ngIf="data.member?.token">{{ 'PROGRAM_PASS.TOKEN' | translate }} #{{ data.member.token }}</span>
        </div>

        <details class="pass-history" *ngIf="data.history?.length">
          <summary>{{ 'PROGRAM_PASS.HISTORY' | translate }}</summary>
          <ul>
            <li *ngFor="let item of data.history"><span>{{ item.date | date:'EEE, d MMM' }}</span><span>{{ item.packets }} <i class="bi bi-box-seam" aria-hidden="true"></i> · {{ time(item.at) }}</span></li>
          </ul>
        </details>
      </div>
    </section>
  `,
  styles: [`
    .pass-card { border: 2px solid rgba(17, 116, 99, 0.35) !important; }
    .pass-title { margin: 0; font-size: 1.1rem; font-weight: 800; color: #11483f; }
    .pass-program { margin: 0.25rem 0 0; font-weight: 700; color: #117463; }
    .pass-date { margin: 0 0 0.75rem; color: #5f7470; font-size: 0.9rem; }
    .pass-qr { width: min(240px, 80vw); height: auto; }
    .pass-hint { margin: 0.75rem 0 0; color: #5f7470; font-size: 0.9rem; }
    .pass-packets { margin: 0.25rem 0 0; font-weight: 700; color: #11483f; }
    .pass-receipt { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 1rem; border-radius: 1rem; background: #e7f6ee; color: #11483f; }
    .pass-receipt i { font-size: 3rem; color: #138a4b; }
    .pass-receipt strong { font-size: 1.25rem; }
    .pass-person { display: flex; justify-content: center; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.85rem; font-weight: 700; color: #11483f; }
    .pass-token { padding: 0 0.6rem; border-radius: 999px; background: rgba(17, 116, 99, 0.12); color: #117463; }
    .pass-history { margin-top: 0.85rem; text-align: start; font-size: 0.875rem; }
    .pass-history summary { cursor: pointer; color: #117463; font-weight: 600; }
    .pass-history ul { list-style: none; margin: 0.5rem 0 0; padding: 0; }
    .pass-history li { display: flex; justify-content: space-between; padding: 0.3rem 0; border-top: 1px solid #e9efec; }
  `]
})
export class ProgramPassCardComponent implements OnChanges, OnDestroy {
  @Input() programId: string | number | null = null;

  data: any = null;
  qr: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private qrFor = '';

  constructor(private ramadanApi: RamadanApiService, private programQr: ProgramQrService) {}

  ngOnChanges(): void {
    this.stop();
    this.data = null;
    if (this.programId) {
      this.load();
      this.timer = setInterval(() => {
        if (document.visibilityState === 'visible' && this.data && !this.data.collected && this.data.pass) {
          this.load();
        }
      }, POLL_MS);
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  time(value?: string | null): string {
    const match = /(\d{2}):(\d{2})/.exec(String(value ?? '').split(' ')[1] ?? '');
    if (!match) {
      return '';
    }
    const hour = Number(match[1]);
    return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
  }

  private load(): void {
    this.ramadanApi.programPass(this.programId!).subscribe({
      next: (response) => {
        this.data = response;
        void this.renderQr(response?.pass);
      },
      // Not an enrolled subscriber (or offline): no pass card.
      error: () => { this.data = null; }
    });
  }

  private async renderQr(pass: string | null): Promise<void> {
    if (!pass || pass === this.qrFor) {
      return;
    }
    this.qrFor = pass;
    // Same look as the registration QR: SalahTime logo in the middle.
    this.qr = (await this.programQr.renderQr(pass, 480, 1)).toDataURL('image/png');
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
