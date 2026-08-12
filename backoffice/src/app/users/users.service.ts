import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from '../services/local-storage.service';

export interface AdminUserListItem {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  roleName: string;
  roleId: number;
  gender: string;
  statusLabel: string;
  active: boolean;
  emailVerified: boolean;
  mobileVerified: boolean;
  roles: Array<{ id: number; name: string; code: string }>;
  roleNames: string[];
  displayRole: string;
}

export interface AdminUsersListResponse {
  items: AdminUserListItem[];
  summary: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
  };
  filterOptions: {
    roles: Array<{ id: number; label: string; code: string }>;
    genders: Array<{ label: string; value: string }>;
    statuses: Array<{ label: string; value: string }>;
  };
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserDetailResponse {
  id: number;
  firstname: string;
  lastname: string;
  username: string;
  gender: string;
  email: string;
  phone: string;
  password: string;
  roleId: number;
  id_customer_type: number;
  designation: string;
  occupation: string;
  company_name: string;
  college_name: string;
  address: string;
  street: string;
  landmark: string;
  masjid: string;
  pincode: string;
  notes: string;
  active: boolean;
  mobile_verified: boolean;
  email_verified: boolean;
  offline_access: boolean;
  email_notification: boolean;
  roleIds: number[];
  roles: Array<{ id: number; name: string; code: string }>;
  roleOptions: Array<{ id: number; label: string; code: string }>;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {}

  getUsers(page: number, perPage: number, search: string, filters?: {
    roleId?: number | null;
    gender?: string;
    status?: string;
  }): Observable<AdminUsersListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('perPage', perPage)
      .set('search', search.trim());

    if (filters?.roleId) {
      params = params.set('roleId', filters.roleId);
    }

    if (filters?.gender) {
      params = params.set('gender', filters.gender);
    }

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<AdminUsersListResponse>(
      `${environment.apiUrl}admin/users`,
      {
        headers: this.buildAuthHeaders(),
        params
      }
    ).pipe(
      map((response) => this.normalizeUsersResponse(response))
    );
  }

  getUserById(id: number): Observable<AdminUserDetailResponse> {
    return this.http.get<AdminUserDetailResponse>(
      `${environment.apiUrl}admin/user-detail`,
      {
        headers: this.buildAuthHeaders(),
        params: new HttpParams().set('id', id)
      }
    );
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}admin/delete-user`,
      { id },
      {
        headers: this.buildAuthHeaders()
      }
    );
  }

  bulkDeleteUsers(ids: number[]): Observable<{ message: string; deletedCount: number }> {
    return this.http.post<{ message: string; deletedCount: number }>(
      `${environment.apiUrl}admin/bulk-delete-users`,
      { ids },
      {
        headers: this.buildAuthHeaders()
      }
    );
  }

  saveUser(payload: Partial<AdminUserDetailResponse> & { id?: number; roleId?: number; roleIds?: number[] }): Observable<AdminUserDetailResponse> {
    return this.http.post<AdminUserDetailResponse>(
      `${environment.apiUrl}admin/save-user`,
      payload,
      {
        headers: this.buildAuthHeaders()
      }
    );
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.localStorageService.getItem<string>('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });
  }

  private normalizeUsersResponse(response: any): AdminUsersListResponse {
    const rawItems = Array.isArray(response?.items) ? response.items : [];
    const pagination = response?.pagination ?? {};
    const filterOptions = response?.filterOptions ?? {};

    return {
      items: rawItems.map((item: any) => this.normalizeUser(item)),
      summary: {
        totalUsers: Number(response?.summary?.totalUsers ?? rawItems.length ?? 0),
        activeUsers: Number(response?.summary?.activeUsers ?? 0),
        inactiveUsers: Number(response?.summary?.inactiveUsers ?? 0),
        adminUsers: Number(response?.summary?.adminUsers ?? 0)
      },
      filterOptions: {
        roles: Array.isArray(filterOptions.roles) ? filterOptions.roles : [],
        genders: Array.isArray(filterOptions.genders) ? filterOptions.genders : [],
        statuses: Array.isArray(filterOptions.statuses) ? filterOptions.statuses : []
      },
      pagination: {
        page: Number(pagination.page ?? 1),
        perPage: Number(pagination.perPage ?? 10),
        total: Number(pagination.total ?? rawItems.length ?? 0),
        totalPages: Number(pagination.totalPages ?? 1)
      }
    };
  }

  private normalizeUser(item: any): AdminUserListItem {
    const roles = Array.isArray(item?.roles) ? item.roles : [];
    const roleNames = Array.isArray(item?.roleNames) ? item.roleNames : [];
    const displayRole = item?.displayRole || item?.roleName || roleNames[0] || roles[0]?.name || 'User';

    return {
      id: Number(item?.id ?? 0),
      fullName: this.resolveFullName(item),
      firstName: item?.firstName ?? item?.firstname ?? '',
      lastName: item?.lastName ?? item?.lastname ?? '',
      email: item?.email ?? '',
      phone: item?.phone ?? '',
      createdAt: item?.createdAt ?? '',
      roleName: item?.roleName ?? displayRole,
      roleId: Number(item?.roleId ?? roles[0]?.id ?? 0),
      gender: item?.gender ?? '',
      statusLabel: item?.statusLabel ?? (item?.active ? 'Active' : 'Inactive'),
      active: Boolean(item?.active),
      emailVerified: Boolean(item?.emailVerified ?? item?.email_verified),
      mobileVerified: Boolean(item?.mobileVerified ?? item?.mobile_verified),
      roles,
      roleNames,
      displayRole
    };
  }

  private resolveFullName(item: any): string {
    const directFullName = item?.fullName ?? item?.fullname;
    if (typeof directFullName === 'string' && directFullName.trim()) {
      return directFullName.trim();
    }

    const firstName = item?.firstName ?? item?.firstname ?? '';
    const lastName = item?.lastName ?? item?.lastname ?? '';
    const combinedName = `${firstName} ${lastName}`.trim();

    return combinedName || item?.phone || item?.email || 'Unknown User';
  }
}
