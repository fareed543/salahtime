import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { MasjidTimingSource, MasjidTimingVersion } from 'src/app/models/masjid.model';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { formatDisplayTime } from 'src/app/shared/time-picker-dialog/time-picker-dialog.component';

const SOURCE_KEYS: Record<MasjidTimingSource, string> = {
  manual: 'MASJID_PAGE.HISTORY.SOURCE_MANUAL',
  capture: 'MASJID_PAGE.HISTORY.SOURCE_CAPTURE',
  restore: 'MASJID_PAGE.HISTORY.SOURCE_RESTORE',
  admin: 'MASJID_PAGE.HISTORY.SOURCE_ADMIN',
  initial: 'MASJID_PAGE.HISTORY.SOURCE_INITIAL'
};

const SOURCE_ICONS: Record<MasjidTimingSource, string> = {
  manual: 'bi-pencil',
  capture: 'bi-camera',
  restore: 'bi-arrow-counterclockwise',
  admin: 'bi-shield-check',
  initial: 'bi-flag'
};

/**
 * Lists a masjid's saved timing versions and restores one. Restoring is recorded as a new
 * version on the server, so a restore can itself be undone from this list.
 */
@Component({
  selector: 'app-masjid-timing-history',
  templateUrl: './masjid-timing-history.component.html',
  styleUrls: ['./masjid-timing-history.component.scss']
})
export class MasjidTimingHistoryComponent implements OnInit {
  @Input() masjidId!: string | number;
  @Input() use24h = false;
  /** Emits the masjid details returned after a restore. */
  @Output() restored = new EventEmitter<{ details: any; versionNo: number }>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('closeButton', { static: true }) closeButton?: ElementRef<HTMLButtonElement>;

  versions: MasjidTimingVersion[] = [];
  loading = true;
  failed = false;
  restoringId: number | null = null;

  constructor(private ramadanService: RamadanApiService, private i18n: AppTranslateService) {}

  ngOnInit(): void {
    setTimeout(() => this.closeButton?.nativeElement.focus());
    this.ramadanService.masjidTimingVersions(this.masjidId).subscribe({
      next: (response) => {
        this.versions = response?.versions ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.failed = true;
      }
    });
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.closed.emit();
  }

  sourceKey(version: MasjidTimingVersion): string {
    return SOURCE_KEYS[version.source] ?? SOURCE_KEYS.manual;
  }

  sourceIcon(version: MasjidTimingVersion): string {
    return SOURCE_ICONS[version.source] ?? SOURCE_ICONS.manual;
  }

  displayTime(value: string): string {
    return value ? formatDisplayTime(value, this.use24h) : '–';
  }

  formatDate(value: string): string {
    // MySQL "YYYY-MM-DD HH:MM:SS" in server time; shown as-is to the minute.
    const date = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  restore(version: MasjidTimingVersion): void {
    const message = this.i18n.translateWithParams('MASJID_PAGE.HISTORY.RESTORE_CONFIRM', { no: version.versionNo });
    if (this.restoringId !== null || !window.confirm(message)) {
      return;
    }

    this.restoringId = version.id;
    this.ramadanService.restoreMasjidTimingVersion(this.masjidId, version.id).subscribe({
      next: (details) => {
        this.restoringId = null;
        this.restored.emit({ details, versionNo: version.versionNo });
      },
      error: () => {
        this.restoringId = null;
        this.failed = true;
      }
    });
  }

  trackById = (_index: number, version: MasjidTimingVersion): number => version.id;
}
