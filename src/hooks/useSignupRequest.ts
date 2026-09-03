import { supabase } from '@/lib/supabase/client';

export async function submitSignupRequest(
  fullName: string,
  email: string,
  password: string,
  dob: string,
  turnstileToken?: string | null
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('submit-signup-request', {
    body: { full_name: fullName, email, password, dob, turnstile_token: turnstileToken ?? undefined },
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
