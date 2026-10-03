import { Injectable } from '@angular/core';
import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from './local-storage.service';
import { ConnectivityService } from './connectivity.service';

/**
 * Set on background requests (e.g. Home cards): a 401 still clears the dead session, but the
 * user is not yanked to the login screen from whatever they were looking at.
 */
export const SKIP_LOGIN_REDIRECT = new HttpContextToken<boolean>(() => false);

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private localStorageService: LocalStorageService,
    private router: Router,
    private connectivityService: ConnectivityService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const accessToken = this.localStorageService.getRawItem('accessToken');
    const isApiRequest = request.url.startsWith(environment.apiUrl);
    const isAuthRequest = request.url.startsWith(`${environment.apiUrl}auth/`);
    const authRequest =
      isApiRequest && accessToken
        ? request.clone({
            setHeaders: {
              Authorization: `Bearer ${accessToken}`
            }
          })
        : request;

    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0) {
          if (!navigator.onLine) {
            this.connectivityService.markOffline();
          } else {
            this.connectivityService.clearOffline();
          }
        } else {
          this.connectivityService.clearOffline();
        }

        if (error.status === 401 && isApiRequest && !isAuthRequest && !!accessToken) {
          this.localStorageService.clearAuth();
          if (!request.context.get(SKIP_LOGIN_REDIRECT)) {
            this.router.navigate(['/login']);
          }
        }

        return throwError(() => error);
      })
    );
  }
}
