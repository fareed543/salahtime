import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly authKeys = new Set(['accessToken', 'userInfo']);

  getItem<T>(key: string): T | null {
    const rawValue = this.getRawItem(key);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return rawValue as T;
    }
  }

  getRawItem(key: string): string | null {
    if (this.authKeys.has(key)) {
      return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    }
    return localStorage.getItem(key);
  }

  setItem(key: string, value: unknown): void {
    if (typeof value === 'string') {
      localStorage.setItem(key, value);
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }

  hasNonEmptyItem(key: string): boolean {
    const value = this.getRawItem(key);
    return value !== null && value !== '' && value !== 'null' && value !== 'undefined';
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
    if (this.authKeys.has(key)) {
      sessionStorage.removeItem(key);
    }
  }

  setAuthItem(key: 'accessToken' | 'userInfo', value: unknown, rememberMe: boolean): void {
    const target = rememberMe ? localStorage : sessionStorage;
    const other = rememberMe ? sessionStorage : localStorage;
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

    other.removeItem(key);
    target.setItem(key, serializedValue);
  }

  clearAuth(): void {
    this.authKeys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  clear(): void {
    localStorage.clear();
    sessionStorage.clear();
  }
}
