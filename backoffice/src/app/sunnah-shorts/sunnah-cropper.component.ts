import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';

const OUT_WIDTH = 1080;
const OUT_HEIGHT = 1920;
const VIEW_WIDTH = 270;
const VIEW_HEIGHT = 480;

/**
 * NF-015: crops a photo to the 9:16 card shape. Drag to move, slider (or wheel) to zoom; "Use photo"
 * emits a 1080×1920 JPEG. The API fits it to 1080×1920 again, so the shape is always right.
 */
@Component({
  selector: 'app-sunnah-cropper',
  template: `
    <div class="d-flex flex-column align-items-center gap-2">
      <div #view class="position-relative overflow-hidden rounded border bg-dark"
           [style.width.px]="viewWidth" [style.height.px]="viewHeight" style="touch-action:none;cursor:grab"
           (pointerdown)="start($event)" (pointermove)="drag($event)" (pointerup)="end($event)" (pointercancel)="end($event)"
           (wheel)="wheel($event)">
        <img *ngIf="src" [src]="src" alt="" draggable="false" class="position-absolute user-select-none" style="max-width:none;left:0;top:0"
             [style.width.px]="naturalWidth * scale" [style.height.px]="naturalHeight * scale"
             [style.transform]="'translate(' + x + 'px,' + y + 'px)'" (load)="loaded($event)">
      </div>
      <input type="range" class="form-range" style="max-width:270px" [min]="minScale" [max]="minScale * 4" step="0.001"
             [value]="scale" (input)="zoom(+$any($event.target).value)" aria-label="Zoom">
      <small class="text-muted">Drag to move, slide to zoom. The card is 9:16 (1080 × 1920).</small>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" (click)="cancel.emit()">Cancel</button>
        <button type="button" class="btn btn-primary btn-sm" [disabled]="!ready || busy" (click)="crop()">
          <span *ngIf="busy" class="spinner-border spinner-border-sm me-1"></span>Use photo
        </button>
      </div>
    </div>`
})
export class SunnahCropperComponent implements OnChanges, OnDestroy {
  @Input() file: File | null = null;
  @Output() cropped = new EventEmitter<Blob>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild('view') view?: ElementRef<HTMLElement>;

  readonly viewWidth = VIEW_WIDTH;
  readonly viewHeight = VIEW_HEIGHT;
  src: string | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  scale = 1;
  minScale = 1;
  x = 0;
  y = 0;
  ready = false;
  busy = false;
  private image?: HTMLImageElement;
  private pointer: { id: number; x: number; y: number } | null = null;

  ngOnChanges(): void {
    this.revoke();
    this.ready = false;
    this.src = this.file ? URL.createObjectURL(this.file) : null;
  }

  loaded(event: Event): void {
    this.image = event.target as HTMLImageElement;
    this.naturalWidth = this.image.naturalWidth;
    this.naturalHeight = this.image.naturalHeight;
    // Cover the frame, centred.
    this.minScale = Math.max(VIEW_WIDTH / this.naturalWidth, VIEW_HEIGHT / this.naturalHeight);
    this.scale = this.minScale;
    this.x = (VIEW_WIDTH - this.naturalWidth * this.scale) / 2;
    this.y = (VIEW_HEIGHT - this.naturalHeight * this.scale) / 2;
    this.ready = true;
  }

  start(event: PointerEvent): void {
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  drag(event: PointerEvent): void {
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    this.x += event.clientX - this.pointer.x;
    this.y += event.clientY - this.pointer.y;
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.clamp();
  }

  end(event: PointerEvent): void {
    if (this.pointer?.id === event.pointerId) this.pointer = null;
  }

  wheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoom(this.scale * (event.deltaY < 0 ? 1.05 : 0.95));
  }

  /** Zooms around the frame centre. */
  zoom(scale: number): void {
    const next = Math.min(Math.max(scale, this.minScale), this.minScale * 4);
    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;
    this.x = cx - (cx - this.x) * (next / this.scale);
    this.y = cy - (cy - this.y) * (next / this.scale);
    this.scale = next;
    this.clamp();
  }

  crop(): void {
    if (!this.image) return;
    this.busy = true;
    const canvas = document.createElement('canvas');
    canvas.width = OUT_WIDTH;
    canvas.height = OUT_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) { this.busy = false; return; }
    const factor = OUT_WIDTH / VIEW_WIDTH;
    context.drawImage(this.image, this.x * factor, this.y * factor, this.naturalWidth * this.scale * factor, this.naturalHeight * this.scale * factor);
    canvas.toBlob(blob => {
      this.busy = false;
      if (blob) this.cropped.emit(blob);
    }, 'image/jpeg', 0.9);
  }

  /** The photo always covers the whole frame. */
  private clamp(): void {
    const width = this.naturalWidth * this.scale;
    const height = this.naturalHeight * this.scale;
    this.x = Math.min(0, Math.max(VIEW_WIDTH - width, this.x));
    this.y = Math.min(0, Math.max(VIEW_HEIGHT - height, this.y));
  }

  private revoke(): void {
    if (this.src) URL.revokeObjectURL(this.src);
  }

  ngOnDestroy(): void {
    this.revoke();
  }
}
