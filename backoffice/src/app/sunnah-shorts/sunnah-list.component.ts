import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { ShortsBook, ShortsCard, ShortsCategory, ShortsOptions, SunnahShortsService } from './sunnah-shorts.service';

/** NF-015: Sunnah cards (filter, publish, reorder, delete), their categories and reference books. */
@Component({
  selector: 'app-sunnah-list',
  templateUrl: './sunnah-list.component.html'
})
export class SunnahListComponent implements OnInit {
  readonly breadcrumbs = [{ label: 'Home', route: '/dashboard' }, { label: 'Sunnah Shorts' }];
  options?: ShortsOptions;
  cards: ShortsCard[] = [];
  categoryId: number | null = null;
  status = '';
  search = '';
  isLoading = true;
  errorMessage = '';
  busy = false;
  tab: 'cards' | 'categories' | 'books' = 'cards';
  newCategory = '';
  newBook = '';
  editing: Record<string, string> = {};

  constructor(private readonly shorts: SunnahShortsService, private readonly toast: ToastService) {}

  ngOnInit(): void {
    this.loadOptions();
    this.loadCards();
  }

  get publishedCount(): number {
    return this.cards.filter(card => card.status === 'published').length;
  }

  categoryName(id: number): string {
    return this.options?.categories.find(category => category.id === id)?.name['en'] ?? '-';
  }

  plain(text: string | undefined): string {
    return (text ?? '').replace(/\*/g, '');
  }

  reference(card: ShortsCard): string {
    return card.references.map(reference => `${reference.book} ${reference.number}`).join(', ');
  }

  loadOptions(): void {
    this.shorts.options().subscribe({
      next: options => this.options = options,
      error: error => this.errorMessage = ToastService.errorText(error, 'Could not load Sunnah Shorts.')
    });
  }

  loadCards(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.shorts.cards({ categoryId: this.categoryId, status: this.status, search: this.search.trim() })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: response => this.cards = response.cards,
        error: error => this.errorMessage = ToastService.errorText(error, 'Could not load the Sunnahs.')
      });
  }

  // ---------------------------------------------------------------- cards

  togglePublish(card: ShortsCard): void {
    this.run(this.shorts.publish(card.id, card.status !== 'published'), response => {
      Object.assign(card, (response as { card: ShortsCard }).card);
      this.toast.success(card.status === 'published' ? 'Published: it shows in the app now.' : 'Unpublished: hidden from the app.');
    });
  }

  /** Order inside one category; only offered when the list is filtered to a category. */
  move(index: number, step: number): void {
    const target = index + step;
    if (target < 0 || target >= this.cards.length) return;
    [this.cards[index], this.cards[target]] = [this.cards[target], this.cards[index]];
    this.run(this.shorts.reorderCards(this.cards.map(card => card.id)), () => undefined);
  }

  remove(card: ShortsCard): void {
    if (!confirm(`Delete "${this.plain(card.headline['en'])}"? Its likes are deleted too. This cannot be undone.`)) return;
    this.run(this.shorts.deleteCard(card.id), () => {
      this.cards = this.cards.filter(item => item !== card);
      this.toast.success('Sunnah deleted.');
      this.loadOptions();
    });
  }

  // ---------------------------------------------------------------- categories

  addCategory(): void {
    const name = this.newCategory.trim();
    if (!name) return;
    this.run(this.shorts.saveCategory({ name: { en: name }, active: true }), () => {
      this.newCategory = '';
      this.toast.success('Category added.');
      this.loadOptions();
    });
  }

  renameCategory(category: ShortsCategory): void {
    const name = (this.editing['c' + category.id] ?? '').trim();
    if (!name) return;
    this.run(this.shorts.saveCategory({ id: category.id, name: { ...category.name, en: name }, active: category.active }), () => {
      delete this.editing['c' + category.id];
      this.loadOptions();
    });
  }

  toggleCategory(category: ShortsCategory): void {
    this.run(this.shorts.saveCategory({ id: category.id, name: category.name, active: !category.active }), () => this.loadOptions());
  }

  moveCategory(index: number, step: number): void {
    const list = this.options?.categories ?? [];
    const target = index + step;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.run(this.shorts.reorderCategories(list.map(category => category.id)), () => undefined);
  }

  deleteCategory(category: ShortsCategory): void {
    if (!confirm(`Delete the category "${category.name['en']}"?`)) return;
    this.run(this.shorts.deleteCategory(category.id), () => this.loadOptions());
  }

  // ---------------------------------------------------------------- books

  addBook(): void {
    const name = this.newBook.trim();
    if (!name) return;
    this.run(this.shorts.saveBook({ name, active: true }), () => { this.newBook = ''; this.loadOptions(); });
  }

  renameBook(book: ShortsBook): void {
    const name = (this.editing['b' + book.id] ?? '').trim();
    if (!name) return;
    this.run(this.shorts.saveBook({ id: book.id, name, active: book.active }), () => { delete this.editing['b' + book.id]; this.loadOptions(); });
  }

  toggleBook(book: ShortsBook): void {
    this.run(this.shorts.saveBook({ id: book.id, name: book.name, active: !book.active }), () => this.loadOptions());
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  private run<T>(request: import('rxjs').Observable<T>, done: (response: T) => void): void {
    this.busy = true;
    request.pipe(finalize(() => this.busy = false)).subscribe({
      next: done,
      error: error => { this.toast.error(error); this.loadCards(); }
    });
  }
}
