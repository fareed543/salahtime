import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { LearnCollection } from './learn.model';

// Replace the provider with an API URL when the backend is available.
export const LEARN_DATA_URL = new InjectionToken<string>('LEARN_DATA_URL');

@Injectable()
export class LearnDataService {
  private collection$?: Observable<LearnCollection>;

  constructor(private http: HttpClient, @Inject(LEARN_DATA_URL) private url: string) {}

  getCollection(): Observable<LearnCollection> {
    return this.collection$ ??= this.http.get<LearnCollection>(this.url).pipe(
      map(collection => {
        if (collection.version !== 1 || !Array.isArray(collection.topics)) {
          throw new Error('Unsupported learning collection');
        }
        return collection;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  retry(): void {
    this.collection$ = undefined;
  }
}
