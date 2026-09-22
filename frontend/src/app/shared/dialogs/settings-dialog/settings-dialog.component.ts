import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, NgZone, OnDestroy } from '@angular/core';
import { MatDialogConfig } from '@angular/material/dialog';

export const SETTINGS_DIALOG_CONFIG: MatDialogConfig = {
  id: 'settings-dialog',
  panelClass: 'settings-dialog-panel',
  backdropClass: 'settings-dialog-backdrop',
  width: '52rem',
  maxWidth: 'calc(100vw - 2rem)',
  maxHeight: 'calc(100dvh - 2rem)',
  ariaLabelledBy: 'settings-dialog-title'
};

@Component({
  selector: 'app-settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.scss']
})
export class SettingsDialogComponent implements OnDestroy {
  private readonly overlayElement: HTMLElement;

  private readonly preventBackdropScroll = (event: Event): void => {
    const target = event.target;
    // The overlay gaps belong to the backdrop, not a scrollable dialog.
    // Leave all panes (including the nested reminder dialog) interactive.
    if (target instanceof Element && !target.closest('.cdk-overlay-pane')) {
      event.preventDefault();
    }
  };

  constructor(overlayContainer: OverlayContainer, ngZone: NgZone) {
    this.overlayElement = overlayContainer.getContainerElement();
    ngZone.runOutsideAngular(() => {
      // Explicitly non-passive so wheel and touch gestures cannot reach the page.
      this.overlayElement.addEventListener('wheel', this.preventBackdropScroll, { passive: false });
      this.overlayElement.addEventListener('touchmove', this.preventBackdropScroll, { passive: false });
    });
  }

  ngOnDestroy(): void {
    this.overlayElement.removeEventListener('wheel', this.preventBackdropScroll);
    this.overlayElement.removeEventListener('touchmove', this.preventBackdropScroll);
  }
}
