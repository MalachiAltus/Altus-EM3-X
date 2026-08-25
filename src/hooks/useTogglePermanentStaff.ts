import { supabase } from '@/lib/supabase/client';

export async function setStaffPermanent(staffId: string, isPermanent: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ is_permanent: isPermanent }).eq('id', staffId);
  return { error: error?.message ?? null };
}
