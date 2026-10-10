import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { emailValidators } from '../auth-validators';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  submitting = false;
  errorMessage = '';
  successMessage = '';
  methods: Array<'email' | 'mobile'> = ['email'];
  // The field is shown only once the server says which channel is active, so it never flips.
  configLoaded = false;
  mobileConfigured = false;
  otpLength = 4;

  readonly form = this.fb.group({
    method: ['email' as 'email' | 'mobile', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['']
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.getPasswordRecoveryConfig().subscribe({
      next: (config) => {
        this.methods = config?.methods?.length ? config.methods : ['email'];
        this.mobileConfigured = !!config?.mobileConfigured;
        this.otpLength = config?.otpLength || 4;
        if (!this.methods.includes(this.method)) {
          this.form.patchValue({ method: this.methods[0] });
        }
        this.configLoaded = true;
        this.updateValidators();
      },
      error: () => {
        this.configLoaded = true;
        this.updateValidators();
      }
    });
  }

  get method(): 'email' | 'mobile' {
    return this.form.get('method')?.value === 'mobile' ? 'mobile' : 'email';
  }

  selectMethod(method: 'email' | 'mobile'): void {
    this.form.patchValue({ method });
    this.errorMessage = '';
    this.successMessage = '';
    this.updateValidators();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const request = this.method === 'email'
      ? { method: 'email' as const, email: this.form.get('email')?.value ?? '' }
      : { method: 'mobile' as const, mobile: this.form.get('mobile')?.value ?? '' };

    this.authService.forgotPassword(request).subscribe({
      next: (response) => {
        if (response?.requiresOtp) {
          const queryParams = this.method === 'email'
            ? { method: 'email', email: response?.email || request.email }
            : { method: 'mobile', mobile: response?.mobile || request.mobile };
          void this.router.navigate(['/verify-password-otp'], { queryParams });
          return;
        }
        this.successMessage = response?.message || 'Reset instructions sent successfully.';
        this.submitting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to process forgot password right now.';
        this.submitting = false;
      }
    });
  }

  private updateValidators(): void {
    const email = this.form.get('email');
    const mobile = this.form.get('mobile');
    if (this.method === 'email') {
      email?.setValidators(emailValidators);
      mobile?.clearValidators();
    } else {
      // Any 10 digits: accounts registered before the 6-9 rule must still be able to recover.
      mobile?.setValidators([Validators.required, Validators.pattern(/^[0-9]{10}$/)]);
      email?.clearValidators();
    }
    email?.updateValueAndValidity();
    mobile?.updateValueAndValidity();
  }
}
