import { Component, OnDestroy, OnInit } from '@angular/core';
import { Haptics } from '@capacitor/haptics';
import { LocationService } from 'src/app/services/location.service';

type CompassThemeId = 'emerald' | 'classic' | 'midnight';

@Component({
  selector: 'app-qibla-direction',
  templateUrl: './qibla-direction.component.html',
  styleUrls: ['./qibla-direction.component.scss']
})
export class QiblaDirectionComponent implements OnInit, OnDestroy {
  readonly compassThemes = [
    {
      id: 'emerald',
      name: 'Emerald',
      ring: 'linear-gradient(135deg, #0b5f52, #17b08d)',
      face: 'radial-gradient(circle at center, #ffffff 0 58%, #e4faf2 58% 100%)',
      needle: '#19d89a'
    },
    {
      id: 'classic',
      name: 'Classic',
      ring: 'linear-gradient(135deg, #b87b29, #f2d1a0)',
      face: 'radial-gradient(circle at center, #fffaf2 0 58%, #f4ead9 58% 100%)',
      needle: '#d52c2c'
    },
    {
      id: 'midnight',
      name: 'Midnight',
      ring: 'linear-gradient(135deg, #111827, #2f3f5d)',
      face: 'radial-gradient(circle at center, #24344f 0 58%, #111827 58% 100%)',
      needle: '#f3c94d'
    }
  ] as const;

  selectedCompassTheme: CompassThemeId = 'emerald';
  kaabaBearing = 0;
  heading = 0;
  pointerRotation = 0;
  locationLabel = 'Detecting location...';
  calibrationNeeded = true;
  calibrationMessage = 'Move your phone in a figure-8 pattern to improve compass accuracy.';
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

  constructor(private locationService: LocationService) {}

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
    this.locationLabel = 'Detecting location...';
    this.calibrationNeeded = true;
    this.calibrationMessage = 'Allow location and compass access, then move your phone in a figure-8 pattern to improve compass accuracy.';
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
      this.locationLabel = `Lat: ${loc.lat.toFixed(4)}, Lng: ${loc.lng.toFixed(4)}`;
      this.kaabaBearing = this.calculateBearing(loc.lat, loc.lng, 21.4225, 39.8262);
      this.updatePointer();
    } catch {
      this.locationReady = false;
      this.calibrationNeeded = true;
      this.locationLabel = 'Location permission needed';
      this.calibrationMessage = 'Enable location permission first, then move your phone in a figure-8 until the compass becomes stable.';
      this.errorMessage = 'Unable to read your location. Please allow location permission and try again.';
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
          this.permissionHint = 'Compass permission is required on this device to show live Qibla direction.';
          this.headingSupported = false;
          this.calibrationNeeded = true;
          this.calibrationMessage = 'Enable motion permission, then move your phone in a figure-8 pattern to calibrate the compass.';
          return;
        }
      } catch {
        this.permissionHint = 'Compass permission could not be requested automatically.';
        this.headingSupported = false;
        this.calibrationNeeded = true;
        this.calibrationMessage = 'Enable motion permission from browser or device settings, then try the figure-8 calibration movement.';
        return;
      }
    }

    this.orientationHandler = (event: DeviceOrientationEvent) => {
      const nextHeading = this.extractHeading(event);
      if (nextHeading === null) {
        this.calibrationNeeded = true;
        this.headingSupported = false;
        this.calibrationMessage = this.locationReady
          ? 'We could not read a stable compass heading yet. Try the figure-8 calibration movement.'
          : 'Enable location access and move the phone in a figure-8 until the compass becomes stable.';
        return;
      }

      this.heading = nextHeading;
      this.pointerRotation = this.normalizeAngle(this.kaabaBearing - this.heading);
      this.directionLabel = this.getDirectionLabel(this.heading);
      this.qiblaDisplay = `${Math.round(this.kaabaBearing)}° ${this.getDirectionLabel(this.kaabaBearing)}`;
      this.headingSupported = true;
      this.calibrationNeeded = !this.locationReady;
      this.calibrationMessage = this.locationReady
        ? 'Compass is active. Align the top pointer with the Qibla marker.'
        : 'Compass is active, but location permission is still needed to finish Qibla alignment.';
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
