import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/SessionProvider';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export interface SwapRequestWithShift extends Tables<'swap_requests'> {
  shift: Tables<'shifts'> | null;
}

export interface ColleagueOption {
  id: string;
  full_name: string;
}

export function useSwapRequests() {
  const { session } = useSession();
  const [incoming, setIncoming] = useState<SwapRequestWithShift[]>([]);
  const [outgoing, setOutgoing] = useState<SwapRequestWithShift[]>([]);
  const [colleagues, setColleagues] = useState<ColleagueOption[]>([]);
  const [staffNames, setStaffNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setIncoming([]);
      setOutgoing([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: swaps }, { data: staffList }] = await Promise.all([
      supabase
        .from('swap_requests')
        .select('*, assignment:shift_assignments(shift:shifts(*))')
        .or(`from_staff_id.eq.${userId},to_staff_id.eq.${userId}`)
        .order('created_at', { ascending: false }),
      supabase.rpc('list_active_staff'),
    ]);

    const names: Record<string, string> = {};
    const others: ColleagueOption[] = [];
    for (const s of staffList ?? []) {
      names[s.id] = s.full_name;
      if (s.id !== userId) others.push({ id: s.id, full_name: s.full_name });
    }
    setStaffNames(names);
    setColleagues(others);

    const mapped: SwapRequestWithShift[] = (swaps ?? []).map((s) => ({
      ...s,
      shift: (s as unknown as { assignment?: { shift: Tables<'shifts'> } }).assignment?.shift ?? null,
    }));

    setIncoming(mapped.filter((s) => s.to_staff_id === userId));
    setOutgoing(mapped.filter((s) => s.from_staff_id === userId));
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function requestSwap(assignmentId: string, toStaffId: string): Promise<{ error?: string }> {
    const userId = session?.user?.id;
    if (!userId) return { error: 'Not signed in.' };
    const { error } = await supabase.from('swap_requests').insert({
      assignment_id: assignmentId,
      from_staff_id: userId,
      to_staff_id: toStaffId,
      status: 'pending',
    });
    if (!error) await refresh();
    return { error: error?.message };
  }

  async function respond(id: string, accept: boolean): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('swap_requests')
      .update({ status: accept ? 'colleague_accepted' : 'declined' })
      .eq('id', id);
    if (!error) await refresh();
    return { error: error?.message };
  }

  return { incoming, outgoing, colleagues, staffNames, loading, requestSwap, respond, refresh };
}
