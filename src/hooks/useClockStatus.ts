import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/SessionProvider';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export function useClockStatus() {
  const { session } = useSession();
  const [lastEvent, setLastEvent] = useState<Tables<'clock_events'> | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setLastEvent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('clock_events')
      .select('*')
      .eq('staff_id', userId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastEvent(data);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { lastEvent, isClockedIn: lastEvent?.event_type === 'in', loading, refresh };
}
