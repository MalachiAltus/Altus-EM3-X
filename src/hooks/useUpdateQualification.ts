import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export async function upsertQualificationExpiry(
  staffId: string,
  type: Tables<'qualifications'>['type'],
  expiresOn: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('qualifications')
    .upsert({ staff_id: staffId, type, expires_on: expiresOn }, { onConflict: 'staff_id,type' });
  return { error: error?.message ?? null };
}
