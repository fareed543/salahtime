import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ManagedMenuResponse, MenuConfig, MenuConfigItem } from '../models/menu-config.model';

@Injectable({
  providedIn: 'root'
})
export class MenuConfigService {
  constructor(private http: HttpClient) {}

  getMenuConfig(): Observable<MenuConfig> {
    return this.http.get<ManagedMenuResponse>(`${environment.apiUrl}http-menu`).pipe(
      map((response) => this.composeMenuConfig(response.modules ?? [])),
      catchError(() => of(this.composeMenuConfig([])))
    );
  }

  getManagedModules(): Observable<MenuConfigItem[]> {
    return this.http.get<ManagedMenuResponse>(`${environment.apiUrl}http-menu`).pipe(
      map((response) => response.modules ?? [])
    );
  }

  saveManagedModules(modules: MenuConfigItem[]): Observable<ManagedMenuResponse> {
    return this.http.post<ManagedMenuResponse>(`${environment.apiUrl}http-menu/save`, {
      modules: modules.map((module) => ({
        code: module.code,
        enabled: module.enabled,
        sortOrder: module.sortOrder ?? 0
      }))
    });
  }

  private composeMenuConfig(modules: MenuConfigItem[]): MenuConfig {
    const functionalSidebar: MenuConfigItem[] = [
      { labelKey: 'MENU.HOME', icon: 'bi-house-door', route: '/dashboard', enabled: true, exact: true },
      { labelKey: 'MENU.SALAH_CALENDAR', icon: 'bi-calendar2-week', route: '/salah-calendar', enabled: true },
      { labelKey: 'MENU.RAMZAN_CALENDAR', icon: 'bi-moon-stars', route: '/ramzan', enabled: false },
      { labelKey: 'MENU.QIBLA_DIRECTION', icon: 'bi-compass', route: '/qibla-direction', enabled: true },
      { labelKey: 'MENU.TASBIH', icon: 'bi-circle-fill', route: '/tasbih', enabled: true },
      { labelKey: 'MENU.DUAS', icon: 'bi-book', route: '/duas', enabled: true }
    ];

    const staticSidebar: MenuConfigItem[] = [
      { labelKey: 'MENU.SETTINGS', icon: 'bi-gear', route: '/settings', enabled: true },
      { labelKey: 'MENU.ABOUT', icon: 'bi-info-circle', route: '/about', enabled: true },
      { labelKey: 'MENU.PRIVACY_POLICY', icon: 'bi-shield-check', route: '/privacy-policy', enabled: true }
    ];

    const staticShortcuts: MenuConfigItem[] = [
      { labelKey: 'MENU.HOME_SHORTCUT', icon: 'bi-house-door', route: '/dashboard', enabled: true },
      { labelKey: 'MENU.PRAYERS_SHORTCUT', icon: 'bi-clock-history', route: '/dashboard', enabled: true },
      { labelKey: 'MENU.QIBLA_SHORTCUT', icon: 'bi-compass', route: '/qibla-direction', enabled: true },
      { labelKey: 'MENU.TASBIH_SHORTCUT', icon: 'bi-circle-fill', route: '/tasbih', enabled: true },
      { labelKey: 'MENU.DUAS_SHORTCUT', icon: 'bi-book', route: '/duas', enabled: true },
      { labelKey: 'MENU.SALAH_CALENDAR_SHORTCUT', icon: 'bi-calendar2-week', route: '/salah-calendar', enabled: true }
    ];

    const dynamicSidebar = [...modules]
      .filter((module) => !['masjid', 'zakat-calculator'].includes(module.code ?? ''))
      .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0))
      .map((module) => ({
        ...module,
        enabled: !!module.enabled
      }));

    return {
      sidebar: [...functionalSidebar, ...dynamicSidebar, ...staticSidebar],
      shortcuts: staticShortcuts
    };
  }
}
