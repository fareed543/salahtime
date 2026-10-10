import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { AUTH_LIMITS, matchFieldValidator, newPasswordValidators } from '../auth-validators';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnDestroy {
  readonly limits = AUTH_LIMITS;
  showPassword = false;
  showConfirmPassword = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  readonly method: 'email' | 'mobile';

  readonly form = this.fb.group({
    email: [''],
    mobile: [''],
    code: ['', [Validators.required]],
    password: ['', newPasswordValidators],
    confirmPassword: ['', [Validators.required, matchFieldValidator('password')]]
  });

  private readonly passwordChanges: Subscription = this.form.controls.password.valueChanges
    .subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity({ emitEvent: false }));

  constructor(
    private fb: FormBuilder,
    private authService: AuthApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.method = this.route.snapshot.queryParamMap.get('method') === 'mobile' ? 'mobile' : 'email';
    this.form.patchValue({
      email: this.route.snapshot.queryParamMap.get('email') ?? '',
      mobile: this.route.snapshot.queryParamMap.get('mobile') ?? '',
      code: this.route.snapshot.queryParamMap.get('code') ?? ''
    });
    if (!this.form.get('code')?.value
      || (this.method === 'email' && !this.form.get('email')?.value)
      || (this.method === 'mobile' && !this.form.get('mobile')?.value)) {
      void this.router.navigate(['/forgot-password']);
      return;
    }
    if (this.method === 'mobile') {
      this.form.get('mobile')?.setValidators([Validators.required, Validators.pattern(/^[0-9]{10}$/)]);
    } else {
      this.form.get('email')?.setValidators([Validators.required, Validators.email]);
    }
    this.form.get('email')?.updateValueAndValidity();
    this.form.get('mobile')?.updateValueAndValidity();
  }

  ngOnDestroy(): void {
    this.passwordChanges.unsubscribe();
  }

  hasError(controlName: string, error?: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && (error ? control.hasError(error) : control.invalid);
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
    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.resetPassword({
      method: this.method,
      email: this.form.get('email')?.value ?? '',
      mobile: this.form.get('mobile')?.value ?? '',
      code: this.form.get('code')?.value ?? '',
      password: this.form.get('password')?.value ?? '',
      confirmPassword: this.form.get('confirmPassword')?.value ?? ''
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
