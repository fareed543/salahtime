import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  getItem<T>(key: string): T | null {
    const rawValue = localStorage.getItem(key);
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
    const value = localStorage.getItem(key);
    return value !== null && value !== '' && value !== 'null' && value !== 'undefined';
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}
