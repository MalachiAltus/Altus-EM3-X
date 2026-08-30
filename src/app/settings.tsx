import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateDropdown } from '@/components/DateDropdown';
import { useProfile } from '@/hooks/useProfile';
import { PRIVACY_POLICY, TERMS } from '@/lib/legal';
import { supabase } from '@/lib/supabase/client';
import { colors, minTapTarget, radii, spacing, type, webContentMaxWidth } from '@/theme/tokens';

const DOB_YEAR_RANGE: [number, number] = [1940, new Date().getFullYear() - 13];
const DOB_FALLBACK = `${new Date().getFullYear() - 25}-01-01`;

export default function SettingsScreen() {
  const { profile, loading: profileLoading } = useProfile();

  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const [dob, setDob] = useState('');
  const [dobSaving, setDobSaving] = useState(false);
  const [dobMessage, setDobMessage] = useState<string | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.dob) setDob(profile.dob);
  }, [profile?.dob]);

  async function handleSaveDob() {
    if (!profile) return;
    setDobMessage(null);
    setDobError(null);
    setDobSaving(true);
    const { error } = await supabase.from('profiles').update({ dob }).eq('id', profile.id);
    setDobSaving(false);
    if (error) {
      setDobError(error.message);
      return;
    }
    setDobMessage('Date of birth updated.');
  }

  async function handleChangePassword() {
    setPwMessage(null);
    setPwError(null);
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) {
      setPwError(error.message);
      return;
    }
    setNewPassword('');
    setPwMessage('Password updated.');
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    const { error } = await supabase.rpc('delete_own_account');
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Change password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="New password"
          placeholderTextColor={colors.subtle}
        />
        {pwError && <Text style={styles.error}>{pwError}</Text>}
        {pwMessage && <Text style={styles.success}>{pwMessage}</Text>}
        <Pressable
          onPress={handleChangePassword}
          disabled={pwSaving}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          {pwSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Update Password</Text>}
        </Pressable>

        <Text style={styles.sectionTitle}>Date of birth</Text>
        {profileLoading ? (
          <ActivityIndicator color={colors.navy} />
        ) : (
          <>
            <DateDropdown value={dob} onChange={setDob} fallback={DOB_FALLBACK} yearRange={DOB_YEAR_RANGE} />
            {dobError && <Text style={styles.error}>{dobError}</Text>}
            {dobMessage && <Text style={styles.success}>{dobMessage}</Text>}
            <Pressable
              onPress={handleSaveDob}
              disabled={dobSaving}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              {dobSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Save Date of Birth</Text>}
            </Pressable>
          </>
        )}

        <Pressable style={styles.row} onPress={() => setShowPrivacy((v) => !v)}>
          <Text style={styles.rowText}>Privacy Policy</Text>
          <Text style={styles.chevron}>{showPrivacy ? '︿' : '﹀'}</Text>
        </Pressable>
        {showPrivacy && <Text style={styles.policyText}>{PRIVACY_POLICY}</Text>}

        <Pressable style={styles.row} onPress={() => setShowTerms((v) => !v)}>
          <Text style={styles.rowText}>Terms</Text>
          <Text style={styles.chevron}>{showTerms ? '︿' : '﹀'}</Text>
        </Pressable>
        {showTerms && <Text style={styles.policyText}>{TERMS}</Text>}

        <View style={styles.deleteBox}>
          <Text style={styles.deleteTitle}>Delete Account</Text>
          <Text style={styles.deleteBody}>
            This permanently deletes your account and personal details. Your timesheet and payroll
            records are kept as long as the law requires. This can&apos;t be undone.
          </Text>
          {deleteError && <Text style={styles.error}>{deleteError}</Text>}
          {confirmingDelete ? (
            <View style={styles.deleteActions}>
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleting}
                style={({ pressed }) => [styles.deleteConfirmButton, pressed && styles.buttonPressed]}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.deleteConfirmText}>Yes, Delete My Account</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setConfirmingDelete(false)} style={styles.cancelDeleteButton}>
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setConfirmingDelete(true)}
              style={({ pressed }) => [styles.deleteConfirmButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.deleteConfirmText}>Delete My Account</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, width: '100%', maxWidth: webContentMaxWidth, alignSelf: 'center' },
  sectionTitle: { ...type.h3, color: colors.ink, marginBottom: spacing.xs },
  input: {
    minHeight: minTapTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    color: colors.ink,
    fontSize: 16,
  },
  error: { ...type.small, color: colors.danger },
  success: { ...type.small, color: colors.success },
  button: {
    minHeight: minTapTarget,
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  buttonPressed: { backgroundColor: colors.blueDark },
  buttonText: { color: colors.white, ...type.bodyBold },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: minTapTarget,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { ...type.body, color: colors.ink },
  chevron: { color: colors.muted },
  policyText: { ...type.small, color: colors.muted, paddingVertical: spacing.sm },
  deleteBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  deleteTitle: { ...type.bodyBold, color: colors.danger },
  deleteBody: { ...type.small, color: colors.danger },
  deleteActions: { flexDirection: 'row', gap: spacing.sm },
  deleteConfirmButton: {
    minHeight: minTapTarget,
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  deleteConfirmText: { color: colors.white, ...type.bodyBold },
  cancelDeleteButton: {
    minHeight: minTapTarget,
    backgroundColor: colors.background,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  cancelDeleteText: { ...type.bodyBold, color: colors.ink },
});
