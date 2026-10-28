import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { blogArticleMeta, blogArticleSchema, SITE_URL } from 'src/app/seo/seo-content';
import { BlogApiService, BlogArticleDetail, BlogCard } from 'src/app/services/blog-api.service';
import { SeoService } from 'src/app/services/seo.service';

// Same id as the prerendered page's script, so the live page replaces it (SEO-03).
const BLOG_SCHEMA_ID = 'blog-schema';

/** /blog/:slug: one published article. Counts a view once it has loaded. */
@Component({
  selector: 'app-blog-article',
  templateUrl: './blog-article.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogArticleComponent implements OnInit, OnDestroy {
  article: BlogArticleDetail | null = null;
  loading = true;
  failed = false;
  notFound = false;
  copied = false;

  private subscription?: Subscription;

  constructor(
    private blogApi: BlogApiService,
    private seoService: SeoService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.subscription = this.route.paramMap.subscribe(params => this.load(params.get('slug') ?? ''));
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.document.getElementById(BLOG_SCHEMA_ID)?.remove();
  }

  load(slug: string): void {
    this.loading = true;
    this.failed = false;
    this.notFound = false;
    this.cdr.markForCheck();
    this.blogApi.article(slug).subscribe({
      next: article => {
        this.article = article;
        this.loading = false;
        this.applySeo(article);
        this.cdr.markForCheck();
        this.blogApi.countView(article.slug).subscribe({
          next: ({ views }) => {
            if (this.article?.id === article.id) {
              this.article = { ...this.article, views };
              this.cdr.markForCheck();
            }
          },
          error: () => undefined
        });
      },
      error: error => {
        this.loading = false;
        this.notFound = error?.status === 404;
        this.failed = !this.notFound;
        if (this.notFound) {
          this.seoService.setRobots('noindex, follow');
        }
        this.cdr.markForCheck();
      }
    });
  }

  retry(): void {
    this.load(this.route.snapshot.paramMap.get('slug') ?? '');
  }

  get shareUrl(): string {
    return this.article ? `${SITE_URL}${this.article.path}` : SITE_URL;
  }

  get whatsappUrl(): string {
    return `https://wa.me/?text=${encodeURIComponent(`${this.article?.title ?? ''} ${this.shareUrl}`)}`;
  }

  /** References entered one per line; lines that are links become links. */
  get references(): Array<{ text: string; url: string | null }> {
    return (this.article?.references ?? '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(text => ({ text, url: /^https?:\/\/\S+$/.test(text) ? text : null }));
  }

  copyLink(): void {
    void navigator.clipboard?.writeText(this.shareUrl).then(() => {
      this.copied = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copied = false;
        this.cdr.markForCheck();
      }, 2500);
    });
  }

  trackById(_index: number, item: BlogCard): number {
    return item.id;
  }

  private applySeo(article: BlogArticleDetail): void {
    const meta = blogArticleMeta(article);
    this.seoService.apply({
      title: meta.title,
      description: meta.description,
      canonicalPath: article.path,
      image: article.coverImageUrl ?? undefined,
      type: 'article'
    });
    this.document.getElementById(BLOG_SCHEMA_ID)?.remove();
    const schema = this.document.createElement('script');
    schema.id = BLOG_SCHEMA_ID;
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify(blogArticleSchema(article));
    this.document.head.appendChild(schema);
  }
}
