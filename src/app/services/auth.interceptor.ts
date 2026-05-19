import { Injectable } from '@angular/core';
import {
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
          this.connectivityService.markOffline();
        } else {
          this.connectivityService.clearOffline();
        }

        if (error.status === 401) {
          this.localStorageService.clear();
          this.router.navigate(['/login']);
        }

        return throwError(() => error);
      })
    );
  }
}
