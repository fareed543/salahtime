import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject, distinctUntilChanged, filter, map, merge, of, switchMap, takeUntil } from 'rxjs';
import { AppTranslateService } from 'src/app/services/translate.service';
import {
  DUA_DETAIL_DIALOG_CONFIG,
  DuaDetailDialogComponent
} from 'src/app/shared/dialogs/dua-detail-dialog/dua-detail-dialog.component';
import { DuaCategory, DuaEntry, DuaLanguage, DuaLocalizedContent } from '../models/dua.model';
import { DuaDataService } from '../services/dua-data.service';

interface DuaRouteState {
  categorySlug: string | null;
  duaIdParam: string | null;
}

@Component({
  selector: 'app-dua-list',
  templateUrl: './dua-list.component.html',
  styleUrls: ['./dua-list.component.scss']
})
export class DuaListComponent implements OnInit, OnDestroy {
  category?: DuaCategory;
  selectedDua?: DuaEntry;
  private readonly destroy$ = new Subject<void>();
  private currentLanguage = 'en';
  private dialogRef?: MatDialogRef<DuaDetailDialogComponent>;
  // Id of the dua the URL currently points at; null once the URL is back on the list.
  private routeDuaId: number | null = null;
  // True when the dialog was opened by tapping a dua here, so closing can pop that history
  // entry instead of pushing a new one (pushing caused list -> detail -> list -> detail loops).
  private openedFromList = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
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

    // The dua id lives on a child route, so re-read it after every navigation.
    merge(of(null), this.router.events.pipe(filter((event) => event instanceof NavigationEnd)))
      .pipe(
        map((): DuaRouteState => ({
          categorySlug: this.route.snapshot.paramMap.get('categorySlug'),
          duaIdParam: this.route.firstChild?.snapshot.paramMap.get('duaId') ?? null
        })),
        distinctUntilChanged((a, b) => a.categorySlug === b.categorySlug && a.duaIdParam === b.duaIdParam),
        switchMap((state) => this.duaDataService.getCategory(state.categorySlug ?? '').pipe(
          map((category) => ({ state, category }))
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(({ state, category }) => this.applyRouteState(state, category));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dialogRef?.close();
  }

  get displayCollectionTitle(): string {
    return this.duaDataService.getCollectionTitle();
  }

  get displayCategoryTitle(): string {
    return this.duaDataService.getCategoryTitle(this.category);
  }

  getDisplayTransliteration(dua: DuaEntry): string {
    return this.getLocalizedContent(dua).transliteration ?? dua.transliteration;
  }

  getDisplayDuaTitle(dua: DuaEntry): string {
    return this.getLocalizedContent(dua).title ?? dua.title;
  }

  openDua(dua: DuaEntry): void {
    if (!this.category) {
      return;
    }

    this.openedFromList = true;
    void this.router.navigate(['/duas', this.category.slug, dua.id]);
  }

  private applyRouteState(state: DuaRouteState, category: DuaCategory | undefined): void {
    if (!state.categorySlug || !category) {
      void this.router.navigate(['/duas'], { replaceUrl: true });
      return;
    }

    this.category = category;

    if (state.duaIdParam === null) {
      // URL is back on the list (e.g. hardware back): just close, no extra navigation.
      this.routeDuaId = null;
      this.selectedDua = undefined;
      this.openedFromList = false;
      this.dialogRef?.close();
      return;
    }

    const duaId = Number(state.duaIdParam);
    const matchedDua = Number.isNaN(duaId) ? undefined : category.duas.find((entry) => entry.id === duaId);
    if (!matchedDua) {
      this.routeDuaId = null;
      void this.router.navigate(['/duas', category.slug], { replaceUrl: true });
      return;
    }

    this.routeDuaId = matchedDua.id;
    this.openDuaDialog(category, matchedDua);
  }

  private openDuaDialog(category: DuaCategory, dua: DuaEntry): void {
    if (this.selectedDua?.id === dua.id && this.dialogRef) {
      return;
    }

    this.selectedDua = dua;
    this.dialogRef?.close();
    const dialogRef = this.matDialog.open(DuaDetailDialogComponent, {
      ...DUA_DETAIL_DIALOG_CONFIG,
      ariaLabel: this.getDisplayDuaTitle(dua),
      data: { category, dua }
    });
    this.dialogRef = dialogRef;

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.dialogRef === dialogRef) {
          this.dialogRef = undefined;
        }

        // Closed by the user (X / backdrop / Esc) while the URL still points at this dua.
        if (this.routeDuaId === dua.id) {
          this.leaveDuaRoute();
        }
      });
  }

  private leaveDuaRoute(): void {
    this.routeDuaId = null;
    this.selectedDua = undefined;

    if (this.openedFromList) {
      this.openedFromList = false;
      this.location.back();
      return;
    }

    // Opened from a deep link / saved dua: swap the detail entry for the list.
    void this.router.navigate(['/duas', this.category?.slug ?? ''], { replaceUrl: true });
  }

  private getLocalizedContent(dua: DuaEntry): DuaLocalizedContent {
    return dua.localized?.[this.currentLanguage as DuaLanguage] ?? {};
  }
}
