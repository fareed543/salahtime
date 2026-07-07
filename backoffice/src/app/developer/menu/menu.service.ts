import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environment/environment';
import { MenuItem } from './menu-item.model';

export interface FrontendMenuConfig {
  sidebarMenu: MenuItem[];
  shortcutMenu: MenuItem[];
  updatedAt?: string | null;
  updatedBy?: { id: number; name: string } | null;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private menuUrl = 'assets/data/menu.json';

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {}

  getMenu(): Observable<any> {
    return this.http.get<any>(this.menuUrl);
  }

  getFrontendMenuConfig(): Observable<FrontendMenuConfig> {
    return this.http.get<FrontendMenuConfig>(
      `${environment.apiUrl}admin/menu-config`,
      { headers: this.buildAuthHeaders() }
    );
  }

  saveFrontendMenuConfig(payload: FrontendMenuConfig): Observable<FrontendMenuConfig> {
    return this.http.post<FrontendMenuConfig>(
      `${environment.apiUrl}admin/save-menu-config`,
      payload,
      { headers: this.buildAuthHeaders() }
    );
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.localStorageService.getItem<string>('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });
  }
}
