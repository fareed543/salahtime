import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOGIN_REDIRECT } from './auth.interceptor';
import { MasjidImage, MasjidTimingCapture, MasjidTimingVersion } from '../models/masjid.model';

@Injectable({
  providedIn: 'root'
})
export class RamadanApiService {
  constructor(private http: HttpClient) {}

  // background: true for passive loads (Home card) that must not redirect to login on 401.
  programList(options: { background?: boolean } = {}): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/program-list`, {
      context: new HttpContext().set(SKIP_LOGIN_REDIRECT, !!options.background)
    });
  }

  getAllProgramsList(pincode: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/all-programs-list?pincode=${pincode}`);
  }

  programEnrollment(programId: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/program-enrollment`, {
      id_program: programId
    });
  }

  programDetails(id: string | number): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/program-details`, { id });
  }

  saveProgram(payload: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/save-program`, payload);
  }

  deleteProgram(id: string | number): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/delete-program`, { id });
  }

  halqaList(): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/area-list`);
  }

  /**
   * With `near`, only masjids within `radiusKm` of that point, nearest first (each with distanceKm).
   * With `ids`, only those masjids (favorites), wherever they are.
   */
  masjidList(options: { background?: boolean; near?: { lat: number; lng: number; radiusKm: number }; ids?: Array<string | number> } = {}): Observable<any> {
    const near = options.near;
    const params: Record<string, string> = near
      ? { lat: near.lat.toFixed(6), lng: near.lng.toFixed(6), radius: String(near.radiusKm) }
      : {};
    if (options.ids) {
      params['ids'] = options.ids.join(',');
    }
    return this.http.get(`${environment.apiUrl}http-ramadan/masjid-list`, {
      context: new HttpContext().set(SKIP_LOGIN_REDIRECT, !!options.background),
      params
    });
  }

  masjidDetails(id: string | number): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/masjid-details?id=${id}`);
  }

  /** Public page lookup: /masjid/<city>/<slug>. */
  masjidDetailsBySlug(city: string, slug: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/masjid-details`, { params: { city, slug } });
  }

  masjidUsers(masjidId: string | number): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/masjid-user-list?masjidId=${masjidId}`);
  }

  saveMasjid(payload: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/save-masjid`, payload);
  }

  deleteMasjid(id: string | number): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/delete-masjid`, { id });
  }

  /** Uploads a timing-board photo; returns draft timings to review (nothing is saved yet). */
  captureMasjidTimings(id: string | number, image: Blob): Observable<MasjidTimingCapture> {
    const payload = new FormData();
    payload.append('id', String(id));
    payload.append('image', image, 'timing-board.jpg');
    return this.http.post<MasjidTimingCapture>(`${environment.apiUrl}http-ramadan/masjid-timing-capture`, payload);
  }

  /** Saves timings confirmed from a board photo; open to any signed-in user. Returns the masjid details. */
  saveMasjidTimings(id: string | number, timings: any[], timingCaptureUrl: string): Observable<any> {
    const payload = new FormData();
    payload.append('id', String(id));
    payload.append('timings', JSON.stringify(timings));
    payload.append('timingCaptureUrl', timingCaptureUrl);
    return this.http.post(`${environment.apiUrl}http-ramadan/save-masjid-timings`, payload);
  }

  masjidTimingVersions(id: string | number): Observable<{ versions: MasjidTimingVersion[] }> {
    return this.http.get<{ versions: MasjidTimingVersion[] }>(`${environment.apiUrl}http-ramadan/masjid-timing-versions?id=${id}`);
  }

  /** Returns the masjid details with the restored timings. */
  restoreMasjidTimingVersion(id: string | number, versionId: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/masjid-timing-restore`, { id, versionId });
  }

  uploadMasjidImage(id: string | number, image: Blob): Observable<MasjidImage> {
    const payload = new FormData();
    payload.append('id', String(id));
    payload.append('image', image, 'masjid-photo.jpg');
    return this.http.post<MasjidImage>(`${environment.apiUrl}http-ramadan/masjid-image-upload`, payload);
  }

  deleteMasjidImage(id: string | number, imageId: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/masjid-image-delete`, { id, imageId });
  }

  /* ------------------------------------------------ NF-012 program console */

  /** Active programs open to the viewer with a halqa masjid within the program's range. Works for guests. */
  programsNear(lat: number, lng: number): Observable<{ list: any[] }> {
    return this.http.get<{ list: any[] }>(`${environment.apiUrl}http-ramadan/programs-near`, {
      context: new HttpContext().set(SKIP_LOGIN_REDIRECT, true),
      params: { lat: lat.toFixed(6), lng: lng.toFixed(6) }
    });
  }

  /** Area type-ahead: the nearest city to lat/lng plus areas near the user, or matching q (in idCity). */
  areaSuggest(options: { lat?: number; lng?: number; q?: string; idCity?: number }): Observable<any> {
    const params: Record<string, string> = {};
    if (options.lat !== undefined && options.lng !== undefined) {
      params['lat'] = options.lat.toFixed(6);
      params['lng'] = options.lng.toFixed(6);
    }
    if (options.q) {
      params['q'] = options.q;
    }
    if (options.idCity) {
      params['id_city'] = String(options.idCity);
    }
    return this.http.get(`${environment.apiUrl}http-ramadan/area-suggest`, { params });
  }

  citySearch(q: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/city-search`, { params: { q } });
  }

  /** Team sees everyone with contact details; a member sees only their own gender. */
  programMembers(programId: string | number, gender?: 'm' | 'f' | ''): Observable<any> {
    const params: Record<string, string> = { id_program: String(programId) };
    if (gender) {
      params['gender'] = gender;
    }
    return this.http.get(`${environment.apiUrl}http-ramadan/program-members`, { params });
  }

  programMemberSearch(programId: string | number, query: string): Observable<{ list: any[] }> {
    return this.http.get<{ list: any[] }>(`${environment.apiUrl}http-ramadan/program-member-search`, {
      params: { id_program: String(programId), query }
    });
  }

  /** role 2 volunteer, 3 subscriber, 0 remove. */
  setProgramMemberRole(programId: string | number, customerId: number, role: 0 | 2 | 3): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/program-member-role`, {
      id_program: Number(programId), id_customer: customerId, role
    });
  }

  addProgramMember(programId: string | number, member: { firstname: string; lastname: string; phone: string; gender: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/program-add-member`, { id_program: Number(programId), ...member });
  }

  programMemberProfile(programId: string | number, customerId: number): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/program-member-profile`, {
      params: { id_program: String(programId), id_customer: String(customerId) }
    });
  }

  saveProgramMemberProfile(programId: string | number, customerId: number, profile: Record<string, unknown>): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/save-program-member-profile`, {
      ...profile, id_program: Number(programId), id_customer: customerId
    });
  }

  programPackets(programId: string | number, date: string, gender?: 'm' | 'f' | ''): Observable<any> {
    const params: Record<string, string> = { id_program: String(programId), date };
    if (gender) {
      params['gender'] = gender;
    }
    return this.http.get(`${environment.apiUrl}http-ramadan/program-packets`, { params });
  }

  savePackets(programId: string | number, date: string, entries: Array<{ id_customer: number; packets: number; token?: number | null }>): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/save-packets`, { id_program: Number(programId), date, entries });
  }

  programStats(programId: string | number): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/program-stats`, { params: { id_program: String(programId) } });
  }

  masjidMembers(masjidId: string | number, gender?: 'm' | 'f' | ''): Observable<any> {
    const params: Record<string, string> = { masjidId: String(masjidId) };
    if (gender) {
      params['gender'] = gender;
    }
    return this.http.get(`${environment.apiUrl}http-ramadan/masjid-user-list`, { params });
  }

  getSubscribers(programId?: string | number): Observable<any> {
    const url =
      programId && programId !== 'all'
        ? `${environment.apiUrl}http-ramadan/users?programId=${programId}`
        : `${environment.apiUrl}http-ramadan/users`;
    return this.http.get(url);
  }
}
