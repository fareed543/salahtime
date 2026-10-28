import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { compressImage } from 'src/app/shared/image-compress';
import { BlogApiService, BlogMyArticle, BlogOption, BlogVersionFields } from 'src/app/services/blog-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { blogSeoScore, BlogSeoCheck, blogSlugify, blogWordCount } from '../blog-seo-score';

type ToolCommand = 'p' | 'h2' | 'h3' | 'bold' | 'italic' | 'ul' | 'ol' | 'quote' | 'link' | 'unlink';

/**
 * /blog/write and /blog/write/:id: the article editor. Every save adds a version on the server;
 * "Submit for review" saves and sends it to the editors. The SEO score updates as the author types.
 */
@Component({
  selector: 'app-blog-editor',
  templateUrl: './blog-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogEditorComponent implements OnInit, AfterViewInit {
  @ViewChild('contentEditor') contentEditor?: ElementRef<HTMLDivElement>;

  readonly tools: Array<{ command: ToolCommand; icon: string; labelKey: string }> = [
    { command: 'p', icon: 'bi-paragraph', labelKey: 'BLOG.EDITOR.TOOL_PARAGRAPH' },
    { command: 'h2', icon: 'bi-type-h2', labelKey: 'BLOG.EDITOR.TOOL_H2' },
    { command: 'h3', icon: 'bi-type-h3', labelKey: 'BLOG.EDITOR.TOOL_H3' },
    { command: 'bold', icon: 'bi-type-bold', labelKey: 'BLOG.EDITOR.TOOL_BOLD' },
    { command: 'italic', icon: 'bi-type-italic', labelKey: 'BLOG.EDITOR.TOOL_ITALIC' },
    { command: 'ul', icon: 'bi-list-ul', labelKey: 'BLOG.EDITOR.TOOL_BULLETS' },
    { command: 'ol', icon: 'bi-list-ol', labelKey: 'BLOG.EDITOR.TOOL_NUMBERS' },
    { command: 'quote', icon: 'bi-quote', labelKey: 'BLOG.EDITOR.TOOL_QUOTE' },
    { command: 'link', icon: 'bi-link-45deg', labelKey: 'BLOG.EDITOR.TOOL_LINK' },
    { command: 'unlink', icon: 'bi-x-octagon', labelKey: 'BLOG.EDITOR.TOOL_UNLINK' }
  ];

  articleId: number | null = null;
  fields: BlogVersionFields = {
    title: '',
    slug: null,
    contentHtml: '',
    metaTitle: null,
    metaDescription: null,
    focusKeyword: null,
    category: null,
    tags: [],
    language: null,
    coverImageUrl: null,
    coverThumbUrl: null,
    coverAlt: null,
    references: null
  };
  tagsText = '';
  categories: BlogOption[] = [];
  languages: { code: string; name: string }[] = [];
  minWords = 150;

  isPublic = false;
  hasProposal = false;
  loading = false;
  saving = false;
  uploading = false;
  errors: Record<string, string> = {};
  message = '';

  score = 0;
  checks: BlogSeoCheck[] = [];
  wordCount = 0;

  private contentLoaded = false;

  constructor(
    private blogApi: BlogApiService,
    private appTranslate: AppTranslateService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.languages = this.appTranslate.availableWithNames();
    this.fields.language = this.appTranslate.current();
    this.blogApi.options().subscribe({
      next: options => {
        this.categories = options.categories;
        this.minWords = options.minWords;
        this.cdr.markForCheck();
      },
      error: () => undefined
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id > 0) {
      this.articleId = id;
      this.loading = true;
      this.blogApi.myArticle(id).subscribe({
        next: data => this.applyLoaded(data),
        error: () => {
          this.loading = false;
          this.message = this.translate.instant('BLOG.LOAD_ERROR');
          this.cdr.markForCheck();
        }
      });
    }
    this.recalculate();
  }

  ngAfterViewInit(): void {
    // Enter starts a <p> (not a <div>), the only block the server keeps besides headings, lists and quotes.
    document.execCommand('defaultParagraphSeparator', false, 'p');
    this.syncEditorContent();
  }

  get previewTitle(): string {
    return (this.fields.metaTitle || this.fields.title || this.translate.instant('BLOG.EDITOR.TITLE')).slice(0, 70);
  }

  get previewSlug(): string {
    return this.fields.slug ? blogSlugify(this.fields.slug) : blogSlugify(this.fields.title);
  }

  get metaTitleLength(): number {
    return (this.fields.metaTitle || '').length;
  }

  get metaDescriptionLength(): number {
    return (this.fields.metaDescription || '').length;
  }

  onContentInput(): void {
    this.fields.contentHtml = this.contentEditor?.nativeElement.innerHTML ?? '';
    this.recalculate();
  }

  /** Pasted text keeps its paragraphs but none of the source page's styling. */
  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text/plain');
    if (text === undefined) {
      return;
    }
    event.preventDefault();
    const html = text
      .split(/\r?\n\s*\r?\n/)
      .map(block => `<p>${this.escape(block).replace(/\r?\n/g, '<br>')}</p>`)
      .join('');
    document.execCommand('insertHTML', false, html);
    this.onContentInput();
  }

  run(command: ToolCommand): void {
    this.contentEditor?.nativeElement.focus();
    switch (command) {
      case 'p': document.execCommand('formatBlock', false, '<p>'); break;
      case 'h2': document.execCommand('formatBlock', false, '<h2>'); break;
      case 'h3': document.execCommand('formatBlock', false, '<h3>'); break;
      case 'quote': document.execCommand('formatBlock', false, '<blockquote>'); break;
      case 'bold': document.execCommand('bold'); break;
      case 'italic': document.execCommand('italic'); break;
      case 'ul': document.execCommand('insertUnorderedList'); break;
      case 'ol': document.execCommand('insertOrderedList'); break;
      case 'unlink': document.execCommand('unlink'); break;
      case 'link': {
        const url = window.prompt(this.translate.instant('BLOG.EDITOR.LINK_PROMPT'), 'https://');
        if (url && /^(https?:\/\/|\/|mailto:)/i.test(url.trim())) {
          document.execCommand('createLink', false, url.trim());
        }
        break;
      }
    }
    this.onContentInput();
  }

  onTagsChange(): void {
    this.fields.tags = this.tagsText.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 10);
    this.recalculate();
  }

  recalculate(): void {
    const result = blogSeoScore(this.fields);
    this.score = result.score;
    this.checks = result.checks;
    this.wordCount = blogWordCount(this.fields.contentHtml);
    this.cdr.markForCheck();
  }

  async onCoverSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.uploading = true;
    delete this.errors['coverImageUrl'];
    this.cdr.markForCheck();
    const blob = await compressImage(file, { maxEdge: 1600 });
    this.blogApi.uploadCover(blob, file.name.replace(/\.[^.]+$/, '') + '.jpg').subscribe({
      next: cover => {
        this.fields.coverImageUrl = cover.imageUrl;
        this.fields.coverThumbUrl = cover.thumbUrl;
        this.uploading = false;
        this.recalculate();
      },
      error: error => {
        this.uploading = false;
        this.errors = { ...this.errors, coverImageUrl: error?.error?.error || this.translate.instant('BLOG.EDITOR.ERROR') };
        this.cdr.markForCheck();
      }
    });
  }

  removeCover(): void {
    this.fields.coverImageUrl = null;
    this.fields.coverThumbUrl = null;
    this.recalculate();
  }

  save(submit: boolean): void {
    this.onContentInput();
    this.errors = {};
    this.message = '';
    if (this.fields.title.trim().length < 5) {
      this.errors['title'] = this.translate.instant('BLOG.EDITOR.TITLE_REQUIRED');
    }
    if (!this.wordCount) {
      this.errors['contentHtml'] = this.translate.instant('BLOG.EDITOR.CONTENT_REQUIRED');
    }
    if (Object.keys(this.errors).length) {
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();
    this.blogApi.save({ ...this.fields, id: this.articleId, submit }).subscribe({
      next: data => {
        this.saving = false;
        // The status page shows what happened (draft saved / waiting for review) and the history.
        void this.router.navigate(['/blog/my-articles', data.article.id], { state: { message: data.message } });
      },
      error: error => {
        this.saving = false;
        const body = error?.error ?? {};
        if (body.id) {
          // The draft was saved but could not be submitted (e.g. too short): keep editing it.
          this.articleId = body.id;
          void this.router.navigate(['/blog/write', body.id], { replaceUrl: true });
        }
        this.errors = body.errors ?? {};
        this.message = body.error || this.translate.instant('BLOG.EDITOR.ERROR');
        this.cdr.markForCheck();
      }
    });
  }

  private applyLoaded(data: BlogMyArticle): void {
    const version = data.version;
    this.fields = {
      title: version.title,
      slug: version.slug,
      contentHtml: version.contentHtml,
      metaTitle: version.metaTitle,
      metaDescription: version.metaDescription,
      focusKeyword: version.focusKeyword,
      category: version.category,
      tags: version.tags,
      language: version.language || this.appTranslate.current(),
      coverImageUrl: version.coverImageUrl,
      coverThumbUrl: version.coverThumbUrl,
      coverAlt: version.coverAlt,
      references: version.references
    };
    this.tagsText = version.tags.join(', ');
    this.isPublic = data.article.isPublic;
    this.hasProposal = !!data.proposal;
    this.loading = false;
    this.contentLoaded = false;
    this.cdr.detectChanges();
    this.syncEditorContent();
    this.recalculate();
  }

  /** The editable div is filled once per load; afterwards the browser owns its content. */
  private syncEditorContent(): void {
    const editor = this.contentEditor?.nativeElement;
    if (editor && !this.contentLoaded) {
      editor.innerHTML = this.fields.contentHtml || '<p><br></p>';
      this.contentLoaded = true;
    }
  }

  private escape(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
