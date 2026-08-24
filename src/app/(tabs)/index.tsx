import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAbsenceRequests } from '@/hooks/useAbsenceRequests';
import { useOrg } from '@/hooks/useOrg';
import { useProfile } from '@/hooks/useProfile';
import { useSwapRequests } from '@/hooks/useSwapRequests';
import { toISODate } from '@/lib/engine/dates';
import { useSession } from '@/lib/auth/SessionProvider';
import { supabase } from '@/lib/supabase/client';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

const ROLE_LABEL: Record<string, string> = {
  staff: 'Staff',
  manager: 'Manager',
  admin: 'Admin',
};

function formatShiftDate(iso?: string): string {
  if (!iso) return 'a shift';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function HomeScreen() {
  const { session } = useSession();
  const { profile, loading: profileLoading } = useProfile();
  const { org } = useOrg();
  const { incoming, staffNames, respond } = useSwapRequests();
  const { submit } = useAbsenceRequests();

  const [reportingSick, setReportingSick] = useState(false);
  const [sickSubmitted, setSickSubmitted] = useState(false);
  const [sickError, setSickError] = useState<string | null>(null);

  async function handleReportSick() {
    setReportingSick(true);
    setSickError(null);
    const today = toISODate(new Date());
    const { error } = await submit({ type: 'sickness', start_date: today, end_date: today, hours: 0 });
    setReportingSick(false);
    if (error) {
      setSickError(error);
      return;
    }
    setSickSubmitted(true);
  }

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={require('../../../assets/images/em3-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.greeting}>Hi {firstName}</Text>
        <Text style={styles.org}>{org?.name ?? 'EM3'}</Text>

        <View style={styles.card}>
          <Row label="Role" value={profile ? ROLE_LABEL[profile.role] : '—'} />
          <Row label="Status" value={profile?.status ?? '—'} />
          <Row label="Email" value={session?.user.email} />
        </View>

        {(profile?.role === 'admin' || profile?.role === 'manager') && (
          <Link href="/admin" asChild>
            <Pressable style={styles.adminButton}>
              <Text style={styles.adminButtonText}>Open Admin Dashboard</Text>
            </Pressable>
          </Link>
        )}

        {incoming.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Swap requests for you</Text>
            {incoming.map((s) => (
              <View key={s.id} style={styles.swapCard}>
                <Text style={styles.swapText}>
                  {staffNames[s.from_staff_id] ?? 'A colleague'} wants to swap their shift on{' '}
                  {formatShiftDate(s.shift?.shift_date)} with you.
                </Text>
                {s.status === 'pending' ? (
                  <View style={styles.swapActions}>
                    <Pressable
                      onPress={() => respond(s.id, true)}
                      style={({ pressed }) => [styles.acceptButton, pressed && styles.buttonPressed]}
                    >
                      <Text style={styles.acceptText}>Accept</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => respond(s.id, false)}
                      style={({ pressed }) => [styles.declineButton, pressed && styles.buttonPressed]}
                    >
                      <Text style={styles.declineText}>Decline</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.swapStatus}>You: {s.status.replace('_', ' ')}</Text>
                )}
              </View>
            ))}
          </>
        )}

        <View style={styles.sickCard}>
          {sickSubmitted ? (
            <Text style={styles.sickSubmittedText}>Sickness reported for today. Feel better soon.</Text>
          ) : (
            <>
              <Text style={styles.sickTitle}>Feeling unwell?</Text>
              {sickError && <Text style={styles.error}>{sickError}</Text>}
              <Pressable
                onPress={handleReportSick}
                disabled={reportingSick}
                style={({ pressed }) => [styles.sickButton, pressed && styles.buttonPressed]}
              >
                {reportingSick ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.sickButtonText}>Report Sickness Today</Text>
                )}
              </Pressable>
            </>
          )}
        </View>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  logo: { width: 140, height: 119, alignSelf: 'center', marginBottom: spacing.xs },
  greeting: { ...type.h1, color: colors.navy },
  org: { ...type.body, color: colors.muted, marginTop: -spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { ...type.bodyBold, color: colors.ink },
  rowValue: { ...type.body, color: colors.muted },
  sectionTitle: { ...type.h3, color: colors.ink, marginTop: spacing.xs },
  adminButton: {
    minHeight: minTapTarget,
    backgroundColor: colors.navy,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButtonText: { color: colors.white, ...type.bodyBold },
  swapCard: {
    backgroundColor: colors.skyTint,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  swapText: { ...type.body, color: colors.navy },
  swapActions: { flexDirection: 'row', gap: spacing.sm },
  acceptButton: {
    minHeight: minTapTarget,
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  acceptText: { color: colors.white, ...type.bodyBold },
  declineButton: {
    minHeight: minTapTarget,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  declineText: { color: colors.ink, ...type.bodyBold },
  swapStatus: { ...type.small, color: colors.muted, textTransform: 'capitalize' },
  sickCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sickTitle: { ...type.bodyBold, color: colors.ink },
  sickButton: {
    minHeight: minTapTarget,
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sickButtonText: { color: colors.white, ...type.bodyBold },
  sickSubmittedText: { ...type.body, color: colors.success },
  error: { ...type.small, color: colors.danger },
  buttonPressed: { opacity: 0.85 },
  signOut: {
    minHeight: minTapTarget,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutPressed: { backgroundColor: colors.background },
  signOutText: { ...type.bodyBold, color: colors.danger },
});
