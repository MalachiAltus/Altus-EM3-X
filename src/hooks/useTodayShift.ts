import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/SessionProvider';
import { toISODate } from '@/lib/engine/dates';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export interface TodayShift {
  id: string;
  start_time: string;
  end_time: string;
  role: string | null;
}

function minutesBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function useTodayShift() {
  const { session } = useSession();
  const [shift, setShift] = useState<TodayShift | null>(null);
  const [hasTimesheet, setHasTimesheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setShift(null);
      setHasTimesheet(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const today = toISODate(new Date());

    const { data: assignments, error: assignmentsError } = await supabase
      .from('shift_assignments')
      .select('id, shift:shifts!inner(id, start_time, end_time, role, shift_date, published_at)')
      .eq('staff_id', userId)
      .eq('shift.shift_date', today)
      .not('shift.published_at', 'is', null)
      .returns<{ id: string; shift: Tables<'shifts'> }[]>();

    if (assignmentsError) {
      setError(assignmentsError.message);
      setLoading(false);
      return;
    }

    const first = (assignments ?? [])[0]?.shift ?? null;
    setShift(first ? { id: first.id, start_time: first.start_time, end_time: first.end_time, role: first.role } : null);

    if (first) {
      const { data: existing } = await supabase
        .from('timesheets')
        .select('id')
        .eq('staff_id', userId)
        .eq('shift_id', first.id)
        .maybeSingle();
      setHasTimesheet(!!existing);
    } else {
      setHasTimesheet(false);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logMissedShift = useCallback(async (): Promise<{ error: string | null }> => {
    const userId = session?.user?.id;
    if (!userId || !shift) return { error: 'No shift to log.' };
    const today = toISODate(new Date());
    const { error } = await supabase.from('timesheets').insert({
      staff_id: userId,
      shift_id: shift.id,
      clock_in: `${today}T${shift.start_time}`,
      clock_out: `${today}T${shift.end_time}`,
      worked_minutes: minutesBetween(shift.start_time, shift.end_time),
      source: 'manual',
      status: 'amended',
      amend_reason: 'Staff-reported: forgot to clock in/out',
    });
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  }, [session?.user?.id, shift, refresh]);

  return { shift, hasTimesheet, loading, error, refresh, logMissedShift };
}
