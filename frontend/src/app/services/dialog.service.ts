import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SalahKey, SalahTime } from '../models/salah.model';

export interface DialogConfig {
  kind: 'salah-detail';
  closeOnBackdrop?: boolean;
  payload: {
    salahKey: SalahKey;
    salahTime: SalahTime;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private readonly dialogSubject = new BehaviorSubject<DialogConfig | null>(null);
  readonly dialog$ = this.dialogSubject.asObservable();

  openSalahDetail(salahKey: SalahKey, salahTime: SalahTime): void {
    this.dialogSubject.next({
      kind: 'salah-detail',
      closeOnBackdrop: true,
      payload: {
        salahKey,
        salahTime
      }
    });
  }

  close(): void {
    this.dialogSubject.next(null);
  }
}
