import { Component, OnInit } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';

type BubbleStyle = 'emerald' | 'pearl' | 'onyx' | 'amber';
type ButtonStyle = 'mint' | 'sand' | 'night';
type FontSizeMode = 'sm' | 'md' | 'lg';
type BrightnessMode = 'soft' | 'balanced' | 'vivid';
type StyleTab = 'misbaha' | 'button';

interface TasbihState {
  count: number;
  roundsCompleted: number;
  target: number;
  bubbleStyle: BubbleStyle;
  buttonStyle: ButtonStyle;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  fontSizeMode: FontSizeMode;
  brightnessMode: BrightnessMode;
}

@Component({
  selector: 'app-tasbih',
  templateUrl: './tasbih.component.html',
  styleUrls: ['./tasbih.component.scss']
})
export class TasbihComponent implements OnInit {
  readonly storageKey = 'tasbih-state-v1';
  readonly bubbleCount = 8;
  readonly bubbleStyles: BubbleStyle[] = ['emerald', 'pearl', 'onyx', 'amber'];
  readonly buttonStyles: ButtonStyle[] = ['mint', 'sand', 'night'];

  state: TasbihState = {
    count: 0,
    roundsCompleted: 0,
    target: 33,
    bubbleStyle: 'emerald',
    buttonStyle: 'mint',
    vibrationEnabled: true,
    soundEnabled: false,
    fontSizeMode: 'md',
    brightnessMode: 'balanced'
  };

  showStyleDialog = false;
  showRoundsDialog = false;
  showCustomTargetDialog = false;
  styleTab: StyleTab = 'misbaha';
  customTargetInput = '33';
  swipeFeedback: '+1' | '-1' | null = null;
  swipeAnimation: 'left' | 'right' | null = null;
  private touchStartX: number | null = null;
  private touchStartY: number | null = null;
  private swipeFeedbackTimer?: ReturnType<typeof setTimeout>;
  private swipeAnimationTimer?: ReturnType<typeof setTimeout>;

  readonly dua = {
    arabic: 'اَسْتَغْفِرُ اللّٰهَ الْعَظِيمَ الَّذِي لَا إِلٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَاَتُوبُ اِلَيْهِ',
    transliteration: 'Astaghfirul-lahal azim alladhi la ilaha illa huwal-hayyul-qayyoomu wa-atoobu ilayh',
    meaningKey: 'TASBIH.DUA.ASTAGHFIRULLAH_MEANING'
  };

  constructor(
    private localStorageService: LocalStorageService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    const saved = this.localStorageService.getItem<Partial<TasbihState>>(this.storageKey);
    if (saved) {
      this.state = { ...this.state, ...saved };
    }
  }

  get beads(): number[] {
    return Array.from({ length: this.bubbleCount }, (_, index) => index);
  }

  get progressText(): string {
    return `${this.state.count}/${this.state.target}`;
  }

  get displayRound(): number {
    return this.state.roundsCompleted + 1;
  }

  get themeClass(): string {
    return `tasbih-theme-${this.state.bubbleStyle}`;
  }

  get buttonThemeClass(): string {
    return `tasbih-button-theme-${this.state.buttonStyle}`;
  }

  get fontSizeClass(): string {
    return `tasbih-font-${this.state.fontSizeMode}`;
  }

  get brightnessClass(): string {
    return `tasbih-brightness-${this.state.brightnessMode}`;
  }

  get currentMeaning(): string {
    return this.translateService.instant(this.dua.meaningKey);
  }

  isBeadActive(index: number): boolean {
    const bubbleStep = this.state.target / this.bubbleCount;
    return this.state.count > Math.floor(index * bubbleStep);
  }

  async increment(): Promise<void> {
    this.state.count += 1;
    if (this.state.count >= this.state.target) {
      this.state.count = 0;
      this.state.roundsCompleted += 1;
    }

    this.showSwipeFeedback('+1');
    this.triggerSwipeAnimation('left');
    await this.triggerFeedback();
    this.persistState();
  }

