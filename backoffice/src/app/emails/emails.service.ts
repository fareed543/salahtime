import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from '../services/local-storage.service';

export interface AdminEmailListItem {
  id: number;
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  ccEmail: string;
  templateId: number | null;
  templateTitle: string;
  contentPreview: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEmailDetailResponse {
  id: number;
  name: string;
  id_email_template: number | null;
  email_content: string;
  from_name: string;
  from_email: string;
  subject: string;
  cc_email: string;
  templateTitle: string;
  templateOptions: Array<{ id: number; label: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEmailsListResponse {
  items: AdminEmailListItem[];
  summary: {
    totalEmails: number;
    templatedEmails: number;
    withoutTemplate: number;
    configuredSenders: number;
  };
  filterOptions: {
    templates: Array<{ id: number; label: string }>;
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
export class EmailsService {
  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  getEmails(page: number, perPage: number, search: string, templateId?: number | null): Observable<AdminEmailsListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('perPage', perPage)
      .set('search', search.trim());

    if (templateId) {
      params = params.set('templateId', templateId);
    }

    return this.http.get<AdminEmailsListResponse>(
      `${environment.apiUrl}admin/emails`,
      {
        headers: this.buildAuthHeaders(),
        params
      }
    );
  }

  getEmailById(id: number): Observable<AdminEmailDetailResponse> {
    return this.http.get<AdminEmailDetailResponse>(
      `${environment.apiUrl}admin/email-detail`,
      {
        headers: this.buildAuthHeaders(),
        params: new HttpParams().set('id', id)
      }
    );
  }

  saveEmail(payload: {
    id?: number;
    name: string;
    id_email_template: number | null;
    from_name: string;
    from_email: string;
    subject: string;
    cc_email: string;
    email_content: string;
  }): Observable<AdminEmailDetailResponse> {
    return this.http.post<AdminEmailDetailResponse>(
      `${environment.apiUrl}admin/save-email`,
      payload,
      { headers: this.buildAuthHeaders() }
    );
  }

  deleteEmail(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}admin/delete-email`,
      { id },
      { headers: this.buildAuthHeaders() }
    );
  }

  bulkDeleteEmails(ids: number[]): Observable<{ message: string; deletedCount: number }> {
    return this.http.post<{ message: string; deletedCount: number }>(
      `${environment.apiUrl}admin/bulk-delete-emails`,
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
