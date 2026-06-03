import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuConfig } from '../models/menu-config.model';

@Injectable({
  providedIn: 'root'
})
export class MenuConfigService {
  constructor(private http: HttpClient) {}

  getMenuConfig(): Observable<MenuConfig> {
    return this.http.get<MenuConfig>('assets/menu-config.json');
  }
}
