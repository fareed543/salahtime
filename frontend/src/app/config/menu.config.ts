import { MenuConfigItem } from '../models/menu-config.model';

export const SIDEBAR_MENU_ITEMS: MenuConfigItem[] = [
  { labelKey: 'MENU.HOME', icon: 'bi-house-door', route: '/dashboard', enabled: true, exact: true },
  { labelKey: 'NAV.SALAH', icon: 'bi-clock-history', route: '/salahtime', enabled: true },
  { labelKey: 'MENU.SALAH_CALENDAR', icon: 'bi-calendar2-week', route: '/salah-calendar', enabled: true },
  { labelKey: 'MENU.RAMZAN_CALENDAR', icon: 'bi-moon-stars', route: '/ramzan', enabled: false },
  { labelKey: 'MENU.QIBLA_DIRECTION', icon: 'bi-compass', route: '/qibla-direction', enabled: true },
  { labelKey: 'MENU.TASBIH', icon: 'bi-circle-fill', route: '/tasbih', enabled: true },
  { labelKey: 'MENU.DUAS', icon: 'bi-book', route: '/duas', enabled: true },
  { code: 'programs', labelKey: 'MENU.PROGRAMS', icon: 'bi-calendar-event', route: '/programs', enabled: true },
  { code: 'masjid', labelKey: 'MENU.MASJID', icon: 'bi-building', route: '/masjid', enabled: true },
  { code: 'area', labelKey: 'MENU.HALQA', icon: 'bi-geo-alt', route: '/area', enabled: true },
  { labelKey: 'MENU.SETTINGS', icon: 'bi-gear', route: '/settings', enabled: true },
  { labelKey: 'MENU.ABOUT', icon: 'bi-info-circle', route: '/about', enabled: true },
  { labelKey: 'MENU.PRIVACY_POLICY', icon: 'bi-shield-check', route: '/privacy-policy', enabled: true }
];

export const SHORTCUT_MENU_ITEMS: MenuConfigItem[] = [
  { labelKey: 'MENU.HOME_SHORTCUT', icon: 'bi-house-door', route: '/dashboard', enabled: true },
  { labelKey: 'MENU.PRAYERS_SHORTCUT', icon: 'bi-clock-history', route: '/dashboard', enabled: true },
  { labelKey: 'MENU.QIBLA_SHORTCUT', icon: 'bi-compass', route: '/qibla-direction', enabled: true },
  { labelKey: 'MENU.TASBIH_SHORTCUT', icon: 'bi-circle-fill', route: '/tasbih', enabled: true },
  { labelKey: 'MENU.DUAS_SHORTCUT', icon: 'bi-book', route: '/duas', enabled: true },
  { labelKey: 'MENU.SALAH_CALENDAR_SHORTCUT', icon: 'bi-calendar2-week', route: '/salah-calendar', enabled: true }
];
