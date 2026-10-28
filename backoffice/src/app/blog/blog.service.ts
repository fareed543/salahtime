import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from '../services/local-storage.service';

export type BlogStatus = 'draft' | 'submitted' | 'changes_proposed' | 'published' | 'rejected';

export interface BlogOption { value: string; label: string; }

export interface BlogAuthor { id: number | null; name: string; path: string | null; }

export interface BlogRow {
  id: number;
  title: string;
  status: BlogStatus;
  statusLabel: string;
  isPublic: boolean;
  path: string | null;
  category: string | null;
  categoryLabel: string | null;
  seoScore: number;
  wordCount: number;
  versionNo: number;
  views: number;
  author: BlogAuthor;
  submittedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface BlogSeoCheck { key: string; passed: boolean; points: number; max: number; }

/** Editable fields, as the API names them. */
export interface BlogFields {
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

export interface BlogVersion extends BlogFields {
  id: number;
  versionNo: number;
  source: 'author' | 'admin_proposal' | 'admin_restore';
  note: string | null;
  wordCount: number;
  seoScore: number;
  seoChecks: BlogSeoCheck[];
  createdAt: string;
  createdBy: number;
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

export interface BlogEvent {
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

export interface BlogDetail {
  article: BlogRow & {
    rejectReason: string | null;
    reviewedBy: string | null;
    liveVersionId: number | null;
    latestVersionId: number;
    proposalVersionId: number | null;
  };
  author: BlogAuthor & { email: string | null; phone: string | null; articleCount: number; publishedCount: number };
  latest: BlogVersion;
  live: BlogVersion | null;
  changesFromLive: BlogChange[];
  proposal: { version: BlogVersion; changes: BlogChange[] } | null;
  versions: BlogVersionRow[];
  timeline: BlogEvent[];
  message?: string;
}

export interface BlogPage {
  items: BlogRow[];
  summary: { statusCounts: Record<string, number>; waiting: number };
  pagination: { page: number; perPage: number; total: number; totalPages: number };
}

export const BLOG_STATUS_BADGES: Record<string, string> = {
  draft: 'bg-label-secondary',
  submitted: 'bg-label-warning',
  changes_proposed: 'bg-label-info',
  published: 'bg-label-success',
  unpublished: 'bg-label-dark',
  rejected: 'bg-label-danger'
};

/** Same labels the app shows authors (BLOG.SEO.CHECKS in the frontend's en.json). */
export const BLOG_SEO_CHECK_LABELS: Record<string, string> = {
  meta_title_length: 'Search title is 30–60 characters',
  meta_description_length: 'Search description is 120–160 characters',
  keyword_set: 'Focus keyword is set',
  keyword_in_title: 'Keyword is in the title',
  keyword_in_description: 'Keyword is in the search description',
  keyword_in_intro: 'Keyword is in the first paragraph',
  keyword_in_slug: 'Keyword is in the web address',
  length: 'At least 600 words (300+ gets part marks)',
  subheadings: 'Uses H2 headings',
  cover_image: 'Has a cover image',
  cover_alt: 'Cover image is described',
  internal_link: 'Links to another SalahTime page',
  references: 'Lists references',
  category_tags: 'Has a category and tags'
};

export const BLOG_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  slug: 'Web address',
  contentHtml: 'Article text',
  metaTitle: 'Search title',
  metaDescription: 'Search description',
  focusKeyword: 'Focus keyword',
  category: 'Category',
  tags: 'Tags',
  language: 'Language',
  coverImageUrl: 'Cover image',
  coverAlt: 'Cover image description',
  references: 'References'
};

/** Blog review (NF-003): articles users submit from the app and website (admin-blog/*). */
@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly baseUrl = `${environment.apiUrl}admin-blog`;

  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  options(): Observable<{ categories: BlogOption[]; statuses: BlogOption[] }> {
    return this.http.get<{ categories: BlogOption[]; statuses: BlogOption[] }>(`${this.baseUrl}/options`, this.requestOptions());
  }

  list(filters: Record<string, string | number>): Observable<BlogPage> {
    return this.http.get<BlogPage>(`${this.baseUrl}/articles`, this.requestOptions(filters));
  }

  get(id: number): Observable<BlogDetail> {
    return this.http.get<BlogDetail>(`${this.baseUrl}/article/${id}`, this.requestOptions());
  }

  version(id: number): Observable<BlogVersion> {
    return this.http.get<BlogVersion>(`${this.baseUrl}/version/${id}`, this.requestOptions());
  }

  approve(id: number, note: string): Observable<BlogDetail> {
    return this.http.post<BlogDetail>(`${this.baseUrl}/approve/${id}`, { note }, this.requestOptions());
  }

  reject(id: number, reason: string): Observable<BlogDetail> {
    return this.http.post<BlogDetail>(`${this.baseUrl}/reject/${id}`, { reason }, this.requestOptions());
  }

  propose(id: number, changes: Partial<BlogFields> & { note?: string }): Observable<BlogDetail> {
    return this.http.post<BlogDetail>(`${this.baseUrl}/propose/${id}`, changes, this.requestOptions());
  }

  unpublish(id: number, reason: string): Observable<BlogDetail> {
    return this.http.post<BlogDetail>(`${this.baseUrl}/unpublish/${id}`, { reason }, this.requestOptions());
  }

  restore(id: number, versionId: number): Observable<BlogDetail> {
    return this.http.post<BlogDetail>(`${this.baseUrl}/restore/${id}`, { versionId }, this.requestOptions());
  }

  private requestOptions(filters: Record<string, string | number> = {}): { headers: HttpHeaders; params: HttpParams } {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    const token = this.localStorageService.getItem<string>('accessToken');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` }), params };
  }
}
