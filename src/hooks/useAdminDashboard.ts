import { useCallback, useEffect, useState } from 'react';

import { qualificationStatus } from '@/lib/engine/compliance';
import { toISODate } from '@/lib/engine/dates';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export interface OnSiteEntry {
  staffId: string;
  fullName: string;
  since: string;
}

export interface ComplianceIssue {
  staffId: string;
  fullName: string;
  qualType: Tables<'qualifications'>['type'];
  status: 'expiring' | 'expired';
  expiresOn: string | null;
}

export function useAdminDashboard() {
  const [onSiteNow, setOnSiteNow] = useState<OnSiteEntry[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const today = toISODate(new Date());

    const [{ data: events }, { data: profiles }, { data: absenceReqs }, { data: swapReqs }, { data: quals }, { data: signupReqs }] =
      await Promise.all([
        supabase.from('clock_events').select('staff_id, event_type, occurred_at').order('occurred_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name'),
        supabase.from('absence_requests').select('id').eq('status', 'pending'),
        supabase.from('swap_requests').select('id').eq('status', 'colleague_accepted'),
        supabase.from('qualifications').select('staff_id, type, expires_on'),
        supabase.from('signup_requests').select('id').eq('status', 'pending'),
      ]);

    const nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

    const latestByStaff = new Map<string, { event_type: string; occurred_at: string }>();
    for (const e of events ?? []) {
      if (!latestByStaff.has(e.staff_id)) latestByStaff.set(e.staff_id, e);
    }
    const onSite: OnSiteEntry[] = [];
    for (const [staffId, e] of latestByStaff) {
      if (e.event_type === 'in') {
        onSite.push({ staffId, fullName: nameById[staffId] ?? 'Unknown', since: e.occurred_at });
      }
    }
    onSite.sort((a, b) => a.since.localeCompare(b.since));

    const issues: ComplianceIssue[] = [];
    for (const q of quals ?? []) {
      const status = qualificationStatus(q.expires_on, today);
      if (status === 'expiring' || status === 'expired') {
        issues.push({
          staffId: q.staff_id,
          fullName: nameById[q.staff_id] ?? 'Unknown',
          qualType: q.type,
          status,
          expiresOn: q.expires_on,
        });
      }
    }

    setOnSiteNow(onSite);
    setPendingApprovalsCount((absenceReqs?.length ?? 0) + (swapReqs?.length ?? 0) + (signupReqs?.length ?? 0));
    setComplianceIssues(issues);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { onSiteNow, pendingApprovalsCount, complianceIssues, loading, refresh };
}
