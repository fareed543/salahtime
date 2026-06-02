import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RamadanApiService {
  constructor(private http: HttpClient) {}

  programList(): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/program-list`);
  }

  getAllProgramsList(pincode: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/all-programs-list?pincode=${pincode}`);
  }

  programEnrollment(programId: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-ramadan/program-enrollment`, {
      id_program: programId
    });
  }

  halqaList(): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/halqa-list`);
  }

  masjidList(): Observable<any> {
    return this.http.get(`${environment.apiUrl}http-ramadan/masjid-list`);
  }

  getSubscribers(programId?: string | number): Observable<any> {
    const url =
      programId && programId !== 'all'
        ? `${environment.apiUrl}http-ramadan/users?programId=${programId}`
        : `${environment.apiUrl}http-ramadan/users`;
    return this.http.get(url);
  }
}
