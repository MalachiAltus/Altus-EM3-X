import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export interface AuditLogEntry extends Tables<'audit_log'> {
  actorName: string;
}

export function useAuditLog(limit = 50) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: logs }, { data: profiles }] = await Promise.all([
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit),
      supabase.from('profiles').select('id, full_name'),
    ]);
    const nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
    setEntries((logs ?? []).map((l) => ({ ...l, actorName: l.actor_id ? nameById[l.actor_id] ?? 'Unknown' : 'System' })));
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}
