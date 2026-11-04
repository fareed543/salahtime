import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  showPassword = false;
  showConfirmPassword = false;
  submitting = false;
  readonly email: string;

  readonly form = this.fb.group({
    code: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    if (!this.email) {
      void this.router.navigate(['/forgot-password']);
    }
  }

  togglePassword(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
      return;
    }

    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) {
      return;
    }

    if (this.form.get('password')?.value !== this.form.get('confirmPassword')?.value) {
      this.toast.warning('Passwords do not match.');
      return;
    }

    this.submitting = true;
    this.authService.resetPassword({
      method: 'email',
      email: this.email,
      code: this.form.get('code')?.value ?? '',
      password: this.form.get('password')?.value ?? '',
      confirmPassword: this.form.get('confirmPassword')?.value ?? ''
    }).subscribe({
      next: () => {
        this.toast.success('Password updated successfully. Please sign in.');
        this.submitting = false;
        void this.router.navigate(['/login']);
      },
      error: (error) => {
        this.toast.error(error?.error?.message || 'Unable to reset password right now.');
        this.submitting = false;
      }
    });
  }
}
