import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  getRawItem(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  getItem<T>(key: string): T | null {
    const rawValue = this.getRawItem(key);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  setAuthItem(key: string, value: unknown, rememberMe: boolean): void {
    const serialized = JSON.stringify(value);
    if (rememberMe) {
      localStorage.setItem(key, serialized);
      sessionStorage.removeItem(key);
      return;
    }

    sessionStorage.setItem(key, serialized);
    localStorage.removeItem(key);
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  hasNonEmptyItem(key: string): boolean {
    const value = this.getRawItem(key);
    return value !== null && value !== 'null' && value !== '""' && value.trim() !== '';
  }

  clearAuth(): void {
    ['accessToken', 'userInfo'].forEach((key) => {
      this.removeItem(key);
    });
  }
}
