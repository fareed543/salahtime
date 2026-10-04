export interface MasjidTimingLike {
  salah?: string;
  azan?: string;
  jamat?: string;
  azan_time?: string;
  jamat_time?: string;
}

export interface NextJamat {
  salah: string;
  time: string;
  /** True when every jamat today has passed and this is tomorrow's first one. */
  tomorrow: boolean;
}

/** Parses a stored timing such as "05:30 AM" (or "17:30") onto the date of `base`. */
export function parseMasjidTime(value: string | undefined | null, base: Date = new Date()): Date | null {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }
  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }
  if (hours > 23 || minutes > 59) {
    return null;
  }

  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** The next jamat (falling back to azan) from a masjid's timings, or null when none are set. */
export function findNextJamat(timings: MasjidTimingLike[] | null | undefined, now: Date = new Date()): NextJamat | null {
  const entries = (Array.isArray(timings) ? timings : [])
    .map((timing) => {
      const time = timing?.jamat || timing?.jamat_time || timing?.azan || timing?.azan_time || '';
      return { salah: String(timing?.salah ?? '').trim(), time, at: parseMasjidTime(time, now) };
    })
    .filter((entry) => !!entry.salah && !!entry.at)
    // Jumu'ah only counts on Fridays.
    .filter((entry) => now.getDay() === 5 || !/^jum/i.test(entry.salah))
    .sort((first, second) => first.at!.getTime() - second.at!.getTime());

  if (!entries.length) {
    return null;
  }

  const upcoming = entries.find((entry) => entry.at!.getTime() >= now.getTime());
  const next = upcoming ?? entries[0];
  return { salah: next.salah, time: next.time, tomorrow: !upcoming };
}
