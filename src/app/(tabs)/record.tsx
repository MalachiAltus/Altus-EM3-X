import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QualificationEditor } from '@/components/QualificationEditor';
import { useMyRecord } from '@/hooks/useMyRecord';
import { useProfile } from '@/hooks/useProfile';
import { qualificationStatus, type QualificationStatus } from '@/lib/engine/compliance';
import { toISODate } from '@/lib/engine/dates';
import type { Tables } from '@/lib/supabase/types';
import { colors, radii, spacing, type } from '@/theme/tokens';

const QUAL_LABEL: Record<Tables<'qualifications'>['type'], string> = {
  dbs: 'DBS Check',
  first_aid: 'First Aid',
  paediatric_first_aid: 'Paediatric First Aid',
  safeguarding: 'Safeguarding',
  other: 'Other',
};

const CONTRACT_LABEL: Record<Tables<'contracts'>['type'], string> = {
  fixed_part_time: 'Fixed part-time',
  irregular: 'Zero-hours contract',
};

const STATUS_STYLE: Record<QualificationStatus, { bg: string; fg: string; dot: string }> = {
  valid: { bg: colors.card, fg: colors.success, dot: colors.success },
  expiring: { bg: colors.card, fg: colors.warning, dot: colors.warning },
  expired: { bg: colors.card, fg: colors.danger, dot: colors.danger },
  missing: { bg: colors.card, fg: colors.muted, dot: colors.subtle },
};

function statusText(status: QualificationStatus, expiresOn: string | null): string {
  if (status === 'missing' || !expiresOn) return 'No expiry on file';
  const formatted = new Date(`${expiresOn}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (status === 'expired') return `Expired ${formatted} — can't be rostered`;
  if (status === 'expiring') return `Expiring ${formatted}`;
  return `Valid until ${formatted}`;
}

export default function RecordScreen() {
  const { profile, loading: profileLoading } = useProfile();
  const { contract, qualifications, loading: recordLoading, refresh: refreshRecord } = useMyRecord();

  if (profileLoading || recordLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  const today = toISODate(new Date());
  const withStatus = qualifications.map((q) => ({
    ...q,
    status: qualificationStatus(q.expires_on, today),
  }));
  const needsAttention = withStatus.filter((q) => q.status === 'expiring' || q.status === 'expired');

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.name}>{profile?.full_name}</Text>
          <Text style={styles.subtitle}>
            {contract ? CONTRACT_LABEL[contract.type] : 'No contract on file'}
            {contract?.weekly_hours ? ` · ${contract.weekly_hours}h/week` : ''}
          </Text>
          <Text style={styles.hint}>
            Changes to your bank details or contract go to your manager for approval.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Qualifications &amp; training</Text>
        {withStatus.length === 0 ? (
          <Text style={styles.emptyText}>No qualifications on file yet.</Text>
        ) : (
          withStatus.map((q) => {
            const s = STATUS_STYLE[q.status];
            return (
              <View key={q.id} style={styles.qualRow}>
                <View style={[styles.dot, { backgroundColor: s.dot }]} />
                <View style={styles.qualInfo}>
                  <Text style={styles.qualTitle}>{QUAL_LABEL[q.type]}</Text>
                  <Text style={[styles.qualStatus, { color: s.fg }]}>
                    {statusText(q.status, q.expires_on)}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {needsAttention.length > 0 && (
          <View style={styles.attentionBox}>
            <Text style={styles.attentionTitle}>Needs attention</Text>
            <Text style={styles.attentionBody}>
              {needsAttention
                .map((q) => `${QUAL_LABEL[q.type]} — ${statusText(q.status, q.expires_on)}`)
                .join('. ')}
            </Text>
          </View>
        )}

        {profile && (
          <QualificationEditor
            staffId={profile.id}
            qualifications={qualifications}
            onSaved={refreshRecord}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  name: { ...type.h3, color: colors.ink },
  subtitle: { ...type.body, color: colors.muted },
  hint: { ...type.small, color: colors.subtle, marginTop: spacing.xs },
  sectionTitle: { ...type.h3, color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.xs },
  emptyText: { ...type.body, color: colors.muted },
  qualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  qualInfo: { gap: 2 },
  qualTitle: { ...type.bodyBold, color: colors.ink },
  qualStatus: { ...type.small },
  attentionBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  attentionTitle: { ...type.bodyBold, color: colors.danger, marginBottom: spacing.xs },
  attentionBody: { ...type.small, color: colors.danger },
});
