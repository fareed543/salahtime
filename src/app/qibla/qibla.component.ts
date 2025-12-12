import { Component, OnInit, OnDestroy } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-qibla',
  templateUrl: './qibla.component.html',
  styleUrls: ['./qibla.component.scss']
})
export class QiblaComponent implements OnInit, OnDestroy {

  qiblaAngle: number = 0;              // Calculated Qibla direction based on GPS
  deviceHeading: number | null = null; // Phone compass orientation (nullable)
  listener: ((event: DeviceOrientationEvent) => void) | null = null;

  // Optional: calibration tracking for devices with magnetometer
  calibrationDone: boolean = false;
  totalRotation: number = 0;
  lastAlpha: number | null = null;

  private readonly MAKKAH_LAT = 21.422487;
  private readonly MAKKAH_LNG = 39.826206;

  ngOnInit(): void {
    this.getLocation();
    this.listenToDeviceOrientation();
  }

  ngOnDestroy(): void {
    if (this.listener) {
      window.removeEventListener('deviceorientation', this.listener);
    }
  }

  /** Get user's geolocation */
  async getLocation(): Promise<void> {
    try {
      const pos = await Geolocation.getCurrentPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      this.qiblaAngle = this.getQiblaDirection(lat, lng);
      console.log('Qibla angle:', this.qiblaAngle);

    } catch (error) {
      console.error('Location Error:', error);
    }
  }

  /** Listen to device orientation (compass) */
  listenToDeviceOrientation(): void {
    this.listener = (event: DeviceOrientationEvent) => {
      // If alpha exists, use it, else fallback to 0
      const alpha = event.alpha ?? 0;
      this.deviceHeading = alpha;

      // --- Optional calibration tracking ---
      if (!this.calibrationDone && this.lastAlpha !== null) {
        let delta = alpha - this.lastAlpha;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.totalRotation += Math.abs(delta);

        // Example threshold: 2 full rotations (~720°)
        if (this.totalRotation >= 720) {
          this.calibrationDone = true;
          console.log('Calibration completed');
        }
      }

      this.lastAlpha = alpha;
    };

    window.addEventListener('deviceorientation', this.listener, true);
  }

  /** Calculate Qibla direction in degrees */
  getQiblaDirection(lat: number, lng: number): number {
    const kaabaLat = this.toRad(this.MAKKAH_LAT);
    const kaabaLng = this.toRad(this.MAKKAH_LNG);
    const userLat = this.toRad(lat);
    const userLng = this.toRad(lng);

    const y = Math.sin(kaabaLng - userLng);
    const x = Math.cos(userLat) * Math.tan(kaabaLat) -
              Math.sin(userLat) * Math.cos(kaabaLng - userLng);

    let bearing = Math.atan2(y, x);
    bearing = this.toDeg(bearing);

    return (bearing + 360) % 360; // Normalize 0-360
  }

  toRad(d: number): number {
    return d * (Math.PI / 180);
  }

  toDeg(r: number): number {
    return r * (180 / Math.PI);
  }

  /** Combined rotation for arrow CSS */
  get arrowRotation(): number {
    const heading = this.deviceHeading ?? 0;
    return (this.qiblaAngle - heading + 360) % 360;
  }
}
