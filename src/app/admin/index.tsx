import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { colors, radii, spacing, type } from '@/theme/tokens';

const QUAL_LABEL: Record<string, string> = {
  dbs: 'DBS',
  first_aid: 'First Aid',
  paediatric_first_aid: 'Paediatric first aid',
  safeguarding: 'Safeguarding',
  other: 'Other',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
}

export default function AdminDashboardScreen() {
  const { onSiteNow, pendingApprovalsCount, complianceIssues, loading } = useAdminDashboard();

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
        <Text style={styles.title}>Today at EM3</Text>

        <View style={styles.grid}>
          <View style={styles.tile}>
            <Text style={styles.tileTitle}>On site now — {onSiteNow.length} staff</Text>
            {onSiteNow.length === 0 ? (
              <Text style={styles.emptyText}>No one clocked in yet.</Text>
            ) : (
              onSiteNow.map((s) => (
                <View key={s.staffId} style={styles.row}>
                  <Text style={styles.rowLabel}>{s.fullName}</Text>
                  <Text style={styles.rowValue}>{formatTime(s.since)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.tile}>
            <Text style={styles.tileTitle}>Pending approvals — {pendingApprovalsCount}</Text>
            <Text style={styles.tileBody}>
              {pendingApprovalsCount === 0
                ? 'Nothing awaiting your decision.'
                : 'Holiday, sickness, and swap requests awaiting your decision.'}
            </Text>
          </View>

          <View style={styles.tile}>
            <Text style={styles.tileTitle}>Compliance — {complianceIssues.length} need attention</Text>
            {complianceIssues.length === 0 ? (
              <Text style={styles.emptyText}>Everyone is up to date.</Text>
            ) : (
              complianceIssues.map((issue, i) => (
                <Text
                  key={`${issue.staffId}-${issue.qualType}-${i}`}
                  style={[styles.issueText, { color: issue.status === 'expired' ? colors.danger : colors.warning }]}
                >
                  {issue.fullName} — {QUAL_LABEL[issue.qualType]}{' '}
                  {issue.status === 'expired' ? 'expired' : 'expiring soon'}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...type.h2, color: colors.ink },
  grid: { gap: spacing.md },
  tile: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tileTitle: { ...type.bodyBold, color: colors.ink, marginBottom: spacing.xs },
  tileBody: { ...type.body, color: colors.muted },
  emptyText: { ...type.small, color: colors.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { ...type.body, color: colors.ink },
  rowValue: { ...type.small, color: colors.muted },
  issueText: { ...type.small },
});
