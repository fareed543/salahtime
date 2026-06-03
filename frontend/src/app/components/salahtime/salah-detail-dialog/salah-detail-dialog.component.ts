import { Component, EventEmitter, Input, Output } from '@angular/core';
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
export class SalahDetailDialogComponent {
  @Input() salahKey: SalahKey | null = null;
  @Input() salahTime: SalahTime | null = null;
  @Output() close = new EventEmitter<void>();

  get detail(): SalahDetailContent | null {
    return this.salahKey ? SALAH_DETAILS[this.salahKey] : null;
  }

  get titleSubtitle(): string {
    if (!this.salahTime) {
      return 'Track salah timing and rakaat';
    }

    return `${this.salahTime.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${this.salahTime.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  closeDialog(): void {
    this.close.emit();
  }
}