  async decrement(): Promise<void> {
    if (this.state.count === 0) {
      if (this.state.roundsCompleted === 0) {
        this.showSwipeFeedback('-1');
        this.triggerSwipeAnimation('right');
        return;
      }

      this.state.roundsCompleted -= 1;
      this.state.count = this.state.target - 1;
    } else {
      this.state.count -= 1;
    }

    this.showSwipeFeedback('-1');
    this.triggerSwipeAnimation('right');
    await this.triggerFeedback();
    this.persistState();
  }

  handleTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  async handleTouchEnd(event: TouchEvent): Promise<void> {
    const touch = event.changedTouches[0];
    if (!touch || this.touchStartX === null || this.touchStartY === null) {
      this.resetTouchGesture();
      return;
    }

    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    this.resetTouchGesture();

    if (Math.abs(deltaY) > 60 || Math.abs(deltaX) < 36) {
      return;
    }

    if (deltaX < 0) {
      await this.increment();
      return;
    }

    await this.decrement();
  }

  resetCounter(): void {
    this.state.count = 0;
    this.state.roundsCompleted = 0;
    this.persistState();
  }

  toggleVibration(): void {
    this.state.vibrationEnabled = !this.state.vibrationEnabled;
    this.persistState();
  }

  setVibration(enabled: boolean): void {
    this.state.vibrationEnabled = enabled;
    this.persistState();
  }

  toggleSound(): void {
    this.state.soundEnabled = !this.state.soundEnabled;
    this.persistState();
  }

  setBrightness(mode: BrightnessMode): void {
    this.state.brightnessMode = mode;
    this.persistState();
  }

  setFontSize(mode: FontSizeMode): void {
    this.state.fontSizeMode = mode;
    this.persistState();
  }

  openStyleDialog(tab: StyleTab = 'misbaha'): void {
    this.styleTab = tab;
    this.showStyleDialog = true;
  }

  closeStyleDialog(): void {
    this.showStyleDialog = false;
  }

  useBubbleStyle(style: BubbleStyle): void {
    this.state.bubbleStyle = style;
    this.persistState();
  }

  useButtonStyle(style: ButtonStyle): void {
    this.state.buttonStyle = style;
    this.persistState();
  }

  openRoundsDialog(): void {
    this.showRoundsDialog = true;
  }

  closeRoundsDialog(): void {
    this.showRoundsDialog = false;
  }

  chooseTarget(target: number): void {
    this.state.target = target;
    this.state.count = 0;
    this.state.roundsCompleted = 0;
    this.showRoundsDialog = false;
    this.persistState();
  }

  openCustomizeTarget(): void {
    this.customTargetInput = String(this.state.target);
    this.showRoundsDialog = false;
    this.showCustomTargetDialog = true;
  }

  closeCustomizeTarget(): void {
    this.showCustomTargetDialog = false;
  }

  applyCustomTarget(): void {
    const parsed = Number(this.customTargetInput);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return;
    }

    this.state.target = Math.round(parsed);
    this.state.count = 0;
    this.state.roundsCompleted = 0;
    this.showCustomTargetDialog = false;
    this.persistState();
  }

  private resetTouchGesture(): void {
    this.touchStartX = null;
    this.touchStartY = null;
  }

  private showSwipeFeedback(value: '+1' | '-1'): void {
    this.swipeFeedback = value;
    if (this.swipeFeedbackTimer) {
      clearTimeout(this.swipeFeedbackTimer);
    }

    this.swipeFeedbackTimer = setTimeout(() => {
      this.swipeFeedback = null;
    }, 520);
  }

  private triggerSwipeAnimation(direction: 'left' | 'right'): void {
    this.swipeAnimation = direction;
    if (this.swipeAnimationTimer) {
      clearTimeout(this.swipeAnimationTimer);
    }

    this.swipeAnimationTimer = setTimeout(() => {
      this.swipeAnimation = null;
    }, 360);
  }

  private async triggerFeedback(): Promise<void> {
    if (this.state.vibrationEnabled) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
    }

    if (this.state.soundEnabled) {
      this.playTone();
    }
  }

  private playTone(): void {
    const ContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!ContextClass) {
      return;
    }

    const audioContext = new ContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 620;
    gain.gain.value = 0.03;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.07);
  }

  private persistState(): void {
    this.localStorageService.setItem(this.storageKey, this.state);
  }
}
