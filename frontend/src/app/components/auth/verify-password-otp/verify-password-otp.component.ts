import { Component, ElementRef, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';

@Component({
  selector: 'app-verify-password-otp',
  templateUrl: './verify-password-otp.component.html',
  styleUrls: ['./verify-password-otp.component.scss']
})
export class VerifyPasswordOtpComponent implements OnDestroy {
  @ViewChildren('otpInput') private otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  submitting = false;
  resending = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';
  resendSeconds = 300;
  readonly mode: 'password-reset' | 'register';
  readonly method: 'email' | 'mobile';
  readonly email: string;
  readonly mobile: string;
  readonly otpLength = 4;
  readonly digits = Array(this.otpLength).fill('') as string[];
  private resendTimer?: ReturnType<typeof setInterval>;

  constructor(
    private authService: AuthApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.mode = this.route.snapshot.queryParamMap.get('mode') === 'register' ? 'register' : 'password-reset';
    this.method = this.route.snapshot.queryParamMap.get('method') === 'mobile' ? 'mobile' : 'email';
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.mobile = this.route.snapshot.queryParamMap.get('mobile') ?? '';

    if ((this.method === 'email' && !this.email) || (this.method === 'mobile' && !this.mobile)) {
      void this.router.navigate([this.mode === 'register' ? '/register' : '/forgot-password']);
      return;
    }

    this.startResendTimer();
  }

  get screenTitle(): string {
    return `${this.method === 'mobile' ? 'Mobile Phone' : 'Email'} Verification`;
  }

  get submitLabel(): string {
    if (this.mode === 'register') {
      return this.method === 'mobile' ? 'Verify Mobile' : 'Verify Email';
    }

    return 'Verify Account';
  }

  get instructionText(): string {
    if (this.mode === 'register') {
      return `Enter the ${this.otpLength}-digit verification code sent to your ${this.method === 'mobile' ? 'mobile number' : 'email'}`;
    }

    return `Enter the ${this.otpLength}-digit verification code sent to`;
  }

  ngOnDestroy(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  get maskedDestination(): string {
    if (this.method === 'mobile') {
      return this.mobile.length >= 4 ? `******${this.mobile.slice(-4)}` : this.mobile;
    }

    const [name, domain] = this.email.split('@');
    if (!name || !domain) {
      return this.email;
    }
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 2))}@${domain}`;
  }

  get countdown(): string {
    const minutes = Math.floor(this.resendSeconds / 60).toString().padStart(2, '0');
    const seconds = (this.resendSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  trackByIndex(index: number): number {
    return index;
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const numbers = input.value.replace(/\D/g, '');
    if (numbers.length > 1) {
      // SMS autofill or a fast keyboard can drop several digits into one box.
      this.fillDigits(numbers, numbers.length >= this.otpLength ? 0 : index);
      return;
    }

    this.digits[index] = numbers;
    input.value = this.digits[index];
    this.errorMessage = '';
    if (this.digits[index] && index < this.otpLength - 1) {
      this.focusInput(index + 1);
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      this.digits[index - 1] = '';
      this.focusInput(index - 1);
    }
  }

  onDigitFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.fillDigits(event.clipboardData?.getData('text') ?? '');
  }

  submit(): void {
    this.submitted = true;
    const otp = this.digits.join('');
    if (!new RegExp(`^[0-9]{${this.otpLength}}$`).test(otp)) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.mode === 'register') {
      this.authService.verifyRegistrationOtp({
        method: this.method,
        email: this.method === 'email' ? this.email : undefined,
        mobile: this.method === 'mobile' ? this.mobile : undefined,
        otp
      }).subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
          void this.router.navigateByUrl(
            returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/'
          );
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Unable to verify OTP.';
          this.submitting = false;
        }
      });
      return;
    }

    this.authService.verifyPasswordResetOtp({
      method: this.method,
      email: this.method === 'email' ? this.email : undefined,
      mobile: this.method === 'mobile' ? this.mobile : undefined,
      otp
    }).subscribe({
      next: (response) => {
        void this.router.navigate(['/reset-password'], {
          queryParams: {
            method: response?.method || this.method,
            email: response?.email || undefined,
            mobile: response?.mobile || undefined,
            code: response?.code
          }
        });
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to verify OTP.';
        this.submitting = false;
      }
    });
  }

  resendOtp(): void {
    if (this.resendSeconds > 0 || this.resending) {
      return;
    }

    this.resending = true;
    this.errorMessage = '';
    this.successMessage = '';
    const request = this.method === 'email'
      ? { method: 'email' as const, email: this.email }
      : { method: 'mobile' as const, mobile: this.mobile };

    const resendRequest = this.mode === 'register'
      ? this.authService.resendRegistrationOtp(request)
      : this.authService.forgotPassword(request);

    resendRequest.subscribe({
      next: (response) => {
        this.successMessage = response?.message || 'A new OTP has been sent.';
        this.digits.fill('');
        this.submitted = false;
        this.resending = false;
        this.startResendTimer();
        this.focusInput(0);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to resend OTP.';
        this.resending = false;
      }
    });
  }

  private fillDigits(value: string, start = 0): void {
    const numbers = value.replace(/\D/g, '').slice(0, this.otpLength - start);
    if (start === 0) {
      this.digits.fill('');
    }
    numbers.split('').forEach((digit, offset) => this.digits[start + offset] = digit);
    this.otpInputs?.forEach((input, index) => input.nativeElement.value = this.digits[index]);
    this.errorMessage = '';
    const nextIndex = Math.min(start + numbers.length, this.otpLength - 1);
    this.focusInput(nextIndex);
  }

  private focusInput(index: number): void {
    // Focus synchronously so the next keystroke lands in the next box.
    this.otpInputs?.get(index)?.nativeElement.focus();
  }

  private startResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
    this.resendSeconds = 300;
    this.resendTimer = setInterval(() => {
      this.resendSeconds = Math.max(this.resendSeconds - 1, 0);
      if (this.resendSeconds === 0 && this.resendTimer) {
        clearInterval(this.resendTimer);
        this.resendTimer = undefined;
      }
    }, 1000);
  }
}
