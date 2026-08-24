import { useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/SessionProvider';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export function useProfile() {
  const { session } = useSession();
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return { profile, loading };
}
