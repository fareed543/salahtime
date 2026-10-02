import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ZikarNotificationDialogData {
  categories: readonly string[];
  enabled: boolean;
  intervalMinutes: number;
  category?: string;
}

export interface ZikarNotificationDialogResult {
  action: 'enable' | 'off' | 'test';
  category?: string;
  intervalMinutes?: number;
}

@Component({
  selector: 'app-zikar-notification-dialog',
  templateUrl: './zikar-notification-dialog.component.html',
  styleUrls: ['./zikar-notification-dialog.component.scss']
})
export class ZikarNotificationDialogComponent {
  intervalMinutes: number;
  selectedCategory: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ZikarNotificationDialogData,
    private dialogRef: MatDialogRef<ZikarNotificationDialogComponent, ZikarNotificationDialogResult>
  ) {
    this.intervalMinutes = data.intervalMinutes;
    this.selectedCategory = data.category && data.categories.includes(data.category)
      ? data.category
      : data.categories[0];
  }

  close(): void { this.dialogRef.close(); }
  selectCategory(category: string): void { this.selectedCategory = category; }
  decrementInterval(): void {
    this.intervalMinutes = Math.max(1, Math.floor(Number(this.intervalMinutes) || 1) - 1);
  }
  incrementInterval(): void {
    this.intervalMinutes = Math.min(1440, Math.floor(Number(this.intervalMinutes) || 1) + 1);
  }
  save(): void {
    const intervalMinutes = Math.max(1, Math.floor(Number(this.intervalMinutes) || 1));
    this.dialogRef.close({ action: 'enable', category: this.selectedCategory, intervalMinutes });
  }
  disable(): void { this.dialogRef.close({ action: 'off' }); }
  test(): void { this.dialogRef.close({ action: 'test' }); }
}
