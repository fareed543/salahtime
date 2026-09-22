import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AppTranslateService } from 'src/app/services/translate.service';
import {
  DUA_DETAIL_DIALOG_CONFIG,
  DuaDetailDialogComponent
} from 'src/app/shared/dialogs/dua-detail-dialog/dua-detail-dialog.component';
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
  private dialogRef?: MatDialogRef<DuaDetailDialogComponent>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private duaDataService: DuaDataService,
    private i18n: AppTranslateService,
    private matDialog: MatDialog
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
          this.dialogRef?.close();
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

        this.openDuaDialog(category, matchedDua);
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dialogRef?.close();
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

  private openDuaDialog(category: DuaCategory, dua: DuaEntry): void {
    if (this.selectedDua?.id === dua.id && this.dialogRef) {
      return;
    }

    this.selectedDua = dua;
    this.dialogRef?.close();
    this.dialogRef = this.matDialog.open(DuaDetailDialogComponent, {
      ...DUA_DETAIL_DIALOG_CONFIG,
      ariaLabel: this.getDisplayDuaTitle(dua),
      data: { category, dua }
    });

    this.dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.dialogRef = undefined;
        if (this.selectedDua?.id === dua.id) {
          this.closeDuaDialog();
        }
      });
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
