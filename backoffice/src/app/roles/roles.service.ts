import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalStorageService } from '../services/local-storage.service';
import { environment } from 'src/environment/environment';

export interface RoleOption {
  id: number;
  label: string;
  code: string;
}

export interface PermissionOption {
  id: number;
  label: string;
  code: string;
  groupKey: string;
}

export interface RoleRecord {
  id: number;
  name: string;
  code: string;
  description: string;
  status: boolean;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
  users: Array<{ id: number; name: string; initials: string }>;
  permissions: Array<{ id: number; name: string; code: string }>;
}

export interface RolesResponse {
  items: RoleRecord[];
  permissionOptions: PermissionOption[];
}

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {}

  getRoles(): Observable<RolesResponse> {
    return this.http.get<RolesResponse>(`${environment.apiUrl}admin/roles`, {
      headers: this.buildAuthHeaders()
    });
  }

  saveRole(payload: {
    id?: number;
    name: string;
    code?: string;
    description?: string;
    status: boolean;
    permissionIds: number[];
  }): Observable<RolesResponse> {
    return this.http.post<RolesResponse>(`${environment.apiUrl}admin/save-role`, payload, {
      headers: this.buildAuthHeaders()
    });
  }

  deleteRole(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}admin/delete-role`, { id }, {
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
