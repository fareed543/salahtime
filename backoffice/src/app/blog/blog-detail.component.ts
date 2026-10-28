import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { ToastService } from '../services/toast.service';
import {
  BLOG_FIELD_LABELS,
  BLOG_SEO_CHECK_LABELS,
  BLOG_STATUS_BADGES,
  BlogChange,
  BlogDetail,
  BlogFields,
  BlogOption,
  BlogService,
  BlogVersion,
  BlogVersionRow
} from './blog.service';

const SITE_URL = 'https://salah-times.in';

declare const Swal: {
  fire(options: Record<string, unknown>): Promise<{ isConfirmed?: boolean }>;
};

/** Fields an editor may change in a proposal; the cover image itself stays the author's. */
type ProposalForm = Omit<BlogFields, 'tags' | 'coverImageUrl' | 'coverThumbUrl' | 'language'> & { tags: string; note: string };

/**
 * One article under review: preview, SEO checklist, and the editor's actions: publish, reject with a
 * reason, propose changes for the author to accept, unpublish, or restore an older version.
 */
@Component({
  selector: 'app-blog-detail',
  templateUrl: './blog-detail.component.html',
  styleUrls: ['../community/community.scss', './blog.scss']
})
export class BlogDetailComponent implements OnInit {
  detail: BlogDetail | null = null;
  categories: BlogOption[] = [];
  /** The version shown in the preview: the latest, or one picked from the version list. */
  preview: BlogVersion | null = null;
  mode: 'view' | 'reject' | 'propose' = 'view';
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  rejectReason = '';
  publishNote = '';
  proposal: ProposalForm | null = null;
  proposalErrors: Record<string, string> = {};

  readonly checkLabels = BLOG_SEO_CHECK_LABELS;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly blog: BlogService,
    private readonly toast: ToastService
  ) {}

  get id(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Blog', route: '/blog' },
      { label: this.detail?.latest.title ?? 'Article' }
    ];
  }

  get statusKey(): string {
    const article = this.detail?.article;
    return article ? (article.status === 'published' && !article.isPublic ? 'unpublished' : article.status) : '';
  }

  get statusLabel(): string {
    return this.statusKey === 'unpublished' ? 'Unpublished' : this.detail?.article.statusLabel ?? '';
  }

  get badge(): string {
    return BLOG_STATUS_BADGES[this.statusKey] ?? 'bg-label-secondary';
  }

  get liveLink(): string | null {
    return this.detail?.article.isPublic && this.detail.article.path ? SITE_URL + this.detail.article.path : null;
  }

  get isWaiting(): boolean {
    return ['submitted', 'changes_proposed'].includes(this.detail?.article.status ?? '');
  }

  get canRepublish(): boolean {
    return this.statusKey === 'unpublished';
  }

  ngOnInit(): void {
    this.blog.options().subscribe({ next: options => this.categories = options.categories });
    this.blog.get(this.id)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: detail => this.show(detail),
        error: error => this.errorMessage = error?.error?.error || 'Unable to load this article.'
      });
  }

  categoryLabel(value: string | null): string {
    return this.categories.find(option => option.value === value)?.label ?? value ?? '-';
  }

  fieldLabel(change: BlogChange): string {
    return BLOG_FIELD_LABELS[change.field] ?? change.field;
  }

  /** Readable cell for a diff; the body is summarised by word count. */
  diffValue(change: BlogChange, side: 'before' | 'after'): string {
    const value = change[side];
    if (!value) {
      return '(empty)';
    }
    if (change.field === 'contentHtml') {
      const words = value.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      return `${words} words`;
    }
    return value;
  }

  sourceLabel(row: BlogVersionRow | BlogVersion): string {
    return row.source === 'admin_proposal' ? 'Editor proposal' : row.source === 'admin_restore' ? 'Restored by editor' : 'Author';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value.replace(' ', 'T'));
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  showVersion(row: BlogVersionRow): void {
    this.blog.version(row.id).subscribe({
      next: version => this.preview = version,
      error: error => this.toast.error(error, 'Unable to load that version.')
    });
  }

  approve(): void {
    this.run(this.blog.approve(this.id, this.publishNote.trim()));
  }

  startReject(): void {
    this.mode = 'reject';
    this.rejectReason = '';
  }

  reject(): void {
    if (this.rejectReason.trim().length < 10) {
      this.toast.error('Please give the author a reason (at least 10 characters).');
      return;
    }
    this.run(this.blog.reject(this.id, this.rejectReason.trim()));
  }

  startProposal(): void {
    const latest = this.detail!.latest;
    this.proposal = {
      title: latest.title,
      slug: latest.slug,
      contentHtml: latest.contentHtml,
      metaTitle: latest.metaTitle,
      metaDescription: latest.metaDescription,
      focusKeyword: latest.focusKeyword,
      category: latest.category,
      tags: latest.tags.join(', '),
      coverAlt: latest.coverAlt,
      references: latest.references,
      note: ''
    };
    this.proposalErrors = {};
    this.mode = 'propose';
  }

  sendProposal(): void {
    if (!this.proposal) {
      return;
    }
    const { tags, ...fields } = this.proposal;
    this.proposalErrors = {};
    this.run(this.blog.propose(this.id, { ...fields, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean) }), errors => this.proposalErrors = errors);
  }

  async unpublish(): Promise<void> {
    const result = await Swal.fire({
      title: 'Take this article off the site?',
      text: 'It stays in the back office and can be published again.',
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Reason (optional, kept in the history)',
      showCancelButton: true,
      confirmButtonText: 'Unpublish',
      customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-outline-secondary' },
      buttonsStyling: false
    }) as { isConfirmed?: boolean; value?: string };
    if (result.isConfirmed) {
      this.run(this.blog.unpublish(this.id, result.value ?? ''));
    }
  }

  async restore(row: BlogVersionRow): Promise<void> {
    const result = await Swal.fire({
      title: `Make version ${row.versionNo} live?`,
      text: 'A copy of it becomes the newest version and is published straight away. Nothing is deleted.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Restore and publish',
      customClass: { confirmButton: 'btn btn-primary me-2', cancelButton: 'btn btn-outline-secondary' },
      buttonsStyling: false
    });
    if (result.isConfirmed) {
      this.run(this.blog.restore(this.id, row.id));
    }
  }

  cancel(): void {
    this.mode = 'view';
    this.proposal = null;
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  private run(request: Observable<BlogDetail>, onErrors?: (errors: Record<string, string>) => void): void {
    this.isSaving = true;
    request.pipe(finalize(() => this.isSaving = false)).subscribe({
      next: detail => {
        this.show(detail);
        this.mode = 'view';
        this.proposal = null;
        this.publishNote = '';
        this.toast.success(detail.message || 'Saved.');
      },
      error: error => {
        if (onErrors && error?.error?.errors) {
          onErrors(error.error.errors);
        }
        this.toast.error(error, 'Unable to complete the action.');
      }
    });
  }

  private show(detail: BlogDetail): void {
    this.detail = detail;
    this.preview = detail.latest;
  }
}
