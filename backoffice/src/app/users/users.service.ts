import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
  customerType: string;
  customerTypeId: number;
  gender: string;
  statusLabel: string;
  active: boolean;
  emailVerified: boolean;
  mobileVerified: boolean;
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
    customerTypes: Array<{ label: string; value: number }>;
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
    customerTypeId?: number | null;
    gender?: string;
    status?: string;
  }): Observable<AdminUsersListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('perPage', perPage)
      .set('search', search.trim());

    if (filters?.customerTypeId) {
      params = params.set('customerTypeId', filters.customerTypeId);
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

  private buildAuthHeaders(): HttpHeaders {
    const token = this.localStorageService.getItem<string>('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });
  }
}
