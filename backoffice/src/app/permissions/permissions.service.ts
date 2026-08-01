import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalStorageService } from '../services/local-storage.service';
import { environment } from 'src/environment/environment';

export interface PermissionRecord {
  id: number;
  name: string;
  code: string;
  groupKey: string;
  description: string;
  status: boolean;
  isSystem: boolean;
  createdAt: string;
  assignedRoles: Array<{ id: number; name: string; code: string }>;
}

export interface PermissionsResponse {
  items: PermissionRecord[];
}

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {}

  getPermissions(): Observable<PermissionsResponse> {
    return this.http.get<PermissionsResponse>(`${environment.apiUrl}admin/permissions`, {
      headers: this.buildAuthHeaders()
    });
  }

  savePermission(payload: {
    id?: number;
    name: string;
    code?: string;
    groupKey?: string;
    description?: string;
    status: boolean;
  }): Observable<PermissionsResponse> {
    return this.http.post<PermissionsResponse>(`${environment.apiUrl}admin/save-permission`, payload, {
      headers: this.buildAuthHeaders()
    });
  }

  deletePermission(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}admin/delete-permission`, { id }, {
      headers: this.buildAuthHeaders()
    });
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.localStorageService.getItem<string>('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });
  }
}
