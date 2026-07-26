import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

@Injectable({
  providedIn: 'root'
})
export class BackofficeAuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private router: Router,
    private authStateService: AuthStateService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.resolveRoute(state);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.resolveRoute(state);
  }

  private resolveRoute(state: RouterStateSnapshot): boolean | UrlTree {
    if (this.authStateService.isAuthenticated()) {
      const redirectTo = state.root.queryParams['redirectTo'] || '/dashboard';
      return this.router.createUrlTree([redirectTo]);
    }

    return true;
  }
}
