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

    return this.router.createUrlTree(['/dashboard']);
  }
}
