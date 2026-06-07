import { Component, OnInit } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AppTranslateService } from 'src/app/services/translate.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

interface TasbihDuaStep {
  id: string;
  arabic: string;
  target: number;
}

interface TasbihState {
  counts: number[];
  roundsCompleted: number;
  currentDuaIndex: number;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
}

@Component({
  selector: 'app-tasbih',
  templateUrl: './tasbih.component.html',
  styleUrls: ['./tasbih.component.scss']
})
export class TasbihComponent implements OnInit {
  readonly storageKey = 'tasbih-state-v3';
  readonly roundOptions = [33, 99, 1000];
  readonly duas: TasbihDuaStep[] = [
    { id: 'SUBHANALLAH', arabic: 'سُبْحَانَ اللَّهِ', target: 33 },
    { id: 'ALHAMDULILLAH', arabic: 'الْحَمْدُ لِلَّهِ', target: 33 },
    { id: 'ALLAHU_AKBAR', arabic: 'اللَّهُ أَكْبَرُ', target: 34 },
    { id: 'ASTAGHFIRULLAH', arabic: 'أَسْتَغْفِرُ اللَّهَ', target: 33 },
    { id: 'LA_ILAHA_ILLALLAH', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', target: 33 },
    { id: 'SUBHANALLAHI_WA_BIHAMDIHI', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', target: 33 },
    { id: 'SUBHANALLAHIL_AZEEM', arabic: 'سُبْحَانَ اللَّهِ الْعَظِيمِ', target: 33 },
    { id: 'LA_HAWLA_WALA_QUWWATA', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', target: 33 },
    { id: 'HASBIYALLAH', arabic: 'حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ', target: 33 },
    { id: 'ALLAHUMMA_SALLI', arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', target: 33 },
    { id: 'RABBIGHFIRLI', arabic: 'رَبِّ اغْفِرْ لِي', target: 33 },
    { id: 'YA_HAYYU_YA_QAYYUM', arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ', target: 33 }
  ];

  state: TasbihState = {
    counts: [],
    roundsCompleted: 0,
    currentDuaIndex: 0,
    vibrationEnabled: true,
    soundEnabled: false
  };

  showRoundsDialog = false;
  showCustomTargetDialog = false;
  customTargetValue = 33;
  swipeFeedback: '+1' | '-1' | null = null;
  private swipeFeedbackTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private localStorageService: LocalStorageService,
    public i18n: AppTranslateService
  ) {}

  ngOnInit(): void {
    const saved = this.localStorageService.getItem<Partial<TasbihState>>(this.storageKey);
    if (saved) {
      this.state = { ...this.state, ...saved };
    }
    this.state.counts = this.normalizeCounts(this.state.counts);
  }

  get currentDua(): TasbihDuaStep {
    return this.duas[this.state.currentDuaIndex] ?? this.duas[0];
  }

  get currentCount(): number {
    return this.state.counts[this.state.currentDuaIndex] ?? 0;
  }

  get progressText(): string {
    return `${this.currentCount}/${this.currentDua.target}`;
  }

  get currentDuaPositionText(): string {
    return `${this.state.currentDuaIndex + 1}/${this.duas.length}`;
  }

  get displayRound(): number {
    return this.state.roundsCompleted + 1;
  }

  get currentLanguageText(): string {
    return this.i18n.translateWithParams(`TASBIH.DUAS.${this.currentDua.id}.TEXT`, {});
  }

  get currentMeaning(): string {
    return this.i18n.translateWithParams(`TASBIH.DUAS.${this.currentDua.id}.MEANING`, {});
  }

  async increment(): Promise<void> {
    const nextCount = this.currentCount + 1;
    if (nextCount >= this.currentDua.target) {
      this.state.counts[this.state.currentDuaIndex] = 0;
      if (this.state.currentDuaIndex >= this.duas.length - 1) {
        this.state.currentDuaIndex = 0;
        this.state.roundsCompleted += 1;
      } else {
        this.state.currentDuaIndex += 1;
      }
    } else {
      this.state.counts[this.state.currentDuaIndex] = nextCount;
    }

    this.showSwipeFeedback('+1');
    await this.triggerFeedback();
    this.persistState();
  }

  async decrement(): Promise<void> {
    if (this.currentCount === 0) {
      if (this.state.currentDuaIndex === 0 && this.state.roundsCompleted === 0) {
        this.showSwipeFeedback('-1');
        return;
      }

      if (this.state.currentDuaIndex === 0) {
        this.state.roundsCompleted -= 1;
        this.state.currentDuaIndex = this.duas.length - 1;
      } else {
        this.state.currentDuaIndex -= 1;
      }

      this.state.counts[this.state.currentDuaIndex] = Math.max(this.currentDua.target - 1, 0);
    } else {
      this.state.counts[this.state.currentDuaIndex] = this.currentCount - 1;
    }

    this.showSwipeFeedback('-1');
    await this.triggerFeedback();
    this.persistState();
  }

  async goToPreviousDua(): Promise<void> {
    if (this.state.currentDuaIndex === 0) {
      return;
    }
    this.state.currentDuaIndex -= 1;
    this.persistState();
    this.showSwipeFeedback('-1');
    await this.triggerFeedback();
  }

  async goToNextDua(): Promise<void> {
    if (this.state.currentDuaIndex >= this.duas.length - 1) {
      return;
    }
    this.state.currentDuaIndex += 1;
    this.persistState();
    this.showSwipeFeedback('+1');
    await this.triggerFeedback();
  }

  resetCounter(): void {
    this.state.counts = this.normalizeCounts([]);
    this.state.roundsCompleted = 0;
    this.state.currentDuaIndex = 0;
    this.persistState();
  }

  setVibration(enabled: boolean): void {
    this.state.vibrationEnabled = enabled;
    this.persistState();
  }

  openRoundsDialog(): void {
    this.showRoundsDialog = true;
  }

  closeRoundsDialog(): void {
    this.showRoundsDialog = false;
  }

  openCustomTargetDialog(): void {
    this.showRoundsDialog = false;
    this.customTargetValue = this.currentDua.target;
    this.showCustomTargetDialog = true;
  }

  closeCustomTargetDialog(): void {
    this.showCustomTargetDialog = false;
  }

  applyRoundTarget(target: number): void {
    this.currentDua.target = target;
    this.state.counts[this.state.currentDuaIndex] = Math.min(this.currentCount, Math.max(target - 1, 0));
    this.showRoundsDialog = false;
    this.persistState();
  }

  applyCustomTarget(): void {
    const nextTarget = Math.max(1, Math.floor(Number(this.customTargetValue) || 0));
    this.applyRoundTarget(nextTarget);
    this.showCustomTargetDialog = false;
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
    const ContextClass = (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  private normalizeCounts(counts: number[] | undefined): number[] {
    return this.duas.map((_, index) => Math.max(0, Math.floor(counts?.[index] ?? 0)));
  }
}
