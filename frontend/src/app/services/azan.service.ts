import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { AzanOption } from '../models/azan.model';

@Injectable({ providedIn: 'root' })
export class AzanService {
  private readonly azanOptions$ = this.http.get<AzanOption[]>('assets/azan/azan-list.json').pipe(
    map((options) => options ?? []),
    catchError(() => of([])),
    shareReplay(1)
  );

  constructor(private http: HttpClient) {}

  getAzanOptions(): Observable<AzanOption[]> {
    return this.azanOptions$;
  }

  getPreviewUrl(option: AzanOption): string | null {
    return option.file ? `assets/azan/${option.file}` : null;
  }
}
