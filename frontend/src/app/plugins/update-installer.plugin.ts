import { registerPlugin } from '@capacitor/core';

export interface UpdateInstallerPlugin {
  downloadAndInstall(options: {
    url: string;
    fileName?: string;
  }): Promise<{ started: boolean }>;
  openUrl(options: {
    url: string;
  }): Promise<{ opened: boolean }>;
}

export const UpdateInstaller = registerPlugin<UpdateInstallerPlugin>('UpdateInstaller');
