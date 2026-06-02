import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
    countryCode: ['+91', [Validators.required]],
    phone: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthApiService,
    private router: Router
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
    const countryCode = this.form.get('countryCode')?.value ?? '';
    const phone = this.form.get('phone')?.value ?? '';

    this.authService.signUp({
      name: `${firstName} ${lastName}`.trim(),
      email: this.form.get('email')?.value ?? '',
      password: this.form.get('password')?.value ?? '',
      phone: `${countryCode}${phone}`
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Account created successfully. Please sign in.';
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to create your account right now.';
        this.submitting = false;
      }
    });
  }
}
