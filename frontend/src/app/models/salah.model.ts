export interface SalahTime {
  start: Date;
  end: Date;
  type: string;
  icon: string; 
  color: string;
}

export interface SalahCoordinates {
  latitude: number;
  longitude: number;
}

export interface SalahLocationCity {
  city: string;
  state?: string;
  country?: string;
  pincode?: string;
  coordinates: SalahCoordinates;
}

export interface SalahLocationSelection {
  source: 'manual' | 'auto';
  city: SalahLocationCity;
}

export interface SalahLocationSnapshot {
  currentCityId: string;
  currentLat: number;
  currentLon: number;
  timezone: string;
  lastUpdated: string;
}

export interface SalahRakatDetail {
  label: string;
  type: 'sunnat-mokeda' | 'farz' | 'sunnat' | 'wajib' | 'nafil';
  count: number;
}

export interface SalahDetailContent {
  name: string;
  rakats: SalahRakatDetail[];
  timeText?: string;
  note?: string;
  reminder?: {
    title: string;
    body: string;
  };
}


export type SalahKey =
  | 'sahri'
  | 'fajr'
  | 'tulu'
  | 'ishraq'
  | 'chast'
  | 'zawal'
  | 'dhuhr'
  | 'asr'
  | 'gurub'
  | 'iftar'
  | 'maghrib'
  | 'awabin'
  | 'isha'
  | 'tahajjud';


export const SALAH_ORDER: ReadonlyArray<SalahKey> = [
  'tahajjud',
  'sahri',
  'fajr',
  'tulu',
  'ishraq',
  'chast',
  'zawal',
  'dhuhr',
  'asr',
  'gurub',
  'maghrib',
  'awabin',
  'iftar',
  'isha'
];

export interface SalahMethodConfig {
  id: string;                // Unique identifier
  translationKey: string;    // Key to use with ngx-translate
  name?: string;             // Optional, can keep for fallback or legacy
  enabled: boolean;
  angles: {
    fajr: number;
    isha: number;
  };
  fixedIshaMinutes?: number; // Optional

}


export const SettingsData: SalahMethodConfig[] = [
  { id: "mwl", translationKey: "CALC_METHOD_MWL", enabled: true, angles: { fajr: 18, isha: 17 } },
  { id: "isna", translationKey: "CALC_METHOD_ISNA", enabled: true, angles: { fajr: 15, isha: 15 } },
  { id: "egypt", translationKey: "CALC_METHOD_EGYPT", enabled: true, angles: { fajr: 19.5, isha: 17.5 } },
  { id: "karachi", translationKey: "CALC_METHOD_KARACHI", enabled: true, angles: { fajr: 18, isha: 18 } },
  { id: "makkah", translationKey: "CALC_METHOD_MAKKAH", enabled: true, angles: { fajr: 18.5, isha: 0 }, fixedIshaMinutes: 90 },
  { id: "gulf", translationKey: "CALC_METHOD_GULF", enabled: true, angles: { fajr: 18, isha: 18 } },
  { id: "mcc", translationKey: "CALC_METHOD_MCC", enabled: true, angles: { fajr: 18, isha: 17 } },
  { id: "fcna", translationKey: "CALC_METHOD_FCNA", enabled: true, angles: { fajr: 15, isha: 15 } },
  { id: "jakim", translationKey: "CALC_METHOD_JAKIM", enabled: true, angles: { fajr: 20, isha: 18 } },
  { id: "diyanet", translationKey: "CALC_METHOD_DIYANET", enabled: true, angles: { fajr: 18, isha: 17 } },
  { id: "muis", translationKey: "CALC_METHOD_MUIS", enabled: true, angles: { fajr: 20, isha: 18 } },
  { id: "tehran", translationKey: "CALC_METHOD_TEHRAN", enabled: true, angles: { fajr: 17.7, isha: 14 } },
  { id: "kuwait", translationKey: "CALC_METHOD_KUWAIT", enabled: true, angles: { fajr: 18, isha: 17.5 } },
  { id: "qatar", translationKey: "CALC_METHOD_QATAR", enabled: true, angles: { fajr: 18, isha: 18 } }
];



