import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/SessionProvider';
import { supabase } from '@/lib/supabase/client';
import type { Enums, Tables } from '@/lib/supabase/types';

export interface NewAbsenceRequest {
  type: Enums<'absence_type'>;
  start_date: string;
  end_date: string;
  hours: number;
  reason?: string;
}

export function useAbsenceRequests() {
  const { session } = useSession();
  const [requests, setRequests] = useState<Tables<'absence_requests'>[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('absence_requests')
      .select('*')
      .eq('staff_id', userId)
      .order('created_at', { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function submit(input: NewAbsenceRequest): Promise<{ error?: string }> {
    const userId = session?.user?.id;
    if (!userId) return { error: 'Not signed in.' };
    const { error } = await supabase.from('absence_requests').insert({
      staff_id: userId,
      type: input.type,
      start_date: input.start_date,
      end_date: input.end_date,
      hours: input.hours,
      reason: input.reason || null,
    });
    if (!error) await refresh();
    return { error: error?.message };
  }

  async function cancel(id: string): Promise<{ error?: string }> {
    const { error } = await supabase.from('absence_requests').update({ status: 'cancelled' }).eq('id', id);
    if (!error) await refresh();
    return { error: error?.message };
  }

  return { requests, loading, submit, cancel, refresh };
}
