import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import {
  SALAH_DETAILS,
  SalahDetailContent,
  SalahKey,
  SalahTime
} from 'src/app/models/salah.model';

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

  get detail(): SalahDetailContent | null {
    return this.salahKey ? SALAH_DETAILS[this.salahKey] : null;
  }

  get titleSubtitle(): string {
    if (!this.salahTime) {
      return 'Track salah timing and rakaat';
    }

    return `${this.salahTime.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${this.salahTime.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  get showStartsInCountdown(): boolean {
    return !!this.startsInCountdown;
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
}
