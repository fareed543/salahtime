import { registerPlugin } from '@capacitor/core';

export interface ReminderPermissionsPlugin {
  getBatteryOptimizationStatus(): Promise<{ ignoring: boolean; manufacturer?: string }>;
  requestIgnoreBatteryOptimizations(): Promise<{ ignoring: boolean }>;
}

export const ReminderPermissions = registerPlugin<ReminderPermissionsPlugin>('ReminderPermissions');
