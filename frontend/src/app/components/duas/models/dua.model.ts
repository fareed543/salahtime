export type DuaLanguage = 'ar' | 'ur' | 'te';

export interface DuaLocalizedContent {
  title?: string;
  transliteration?: string;
  translation?: string;
  reference?: string;
}

export interface DuaCategoryLocalizedContent {
  title?: string;
  description?: string;
}

export interface DuaCollectionLocalizedContent {
  collectionTitle?: string;
}

export interface DuaEntry {
  id: number;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
  localized?: Partial<Record<DuaLanguage, DuaLocalizedContent>>;
}

export interface DuaCategory {
  id: string;
  slug: string;
  title: string;
  icon: string;
  theme: 'neutral' | 'night' | 'mint' | 'sand' | 'sun';
  description: string;
  duas: DuaEntry[];
  cardIconClass?: string;
  localized?: Partial<Record<DuaLanguage, DuaCategoryLocalizedContent>>;
}

export interface DuaCollection {
  collectionTitle: string;
  categories: DuaCategory[];
  localized?: Partial<Record<DuaLanguage, DuaCollectionLocalizedContent>>;
}
