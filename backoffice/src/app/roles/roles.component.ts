import { Component } from '@angular/core';

interface RoleCardUser {
  name: string;
  initials: string;
  accent: string;
}

interface RoleCard {
  name: string;
  totalUsers: number;
  users: RoleCardUser[];
  extraUsers?: number;
}

interface RoleTableRow {
  id: number;
  name: string;
  email: string;
  role: string;
  roleIcon: string;
  roleIconClass: string;
  plan: string;
  billing: string;
  status: 'Active' | 'Inactive' | 'Pending';
  statusClass: string;
}

interface PermissionGroup {
  key: string;
  label: string;
}

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class RolesComponent {
  readonly breadcrumbs = [
    { label: 'Home', route: '/dashboard' },
    { label: 'Roles List' }
  ];

  readonly roleCards: RoleCard[] = [
    {
      name: 'Administrator',
      totalUsers: 4,
      users: [
        { name: 'Vinnie Mostowy', initials: 'VM', accent: 'primary' },
        { name: 'Allen Rieske', initials: 'AR', accent: 'success' },
        { name: 'Julee Rossignol', initials: 'JR', accent: 'warning' },
        { name: 'Kaith Dsouza', initials: 'KD', accent: 'danger' }
      ]
    },
    {
      name: 'Manager',
      totalUsers: 7,
      users: [
        { name: 'Jimmy Ressula', initials: 'JR', accent: 'info' },
        { name: 'John Doe', initials: 'JD', accent: 'primary' },
        { name: 'Kristi Lawker', initials: 'KL', accent: 'success' }
      ],
      extraUsers: 4
    },
    {
      name: 'Users',
      totalUsers: 5,
      users: [
        { name: 'Andrew Tye', initials: 'AT', accent: 'warning' },
        { name: 'Rishi Swaat', initials: 'RS', accent: 'info' },
        { name: 'Rossie Kim', initials: 'RK', accent: 'danger' }
      ],
      extraUsers: 2
    },
    {
      name: 'Support',
      totalUsers: 3,
      users: [
        { name: 'Kim Karlos', initials: 'KK', accent: 'primary' },
        { name: 'Katy Turner', initials: 'KT', accent: 'success' },
        { name: 'Peter Adward', initials: 'PA', accent: 'warning' }
      ],
      extraUsers: 3
    },
    {
      name: 'Restricted User',
      totalUsers: 2,
      users: [
        { name: 'Kim Merchent', initials: 'KM', accent: 'danger' },
        { name: 'Sam Dsouza', initials: 'SD', accent: 'info' },
        { name: 'Nurvi Karlos', initials: 'NK', accent: 'primary' }
      ],
      extraUsers: 7
    }
  ];

  readonly roleRows: RoleTableRow[] = [
    {
      id: 1,
      name: 'Zsazsa McCleverty',
      email: 'zmcclevertye@soundcloud.com',
      role: 'Maintainer',
      roleIcon: 'bx bx-user',
      roleIconClass: 'text-success',
      plan: 'Enterprise',
      billing: 'Auto Debit',
      status: 'Active',
      statusClass: 'bg-label-success'
    },
    {
      id: 2,
      name: 'Yoko Pottie',
      email: 'ypottiec@privacy.gov.au',
      role: 'Subscriber',
      roleIcon: 'bx bx-crown',
      roleIconClass: 'text-primary',
      plan: 'Basic',
      billing: 'Auto Debit',
      status: 'Inactive',
      statusClass: 'bg-label-secondary'
    },
    {
      id: 3,
      name: 'Stephen Offenner',
      email: 'soffner19@mac.com',
      role: 'Admin',
      roleIcon: 'bx bx-desktop',
      roleIconClass: 'text-danger',
      plan: 'Company',
      billing: 'Manual - Cash',
      status: 'Pending',
      statusClass: 'bg-label-warning'
    },
    {
      id: 4,
      name: 'Stephen MacGilfoyle',
      email: 'smacgilfoyley@bigcartel.com',
      role: 'Maintainer',
      roleIcon: 'bx bx-user',
      roleIconClass: 'text-success',
      plan: 'Company',
      billing: 'Manual - Paypal',
      status: 'Pending',
      statusClass: 'bg-label-warning'
    },
    {
      id: 5,
      name: 'Skip Hebblethwaite',
      email: 'shebblethwaite10@arizona.edu',
      role: 'Admin',
      roleIcon: 'bx bx-desktop',
      roleIconClass: 'text-danger',
      plan: 'Company',
      billing: 'Manual - Cash',
      status: 'Inactive',
      statusClass: 'bg-label-secondary'
    },
    {
      id: 6,
      name: 'Rosie Smithett',
      email: 'rsmithett@example.com',
      role: 'Editor',
      roleIcon: 'bx bx-edit',
      roleIconClass: 'text-warning',
      plan: 'Team',
      billing: 'Auto Debit',
      status: 'Active',
      statusClass: 'bg-label-success'
    },
    {
      id: 7,
      name: 'Benedict Howe',
      email: 'bhowe@example.com',
      role: 'Author',
      roleIcon: 'bx bx-pie-chart-alt',
      roleIconClass: 'text-info',
      plan: 'Enterprise',
      billing: 'Manual - Paypal',
      status: 'Pending',
      statusClass: 'bg-label-warning'
    },
    {
      id: 8,
      name: 'Anita Ford',
      email: 'aford@example.com',
      role: 'Subscriber',
      roleIcon: 'bx bx-crown',
      roleIconClass: 'text-primary',
      plan: 'Basic',
      billing: 'Auto Debit',
      status: 'Active',
      statusClass: 'bg-label-success'
    },
    {
      id: 9,
      name: 'Marc Paxton',
      email: 'mpaxton@example.com',
      role: 'Manager',
      roleIcon: 'bx bx-briefcase-alt-2',
      roleIconClass: 'text-primary',
      plan: 'Team',
      billing: 'Manual - Cash',
      status: 'Active',
      statusClass: 'bg-label-success'
    },
    {
      id: 10,
      name: 'Olivia Blake',
      email: 'oblake@example.com',
      role: 'Support',
      roleIcon: 'bx bx-support',
      roleIconClass: 'text-info',
      plan: 'Company',
      billing: 'Manual - Paypal',
      status: 'Inactive',
      statusClass: 'bg-label-secondary'
    }
  ];

  readonly permissionGroups: PermissionGroup[] = [
    { key: 'userManagement', label: 'User Management' },
    { key: 'contentManagement', label: 'Content Management' },
    { key: 'dispManagement', label: 'Disputes Management' },
    { key: 'dbManagement', label: 'Database Management' },
    { key: 'finManagement', label: 'Financial Management' },
    { key: 'reporting', label: 'Reporting' },
    { key: 'api', label: 'API Control' },
    { key: 'repo', label: 'Repository Management' },
    { key: 'payroll', label: 'Payroll' }
  ];

  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly roleOptions = ['Admin', 'Author', 'Editor', 'Maintainer', 'Subscriber', 'Manager', 'Support'];
  readonly planOptions = ['Basic', 'Company', 'Enterprise', 'Team'];

  searchTerm = '';
  selectedRole = '';
  selectedPlan = '';
  perPage = 10;
  currentPage = 1;

  get filteredRows(): RoleTableRow[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.roleRows.filter((row) => {
      const matchesSearch = !term
        || row.name.toLowerCase().includes(term)
        || row.email.toLowerCase().includes(term);
      const matchesRole = !this.selectedRole || row.role === this.selectedRole;
      const matchesPlan = !this.selectedPlan || row.plan === this.selectedPlan;

      return matchesSearch && matchesRole && matchesPlan;
    });
  }

  get totalEntries(): number {
    return this.filteredRows.length;
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.totalEntries / this.perPage), 1);
  }

  get pagedRows(): RoleTableRow[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredRows.slice(start, start + this.perPage);
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

  trackByRole(_: number, row: RoleTableRow): number {
    return row.id;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
