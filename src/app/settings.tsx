import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase/client';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

const PRIVACY_POLICY = `EM3 X stores the information needed to run staff scheduling, attendance, and holiday tracking for EM3's kids club team: your name, contact details, date of birth, emergency contact, contracted hours and pay rate, DBS and first aid/safeguarding qualification records, shift and clock-in history, and leave requests.

Who can see it: only you, and EM3 managers/admins acting in their staff-management role. It is never sold, and never shared with any third party outside the systems below.

Where it's stored: Supabase, hosted in the EU, acting as EM3's data processor. Push notifications (shift and approval alerts) are delivered via Expo's push notification service, which receives only a device token and the notification text — no other profile data.

Why: to run the rota, calculate statutory holiday accrual correctly, and meet UK childcare regulatory requirements around DBS and qualification tracking (Ofsted Single Central Record).

Retention: timesheet and payroll records are kept for as long as UK employment law requires, even after account deletion. All other personal data is deleted when you delete your account from Settings.

Your rights: you can review your own record at any time from My Record, correct contact and emergency details yourself, and request correction of any other field or a copy of your data from an EM3 admin. Deleting your account removes your personal data immediately, subject to the payroll retention above.

Questions or requests about your data should be directed to your EM3 manager.`;

const TERMS = `EM3 X is provided for use by EM3 staff for work-related scheduling, attendance, and leave management. Accounts are provisioned by an EM3 manager; you are responsible for keeping your login credentials and club clock-in PIN confidential and for the accuracy of the hours, shifts, and leave requests you submit through the app.

Clocking in or out on behalf of another staff member, or submitting false attendance or leave information, is a disciplinary matter handled under EM3's normal staff policies, not just an app rule.

EM3 may suspend or remove access to the app for a staff member whose employment has ended or who has breached these terms. Continued use of the app after changes to these terms constitutes acceptance of them.`;

export default function SettingsScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
  content: { padding: spacing.lg, gap: spacing.sm },
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
