import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
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
    private localStorageService: LocalStorageService,
    private authorizationService: AuthorizationService
  ) {}

  getMenu(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(this.menuUrl).pipe(
      map((items) => this.filterMenuItems(items ?? []))
    );
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

  private filterMenuItems(items: MenuItem[]): MenuItem[] {
    return items.reduce<MenuItem[]>((accumulator, item) => {
      if (item.header) {
        accumulator.push({ ...item });
        return accumulator;
      }

      const children = item.children ? this.filterMenuItems(item.children) : undefined;
      const hasVisibleChildren = !!children?.length;
      const hasRoleAccess = this.authorizationService.hasAnyRole(item.allowedRoles);
      const canShowItem = hasVisibleChildren || hasRoleAccess;

      if (!canShowItem) {
        return accumulator;
      }

      accumulator.push({
        ...item,
        children,
      });

      return accumulator;
    }, []);
  }
}
