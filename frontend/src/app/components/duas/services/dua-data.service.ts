import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { DuaCategory, DuaCollection, DuaEntry } from '../models/dua.model';

@Injectable()
export class DuaDataService {
  private readonly collection$ = this.http
    .get<DuaCollection>('assets/data/duas.json')
    .pipe(shareReplay(1));

  constructor(private http: HttpClient) {}

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
