import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from 'src/environment/environment';
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

  signIn(credentials: { phone: string; password: string }, rememberMe = false): Observable<any> {
    if (this.authenticated) {
      return throwError(() => new Error('User is already logged in.'));
    }

    return this.http.post(`${environment.apiUrl}auth/login`, credentials).pipe(
      switchMap((response: any) => {
        this.storeAuthResponse(response, rememberMe);
        return of(response);
      })
    );
  }

  forgotPassword(payload: { method: 'email'; email: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/forgot-password`, payload);
  }

  resetPassword(resetModel: {
    method: 'email';
    email: string;
    code: string;
    password: string;
    confirmPassword: string;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/reset-password`, resetModel);
  }

  private storeAuthResponse(response: any, rememberMe: boolean): void {
    if (response?.accessToken) {
      this.localStorageService.setAuthItem('accessToken', response.accessToken, rememberMe);
    }

    const userInfo = response?.userInfo ?? response;
    this.localStorageService.setAuthItem('userInfo', userInfo, rememberMe);
    this.authenticated = true;
  }
}
