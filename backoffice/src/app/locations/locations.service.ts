import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from '../services/local-storage.service';

export type LocationKind = 'countries' | 'states' | 'cities';

export interface OptionItem {
  id: number;
  name: string;
  countryId?: number;
  timezone?: string;
}

export interface TimezoneOption {
  value: string;
  name: string;
  description: string;
  label: string;
  offset: string;
}

export interface LocationListResponse {
  items: any[];
  summary?: Record<string, number>;
  filterOptions?: {
    countries?: OptionItem[];
    states?: OptionItem[];
  };
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class LocationsService {
  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  list(kind: LocationKind, filters: Record<string, string | number | boolean | null | undefined>): Observable<LocationListResponse> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<LocationListResponse | { data?: LocationListResponse }>(`${environment.apiUrl}admin/${kind}`, {
      headers: this.buildAuthHeaders(),
      params
    }).pipe(map((response) => this.normalizeListResponse(response)));
  }

  detail(kind: LocationKind, id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}admin/${kind}/${id}`, {
      headers: this.buildAuthHeaders()
    });
  }

  save(kind: LocationKind, payload: any, id?: number | null): Observable<any> {
    const url = id ? `${environment.apiUrl}admin/${kind}/${id}` : `${environment.apiUrl}admin/${kind}`;
    const request = id
      ? this.http.put<any>(url, payload, { headers: this.buildAuthHeaders() })
      : this.http.post<any>(url, payload, { headers: this.buildAuthHeaders() });

    return request.pipe(map((response) => response.item ?? response));
  }

  toggleStatus(kind: LocationKind, id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiUrl}admin/${kind}/${id}/status`,
      {},
      { headers: this.buildAuthHeaders() }
    );
  }

  delete(kind: LocationKind, id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}admin/${kind}/${id}`, {
      headers: this.buildAuthHeaders()
    });
  }

  countryOptions(): Observable<OptionItem[]> {
    return this.list('countries', { page: 1, perPage: 100, status: 'active' }).pipe(
      map((response) => response.items.map((item) => ({
        id: item.id,
        name: item.name,
        timezone: item.defaultTimezone
      })))
    );
  }

  stateOptions(countryId?: number | null): Observable<OptionItem[]> {
    return this.list('states', { page: 1, perPage: 100, status: 'active', countryId }).pipe(
      map((response) => response.items.map((item) => ({
        id: item.id,
        name: item.name,
        countryId: item.countryId,
        timezone: item.timezone
      })))
    );
  }

  timezoneOptions(): Observable<TimezoneOption[]> {
    return this.http.get<TimezoneOption[]>('assets/data/timezones.json');
  }

  private normalizeListResponse(response: LocationListResponse | { data?: LocationListResponse }): LocationListResponse {
    const payload = 'items' in response ? response : response.data;

    return {
      items: payload?.items ?? [],
      summary: payload?.summary ?? {},
      filterOptions: payload?.filterOptions ?? {},
      pagination: {
        page: payload?.pagination?.page ?? 1,
        perPage: payload?.pagination?.perPage ?? 10,
        total: payload?.pagination?.total ?? payload?.items?.length ?? 0,
        totalPages: payload?.pagination?.totalPages ?? 1
      }
    };
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.localStorageService.getItem<string>('accessToken');
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }
}
