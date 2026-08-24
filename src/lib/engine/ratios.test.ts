import { checkRatio, isEligible, RatioRule } from './ratios';

const RULES: RatioRule[] = [
  { ageMin: 4, ageMax: 7, childrenPerStaff: 8, enforcement: 'block' },
  { ageMin: 8, ageMax: 11, childrenPerStaff: 10, enforcement: 'warn' },
];

function staff(id: string, opts: Partial<{ dob: string | null; dbsExpiresOn: string | null }> = {}) {
  return {
    staffId: id,
    dob: opts.dob ?? '1990-01-01',
    qualifications: [{ type: 'dbs', expiresOn: opts.dbsExpiresOn ?? '2099-01-01' }],
  };
}

describe('staff eligibility', () => {
  test('an adult with a valid DBS is eligible', () => {
    expect(isEligible(staff('a'), '2026-08-23')).toBe(true);
  });

  test('someone under 18 is not eligible', () => {
    expect(isEligible(staff('a', { dob: '2010-01-01' }), '2026-08-23')).toBe(false);
  });

  test('turns 18 exactly on their birthday, not before', () => {
    const s = staff('a', { dob: '2008-08-23' });
    expect(isEligible(s, '2026-08-22')).toBe(false);
    expect(isEligible(s, '2026-08-23')).toBe(true);
  });

  test('missing DOB is treated as eligible (assumed adult)', () => {
    expect(isEligible(staff('a', { dob: null }), '2026-08-23')).toBe(true);
  });

  test('an expired DBS makes someone ineligible regardless of age', () => {
    expect(isEligible(staff('a', { dbsExpiresOn: '2020-01-01' }), '2026-08-23')).toBe(false);
  });

  test('no DBS record at all makes someone ineligible', () => {
    expect(isEligible({ staffId: 'a', dob: '1990-01-01', qualifications: [] }, '2026-08-23')).toBe(false);
  });

  test('an expired non-DBS qualification also excludes someone', () => {
    const s = {
      staffId: 'a',
      dob: '1990-01-01',
      qualifications: [
        { type: 'dbs', expiresOn: '2099-01-01' },
        { type: 'paediatric_first_aid', expiresOn: '2020-01-01' },
      ],
    };
    expect(isEligible(s, '2026-08-23')).toBe(false);
  });
});

describe('ratio checking', () => {
  test('4-7s under the 1:8 ratio blocks approval when understaffed', () => {
    const result = checkRatio({
      shiftDate: '2026-08-23',
      expectedChildrenUnder8: 26,
      expectedChildren8Plus: 0,
      assignedStaff: [staff('a'), staff('b'), staff('c')], // 3 staff, need ceil(26/8)=4
      rules: RULES,
    });
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].enforcement).toBe('block');
    expect(result.violations[0].required).toBe(4);
  });

  test('8-11s under the 1:10 ratio only warns, never blocks', () => {
    const result = checkRatio({
      shiftDate: '2026-08-23',
      expectedChildrenUnder8: 0,
      expectedChildren8Plus: 24,
      assignedStaff: [staff('a'), staff('b')], // need ceil(24/10)=3, only 2 present
      rules: RULES,
    });
    expect(result.ok).toBe(true); // warn-only, doesn't flip ok to false
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].enforcement).toBe('warn');
  });

  test('a staff member with an expired DBS does not count toward ratio', () => {
    const result = checkRatio({
      shiftDate: '2026-08-23',
      expectedChildrenUnder8: 8,
      expectedChildren8Plus: 0,
      assignedStaff: [staff('a'), staff('b', { dbsExpiresOn: '2020-01-01' })],
      rules: RULES,
    });
    // Only 1 of the 2 assigned staff is eligible; 8 children need 1 staff
    // (ceil(8/8)=1) so this actually passes — but eligibleStaffCount must
    // reflect only the valid one.
    expect(result.eligibleStaffCount).toBe(1);
    expect(result.ok).toBe(true);
  });

  test('ratio breach at the 7/8 child-count boundary for the 1:8 rule', () => {
    const exactly8 = checkRatio({
      shiftDate: '2026-08-23',
      expectedChildrenUnder8: 8,
      expectedChildren8Plus: 0,
      assignedStaff: [staff('a')],
      rules: RULES,
    });
    expect(exactly8.ok).toBe(true); // 1 staff for 8 children is exactly 1:8

    const nineChildren = checkRatio({
      shiftDate: '2026-08-23',
      expectedChildrenUnder8: 9,
      expectedChildren8Plus: 0,
      assignedStaff: [staff('a')],
      rules: RULES,
    });
    expect(nineChildren.ok).toBe(false); // crossing to 9 needs a 2nd staff member
    expect(nineChildren.violations[0].required).toBe(2);
  });

  test('no violation when no children are expected in a band', () => {
    const result = checkRatio({
      shiftDate: '2026-08-23',
      expectedChildrenUnder8: 0,
      expectedChildren8Plus: 0,
      assignedStaff: [],
      rules: RULES,
    });
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
