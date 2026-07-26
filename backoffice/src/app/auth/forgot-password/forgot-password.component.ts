import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { BackofficeI18nService } from 'src/app/shared/i18n/backoffice-i18n.service';

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
    private authService: AuthApiService,
    private router: Router,
    private i18n: BackofficeI18nService
  ) {}

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.forgotPassword({
      method: 'email',
      email: this.form.get('email')?.value ?? ''
    }).subscribe({
      next: (response) => {
        this.successMessage = response?.message || this.i18n.translate('Reset instructions sent successfully.');
        this.submitting = false;
        void this.router.navigate(['/reset-password'], {
          queryParams: {
            email: this.form.get('email')?.value ?? '',
            method: 'email'
          }
        });
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || this.i18n.translate('Unable to send reset instructions right now.');
        this.submitting = false;
      }
    });
  }
}
