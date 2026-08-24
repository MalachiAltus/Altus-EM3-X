/**
 * Qualification expiry status — the basis for My Record badges and (later,
 * Phase 5) the admin dashboard's expiry alerts. Pure function: given an
 * expiry date and "as of" date, classify into a status band.
 */
import { daysBetween, parseISODate } from './dates';

export type QualificationStatus = 'valid' | 'expiring' | 'expired' | 'missing';

export interface ExpiryThresholds {
  /** Days before expiry at which a qualification is flagged "expiring". */
  warnDays: number;
}

export const DEFAULT_EXPIRY_THRESHOLDS: ExpiryThresholds = { warnDays: 30 };

export function qualificationStatus(
  expiresOn: string | null | undefined,
  asOfISO: string,
  thresholds: ExpiryThresholds = DEFAULT_EXPIRY_THRESHOLDS
): QualificationStatus {
  if (!expiresOn) return 'missing';
  const asOf = parseISODate(asOfISO);
  const expiry = parseISODate(expiresOn);
  const daysRemaining = daysBetween(asOf, expiry);

  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= thresholds.warnDays) return 'expiring';
  return 'valid';
}
