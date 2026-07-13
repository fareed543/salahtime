import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import {
  getSalahDetail,
  isFriday,
  SalahRakatDetail,
  SalahDetailContent,
  SalahKey,
  SalahTime
} from 'src/app/models/salah.model';
import { SettingsService } from 'src/app/services/settings.service';
import { AppTranslateService } from 'src/app/services/translate.service';

@Component({
  selector: 'app-salah-detail-dialog',
  templateUrl: './salah-detail-dialog.component.html',
  styleUrls: ['./salah-detail-dialog.component.scss']
})
export class SalahDetailDialogComponent implements OnInit, OnChanges, OnDestroy {
  @Input() salahKey: SalahKey | null = null;
  @Input() salahTime: SalahTime | null = null;
  @Output() close = new EventEmitter<void>();
  startsInCountdown = '';

  private countdownTimerId: number | null = null;

  constructor(
    private i18n: AppTranslateService,
    private settingsService: SettingsService
  ) {}

  get detail(): SalahDetailContent | null {
    return this.salahKey ? getSalahDetail(this.salahKey, this.salahTime?.start ?? new Date()) : null;
  }

  get titleSubtitle(): string {
    if (!this.salahTime) {
      return 'Track salah timing and rakaat';
    }

    return `${this.formatPrayerTime(this.salahTime.start)} - ${this.formatPrayerTime(this.salahTime.end)}`;
  }

  get showStartsInCountdown(): boolean {
    return !!this.startsInCountdown;
  }

  get rakatSummary(): string {
    if (!this.detail?.rakats?.length) {
      return '';
    }

    return this.detail.rakats.map((rakat) => rakat.count).join(' + ');
  }

  get displayName(): string {
    if (!this.salahKey) {
      return '';
    }

    if (this.salahKey === 'dhuhr' && isFriday(this.salahTime?.start ?? new Date())) {
      return this.i18n.translateWithParams('JUMUAH', {});
    }

    const keyMap: Partial<Record<SalahKey, string>> = {
      sahri: 'SAHRI',
      fajr: 'FAJR',
      tulu: 'DASHBOARD.SALAH_NAMES.TULU',
      ishraq: 'ISHRAQ',
      chast: 'CHAST',
      zawal: 'ZAWAL',
      dhuhr: 'DHUHR',
      asr: 'ASR',
      gurub: 'DASHBOARD.SALAH_NAMES.GURUB',
      iftar: 'IFTAR',
      maghrib: 'MAGHRIB',
      awabin: 'AWABIN',
      isha: 'ISHA',
      tahajjud: 'TAHAJJUD'
    };

    const translationKey = keyMap[this.salahKey];
    return translationKey
      ? this.i18n.translateWithParams(translationKey, {})
      : (this.detail?.name ?? this.salahKey);
  }

  get translatedTimeText(): string {
    if (!this.salahKey || !this.detail?.timeText) {
      return '';
    }

    return this.translateDetailValue('TIME_TEXT', this.detail.timeText);
  }

  get translatedNoteText(): string {
    if (!this.salahKey || !this.detail?.note) {
      return '';
    }

    return this.translateDetailValue('NOTE', this.detail.note);
  }

  get translatedReminderTitle(): string {
    if (!this.salahKey || !this.detail?.reminder?.title) {
      return '';
    }

    return this.translateDetailValue('REMINDER_TITLE', this.detail.reminder.title);
  }

  get translatedReminderBody(): string {
    if (!this.salahKey || !this.detail?.reminder?.body) {
      return '';
    }

    return this.translateDetailValue('REMINDER_BODY', this.detail.reminder.body);
  }

  getRakatLabel(rakat: SalahRakatDetail): string {
    const labelKey = this.getRakatLabelKey(rakat.label);
    if (!labelKey) {
      return rakat.label;
    }

    return this.i18n.translateWithParams(`SALAH_DETAIL.RAKAT_LABELS.${labelKey}`, {});
  }

  getRakatAriaLabel(rakat: SalahRakatDetail): string {
    return `${this.getRakatLabel(rakat)} ${rakat.count}`;
  }

  ngOnInit(): void {
    this.startCountdownTracking();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['salahTime']) {
      this.startCountdownTracking();
    }
  }

  ngOnDestroy(): void {
    this.stopCountdownTracking();
  }

  closeDialog(): void {
    this.close.emit();
  }

  private startCountdownTracking(): void {
    this.stopCountdownTracking();
    this.updateStartsInCountdown();

    if (!this.salahTime) {
      return;
    }

    this.countdownTimerId = window.setInterval(() => {
      this.updateStartsInCountdown();
    }, 1000);
  }

  private stopCountdownTracking(): void {
    if (this.countdownTimerId !== null) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
  }

  private updateStartsInCountdown(): void {
    if (!this.salahTime) {
      this.startsInCountdown = '';
      return;
    }

    const now = new Date();
    const start = new Date(this.salahTime.start);
    const end = new Date(this.salahTime.end);

    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }

    if (now >= end) {
      this.startsInCountdown = '';
      this.stopCountdownTracking();
      return;
    }

    if (now >= start) {
      this.startsInCountdown = '';
      this.stopCountdownTracking();
      return;
    }

    const diff = start.getTime() - now.getTime();

    if (diff <= 0) {
      this.startsInCountdown = '';
      this.stopCountdownTracking();
      return;
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    this.startsInCountdown = `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private pad(value: number): string {
    return value < 10 ? `0${value}` : String(value);
  }

  private formatPrayerTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: (this.settingsService.getCurrentSettings()?.timeFormat ?? '12h') !== '24h'
    }).format(date);
  }

  private translateDetailValue(field: 'TIME_TEXT' | 'NOTE' | 'REMINDER_TITLE' | 'REMINDER_BODY', fallback: string): string {
    const contentKey = this.salahKey === 'dhuhr' && isFriday(this.salahTime?.start ?? new Date())
      ? 'jumuah'
      : this.salahKey;
    const key = `SALAH_DETAIL.CONTENT.${contentKey}.${field}`;
    const translated = this.i18n.translateWithParams(key, {});
    return translated !== key ? translated : fallback;
  }

  private getRakatLabelKey(label: string): string | null {
    const labelMap: Record<string, string> = {
      'Sunnah Mu’akkadah': 'SUNNAH_MUAKKADAH',
      'Sunnah Muâ€™akkadah': 'SUNNAH_MUAKKADAH',
      'Sunnah Ghair Mu’akkadah': 'SUNNAH_GHAIR_MUAKKADAH',
      'Sunnah Ghair Muâ€™akkadah': 'SUNNAH_GHAIR_MUAKKADAH',
      'Sunnah': 'SUNNAH',
      'Fard': 'FARD',
      'Nafl': 'NAFL'
    };

    return labelMap[label] ?? null;
  }
}
