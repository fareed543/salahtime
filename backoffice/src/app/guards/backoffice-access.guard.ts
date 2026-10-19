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
import { AuthorizationService } from '../services/authorization.service';

@Injectable({
  providedIn: 'root'
})
export class BackofficeAccessGuard implements CanActivate, CanActivateChild {
  constructor(
    private router: Router,
    private authStateService: AuthStateService,
    private authorizationService: AuthorizationService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.resolveAccess(route, state);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.resolveAccess(route, state);
  }

  private resolveAccess(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (!this.authStateService.isAuthenticated()) {
      return this.router.createUrlTree(['/login'], {
        queryParams: { redirectTo: state.url }
      });
    }

    const allowedRoles = route.data?.['allowedRoles'] as string[] | undefined;
    if (this.authorizationService.hasAnyRole(allowedRoles)) {
      return true;
    }

    // Not allowed on the dashboard either: sending them "back" to /dashboard would run this guard
    // again forever and freeze the tab. Sign them out and explain on the login page instead.
    if (BackofficeAccessGuard.isDashboard(state.url)) {
      this.authStateService.logout();
      return this.router.createUrlTree(['/login'], { queryParams: { reason: 'no-access' } });
    }

    return this.router.createUrlTree(['/dashboard']);
  }

  private static isDashboard(url: string): boolean {
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
    return path === '/dashboard' || path === '';
  }
}
