import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from '../services/local-storage.service';

export interface AdminEmailTemplateListItem {
  id: number;
  title: string;
  email_template: string;
  linkedEmailCount: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEmailTemplatesListResponse {
  items: AdminEmailTemplateListItem[];
  summary: {
    totalTemplates: number;
    templatesInUse: number;
    availableTemplates: number;
    linkedEmails: number;
  };
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminEmailTemplateDetailResponse extends AdminEmailTemplateListItem {}

@Injectable({
  providedIn: 'root'
})
export class EmailTemplatesService {
  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  getEmailTemplates(page: number, perPage: number, search: string): Observable<AdminEmailTemplatesListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('perPage', perPage)
      .set('search', search.trim());

    return this.http.get<AdminEmailTemplatesListResponse>(
      `${environment.apiUrl}admin/email-templates`,
      {
        headers: this.buildAuthHeaders(),
        params
      }
    );
  }

  getEmailTemplateById(id: number): Observable<AdminEmailTemplateDetailResponse> {
    return this.http.get<AdminEmailTemplateDetailResponse>(
      `${environment.apiUrl}admin/email-template-detail`,
      {
        headers: this.buildAuthHeaders(),
        params: new HttpParams().set('id', id)
      }
    );
  }

  saveEmailTemplate(payload: {
    id?: number;
    title: string;
    email_template: string;
  }): Observable<AdminEmailTemplateDetailResponse> {
    return this.http.post<AdminEmailTemplateDetailResponse>(
      `${environment.apiUrl}admin/save-email-template`,
      payload,
      { headers: this.buildAuthHeaders() }
    );
  }

  deleteEmailTemplate(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}admin/delete-email-template`,
      { id },
      { headers: this.buildAuthHeaders() }
    );
  }

  bulkDeleteEmailTemplates(ids: number[]): Observable<{ message: string; deletedCount: number }> {
    return this.http.post<{ message: string; deletedCount: number }>(
      `${environment.apiUrl}admin/bulk-delete-email-templates`,
      { ids },
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
