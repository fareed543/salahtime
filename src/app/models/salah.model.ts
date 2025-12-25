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
