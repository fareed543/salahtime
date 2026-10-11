import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from '../services/local-storage.service';

export type LocationKind = 'countries' | 'cities';

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
  };
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface LocationReleaseItem {
  version: number;
  fileName: string;
  url: string;
  checksum: string;
  countryCount: number;
  cityCount: number;
  changes: { added: number; removed: number; updated: number } | null;
  notes: string | null;
  releasedBy: string | null;
  releasedAt: string;
}

export interface LocationReleaseStatus {
  latest: LocationReleaseItem | null;
  draft: {
    cityCount: number;
    countryCount: number;
    checksum: string;
    upToDate: boolean;
    comparedWith: number | null;
    changes: {
      added: string[];
      removed: string[];
      updated: string[];
      counts: { added: number; removed: number; updated: number };
    };
  };
  history: LocationReleaseItem[];
  tableReady: boolean;
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

    return this.http.get<LocationListResponse | { data?: LocationListResponse }>(`${environment.apiUrl}admin-locations/${kind}`, {
      headers: this.buildAuthHeaders(),
      params
    }).pipe(map((response) => this.normalizeListResponse(response)));
  }

  detail(kind: LocationKind, id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}admin-locations/${this.getSingularKind(kind)}/${id}`, {
      headers: this.buildAuthHeaders()
    });
  }

  save(kind: LocationKind, payload: any, id?: number | null): Observable<any> {
    const baseUrl = `${environment.apiUrl}admin-locations`;
    const url = id ? `${baseUrl}/${this.getSingularKind(kind)}/${id}` : `${baseUrl}/${kind}`;
    const request = id
      ? this.http.put<any>(url, payload, { headers: this.buildAuthHeaders() })
      : this.http.post<any>(url, payload, { headers: this.buildAuthHeaders() });

    return request.pipe(map((response) => response.item ?? response));
  }

  toggleStatus(kind: LocationKind, id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiUrl}admin-locations/${this.getSingularKind(kind)}/${id}/status`,
      {},
      { headers: this.buildAuthHeaders() }
    );
  }

  delete(kind: LocationKind, id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}admin-locations/${this.getSingularKind(kind)}/${id}`, {
      headers: this.buildAuthHeaders()
    });
  }

  bulkDelete(kind: LocationKind, ids: number[]): Observable<{ message: string; deletedCount: number }> {
    return this.http.post<{ message: string; deletedCount: number }>(
      `${environment.apiUrl}admin-locations/bulk-delete`,
      { kind, ids },
      { headers: this.buildAuthHeaders() }
    );
  }

  releaseStatus(): Observable<LocationReleaseStatus> {
    return this.http.get<LocationReleaseStatus>(`${environment.apiUrl}admin-locations/release`, {
      headers: this.buildAuthHeaders()
    });
  }

  release(notes: string): Observable<{ message: string; release: LocationReleaseItem }> {
    return this.http.post<{ message: string; release: LocationReleaseItem }>(
      `${environment.apiUrl}admin-locations/release`,
      { notes },
      { headers: this.buildAuthHeaders() }
    );
  }

  /** The JSON a release would publish now (auth needed, so fetched as a blob rather than a plain link). */
  releasePreview(): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}admin-locations/release-preview`, {
      headers: this.buildAuthHeaders(),
      responseType: 'blob'
    });
  }

  countryOptions(): Observable<OptionItem[]> {
    return this.list('countries', { page: 1, perPage: 100, status: 'active' }).pipe(
      map((response) => response.items.map((item) => ({
        id: item.id,
        name: item.name,
        timezone: item.timezone
      })))
    );
  }

  timezoneOptions(): Observable<TimezoneOption[]> {
    return this.http.get<TimezoneOption[]>('/assets/data/timezones.json').pipe(
      map((items) => (items ?? [])
        .map((item) => ({
          value: item?.value ?? '',
          name: item?.name ?? item?.value ?? '',
          description: item?.description ?? '',
          label: item?.label ?? ([item?.name ?? '', item?.description ?? ''].filter(Boolean).join(' - ') || (item?.value ?? '')),
          offset: item?.offset ?? ''
        }))
        .filter((item) => item.value !== '')
        .sort((left, right) => left.label.localeCompare(right.label)))
    );
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

  private getSingularKind(kind: LocationKind): 'country' | 'city' {
    return kind === 'cities' ? 'city' : 'country';
  }
}
