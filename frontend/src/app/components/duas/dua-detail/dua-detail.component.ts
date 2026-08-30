import { Location } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DuaCategory, DuaEntry, DuaLanguage, DuaLocalizedContent } from '../models/dua.model';
import { DuaDataService } from '../services/dua-data.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { AppTranslateService } from 'src/app/services/translate.service';

interface DuaDetailState {
  completed: boolean;
  favorite: boolean;
  note: string;
}

@Component({
  selector: 'app-dua-detail',
  templateUrl: './dua-detail.component.html',
  styleUrls: ['./dua-detail.component.scss']
})
export class DuaDetailComponent implements OnInit, OnDestroy {
  @Input() category?: DuaCategory;
  @Input() dua?: DuaEntry;
  @Input() dialogMode = false;
  @Output() closeRequested = new EventEmitter<void>();

  detailState: DuaDetailState = {
    completed: false,
    favorite: false,
    note: ''
  };
  isPlaying = false;
  actionStatus = '';
  private readonly destroy$ = new Subject<void>();
  private currentLanguage = 'en';

  get displayArabicText(): string {
    return this.toQuranicSukoon(this.dua?.arabic ?? '');
  }

  get displayDuaTitle(): string {
    return this.getLocalizedContent().title ?? this.dua?.title ?? '';
  }

  get displayCategoryTitle(): string {
    return this.category?.localized?.[this.currentLanguage as DuaLanguage]?.title ?? this.category?.title ?? '';
  }

  get displayTransliteration(): string {
    return this.getLocalizedContent().transliteration ?? this.dua?.transliteration ?? '';
  }

  get displayTranslation(): string {
    return this.getLocalizedContent().translation ?? this.dua?.translation ?? '';
  }

  get displayReference(): string {
    return this.getLocalizedContent().reference ?? this.dua?.reference ?? '';
  }

  get noteLabel(): string {
    return this.translateUiText({
      en: 'Note',
      te: 'గమనిక',
      ar: 'ملاحظة',
      ur: 'نوٹ'
    });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private duaDataService: DuaDataService,
    private localStorageService: LocalStorageService,
    private i18n: AppTranslateService
  ) {}

