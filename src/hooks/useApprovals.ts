import { useCallback, useEffect, useState } from 'react';

import { checkRatio, type RatioCheckResult } from '@/lib/engine/ratios';
import { useSession } from '@/lib/auth/SessionProvider';
import { supabase } from '@/lib/supabase/client';
import type { Json, Tables } from '@/lib/supabase/types';

// A verdict of 'error' means a query needed to compute it failed — treated
// as blocking everywhere it's used, since silently rendering that as "clear"
// would let the one safety check this screen exists for be bypassed by a
// transient network/RLS hiccup.
export type Verdict = RatioCheckResult | null | 'error';

export interface AbsenceApprovalItem extends Tables<'absence_requests'> {
  staffName: string;
  verdict: Verdict;
}

export interface SwapApprovalItem extends Tables<'swap_requests'> {
  fromName: string;
  toName: string;
  shift: Tables<'shifts'> | null;
  verdict: Verdict;
}

export type SignupApprovalItem = Tables<'signup_requests'>;

function toRatioRules(rules: Tables<'ratio_rules'>[]) {
  return rules.map((r) => ({
    ageMin: r.age_min,
    ageMax: r.age_max,
    childrenPerStaff: r.children_per_staff,
    enforcement: r.enforcement,
  }));
}

async function eligibilityFor(staffIds: string[]) {
  const [{ data: staffProfiles, error: profilesErr }, { data: quals, error: qualsErr }] = await Promise.all([
    staffIds.length
      ? supabase.from('profiles').select('id, dob').in('id', staffIds)
      : Promise.resolve({ data: [] as { id: string; dob: string | null }[], error: null }),
    staffIds.length
      ? supabase.from('qualifications').select('staff_id, type, expires_on').in('staff_id', staffIds)
      : Promise.resolve({ data: [] as { staff_id: string; type: string; expires_on: string | null }[], error: null }),
  ]);
  if (profilesErr || qualsErr) return null;

  return staffIds.map((id) => ({
    staffId: id,
    dob: staffProfiles?.find((p) => p.id === id)?.dob ?? null,
    qualifications: (quals ?? [])
      .filter((q) => q.staff_id === id)
      .map((q) => ({ type: q.type, expiresOn: q.expires_on })),
  }));
}

async function computeVerdictForAbsence(
  req: Tables<'absence_requests'>,
  rules: Tables<'ratio_rules'>[]
): Promise<Verdict> {
  const { data: myAssignments, error: assignmentsError } = await supabase
    .from('shift_assignments')
    .select('shift_id, shift:shifts(*)')
    .eq('staff_id', req.staff_id);
  if (assignmentsError) return 'error';

  const overlapping = ((myAssignments as unknown as { shift: Tables<'shifts'> | null }[]) ?? []).filter(
    (a) => a.shift && a.shift.shift_date >= req.start_date && a.shift.shift_date <= req.end_date
  );
  if (overlapping.length === 0) return null;

  let worst: RatioCheckResult | null = null;
  for (const a of overlapping) {
    const shift = a.shift as Tables<'shifts'>;
    const { data: others, error: othersError } = await supabase
      .from('shift_assignments')
      .select('staff_id')
      .eq('shift_id', shift.id)
      .neq('staff_id', req.staff_id);
    if (othersError) return 'error';
    const staffIds = (others ?? []).map((x) => x.staff_id).filter((id): id is string => !!id);

    const assignedStaff = await eligibilityFor(staffIds);
    if (assignedStaff === null) return 'error';

    const result = checkRatio({
      shiftDate: shift.shift_date,
      expectedChildrenUnder8: shift.expected_children_under8,
      expectedChildren8Plus: shift.expected_children_8plus,
      assignedStaff,
      rules: toRatioRules(rules),
    });

    if (!worst || (worst.ok && !result.ok) || result.violations.length > worst.violations.length) {
      worst = result;
    }
  }
  return worst;
}

async function computeVerdictForSwap(
  shift: Tables<'shifts'> | null,
  assignmentId: string,
  toStaffId: string,
  rules: Tables<'ratio_rules'>[]
): Promise<Verdict> {
  if (!shift) return null;

  const { data: others, error: othersError } = await supabase
    .from('shift_assignments')
    .select('staff_id')
    .eq('shift_id', shift.id)
    .neq('id', assignmentId);
  if (othersError) return 'error';

  const staffIds = Array.from(
    new Set([...(others ?? []).map((x) => x.staff_id).filter((id): id is string => !!id), toStaffId])
  );
  const assignedStaff = await eligibilityFor(staffIds);
  if (assignedStaff === null) return 'error';

  return checkRatio({
    shiftDate: shift.shift_date,
    expectedChildrenUnder8: shift.expected_children_under8,
    expectedChildren8Plus: shift.expected_children_8plus,
    assignedStaff,
    rules: toRatioRules(rules),
  });
}

