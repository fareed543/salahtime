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
}

/** Support Desk: sends "Report an Issue" submissions (http-support/*). */
@Injectable({
  providedIn: 'root'
})
export class SupportApiService {
  constructor(private http: HttpClient) {}

  submitIssue(payload: SupportIssuePayload): Observable<SupportIssueResponse> {
    // Reporting works without an account, so an expired session must not bounce the user to login.
    return this.http.post<SupportIssueResponse>(`${environment.apiUrl}http-support/submit`, payload, {
      context: new HttpContext().set(SKIP_LOGIN_REDIRECT, true)
    });
  }
}
