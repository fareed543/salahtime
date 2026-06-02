import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wallet.salahtime',
  appName: 'salahtime',
  webDir: 'dist/salahtime',

  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_salah',
      iconColor: '#488AFF'
    }
  }
};

export default config;
