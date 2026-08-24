import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/SessionProvider';
import { toISODate } from '@/lib/engine/dates';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export interface CalendarAssignment {
  id: string;
  staffName: string | null;
  isMe: boolean;
}

export interface CalendarShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role: string | null;
  mine: boolean;
  myAssignmentId: string | null;
  openSpots: number;
  assignedStaff: CalendarAssignment[];
}

type ShiftRow = Tables<'shifts'> & {
  shift_assignments: Pick<Tables<'shift_assignments'>, 'id' | 'staff_id' | 'status'>[];
};

// Every published shift from today onward, org-wide (RLS already lets any
// staff member read the whole rota — this is what lets "possible shifts"
// exist at all: an open, unfilled slot on someone else's shift is only
// useful to show if everyone can see it, not just whoever it's assigned to).
//
// Staff names come from list_active_staff, not a join through profiles —
// profiles' own RLS only lets a staff member read their own row, so a
// direct join silently comes back null for colleagues instead of erroring.
export function useShiftsCalendar() {
  const { session } = useSession();
  const [shiftsByDate, setShiftsByDate] = useState<Record<string, CalendarShift[]>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const userId = session?.user?.id;
    setLoading(true);
    const today = toISODate(new Date());

    const [{ data }, { data: staffList }] = await Promise.all([
      supabase
        .from('shifts')
        .select('*, shift_assignments(id, staff_id, status)')
        .not('published_at', 'is', null)
        .gte('shift_date', today)
        .order('shift_date')
        .returns<ShiftRow[]>(),
      supabase.rpc('list_active_staff'),
    ]);

    const nameById = Object.fromEntries((staffList ?? []).map((s) => [s.id, s.full_name]));

    const grouped: Record<string, CalendarShift[]> = {};
    for (const row of data ?? []) {
      const assignments = row.shift_assignments ?? [];
      const mine = userId ? assignments.find((a) => a.staff_id === userId) : undefined;
      const entry: CalendarShift = {
        id: row.id,
        shift_date: row.shift_date,
        start_time: row.start_time,
        end_time: row.end_time,
        role: row.role,
        mine: !!mine,
        myAssignmentId: mine?.id ?? null,
        openSpots: assignments.filter((a) => a.status === 'open').length,
        assignedStaff: assignments
          .filter((a) => a.staff_id)
          .map((a) => ({ id: a.id, staffName: nameById[a.staff_id!] ?? null, isMe: a.staff_id === userId })),
      };
      (grouped[row.shift_date] ??= []).push(entry);
    }

    setShiftsByDate(grouped);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { shiftsByDate, loading, refresh };
}
