import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private authenticated = false;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {}

  set accessToken(token: string) {
    this.localStorageService.setItem('accessToken', token);
  }

  get accessToken(): string {
    return this.localStorageService.getRawItem('accessToken') ?? '';
  }

  hasValidSession(): boolean {
    return this.localStorageService.hasNonEmptyItem('accessToken');
  }

  signIn(credentials: { phone: string; password: string }): Observable<any> {
    if (this.authenticated) {
      return throwError(() => new Error('User is already logged in.'));
    }

    return this.http.post(`${environment.apiUrl}auth/login`, credentials).pipe(
      switchMap((response: any) => {
        if (response?.accessToken) {
          this.accessToken = response.accessToken;
        }

        if (response?.userInfo) {
          this.localStorageService.setItem('userInfo', response.userInfo);
        }

        this.authenticated = true;
        return of(response);
      })
    );
  }

  signUp(user: {
    name: string;
    email: string;
    password: string;
    phone: string;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/register`, user);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/forgot-password`, { email });
  }

  resetPassword(resetModel: { code: string; password: string; password_confirmation: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/reset-password`, resetModel);
  }

  signOut(): Observable<any> {
    this.authenticated = false;
    return this.http.get(`${environment.apiUrl}auth/logout`).pipe(
      tap(() => this.localStorageService.clear())
    );
  }

  getUserDetails(id: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/user-details`, { id });
  }
}
