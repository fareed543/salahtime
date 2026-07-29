import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  showPassword = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  readonly form = this.fb.group({
    phone: ['',
      [
        Validators.required,
        Validators.pattern(/^[0-9]{10}$/)
      ]
    ],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.errorMessage = this.route.snapshot.queryParamMap.get('error') || '';
    this.successMessage = this.route.snapshot.queryParamMap.get('status') || '';
    const token = new URLSearchParams(window.location.hash.slice(1)).get('accessToken');
    if (token) {
      this.submitting = true;
      this.authService.completeSocialSignIn(token).subscribe({
        next: () => {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          this.router.navigateByUrl(this.returnUrl);
        },
        error: () => {
          this.errorMessage = 'Unable to complete social sign-in.';
          this.submitting = false;
        }
      });
    }
  }

  get returnUrl(): string {
    const value = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
    return value.startsWith('/') && !value.startsWith('//') ? value : '/';
  }

  get registrationQueryParams(): Record<string, string> {
    return this.returnUrl === '/' ? {} : { returnUrl: this.returnUrl };
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  socialSignIn(): void {
    window.location.href = this.authService.getGoogleLoginUrl(this.returnUrl);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const phone = this.form.get('phone')?.value ?? '';

    this.authService.signIn({
      phone,
      password: this.form.get('password')?.value ?? ''
    }, this.form.get('rememberMe')?.value === true).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || error?.message || 'Unable to login right now.';
        this.submitting = false;
      }
    });
  }
}
