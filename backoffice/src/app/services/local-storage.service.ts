import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  getBrowserStorageItem<T>(key: string, storage: Storage): T | null {
    const rawValue = storage.getItem(key);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  getRawItem(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  getItem<T>(key: string): T | null {
    return this.getBrowserStorageItem<T>(key, localStorage) ?? this.getBrowserStorageItem<T>(key, sessionStorage);
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

  getPersistentItem<T>(key: string): T | null {
    return this.getBrowserStorageItem<T>(key, localStorage);
  }

  setPersistentItem(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  removePersistentItem(key: string): void {
    localStorage.removeItem(key);
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
