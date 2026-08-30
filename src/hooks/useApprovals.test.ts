// Tests the ratio-verdict helpers directly (they're plain async functions,
// not React hooks) by mocking the Supabase query chain. These carry the
// same safety-critical logic as engine/ratios.ts's own tests, but exercise
// the data-fetching/error-propagation path around it — in particular, that
// a failed query becomes 'error' (blocking) rather than a silent "clear".

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { computeVerdictForAbsence, computeVerdictForSwap, eligibilityFor, toRatioRules } from './useApprovals';
import type { Tables } from '@/lib/supabase/types';

type QueryResult = { data: unknown; error: { message: string } | null };

function makeChain(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.neq = self;
  chain.in = self;
  chain.order = self;
  chain.then = (resolve: (v: QueryResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

const queues = new Map<string, QueryResult[]>();

function enqueue(table: string, result: QueryResult) {
  const q = queues.get(table) ?? [];
  q.push(result);
  queues.set(table, q);
}

beforeEach(() => {
  queues.clear();
  mockFrom.mockReset();
  mockFrom.mockImplementation((table: string) => {
    const q = queues.get(table);
    const result = q && q.length > 0 ? q.shift()! : { data: null, error: null };
    return makeChain(result);
  });
});

const RULES: Tables<'ratio_rules'>[] = [
  { id: 'r1', age_min: 4, age_max: 7, children_per_staff: 8, enforcement: 'block', created_at: '' },
  { id: 'r2', age_min: 8, age_max: 11, children_per_staff: 10, enforcement: 'warn', created_at: '' },
];

function shift(overrides: Partial<Tables<'shifts'>> = {}): Tables<'shifts'> {
  return {
    id: 's1',
    shift_date: '2026-08-23',
    start_time: '15:00:00',
    end_time: '18:00:00',
    role: 'Afterschool Club',
    expected_children_under8: 8,
    expected_children_8plus: 0,
    published_at: null,
    created_by: null,
    created_at: '',
    ...overrides,
  };
}

describe('toRatioRules', () => {
  test('maps DB rows to the engine shape', () => {
    expect(toRatioRules(RULES)).toEqual([
      { ageMin: 4, ageMax: 7, childrenPerStaff: 8, enforcement: 'block' },
      { ageMin: 8, ageMax: 11, childrenPerStaff: 10, enforcement: 'warn' },
    ]);
  });
});

describe('eligibilityFor', () => {
  test('empty input short-circuits without hitting the database', async () => {
    const result = await eligibilityFor([]);
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('combines profile dob and qualifications per staff member', async () => {
    enqueue('profiles', { data: [{ id: 'a', dob: '1990-01-01' }, { id: 'b', dob: null }], error: null });
    enqueue('qualifications', {
      data: [{ staff_id: 'a', type: 'dbs', expires_on: '2099-01-01' }],
      error: null,
    });
    const result = await eligibilityFor(['a', 'b']);
    expect(result).toEqual([
      { staffId: 'a', dob: '1990-01-01', qualifications: [{ type: 'dbs', expiresOn: '2099-01-01' }] },
      { staffId: 'b', dob: null, qualifications: [] },
    ]);
  });

  test('a failed profiles or qualifications query returns null, not a partial result', async () => {
    enqueue('profiles', { data: null, error: { message: 'RLS denied' } });
    enqueue('qualifications', { data: [], error: null });
    expect(await eligibilityFor(['a'])).toBeNull();
  });
});

describe('computeVerdictForAbsence', () => {
  const req: Tables<'absence_requests'> = {
    id: 'req1',
    staff_id: 'staff1',
    type: 'holiday',
    start_date: '2026-08-20',
    end_date: '2026-08-25',
    hours: 8,
    status: 'pending',
    decided_by: null,
    decided_at: null,
    ratio_check_result: null,
    reason: null,
    created_at: '',
  };

  test('a failed assignments query is treated as blocking, not "clear"', async () => {
    enqueue('shift_assignments', { data: null, error: { message: 'network error' } });
    expect(await computeVerdictForAbsence(req, RULES)).toBe('error');
  });

  test('no shifts overlapping the requested date range means nothing to check', async () => {
    enqueue('shift_assignments', {
      data: [{ shift_id: 's1', shift: shift({ shift_date: '2026-09-01' }) }],
      error: null,
    });
    expect(await computeVerdictForAbsence(req, RULES)).toBeNull();
  });

  test('an overlapping, understaffed shift blocks approval', async () => {
    enqueue('shift_assignments', { data: [{ shift_id: 's1', shift: shift() }], error: null });
    // Only the requester themself is assigned; no "others" on the shift.
    enqueue('shift_assignments', { data: [], error: null });

    const result = await computeVerdictForAbsence(req, RULES);
    expect(result).not.toBe('error');
    expect(result).not.toBeNull();
    const verdict = result as import('@/lib/engine/ratios').RatioCheckResult;
    expect(verdict.ok).toBe(false);
    expect(verdict.violations[0].required).toBe(1); // ceil(8/8)
  });

  test('a failed "others" query mid-loop is treated as blocking', async () => {
    enqueue('shift_assignments', { data: [{ shift_id: 's1', shift: shift() }], error: null });
    enqueue('shift_assignments', { data: null, error: { message: 'RLS denied' } });
    expect(await computeVerdictForAbsence(req, RULES)).toBe('error');
  });
});

describe('computeVerdictForSwap', () => {
  test('no shift attached to the swap means nothing to check', async () => {
    expect(await computeVerdictForSwap(null, 'assign1', 'toStaff', RULES)).toBeNull();
  });

  test('a failed query is treated as blocking', async () => {
    enqueue('shift_assignments', { data: null, error: { message: 'network error' } });
    expect(await computeVerdictForSwap(shift(), 'assign1', 'toStaff', RULES)).toBe('error');
  });

  test('the incoming colleague is included in the eligibility count', async () => {
    enqueue('shift_assignments', { data: [], error: null }); // no one else already on the shift
    enqueue('profiles', { data: [{ id: 'toStaff', dob: '1990-01-01' }], error: null });
    enqueue('qualifications', {
      data: [{ staff_id: 'toStaff', type: 'dbs', expires_on: '2099-01-01' }],
      error: null,
    });

    const result = await computeVerdictForSwap(shift(), 'assign1', 'toStaff', RULES);
    expect(result).not.toBe('error');
    const verdict = result as import('@/lib/engine/ratios').RatioCheckResult;
    expect(verdict.eligibleStaffCount).toBe(1);
    expect(verdict.ok).toBe(true); // 1 staff covers 8 under-8 children at 1:8
  });
});
