import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BlogApiService, BlogChange, BlogMyArticle, BlogTimelineEvent, BlogVersionRow } from 'src/app/services/blog-api.service';
import { blogPlainText } from '../blog-seo-score';

/** Field name in a proposal diff → its label in the editor. */
const FIELD_LABELS: Record<string, string> = {
  title: 'BLOG.EDITOR.TITLE',
  slug: 'BLOG.EDITOR.SLUG',
  contentHtml: 'BLOG.EDITOR.CONTENT',
  metaTitle: 'BLOG.EDITOR.META_TITLE',
  metaDescription: 'BLOG.EDITOR.META_DESCRIPTION',
  focusKeyword: 'BLOG.EDITOR.FOCUS_KEYWORD',
  category: 'BLOG.EDITOR.CATEGORY',
  tags: 'BLOG.EDITOR.TAGS',
  language: 'BLOG.EDITOR.LANGUAGE',
  coverImageUrl: 'BLOG.EDITOR.COVER',
  coverAlt: 'BLOG.EDITOR.COVER_ALT',
  references: 'BLOG.EDITOR.REFERENCES'
};

/**
 * /blog/my-articles/:id: where the writer follows their article: status, the editor's feedback,
 * suggested changes to accept or decline (field by field), every version and the full history.
 */
@Component({
  selector: 'app-blog-my-article',
  templateUrl: './blog-my-article.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogMyArticleComponent implements OnInit {
  data: BlogMyArticle | null = null;
  loading = true;
  failed = false;
  busy = false;
  note = '';
  message = '';
  error = '';
  showProposedText = false;

  constructor(
    private blogApi: BlogApiService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Set by the editor after a save ("Draft saved." / "Submitted for review..."); only for that navigation,
    // so a reload or a later visit doesn't repeat it.
    this.message = (this.router.getCurrentNavigation()?.extras.state?.['message'] as string) ?? '';
    this.load();
  }

  get id(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  load(): void {
    this.loading = true;
    this.failed = false;
    this.cdr.markForCheck();
    this.blogApi.myArticle(this.id).subscribe({
      next: data => this.show(data),
      error: () => {
        this.loading = false;
        this.failed = true;
        this.cdr.markForCheck();
      }
    });
  }

  answer(decision: 'accept' | 'decline'): void {
    this.busy = true;
    this.error = '';
    this.cdr.markForCheck();
    this.blogApi.answerProposal(this.id, decision, this.note.trim()).subscribe({
      next: data => {
        this.note = '';
        this.show(data);
      },
      error: error => {
        this.busy = false;
        this.error = error?.error?.error || this.translate.instant('BLOG.EDITOR.ERROR');
        this.cdr.markForCheck();
      }
    });
  }

  submit(): void {
    this.busy = true;
    this.error = '';
    this.cdr.markForCheck();
    this.blogApi.submit(this.id).subscribe({
      next: data => this.show(data),
      error: error => {
        this.busy = false;
        this.error = error?.error?.error || this.translate.instant('BLOG.EDITOR.ERROR');
        this.cdr.markForCheck();
      }
    });
  }

  get statusKey(): string {
    const article = this.data?.article;
    if (!article) {
      return '';
    }
    return article.status === 'published' && !article.isPublic ? 'BLOG.STATUS.UNPUBLISHED' : 'BLOG.STATUS.' + article.status.toUpperCase();
  }

  get canSubmit(): boolean {
    return !!this.data && ['draft', 'rejected'].includes(this.data.article.status);
  }

  get contentChanged(): boolean {
    return !!this.data?.proposal?.changes.some(change => change.field === 'contentHtml');
  }

  fieldLabel(change: BlogChange): string {
    return FIELD_LABELS[change.field] ?? change.field;
  }

  /** Short readable text for a diff cell; the article body is summarised, not shown as HTML. */
  display(change: BlogChange, side: 'before' | 'after'): string {
    const value = change[side];
    if (!value) {
      return this.translate.instant('BLOG.DETAIL.EMPTY_VALUE');
    }
    if (change.field === 'contentHtml') {
      return this.translate.instant('BLOG.EDITOR.WORDS', { count: blogPlainText(value).split(/\s+/).filter(Boolean).length });
    }
    if (change.field === 'coverImageUrl') {
      return value.split('/').pop() ?? value;
    }
    return value;
  }

  sourceKey(row: BlogVersionRow): string {
    return 'BLOG.DETAIL.SOURCE.' + row.source.toUpperCase();
  }

  actionKey(event: BlogTimelineEvent): string {
    return 'BLOG.DETAIL.ACTIONS.' + event.action.toUpperCase();
  }

  actorName(event: BlogTimelineEvent): string {
    return event.actorRole === 'admin' ? this.translate.instant('BLOG.DETAIL.EDITOR_NAME') : (event.actor ?? '');
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  trackByField(_index: number, item: BlogChange): string {
    return item.field;
  }

  private show(data: BlogMyArticle): void {
    this.data = data;
    if (data.message) {
      this.message = data.message;
    }
    this.loading = false;
    this.busy = false;
    this.showProposedText = false;
    this.cdr.markForCheck();
  }
}
