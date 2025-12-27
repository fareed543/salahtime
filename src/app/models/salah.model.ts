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


  export interface SalahMethodConfig {
  id: string;
  name: string;
  enabled: boolean;
  angles?: {
    fajr: number;
    isha: number;
  };
  fixedIshaMinutes?: number;
}


export const SettingsData: SalahMethodConfig[] = [
  {
    id: "mwl", name: "Muslim World League (MWL)", enabled: true,
    angles: { fajr: 18, isha: 17 }
  },
  {
    id: "isna", name: "Islamic Society of North America (ISNA)", enabled: true,
    angles: { fajr: 15, isha: 15 }
  },
  {
    id: "egypt", name: "Egyptian General Authority", enabled: true,
    angles: { fajr: 19.5, isha: 17.5 }
  },
  {
    id: "karachi", name: "University of Islamic Sciences, Karachi", enabled: true,
    angles: { fajr: 18, isha: 18 }
  },
  {
    id: "makkah", name: "Umm al-Qura University, Makkah", enabled: true,
    angles: { fajr: 18.5, isha: 0 },     // angle overridden by fixed Isha
    fixedIshaMinutes: 90
  },
  {
    id: "gulf", name: "Gulf Region (UAE)", enabled: true,
    angles: { fajr: 18, isha: 18 }
  },
  {
    id: "mcc", name: "Moonsighting Committee Worldwide (MCC)", enabled: true,
    angles: { fajr: 18, isha: 17 }
  },
  {
    id: "fcna", name: "Fiqh Council of North America (FCNA)", enabled: true,
    angles: { fajr: 15, isha: 15 }
  },
  {
    id: "jakim", name: "JAKIM - Malaysia", enabled: true,
    angles: { fajr: 20, isha: 18 }
  },
  {
    id: "diyanet", name: "Diyanet - Turkey", enabled: true,
    angles: { fajr: 18, isha: 17 }
  },
  {
    id: "muis", name: "Singapore MUIS", enabled: true,
    angles: { fajr: 20, isha: 18 }
  },
  {
    id: "tehran", name: "Tehran / Iranian Calendar", enabled: true,
    angles: { fajr: 17.7, isha: 14 }
  },
  {
    id: "kuwait", name: "Kuwait Method", enabled: true,
    angles: { fajr: 18, isha: 17.5 }
  },
  {
    id: "qatar", name: "Qatar Method", enabled: true,
    angles: { fajr: 18, isha: 18 }
  }
];


export interface SalahSettings {
  calculationMethod: string;
  showNafilSalah: boolean;
  showMakruhTime: boolean;
  madhab: string;
  locationMode: string;
  enableNotifications: boolean;
  showHijri: boolean;
  hijriOffset: number;
}
