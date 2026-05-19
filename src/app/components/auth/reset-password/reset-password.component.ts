import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  showPassword = false;
  showConfirmPassword = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  readonly form = this.fb.group({
    code: ['', [Validators.required]],
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
    this.authService.resetPassword({
      code: this.form.get('code')?.value ?? '',
      password: this.form.get('password')?.value ?? '',
      password_confirmation: this.form.get('confirmPassword')?.value ?? ''
    }).subscribe({
      next: () => {
        this.successMessage = 'Password updated successfully. Please sign in.';
        this.submitting = false;
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to reset password right now.';
        this.submitting = false;
      }
    });
  }
}
