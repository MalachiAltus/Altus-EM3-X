import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApprovals, type AbsenceApprovalItem, type SignupApprovalItem, type SwapApprovalItem } from '@/hooks/useApprovals';
import type { Tables } from '@/lib/supabase/types';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

const ROLE_OPTIONS: { value: Tables<'profiles'>['role']; label: string }[] = [
  { value: 'staff', label: 'Playworker' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ApprovalsScreen() {
  const { absences, swaps, signups, loading, approveAbsence, declineAbsence, approveSwap, declineSwap, approveSignup, declineSignup } =
    useApprovals();

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  const isEmpty = absences.length === 0 && swaps.length === 0 && signups.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Approvals Inbox</Text>
        <Text style={styles.subtitle}>Staff with an expired DBS aren&apos;t counted toward ratio.</Text>

        {isEmpty && <Text style={styles.emptyText}>Nothing waiting for a decision.</Text>}

        {signups.map((req) => (
          <SignupCard
            key={req.id}
            req={req}
            onApprove={(role) => approveSignup(req.id, role)}
            onDecline={() => declineSignup(req.id)}
          />
        ))}

        {absences.map((req) => (
          <AbsenceCard key={req.id} req={req} onApprove={() => approveAbsence(req)} onDecline={() => declineAbsence(req.id)} />
        ))}

        {swaps.map((swap) => (
          <SwapCard
            key={swap.id}
            swap={swap}
            onApprove={() => approveSwap(swap)}
            onDecline={() => declineSwap(swap.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function SignupCard({
  req,
  onApprove,
  onDecline,
}: {
  req: SignupApprovalItem;
  onApprove: (role: Tables<'profiles'>['role']) => Promise<{ error?: string }>;
  onDecline: () => void;
}) {
  const [role, setRole] = useState<Tables<'profiles'>['role']>('staff');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    setSubmitting(true);
    const { error: approveError } = await onApprove(role);
    setSubmitting(false);
    if (approveError) setError(approveError);
  }

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={styles.cardHeader}>New sign-up · {req.full_name}</Text>
      <Text style={styles.swapNote}>{req.email}</Text>

      <View style={styles.roleRow}>
        {ROLE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setRole(opt.value)}
            style={[styles.roleOption, role === opt.value && styles.roleOptionActive]}
          >
            <Text style={[styles.roleOptionText, role === opt.value && styles.roleOptionTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.actions}>
        <Pressable
          onPress={handleApprove}
          disabled={submitting}
          style={({ pressed }) => [styles.approveButton, pressed && styles.buttonPressed]}
        >
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.approveText}>Approve as {ROLE_OPTIONS.find((o) => o.value === role)?.label}</Text>}
        </Pressable>
        <Pressable onPress={onDecline} disabled={submitting} style={({ pressed }) => [styles.declineButton, pressed && styles.buttonPressed]}>
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AbsenceCard({
  req,
  onApprove,
  onDecline,
}: {
  req: AbsenceApprovalItem;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const blocked = req.verdict ? !req.verdict.ok : false;
  const warning = req.verdict && req.verdict.ok && req.verdict.violations.length > 0;
  const borderColor = blocked ? colors.danger : warning ? colors.warning : colors.success;
  const bg = blocked ? colors.dangerBg : warning ? colors.warningBg : colors.successBg;

  return (
    <View style={[styles.card, { borderColor }]}>
      <Text style={styles.cardHeader}>
        {req.staffName} · {req.type} · {formatDate(req.start_date)}
        {req.start_date !== req.end_date ? `–${formatDate(req.end_date)}` : ''}
      </Text>

      <View style={[styles.verdictBox, { backgroundColor: bg }]}>
        <Text style={[styles.verdictText, { color: borderColor }]}>
          {!req.verdict
            ? 'Clear — no scheduled shifts in this date range.'
            : req.verdict.violations.length === 0
              ? 'Clear — staffing stays legal.'
              : req.verdict.violations.map((v) => v.message).join(' ')}
        </Text>
      </View>

      {blocked && <Text style={styles.assignCoverLink}>Assign cover first</Text>}

      <View style={styles.actions}>
        <Pressable
          onPress={onApprove}
          disabled={blocked}
          style={({ pressed }) => [styles.approveButton, blocked && styles.disabledButton, pressed && !blocked && styles.buttonPressed]}
        >
          <Text style={styles.approveText}>Approve</Text>
        </Pressable>
        <Pressable onPress={onDecline} style={({ pressed }) => [styles.declineButton, pressed && styles.buttonPressed]}>
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SwapCard({ swap, onApprove, onDecline }: { swap: SwapApprovalItem; onApprove: () => void; onDecline: () => void }) {
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={styles.cardHeader}>
        Swap · {swap.fromName} → {swap.toName}
        {swap.shift ? ` · ${formatDate(swap.shift.shift_date)}` : ''}
      </Text>
      <Text style={styles.swapNote}>Colleague has accepted. Awaiting your final approval.</Text>
      <View style={styles.actions}>
        <Pressable onPress={onApprove} style={({ pressed }) => [styles.approveButton, pressed && styles.buttonPressed]}>
          <Text style={styles.approveText}>Approve</Text>
        </Pressable>
        <Pressable onPress={onDecline} style={({ pressed }) => [styles.declineButton, pressed && styles.buttonPressed]}>
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...type.h2, color: colors.ink },
  subtitle: { ...type.small, color: colors.muted, marginTop: -spacing.sm },
  emptyText: { ...type.body, color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { ...type.bodyBold, color: colors.ink, textTransform: 'capitalize' },
  verdictBox: { borderRadius: radii.sm, padding: spacing.sm },
  verdictText: { ...type.small },
  assignCoverLink: { ...type.small, color: colors.blue, fontWeight: '700' },
  swapNote: { ...type.small, color: colors.muted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  approveButton: {
    minHeight: minTapTarget,
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  disabledButton: { backgroundColor: colors.border },
  approveText: { color: colors.white, ...type.bodyBold },
  declineButton: {
    minHeight: minTapTarget,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  declineText: { color: colors.ink, ...type.bodyBold },
  buttonPressed: { opacity: 0.85 },
  roleRow: { flexDirection: 'row', gap: spacing.xs },
  roleOption: {
    flex: 1,
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  roleOptionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  roleOptionText: { ...type.small, color: colors.ink, fontWeight: '700' },
  roleOptionTextActive: { color: colors.white },
  errorText: { ...type.small, color: colors.danger },
});
