import { useCallback, useEffect, useState } from 'react';

import { computeAccrual, IRREGULAR_ACCRUAL_RATE } from '@/lib/engine/accrual';
import { qualificationStatus, type QualificationStatus } from '@/lib/engine/compliance';
import { leaveYearBounds, round2, toISODate } from '@/lib/engine/dates';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export interface StaffComplianceRow {
  id: string;
  full_name: string;
  role: Tables<'profiles'>['role'];
  dbs: QualificationStatus;
  paediatricFirstAid: QualificationStatus;
  firstAid: QualificationStatus;
  safeguarding: QualificationStatus;
  qualifications: Tables<'qualifications'>[];
  hoursWorked: number;
  holidayBalance: number;
  holidayAllowed: number;
}

export function useStaffCompliance() {
  const [staff, setStaff] = useState<StaffComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: quals }, { data: contracts }, { data: timesheets }, { data: taken }, { data: ledger }] =
      await Promise.all([
        supabase.from('profiles').select('id, full_name, role').eq('status', 'active').order('full_name'),
        supabase.from('qualifications').select('*'),
        supabase.from('contracts').select('staff_id, type, effective_from').order('effective_from', { ascending: false }),
        supabase.from('timesheets').select('staff_id, worked_minutes, clock_in'),
        supabase.from('absence_requests').select('staff_id, hours, start_date').eq('type', 'holiday').eq('status', 'approved'),
        supabase.from('holiday_ledger').select('staff_id, running_balance, created_at').order('created_at', { ascending: false }),
      ]);

    const today = toISODate(new Date());
    const { start: yearStart, end: yearEnd } = leaveYearBounds(new Date());
    const yearStartISO = yearStart.toISOString();
    const yearEndISO = yearEnd.toISOString();
    const yearStartDate = toISODate(yearStart);
    const yearEndDate = toISODate(yearEnd);

    const rows: StaffComplianceRow[] = (profiles ?? []).map((p) => {
      const mine = (quals ?? []).filter((q) => q.staff_id === p.id);
      const statusFor = (t: Tables<'qualifications'>['type']) =>
        qualificationStatus(mine.find((q) => q.type === t)?.expires_on ?? null, today);

      const myTimesheets = (timesheets ?? []).filter((t) => t.staff_id === p.id);
      const hoursWorked = round2(myTimesheets.reduce((sum, t) => sum + (t.worked_minutes ?? 0), 0) / 60);

      const contract = (contracts ?? []).find((c) => c.staff_id === p.id);
      let holidayBalance = 0;
      if (contract?.type === 'irregular') {
        const hoursInYear =
          myTimesheets
            .filter((t) => t.clock_in && t.clock_in >= yearStartISO && t.clock_in < yearEndISO)
            .reduce((sum, t) => sum + (t.worked_minutes ?? 0), 0) / 60;
        const takenHours = (taken ?? [])
          .filter((r) => r.staff_id === p.id && r.start_date >= yearStartDate && r.start_date < yearEndDate)
          .reduce((sum, r) => sum + Number(r.hours ?? 0), 0);
        const { accruedHours } = computeAccrual({
          contractType: 'irregular',
          hoursWorkedInPeriod: hoursInYear,
          yearToDateAccruedHours: 0,
        });
        holidayBalance = round2(accruedHours - takenHours);
      } else {
        holidayBalance = (ledger ?? []).find((l) => l.staff_id === p.id)?.running_balance ?? 0;
      }

      return {
        id: p.id,
        full_name: p.full_name,
        role: p.role,
        dbs: statusFor('dbs'),
        paediatricFirstAid: statusFor('paediatric_first_aid'),
        firstAid: statusFor('first_aid'),
        safeguarding: statusFor('safeguarding'),
        qualifications: mine,
        hoursWorked,
        holidayBalance,
        holidayAllowed: round2(holidayBalance * IRREGULAR_ACCRUAL_RATE),
      };
    });
    setStaff(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { staff, loading, refresh };
}
