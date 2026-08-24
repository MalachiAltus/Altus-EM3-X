import { computeAccrual, computeBalance } from './accrual';

describe('irregular-hours accrual (12.07%)', () => {
  test('mid-year starter accrues from their first period, no broken average', () => {
    // Started 1 Oct, worked 100h in their first (partial) period.
    const result = computeAccrual({
      contractType: 'irregular',
      hoursWorkedInPeriod: 100,
      yearToDateAccruedHours: 0,
    });
    expect(result.accruedHours).toBeCloseTo(12.07, 2);
    expect(result.cappedAt28Days).toBe(false);
  });

  test('zero-hours worker with a nil month accrues nothing, not an error', () => {
    const result = computeAccrual({
      contractType: 'irregular',
      hoursWorkedInPeriod: 0,
      yearToDateAccruedHours: 40,
    });
    expect(result.accruedHours).toBe(0);
    expect(result.cappedAt28Days).toBe(false);
  });

  test('someone hitting the 28-day cap is capped, not overpaid', () => {
    // Cap = 28 days * 8h = 224h. Already at 223h this leave year.
    const result = computeAccrual({
      contractType: 'irregular',
      hoursWorkedInPeriod: 200, // raw accrual would be 24.14h
      yearToDateAccruedHours: 223,
    });
    expect(result.accruedHours).toBe(1); // only 1h of headroom left before the 224h cap
    expect(result.cappedAt28Days).toBe(true);
  });

  test('a worker already at the cap accrues nothing further', () => {
    const result = computeAccrual({
      contractType: 'irregular',
      hoursWorkedInPeriod: 50,
      yearToDateAccruedHours: 224,
    });
    expect(result.accruedHours).toBe(0);
    expect(result.cappedAt28Days).toBe(true);
  });
});

describe('fixed part-time accrual (contracted hours × 5.6 weeks)', () => {
  test('mid-year starter gets a pro-rated annual entitlement, then monthly accrual', () => {
    // Leave year 1 Apr 2026 - 31 Mar 2027 (365 days, no leap day in range).
    // Starts 1 Oct 2026 -> 182 days remain in the leave year (365 - 183,
    // where 183 = days from 1 Apr to 1 Oct). Contracted 20h/week.
    const result = computeAccrual({
      contractType: 'fixed_part_time',
      contractedWeeklyHours: 20,
      periodStart: '2026-10-01',
      periodEnd: '2026-11-01',
      employmentStartDate: '2026-10-01',
    });
    // Full annual entitlement = 20 * 5.6 = 112h.
    // Pro-rated entitlement = 112 * (182/365) = 55.8466...
    // Monthly = that / 12 = 4.6539... The first period exactly matches
    // employment start, so no further pro-ration within the period.
    expect(result.accruedHours).toBeCloseTo(4.65, 2);
    expect(result.cappedAt28Days).toBe(false);
  });

  test('a full leave year employed accrues 1/12 of the full 5.6-week entitlement per month', () => {
    const result = computeAccrual({
      contractType: 'fixed_part_time',
      contractedWeeklyHours: 20,
      periodStart: '2027-06-01',
      periodEnd: '2027-07-01',
      employmentStartDate: '2020-01-01', // long-standing staff member
    });
    // 112 / 12 = 9.3333...
    expect(result.accruedHours).toBeCloseTo(9.33, 2);
  });

  test('starting partway through a pay period pro-rates that period too', () => {
    // Employed from 15 June, in a June 1-30 (period end exclusive of Jul 1) period.
    const result = computeAccrual({
      contractType: 'fixed_part_time',
      contractedWeeklyHours: 20,
      periodStart: '2027-06-01',
      periodEnd: '2027-07-01',
      employmentStartDate: '2027-06-15',
    });
    // Same monthly figure as the full-year case (long-standing contract
    // length assumption doesn't apply here — this leave year is their
    // first), but only 16 of 30 days of the period were actually worked.
    // Leave year 2027-04-01 -> 2028-04-01 = 366 days (2028 is a leap year).
    // Days employed in leave year: 15 Jun 2027 -> 1 Apr 2028 = 291 days.
    const daysInYear = 366;
    const daysEmployedInYear = 291;
    const fullAnnual = 20 * 5.6;
    const entitlementForYear = fullAnnual * (daysEmployedInYear / daysInYear);
    const fullMonthly = entitlementForYear / 12;
    const periodFraction = 16 / 30;
    expect(result.accruedHours).toBeCloseTo(
      Math.round(fullMonthly * periodFraction * 100) / 100,
      2
    );
  });

  test('a contracted-hours change mid-period is handled by summing two sub-period accruals', () => {
    // 10h/week for the first 14 days of June, changed to 20h/week for the
    // remaining 16 days. periodStart/periodEnd stay the FULL month on both
    // calls (that's the fraction's denominator) — only applicableStart/End
    // narrow to each contract's own segment. Long-standing staff member, so
    // no first-leave-year proration is in play.
    const firstSegment = computeAccrual({
      contractType: 'fixed_part_time',
      contractedWeeklyHours: 10,
      periodStart: '2027-06-01',
      periodEnd: '2027-07-01',
      applicableStart: '2027-06-01',
      applicableEnd: '2027-06-15',
      employmentStartDate: '2020-01-01',
    });
    const secondSegment = computeAccrual({
      contractType: 'fixed_part_time',
      contractedWeeklyHours: 20,
      periodStart: '2027-06-01',
      periodEnd: '2027-07-01',
      applicableStart: '2027-06-15',
      applicableEnd: '2027-07-01',
      employmentStartDate: '2020-01-01',
    });

    // 14/30 of a 10h/week month (56h/12=4.6667) + 16/30 of a 20h/week month
    // (112h/12=9.3333) = 2.1778 + 4.9778 = 7.1556 -> 7.16
    expect(firstSegment.accruedHours).toBeCloseTo(2.18, 2);
    expect(secondSegment.accruedHours).toBeCloseTo(4.98, 2);
    const combined = Math.round((firstSegment.accruedHours + secondSegment.accruedHours) * 100) / 100;
    expect(combined).toBeCloseTo(7.16, 2);

    // And this correctly differs from what either contract alone would
    // accrue over a full, unsplit month.
    const fullMonthAtNewRate = computeAccrual({
      contractType: 'fixed_part_time',
      contractedWeeklyHours: 20,
      periodStart: '2027-06-01',
      periodEnd: '2027-07-01',
      employmentStartDate: '2020-01-01',
    });
    expect(combined).toBeLessThan(fullMonthAtNewRate.accruedHours);
  });
});

describe('holiday balance', () => {
  test('balance = accrued - taken - pending holds, to 2dp', () => {
    expect(computeBalance(100.456, 20, 5)).toBe(75.46);
    expect(computeBalance(10, 10, 0)).toBe(0);
    expect(computeBalance(0, 0, 0)).toBe(0);
  });
});
