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

export interface RotaStaffRow {
  id: string;
  full_name: string;
  is_permanent: boolean;
}

const PAST_WINDOW_DAYS = 14;
const FUTURE_WINDOW_DAYS = 180;
const REPEAT_WEEK_DAYS = 7;

// Same-weekday dates, one week apart, that stay within the calendar month
// of `startISO` — used to auto-repeat a permanent staff member's first
// week of shifts across the rest of that month.
export function repeatDatesInSameMonth(startISO: string): string[] {
  const start = parseISODate(startISO);
  const month = start.getUTCMonth();
  const year = start.getUTCFullYear();
  const dates: string[] = [];
  let next = addDays(start, REPEAT_WEEK_DAYS);
  while (next.getUTCFullYear() === year && next.getUTCMonth() === month) {
    dates.push(toISODate(next));
    next = addDays(next, REPEAT_WEEK_DAYS);
  }
  return dates;
}

export function useRotaWeek() {
  const [shifts, setShifts] = useState<ShiftWithAssignments[]>([]);
  const [staff, setStaff] = useState<RotaStaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Recomputed on every render (and again inside `refresh` itself) rather
  // than memoized once, so a screen left mounted across a day boundary
  // doesn't keep querying/publishing/copying against a stale "today".
  const rangeStart = toISODate(new Date());
  const rangeEnd = toISODate(addDays(new Date(), FUTURE_WINDOW_DAYS));

  const refresh = useCallback(async () => {
    setLoading(true);
    const start = toISODate(new Date());
    const end = toISODate(addDays(new Date(), FUTURE_WINDOW_DAYS));
    const [{ data: shiftRows }, { data: staffRows }] = await Promise.all([
      supabase
        .from('shifts')
        .select('*, assignments:shift_assignments(*, profile:profiles(full_name))')
        .gte('shift_date', start)
        .lt('shift_date', end)
        .order('shift_date'),
      supabase.rpc('list_active_staff'),
    ]);
    setShifts((shiftRows as unknown as ShiftWithAssignments[]) ?? []);
    setStaff(staffRows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function findOrCreateShiftId(
    shift_date: string,
    template: ShiftTemplate
  ): Promise<{ id?: string; error?: string }> {
    const existing = shifts.find(
      (s) => s.shift_date === shift_date && s.start_time === template.start_time && s.end_time === template.end_time
    );
    if (existing) return { id: existing.id };

    const { data: shift, error } = await supabase
      .from('shifts')
      .insert({
        shift_date,
        start_time: template.start_time,
        end_time: template.end_time,
        role: template.club,
        expected_children_under8: 0,
        expected_children_8plus: 0,
      })
      .select()
      .single();
    if (error || !shift) return { error: error?.message ?? 'Could not create shift.' };
    return { id: shift.id };
  }

  async function assignShift(input: {
    shift_date: string;
    template: ShiftTemplate;
    staffId?: string;
  }): Promise<{ error?: string }> {
    const { id: shiftId, error: shiftError } = await findOrCreateShiftId(input.shift_date, input.template);
    if (!shiftId) return { error: shiftError };

    const { error: assignError } = await supabase.from('shift_assignments').insert({
      shift_id: shiftId,
      staff_id: input.staffId ?? null,
      status: input.staffId ? 'assigned' : 'open',
    });
    if (assignError) return { error: assignError.message };

    const isPermanent = input.staffId ? staff.find((s) => s.id === input.staffId)?.is_permanent : false;
    if (input.staffId && isPermanent) {
      for (const repeatDate of repeatDatesInSameMonth(input.shift_date)) {
        const { id: repeatShiftId } = await findOrCreateShiftId(repeatDate, input.template);
        if (!repeatShiftId) continue;
        const { data: existingAssignment } = await supabase
          .from('shift_assignments')
          .select('id')
          .eq('shift_id', repeatShiftId)
          .eq('staff_id', input.staffId)
          .maybeSingle();
        if (existingAssignment) continue;
        await supabase.from('shift_assignments').insert({
          shift_id: repeatShiftId,
          staff_id: input.staffId,
          status: 'assigned',
        });
      }
    }

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

      const { data: existingShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('shift_date', newDate)
        .eq('start_time', s.start_time)
        .eq('end_time', s.end_time)
        .maybeSingle();

      let targetShiftId = existingShift?.id;
      if (!targetShiftId) {
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
        targetShiftId = newShift.id;
      }

      for (const a of s.assignments) {
        let existingQuery = supabase.from('shift_assignments').select('id').eq('shift_id', targetShiftId);
        existingQuery = a.staff_id ? existingQuery.eq('staff_id', a.staff_id) : existingQuery.is('staff_id', null);
        const { data: existingAssignment } = await existingQuery.maybeSingle();
        if (existingAssignment) continue;

        await supabase.from('shift_assignments').insert({
          shift_id: targetShiftId,
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
