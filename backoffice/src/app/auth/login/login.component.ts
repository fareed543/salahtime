import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [true]
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthApiService,
    private router: Router
  ) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.authService.signIn({
      phone: this.form.get('phone')?.value ?? '',
      password: this.form.get('password')?.value ?? ''
    }, this.form.get('rememberMe')?.value ?? false).subscribe({
      next: () => {
        void this.router.navigateByUrl('/dashboard');
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || error?.message || 'Unable to sign in right now.';
        this.submitting = false;
      }
    });
  }
}
