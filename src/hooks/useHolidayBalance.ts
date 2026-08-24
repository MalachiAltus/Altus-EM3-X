import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/SessionProvider';
import { computeAccrual } from '@/lib/engine/accrual';
import { leaveYearBounds, round2, toISODate } from '@/lib/engine/dates';
import { supabase } from '@/lib/supabase/client';

// For irregular/zero-hours contracts, the balance shown is live: 12.07% of
// hours actually clocked this leave year (statutory rate, same formula and
// 224h/year cap as the tested engine and the monthly-accrual job), minus
// approved holiday already taken — rather than waiting on the monthly
// posting. Fixed part-time contracts keep reading the ledger, since their
// entitlement is calendar-based (5.6 weeks/year) rather than hours-worked.
export function useHolidayBalance() {
  const { session } = useSession();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setBalance(0);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: contract } = await supabase
      .from('contracts')
      .select('type')
      .eq('staff_id', userId)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contract?.type === 'irregular') {
      const { start: yearStart, end: yearEnd } = leaveYearBounds(new Date());
      const [{ data: timesheets }, { data: taken }] = await Promise.all([
        supabase
          .from('timesheets')
          .select('worked_minutes')
          .eq('staff_id', userId)
          .gte('clock_in', yearStart.toISOString())
          .lt('clock_in', yearEnd.toISOString()),
        supabase
          .from('absence_requests')
          .select('hours')
          .eq('staff_id', userId)
          .eq('type', 'holiday')
          .eq('status', 'approved')
          .gte('start_date', toISODate(yearStart))
          .lt('start_date', toISODate(yearEnd)),
      ]);

      const hoursWorked = (timesheets ?? []).reduce((sum, t) => sum + (t.worked_minutes ?? 0), 0) / 60;
      const takenHours = (taken ?? []).reduce((sum, r) => sum + Number(r.hours ?? 0), 0);
      const { accruedHours } = computeAccrual({
        contractType: 'irregular',
        hoursWorkedInPeriod: hoursWorked,
        yearToDateAccruedHours: 0,
      });

      setBalance(round2(accruedHours - takenHours));
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('holiday_ledger')
      .select('running_balance')
      .eq('staff_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setBalance(data?.running_balance ?? 0);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { balance, loading, refresh };
}
