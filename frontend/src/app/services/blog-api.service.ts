import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOGIN_REDIRECT } from './auth.interceptor';
import { BlogSeoCheck } from '../components/blog/blog-seo-score';

export interface BlogOption { value: string; label: string; }

export interface BlogAuthor { id: number | null; name: string; path: string | null; }

export interface BlogCard {
  id: number;
  slug: string;
  path: string;
  title: string;
  excerpt: string;
  category: string | null;
  categoryLabel: string | null;
  language: string | null;
  coverImageUrl: string | null;
  coverThumbUrl: string | null;
  coverAlt: string | null;
  readingMinutes: number;
  views: number;
  publishedAt: string;
  updatedAt: string;
  author: BlogAuthor;
}

export interface BlogArticleDetail extends BlogCard {
  contentHtml: string;
  metaTitle: string;
  metaDescription: string | null;
  focusKeyword: string | null;
  tags: string[];
  references: string | null;
  wordCount: number;
  related: BlogCard[];
  isAuthor: boolean;
}

export interface BlogPage<T> {
  items: T[];
  categories?: BlogOption[];
  pagination: { page: number; perPage: number; total: number; totalPages: number };
}

export interface BlogAuthorPage extends BlogAuthor {
  articleCount: number;
  totalViews: number;
  writingSince: string;
  items: BlogCard[];
}

/** Editable fields of an article version, as sent to and returned by the API. */
export interface BlogVersionFields {
  title: string;
  slug: string | null;
  contentHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  category: string | null;
  tags: string[];
  language: string | null;
  coverImageUrl: string | null;
  coverThumbUrl: string | null;
  coverAlt: string | null;
  references: string | null;
}

export interface BlogVersion extends BlogVersionFields {
  id: number;
  versionNo: number;
  source: 'author' | 'admin_proposal' | 'admin_restore';
  note: string | null;
  wordCount: number;
  seoScore: number;
  seoChecks: BlogSeoCheck[];
  createdAt: string;
}

export interface BlogChange { field: string; before: string; after: string; }

export interface BlogVersionRow {
  id: number;
  versionNo: number;
  source: string;
  title: string;
  seoScore: number;
  wordCount: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  isLive: boolean;
  isLatest: boolean;
  isProposal: boolean;
}

export interface BlogTimelineEvent {
  id: number;
  action: string;
  actionLabel: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorRole: 'author' | 'admin' | 'system';
  actor: string | null;
  versionNo: number | null;
  note: string | null;
  createdAt: string;
}

export type BlogStatus = 'draft' | 'submitted' | 'changes_proposed' | 'published' | 'rejected';

export interface BlogMyRow {
  id: number;
  title: string;
  status: BlogStatus;
  statusLabel: string;
  isPublic: boolean;
  path: string | null;
  views: number;
  seoScore: number;
  wordCount: number;
  rejectReason: string | null;
  hasProposal: boolean;
  hasUnpublishedChanges: boolean;
  coverThumbUrl: string | null;
  updatedAt: string;
  publishedAt: string | null;
}

export interface BlogMyArticle {
  article: BlogMyRow;
  version: BlogVersion;
  proposal: { version: BlogVersion; changes: BlogChange[] } | null;
  versions: BlogVersionRow[];
  timeline: BlogTimelineEvent[];
  message?: string;
}

export interface BlogMine {
  items: BlogMyRow[];
  summary: { total: number; published: number; totalViews: number };
  author: BlogAuthor;
}

/** Blog (NF-003): reading published articles and writing your own (http-blog/*). */
@Injectable({
  providedIn: 'root'
})
export class BlogApiService {
  private readonly base = `${environment.apiUrl}http-blog/`;
  // Reading works without an account, so an expired session must not bounce the reader to login.
  private readonly publicContext = new HttpContext().set(SKIP_LOGIN_REDIRECT, true);

  constructor(private http: HttpClient) {}

  options(): Observable<{ categories: BlogOption[]; minWords: number }> {
    return this.http.get<{ categories: BlogOption[]; minWords: number }>(`${this.base}options`, { context: this.publicContext });
  }

  articles(filters: { page?: number; category?: string; search?: string; author?: number }): Observable<BlogPage<BlogCard>> {
    let params = new HttpParams().set('perPage', '12');
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<BlogPage<BlogCard>>(`${this.base}articles`, { params, context: this.publicContext });
  }

  article(slug: string): Observable<BlogArticleDetail> {
    return this.http.get<BlogArticleDetail>(`${this.base}article`, { params: { slug }, context: this.publicContext });
  }

  countView(slug: string): Observable<{ views: number }> {
    return this.http.post<{ views: number }>(`${this.base}view`, { slug }, { context: this.publicContext });
  }

  author(id: number): Observable<BlogAuthorPage> {
    return this.http.get<BlogAuthorPage>(`${this.base}author/${id}`, { context: this.publicContext });
  }

  mine(): Observable<BlogMine> {
    return this.http.get<BlogMine>(`${this.base}mine`);
  }

  myArticle(id: number): Observable<BlogMyArticle> {
    return this.http.get<BlogMyArticle>(`${this.base}my-article/${id}`);
  }

  save(fields: Partial<BlogVersionFields> & { id?: number | null; submit?: boolean }): Observable<BlogMyArticle> {
    return this.http.post<BlogMyArticle>(`${this.base}save`, fields);
  }

  submit(id: number): Observable<BlogMyArticle> {
    return this.http.post<BlogMyArticle>(`${this.base}submit/${id}`, {});
  }

  answerProposal(id: number, decision: 'accept' | 'decline', note: string): Observable<BlogMyArticle> {
    return this.http.post<BlogMyArticle>(`${this.base}proposal/${id}`, { decision, note });
  }

  uploadCover(image: Blob, name: string): Observable<{ imageUrl: string; thumbUrl: string }> {
    const form = new FormData();
    form.append('image', image, name);
    return this.http.post<{ imageUrl: string; thumbUrl: string }>(`${this.base}cover`, form);
  }
}
