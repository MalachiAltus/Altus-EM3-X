/**
 * Pure date helpers for the engine. All dates are treated as UTC calendar
 * dates (no time-of-day, no local timezone) so leave-year math is stable
 * regardless of where the app runs.
 */

export interface LeaveYearConfig {
  /** 1-12 */
  startMonth: number;
  /** 1-31 */
  startDay: number;
}

export const DEFAULT_LEAVE_YEAR: LeaveYearConfig = { startMonth: 4, startDay: 1 };

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Whole calendar days between two dates (end - start), exclusive of end. */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

export function maxDate(a: Date, b: Date): Date {
  return a.getTime() > b.getTime() ? a : b;
}

export function minDate(a: Date, b: Date): Date {
  return a.getTime() < b.getTime() ? a : b;
}

/**
 * The leave-year window [start, end) that contains `date`, per the org's
 * configured leave-year start (default 1 April).
 */
export function leaveYearBounds(
  date: Date,
  config: LeaveYearConfig = DEFAULT_LEAVE_YEAR
): { start: Date; end: Date } {
  const year = date.getUTCFullYear();
  const candidateStart = new Date(Date.UTC(year, config.startMonth - 1, config.startDay));
  const start = candidateStart.getTime() <= date.getTime()
    ? candidateStart
    : new Date(Date.UTC(year - 1, config.startMonth - 1, config.startDay));
  const end = new Date(Date.UTC(start.getUTCFullYear() + 1, config.startMonth - 1, config.startDay));
  return { start, end };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
