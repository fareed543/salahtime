import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ShortsReference, ShortsZikr } from './sunnah-shorts.service';

interface Segment { text: string; accent: boolean; arabic: boolean; }

/**
 * Live preview of a Sunnah card, same markup as the app's SunnahCardComponent
 * (frontend/src/app/components/shorts/sunnah-card). Styles: sunnah-preview.scss.
 */
@Component({
  selector: 'app-sunnah-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sc" [ngClass]="styleClass" [class.sc-tile]="mode === 'tile'" [class.sc-full]="mode === 'full'">
      <img *ngIf="imageUrl" class="sc-bg" [src]="imageUrl" alt="">
      <span class="sc-deco" aria-hidden="true"></span>
      <div class="sc-top">
        <p class="sc-logo"><i aria-hidden="true"></i>SALAHTIME · SUNNAH</p>
        <p class="sc-hl"><span *ngFor="let s of segments(headline, true)" [class.sc-em]="s.accent" [class.sc-ar]="s.arabic">{{ s.text }}</span></p>
      </div>
      <ng-container *ngIf="mode === 'full'">
        <span class="sc-rule" aria-hidden="true"></span>
        <p *ngIf="zikr?.arabic" class="sc-zikr" lang="ar" dir="rtl">{{ zikr?.arabic }}</p>
        <p class="sc-body"><span *ngFor="let s of segments(body, false)" [class.sc-ar]="s.arabic">{{ s.text }}</span></p>
        <span *ngIf="zikr?.transliteration || (references?.length || 0) > 1" class="sc-more">Details ›</span>
      </ng-container>
      <span *ngIf="label" class="sc-lab">{{ label }}</span>
    </div>`
})
export class SunnahPreviewComponent {
  @Input() headline = '';
  @Input() body = '';
  @Input() zikr: ShortsZikr | null = null;
  @Input() template = 't01';
  @Input() imageUrl: string | null = null;
  @Input() references: ShortsReference[] = [];
  @Input() mode: 'tile' | 'full' = 'full';

  get styleClass(): string {
    return this.imageUrl ? 'sc-photo' : `sc-${/^t(0[1-9]|10)$/.test(this.template) ? this.template : 't01'}`;
  }

  get label(): string {
    const first = this.references?.[0];
    return first && (first.book || first.number) ? `${first.book ?? ''} ${first.number ?? ''}`.trim() : '';
  }

  /** *accent* words and the ﷺ sign get their own runs (same rule as the app). */
  segments(value: string, accent: boolean): Segment[] {
    const result: Segment[] = [];
    const pattern = accent ? /(\*[^*]+\*|ﷺ)/ : /(ﷺ)/;
    for (const part of (value || '').split(pattern)) {
      if (!part) continue;
      if (accent && part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
        result.push(...this.segments(part.slice(1, -1), false).map(segment => ({ ...segment, accent: true })));
      } else {
        result.push({ text: accent ? part.replace(/\*/g, '') : part, accent: false, arabic: part === 'ﷺ' });
      }
    }
    return result;
  }
}
