import { SalahReminderNotification, splitAzanAlarms } from './notification.service';

describe('splitAzanAlarms (CR-017)', () => {
  const at = new Date(2026, 10, 14, 15, 42);
  const azan: SalahReminderNotification = {
    id: 208, title: 'Asr', body: 'Time: 15:42 - 17:55',
    schedule: { at, allowWhileIdle: true }, channelId: 'salah_azan_v5_adhan-makkah', sound: 'adhan_makkah.mp3'
  };
  const plain: SalahReminderNotification = {
    id: 207, title: 'Dhuhr', body: 'Time: 12:10 - 15:41',
    schedule: { at, allowWhileIdle: true }, channelId: 'default'
  };
  const labels = { stop: 'Stop', swipe: 'Swipe to stop' };

  it('turns azan reminders into native alarms and keeps default-sound reminders', () => {
    const result = splitAzanAlarms([azan, plain], labels, 'Bengaluru');
    expect(result.plain).toEqual([plain]);
    expect(result.alarms.length).toBe(1);
    const alarm = result.alarms[0];
    expect(alarm.id).toBe(208);
    expect(alarm.at).toBe(at.getTime());
    expect(alarm.title).toBe('Asr');
    expect(alarm.city).toBe('Bengaluru');
    expect(alarm.sound).toBe('adhan_makkah');
    expect(alarm.stopLabel).toBe('Stop');
    expect(alarm.swipeLabel).toBe('Swipe to stop');
    expect(alarm.timeLabel).toBe(at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  });

  it('returns no alarms when no reminder has an azan sound', () => {
    expect(splitAzanAlarms([plain], labels, '').alarms).toEqual([]);
  });
});
