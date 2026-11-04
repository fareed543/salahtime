import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  submitting = false;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthApiService,
    private router: Router,
    private toast: ToastService
  ) {}

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) {
      return;
    }

    this.submitting = true;
    this.authService.forgotPassword({
      method: 'email',
      email: this.form.get('email')?.value ?? ''
    }).subscribe({
      next: (response) => {
        this.toast.success(response?.message || 'Reset instructions sent successfully.');
        this.submitting = false;
        void this.router.navigate(['/reset-password'], {
          queryParams: {
            email: this.form.get('email')?.value ?? '',
            method: 'email'
          }
        });
      },
      error: (error) => {
        this.toast.error(error?.error?.message || 'Unable to send reset instructions right now.');
        this.submitting = false;
      }
    });
  }
}
