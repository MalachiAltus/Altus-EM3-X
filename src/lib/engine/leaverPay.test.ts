import { computeAccrual } from './accrual';
import { computeAverageWeeklyPay, computeLeaverFinalPayout, WeeklyPayRecord } from './leaverPay';

function weeksOfSteadyPay(count: number, pay: number, hours: number): WeeklyPayRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    weekEndingISO: `2027-01-${String((i % 28) + 1).padStart(2, '0')}`,
    paid: true,
    grossPay: pay,
    hoursWorked: hours,
  }));
}

describe('average weekly pay (52-week reference, up to 104-week lookback)', () => {
  test('uses the most recent 52 paid weeks when there are exactly enough', () => {
    const result = computeAverageWeeklyPay(weeksOfSteadyPay(52, 200, 20));
    expect(result.averageWeeklyPay).toBe(200);
    expect(result.averageWeeklyHours).toBe(20);
    expect(result.weeksUsed).toBe(52);
    expect(result.insufficientData).toBe(false);
  });

  test('skips unpaid weeks and keeps looking back until 52 paid weeks are found', () => {
    // 10 unpaid weeks, then 52 paid weeks, all within a 104-week lookback.
    const unpaid: WeeklyPayRecord[] = Array.from({ length: 10 }, (_, i) => ({
      weekEndingISO: `unpaid-${i}`,
      paid: false,
      grossPay: 0,
      hoursWorked: 0,
    }));
    const paid = weeksOfSteadyPay(52, 150, 15);
    const result = computeAverageWeeklyPay([...unpaid, ...paid]);
    expect(result.weeksUsed).toBe(52);
    expect(result.averageWeeklyPay).toBe(150);
    expect(result.insufficientData).toBe(false);
  });

  test('flags insufficient data when fewer than 52 paid weeks exist even after 104 weeks', () => {
    const result = computeAverageWeeklyPay(weeksOfSteadyPay(30, 100, 10));
    expect(result.weeksUsed).toBe(30);
    expect(result.insufficientData).toBe(true);
    // Still returns a best-effort average rather than throwing.
    expect(result.averageWeeklyPay).toBe(100);
  });

  test('never scans beyond 104 weeks of history', () => {
    const manyUnpaid = Array.from({ length: 200 }, (_, i) => ({
      weekEndingISO: `w-${i}`,
      paid: i >= 110, // only weeks 110+ (beyond the 104 lookback) are paid
      grossPay: 999,
      hoursWorked: 40,
    }));
    const result = computeAverageWeeklyPay(manyUnpaid);
    expect(result.weeksScanned).toBe(104);
    expect(result.weeksUsed).toBe(0);
    expect(result.insufficientData).toBe(true);
  });
});

describe('leaver final payout — untaken balance is priced at the 52-week rate, not the 12.07% formula', () => {
  test('a leaver with an untaken balance gets it paid out at their average hourly rate', () => {
    // Irregular worker, leaving mid-month having worked 40h since the last accrual post.
    const finalPeriodAccrual = computeAccrual({
      contractType: 'irregular',
      hoursWorkedInPeriod: 40,
      yearToDateAccruedHours: 60,
    });
    // 40 * 0.1207 = 4.828 -> 4.83
    expect(finalPeriodAccrual.accruedHours).toBeCloseTo(4.83, 2);

    const result = computeLeaverFinalPayout({
      priorBalanceHours: 18.5,
      finalPeriodAccrual,
      averageWeeklyPay: weeksOfSteadyPay(52, 120, 15), // £8/hour equivalent
    });

    expect(result.untakenHours).toBeCloseTo(23.33, 2); // 18.5 + 4.83
    expect(result.hourlyRate).toBe(8);
    expect(result.payoutAmount).toBeCloseTo(186.64, 2); // 23.33 * 8
    // Accrual math is untouched by the 52-week figure — confirms the two
    // calculations stay independent per the spec's precision point.
    expect(finalPeriodAccrual.method).toBe('irregular_12_07_percent');
  });

  test('insufficient pay history still produces a best-effort payout, not a crash', () => {
    const finalPeriodAccrual = computeAccrual({
      contractType: 'irregular',
      hoursWorkedInPeriod: 0,
      yearToDateAccruedHours: 10,
    });
    const result = computeLeaverFinalPayout({
      priorBalanceHours: 5,
      finalPeriodAccrual,
      averageWeeklyPay: [],
    });
    expect(result.untakenHours).toBe(5);
    expect(result.hourlyRate).toBe(0);
    expect(result.payoutAmount).toBe(0);
    expect(result.payRate.insufficientData).toBe(true);
  });
});
