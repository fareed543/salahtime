// NF-015 Sunnah Shorts: shape of http-sunnah/list (api/components/SunnahShorts.php).

/** Text per app language; English is always present and is the fallback. */
export type SunnahText = { en: string; [language: string]: string };

export interface SunnahReference {
  book: string;
  number: string;
}

export interface SunnahZikr {
  arabic: string;
  transliteration: string;
  meaning: Partial<SunnahText>;
}

export interface SunnahCard {
  id: number;
  slug: string;
  categoryId: number;
  /** *words* between asterisks are shown in the template's accent colour. */
  headline: SunnahText;
  body: SunnahText;
  zikr: SunnahZikr | null;
  /** t01 … t10 (see sunnah-shorts.scss); ignored when imageUrl is set (photo style). */
  template: string;
  imageUrl: string | null;
  thumbUrl: string | null;
  references: SunnahReference[];
  likes: number;
}

export interface SunnahCategory {
  id: number;
  name: SunnahText;
  cardCount: number;
}

export interface SunnahList {
  version: number;
  categories: SunnahCategory[];
  cards: SunnahCard[];
}

/** One run of headline / body text: accent (red words) and Arabic (ﷺ, needs an Arabic font) runs are styled. */
export interface SunnahSegment {
  text: string;
  accent: boolean;
  arabic: boolean;
}
