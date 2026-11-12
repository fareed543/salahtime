import { Location } from '@angular/common';
import {
  AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener,
  NgZone, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { sunnahCardMeta, sunnahCardSchema } from '../shorts-seo';
import { SeoService } from 'src/app/services/seo.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { SunnahCard, SunnahCategory, SunnahList } from '../shorts.model';
import { SunnahShortsService } from '../sunnah-shorts.service';

// Same id as the prerendered page's script, so the app replaces it instead of adding a copy.
const SCHEMA_ID = 'sunnah-card-schema';
const DARK_TEMPLATES = ['t03', 't04', 't08'];

/**
 * NF-015 /shorts/<slug>: full-screen player. One card per screen; swipe (or scroll, arrow keys,
 * the side buttons) moves to the next / previous card of the same category, or of all cards when
 * no category is chosen. The URL follows the visible card with replaceUrl, so one Back always
 * returns to the grid.
 */
@Component({
  selector: 'app-sunnah-player',
  templateUrl: './sunnah-player.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SunnahPlayerComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('scroller') scroller?: ElementRef<HTMLElement>;
  @ViewChildren('slide') slides?: QueryList<ElementRef<HTMLElement>>;

  list?: SunnahList;
  deck: SunnahCard[] = [];
  index = 0;
  categoryId: number | null = null;
  language = 'en';
  loading = true;
  failed = false;
  notFound = false;
  sheetCard: SunnahCard | null = null;

  private slug = '';
  private pendingScroll = false;
  private observer?: IntersectionObserver;
  private observed = 0;
  private readonly cameFromApp: boolean;
  private readonly destroy$ = new Subject<void>();
  private readonly previousOverflow = [document.documentElement.style.overflow, document.body.style.overflow];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private seo: SeoService,
    private i18n: AppTranslateService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    readonly shorts: SunnahShortsService
  ) {
    this.cameFromApp = !!this.router.getCurrentNavigation()?.previousNavigation;
  }

  ngOnInit(): void {
    // The player covers the page: stop the page (and its scrollbar) behind it.
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    this.i18n.currentLang$.pipe(takeUntil(this.destroy$)).subscribe(language => { this.language = language; this.applySeo(); this.cdr.markForCheck(); });
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(takeUntil(this.destroy$)).subscribe(([params, query]) => {
      const slug = params.get('slug') ?? '';
      const id = Number(query.get('category'));
      const categoryId = Number.isInteger(id) && id > 0 ? id : null;
      // The URL changed because the user swiped: nothing to do.
      if (slug === this.slug && categoryId === this.categoryId && this.list) return;
      this.slug = slug;
      this.categoryId = categoryId;
      this.resolve(true);
    });
    this.load();
  }

  load(retry = false): void {
    if (retry) this.shorts.retry();
    this.loading = true;
    this.failed = false;
    this.shorts.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: list => { this.list = list; this.loading = false; this.resolve(true); },
      error: () => { this.loading = false; this.failed = true; this.cdr.markForCheck(); }
    });
  }

  ngAfterViewChecked(): void {
    const scroller = this.scroller?.nativeElement;
    if (!scroller || !this.slides) return;
    if (this.pendingScroll && scroller.clientHeight) {
      this.pendingScroll = false;
      scroller.style.scrollBehavior = 'auto';
      scroller.scrollTop = this.index * scroller.clientHeight;
      scroller.style.scrollBehavior = '';
    }
    if (this.observed !== this.slides.length) this.observe();
  }

  // ---------------------------------------------------------------- view helpers

  get current(): SunnahCard | undefined {
    return this.deck[this.index];
  }

  get categoryName(): string {
    const card = this.current ?? this.deck[this.deck.length - 1];
    const category = this.list?.categories.find((item: SunnahCategory) => item.id === (this.categoryId ?? card?.categoryId));
    return category ? this.shorts.text(category.name, this.language) : '';
  }

  isDark(card: SunnahCard): boolean {
    return !!card.imageUrl || DARK_TEMPLATES.includes(card.template);
  }

  trackId(_: number, card: SunnahCard): number {
    return card.id;
  }

  // ---------------------------------------------------------------- actions

  move(step: number): void {
    const scroller = this.scroller?.nativeElement;
    if (scroller) scroller.scrollBy({ top: step * scroller.clientHeight });
  }

  close(): void {
    if (this.cameFromApp) {
      this.location.back();
    } else {
      void this.router.navigate(['/shorts'], { queryParams: this.categoryId ? { category: this.categoryId } : {} });
    }
  }

  like(card: SunnahCard): void {
    this.shorts.toggleLike(card);
    this.cdr.markForCheck();
  }

  save(card: SunnahCard): void {
    this.shorts.toggleSaved(card);
  }

  done(card: SunnahCard): void {
    this.shorts.toggleDone(card);
  }

  share(card: SunnahCard): void {
    void this.shorts.share(card, this.language);
  }

  openSheet(card: SunnahCard): void {
    this.sheetCard = card;
  }

  closeSheet(): void {
    this.sheetCard = null;
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (this.sheetCard) {
      if (event.key === 'Escape') this.closeSheet();
      return;
    }
    if (['ArrowDown', 'PageDown', 'j'].includes(event.key)) { event.preventDefault(); this.move(1); }
    else if (['ArrowUp', 'PageUp', 'k'].includes(event.key)) { event.preventDefault(); this.move(-1); }
    else if (event.key === 'Escape') this.close();
  }

  // ---------------------------------------------------------------- internals

  private resolve(scroll: boolean): void {
    if (!this.list) return;
    this.deck = this.list.cards.filter(card => this.categoryId === null || card.categoryId === this.categoryId);
    let index = this.deck.findIndex(card => card.slug === this.slug);
    if (index < 0 && this.categoryId !== null) {
      // A shared link with another category: show the card among all cards.
      this.categoryId = null;
      this.deck = this.list.cards;
      index = this.deck.findIndex(card => card.slug === this.slug);
    }
    this.notFound = index < 0;
    this.index = Math.max(index, 0);
    this.pendingScroll = scroll && !this.notFound;
    this.observed = 0;
    this.applySeo();
    this.cdr.markForCheck();
  }

  /** Watches which slide fills the screen; the URL, counter and SEO follow it. */
  private observe(): void {
    this.observer?.disconnect();
    const root = this.scroller?.nativeElement;
    if (!root || !this.slides || typeof IntersectionObserver === 'undefined') return;
    this.observed = this.slides.length;
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(entries => {
        const visible = entries.find(entry => entry.isIntersecting);
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset['index']);
        if (Number.isInteger(index) && index !== this.index) this.zone.run(() => this.show(index));
      }, { root, threshold: 0.6 });
      this.slides!.forEach(slide => this.observer!.observe(slide.nativeElement));
    });
  }

  private show(index: number): void {
    this.index = index;
    const card = this.deck[index];
    if (card && card.slug !== this.slug) {
      this.slug = card.slug;
      void this.router.navigate(['/shorts', card.slug], { replaceUrl: true, queryParamsHandling: 'preserve' });
    }
    this.applySeo();
    this.cdr.markForCheck();
  }

  private applySeo(): void {
    if (!this.list) return;
    const card = this.deck[this.index];
    if (this.notFound || !card) {
      this.seo.setRobots('noindex, follow');
      this.seo.setSchema(SCHEMA_ID, null);
      return;
    }
    const category = this.list.categories.find(item => item.id === card.categoryId);
    const meta = sunnahCardMeta(card, category);
    this.seo.apply({ title: meta.title, description: meta.description, canonicalPath: meta.path });
    this.seo.setSchema(SCHEMA_ID, sunnahCardSchema(card, category));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    [document.documentElement.style.overflow, document.body.style.overflow] = this.previousOverflow;
    this.seo.setSchema(SCHEMA_ID, null);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
