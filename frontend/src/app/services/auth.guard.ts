import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthApiService } from './auth-api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthApiService,
    private router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.authService.hasValidSession()) {
      return true;
    }

    return this.router.createUrlTree(['/login']);
  }
}
