import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export async function updateStaffRole(
  staffId: string,
  role: Tables<'profiles'>['role']
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', staffId);
  return { error: error?.message ?? null };
}

export async function updateStaffEmail(staffId: string, newEmail: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('update-staff-email', {
    body: { staff_id: staffId, new_email: newEmail },
  });
  if (error) {
    // supabase-js only puts a generic "non-2xx status code" message on
    // FunctionsHttpError — the actual reason is in the response body.
    const context = (error as { context?: Response }).context;
    const body = await context?.json?.().catch(() => null);
    return { error: body?.error ?? error.message };
  }
  if (data?.error) return { error: data.error as string };
  return { error: null };
}
