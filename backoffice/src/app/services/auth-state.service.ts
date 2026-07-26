import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

export interface BackofficeUser {
  id?: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  image?: string;
  customerType?: string;
  customerTypeId?: number;
  accessToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly userSubject = new BehaviorSubject<BackofficeUser | null>(this.readStoredUser());
  readonly user$ = this.userSubject.asObservable();

  constructor(private localStorageService: LocalStorageService) {}

  initialize(): void {
    this.userSubject.next(this.readStoredUser());
  }

  setUser(user: BackofficeUser | null): void {
    this.userSubject.next(user);
  }

  getCurrentUser(): BackofficeUser | null {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser() && this.localStorageService.hasNonEmptyItem('accessToken');
  }

  logout(): void {
    this.localStorageService.clearAuth();
    this.userSubject.next(null);
  }

  private readStoredUser(): BackofficeUser | null {
    return this.localStorageService.getItem<BackofficeUser>('userInfo');
  }
}
