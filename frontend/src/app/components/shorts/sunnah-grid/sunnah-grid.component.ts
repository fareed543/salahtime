import { AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { SHORTS_INTRO } from '../shorts-seo';
import { AppTranslateService } from 'src/app/services/translate.service';
import { SunnahCard, SunnahCategory, SunnahList } from '../shorts.model';
import { SunnahShortsService } from '../sunnah-shorts.service';

interface GridSection {
  category: SunnahCategory;
  cards: SunnahCard[];
}

/** NF-015 /shorts: Sunnah cards as thumbnails, grouped by category, with a category filter. */
@Component({
  selector: 'app-sunnah-grid',
  templateUrl: './sunnah-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SunnahGridComponent implements OnInit, AfterViewChecked, OnDestroy {
  readonly isNativeApp = Capacitor.isNativePlatform();
  readonly intro = SHORTS_INTRO;
  list?: SunnahList;
  sections: GridSection[] = [];
  categoryId: number | null = null;
  language = 'en';
  loading = true;
  failed = false;
  private restoreScroll = true;
  private readonly destroy$ = new Subject<void>();
  private loadSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private i18n: AppTranslateService,
    readonly shorts: SunnahShortsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.i18n.currentLang$.pipe(takeUntil(this.destroy$)).subscribe(language => { this.language = language; this.cdr.markForCheck(); });
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = Number(params.get('category'));
      this.categoryId = Number.isInteger(id) && id > 0 ? id : null;
      this.buildSections();
    });
    this.load();
  }

  load(retry = false): void {
    if (retry) this.shorts.retry();
    this.loadSubscription?.unsubscribe();
    this.loading = true;
    this.failed = false;
    this.loadSubscription = this.shorts.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: list => { this.list = list; this.loading = false; this.buildSections(); this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.failed = true; this.cdr.markForCheck(); }
    });
  }

  /** Back from the player: return to the same place in the grid. */
  ngAfterViewChecked(): void {
    if (this.restoreScroll && this.list && this.shorts.gridScroll > 0) {
      this.restoreScroll = false;
      const top = this.shorts.gridScroll;
      this.shorts.gridScroll = 0;
      // After the router's own scroll-to-top for this navigation.
      setTimeout(() => window.scrollTo({ top, behavior: 'auto' }));
    } else if (this.list) {
      this.restoreScroll = false;
    }
  }

  rememberScroll(): void {
    this.shorts.gridScroll = window.scrollY;
  }

  categoryName(category: SunnahCategory): string {
    return this.shorts.text(category.name, this.language);
  }

  /** Number of cards, for the subtitle. */
  get total(): number {
    return this.list?.cards.length ?? 0;
  }

  trackId(_: number, item: { id: number }): number {
    return item.id;
  }

  trackSection(_: number, section: GridSection): number {
    return section.category.id;
  }

  private buildSections(): void {
    if (!this.list) return;
    const categories = this.list.categories.filter(category => this.categoryId === null || category.id === this.categoryId);
    this.sections = categories
      .map(category => ({ category, cards: this.list!.cards.filter(card => card.categoryId === category.id) }))
      .filter(section => section.cards.length);
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
