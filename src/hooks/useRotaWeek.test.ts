// repeatDatesInSameMonth is a plain, pure function (no Supabase calls), so
// it's testable directly. It drives the "permanent staff" auto-repeat
// feature — assigning a permanent staff member's first week is supposed to
// repeat that weekly pattern for the rest of the calendar month.
//
// useRotaWeek.ts still imports the real Supabase client module at the top
// of the file (unused by this function, but present), which would otherwise
// pull in @react-native-async-storage/async-storage's native module and
// fail outside a real app runtime — mock it out since this test never
// touches it.
jest.mock('@/lib/supabase/client', () => ({ supabase: {} }));

import { repeatDatesInSameMonth } from './useRotaWeek';

describe('repeatDatesInSameMonth', () => {
  test('repeats weekly within the same month, stopping before it would cross into next month', () => {
    // 3 Aug 2026 is a Monday; the next three Mondays (10, 17, 24) are still
    // August, but 31 Aug is also still August (5-Monday month) — 7 Sep is not.
    expect(repeatDatesInSameMonth('2026-08-03')).toEqual([
      '2026-08-10',
      '2026-08-17',
      '2026-08-24',
      '2026-08-31',
    ]);
  });

  test('a start date late in the month produces no repeats', () => {
    expect(repeatDatesInSameMonth('2026-08-28')).toEqual([]);
  });

  test('correctly stops at a month/year boundary', () => {
    expect(repeatDatesInSameMonth('2026-12-29')).toEqual([]);
  });
});
