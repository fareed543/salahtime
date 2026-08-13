import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class DeviceInfoService {
  isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
  }

  isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }
}
