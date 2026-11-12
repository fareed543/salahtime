import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from '../services/local-storage.service';

/** Text per app language; English is required. */
export type ShortsText = Record<string, string>;

export interface ShortsCategory { id: number; name: ShortsText; sortOrder: number; active: boolean; cardCount?: number; }
export interface ShortsBook { id: number; name: string; sortOrder: number; active: boolean; }
export interface ShortsTemplate { key: string; name: string; }
export interface ShortsReference { bookId?: number; book?: string; number: string; }
export interface ShortsZikr { arabic: string; transliteration: string; meaning: ShortsText; }

export interface ShortsCard {
  id: number;
  slug: string;
  categoryId: number;
  headline: ShortsText;
  body: ShortsText;
  zikr: ShortsZikr | null;
  template: string;
  imageUrl: string | null;
  thumbUrl: string | null;
  references: ShortsReference[];
  likes: number;
  status: 'draft' | 'published';
  sortOrder: number;
  sourcePage: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ShortsOptions {
  templates: ShortsTemplate[];
  languages: string[];
  limits: { headline: number; body: number; category: number };
  categories: ShortsCategory[];
  books: ShortsBook[];
}

export interface ShortsCardInput {
  id?: number;
  categoryId: number | null;
  headline: ShortsText;
  body: ShortsText;
  zikr: ShortsZikr | null;
  template: string;
  imageUrl: string | null;
  thumbUrl: string | null;
  sourcePage: string;
  references: Array<{ bookId: number | null; number: string }>;
}

export const SHORTS_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ar: 'Arabic', es: 'Spanish', fr: 'French', hi: 'Hindi', 'hi-latn': 'Hinglish', id: 'Indonesian',
  ms: 'Malay', ta: 'Tamil', te: 'Telugu', 'te-latn': 'Tinglish', tr: 'Turkish', ur: 'Urdu'
};

/** NF-015 Sunnah Shorts: admin-sunnah API. */
@Injectable({ providedIn: 'root' })
export class SunnahShortsService {
  private readonly baseUrl = `${environment.apiUrl}admin-sunnah`;

  constructor(private readonly http: HttpClient, private readonly storage: LocalStorageService) {}

  options(): Observable<ShortsOptions> {
    return this.http.get<ShortsOptions>(`${this.baseUrl}/options`, this.requestOptions());
  }

  cards(filters: { categoryId?: number | null; status?: string; search?: string } = {}): Observable<{ cards: ShortsCard[] }> {
    const params: Record<string, string | number> = {};
    if (filters.categoryId) params['categoryId'] = filters.categoryId;
    if (filters.status) params['status'] = filters.status;
    if (filters.search) params['search'] = filters.search;
    return this.http.get<{ cards: ShortsCard[] }>(`${this.baseUrl}/cards`, this.requestOptions(params));
  }

  card(id: number): Observable<{ card: ShortsCard }> {
    return this.http.get<{ card: ShortsCard }>(`${this.baseUrl}/card/${id}`, this.requestOptions());
  }

  saveCard(input: ShortsCardInput): Observable<{ card: ShortsCard }> {
    return this.http.post<{ card: ShortsCard }>(`${this.baseUrl}/save-card`, input, this.requestOptions());
  }

  publish(id: number, published: boolean): Observable<{ card: ShortsCard }> {
    return this.http.post<{ card: ShortsCard }>(`${this.baseUrl}/publish/${id}`, { published }, this.requestOptions());
  }

  deleteCard(id: number): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/delete-card/${id}`, {}, this.requestOptions());
  }

  reorderCards(ids: number[]): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/reorder-cards`, { ids }, this.requestOptions());
  }

  saveCategory(category: { id?: number; name: ShortsText; active: boolean }): Observable<{ category: ShortsCategory }> {
    return this.http.post<{ category: ShortsCategory }>(`${this.baseUrl}/save-category`, category, this.requestOptions());
  }

  deleteCategory(id: number): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/delete-category/${id}`, {}, this.requestOptions());
  }

  reorderCategories(ids: number[]): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/reorder-categories`, { ids }, this.requestOptions());
  }

  saveBook(book: { id?: number; name: string; active: boolean }): Observable<{ book: ShortsBook }> {
    return this.http.post<{ book: ShortsBook }>(`${this.baseUrl}/save-book`, book, this.requestOptions());
  }

  uploadImage(image: Blob): Observable<{ imageUrl: string; thumbUrl: string }> {
    const form = new FormData();
    form.append('image', image, 'sunnah.jpg');
    return this.http.post<{ imageUrl: string; thumbUrl: string }>(`${this.baseUrl}/image`, form, this.requestOptions());
  }

  private requestOptions(filters: Record<string, string | number> = {}): { headers: HttpHeaders; params: HttpParams } {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => { params = params.set(key, String(value)); });
    const token = this.storage.getItem<string>('accessToken');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` }), params };
  }
}
