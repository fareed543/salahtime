import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminUserListItem, UsersService } from './users.service';

declare const Swal: {
  fire(options: Record<string, unknown>): Promise<{ isConfirmed?: boolean }>;
};

interface UsersSummaryCard {
  label: string;
  value: number;
  delta: string;
  subtext: string;
  icon: string;
  accent: string;
  trendClass: string;
}

@Component({
  selector: 'app-users-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  users: AdminUserListItem[] = [];
  isLoading = true;
  errorMessage = '';
  searchTerm = '';
  readonly pageSizeOptions = [10, 25, 50, 100];
  summaryCards: UsersSummaryCard[] = [];
  roleOptions: Array<{ id: number; label: string; code: string }> = [];
  genderOptions: Array<{ label: string; value: string }> = [];
  statusOptions: Array<{ label: string; value: string }> = [];
  selectedRoleId: number | null = null;
  selectedGender = '';
  selectedStatus = '';
  perPage = 10;
  page = 1;
  total = 0;
  totalPages = 1;
  deletingUserIds = new Set<number>();
  selectedUserIds = new Set<number>();

  constructor(private usersService: UsersService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get showingFrom(): number {
    if (!this.total) {
      return 0;
    }

    return (this.page - 1) * this.perPage + 1;
  }

  get showingTo(): number {
    return Math.min(this.page * this.perPage, this.total);
  }

  get pageNumbers(): number[] {
    if (this.totalPages <= 7) {
      return Array.from({ length: this.totalPages }, (_, index) => index + 1);
    }

    if (this.page <= 4) {
      return [1, 2, 3, 4, 5, -1, this.totalPages];
    }

    if (this.page >= this.totalPages - 3) {
      return [1, -1, this.totalPages - 4, this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages];
    }

    return [1, -1, this.page - 1, this.page, this.page + 1, -1, this.totalPages];
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Users' }
    ];
  }

  get selectedCount(): number {
    return this.selectedUserIds.size;
  }

  get hasSelectedUsers(): boolean {
    return this.selectedCount > 0;
  }

  get isAllRowsSelected(): boolean {
    return !!this.users.length && this.users.every((user) => this.selectedUserIds.has(user.id));
  }

  get isBulkDeleting(): boolean {
    return this.users.some((user) => this.isDeletingUser(user.id));
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.page = 1;
    this.loadUsers();
  }

  onPerPageChange(value: string): void {
    this.perPage = Number(value);
    this.page = 1;
    this.loadUsers();
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadUsers();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) {
      return;
    }

    this.page = page;
    this.loadUsers();
  }

  trackByUserId(_: number, user: AdminUserListItem): number {
    return user.id;
  }

  isDeletingUser(userId: number): boolean {
    return this.deletingUserIds.has(userId);
  }

  isEllipsis(pageNumber: number): boolean {
    return pageNumber === -1;
  }

  toggleAllRows(checked: boolean): void {
    if (checked) {
      this.users.forEach((user) => this.selectedUserIds.add(user.id));
      return;
    }

    this.users.forEach((user) => this.selectedUserIds.delete(user.id));
  }

  toggleRowSelection(userId: number, checked: boolean): void {
    if (checked) {
      this.selectedUserIds.add(userId);
      return;
    }

    this.selectedUserIds.delete(userId);
  }

  async confirmDelete(user: AdminUserListItem): Promise<void> {
    if (this.isDeletingUser(user.id)) {
      return;
    }

    const result = await Swal.fire({
      title: 'Delete user?',
      text: `Are you sure you want to delete ${user.fullName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    this.deletingUserIds.add(user.id);
    this.usersService.deleteUser(user.id)
      .pipe(
        finalize(() => {
          this.deletingUserIds.delete(user.id);
        })
      )
      .subscribe({
        next: (response) => {
          const shouldMoveToPreviousPage = this.users.length === 1 && this.page > 1;
          if (shouldMoveToPreviousPage) {
            this.page -= 1;
          }

          this.loadUsers();
          void Swal.fire({
            title: 'Deleted',
            text: response?.message || 'User deleted successfully.',
            icon: 'success',
            confirmButtonText: 'OK',
          });
        },
        error: (error) => {
          void Swal.fire({
            title: 'Delete failed',
            text: error?.error?.error || error?.message || 'Unable to delete the user right now.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        },
      });
  }

  async confirmBulkDelete(): Promise<void> {
    if (!this.hasSelectedUsers || this.isBulkDeleting) {
      return;
    }

    const result = await Swal.fire({
      title: 'Delete selected users?',
      text: `Are you sure you want to delete ${this.selectedCount} selected ${this.selectedCount === 1 ? 'user' : 'users'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    const ids = Array.from(this.selectedUserIds);
    ids.forEach((id) => this.deletingUserIds.add(id));

    this.usersService.bulkDeleteUsers(ids)
      .pipe(
        finalize(() => {
          ids.forEach((id) => this.deletingUserIds.delete(id));
        })
      )
      .subscribe({
        next: (response) => {
          const shouldMoveToPreviousPage = this.selectedCount === this.users.length && this.page > 1;
          if (shouldMoveToPreviousPage) {
            this.page -= 1;
          }

          this.selectedUserIds.clear();
          this.loadUsers();
          void Swal.fire({
            title: 'Deleted',
            text: response?.message || 'Selected users deleted successfully.',
            icon: 'success',
            confirmButtonText: 'OK',
          });
        },
        error: (error) => {
          void Swal.fire({
            title: 'Delete failed',
            text: error?.error?.error || error?.message || 'Unable to delete the selected users right now.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        },
      });
  }

  getRoleIcon(roleName: string): string {
    const role = roleName.toLowerCase();

    if (role.includes('admin')) {
      return 'bx bx-desktop text-danger';
    }

    if (role.includes('author')) {
      return 'bx bx-edit text-warning';
    }

    if (role.includes('editor')) {
      return 'bx bx-pie-chart-alt text-info';
    }

    if (role.includes('subscriber') || role.includes('user')) {
      return 'bx bx-crown text-primary';
    }

    return 'bx bx-user text-success';
  }

  getPlanLabel(user: AdminUserListItem): string {
    if (user.roleId === 1) {
      return 'Enterprise';
    }

    if (user.roleId === 2) {
      return 'Team';
    }

    return user.active ? 'Basic' : 'Company';
  }

  getBillingLabel(user: AdminUserListItem): string {
    if (user.active && user.emailVerified) {
      return 'Auto Debit';
    }

    if (user.mobileVerified) {
      return 'Manual - Cash';
    }

    return 'Manual - Paypal';
  }

  getUserInitials(user: AdminUserListItem): string {
    const label = (user.fullName || user.firstName || user.phone || user.email || 'U').trim();
    return label.slice(0, 2).toUpperCase();
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.usersService.getUsers(this.page, this.perPage, this.searchTerm, {
      roleId: this.selectedRoleId,
      gender: this.selectedGender,
      status: this.selectedStatus
    }).subscribe({
      next: (response) => {
        this.users = Array.isArray(response.items) ? response.items : [];
        this.selectedUserIds.forEach((id) => {
          if (!this.users.some((user) => user.id === id)) {
            this.selectedUserIds.delete(id);
          }
        });
        this.summaryCards = this.buildSummaryCards(response.summary);
        this.roleOptions = response.filterOptions?.roles ?? [];
        this.genderOptions = response.filterOptions?.genders ?? [];
        this.statusOptions = response.filterOptions?.statuses ?? [];
        this.total = response.pagination.total;
        this.totalPages = Math.max(response.pagination.totalPages, 1);
        this.page = response.pagination.page;
        this.perPage = response.pagination.perPage;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load users right now.';
        this.isLoading = false;
      }
    });
  }

  private buildSummaryCards(summary: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
  }): UsersSummaryCard[] {
    return [
      {
        label: 'Users',
        value: summary.totalUsers,
        delta: `+${summary.totalUsers ? Math.round((summary.activeUsers / summary.totalUsers) * 100) : 0}%`,
        subtext: 'Total registered users',
        icon: 'bx bx-group',
        accent: 'primary',
        trendClass: 'text-success'
      },
      {
        label: 'Active Users',
        value: summary.activeUsers,
        delta: `+${summary.totalUsers ? Math.round((summary.activeUsers / summary.totalUsers) * 100) : 0}%`,
        subtext: 'Currently active users',
        icon: 'bx bx-user-check',
        accent: 'success',
        trendClass: 'text-success'
      },
      {
        label: 'Inactive Users',
        value: summary.inactiveUsers,
        delta: `-${summary.totalUsers ? Math.round((summary.inactiveUsers / summary.totalUsers) * 100) : 0}%`,
        subtext: 'Users needing attention',
        icon: 'bx bx-user-x',
        accent: 'danger',
        trendClass: 'text-danger'
      },
      {
        label: 'Admin Users',
        value: summary.adminUsers,
        delta: `${summary.totalUsers ? Math.round((summary.adminUsers / summary.totalUsers) * 100) : 0}%`,
        subtext: 'Administrative accounts',
        icon: 'bx bx-user-voice',
        accent: 'warning',
        trendClass: 'text-success'
      }
    ];
  }
}
