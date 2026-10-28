import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Subscription } from 'rxjs';
import { BLOG_LIST_INTRO } from 'src/app/seo/seo-content';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { BlogApiService, BlogCard, BlogOption } from 'src/app/services/blog-api.service';

/** /blog: published articles, newest first, with a category filter and search (?category=&search=&page=). */
@Component({
  selector: 'app-blog-list',
  templateUrl: './blog-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogListComponent implements OnInit, OnDestroy {
  readonly intro = BLOG_LIST_INTRO;
  readonly isNativeApp = Capacitor.isNativePlatform();

  articles: BlogCard[] = [];
  categories: BlogOption[] = [];
  category = '';
  search = '';
  page = 1;
  totalPages = 1;
  loading = true;
  failed = false;

  private subscription?: Subscription;

  constructor(
    private blogApi: BlogApiService,
    private authApi: AuthApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get loggedIn(): boolean {
    return this.authApi.hasValidSession();
  }

  ngOnInit(): void {
    this.subscription = this.route.queryParamMap.subscribe(params => {
      this.category = params.get('category') ?? '';
      this.search = params.get('search') ?? '';
      this.page = Math.max(1, Number(params.get('page')) || 1);
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  load(): void {
    this.loading = true;
    this.failed = false;
    this.cdr.markForCheck();
    this.blogApi.articles({ page: this.page, category: this.category, search: this.search }).subscribe({
      next: response => {
        this.articles = response.items;
        this.categories = response.categories ?? this.categories;
        this.totalPages = response.pagination.totalPages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.failed = true;
        this.cdr.markForCheck();
      }
    });
  }

  submitSearch(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: this.search.trim() || null, page: null },
      queryParamsHandling: 'merge'
    });
  }

  pageParams(page: number): Record<string, string | number | null> {
    return { category: this.category || null, search: this.search || null, page: page > 1 ? page : null };
  }

  trackById(_index: number, item: BlogCard): number {
    return item.id;
  }
}
