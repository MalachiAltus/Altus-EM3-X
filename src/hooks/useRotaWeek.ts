import { useCallback, useEffect, useState } from 'react';

import { addDays, parseISODate, toISODate } from '@/lib/engine/dates';
import type { ShiftTemplate } from '@/lib/shiftTemplates';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export interface ShiftAssignmentWithName extends Tables<'shift_assignments'> {
  profile: { full_name: string } | null;
}

export interface ShiftWithAssignments extends Tables<'shifts'> {
  assignments: ShiftAssignmentWithName[];
}

const PAST_WINDOW_DAYS = 14;
const FUTURE_WINDOW_DAYS = 180;

export function useRotaWeek() {
  const [shifts, setShifts] = useState<ShiftWithAssignments[]>([]);
  const [staff, setStaff] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const rangeStart = toISODate(new Date());
  const rangeEnd = toISODate(addDays(new Date(), FUTURE_WINDOW_DAYS));

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: shiftRows }, { data: staffRows }] = await Promise.all([
      supabase
        .from('shifts')
        .select('*, assignments:shift_assignments(*, profile:profiles(full_name))')
        .gte('shift_date', rangeStart)
        .lt('shift_date', rangeEnd)
        .order('shift_date'),
      supabase.rpc('list_active_staff'),
    ]);
    setShifts((shiftRows as unknown as ShiftWithAssignments[]) ?? []);
    setStaff(staffRows ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function assignShift(input: {
    shift_date: string;
    template: ShiftTemplate;
    staffId?: string;
  }): Promise<{ error?: string }> {
    let shiftId = shifts.find(
      (s) =>
        s.shift_date === input.shift_date &&
        s.start_time === input.template.start_time &&
        s.end_time === input.template.end_time
    )?.id;

    if (!shiftId) {
      const { data: shift, error } = await supabase
        .from('shifts')
        .insert({
          shift_date: input.shift_date,
          start_time: input.template.start_time,
          end_time: input.template.end_time,
          role: input.template.club,
          expected_children_under8: 0,
          expected_children_8plus: 0,
        })
        .select()
        .single();
      if (error || !shift) return { error: error?.message ?? 'Could not create shift.' };
      shiftId = shift.id;
    }

    const { error: assignError } = await supabase.from('shift_assignments').insert({
      shift_id: shiftId,
      staff_id: input.staffId ?? null,
      status: input.staffId ? 'assigned' : 'open',
    });
    if (assignError) return { error: assignError.message };

    await refresh();
    return {};
  }

  async function removeAssignment(assignmentId: string): Promise<{ error?: string }> {
    const { error } = await supabase.from('shift_assignments').delete().eq('id', assignmentId);
    if (!error) await refresh();
    return { error: error?.message };
  }

  async function publishWeek(): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('shifts')
      .update({ published_at: new Date().toISOString() })
      .is('published_at', null)
      .gte('shift_date', rangeStart)
      .lt('shift_date', rangeEnd);
    if (!error) await refresh();
    return { error: error?.message };
  }

  async function copyPreviousPeriod(): Promise<{ error?: string }> {
    const prevStart = toISODate(addDays(new Date(), -PAST_WINDOW_DAYS));
    const { data: prevShifts, error } = await supabase
      .from('shifts')
      .select('*, assignments:shift_assignments(*)')
      .gte('shift_date', prevStart)
      .lt('shift_date', rangeStart);
    if (error) return { error: error.message };

    for (const s of (prevShifts as unknown as ShiftWithAssignments[]) ?? []) {
      const newDate = toISODate(addDays(parseISODate(s.shift_date), PAST_WINDOW_DAYS));
      const { data: newShift, error: insertError } = await supabase
        .from('shifts')
        .insert({
          shift_date: newDate,
          start_time: s.start_time,
          end_time: s.end_time,
          role: s.role,
          expected_children_under8: s.expected_children_under8,
          expected_children_8plus: s.expected_children_8plus,
        })
        .select()
        .single();
      if (insertError || !newShift) continue;
      for (const a of s.assignments) {
        await supabase.from('shift_assignments').insert({
          shift_id: newShift.id,
          staff_id: a.staff_id,
          status: a.staff_id ? 'assigned' : 'open',
        });
      }
    }
    await refresh();
    return {};
  }

  return { shifts, staff, loading, assignShift, removeAssignment, publishWeek, copyPreviousPeriod, refresh };
}
