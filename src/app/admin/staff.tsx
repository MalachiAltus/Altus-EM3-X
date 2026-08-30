import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QualificationEditor } from '@/components/QualificationEditor';
import { updateStaffEmail, updateStaffRole } from '@/hooks/useAdminStaffActions';
import { useProfile } from '@/hooks/useProfile';
import { useStaffCompliance, type StaffComplianceRow } from '@/hooks/useStaffCompliance';
import { setStaffPermanent } from '@/hooks/useTogglePermanentStaff';
import { formatHoursAsDaysHours } from '@/lib/engine/accrual';
import type { QualificationStatus } from '@/lib/engine/compliance';
import type { Tables } from '@/lib/supabase/types';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

const ROLE_LABEL: Record<string, string> = { staff: 'Playworker', manager: 'Manager', admin: 'Admin' };

const ROLE_OPTIONS: { value: Tables<'profiles'>['role']; label: string }[] = [
  { value: 'staff', label: 'Playworker' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

function formatDob(dob: string | null): string {
  if (!dob) return 'Not set';
  return new Date(`${dob}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLE: Record<QualificationStatus, { bg: string; fg: string; label: string }> = {
  valid: { bg: colors.successBg, fg: colors.success, label: 'Valid' },
  expiring: { bg: colors.warningBg, fg: colors.warning, label: 'Expiring' },
  expired: { bg: colors.dangerBg, fg: colors.danger, label: 'Expired' },
  missing: { bg: colors.border, fg: colors.muted, label: 'None' },
};

function Badge({ label, status }: { label: string; status: QualificationStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeLabel, { color: s.fg }]}>{label}</Text>
      <Text style={[styles.badgeStatus, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export default function StaffDirectoryScreen() {
  const { staff, loading, refresh } = useStaffCompliance();
  const { profile: viewerProfile } = useProfile();
  const viewerIsAdmin = viewerProfile?.role === 'admin';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [permanentError, setPermanentError] = useState<{ id: string; message: string } | null>(null);

  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<{ id: string; message: string } | null>(null);

  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [emailSavingId, setEmailSavingId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<{ id: string; message: string } | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<{ id: string; message: string } | null>(null);

  async function handleTogglePermanent(s: StaffComplianceRow) {
    setPermanentError(null);
    setTogglingId(s.id);
    const { error } = await setStaffPermanent(s.id, !s.isPermanent);
    setTogglingId(null);
    if (error) {
      setPermanentError({ id: s.id, message: error });
      return;
    }
    await refresh();
  }

  async function handleRoleChange(staffId: string, role: Tables<'profiles'>['role']) {
    setRoleError(null);
    setRoleSavingId(staffId);
    const { error } = await updateStaffRole(staffId, role);
    setRoleSavingId(null);
    if (error) {
      setRoleError({ id: staffId, message: error });
      return;
    }
    await refresh();
  }

  async function handleEmailChange(staffId: string) {
    const newEmail = (emailDrafts[staffId] ?? '').trim();
    setEmailError(null);
    setEmailSuccess(null);
    if (!newEmail) {
      setEmailError({ id: staffId, message: 'Enter a new email address.' });
      return;
    }
    setEmailSavingId(staffId);
    const { error } = await updateStaffEmail(staffId, newEmail);
    setEmailSavingId(null);
    if (error) {
      setEmailError({ id: staffId, message: error });
      return;
    }
    setEmailSuccess({ id: staffId, message: 'Login email updated.' });
    setEmailDrafts((d) => ({ ...d, [staffId]: '' }));
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Single Central Record</Text>
        {staff.map((s: StaffComplianceRow) => {
          const expanded = expandedId === s.id;
          return (
            <View key={s.id} style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>{s.full_name}</Text>
                <Text style={styles.role}>{ROLE_LABEL[s.role]}</Text>
              </View>
              <View style={styles.badgeRow}>
                <Badge label="DBS" status={s.dbs} />
                <Badge label="Paed. FA" status={s.paediatricFirstAid} />
                <Badge label="First Aid" status={s.firstAid} />
                <Badge label="Safeguarding" status={s.safeguarding} />
              </View>
              <View style={styles.bottomRow}>
                <Pressable
                  onPress={() => setExpandedId(expanded ? null : s.id)}
                  hitSlop={8}
                  style={styles.editToggleTouch}
                >
                  <Text style={styles.editToggle}>{expanded ? '▲ Hide details' : '▼ Show details'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleTogglePermanent(s)}
                  disabled={togglingId === s.id}
                  style={[styles.permanentButton, s.isPermanent && styles.permanentButtonActive]}
                >
                  {togglingId === s.id ? (
                    <ActivityIndicator size="small" color={s.isPermanent ? colors.white : colors.navy} />
                  ) : (
                    <Text style={[styles.permanentButtonText, s.isPermanent && styles.permanentButtonTextActive]}>
                      {s.isPermanent ? 'Permanent ✓' : 'Make Permanent'}
                    </Text>
                  )}
                </Pressable>
              </View>
              {permanentError?.id === s.id && <Text style={styles.error}>{permanentError.message}</Text>}
              {expanded && (
                <>
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Hours worked</Text>
                      <Text style={styles.statValue}>{formatHoursAsDaysHours(s.hoursWorked)}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Holiday hours allowed</Text>
                      <Text style={styles.statValue}>{formatHoursAsDaysHours(s.holidayAllowed)}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Date of birth</Text>
                      <Text style={styles.statValue}>{formatDob(s.dob)}</Text>
                    </View>
                  </View>

                  <View style={styles.editSection}>
                    <Text style={styles.editSectionTitle}>Role</Text>
                    <View style={styles.roleRow}>
                      {ROLE_OPTIONS.filter((opt) => opt.value !== 'admin' || viewerIsAdmin).map((opt) => (
                        <Pressable
                          key={opt.value}
                          onPress={() => handleRoleChange(s.id, opt.value)}
                          disabled={roleSavingId === s.id || s.role === opt.value}
                          style={[styles.roleOption, s.role === opt.value && styles.roleOptionActive]}
                        >
                          <Text style={[styles.roleOptionText, s.role === opt.value && styles.roleOptionTextActive]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                      {roleSavingId === s.id && <ActivityIndicator size="small" color={colors.navy} />}
                    </View>
                    {roleError?.id === s.id && <Text style={styles.error}>{roleError.message}</Text>}

                    <Text style={styles.editSectionTitle}>Login email</Text>
                    <View style={styles.emailRow}>
                      <TextInput
                        style={styles.emailInput}
                        value={emailDrafts[s.id] ?? ''}
                        onChangeText={(v) => setEmailDrafts((d) => ({ ...d, [s.id]: v }))}
                        placeholder="new-email@example.com"
                        placeholderTextColor={colors.subtle}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                      <Pressable
                        onPress={() => handleEmailChange(s.id)}
                        disabled={emailSavingId === s.id}
                        style={styles.emailButton}
                      >
                        {emailSavingId === s.id ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.emailButtonText}>Update</Text>
                        )}
                      </Pressable>
                    </View>
                    {emailError?.id === s.id && <Text style={styles.error}>{emailError.message}</Text>}
                    {emailSuccess?.id === s.id && <Text style={styles.success}>{emailSuccess.message}</Text>}
                  </View>

                  <QualificationEditor staffId={s.id} qualifications={s.qualifications} onSaved={refresh} isAdminView />
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...type.h2, color: colors.ink, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...type.bodyBold, color: colors.ink },
  role: { ...type.small, color: colors.muted },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: { borderRadius: radii.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minWidth: 80 },
  badgeLabel: { ...type.small, fontWeight: '700' },
  badgeStatus: { ...type.small },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  editToggleTouch: {},
  editToggle: { ...type.small, color: colors.blue, fontWeight: '700' },
  permanentButton: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permanentButtonActive: { backgroundColor: colors.success, borderColor: colors.success },
  permanentButtonText: { ...type.small, color: colors.ink, fontWeight: '700' },
  permanentButtonTextActive: { color: colors.white },
  error: { ...type.small, color: colors.danger },
  success: { ...type.small, color: colors.success },
  editSection: { gap: spacing.xs },
  editSectionTitle: { ...type.small, color: colors.muted, fontWeight: '700', marginTop: spacing.xs },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  roleOption: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  roleOptionText: { ...type.small, color: colors.ink, fontWeight: '700' },
  roleOptionTextActive: { color: colors.white },
  emailRow: { flexDirection: 'row', gap: spacing.xs },
  emailInput: {
    flex: 1,
    minHeight: minTapTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    color: colors.ink,
    fontSize: 16,
  },
  emailButton: {
    minHeight: minTapTarget,
    minWidth: 80,
    backgroundColor: colors.blue,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  emailButtonText: { color: colors.white, ...type.bodyBold },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.skyTint,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  statLabel: { ...type.small, color: colors.muted },
  statValue: { ...type.bodyBold, color: colors.navy },
});
