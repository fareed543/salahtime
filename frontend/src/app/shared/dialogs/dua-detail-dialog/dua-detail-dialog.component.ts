import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, Inject, NgZone, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { DuaCategory, DuaEntry } from 'src/app/components/duas/models/dua.model';

export interface DuaDetailDialogData {
  category: DuaCategory;
  dua: DuaEntry;
}

export const DUA_DETAIL_DIALOG_CONFIG: MatDialogConfig = {
  panelClass: 'dua-detail-dialog-panel',
  backdropClass: 'dua-detail-dialog-backdrop',
  width: '42rem',
  maxWidth: 'calc(100vw - 2rem)',
  maxHeight: 'calc(100dvh - 2rem)'
};

@Component({
  selector: 'app-dua-detail-dialog',
  templateUrl: './dua-detail-dialog.component.html',
  styleUrls: ['./dua-detail-dialog.component.scss']
})
export class DuaDetailDialogComponent implements OnDestroy {
  private readonly overlayElement: HTMLElement;

  private readonly preventBackdropScroll = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const scrollBody = target.closest('.dua-detail-dialog-body') as HTMLElement | null;
    if (event instanceof WheelEvent && scrollBody && this.canScroll(scrollBody, event.deltaY)) {
      return;
    }

    event.preventDefault();
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: DuaDetailDialogData,
    private readonly dialogRef: MatDialogRef<DuaDetailDialogComponent>,
    overlayContainer: OverlayContainer,
    ngZone: NgZone
  ) {
    this.overlayElement = overlayContainer.getContainerElement();
    ngZone.runOutsideAngular(() => {
      this.overlayElement.addEventListener('wheel', this.preventBackdropScroll, { passive: false });
      this.overlayElement.addEventListener('touchmove', this.preventBackdropScroll, { passive: false });
    });
  }

  ngOnDestroy(): void {
    this.overlayElement.removeEventListener('wheel', this.preventBackdropScroll);
    this.overlayElement.removeEventListener('touchmove', this.preventBackdropScroll);
  }

  close(): void {
    this.dialogRef.close();
  }

  private canScroll(element: HTMLElement, deltaY: number): boolean {
    if (element.scrollHeight <= element.clientHeight) {
      return false;
    }

    if (deltaY < 0) {
      return element.scrollTop > 0;
    }

    return element.scrollTop + element.clientHeight < element.scrollHeight;
  }
}
