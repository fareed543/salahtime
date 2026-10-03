import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { AppTranslateService } from 'src/app/services/translate.service';
import { DuaCategory, DuaCollection, DuaEntry, DuaLanguage } from '../models/dua.model';

@Injectable()
export class DuaDataService {
  private readonly collection$ = this.http
    .get<DuaCollection>('assets/data/duas.json')
    .pipe(shareReplay(1));

  constructor(private http: HttpClient, private i18n: AppTranslateService) {}

  getCollection(): Observable<DuaCollection> {
    return this.collection$;
  }

  getCategories(): Observable<DuaCategory[]> {
    return this.collection$.pipe(map((collection) => this.normalizeCategories(collection)));
  }

  getCategory(slug: string): Observable<DuaCategory | undefined> {
    return this.getCategories().pipe(
      map((categories) => categories.find((category) => category.slug === slug))
    );
  }

  getDua(categorySlug: string, duaId: number): Observable<{ category: DuaCategory; dua: DuaEntry } | undefined> {
    return this.getCategory(categorySlug).pipe(
      map((category) => {
        if (!category) {
          return undefined;
        }

        const dua = category.duas.find((entry) => entry.id === duaId);
        return dua ? { category, dua } : undefined;
      })
    );
  }

  // Category titles come from i18n (all app languages); duas.json values are the fallback.
  getCategoryTitle(category?: DuaCategory): string {
    if (!category) {
      return '';
    }

    const key = `DUA_PAGE.CATEGORIES.${category.slug}`;
    const translated = this.i18n.translateWithParams(key, {});
    if (translated && translated !== key) {
      return translated;
    }

    return category.localized?.[this.i18n.current() as DuaLanguage]?.title ?? category.title;
  }

  getCollectionTitle(): string {
    return this.i18n.translateWithParams('DUA_PAGE.COLLECTION_TITLE', {});
  }

  private normalizeCategories(collection: DuaCollection): DuaCategory[] {
    const allCategory = collection.categories.find((category) => category.slug === 'all');
    const duaMap = new Map<number, DuaEntry>(
      (allCategory?.duas ?? [])
        .filter((entry): entry is DuaEntry => typeof entry === 'object')
        .map((entry) => [entry.id, entry])
    );

    return collection.categories.map((category) => ({
      ...category,
      duas: (category.duas as unknown[])
        .map((entry) => typeof entry === 'number' ? duaMap.get(entry) : entry as DuaEntry)
        .filter((entry): entry is DuaEntry => !!entry)
    }));
  }
}
