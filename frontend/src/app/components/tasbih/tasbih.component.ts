import { Component, OnInit } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AppTranslateService } from 'src/app/services/translate.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ScreenHeaderAction } from 'src/app/shared/screen-header/screen-header.component';
import { ZikarNotificationDialogComponent, ZikarNotificationDialogResult } from 'src/app/shared/zikar-notification-dialog/zikar-notification-dialog.component';

interface TasbihDuaStep {
  id: string;
  arabic: string;
  target: number;
  category: 'morning' | 'evening' | 'night';
}

interface TasbihState {
  counts: number[];
  roundsCompleted: number;
  currentDuaIndex: number;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
}

// Module-level type: `typeof this.x` in signatures breaks Angular's incremental (ng serve) rebuilds.
const ZIKAR_CATEGORIES = ['all', 'morning', 'evening', 'night'] as const;
type ZikarCategory = typeof ZIKAR_CATEGORIES[number];

@Component({
  selector: 'app-tasbih',
  templateUrl: './tasbih.component.html',
  styleUrls: ['./tasbih.component.scss']
})
export class TasbihComponent implements OnInit {
  readonly zikarCategories = ZIKAR_CATEGORIES;
  selectedCategory: ZikarCategory = 'all';
  zikarNotificationsEnabled = false;
  zikarNotificationIntervalMinutes = 10;
  private zikarNotificationCategory?: string;
  // Same instances every change-detection pass so the header doesn't re-render its buttons.
  private readonly resetAction: ScreenHeaderAction = { id: 'reset', icon: 'bi-arrow-counterclockwise', ariaLabel: '' };
  private readonly vibrationAction: ScreenHeaderAction = { id: 'vibration', icon: 'bi-phone-vibrate', ariaLabel: '', toggle: true };
  private readonly notificationsAction: ScreenHeaderAction = { id: 'notifications', icon: 'bi-bell', ariaLabel: '', toggle: true };
  private readonly headerActionList = [this.resetAction, this.vibrationAction, this.notificationsAction];

  get headerActions(): ScreenHeaderAction[] {
    this.resetAction.ariaLabel = this.i18n.translateWithParams('TASBIH.RESET', {});
    this.vibrationAction.ariaLabel = this.i18n.translateWithParams('TASBIH.VIBRATION', {});
    this.vibrationAction.active = this.state.vibrationEnabled;
    this.vibrationAction.icon = this.state.vibrationEnabled ? 'bi-phone-vibrate' : 'bi-phone';
    this.notificationsAction.ariaLabel = this.i18n.translateWithParams('ZIKAR.NOTIFICATIONS', {});
    this.notificationsAction.active = this.zikarNotificationsEnabled;
    this.notificationsAction.icon = this.zikarNotificationsEnabled ? 'bi-bell-fill' : 'bi-bell';
    return this.headerActionList;
  }

