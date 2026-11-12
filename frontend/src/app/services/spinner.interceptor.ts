import { Injectable } from '@angular/core';
import {
  HttpContextToken,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SpinnerService } from './spinner.service';

/** Set on background requests (e.g. a like) that must not cover the screen with the spinner. */
export const SKIP_SPINNER = new HttpContextToken<boolean>(() => false);

@Injectable()
export class SpinnerInterceptor implements HttpInterceptor {
  constructor(private spinnerService: SpinnerService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isApiRequest = request.url.startsWith(environment.apiUrl);

    if (!isApiRequest || request.context.get(SKIP_SPINNER)) {
      return next.handle(request);
    }

    this.spinnerService.show();
    return next.handle(request).pipe(
      finalize(() => this.spinnerService.hide())
    );
  }
}
