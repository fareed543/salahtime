export type LearnRuling = 'farz' | 'wajib' | 'sunnah' | 'mustahabb' | 'nafl';
export type LearnText = { en: string; [language: string]: string };

export interface LearnReference {
  title: string;
  url: string;
}

export interface LearnEntry {
  id: string;
  kind: 'action' | 'guide';
  ruling?: LearnRuling;
  title: LearnText;
  summary: LearnText;
  steps: LearnText[];
  note?: LearnText;
  missed?: LearnText;
  image?: string;
  references: LearnReference[];
  related?: string[];
}

export interface LearnQuestion {
  id: string;
  question: LearnText;
  options: LearnText[];
  answer: number;
  explanation: LearnText;
  entryId: string;
}

export interface LearnTopic {
  id: string;
  icon: string;
  school: 'hanafi';
  title: LearnText;
  summary: LearnText;
  entries: LearnEntry[];
  // IDs are in teaching order, independently of the ruling filter.
  sequence: string[];
  quiz: LearnQuestion[];
}

export interface LearnCollection {
  version: number;
  reviewStatus: 'draft';
  topics: LearnTopic[];
}
