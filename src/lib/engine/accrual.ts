/**
 * Holiday accrual engine — the product, per the spec. Pure functions over
 * plain data: zero I/O, zero Supabase imports. Callers (Edge Functions /
 * app code) are responsible for reading contracts/ledger state and posting
 * the result back to `holiday_ledger`.
 */
import {
  DEFAULT_LEAVE_YEAR,
  LeaveYearConfig,
  daysBetween,
  leaveYearBounds,
  maxDate,
  minDate,
  parseISODate,
  round2,
} from './dates';

export const IRREGULAR_ACCRUAL_RATE = 0.1207;
export const STATUTORY_WEEKS = 5.6;
export const STATUTORY_CAP_DAYS = 28;

// UK guidance caps irregular-hours accrual at 28 days/year, but defines a
// "day" in terms of hours only for workers with a normal working pattern.
// Irregular workers have none, so this is a documented assumption (not
// statute): a standard working day = 8 hours, i.e. a 224-hour/year ceiling.
// Override `standardDayHours` if EM3's typical shift length differs.
export const DEFAULT_STANDARD_DAY_HOURS = 8;

/**
 * Friendlier readout of an hours total as "Xd Yh Zm" (or "Yh Zm" under a
 * day), using the same 8-hour standard-day assumption as the accrual cap
 * above. Display only — has no bearing on pay or accrual calculations.
 */
export function formatHoursAsDaysHours(totalHours: number, dayHours: number = DEFAULT_STANDARD_DAY_HOURS): string {
  const negative = totalHours < 0;
  const abs = Math.abs(totalHours);
  const days = Math.floor(abs / dayHours);
  const remainderHours = abs - days * dayHours;
  let hours = Math.floor(remainderHours);
  let minutes = Math.round((remainderHours - hours) * 60);
  if (minutes === 60) {
    minutes = 0;
    hours += 1;
  }
  const sign = negative ? '-' : '';
  return days > 0 ? `${sign}${days}d ${hours}h ${minutes}m` : `${sign}${hours}h ${minutes}m`;
}

export interface IrregularAccrualInput {
  contractType: 'irregular';
  /** Hours actually worked in this pay period (from timesheets). */
  hoursWorkedInPeriod: number;
  /** Hours already posted to holiday_ledger for this leave year, before this period. */
  yearToDateAccruedHours: number;
  standardDayHours?: number;
}

export interface FixedPartTimeAccrualInput {
  contractType: 'fixed_part_time';
  contractedWeeklyHours: number;
  /** ISO date, inclusive — start of the full pay period (e.g. 1st of the month). */
  periodStart: string;
  /** ISO date, exclusive — end of the full pay period. */
  periodEnd: string;
  /**
   * The sub-range within [periodStart, periodEnd) that *this* contract
   * record applies to. Defaults to the full period. Pass a narrower range
   * when a contract change happens mid-period — call this function once per
   * contract segment and sum the results; periodStart/periodEnd must stay
   * the full period on every call so the monthly fraction is computed
   * against the right denominator.
   */
  applicableStart?: string;
  applicableEnd?: string;
  /** ISO date — when this person started employment. */
  employmentStartDate: string;
  /** ISO date — when this person's employment ends, if a leaver. */
  employmentEndDate?: string;
  leaveYear?: LeaveYearConfig;
}

export type AccrualInput = IrregularAccrualInput | FixedPartTimeAccrualInput;

export interface AccrualResult {
  accruedHours: number;
  cappedAt28Days: boolean;
  method: 'irregular_12_07_percent' | 'fixed_part_time_pro_rata';
}

export function computeAccrual(input: AccrualInput): AccrualResult {
  return input.contractType === 'irregular'
    ? computeIrregularAccrual(input)
    : computeFixedPartTimeAccrual(input);
}

/**
 * 12.07% of hours worked, applied per pay period — the post-2024 statutory
 * default for irregular-hours workers. New starters use this from their
 * very first (partial) period; there is no averaging window to wait for.
 */