export function useApprovals() {
  const { session } = useSession();
  const decidedBy = session?.user?.id ?? null;
  const [absences, setAbsences] = useState<AbsenceApprovalItem[]>([]);
  const [swaps, setSwaps] = useState<SwapApprovalItem[]>([]);
  const [signups, setSignups] = useState<SignupApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [
      { data: pendingAbsences, error: absencesError },
      { data: pendingSwaps, error: swapsError },
      { data: rules, error: rulesError },
      { data: profiles, error: profilesError },
      { data: pendingSignups, error: signupsError },
    ] = await Promise.all([
      supabase.from('absence_requests').select('*').eq('status', 'pending').order('created_at'),
      supabase
        .from('swap_requests')
        .select('*, assignment:shift_assignments(shift:shifts(*))')
        .eq('status', 'colleague_accepted')
        .order('created_at'),
      supabase.from('ratio_rules').select('*'),
      supabase.from('profiles').select('id, full_name'),
      supabase.from('signup_requests').select('*').eq('status', 'pending').order('created_at'),
    ]);

    const firstError = absencesError ?? swapsError ?? rulesError ?? profilesError ?? signupsError;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setSignups(pendingSignups ?? []);

    const nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

    const absenceItems: AbsenceApprovalItem[] = [];
    for (const req of pendingAbsences ?? []) {
      const verdict = await computeVerdictForAbsence(req, rules ?? []);
      absenceItems.push({ ...req, staffName: nameById[req.staff_id] ?? 'Unknown', verdict });
    }
    setAbsences(absenceItems);

    const swapItems: SwapApprovalItem[] = [];
    for (const s of (pendingSwaps as unknown as (Tables<'swap_requests'> & {
      assignment: { shift: Tables<'shifts'> } | null;
    })[]) ?? []) {
      const shift = s.assignment?.shift ?? null;
      const verdict = await computeVerdictForSwap(shift, s.assignment_id, s.to_staff_id, rules ?? []);
      swapItems.push({
        ...s,
        fromName: nameById[s.from_staff_id] ?? 'Unknown',
        toName: nameById[s.to_staff_id] ?? 'Unknown',
        shift,
        verdict,
      });
    }
    setSwaps(swapItems);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approveAbsence(req: AbsenceApprovalItem): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('absence_requests')
      .update({
        status: 'approved',
        ratio_check_result: req.verdict as unknown as Json,
        decided_by: decidedBy,
        decided_at: new Date().toISOString(),
      })
      .eq('id', req.id);
    if (!error) await refresh();
    return { error: error?.message };
  }

  async function declineAbsence(id: string): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('absence_requests')
      .update({ status: 'declined', decided_by: decidedBy, decided_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await refresh();
    return { error: error?.message };
  }

  async function approveSwap(swap: SwapApprovalItem): Promise<{ error?: string }> {
    if (swap.verdict === 'error') {
      return { error: "Couldn't verify staffing for this shift — reopen this screen and try again." };
    }
    if (swap.verdict && !swap.verdict.ok) {
      return { error: 'This swap would leave the shift understaffed. Assign cover before approving.' };
    }

    const { error: reassignError } = await supabase
      .from('shift_assignments')
      .update({ staff_id: swap.to_staff_id, status: 'assigned' })
      .eq('id', swap.assignment_id);
    if (reassignError) return { error: reassignError.message };

    const { error } = await supabase
      .from('swap_requests')
      .update({ status: 'approved', decided_by: decidedBy, decided_at: new Date().toISOString() })
      .eq('id', swap.id);
    if (!error) await refresh();
    return { error: error?.message };
  }

  async function declineSwap(id: string): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('swap_requests')
      .update({ status: 'declined', decided_by: decidedBy, decided_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await refresh();
    return { error: error?.message };
  }

  async function approveSignup(id: string, role: Tables<'profiles'>['role']): Promise<{ error?: string }> {
    const { data, error } = await supabase.functions.invoke('approve-signup', {
      body: { signup_request_id: id, role },
    });
    if (error) {
      // supabase-js only puts a generic "non-2xx status code" message on
      // FunctionsHttpError — the actual reason is in the response body.
      const context = (error as { context?: Response }).context;
      const body = await context?.json?.().catch(() => null);
      return { error: body?.error ?? error.message };
    }
    if (data?.error) return { error: data.error as string };
    await refresh();
    return {};
  }

  async function declineSignup(id: string): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('signup_requests')
      .update({ status: 'declined', decided_by: decidedBy, decided_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await refresh();
    return { error: error?.message };
  }

  return {
    absences,
    swaps,
    signups,
    loading,
    error,
    approveAbsence,
    declineAbsence,
    approveSwap,
    declineSwap,
    approveSignup,
    declineSignup,
    refresh,
  };
}
