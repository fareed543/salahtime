import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AppTranslateService } from 'src/app/services/translate.service';
import { DuaCategory, DuaCollection, DuaEntry, DuaLanguage, DuaLocalizedContent } from '../models/dua.model';
import { DuaDataService } from '../services/dua-data.service';

@Component({
  selector: 'app-dua-list',
  templateUrl: './dua-list.component.html',
  styleUrls: ['./dua-list.component.scss']
})
export class DuaListComponent implements OnInit, OnDestroy {
  category?: DuaCategory;
  selectedDua?: DuaEntry;
  collectionTitle = '';
  private collection?: DuaCollection;
  private readonly destroy$ = new Subject<void>();
  private currentLanguage = 'en';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private duaDataService: DuaDataService,
    private i18n: AppTranslateService
  ) {}

  ngOnInit(): void {
    this.currentLanguage = this.i18n.current();
    this.i18n.currentLang$
      .pipe(takeUntil(this.destroy$))
      .subscribe((lang) => {
        this.currentLanguage = lang;
      });

    this.route.paramMap.subscribe((params) => {
      const categorySlug = params.get('categorySlug');
      const duaIdParam = params.get('duaId');
      const duaId = duaIdParam ? Number(duaIdParam) : null;

      if (!categorySlug) {
        return;
      }

      this.duaDataService.getCollection().subscribe((collection) => {
        this.collection = collection;
        this.collectionTitle = collection.collectionTitle;
      });

      this.duaDataService.getCategory(categorySlug).subscribe((category) => {
        if (!category) {
          void this.router.navigate(['/duas']);
          return;
        }

        this.category = category;
        if (duaIdParam === null) {
          this.selectedDua = undefined;
          return;
        }

        if (duaId === null || Number.isNaN(duaId)) {
          this.selectedDua = undefined;
          void this.router.navigate(['/duas', categorySlug]);
          return;
        }

        const matchedDua = category.duas.find((entry) => entry.id === duaId);
        if (!matchedDua) {
          this.selectedDua = undefined;
          void this.router.navigate(['/duas', categorySlug]);
          return;
        }

        this.selectedDua = matchedDua;
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getDisplayTransliteration(dua: DuaEntry): string {
    return this.getLocalizedContent(dua).transliteration ?? dua.transliteration;
  }

  get displayCollectionTitle(): string {
    return this.collection?.localized?.[this.currentLanguage as DuaLanguage]?.collectionTitle ?? this.collectionTitle;
  }

  get displayCategoryTitle(): string {
    return this.getLocalizedCategoryTitle(this.category);
  }

  getDisplayDuaTitle(dua: DuaEntry): string {
    return this.getLocalizedContent(dua).title ?? dua.title;
  }

  goBack(): void {
    void this.router.navigate(['/duas']);
  }

  closeDuaDialog(): void {
    if (!this.category) {
      void this.router.navigate(['/duas']);
      return;
    }

    this.selectedDua = undefined;
    void this.router.navigate(['/duas', this.category.slug]);
  }

  private getLocalizedContent(dua: DuaEntry): DuaLocalizedContent {
    return dua.localized?.[this.currentLanguage as DuaLanguage] ?? {};
  }

  private getLocalizedCategoryTitle(category?: DuaCategory): string {
    if (!category) {
      return '';
    }

    return category.localized?.[this.currentLanguage as DuaLanguage]?.title ?? category.title;
  }
}
