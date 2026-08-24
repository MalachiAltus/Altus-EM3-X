import { useCallback, useEffect, useState } from 'react';

import { qualificationStatus, type QualificationStatus } from '@/lib/engine/compliance';
import { toISODate } from '@/lib/engine/dates';
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
}

export function useStaffCompliance() {
  const [staff, setStaff] = useState<StaffComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: quals }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role').eq('status', 'active').order('full_name'),
      supabase.from('qualifications').select('*'),
    ]);

    const today = toISODate(new Date());
    const rows: StaffComplianceRow[] = (profiles ?? []).map((p) => {
      const mine = (quals ?? []).filter((q) => q.staff_id === p.id);
      const statusFor = (t: Tables<'qualifications'>['type']) =>
        qualificationStatus(mine.find((q) => q.type === t)?.expires_on ?? null, today);
      return {
        id: p.id,
        full_name: p.full_name,
        role: p.role,
        dbs: statusFor('dbs'),
        paediatricFirstAid: statusFor('paediatric_first_aid'),
        firstAid: statusFor('first_aid'),
        safeguarding: statusFor('safeguarding'),
        qualifications: mine,
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
