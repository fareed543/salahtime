import { Injectable } from '@angular/core';
import { BackofficeUser, AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {
  constructor(private authStateService: AuthStateService) {}

  hasAnyRole(allowedRoles?: string[] | null, user?: BackofficeUser | null): boolean {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const normalizedUserRole = this.getNormalizedRole(user ?? this.authStateService.getCurrentUser());
    if (!normalizedUserRole) {
      return false;
    }

    return allowedRoles.some((role) => this.normalizeRole(role) === normalizedUserRole);
  }

  getNormalizedRole(user?: BackofficeUser | null): string {
    const currentUser = user ?? this.authStateService.getCurrentUser();
    if (!currentUser) {
      return '';
    }

    const roleFromName = this.normalizeRole(currentUser.customerType);
    if (roleFromName) {
      return roleFromName;
    }

    return this.mapRoleFromTypeId(currentUser.customerTypeId);
  }

  getDisplayRole(user?: BackofficeUser | null): string {
    const currentUser = user ?? this.authStateService.getCurrentUser();
    return currentUser?.customerType?.trim() || 'Back Office User';
  }

  getDisplayName(user?: BackofficeUser | null): string {
    const currentUser = user ?? this.authStateService.getCurrentUser();
    const fullName = `${currentUser?.firstname ?? ''} ${currentUser?.lastname ?? ''}`.trim();

    return fullName || currentUser?.email || currentUser?.phone || 'Back Office User';
  }

  normalizeRole(role?: string | null): string {
    const normalized = (role ?? '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (normalized === 'super-admin') {
      return 'administrator';
    }

    return normalized;
  }

  private mapRoleFromTypeId(customerTypeId?: number | null): string {
    switch (customerTypeId) {
      case 1:
        return 'administrator';
      case 2:
        return 'manager';
      case 3:
        return 'users';
      case 4:
        return 'support';
      case 5:
        return 'restricted-user';
      default:
        return '';
    }
  }
}
