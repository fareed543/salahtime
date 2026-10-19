import { Component, OnDestroy, OnInit } from '@angular/core';
import { Haptics } from '@capacitor/haptics';
import { LocationService } from 'src/app/services/location.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { ScreenHeaderAction } from 'src/app/shared/screen-header/screen-header.component';

type CompassThemeId = 'premium' | 'sapphire' | 'bronze' | 'mosaic' | 'ruby';

@Component({
  selector: 'app-qibla-direction',
  templateUrl: './qibla-direction.component.html',
  styleUrls: ['./qibla-direction.component.scss']
})
export class QiblaDirectionComponent implements OnInit, OnDestroy {
  readonly storageKey = 'qibla-direction-state-v1';
  readonly compassThemes = [
    {
      id: 'premium',
      name: 'Premium',
      dialImage: 'assets/images/qibla-dial-premium-v1.webp',
      dialScale: 1.08,
      previewScale: 1.08
    },
    {
      id: 'sapphire',
      name: 'Sapphire Floral',
      dialImage: 'assets/images/qibla-dial-sapphire-floral-v1.webp',
      dialScale: 1.12,
      previewScale: 1.12
    },
    {
      id: 'bronze',
      name: 'Desert Bronze',
      dialImage: 'assets/images/qibla-dial-desert-bronze-v1.webp',
      dialScale: 1.09,
      previewScale: 1.09
    },
    {
      id: 'mosaic',
      name: 'Turquoise Mosaic',
      dialImage: 'assets/images/qibla-dial-turquoise-mosaic-v1.webp',
      dialScale: 1.06,
      previewScale: 1.06
    },
    {
      id: 'ruby',
      name: 'Ruby Star',
      dialImage: 'assets/images/qibla-dial-ruby-star-v1.webp',
      dialScale: 1.07,
      previewScale: 1.07
    }
  ] as const;

  selectedCompassTheme: CompassThemeId = 'premium';
  kaabaBearing = 0;
  heading = 0;
  pointerRotation = 0;
  locationLabel = '';
  calibrationNeeded = true;
  calibrationMessage = '';
  errorMessage = '';
  permissionHint = '';
  headingSupported = false;
  locationReady = false;
  vibrationEnabled = true;
  directionLabel = 'N';
  /** No true-north reading arrived (no magnetometer, or the browser does not expose it). */
  compassUnavailable = false;
  /** Sensor readout for support: tap the compass 5 times, or open the page with ?qiblaDebug=1. */
  debugEnabled = false;
  debugText = '';
  private hasVibratedForMatch = false;

  private orientationHandler?: (event: DeviceOrientationEvent) => void;
  /** Whether a reading relative to north has arrived since the listeners were attached. */
  private hasTrueNorth = false;
  private noCompassTimer?: ReturnType<typeof setTimeout>;
  private smoothedHeading: number | null = null;
  private debugTaps = 0;
  private debugTapTimer?: ReturnType<typeof setTimeout>;
  private debugCounts = { absolute: 0, relative: 0 };
  /** How long to wait for a true-north reading before saying the phone has no compass. */
  private readonly noCompassTimeoutMs = 3000;
  /** Share of each new reading blended into the shown heading; lower is steadier but slower. */
  private readonly smoothing = 0.2;

  private get orientationEventListener(): EventListener | undefined {
    return this.orientationHandler as unknown as EventListener | undefined;
  }

  get canShowCompass(): boolean {
    return this.locationReady && this.headingSupported && !this.errorMessage && !this.permissionHint;
  }

  get activeCompassTheme() {
    return this.compassThemes.find((theme) => theme.id === this.selectedCompassTheme) ?? this.compassThemes[0];
  }

  constructor(
    private locationService: LocationService,
    private localStorageService: LocalStorageService,
    public i18n: AppTranslateService
  ) {
    this.locationLabel = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.DETECTING_LOCATION', {});
    this.calibrationMessage = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.CALIBRATION_DEFAULT', {});
  }

  // Same instances every change-detection pass so the header doesn't re-render its buttons.
  private readonly vibrationAction: ScreenHeaderAction = { id: 'vibration', icon: 'bi-phone-vibrate', ariaLabel: '', toggle: true };
  private readonly headerActionList = [this.vibrationAction];

  get headerActions(): ScreenHeaderAction[] {
    this.vibrationAction.active = this.vibrationEnabled;
    this.vibrationAction.ariaLabel = this.i18n.translateWithParams(
      this.vibrationEnabled ? 'QIBLA_PAGE.VIBRATION_ON' : 'QIBLA_PAGE.VIBRATION_OFF',
      {}
    );
    return this.headerActionList;
  }

  onHeaderAction(action: ScreenHeaderAction): void {
    if (action.id === 'vibration') {
      this.vibrationEnabled = !this.vibrationEnabled;
    }
  }

  async ngOnInit(): Promise<void> {
    this.restoreState();
    this.debugEnabled = typeof location !== 'undefined' && /[?&]qiblaDebug=1\b/.test(location.search);
    await this.loadLocation();
    await this.initOrientation();
  }

