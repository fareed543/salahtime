import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { SIDEBAR_MENU_ITEMS, SHORTCUT_MENU_ITEMS } from '../config/menu.config';
import { MenuConfigItem } from '../models/menu-config.model';
import { environment } from 'src/environments/environment';

interface MenuConfigResponse {
  sidebarMenu?: MenuConfigItem[];
  shortcutMenu?: MenuConfigItem[];
}

interface MenuConfigPayload {
  sidebarMenu: MenuConfigItem[];
  shortcutMenu: MenuConfigItem[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuConfigApiService {
  private readonly sessionCacheKey = 'menu_config_session_cache';
  private readonly menuConfigAssetUrl = 'assets/menu-config.json';
  private menuConfig$?: Observable<MenuConfigPayload>;

  constructor(private http: HttpClient) {}

  getMenuConfig(): Observable<MenuConfigPayload> {
    if (this.menuConfig$) {
      return this.menuConfig$;
    }

    const cached = this.getSessionCache();
    if (cached) {
      this.menuConfig$ = of(cached).pipe(shareReplay(1));
      return this.menuConfig$;
    }

    this.menuConfig$ = this.http.get<MenuConfigResponse>(this.menuConfigAssetUrl).pipe(
      map((response) => ({
        sidebarMenu: this.normalizeItems(response.sidebarMenu, SIDEBAR_MENU_ITEMS),
        shortcutMenu: this.normalizeItems(response.shortcutMenu, SHORTCUT_MENU_ITEMS),
      })),
      tap((config) => this.saveSessionCache(config)),
      catchError(() => of({
        sidebarMenu: [...SIDEBAR_MENU_ITEMS],
        shortcutMenu: [...SHORTCUT_MENU_ITEMS],
      })),
      shareReplay(1)
    );

    return this.menuConfig$;
  }

  clearMenuConfigCache(): void {
    this.menuConfig$ = undefined;
    sessionStorage.removeItem(this.sessionCacheKey);
  }

  private normalizeItems(items: MenuConfigItem[] | undefined, fallback: MenuConfigItem[]): MenuConfigItem[] {
    if (!Array.isArray(items) || items.length === 0) {
      return [...fallback];
    }

    return [...items].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  }

  private getSessionCache(): MenuConfigPayload | null {
    const raw = sessionStorage.getItem(this.sessionCacheKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as MenuConfigPayload;
      return {
        sidebarMenu: this.normalizeItems(parsed.sidebarMenu, SIDEBAR_MENU_ITEMS),
        shortcutMenu: this.normalizeItems(parsed.shortcutMenu, SHORTCUT_MENU_ITEMS),
      };
    } catch {
      sessionStorage.removeItem(this.sessionCacheKey);
      return null;
    }
  }

  private saveSessionCache(config: MenuConfigPayload): void {
    sessionStorage.setItem(this.sessionCacheKey, JSON.stringify(config));
  }
}
