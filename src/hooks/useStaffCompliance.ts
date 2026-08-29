import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_STANDARD_DAY_HOURS, STATUTORY_CAP_DAYS, STATUTORY_WEEKS } from '@/lib/engine/accrual';
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
  holidayAllowed: number;
  dob: string | null;
  isPermanent: boolean;
}

export function useStaffCompliance() {
  const [staff, setStaff] = useState<StaffComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { start: yearStart, end: yearEnd } = leaveYearBounds(new Date());
    const [{ data: profiles }, { data: quals }, { data: timesheets }, { data: contracts }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, dob, is_permanent').eq('status', 'active').order('full_name'),
      supabase.from('qualifications').select('*'),
      supabase
        .from('timesheets')
        .select('staff_id, worked_minutes, clock_in')
        .gte('clock_in', yearStart.toISOString())
        .lt('clock_in', yearEnd.toISOString()),
      supabase.from('contracts').select('staff_id, type, weekly_hours').order('effective_from', { ascending: false }),
    ]);

    const today = toISODate(new Date());

    const rows: StaffComplianceRow[] = (profiles ?? []).map((p) => {
      const mine = (quals ?? []).filter((q) => q.staff_id === p.id);
      const statusFor = (t: Tables<'qualifications'>['type']) =>
        qualificationStatus(mine.find((q) => q.type === t)?.expires_on ?? null, today);

      const hoursWorked = round2(
        (timesheets ?? [])
          .filter((t) => t.staff_id === p.id)
          .reduce((sum, t) => sum + (t.worked_minutes ?? 0), 0) / 60
      );

      const contract = (contracts ?? []).find((c) => c.staff_id === p.id);
      const holidayAllowed = !contract
        ? 0
        : contract.type === 'irregular'
          ? STATUTORY_CAP_DAYS * DEFAULT_STANDARD_DAY_HOURS
          : round2(Number(contract.weekly_hours ?? 0) * STATUTORY_WEEKS);

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
        holidayAllowed,
        dob: p.dob,
        isPermanent: p.is_permanent,
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
