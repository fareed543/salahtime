import { UrlTree } from '@angular/router';
import { BackofficeAccessGuard } from './backoffice-access.guard';

describe('BackofficeAccessGuard', () => {
  let router: jasmine.SpyObj<any>;
  let authState: jasmine.SpyObj<any>;
  let authorization: jasmine.SpyObj<any>;
  let guard: BackofficeAccessGuard;

  const route = (allowedRoles?: string[]) => ({ data: allowedRoles ? { allowedRoles } : {} }) as any;
  const state = (url: string) => ({ url }) as any;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    router.createUrlTree.and.callFake((commands: unknown[], extras?: unknown) => ({ commands, extras }) as unknown as UrlTree);
    authState = jasmine.createSpyObj('AuthStateService', ['isAuthenticated', 'logout']);
    authorization = jasmine.createSpyObj('AuthorizationService', ['hasAnyRole']);
    guard = new BackofficeAccessGuard(router, authState, authorization);
  });

  describe('positive', () => {
    it('lets a signed-in admin with the right role in', () => {
      authState.isAuthenticated.and.returnValue(true);
      authorization.hasAnyRole.and.returnValue(true);
      expect(guard.canActivateChild(route(['administrator']), state('/users'))).toBeTrue();
      expect(authState.logout).not.toHaveBeenCalled();
    });

    it('sends someone without access to a page back to the dashboard', () => {
      authState.isAuthenticated.and.returnValue(true);
      authorization.hasAnyRole.and.returnValue(false);
      const result = guard.canActivateChild(route(['developer']), state('/developer/menu')) as any;
      expect(result.commands).toEqual(['/dashboard']);
      expect(authState.logout).not.toHaveBeenCalled();
    });

    it('sends a signed-out visitor to the login page and back afterwards', () => {
      authState.isAuthenticated.and.returnValue(false);
      const result = guard.canActivate(route(), state('/community/masjids')) as any;
      expect(result.commands).toEqual(['/login']);
      expect(result.extras.queryParams).toEqual({ redirectTo: '/community/masjids' });
    });
  });

  describe('negative', () => {
    it('signs out an account that may not even see the dashboard instead of looping', () => {
      authState.isAuthenticated.and.returnValue(true);
      authorization.hasAnyRole.and.returnValue(false);
      const result = guard.canActivateChild(route(['administrator']), state('/dashboard')) as any;
      expect(authState.logout).toHaveBeenCalled();
      expect(result.commands).toEqual(['/login']);
      expect(result.extras.queryParams).toEqual({ reason: 'no-access' });
    });

    it('treats /dashboard with a query or trailing slash as the dashboard too', () => {
      authState.isAuthenticated.and.returnValue(true);
      authorization.hasAnyRole.and.returnValue(false);
      for (const url of ['/dashboard?tab=1', '/dashboard/', '/dashboard#top']) {
        const result = guard.canActivateChild(route(['administrator']), state(url)) as any;
        expect(result.commands).withContext(url).toEqual(['/login']);
      }
    });

    it('never redirects the dashboard to itself', () => {
      authState.isAuthenticated.and.returnValue(true);
      authorization.hasAnyRole.and.returnValue(false);
      const result = guard.canActivateChild(route(['manager']), state('/dashboard')) as any;
      expect(result.commands).not.toEqual(['/dashboard']);
    });
  });
});
