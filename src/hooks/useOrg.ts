import { useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/SessionProvider';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export function useOrg() {
  const { session } = useSession();
  const [org, setOrg] = useState<Tables<'orgs'> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setOrg(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('orgs')
      .select('*')
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setOrg(data);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return { org, loading };
}
