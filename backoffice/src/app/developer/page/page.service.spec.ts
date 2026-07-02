import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageItem } from './page-item.model';

@Injectable({
  providedIn: 'root'
})
export class PageService {
  private jsonUrl = 'assets/data/page-data.json';

  constructor(private http: HttpClient) {}

  getPages(): Observable<PageItem[]> {
    return this.http.get<PageItem[]>(this.jsonUrl);
  }
}
