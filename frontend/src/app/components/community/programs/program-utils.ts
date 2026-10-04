// Helpers shared by the Programs screen and the Home "active programs" card.

export type ProgramType = 'general' | 'sehri' | 'iftar';

export const PROGRAM_TYPE_ICONS: Record<ProgramType, string> = {
  general: 'bi-calendar-event',
  sehri: 'bi-sunrise',
  iftar: 'bi-sunset'
};

export function getProgramId(program: any): string {
  return String(program?.id_program ?? program?.id ?? '');
}

export function getProgramType(program: any): ProgramType {
  const type = String(program?.program_type ?? 'general').toLowerCase();
  return type === 'sehri' || type === 'iftar' ? type : 'general';
}

/** Parses the API's YYYY-MM-DD dates as local calendar days. */
export function parseProgramDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** "Ended" is not stored by the API; a program has ended once its end date is in the past. */
export function isProgramExpired(program: any): boolean {
  if (program?.is_expired === true) {
    return true;
  }

  const endDate = parseProgramDate(program?.end_date);
  return !!endDate && endDate.getTime() < startOfToday().getTime();
}

export function isProgramActive(program: any): boolean {
  if (program?.is_active !== undefined) {
    return program.is_active === true || Number(program.is_active) === 1;
  }

  return String(program?.status ?? 'active').toLowerCase() === 'active' && !isProgramExpired(program);
}

/** Whole days from today until the given date (0 = today, negative = past). */
export function daysUntil(date: Date): number {
  return Math.round((date.getTime() - startOfToday().getTime()) / 86400000);
}
