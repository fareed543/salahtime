export interface SalahTime {
  start: Date;
  end: Date;
  type: string;
  icon: string; 
  color: string;
}

export interface SalahRakatDetail {
  label: string;
  type: 'sunnat-mokeda' | 'farz' | 'sunnat' | 'wajib' | 'nafil';
  count: number;
}

export interface SalahDetailContent {
  name: string;
  rakats: SalahRakatDetail[];
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
  'isha',
  'tahajjud'
];

export const DEFAULT_VISIBLE_SALAH_TIMINGS: Record<SalahKey, boolean> = {
  sahri: false,
  fajr: true,
  tulu: true,
  ishraq: false,
  chast: false,
  zawal: false,
  dhuhr: true,
  asr: true,
  gurub: false,
  maghrib: true,
  awabin: false,
  iftar: false,
  isha: true,
  tahajjud: false
};

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
  showAllSalahTimings: boolean;
  visibleSalahTimings: Record<SalahKey, boolean>;
  madhab: string;
  locationMode: string;
  location : any;
  city: any;
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

export function isSalahTimingVisible(
  settings: SalahSettings | null | undefined,
  key: SalahKey
): boolean {
  if (settings?.showAllSalahTimings) {
    return true;
  }

  return settings?.visibleSalahTimings?.[key] ?? DEFAULT_VISIBLE_SALAH_TIMINGS[key];
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
      { label: 'Sunnat Mokeda', type: 'sunnat-mokeda', count: 2 },
      { label: 'Farz', type: 'farz', count: 2 }
    ],
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
      { label: 'Nafil', type: 'nafil', count: 2 }
    ],
    reminder: {
      title: 'Ishraq Reminder',
      body: 'Who remembers Allah after Fajr and then prays after sunrise earns great reward.'
    }
  },
  chast: {
    name: 'Chast',
    rakats: [
      { label: 'Nafil', type: 'nafil', count: 4 }
    ],
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
      { label: 'Sunnat Mokeda', type: 'sunnat-mokeda', count: 4 },
      { label: 'Farz', type: 'farz', count: 4 },
      { label: 'Sunnat Mokeda', type: 'sunnat-mokeda', count: 2 },
      { label: 'Nafil', type: 'nafil', count: 2 }
    ],
    reminder: {
      title: 'Dhuhr Reminder',
      body: 'Guard the middle prayer with care and stand before Allah with devotion.'
    }
  },
  asr: {
    name: 'Asr',
    rakats: [
      { label: 'Sunnat', type: 'sunnat', count: 4 },
      { label: 'Farz', type: 'farz', count: 4 }
    ],
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
      { label: 'Farz', type: 'farz', count: 3 },
      { label: 'Sunnat Mokeda', type: 'sunnat-mokeda', count: 2 },
      { label: 'Nafil', type: 'nafil', count: 2 }
    ],
    reminder: {
      title: 'Maghrib Reminder',
      body: 'Hasten to Maghrib when its time enters and welcome the evening with prayer.'
    }
  },
  awabin: {
    name: 'Awabin',
    rakats: [
      { label: 'Nafil', type: 'nafil', count: 6 }
    ],
    reminder: {
      title: 'Awabin Reminder',
      body: 'Extra prayer after Maghrib is a beautiful way to continue turning back to Allah.'
    }
  },
  isha: {
    name: 'Isha',
    rakats: [
      { label: 'Farz', type: 'farz', count: 4 },
      { label: 'Sunnat Mokeda', type: 'sunnat-mokeda', count: 2 },
      { label: 'Nafil', type: 'nafil', count: 2 },
      { label: 'Wajib', type: 'wajib', count: 3 },
      { label: 'Nafil', type: 'nafil', count: 2 }
    ],
    reminder: {
      title: 'Isha Reminder',
      body: 'Praying Isha in congregation carries immense reward and closes the day in worship.'
    }
  },
  tahajjud: {
    name: 'Tahajjud',
    rakats: [
      { label: 'Nafil', type: 'nafil', count: 8 }
    ],
    reminder: {
      title: 'Tahajjud Reminder',
      body: 'The best prayer after the obligatory prayers is the night prayer.'
    }
  }
};
