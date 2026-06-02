import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  private readonly offlineSubject = new BehaviorSubject<boolean>(!navigator.onLine);
  readonly offline$ = this.offlineSubject.asObservable();

  constructor(private zone: NgZone) {
    window.addEventListener('online', () => {
      this.zone.run(() => this.offlineSubject.next(false));
    });

    window.addEventListener('offline', () => {
      this.zone.run(() => this.offlineSubject.next(true));
    });
  }

  markOffline(): void {
    this.offlineSubject.next(!navigator.onLine);
  }

  clearOffline(): void {
    this.offlineSubject.next(false);
  }

  syncWithBrowserState(): void {
    this.offlineSubject.next(!navigator.onLine);
  }
}
