export type MasjidMadhab = 'hanafi' | 'shafi';

export const MASJID_MADHABS: MasjidMadhab[] = ['hanafi', 'shafi'];

export interface MasjidTimingRow {
  salah: string;
  azan: string;
  jamat: string;
}

export interface MasjidImage {
  id: number;
  /** 1280x720 (16:9) slideshow image. */
  url: string;
  /** 480x270 thumbnail. */
  thumbUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  sortOrder: number;
}

/** Draft read from a timing-board photo; it is only saved once the user confirms it. */
export interface MasjidTimingCapture {
  imageUrl: string;
  timings: MasjidTimingRow[];
  notes: string;
  /** Set when the photo was stored but its times could not be read. */
  readError: string | null;
}

export type MasjidTimingSource = 'manual' | 'capture' | 'restore' | 'admin' | 'initial';

export interface MasjidTimingVersion {
  id: number;
  versionNo: number;
  source: MasjidTimingSource;
  imageUrl: string | null;
  restoredFrom: number | null;
  createdBy: string | null;
  createdAt: string;
  isCurrent: boolean;
  timings: MasjidTimingRow[];
}
