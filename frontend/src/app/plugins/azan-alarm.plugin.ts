import { registerPlugin } from '@capacitor/core';

/** CR-017: one salah azan that rings as an Android alarm (full-screen when locked, heads-up with Stop). */
export interface AzanAlarm {
  id: number;
  /** Epoch milliseconds. */
  at: number;
  /** Prayer name shown large on the alarm screen and as the notification title. */
  title: string;
  /** Body of the silent notification left after the alarm times out. */
  body: string;
  city: string;
  /** Prayer start time as shown to the user, e.g. "15:42". */
  timeLabel: string;
  /** Raw resource name of the azan without extension, e.g. "adhan_makkah". */
  sound: string;
  stopLabel: string;
  swipeLabel: string;
}

export interface AzanAlarmPlugin {
  /** Replaces every scheduled azan alarm with this list. */
  schedule(options: { alarms: AzanAlarm[] }): Promise<{ count: number }>;
  /** Azan alarms still waiting to ring. */
  list(): Promise<{ alarms: Array<{ id: number; at: number; title: string }> }>;
  cancelAll(): Promise<void>;
  /** Rings one alarm now (Settings → Test). */
  test(options: { alarm: Omit<AzanAlarm, 'id' | 'at'> }): Promise<void>;
  stop(): Promise<void>;
  /** Android 14+: false when the full-screen alarm is not allowed for the app. */
  getFullScreenStatus(): Promise<{ allowed: boolean }>;
  openFullScreenSettings(): Promise<void>;
}

export const AzanAlarmNative = registerPlugin<AzanAlarmPlugin>('AzanAlarm');
