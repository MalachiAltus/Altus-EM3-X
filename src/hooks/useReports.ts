import { useCallback, useEffect, useState } from 'react';

import { leaveYearBounds } from '@/lib/engine/dates';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export interface StaffReportRow {
  id: string;
  full_name: string;
  contractType: Tables<'contracts'>['type'] | null;
  hoursWorked: number;
  accrued: number;
  taken: number;
  balance: number;
}

export function useReports() {
  const [rows, setRows] = useState<StaffReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    // "Accrued"/"Taken"/"Hours worked" are this-leave-year figures (matching
    // what a payroll export should report per period) — `balance` stays a
    // true running total across all leave years, so its own ledger read is
    // unbounded and only the year-scoped columns filter by created_at.
    const { start: yearStart, end: yearEnd } = leaveYearBounds(new Date());
    const [{ data: profiles }, { data: contracts }, { data: timesheets }, { data: ledger }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('status', 'active').order('full_name'),
      supabase.from('contracts').select('staff_id, type').order('effective_from', { ascending: false }),
      supabase
        .from('timesheets')
        .select('staff_id, worked_minutes')
        .gte('clock_in', yearStart.toISOString())
        .lt('clock_in', yearEnd.toISOString()),
      supabase.from('holiday_ledger').select('staff_id, event, hours, running_balance, created_at').order('created_at'),
    ]);

    const contractByStaff = new Map<string, Tables<'contracts'>['type']>();
    for (const c of contracts ?? []) {
      if (!contractByStaff.has(c.staff_id)) contractByStaff.set(c.staff_id, c.type);
    }

    const rowsOut: StaffReportRow[] = (profiles ?? []).map((p) => {
      const minutes = (timesheets ?? [])
        .filter((t) => t.staff_id === p.id)
        .reduce((sum, t) => sum + (t.worked_minutes ?? 0), 0);

      const myLedger = (ledger ?? []).filter((l) => l.staff_id === p.id);
      const thisYearLedger = myLedger.filter((l) => {
        const created = new Date(l.created_at).getTime();
        return created >= yearStart.getTime() && created < yearEnd.getTime();
      });
      const accrued = thisYearLedger.filter((l) => l.event === 'accrual').reduce((s, l) => s + Number(l.hours), 0);
      const taken = thisYearLedger.filter((l) => l.event === 'taken').reduce((s, l) => s + Number(l.hours), 0);
      const balance = myLedger.length > 0 ? Number(myLedger[myLedger.length - 1].running_balance) : 0;

      return {
        id: p.id,
        full_name: p.full_name,
        contractType: contractByStaff.get(p.id) ?? null,
        hoursWorked: Math.round((minutes / 60) * 100) / 100,
        accrued,
        taken,
        balance,
      };
    });

    setRows(rowsOut);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function toCsv(): string {
    const header = 'Name,Contract,Hours Worked,Holiday Accrued,Holiday Taken,Balance';
    const lines = rows.map((r) =>
      [r.full_name, r.contractType ?? '', r.hoursWorked, r.accrued, r.taken, r.balance]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    return [header, ...lines].join('\n');
  }

  return { rows, loading, refresh, toCsv };
}
