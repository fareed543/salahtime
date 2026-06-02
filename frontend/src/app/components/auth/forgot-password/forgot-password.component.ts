import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthApiService } from 'src/app/services/auth-api.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  submitting = false;
  errorMessage = '';
  successMessage = '';

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthApiService
  ) {}

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.forgotPassword(this.form.get('email')?.value ?? '').subscribe({
      next: () => {
        this.successMessage = 'Reset instructions sent successfully.';
        this.submitting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to process forgot password right now.';
        this.submitting = false;
      }
    });
  }
}
