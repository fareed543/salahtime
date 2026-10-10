import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** Field limits shared by sign-up and reset-password; mirrored in api/controllers/AuthController.php. */
export const AUTH_LIMITS = {
  nameMax: 50,
  firstNameMin: 2,
  lastNameMin: 1,
  emailMax: 254,
  phoneLength: 10,
  passwordMin: 8,
  passwordMax: 64
} as const;

// Letters in any script plus spaces, dots, apostrophes and hyphens (e.g. "Mohd. Al-Farooq", "D'Souza").
const NAME_PATTERN = /^\s*[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
// Angular's built-in email check accepts "a@b"; also require a dotted domain.
const EMAIL_DOMAIN_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Indian mobile numbers: 10 digits starting with 6-9.
const MOBILE_PATTERN = /^[6-9][0-9]{9}$/;

export const nameValidators = (min: number): ValidatorFn[] => [
  Validators.required,
  Validators.minLength(min),
  Validators.maxLength(AUTH_LIMITS.nameMax),
  Validators.pattern(NAME_PATTERN)
];

export const emailValidators: ValidatorFn[] = [
  Validators.required,
  Validators.maxLength(AUTH_LIMITS.emailMax),
  Validators.email,
  Validators.pattern(EMAIL_DOMAIN_PATTERN)
];

export const mobileValidators: ValidatorFn[] = [
  Validators.required,
  Validators.pattern(MOBILE_PATTERN)
];

export const newPasswordValidators: ValidatorFn[] = [
  Validators.required,
  Validators.minLength(AUTH_LIMITS.passwordMin),
  Validators.maxLength(AUTH_LIMITS.passwordMax),
  passwordStrengthValidator
];

export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) {
    return null;
  }
  return /[A-Za-z]/.test(value) && /[0-9]/.test(value) ? null : { passwordStrength: true };
}

/** Put on the confirm field; re-run it when the source field changes. */
export function matchFieldValidator(sourceControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const source = control.parent?.get(sourceControlName);
    if (!source || !control.value) {
      return null;
    }
    return source.value === control.value ? null : { mismatch: true };
  };
}
