import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';
import {
  AUTH_LIMITS,
  emailValidators,
  matchFieldValidator,
  mobileValidators,
  nameValidators,
  newPasswordValidators
} from '../auth-validators';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnDestroy {
  readonly limits = AUTH_LIMITS;
  showPassword = false;
  showConfirmPassword = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  readonly form = this.fb.group({
    firstName: ['', nameValidators(AUTH_LIMITS.firstNameMin)],
    lastName: ['', nameValidators(AUTH_LIMITS.lastNameMin)],
    email: ['', emailValidators],
    phone: ['', mobileValidators],
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
  ) {}

  ngOnDestroy(): void {
    this.passwordChanges.unsubscribe();
  }

  get loginQueryParams(): Record<string, string> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl ? { returnUrl } : {};
  }

  get registrationCode(): string {
    return this.route.snapshot.queryParamMap.get('registrationCode') || '';
  }

  hasError(controlName: string, error?: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && (error ? control.hasError(error) : control.invalid);
  }

  keepDigits(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, AUTH_LIMITS.phoneLength);
    if (digits !== input.value) {
      this.form.controls.phone.setValue(digits);
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
    this.errorMessage = '';
    if (this.form.invalid) {
      this.errorMessage = 'Please correct the highlighted fields.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const firstName = (this.form.get('firstName')?.value ?? '').trim();
    const lastName = (this.form.get('lastName')?.value ?? '').trim();
    const phone = this.form.get('phone')?.value ?? '';

    this.authService.signUp({
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      email: (this.form.get('email')?.value ?? '').trim(),
      password: this.form.get('password')?.value ?? '',
      phone,
      registrationCode: this.registrationCode || undefined
    }).subscribe({
      next: (response) => {
        this.submitting = false;
        this.successMessage = response?.message || 'Account created. OTP received to email.';
        void this.router.navigate(['/verify-password-otp'], {
          queryParams: {
            mode: 'register',
            method: response?.method || 'email',
            email: response?.email || this.form.get('email')?.value || undefined,
            mobile: response?.mobile || undefined,
            returnUrl: this.route.snapshot.queryParamMap.get('returnUrl') || undefined
          }
        });
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || error?.error?.error || 'Unable to create your account right now.';
        this.submitting = false;
      }
    });
  }
}
