import { useCallback, useEffect, useState } from 'react';

import { checkRatio, type RatioCheckResult } from '@/lib/engine/ratios';
import { useSession } from '@/lib/auth/SessionProvider';
import { supabase } from '@/lib/supabase/client';
import type { Json, Tables } from '@/lib/supabase/types';

export interface AbsenceApprovalItem extends Tables<'absence_requests'> {
  staffName: string;
  verdict: RatioCheckResult | null;
}

export interface SwapApprovalItem extends Tables<'swap_requests'> {
  fromName: string;
  toName: string;
  shift: Tables<'shifts'> | null;
}

async function computeVerdictForAbsence(
  req: Tables<'absence_requests'>,
  rules: Tables<'ratio_rules'>[]
): Promise<RatioCheckResult | null> {
  const { data: myAssignments } = await supabase
    .from('shift_assignments')
    .select('shift_id, shift:shifts(*)')
    .eq('staff_id', req.staff_id);

  const overlapping = ((myAssignments as unknown as { shift: Tables<'shifts'> | null }[]) ?? []).filter(
    (a) => a.shift && a.shift.shift_date >= req.start_date && a.shift.shift_date <= req.end_date
  );
  if (overlapping.length === 0) return null;

  let worst: RatioCheckResult | null = null;
  for (const a of overlapping) {
    const shift = a.shift as Tables<'shifts'>;
    const { data: others } = await supabase
      .from('shift_assignments')
      .select('staff_id')
      .eq('shift_id', shift.id)
      .neq('staff_id', req.staff_id);
    const staffIds = (others ?? []).map((x) => x.staff_id).filter((id): id is string => !!id);

    const [{ data: staffProfiles }, { data: quals }] = await Promise.all([
      staffIds.length
        ? supabase.from('profiles').select('id, dob').in('id', staffIds)
        : Promise.resolve({ data: [] as { id: string; dob: string | null }[] }),
      staffIds.length
        ? supabase.from('qualifications').select('staff_id, type, expires_on').in('staff_id', staffIds)
        : Promise.resolve({ data: [] as { staff_id: string; type: string; expires_on: string | null }[] }),
    ]);

    const assignedStaff = staffIds.map((id) => ({
      staffId: id,
      dob: staffProfiles?.find((p) => p.id === id)?.dob ?? null,
      qualifications: (quals ?? [])
        .filter((q) => q.staff_id === id)
        .map((q) => ({ type: q.type, expiresOn: q.expires_on })),
    }));

    const result = checkRatio({
      shiftDate: shift.shift_date,
      expectedChildrenUnder8: shift.expected_children_under8,
      expectedChildren8Plus: shift.expected_children_8plus,
      assignedStaff,
      rules: rules.map((r) => ({
        ageMin: r.age_min,
        ageMax: r.age_max,
        childrenPerStaff: r.children_per_staff,
        enforcement: r.enforcement,
      })),
    });

    if (!worst || (worst.ok && !result.ok) || result.violations.length > worst.violations.length) {
      worst = result;
    }
  }
  return worst;
}

export function useApprovals() {
  const { session } = useSession();
  const decidedBy = session?.user?.id ?? null;
  const [absences, setAbsences] = useState<AbsenceApprovalItem[]>([]);
  const [swaps, setSwaps] = useState<SwapApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: pendingAbsences }, { data: pendingSwaps }, { data: rules }, { data: profiles }] =
      await Promise.all([
        supabase.from('absence_requests').select('*').eq('status', 'pending').order('created_at'),
        supabase
          .from('swap_requests')
          .select('*, assignment:shift_assignments(shift:shifts(*))')
          .eq('status', 'colleague_accepted')
          .order('created_at'),
        supabase.from('ratio_rules').select('*'),
        supabase.from('profiles').select('id, full_name'),
      ]);

    const nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

    const absenceItems: AbsenceApprovalItem[] = [];
    for (const req of pendingAbsences ?? []) {
      const verdict = await computeVerdictForAbsence(req, rules ?? []);
      absenceItems.push({ ...req, staffName: nameById[req.staff_id] ?? 'Unknown', verdict });
    }
    setAbsences(absenceItems);

    const swapItems: SwapApprovalItem[] = ((pendingSwaps as unknown as (Tables<'swap_requests'> & {
      assignment: { shift: Tables<'shifts'> } | null;
    })[]) ?? []).map((s) => ({
      ...s,
      fromName: nameById[s.from_staff_id] ?? 'Unknown',
      toName: nameById[s.to_staff_id] ?? 'Unknown',
      shift: s.assignment?.shift ?? null,
    }));
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

  return { absences, swaps, loading, approveAbsence, declineAbsence, approveSwap, declineSwap, refresh };
}
