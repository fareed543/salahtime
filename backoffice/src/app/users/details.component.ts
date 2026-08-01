import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { RolesService } from '../roles/roles.service';
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
  isSaving = false;
  feedbackMessage = '';
  errorMessage = '';
  mode: 'create' | 'view' | 'edit' = 'create';
  userId: number | null = null;
  auditDetails: { createdAt: string; updatedAt: string } | null = null;

  roleOptions: Array<{ id: number; label: string; code: string }> = [];

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
    password: ['', [Validators.minLength(8)]],
    roleId: [3, Validators.required],
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
    private router: Router,
    private rolesService: RolesService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] as 'create' | 'view' | 'edit' | undefined;
    this.mode = mode ?? 'create';
    this.userId = Number(this.route.snapshot.paramMap.get('id') || 0) || null;

    if (this.mode === 'create') {
      this.form.get('password')?.addValidators([Validators.required]);
      this.form.get('password')?.updateValueAndValidity();
      this.loadRoleOptions();
      return;
    }

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

    return 'Add a user with grouped profile, contact, account details, and a role.';
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
    if (this.isReadOnly || this.isSaving) {
      return;
    }

    this.submitted = true;
    this.feedbackMessage = '';
    this.errorMessage = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const rawValue = this.form.getRawValue();
    this.isSaving = true;

    this.usersService.saveUser({
      id: this.userId ?? undefined,
      firstname: rawValue.firstname ?? '',
      lastname: rawValue.lastname ?? '',
      username: rawValue.username ?? '',
      gender: rawValue.gender ?? 'm',
      email: rawValue.email ?? '',
      phone: rawValue.phone ?? '',
      password: rawValue.password ?? '',
      roleId: rawValue.roleId ?? rawValue.id_customer_type ?? 3,
      id_customer_type: rawValue.roleId ?? rawValue.id_customer_type ?? 3,
      designation: rawValue.designation ?? '',
      occupation: rawValue.occupation ?? '',
      company_name: rawValue.company_name ?? '',
      college_name: rawValue.college_name ?? '',
      address: rawValue.address ?? '',
      street: rawValue.street ?? '',
      landmark: rawValue.landmark ?? '',
      masjid: rawValue.masjid ?? '',
      pincode: rawValue.pincode ?? '',
      notes: rawValue.notes ?? '',
      active: !!rawValue.active,
      mobile_verified: !!rawValue.mobile_verified,
      email_verified: !!rawValue.email_verified,
      offline_access: !!rawValue.offline_access,
      email_notification: !!rawValue.email_notification
    }).pipe(
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe({
      next: (response) => {
        this.feedbackMessage = this.mode === 'create' ? 'User created successfully.' : 'User updated successfully.';
        this.patchFormFromUser(response);
        this.auditDetails = this.extractAuditDetails(response);
        if (this.mode === 'create' && response.id) {
          void this.router.navigate(['/users', response.id, 'edit']);
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to save the user right now.';
      }
    });
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
    this.errorMessage = '';

    this.usersService.getUserById(id).subscribe({
      next: (user) => {
        this.patchFormFromUser(user);
        this.auditDetails = this.extractAuditDetails(user);
        if (this.isReadOnly) {
          this.form.disable();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load user details.';
        this.isLoading = false;
      }
    });
  }

  private loadRoleOptions(): void {
    this.rolesService.getRoles().subscribe({
      next: (response) => {
        this.roleOptions = response.items.map((item) => ({
          id: item.id,
          label: item.name,
          code: item.code
        }));
        if (!this.userId) {
          this.form.patchValue({
            roleId: this.roleOptions[0]?.id ?? 3,
            id_customer_type: this.roleOptions[0]?.id ?? 3
          });
        }
      }
    });
  }

  private patchFormFromUser(user: AdminUserDetailResponse): void {
    this.roleOptions = user.roleOptions ?? [];
    this.form.patchValue({
      ...user,
      password: '',
      roleId: user.roleId ?? user.id_customer_type ?? (user.roleIds?.[0] ?? 3),
      id_customer_type: user.roleId ?? user.id_customer_type ?? (user.roleIds?.[0] ?? 3)
    });
  }

  private extractAuditDetails(user: AdminUserDetailResponse): { createdAt: string; updatedAt: string } {
    return {
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
