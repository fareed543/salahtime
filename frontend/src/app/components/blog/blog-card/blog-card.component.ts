import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BlogCard } from 'src/app/services/blog-api.service';

/** One article in a list: cover, category, title, excerpt, author and reading time. */
@Component({
  selector: 'app-blog-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="blog-card">
      <a class="blog-card-link" [routerLink]="article.path">
        <img *ngIf="article.coverThumbUrl" class="blog-card-cover" [src]="article.coverThumbUrl"
          [alt]="article.coverAlt || ''" width="480" height="252" loading="lazy">
        <div class="blog-card-body">
          <span class="blog-category" *ngIf="article.categoryLabel">{{ article.categoryLabel }}</span>
          <h2 *ngIf="level === 2" class="blog-card-title">{{ article.title }}</h2>
          <h3 *ngIf="level === 3" class="blog-card-title">{{ article.title }}</h3>
          <p class="blog-card-excerpt">{{ article.excerpt }}</p>
        </div>
      </a>
      <p class="blog-meta">
        <a *ngIf="article.author.path && showAuthor" [routerLink]="article.author.path">{{ article.author.name }}</a>
        <span *ngIf="article.author.path && showAuthor" aria-hidden="true">·</span>
        <span>{{ article.publishedAt | blogDate }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ 'BLOG.MIN_READ' | translate:{ count: article.readingMinutes } }}</span>
      </p>
    </article>
  `
})
export class BlogCardComponent {
  @Input({ required: true }) article!: BlogCard;
  @Input() showAuthor = true;
  /** 3 when the list sits under its own h2 (e.g. "More articles"). */
  @Input() level: 2 | 3 = 2;
}
