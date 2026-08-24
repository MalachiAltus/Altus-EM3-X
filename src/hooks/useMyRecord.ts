import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/SessionProvider';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export function useMyRecord() {
  const { session } = useSession();
  const [contract, setContract] = useState<Tables<'contracts'> | null>(null);
  const [qualifications, setQualifications] = useState<Tables<'qualifications'>[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setContract(null);
      setQualifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: contracts }, { data: quals }] = await Promise.all([
      supabase
        .from('contracts')
        .select('*')
        .eq('staff_id', userId)
        .order('effective_from', { ascending: false })
        .limit(1),
      supabase.from('qualifications').select('*').eq('staff_id', userId),
    ]);
    setContract(contracts?.[0] ?? null);
    setQualifications(quals ?? []);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { contract, qualifications, loading, refresh };
}
