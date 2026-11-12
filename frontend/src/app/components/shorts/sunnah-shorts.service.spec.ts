import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environments/environment';
import { SunnahCard, SunnahList } from './shorts.model';
import { sunnahCardMeta, sunnahCardPath, sunnahCardSchema } from './shorts-seo';
import { SunnahShortsService } from './sunnah-shorts.service';

const card = (overrides: Partial<SunnahCard> = {}): SunnahCard => ({
  id: 7,
  slug: '4-before-zuhr-2-after',
  categoryId: 1,
  headline: { en: '*4 Before* Zuhr, *2 After*', 'hi-latn': '*Zohar se pehle 4*, baad 2' },
  body: { en: 'The Messenger of Allah ﷺ used to pray 4 rakahs before Zuhr and 2 after.' },
  zikr: null,
  template: 't01',
  imageUrl: null,
  thumbUrl: null,
  references: [{ book: 'Tirmizi', number: '96' }],
  likes: 1234,
  ...overrides
});

describe('SunnahShortsService (NF-015)', () => {
  let service: SunnahShortsService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SunnahShortsService, LocalStorageService]
    });
    service = TestBed.inject(SunnahShortsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('splits *accent* words and the ﷺ sign into their own runs', () => {
    expect(service.segments('*4 Before* Zuhr, *2 After*')).toEqual([
      { text: '4 Before', accent: true, arabic: false },
      { text: ' Zuhr, ', accent: false, arabic: false },
      { text: '2 After', accent: true, arabic: false }
    ]);
    expect(service.segments('Allah ﷺ said', false)).toEqual([
      { text: 'Allah ', accent: false, arabic: false },
      { text: 'ﷺ', accent: false, arabic: true },
      { text: ' said', accent: false, arabic: false }
    ]);
  });

  it('shows the user language when it is entered, else English', () => {
    expect(service.text(card().headline, 'hi-latn')).toBe('*Zohar se pehle 4*, baad 2');
    expect(service.text(card().headline, 'ta')).toBe('*4 Before* Zuhr, *2 After*');
  });

  it('formats like counts and the reference label', () => {
    expect(service.count(842)).toBe('842');
    expect(service.count(1234)).toBe('1.2k');
    expect(service.count(25400)).toBe('25k');
    expect(service.referenceLabel(card())).toBe('Tirmizi 96');
  });

  it('remembers saved and done-today per device', () => {
    const item = card();
    service.toggleSaved(item);
    service.toggleDone(item);
    // A new instance reads the same device storage (as after an app restart).
    const again = new SunnahShortsService(TestBed.inject(HttpClient), TestBed.inject(LocalStorageService));
    expect(again.isSaved(item)).toBeTrue();
    expect(again.isDone(item)).toBeTrue();
    service.toggleDone(item);
    expect(service.isDone(item)).toBeFalse();
  });

  it('likes optimistically and takes the server count', () => {
    const item = card({ likes: 10 });
    service.toggleLike(item);
    expect(service.isLiked(item)).toBeTrue();
    expect(item.likes).toBe(11);
    const request = http.expectOne(`${environment.apiUrl}http-sunnah/like`);
    expect(request.request.body.cardId).toBe(7);
    expect(request.request.body.liked).toBeTrue();
    expect(request.request.body.deviceId).toMatch(/^[A-Za-z0-9-]{16,64}$/);
    request.flush({ likes: 15, liked: true });
    expect(item.likes).toBe(15);
  });

  it('falls back to the cached list when offline', () => {
    const list: SunnahList = { version: 1, categories: [{ id: 1, name: { en: 'Sunnat-e-Zohar' }, cardCount: 1 }], cards: [card()] };
    service.list().subscribe();
    http.expectOne(`${environment.apiUrl}http-sunnah/list`).flush(list);

    service.retry();
    let offline: SunnahList | undefined;
    service.list().subscribe(result => offline = result);
    http.expectOne(`${environment.apiUrl}http-sunnah/list`).error(new ProgressEvent('offline'));
    expect(offline?.cards.length).toBe(1);
  });
});

describe('shorts-seo (NF-015)', () => {
  it('builds the card page title, description and canonical', () => {
    const meta = sunnahCardMeta(card(), { id: 1, name: { en: 'Sunnat-e-Zohar' } });
    expect(sunnahCardPath(card())).toBe('/shorts/4-before-zuhr-2-after');
    expect(meta.url).toBe('https://salah-times.in/shorts/4-before-zuhr-2-after');
    expect(meta.heading).toBe('4 Before Zuhr, 2 After');
    expect(meta.title).toBe('4 Before Zuhr, 2 After: Sunnah (Tirmizi 96) | SalahTime');
    expect(meta.title.length).toBeLessThanOrEqual(62);
    expect(meta.description.length).toBeLessThanOrEqual(158);
    expect(meta.description).toContain('Reference: Tirmizi 96.');
  });

  it('keeps long titles within 62 characters', () => {
    const long = card({ headline: { en: 'The reward of four rakahs before Zuhr equals four at Tahajjud time' } });
    const meta = sunnahCardMeta(long);
    expect(meta.title.length).toBeLessThanOrEqual(62);
    expect(meta.title).toMatch(/\| SalahTime$/);
  });

  it('describes the breadcrumb in the schema', () => {
    const schema = sunnahCardSchema(card(), { id: 1, name: { en: 'Sunnat-e-Zohar' } }) as any;
    expect(schema.breadcrumb.itemListElement.map((item: any) => item.name)).toEqual(['Sunnah Shorts', 'Sunnat-e-Zohar', '4 Before Zuhr, 2 After']);
  });
});
