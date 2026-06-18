import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  showPassword = false;
  showConfirmPassword = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  readonly form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  togglePassword(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
      return;
    }

    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.form.get('password')?.value !== this.form.get('confirmPassword')?.value) {
      if (this.form.get('password')?.value !== this.form.get('confirmPassword')?.value) {
        this.errorMessage = 'Passwords do not match.';
      }
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const firstName = this.form.get('firstName')?.value ?? '';
    const lastName = this.form.get('lastName')?.value ?? '';
    const phone = this.form.get('phone')?.value ?? '';

    this.authService.signUp({
      name: `${firstName} ${lastName}`.trim(),
      email: this.form.get('email')?.value ?? '',
      password: this.form.get('password')?.value ?? '',
      phone
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Account created successfully. Please sign in.';
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigate(['/login'], {
          queryParams: returnUrl ? { returnUrl } : {}
        });
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to create your account right now.';
        this.submitting = false;
      }
    });
  }
}
