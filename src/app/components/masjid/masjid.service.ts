import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Masjid } from './masjid.model';

@Injectable({
  providedIn: 'root'
})
export class MasjidService {

  private apiUrl = 'https://walletplus.in/http-ramadan/user-masjid-list';

  constructor(private http: HttpClient) {}

  getMasjidList(): Observable<Masjid[]> {
    return this.http.get<Masjid[]>(this.apiUrl);
  }
}