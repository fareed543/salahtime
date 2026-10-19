import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from '../services/local-storage.service';

export type SupportTicketStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export interface SupportOption {
  value: string;
  label: string;
}

export interface SupportTicketRow {
  id: number;
  reference: string;
  category: string;
  categoryLabel: string;
  status: SupportTicketStatus;
  statusLabel: string;
  excerpt: string;
  name: string | null;
  email: string | null;
  platform: string | null;
  location: string | null;
  /** Code the user had the app in, e.g. "ta". */
  language: string | null;
  /** "Tamil (ta)" from Languages; the bare code if unknown. */
  languageLabel: string | null;
  /** Files attached to the report (list rows only). */
  attachmentCount?: number;
  createdAt: string;
}

export interface SupportAttachment {
  id: number;
  name: string;
  mimeType: string;
  isImage: boolean;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface SupportTicketDetail extends SupportTicketRow {
  message: string;
  customerId: number | null;
  pageUrl: string | null;
  appVersion: string | null;
  attachments: SupportAttachment[];
  context: Record<string, unknown>;
  userAgent: string | null;
  adminNote: string | null;
  handledBy: string | null;
  resolvedAt: string | null;
  updatedAt: string;
}

export interface SupportOptions {
  categories: SupportOption[];
  statuses: SupportOption[];
  languages: SupportOption[];
}

export interface SupportTicketPage {
  items: SupportTicketRow[];
  summary: { statusCounts: Record<SupportTicketStatus, number>; open: number };
  pagination: { page: number; perPage: number; total: number; totalPages: number };
}

export const STATUS_BADGES: Record<SupportTicketStatus, string> = {
  new: 'bg-label-danger',
  in_progress: 'bg-label-warning',
  resolved: 'bg-label-success',
  closed: 'bg-label-secondary'
};

/** Support Desk: issues users report from the app and website (admin-support/*). */
@Injectable({ providedIn: 'root' })
export class SupportDeskService {
  private readonly baseUrl = `${environment.apiUrl}admin-support`;

  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  options(): Observable<SupportOptions> {
    return this.http.get<SupportOptions>(`${this.baseUrl}/options`, this.requestOptions());
  }

  listTickets(filters: Record<string, string | number>): Observable<SupportTicketPage> {
    return this.http.get<SupportTicketPage>(`${this.baseUrl}/tickets`, this.requestOptions(filters));
  }

  getTicket(id: number): Observable<SupportTicketDetail> {
    return this.http.get<SupportTicketDetail>(`${this.baseUrl}/ticket/${id}`, this.requestOptions());
  }

  /** An attached file; it is only served with the admin token, so it is fetched rather than linked. */
  getAttachment(id: number): Observable<Blob> {
    const { headers } = this.requestOptions();
    return this.http.get(`${this.baseUrl}/attachment/${id}`, { headers, responseType: 'blob' });
  }

  updateTicket(id: number, payload: { status?: SupportTicketStatus; adminNote?: string }): Observable<SupportTicketDetail> {
    return this.http.put<SupportTicketDetail>(`${this.baseUrl}/ticket/${id}`, payload, this.requestOptions());
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
