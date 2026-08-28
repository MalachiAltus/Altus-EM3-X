import { supabase } from '@/lib/supabase/client';

export async function submitSignupRequest(fullName: string, email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('signup_requests').insert({ full_name: fullName, email });
  return { error: error?.message ?? null };
}
