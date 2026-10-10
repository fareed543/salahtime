import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from '../services/local-storage.service';

export interface PageResponse<T> {
  items: T[];
  summary: Record<string, number>;
  pagination: { page: number; perPage: number; total: number; totalPages: number };
}

export type MasjidStatus = 'active' | 'inactive' | 'pending';

export type MasjidMadhab = 'hanafi' | 'shafi';

export const MASJID_MADHABS: Array<{ value: MasjidMadhab; label: string }> = [
  { value: 'hanafi', label: 'Hanafi' },
  { value: 'shafi', label: "Shafi'i" }
];

export function madhabLabel(madhab: MasjidMadhab | null | undefined): string {
  return MASJID_MADHABS.find((option) => option.value === madhab)?.label ?? 'Not set';
}

export function madhabBadgeClass(madhab: MasjidMadhab | null | undefined): string {
  return madhab === 'hanafi' ? 'bg-label-success' : madhab === 'shafi' ? 'bg-label-info' : 'bg-label-secondary';
}

export interface MasjidRow {
  id: number;
  status: MasjidStatus;
  name: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  isActive: boolean;
  ownerName: string;
  timingsCount: number;
  madhab: MasjidMadhab | null;
  imagesCount: number;
  updatedAt: string | null;
}

export interface MasjidTimingItem {
  salah: string;
  azan: string;
  jamat: string;
}

export interface MasjidCommitteeItem {
  name: string;
  role: string;
  phone: string;
}

/** Gallery photo; the server stores a 1280x720 crop plus a 480x270 thumbnail. */
export interface MasjidImage {
  id: number;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  sortOrder: number;
}

/** Draft read from a timing-board photo; nothing is saved until the form is saved with timingCaptureUrl. */
export interface MasjidTimingCapture {
  imageUrl: string;
  timings: MasjidTimingItem[];
  notes: string;
  readError: string | null;
}

export type MasjidTimingSource = 'manual' | 'capture' | 'restore' | 'admin' | 'initial';

export interface MasjidTimingVersion {
  id: number;
  versionNo: number;
  source: MasjidTimingSource;
  imageUrl: string | null;
  restoredFrom: number | null;
  createdBy: string | null;
  createdAt: string;
  isCurrent: boolean;
  timings: MasjidTimingItem[];
}

/** PUT payload: madhab '' clears it; timingCaptureUrl marks timings that came from a board photo. */
export type MasjidSavePayload = Partial<Omit<MasjidDetail, 'madhab'>> & { madhab?: MasjidMadhab | ''; timingCaptureUrl?: string };

export interface MasjidDetail {
  id: number;
  status: MasjidStatus;
  name: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isActive: boolean;
  idHalqa: number | null;
  ownerName: string;
  email: string;
  contact: string;
  location: string;
  facilities: Record<string, boolean>;
  timings: MasjidTimingItem[];
  committee: MasjidCommitteeItem[];
  madhab: MasjidMadhab | null;
  images: MasjidImage[];
  maxImages: number;
  timingVersion: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ProgramState = 'active' | 'ended' | 'inactive';

export interface ProgramRow {
  id: number;
  name: string;
  code: string;
  programType: 'general' | 'sehri' | 'iftar';
  status: string;
  state: ProgramState;
  startDate: string;
  endDate: string;
  ownerName: string;
  halqaName: string;
  memberCount: number;
  packetRecordCount: number;
}

export interface ProgramDetail extends Omit<ProgramRow, 'halqaName' | 'memberCount'> {
  idHalqa: number;
  contactNumber: string;
  email: string;
  description: string;
  registrationAllowed: boolean;
  waitlistEnabled: boolean;
  maxParticipants: number;
  members: { organizers: number; volunteers: number; subscribers: number };
  createdAt: string | null;
}

export interface OptionItem {
  id: number;
  name: string;
}

/** Back office API for masjid and program management (admin-community/*). */
@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly baseUrl = `${environment.apiUrl}admin-community`;

  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  listMasjids(filters: Record<string, string | number>): Observable<PageResponse<MasjidRow>> {
    return this.http.get<PageResponse<MasjidRow>>(`${this.baseUrl}/masjids`, this.options(filters))
      .pipe(map((response) => this.normalizePage(response)));
  }

