import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { PermissionRecord, PermissionsService } from './permissions.service';

declare const Swal: {
  fire(options: Record<string, unknown>): Promise<{ isConfirmed?: boolean }>;
};

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss']
})
export class PermissionsComponent implements OnInit {
  readonly breadcrumbs = [
    { label: 'Home', route: '/dashboard' },
    { label: 'Permissions List' }
  ];

  readonly pageSizeOptions = [10, 25, 50, 100];

  permissions: PermissionRecord[] = [];
  isLoading = true;
  isSaving = false;
  feedbackMessage = '';
  errorMessage = '';
  searchTerm = '';
  perPage = 10;
  currentPage = 1;
  editingPermissionId: number | null = null;
  permissionName = '';
  permissionCode = '';
  permissionGroupKey = '';
  permissionDescription = '';

  constructor(private permissionsService: PermissionsService) {}

  ngOnInit(): void {
    this.loadPermissions();
  }

  get filteredPermissions(): PermissionRecord[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.permissions;
    }

    return this.permissions.filter((permission) => {
      return permission.name.toLowerCase().includes(term)
        || permission.code.toLowerCase().includes(term)
        || permission.assignedRoles.some((role) => role.name.toLowerCase().includes(term));
    });
  }

  get totalEntries(): number {
    return this.filteredPermissions.length;
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.totalEntries / this.perPage), 1);
  }

  get pagedPermissions(): PermissionRecord[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredPermissions.slice(start, start + this.perPage);
  }

  get showingFrom(): number {
    if (!this.totalEntries) {
      return 0;
    }

    return (this.currentPage - 1) * this.perPage + 1;
  }

  get showingTo(): number {
    return Math.min(this.currentPage * this.perPage, this.totalEntries);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  onFiltersChange(): void {
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
  }

  trackByPermission(_: number, permission: PermissionRecord): number {
    return permission.id;
  }

  openCreatePermission(): void {
    this.editingPermissionId = null;
    this.permissionName = '';
    this.permissionCode = '';
    this.permissionGroupKey = '';
    this.permissionDescription = '';
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  openEditPermission(permission: PermissionRecord): void {
    this.editingPermissionId = permission.id;
    this.permissionName = permission.name;
    this.permissionCode = permission.code;
    this.permissionGroupKey = permission.groupKey;
    this.permissionDescription = permission.description;
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  async deletePermission(permission: PermissionRecord): Promise<void> {
    if (permission.isSystem) {
      return;
    }

    const result = await Swal.fire({
      title: 'Delete permission?',
      text: `Are you sure you want to delete ${permission.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    this.permissionsService.deletePermission(permission.id).subscribe({
      next: (response) => {
        this.feedbackMessage = response.message || 'Permission deleted successfully.';
        this.loadPermissions();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to delete permission right now.';
      }
    });
  }

  savePermission(): void {
    if (!this.permissionName.trim()) {
      this.errorMessage = 'Permission name is required.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.feedbackMessage = '';

    this.permissionsService.savePermission({
      id: this.editingPermissionId ?? undefined,
      name: this.permissionName.trim(),
      code: this.permissionCode.trim(),
      groupKey: this.permissionGroupKey.trim(),
      description: this.permissionDescription.trim(),
      status: true
    }).pipe(
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe({
      next: (response) => {
        this.permissions = response.items;
        this.feedbackMessage = this.editingPermissionId ? 'Permission updated successfully.' : 'Permission created successfully.';
        this.editingPermissionId = null;
        this.permissionName = '';
        this.permissionCode = '';
        this.permissionGroupKey = '';
        this.permissionDescription = '';
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to save permission right now.';
      }
    });
  }

  private loadPermissions(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.permissionsService.getPermissions().subscribe({
      next: (response) => {
        this.permissions = response.items;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load permissions right now.';
        this.isLoading = false;
      }
    });
  }
}
