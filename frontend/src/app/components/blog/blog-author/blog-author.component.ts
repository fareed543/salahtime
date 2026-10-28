import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { blogAuthorMeta } from 'src/app/seo/seo-content';
import { BlogApiService, BlogAuthorPage, BlogCard } from 'src/app/services/blog-api.service';
import { SeoService } from 'src/app/services/seo.service';

/** /blog/author/:id: a writer's published articles and how many people read them. */
@Component({
  selector: 'app-blog-author',
  templateUrl: './blog-author.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogAuthorComponent implements OnInit, OnDestroy {
  author: BlogAuthorPage | null = null;
  loading = true;
  failed = false;
  notFound = false;

  private subscription?: Subscription;

  constructor(
    private blogApi: BlogApiService,
    private seoService: SeoService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription = this.route.paramMap.subscribe(params => this.load(Number(params.get('id'))));
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  load(id: number): void {
    this.loading = true;
    this.failed = false;
    this.notFound = false;
    this.cdr.markForCheck();
    this.blogApi.author(id).subscribe({
      next: author => {
        this.author = author;
        this.loading = false;
        const meta = blogAuthorMeta({ name: author.name, path: author.path ?? `/blog/author/${id}` }, author.articleCount);
        this.seoService.apply({ title: meta.title, description: meta.description, canonicalPath: author.path ?? undefined, type: 'profile' });
        this.cdr.markForCheck();
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
    this.load(Number(this.route.snapshot.paramMap.get('id')));
  }

  trackById(_index: number, item: BlogCard): number {
    return item.id;
  }
}