  masjid(id: number): Observable<MasjidDetail> {
    return this.http.get<MasjidDetail>(`${this.baseUrl}/masjid/${id}`, this.options());
  }

  saveMasjid(id: number, payload: MasjidSavePayload): Observable<{ message: string; item: MasjidDetail }> {
    return this.http.put<{ message: string; item: MasjidDetail }>(`${this.baseUrl}/masjid/${id}`, payload, this.options());
  }

  /** Reads timings from a board photo (slow: an AI reads the image). Returns a draft only. */
  captureMasjidTimings(id: number, image: Blob): Observable<MasjidTimingCapture> {
    return this.http.post<MasjidTimingCapture>(`${this.baseUrl}/masjid-timing-capture/${id}`, this.imageForm(image, 'board.jpg'), this.options());
  }

  masjidTimingVersions(id: number): Observable<MasjidTimingVersion[]> {
    return this.http.get<{ versions: MasjidTimingVersion[] }>(`${this.baseUrl}/masjid-timing-versions/${id}`, this.options())
      .pipe(map((response) => response?.versions ?? []));
  }

  /** Restoring is saved as a new version, so it can itself be undone. */
  restoreMasjidTimings(id: number, versionId: number): Observable<{ message: string; item: MasjidDetail }> {
    return this.http.post<{ message: string; item: MasjidDetail }>(`${this.baseUrl}/masjid-timing-restore/${id}`, { versionId }, this.options());
  }

  uploadMasjidImage(id: number, image: Blob): Observable<MasjidImage> {
    return this.http.post<MasjidImage>(`${this.baseUrl}/masjid-images/${id}`, this.imageForm(image, 'photo.jpg'), this.options());
  }

  deleteMasjidImage(imageId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/masjid-image/${imageId}`, this.options());
  }

  /** Approves a pending masjid, otherwise toggles active/inactive. */
  toggleMasjidStatus(id: number): Observable<{ message: string; status: MasjidStatus; isActive: boolean }> {
    return this.http.patch<{ message: string; status: MasjidStatus; isActive: boolean }>(`${this.baseUrl}/masjid-status/${id}`, {}, this.options());
  }

  deleteMasjid(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/masjid/${id}`, this.options());
  }

  listPrograms(filters: Record<string, string | number>): Observable<PageResponse<ProgramRow>> {
    return this.http.get<PageResponse<ProgramRow>>(`${this.baseUrl}/programs`, this.options(filters))
      .pipe(map((response) => this.normalizePage(response)));
  }

  program(id: number): Observable<ProgramDetail> {
    return this.http.get<ProgramDetail>(`${this.baseUrl}/program/${id}`, this.options());
  }

  saveProgram(id: number, payload: Partial<ProgramDetail>): Observable<{ message: string; item: ProgramDetail }> {
    return this.http.put<{ message: string; item: ProgramDetail }>(`${this.baseUrl}/program/${id}`, payload, this.options());
  }

  deleteProgram(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/program/${id}`, this.options());
  }

  halqaOptions(): Observable<OptionItem[]> {
    return this.http.get<OptionItem[]>(`${this.baseUrl}/halqa-options`, this.options());
  }

  private options(filters: Record<string, string | number> = {}): { headers: HttpHeaders; params: HttpParams } {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    const token = this.localStorageService.getItem<string>('accessToken');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` }), params };
  }

  // No Content-Type header: the browser sets multipart/form-data with its boundary.
  private imageForm(image: Blob, fileName: string): FormData {
    const body = new FormData();
    body.append('image', image, image instanceof File ? image.name : fileName);
    return body;
  }

  private normalizePage<T>(response: PageResponse<T>): PageResponse<T> {
    return {
      items: response?.items ?? [],
      summary: response?.summary ?? {},
      pagination: {
        page: response?.pagination?.page ?? 1,
        perPage: response?.pagination?.perPage ?? 10,
        total: response?.pagination?.total ?? response?.items?.length ?? 0,
        totalPages: Math.max(response?.pagination?.totalPages ?? 1, 1)
      }
    };
  }
}
