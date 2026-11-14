/** Shared by the website home (NF-020) and the website prayer-times page (CR-021). */

/** First item whose time is after `now`, or null when all are past. */
export function nextPrayer<T extends { time: Date }>(items: T[], now: Date): T | null {
  return items.find(item => item.time.getTime() > now.getTime()) ?? null;
}

/** Whole hours and minutes until `target`, rounded up to the next minute; zero when past. */
export function timeUntil(target: Date, now: Date): { hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}
