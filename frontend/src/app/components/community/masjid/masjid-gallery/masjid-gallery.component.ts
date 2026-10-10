import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MasjidImage } from 'src/app/models/masjid.model';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { compressImage, GALLERY_UPLOAD_MAX_EDGE } from 'src/app/shared/image-compress';

/**
 * Masjid photo slideshow. Every photo is stored cropped to the same 16:9 frame, so the
 * slider keeps one height. Slides advance on their own every few seconds, pause while the
 * user is touching/hovering or the page is hidden, and never autoplay with reduced motion.
 * The owner adds photos (several at once) from the masjid header's photos icon, which calls
 * openFilePicker(), and removes them in edit mode.
 */
@Component({
  selector: 'app-masjid-gallery',
  templateUrl: './masjid-gallery.component.html',
  styleUrls: ['./masjid-gallery.component.scss']
})
export class MasjidGalleryComponent implements OnChanges, OnDestroy {
  @Input() images: MasjidImage[] = [];
  @Input() masjidId: string | number | null = null;
  // The owner can always add photos; removing is offered in edit mode only.
  @Input() canAdd = false;
  @Input() canRemove = false;
  @Input() maxImages = 10;
  @Input() masjidName = '';
  @Output() imagesChange = new EventEmitter<MasjidImage[]>();

  @ViewChild('track') track?: ElementRef<HTMLElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  activeIndex = 0;
  uploading = false;
  uploadDone = 0;
  uploadTotal = 0;
  errorKey = '';

  private autoplayTimer?: ReturnType<typeof setInterval>;
  private paused = false;
  private readonly autoplayMs = 4500;
  private readonly reducedMotion = typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  private readonly onVisibility = () => this.restartAutoplay();

  constructor(
    private ramadanService: RamadanApiService,
    private i18n: AppTranslateService,
    private cdr: ChangeDetectorRef
  ) {
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images']) {
      this.activeIndex = Math.min(this.activeIndex, Math.max(this.images.length - 1, 0));
      this.restartAutoplay();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  get canAddMore(): boolean {
    return this.canAdd && !!this.masjidId && this.images.length < this.maxImages && !this.uploading;
  }

  openFilePicker(): void {
    if (this.canAddMore) {
      this.fileInput?.nativeElement.click();
    }
  }

  /** The photo currently uploading, 1-based. */
  get uploadStep(): number {
    return Math.min(this.uploadDone + 1, this.uploadTotal);
  }

  slideLabel(index: number): string {
    return this.i18n.translateWithParams('MASJID_PAGE.GALLERY.PHOTO_OF', { index: index + 1, total: this.images.length });
  }

  goTo(index: number, smooth = true): void {
    const count = this.images.length;
    if (!count) {
      return;
    }
    this.activeIndex = (index + count) % count;
    const track = this.track?.nativeElement;
    track?.scrollTo({ left: this.activeIndex * track.clientWidth, behavior: smooth && !this.reducedMotion ? 'smooth' : 'auto' });
  }

  previous(): void {
    this.goTo(this.activeIndex - 1);
    this.restartAutoplay();
  }

  next(): void {
    this.goTo(this.activeIndex + 1);
    this.restartAutoplay();
  }

  /** Keeps the dots in sync when the user swipes the scroll-snap track. */
  onTrackScroll(): void {
    const track = this.track?.nativeElement;
    if (!track || !track.clientWidth) {
      return;
    }
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (index !== this.activeIndex && index >= 0 && index < this.images.length) {
      this.activeIndex = index;
    }
  }

  pause(): void {
    this.paused = true;
    this.stopAutoplay();
  }

  resume(): void {
    this.paused = false;
    this.restartAutoplay();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).slice(0, this.maxImages - this.images.length);
    input.value = '';
    if (!files.length || !this.masjidId) {
      return;
    }

    this.uploading = true;
    this.errorKey = '';
    this.uploadDone = 0;
    this.uploadTotal = files.length;
    const added: MasjidImage[] = [];

    // One at a time: keeps memory low on phones and gives a simple "n of m" progress.
    for (const file of files) {
      try {
        const blob = await compressImage(file, { maxEdge: GALLERY_UPLOAD_MAX_EDGE });
        added.push(await firstValueFrom(this.ramadanService.uploadMasjidImage(this.masjidId, blob)));
      } catch {
        this.errorKey = 'MASJID_PAGE.GALLERY.FAILED';
      }
      this.uploadDone++;
      this.cdr.markForCheck();
    }

    this.uploading = false;
    if (added.length) {
      this.images = [...this.images, ...added];
      this.imagesChange.emit(this.images);
      setTimeout(() => this.goTo(this.images.length - added.length, false));
    }
  }

  remove(image: MasjidImage): void {
    if (!this.masjidId || !window.confirm(this.i18n.translateWithParams('MASJID_PAGE.GALLERY.REMOVE_CONFIRM', {}))) {
      return;
    }
    this.ramadanService.deleteMasjidImage(this.masjidId, image.id).subscribe({
      next: () => {
        this.images = this.images.filter((item) => item.id !== image.id);
        this.imagesChange.emit(this.images);
        this.goTo(this.activeIndex, false);
      },
      error: () => {
        this.errorKey = 'MASJID_PAGE.GALLERY.FAILED';
      }
    });
  }

  trackById = (_index: number, image: MasjidImage): number => image.id;

  private restartAutoplay(): void {
    this.stopAutoplay();
    if (this.paused || this.reducedMotion || this.images.length < 2 || document.hidden) {
      return;
    }
    this.autoplayTimer = setInterval(() => this.goTo(this.activeIndex + 1), this.autoplayMs);
  }

  private stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = undefined;
    }
  }
}
