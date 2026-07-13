import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { SIDEBAR_MENU_ITEMS, SHORTCUT_MENU_ITEMS } from '../config/menu.config';
import { MenuConfigItem } from '../models/menu-config.model';
import { environment } from 'src/environments/environment';

interface MenuConfigResponse {
  sidebarMenu?: MenuConfigItem[];
  shortcutMenu?: MenuConfigItem[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuConfigApiService {
  constructor(private http: HttpClient) {}

  getMenuConfig(): Observable<{ sidebarMenu: MenuConfigItem[]; shortcutMenu: MenuConfigItem[] }> {
    return this.http.get<MenuConfigResponse>(`${environment.apiUrl}http-menu/config`).pipe(
      map((response) => ({
        sidebarMenu: this.normalizeItems(response.sidebarMenu, SIDEBAR_MENU_ITEMS),
        shortcutMenu: this.normalizeItems(response.shortcutMenu, SHORTCUT_MENU_ITEMS),
      })),
      catchError(() => of({
        sidebarMenu: [...SIDEBAR_MENU_ITEMS],
        shortcutMenu: [...SHORTCUT_MENU_ITEMS],
      }))
    );
  }

  private normalizeItems(items: MenuConfigItem[] | undefined, fallback: MenuConfigItem[]): MenuConfigItem[] {
    if (!Array.isArray(items) || items.length === 0) {
      return [...fallback];
    }

    return [...items].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  }
}
