import { Component, OnDestroy, OnInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocationService } from 'src/app/services/location.service';

@Component({
  selector: 'app-qibla-direction',
  template: `
    <div class="row gx-3">
      <div class="col-12">
        <div class="page-hero card adminuiux-card shadow-sm border-0 mb-3">
          <div class="card-body">
            <span class="badge text-bg-theme-1 mb-2">Direction</span>
            <h4 class="mb-1">Qibla Direction</h4>
            <p class="text-secondary mb-0">Use your device compass and live location to align toward the Kaaba.</p>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-7" *ngIf="canShowCompass; else qiblaSetupState">
        <div class="card adminuiux-card shadow-sm border-0 mb-3">
          <div class="card-body">
            <div class="qibla-compass-wrap">
              <div class="qibla-dial">
                <div class="qibla-dial-ring"></div>
                <div class="qibla-dial-cross qibla-dial-cross-horizontal"></div>
                <div class="qibla-dial-cross qibla-dial-cross-vertical"></div>
                <div class="qibla-degree qibla-degree-top">N</div>
                <div class="qibla-degree qibla-degree-right">E</div>
                <div class="qibla-degree qibla-degree-bottom">S</div>
                <div class="qibla-degree qibla-degree-left">W</div>
                <div class="qibla-center-dot"></div>
                <div class="qibla-pointer" [style.transform]="'translate(-50%, -100%) rotate(' + pointerRotation + 'deg)'">
                  <img src="assets/images/pointer.png" alt="Qibla pointer">
                </div>
              </div>
            </div>

            <div class="row gx-3 text-center mt-3">
              <div class="col-4">
                <p class="small text-secondary mb-1">Qibla</p>
                <h6>{{ kaabaBearing | number:'1.0-0' }}&deg;</h6>
              </div>
              <div class="col-4 border-start border-end">
                <p class="small text-secondary mb-1">Heading</p>
                <h6>{{ heading | number:'1.0-0' }}&deg;</h6>
              </div>
              <div class="col-4">
                <p class="small text-secondary mb-1">Location</p>
                <h6 class="text-truncate">{{ locationLabel }}</h6>
              </div>
            </div>

            <div class="alert alert-success mt-3 mb-0">
              Compass is active. Align the pointer with the top north marker to face Qibla.
            </div>
          </div>
        </div>
      </div>

      <ng-template #qiblaSetupState>
        <div class="col-12 col-xl-7">
          <div class="card adminuiux-card shadow-sm border-0 mb-3">
            <div class="card-body text-center">
              <img src="assets/images/figure-8-compass-calibration.gif" alt="Compass calibration" class="qibla-calibration mb-3">
              <h5 class="mb-2">Compass Calibration</h5>
              <p class="text-secondary mb-3">{{ calibrationMessage }}</p>
              <div class="alert alert-warning mb-3" *ngIf="errorMessage">{{ errorMessage }}</div>
              <div class="alert alert-info mb-3" *ngIf="permissionHint">{{ permissionHint }}</div>
              <div class="alert alert-secondary mb-0" *ngIf="!errorMessage && !permissionHint">
                <span *ngIf="!locationReady">Allow location permission first to calculate your Qibla bearing.</span>
                <span *ngIf="locationReady && !headingSupported">Location is ready. Keep the device flat and move it in a figure-8 until the compass heading appears.</span>
              </div>
            </div>
          </div>
        </div>
      </ng-template>

      <div class="col-12 col-xl-5">
        <div class="card adminuiux-card shadow-sm border-0 mb-3">
          <div class="card-body">
            <h6 class="mb-2">Calibration Technique</h6>
            <p class="text-secondary small mb-3">
              Hold the phone upright, then draw a slow figure-8 in the air two or three times. This helps the compass re-align and improves heading accuracy.
            </p>
            <h6 class="mb-2">Tips</h6>
            <ul class="qibla-tips mb-3">
              <li>Remove thick phone covers or nearby metal objects if the compass drifts.</li>
              <li>Grant both location and motion permissions when your browser asks.</li>
              <li>Refresh after changing city or enabling GPS.</li>
            </ul>
            <button class="btn btn-theme w-100" type="button" (click)="refresh()">
              {{ canShowCompass ? 'Refresh Direction' : 'Retry Setup' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./qibla-direction.component.scss']
})
export class QiblaDirectionComponent implements OnInit, OnDestroy {
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

  private orientationHandler?: (event: DeviceOrientationEvent) => void;

  private get orientationEventListener(): EventListener | undefined {
    return this.orientationHandler as unknown as EventListener | undefined;
  }

  get canShowCompass(): boolean {
    return this.locationReady && this.headingSupported && !this.errorMessage && !this.permissionHint;
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
    await this.loadLocation();
    await this.initOrientation();
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
      this.headingSupported = true;
      this.calibrationNeeded = !this.locationReady;
      this.calibrationMessage = this.locationReady
        ? 'Compass is active. Align the pointer with the top marker.'
        : 'Compass is active, but location permission is still needed to finish Qibla alignment.';
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
}
