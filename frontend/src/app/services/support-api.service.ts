import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOGIN_REDIRECT } from './auth.interceptor';

export interface SupportIssuePayload {
  category: string;
  message: string;
  name?: string;
  email?: string;
  pageUrl?: string;
  platform?: string;
  appVersion?: string;
  language?: string;
  location?: string;
  context?: Record<string, unknown>;
  /** Honeypot: hidden from people, must stay empty. */
  website?: string;
}

export interface SupportIssueResponse {
  reference: string | null;
  message: string;
  /** How many attached files were stored. */
  attachments?: number;
}

/** Support Desk: sends "Report an Issue" submissions (http-support/*). */
@Injectable({
  providedIn: 'root'
})
export class SupportApiService {
  constructor(private http: HttpClient) {}

  /** Sent as JSON, or as multipart form data when screenshots/files are attached. */
  submitIssue(payload: SupportIssuePayload, attachments: { blob: Blob; name: string }[] = []): Observable<SupportIssueResponse> {
    let body: SupportIssuePayload | FormData = payload;
    if (attachments.length) {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      });
      attachments.forEach(attachment => form.append('attachments[]', attachment.blob, attachment.name));
      body = form;
    }

    // Reporting works without an account, so an expired session must not bounce the user to login.
    return this.http.post<SupportIssueResponse>(`${environment.apiUrl}http-support/submit`, body, {
      context: new HttpContext().set(SKIP_LOGIN_REDIRECT, true)
    });
  }
}
