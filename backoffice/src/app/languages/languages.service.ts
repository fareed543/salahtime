import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from '../services/local-storage.service';

export interface AdminLanguageItem {
  id: number;
  name: string;
  nativeName: string;
  code: string;
  status: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLanguagesListResponse {
  items: AdminLanguageItem[];
  summary: {
    totalLanguages: number;
    enabledLanguages: number;
    disabledLanguages: number;
    rtlLanguages: number;
  };
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LanguagesService {
  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  getLanguages(page: number, perPage: number, search: string): Observable<AdminLanguagesListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('perPage', perPage)
      .set('search', search.trim());

    return this.http.get<AdminLanguagesListResponse>(
      `${environment.apiUrl}admin/languages`,
      {
        headers: this.buildAuthHeaders(),
        params
      }
    );
  }

  getLanguageById(id: number): Observable<AdminLanguageItem> {
    return this.http.get<AdminLanguageItem>(
      `${environment.apiUrl}admin/language-detail`,
      {
        headers: this.buildAuthHeaders(),
        params: new HttpParams().set('id', id)
      }
    );
  }

  saveLanguage(payload: {
    id?: number;
    name: string;
    native_name: string;
    code: string;
    status: boolean;
    sort_order: number;
  }): Observable<AdminLanguageItem> {
    return this.http.post<AdminLanguageItem>(
      `${environment.apiUrl}admin/save-language`,
      payload,
      { headers: this.buildAuthHeaders() }
    );
  }

  toggleLanguageStatus(id: number): Observable<{ message: string; item: AdminLanguageItem }> {
    return this.http.post<{ message: string; item: AdminLanguageItem }>(
      `${environment.apiUrl}admin/toggle-language-status`,
      { id },
      { headers: this.buildAuthHeaders() }
    );
  }

  deleteLanguage(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}admin/delete-language`,
      { id },
      { headers: this.buildAuthHeaders() }
    );
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.localStorageService.getItem<string>('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });
  }
}
