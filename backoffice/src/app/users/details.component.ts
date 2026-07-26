import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminUserDetailResponse, UsersService } from './users.service';

interface UserOption {
  label: string;
  value: string | number;
}

@Component({
  selector: 'app-users-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})
export class DetailsComponent implements OnInit {
  submitted = false;
  isLoading = false;
  mode: 'create' | 'view' | 'edit' = 'create';
  userId: number | null = null;
  auditDetails: { createdAt: string; updatedAt: string } | null = null;

  readonly customerTypes: UserOption[] = [
    { label: 'Admin', value: 1 },
    { label: 'Masjid', value: 2 },
    { label: 'User', value: 3 }
  ];

  readonly genderOptions: UserOption[] = [
    { label: 'Male', value: 'm' },
    { label: 'Female', value: 'f' }
  ];

  readonly form = this.fb.group({
    firstname: ['', Validators.required],
    lastname: [''],
    username: [''],
    gender: ['m'],
    email: ['', Validators.email],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    id_customer_type: [3, Validators.required],
    designation: [''],
    occupation: [''],
    company_name: [''],
    college_name: [''],
    address: [''],
    street: [''],
    landmark: [''],
    masjid: [''],
    pincode: [''],
    notes: [''],
    active: [true],
    mobile_verified: [false],
    email_verified: [false],
    offline_access: [false],
    email_notification: [true]
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] as 'create' | 'view' | 'edit' | undefined;
    this.mode = mode ?? 'create';
    const idParam = this.route.snapshot.paramMap.get('id');
    this.userId = idParam ? Number(idParam) : null;

    if (this.userId) {
      this.loadUser(this.userId);
    }
  }

  get title(): string {
    if (this.mode === 'edit') {
      return 'Edit User';
    }

    if (this.mode === 'view') {
      return 'View User';
    }

    return 'Create User';
  }

  get subtitle(): string {
    if (this.mode === 'edit') {
      return 'Update the selected user information and account details.';
    }

    if (this.mode === 'view') {
      return 'Review the selected user information and grouped account details.';
    }

    return 'Add a user with grouped profile, contact, and account details.';
  }

  get isReadOnly(): boolean {
    return this.mode === 'view';
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Users', route: '/users' },
      { label: this.title }
    ];
  }

  submit(): void {
    if (this.isReadOnly) {
      return;
    }

    this.submitted = true;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.hasError(errorName);
  }

  formatAuditDate(value: string | null | undefined): string {
    if (!value) {
      return 'Not available';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  private loadUser(id: number): void {
    this.isLoading = true;

    this.usersService.getUserById(id).subscribe({
      next: (user) => {
        this.form.patchValue(user);
        this.auditDetails = this.extractAuditDetails(user);
        if (this.isReadOnly) {
          this.form.disable();
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private extractAuditDetails(user: AdminUserDetailResponse): { createdAt: string; updatedAt: string } {
    return {
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
