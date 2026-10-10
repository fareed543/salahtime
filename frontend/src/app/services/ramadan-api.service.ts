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

  masjidList(options: { background?: boolean } = {}): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/masjid-list`, {
      context: new HttpContext().set(SKIP_LOGIN_REDIRECT, !!options.background)
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

  getSubscribers(programId?: string | number): Observable<any> {
    const url =
      programId && programId !== 'all'
        ? `${environment.apiUrl}http-ramadan/users?programId=${programId}`
        : `${environment.apiUrl}http-ramadan/users`;
    return this.http.get(url);
  }
}
