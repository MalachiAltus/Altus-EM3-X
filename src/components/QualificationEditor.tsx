import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { upsertQualificationExpiry } from '@/hooks/useUpdateQualification';
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
}

export function QualificationEditor({ staffId, qualifications, onSaved }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      EDITABLE_QUALS.map((q) => [q.type, qualifications.find((x) => x.type === q.type)?.expires_on ?? ''])
    )
  );
  const [savingType, setSavingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Update qualification dates</Text>
      {EDITABLE_QUALS.map((q) => (
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
        </View>
      ))}
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
  error: { ...type.small, color: colors.danger },
});
