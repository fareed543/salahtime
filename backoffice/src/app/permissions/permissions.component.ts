import { Component } from '@angular/core';

interface AssignedRole {
  label: string;
  className: string;
}

interface PermissionRow {
  id: number;
  name: string;
  assignedTo: AssignedRole[];
  createdDate: string;
}

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss']
})
export class PermissionsComponent {
  readonly breadcrumbs = [
    { label: 'Home', route: '/dashboard' },
    { label: 'Permissions List' }
  ];

  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly permissions: PermissionRow[] = [
    {
      id: 1,
      name: 'Management',
      assignedTo: [{ label: 'Administrator', className: 'bg-label-primary' }],
      createdDate: '14 Apr 2021, 8:43 PM'
    },
    {
      id: 2,
      name: 'Manage Billing & Roles',
      assignedTo: [{ label: 'Administrator', className: 'bg-label-primary' }],
      createdDate: '16 Sep 2021, 5:20 PM'
    },
    {
      id: 3,
      name: 'Add & Remove Users',
      assignedTo: [
        { label: 'Administrator', className: 'bg-label-primary' },
        { label: 'Manager', className: 'bg-label-warning' }
      ],
      createdDate: '14 Oct 2021, 10:20 AM'
    },
    {
      id: 4,
      name: 'Project Planning',
      assignedTo: [
        { label: 'Administrator', className: 'bg-label-primary' },
        { label: 'Users', className: 'bg-label-success' },
        { label: 'Support', className: 'bg-label-info' }
      ],
      createdDate: '14 May 2021, 12:10 PM'
    },
    {
      id: 5,
      name: 'Manage Email Sequences',
      assignedTo: [
        { label: 'Administrator', className: 'bg-label-primary' },
        { label: 'Users', className: 'bg-label-success' },
        { label: 'Support', className: 'bg-label-info' }
      ],
      createdDate: '23 Aug 2021, 2:00 PM'
    },
    {
      id: 6,
      name: 'Client Communication',
      assignedTo: [
        { label: 'Administrator', className: 'bg-label-primary' },
        { label: 'Manager', className: 'bg-label-warning' }
      ],
      createdDate: '15 Apr 2021, 11:30 AM'
    },
    {
      id: 7,
      name: 'Only View',
      assignedTo: [
        { label: 'Administrator', className: 'bg-label-primary' },
        { label: 'Restricted User', className: 'bg-label-danger' }
      ],
      createdDate: '04 Dec 2021, 8:15 PM'
    },
    {
      id: 8,
      name: 'Financial Management',
      assignedTo: [
        { label: 'Administrator', className: 'bg-label-primary' },
        { label: 'Manager', className: 'bg-label-warning' }
      ],
      createdDate: '25 Feb 2021, 10:30 AM'
    },
    {
      id: 9,
      name: 'Manage Others Tasks',
      assignedTo: [
        { label: 'Administrator', className: 'bg-label-primary' },
        { label: 'Support', className: 'bg-label-info' }
      ],
      createdDate: '04 Nov 2021, 11:45 AM'
    }
  ];

  searchTerm = '';
  perPage = 10;
  currentPage = 1;
  selectedPermissionName = '';
  isCorePermission = false;
  editPermissionName = 'Management';
  editCorePermission = true;

  get filteredPermissions(): PermissionRow[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.permissions.filter((permission) => {
      if (!term) {
        return true;
      }

      return permission.name.toLowerCase().includes(term)
        || permission.assignedTo.some((role) => role.label.toLowerCase().includes(term))
        || permission.createdDate.toLowerCase().includes(term);
    });
  }

  get totalEntries(): number {
    return this.filteredPermissions.length;
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.totalEntries / this.perPage), 1);
  }

  get pagedPermissions(): PermissionRow[] {
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

  trackByPermission(_: number, permission: PermissionRow): number {
    return permission.id;
  }
}
