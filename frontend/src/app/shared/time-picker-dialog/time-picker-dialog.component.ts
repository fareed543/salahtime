import { NgClass, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

type PickerUnit = 'hour' | 'minute';

interface DialMark {
  value: number;
  label: string;
  x: number;
  y: number;
  inner: boolean;
}

const SIZE = 256;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 100;
const INNER_RADIUS = 66;

/** "05:30 AM" (or "17:30") -> minutes since midnight; null when unparseable. */
export function parseClockValue(value: string | null | undefined): number | null {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }
  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours > 23 || minutes > 59 ? null : hours * 60 + minutes;
}

/** Stored format used by the API, back office and displays: "05:30 AM". */
export function formatStoredTime(hours24: number, minutes: number): string {
  const hour12 = hours24 % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${hours24 < 12 ? 'AM' : 'PM'}`;
}

/** A stored time shown in the user's preferred format ("05:30 AM" or "17:30"). */
export function formatDisplayTime(value: string | null | undefined, use24h: boolean): string {
  const total = parseClockValue(value);
  if (total === null) {
    return String(value ?? '');
  }
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return use24h
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    : formatStoredTime(hours, minutes);
}

/**
 * Clock-face time picker in a modal dialog. Pick the hour on the dial (it then moves to minutes),
 * switch 12h/24h, or use the arrow keys on the dial. Emits the time as "hh:mm AM", or '' on Clear.
 */
@Component({
  selector: 'app-time-picker-dialog',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, TranslateModule],
  templateUrl: './time-picker-dialog.component.html',
  styleUrls: ['./time-picker-dialog.component.scss']
})
export class TimePickerDialogComponent implements OnInit, AfterViewInit {
  @Input() value = '';
  @Input() title = '';
  @Input() use24h = false;
  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('dial') dialRef?: ElementRef<SVGSVGElement>;

  readonly size = SIZE;
  readonly center = CENTER;
  hours = 12;
  minutes = 0;
  unit: PickerUnit = 'hour';
  private dragging = false;
  private returnFocus: HTMLElement | null = null;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    const total = parseClockValue(this.value);
    if (total !== null) {
      this.hours = Math.floor(total / 60);
      this.minutes = total % 60;
    } else {
      // Empty slot: start from the current time, rounded to 5 minutes.
      const now = new Date();
      const rounded = Math.round((now.getHours() * 60 + now.getMinutes()) / 5) * 5 % 1440;
      this.hours = Math.floor(rounded / 60);
      this.minutes = rounded % 60;
    }
    this.returnFocus = document.activeElement as HTMLElement | null;
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.dialRef?.nativeElement.focus());
  }

  get isPm(): boolean {
    return this.hours >= 12;
  }

  get hourLabel(): string {
    return String(this.use24h ? this.hours : this.hours % 12 || 12).padStart(2, '0');
  }

  get minuteLabel(): string {
    return String(this.minutes).padStart(2, '0');
  }

  get marks(): DialMark[] {
    if (this.unit === 'minute') {
      return Array.from({ length: 12 }, (_, i) => this.mark(i * 5, String(i * 5).padStart(2, '0'), i, false));
    }
    const outer = Array.from({ length: 12 }, (_, i) => this.mark(i === 0 ? 12 : i, String(i === 0 ? 12 : i), i, false));
    if (!this.use24h) {
      return outer;
    }
    // 24h: inner ring holds 00 and 13-23 (Material-style).
    const inner = Array.from({ length: 12 }, (_, i) => this.mark(i === 0 ? 0 : i + 12, i === 0 ? '00' : String(i + 12), i, true));
    return [...outer, ...inner];
  }

  /** The dial value currently selected, in the units of the active ring set. */
  get selectedDialValue(): number {
    if (this.unit === 'minute') {
      return this.minutes;
    }
    return this.use24h ? this.hours : this.hours % 12 || 12;
  }

  get hand(): { x: number; y: number; onMark: boolean } {
    const step = this.unit === 'minute' ? this.minutes : this.hours % 12;
    const angle = (this.unit === 'minute' ? step * 6 : step * 30) * Math.PI / 180;
    const inner = this.unit === 'hour' && this.use24h && (this.hours === 0 || this.hours > 12);
    const radius = inner ? INNER_RADIUS : OUTER_RADIUS;
    return {
      x: CENTER + radius * Math.sin(angle),
      y: CENTER - radius * Math.cos(angle),
      onMark: this.unit === 'hour' || this.minutes % 5 === 0
    };
  }

  get ariaValueText(): string {
    return this.use24h ? `${this.hourLabel}:${this.minuteLabel}` : `${this.hourLabel}:${this.minuteLabel} ${this.isPm ? 'PM' : 'AM'}`;
  }

  isSelected(mark: DialMark): boolean {
    return this.hand.onMark && mark.value === this.selectedDialValue && (this.unit === 'minute' || !this.use24h || mark.inner === (this.hours === 0 || this.hours > 12));
  }

  setUnit(unit: PickerUnit): void {
    this.unit = unit;
  }

  setMeridiem(pm: boolean): void {
    if (pm !== this.isPm) {
      this.hours = (this.hours + 12) % 24;
    }
  }

  setFormat(use24h: boolean): void {
    this.use24h = use24h;
  }

  onPointerDown(event: PointerEvent): void {
    this.dragging = true;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    this.pickAt(event);
    event.preventDefault();
  }

  onPointerMove(event: PointerEvent): void {
    if (this.dragging) {
      this.pickAt(event);
    }
  }

  onPointerUp(): void {
    if (!this.dragging) {
      return;
    }
    this.dragging = false;
    if (this.unit === 'hour') {
      this.unit = 'minute';
    }
  }

  onDialKeydown(event: KeyboardEvent): void {
    const delta = ({ ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 } as Record<string, number>)[event.key];
    if (delta !== undefined) {
      if (this.unit === 'hour') {
        this.hours = (this.hours + Math.sign(delta) + 24) % 24;
      } else {
        this.minutes = (this.minutes + delta + 60) % 60;
      }
      event.preventDefault();
    } else if (event.key === 'Enter') {
      this.unit === 'hour' ? (this.unit = 'minute') : this.confirm();
      event.preventDefault();
    }
  }

  confirm(): void {
    this.confirmed.emit(formatStoredTime(this.hours, this.minutes));
    this.restoreFocus();
  }

  clear(): void {
    this.confirmed.emit('');
    this.restoreFocus();
  }

  @HostListener('document:keydown.escape')
  cancel(): void {
    this.cancelled.emit();
    this.restoreFocus();
  }

  /** Keeps Tab inside the dialog. */
  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]'));
    if (!focusable.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  }

  trackByMark = (_: number, mark: DialMark): string => `${mark.inner}-${mark.value}`;

  private pickAt(event: PointerEvent): void {
    const svg = this.dialRef?.nativeElement;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const scale = SIZE / rect.width;
    const dx = (event.clientX - rect.left) * scale - CENTER;
    const dy = (event.clientY - rect.top) * scale - CENTER;
    const degrees = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;

    if (this.unit === 'minute') {
      this.minutes = Math.round(degrees / 6) % 60;
      return;
    }

    const step = Math.round(degrees / 30) % 12;
    if (this.use24h) {
      const inner = Math.hypot(dx, dy) < (OUTER_RADIUS + INNER_RADIUS) / 2;
      this.hours = inner ? (step === 0 ? 0 : step + 12) : (step === 0 ? 12 : step);
    } else {
      this.hours = step + (this.isPm ? 12 : 0);
    }
  }

  private mark(value: number, label: string, index: number, inner: boolean): DialMark {
    const angle = index * 30 * Math.PI / 180;
    const radius = inner ? INNER_RADIUS : OUTER_RADIUS;
    return { value, label, inner, x: CENTER + radius * Math.sin(angle), y: CENTER - radius * Math.cos(angle) };
  }

  private restoreFocus(): void {
    setTimeout(() => this.returnFocus?.focus?.());
  }
}
