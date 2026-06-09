export interface DuaEntry {
  id: number;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
}

export interface DuaCategory {
  id: string;
  slug: string;
  title: string;
  icon: string;
  theme: 'neutral' | 'night' | 'mint' | 'sand' | 'sun';
  description: string;
  duas: DuaEntry[];
}

export interface DuaCollection {
  collectionTitle: string;
  categories: DuaCategory[];
}
