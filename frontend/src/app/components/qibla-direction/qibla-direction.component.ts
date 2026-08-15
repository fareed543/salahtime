import { Component, OnDestroy, OnInit } from '@angular/core';
import { Haptics } from '@capacitor/haptics';
import { LocationService } from 'src/app/services/location.service';
import { AppTranslateService } from 'src/app/services/translate.service';

type CompassThemeId = 'premium' | 'sapphire' | 'bronze' | 'mosaic' | 'ruby';

@Component({
  selector: 'app-qibla-direction',
  templateUrl: './qibla-direction.component.html',
  styleUrls: ['./qibla-direction.component.scss']
})
export class QiblaDirectionComponent implements OnInit, OnDestroy {
  readonly compassThemes = [
    {
      id: 'premium',
      name: 'Premium',
      dialImage: 'assets/images/qibla-dial-premium-v1.webp'
    },
    {
      id: 'sapphire',
      name: 'Sapphire Floral',
      dialImage: 'assets/images/qibla-dial-sapphire-floral-v1.webp'
    },
    {
      id: 'bronze',
      name: 'Desert Bronze',
      dialImage: 'assets/images/qibla-dial-desert-bronze-v1.webp'
    },
    {
      id: 'mosaic',
      name: 'Turquoise Mosaic',
      dialImage: 'assets/images/qibla-dial-turquoise-mosaic-v1.webp'
    },
    {
      id: 'ruby',
      name: 'Ruby Star',
      dialImage: 'assets/images/qibla-dial-ruby-star-v1.webp'
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
  qiblaDisplay = '0° N';
  private hasVibratedForMatch = false;

  private orientationHandler?: (event: DeviceOrientationEvent) => void;

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
    public i18n: AppTranslateService
  ) {
    this.locationLabel = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.DETECTING_LOCATION', {});
    this.calibrationMessage = this.i18n.translateWithParams('QIBLA_PAGE.STATUS.CALIBRATION_DEFAULT', {});
  }

  async ngOnInit(): Promise<void> {
    await this.loadLocation();
    await this.initOrientation();
  }

  ngOnDestroy(): void {
    if (this.orientationEventListener) {
      window.removeEventListener('deviceorientation', this.orientationEventListener, true);
      window.removeEventListener('deviceorientationabsolute', this.orientationEventListener, true);
    }
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
      const nextHeading = this.extractHeading(event);
      if (nextHeading === null) {
        this.calibrationNeeded = true;
        this.headingSupported = false;
        this.calibrationMessage = this.locationReady
          ? this.i18n.translateWithParams('QIBLA_PAGE.STATUS.UNSTABLE_HEADING', {})
          : this.i18n.translateWithParams('QIBLA_PAGE.STATUS.UNSTABLE_HEADING_WITH_LOCATION', {});
        return;
      }

      this.heading = nextHeading;
      this.pointerRotation = this.normalizeAngle(this.kaabaBearing - this.heading);
      this.directionLabel = this.getDirectionLabel(this.heading);
      this.qiblaDisplay = `${Math.round(this.kaabaBearing)}° ${this.getDirectionLabel(this.kaabaBearing)}`;
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
  }

  private extractHeading(event: DeviceOrientationEvent): number | null {
    const iosHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
    if (typeof iosHeading === 'number' && !Number.isNaN(iosHeading)) {
      return this.normalizeAngle(iosHeading);
    }

    if (typeof event.alpha === 'number' && !Number.isNaN(event.alpha)) {
      return this.normalizeAngle(360 - event.alpha);
    }

    return null;
  }

  private updatePointer(): void {
    this.pointerRotation = this.normalizeAngle(this.kaabaBearing - this.heading);
    this.directionLabel = this.getDirectionLabel(this.heading);
    this.qiblaDisplay = `${Math.round(this.kaabaBearing)}° ${this.getDirectionLabel(this.kaabaBearing)}`;
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
}
