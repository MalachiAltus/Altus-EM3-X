import { useCallback, useEffect, useState } from 'react';

import { daysUntilNextBirthday, toISODate } from '@/lib/engine/dates';
import { supabase } from '@/lib/supabase/client';

export const BIRTHDAY_REMINDER_DAYS = 7;

export interface UpcomingBirthday {
  id: string;
  full_name: string;
  dob: string;
  daysAway: number;
}

export function useUpcomingBirthdays() {
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, dob')
      .eq('status', 'active')
      .not('dob', 'is', null);

    const today = toISODate(new Date());
    const upcoming = (profiles ?? [])
      .map((p) => ({
        id: p.id,
        full_name: p.full_name,
        dob: p.dob as string,
        daysAway: daysUntilNextBirthday(p.dob as string, today),
      }))
      .filter((p) => p.daysAway <= BIRTHDAY_REMINDER_DAYS)
      .sort((a, b) => a.daysAway - b.daysAway);

    setBirthdays(upcoming);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { birthdays, loading, refresh };
}
