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

  get userInfo(): Record<string, unknown> | null {
    return this.localStorageService.getItem<Record<string, unknown>>('userInfo');
  }

  hasValidSession(): boolean {
    const hasToken = this.localStorageService.hasNonEmptyItem('accessToken');
    const hasUserInfo = this.localStorageService.hasNonEmptyItem('userInfo');
    this.authenticated = hasToken && hasUserInfo;
    return this.authenticated;
  }

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

  signUp(user: {
    name: string;
    email: string;
    password: string;
    phone: string;
    registrationCode?: string;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/register`, user);
  }

  resendRegistrationOtp(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/resend-registration-otp`, { email });
  }

  verifyRegistrationOtp(payload: { email: string; otp: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/verify-registration-otp`, payload).pipe(
      tap((response: any) => this.storeAuthResponse(response, false))
    );
  }

  getGoogleLoginUrl(returnUrl: string): string {
    const query = new URLSearchParams({ provider: 'google', returnUrl });
    return `${environment.apiUrl}auth/social-login?${query.toString()}`;
  }

  completeSocialSignIn(token: string): Observable<any> {
    this.accessToken = token;
    return this.getProfile().pipe(
      tap((response: any) => {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        const userInfo = parsed?.userData ?? parsed;
        this.localStorageService.setItem('userInfo', userInfo);
        this.authenticated = true;
      })
    );
  }

  getPasswordRecoveryConfig(): Observable<{
    methods: Array<'email' | 'mobile'>;
    mobileConfigured: boolean;
    otpLength: number;
  }> {
    return this.http.get<any>(`${environment.apiUrl}auth/password-recovery-config`);
  }

  forgotPassword(payload: { method: 'email'; email: string } | { method: 'mobile'; mobile: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/forgot-password`, payload);
  }

  verifyPasswordResetOtp(payload: {
    method: 'email' | 'mobile';
    email?: string;
    mobile?: string;
    otp: string;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/verify-password-reset-otp`, payload);
  }

  resetPassword(resetModel: {
    method: 'email' | 'mobile';
    email?: string;
    mobile?: string;
    code: string;
    password: string;
    confirmPassword: string;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/reset-password`, resetModel);
  }

  signOut(): Observable<any> {
    this.authenticated = false;
    return this.http.get(`${environment.apiUrl}auth/logout`).pipe(
      tap(() => this.localStorageService.clearAuth())
    );
  }

  getUserDetails(id: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}auth/user-details`, { id });
  }

  getProfile(): Observable<any> {
    return this.http.get(`${environment.apiUrl}auth/profile`);
  }

  saveProfile(profile: Record<string, unknown>): Observable<any> {
    const formData = new FormData();
    Object.entries(profile).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
        return;
      }

      formData.append(key, value === null || value === undefined ? '' : String(value));
    });

    return this.http.post(`${environment.apiUrl}auth/save-profile`, formData).pipe(
      tap((response: any) => {
        const userInfo = response?.userInfo ?? response;
        if (userInfo?.id) {
          this.localStorageService.setItem('userInfo', userInfo);
        }
      })
    );
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
