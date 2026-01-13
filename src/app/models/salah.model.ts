export interface SalahTime {
  start: Date;
  end: Date;
  type: string;
  icon: string; 
  color: string;
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

export interface SalahMethodConfig {
  id: string;                // Unique identifier
  translationKey: string;    // Key to use with ngx-translate
  name?: string;             // Optional, can keep for fallback or legacy
  enabled: boolean;
  angles: {
    fajr: number;
    isha: number;
  };
  dhuhrOffset?: number;
  fixedIshaMinutes?: number; // Optional

}


export const SettingsData: SalahMethodConfig[] = [
  { id: "mwl", translationKey: "CALC_METHOD_MWL", enabled: true, angles: { fajr: 18, isha: 17 } ,  dhuhrOffset: 5
 },
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
  showNafilSalah: boolean;
  showMakruhTime: boolean;
  madhab: string;
  locationMode: string;
  city: any;
  enableNotifications: boolean;
  showHijri: boolean;
  hijriOffset: number;
}
