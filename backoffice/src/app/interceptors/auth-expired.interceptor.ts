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
import { AuthStateService } from '../services/auth-state.service';

@Injectable()
export class AuthExpiredInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private authStateService: AuthStateService
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && this.authStateService.isAuthenticated()) {
          this.authStateService.logout();
          void this.router.navigate(['/login'], {
            queryParams: { redirectTo: this.router.url }
          });
        }

        return throwError(() => error);
      })
    );
  }
}
