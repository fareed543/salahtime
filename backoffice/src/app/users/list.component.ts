import { Component, OnInit } from '@angular/core';
import { AdminUserListItem, UsersService } from './users.service';

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
  customerTypeOptions: Array<{ label: string; value: number }> = [];
  genderOptions: Array<{ label: string; value: string }> = [];
  statusOptions: Array<{ label: string; value: string }> = [];
  selectedCustomerTypeId: number | null = null;
  selectedGender = '';
  selectedStatus = '';
  perPage = 10;
  page = 1;
  total = 0;
  totalPages = 1;

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

  isEllipsis(pageNumber: number): boolean {
    return pageNumber === -1;
  }

  getRoleIcon(customerType: string): string {
    const role = customerType.toLowerCase();

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
    if (user.customerTypeId === 1) {
      return 'Enterprise';
    }

    if (user.customerTypeId === 2) {
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

  private loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.usersService.getUsers(this.page, this.perPage, this.searchTerm, {
      customerTypeId: this.selectedCustomerTypeId,
      gender: this.selectedGender,
      status: this.selectedStatus
    }).subscribe({
      next: (response) => {
        this.users = response.items;
        this.summaryCards = this.buildSummaryCards(response.summary);
        this.customerTypeOptions = response.filterOptions.customerTypes;
        this.genderOptions = response.filterOptions.genders;
        this.statusOptions = response.filterOptions.statuses;
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
