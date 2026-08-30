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

const DOCUMENTS_BUCKET = 'qualification-documents';

export async function uploadQualificationDocument(
  staffId: string,
  type: Tables<'qualifications'>['type'],
  file: { uri: string; name: string; mimeType?: string | null }
): Promise<{ error: string | null }> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'dat';
  const path = `${staffId}/${type}-${Date.now()}.${ext}`;

  const arrayBuffer = await fetch(file.uri).then((r) => r.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, arrayBuffer, { contentType: file.mimeType ?? 'application/octet-stream' });
  if (uploadError) return { error: uploadError.message };

  // Uploading a new document supersedes any previous admin verification —
  // it hasn't been looked at yet.
  const { error: dbError } = await supabase
    .from('qualifications')
    .upsert({ staff_id: staffId, type, document_path: path, verified_by: null }, { onConflict: 'staff_id,type' });
  if (dbError) return { error: dbError.message };
  return { error: null };
}

export async function getQualificationDocumentUrl(path: string): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, 60 * 5);
  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

export async function setQualificationVerified(
  staffId: string,
  type: Tables<'qualifications'>['type'],
  verified: boolean
): Promise<{ error: string | null }> {
  let verifiedBy: string | null = null;
  if (verified) {
    const { data } = await supabase.auth.getUser();
    verifiedBy = data.user?.id ?? null;
  }
  const { error } = await supabase
    .from('qualifications')
    .update({ verified_by: verifiedBy })
    .eq('staff_id', staffId)
    .eq('type', type);
  return { error: error?.message ?? null };
}
