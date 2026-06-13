export type AzanOptionType = 'default' | 'azan';

export interface AzanOption {
  id: string;
  label: string;
  file?: string;
  type: AzanOptionType;
}

export const AZAN_SOUND_FILE_BY_ID: Record<string, string> = {
  'abdul-basit': 'Abdul-Basit.mp3',
  'abdul-ghaffar': 'Abdul-Ghaffar.mp3',
  'abdul-hakam': 'Abdul-Hakam.mp3',
  'adhan-alaqsa': 'Adhan-Alaqsa.mp3',
  'adhan-egypt': 'Adhan-Egypt.mp3',
  'adhan-halab': 'Adhan-Halab.mp3',
  'adhan-madinah': 'Adhan-Madinah.mp3',
  'adhan-makkah': 'Adhan-Makkah.mp3',
  'al-hussaini': 'Al-Hussaini.mp3',
  'bakir-bash': 'Bakir-Bash.mp3',
  'hafez': 'Hafez.mp3',
  'hafiz-murad': 'Hafiz-Murad.mp3',
  'minshawi': 'Minshawi.mp3',
  'naghshbandi': 'Naghshbandi.mp3',
  'saber': 'Saber.mp3',
  'sharif-doman': 'Sharif-Doman.mp3',
  'yusuf-islam': 'Yusuf-Islam.mp3'
};
