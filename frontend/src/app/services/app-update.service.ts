import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AppUpdateInfo } from '../models/app-update.model';
import { LocalStorageService } from './local-storage.service';
import { UpdateInstaller } from '../plugins/update-installer.plugin';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppUpdateService {
  private readonly ignoredVersionKey = 'ignoredAppUpdateVersion';

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {}

  checkForUpdate(): Observable<AppUpdateInfo | null> {
    return this.http.get<AppUpdateInfo>(environment.updateConfigUrl).pipe(
      map((config) => {
        if (!config?.version) {
          return null;
        }

        return this.isRemoteVersionNewer(environment.appVersion, config.version)
          ? config
          : null;
      }),
      catchError(() => of(null))
    );
  }

  shouldShowUpdate(update: AppUpdateInfo): boolean {
    if (update.mandatory) {
      return true;
    }

    return this.localStorageService.getRawItem(this.ignoredVersionKey) !== update.version;
  }

  ignoreUpdate(version: string): void {
    this.localStorageService.setItem(this.ignoredVersionKey, version);
  }

  async startUpdate(update: AppUpdateInfo): Promise<void> {
    const targetUrl = update.apkUrl || update.updateUrl || update.playStoreUrl;

    if (!targetUrl) {
      throw new Error('No update URL configured.');
    }

    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    if (isNativeAndroid && update.apkUrl) {
      await UpdateInstaller.downloadAndInstall({
        url: update.apkUrl,
        fileName: this.buildApkName(update.version)
      });
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    await UpdateInstaller.openUrl({
      url: targetUrl
    });
  }

  private buildApkName(version: string): string {
    const safeVersion = version.replace(/[^0-9A-Za-z._-]/g, '_');
    return `salahtime-${safeVersion}.apk`;
  }

  private isRemoteVersionNewer(current: string, remote: string): boolean {
    const currentParts = this.normalizeVersion(current);
    const remoteParts = this.normalizeVersion(remote);
    const maxLength = Math.max(currentParts.length, remoteParts.length);

    for (let index = 0; index < maxLength; index += 1) {
      const currentValue = currentParts[index] ?? 0;
      const remoteValue = remoteParts[index] ?? 0;

      if (remoteValue > currentValue) {
        return true;
      }

      if (remoteValue < currentValue) {
        return false;
      }
    }

    return false;
  }

  private normalizeVersion(version: string): number[] {
    return version
      .split('.')
      .map((part) => Number.parseInt(part.replace(/[^0-9]/g, ''), 10))
      .map((part) => (Number.isNaN(part) ? 0 : part));
  }
}
