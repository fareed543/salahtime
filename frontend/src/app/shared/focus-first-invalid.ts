/**
 * CR-023 (UX-R2): after a failed save, bring the first invalid field into view and put the cursor in it.
 * Works for plain inputs, radio groups and custom controls (focuses the first focusable element inside).
 */
export function focusFirstInvalid(container: HTMLElement | null | undefined): void {
  if (!container) {
    return;
  }
  // Let Angular finish applying touched / invalid classes and show error texts first.
  setTimeout(() => {
    const invalid = container.querySelector<HTMLElement>('[formcontrolname].ng-invalid, [formControlName].ng-invalid');
    if (!invalid) {
      return;
    }
    const focusable = isFocusable(invalid)
      ? invalid
      : invalid.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button, [tabindex]:not([tabindex="-1"])');
    invalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    focusable?.focus({ preventScroll: true });
  });
}

function isFocusable(element: HTMLElement): boolean {
  return ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(element.tagName) || element.tabIndex >= 0;
}
