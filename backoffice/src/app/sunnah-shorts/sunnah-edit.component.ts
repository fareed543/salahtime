import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { ToastService } from '../services/toast.service';
import {
  SHORTS_LANGUAGE_NAMES, ShortsCard, ShortsCardInput, ShortsOptions, ShortsText, SunnahShortsService
} from './sunnah-shorts.service';

interface ReferenceRow { bookId: number | null; number: string; }

/** NF-015: create or edit one Sunnah card, with a live phone preview. */
@Component({
  selector: 'app-sunnah-edit',
  templateUrl: './sunnah-edit.component.html'
})
export class SunnahEditComponent implements OnInit {
  readonly languageNames = SHORTS_LANGUAGE_NAMES;
  options?: ShortsOptions;
  card?: ShortsCard;
  isLoading = true;
  isSaving = false;
  isUploading = false;
  errorMessage = '';
  showTranslations = false;
  showZikr = false;
  cropFile: File | null = null;

  categoryId: number | null = null;
  template = 't01';
  headline: ShortsText = { en: '' };
  body: ShortsText = { en: '' };
  zikrArabic = '';
  zikrTransliteration = '';
  zikrMeaning: ShortsText = { en: '' };
  imageUrl: string | null = null;
  thumbUrl: string | null = null;
  sourcePage = '';
  references: ReferenceRow[] = [{ bookId: null, number: '' }];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly shorts: SunnahShortsService,
    private readonly toast: ToastService
  ) {}

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [{ label: 'Home', route: '/dashboard' }, { label: 'Sunnah Shorts', route: '/sunnah-shorts' }, { label: this.card ? 'Edit' : 'New Sunnah' }];
  }

  get otherLanguages(): string[] {
    return (this.options?.languages ?? []).filter(language => language !== 'en');
  }

  get activeBooks() {
    return (this.options?.books ?? []).filter(book => book.active || this.references.some(row => row.bookId === book.id));
  }

  get previewReferences() {
    return this.references
      .filter(row => row.bookId || row.number)
      .map(row => ({ book: this.options?.books.find(book => book.id === Number(row.bookId))?.name ?? '', number: row.number }));
  }

  get previewZikr() {
    return this.zikrArabic ? { arabic: this.zikrArabic, transliteration: this.zikrTransliteration, meaning: this.zikrMeaning } : null;
  }

  /** Headline length without the *marks*, as the API counts it. */
  get headlineLength(): number {
    return (this.headline['en'] || '').replace(/\*/g, '').length;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.shorts.options().pipe(
      switchMap(options => {
        this.options = options;
        const categoryParam = Number(this.route.snapshot.queryParamMap.get('categoryId'));
        this.categoryId = categoryParam || options.categories.find(category => category.active)?.id || null;
        return id ? this.shorts.card(id) : [null];
      }),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: response => { if (response) this.fill(response.card); },
      error: error => { this.errorMessage = ToastService.errorText(error, 'Could not load the Sunnah.'); }
    });
  }

  addReference(): void {
    this.references.push({ bookId: null, number: '' });
  }

  removeReference(index: number): void {
    this.references.splice(index, 1);
    if (!this.references.length) this.addReference();
  }

  choosePhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      this.toast.warning('Only JPG, PNG or WebP images are supported.');
      return;
    }
    this.cropFile = file;
  }

  uploadCropped(blob: Blob): void {
    this.isUploading = true;
    this.shorts.uploadImage(blob).pipe(finalize(() => this.isUploading = false)).subscribe({
      next: saved => { this.imageUrl = saved.imageUrl; this.thumbUrl = saved.thumbUrl; this.cropFile = null; },
      error: error => this.toast.error(error, 'The photo could not be uploaded.')
    });
  }

  removePhoto(): void {
    this.imageUrl = null;
    this.thumbUrl = null;
  }

  save(publish: boolean | null = null): void {
    const input: ShortsCardInput = {
      id: this.card?.id,
      categoryId: this.categoryId,
      headline: this.headline,
      body: this.body,
      zikr: this.zikrArabic.trim() ? { arabic: this.zikrArabic, transliteration: this.zikrTransliteration, meaning: this.zikrMeaning } : null,
      template: this.template,
      imageUrl: this.imageUrl,
      thumbUrl: this.thumbUrl,
      sourcePage: this.sourcePage,
      references: this.references.filter(row => row.bookId || row.number.trim()).map(row => ({ bookId: row.bookId ? Number(row.bookId) : null, number: row.number }))
    };
    this.isSaving = true;
    this.shorts.saveCard(input).pipe(
      switchMap(response => publish === null || (response.card.status === 'published') === publish
        ? [response]
        : this.shorts.publish(response.card.id, publish)),
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: response => {
        const isNew = !this.card;
        this.fill(response.card);
        this.toast.success(response.card.status === 'published' ? 'Sunnah saved and published.' : 'Sunnah saved as a draft.');
        if (isNew) void this.router.navigate(['/sunnah-shorts', response.card.id], { replaceUrl: true });
      },
      error: error => this.toast.error(error, 'The Sunnah could not be saved.')
    });
  }

  private fill(card: ShortsCard): void {
    this.card = card;
    this.categoryId = card.categoryId;
    this.template = card.template;
    this.headline = { en: '', ...card.headline };
    this.body = { en: '', ...card.body };
    this.zikrArabic = card.zikr?.arabic ?? '';
    this.zikrTransliteration = card.zikr?.transliteration ?? '';
    this.zikrMeaning = { en: '', ...(card.zikr?.meaning ?? {}) };
    this.showZikr = !!card.zikr;
    this.imageUrl = card.imageUrl;
    this.thumbUrl = card.thumbUrl;
    this.sourcePage = card.sourcePage ?? '';
    this.references = card.references.length
      ? card.references.map(reference => ({ bookId: reference.bookId ?? null, number: reference.number }))
      : [{ bookId: null, number: '' }];
    this.showTranslations = this.otherLanguages.some(language => card.headline[language] || card.body[language]);
  }
}
