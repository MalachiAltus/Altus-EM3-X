import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  getQualificationDocumentUrl,
  setQualificationVerified,
  upsertQualificationExpiry,
  uploadQualificationDocument,
} from '@/hooks/useUpdateQualification';
import type { Tables } from '@/lib/supabase/types';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const EDITABLE_QUALS: { type: Tables<'qualifications'>['type']; label: string }[] = [
  { type: 'dbs', label: 'DBS Check' },
  { type: 'paediatric_first_aid', label: 'Paediatric First Aid' },
  { type: 'first_aid', label: 'First Aid' },
];

interface Props {
  staffId: string;
  qualifications: Tables<'qualifications'>[];
  onSaved: () => void;
  /** Shows the admin-only "verified" toggle. Never shown on a staff member's own record. */
  isAdminView?: boolean;
}

export function QualificationEditor({ staffId, qualifications, onSaved, isAdminView = false }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      EDITABLE_QUALS.map((q) => [q.type, qualifications.find((x) => x.type === q.type)?.expires_on ?? ''])
    )
  );
  const [savingType, setSavingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [viewingType, setViewingType] = useState<string | null>(null);
  const [verifyingType, setVerifyingType] = useState<string | null>(null);

  async function handleSave(qualType: Tables<'qualifications'>['type']) {
    setError(null);
    const value = drafts[qualType];
    if (!DATE_PATTERN.test(value)) {
      setError('Enter the expiry date as YYYY-MM-DD.');
      return;
    }
    setSavingType(qualType);
    const { error: saveError } = await upsertQualificationExpiry(staffId, qualType, value);
    setSavingType(null);
    if (saveError) {
      setError(saveError);
      return;
    }
    onSaved();
  }

  async function handleUpload(qualType: Tables<'qualifications'>['type']) {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setUploadingType(qualType);
    const { error: uploadError } = await uploadQualificationDocument(staffId, qualType, {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
    });
    setUploadingType(null);
    if (uploadError) {
      setError(uploadError);
      return;
    }
    onSaved();
  }

  async function handleView(qualType: Tables<'qualifications'>['type'], path: string) {
    setError(null);
    setViewingType(qualType);
    const { url, error: urlError } = await getQualificationDocumentUrl(path);
    setViewingType(null);
    if (urlError || !url) {
      setError(urlError ?? 'Could not open document.');
      return;
    }
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  }

  async function handleToggleVerified(qualType: Tables<'qualifications'>['type'], currentlyVerified: boolean) {
    setError(null);
    setVerifyingType(qualType);
    const { error: verifyError } = await setQualificationVerified(staffId, qualType, !currentlyVerified);
    setVerifyingType(null);
    if (verifyError) {
      setError(verifyError);
      return;
    }
    onSaved();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Update qualification dates</Text>
      {EDITABLE_QUALS.map((q) => {
        const record = qualifications.find((x) => x.type === q.type);
        const isVerified = !!record?.verified_by;
        return (
          <View key={q.type} style={styles.row}>
            <Text style={styles.label}>{q.label} expiry</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={drafts[q.type]}
                onChangeText={(v) => setDrafts((d) => ({ ...d, [q.type]: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.subtle}
              />
              <Pressable
                onPress={() => handleSave(q.type)}
                disabled={savingType === q.type}
                style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
              >
                {savingType === q.type ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.docRow}>
              <Pressable
                onPress={() => handleUpload(q.type)}
                disabled={uploadingType === q.type}
                style={styles.docButton}
              >
                {uploadingType === q.type ? (
                  <ActivityIndicator color={colors.navy} size="small" />
                ) : (
                  <Text style={styles.docButtonText}>{record?.document_path ? 'Replace document' : 'Upload document'}</Text>
                )}
              </Pressable>
              {record?.document_path && (
                <Pressable
                  onPress={() => handleView(q.type, record.document_path!)}
                  disabled={viewingType === q.type}
                  style={styles.docButton}
                >
                  {viewingType === q.type ? (
                    <ActivityIndicator color={colors.navy} size="small" />
                  ) : (
                    <Text style={styles.docButtonText}>View</Text>
                  )}
                </Pressable>
              )}
              {record?.document_path && (
                <Text style={[styles.verifiedBadge, isVerified ? styles.verifiedBadgeYes : styles.verifiedBadgeNo]}>
                  {isVerified ? 'Verified ✓' : 'Not verified'}
                </Text>
              )}
            </View>

            {isAdminView && record?.document_path && (
              <Pressable
                onPress={() => handleToggleVerified(q.type, isVerified)}
                disabled={verifyingType === q.type}
                style={styles.docButton}
              >
                {verifyingType === q.type ? (
                  <ActivityIndicator color={colors.navy} size="small" />
                ) : (
                  <Text style={styles.docButtonText}>{isVerified ? 'Remove verification' : 'Mark as verified'}</Text>
                )}
              </Pressable>
            )}
          </View>
        );
      })}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  title: { ...type.bodyBold, color: colors.ink },
  row: { gap: spacing.xs },
  label: { ...type.small, color: colors.muted },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: minTapTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    color: colors.ink,
    fontSize: 16,
  },
  saveButton: {
    minHeight: minTapTarget,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonPressed: { backgroundColor: colors.blueDark },
  saveButtonText: { color: colors.white, ...type.bodyBold },
  docRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  docButton: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docButtonText: { ...type.small, color: colors.navy, fontWeight: '700' },
  verifiedBadge: { ...type.small, fontWeight: '700' },
  verifiedBadgeYes: { color: colors.success },
  verifiedBadgeNo: { color: colors.muted },
  error: { ...type.small, color: colors.danger },
});
