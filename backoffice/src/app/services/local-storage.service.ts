import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  getRawItem(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
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

  clearAuth(): void {
    ['accessToken', 'userInfo'].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }
}