  ngOnDestroy(): void {
    if (this.orientationEventListener) {
      window.removeEventListener('deviceorientation', this.orientationEventListener, true);
      window.removeEventListener('deviceorientationabsolute', this.orientationEventListener, true);
    }
    clearTimeout(this.noCompassTimer);
    clearTimeout(this.debugTapTimer);
  }

  /** Five quick taps on the compass toggle the sensor readout (for diagnosing a device). */
  onCompassTap(): void {
    this.debugTaps += 1;
    clearTimeout(this.debugTapTimer);
    this.debugTapTimer = setTimeout(() => this.debugTaps = 0, 1500);
    if (this.debugTaps >= 5) {
      this.debugTaps = 0;
      this.debugEnabled = !this.debugEnabled;
    }
  }

  /** Qibla bearing for phones without a compass, e.g. "293° WNW". */
  get qiblaBearingText(): string {
    const sixteen = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return `${Math.round(this.kaabaBearing)}° ${sixteen[Math.round(this.kaabaBearing / 22.5) % 16]}`;
  }

  async refresh(): Promise<void> {
    this.errorMessage = '';
    this.permissionHint = '';
    this.locationReady = false;
    this.locationLabel = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.DETECTING_LOCATION', {});
    this.calibrationNeeded = true;
    this.calibrationMessage = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.CALIBRATION_REFRESH', {});
    this.hasVibratedForMatch = false;
    await this.loadLocation();
    await this.initOrientation();
  }

  selectCompassTheme(themeId: CompassThemeId): void {
    this.selectedCompassTheme = themeId;
    this.persistState();
  }

  private async loadLocation(): Promise<void> {
    try {
      const loc = await this.locationService.getLocation();
      this.locationReady = true;
      this.locationLabel = this.i18n.translateWithParams('QIBLA_PAGE.LOCATION_LABEL', {
        lat: loc.lat.toFixed(4),
        lng: loc.lng.toFixed(4)
      });
      this.kaabaBearing = this.calculateBearing(loc.lat, loc.lng, 21.4225, 39.8262);
      this.updatePointer();
    } catch {
      this.locationReady = false;
      this.calibrationNeeded = true;
      this.locationLabel = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.LOCATION_PERMISSION_NEEDED', {});
      this.calibrationMessage = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.ENABLE_LOCATION_FIRST', {});
      this.errorMessage = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.LOCATION_ERROR', {});
    }
  }

  private async initOrientation(): Promise<void> {
    if (this.orientationEventListener) {
      window.removeEventListener('deviceorientation', this.orientationEventListener, true);
      window.removeEventListener('deviceorientationabsolute', this.orientationEventListener, true);
    }
    clearTimeout(this.noCompassTimer);
    this.hasTrueNorth = false;
    this.smoothedHeading = null;
    this.debugCounts = { absolute: 0, relative: 0 };
    if (this.compassUnavailable) {
      this.compassUnavailable = false;
      this.errorMessage = '';
    }

    const orientationApi = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof orientationApi?.requestPermission === 'function') {
      try {
        const permission = await orientationApi.requestPermission();
        if (permission !== 'granted') {
          this.permissionHint = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.COMPASS_PERMISSION_REQUIRED', {});
          this.headingSupported = false;
          this.calibrationNeeded = true;
          this.calibrationMessage = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.ENABLE_MOTION_PERMISSION', {});
          return;
        }
      } catch {
        this.permissionHint = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.COMPASS_PERMISSION_REQUEST_FAILED', {});
        this.headingSupported = false;
        this.calibrationNeeded = true;
        this.calibrationMessage = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.ENABLE_MOTION_FROM_SETTINGS', {});
        return;
      }
    }

    this.orientationHandler = (event: DeviceOrientationEvent) => {
      const trueHeading = this.extractHeading(event);
      if (this.debugEnabled) {
        this.updateDebug(event, trueHeading);
      }
      // Readings relative to an arbitrary start (Android's plain "deviceorientation") are ignored:
      // mixing them with true-north readings made the dial jump back and forth (Motorola).
      if (trueHeading === null) {
        return;
      }

      if (!this.hasTrueNorth) {
        this.hasTrueNorth = true;
        clearTimeout(this.noCompassTimer);
      }

      this.heading = this.smoothHeading(trueHeading);
      this.pointerRotation = this.normalizeAngle(this.kaabaBearing - this.heading);
      this.directionLabel = this.getDirectionLabel(this.heading);
      this.headingSupported = true;
      this.calibrationNeeded = !this.locationReady;
      this.calibrationMessage = this.locationReady
        ? this.i18n.translateWithParams('QIBLA_PAGE.STATUS.COMPASS_ACTIVE', {})
        : this.i18n.translateWithParams('QIBLA_PAGE.STATUS.COMPASS_ACTIVE_LOCATION_PENDING', {});
      void this.maybeVibrateOnMatch();
    };

