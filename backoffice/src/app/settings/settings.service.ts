import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environment/environment';

/** One section of General Settings as returned by admin/settings. */
export interface SettingsSection<TValues = Record<string, unknown>, TMeta = Record<string, unknown>> {
  values: TValues;
  meta: TMeta;
  updatedAt: string | null;
  updatedBy: { id: number; name: string } | null;
}

export interface AuthChannelValues {
  channel: 'email' | 'mobile';
}

export interface AuthChannelMeta {
  mobileConfigured: boolean;
}

export interface SmsProviderValues {
  provider: '2factor' | 'log' | 'none';
  /** Write-only: always empty from the API; blank on save keeps the current key. */
  apiKey: string;
  otpTemplate: string;
}

export interface SmsProviderMeta {
  providers: Record<string, string>;
  apiKeySet: boolean;
  apiKeyHint: string;
}

/** Add a typed key here for every new section (mirrors AppSettings::SECTIONS in the API). */
export interface SettingsResponse {
  sections: {
    authChannels: SettingsSection<AuthChannelValues, AuthChannelMeta>;
    smsProvider: SettingsSection<SmsProviderValues, SmsProviderMeta>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  getSettings(): Observable<SettingsResponse> {
    return this.http.get<SettingsResponse>(
      `${environment.apiUrl}admin/settings`,
      { headers: this.buildAuthHeaders() }
    );
  }

  saveSection<TValues, TMeta>(section: string, values: TValues): Observable<{ section: SettingsSection<TValues, TMeta> }> {
    return this.http.post<{ section: SettingsSection<TValues, TMeta> }>(
      `${environment.apiUrl}admin/save-settings`,
      { section, values },
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