  ngOnInit(): void {
    this.currentLanguage = this.i18n.current();
    this.i18n.currentLang$
      .pipe(takeUntil(this.destroy$))
      .subscribe((lang) => {
        this.currentLanguage = lang;
      });

    if (this.dialogMode && this.category && this.dua) {
      this.hydrateDetailState();
      return;
    }

    this.route.paramMap.subscribe((params) => {
      const categorySlug = params.get('categorySlug');
      const duaId = Number(params.get('duaId'));

      if (!categorySlug || Number.isNaN(duaId)) {
        void this.router.navigate(['/duas']);
        return;
      }

      this.duaDataService.getDua(categorySlug, duaId).subscribe((result) => {
        if (!result) {
          void this.router.navigate(['/duas', categorySlug]);
          return;
        }

        this.category = result.category;
        this.dua = result.dua;
        this.hydrateDetailState();
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    if (this.dialogMode) {
      this.closeRequested.emit();
      return;
    }

    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    if (this.category) {
      void this.router.navigate(['/duas', this.category.slug]);
      return;
    }

    void this.router.navigate(['/duas']);
  }

  toggleCompleted(): void {
    this.detailState = {
      ...this.detailState,
      completed: !this.detailState.completed
    };
    this.persistDetailState();
    this.actionStatus = this.detailState.completed
      ? this.translateUiText({
          en: 'Marked as completed.',
          te: 'పూర్తి చేసినట్లు గుర్తించబడింది.',
          ar: 'تم وضع علامة مكتمل.',
          ur: 'مکمل کے طور پر نشان زد کر دیا گیا۔'
        })
      : this.translateUiText({
          en: 'Removed from completed.',
          te: 'పూర్తి చేసిన వాటి నుండి తొలగించబడింది.',
          ar: 'تمت الإزالة من المكتملة.',
          ur: 'مکمل فہرست سے ہٹا دیا گیا۔'
        });
  }

  toggleFavorite(): void {
    this.detailState = {
      ...this.detailState,
      favorite: !this.detailState.favorite
    };
    this.persistDetailState();
    this.actionStatus = this.detailState.favorite
      ? this.translateUiText({
          en: 'Added to favorites.',
          te: 'ఇష్టమైన వాటికి జోడించబడింది.',
          ar: 'تمت الإضافة إلى المفضلة.',
          ur: 'پسندیدہ میں شامل کر دیا گیا۔'
        })
      : this.translateUiText({
          en: 'Removed from favorites.',
          te: 'ఇష్టమైన వాటి నుండి తొలగించబడింది.',
          ar: 'تمت الإزالة من المفضلة.',
          ur: 'پسندیدہ سے ہٹا دیا گیا۔'
        });
  }

  editNote(): void {
    const currentNote = this.detailState.note;
    const nextNote = window.prompt('Add a note for this dua', currentNote);

    if (nextNote === null) {
      return;
    }

    this.detailState = {
      ...this.detailState,
      note: nextNote.trim()
    };
    this.persistDetailState();
    this.actionStatus = this.detailState.note
      ? 'Note saved.'
      : 'Note cleared.';
  }

  async togglePlayback(): Promise<void> {
    if (!this.dua) {
      return;
    }

    if (!('speechSynthesis' in window)) {
      this.actionStatus = 'Audio playback is not supported on this device.';
      return;
    }

    if (this.isPlaying) {
      window.speechSynthesis.cancel();
      this.isPlaying = false;
      this.actionStatus = 'Audio stopped.';
      return;
    }

    const utterance = new SpeechSynthesisUtterance(this.dua.transliteration);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;
    utterance.onend = () => {
      this.isPlaying = false;
    };
    utterance.onerror = () => {
      this.isPlaying = false;
      this.actionStatus = 'Unable to play audio right now.';
    };

    window.speechSynthesis.cancel();
    this.isPlaying = true;
    this.actionStatus = 'Playing dua audio.';
    window.speechSynthesis.speak(utterance);
  }

  async shareDua(): Promise<void> {
    if (!this.dua || !this.category) {
      return;
    }

    const shareText = [
      this.dua.title,
      this.category.title,
      '',
      this.dua.arabic,
      '',
      this.dua.transliteration,
      '',
      this.dua.translation,
      '',
      this.dua.reference
    ].join('\n');

    try {
      if (navigator.share) {
        await navigator.share({
          title: this.dua.title,
          text: shareText
        });
        this.actionStatus = 'Dua shared.';
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        this.actionStatus = 'Dua copied to clipboard.';
        return;
      }

      this.actionStatus = 'Sharing is not supported on this device.';
    } catch (error) {
      this.actionStatus = 'Sharing was cancelled or failed.';
    }
  }

  private hydrateDetailState(): void {
    const stored = this.localStorageService.getItem<DuaDetailState>(this.storageKey);
    this.detailState = {
      completed: !!stored?.completed,
      favorite: !!stored?.favorite,
      note: stored?.note ?? ''
    };
    this.isPlaying = false;
    this.actionStatus = '';
  }

  private persistDetailState(): void {
    this.localStorageService.setItem(this.storageKey, this.detailState);
  }

  private get storageKey(): string {
    const categorySlug = this.category?.slug ?? 'unknown';
    const duaId = this.dua?.id ?? 'unknown';
    return `dua-detail-${categorySlug}-${duaId}`;
  }

  private toQuranicSukoon(text: string): string {
    return text.replace(/\u0652/g, '\u06E1');
  }

  private getLocalizedContent(): DuaLocalizedContent {
    return this.dua?.localized?.[this.currentLanguage as DuaLanguage] ?? {};
  }

  private translateUiText(values: Record<'en' | DuaLanguage, string>): string {
    return values[this.currentLanguage as DuaLanguage] ?? values.en;
  }
}
