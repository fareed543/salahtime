import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BlogSeoCheck } from '../blog-seo-score';

/** SEO score out of 100 with its checklist (editor, status page). */
@Component({
  selector: 'app-blog-seo-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="blog-seo-panel" [attr.aria-label]="'BLOG.SEO.SCORE' | translate">
      <div class="blog-seo-head">
        <span class="blog-seo-score" [attr.data-level]="level">{{ score }}</span>
        <span>
          <strong>{{ 'BLOG.SEO.SCORE' | translate }}</strong>
          <small class="d-block">{{ ('BLOG.SEO.' + level) | translate }}</small>
        </span>
      </div>
      <ul class="blog-seo-checks">
        <li *ngFor="let check of checks; trackBy: trackByKey" [class.passed]="check.passed">
          <i class="bi" [class.bi-check-circle-fill]="check.passed" [class.bi-circle]="!check.passed" aria-hidden="true"></i>
          <span>{{ ('BLOG.SEO.CHECKS.' + check.key.toUpperCase()) | translate }}</span>
          <small>{{ check.points }}/{{ check.max }}</small>
        </li>
      </ul>
    </section>
  `
})
export class BlogSeoPanelComponent {
  @Input() score = 0;
  @Input() checks: BlogSeoCheck[] = [];

  get level(): 'GOOD' | 'FAIR' | 'LOW' {
    return this.score >= 80 ? 'GOOD' : this.score >= 50 ? 'FAIR' : 'LOW';
  }

  trackByKey(_index: number, check: BlogSeoCheck): string {
    return check.key;
  }
}
