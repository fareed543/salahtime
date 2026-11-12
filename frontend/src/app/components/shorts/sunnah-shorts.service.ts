import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { SHORTS_SITE_URL } from './shorts-seo';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { SKIP_SPINNER } from 'src/app/services/spinner.interceptor';
import { environment } from 'src/environments/environment';
import { SunnahCard, SunnahList, SunnahSegment, SunnahText } from './shorts.model';

const CACHE_KEY = 'sunnah-shorts-cache';
const SAVED_KEY = 'sunnah-shorts-saved';
const DONE_KEY = 'sunnah-shorts-done';
const LIKED_KEY = 'sunnah-shorts-liked';
const DEVICE_KEY = 'sunnah-shorts-device-id';

/**
 * NF-015 Sunnah Shorts: loads the published cards (cached on the device for offline use) and keeps
 * this device's likes, saves and "done today" ticks. No login.
 */
@Injectable()
export class SunnahShortsService {
  /** Grid scroll position, restored when the player closes. */
  gridScroll = 0;

  private list$?: Observable<SunnahList>;
  private saved = new Set<number>(this.storage.getItem<number[]>(SAVED_KEY) ?? []);
  private liked = new Set<number>(this.storage.getItem<number[]>(LIKED_KEY) ?? []);
  private done: Record<string, string> = this.storage.getItem<Record<string, string>>(DONE_KEY) ?? {};

  constructor(private http: HttpClient, private storage: LocalStorageService) {}

  list(): Observable<SunnahList> {
    return this.list$ ??= this.http.get<SunnahList>(`${environment.apiUrl}http-sunnah/list`).pipe(
      map(list => {
        if (list?.version !== 1 || !Array.isArray(list.cards) || !Array.isArray(list.categories)) {
          throw new Error('Unsupported Sunnah list');
        }
        return list;
      }),
      tap(list => this.storage.setItem(CACHE_KEY, list)),
      catchError(error => {
        const cached = this.storage.getItem<SunnahList>(CACHE_KEY);
        return cached?.version === 1 ? of(cached) : throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  retry(): void {
    this.list$ = undefined;
  }

  // ---------------------------------------------------------------- text

  text(value: Partial<SunnahText> | null | undefined, language: string): string {
    return value?.[language] || value?.en || '';
  }

  /** Splits text into runs: *accent* words and the ﷺ sign (Arabic font) get their own runs. */
  segments(value: string, accent = true): SunnahSegment[] {
    const segments: SunnahSegment[] = [];
    const pattern = accent ? /(\*[^*]+\*|ﷺ)/ : /(ﷺ)/;
    for (const part of value.split(pattern)) {
      if (!part) continue;
      if (accent && part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
        segments.push(...this.segments(part.slice(1, -1), false).map(segment => ({ ...segment, accent: true })));
      } else {
        segments.push({ text: accent ? part.replace(/\*/g, '') : part, accent: false, arabic: part === 'ﷺ' });
      }
    }
    return segments;
  }

  plain(value: string): string {
    return value.replace(/\*/g, '');
  }

  referenceLabel(card: SunnahCard): string {
    const first = card.references[0];
    return first ? `${first.book} ${first.number}`.trim() : '';
  }

  allReferences(card: SunnahCard): string {
    return card.references.map(reference => `${reference.book} ${reference.number}`.trim()).join(' · ');
  }

  /** 842 → "842", 1234 → "1.2k". */
  count(value: number): string {
    if (value < 1000) return String(value);
    const thousands = value / 1000;
    return `${thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10}k`;
  }

  // ---------------------------------------------------------------- device state

  isSaved(card: SunnahCard): boolean {
    return this.saved.has(card.id);
  }

  toggleSaved(card: SunnahCard): void {
    this.saved.has(card.id) ? this.saved.delete(card.id) : this.saved.add(card.id);
    this.storage.setItem(SAVED_KEY, [...this.saved]);
  }

  /** "Done today" resets at local midnight. */
  isDone(card: SunnahCard): boolean {
    return this.done[card.id] === this.today();
  }

  toggleDone(card: SunnahCard): void {
    if (this.isDone(card)) {
      delete this.done[card.id];
    } else {
      this.done[card.id] = this.today();
    }
    // Keep only today's ticks.
    this.done = Object.fromEntries(Object.entries(this.done).filter(([, day]) => day === this.today()));
    this.storage.setItem(DONE_KEY, this.done);
  }

  isLiked(card: SunnahCard): boolean {
    return this.liked.has(card.id);
  }

  /** Optimistic: the heart and count change at once; the server count replaces it when it answers. */
  toggleLike(card: SunnahCard): void {
    const liked = !this.liked.has(card.id);
    liked ? this.liked.add(card.id) : this.liked.delete(card.id);
    card.likes = Math.max(0, card.likes + (liked ? 1 : -1));
    this.storage.setItem(LIKED_KEY, [...this.liked]);
    this.http.post<{ likes: number }>(`${environment.apiUrl}http-sunnah/like`,
      { cardId: card.id, deviceId: this.deviceId(), liked },
      { context: new HttpContext().set(SKIP_SPINNER, true) }
    ).subscribe({
      next: response => { if (typeof response?.likes === 'number') card.likes = response.likes; },
      error: () => { /* Offline: the like stays on this device; the count catches up next time. */ }
    });
  }

  // ---------------------------------------------------------------- share

  shareUrl(card: SunnahCard): string {
    return `${SHORTS_SITE_URL}/shorts/${card.slug}`;
  }

  shareText(card: SunnahCard, language: string): string {
    const lines = [this.plain(this.text(card.headline, language)), '', this.text(card.body, language)];
    if (card.zikr?.arabic) lines.push('', card.zikr.arabic);
    const references = this.allReferences(card);
    if (references) lines.push('', `(${references})`);
    return lines.join('\n');
  }

  /** Android share sheet; on the web the Web Share API, else WhatsApp. */
  async share(card: SunnahCard, language: string): Promise<void> {
    const title = this.plain(this.text(card.headline, language));
    const text = this.shareText(card, language);
    const url = this.shareUrl(card);
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title, text, url, dialogTitle: title });
      } else if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`, '_blank', 'noopener');
      }
    } catch {
      // The user closed the share sheet.
    }
  }

  private deviceId(): string {
    let id = this.storage.getRawItem(DEVICE_KEY);
    if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      this.storage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  private today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
