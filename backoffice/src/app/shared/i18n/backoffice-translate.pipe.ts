import { ChangeDetectorRef, Pipe, PipeTransform } from '@angular/core';
import { BackofficeI18nService } from './backoffice-i18n.service';

@Pipe({
  name: 'appTranslate',
  pure: false
})
export class BackofficeTranslatePipe implements PipeTransform {
  constructor(
    private readonly i18n: BackofficeI18nService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  transform(value: string, params?: Record<string, string | number>): string {
    this.cdr.markForCheck();
    return this.i18n.translate(value, params);
  }
}
