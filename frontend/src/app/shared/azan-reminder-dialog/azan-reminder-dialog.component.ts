import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AzanOption } from 'src/app/models/azan.model';
import { AzanService } from 'src/app/services/azan.service';

export interface AzanReminderDialogData {
  selectedAzanId: string;
  salahName: string;
}

export interface AzanReminderDialogResult {
  azanId: string;
}

@Component({
  selector: 'app-azan-reminder-dialog',
  templateUrl: './azan-reminder-dialog.component.html',
  styleUrls: ['./azan-reminder-dialog.component.scss']
})
export class AzanReminderDialogComponent implements OnInit, OnDestroy {
  azanOptions: AzanOption[] = [];
  selectedAzanId: string;
  playingAzanId: string | null = null;

  private previewAudio: HTMLAudioElement | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AzanReminderDialogData,
    private dialogRef: MatDialogRef<AzanReminderDialogComponent, AzanReminderDialogResult>,
    private azanService: AzanService
  ) {
    this.selectedAzanId = data.selectedAzanId;
  }

  ngOnInit(): void {
    this.azanService.getAzanOptions().subscribe((options) => {
      this.azanOptions = options;
      if (!this.azanOptions.some((option) => option.id === this.selectedAzanId)) {
        this.selectedAzanId = 'default';
      }
    });
  }

  ngOnDestroy(): void {
    this.stopPreview();
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    this.dialogRef.close({ azanId: this.selectedAzanId });
  }

  togglePreview(option: AzanOption): void {
    if (!option.file) {
      this.stopPreview();
      return;
    }

    if (this.playingAzanId === option.id) {
      this.stopPreview();
      return;
    }

    this.stopPreview();
    const previewUrl = this.azanService.getPreviewUrl(option);
    if (!previewUrl) {
      return;
    }

    this.previewAudio = new Audio(previewUrl);
    this.previewAudio.onended = () => {
      this.playingAzanId = null;
    };
    this.playingAzanId = option.id;
    void this.previewAudio.play().catch(() => {
      this.playingAzanId = null;
    });
  }

  private stopPreview(): void {
    if (this.previewAudio) {
      this.previewAudio.pause();
      this.previewAudio.currentTime = 0;
      this.previewAudio = null;
    }
    this.playingAzanId = null;
  }
}
