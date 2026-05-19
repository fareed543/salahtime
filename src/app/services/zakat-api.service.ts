import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ZakatApiService {
  constructor(private http: HttpClient) {}

  getCities(): Observable<any> {
    return this.http.get(`${environment.apiUrl}zakat/city-list`);
  }

  getLocationPrices(cityId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}zakat/location-prices?city=${cityId}`);
  }

  getCategories(): Observable<any> {
    return this.http.get(`${environment.apiUrl}zakat/zakat-categories`);
  }
}
