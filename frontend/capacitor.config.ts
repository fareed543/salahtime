import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wallet.salahtime',
  appName: 'salahtime',
  webDir: 'dist/salahtime',

  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_salah',
      // Brand green sampled from src/assets/images/logo.png.
      iconColor: '#195147'
    }
  }
};

export default config;
