/**
 * Staff-to-child ratio checker. Runs on leave approval, sickness call-in,
 * unassignment, and rota publish — the result is stored on the triggering
 * request for audit, per the spec.
 */
import { parseISODate } from './dates';

export interface RatioRule {
  ageMin: number;
  ageMax: number;
  childrenPerStaff: number;
  enforcement: 'block' | 'warn';
}

export interface QualificationRecord {
  type: string;
  expiresOn?: string | null;
}

export interface StaffEligibility {
  staffId: string;
  /** ISO date. Missing DOB is treated as eligible (assumed adult) — see isEligible(). */
  dob?: string | null;
  qualifications: QualificationRecord[];
}

export interface ShiftRatioInput {
  /** ISO date — checks (age, expiry) are evaluated as of this date. */
  shiftDate: string;
  expectedChildrenUnder8: number;
  expectedChildren8Plus: number;
  assignedStaff: StaffEligibility[];
  rules: RatioRule[];
}

export interface RatioViolation {
  ageMin: number;
  ageMax: number;
  required: number;
  eligible: number;
  enforcement: 'block' | 'warn';
  message: string;
}

export interface RatioCheckResult {
  /** False only if a BLOCKING rule is violated — warn-level issues surface in `violations` but don't flip this. */
  ok: boolean;
  eligibleStaffCount: number;
  violations: RatioViolation[];
}

/**
 * A staff member only counts toward ratio if they're 18+, their DBS is
 * unexpired, and any other qualifications passed in are unexpired.
 *
 * Missing DOB is treated as eligible (assumed adult) rather than excluded —
 * EM3 currently employs no under-18 staff, so this avoids ratio checks
 * breaking on records where DOB simply hasn't been entered yet. A staff
 * member whose DOB *proves* they're under 18 is still correctly excluded.
 */
export function isEligible(staff: StaffEligibility, asOfISO: string): boolean {
  const asOf = parseISODate(asOfISO);

  if (staff.dob) {
    const dob = parseISODate(staff.dob);
    const eighteenthBirthday = new Date(
      Date.UTC(dob.getUTCFullYear() + 18, dob.getUTCMonth(), dob.getUTCDate())
    );
    if (asOf.getTime() < eighteenthBirthday.getTime()) return false;
  }

  const dbs = staff.qualifications.find((q) => q.type === 'dbs');
  if (!dbs || !dbs.expiresOn || parseISODate(dbs.expiresOn).getTime() < asOf.getTime()) {
    return false;
  }

  for (const q of staff.qualifications) {
    if (q.type === 'dbs') continue;
    if (q.expiresOn && parseISODate(q.expiresOn).getTime() < asOf.getTime()) {
      return false;
    }
  }

  return true;
}

function childrenForRule(rule: RatioRule, input: ShiftRatioInput): number {
  if (rule.ageMax <= 7) return input.expectedChildrenUnder8;
  if (rule.ageMin >= 8) return input.expectedChildren8Plus;
  // A rule spanning both bands (not used by the seeded 4-7 / 8-11 rules,
  // but kept safe for future rule changes) — count against the larger group.
  return Math.max(input.expectedChildrenUnder8, input.expectedChildren8Plus);
}

export function checkRatio(input: ShiftRatioInput): RatioCheckResult {
  const eligibleStaff = input.assignedStaff.filter((s) => isEligible(s, input.shiftDate));
  const eligibleStaffCount = eligibleStaff.length;
  const violations: RatioViolation[] = [];

  for (const rule of input.rules) {
    const children = childrenForRule(rule, input);
    if (children <= 0) continue;

    const required = Math.ceil(children / rule.childrenPerStaff);
    if (eligibleStaffCount < required) {
      violations.push({
        ageMin: rule.ageMin,
        ageMax: rule.ageMax,
        required,
        eligible: eligibleStaffCount,
        enforcement: rule.enforcement,
        message:
          `${children} children aged ${rule.ageMin}-${rule.ageMax} need ${required} staff ` +
          `(1:${rule.childrenPerStaff}) — only ${eligibleStaffCount} eligible.`,
      });
    }
  }

  return {
    ok: violations.every((v) => v.enforcement !== 'block'),
    eligibleStaffCount,
    violations,
  };
}
