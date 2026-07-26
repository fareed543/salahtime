import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environment/environment';

export interface AdminAppVersionItem {
  id: number;
  version: string;
  versionCode: number | null;
  mandatory: boolean;
  title: string;
  message: string;
  features: string[];
  bugFixes: string[];
  apkUrl: string;
  updateUrl: string;
  playStoreUrl: string;
  releaseDate: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminAppVersionsResponse {
  current: AdminAppVersionItem | null;
  items: AdminAppVersionItem[];
}

export interface SaveAdminAppVersionPayload {
  version: string;
  versionCode: number | null;
  mandatory: boolean;
  title: string;
  message: string;
  features: string[];
  bugFixes: string[];
  apkUrl: string;
  updateUrl: string;
  playStoreUrl: string;
  releaseDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppVersionsService {
  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  getAppVersions(): Observable<AdminAppVersionsResponse> {
    return this.http.get<AdminAppVersionsResponse>(
      `${environment.apiUrl}admin/app-versions`,
      { headers: this.buildAuthHeaders() }
    );
  }

  saveAppVersion(payload: SaveAdminAppVersionPayload): Observable<AdminAppVersionsResponse> {
    return this.http.post<AdminAppVersionsResponse>(
      `${environment.apiUrl}admin/save-app-version`,
      payload,
      { headers: this.buildAuthHeaders() }
    );
  }

  activateAppVersion(id: number): Observable<AdminAppVersionsResponse> {
    return this.http.post<AdminAppVersionsResponse>(
      `${environment.apiUrl}admin/activate-app-version`,
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