export interface SalahSettings {
  calculationMethod: string;
  madhab: string;
  locationMode: string;
  location: SalahLocationSelection | null;
  city: any;
  locationSnapshot?: SalahLocationSnapshot | null;
  enableNotifications: boolean;
  showHijri: boolean;
  hijriOffset: number;

  sahriOffset: number;
  fajrOffset: number;
  dhuhrOffset: number;
  asrOffset: number;
  iftarOffset: number;
  maghribOffset: number;
  ishaOffset: number;
}
export const SALAH_DETAILS: Record<SalahKey, SalahDetailContent> = {
  sahri: {
    name: 'Sahri',
    rakats: [],
    reminder: {
      title: 'Sahri Reminder',
      body: 'Take suhoor, for there is blessing in the pre-dawn meal.'
    }
  },
  fajr: {
    name: 'Fajr',
    rakats: [
      { label: 'Sunnah Mu’akkadah', type: 'sunnat-mokeda', count: 2 },
      { label: 'Fard', type: 'farz', count: 2 }
    ],
    timeText: 'From true dawn (Subh Sadiq) until just before sunrise.',
    reminder: {
      title: 'Fajr Reminder',
      body: 'The two rakahs before Fajr are better than the world and all it contains.'
    }
  },
  tulu: {
    name: 'Tulu',
    rakats: [],
    reminder: {
      title: 'Sunrise Reminder',
      body: 'Use this time for reflection and remembrance after the night worship ends.'
    }
  },
  ishraq: {
    name: 'Ishraq',
    rakats: [
      { label: 'Nafl', type: 'nafil', count: 2 },
      { label: 'Nafl', type: 'nafil', count: 2 }
    ],
    timeText: '~15–20 minutes after sunrise.',
    reminder: {
      title: 'Ishraq Reminder',
      body: 'Who remembers Allah after Fajr and then prays after sunrise earns great reward.'
    }
  },
  chast: {
    name: 'Chasht / Duha',
    rakats: [
      { label: 'Nafl', type: 'nafil', count: 2 },
      { label: 'Nafl', type: 'nafil', count: 2 }
    ],
    timeText: 'After Ishraaq until before Dhuhr.',
    note: 'Minimum 2 rak’ah, and more may be prayed in pairs.',
    reminder: {
      title: 'Chast Reminder',
      body: 'Duha prayer is a charity on every joint of the body and a sign of gratitude.'
    }
  },
  zawal: {
    name: 'Zawal',
    rakats: [],
    reminder: {
      title: 'Zawal Reminder',
      body: 'Pause at this time and prepare the heart for the coming prayer of Dhuhr.'
    }
  },
  dhuhr: {
    name: 'Dhuhr',
    rakats: [
      { label: 'Sunnah Mu’akkadah', type: 'sunnat-mokeda', count: 4 },
      { label: 'Fard', type: 'farz', count: 4 },
      { label: 'Sunnah Mu’akkadah', type: 'sunnat-mokeda', count: 2 },
      { label: 'Nafl', type: 'nafil', count: 2 }
    ],
    timeText: 'After zawal (sun passes zenith) until Asr.',
    reminder: {
      title: 'Dhuhr Reminder',
      body: 'Guard the middle prayer with care and stand before Allah with devotion.'
    }
  },
  asr: {
    name: 'Asr',
    rakats: [
      { label: 'Sunnah Ghair Mu’akkadah', type: 'sunnat', count: 4 },
      { label: 'Fard', type: 'farz', count: 4 }
    ],
    timeText: 'From late afternoon until just before sunset.',
    reminder: {
      title: 'Asr Reminder',
      body: 'Whoever preserves the Asr prayer protects one of the most emphasized daily prayers.'
    }
  },
  gurub: {
    name: 'Gurub',
    rakats: [],
    reminder: {
      title: 'Sunset Reminder',
      body: 'As the sun sets, renew remembrance and prepare for Maghrib without delay.'
    }
  },
  iftar: {
    name: 'Iftar',
    rakats: [],
    reminder: {
      title: 'Iftar Reminder',
      body: 'The fasting person has a supplication at iftar that is not turned away.'
    }
  },
  maghrib: {
    name: 'Maghrib',
    rakats: [
      { label: 'Fard', type: 'farz', count: 3 },
      { label: 'Sunnah Mu’akkadah', type: 'sunnat-mokeda', count: 2 },
      { label: 'Nafl', type: 'nafil', count: 2 }
    ],
    timeText: 'Just after sunset until twilight disappears.',
    reminder: {
      title: 'Maghrib Reminder',
      body: 'Hasten to Maghrib when its time enters and welcome the evening with prayer.'
    }
  },
  awabin: {
    name: 'Salat al-Awwabin',
    rakats: [
      { label: 'Nafl', type: 'nafil', count: 2 },
      { label: 'Nafl', type: 'nafil', count: 2 },
      { label: 'Nafl', type: 'nafil', count: 2 }
    ],
    timeText: 'After Maghrib Sunnah, before Isha.',
    reminder: {
      title: 'Awabin Reminder',
      body: 'Extra prayer after Maghrib is a beautiful way to continue turning back to Allah.'
    }
  },
  isha: {
    name: 'Isha',
    rakats: [
      { label: 'Sunnah Mu’akkadah', type: 'sunnat-mokeda', count: 4 },
      { label: 'Fard', type: 'farz', count: 4 },
      { label: 'Sunnah Mu’akkadah', type: 'sunnat-mokeda', count: 2 },
      { label: 'Nafl', type: 'nafil', count: 2 }
    ],
    timeText: 'After twilight disappears until midnight (or before Fajr).',
    note: 'Witr after Isha: 3 rak’ah, commonly prayed as 2 + 1 with salam in between.',
    reminder: {
      title: 'Isha Reminder',
      body: 'Praying Isha in congregation carries immense reward and closes the day in worship.'
    }
  },
  tahajjud: {
    name: 'Tahajjud',
    rakats: [
      { label: 'Nafl', type: 'nafil', count: 2 },
      { label: 'Nafl', type: 'nafil', count: 2 },
      { label: 'Nafl', type: 'nafil', count: 2 },
      { label: 'Nafl', type: 'nafil', count: 2 }
    ],
    timeText: 'After Isha, preferably last third of night, before Fajr.',
    note: 'Minimum 2 rak’ah, and more may be prayed in pairs.',
    reminder: {
      title: 'Tahajjud Reminder',
      body: 'The best prayer after the obligatory prayers is the night prayer.'
    }
  }
};

export const JUMUAH_DETAIL: SalahDetailContent = {
  name: 'Jumu’ah',
  rakats: [
    { label: 'Sunnah', type: 'sunnat', count: 4 },
    { label: 'Fard', type: 'farz', count: 2 },
    { label: 'Sunnah', type: 'sunnat', count: 4 },
    { label: 'Sunnah', type: 'sunnat', count: 2 },
    { label: 'Nafl', type: 'nafil', count: 2 }
  ],
  timeText: 'Jumu’ah replaces Dhuhr on Fridays.',
  note: 'Jumu’ah replaces Dhuhr on Fridays.',
  reminder: {
    title: 'Jumu’ah Reminder',
    body: 'Prepare early for the khutbah and congregational prayer, and honor the blessings of Friday.'
  }
};

export function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

export function getSalahDetail(
  key: SalahKey,
  date: Date = new Date()
): SalahDetailContent | null {
  if (key === 'dhuhr' && isFriday(date)) {
    return JUMUAH_DETAIL;
  }

  return SALAH_DETAILS[key] ?? null;
}

export function getSalahName(
  key: SalahKey,
  date: Date = new Date()
): string {
  return getSalahDetail(key, date)?.name ?? key;
}
