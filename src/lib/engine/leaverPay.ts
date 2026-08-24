/**
 * Leaver final-pay engine. On a leave date, EM3 must pay out any
 * accrued-but-untaken holiday. Two separate calculations are involved, and
 * the source docs blur them together — this module keeps them explicit:
 *
 *  1. The accrued-but-untaken *hours* — always 12.07%-of-hours-worked
 *     (see accrual.ts). The 52-week reference period is NOT an alternative
 *     way to calculate this amount.
 *  2. The *pay rate* to apply to those hours — the UK statutory average
 *     weekly pay across the last 52 *paid* weeks (skipping unpaid weeks),
 *     looking back up to 104 weeks to find them. This module only computes
 *     that rate; it does not touch accrual math.
 */
import { round2 } from './dates';
import type { AccrualResult } from './accrual';

export interface WeeklyPayRecord {
  /** ISO date — the end of this week, most recent weeks first in the input array. */
  weekEndingISO: string;
  /** Whether the person received any pay this week (unpaid weeks are skipped). */
  paid: boolean;
  grossPay: number;
  hoursWorked: number;
}

export interface AverageWeeklyPayResult {
  averageWeeklyPay: number;
  averageWeeklyHours: number;
  weeksUsed: number;
  weeksScanned: number;
  /** True if fewer than 52 paid weeks were found even after scanning 104. */
  insufficientData: boolean;
}

const REFERENCE_WEEKS = 52;
const MAX_LOOKBACK_WEEKS = 104;

/**
 * Average weekly pay (and hours) across the last 52 paid weeks, skipping
 * unpaid weeks, looking back up to 104 weeks total. `weeks` must be ordered
 * most-recent-first.
 */
export function computeAverageWeeklyPay(weeks: WeeklyPayRecord[]): AverageWeeklyPayResult {
  const scanned = weeks.slice(0, MAX_LOOKBACK_WEEKS);
  const paidWeeks = scanned.filter((w) => w.paid).slice(0, REFERENCE_WEEKS);
  const weeksUsed = paidWeeks.length;

  const totalPay = paidWeeks.reduce((sum, w) => sum + w.grossPay, 0);
  const totalHours = paidWeeks.reduce((sum, w) => sum + w.hoursWorked, 0);

  return {
    averageWeeklyPay: weeksUsed > 0 ? round2(totalPay / weeksUsed) : 0,
    averageWeeklyHours: weeksUsed > 0 ? round2(totalHours / weeksUsed) : 0,
    weeksUsed,
    weeksScanned: scanned.length,
    insufficientData: weeksUsed < REFERENCE_WEEKS,
  };
}

export interface LeaverFinalPayoutInput {
  /** Ledger balance (accrued − taken − pending) immediately before the final period. */
  priorBalanceHours: number;
  /** Accrual for the final, partial pay period up to the leave date (from computeAccrual). */
  finalPeriodAccrual: AccrualResult;
  averageWeeklyPay: WeeklyPayRecord[];
}

export interface LeaverFinalPayoutResult {
  untakenHours: number;
  hourlyRate: number;
  payoutAmount: number;
  payRate: AverageWeeklyPayResult;
}

/**
 * Combines the final accrued-but-untaken hours with a statutory hourly
 * rate (derived from the 52-paid-week average) to produce a payout amount.
 */
export function computeLeaverFinalPayout(input: LeaverFinalPayoutInput): LeaverFinalPayoutResult {
  const untakenHours = round2(input.priorBalanceHours + input.finalPeriodAccrual.accruedHours);
  const payRate = computeAverageWeeklyPay(input.averageWeeklyPay);
  const hourlyRate = payRate.averageWeeklyHours > 0
    ? round2(payRate.averageWeeklyPay / payRate.averageWeeklyHours)
    : 0;

  return {
    untakenHours,
    hourlyRate,
    payoutAmount: round2(untakenHours * hourlyRate),
    payRate,
  };
}
