import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BlogApiService, BlogMine, BlogMyRow } from 'src/app/services/blog-api.service';

/** /blog/my-articles: the writer's own articles, with their review status and views. */
@Component({
  selector: 'app-blog-mine',
  templateUrl: './blog-mine.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogMineComponent implements OnInit {
  data: BlogMine | null = null;
  loading = true;
  failed = false;

  constructor(private blogApi: BlogApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.failed = false;
    this.cdr.markForCheck();
    this.blogApi.mine().subscribe({
      next: data => {
        this.data = data;
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

  statusKey(row: BlogMyRow): string {
    return 'BLOG.STATUS.' + row.status.toUpperCase();
  }

  trackById(_index: number, item: BlogMyRow): number {
    return item.id;
  }
}
