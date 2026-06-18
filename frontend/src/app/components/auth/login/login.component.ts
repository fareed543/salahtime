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
  ) {}

  get returnUrl(): string {
    const value = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
    return value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
  }

  get registrationQueryParams(): Record<string, string> {
    return this.returnUrl === '/dashboard' ? {} : { returnUrl: this.returnUrl };
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    const phone = this.form.get('phone')?.value ?? '';

    this.authService.signIn({
      phone,
      password: this.form.get('password')?.value ?? ''
    }).subscribe({
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