    if (this.orientationEventListener) {
      window.addEventListener('deviceorientationabsolute', this.orientationEventListener, true);
      window.addEventListener('deviceorientation', this.orientationEventListener, true);
    }

    // Phones without a magnetometer never send a true-north reading; say so instead of
    // showing a dial that only follows how the phone was held when the screen opened.
    this.noCompassTimer = setTimeout(() => {
      if (this.hasTrueNorth) {
        return;
      }
      this.compassUnavailable = true;
      this.headingSupported = false;
      this.calibrationNeeded = true;
      if (!this.errorMessage) {
        this.errorMessage = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.NO_COMPASS_SENSOR', {
          button: this.i18n.translateWithParams('QIBLA_PAGE.RETRY_SETUP', {})
        });
      }
    }, this.noCompassTimeoutMs);
  }

  /**
   * Heading of the top of the screen, clockwise from north, or null when the event is not relative
   * to north. iOS gives webkitCompassHeading. On Android only "deviceorientationabsolute" (or an event
   * flagged absolute) is relative to north; plain "deviceorientation" starts from wherever the phone
   * pointed, so it is never used for the compass.
   */
  extractHeading(event: DeviceOrientationEvent): number | null {
    const iosHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
    if (typeof iosHeading === 'number' && !Number.isNaN(iosHeading)) {
      return this.normalizeAngle(iosHeading + this.screenAngle());
    }

    const isTrueNorth = event.type === 'deviceorientationabsolute' || event.absolute === true;
    if (!isTrueNorth || typeof event.alpha !== 'number' || Number.isNaN(event.alpha)) {
      return null;
    }

    return this.normalizeAngle(360 - event.alpha + this.screenAngle());
  }

  /** Blends the new reading into the shown heading along the shorter way round (359° -> 1° is +2°). */
  private smoothHeading(target: number): number {
    if (this.smoothedHeading === null) {
      this.smoothedHeading = target;
      return target;
    }
    const delta = ((target - this.smoothedHeading + 540) % 360) - 180;
    this.smoothedHeading = this.normalizeAngle(this.smoothedHeading + delta * this.smoothing);
    return this.smoothedHeading;
  }

  /** How far the screen is turned from portrait (0, 90, 180 or 270), so landscape still points right. */
  private screenAngle(): number {
    const angle = typeof screen !== 'undefined' && screen.orientation
      ? screen.orientation.angle
      : Number((window as Window & { orientation?: number }).orientation ?? 0);
    return Number.isFinite(angle) ? angle : 0;
  }

  private updateDebug(event: DeviceOrientationEvent, trueHeading: number | null): void {
    if (trueHeading === null) {
      this.debugCounts.relative += 1;
    } else {
      this.debugCounts.absolute += 1;
    }
    const value = (number: number | null) => (typeof number === 'number' ? number.toFixed(1) : '-');
    this.debugText = `${event.type} abs=${event.absolute} α=${value(event.alpha)} β=${value(event.beta)} γ=${value(event.gamma)}`
      + ` | heading=${value(trueHeading)} shown=${value(this.smoothedHeading)} screen=${this.screenAngle()}°`
      + ` | true-north events ${this.debugCounts.absolute}, ignored ${this.debugCounts.relative}`;
  }

  private updatePointer(): void {
    this.pointerRotation = this.normalizeAngle(this.kaabaBearing - this.heading);
    this.directionLabel = this.getDirectionLabel(this.heading);
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => value * Math.PI / 180;
    const toDeg = (value: number) => value * 180 / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

    return this.normalizeAngle(toDeg(Math.atan2(y, x)));
  }

  private normalizeAngle(value: number): number {
    return (value + 360) % 360;
  }

  private getDirectionLabel(angle: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const normalized = this.normalizeAngle(angle);
    const index = Math.round(normalized / 45) % directions.length;
    return directions[index];
  }

  private async maybeVibrateOnMatch(): Promise<void> {
    const matchDelta = Math.min(this.pointerRotation, 360 - this.pointerRotation);
    const isMatched = matchDelta <= 8;

    if (!this.vibrationEnabled) {
      this.hasVibratedForMatch = false;
      return;
    }

    if (isMatched && !this.hasVibratedForMatch) {
      try {
        await Haptics.vibrate({ duration: 250 });
      } catch {
        if (typeof navigator.vibrate === 'function') {
          navigator.vibrate([120, 40, 120]);
        }
      }
      this.hasVibratedForMatch = true;
      return;
    }

    if (!isMatched) {
      this.hasVibratedForMatch = false;
    }
  }

  private restoreState(): void {
    const saved = this.localStorageService.getItem<{ selectedCompassTheme?: CompassThemeId }>(this.storageKey);
    const savedThemeId = saved?.selectedCompassTheme;

    if (savedThemeId && this.compassThemes.some((theme) => theme.id === savedThemeId)) {
      this.selectedCompassTheme = savedThemeId;
    }
  }

  private persistState(): void {
    this.localStorageService.setItem(this.storageKey, {
      selectedCompassTheme: this.selectedCompassTheme
    });
  }
}
