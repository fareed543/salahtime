import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { RoleRecord, RolesService } from './roles.service';

declare const Swal: {
  fire(options: Record<string, unknown>): Promise<{ isConfirmed?: boolean }>;
};

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class RolesComponent implements OnInit {
  readonly breadcrumbs = [
    { label: 'Home', route: '/dashboard' },
    { label: 'Roles List' }
  ];

  readonly pageSizeOptions = [10, 25, 50, 100];

  roles: RoleRecord[] = [];
  permissionOptions: Array<{ id: number; label: string; code: string; groupKey: string }> = [];
  isLoading = true;
  isSaving = false;
  feedbackMessage = '';
  errorMessage = '';
  searchTerm = '';
  perPage = 10;
  currentPage = 1;
  editingRoleId: number | null = null;
  roleName = '';
  roleDescription = '';
  selectedPermissionIds: number[] = [];

  constructor(private rolesService: RolesService) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  get filteredRoles(): RoleRecord[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.roles;
    }

    return this.roles.filter((role) => {
      return role.name.toLowerCase().includes(term)
        || role.code.toLowerCase().includes(term)
        || role.permissions.some((permission) => permission.name.toLowerCase().includes(term));
    });
  }

  get totalEntries(): number {
    return this.filteredRoles.length;
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.totalEntries / this.perPage), 1);
  }

  get pagedRoles(): RoleRecord[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredRoles.slice(start, start + this.perPage);
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

  get roleCards(): RoleRecord[] {
    return this.roles.slice(0, 5);
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

  trackByRole(_: number, row: RoleRecord): number {
    return row.id;
  }

  openCreateRole(): void {
    this.editingRoleId = null;
    this.roleName = '';
    this.roleDescription = '';
    this.selectedPermissionIds = [];
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  openEditRole(role: RoleRecord): void {
    this.editingRoleId = role.id;
    this.roleName = role.name;
    this.roleDescription = role.description;
    this.selectedPermissionIds = role.permissions.map((permission) => permission.id);
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  async deleteRole(role: RoleRecord): Promise<void> {
    if (role.isSystem) {
      return;
    }

    const result = await Swal.fire({
      title: 'Delete role?',
      text: `Are you sure you want to delete ${role.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    this.rolesService.deleteRole(role.id).subscribe({
      next: (response) => {
        this.feedbackMessage = response.message || 'Role deleted successfully.';
        this.loadRoles();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to delete role right now.';
      }
    });
  }

  saveRole(): void {
    if (!this.roleName.trim()) {
      this.errorMessage = 'Role name is required.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.feedbackMessage = '';

    this.rolesService.saveRole({
      id: this.editingRoleId ?? undefined,
      name: this.roleName.trim(),
      description: this.roleDescription.trim(),
      status: true,
      permissionIds: this.selectedPermissionIds
    }).pipe(
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe({
      next: (response) => {
        this.roles = response.items;
        this.permissionOptions = response.permissionOptions;
        this.feedbackMessage = this.editingRoleId ? 'Role updated successfully.' : 'Role created successfully.';
        this.editingRoleId = null;
        this.roleName = '';
        this.roleDescription = '';
        this.selectedPermissionIds = [];
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to save role right now.';
      }
    });
  }

  private loadRoles(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.rolesService.getRoles().subscribe({
      next: (response) => {
        this.roles = response.items;
        this.permissionOptions = response.permissionOptions;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load roles right now.';
        this.isLoading = false;
      }
    });
  }
}