function computeIrregularAccrual(input: IrregularAccrualInput): AccrualResult {
  const dayHours = input.standardDayHours ?? DEFAULT_STANDARD_DAY_HOURS;
  const capHours = STATUTORY_CAP_DAYS * dayHours;
  const rawAccrual = input.hoursWorkedInPeriod * IRREGULAR_ACCRUAL_RATE;
  const remainingBeforeCap = Math.max(0, capHours - input.yearToDateAccruedHours);
  const accruedHours = Math.max(0, Math.min(rawAccrual, remainingBeforeCap));

  return {
    accruedHours: round2(accruedHours),
    cappedAt28Days: accruedHours < rawAccrual,
    method: 'irregular_12_07_percent',
  };
}

/**
 * contractedWeeklyHours × 5.6 weeks = full annual entitlement. Pro-rated to
 * the portion of the *leave year* employed (year one only — a full year
 * employed needs no proration since 5.6 weeks is already the statutory
 * ceiling). Accrued monthly; a partial first/last period is pro-rated again
 * by the fraction of that period actually employed.
 */
function computeFixedPartTimeAccrual(input: FixedPartTimeAccrualInput): AccrualResult {
  const leaveYear = input.leaveYear ?? DEFAULT_LEAVE_YEAR;
  const periodStart = parseISODate(input.periodStart);
  const periodEnd = parseISODate(input.periodEnd);
  const employmentStart = parseISODate(input.employmentStartDate);

  const fullAnnualEntitlement = input.contractedWeeklyHours * STATUTORY_WEEKS;
  const { start: yearStart, end: yearEnd } = leaveYearBounds(periodStart, leaveYear);

  const employmentEndForYear = input.employmentEndDate ? parseISODate(input.employmentEndDate) : null;
  const isPartialLeaveYear =
    employmentStart.getTime() > yearStart.getTime() ||
    (employmentEndForYear !== null && employmentEndForYear.getTime() < yearEnd.getTime());
  let entitlementForYear = fullAnnualEntitlement;
  if (isPartialLeaveYear) {
    const daysInYear = daysBetween(yearStart, yearEnd);
    const employedFrom = maxDate(employmentStart, yearStart);
    const employedTo = employmentEndForYear !== null ? minDate(employmentEndForYear, yearEnd) : yearEnd;
    const daysEmployedInYear = Math.max(0, daysBetween(employedFrom, employedTo));
    entitlementForYear = fullAnnualEntitlement * (daysEmployedInYear / daysInYear);
  }

  const fullMonthlyAccrual = entitlementForYear / 12;

  // The fraction of the full pay period this contract segment covers,
  // intersected with actual employment dates. periodStart/periodEnd (the
  // full period) are always the fraction's denominator, so splitting one
  // period across multiple contract segments and summing gives the right total.
  const employmentEnd = input.employmentEndDate ? parseISODate(input.employmentEndDate) : periodEnd;
  const applicableStart = input.applicableStart ? parseISODate(input.applicableStart) : periodStart;
  const applicableEnd = input.applicableEnd ? parseISODate(input.applicableEnd) : periodEnd;

  const daysInPeriod = daysBetween(periodStart, periodEnd);
  const effectiveStart = maxDate(applicableStart, employmentStart);
  const effectiveEnd = minDate(applicableEnd, employmentEnd);
  const daysApplicable = Math.max(0, daysBetween(effectiveStart, effectiveEnd));
  const periodFraction = daysInPeriod > 0 ? Math.min(1, daysApplicable / daysInPeriod) : 0;

  return {
    accruedHours: round2(fullMonthlyAccrual * periodFraction),
    cappedAt28Days: false,
    method: 'fixed_part_time_pro_rata',
  };
}

/** Balance = accrued − taken − pending holds, held to 2dp. */
export function computeBalance(
  accruedTotal: number,
  takenTotal: number,
  pendingHoldTotal: number
): number {
  return round2(accruedTotal - takenTotal - pendingHoldTotal);
}
