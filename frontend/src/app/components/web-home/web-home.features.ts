/** NF-020: feature tiles and app benefits on the website home. Texts are WEB_HOME.* translation keys. */

export interface WebHomeFeature {
  key: string;
  /** bootstrap-icons class */
  icon: string;
  route: string;
  /** Shown with an APP badge: only the Android app has it. */
  appOnly?: boolean;
}

export const WEB_HOME_FEATURES: WebHomeFeature[] = [
  { key: 'PRAYER_TIMES', icon: 'bi-clock', route: '/prayer-times' },
  { key: 'TIMETABLE', icon: 'bi-calendar3', route: '/salah-calendar' },
  { key: 'AZAN_ALARM', icon: 'bi-alarm', route: '/settings', appOnly: true },
  { key: 'QIBLA', icon: 'bi-compass', route: '/qibla-direction' },
  { key: 'ZIKAR', icon: 'bi-flower1', route: '/tasbih' },
  { key: 'DUAS', icon: 'bi-journal-richtext', route: '/duas' },
  { key: 'SHORTS', icon: 'bi-collection-play', route: '/shorts' },
  { key: 'MASJIDS', icon: 'bi-buildings', route: '/masjid' },
  { key: 'RAMADAN', icon: 'bi-moon-stars', route: '/sehri-iftar' },
  { key: 'LANGUAGES', icon: 'bi-translate', route: '/settings' }
];

export const WEB_HOME_APP_PERKS: string[] = ['ALARM', 'OFFLINE', 'ZIKAR', 'UPDATES'];
