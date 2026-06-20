export type AzanOptionType = 'default' | 'azan';

export interface AzanOption {
  id: string;
  label: string;
  file?: string;
  type: AzanOptionType;
}

export const AZAN_SOUND_FILE_BY_ID: Record<string, string> = {
  'abdul-basit': 'abdul_basit.mp3',
  'abdul-ghaffar': 'abdul_ghaffar.mp3',
  'abdul-hakam': 'abdul_hakam.mp3',
  'adhan-alaqsa': 'adhan_alaqsa.mp3',
  'adhan-egypt': 'adhan_egypt.mp3',
  'adhan-halab': 'adhan_halab.mp3',
  'adhan-madinah': 'adhan_madinah.mp3',
  'adhan-makkah': 'adhan_makkah.mp3',
  'al-hussaini': 'al_hussaini.mp3',
  'bakir-bash': 'bakir_bash.mp3',
  'hafez': 'hafez.mp3',
  'hafiz-murad': 'hafiz_murad.mp3',
  'minshawi': 'minshawi.mp3',
  'naghshbandi': 'naghshbandi.mp3',
  'saber': 'saber.mp3',
  'sharif-doman': 'sharif_doman.mp3',
  'yusuf-islam': 'yusuf_islam.mp3'
};
