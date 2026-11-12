import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { SunnahCard, SunnahSegment } from '../shorts.model';
import { SunnahShortsService } from '../sunnah-shorts.service';

/**
 * One Sunnah card drawn with its template (t01 … t10) or, when it has a photo, the photo style.
 * "tile" is the grid thumbnail (headline + reference label); "full" is the player card.
 * Template looks live in src/styles/sunnah-shorts.scss (bundle sunnah.css).
 */
@Component({
  selector: 'app-sunnah-card',
  templateUrl: './sunnah-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SunnahCardComponent {
  @Input() card!: SunnahCard;
  @Input() language = 'en';
  @Input() mode: 'tile' | 'full' = 'tile';
  /** Full mode: load the photo now (current and next cards) or later. */
  @Input() eager = false;
  @Output() more = new EventEmitter<void>();

  constructor(private shorts: SunnahShortsService) {}

  get styleClass(): string {
    return this.card.imageUrl ? 'sc-photo' : `sc-${/^t(0[1-9]|10)$/.test(this.card.template) ? this.card.template : 't01'}`;
  }

  get headline(): SunnahSegment[] {
    return this.shorts.segments(this.shorts.text(this.card.headline, this.language));
  }

  get body(): SunnahSegment[] {
    return this.shorts.segments(this.shorts.text(this.card.body, this.language), false);
  }

  get headlineLang(): string {
    return this.card.headline[this.language] ? this.language : 'en';
  }

  get bodyLang(): string {
    return this.card.body[this.language] ? this.language : 'en';
  }

  get label(): string {
    return this.shorts.referenceLabel(this.card);
  }

  get hasMore(): boolean {
    return !!(this.card.zikr?.transliteration || this.shorts.text(this.card.zikr?.meaning, this.language) || this.card.references.length > 1);
  }

  trackIndex(index: number): number {
    return index;
  }
}
