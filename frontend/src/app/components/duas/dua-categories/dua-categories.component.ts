import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { DuaCategory, DuaCollection, DuaEntry, DuaLanguage } from '../models/dua.model';
import { DuaDataService } from '../services/dua-data.service';

interface DuaDetailState {
  completed: boolean;
  favorite: boolean;
  note: string;
}

interface SavedDuaItem {
  category: DuaCategory;
  dua: DuaEntry;
  state: DuaDetailState;
}

interface MyDuaSection {
  key: 'checked' | 'favorites' | 'notes' | 'highlights';
  items: SavedDuaItem[];
}

@Component({
  selector: 'app-dua-categories',
  templateUrl: './dua-categories.component.html',
  styleUrls: ['./dua-categories.component.scss']
})
export class DuaCategoriesComponent implements OnInit, OnDestroy {
  categories: DuaCategory[] = [];
  filteredCategories: DuaCategory[] = [];
  activeTab: 'categories' | 'my-duas' = 'categories';
  openMyDuaSection: MyDuaSection['key'] | null = null;
  myDuaSections: MyDuaSection[] = [
    { key: 'checked', items: [] },
    { key: 'favorites', items: [] },
    { key: 'notes', items: [] },
    { key: 'highlights', items: [] }
  ];
  private readonly destroy$ = new Subject<void>();
  private currentLanguage = 'en';

  constructor(
    private duaDataService: DuaDataService,
    private location: Location,
    private router: Router,
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

    this.duaDataService.getCollection().subscribe((collection: DuaCollection) => {
      this.categories = collection.categories.map((category) => ({
        ...category,
        duas: category.slug === 'all'
          ? this.buildAllDuas(collection.categories)
          : category.duas
      }));
      this.filteredCategories = [...this.categories];
      this.refreshMyDuas();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getChapterCount(category: DuaCategory): number {
    return category.duas.length;
  }

  getDisplayCategoryTitle(category: DuaCategory): string {
    return category.localized?.[this.currentLanguage as DuaLanguage]?.title ?? category.title;
  }

  getSectionTitle(sectionKey: MyDuaSection['key']): string {
    return this.translateUiText({
      checked: {
        en: 'Checked',
        te: 'పూర్తి చేసినవి',
        ar: 'المكتملة',
        ur: 'مکمل شدہ'
      },
      favorites: {
        en: 'Favorites',
        te: 'ఇష్టమైనవి',
        ar: 'المفضلة',
        ur: 'پسندیدہ'
      },
      notes: {
        en: 'Notes',
        te: 'గమనికలు',
        ar: 'الملاحظات',
        ur: 'نوٹس'
      },
      highlights: {
        en: 'Highlights',
        te: 'ముఖ్యమైనవి',
        ar: 'التمييزات',
        ur: 'نمایاں'
      }
    }[sectionKey]);
  }

  getDisplayDuaTitle(dua: DuaEntry): string {
    return dua.localized?.[this.currentLanguage as DuaLanguage]?.title ?? dua.title;
  }

  getEmptySectionMessage(sectionKey: MyDuaSection['key']): string {
    const sectionTitle = this.getSectionTitle(sectionKey);
    return this.translateUiText({
      en: `No saved duas in ${sectionTitle.toLowerCase()} yet.`,
      te: `${sectionTitle} లో ఇంకా సేవ్ చేసిన దుఆలు లేవు.`,
      ar: `لا توجد أدعية محفوظة في ${sectionTitle} حتى الآن.`,
      ur: `${sectionTitle} میں ابھی تک کوئی محفوظ دعا نہیں ہے۔`
    });
  }

  trackBySlug(_: number, category: DuaCategory): string {
    return category.slug;
  }

  setActiveTab(tab: 'categories' | 'my-duas'): void {
    this.activeTab = tab;

    if (tab === 'my-duas') {
      this.refreshMyDuas();
    } else {
      this.openMyDuaSection = null;
    }
  }

  toggleMyDuaSection(sectionKey: MyDuaSection['key']): void {
    this.openMyDuaSection = this.openMyDuaSection === sectionKey ? null : sectionKey;
  }

  getSectionCount(sectionKey: MyDuaSection['key']): number {
    return this.myDuaSections.find((section) => section.key === sectionKey)?.items.length ?? 0;
  }

  openSavedDua(item: SavedDuaItem): void {
    void this.router.navigate(['/duas', item.category.slug, item.dua.id]);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigate(['/']);
  }

  private buildAllDuas(categories: DuaCategory[]) {
    return categories
      .filter((category) => category.slug !== 'all')
      .flatMap((category) => category.duas)
      .sort((left, right) => left.id - right.id);
  }

  private refreshMyDuas(): void {
    const savedItems = this.categories
      .filter((category) => category.slug !== 'all')
      .flatMap((category) =>
        category.duas.map((dua) => ({
          category,
          dua,
          state: this.getDuaState(category.slug, dua.id)
        }))
      );

    this.myDuaSections = [
      {
        key: 'checked',
        items: savedItems.filter((item) => item.state.completed)
      },
      {
        key: 'favorites',
        items: savedItems.filter((item) => item.state.favorite)
      },
      {
        key: 'notes',
        items: savedItems.filter((item) => !!item.state.note)
      },
      {
        key: 'highlights',
        items: []
      }
    ];
  }

  private getDuaState(categorySlug: string, duaId: number): DuaDetailState {
    return this.localStorageService.getItem<DuaDetailState>(`dua-detail-${categorySlug}-${duaId}`) ?? {
      completed: false,
      favorite: false,
      note: ''
    };
  }

  private translateUiText(values: Record<'en' | DuaLanguage, string>): string {
    return values[this.currentLanguage as DuaLanguage] ?? values.en;
  }
}
