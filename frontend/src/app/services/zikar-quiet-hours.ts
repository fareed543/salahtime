/**
 * Zikar reminders pause while people sleep: from Isha until the next Fajr, using the prayer times
 * of the user's own location and prayer settings (calculation method, madhab, offsets).
 */

/** Start of Fajr and of Isha on one calendar day, as timestamps (ms). */
export interface DayPrayerBounds {
  fajr: number;
  isha: number;
}

/** Without a saved location: quiet from 22:00 to 05:00. */
export function defaultPrayerBounds(day: Date): DayPrayerBounds {
  return {
    fajr: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 5, 0).getTime(),
    isha: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 22, 0).getTime()
  };
}

/**
 * Uses 22:00 / 05:00 for a time that can't be calculated, e.g. Fajr and Isha in high-latitude
 * summers, when the sun never sinks far enough below the horizon.
 */
export function withDefaults(bounds: DayPrayerBounds, day: Date): DayPrayerBounds {
  const fallback = defaultPrayerBounds(day);
  return {
    fajr: Number.isFinite(bounds.fajr) ? bounds.fajr : fallback.fajr,
    isha: Number.isFinite(bounds.isha) ? bounds.isha : fallback.isha
  };
}

/**
 * True when `at` falls between a day's Isha and the next day's Fajr.
 * Both the previous night and tonight are checked, because Isha can be after midnight
 * (high latitudes in summer), so "before Fajr on the same date" is not enough.
 */
export function isDuringSleep(at: Date, boundsFor: (day: Date) => DayPrayerBounds): boolean {
  const time = at.getTime();
  const today = new Date(at.getFullYear(), at.getMonth(), at.getDate());

  return [-1, 0].some(offset => {
    const night = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const nextMorning = new Date(night.getFullYear(), night.getMonth(), night.getDate() + 1);
    const isha = boundsFor(night).isha;
    const fajr = boundsFor(nextMorning).fajr;
    return Number.isFinite(isha) && Number.isFinite(fajr) && time >= isha && time < fajr;
  });
}
