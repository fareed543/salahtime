import { Component, OnInit, OnDestroy } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-qibla',
  templateUrl: './qibla.component.html',
  styleUrls: ['./qibla.component.scss']
})
export class QiblaComponent implements OnInit, OnDestroy {

  qiblaAngle: number = 0;        // Calculated Qibla direction based on GPS
  deviceHeading: number = 0;     // Phone compass orientation
  listener: any;

  private readonly MAKKAH_LAT = 21.422487;
  private readonly MAKKAH_LNG = 39.826206;

  ngOnInit(): void {
    this.getLocation();
    this.listenToDeviceOrientation();
  }

  ngOnDestroy(): void {
    if (this.listener) window.removeEventListener('deviceorientation', this.listener);
  }

  async getLocation() {
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

  listenToDeviceOrientation() {
    this.listener = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) {
        this.deviceHeading = event.alpha; // Orientation of device in degrees
      }
    };

    window.addEventListener('deviceorientation', this.listener, true);
  }

  // -----------------------------------
  //      MATH: QIBLA DIRECTION
  // -----------------------------------
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

    return (bearing + 360) % 360;
  }

  toRad(d: number) {
    return d * (Math.PI / 180);
  }

  toDeg(r: number) {
    return r * (180 / Math.PI);
  }

  // Combined rotation angle
  get arrowRotation(): number {
    return this.qiblaAngle - this.deviceHeading;
  }
}