  onHeaderAction(action: ScreenHeaderAction): void {
    switch (action.id) {
      case 'reset':
        this.resetCounter();
        break;
      case 'vibration':
        this.setVibration(!this.state.vibrationEnabled);
        break;
      case 'notifications':
        void this.toggleZikarNotifications();
        break;
    }
  }
  readonly storageKey = 'tasbih-state-v3';
  readonly roundOptions = [33, 99, 1000];
  readonly duas: TasbihDuaStep[] = [
    { id: 'SUBHANALLAH', arabic: 'سُبْحَانَ اللَّهِ', target: 33, category: 'morning' },
    { id: 'ALHAMDULILLAH', arabic: 'الْحَمْدُ لِلَّهِ', target: 33, category: 'morning' },
    { id: 'ALLAHU_AKBAR', arabic: 'اللَّهُ أَكْبَرُ', target: 34, category: 'morning' },
    { id: 'ASTAGHFIRULLAH', arabic: 'أَسْتَغْفِرُ اللَّهَ', target: 33, category: 'evening' },
    { id: 'LA_ILAHA_ILLALLAH', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', target: 33, category: 'evening' },
    { id: 'SUBHANALLAHI_WA_BIHAMDIHI', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', target: 33, category: 'evening' },
    { id: 'SUBHANALLAHIL_AZEEM', arabic: 'سُبْحَانَ اللَّهِ الْعَظِيمِ', target: 33, category: 'night' },
    { id: 'LA_HAWLA_WALA_QUWWATA', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', target: 33, category: 'night' },
    { id: 'HASBIYALLAH', arabic: 'حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ', target: 33, category: 'night' },
    { id: 'ALLAHUMMA_SALLI', arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', target: 33, category: 'morning' },
    { id: 'RABBIGHFIRLI', arabic: 'رَبِّ اغْفِرْ لِي', target: 33, category: 'evening' },
    { id: 'YA_HAYYU_YA_QAYYUM', arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ', target: 33, category: 'night' }
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
    public i18n: AppTranslateService,
    private notificationService: NotificationService,
    private matDialog: MatDialog
  ) {}

  ngOnInit(): void {
    const saved = this.localStorageService.getItem<Partial<TasbihState>>(this.storageKey);
    if (saved) {
      this.state = { ...this.state, ...saved };
    }
    this.restoreZikarReminderState();
    this.state.counts = this.normalizeCounts(this.state.counts);
  }

  get currentDua(): TasbihDuaStep {
    return this.visibleDuas[this.state.currentDuaIndex] ?? this.visibleDuas[0];
  }

  get visibleDuas(): TasbihDuaStep[] {
    return this.selectedCategory === 'all'
      ? this.duas
      : this.duas.filter((dua) => dua.category === this.selectedCategory);
  }

  get currentCount(): number {
    return this.state.counts[this.state.currentDuaIndex] ?? 0;
  }

  get currentDuaArabicText(): string {
    return this.toQuranicSukoon(this.currentDua.arabic);
  }

  get progressText(): string {
    return `${this.currentCount}/${this.currentDua.target}`;
  }

  get circleProgress(): number {
    return this.currentDua.target > 0 ? Math.min(this.currentCount / this.currentDua.target, 1) : 0;
  }

  get circleCircumference(): number {
    const radius = 116;
    return 2 * Math.PI * radius;
  }

  get circleDashOffset(): number {
    return this.circleCircumference * (1 - this.circleProgress);
  }

  get currentDuaPositionText(): string {
    return `${this.state.currentDuaIndex + 1}/${this.visibleDuas.length}`;
  }

  setCategory(category: ZikarCategory): void {
    this.selectedCategory = category;
    this.state.currentDuaIndex = 0;
    this.state.counts = this.normalizeCounts([]);
    this.persistState();
    if (this.zikarNotificationsEnabled) {
      void this.enableZikarNotifications(category);
    }
  }

  toggleZikarNotifications(): void {
    const ref = this.matDialog.open(ZikarNotificationDialogComponent, {
      width: 'min(92vw, 430px)',
      data: {
        categories: this.zikarCategories,
        enabled: this.zikarNotificationsEnabled,
        intervalMinutes: this.zikarNotificationIntervalMinutes,
        category: this.zikarNotificationCategory ?? this.selectedCategory
      }
    });
    ref.afterClosed().subscribe((result: ZikarNotificationDialogResult | undefined) => {
      if (!result) return;
      if (result.action === 'off') void this.disableZikarNotifications();
      if (result.action === 'enable' && result.category) {
        this.zikarNotificationIntervalMinutes = result.intervalMinutes ?? 10;
        void this.enableZikarNotifications(result.category as ZikarCategory);
      }
      if (result.action === 'test') void this.testZikarNotification();
    });
  }

  async enableZikarNotifications(category: ZikarCategory): Promise<void> {
    this.selectedCategory = category;
    this.zikarNotificationCategory = category;
    this.zikarNotificationsEnabled = await this.notificationService.scheduleZikarNotifications(
      this.visibleDuas.map((dua) => ({ id: dua.id, text: this.i18n.translateWithParams(`TASBIH.DUAS.${dua.id}.TEXT`, {}) })),
      this.zikarNotificationIntervalMinutes,
      category
    );
  }

  private restoreZikarReminderState(): void {
    const config = this.notificationService.getZikarReminderConfig();
    if (!config) {
      return;
    }

    // Only the reminder settings are restored; the counter keeps its own category and counts.
    this.zikarNotificationsEnabled = config.enabled;
    this.zikarNotificationIntervalMinutes = config.intervalMinutes;
    this.zikarNotificationCategory = config.category;
  }

  async disableZikarNotifications(): Promise<void> {
    this.zikarNotificationsEnabled = false;
    await this.notificationService.cancelZikarNotifications();
  }

  async testZikarNotification(): Promise<void> {
    await this.notificationService.showZikarTestNotification(
      this.i18n.translateWithParams('TASBIH.DUAS.SUBHANALLAH.TEXT', {})
    );
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
      if (this.state.currentDuaIndex >= this.visibleDuas.length - 1) {
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
        this.state.currentDuaIndex = this.visibleDuas.length - 1;
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
    await this.triggerFeedback();
  }

  async goToNextDua(): Promise<void> {
    if (this.state.currentDuaIndex >= this.visibleDuas.length - 1) {
      return;
    }
    this.state.currentDuaIndex += 1;
    this.persistState();
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
      await this.triggerVibration();
    }

    if (this.state.soundEnabled) {
      this.playTone();
    }
  }

  private async triggerVibration(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    } catch {}

    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(35);
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
    return this.visibleDuas.map((_, index) => Math.max(0, Math.floor(counts?.[index] ?? 0)));
  }

  private toQuranicSukoon(text: string): string {
    return text.replace(/\u0652/g, '\u06E1');
  }
}
